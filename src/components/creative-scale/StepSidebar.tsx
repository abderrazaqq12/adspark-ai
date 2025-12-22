/**
 * Creative Scale Step Sidebar
 * Now uses UnifiedStepSidebar for system-wide consistency
 */

import { 
  UnifiedStepSidebar, 
  CREATIVE_AI_EDITOR_STEPS 
} from '@/components/unified';

export type StepId = 1 | 2 | 3 | 4 | 5;

interface StepSidebarProps {
  currentStep: StepId;
  completedSteps: StepId[];
  onStepClick?: (step: StepId) => void;
  onClearHistory?: () => void;
  projectId?: string;
}

export function StepSidebar({ 
  currentStep, 
  completedSteps, 
  onStepClick, 
  onClearHistory,
  projectId 
}: StepSidebarProps) {
  return (
    <UnifiedStepSidebar
      tool="creative-ai-editor"
      toolName="Creative AI Editor"
      toolDescription="AI-powered video editing"
      steps={CREATIVE_AI_EDITOR_STEPS}
      currentStep={currentStep}
      completedSteps={completedSteps}
      onStepClick={(step) => onStepClick?.(step as StepId)}
      onClearHistory={onClearHistory}
      projectId={projectId}
    />
  );
}
