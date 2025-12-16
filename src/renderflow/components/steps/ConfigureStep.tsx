/**
 * RenderFlow Step 2: Configure
 * Variation count per video - deterministic, no presets
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, ArrowLeft, FileVideo } from 'lucide-react';

interface ConfigureStepProps {
  sourceUrls: string[];
  initialVariations?: number;
  onContinue: (variations: number) => void;
  onBack: () => void;
}

export function ConfigureStep({ sourceUrls, initialVariations = 1, onContinue, onBack }: ConfigureStepProps) {
  const [variations, setVariations] = useState(initialVariations);

  const totalJobs = sourceUrls.length * variations;

  return (
    <Card className="border-border">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Step 2: Configure
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Source Summary */}
        <div className="p-3 bg-muted rounded border border-border space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <FileVideo className="w-3 h-3" />
              Source Videos
            </Label>
            <span className="text-xs font-mono bg-background px-2 py-0.5 rounded">
              {sourceUrls.length} video{sourceUrls.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="max-h-[120px] overflow-y-auto space-y-1">
            {sourceUrls.map((url, i) => (
              <p key={i} className="font-mono text-xs truncate text-muted-foreground">
                {i + 1}. {url}
              </p>
            ))}
          </div>
        </div>

        {/* Variations Input */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Variations per Video</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={variations}
            onChange={(e) => setVariations(Math.max(1, parseInt(e.target.value) || 1))}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Deterministic render count per video. No presets. No suggestions.
          </p>
        </div>

        {/* Total Jobs Preview */}
        <div className="p-3 bg-primary/10 rounded border border-primary/30">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total render jobs:</span>
            <span className="font-mono text-lg font-semibold text-primary">
              {sourceUrls.length} × {variations} = {totalJobs}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={() => onContinue(variations)} className="flex-1">
            Review Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
