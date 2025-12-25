/**
 * UGC Voice Preview Service
 * Self-contained service for voice preview functionality
 */

import type { UGCLanguage, UGCGender, UGCVoiceOption } from '@/types/ugc';

// Voice configurations for different languages/genders
export const UGC_VOICE_OPTIONS: Record<UGCLanguage, Record<Exclude<UGCGender, 'ALL'>, UGCVoiceOption[]>> = {
    ARABIC: {
        MALE: [
            { id: 'ar-m-1', name: 'Daniel', description: 'Deep, authoritative', voiceId: 'onwK4e9ZLuTAKqWW03F9', sampleText: 'مرحباً، هذا دانيال يتحدث' },
            { id: 'ar-m-2', name: 'Brian', description: 'Warm, friendly', voiceId: 'nPczCjzI2devNBz1zQrb', sampleText: 'مرحباً، هذا براين يتحدث' },
        ],
        FEMALE: [
            { id: 'ar-f-1', name: 'Sarah', description: 'Clear, professional', voiceId: 'EXAVITQu4vr4xnSDxMaL', sampleText: 'مرحباً، هذه سارة تتحدث' },
            { id: 'ar-f-2', name: 'Lily', description: 'Soft, engaging', voiceId: 'pFZP5JQG7iQjIQuC4Bku', sampleText: 'مرحباً، هذه ليلي تتحدث' },
        ],
    },
    SPANISH: {
        MALE: [
            { id: 'es-m-1', name: 'George', description: 'Strong, confident', voiceId: 'JBFqnCBsd6RMkjVDRZzb', sampleText: 'Hola, esta es la voz de George' },
            { id: 'es-m-2', name: 'Liam', description: 'Casual, relatable', voiceId: 'TX3LPaxmHKxFdv7VOQHJ', sampleText: 'Hola, esta es la voz de Liam' },
        ],
        FEMALE: [
            { id: 'es-f-1', name: 'Laura', description: 'Warm, inviting', voiceId: 'FGY2WhTYpPnrIDTdsKH5', sampleText: 'Hola, esta es la voz de Laura' },
            { id: 'es-f-2', name: 'Matilda', description: 'Energetic, youthful', voiceId: 'XrExE9yKIg1WjnnlVkGX', sampleText: 'Hola, esta es la voz de Matilda' },
        ],
    },
    ENGLISH: {
        MALE: [
            { id: 'en-m-1', name: 'Adam', description: 'Professional, clear', voiceId: 'pNInz6obpgDQGcFmaJgB', sampleText: 'Hello, this is Adam speaking' },
            { id: 'en-m-2', name: 'Josh', description: 'Friendly, engaging', voiceId: 'TxGEqnHWrfWFTfGW9XjX', sampleText: 'Hello, this is Josh speaking' },
        ],
        FEMALE: [
            { id: 'en-f-1', name: 'Rachel', description: 'Warm, professional', voiceId: '21m00Tcm4TlvDq8ikWAM', sampleText: 'Hello, this is Rachel speaking' },
            { id: 'en-f-2', name: 'Emily', description: 'Energetic, youthful', voiceId: 'LcfcDJNUP1GQjkzn1xUU', sampleText: 'Hello, this is Emily speaking' },
        ],
    },
    FRENCH: {
        MALE: [
            { id: 'fr-m-1', name: 'Antoine', description: 'Sophisticated, clear', voiceId: 'IKne3meq5aSn9XLyUdCD', sampleText: 'Bonjour, ici Antoine' },
            { id: 'fr-m-2', name: 'Thomas', description: 'Friendly, natural', voiceId: 'g5CIjZEefAph4nQFvHAz', sampleText: 'Bonjour, ici Thomas' },
        ],
        FEMALE: [
            { id: 'fr-f-1', name: 'Charlotte', description: 'Elegant, professional', voiceId: 'XB0fDUnXU5powFXDhCwa', sampleText: 'Bonjour, ici Charlotte' },
            { id: 'fr-f-2', name: 'Amélie', description: 'Warm, engaging', voiceId: 'Xb7hH8MSUJpSbSDYk0k2', sampleText: 'Bonjour, ici Amélie' },
        ],
    },
};

// Storage keys for localStorage
const STORAGE_KEY_ELEVENLABS_API = 'ugc_elevenlabs_api_key';
const STORAGE_KEY_CUSTOM_VOICES = 'ugc_custom_voices';

// Cache for generated voice previews
const voicePreviewCache = new Map<string, string>();

/**
 * Get the saved ElevenLabs API key from localStorage
 */
export function getSavedElevenLabsApiKey(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY_ELEVENLABS_API);
}

/**
 * Save ElevenLabs API key to localStorage
 */
export function saveElevenLabsApiKey(apiKey: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_ELEVENLABS_API, apiKey);
}

/**
 * Get saved custom voices from localStorage
 */
export function getCustomVoices(): UGCVoiceOption[] {
    if (typeof window === 'undefined') return [];
    try {
        const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_VOICES);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * Save a custom voice to localStorage
 */
export function saveCustomVoice(voice: Omit<UGCVoiceOption, 'id' | 'isCustom'>): UGCVoiceOption {
    const customVoices = getCustomVoices();
    const newVoice: UGCVoiceOption = {
        ...voice,
        id: `custom-${Date.now()}`,
        isCustom: true,
    };
    customVoices.push(newVoice);
    localStorage.setItem(STORAGE_KEY_CUSTOM_VOICES, JSON.stringify(customVoices));
    return newVoice;
}

/**
 * Remove a custom voice from localStorage
 */
export function removeCustomVoice(voiceId: string): void {
    const customVoices = getCustomVoices();
    const filtered = customVoices.filter(v => v.voiceId !== voiceId);
    localStorage.setItem(STORAGE_KEY_CUSTOM_VOICES, JSON.stringify(filtered));
}

/**
 * Generate a voice preview sample via VPS backend
 */
export async function generateVoicePreview(
    voiceId: string,
    text: string,
    apiKey?: string
): Promise<string> {
    const cacheKey = `${voiceId}-${text}`;

    // Check cache first
    if (voicePreviewCache.has(cacheKey)) {
        return voicePreviewCache.get(cacheKey)!;
    }

    // Use VPS backend for TTS (adapted for FlowScale)
    const response = await fetch('/api/ugc-tts-preview', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text,
            voiceId,
            apiKey: apiKey || getSavedElevenLabsApiKey(),
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to generate voice preview' }));
        throw new Error(error.error || 'Failed to generate voice preview');
    }

    const data = await response.json();
    const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;

    // Cache the result
    voicePreviewCache.set(cacheKey, audioUrl);

    return audioUrl;
}

/**
 * Play a voice preview
 */
export function playVoicePreview(audioUrl: string): HTMLAudioElement {
    const audio = new Audio(audioUrl);
    audio.play();
    return audio;
}

/**
 * Get voices for a language/gender combination (including custom voices)
 */
export function getVoicesForConfig(language: UGCLanguage, gender: UGCGender): UGCVoiceOption[] {
    const customVoices = getCustomVoices();

    if (gender === 'ALL') {
        return [
            ...customVoices,
            ...(UGC_VOICE_OPTIONS[language]?.MALE || []),
            ...(UGC_VOICE_OPTIONS[language]?.FEMALE || []),
        ];
    }

    return [
        ...customVoices,
        ...(UGC_VOICE_OPTIONS[language]?.[gender] || []),
    ];
}
