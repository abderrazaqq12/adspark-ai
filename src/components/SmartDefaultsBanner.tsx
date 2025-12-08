import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Wand2, Zap } from 'lucide-react';
import { useSmartDefaults } from '@/hooks/useSmartDefaults';

interface SmartDefaultsBannerProps {
  projectId?: string;
  onApplyDefaults?: (defaults: any) => void;
}

export function SmartDefaultsBanner({ projectId, onApplyDefaults }: SmartDefaultsBannerProps) {
  const { defaults, isLoading, getDefaultForContext } = useSmartDefaults(projectId);

  if (isLoading) {
    return null;
  }

  const hasLearnedDefaults = defaults.preferredEngine || 
    defaults.preferredPacing !== 'medium' || 
    defaults.preferredHookStyle !== 'question';

  if (!hasLearnedDefaults) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-violet-500/10 border-primary/30">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-full">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Smart Defaults Applied</p>
              <div className="flex items-center gap-2 mt-1">
                {defaults.preferredEngine && (
                  <Badge variant="secondary" className="text-xs">
                    <Wand2 className="h-3 w-3 mr-1" />
                    {defaults.preferredEngine}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  {defaults.preferredPacing} pacing
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {defaults.preferredHookStyle} hooks
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onApplyDefaults?.(defaults)}
          >
            Apply All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
