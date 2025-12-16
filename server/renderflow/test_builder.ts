
import { FFmpegBuilder } from './ffmpeg-builder';
import { ExecutionPlan } from '../../src/lib/creative-scale/compiler-types';

const mockPlan: ExecutionPlan = {
    plan_id: 'test_plan',
    source_analysis_id: '1',
    source_blueprint_id: '1',
    variation_id: '1',
    created_at: new Date().toISOString(),
    status: 'compilable',
    output_format: {
        container: 'mp4',
        width: 1080,
        height: 1920,
        fps: 30,
        bitrate_kbps: 4000,
        audio_bitrate_kbps: 128,
        codec_hint: 'h264'
    },
    timeline: [
        {
            segment_id: 's1',
            source_video_id: 'v1',
            source_segment_id: 'ss1',
            asset_url: 'http://example.com/video1.mp4',
            trim_start_ms: 0,
            trim_end_ms: 5000,
            source_duration_ms: 10000,
            timeline_start_ms: 0,
            timeline_end_ms: 5000,
            output_duration_ms: 5000,
            speed_multiplier: 1,
            track: 'video',
            layer: 0
        },
        {
            segment_id: 's2',
            source_video_id: 'v2',
            source_segment_id: 'ss2',
            asset_url: 'http://example.com/video2.mp4',
            trim_start_ms: 2000,
            trim_end_ms: 4000,
            source_duration_ms: 10000,
            timeline_start_ms: 5000,
            timeline_end_ms: 7000,
            output_duration_ms: 2000,
            speed_multiplier: 1,
            track: 'video',
            layer: 0
        }
    ],
    audio_tracks: [
        {
            audio_id: 'a1',
            source_video_id: 'm1',
            asset_url: 'http://example.com/music.mp3',
            trim_start_ms: 0,
            trim_end_ms: 7000,
            timeline_start_ms: 0,
            timeline_end_ms: 7000,
            volume: 0.5,
            fade_in_ms: 0,
            fade_out_ms: 0,
            track: 'music'
        }
    ],
    text_overlays: [
        {
            text_id: 't1',
            content: 'Hello World',
            timeline_start_ms: 1000,
            timeline_end_ms: 4000,
            font_size: 48,
            color: 'white',
            x: '(w-text_w)/2',
            y: 'h-200',
            box: true,
            box_color: 'black@0.5'
        }
    ],
    validation: {
        total_duration_ms: 7000,
        segment_count: 2,
        audio_track_count: 1,
        has_gaps: false,
        has_overlaps: false,
        warnings: []
    }
};

const builder = new FFmpegBuilder(mockPlan);
const { command, args } = builder.buildCommand('/out/output.mp4');

console.log('Command:', command);
console.log('Args:', JSON.stringify(args, null, 2));

if (!args.join(' ').includes('drawtext')) throw new Error('Missing drawtext');
if (!args.join(' ').includes('amix')) throw new Error('Missing amix');
if (!args.join(' ').includes('concat')) throw new Error('Missing concat');

console.log('Test Passed!');
