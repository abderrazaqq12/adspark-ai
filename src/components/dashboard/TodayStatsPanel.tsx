/**
 * Today Stats Panel - Daily costs, achievements, and creations
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Trophy,
  Sparkles,
  Video,
  Image,
  FileText,
  Mic,
  Zap,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TodayStats {
  totalCost: number;
  videosCreated: number;
  imagesGenerated: number;
  scriptsWritten: number;
  voiceoversGenerated: number;
  projectsStarted: number;
}

interface Achievement {
  id: string;
  title: string;
  icon: React.ReactNode;
  unlocked: boolean;
}

export function TodayStatsPanel() {
  const [stats, setStats] = useState<TodayStats>({
    totalCost: 0,
    videosCreated: 0,
    imagesGenerated: 0,
    scriptsWritten: 0,
    voiceoversGenerated: 0,
    projectsStarted: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTodayStats();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('today-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cost_transactions' }, fetchTodayStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_outputs' }, fetchTodayStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'generated_images' }, fetchTodayStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scripts' }, fetchTodayStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchTodayStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTodayStats = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      // Parallel fetch all stats
      const [costsRes, videosRes, imagesRes, scriptsRes, projectsRes] = await Promise.all([
        supabase
          .from('cost_transactions')
          .select('cost_usd')
          .gte('created_at', todayISO),
        supabase
          .from('video_outputs')
          .select('id')
          .gte('created_at', todayISO)
          .eq('status', 'completed'),
        supabase
          .from('generated_images')
          .select('id')
          .gte('created_at', todayISO)
          .eq('status', 'completed'),
        supabase
          .from('scripts')
          .select('id')
          .gte('created_at', todayISO),
        supabase
          .from('projects')
          .select('id')
          .gte('created_at', todayISO),
      ]);

      const totalCost = costsRes.data?.reduce((sum, c) => sum + (c.cost_usd || 0), 0) || 0;

      setStats({
        totalCost,
        videosCreated: videosRes.data?.length || 0,
        imagesGenerated: imagesRes.data?.length || 0,
        scriptsWritten: scriptsRes.data?.length || 0,
        voiceoversGenerated: 0, // Would need audio_tracks table
        projectsStarted: projectsRes.data?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching today stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const achievements: Achievement[] = [
    {
      id: 'first_video',
      title: 'First Video',
      icon: <Video className="w-4 h-4" />,
      unlocked: stats.videosCreated >= 1,
    },
    {
      id: 'five_videos',
      title: '5 Videos Today',
      icon: <Zap className="w-4 h-4" />,
      unlocked: stats.videosCreated >= 5,
    },
    {
      id: 'ten_images',
      title: '10 Images',
      icon: <Image className="w-4 h-4" />,
      unlocked: stats.imagesGenerated >= 10,
    },
    {
      id: 'power_user',
      title: 'Power User',
      icon: <Trophy className="w-4 h-4" />,
      unlocked: stats.videosCreated >= 3 && stats.imagesGenerated >= 5,
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCreations = stats.videosCreated + stats.imagesGenerated + stats.scriptsWritten;

  const formatCost = (cost: number): string => {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(2)}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Today's Cost */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Today's Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">{formatCost(stats.totalCost)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Across all operations
          </p>
        </CardContent>
      </Card>

      {/* Today's Creations */}
      <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Today's Creations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">{totalCreations}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {stats.videosCreated > 0 && (
              <Badge variant="outline" className="text-xs border-green-500/30 bg-green-500/10 text-green-600">
                <Video className="w-3 h-3 mr-1" />
                {stats.videosCreated} videos
              </Badge>
            )}
            {stats.imagesGenerated > 0 && (
              <Badge variant="outline" className="text-xs border-blue-500/30 bg-blue-500/10 text-blue-600">
                <Image className="w-3 h-3 mr-1" />
                {stats.imagesGenerated} images
              </Badge>
            )}
            {stats.scriptsWritten > 0 && (
              <Badge variant="outline" className="text-xs border-purple-500/30 bg-purple-500/10 text-purple-600">
                <FileText className="w-3 h-3 mr-1" />
                {stats.scriptsWritten} scripts
              </Badge>
            )}
            {totalCreations === 0 && (
              <span className="text-xs text-muted-foreground">No creations yet today</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 border-yellow-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Today's Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">{unlockedCount}/{achievements.length}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {achievements.map(achievement => (
              <Badge 
                key={achievement.id}
                variant="outline" 
                className={cn(
                  "text-xs transition-all",
                  achievement.unlocked 
                    ? "border-yellow-500/50 bg-yellow-500/20 text-yellow-600" 
                    : "border-muted bg-muted/30 text-muted-foreground opacity-50"
                )}
              >
                {achievement.icon}
                <span className="ml-1">{achievement.title}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}