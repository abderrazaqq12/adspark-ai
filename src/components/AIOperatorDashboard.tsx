import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface AIOperatorDashboardProps {
  projectId: string | null;
  enabled: boolean;
}

export default function AIOperatorDashboard({ projectId, enabled }: AIOperatorDashboardProps) {
  const [jobs, setJobs] = useState<OperatorJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0
  });

  useEffect(() => {
    if (projectId) {
      fetchJobs();
      subscribeToJobs();
    }
  }, [projectId]);

  const fetchJobs = async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('operator_jobs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);

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
    if (!projectId) return;

    const channel = supabase
      .channel('operator-jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operator_jobs',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const runOperator = async (action: string) => {
    if (!projectId) return;

    setIsRunning(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
      fetchJobs();
    } catch (error: any) {
      toast.error(error.message || 'AI Operator action failed');
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
      {/* Stats & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <span className="text-foreground font-medium">AI Operator</span>
          </div>
          <div className="flex gap-2">
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
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runOperator('monitor_pipeline')}
            disabled={isRunning}
            className="border-border"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4 mr-2" />}
            Scan Pipeline
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
            onClick={() => runOperator('optimize_cost')}
            disabled={isRunning}
            className="border-border"
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Optimize Cost
          </Button>
        </div>
      </div>

      {/* Jobs List */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Recent Operations</CardTitle>
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
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {jobs.map((job) => (
                <div 
                  key={job.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {getJobTypeIcon(job.job_type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground capitalize">
                        {job.job_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(job.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.error_message && (
                      <span className="text-xs text-destructive max-w-[150px] truncate" title={job.error_message}>
                        {job.error_message}
                      </span>
                    )}
                    {getStatusBadge(job.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
