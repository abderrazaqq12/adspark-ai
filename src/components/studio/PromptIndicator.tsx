/**
 * Compact indicator showing prompt status with edit capability
 */
import { Button } from '@/components/ui/button';
import { Settings, Check, AlertCircle } from 'lucide-react';
import { PromptProfile } from '@/hooks/usePromptProfiles';

interface PromptIndicatorProps {
  prompt: PromptProfile | null;
  onClick: () => void;
  label?: string;
}

export function PromptIndicator({ prompt, onClick, label = 'Prompt' }: PromptIndicatorProps) {
  if (prompt) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className="h-auto py-1 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <Check className="w-3 h-3 text-green-500" />
        <span>{label}: Custom v{prompt.version}</span>
        <Settings className="w-3 h-3" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-auto py-1 px-2 text-xs gap-1.5 text-orange-500 hover:text-orange-400"
    >
      <AlertCircle className="w-3 h-3" />
      <span>{label}: Not configured</span>
      <Settings className="w-3 h-3" />
    </Button>
  );
}
