import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SceneStatus {
  id: string;
  index: number;
  text: string;
  status: string;
  engine_name: string | null;
  video_url: string | null;
}

interface SceneProgressTrackerProps {
  scriptId: string;
  onComplete?: () => void;
}

export default function SceneProgressTracker({ scriptId, onComplete }: SceneProgressTrackerProps) {
  const [scenes, setScenes] = useState<SceneStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScenes();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`scenes-${scriptId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scenes',
          filter: `script_id=eq.${scriptId}`,
        },
        (payload) => {
          console.log('Scene update:', payload);
          if (payload.eventType === 'UPDATE') {
            setScenes(prev => prev.map(s => 
              s.id === payload.new.id ? { ...s, ...payload.new } : s
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scriptId]);

  useEffect(() => {
    const allCompleted = scenes.length > 0 && scenes.every(s => s.status === 'completed');
    if (allCompleted && onComplete) {
      onComplete();
    }
  }, [scenes, onComplete]);

  const fetchScenes = async () => {
    const { data, error } = await supabase
      .from("scenes")
      .select("id, index, text, status, engine_name, video_url")
      .eq("script_id", scriptId)
      .order("index");

    if (!error && data) {
      setScenes(data);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'generating':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-500';
      case 'generating':
        return 'bg-primary/20 text-primary';
      case 'failed':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const completedCount = scenes.filter(s => s.status === 'completed').length;
  const progress = scenes.length > 0 ? (completedCount / scenes.length) * 100 : 0;

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Scene Generation Progress
          </span>
          <Badge variant="outline">
            {completedCount}/{scenes.length} Complete
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="text-foreground font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {scenes.map((scene) => (
            <div
              key={scene.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                scene.status === 'generating' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(scene.status)}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Scene {scene.index + 1}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {scene.text.substring(0, 50)}...
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {scene.engine_name && (
                  <Badge variant="secondary" className="text-xs">
                    {scene.engine_name}
                  </Badge>
                )}
                <Badge className={`text-xs ${getStatusColor(scene.status)}`}>
                  {scene.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
