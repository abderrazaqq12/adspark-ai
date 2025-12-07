import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, Upload, Play, Pause, RotateCcw, Download,
  Package, Video, CheckCircle, XCircle, Clock, Loader2,
  Settings, Users, Globe, Zap, FileSpreadsheet, TrendingUp,
  Layers, BarChart3, ArrowRight, Sparkles
} from 'lucide-react';
import { 
  LANGUAGE_NAMES, MARKET_NAMES, AUDIENCE_NAMES,
  type Language, type Market, type Audience 
} from '@/lib/localization';

interface BatchProduct {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videosGenerated: number;
  totalVideos: number;
}

interface BatchJob {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  totalProducts: number;
  completedProducts: number;
  totalVideos: number;
  completedVideos: number;
  createdAt: string;
}

const AgencyMode = () => {
  const [activeTab, setActiveTab] = useState('import');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Batch settings
  const [batchName, setBatchName] = useState('');
  const [language, setLanguage] = useState<Language>('ar');
  const [market, setMarket] = useState<Market>('sa');
  const [audience, setAudience] = useState<Audience>('both');
  const [videosPerProduct, setVideosPerProduct] = useState(10);
  
  // Products
  const [products, setProducts] = useState<BatchProduct[]>([]);
  const [csvData, setCsvData] = useState('');
  
  // Jobs
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  
  useEffect(() => {
    loadBatchJobs();
  }, []);
  
  const loadBatchJobs = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) return;
      
      const { data, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setBatchJobs((data || []).map(job => ({
        id: job.id,
        name: job.job_name,
        status: job.status as BatchJob['status'],
        totalProducts: job.total_products || 0,
        completedProducts: Math.floor((job.completed_videos || 0) / (job.total_videos || 1) * (job.total_products || 0)),
        totalVideos: job.total_videos || 0,
        completedVideos: job.completed_videos || 0,
        createdAt: job.created_at || ''
      })));
    } catch (error) {
      console.error('Error loading batch jobs:', error);
    }
  };
  
  const handleCsvImport = () => {
    if (!csvData.trim()) {
      toast.error('Please paste CSV data');
      return;
    }
    
    const lines = csvData.trim().split('\n');
    const importedProducts: BatchProduct[] = lines.slice(1).map((line, index) => {
      const [title, description, imageUrl] = line.split(',').map(s => s.trim());
      return {
        id: `import-${index}`,
        title: title || `Product ${index + 1}`,
        description: description || '',
        imageUrl: imageUrl || '',
        status: 'pending',
        videosGenerated: 0,
        totalVideos: videosPerProduct
      };
    });
    
    setProducts(importedProducts);
    toast.success(`Imported ${importedProducts.length} products`);
  };
  
  const handleStartBatch = async () => {
    if (products.length === 0) {
      toast.error('Please import products first');
      return;
    }
    
    if (!batchName) {
      toast.error('Please enter a batch name');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        toast.error('Please sign in');
        return;
      }
      
      const { data: job, error } = await supabase
        .from('batch_jobs')
        .insert([{
          user_id: session.session.user.id,
          job_name: batchName,
          total_products: products.length,
          total_videos: products.length * videosPerProduct,
          status: 'processing',
          settings: {
            language,
            market,
            audience,
            videosPerProduct
          },
          products_data: products as any
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('Batch job started');
      setActiveTab('monitor');
      loadBatchJobs();
      
      // Simulate progress
      for (let i = 0; i < products.length; i++) {
        await new Promise(r => setTimeout(r, 2000));
        setProducts(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'processing' } : p
        ));
        
        await new Promise(r => setTimeout(r, 3000));
        setProducts(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'completed', videosGenerated: videosPerProduct } : p
        ));
      }
      
    } catch (error) {
      console.error('Batch start error:', error);
      toast.error('Failed to start batch');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handlePauseBatch = async (jobId: string) => {
    try {
      await supabase
        .from('batch_jobs')
        .update({ status: 'paused' })
        .eq('id', jobId);
      
      toast.success('Batch paused');
      loadBatchJobs();
    } catch (error) {
      toast.error('Failed to pause batch');
    }
  };
  
  const handleResumeBatch = async (jobId: string) => {
    try {
      await supabase
        .from('batch_jobs')
        .update({ status: 'processing' })
        .eq('id', jobId);
      
      toast.success('Batch resumed');
      loadBatchJobs();
    } catch (error) {
      toast.error('Failed to resume batch');
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-500';
      case 'failed': return 'bg-red-500/20 text-red-500';
      case 'processing': return 'bg-blue-500/20 text-blue-500';
      case 'paused': return 'bg-yellow-500/20 text-yellow-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };
  
  const completedProducts = products.filter(p => p.status === 'completed').length;
  const totalProgress = products.length > 0 
    ? (completedProducts / products.length) * 100 
    : 0;
  
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto p-6 lg:p-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
                <Building2 className="h-5 w-5" />
                <span className="font-medium">Agency Mode</span>
              </div>
              <h1 className="text-4xl font-bold text-foreground">
                Bulk Video Generation
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Generate 100+ products → 1000+ video ads at scale
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Card className="p-4 bg-card/50 backdrop-blur-sm border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{products.length}</p>
                    <p className="text-xs text-muted-foreground">Products</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-card/50 backdrop-blur-sm border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Video className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{products.length * videosPerProduct}</p>
                    <p className="text-xs text-muted-foreground">Total Videos</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50 p-1 h-auto">
              <TabsTrigger value="import" className="gap-2 py-3 px-4">
                <Upload className="h-4 w-4" />
                Import Products
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2 py-3 px-4">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="monitor" className="gap-2 py-3 px-4">
                <BarChart3 className="h-4 w-4" />
                Monitor
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="import" className="mt-6 space-y-6">
              <Card className="bg-card/50 backdrop-blur-sm border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    Import Products
                  </CardTitle>
                  <CardDescription>
                    Paste CSV data or import from Google Sheets to bulk add products
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-foreground">Batch Name</Label>
                    <Input 
                      placeholder="e.g., Black Friday Campaign 2024"
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      className="bg-background border-border h-12"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-foreground">CSV Data (title, description, image_url)</Label>
                    <Textarea 
                      placeholder={`title,description,image_url
Smart Watch Pro,Premium smartwatch with health tracking,https://example.com/img1.jpg
Wireless Earbuds,High-quality audio earbuds,https://example.com/img2.jpg`}
                      rows={10}
                      value={csvData}
                      onChange={(e) => setCsvData(e.target.value)}
                      className="bg-background border-border font-mono text-sm"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button onClick={handleCsvImport} variant="outline" size="lg">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Parse CSV
                    </Button>
                    <Button variant="outline" size="lg">
                      <Upload className="h-4 w-4 mr-2" />
                      Import from Google Sheets
                    </Button>
                  </div>
                  
                  {products.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-foreground">Imported Products ({products.length})</h3>
                        <Badge variant="outline" className="gap-1">
                          <Video className="h-3 w-3" />
                          {products.length * videosPerProduct} videos
                        </Badge>
                      </div>
                      <ScrollArea className="h-64 border border-border rounded-xl">
                        <div className="p-4 space-y-2">
                          {products.map((product, index) => (
                            <div 
                              key={product.id} 
                              className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground w-8">#{index + 1}</span>
                                {getStatusIcon(product.status)}
                                <span className="text-sm font-medium text-foreground">{product.title}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusColor(product.status)}>
                                  {product.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {product.videosGenerated}/{product.totalVideos}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="mt-6 space-y-6">
              <Card className="bg-card/50 backdrop-blur-sm border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Batch Settings
                  </CardTitle>
                  <CardDescription>
                    Configure localization and output settings for all products
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-foreground">Language</Label>
                      <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                        <SelectTrigger className="h-12 bg-background border-border">
                          <Globe className="h-4 w-4 mr-2 text-primary" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(LANGUAGE_NAMES).map(([key, { english }]) => (
                            <SelectItem key={key} value={key}>{english}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-foreground">Target Market</Label>
                      <Select value={market} onValueChange={(v) => setMarket(v as Market)}>
                        <SelectTrigger className="h-12 bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(MARKET_NAMES).map(([key, { name, flag }]) => (
                            <SelectItem key={key} value={key}>{flag} {name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-foreground">Target Audience</Label>
                      <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
                        <SelectTrigger className="h-12 bg-background border-border">
                          <Users className="h-4 w-4 mr-2 text-primary" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(AUDIENCE_NAMES).map(([key, name]) => (
                            <SelectItem key={key} value={key}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-foreground">Videos Per Product</Label>
                    <Select 
                      value={videosPerProduct.toString()} 
                      onValueChange={(v) => setVideosPerProduct(parseInt(v))}
                    >
                      <SelectTrigger className="w-48 h-12 bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 videos</SelectItem>
                        <SelectItem value="20">20 videos</SelectItem>
                        <SelectItem value="50">50 videos</SelectItem>
                        <SelectItem value="100">100 videos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="pt-6 border-t border-border">
                    <h3 className="font-semibold mb-4 text-foreground flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Estimated Output
                    </h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="p-4 bg-muted/30 border-border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">{products.length}</p>
                            <p className="text-sm text-muted-foreground">Products</p>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-4 bg-muted/30 border-border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <Video className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">{products.length * videosPerProduct}</p>
                            <p className="text-sm text-muted-foreground">Total Videos</p>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-4 bg-muted/30 border-border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-500/10">
                            <Clock className="h-5 w-5 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">~{Math.ceil(products.length * videosPerProduct * 0.5)} min</p>
                            <p className="text-sm text-muted-foreground">Est. Time</p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleStartBatch} 
                    disabled={isProcessing || products.length === 0}
                    className="w-full h-14 text-lg bg-gradient-primary shadow-glow"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Start Batch Generation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="monitor" className="mt-6 space-y-6">
              {/* Current Progress */}
              {products.length > 0 && (
                <Card className="bg-card/50 backdrop-blur-sm border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Current Batch Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {completedProducts} / {products.length} products completed
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(totalProgress)}%
                      </span>
                    </div>
                    <Progress value={totalProgress} className="h-3" />
                  </CardContent>
                </Card>
              )}
              
              {/* Job History */}
              <Card className="bg-card/50 backdrop-blur-sm border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    Batch Job History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {batchJobs.length === 0 ? (
                    <div className="text-center py-12">
                      <Layers className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No batch jobs yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Import products and start your first batch</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-80">
                      <div className="space-y-3">
                        {batchJobs.map((job) => (
                          <div
                            key={job.id}
                            className="p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/30 transition-all"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-medium text-foreground">{job.name}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(job.createdAt).toLocaleDateString()} • {job.totalProducts} products • {job.totalVideos} videos
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusColor(job.status)}>
                                  {job.status}
                                </Badge>
                                {job.status === 'processing' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePauseBatch(job.id)}
                                  >
                                    <Pause className="h-3 w-3" />
                                  </Button>
                                )}
                                {job.status === 'paused' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleResumeBatch(job.id)}
                                  >
                                    <Play className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <Progress 
                              value={(job.completedVideos / job.totalVideos) * 100} 
                              className="h-2" 
                            />
                            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                              <span>{job.completedVideos} / {job.totalVideos} videos</span>
                              <span>{Math.round((job.completedVideos / job.totalVideos) * 100)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default AgencyMode;