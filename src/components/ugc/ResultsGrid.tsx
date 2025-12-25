/**
 * UGC Results Grid Component
 * Display generated videos
 */

import React, { useState } from 'react';
import { Play, Download, Share2, Trash2, ExternalLink, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { UGCVideoVariant } from '@/types/ugc';

interface ResultsGridProps {
    variants: UGCVideoVariant[];
    onDownload?: (variant: UGCVideoVariant) => void;
    onDelete?: (variantId: string) => void;
    onShare?: (variant: UGCVideoVariant) => void;
}

export function ResultsGrid({ variants, onDownload, onDelete, onShare }: ResultsGridProps) {
    const [playingId, setPlayingId] = useState<string | null>(null);

    const completedVariants = variants.filter(v => v.status === 'DONE' && v.outputUrl);
    const pendingVariants = variants.filter(v => v.status !== 'DONE' && v.status !== 'FAILED');
    const failedVariants = variants.filter(v => v.status === 'FAILED');

    if (variants.length === 0) {
        return (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="py-12 text-center">
                    <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-medium mb-2">No Videos Yet</h3>
                    <p className="text-sm text-muted-foreground">
                        Configure your settings and click Generate to create UGC videos
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Video className="w-4 h-4 text-primary" />
                        Generated Videos
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs">
                        {completedVariants.length > 0 && (
                            <Badge variant="default" className="bg-green-500/20 text-green-600">
                                {completedVariants.length} Complete
                            </Badge>
                        )}
                        {pendingVariants.length > 0 && (
                            <Badge variant="secondary">
                                {pendingVariants.length} Processing
                            </Badge>
                        )}
                        {failedVariants.length > 0 && (
                            <Badge variant="destructive">
                                {failedVariants.length} Failed
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px]">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pr-4">
                        {variants.map((variant) => (
                            <div
                                key={variant.id}
                                className={`
                  relative group rounded-lg overflow-hidden border transition-all
                  ${variant.status === 'DONE'
                                        ? 'border-border hover:border-primary/50'
                                        : variant.status === 'FAILED'
                                            ? 'border-destructive/50'
                                            : 'border-border/50'}
                `}
                            >
                                {/* Thumbnail / Video */}
                                <div className="aspect-[9/16] bg-muted/30 relative">
                                    {variant.thumbnailUrl || variant.outputUrl ? (
                                        <>
                                            {playingId === variant.id && variant.outputUrl ? (
                                                <video
                                                    src={variant.outputUrl}
                                                    className="w-full h-full object-cover"
                                                    autoPlay
                                                    onEnded={() => setPlayingId(null)}
                                                    controls
                                                />
                                            ) : (
                                                <img
                                                    src={variant.thumbnailUrl || '/placeholder-video.jpg'}
                                                    alt={`Video ${variant.variantNumber}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            {variant.status === 'FAILED' ? (
                                                <span className="text-destructive text-xs">Failed</span>
                                            ) : (
                                                <div className="animate-pulse flex flex-col items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-muted" />
                                                    <div className="w-16 h-2 bg-muted rounded" />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Variant Number Badge */}
                                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                                        #{variant.variantNumber}
                                    </div>

                                    {/* Play Overlay (for completed videos) */}
                                    {variant.status === 'DONE' && variant.outputUrl && playingId !== variant.id && (
                                        <button
                                            onClick={() => setPlayingId(variant.id)}
                                            className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                <Play className="w-6 h-6 text-white fill-white" />
                                            </div>
                                        </button>
                                    )}
                                </div>

                                {/* Info & Actions */}
                                <div className="p-2 space-y-2">
                                    {/* Hook Text Preview */}
                                    {variant.hookText && (
                                        <p className="text-[10px] text-muted-foreground line-clamp-2">
                                            "{variant.hookText}"
                                        </p>
                                    )}

                                    {/* Actions */}
                                    {variant.status === 'DONE' && variant.outputUrl && (
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 flex-1 text-xs"
                                                onClick={() => onDownload?.(variant)}
                                            >
                                                <Download className="w-3 h-3 mr-1" />
                                                Download
                                            </Button>
                                            {onShare && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0"
                                                    onClick={() => onShare(variant)}
                                                >
                                                    <Share2 className="w-3 h-3" />
                                                </Button>
                                            )}
                                            {onDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => onDelete(variant.id)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
