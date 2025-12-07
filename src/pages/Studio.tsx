import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Mic, 
  Wand2, 
  Video, 
  Palette, 
  Globe,
  ChevronRight,
  CheckCircle2,
  Circle,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { StudioProductInput } from '@/components/studio/StudioProductInput';
import { StudioAIProcessing } from '@/components/studio/StudioAIProcessing';
import { StudioAssetBuilder } from '@/components/studio/StudioAssetBuilder';

// Full pipeline stages from CreateVideo
const pipelineStages = [
  { id: 0, name: "Product Info", icon: Package, description: "Product details for your video" },
  { id: 1, name: "AI Orchestration", icon: Wand2, description: "Automated content generation pipeline" },
  { id: 2, name: "Assets Preview", icon: Video, description: "Review and manage generated assets" },
];

export type WorkflowLayer = 'input' | 'processing' | 'assets';

const Studio = () => {
  const navigate = useNavigate();
  const [activeLayer, setActiveLayer] = useState<WorkflowLayer>('input');
  const [completedStages, setCompletedStages] = useState<number[]>([]);

  const getActiveStageIndex = () => {
    switch (activeLayer) {
      case 'input': return 0;
      case 'processing': return 1;
      case 'assets': return 2;
      default: return 0;
    }
  };

  const handleStageComplete = (stageId: number) => {
    if (!completedStages.includes(stageId)) {
      setCompletedStages(prev => [...prev, stageId]);
    }
  };

  const handleNext = (currentLayer: WorkflowLayer) => {
    switch (currentLayer) {
      case 'input':
        handleStageComplete(0);
        setActiveLayer('processing');
        break;
      case 'processing':
        handleStageComplete(1);
        setActiveLayer('assets');
        break;
    }
  };

  const handleLayerClick = (layer: WorkflowLayer) => {
    setActiveLayer(layer);
  };

  const renderLayerContent = () => {
    switch (activeLayer) {
      case 'input':
        return <StudioProductInput onNext={() => handleNext('input')} />;
      case 'processing':
        return <StudioAIProcessing onNext={() => handleNext('processing')} />;
      case 'assets':
        return <StudioAssetBuilder />;
      default:
        return <StudioProductInput onNext={() => handleNext('input')} />;
    }
  };

  const activeIndex = getActiveStageIndex();

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
        <div className="flex-1 p-4 space-y-2">
          {pipelineStages.map((stage, index) => {
            const isActive = index === activeIndex;
            const isCompleted = completedStages.includes(stage.id);
            const IconComponent = stage.icon;
            const layerKey = index === 0 ? 'input' : index === 1 ? 'processing' : 'assets';

            return (
              <button
                key={stage.id}
                onClick={() => handleLayerClick(layerKey as WorkflowLayer)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-start gap-3 ${
                  isActive 
                    ? 'bg-primary/10 border border-primary/30 shadow-sm' 
                    : isCompleted
                    ? 'bg-green-500/5 border border-green-500/20 hover:bg-green-500/10'
                    : 'bg-muted/30 border border-transparent hover:bg-muted/50'
                }`}
              >
                <div className={`p-2 rounded-lg ${
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
                {isActive && <ChevronRight className="w-4 h-4 text-primary mt-1" />}
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
                {completedStages.length}/{pipelineStages.length}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(completedStages.length / pipelineStages.length) * 100}%` }}
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
        <div className="p-8">
          {renderLayerContent()}
        </div>
      </main>
    </div>
  );
};

export default Studio;
