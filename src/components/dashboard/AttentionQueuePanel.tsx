/**
 * Attention Queue Panel - Projects requiring action
 * Shows blocking issues like missing audience, failed executions
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Users,
  FileX,
  Lock,
  ImageOff,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Database only
import { getUser } from '@/utils/auth';
import { useNavigate } from 'react-router-dom';

interface AttentionItem {
  id: string;
  projectId: string;
  projectName: string;
  reason: string;
  impact: string;
  type: 'missing_audience' | 'plan_not_generated' | 'plan_not_locked' | 'execution_failed' | 'missing_assets';
  actionUrl: string;
}

export function AttentionQueuePanel() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAttentionItems();
  }, []);

  const fetchAttentionItems = async () => {
    try {
      const attentionItems: AttentionItem[] = [];

      // VPS-ONLY: Use centralized auth
      const user = getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('default_language, default_country')
        .eq('user_id', user.id)
        .single();

      // 2. Check for projects without Drive folder (if they have outputs)
      const { data: projectsWithOutputs } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          google_drive_folder_id,
          audience,
          language
        `)
        .is('google_drive_folder_id', null)
        .order('created_at', { ascending: false })
        .limit(5);

      projectsWithOutputs?.forEach(project => {
        if (!project.audience || project.audience === 'both') {
          attentionItems.push({
            id: `audience-${project.id}`,
            projectId: project.id,
            projectName: project.name,
            reason: 'Missing Default Audience',
            impact: 'AI generation will use generic targeting',
            type: 'missing_audience',
            actionUrl: '/settings',
          });
        }
      });

      // 3. Check for failed pipeline jobs in recent projects
      const { data: failedJobs } = await supabase
        .from('pipeline_jobs')
        .select(`
          id,
          project_id,
          stage_name,
          error_message,
          projects!pipeline_jobs_project_id_fkey (name)
        `)
        .eq('status', 'failed')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      failedJobs?.forEach(job => {
        if (!attentionItems.some(i => i.projectId === job.project_id && i.type === 'execution_failed')) {
          attentionItems.push({
            id: `failed-${job.id}`,
            projectId: job.project_id || '',
            projectName: (job.projects as any)?.name || 'Unknown',
            reason: 'Execution Failed',
            impact: job.error_message || 'Pipeline stage failed to complete',
            type: 'execution_failed',
            actionUrl: `/projects?highlight=${job.project_id}`,
          });
        }
      });

      // 4. Check for projects with pending video variations that are stuck
      const { data: stuckVariations } = await supabase
        .from('video_variations')
        .select(`
          id,
          project_id,
          status,
          created_at,
          projects!video_variations_project_id_fkey (name)
        `)
        .eq('status', 'pending')
        .lt('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Stuck for 2+ hours
        .order('created_at', { ascending: false })
        .limit(5);

      stuckVariations?.forEach(v => {
        if (!attentionItems.some(i => i.projectId === v.project_id)) {
          attentionItems.push({
            id: `stuck-${v.id}`,
            projectId: v.project_id || '',
            projectName: (v.projects as any)?.name || 'Unknown',
            reason: 'Stuck Processing',
            impact: 'Video variation has been pending for over 2 hours',
            type: 'execution_failed',
            actionUrl: `/projects?highlight=${v.project_id}`,
          });
        }
      });

      // Check global settings for missing default audience
      if (!settings?.default_language || settings.default_language === 'en' && !settings.default_country) {
        attentionItems.unshift({
          id: 'global-audience',
          projectId: '',
          projectName: 'Global Settings',
          reason: 'Default Audience Not Set',
          impact: 'AI generation blocked for Creative Replicator',
          type: 'missing_audience',
          actionUrl: '/settings',
        });
      }

      setItems(attentionItems);
    } catch (error) {
      console.error('Error fetching attention items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (type: AttentionItem['type']) => {
    switch (type) {
      case 'missing_audience': return Users;
      case 'plan_not_generated': return FileX;
      case 'plan_not_locked': return Lock;
      case 'execution_failed': return AlertTriangle;
      case 'missing_assets': return ImageOff;
      default: return AlertTriangle;
    }
  };

  const getSeverity = (type: AttentionItem['type']): 'high' | 'medium' | 'low' => {
    switch (type) {
      case 'execution_failed': return 'high';
      case 'missing_audience': return 'medium';
      case 'plan_not_locked': return 'medium';
      default: return 'low';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Requires Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted/50 rounded-lg" />
            <div className="h-16 bg-muted/50 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            All Clear
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500/50" />
            <p className="text-sm">No blocking issues detected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          Requires Attention
          <Badge variant="outline" className="ml-2 border-yellow-500/30 text-yellow-600 bg-yellow-500/10">
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map(item => {
          const Icon = getIcon(item.type);
          const severity = getSeverity(item.type);

          return (
            <div
              key={item.id}
              className={`p-3 rounded-lg border ${severity === 'high'
                  ? 'bg-destructive/5 border-destructive/30'
                  : 'bg-yellow-500/5 border-yellow-500/30'
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Icon className={`w-4 h-4 mt-0.5 ${severity === 'high' ? 'text-destructive' : 'text-yellow-600'
                    }`} />
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      {item.projectName}
                    </p>
                    <p className={`text-xs font-medium ${severity === 'high' ? 'text-destructive' : 'text-yellow-600'
                      }`}>
                      {item.reason}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.impact}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(item.actionUrl)}
                  className="shrink-0 h-8"
                >
                  Fix Now
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
