/**
 * UGC Progress Display Component
 * Generation progress with pipeline stages
 */

import React from 'react';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { UGCJobStatus, UGCPipelineStage, UGC_PIPELINE_STAGES } from '@/types/ugc';

interface ProgressDisplayProps {
    status: UGCJobStatus;
    progress: number;
    currentStage: string;
    error?: string;
}

export function ProgressDisplay({ status, progress, currentStage, error }: ProgressDisplayProps) {
    const getStageStatus = (stage: string) => {
        const stages = [...UGC_PIPELINE_STAGES];
        const currentIndex = stages.indexOf(currentStage as typeof stages[number]);
        const stageIndex = stages.indexOf(stage as typeof stages[number]);

        if (status === 'FAILED') return 'error';
        if (status === 'DONE') return 'complete';
        if (stageIndex < currentIndex) return 'complete';
        if (stageIndex === currentIndex) return 'active';
        return 'pending';
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'DONE':
                return <CheckCircle2 className="w-6 h-6 text-green-500" />;
            case 'FAILED':
                return <XCircle className="w-6 h-6 text-destructive" />;
            case 'PROCESSING':
            case 'RENDERING':
                return <Loader2 className="w-6 h-6 text-primary animate-spin" />;
            default:
                return <Clock className="w-6 h-6 text-muted-foreground" />;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'DONE':
                return 'Generation Complete';
            case 'FAILED':
                return 'Generation Failed';
            case 'PROCESSING':
                return 'Generating Videos...';
            case 'RENDERING':
                return 'Rendering...';
            default:
                return 'Ready to Generate';
        }
    };

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    {getStatusIcon()}
                    {getStatusText()}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Main Progress Bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Overall Progress</span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <Progress
                        value={progress}
                        className={`h-2 ${status === 'FAILED' ? '[&>div]:bg-destructive' : ''}`}
                    />
                </div>

                {/* Error Message */}
                {status === 'FAILED' && error && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                {/* Pipeline Stages */}
                {(status === 'PROCESSING' || status === 'RENDERING' || status === 'DONE') && (
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Pipeline Stages</p>
                        <div className="grid grid-cols-2 gap-2">
                            {UGC_PIPELINE_STAGES.map((stage) => {
                                const stageStatus = getStageStatus(stage);
                                return (
                                    <div
                                        key={stage}
                                        className={`
                      flex items-center gap-2 text-xs px-2 py-1.5 rounded-md transition-colors
                      ${stageStatus === 'complete' ? 'bg-green-500/10 text-green-600' : ''}
                      ${stageStatus === 'active' ? 'bg-primary/10 text-primary' : ''}
                      ${stageStatus === 'pending' ? 'bg-muted/30 text-muted-foreground' : ''}
                      ${stageStatus === 'error' ? 'bg-destructive/10 text-destructive' : ''}
                    `}
                                    >
                                        {stageStatus === 'complete' && <CheckCircle2 className="w-3 h-3" />}
                                        {stageStatus === 'active' && <Loader2 className="w-3 h-3 animate-spin" />}
                                        {stageStatus === 'pending' && <div className="w-3 h-3 rounded-full border border-current" />}
                                        {stageStatus === 'error' && <XCircle className="w-3 h-3" />}
                                        <span className="truncate">{stage}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Idle State */}
                {status === 'IDLE' && (
                    <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">Complete all sections to enable generation</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
