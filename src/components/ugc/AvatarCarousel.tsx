/**
 * UGC Avatar Carousel Component
 * Displays generated avatars in a carousel with click-to-preview
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, RefreshCw, Check, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { UGCGeneratedAvatar } from '@/types/ugc';

interface AvatarCarouselProps {
    avatars: UGCGeneratedAvatar[];
    selectedId?: string;
    onSelect: (avatarId: string) => void;
    onRegenerate?: () => void;
    isRegenerating?: boolean;
}

export function AvatarCarousel({
    avatars,
    selectedId,
    onSelect,
    onRegenerate,
    isRegenerating
}: AvatarCarouselProps) {
    const [previewAvatar, setPreviewAvatar] = useState<UGCGeneratedAvatar | null>(null);
    const [startIndex, setStartIndex] = useState(0);

    const visibleCount = Math.min(5, avatars.length);
    const canScrollLeft = startIndex > 0;
    const canScrollRight = startIndex + visibleCount < avatars.length;

    const scrollLeft = () => {
        if (canScrollLeft) setStartIndex(startIndex - 1);
    };

    const scrollRight = () => {
        if (canScrollRight) setStartIndex(startIndex + 1);
    };

    const visibleAvatars = avatars.slice(startIndex, startIndex + visibleCount);

    if (avatars.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Click "Generate Avatars" to create AI avatars</p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-3">
                {/* Carousel Container */}
                <div className="flex items-center gap-2">
                    {/* Left Arrow */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={scrollLeft}
                        disabled={!canScrollLeft}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>

                    {/* Avatars Grid */}
                    <div className="flex-1 grid grid-cols-5 gap-2">
                        {visibleAvatars.map((avatar) => (
                            <button
                                key={avatar.id}
                                onClick={() => onSelect(avatar.id)}
                                className={`
                  relative aspect-square rounded-xl overflow-hidden border-2 transition-all group
                  ${avatar.id === selectedId
                                        ? 'border-primary ring-2 ring-primary/30 scale-105'
                                        : 'border-border/50 hover:border-primary/50'}
                `}
                            >
                                <img
                                    src={avatar.imageUrl}
                                    alt={`Avatar ${avatar.gender}`}
                                    className="w-full h-full object-cover"
                                />

                                {/* Selected Indicator */}
                                {avatar.id === selectedId && (
                                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                        <Check className="w-3 h-3 text-primary-foreground" />
                                    </div>
                                )}

                                {/* Gender Badge */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                                    <span className="text-[10px] text-white font-medium">
                                        {avatar.gender === 'MALE' ? '👨 Male' : '👩 Female'}
                                    </span>
                                </div>

                                {/* Expand Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewAvatar(avatar);
                                    }}
                                    className="absolute top-1 left-1 w-6 h-6 rounded-md bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Maximize2 className="w-3 h-3 text-white" />
                                </button>
                            </button>
                        ))}
                    </div>

                    {/* Right Arrow */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={scrollRight}
                        disabled={!canScrollRight}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>

                {/* Info & Regenerate */}
                <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                        Click to select • Each video uses a different avatar
                    </p>
                    {onRegenerate && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRegenerate}
                            disabled={isRegenerating}
                            className="h-7 text-xs"
                        >
                            <RefreshCw className={`w-3 h-3 mr-1 ${isRegenerating ? 'animate-spin' : ''}`} />
                            Regenerate
                        </Button>
                    )}
                </div>
            </div>

            {/* Preview Modal */}
            <Dialog open={!!previewAvatar} onOpenChange={() => setPreviewAvatar(null)}>
                <DialogContent className="max-w-md p-0 overflow-hidden">
                    <DialogTitle className="sr-only">Avatar Preview</DialogTitle>
                    {previewAvatar && (
                        <div className="relative">
                            <img
                                src={previewAvatar.imageUrl}
                                alt="Avatar Preview"
                                className="w-full aspect-[3/4] object-cover"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white font-medium">
                                            {previewAvatar.gender === 'MALE' ? '👨 Male Avatar' : '👩 Female Avatar'}
                                        </p>
                                        <p className="text-white/70 text-sm">
                                            {previewAvatar.market} • {previewAvatar.language}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            onSelect(previewAvatar.id);
                                            setPreviewAvatar(null);
                                        }}
                                        className="bg-primary"
                                    >
                                        {previewAvatar.id === selectedId ? 'Selected' : 'Select'}
                                    </Button>
                                </div>
                            </div>
                            <button
                                onClick={() => setPreviewAvatar(null)}
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
