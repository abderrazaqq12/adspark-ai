/**
 * KPI Card Component - Compact Operator Mode
 * 
 * High-density metric card matching reference designs:
 * - ~80px height
 * - Value + trend + mini chart
 * - Subtle gradient background
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface KPICardProps {
    label: string;
    value: string | number;
    trend?: {
        value: number;
        direction: 'up' | 'down' | 'neutral';
    };
    icon?: React.ReactNode;
    sparkline?: number[];
    className?: string;
}

export function KPICard({ label, value, trend, icon, sparkline, className }: KPICardProps) {
    const TrendIcon = trend?.direction === 'up' ? TrendingUp
        : trend?.direction === 'down' ? TrendingDown
            : Minus;

    const trendColor = trend?.direction === 'up' ? 'text-emerald-400'
        : trend?.direction === 'down' ? 'text-red-400'
            : 'text-muted-foreground';

    return (
        <div className={cn(
            "relative overflow-hidden rounded-lg border border-border bg-card p-3",
            "hover:border-primary/30 transition-colors",
            className
        )}>
            {/* Header: Label + Icon */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-kpi-label flex items-center gap-1.5">
                    {icon && <span className="text-muted-foreground">{icon}</span>}
                    {label}
                </span>
                {trend && (
                    <div className={cn("flex items-center gap-0.5 text-xs", trendColor)}>
                        <TrendIcon className="w-3 h-3" />
                        <span>{Math.abs(trend.value)}%</span>
                    </div>
                )}
            </div>

            {/* Value + Sparkline */}
            <div className="flex items-end justify-between">
                <span className="text-kpi">{value}</span>

                {/* Mini Sparkline */}
                {sparkline && sparkline.length > 0 && (
                    <div className="flex items-end gap-px h-6">
                        {sparkline.slice(-8).map((val, i) => (
                            <div
                                key={i}
                                className="w-1 bg-primary/40 rounded-sm"
                                style={{
                                    height: `${Math.max(4, (val / Math.max(...sparkline)) * 24)}px`,
                                    opacity: 0.4 + (i / sparkline.length) * 0.6
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default KPICard;
