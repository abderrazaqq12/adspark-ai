import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Lightbulb, 
  Image,
  Layout,
  Mic, 
  Video, 
  Download,
  ChevronRight,
  CheckCircle2,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { StudioProductInput } from '@/components/studio/StudioProductInput';
import { StudioMarketingEngine } from '@/components/studio/StudioMarketingEngine';
import { StudioImageGeneration } from '@/components/studio/StudioImageGeneration';
import { StudioLandingPage } from '@/components/studio/StudioLandingPage';
import { StudioVoiceover } from '@/components/studio/StudioVoiceover';
import { StudioVideoCreation } from '@/components/studio/StudioVideoCreation';
import { StudioExport } from '@/components/studio/StudioExport';

// 7-step pipeline
const pipelineStages = [
  { id: 0, key: 'product', name: "Product Input", icon: Package, description: "Product details & targeting" },
  { id: 1, key: 'marketing', name: "Marketing Intelligence", icon: Lightbulb, description: "Angles, scripts & content" },
  { id: 2, key: 'images', name: "Image Generation", icon: Image, description: "Product images & mockups" },
  { id: 3, key: 'landing', name: "Landing Page", icon: Layout, description: "Sales page content" },
  { id: 4, key: 'voiceover', name: "Voiceover", icon: Mic, description: "AI voice generation" },
  { id: 5, key: 'video', name: "Video Creation", icon: Video, description: "Scene builder & generation" },
  { id: 6, key: 'export', name: "Export", icon: Download, description: "Download & variations" },
];

export type StudioStep = 'product' | 'marketing' | 'images' | 'landing' | 'voiceover' | 'video' | 'export';

const Studio = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState<StudioStep>('product');
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const getActiveStepIndex = () => {
    const stage = pipelineStages.find(s => s.key === activeStep);
    return stage?.id || 0;
  };

  const handleStepComplete = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps(prev => [...prev, stepId]);
    }
  };

  const handleNext = (currentStep: StudioStep) => {
    const currentIndex = pipelineStages.findIndex(s => s.key === currentStep);
    handleStepComplete(currentIndex);
    
    if (currentIndex < pipelineStages.length - 1) {
      const nextStep = pipelineStages[currentIndex + 1];
      setActiveStep(nextStep.key as StudioStep);
    }
  };

  const handleStepClick = (step: StudioStep) => {
    setActiveStep(step);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 'product':
        return <StudioProductInput onNext={() => handleNext('product')} />;
      case 'marketing':
        return <StudioMarketingEngine onNext={() => handleNext('marketing')} />;
      case 'images':
        return <StudioImageGeneration onNext={() => handleNext('images')} />;
      case 'landing':
        return <StudioLandingPage onNext={() => handleNext('landing')} />;
      case 'voiceover':
        return <StudioVoiceover onNext={() => handleNext('voiceover')} />;
      case 'video':
        return <StudioVideoCreation onNext={() => handleNext('video')} />;
      case 'export':
        return <StudioExport />;
      default:
        return <StudioProductInput onNext={() => handleNext('product')} />;
    }
  };

  const activeIndex = getActiveStepIndex();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Sidebar - Pipeline Navigation */}
      <aside className="w-72 border-r border-border bg-card/50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/dashboard')}
              className="h-8 w-8"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="font-semibold text-foreground">Studio</h2>
              <p className="text-xs text-muted-foreground">Video Creation Pipeline</p>
            </div>
          </div>
        </div>

        {/* Pipeline Stages */}
        <div className="flex-1 p-3 space-y-1 overflow-y-auto">
          {pipelineStages.map((stage) => {
            const isActive = stage.id === activeIndex;
            const isCompleted = completedSteps.includes(stage.id);
            const IconComponent = stage.icon;

            return (
              <button
                key={stage.id}
                onClick={() => handleStepClick(stage.key as StudioStep)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-start gap-3 ${
                  isActive 
                    ? 'bg-primary/10 border border-primary/30 shadow-sm' 
                    : isCompleted
                    ? 'bg-green-500/5 border border-green-500/20 hover:bg-green-500/10'
                    : 'bg-muted/30 border border-transparent hover:bg-muted/50'
                }`}
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  isActive 
                    ? 'bg-primary/20' 
                    : isCompleted 
                    ? 'bg-green-500/20' 
                    : 'bg-muted'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${
                      isActive ? 'text-primary' : isCompleted ? 'text-green-500' : 'text-foreground'
                    }`}>
                      {stage.name}
                    </span>
                    {isActive && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-primary border-primary">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{stage.description}</p>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-primary mt-1 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Progress Summary */}
        <div className="p-4 border-t border-border">
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-xs font-medium text-foreground">
                {completedSteps.length}/{pipelineStages.length}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(completedSteps.length / pipelineStages.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Settings Link */}
        <div className="p-4 border-t border-border">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/settings?tab=data')}
          >
            <Settings className="w-4 h-4" />
            Data Settings
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">
          {renderStepContent()}
        </div>
      </main>
    </div>
  );
};

export default Studio;