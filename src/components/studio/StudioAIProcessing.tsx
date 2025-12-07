import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, AlertCircle, RefreshCw, ArrowRight, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StudioAIProcessingProps {
  onNext: () => void;
}

interface ProcessingStep {
  id: string;
  name: string;
  status: 'completed' | 'processing' | 'pending' | 'error';
  icon: string;
  description: string;
}

export const StudioAIProcessing = ({ onNext }: StudioAIProcessingProps) => {
  const { toast } = useToast();
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: '1', name: 'Content Scraping', status: 'pending', icon: '🔍', description: 'Extracting product information from URL' },
    { id: '2', name: 'Image Understanding', status: 'pending', icon: '👁️', description: 'Analyzing product images with AI' },
    { id: '3', name: 'Landing Page Content', status: 'pending', icon: '📄', description: 'Generating landing page copy' },
    { id: '4', name: 'Video Scripts (10 variants)', status: 'pending', icon: '🎬', description: 'Creating multiple script variations' },
    { id: '5', name: 'Voiceover Generation', status: 'pending', icon: '🎙️', description: 'Generating AI voiceovers' },
    { id: '6', name: 'Video Assembly', status: 'pending', icon: '🎥', description: 'Assembling final video outputs' },
  ]);

  const getStatusConfig = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'completed':
        return {
          badge: <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Completed</Badge>,
          icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
          color: 'border-green-500/30 bg-green-500/5',
        };
      case 'processing':
        return {
          badge: <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Processing</Badge>,
          icon: <Clock className="w-5 h-5 text-blue-500 animate-pulse" />,
          color: 'border-blue-500/30 bg-blue-500/5',
        };
      case 'error':
        return {
          badge: <Badge variant="destructive">Error</Badge>,
          icon: <AlertCircle className="w-5 h-5 text-destructive" />,
          color: 'border-destructive/30 bg-destructive/5',
        };
      default:
        return {
          badge: <Badge variant="outline">Pending</Badge>,
          icon: <Clock className="w-5 h-5 text-muted-foreground" />,
          color: 'border-border bg-card',
        };
    }
  };

  const startProcessing = () => {
    toast({
      title: "Processing Started",
      description: "AI orchestration has begun. This may take a few minutes.",
    });

    // Simulate processing
    let currentStep = 0;
    const processNextStep = () => {
      if (currentStep < steps.length) {
        setSteps(prev => prev.map((step, index) => {
          if (index === currentStep) return { ...step, status: 'processing' as const };
          if (index < currentStep) return { ...step, status: 'completed' as const };
          return step;
        }));

        setTimeout(() => {
          setSteps(prev => prev.map((step, index) => {
            if (index === currentStep) return { ...step, status: 'completed' as const };
            return step;
          }));
          currentStep++;
          if (currentStep < steps.length) {
            processNextStep();
          }
        }, 1500);
      }
    };
    processNextStep();
  };

  const allCompleted = steps.every(s => s.status === 'completed');
  const isProcessing = steps.some(s => s.status === 'processing');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">AI Orchestration</h2>
          <p className="text-muted-foreground text-sm mt-1">Content generation pipeline status</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Layer 11</Badge>
      </div>

      {/* Start Button */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Start AI Processing</h3>
            <p className="text-sm text-muted-foreground">Begin the automated content generation pipeline</p>
          </div>
          <Button 
            onClick={startProcessing} 
            disabled={isProcessing || allCompleted}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : allCompleted ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Processing
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Processing Steps */}
      <div className="space-y-3">
        {steps.map((step) => {
          const config = getStatusConfig(step.status);
          return (
            <Card key={step.id} className={`p-4 border ${config.color} transition-all duration-300`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{step.icon}</span>
                  <div>
                    <p className="font-medium text-foreground">{step.name}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {config.badge}
                  {config.icon}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={onNext} className="gap-2" disabled={!allCompleted}>
          Continue to Assets
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
