import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Link2, FileText, ArrowRight, Loader2, Sheet, Database, Image as ImageIcon, Webhook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StudioProductInputProps {
  onNext: () => void;
  onProjectCreated?: (projectId: string) => void;
  productInfo?: { name: string; description: string; imageUrl: string; link: string };
  onProductInfoChange?: (info: { name: string; description: string; imageUrl: string; link: string }) => void;
}

export const StudioProductInput = ({ 
  onNext, 
  onProjectCreated,
  productInfo: externalProductInfo,
  onProductInfoChange 
}: StudioProductInputProps) => {
  const [dataSource, setDataSource] = useState<'manual' | 'sheet'>('manual');
  const [productUrl, setProductUrl] = useState('');
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [mediaLinks, setMediaLinks] = useState('');
  const [targetMarket, setTargetMarket] = useState('sa');
  const [language, setLanguage] = useState('ar-sa');
  const [audienceAge, setAudienceAge] = useState('25-34');
  const [audienceGender, setAudienceGender] = useState('both');
  
  // Google Sheet state
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetRow, setSheetRow] = useState('2');
  const [sheetConnected, setSheetConnected] = useState(false);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  
  // Webhook settings from Backend Mode
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [useN8nBackend, setUseN8nBackend] = useState(false);
  const [webhookResponse, setWebhookResponse] = useState<any>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Sync with external productInfo if provided
  useEffect(() => {
    if (externalProductInfo) {
      setProductName(externalProductInfo.name || '');
      setDescription(externalProductInfo.description || '');
      setProductUrl(externalProductInfo.link || '');
      setMediaLinks(externalProductInfo.imageUrl || '');
    }
  }, [externalProductInfo]);

  useEffect(() => {
    loadSavedData();
  }, []);

  // Use ref to track previous values and prevent infinite loops
  const prevProductInfoRef = useRef<string>('');
  
  // Notify parent of changes - using useCallback and ref comparison to prevent infinite loops
  useEffect(() => {
    if (onProductInfoChange) {
      const newInfo = {
        name: productName,
        description: description,
        imageUrl: mediaLinks.split('\n')[0] || '',
        link: productUrl,
      };
      const newInfoString = JSON.stringify(newInfo);
      
      // Only call if values actually changed
      if (prevProductInfoRef.current !== newInfoString) {
        prevProductInfoRef.current = newInfoString;
        onProductInfoChange(newInfo);
      }
    }
  }, [productName, description, mediaLinks, productUrl, onProductInfoChange]);

  const loadSavedData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: settings } = await supabase
        .from('user_settings')
        .select('preferences, use_n8n_backend')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings) {
        // Load Backend Mode setting from column
        setUseN8nBackend(settings.use_n8n_backend || false);
        
        const prefs = settings.preferences as Record<string, any>;
        if (prefs) {
          // Only set if not already provided externally
          if (!externalProductInfo) {
            setProductUrl(prefs.studio_product_url || '');
            setProductName(prefs.studio_product_name || '');
            setDescription(prefs.studio_description || '');
            setMediaLinks(prefs.studio_media_links || '');
          }
          setTargetMarket(prefs.studio_target_market || 'sa');
          setLanguage(prefs.studio_language || 'ar-sa');
          setAudienceAge(prefs.studio_audience_age || '25-34');
          setAudienceGender(prefs.studio_audience_gender || 'both');
          setSheetUrl(prefs.google_sheet_url || '');
          if (prefs.google_sheet_url) setSheetConnected(true);
          
          // Load webhook URL from per-stage webhooks
          const stageWebhooks = prefs.stage_webhooks || {};
          const productInputWebhook = stageWebhooks.product_input;
          if (productInputWebhook?.webhook_url) {
            setN8nWebhookUrl(productInputWebhook.webhook_url);
          }
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromSheet = async () => {
    if (!sheetUrl || !sheetRow) {
      toast({
        title: "Sheet Info Required",
        description: "Please enter a Google Sheet URL and row number",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingSheet(true);
    try {
      // In production, this would call a backend API to fetch Google Sheet data
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const simulatedSheetData = {
        productName: `Product from Row ${sheetRow}`,
        productUrl: `https://example.com/product-${sheetRow}`,
        productDescription: `This is the description for product in row ${sheetRow}. Contains details about features and benefits.`,
        mediaLinks: `https://example.com/image1.jpg\nhttps://example.com/image2.jpg`,
      };

      setProductName(simulatedSheetData.productName);
      setProductUrl(simulatedSheetData.productUrl);
      setDescription(simulatedSheetData.productDescription);
      setMediaLinks(simulatedSheetData.mediaLinks);
      
      toast({
        title: "Sheet Data Loaded",
        description: `Product data loaded from row ${sheetRow}. All fields have been populated.`,
      });
      setSheetConnected(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load from Google Sheet",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const handleSubmit = async () => {
    if (!productName && !productUrl && !description) {
      toast({
        title: "Input Required",
        description: "Please provide product name, URL, or description",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save to user_settings
      const { data: currentSettings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentPrefs = (currentSettings?.preferences as Record<string, unknown>) || {};

      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          preferences: {
            ...currentPrefs,
            studio_product_url: productUrl,
            studio_product_name: productName,
            studio_description: description,
            studio_media_links: mediaLinks,
            studio_target_market: targetMarket,
            studio_language: language,
            studio_audience_age: audienceAge,
            studio_audience_gender: audienceGender,
          }
        }, { onConflict: 'user_id' });

      let projectId: string | undefined;

      // Create project if product name is provided
      if (productName.trim()) {
        const { data: existingProject } = await supabase
          .from('projects')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_name', productName)
          .maybeSingle();

        projectId = existingProject?.id;

        if (!projectId) {
          const { data: newProject, error: projectError } = await supabase
            .from('projects')
            .insert({
              user_id: user.id,
              name: productName,
              product_name: productName,
              language: language.split('-')[0],
              market: targetMarket,
              audience: audienceGender,
              status: 'draft',
              settings: {
                product_description: description,
                product_image_url: mediaLinks.split('\n')[0] || '',
                product_link: productUrl,
                audience_age: audienceAge,
              }
            })
            .select()
            .single();

          if (projectError) throw projectError;
          projectId = newProject.id;
        } else {
          // Update existing project
          await supabase
            .from('projects')
            .update({
              name: productName,
              product_name: productName,
              language: language.split('-')[0],
              market: targetMarket,
              audience: audienceGender,
              settings: {
                product_description: description,
                product_image_url: mediaLinks.split('\n')[0] || '',
                product_link: productUrl,
                audience_age: audienceAge,
              }
            })
            .eq('id', projectId);
        }

        // Notify parent of project creation
        if (onProjectCreated && projectId) {
          onProjectCreated(projectId);
        }
      }

      // Call webhook if n8n Backend Mode is enabled
      if (useN8nBackend && n8nWebhookUrl) {
        try {
          console.log('Calling Product Input webhook:', n8nWebhookUrl);
          const fetchResponse = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'product_input',
              productName,
              productDescription: description,
              productUrl,
              mediaLinks: mediaLinks.split('\n').filter(Boolean),
              targetMarket,
              language,
              audienceAge,
              audienceGender,
              projectId,
              userId: user.id,
              timestamp: new Date().toISOString(),
            }),
          });

          if (fetchResponse.ok) {
            const webhookData = await fetchResponse.json();
            console.log('Webhook response:', webhookData);
            setWebhookResponse(webhookData);
            toast({
              title: "Webhook Triggered",
              description: "Product data sent to n8n workflow",
            });
          } else {
            console.error('Webhook error:', fetchResponse.status);
            setWebhookResponse({ error: `HTTP ${fetchResponse.status}` });
          }
        } catch (webhookError) {
          console.error('Webhook call failed:', webhookError);
          // Don't block the flow if webhook fails
        }
      }

      toast({
        title: "Product Saved",
        description: "Your product details have been saved. Proceeding to next step.",
      });

      onNext();
    } catch (error: any) {
      console.error('Error saving:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save product details",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Audience Targeting Header */}
      <Card className="p-4 bg-card border-border">
        <h3 className="font-semibold mb-3 text-foreground">Audience Targeting</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Target Market</Label>
            <Select value={targetMarket} onValueChange={setTargetMarket}>
              <SelectTrigger className="bg-background border-border h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sa">🇸🇦 Saudi...</SelectItem>
                <SelectItem value="ae">🇦🇪 UAE</SelectItem>
                <SelectItem value="kw">🇰🇼 Kuwait</SelectItem>
                <SelectItem value="ma">🇲🇦 Morocco</SelectItem>
                <SelectItem value="us">🇺🇸 USA</SelectItem>
                <SelectItem value="eu">🇪🇺 Europe</SelectItem>
                <SelectItem value="latam">🌎 LatAm</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="bg-background border-border h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar-sa">Arabic...</SelectItem>
                <SelectItem value="ar-msa">Arabic (MSA)</SelectItem>
                <SelectItem value="ar-gulf">Arabic (Gulf)</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Audience Age</Label>
            <Select value={audienceAge} onValueChange={setAudienceAge}>
              <SelectTrigger className="bg-background border-border h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="18-24">18-24</SelectItem>
                <SelectItem value="25-34">25-34</SelectItem>
                <SelectItem value="35-44">35-44</SelectItem>
                <SelectItem value="45-54">45-54</SelectItem>
                <SelectItem value="55+">55+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Audience Gender</Label>
            <Select value={audienceGender} onValueChange={setAudienceGender}>
              <SelectTrigger className="bg-background border-border h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="both">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Data Source Selection */}
      <Card className="p-6 bg-card border-border">
        <Label className="text-sm font-medium mb-4 block">Data Source</Label>
        <RadioGroup value={dataSource} onValueChange={(v) => setDataSource(v as 'manual' | 'sheet')} className="flex gap-4">
          <div className={`flex-1 p-4 rounded-lg border cursor-pointer transition-all ${dataSource === 'manual' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <RadioGroupItem value="manual" />
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                <span className="font-medium">Manual Input</span>
              </div>
            </label>
          </div>
          <div className={`flex-1 p-4 rounded-lg border cursor-pointer transition-all ${dataSource === 'sheet' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <RadioGroupItem value="sheet" />
              <div className="flex items-center gap-2">
                <Sheet className="w-4 h-4 text-green-500" />
                <span className="font-medium">Google Sheet Row</span>
              </div>
            </label>
          </div>
        </RadioGroup>
      </Card>

      {/* Google Sheet Sync */}
      {dataSource === 'sheet' && (
        <Card className="p-6 bg-card border-border">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Sheet className="w-4 h-4 text-green-500" />
            Google Sheet Sync
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your sheet should have columns: <strong>Product Name</strong>, <strong>Product URL</strong>, <strong>Product Description</strong>, <strong>Media Links</strong>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label>Sheet URL</Label>
              <Input
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/xxxxx/edit"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Row Number</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="2"
                  value={sheetRow}
                  onChange={(e) => setSheetRow(e.target.value)}
                  className="bg-background border-border"
                />
                <Button onClick={loadFromSheet} disabled={isLoadingSheet}>
                  {isLoadingSheet ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load'}
                </Button>
              </div>
            </div>
          </div>
          {sheetConnected && (
            <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-500">
              ✓ Sheet connected - Data loaded from row {sheetRow}
            </div>
          )}
        </Card>
      )}

      {/* Manual Input Form */}
      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Product Information
          {dataSource === 'sheet' && sheetConnected && (
            <Badge variant="secondary" className="ml-2">Loaded from Sheet</Badge>
          )}
        </h3>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Product Name *
              </Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter product name"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-muted-foreground" />
                Product URL
              </Label>
              <Input
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://example.com/product"
                className="bg-background border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Product Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product, its features, benefits, and unique selling points..."
              className="bg-background border-border min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              Media Links (Images/Videos)
            </Label>
            <Textarea
              value={mediaLinks}
              onChange={(e) => setMediaLinks(e.target.value)}
              placeholder="Enter image/video URLs, one per line..."
              className="bg-background border-border min-h-[60px]"
            />
            <p className="text-xs text-muted-foreground">Enter URLs for product images and videos, one per line</p>
          </div>
        </div>
      </Card>

      {/* Webhook indicator */}
      {useN8nBackend && n8nWebhookUrl && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
          <Webhook className="w-3 h-3 text-green-500" />
          <span>Webhook enabled: {n8nWebhookUrl.substring(0, 50)}...</span>
        </div>
      )}

      {/* Webhook Response Preview */}
      {webhookResponse && (
        <Card className="p-4 bg-card/50 border-border">
          <div className="flex items-center gap-2 mb-3">
            <Webhook className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-sm text-foreground">Webhook Response</h4>
          </div>
          <pre className="text-xs bg-background p-3 rounded-md overflow-auto max-h-48 text-muted-foreground">
            {JSON.stringify(webhookResponse, null, 2)}
          </pre>
        </Card>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} className="gap-2" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Save & Continue
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
