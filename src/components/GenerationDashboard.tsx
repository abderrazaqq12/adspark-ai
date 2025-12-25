import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Pause, RefreshCw, CheckCircle, XCircle, Clock, Zap, Video, AlertTriangle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client"; // Database only
import { getUser } from "@/utils/auth";
import { toast } from "sonner";
import VideoPreviewPlayer from "./VideoPreviewPlayer";

interface QueueItem {
  id: string;
  status: string | null;
  priority: number | null;
  attempts: number | null;
  max_attempts: number | null;
  error_message: string | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  external_job_id: string | null;
  scene_id: string | null;
  engine_id: string | null;
  scenes?: {
    id: string;
    text: string;
    index: number;
    scene_type: string | null;
    video_url: string | null;
  } | null;
  ai_engines?: {
    id: string;
    name: string;
    type: string;
  } | null;
}

interface DashboardStats {
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  queued: { icon: <Clock className="w-4 h-4" />, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "Queued" },
  processing: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Processing" },
  completed: { icon: <CheckCircle className="w-4 h-4" />, color: "bg-green-500/20 text-green-400 border-green-500/30", label: "Completed" },
  failed: { icon: <XCircle className="w-4 h-4" />, color: "bg-red-500/20 text-red-400 border-red-500/30", label: "Failed" },
};

export default function GenerationDashboard() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ total: 0, queued: 0, processing: 0, completed: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [previewItem, setPreviewItem] = useState<QueueItem | null>(null);

  useEffect(() => {
    fetchQueueItems();

    // Set up real-time subscription
    const channel = supabase
      .channel('queue-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'generation_queue' },
        (payload) => {
          console.log('Queue update:', payload);
          handleRealtimeUpdate(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'scenes' },
        (payload) => {
          console.log('Scene update:', payload);
          fetchQueueItems(); // Refresh to get updated scene data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRealtimeUpdate = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    setQueueItems(prev => {
      if (eventType === 'INSERT') {
        return [newRecord as QueueItem, ...prev];
      } else if (eventType === 'UPDATE') {
        return prev.map(item =>
          item.id === newRecord.id ? { ...item, ...newRecord } : item
        );
      } else if (eventType === 'DELETE') {
        return prev.filter(item => item.id !== oldRecord.id);
      }
      return prev;
    });

    // Update stats
    if (eventType === 'UPDATE' && newRecord.status !== oldRecord?.status) {
      setStats(prev => {
        const newStats = { ...prev };
        if (oldRecord?.status) {
          newStats[oldRecord.status as keyof DashboardStats]--;
        }
        if (newRecord.status) {
          newStats[newRecord.status as keyof DashboardStats]++;
        }
        return newStats;
      });

      // Show toast for status changes
      if (newRecord.status === 'completed') {
        toast.success('Scene generation completed!');
      } else if (newRecord.status === 'failed') {
        toast.error('Scene generation failed', { description: newRecord.error_message });
      }
    }
  };

  const fetchQueueItems = async () => {
    try {
      // VPS-ONLY: Use centralized auth
      const user = getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('generation_queue')
        .select(`
          *,
          scenes (id, text, index, scene_type, video_url),
          ai_engines (id, name, type)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setQueueItems(data || []);

      // Calculate stats
      const newStats: DashboardStats = {
        total: data?.length || 0,
        queued: data?.filter(i => i.status === 'queued').length || 0,
        processing: data?.filter(i => i.status === 'processing').length || 0,
        completed: data?.filter(i => i.status === 'completed').length || 0,
        failed: data?.filter(i => i.status === 'failed').length || 0,
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching queue:', error);
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  const processQueue = async () => {
    setProcessingQueue(true);
    try {
      const response = await supabase.functions.invoke('process-queue', {
        body: { limit: 5 }
      });

      if (response.error) throw response.error;

      toast.success(`Processed ${response.data.processed} items`, {
        description: `${response.data.remaining} items remaining in queue`
      });

      fetchQueueItems();
    } catch (error) {
      console.error('Error processing queue:', error);
      toast.error('Failed to process queue');
    } finally {
      setProcessingQueue(false);
    }
  };

  const retryFailed = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('generation_queue')
        .update({ status: 'queued', attempts: 0, error_message: null })
        .eq('id', itemId);

      if (error) throw error;
      toast.success('Item requeued');
    } catch (error) {
      console.error('Error retrying item:', error);
      toast.error('Failed to retry item');
    }
  };

  const progressPercent = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.queued}</p>
            <p className="text-sm text-muted-foreground">Queued</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{stats.processing}</p>
            <p className="text-sm text-muted-foreground">Processing</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
            <p className="text-sm text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="bg-gradient-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-2">
              <Button
                onClick={processQueue}
                disabled={processingQueue || stats.queued === 0}
                size="sm"
                className="bg-gradient-primary"
              >
                {processingQueue ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Process Queue
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchQueueItems}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Queue Items */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Generation Queue
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Real-time view of video generation tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queueItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No items in queue. Start a batch generation to see progress here.
            </p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {queueItems.map((item) => {
                const config = statusConfig[item.status || 'queued'];
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Badge className={config.color}>
                        {config.icon}
                        <span className="ml-1">{config.label}</span>
                      </Badge>
                      <div>
                        <p className="font-medium text-foreground">
                          Scene {item.scenes?.index !== undefined ? item.scenes.index + 1 : '?'}
                          {item.scenes?.scene_type && (
                            <span className="text-muted-foreground ml-2">
                              ({item.scenes.scene_type})
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {item.scenes?.text || 'Loading...'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {item.ai_engines && (
                        <Badge variant="outline" className="text-xs">
                          <Zap className="w-3 h-3 mr-1" />
                          {item.ai_engines.name}
                        </Badge>
                      )}
                      {item.external_job_id && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {item.external_job_id.slice(0, 8)}...
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-destructive max-w-[200px] truncate" title={item.error_message || ''}>
                            {item.error_message}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryFailed(item.id)}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Retry
                          </Button>
                        </div>
                      )}
                      {item.status === 'processing' && (
                        <span className="text-xs text-muted-foreground">
                          Attempt {item.attempts}/{item.max_attempts}
                        </span>
                      )}
                      {item.scenes?.video_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewItem(item)}
                          className="text-primary"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Preview Modal */}
      {previewItem && previewItem.scenes?.video_url && (
        <VideoPreviewPlayer
          open={!!previewItem}
          onOpenChange={(open) => !open && setPreviewItem(null)}
          videoUrl={previewItem.scenes.video_url}
          title={previewItem.scenes.text}
          sceneIndex={previewItem.scenes.index}
          engineName={previewItem.ai_engines?.name}
          onDownload={() => {
            if (previewItem.scenes?.video_url) {
              window.open(previewItem.scenes.video_url, '_blank');
            }
          }}
        />
      )}
    </div>
  );
}
