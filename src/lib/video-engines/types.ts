
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
    status: 'success' | 'failed'; // Normalized status
    outputType: 'video' | 'plan' | 'job'; // Output type normalization
    videoUrl?: string;
    error?: string;
    processingTimeMs?: number;
    logs?: string[];
    jobId?: string;
    executionPlan?: any; // For 'plan' output type
}

export interface IVideoEngine {
    name: string;
    tier: "free" | "low" | "medium" | "premium" | "server";
    initialize(): Promise<void>;
    process(task: EngineTask): Promise<EngineResult>;
    isReady?(): boolean;
}
