/**
 * UnifiedStepSidebar - System-wide pipeline sidebar component
 * 
 * MASTER COMPONENT for all tools:
 * - Studio
 * - Creative Replicator
 * - Creative AI Editor
 * - AI Tools
 * 
 * Placement: LEFT side of the screen, ALWAYS
 * All tools MUST use this component or inherit this layout.
 */

import { ReactNode } from 'react';
import { 
  Upload, 
  Search, 
  Target, 
  Play, 
  CheckCircle2,
  Lock,
  LucideIcon
} from 'lucide-react';
import { UnifiedHistoryControl, ToolType } from './UnifiedHistoryControl';

export interface StepConfig {
  id: number;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface UnifiedStepSidebarProps {
  /** Tool identifier */
  tool: ToolType;
  /** Tool display name for header */
  toolName: string;
  /** Tool description for header */
  toolDescription?: string;
  /** Step configuration */
  steps: StepConfig[];
  /** Current active step */
  currentStep: number;
  /** Completed steps */
  completedSteps: number[];
  /** Callback when step is clicked */
  onStepClick?: (step: number) => void;
  /** Callback when history is cleared */
  onClearHistory?: () => void;
  /** Optional project ID for scoped cleanup */
  projectId?: string;
  /** Optional additional content below steps */
  children?: ReactNode;
}

export function UnifiedStepSidebar({
  tool,
  toolName,
  toolDescription = 'AI-powered workflow',
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  onClearHistory,
  projectId,
  children
}: UnifiedStepSidebarProps) {
  return (
    <div className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg">{toolName}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{toolDescription}</p>
      </div>

      {/* Steps */}
      <nav className="flex-1 p-3 space-y-1">
        {steps.map((step) => {
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
                w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all
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
                w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-medium
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

      {/* Optional additional content */}
      {children && (
        <div className="px-4 pb-2">
          {children}
        </div>
      )}

      {/* Footer with Progress and History Control */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Progress indicator */}
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">{completedSteps.length}</span> of {steps.length} steps complete
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(completedSteps.length / steps.length) * 100}%` }}
          />
        </div>
        
        {/* Unified History Control - MANDATORY PLACEMENT */}
        <UnifiedHistoryControl
          tool={tool}
          projectId={projectId}
          onHistoryCleared={onClearHistory}
          showFileCleanup={true}
          variant="sidebar"
        />
      </div>
    </div>
  );
}

// Pre-configured step sets for common tools
export const CREATIVE_AI_EDITOR_STEPS: StepConfig[] = [
  { id: 1, label: 'Upload', description: 'Add video assets', icon: Upload },
  { id: 2, label: 'Analyze', description: 'AI deconstruction', icon: Search },
  { id: 3, label: 'Strategy', description: 'Brain V2 planning', icon: Target },
  { id: 4, label: 'Execute', description: 'Render videos', icon: Play },
  { id: 5, label: 'Results', description: 'Download outputs', icon: CheckCircle2 },
];

export const CREATIVE_REPLICATOR_STEPS: StepConfig[] = [
  { id: 1, label: 'Upload', description: 'Add source ad', icon: Upload },
  { id: 2, label: 'Configure', description: 'Set variations', icon: Target },
  { id: 3, label: 'Plan', description: 'AI creative plan', icon: Search },
  { id: 4, label: 'Generate', description: 'Render variations', icon: Play },
  { id: 5, label: 'Results', description: 'Download outputs', icon: CheckCircle2 },
];

export const STUDIO_STEPS: StepConfig[] = [
  { id: 0, label: 'Product Input', description: 'Product details & targeting', icon: Upload },
  { id: 1, label: 'Images', description: 'Product images & mockups', icon: Target },
  { id: 2, label: 'Landing Page', description: 'Marketing angles', icon: Search },
  { id: 3, label: 'Voiceover', description: 'Script text & audio', icon: Play },
  { id: 4, label: 'Scene Builder', description: 'AI scene generation', icon: Target },
  { id: 5, label: 'Auto-Ad Factory', description: 'Mass-produce ads', icon: Play },
  { id: 6, label: 'Export', description: 'Multi-format export', icon: CheckCircle2 },
];

export const AI_TOOLS_STEPS: StepConfig[] = [
  { id: 1, label: 'Select', description: 'Choose AI tool', icon: Search },
  { id: 2, label: 'Configure', description: 'Set parameters', icon: Target },
  { id: 3, label: 'Execute', description: 'Run operation', icon: Play },
  { id: 4, label: 'Results', description: 'View outputs', icon: CheckCircle2 },
];
