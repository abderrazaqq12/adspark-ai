/**
 * V1 Constraints Banner
 * PRD-aligned: Shows current limitations clearly
 */

import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info } from 'lucide-react';
import { V1_CONSTRAINTS } from '@/lib/creative-scale/prd-types';

interface V1ConstraintsBannerProps {
  minimal?: boolean;
}

export function V1ConstraintsBanner({ minimal = false }: V1ConstraintsBannerProps) {
  if (minimal) {
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <Info className="w-3 h-3" />
        V1: Single-Source Mode
      </Badge>
    );
  }

  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-600">V1 Constraints</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            {V1_CONSTRAINTS.SINGLE_SOURCE_MODE && (
              <li>• <strong>Single-Source Mode:</strong> All variations come from one video</li>
            )}
            <li>• <strong>FFmpeg WASM:</strong> Initial load ~{V1_CONSTRAINTS.FFMPEG_INITIAL_LOAD_MB}MB</li>
            <li>• <strong>Max Duration:</strong> {V1_CONSTRAINTS.MAX_DURATION_SEC} seconds per video</li>
            <li>• <strong>Max Videos:</strong> {V1_CONSTRAINTS.MAX_VIDEOS} videos per batch</li>
            {V1_CONSTRAINTS.NO_PERSISTENT_MEMORY && (
              <li>• <strong>No persistent memory:</strong> Analysis resets on page refresh</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
