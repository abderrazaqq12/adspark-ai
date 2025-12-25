/**
 * UGC Avatar Generation Service
 * Self-contained avatar generation for UGC videos
 */

import type { UGCMarket, UGCLanguage, UGCGeneratedAvatar, UGCGender } from '@/types/ugc';

interface GenerateAvatarParams {
    market: UGCMarket;
    language: UGCLanguage;
    gender: 'MALE' | 'FEMALE';
    productCategory?: string;
}

interface GenerateAvatarResult {
    imageUrl: string;
}

/**
 * Generate a single avatar using AI via VPS backend
 */
export async function generateUGCAvatar(params: GenerateAvatarParams): Promise<GenerateAvatarResult> {
    const response = await fetch('/api/ugc-generate-avatar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to generate avatar' }));
        throw new Error(error.error || 'Failed to generate avatar');
    }

    const data = await response.json();

    if (!data?.imageUrl) {
        throw new Error('No image returned from generation');
    }

    return data;
}

/**
 * Generate batch of avatars (3-5) for UGC video generation
 * When gender is 'ALL', generates both male and female avatars
 */
export async function generateUGCAvatarBatch(options: {
    market: UGCMarket;
    language: UGCLanguage;
    gender: UGCGender;
    count?: number;
    productCategory?: string;
}): Promise<UGCGeneratedAvatar[]> {
    const count = options.count || 5;

    // Determine genders to generate
    const genders: Array<'MALE' | 'FEMALE'> =
        options.gender === 'ALL'
            ? ['MALE', 'FEMALE']
            : [options.gender as 'MALE' | 'FEMALE'];

    const promises: Promise<UGCGeneratedAvatar | null>[] = [];
    let avatarIndex = 0;

    for (const gender of genders) {
        const genderCount = options.gender === 'ALL'
            ? (gender === 'MALE' ? Math.ceil(count / 2) : Math.floor(count / 2))
            : count;

        for (let i = 0; i < genderCount && avatarIndex < count; i++) {
            const currentIndex = avatarIndex++;
            const promise = generateUGCAvatar({
                market: options.market,
                language: options.language,
                gender,
                productCategory: options.productCategory,
            }).then((result): UGCGeneratedAvatar => ({
                id: `avatar-${Date.now()}-${currentIndex}`,
                imageUrl: result.imageUrl,
                gender,
                market: options.market,
                language: options.language,
                isSelected: currentIndex === 0,
            })).catch((err): null => {
                console.error(`Failed to generate avatar ${currentIndex + 1}:`, err);
                return null;
            });

            promises.push(promise);
        }
    }

    const results = await Promise.all(promises);

    // Filter out failed generations
    const successfulAvatars = results.filter((a): a is UGCGeneratedAvatar => a !== null);

    // Sort and ensure first is selected
    successfulAvatars.sort((a, b) => a.id.localeCompare(b.id));
    if (successfulAvatars.length > 0) {
        successfulAvatars.forEach((a, i) => {
            a.isSelected = i === 0;
        });
    }

    return successfulAvatars;
}

/**
 * Validate avatar quality (client-side check)
 */
export function validateAvatarQuality(imageUrl: string): boolean {
    if (!imageUrl) return false;
    // Accept both data URLs and http URLs
    return imageUrl.startsWith('data:image/') || imageUrl.startsWith('http');
}

/**
 * Generate placeholder avatars for demo/testing
 */
export function generatePlaceholderAvatars(
    count: number = 5,
    market: UGCMarket = 'USA',
    language: UGCLanguage = 'ENGLISH',
    genderFilter: UGCGender = 'ALL'
): UGCGeneratedAvatar[] {
    const avatars: UGCGeneratedAvatar[] = [];
    const genders: Array<'MALE' | 'FEMALE'> =
        genderFilter === 'ALL'
            ? ['MALE', 'FEMALE']
            : [genderFilter as 'MALE' | 'FEMALE'];

    for (let i = 0; i < count; i++) {
        const gender = genders[i % genders.length];
        // Use realistic photo placeholder for demo
        const seed = `${market}-${language}-${gender}-${Date.now()}-${i}`;
        avatars.push({
            id: `avatar-${Date.now()}-${i}`,
            imageUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundColor=c0aede,d1d4f9,ffd5dc,ffdfbf`,
            gender,
            market,
            language,
            isSelected: i === 0,
        });
    }

    return avatars;
}
