import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Bot, Link, Brain, ChevronDown, Settings, Loader2 } from "lucide-react";
import { useBackendMode, BackendMode } from "@/hooks/useBackendMode";
import { cn } from "@/lib/utils";

interface BackendModeSelectorProps {
  compact?: boolean;
  showCard?: boolean;
  className?: string;
}

const BACKEND_MODES = [
  {
    id: 'auto' as BackendMode,
    name: 'Auto (AI Brain)',
    description: 'AI Brain automatically selects optimal backend',
    icon: Brain,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 'ai-operator' as BackendMode,
    name: 'AI Agent Operator',
    description: 'Autonomous agent monitors & optimizes pipeline',
    icon: Bot,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'n8n' as BackendMode,
    name: 'n8n Webhooks',
    description: 'Route all operations through n8n workflows',
    icon: Link,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
];

export function BackendModeSelector({ compact = false, showCard = false, className }: BackendModeSelectorProps) {
  const { mode, setMode, isLoading, getActiveBackend, getModeIcon } = useBackendMode();
  
  const currentMode = BACKEND_MODES.find(m => m.id === mode) || BACKEND_MODES[0];
  const CurrentIcon = currentMode.icon;

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={cn("gap-2 h-8", className)}>
            <CurrentIcon className={cn("h-4 w-4", currentMode.color)} />
            <span className="text-xs">{currentMode.name}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {BACKEND_MODES.map((backendMode) => {
            const Icon = backendMode.icon;
            return (
              <DropdownMenuItem
                key={backendMode.id}
                onClick={() => setMode(backendMode.id)}
                className={cn(
                  "flex items-start gap-3 p-3 cursor-pointer",
                  mode === backendMode.id && backendMode.bgColor
                )}
              >
                <Icon className={cn("h-5 w-5 mt-0.5", backendMode.color)} />
                <div className="flex-1">
                  <div className="font-medium text-sm">{backendMode.name}</div>
                  <div className="text-xs text-muted-foreground">{backendMode.description}</div>
                </div>
                {mode === backendMode.id && (
                  <Badge variant="secondary" className="text-xs">Active</Badge>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (showCard) {
    return (
      <Card className={cn("border", currentMode.borderColor, className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", currentMode.bgColor)}>
                <CurrentIcon className={cn("h-5 w-5", currentMode.color)} />
              </div>
              <div>
                <div className="text-sm font-medium">Backend Mode</div>
                <div className="text-xs text-muted-foreground">{currentMode.name}</div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Change
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                {BACKEND_MODES.map((backendMode) => {
                  const Icon = backendMode.icon;
                  return (
                    <DropdownMenuItem
                      key={backendMode.id}
                      onClick={() => setMode(backendMode.id)}
                      className={cn(
                        "flex items-start gap-3 p-3 cursor-pointer",
                        mode === backendMode.id && backendMode.bgColor
                      )}
                    >
                      <Icon className={cn("h-5 w-5 mt-0.5", backendMode.color)} />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{backendMode.name}</div>
                        <div className="text-xs text-muted-foreground">{backendMode.description}</div>
                      </div>
                      {mode === backendMode.id && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default inline mode
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge 
        variant="outline" 
        className={cn(
          "gap-1.5 px-2 py-1",
          currentMode.bgColor,
          currentMode.borderColor
        )}
      >
        <CurrentIcon className={cn("h-3.5 w-3.5", currentMode.color)} />
        <span className="text-xs font-medium">{currentMode.name}</span>
      </Badge>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {BACKEND_MODES.map((backendMode) => {
            const Icon = backendMode.icon;
            return (
              <DropdownMenuItem
                key={backendMode.id}
                onClick={() => setMode(backendMode.id)}
                className={cn(
                  "flex items-start gap-3 p-3 cursor-pointer",
                  mode === backendMode.id && backendMode.bgColor
                )}
              >
                <Icon className={cn("h-5 w-5 mt-0.5", backendMode.color)} />
                <div className="flex-1">
                  <div className="font-medium text-sm">{backendMode.name}</div>
                  <div className="text-xs text-muted-foreground">{backendMode.description}</div>
                </div>
                {mode === backendMode.id && (
                  <Badge variant="secondary" className="text-xs">Active</Badge>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Small indicator component for pipeline sidebar
export function BackendModeIndicator({ className }: { className?: string }) {
  const { mode, isLoading } = useBackendMode();
  
  if (isLoading) return null;
  
  const currentMode = BACKEND_MODES.find(m => m.id === mode) || BACKEND_MODES[0];
  const Icon = currentMode.icon;

  return (
    <div className={cn("flex items-center gap-1.5", className)} title={`Backend: ${currentMode.name}`}>
      <Icon className={cn("h-3.5 w-3.5", currentMode.color)} />
      <span className="text-xs text-muted-foreground">{mode === 'auto' ? 'Auto' : mode === 'ai-operator' ? 'AI' : 'n8n'}</span>
    </div>
  );
}
