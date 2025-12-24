import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Cpu, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

interface ExecutionDecision {
    decisionId: string;
    strategy: {
        engine: string;
        encoder: string;
        hardware: string;
        mode: string;
    };
    parameters: {
        resolution: { width: number; height: number };
        fps: number;
        bitrate: string;
        crf: number;
        preset: string;
        threads: number;
    };
    constraints: {
        maxDuration: number;
        watermark: boolean;
    };
    reasoning: string[];
}

interface DecisionTracePanelProps {
    jobId: string;
    decision: ExecutionDecision;
    jobStatus?: string;
    tool?: string;
    goal?: string;
    platform?: string;
}

export function DecisionTracePanel({
    jobId,
    decision,
    jobStatus = 'unknown',
    tool = 'studio',
    goal = 'balanced',
    platform = 'generic'
}: DecisionTracePanelProps) {

    // Cost estimation (informational only, no billing logic)
    const estimateRenderTime = () => {
        const pixelCount = decision.parameters.resolution.width * decision.parameters.resolution.height;
        const complexity = pixelCount * decision.parameters.fps;
        const baseTime = complexity / (decision.strategy.mode === 'hardware' ? 5000000 : 1000000);
        return Math.round(baseTime);
    };

    const estimateCreditCost = () => {
        const renderTimeSec = estimateRenderTime();
        return (renderTimeSec / 60 * 0.05).toFixed(3); // Mock: 0.05 credits per minute
    };

    return (
        <div className="space-y-4">
            {/* Section 1: Decision Summary (Context) */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        Decision Summary
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <span className="text-muted-foreground">Decision ID:</span>
                            <p className="font-mono text-xs mt-0.5">{decision.decisionId}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Tool:</span>
                            <p className="font-medium mt-0.5 capitalize">{tool}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Goal:</span>
                            <p className="font-medium mt-0.5 capitalize">{goal}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Platform:</span>
                            <p className="font-medium mt-0.5 capitalize">{platform}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 2: Execution Strategy (Core Table) */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-primary" />
                        Execution Strategy
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-border/30">
                            <span className="text-muted-foreground">Rendering Strategy:</span>
                            <span className="font-medium">{decision.strategy.engine}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-border/30">
                            <span className="text-muted-foreground">Encoder:</span>
                            <span className="font-mono">{decision.strategy.encoder}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-border/30">
                            <span className="text-muted-foreground">Hardware Path:</span>
                            <Badge variant={decision.strategy.mode === 'hardware' ? 'default' : 'secondary'} className="text-xs">
                                {decision.strategy.hardware}
                            </Badge>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-border/30">
                            <span className="text-muted-foreground">Threads Used:</span>
                            <span className="font-medium">{decision.parameters.threads || 'Auto'}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-border/30">
                            <span className="text-muted-foreground">Resolution:</span>
                            <span className="font-mono">{decision.parameters.resolution.width}x{decision.parameters.resolution.height}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-border/30">
                            <span className="text-muted-foreground">FPS:</span>
                            <span className="font-medium">{decision.parameters.fps}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-border/30">
                            <span className="text-muted-foreground">Bitrate:</span>
                            <span className="font-mono">{decision.parameters.bitrate}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-border/30">
                            <span className="text-muted-foreground">Preset:</span>
                            <span className="font-medium">{decision.parameters.preset}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                            <span className="text-muted-foreground">CRF/CQ:</span>
                            <span className="font-medium">{decision.parameters.crf}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 3: Decision Reasoning (Why) */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Decision Reasoning</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-1.5 text-xs">
                        {decision.reasoning.map((reason, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span>
                                <span className="text-muted-foreground">{reason}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>

            {/* Section 4: Cost & Performance Estimation */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Performance Estimation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Estimated Render Time:</span>
                        <span className="font-medium">{estimateRenderTime()}s</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Estimated Cost Units:</span>
                        <span className="font-mono">{estimateCreditCost()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                        * Informational only. Actual values may vary.
                    </p>
                </CardContent>
            </Card>

            {/* Section 5: Enforcement Status */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Lock className="h-4 w-4 text-amber-500" />
                        Enforcement Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Decision Locked:</span>
                        <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            YES
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Parameters Mutable:</span>
                        <Badge variant="secondary">
                            NO
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Executed As Planned:</span>
                        <Badge
                            variant={jobStatus === 'done' ? 'default' : jobStatus === 'error' ? 'destructive' : 'secondary'}
                            className="gap-1"
                        >
                            {jobStatus === 'done' && <CheckCircle2 className="h-3 w-3" />}
                            {jobStatus === 'error' && <AlertCircle className="h-3 w-3" />}
                            {jobStatus === 'done' ? 'YES' : jobStatus === 'error' ? 'FAILED' : 'PENDING'}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
