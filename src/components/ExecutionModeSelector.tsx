/**
 * Execution Mode Selector
 * UI component for selecting between Agent, n8n, and Edge modes
 */

import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bot, Workflow, Zap } from 'lucide-react';
import { ExecutionMode, getAvailableModes } from '@/lib/unified-generation/executor';

interface ExecutionModeSelectorProps {
  value: ExecutionMode;
  onChange: (mode: ExecutionMode) => void;
  webhookUrl?: string;
  onWebhookUrlChange?: (url: string) => void;
  compact?: boolean;
}

const modeIcons: Record<ExecutionMode, React.ReactNode> = {
  agent: <Bot className="h-4 w-4" />,
  n8n: <Workflow className="h-4 w-4" />,
  edge: <Zap className="h-4 w-4" />
};

export function ExecutionModeSelector({
  value,
  onChange,
  webhookUrl,
  onWebhookUrlChange,
  compact = false
}: ExecutionModeSelectorProps) {
  const modes = getAvailableModes();
  
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Engine:</span>
        <div className="flex gap-1">
          {modes.map((m) => (
            <button
              key={m.mode}
              onClick={() => onChange(m.mode)}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
                value === m.mode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {modeIcons[m.mode]}
              {m.mode === 'agent' ? 'AI' : m.mode === 'n8n' ? 'n8n' : 'API'}
            </button>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Execution Engine</Label>
        <Badge variant="outline" className="text-xs">
          {value === 'agent' ? 'Default' : value.toUpperCase()}
        </Badge>
      </div>
      
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as ExecutionMode)}
        className="space-y-2"
      >
        {modes.map((m) => (
          <div
            key={m.mode}
            className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
              value === m.mode
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onChange(m.mode)}
          >
            <RadioGroupItem value={m.mode} id={m.mode} className="mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                {modeIcons[m.mode]}
                <Label htmlFor={m.mode} className="font-medium cursor-pointer">
                  {m.label}
                </Label>
                {m.recommended && (
                  <Badge variant="secondary" className="text-xs">
                    Recommended
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{m.description}</p>
            </div>
          </div>
        ))}
      </RadioGroup>
      
      {value === 'n8n' && onWebhookUrlChange && (
        <div className="space-y-2 pt-2">
          <Label className="text-sm">n8n Webhook URL</Label>
          <Input
            placeholder="https://your-n8n.com/webhook/..."
            value={webhookUrl || ''}
            onChange={(e) => onWebhookUrlChange(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
      )}
    </div>
  );
}
