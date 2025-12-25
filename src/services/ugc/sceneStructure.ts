/**
 * UGC Scene Structure Service
 * Fixed 5-scene template for all UGC videos
 */

/**
 * Fixed scene structure - NO user control
 * All videos follow this exact format
 */
export interface UGCScene {
    id: string;
    name: string;
    duration: number; // in seconds
    description: string;
    contentType: 'avatar' | 'product' | 'mixed';
}

export const UGC_SCENE_STRUCTURE: UGCScene[] = [
    {
        id: 'scene-1-hook',
        name: 'Hook',
        duration: 3,
        description: 'Avatar attention grabber - spoken hook to stop scroll',
        contentType: 'avatar',
    },
    {
        id: 'scene-2-context',
        name: 'Context',
        duration: 5,
        description: 'Problem/situation setup - establish relatability',
        contentType: 'avatar',
    },
    {
        id: 'scene-3-product',
        name: 'Product Usage',
        duration: 6,
        description: 'Demo/application - show product being used',
        contentType: 'mixed',
    },
    {
        id: 'scene-4-benefit',
        name: 'Benefit',
        duration: 4,
        description: 'Reinforcement - highlight key benefit/transformation',
        contentType: 'mixed',
    },
    {
        id: 'scene-5-cta',
        name: 'CTA',
        duration: 2,
        description: 'Call to action - direct instruction',
        contentType: 'avatar',
    },
];

/**
 * Get total video duration
 */
export function getTotalDuration(): number {
    return UGC_SCENE_STRUCTURE.reduce((sum, scene) => sum + scene.duration, 0);
}

/**
 * Get scene by index
 */
export function getScene(index: number): UGCScene | undefined {
    return UGC_SCENE_STRUCTURE[index];
}

/**
 * Get scene timings for FFmpeg concat
 */
export function getSceneTimings(): { start: number; end: number; scene: UGCScene }[] {
    const timings: { start: number; end: number; scene: UGCScene }[] = [];
    let currentTime = 0;

    for (const scene of UGC_SCENE_STRUCTURE) {
        timings.push({
            start: currentTime,
            end: currentTime + scene.duration,
            scene,
        });
        currentTime += scene.duration;
    }

    return timings;
}

/**
 * Scene content assignment for a video variant
 */
export interface SceneContentAssignment {
    sceneId: string;
    avatarImageUrl?: string;
    productImageUrl?: string;
    audioUrl?: string;
    scriptSegment: string;
}

/**
 * Create scene assignments for a video
 */
export function createSceneAssignments(params: {
    avatarUrl: string;
    productUrls: string[];
    audioUrl: string;
    scriptSegments: {
        hook: string;
        context: string;
        productUsage: string;
        benefit: string;
        cta: string;
    };
}): SceneContentAssignment[] {
    const { avatarUrl, productUrls, audioUrl, scriptSegments } = params;

    return [
        {
            sceneId: 'scene-1-hook',
            avatarImageUrl: avatarUrl,
            audioUrl,
            scriptSegment: scriptSegments.hook,
        },
        {
            sceneId: 'scene-2-context',
            avatarImageUrl: avatarUrl,
            audioUrl,
            scriptSegment: scriptSegments.context,
        },
        {
            sceneId: 'scene-3-product',
            avatarImageUrl: avatarUrl,
            productImageUrl: productUrls[0],
            audioUrl,
            scriptSegment: scriptSegments.productUsage,
        },
        {
            sceneId: 'scene-4-benefit',
            avatarImageUrl: avatarUrl,
            productImageUrl: productUrls[1] || productUrls[0],
            audioUrl,
            scriptSegment: scriptSegments.benefit,
        },
        {
            sceneId: 'scene-5-cta',
            avatarImageUrl: avatarUrl,
            audioUrl,
            scriptSegment: scriptSegments.cta,
        },
    ];
}

/**
 * Validate scene structure for a video
 */
export function validateSceneStructure(assignments: SceneContentAssignment[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (assignments.length !== UGC_SCENE_STRUCTURE.length) {
        errors.push(`Expected ${UGC_SCENE_STRUCTURE.length} scenes, got ${assignments.length}`);
    }

    for (let i = 0; i < UGC_SCENE_STRUCTURE.length; i++) {
        const scene = UGC_SCENE_STRUCTURE[i];
        const assignment = assignments[i];

        if (!assignment) {
            errors.push(`Missing assignment for scene ${i + 1}: ${scene.name}`);
            continue;
        }

        if (scene.contentType === 'avatar' && !assignment.avatarImageUrl) {
            errors.push(`Scene ${i + 1} (${scene.name}) requires avatar but none provided`);
        }

        if (!assignment.scriptSegment) {
            errors.push(`Scene ${i + 1} (${scene.name}) missing script segment`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
