import { ExecutionPlan } from '../../src/lib/creative-scale/compiler-types';
import path from 'path';

/**
 * FFmpeg Command Builder (Unified Engine)
 * Translates ExecutionPlan JSON into a complex FFmpeg filtergraph.
 */
export class FFmpegBuilder {
    private plan: ExecutionPlan;
    private inputs: string[] = [];
    private filters: string[] = [];
    private audioInputs: string[] = [];

    constructor(plan: ExecutionPlan) {
        this.plan = plan;
    }

    public buildCommand(outputRequestPath: string): { command: string, args: string[] } {
        this.inputs = [];
        this.filters = [];
        this.audioInputs = [];

        // 1. Process Video Inputs (Timeline)
        // We need to map timeline assets to input indices
        // And build the trim/concat filtergraph

        let segmentFilterTags: string[] = [];
        const inputMap = new Map<string, number>();
        let inputIndex = 0;

        // Collect unique inputs to avoid reloading same file multiple times? 
        // FFmpeg is fine with multiple -i for simplicity, but optimization is better.
        // For now, simple standard approach: each segment is a reference to an input.

        this.plan.timeline.forEach((segment, i) => {
            // download/access path logic would be in engine.ts before this, 
            // but assuming we receive local paths or URLs that ffmpeg can handle.
            // For strict correctness, the Engine should download files first. 
            // builder assumes paths are valid.

            let fileIdx = inputMap.get(segment.asset_url);
            if (fileIdx === undefined) {
                this.inputs.push(segment.asset_url);
                fileIdx = inputIndex++;
                inputMap.set(segment.asset_url, fileIdx);
            }

            // TRIM & SCALE Filter
            // [0:v]trim=0:15,setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[v0];
            const trimStart = segment.trim_start_ms / 1000;
            const trimEnd = segment.trim_end_ms / 1000;
            const tag = `v${i}`;

            // Basic video chain: Trim -> SetPTS -> Scale -> Pad
            this.filters.push(
                `[${fileIdx}:v]trim=${trimStart}:${trimEnd},setpts=PTS-STARTPTS,` +
                `scale=${this.plan.output_format.width}:${this.plan.output_format.height}:force_original_aspect_ratio=decrease,` +
                `pad=${this.plan.output_format.width}:${this.plan.output_format.height}:(ow-iw)/2:(oh-ih)/2,` +
                `setsar=1[${tag}]`
            );
            segmentFilterTags.push(`[${tag}]`);
        });

        // 2. Concatenate Segments
        // [v0][v1]...concat=n=N:v=1:a=1[main_v][main_a]
        // Note: We need a=1 to carry audio from segments if they have it.
        // If segments have audio, we concat it. If not, we might need to rely on generating silent audio or ignoring.
        // For simplicity v1: Assume segments have audio (or we use a=1 and it might separate if silent).
        // Safest: Use a separate audio chain or anullsrc if missing.
        // Let's try simple concat with a=1. If input has no audio stream, this might fail.
        // Robustness: Probe inputs. But here we blindly build.
        // Fallback: [v0]...concat=n=...:v=1:a=0[main_v] and we handle audio separately.

        // Let's stick to video-only concat for the video track, and handle audio mixing separately via audio_tracks.
        // BUT, what about the original audio from the video segments?
        // Usually "Timeline" implies the visual cut. Audio is often separate or replaced.
        // If we want original audio, we need [a0][a1]...

        // Let's assume for this "Creative Scale" engine that audio is constructed from `audio_tracks`.
        // If `audio_tracks` is empty, maybe we preserve original?
        // Let's build a video-only concat for [main_v] first.
        this.filters.push(
            `${segmentFilterTags.join('')}concat=n=${this.plan.timeline.length}:v=1:a=0[main_v]`
        );
        let lastVideoTag = '[main_v]';

        // 3. Text Overlays (DrawText)
        if (this.plan.text_overlays && this.plan.text_overlays.length > 0) {
            this.plan.text_overlays.forEach((overlay, i) => {
                const nextTag = `[v_txt_${i}]`;

                // Escape special chars for drawtext
                const escapedText = overlay.content
                    .replace(/:/g, '\\:')
                    .replace(/'/g, "'\\\\''");

                const startTime = overlay.timeline_start_ms / 1000;
                const endTime = overlay.timeline_end_ms / 1000;

                // Construct drawtext filter
                // enable='between(t,start,end)'
                const fontStr = overlay.font_file ? `fontfile='${overlay.font_file}':` : '';
                const boxStr = overlay.box ? `box=1:boxcolor=${overlay.box_color || 'black@0.5'}:boxborderw=5:` : '';

                this.filters.push(
                    `${lastVideoTag}drawtext=` +
                    `${fontStr}text='${escapedText}':` +
                    `fontsize=${overlay.font_size}:fontcolor=${overlay.color}:` +
                    `x=${overlay.x}:y=${overlay.y}:` +
                    `${boxStr}` +
                    `enable='between(t,${startTime},${endTime})'${nextTag}`
                );
                lastVideoTag = nextTag;
            });
        }

        // 4. Audio Processing
        // We have two sources of audio:
        // A. The Timeline Segments (original audio) - if we want it.
        // B. The `audio_tracks` (music, VO, sfx)

        // Current plan: We explicitly map inputs. 
        // If we want audio from video segments, we need to extract their audio streams.
        // Let's assume `audio_tracks` is the MASTER audio plan.
        // If `audio_tracks` is present, it defines the audio.
        // If it's missing, we try to use timeline audio (optional).

        let finalAudioTag = '';

        if (this.plan.audio_tracks && this.plan.audio_tracks.length > 0) {
            // Process explicit audio tracks
            const audioTags: string[] = [];

            this.plan.audio_tracks.forEach((track, i) => {
                let auIdx = inputMap.get(track.asset_url || '');
                if (auIdx === undefined && track.asset_url) {
                    this.inputs.push(track.asset_url);
                    auIdx = inputIndex++;
                    inputMap.set(track.asset_url, auIdx);
                }

                if (auIdx !== undefined) {
                    const tag = `a_track_${i}`;
                    const trimStart = track.trim_start_ms / 1000;
                    const duration = (track.timeline_end_ms - track.timeline_start_ms) / 1000;
                    const delay = track.timeline_start_ms / 1000;

                    // Filter: atrim -> adelay -> volume
                    this.filters.push(
                        `[${auIdx}:a]atrim=start=${trimStart}:duration=${duration},` +
                        `adelay=${delay * 1000}|${delay * 1000},` +
                        `volume=${track.volume}[${tag}]`
                    );
                    audioTags.push(`[${tag}]`);
                }
            });

            // Mix
            if (audioTags.length > 0) {
                this.filters.push(
                    `${audioTags.join('')}amix=inputs=${audioTags.length}:duration=longest[mixed_a]`
                );
                finalAudioTag = '[mixed_a]';
            }
        }

        // 5. Final Output
        const args = [
            ...this.inputs.flatMap(i => ['-i', i]),
            '-filter_complex', this.filters.join(';'),
            '-map', lastVideoTag,
        ];

        if (finalAudioTag) {
            args.push('-map', finalAudioTag);
            args.push('-c:a', 'aac');
            // Ensure audio is not too short if video is long (pad) - complicated, but amix=longest handles overlap.
            // If video is longer than audio, audio stops. If audio longer, video stops (or freezes).
            // Usually we want video length.
            // For now, let's keep it simple.
        }

        args.push(
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-y',
            outputRequestPath
        );

        return {
            command: 'ffmpeg',
            args
        };
    }
}
