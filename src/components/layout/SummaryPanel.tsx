/**
 * SummaryPanel - Right side panel for tools
 * 
 * Shows:
 * - Project context
 * - Current step/progress
 * - Cost estimate
 * - Primary CTAs (always visible)
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, DollarSign, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Step {
    id: number;
    name: string;
    completed: boolean;
    current: boolean;
}

interface SummaryPanelProps {
    projectName?: string;
    steps?: Step[];
    currentStep?: number;
    totalSteps?: number;
    estimatedCost?: number;
    primaryAction?: {
        label: string;
        onClick: () => void;
        disabled?: boolean;
        loading?: boolean;
        icon?: React.ReactNode;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
        disabled?: boolean;
    };
    children?: React.ReactNode;
    className?: string;
}

export function SummaryPanel({
    projectName,
    steps,
    currentStep = 0,
    totalSteps = 0,
    estimatedCost,
    primaryAction,
    secondaryAction,
    children,
    className
}: SummaryPanelProps) {
    const completedSteps = steps?.filter(s => s.completed).length || 0;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Project Name */}
            {projectName && (
                <div className="pb-3 mb-3 border-b border-border">
                    <span className="text-kpi-label">Project</span>
                    <p className="text-sm font-medium truncate">{projectName}</p>
                </div>
            )}

            {/* Progress Bar */}
            {totalSteps > 0 && (
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-kpi-label">Progress</span>
                        <span className="text-xs text-muted-foreground">{completedSteps}/{totalSteps}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1">
                        <div
                            className="bg-primary h-1 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Steps List */}
            {steps && steps.length > 0 && (
                <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1 mb-3">
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded text-xs",
                                step.current && "bg-primary/10 border border-primary/20"
                            )}
                        >
                            {step.completed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : step.current ? (
                                <Circle className="w-3.5 h-3.5 text-primary shrink-0" />
                            ) : (
                                <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                            )}
                            <span className={cn(
                                "truncate",
                                step.current ? "font-medium text-foreground" : "text-muted-foreground"
                            )}>
                                {step.name}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Cost Estimate */}
            {typeof estimatedCost === 'number' && (
                <div className="flex items-center justify-between py-2 px-2 rounded bg-muted/50 mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <DollarSign className="w-3.5 h-3.5" />
                        Est. Cost
                    </div>
                    <span className="text-sm font-mono font-semibold">${estimatedCost.toFixed(2)}</span>
                </div>
            )}

            {/* Additional Content */}
            {children}

            {/* Primary Actions - Always at Bottom */}
            <div className="mt-auto pt-3 border-t border-border space-y-2">
                {primaryAction && (
                    <Button
                        className="w-full gap-2"
                        size="sm"
                        onClick={primaryAction.onClick}
                        disabled={primaryAction.disabled || primaryAction.loading}
                    >
                        {primaryAction.loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : primaryAction.icon ? (
                            primaryAction.icon
                        ) : (
                            <Zap className="w-4 h-4" />
                        )}
                        {primaryAction.label}
                    </Button>
                )}
                {secondaryAction && (
                    <Button
                        variant="outline"
                        className="w-full"
                        size="sm"
                        onClick={secondaryAction.onClick}
                        disabled={secondaryAction.disabled}
                    >
                        {secondaryAction.label}
                    </Button>
                )}
            </div>
        </div>
    );
}

export default SummaryPanel;
