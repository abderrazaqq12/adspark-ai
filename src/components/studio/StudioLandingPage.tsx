import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Database,
  CheckCircle2,
  AlertTriangle,
  Webhook
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBackendMode } from '@/hooks/useBackendMode';
import { BackendModeSelector } from '@/components/BackendModeSelector';
import { LandingPageCompiler } from '@/components/studio/LandingPageCompiler';

interface StudioLandingPageProps {
  onNext: () => void;
}

interface AudienceTargeting {
  targetMarket: string;
  language: string;
  audienceAge: string;
  audienceGender: string;
}

interface ProductInfo {
  name: string;
  description: string;
  url: string;
  url2: string;
  mediaLinks?: string[];
}

export const StudioLandingPage = ({ onNext }: StudioLandingPageProps) => {
  const { toast } = useToast();
  const { n8nEnabled: useN8nBackend } = useBackendMode();
  
  const [productInfo, setProductInfo] = useState<ProductInfo>({ name: '', description: '', url: '', url2: '' });
  const [hasMarketingAngles, setHasMarketingAngles] = useState(false);
  const [projectId, setProjectId] = useState<string>('');
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [audienceTargeting, setAudienceTargeting] = useState<AudienceTargeting>({
    targetMarket: 'gcc',
    language: 'ar-sa',
    audienceAge: '25-34',
    audienceGender: 'both',
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('preferences, use_n8n_backend, ai_operator_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings) {
        const prefs = settings.preferences as Record<string, any>;
        if (prefs) {
          // Load product info
          setProductInfo({
            name: prefs.studio_product_name || '',
            description: prefs.studio_description || '',
            url: prefs.studio_product_url || '',
            url2: prefs.studio_product_url_2 || '',
            mediaLinks: prefs.studio_media_links || []
          });

          // Load audience targeting
          setAudienceTargeting({
            targetMarket: prefs.studio_target_market || 'gcc',
            language: prefs.studio_language || 'ar-sa',
            audienceAge: prefs.studio_audience_age || '25-34',
            audienceGender: prefs.studio_audience_gender || 'both',
          });

          // Check Marketing Angles from previous step
          const savedAngles = prefs.studio_marketing_angles;
          if (savedAngles && 
              (savedAngles.problemsSolved?.length > 0 || 
               savedAngles.customerValue?.length > 0 || 
               savedAngles.marketingAngles?.length > 0)) {
            setHasMarketingAngles(true);
          } else {
            setHasMarketingAngles(false);
          }

          // Load webhook URL
          const stageWebhooks = prefs.stage_webhooks || {};
          const globalWebhookUrl = prefs.n8n_global_webhook_url || prefs.global_webhook_url || '';
          
          if (stageWebhooks.landing_page?.webhook_url) {
            setN8nWebhookUrl(stageWebhooks.landing_page.webhook_url);
          } else if (globalWebhookUrl) {
            setN8nWebhookUrl(globalWebhookUrl);
          }
        }
      }

      // Load or create project for pipeline outputs
      await loadOrCreateProject(user.id);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadOrCreateProject = async (userId: string) => {
    try {
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (projects && projects.length > 0) {
        setProjectId(projects[0].id);
      } else {
        const { data: newProject } = await supabase
          .from('projects')
          .insert({
            name: productInfo.name || 'New Landing Page Project',
            user_id: userId,
            status: 'draft'
          })
          .select()
          .single();

        if (newProject) {
          setProjectId(newProject.id);
        }
      }
    } catch (error) {
      console.error('Error loading/creating project:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Landing Page Compiler</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Generate production-ready HTML from Marketing Angles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BackendModeSelector compact />
          <Badge variant="outline" className="text-primary border-primary px-3 py-1">Step 4</Badge>
        </div>
      </div>

      {/* Data Source Status */}
      <Card className="p-4 bg-card/50 border-border">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Pipeline Status</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Product Info Status */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            {productInfo.name ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            )}
            <span className="text-xs">
              Product: {productInfo.name || 'Not set'}
            </span>
          </div>

          {/* Marketing Angles Status */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            {hasMarketingAngles ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            )}
            <span className="text-xs">
              Marketing Angles: {hasMarketingAngles ? 'Ready' : 'Missing (Required)'}
            </span>
          </div>

          {/* Project Status */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            {projectId ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            )}
            <span className="text-xs">
              Project: {projectId ? 'Connected' : 'Creating...'}
            </span>
          </div>
        </div>
      </Card>

      {/* Missing Marketing Angles Warning */}
      {!hasMarketingAngles && (
        <Card className="p-4 bg-destructive/10 border-destructive/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Marketing Angles Required</p>
              <p className="text-sm text-muted-foreground">
                Please generate Marketing Angles in the Product Content step first.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Webhook indicator */}
      {useN8nBackend && n8nWebhookUrl && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
          <Webhook className="w-3 h-3 text-green-500" />
          <span>Webhook enabled: {n8nWebhookUrl.substring(0, 50)}...</span>
        </div>
      )}

      {/* Landing Page Compiler (Unified Stage 2+3) */}
      {projectId && (
        <LandingPageCompiler
          projectId={projectId}
          productInfo={{
            name: productInfo.name,
            description: productInfo.description,
            url: productInfo.url,
            mediaLinks: productInfo.mediaLinks
          }}
          audienceTargeting={audienceTargeting}
          onGenerated={(html) => {
            toast({
              title: "Landing Page Complete",
              description: "HTML website generated and saved.",
            });
          }}
        />
      )}

    </div>
  );
};
