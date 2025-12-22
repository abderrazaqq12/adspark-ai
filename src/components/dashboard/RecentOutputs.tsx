/**
 * Recent Outputs - SECTION 5
 * Shows last 5 generated outputs
 * READ-ONLY - View links only
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
  Inbox
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalProject } from '@/contexts/GlobalProjectContext';
import { formatDistanceToNow } from 'date-fns';

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

  useEffect(() => {
    fetchRecentOutputs();
  }, [activeProject?.id]);

  const fetchRecentOutputs = async () => {
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

      const { data: videos } = await videoQuery;

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

      const { data: images } = await imageQuery;

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
            <p className="text-sm">No outputs yet</p>
            <p className="text-xs">Generated files will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {outputs.map(output => {
              const config = typeConfig[output.type];
              const Icon = config.icon;
              
              return (
                <div 
                  key={output.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
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
                    {output.driveLink && (
                      <a 
                        href={output.driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="View in Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
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