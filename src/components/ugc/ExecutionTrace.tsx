/**
 * ExecutionTrace Component
 * Read-only debug panel showing decision path, engines, fallbacks, and timing
 * Part of FlowScale's Phase 4.1 Decision Trace UI
 */

import React from 'react';
import { Bug, Clock, GitBranch, Server, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EngineStatus {
    available: boolean;
    reason: string | null;
}

interface ExecutionStage {
    name: string;
    engine: string;
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
    status: 'running' | 'done' | 'error';
}

interface ExecutionTraceData {
    batchId?: string;
    startedAt?: string;
    completedAt?: string;
    decisions?: {
        avatarEngine: string;
        scriptEngine: string;
        voiceEngine: string | null;
        assembler: string;
    };
    stages?: ExecutionStage[];
    fallbacks?: { from: string; reason: string }[];
}

interface EngineStatusReport {
    engines: Record<string, EngineStatus>;
    avatarStack: {
        primary: string;
        fallback: string;
        qualityGuard: string;
        animator: string;
        animatorFallback: string;
        assembler: string;
    };
    timestamp: string;
}

interface ExecutionTraceProps {
    trace?: ExecutionTraceData;
    engineStatus?: EngineStatusReport;
    isLoading?: boolean;
}

export function ExecutionTrace({ trace, engineStatus, isLoading }: ExecutionTraceProps) {
    if (isLoading) {
        return (
            <Card className="border-border/30 bg-muted/20">
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading execution trace...</span>
                </CardContent>
            </Card>
        );
    }

    if (!trace && !engineStatus) {
        return null;
    }

    return (
        <Card className="border-border/30 bg-muted/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <Bug className="w-4 h-4" />
                    Execution Trace
                    <Badge variant="outline" className="text-[10px]">READ-ONLY</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Engine Status Section */}
                {engineStatus && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Server className="w-3 h-3" />
                            Engine Status
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(engineStatus.engines).map(([engine, status]) => (
                                <div
                                    key={engine}
                                    className={`flex items-center justify-between p-2 rounded-md text-xs ${status.available ? 'bg-green-500/10' : 'bg-muted/50'
                                        }`}
                                >
                                    <span className="font-mono">{engine}</span>
                                    {status.available ? (
                                        <CheckCircle className="w-3 h-3 text-green-500" />
                                    ) : (
                                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Decision Path Section */}
                {trace?.decisions && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <GitBranch className="w-3 h-3" />
                            Decision Path
                        </h4>
                        <div className="bg-muted/30 rounded-md p-3 space-y-1">
                            <DecisionRow label="Avatar Engine" value={trace.decisions.avatarEngine} />
                            <DecisionRow label="Script Engine" value={trace.decisions.scriptEngine} />
                            <DecisionRow label="Voice Engine" value={trace.decisions.voiceEngine || 'none'} />
                            <DecisionRow label="Assembler" value={trace.decisions.assembler} />
                        </div>
                    </div>
                )}

                {/* Fallbacks Section */}
                {trace?.fallbacks && trace.fallbacks.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-medium text-amber-500 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" />
                            Fallbacks Triggered ({trace.fallbacks.length})
                        </h4>
                        <div className="space-y-1">
                            {trace.fallbacks.map((fb, i) => (
                                <div key={i} className="text-xs bg-amber-500/10 rounded p-2">
                                    <span className="font-mono">{fb.from}</span>
                                    <span className="text-muted-foreground"> → {fb.reason}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Execution Stages Section */}
                {trace?.stages && trace.stages.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            Execution Stages
                        </h4>
                        <div className="space-y-1">
                            {trace.stages.map((stage, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center justify-between p-2 rounded text-xs ${stage.status === 'done'
                                            ? 'bg-green-500/10'
                                            : stage.status === 'running'
                                                ? 'bg-blue-500/10'
                                                : 'bg-red-500/10'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {stage.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                                        {stage.status === 'done' && <CheckCircle className="w-3 h-3 text-green-500" />}
                                        {stage.status === 'error' && <AlertTriangle className="w-3 h-3 text-red-500" />}
                                        <span>{stage.name}</span>
                                        <Badge variant="secondary" className="text-[10px]">{stage.engine}</Badge>
                                    </div>
                                    {stage.durationMs && (
                                        <span className="text-muted-foreground">{stage.durationMs}ms</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Timestamp */}
                {trace?.startedAt && (
                    <div className="text-[10px] text-muted-foreground text-right">
                        Started: {new Date(trace.startedAt).toLocaleTimeString()}
                        {trace.completedAt && ` • Completed: ${new Date(trace.completedAt).toLocaleTimeString()}`}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function DecisionRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{label}:</span>
            <span className="font-mono">{value}</span>
        </div>
    );
}

export default ExecutionTrace;
