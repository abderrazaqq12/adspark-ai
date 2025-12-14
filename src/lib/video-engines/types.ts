
export interface Scene {
    type: string;
    start: number;
    end: number;
    style?: string;
    description?: string;
}

export interface AdVariationConfig {
    scenes: Scene[];
    variants: number;
    market: string;
    language: string;
    strategy?: any;
}

export interface EngineTask {
    id: string;
    videoUrl: string;
    config: AdVariationConfig;
    outputRatio: string;
}

export interface EngineResult {
    success: boolean;
    videoUrl?: string;
    error?: string;
    processingTimeMs?: number;
    logs?: string[];
}

export interface IVideoEngine {
    name: string;
    tier: "free" | "low" | "medium" | "premium" | "server";
    initialize(): Promise<void>;
    process(task: EngineTask): Promise<EngineResult>;
    isReady?(): boolean;
}
