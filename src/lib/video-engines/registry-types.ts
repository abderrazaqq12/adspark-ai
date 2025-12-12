
// Core Data Structures for Capability-Based Routing

export type ProcessingLocation = "browser" | "server" | "cloud-api" | "browser-native";

export type MediaType = "video" | "image" | "audio";

export type EngineCapability =
    | "trim"
    | "merge"
    | "concat"
    | "text_overlay"
    | "transition"
    | "speed_control"
    | "zoom_pan"
    | "chroma_key"
    | "ai_fill" // Generative fill
    | "ai_extend" // Runway/Luma extension
    | "transcode"
    | "react_render" // Remotion
    | "subtitle_burn";

export interface EngineSpecs {
    id: string;
    name: string;
    location: ProcessingLocation;
    capabilities: EngineCapability[];
    costPerMinute: number; // $0.00 for browser
    maxResolution: "720p" | "1080p" | "4k";
    maxDurationSec: number;
    tier: "free" | "low" | "medium" | "premium"; // Minimum tier required to access
    coldStartLatencyMs: number;
}

export const ENGINE_REGISTRY: Record<string, EngineSpecs> = {
    "ffmpeg.wasm": {
        id: "ffmpeg.wasm",
        name: "FFmpeg (Browser WASM)",
        location: "browser",
        capabilities: ["trim", "merge", "concat", "text_overlay", "speed_control", "zoom_pan", "transcode"],
        costPerMinute: 0,
        maxResolution: "1080p",
        maxDurationSec: 60,
        tier: "free",
        coldStartLatencyMs: 2000
    },
    "webcodecs": {
        id: "webcodecs",
        name: "WebCodecs API (Native)",
        location: "browser-native",
        capabilities: ["trim", "speed_control", "transcode"], // Very fast, limited features
        costPerMinute: 0,
        maxResolution: "4k", // Hardware accelerated
        maxDurationSec: 300,
        tier: "free",
        coldStartLatencyMs: 100
    },
    "remotion": {
        id: "remotion",
        name: "Remotion (Lambda)",
        location: "server",
        capabilities: ["react_render", "text_overlay", "transition", "trim", "merge"],
        costPerMinute: 0.10, // Est
        maxResolution: "4k",
        maxDurationSec: 1200,
        tier: "low",
        coldStartLatencyMs: 5000
    },
    "fal-ai-video": {
        id: "fal-ai-video",
        name: "Fal.ai Fast Video",
        location: "cloud-api",
        capabilities: ["ai_fill", "ai_extend"],
        costPerMinute: 0.50,
        maxResolution: "1080p",
        maxDurationSec: 10,
        tier: "medium",
        coldStartLatencyMs: 8000
    },
    "cloudinary": {
        id: "cloudinary",
        name: "Cloudinary Video",
        location: "cloud-api",
        capabilities: ["transcode", "trim", "concat", "subtitle_burn"],
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
    start: number; // in seconds
    end: number;
    actions?: SceneAction[];
    overlay?: string;
    description?: string;
}

export interface ScenePlan {
    scenes: Scene[];
    requiredCapabilities: EngineCapability[]; // AI must explicitly list what is needed
    totalDuration: number;
    resolution: "1080p" | "9:16" | "1:1";
}
