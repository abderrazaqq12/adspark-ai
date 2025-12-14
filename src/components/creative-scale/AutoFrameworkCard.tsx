import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Target, 
  Clock, 
  Users, 
  Shield,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import type { AutoFrameworkResult, FrameworkContext } from '@/lib/creative-scale/compliance-types';
import { MARKETING_FRAMEWORKS } from '@/lib/creative-scale/auto-framework-selector';

interface AutoFrameworkCardProps {
  result: AutoFrameworkResult;
  context: FrameworkContext;
  className?: string;
}

export function AutoFrameworkCard({ result, context, className }: AutoFrameworkCardProps) {
  const framework = MARKETING_FRAMEWORKS[result.frameworkId];
  
  if (!framework) return null;
  
  const platformLabel = context.platform === 'general' ? 'Multi-Platform' : context.platform.toUpperCase();
  const lengthLabel = context.videoLengthSec <= 30 ? 'Short-form' : 
                     context.videoLengthSec <= 60 ? 'Medium-form' : 'Long-form';
  const funnelLabel = context.funnelStage === 'cold' ? 'Cold Traffic' :
                     context.funnelStage === 'warm' ? 'Warm Audience' : 'Retargeting';
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Auto-Selected Framework</CardTitle>
          </div>
          <Badge variant="default" className="bg-primary/20 text-primary">
            {result.confidence}% Match
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Framework Name */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{framework.name}</h3>
              <p className="text-sm text-muted-foreground">{framework.description}</p>
            </div>
          </div>
        </div>
        
        {/* Context Factors */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Selection Factors
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{platformLabel}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{lengthLabel}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{funnelLabel}</span>
            </div>
            {context.riskLevel !== 'safe' && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Compliance-Aware</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Why This Framework */}
        <div>
          <h4 className="text-sm font-medium mb-2">Why This Framework?</h4>
          <div className="space-y-1.5">
            {result.factors.map((factor, index) => (
              <div key={index} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">{factor.factor}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Framework Structure */}
        <div className="pt-3 border-t border-border">
          <h4 className="text-sm font-medium mb-2">Structure</h4>
          <div className="flex flex-wrap gap-1.5">
            {framework.stages.map((stage, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {index + 1}. {stage}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Hormozi Alignment */}
        {framework.hormoziAlignment && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-200">
              <span className="font-medium">Hormozi Alignment:</span> {framework.hormoziAlignment}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
