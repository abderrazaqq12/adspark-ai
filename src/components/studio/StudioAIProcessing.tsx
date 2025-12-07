import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Clock, AlertCircle, RefreshCw, ArrowRight, Play, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [pricingTier, setPricingTier] = useState('free');
  const [scriptsCount, setScriptsCount] = useState('5');
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: '1', name: 'Script Generation', status: 'pending', icon: '📝', description: 'Generating multiple script variations' },
    { id: '2', name: 'Voiceover Generation', status: 'pending', icon: '🎙️', description: 'Creating AI voiceovers for each script' },
    { id: '3', name: 'Scene Breakdown', status: 'pending', icon: '🎬', description: 'Breaking scripts into visual scenes' },
    { id: '4', name: 'Video Generation', status: 'pending', icon: '🎥', description: 'Generating videos for each scene' },
    { id: '5', name: 'Assembly', status: 'pending', icon: '🔧', description: 'Assembling final video outputs' },
  ]);

  // Subscribe to autopilot job updates
  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`autopilot-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'autopilot_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          const job = payload.new as {
            status: string;
            progress: {
              scripts_generated?: number;
              voiceovers_generated?: number;
              scenes_broken_down?: number;
              videos_generated?: number;
              videos_assembled?: number;
            };
          };

          updateStepsFromProgress(job.progress, job.status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const updateStepsFromProgress = (progress: any, status: string) => {
    const count = parseInt(scriptsCount) || 5;
    
    setSteps(prev => prev.map((step, index) => {
      let newStatus: ProcessingStep['status'] = 'pending';

      switch (index) {
        case 0: // Scripts
          if ((progress?.scripts_generated || 0) >= count) newStatus = 'completed';
          else if (progress?.scripts_generated > 0) newStatus = 'processing';
          break;
        case 1: // Voiceovers
          if ((progress?.voiceovers_generated || 0) >= count) newStatus = 'completed';
          else if (progress?.voiceovers_generated > 0) newStatus = 'processing';
          break;
        case 2: // Scenes
          if ((progress?.scenes_broken_down || 0) >= count) newStatus = 'completed';
          else if (progress?.scenes_broken_down > 0) newStatus = 'processing';
          break;
        case 3: // Videos
          if ((progress?.videos_generated || 0) > 0) {
            if (status === 'completed' || status === 'generating') newStatus = 'processing';
            if ((progress?.videos_assembled || 0) > 0) newStatus = 'completed';
          }
          break;
        case 4: // Assembly
          if ((progress?.videos_assembled || 0) > 0) newStatus = 'completed';
          else if ((progress?.videos_generated || 0) > 0) newStatus = 'processing';
          break;
      }

      if (status === 'failed') {
        if (step.status === 'processing') newStatus = 'error';
      }

      return { ...step, status: newStatus };
    }));

    if (status === 'completed') {
      setIsProcessing(false);
      toast({
        title: "Processing Complete",
        description: "All videos have been generated successfully!",
      });
    }
  };

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
          icon: <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />,
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

  const startProcessing = async () => {
    if (!productName.trim()) {
      toast({
        title: "Product Name Required",
        description: "Please enter a product name to start processing",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending' as const })));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call the autopilot-generate edge function
      const response = await supabase.functions.invoke('autopilot-generate', {
        body: {
          productName,
          productDescription,
          language,
          pricingTier,
          scriptsCount: parseInt(scriptsCount) || 5,
          variationsPerScene: 3
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to start autopilot');
      }

      const data = response.data;
      setJobId(data.jobId);

      toast({
        title: "Processing Started",
        description: `Autopilot started! Generating ${data.estimatedVideos} video variations.`,
      });

      // Set first step to processing
      setSteps(prev => prev.map((s, i) => 
        i === 0 ? { ...s, status: 'processing' as const } : s
      ));

    } catch (error: any) {
      console.error('Autopilot error:', error);
      setIsProcessing(false);
      toast({
        title: "Error",
        description: error.message || "Failed to start processing",
        variant: "destructive",
      });
    }
  };

  const allCompleted = steps.every(s => s.status === 'completed');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">AI Orchestration</h2>
          <p className="text-muted-foreground text-sm mt-1">Content generation pipeline powered by Autopilot</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Layer 11</Badge>
      </div>

      {/* Configuration */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-4">Generation Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Product Name *</Label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Enter product name"
              disabled={isProcessing}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage} disabled={isProcessing}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabic (Saudi)</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Product Description</Label>
            <Input
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Brief description of the product"
              disabled={isProcessing}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label>Pricing Tier</Label>
            <Select value={pricingTier} onValueChange={setPricingTier} disabled={isProcessing}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free (Free engines only)</SelectItem>
                <SelectItem value="budget">Budget (Low-cost engines)</SelectItem>
                <SelectItem value="standard">Standard (Mid-range)</SelectItem>
                <SelectItem value="premium">Premium (Highest quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Number of Scripts</Label>
            <Select value={scriptsCount} onValueChange={setScriptsCount} disabled={isProcessing}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 scripts</SelectItem>
                <SelectItem value="5">5 scripts</SelectItem>
                <SelectItem value="10">10 scripts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button 
            onClick={startProcessing} 
            disabled={isProcessing || !productName.trim()}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Autopilot
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
        <Button onClick={onNext} className="gap-2" disabled={!allCompleted && isProcessing}>
          Continue to Assets
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
