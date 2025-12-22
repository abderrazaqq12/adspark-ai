/**
 * Recent Outputs - SECTION 5
 * Shows last 5 generated outputs
 * READ-ONLY - View links only
 * 
 * SEVERITY DISPLAY:
 * - Shows "LOCAL ONLY" badge when Drive not linked
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileOutput, 
  Video,
  Image,
  Mic,
  ExternalLink,
  Clock,
  Inbox,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalProject } from '@/contexts/GlobalProjectContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface RecentOutput {
  id: string;
  type: 'video' | 'image' | 'audio';
  projectName: string;
  duration: string | null;
  tool: string;
  driveLink: string | null;
  createdAt: string;
}

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
  video: { icon: Video, color: 'text-green-500', label: 'Video' },
  image: { icon: Image, color: 'text-blue-500', label: 'Image' },
  audio: { icon: Mic, color: 'text-amber-500', label: 'Audio' }
};

export function RecentOutputs() {
  const { activeProject } = useGlobalProject();
  const [outputs, setOutputs] = useState<RecentOutput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentOutputs();
  }, [activeProject?.id]);

  const fetchRecentOutputs = async () => {
    setLoadError(null);
    
    try {
      const results: RecentOutput[] = [];

      // Fetch video outputs
      let videoQuery = supabase
        .from('video_outputs')
        .select(`
          id,
          duration_sec,
          final_video_url,
          created_at,
          projects!video_outputs_project_id_fkey (name, google_drive_folder_link)
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      if (activeProject?.id) {
        videoQuery = videoQuery.eq('project_id', activeProject.id);
      }

      const { data: videos, error: videoError } = await videoQuery;

      if (videoError) {
        console.error('Error fetching videos:', videoError);
        setLoadError('Failed to load outputs');
        setIsLoading(false);
        return;
      }

      videos?.forEach(v => {
        results.push({
          id: v.id,
          type: 'video',
          projectName: (v.projects as any)?.name || 'Unknown',
          duration: v.duration_sec ? `${Math.floor(v.duration_sec / 60)}:${String(v.duration_sec % 60).padStart(2, '0')}` : null,
          tool: 'Studio',
          driveLink: (v.projects as any)?.google_drive_folder_link || null,
          createdAt: v.created_at || ''
        });
      });

      // Fetch image outputs
      let imageQuery = supabase
        .from('generated_images')
        .select(`
          id,
          image_type,
          created_at,
          projects!generated_images_project_id_fkey (name, google_drive_folder_link)
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      if (activeProject?.id) {
        imageQuery = imageQuery.eq('project_id', activeProject.id);
      }

      const { data: images, error: imageError } = await imageQuery;

      if (imageError) {
        console.error('Error fetching images:', imageError);
        // Don't block - we still have videos
      }

      images?.forEach(i => {
        results.push({
          id: i.id,
          type: 'image',
          projectName: (i.projects as any)?.name || 'Unknown',
          duration: null,
          tool: i.image_type === 'thumbnail' ? 'Thumbnail Generator' : 'AI Image',
          driveLink: (i.projects as any)?.google_drive_folder_link || null,
          createdAt: i.created_at || ''
        });
      });

      // Sort by created_at and take top 5
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOutputs(results.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent outputs:', error);
      setLoadError('Backend connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted/50 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (loadError) {
    return (
      <Card className="border-amber-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileOutput className="w-5 h-5 text-muted-foreground" />
            Recent Outputs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-amber-600 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Status unavailable</p>
              <p className="text-xs text-amber-600/80">{loadError}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <FileOutput className="w-5 h-5 text-primary" />
          Recent Outputs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {outputs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No outputs generated</p>
            <p className="text-xs mt-1">No completed videos, images, or audio files found.</p>
            <p className="text-[10px] text-muted-foreground/60 mt-2">
              Outputs will appear here when generation jobs complete successfully.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {outputs.map(output => {
              const config = typeConfig[output.type];
              const Icon = config.icon;
              const isSavedLocally = !output.driveLink;
              
              return (
                <div 
                  key={output.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    isSavedLocally 
                      ? "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10"
                      : "bg-muted/30 border-border/50 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded bg-background ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] h-5">
                          {config.label}
                        </Badge>
                        {output.duration && (
                          <span className="text-xs text-muted-foreground">{output.duration}</span>
                        )}
                        {isSavedLocally && (
                          <Badge 
                            variant="outline" 
                            className="text-[9px] h-4 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          >
                            LOCAL ONLY
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {output.projectName} · {output.tool}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(output.createdAt), { addSuffix: true })}
                    </div>
                    {output.driveLink ? (
                      <a 
                        href={output.driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="View in Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
                        Not saved
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}