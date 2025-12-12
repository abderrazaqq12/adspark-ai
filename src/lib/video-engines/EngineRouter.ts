
import { IVideoEngine } from "./types";
import { FFmpegEngine } from "./FFmpegEngine";
import { WebCodecsEngine } from "./WebCodecsEngine";
import { checkCOIStatus } from "./coi-helper";

export class EngineRouter {
    private static instances: Record<string, IVideoEngine> = {};

    /**
     * Check which browser engine is available
     */
    static getBrowserEngineStatus(): {
        ffmpegAvailable: boolean;
        webCodecsAvailable: boolean;
        reason?: string;
    } {
        const coiStatus = checkCOIStatus();
        const ffmpegCheck = FFmpegEngine.checkSupport();
        const webCodecsAvailable = typeof window !== 'undefined' && 
            'VideoEncoder' in window && 'VideoDecoder' in window;

        return {
            ffmpegAvailable: ffmpegCheck.supported,
            webCodecsAvailable,
            reason: ffmpegCheck.reason
        };
    }

    static getEngine(tier: "free" | "low" | "medium" | "premium"): IVideoEngine {
        // Singleton pattern to reuse loaded engines
        if (this.instances[tier]) {
            return this.instances[tier];
        }

        let engine: IVideoEngine;
        const status = this.getBrowserEngineStatus();

        switch (tier) {
            case "free":
                // Prefer FFmpeg if available (requires COI), fallback to WebCodecs
                if (status.ffmpegAvailable) {
                    engine = new FFmpegEngine();
                } else if (status.webCodecsAvailable) {
                    console.warn(`[EngineRouter] FFmpeg unavailable (${status.reason}), using WebCodecs`);
                    engine = new WebCodecsEngine();
                } else {
                    // Last resort - try FFmpeg anyway (will trigger COI registration)
                    console.warn('[EngineRouter] No browser engine fully ready, attempting FFmpeg...');
                    engine = new FFmpegEngine();
                }
                break;
            case "low":
                console.warn("Low tier engine not implemented, using browser engine");
                engine = status.ffmpegAvailable ? new FFmpegEngine() : new WebCodecsEngine();
                break;
            case "medium":
            case "premium":
                console.warn("Premium engine not implemented, using browser engine");
                engine = status.ffmpegAvailable ? new FFmpegEngine() : new WebCodecsEngine();
                break;
            default:
                engine = status.ffmpegAvailable ? new FFmpegEngine() : new WebCodecsEngine();
        }

        this.instances[tier] = engine;
        return engine;
    }

    /**
     * Clear cached engine instances (useful after COI activation)
     */
    static clearCache(): void {
        this.instances = {};
    }
}
