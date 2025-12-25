/**
 * UGC Product Analysis Service
 * Self-contained product image analysis for UGC videos
 */

import type { UGCProductCategory } from '@/types/ugc';

interface ProductAnalysisResult {
    category: UGCProductCategory;
    suggestedName: string;
    suggestedBenefit: string;
}

/**
 * Analyze a product image using AI to detect category and suggest name/benefit
 */
export async function analyzeProductImage(imageBase64: string): Promise<ProductAnalysisResult | null> {
    try {
        const response = await fetch('/api/ugc-analyze-product', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageBase64 }),
        });

        if (!response.ok) {
            console.error('Product analysis failed:', response.status);
            return null;
        }

        const data = await response.json();

        if (!data?.success) {
            console.error('Analysis failed:', data?.error);
            return null;
        }

        return {
            category: data.category as UGCProductCategory,
            suggestedName: data.suggestedName || '',
            suggestedBenefit: data.suggestedBenefit || '',
        };
    } catch (err) {
        console.error('Failed to analyze product image:', err);
        return null;
    }
}

/**
 * Convert File to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix if present
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

/**
 * Detect product category from image (local heuristic fallback)
 */
export function detectCategoryFromFileName(fileName: string): UGCProductCategory {
    const lower = fileName.toLowerCase();

    if (lower.includes('beauty') || lower.includes('makeup') || lower.includes('skincare') || lower.includes('cream')) {
        return 'beauty';
    }
    if (lower.includes('tech') || lower.includes('phone') || lower.includes('laptop') || lower.includes('gadget')) {
        return 'tech';
    }
    if (lower.includes('fashion') || lower.includes('cloth') || lower.includes('dress') || lower.includes('shirt')) {
        return 'fashion';
    }
    if (lower.includes('food') || lower.includes('drink') || lower.includes('snack') || lower.includes('meal')) {
        return 'food';
    }
    if (lower.includes('health') || lower.includes('vitamin') || lower.includes('supplement') || lower.includes('fitness')) {
        return 'health';
    }
    if (lower.includes('home') || lower.includes('decor') || lower.includes('furniture') || lower.includes('kitchen')) {
        return 'home';
    }

    return 'general';
}
