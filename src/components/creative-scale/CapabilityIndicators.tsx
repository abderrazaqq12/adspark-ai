/**
 * Capability Indicators Component
 * Shows execution info for variations - Simplified for unified server
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Server } from 'lucide-react';
import type { ExecutionPlan } from '@/lib/creative-scale/compiler-types';

interface CapabilityIndicatorsProps {
  plans: ExecutionPlan[];
}

export function CapabilityIndicators({ plans }: CapabilityIndicatorsProps) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Execution Routing</CardTitle>
          <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30">
            <Server className="w-3 h-3 mr-1 text-blue-600" />
            <span className="text-blue-600">{plans.length}× Unified Server</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          {plans.map((plan, idx) => (
            <div key={plan.plan_id} className="p-3 rounded-lg border border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Variation {idx + 1}</span>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium bg-blue-500/10 border-blue-500/30">
                  <Server className="w-3 h-3 text-blue-600" />
                  <span className="text-blue-600">VPS FFmpeg</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {plan.timeline.length} segments • {plan.audio_tracks.length} audio tracks
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
