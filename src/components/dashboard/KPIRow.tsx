/**
 * KPI Row Component - Dashboard Header
 * 
 * Displays 4 KPI cards in a single row (matching references)
 */

import React from 'react';
import { KPICard, KPICardProps } from './KPICard';
import { cn } from '@/lib/utils';

export interface KPIRowProps {
    kpis: KPICardProps[];
    className?: string;
}

export function KPIRow({ kpis, className }: KPIRowProps) {
    return (
        <div className={cn(
            "grid grid-cols-2 md:grid-cols-4 gap-3",
            className
        )}>
            {kpis.map((kpi, index) => (
                <KPICard key={index} {...kpi} />
            ))}
        </div>
    );
}

export default KPIRow;
