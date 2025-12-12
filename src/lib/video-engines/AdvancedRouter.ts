
import { ENGINE_REGISTRY, EngineSpecs, EngineCapability, ScenePlan } from "./registry-types";
import { IVideoEngine } from "./types";
import { FFmpegEngine } from "./FFmpegEngine";
// Future imports: WebCodecsEngine, RemotionAdapter, CloudinaryAdapter

export interface RoutingRequest {
    plan: ScenePlan;
    userTier: "free" | "low" | "medium" | "premium";
    preferLocal?: boolean;
}

export class AdvancedEngineRouter {

    static selectEngine(req: RoutingRequest): EngineSpecs {
        const candidates = Object.values(ENGINE_REGISTRY);

        // 1. FILTER: Tier Access
        const allowedEngines = candidates.filter(e =>
            this.isTierSufficient(req.userTier, e.tier)
        );

        // 2. FILTER: Capabilities
        // The engine must support ALL required capabilities for the plan
        const capableEngines = allowedEngines.filter(e =>
            req.plan.requiredCapabilities.every(cap => e.capabilities.includes(cap))
        );

        // 3. FILTER: Constraints (Duration / Resolution)
        const validEngines = capableEngines.filter(e =>
            e.maxDurationSec >= req.plan.totalDuration &&
            this.compareResolution(e.maxResolution, req.plan.resolution as "720p" | "1080p" | "4k") >= 0
        );

        if (validEngines.length === 0) {
            console.warn("No perfect engine match found. Falling back to FFmpeg.wasm (Best Effort).");
            return ENGINE_REGISTRY["ffmpeg.wasm"];
        }

        // 4. RANKING
        // Prefer Browser/Local if requested and possible (Zero Cost, Privacy)
        if (req.preferLocal) {
            const local = validEngines.find(e => e.location === "browser" || e.location === "browser-native");
            if (local) return local;
        }

        // Otherwise, pick the lowest cost
        validEngines.sort((a, b) => a.costPerMinute - b.costPerMinute);

        return validEngines[0];
    }

    static getEngineInstance(specId: string): IVideoEngine {
        switch (specId) {
            case "ffmpeg.wasm":
                return new FFmpegEngine();
            case "webcodecs":
                // return new WebCodecsEngine(); // Todo
                console.warn("WebCodecs engine not fully implemented, falling back to FFmpeg");
                return new FFmpegEngine();
            default:
                console.warn(`Engine ${specId} adapter not found, using FFmpeg fallback`);
                return new FFmpegEngine();
        }
    }

    // Helpers
    private static tierLevels = { free: 0, low: 1, medium: 2, premium: 3 };
    private static isTierSufficient(userTier: string, engineTier: string): boolean {
        return this.tierLevels[userTier as keyof typeof this.tierLevels] >= this.tierLevels[engineTier as keyof typeof this.tierLevels];
    }

    private static resLevels = { "720p": 0, "1080p": 1, "4k": 2 };
    private static compareResolution(a: string, b: string): number {
        const la = this.resLevels[a as keyof typeof this.resLevels] || 0;
        const lb = this.resLevels[b as keyof typeof this.resLevels] || 0;
        return la - lb;
    }
}
