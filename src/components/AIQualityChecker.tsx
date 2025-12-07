import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Eye, CheckCircle, XCircle, AlertTriangle, RefreshCw, 
  Loader2, Sparkles, ThumbsUp, ThumbsDown
} from 'lucide-react';

interface SceneQuality {
  sceneId: string;
  sceneName: string;
  score: number;
  issues: string[];
  passed: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
}

interface AIQualityCheckerProps {
  projectId: string;
  scenes: Array<{
    id: string;
    text: string;
    video_url?: string;
    thumbnail_url?: string;
    ai_quality_score?: number;
  }>;
  onRegenerateScene?: (sceneId: string) => void;
}

export const AIQualityChecker = ({ 
  projectId, 
  scenes,
  onRegenerateScene 
}: AIQualityCheckerProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SceneQuality[]>([]);
  const [checkComplete, setCheckComplete] = useState(false);
  
  const handleCheckQuality = async () => {
    setIsChecking(true);
    setProgress(0);
    setResults([]);
    setCheckComplete(false);
    
    try {
      const scenesToCheck = scenes.filter(s => s.video_url);
      
      if (scenesToCheck.length === 0) {
        toast.error('No videos to check');
        setIsChecking(false);
        return;
      }
      
      const qualityResults: SceneQuality[] = [];
      
      for (let i = 0; i < scenesToCheck.length; i++) {
        const scene = scenesToCheck[i];
        setProgress(((i + 1) / scenesToCheck.length) * 100);
        
        // Call AI quality check endpoint
        const { data, error } = await supabase.functions.invoke('ai-quality-check', {
          body: {
            sceneId: scene.id,
            videoUrl: scene.video_url,
            expectedContent: scene.text
          }
        });
        
        if (error) {
          qualityResults.push({
            sceneId: scene.id,
            sceneName: `Scene ${i + 1}`,
            score: 0,
            issues: ['Failed to analyze'],
            passed: false,
            videoUrl: scene.video_url,
            thumbnailUrl: scene.thumbnail_url
          });
        } else {
          qualityResults.push({
            sceneId: scene.id,
            sceneName: `Scene ${i + 1}`,
            score: data?.score || 7,
            issues: data?.issues || [],
            passed: (data?.score || 7) >= 6,
            videoUrl: scene.video_url,
            thumbnailUrl: scene.thumbnail_url
          });
          
          // Update scene quality score in database
          await supabase
            .from('scenes')
            .update({ 
              ai_quality_score: data?.score || 7,
              needs_regeneration: (data?.score || 7) < 6
            })
            .eq('id', scene.id);
        }
      }
      
      setResults(qualityResults);
      setCheckComplete(true);
      
      const passed = qualityResults.filter(r => r.passed).length;
      const failed = qualityResults.filter(r => !r.passed).length;
      
      if (failed === 0) {
        toast.success(`All ${passed} scenes passed quality check!`);
      } else {
        toast.warning(`${failed} scene(s) need attention`);
      }
      
    } catch (error) {
      console.error('Quality check error:', error);
      toast.error('Failed to complete quality check');
    } finally {
      setIsChecking(false);
    }
  };
  
  const handleRegenerateAll = async () => {
    const failedScenes = results.filter(r => !r.passed);
    for (const scene of failedScenes) {
      onRegenerateScene?.(scene.sceneId);
    }
    toast.success(`Regenerating ${failedScenes.length} scenes`);
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const getScoreBadge = (score: number) => {
    if (score >= 8) return 'default';
    if (score >= 6) return 'secondary';
    return 'destructive';
  };
  
  const averageScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.score, 0) / results.length
    : 0;
  
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            AI Quality Checker
          </CardTitle>
          <Button 
            onClick={handleCheckQuality}
            disabled={isChecking || scenes.length === 0}
            size="sm"
          >
            {isChecking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Checking...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Check Quality
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        {isChecking && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Analyzing scenes with Vision AI...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        {/* Summary */}
        {checkComplete && results.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className={`text-2xl font-bold ${getScoreColor(averageScore)}`}>
                {averageScore.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </div>
            <div className="bg-green-500/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-500">{passedCount}</p>
              <p className="text-xs text-muted-foreground">Passed</p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-500">{failedCount}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>
        )}
        
        {/* Results List */}
        {results.length > 0 && (
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {results.map((result) => (
                <div 
                  key={result.sceneId}
                  className={`p-3 rounded-lg border ${
                    result.passed ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.passed ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium text-sm">{result.sceneName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getScoreBadge(result.score)}>
                        {result.score.toFixed(1)}/10
                      </Badge>
                      {!result.passed && onRegenerateScene && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onRegenerateScene(result.sceneId)}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {result.issues.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {result.issues.map((issue, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {issue}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {/* Actions */}
        {checkComplete && failedCount > 0 && (
          <Button 
            onClick={handleRegenerateAll}
            variant="destructive"
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate {failedCount} Failed Scene{failedCount > 1 ? 's' : ''}
          </Button>
        )}
        
        {/* Empty State */}
        {!isChecking && !checkComplete && (
          <div className="text-center py-6 text-muted-foreground">
            <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Click "Check Quality" to analyze scene videos using Vision AI
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
