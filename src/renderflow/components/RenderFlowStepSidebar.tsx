/**
 * RenderFlow Step Sidebar
 * Vertical navigation with 6 steps - Full Creative Scale style
 */

import { 
  Upload, 
  Search,
  Brain,
  FileCheck, 
  Play,
  CheckCircle2,
  Lock,
  Download
} from 'lucide-react';

export type RenderStepId = 1 | 2 | 3 | 4 | 5 | 6;

interface Step {
  id: RenderStepId;
  label: string;
  description: string;
  icon: typeof Upload;
}

const STEPS: Step[] = [
  { id: 1, label: 'Input', description: 'Source video', icon: Upload },
  { id: 2, label: 'Analyze', description: 'AI deconstruction', icon: Search },
  { id: 3, label: 'Strategy', description: 'Brain V2 planning', icon: Brain },
  { id: 4, label: 'Review', description: 'Verify settings', icon: FileCheck },
  { id: 5, label: 'Execute', description: 'Render videos', icon: Play },
  { id: 6, label: 'Results', description: 'Download outputs', icon: Download },
];

interface RenderFlowStepSidebarProps {
  currentStep: RenderStepId;
  completedSteps: RenderStepId[];
  onStepClick?: (step: RenderStepId) => void;
  onReset?: () => void;
}

export function RenderFlowStepSidebar({ currentStep, completedSteps, onStepClick, onReset }: RenderFlowStepSidebarProps) {
  return (
    <div className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg">RenderFlow</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Video rendering pipeline</p>
      </div>

      {/* Steps */}
      <nav className="flex-1 p-3 space-y-1">
        {STEPS.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isLocked = step.id > currentStep && !isCompleted;
          const canClick = isCompleted || isCurrent;
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              onClick={() => canClick && onStepClick?.(step.id)}
              disabled={isLocked}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
                ${isCurrent 
                  ? 'bg-primary/10 border border-primary/30 text-foreground' 
                  : isCompleted 
                    ? 'bg-muted/50 text-foreground hover:bg-muted cursor-pointer' 
                    : 'text-muted-foreground cursor-not-allowed opacity-50'
                }
              `}
            >
              {/* Step Number / Icon */}
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-medium
                ${isCurrent 
                  ? 'bg-primary text-primary-foreground' 
                  : isCompleted 
                    ? 'bg-green-500 text-white' 
                    : 'bg-muted text-muted-foreground'
                }
              `}>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isLocked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              {/* Labels */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isCurrent ? 'text-primary' : ''}`}>
                    {step.label}
                  </span>
                  {isCompleted && !isCurrent && (
                    <span className="text-[10px] text-green-600 font-medium">Done</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {step.description}
                </p>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">{completedSteps.length}</span> of 6 steps complete
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(completedSteps.length / 6) * 100}%` }}
          />
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2 border border-border rounded hover:bg-muted/50"
          >
            Reset Pipeline
          </button>
        )}
      </div>
    </div>
  );
}
