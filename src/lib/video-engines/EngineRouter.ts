
import { IVideoEngine } from "./types";
import { FFmpegEngine } from "./FFmpegEngine";

export class EngineRouter {
    private static instances: Record<string, IVideoEngine> = {};

    static getEngine(tier: "free" | "low" | "medium" | "premium"): IVideoEngine {
        // Singleton pattern to reuse loaded engines (like ffmpeg.wasm)
        if (this.instances[tier]) {
            return this.instances[tier];
        }

        let engine: IVideoEngine;

        switch (tier) {
            case "free":
                engine = new FFmpegEngine();
                break;
            case "low":
                // Fallback to FFmpeg for now, or implement Remotion client-side
                console.warn("Low tier engine not implemented, falling back to Free (FFmpeg)");
                engine = new FFmpegEngine();
                break;
            case "medium":
            case "premium":
                // Future: Return a CloudEngine wrapper (Fal.ai / Mux)
                console.warn("Premium engine not implemented, falling back to Free (FFmpeg) for Architecture Demo");
                engine = new FFmpegEngine(); // Placeholder for now
                break;
            default:
                engine = new FFmpegEngine();
        }

        this.instances[tier] = engine;
        return engine;
    }
}
