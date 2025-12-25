/**
 * UGC ElevenLabs TTS Service
 * Self-contained TTS service for UGC video generation
 */

import type { UGCLanguage, UGCGender } from '@/types/ugc';

export interface UGCTTSRequest {
    text: string;
    voiceId: string;
    language?: UGCLanguage;
    gender?: UGCGender;
    voiceSettings?: {
        speedMultiplier?: number;
        stability?: number;
        similarityBoost?: number;
    };
}

export interface UGCTTSResult {
    audioContent: string; // base64 encoded MP3
    voiceId: string;
}

export interface UGCBatchTTSRequest {
    scripts: Array<{
        id: string;
        text: string;
        voiceId?: string;
    }>;
    defaultVoiceId: string;
}

export interface UGCBatchTTSResult {
    results: Array<{
        id: string;
        audioContent?: string;
        voiceId?: string;
        error?: string;
    }>;
}

/**
 * Generate a single voice audio from text via VPS backend
 */
export async function generateUGCVoice(request: UGCTTSRequest): Promise<UGCTTSResult> {
    const response = await fetch('/api/ugc-tts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'TTS request failed' }));
        throw new Error(error.error || `TTS request failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Generate multiple voice audios for a batch of scripts
 */
export async function generateUGCBatchVoices(request: UGCBatchTTSRequest): Promise<UGCBatchTTSResult> {
    const response = await fetch('/api/ugc-batch-tts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Batch TTS request failed' }));
        throw new Error(error.error || `Batch TTS request failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Play audio from base64 content
 */
export function playAudioFromBase64(base64Audio: string): HTMLAudioElement {
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
    const audio = new Audio(audioUrl);
    audio.play();
    return audio;
}

/**
 * Convert base64 audio to Blob URL for download
 */
export function base64ToAudioBlobUrl(base64Audio: string): string {
    const byteCharacters = atob(base64Audio);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'audio/mpeg' });
    return URL.createObjectURL(blob);
}

/**
 * Download audio as MP3 file
 */
export function downloadAudioAsMP3(base64Audio: string, filename: string = 'voice.mp3'): void {
    const blobUrl = base64ToAudioBlobUrl(base64Audio);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
}
