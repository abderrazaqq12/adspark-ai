import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  TrendingDown,
  Eye,
  Sparkles,
  Clock,
  Activity,
  Play,
  Pause,
  Settings2,
  AlertTriangle,
  Key,
  Image,
  Webhook,
  DollarSign,
  Layers
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client"; // Database only
import { getUser } from "@/utils/auth";
import { toast } from "sonner";
import AutopilotProgress from "./AutopilotProgress";
import { useFreeTierCreativeEngine } from "@/hooks/useFreeTierCreativeEngine";

interface OperatorJob {
  id: string;
  job_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
  input_data: any;
  output_data: any;
}

interface APIKeyStatus {
  active_providers: string[];
  count: number;
}

interface OperatorStatus {
  operator_enabled: boolean;
  api_keys: APIKeyStatus;
}

interface AIOperatorDashboardProps {
  projectId?: string | null;
  enabled?: boolean;
  showAutopilot?: boolean;
}

export default function AIOperatorDashboard({ projectId, enabled = true, showAutopilot = false }: AIOperatorDashboardProps) {
  const [jobs, setJobs] = useState<OperatorJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"operator" | "autopilot">("operator");
  const [autopilotJobId, setAutopilotJobId] = useState<string | null>(null);
  const [operatorStatus, setOperatorStatus] = useState<OperatorStatus | null>(null);
  const [freeTierSavings, setFreeTierSavings] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0
  });

  const { getAIOperatorRecommendation, autoOptimizeForFreeTier, canUseFreeTier } = useFreeTierCreativeEngine();

  useEffect(() => {
    loadJobs();
    loadOperatorStatus();
    const unsubscribe = subscribeToJobs();
    return () => unsubscribe?.();
  }, [projectId]);

  const loadOperatorStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-operator', {
        body: { action: 'check_api_keys' }
      });

      if (!error && data) {
        setOperatorStatus({
          operator_enabled: data.settings?.ai_operator_enabled || false,
          api_keys: {
            active_providers: data.api_keys?.active_providers || [],
            count: data.api_keys?.active_providers?.length || 0
          }
        });
      }
    } catch (error) {
      console.error('Error loading operator status:', error);
    }
  };

  const loadJobs = async () => {
    try {
      let query = supabase
        .from('operator_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setJobs(data || []);

      // Calculate stats
      const allJobs = data || [];
      setStats({
        total: allJobs.length,
        completed: allJobs.filter(j => j.status === 'completed').length,
        failed: allJobs.filter(j => j.status === 'failed').length,
        pending: allJobs.filter(j => j.status === 'pending' || j.status === 'running').length
      });
    } catch (error) {
      console.error('Error fetching operator jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToJobs = () => {
    const channel = supabase
      .channel('operator-jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operator_jobs'
        },
        () => {
          loadJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const runOperator = async (action: string) => {
    setIsRunning(true);

    try {
      // VPS-ONLY: Use centralized auth
      const user = getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('ai-operator', {
        body: {
          action,
          projectId,
          userId: user.id
        }
      });

      if (error) throw error;

      toast.success(`AI Operator: ${action.replace(/_/g, ' ')}`);
      loadJobs();
    } catch (error: any) {
      toast.error(error.message || 'AI Operator action failed');
    } finally {
      setIsRunning(false);
    }
  };

  const runFreeTierOptimization = async () => {
    setIsRunning(true);
    try {
      // VPS-ONLY: Use centralized auth
      const user = getUser();
      if (!user) throw new Error('Not authenticated');

      // Get AI Operator recommendation for free-tier
      const recommendation = await getAIOperatorRecommendation({
        videoType: 'ugc',
        targetQuality: 'standard',
        hasExistingFootage: true,
        hasProductImages: true,
        needsNewFootage: false,
        targetMarket: 'GCC',
        language: 'ar'
      });

      if (recommendation.useFreeTier) {
        toast.success(`Free-tier optimization: ${recommendation.reason}`, {
          description: `Estimated savings: $${recommendation.estimatedSavings.toFixed(2)} per video`
        });
        setFreeTierSavings(prev => prev + recommendation.estimatedSavings);
      } else {
        toast.info(recommendation.reason);
      }

      // Log the optimization job
      await supabase.from('operator_jobs').insert([{
        job_type: 'free_tier_optimization',
        status: 'completed',
        user_id: user.id,
        project_id: projectId || undefined,
        output_data: {
          useFreeTier: recommendation.useFreeTier,
          reason: recommendation.reason,
          estimatedQuality: recommendation.estimatedQuality,
          estimatedSavings: recommendation.estimatedSavings
        }
      }]);

      loadJobs();
    } catch (error: any) {
      toast.error(error.message || 'Free-tier optimization failed');
    } finally {
      setIsRunning(false);
    }
  };

  const getJobTypeIcon = (type: string) => {
    switch (type) {
      case 'retry_scene': return <RefreshCw className="w-4 h-4" />;
      case 'switch_engine': return <Zap className="w-4 h-4" />;
      case 'quality_check': return <Eye className="w-4 h-4" />;
      case 'optimize_cost': return <TrendingDown className="w-4 h-4" />;
      case 'generate_variations': return <Sparkles className="w-4 h-4" />;
      case 'generate_images':
      case 'generate_images_n8n': return <Image className="w-4 h-4" />;
      case 'auto_regenerate': return <RefreshCw className="w-4 h-4" />;
      case 'free_tier_optimization': return <DollarSign className="w-4 h-4" />;
      case 'ffmpeg_transform': return <Layers className="w-4 h-4" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-primary/20 text-primary border-0">Completed</Badge>;
      case 'running':
        return <Badge className="bg-secondary/20 text-secondary border-0">Running</Badge>;
      case 'failed':
        return <Badge className="bg-destructive/20 text-destructive border-0">Failed</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground border-0">Pending</Badge>;
    }
  };

  if (!enabled) {
    return (
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="py-8 text-center">
          <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">AI Operator Disabled</h3>
          <p className="text-muted-foreground text-sm">
            Enable the AI Operator in Settings → Backend to use autonomous optimization
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      {showAutopilot && (
        <div className="flex gap-2 p-1 bg-muted/30 rounded-lg w-fit">
          <Button
            variant={activeTab === "operator" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("operator")}
            className={activeTab === "operator" ? "bg-primary" : ""}
          >
            <Bot className="w-4 h-4 mr-2" />
            AI Operator
          </Button>
          <Button
            variant={activeTab === "autopilot" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("autopilot")}
            className={activeTab === "autopilot" ? "bg-primary" : ""}
          >
            <Play className="w-4 h-4 mr-2" />
            Autopilot
          </Button>
        </div>
      )}

      {/* Autopilot Tab */}
      {showAutopilot && activeTab === "autopilot" && autopilotJobId && (
        <AutopilotProgress
          jobId={autopilotJobId}
          onComplete={() => {
            toast.success('Autopilot completed!');
            loadJobs();
          }}
        />
      )}

      {showAutopilot && activeTab === "autopilot" && !autopilotJobId && (
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="py-8 text-center">
            <Play className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Active Autopilot Job</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Start an Autopilot job from Quick Commerce to see real-time progress here.
            </p>
            <Button variant="outline" onClick={() => window.location.href = '/quick-commerce'}>
              Go to Quick Commerce
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Operator Tab */}
      {activeTab === "operator" && (
        <>
          {/* Stats & Actions */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <span className="text-foreground font-medium">AI Operator</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {stats.completed} completed
                </Badge>
                <Badge variant="outline" className="border-secondary/30 text-secondary">
                  {stats.pending} pending
                </Badge>
                {stats.failed > 0 && (
                  <Badge variant="outline" className="border-destructive/30 text-destructive">
                    {stats.failed} failed
                  </Badge>
                )}
                {operatorStatus && (
                  <>
                    <Badge
                      variant="outline"
                      className={`${operatorStatus.api_keys.count > 0 ? 'border-emerald-500/30 text-emerald-500' : 'border-amber-500/30 text-amber-500'}`}
                    >
                      <Key className="w-3 h-3 mr-1" />
                      {operatorStatus.api_keys.count} API keys
                    </Badge>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={runFreeTierOptimization}
                disabled={isRunning}
                className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10"
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />}
                Free-Tier Optimize
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runOperator('monitor_pipeline')}
                disabled={isRunning}
                className="border-border"
              >
                <Bot className="w-4 h-4 mr-2" />
                Scan Pipeline
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runOperator('generate_images')}
                disabled={isRunning || !projectId}
                className="border-border"
              >
                <Image className="w-4 h-4 mr-2" />
                Generate Images
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runOperator('auto_regenerate_low_quality')}
                disabled={isRunning}
                className="border-border"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Auto-Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runOperator('retry_failed_jobs')}
                disabled={isRunning || stats.failed === 0}
                className="border-border"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Failed
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runOperator('check_api_keys')}
                disabled={isRunning}
                className="border-border"
              >
                <Key className="w-4 h-4 mr-2" />
                Check Keys
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runOperator('full_autonomous_run')}
                disabled={isRunning}
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Zap className="w-4 h-4 mr-2" />
                Full Auto Run
              </Button>
            </div>
            {freeTierSavings > 0 && (
              <Badge className="bg-emerald-500/20 text-emerald-500 border-0">
                <DollarSign className="w-3 h-3 mr-1" />
                ${freeTierSavings.toFixed(2)} saved with free-tier
              </Badge>
            )}
          </div>

          {/* Jobs List */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-foreground">Recent Operations</CardTitle>
                <Button variant="ghost" size="sm" onClick={loadJobs} className="h-6">
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No operator jobs yet. Click "Scan Pipeline" to start.
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${job.status === 'running'
                            ? 'bg-primary/5 border border-primary/20'
                            : 'bg-muted/30'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${job.status === 'running'
                              ? 'bg-primary/20 text-primary animate-pulse'
                              : 'bg-primary/10 text-primary'
                            }`}>
                            {getJobTypeIcon(job.job_type)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground capitalize">
                              {job.job_type.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(job.created_at).toLocaleTimeString()}
                              {job.status === 'running' && (
                                <span className="ml-2 text-primary">In progress...</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {job.error_message && (
                            <span
                              className="text-xs text-destructive max-w-[150px] truncate flex items-center gap-1"
                              title={job.error_message}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {job.error_message}
                            </span>
                          )}
                          {getStatusBadge(job.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
