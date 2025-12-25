/**
 * UGC Voice Preview Component
 * ElevenLabs voice selection and preview
 */

import React, { useState, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { UGCLanguage, UGCGender, UGCVoiceOption } from '@/types/ugc';
import { getVoicesForConfig, generateVoicePreview, playVoicePreview } from '@/services/ugc/voicePreview';

interface VoicePreviewProps {
    language: UGCLanguage;
    gender: UGCGender;
    selectedVoiceId?: string;
    onSelectVoice: (voiceId: string) => void;
    apiKey?: string;
}

export function VoicePreview({
    language,
    gender,
    selectedVoiceId,
    onSelectVoice,
    apiKey
}: VoicePreviewProps) {
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'premade' | 'custom'>('all');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const voices = getVoicesForConfig(language, gender);

    const filteredVoices = categoryFilter === 'all'
        ? voices
        : categoryFilter === 'custom'
            ? voices.filter(v => v.isCustom)
            : voices.filter(v => !v.isCustom);

    const handlePreview = async (voice: UGCVoiceOption) => {
        // If already playing this voice, stop it
        if (playingVoiceId === voice.voiceId) {
            audioRef.current?.pause();
            setPlayingVoiceId(null);
            return;
        }

        // Stop any currently playing audio
        if (audioRef.current) {
            audioRef.current.pause();
        }

        setLoadingVoiceId(voice.voiceId);

        try {
            const audioUrl = await generateVoicePreview(
                voice.voiceId,
                voice.sampleText,
                apiKey
            );

            audioRef.current = new Audio(audioUrl);
            audioRef.current.onended = () => setPlayingVoiceId(null);
            audioRef.current.play();
            setPlayingVoiceId(voice.voiceId);
        } catch (error) {
            console.error('Failed to preview voice:', error);
        } finally {
            setLoadingVoiceId(null);
        }
    };

    const handleSelect = (voice: UGCVoiceOption) => {
        onSelectVoice(voice.voiceId);
    };

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    Voice Selection
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Filter Tabs */}
                <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}>
                    <TabsList className="grid w-full grid-cols-3 h-8">
                        <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                        <TabsTrigger value="premade" className="text-xs">Premade</TabsTrigger>
                        <TabsTrigger value="custom" className="text-xs">Custom</TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Voices List */}
                <ScrollArea className="h-[240px] pr-2">
                    <div className="space-y-2">
                        {filteredVoices.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <VolumeX className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No {categoryFilter} voices found</p>
                            </div>
                        ) : (
                            filteredVoices.map((voice) => (
                                <div
                                    key={voice.id}
                                    onClick={() => handleSelect(voice)}
                                    className={`
                    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                    ${selectedVoiceId === voice.voiceId
                                            ? 'bg-primary/10 border-2 border-primary'
                                            : 'bg-muted/30 border-2 border-transparent hover:border-primary/30'}
                  `}
                                >
                                    {/* Play Button */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePreview(voice);
                                        }}
                                    >
                                        {loadingVoiceId === voice.voiceId ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : playingVoiceId === voice.voiceId ? (
                                            <Pause className="w-4 h-4" />
                                        ) : (
                                            <Play className="w-4 h-4" />
                                        )}
                                    </Button>

                                    {/* Voice Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{voice.name}</span>
                                            {voice.isCustom && (
                                                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                                                    Custom
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {voice.description}
                                        </p>
                                    </div>

                                    {/* Selected Indicator */}
                                    {selectedVoiceId === voice.voiceId && (
                                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                                            <Check className="w-3 h-3 text-primary-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                {/* Help Text */}
                <p className="text-[10px] text-muted-foreground text-center">
                    Click speaker icon to preview • Click card to select
                </p>
            </CardContent>
        </Card>
    );
}
