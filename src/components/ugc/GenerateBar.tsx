/**
 * UGC Generate Bar Component
 * Bottom action bar with generate button and status
 */

import React from 'react';
import { Sparkles, Loader2, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { UGCJobStatus } from '@/types/ugc';

interface GenerateBarProps {
    videoCount: number;
    isReady: boolean;
    status: UGCJobStatus;
    progress?: number;
    onGenerate: () => void;
    estimatedTime?: number; // in minutes
}

export function GenerateBar({
    videoCount,
    isReady,
    status,
    progress = 0,
    onGenerate,
    estimatedTime
}: GenerateBarProps) {
    const isProcessing = status === 'PROCESSING' || status === 'RENDERING';
    const isDone = status === 'DONE';

    const getStatusText = () => {
        if (isDone) return 'Generation Complete';
        if (isProcessing) return `Generating ${videoCount} videos...`;
        if (isReady) return 'Ready to Generate';
        return 'Complete all sections to enable generation';
    };

    const getEstimatedTime = () => {
        if (estimatedTime) return `~${estimatedTime} min`;
        return `~${Math.ceil(videoCount * 0.5)} min`;
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6 py-4">
                {/* Progress Bar (when processing) */}
                {isProcessing && (
                    <div className="mb-3">
                        <Progress value={progress} className="h-1.5" />
                    </div>
                )}

                <div className="flex items-center justify-between">
                    {/* Left: Status */}
                    <div className="flex items-center gap-3">
                        <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center
              ${isDone ? 'bg-green-500/20' : isProcessing ? 'bg-primary/20' : 'bg-muted/50'}
            `}>
                            {isDone ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : isProcessing ? (
                                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            ) : (
                                <Sparkles className="w-5 h-5 text-muted-foreground" />
                            )}
                        </div>
                        <div>
                            <p className="font-medium text-sm">{getStatusText()}</p>
                            <p className="text-xs text-muted-foreground">
                                {videoCount} video variant{videoCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    {/* Right: Estimated Time + Generate Button */}
                    <div className="flex items-center gap-4">
                        {!isDone && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>Estimated time</span>
                                <span className="font-medium text-foreground">{getEstimatedTime()}</span>
                            </div>
                        )}

                        <Button
                            size="lg"
                            onClick={onGenerate}
                            disabled={!isReady || isProcessing}
                            className="min-w-[200px] bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : isDone ? (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate More
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate UGC Videos
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
