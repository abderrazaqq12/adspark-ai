
// Core Data Structures for Capability-Based Routing

export type ProcessingLocation = "browser" | "server" | "cloud-api" | "browser-native";

export type MediaType = "video" | "image" | "audio";

export type EngineCapability =
    | "trim"
    | "merge"
    | "concat"
    | "text_overlay"
    | "transition"
    | "transitions"
    | "speed_control"
    | "speed_change"
    | "zoom_pan"
    | "chroma_key"
    | "ai_fill"
    | "ai_extend"
    | "transcode"
    | "react_render"
    | "subtitle_burn"
    | "audio_mix"
    | "resize";

export interface EngineSpecs {
    id: string;
    name: string;
    location: ProcessingLocation;
    capabilities: EngineCapability[];
    costPerMinute: number;
    maxResolution: "720p" | "1080p" | "4k";
    maxDurationSec: number;
    tier: "free" | "low" | "medium" | "premium";
    coldStartLatencyMs?: number;
}

export const ENGINE_REGISTRY: Record<string, EngineSpecs> = {
    "server-ffmpeg": {
        id: "server-ffmpeg",
        name: "Server FFmpeg (VPS)",
        location: "server",
        capabilities: ["trim", "merge", "concat", "text_overlay", "transition", "transitions", "speed_control", "speed_change", "zoom_pan", "transcode", "audio_mix", "resize"],
        costPerMinute: 0,
        maxResolution: "4k",
        maxDurationSec: 600,
        tier: "free",
        coldStartLatencyMs: 100
    },
    "cloudinary": {
        id: "cloudinary",
        name: "Cloudinary Video",
        location: "cloud-api",
        capabilities: ["transcode", "trim", "concat", "subtitle_burn", "resize"],
        costPerMinute: 0.05,
        maxResolution: "4k",
        maxDurationSec: 1800,
        tier: "low",
        coldStartLatencyMs: 500
    }
};

// Scene Plan Structure (AI Output)
export interface SceneAction {
    type: string;
    param?: any;
}

export interface Scene {
    type: "HOOK" | "PROBLEM" | "AGITATION" | "SOLUTION" | "BENEFITS" | "USP" | "SOCIAL_PROOF" | "CTA" | "BEFORE_AFTER" | "Content";
    start: number;
    end: number;
    actions?: SceneAction[];
    overlay?: string;
    description?: string;
}

export interface ScenePlan {
    scenes: Scene[];
    requiredCapabilities: EngineCapability[];
    totalDuration: number;
    resolution: "1080p" | "9:16" | "1:1";
}
