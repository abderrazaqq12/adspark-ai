import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Link2, FileText, ArrowRight, Loader2, Sheet, Database, Image as ImageIcon, X, Video, File, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client'; // Database/Storage only
import { getUser } from '@/utils/auth';
import { toast as sonnerToast } from 'sonner';
import { useAudience } from '@/contexts/AudienceContext';
import { CountrySelector } from '@/components/audience/CountrySelector';
import { LANGUAGES } from '@/lib/audience/countries';

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
  // Global audience context
  const { resolved: audience, isLoading: audienceLoading } = useAudience();

  const [dataSource, setDataSource] = useState<'manual' | 'sheet'>('manual');
  const [productUrl, setProductUrl] = useState('');
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [mediaLinks, setMediaLinks] = useState('');
  // Local overrides - initialized from global defaults
  const [targetCountry, setTargetCountry] = useState('');
  const [language, setLanguage] = useState('');
  const [audienceAge, setAudienceAge] = useState('25-34');
  const [audienceGender, setAudienceGender] = useState('both');

  // Sync local state with global audience when loaded
  useEffect(() => {
    if (!audienceLoading && audience) {
      if (!targetCountry) setTargetCountry(audience.country);
      if (!language) setLanguage(audience.language);
    }
  }, [audience, audienceLoading]);

  // Google Sheet state
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetRow, setSheetRow] = useState('2');
  const [sheetConnected, setSheetConnected] = useState(false);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);

  // AI Operator mode
  const [aiOperatorEnabled, setAiOperatorEnabled] = useState(false);

  // Media file uploads
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string; type: 'image' | 'video' }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // VPS-First: Use backend API instead of Supabase directly
      const response = await fetch('/api/settings');
      if (!response.ok) {
        console.warn('[Studio] Could not load settings');
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      if (data.ok && data.settings) {
        setAiOperatorEnabled(data.settings.ai_operator_enabled || false);

        const prefs = data.settings.preferences as Record<string, any> || {};
        // Only set if not already provided externally
        if (!externalProductInfo) {
          setProductUrl(prefs.studio_product_url || '');
          setProductName(prefs.studio_product_name || '');
          setDescription(prefs.studio_description || '');
          setMediaLinks(prefs.studio_media_links || '');
        }
        setTargetCountry(prefs.studio_target_country || prefs.studio_target_market || '');
        setLanguage(prefs.studio_language || '');
        setAudienceAge(prefs.studio_audience_age || '25-34');
        setAudienceGender(prefs.studio_audience_gender || 'both');
        setSheetUrl(prefs.google_sheet_url || '');
        if (prefs.google_sheet_url) setSheetConnected(true);
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
      // VPS-First: Save settings via backend API
      const settingsResponse = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: {
            studio_product_url: productUrl,
            studio_product_name: productName,
            studio_description: description,
            studio_media_links: mediaLinks,
            studio_target_country: targetCountry || audience.country,
            studio_language: language,
            studio_audience_age: audienceAge,
            studio_audience_gender: audienceGender,
          }
        })
      });

      if (!settingsResponse.ok) {
        const errData = await settingsResponse.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save settings');
      }

      let projectId: string | undefined;

      // Create project if product name is provided
      if (productName.trim()) {
        // VPS-First: Create/update project via backend API
        const projectResponse = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: productName,
            product_name: productName,
            language: (language || audience.language).split('-')[0],
            market: targetCountry || audience.country,
            audience: audienceGender,
            status: 'draft',
            settings: {
              product_description: description,
              product_image_url: mediaLinks.split('\n')[0] || '',
              product_link: productUrl,
              audience_age: audienceAge,
            }
          })
        });

        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          projectId = projectData.id;
        }

        // Notify parent of project creation
        if (onProjectCreated && projectId) {
          onProjectCreated(projectId);
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
      {/* Audience Targeting Header - Uses Global Defaults */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Audience Targeting</h3>
          <Badge variant="outline" className="text-xs">From Default Settings</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Using your default audience settings. Override below if needed for this session.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Target Country</Label>
            <CountrySelector
              value={targetCountry || audience.country}
              onChange={setTargetCountry}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Language</Label>
            <Select value={language || audience.language} onValueChange={setLanguage}>
              <SelectTrigger className="bg-background border-border h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                ))}
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

          {/* Media Files Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-muted-foreground" />
              Media Files (Upload)
            </Label>
            <div
              className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer bg-background/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;

                  setIsUploading(true);
                  try {
                    // VPS-ONLY: Use centralized auth
                    const user = getUser();
                    if (!user) {
                      sonnerToast.error('Please sign in to upload files');
                      return;
                    }

                    const newFiles: { name: string; url: string; type: 'image' | 'video' }[] = [];

                    for (const file of Array.from(files)) {
                      const fileExt = file.name.split('.').pop();
                      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                      const isVideo = file.type.startsWith('video/');
                      const bucket = isVideo ? 'videos' : 'custom-scenes';

                      const { data, error } = await supabase.storage
                        .from(bucket)
                        .upload(fileName, file);

                      if (error) {
                        console.error('Upload error:', error);
                        sonnerToast.error(`Failed to upload ${file.name}`);
                        continue;
                      }

                      const { data: { publicUrl } } = supabase.storage
                        .from(bucket)
                        .getPublicUrl(data.path);

                      newFiles.push({
                        name: file.name,
                        url: publicUrl,
                        type: isVideo ? 'video' : 'image'
                      });
                    }

                    setUploadedFiles(prev => [...prev, ...newFiles]);

                    // Add uploaded URLs to mediaLinks
                    const newUrls = newFiles.map(f => f.url).join('\n');
                    setMediaLinks(prev => prev ? `${prev}\n${newUrls}` : newUrls);

                    sonnerToast.success(`${newFiles.length} file(s) uploaded`);
                  } catch (error) {
                    console.error('Upload error:', error);
                    sonnerToast.error('Failed to upload files');
                  } finally {
                    setIsUploading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }
                }}
              />

              {isUploading ? (
                <div className="flex flex-col items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4">
                  <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload images or videos</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports: JPG, PNG, GIF, MP4, MOV, WebM</p>
                </div>
              )}
            </div>

            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="relative group rounded-lg overflow-hidden border border-border bg-muted/30">
                    {file.type === 'image' ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-20 object-cover"
                      />
                    ) : (
                      <div className="w-full h-20 flex items-center justify-center bg-muted">
                        <Video className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white hover:text-destructive hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFiles(prev => prev.filter((_, i) => i !== index));
                          // Remove URL from mediaLinks
                          setMediaLinks(prev => prev.split('\n').filter(url => url !== file.url).join('\n'));
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-0.5">
                      <p className="text-[10px] text-white truncate">{file.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

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
