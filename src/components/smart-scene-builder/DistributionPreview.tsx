// Distribution Preview - Shows estimated duration and scene distribution before generation

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  Film,
  Layers,
  BarChart3,
  Repeat,
  Shuffle,
} from 'lucide-react';
import { VideoConfig } from '@/lib/smart-scene-builder/types';

interface DistributionPreviewProps {
  config: VideoConfig;
  productName?: string;
  scriptsCount?: number;
}

export function DistributionPreview({ config, productName, scriptsCount }: DistributionPreviewProps) {
  const videoCount = config.videoCount || 3;
  const minDuration = config.minVideoDuration || 20;
  const maxDuration = config.maxVideoDuration || 35;
  const targetDuration = (minDuration + maxDuration) / 2;
  
  // Estimate scene count based on duration (avg 4-6 seconds per scene)
  const avgSceneDuration = 5;
  const estimatedScenesPerVideo = Math.round(targetDuration / avgSceneDuration);
  
  // Estimate reusable vs unique scenes
  // Typically: hook, product showcase, CTA are reusable (3 scenes)
  // Body scenes vary per video
  const estimatedReusableScenes = Math.min(3, estimatedScenesPerVideo);
  const estimatedUniqueScenes = estimatedScenesPerVideo - estimatedReusableScenes;
  
  // Total scenes needed
  const totalUniqueScenes = estimatedUniqueScenes * videoCount;
  const totalScenesGenerated = estimatedReusableScenes + totalUniqueScenes;
  
  // Cost efficiency calculation
  const reusabilityPercent = Math.round((estimatedReusableScenes / estimatedScenesPerVideo) * 100);
  
  // Total video duration
  const totalVideoDuration = targetDuration * videoCount;
  
  // Scene distribution for visualization
  const sceneDistribution = Array.from({ length: videoCount }, (_, i) => ({
    videoNumber: i + 1,
    reusable: estimatedReusableScenes,
    unique: estimatedUniqueScenes,
    totalDuration: targetDuration,
  }));

  return (
    <Card className="p-4 bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-blue-500" />
        <h4 className="font-semibold text-sm">Estimated Output Preview</h4>
        <Badge variant="secondary" className="text-xs">Before Generation</Badge>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-background/50 rounded-lg p-2.5 border border-border/50">
          <div className="flex items-center gap-1.5 mb-1">
            <Film className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">Videos</span>
          </div>
          <p className="text-lg font-bold">{videoCount}</p>
        </div>
        
        <div className="bg-background/50 rounded-lg p-2.5 border border-border/50">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs text-muted-foreground">Per Video</span>
          </div>
          <p className="text-lg font-bold">{minDuration}-{maxDuration}s</p>
        </div>
        
        <div className="bg-background/50 rounded-lg p-2.5 border border-border/50">
          <div className="flex items-center gap-1.5 mb-1">
            <Layers className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs text-muted-foreground">Total Scenes</span>
          </div>
          <p className="text-lg font-bold">{totalScenesGenerated}</p>
        </div>
        
        <div className="bg-background/50 rounded-lg p-2.5 border border-border/50">
          <div className="flex items-center gap-1.5 mb-1">
            <Repeat className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs text-muted-foreground">Reusability</span>
          </div>
          <p className="text-lg font-bold">{reusabilityPercent}%</p>
        </div>
      </div>
      
      {/* Scene Distribution Visualization */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Scene Distribution Across Videos</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Reusable</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Unique</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-1.5">
          {sceneDistribution.map((video) => (
            <div key={video.videoNumber} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16 flex-shrink-0">
                Video {video.videoNumber}
              </span>
              <div className="flex-1 flex h-6 rounded overflow-hidden bg-background/50 border border-border/50">
                {/* Reusable scenes */}
                <div 
                  className="bg-primary/60 flex items-center justify-center"
                  style={{ width: `${(video.reusable / estimatedScenesPerVideo) * 100}%` }}
                >
                  <span className="text-[10px] text-primary-foreground font-medium">
                    {video.reusable}
                  </span>
                </div>
                {/* Unique scenes */}
                <div 
                  className="bg-blue-500/60 flex items-center justify-center"
                  style={{ width: `${(video.unique / estimatedScenesPerVideo) * 100}%` }}
                >
                  <span className="text-[10px] text-white font-medium">
                    {video.unique}
                  </span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground w-12 text-right flex-shrink-0">
                ~{video.totalDuration}s
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Efficiency Insights */}
      <div className="bg-background/50 rounded-lg p-3 border border-border/50">
        <div className="flex items-start gap-2">
          <Shuffle className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">{estimatedReusableScenes} reusable scenes</span> (hook, showcase, CTA) will be generated once and shared across all {videoCount} videos.
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">{totalUniqueScenes} unique scenes</span> will be generated for video-specific content.
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
              Estimated savings: {(videoCount - 1) * estimatedReusableScenes} fewer scenes to generate vs. creating each video independently.
            </p>
          </div>
        </div>
      </div>
      
      {/* Total Output */}
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Total Output Duration</span>
        <span className="font-bold text-foreground">
          {Math.floor(totalVideoDuration / 60)}m {totalVideoDuration % 60}s across {videoCount} videos
        </span>
      </div>
    </Card>
  );
}
