import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  AlertCircle, 
  Clock,
  Package,
  FileText,
  Wand2,
  Video,
  Palette,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PipelineStageStatus = 'pending' | 'in_progress' | 'needs_input' | 'completed' | 'error';

interface PipelineStage {
  id: string;
  name: string;
  status: PipelineStageStatus;
  icon: React.ElementType;
}

interface PipelineStatusIndicatorProps {
  pipelineStatus: Record<string, string>;
  currentStage?: number;
  onStageClick?: (stageId: string, index: number) => void;
  compact?: boolean;
}

const PIPELINE_STAGES: Omit<PipelineStage, 'status'>[] = [
  { id: 'product_info', name: 'Product Info', icon: Package },
  { id: 'scripts', name: 'Scripts & Audio', icon: FileText },
  { id: 'scenes', name: 'Scene Builder', icon: Wand2 },
  { id: 'video_generation', name: 'Video Generation', icon: Video },
  { id: 'assembly', name: 'Assembly', icon: Palette },
  { id: 'export', name: 'Export', icon: Globe },
];

const STATUS_CONFIG: Record<PipelineStageStatus, { 
  icon: React.ElementType; 
  color: string; 
  bgColor: string; 
  label: string 
}> = {
  pending: { 
    icon: Circle, 
    color: 'text-muted-foreground', 
    bgColor: 'bg-muted/30',
    label: 'Pending'
  },
  in_progress: { 
    icon: Loader2, 
    color: 'text-secondary', 
    bgColor: 'bg-secondary/20',
    label: 'Running'
  },
  needs_input: { 
    icon: Clock, 
    color: 'text-amber-500', 
    bgColor: 'bg-amber-500/20',
    label: 'Needs Input'
  },
  completed: { 
    icon: CheckCircle2, 
    color: 'text-primary', 
    bgColor: 'bg-primary/20',
    label: 'Completed'
  },
  error: { 
    icon: AlertCircle, 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/20',
    label: 'Error'
  },
};

export function PipelineStatusIndicator({ 
  pipelineStatus, 
  currentStage = 0,
  onStageClick,
  compact = false 
}: PipelineStatusIndicatorProps) {
  const stages: PipelineStage[] = PIPELINE_STAGES.map(stage => ({
    ...stage,
    status: (pipelineStatus[stage.id] as PipelineStageStatus) || 'pending'
  }));

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {stages.map((stage, index) => {
          const statusConfig = STATUS_CONFIG[stage.status];
          const StatusIcon = statusConfig.icon;
          
          return (
            <div 
              key={stage.id}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all",
                statusConfig.bgColor,
                index === currentStage && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
              onClick={() => onStageClick?.(stage.id, index)}
              title={`${stage.name}: ${statusConfig.label}`}
            >
              <StatusIcon className={cn("w-3 h-3", statusConfig.color, stage.status === 'in_progress' && "animate-spin")} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {stages.map((stage, index) => {
        const statusConfig = STATUS_CONFIG[stage.status];
        const StatusIcon = statusConfig.icon;
        const StageIcon = stage.icon;
        
        return (
          <div
            key={stage.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
              statusConfig.bgColor,
              "hover:opacity-80",
              index === currentStage && "ring-2 ring-primary"
            )}
            onClick={() => onStageClick?.(stage.id, index)}
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              stage.status === 'completed' ? 'bg-primary/30' : 'bg-muted'
            )}>
              <StageIcon className={cn(
                "w-5 h-5",
                stage.status === 'completed' ? 'text-primary' : 'text-muted-foreground'
              )} />
            </div>
            
            <div className="flex-1">
              <p className="font-medium text-foreground text-sm">{stage.name}</p>
              <p className="text-xs text-muted-foreground">Stage {index + 1}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <StatusIcon className={cn(
                "w-4 h-4",
                statusConfig.color,
                stage.status === 'in_progress' && "animate-spin"
              )} />
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs border-0",
                  statusConfig.bgColor,
                  statusConfig.color
                )}
              >
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PipelineProgress({ pipelineStatus }: { pipelineStatus: Record<string, string> }) {
  const stages = PIPELINE_STAGES.map(stage => ({
    ...stage,
    status: (pipelineStatus[stage.id] as PipelineStageStatus) || 'pending'
  }));

  const completedCount = stages.filter(s => s.status === 'completed').length;
  const progressPercent = (completedCount / stages.length) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Pipeline Progress</span>
        <span className="text-foreground font-medium">{completedCount}/{stages.length} stages</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
