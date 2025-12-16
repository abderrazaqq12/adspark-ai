/**
 * RenderFlow Step 2: Configure
 * Variation count - deterministic, no presets
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, ArrowLeft } from 'lucide-react';

interface ConfigureStepProps {
  sourceUrl: string;
  initialVariations?: number;
  onContinue: (variations: number) => void;
  onBack: () => void;
}

export function ConfigureStep({ sourceUrl, initialVariations = 1, onContinue, onBack }: ConfigureStepProps) {
  const [variations, setVariations] = useState(initialVariations);

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
        <div className="p-3 bg-muted rounded border border-border">
          <Label className="text-xs text-muted-foreground">Source</Label>
          <p className="font-mono text-sm truncate mt-1">{sourceUrl}</p>
        </div>

        {/* Variations Input */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Variations (Copies)</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={variations}
            onChange={(e) => setVariations(Math.max(1, parseInt(e.target.value) || 1))}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Deterministic render count. No presets. No suggestions.
          </p>
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
