/**
 * Predictive Metrics Display
 * CTR / Hook Strength / Drop-off Risk indicators
 * Clearly labeled as estimates, not guarantees
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Zap, 
  MousePointer, 
  AlertTriangle, 
  Target,
  Info
} from 'lucide-react';

export interface PredictiveMetricsData {
  hookStrength: number; // 0-100
  ctrPotential: 'low' | 'medium' | 'high';
  dropOffRisk: 'early' | 'mid' | 'late' | 'low';
  ctaPressure: number; // 0-100
}

interface PredictiveMetricsProps {
  metrics: PredictiveMetricsData;
  compact?: boolean;
}

export function PredictiveMetrics({ metrics, compact = false }: PredictiveMetricsProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border border-border">
        <TooltipProvider>
          <CompactMetric 
            icon={<Zap className="w-4 h-4" />}
            label="Hook"
            value={metrics.hookStrength}
            isScore
            tooltip="How likely the first 2 seconds will stop the scroll"
          />
          <CompactMetric 
            icon={<MousePointer className="w-4 h-4" />}
            label="CTR"
            value={metrics.ctrPotential}
            tooltip="Estimated click-through rate potential based on hook + CTA"
          />
          <CompactMetric 
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Drop-off"
            value={metrics.dropOffRisk}
            isRisk
            tooltip="Where viewers are most likely to leave"
          />
          <CompactMetric 
            icon={<Target className="w-4 h-4" />}
            label="CTA"
            value={metrics.ctaPressure}
            isScore
            tooltip="How compelling and clear is the call-to-action"
          />
        </TooltipProvider>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium">Predictive Metrics</h4>
          <Badge variant="outline" className="text-[10px]">
            <Info className="w-3 h-3 mr-1" />
            Estimates only
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FullMetric
            icon={<Zap className="w-5 h-5 text-amber-500" />}
            label="Hook Strength"
            description="First 2 seconds impact"
            value={metrics.hookStrength}
            isScore
          />
          <FullMetric
            icon={<MousePointer className="w-5 h-5 text-blue-500" />}
            label="CTR Potential"
            description="Click-through likelihood"
            value={metrics.ctrPotential}
          />
          <FullMetric
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            label="Drop-off Risk"
            description="Where viewers leave"
            value={metrics.dropOffRisk}
            isRisk
          />
          <FullMetric
            icon={<Target className="w-5 h-5 text-green-500" />}
            label="CTA Pressure"
            description="Call-to-action strength"
            value={metrics.ctaPressure}
            isScore
          />
        </div>
        
        <p className="text-[10px] text-muted-foreground text-center mt-4">
          These are decision-support estimates based on video analysis, not guarantees of performance.
        </p>
      </CardContent>
    </Card>
  );
}

interface CompactMetricProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  isScore?: boolean;
  isRisk?: boolean;
  tooltip: string;
}

function CompactMetric({ icon, label, value, isScore, isRisk, tooltip }: CompactMetricProps) {
  const getColor = () => {
    if (isScore) {
      const num = value as number;
      if (num >= 70) return 'text-green-500';
      if (num >= 50) return 'text-amber-500';
      return 'text-red-500';
    }
    if (isRisk) {
      const risk = value as string;
      if (risk === 'low') return 'text-green-500';
      if (risk === 'early') return 'text-red-500';
      return 'text-amber-500';
    }
    const level = value as string;
    if (level === 'high') return 'text-green-500';
    if (level === 'medium') return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <Tooltip>
      <TooltipTrigger className="flex items-center gap-2">
        <span className={getColor()}>{icon}</span>
        <div className="text-left">
          <div className="text-[10px] text-muted-foreground">{label}</div>
          <div className={`text-sm font-bold ${getColor()} capitalize`}>
            {isScore ? `${value}` : value}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs max-w-[200px]">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface FullMetricProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: number | string;
  isScore?: boolean;
  isRisk?: boolean;
}

function FullMetric({ icon, label, description, value, isScore, isRisk }: FullMetricProps) {
  const getColor = () => {
    if (isScore) {
      const num = value as number;
      if (num >= 70) return { text: 'text-green-500', bg: 'bg-green-500' };
      if (num >= 50) return { text: 'text-amber-500', bg: 'bg-amber-500' };
      return { text: 'text-red-500', bg: 'bg-red-500' };
    }
    if (isRisk) {
      const risk = value as string;
      if (risk === 'low') return { text: 'text-green-500', bg: 'bg-green-500' };
      if (risk === 'early') return { text: 'text-red-500', bg: 'bg-red-500' };
      return { text: 'text-amber-500', bg: 'bg-amber-500' };
    }
    const level = value as string;
    if (level === 'high') return { text: 'text-green-500', bg: 'bg-green-500' };
    if (level === 'medium') return { text: 'text-amber-500', bg: 'bg-amber-500' };
    return { text: 'text-red-500', bg: 'bg-red-500' };
  };

  const colors = getColor();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-[10px] text-muted-foreground">{description}</div>
        </div>
      </div>
      
      {isScore ? (
        <>
          <Progress 
            value={value as number} 
            className={`h-2 [&>div]:${colors.bg}`}
          />
          <div className={`text-right text-sm font-bold ${colors.text}`}>
            {value}/100
          </div>
        </>
      ) : (
        <div className={`text-lg font-bold ${colors.text} capitalize`}>
          {value}
        </div>
      )}
    </div>
  );
}
