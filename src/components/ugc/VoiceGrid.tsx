/**
 * UGC Voice Grid Component
 * My Voices + Preset Voices selection with market-specific options
 */

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Play, Pause, Loader2, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { UGCLanguage, UGCVoiceOption } from '@/types/ugc';
import { UGC_VOICE_OPTIONS } from '@/services/ugc/voicePreview';

interface VoiceGridProps {
    language: UGCLanguage;
    selectedVoiceId?: string;
    onSelectVoice: (voiceId: string) => void;
    apiKey?: string;
    onRefreshVoices?: () => void;
    myVoices?: UGCVoiceOption[];
    isLoading?: boolean;
}

// Market-specific preset voices
const PRESET_VOICES: Record<UGCLanguage, UGCVoiceOption[]> = {
    ARABIC: [
        { id: 'ar-daniel', name: 'Daniel', description: 'Deep, authoritative', voiceId: 'onwK4e9ZLuTAKqWW03F9', sampleText: 'مرحباً' },
        { id: 'ar-brian', name: 'Brian', description: 'Warm, friendly', voiceId: 'nPczCjzI2devNBz1zQrb', sampleText: 'مرحباً' },
        { id: 'ar-sarah', name: 'Sarah', description: 'Clear, professional', voiceId: 'EXAVITQu4vr4xnSDxMaL', sampleText: 'مرحباً' },
        { id: 'ar-lily', name: 'Lily', description: 'Soft, engaging', voiceId: 'pFZP5JQG7iQjIQuC4Bku', sampleText: 'مرحباً' },
    ],
    SPANISH: [
        { id: 'es-george', name: 'George', description: 'Strong, confident', voiceId: 'JBFqnCBsd6RMkjVDRZzb', sampleText: 'Hola' },
        { id: 'es-liam', name: 'Liam', description: 'Casual, relatable', voiceId: 'TX3LPaxmHKxFdv7VOQHJ', sampleText: 'Hola' },
        { id: 'es-laura', name: 'Laura', description: 'Warm, inviting', voiceId: 'FGY2WhTYpPnrIDTdsKH5', sampleText: 'Hola' },
        { id: 'es-matilda', name: 'Matilda', description: 'Energetic, youthful', voiceId: 'XrExE9yKIg1WjnnlVkGX', sampleText: 'Hola' },
    ],
    ENGLISH: [
        { id: 'en-adam', name: 'Adam', description: 'Professional, clear', voiceId: 'pNInz6obpgDQGcFmaJgB', sampleText: 'Hello' },
        { id: 'en-josh', name: 'Josh', description: 'Friendly, engaging', voiceId: 'TxGEqnHWrfWFTfGW9XjX', sampleText: 'Hello' },
        { id: 'en-rachel', name: 'Rachel', description: 'Warm, professional', voiceId: '21m00Tcm4TlvDq8ikWAM', sampleText: 'Hello' },
        { id: 'en-emily', name: 'Emily', description: 'Energetic, youthful', voiceId: 'LcfcDJNUP1GQjkzn1xUU', sampleText: 'Hello' },
    ],
    FRENCH: [
        { id: 'fr-antoine', name: 'Antoine', description: 'Sophisticated, clear', voiceId: 'IKne3meq5aSn9XLyUdCD', sampleText: 'Bonjour' },
        { id: 'fr-thomas', name: 'Thomas', description: 'Friendly, natural', voiceId: 'g5CIjZEefAph4nQFvHAz', sampleText: 'Bonjour' },
        { id: 'fr-charlotte', name: 'Charlotte', description: 'Elegant, professional', voiceId: 'XB0fDUnXU5powFXDhCwa', sampleText: 'Bonjour' },
        { id: 'fr-amelie', name: 'Amélie', description: 'Warm, engaging', voiceId: 'Xb7hH8MSUJpSbSDYk0k2', sampleText: 'Bonjour' },
    ],
};

export function VoiceGrid({
    language,
    selectedVoiceId,
    onSelectVoice,
    apiKey,
    onRefreshVoices,
    myVoices = [],
    isLoading = false
}: VoiceGridProps) {
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const presetVoices = PRESET_VOICES[language] || PRESET_VOICES.ENGLISH;

    const handlePlayPreview = async (voice: UGCVoiceOption) => {
        if (playingVoiceId === voice.voiceId) {
            audioRef.current?.pause();
            setPlayingVoiceId(null);
            return;
        }

        // For demo, just show playing state
        setPlayingVoiceId(voice.voiceId);
        setTimeout(() => setPlayingVoiceId(null), 2000);
    };

    const VoiceCard = ({ voice, isPreset = false }: { voice: UGCVoiceOption; isPreset?: boolean }) => (
        <div
            onClick={() => onSelectVoice(voice.voiceId)}
            className={`
        relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border-2
        ${selectedVoiceId === voice.voiceId
                    ? 'border-primary bg-primary/5'
                    : 'border-border/50 hover:border-primary/30 bg-card/50'}
      `}
        >
            {/* Play Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPreview(voice);
                }}
                className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center shrink-0 hover:bg-muted transition-colors"
            >
                {playingVoiceId === voice.voiceId ? (
                    <Pause className="w-4 h-4 text-primary" />
                ) : (
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                )}
            </button>

            {/* Voice Info */}
            <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{voice.name}</p>
                <p className="text-xs text-muted-foreground truncate">{voice.description}</p>
            </div>

            {/* Selected Check */}
            {selectedVoiceId === voice.voiceId && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary-foreground" />
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* My Voices Section */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        ✨ My Voices
                    </h4>
                    {onRefreshVoices && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRefreshVoices}
                            disabled={isLoading}
                            className="h-7 text-xs"
                        >
                            <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    )}
                </div>

                {myVoices.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground bg-muted/20 rounded-lg">
                        <p className="text-xs">No voices found in your ElevenLabs account</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {myVoices.map((voice) => (
                            <VoiceCard key={voice.id} voice={voice} />
                        ))}
                    </div>
                )}
            </div>

            {/* Preset Voices Section */}
            <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    🎙️ Preset Voices
                </h4>
                <div className="grid grid-cols-2 gap-2">
                    {presetVoices.map((voice) => (
                        <VoiceCard key={voice.id} voice={voice} isPreset />
                    ))}
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                    Click speaker icon to preview • Click card to select
                </p>
            </div>
        </div>
    );
}
