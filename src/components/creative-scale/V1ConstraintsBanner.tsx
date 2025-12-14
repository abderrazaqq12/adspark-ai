/**
 * V1 Constraints Banner
 * PRD-aligned: Shows current limitations clearly
 * Updated: Server-only rendering (no browser FFmpeg)
 */

import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, Server } from 'lucide-react';
import { V1_CONSTRAINTS } from '@/lib/creative-scale/prd-types';

interface V1ConstraintsBannerProps {
  minimal?: boolean;
}

export function V1ConstraintsBanner({ minimal = false }: V1ConstraintsBannerProps) {
  if (minimal) {
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <Server className="w-3 h-3" />
        VPS Server Rendering
      </Badge>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <Server className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Server-Side Rendering</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            {V1_CONSTRAINTS.SINGLE_SOURCE_MODE && (
              <li>• <strong>Single-Source Mode:</strong> All variations from one video</li>
            )}
            <li>• <strong>VPS Processing:</strong> All rendering on server with native FFmpeg</li>
            <li>• <strong>Max Duration:</strong> {V1_CONSTRAINTS.MAX_DURATION_SEC} seconds per video</li>
            <li>• <strong>Max Videos:</strong> {V1_CONSTRAINTS.MAX_VIDEOS} videos per batch</li>
            {V1_CONSTRAINTS.NO_PERSISTENT_MEMORY && (
              <li>• <strong>Session-based:</strong> Analysis resets on page refresh</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
