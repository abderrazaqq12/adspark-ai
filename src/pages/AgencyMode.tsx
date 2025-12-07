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
  Settings, Users, Globe, Zap, FileSpreadsheet
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
      
      // Create batch job
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
      
      // In production, this would trigger parallel processing
      // For now, simulate progress
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
  
  const completedProducts = products.filter(p => p.status === 'completed').length;
  const totalProgress = products.length > 0 
    ? (completedProducts / products.length) * 100 
    : 0;
  
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Agency Mode
            </h1>
            <p className="text-muted-foreground">
              Bulk generate 100+ products → 1000+ videos
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Package className="h-3 w-3" />
              {products.length} Products
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Video className="h-3 w-3" />
              {products.length * videosPerProduct} Videos
            </Badge>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="import">
              <Upload className="h-4 w-4 mr-2" />
              Import Products
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Batch Settings
            </TabsTrigger>
            <TabsTrigger value="monitor">
              <Zap className="h-4 w-4 mr-2" />
              Monitor Jobs
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Import Products</CardTitle>
                <CardDescription>
                  Paste CSV data or import from Google Sheets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Batch Name</Label>
                  <Input 
                    placeholder="e.g., Black Friday Campaign"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label>CSV Data (title, description, image_url)</Label>
                  <Textarea 
                    placeholder="title,description,image_url
Product 1,Description 1,https://example.com/img1.jpg
Product 2,Description 2,https://example.com/img2.jpg"
                    rows={8}
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleCsvImport}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Parse CSV
                  </Button>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Import from Google Sheets
                  </Button>
                </div>
                
                {products.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Imported Products ({products.length})</h3>
                    <ScrollArea className="h-48 border rounded-lg p-2">
                      {products.map((product, index) => (
                        <div key={product.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(product.status)}
                            <span className="text-sm">{product.title}</span>
                          </div>
                          <Badge variant="outline">
                            {product.videosGenerated}/{product.totalVideos}
                          </Badge>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Batch Generation Settings</CardTitle>
                <CardDescription>
                  Configure localization and output settings for all products
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Language</Label>
                    <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                      <SelectTrigger>
                        <Globe className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LANGUAGE_NAMES).map(([key, { english }]) => (
                          <SelectItem key={key} value={key}>{english}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Target Market</Label>
                    <Select value={market} onValueChange={(v) => setMarket(v as Market)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(MARKET_NAMES).map(([key, { name, flag }]) => (
                          <SelectItem key={key} value={key}>{flag} {name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Target Audience</Label>
                    <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
                      <SelectTrigger>
                        <Users className="h-4 w-4 mr-2" />
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
                
                <div>
                  <Label>Videos Per Product</Label>
                  <Select 
                    value={videosPerProduct.toString()} 
                    onValueChange={(v) => setVideosPerProduct(parseInt(v))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Estimated Output</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="p-4">
                      <p className="text-2xl font-bold">{products.length}</p>
                      <p className="text-sm text-muted-foreground">Products</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-2xl font-bold">{products.length * videosPerProduct}</p>
                      <p className="text-sm text-muted-foreground">Total Videos</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-2xl font-bold">~{Math.ceil(products.length * videosPerProduct * 0.5)} min</p>
                      <p className="text-sm text-muted-foreground">Est. Time</p>
                    </Card>
                  </div>
                </div>
                
                <Button 
                  onClick={handleStartBatch} 
                  disabled={isProcessing || products.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Batch Generation
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="monitor" className="space-y-4">
            {/* Current Progress */}
            {products.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Batch Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
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
            <Card>
              <CardHeader>
                <CardTitle>Batch Job History</CardTitle>
              </CardHeader>
              <CardContent>
                {batchJobs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No batch jobs yet. Import products and start a batch.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {batchJobs.map((job) => (
                      <div 
                        key={job.id} 
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          {getStatusIcon(job.status)}
                          <div>
                            <h4 className="font-medium">{job.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {job.completedVideos} / {job.totalVideos} videos
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            job.status === 'completed' ? 'default' :
                            job.status === 'failed' ? 'destructive' :
                            job.status === 'processing' ? 'secondary' :
                            'outline'
                          }>
                            {job.status}
                          </Badge>
                          
                          {job.status === 'processing' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePauseBatch(job.id)}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {job.status === 'paused' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleResumeBatch(job.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {job.status === 'completed' && (
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {job.status === 'failed' && (
                            <Button variant="outline" size="sm">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AgencyMode;
