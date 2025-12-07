import { useState } from 'react';
import { Sparkles, ArrowRight, RefreshCw, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface StudioPromptLayerProps {
  promptNumber: number;
  onNext: () => void;
}

const defaultPrompts: Record<number, string> = {
  1: "Generate a compelling hook for a video ad about {{product_name}}. The hook should capture attention in the first 3 seconds.",
  2: "Write a problem statement that resonates with the target audience for {{product_name}}. Focus on pain points.",
  3: "Create a solution-focused script section for {{product_name}} highlighting key benefits and features.",
  4: "Generate social proof content including testimonial templates for {{product_name}}.",
  5: "Write a strong call-to-action for {{product_name}} that drives conversions and creates urgency.",
};

export const StudioPromptLayer = ({ promptNumber, onNext }: StudioPromptLayerProps) => {
  const [prompt, setPrompt] = useState(defaultPrompts[promptNumber] || '');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setPrompt(defaultPrompts[promptNumber] || '');
    toast({
      title: "Prompt Reset",
      description: "Restored to default prompt",
    });
  };

  const handleSave = () => {
    toast({
      title: `Prompt ${promptNumber} Saved`,
      description: "AI prompt configuration saved",
    });
    onNext();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">AI Prompt {promptNumber}</h2>
          <p className="text-muted-foreground text-sm mt-1">Configure prompt template from Google Sheet</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Layer {5 + promptNumber}</Badge>
      </div>

      <Card className="p-6 bg-card border-border">
        <div className="space-y-5">
          {/* Prompt Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Prompt Template
              </label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Reset
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your AI prompt template..."
              className="bg-background border-border min-h-[200px] font-mono text-sm"
            />
          </div>

          {/* Variables */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-medium text-foreground mb-2">Available Variables</p>
            <div className="flex flex-wrap gap-2">
              {['{{product_name}}', '{{description}}', '{{benefits}}', '{{audience}}', '{{tone}}', '{{language}}'].map((variable) => (
                <Badge key={variable} variant="secondary" className="font-mono text-xs">
                  {variable}
                </Badge>
              ))}
            </div>
          </div>

          {/* Purpose */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium text-foreground mb-1">Prompt Purpose</p>
            <p className="text-xs text-muted-foreground">
              {promptNumber === 1 && "Hook generation - Captures attention in the first 3 seconds"}
              {promptNumber === 2 && "Problem statement - Identifies pain points and resonates with audience"}
              {promptNumber === 3 && "Solution script - Highlights product benefits and features"}
              {promptNumber === 4 && "Social proof - Generates testimonials and trust signals"}
              {promptNumber === 5 && "Call-to-action - Drives conversions with urgency"}
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} className="gap-2">
              Save & Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
