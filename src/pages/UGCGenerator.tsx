/**
 * UGC Generator Page - AI Video Factory
 * Upgraded to match Lovable.dev specification
 */

import React, { useState, useCallback } from 'react';
import { Video, Sparkles, Settings, Eye, EyeOff, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';

// UGC Components
import { AvatarCarousel, VoiceGrid, GenerateBar, ResultsGrid } from '@/components/ugc';

// UGC Types & Services
import type {
    UGCProductConfig,
    UGCAvatarConfig,
    UGCScriptConfig,
    UGCBatchSettings,
    UGCJobStatus,
    UGCVideoVariant,
    UGCLanguage,
    UGCMarket,
    UGCGender,
    UGCGeneratedAvatar,
} from '@/types/ugc';
import { DEFAULT_UGC_BATCH_SETTINGS, DEFAULT_UGC_SCRIPT_CONFIG } from '@/types/ugc';
import { generatePlaceholderAvatars } from '@/services/ugc/avatarGeneration';
import { generateScripts } from '@/services/ugc/scriptEngine';
import { createSimulatedVariants, simulateBatchProcessing } from '@/services/ugc/batchOrchestrator';
import { saveElevenLabsApiKey, getSavedElevenLabsApiKey } from '@/services/ugc/voicePreview';

// Avatar models
const AVATAR_MODELS = [
    { value: 'nanobana', label: 'Nanobana (Lovable AI)', description: 'Avatar generation uses Lovable AI - no API key required' },
];

export default function UGCGenerator() {
    const { toast } = useToast();

    // UI State
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Product State
    const [product, setProduct] = useState<UGCProductConfig>({
        images: [],
        imagePreviews: [],
        name: '',
        benefit: '',
    });

    // Avatar State
    const [avatarModel, setAvatarModel] = useState('nanobana');
    const [language, setLanguage] = useState<UGCLanguage>('ARABIC');
    const [market, setMarket] = useState<UGCMarket>('SAUDI_ARABIA');
    const [gender, setGender] = useState<UGCGender>('MALE');
    const [avatars, setAvatars] = useState<UGCGeneratedAvatar[]>([]);
    const [selectedAvatarId, setSelectedAvatarId] = useState<string | undefined>();
    const [isGeneratingAvatars, setIsGeneratingAvatars] = useState(false);

    // Script & Voice State
    const [scriptMode, setScriptMode] = useState<'AI_AUTO' | 'UPLOAD' | 'MANUAL'>('AI_AUTO');
    const [elevenLabsApiKey, setElevenLabsApiKey] = useState(getSavedElevenLabsApiKey() || '');
    const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>();
    const [showApiKey, setShowApiKey] = useState(false);

    // Batch Settings
    const [videoCount, setVideoCount] = useState(5);

    // Generation State
    const [jobStatus, setJobStatus] = useState<UGCJobStatus>('IDLE');
    const [progress, setProgress] = useState(0);
    const [currentStage, setCurrentStage] = useState('');
    const [variants, setVariants] = useState<UGCVideoVariant[]>([]);

    // Derived state
    const aspectRatio = '9:16';
    const estimatedTime = Math.ceil(videoCount * 0.5);

    // Handle Avatar Generation
    const handleGenerateAvatars = useCallback(async () => {
        setIsGeneratingAvatars(true);
        try {
            // Generate placeholder avatars (real API would be called here)
            const generated = generatePlaceholderAvatars(5, market, language, gender);
            setAvatars(generated);
            setSelectedAvatarId(generated[0]?.id);
            toast({
                title: 'Avatars Generated',
                description: `${generated.length} AI avatars ready for selection`,
            });
        } catch (error: any) {
            toast({
                title: 'Generation Failed',
                description: error.message || 'Failed to generate avatars',
                variant: 'destructive',
            });
        } finally {
            setIsGeneratingAvatars(false);
        }
    }, [market, language, gender, toast]);

    // Handle API Key Save
    const handleSaveApiKey = useCallback(() => {
        if (elevenLabsApiKey) {
            saveElevenLabsApiKey(elevenLabsApiKey);
            toast({ title: 'API Key Saved', description: 'ElevenLabs API key saved successfully' });
        }
    }, [elevenLabsApiKey, toast]);

    // Handle Image Upload
    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newImages: File[] = [];
        const newPreviews: string[] = [];

        Array.from(files).slice(0, 3 - product.images.length).forEach(file => {
            if (file.type.startsWith('image/')) {
                newImages.push(file);
                newPreviews.push(URL.createObjectURL(file));
            }
        });

        if (newImages.length > 0) {
            setProduct(prev => ({
                ...prev,
                images: [...prev.images, ...newImages],
                imagePreviews: [...prev.imagePreviews, ...newPreviews],
            }));
        }
    }, [product.images.length]);

    // Check if ready to generate
    const isReadyToGenerate = () => {
        return (
            product.name.trim() !== '' &&
            product.benefit.trim() !== '' &&
            avatars.length > 0
        );
    };

    // Handle Generate
    const handleGenerate = async () => {
        if (!isReadyToGenerate()) {
            toast({
                title: 'Incomplete Setup',
                description: 'Please fill product details and generate avatars first',
                variant: 'destructive',
            });
            return;
        }

        setJobStatus('PROCESSING');
        setProgress(0);
        setVariants([]);

        try {
            // Generate scripts using AI
            const scripts = await generateScripts({
                productName: product.name,
                productBenefit: product.benefit,
                productCategory: product.category,
                language,
                videoCount,
            });

            // Create simulated variants
            const initialVariants = createSimulatedVariants({
                videoCount,
                productName: product.name,
                productBenefit: product.benefit,
                productImages: product.imagePreviews,
                language,
                avatars,
                scripts,
                voiceId: selectedVoiceId || '',
                elevenLabsApiKey,
            });

            setVariants(initialVariants);

            // Simulate batch processing
            await simulateBatchProcessing(
                initialVariants,
                (prog, stage, updated) => {
                    setProgress(prog);
                    setCurrentStage(stage);
                    setVariants(updated);
                }
            );

            setJobStatus('DONE');
            toast({
                title: 'Generation Complete! 🎉',
                description: `Successfully generated ${videoCount} UGC videos`,
            });
        } catch (error: any) {
            setJobStatus('FAILED');
            toast({
                title: 'Generation Failed',
                description: error.message || 'An error occurred',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-border bg-card/50 backdrop-blur-sm">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
                                <Video className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold">UGC Generator</h1>
                                <p className="text-sm text-muted-foreground">AI Video Factory</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{aspectRatio}</span>
                            <span>•</span>
                            <span>{language === 'ARABIC' ? 'Arabic' : language === 'SPANISH' ? 'Spanish' : 'English'}</span>
                            <span>•</span>
                            <span>{estimatedTime}s</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto pb-24">
                <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Avatar & Target */}
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" />
                                        Avatar & Target
                                    </CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                        className="text-xs"
                                    >
                                        <Settings className="w-3 h-3 mr-1" />
                                        Advanced
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Avatar Model (Advanced) */}
                                {showAdvanced && (
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Avatar Model</Label>
                                        <Select value={avatarModel} onValueChange={setAvatarModel}>
                                            <SelectTrigger className="bg-background/50">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {AVATAR_MODELS.map(model => (
                                                    <SelectItem key={model.value} value={model.value}>
                                                        {model.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-muted-foreground">
                                            {AVATAR_MODELS.find(m => m.value === avatarModel)?.description}
                                        </p>
                                    </div>
                                )}

                                {/* Content Language */}
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Content Language</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            variant={language === 'ARABIC' ? 'default' : 'outline'}
                                            onClick={() => { setLanguage('ARABIC'); setMarket('SAUDI_ARABIA'); }}
                                            className="w-full"
                                        >
                                            Arabic
                                        </Button>
                                        <Button
                                            variant={language === 'SPANISH' ? 'default' : 'outline'}
                                            onClick={() => { setLanguage('SPANISH'); setMarket('PANAMA'); }}
                                            className="w-full"
                                        >
                                            Spanish
                                        </Button>
                                    </div>
                                </div>

                                {/* Market */}
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Market</Label>
                                    <Button variant="outline" className="w-full justify-start">
                                        {market === 'SAUDI_ARABIA' ? '🇸🇦 Saudi Arabia' : '🇵🇦 Panama'}
                                    </Button>
                                </div>

                                {/* Gender */}
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Gender</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button
                                            variant={gender === 'MALE' ? 'default' : 'outline'}
                                            onClick={() => setGender('MALE')}
                                            className="w-full"
                                        >
                                            👨 Male
                                        </Button>
                                        <Button
                                            variant={gender === 'FEMALE' ? 'default' : 'outline'}
                                            onClick={() => setGender('FEMALE')}
                                            className="w-full"
                                        >
                                            👩 Female
                                        </Button>
                                        <Button
                                            variant={gender === 'ALL' ? 'default' : 'outline'}
                                            onClick={() => setGender('ALL')}
                                            className="w-full"
                                        >
                                            👥 All
                                        </Button>
                                    </div>
                                </div>

                                {/* AI Avatar Generation */}
                                <div className="space-y-3 pt-2">
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <Sparkles className="w-3 h-3" />
                                        AI Avatar Generation
                                    </Label>

                                    {avatars.length > 0 ? (
                                        <AvatarCarousel
                                            avatars={avatars}
                                            selectedId={selectedAvatarId}
                                            onSelect={setSelectedAvatarId}
                                            onRegenerate={handleGenerateAvatars}
                                            isRegenerating={isGeneratingAvatars}
                                        />
                                    ) : (
                                        <div className="text-center py-4">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                                                <Sparkles className="w-6 h-6 text-primary" />
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                Generate 3-5 realistic avatars automatically
                                            </p>
                                            <Button
                                                onClick={handleGenerateAvatars}
                                                disabled={isGeneratingAvatars}
                                                className="w-full bg-gradient-to-r from-teal-500 to-cyan-600"
                                            >
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                {isGeneratingAvatars ? 'Generating...' : 'Generate Avatars'}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Upload Custom Photo */}
                                <Button variant="outline" className="w-full">
                                    <span className="mr-2">📤</span>
                                    Upload Custom Photo
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Right Column - Product Details */}
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    📦 Product Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Image Upload */}
                                <div
                                    className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                                    onClick={() => document.getElementById('ugc-product-images')?.click()}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-teal-500/20 flex items-center justify-center">
                                            <span className="text-xl">➕</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="font-medium">Upload Product Images</p>
                                            <p className="text-sm text-muted-foreground">Add 1-3 product photos • AI will auto-detect category</p>
                                        </div>
                                    </div>
                                    <input
                                        id="ugc-product-images"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                </div>

                                {/* Uploaded Images Preview */}
                                {product.imagePreviews.length > 0 && (
                                    <div className="flex gap-2">
                                        {product.imagePreviews.map((preview, i) => (
                                            <img key={i} src={preview} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                                        ))}
                                    </div>
                                )}

                                {/* Product Name */}
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Product Name</Label>
                                    <Input
                                        placeholder="Enter product name..."
                                        value={product.name}
                                        onChange={(e) => setProduct(p => ({ ...p, name: e.target.value }))}
                                        className="bg-background/50"
                                    />
                                </div>

                                {/* Main Benefit */}
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Main Benefit</Label>
                                    <Input
                                        placeholder="Enter main product benefit..."
                                        value={product.benefit}
                                        onChange={(e) => setProduct(p => ({ ...p, benefit: e.target.value }))}
                                        className="bg-background/50"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Script & Voice Section */}
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm lg:col-span-2">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        📝 Script & Voice
                                    </CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                        className="text-xs"
                                    >
                                        <Settings className="w-3 h-3 mr-1" />
                                        Advanced
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* ElevenLabs API Key (Always visible but collapsible) */}
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">ElevenLabs API Key</Label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 relative">
                                            <Input
                                                type={showApiKey ? 'text' : 'password'}
                                                placeholder="Enter your ElevenLabs API key..."
                                                value={elevenLabsApiKey}
                                                onChange={(e) => setElevenLabsApiKey(e.target.value)}
                                                className="bg-background/50 pr-10"
                                            />
                                            <button
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <Button variant="outline" size="sm">Test API Key</Button>
                                        <Button onClick={handleSaveApiKey} className="bg-teal-500 hover:bg-teal-600">Save</Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        Get your API key from <a href="https://elevenlabs.io" target="_blank" className="text-primary hover:underline">elevenlabs.io</a>
                                    </p>
                                </div>

                                {/* Script Mode Tabs */}
                                <Tabs value={scriptMode} onValueChange={(v) => setScriptMode(v as typeof scriptMode)}>
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="AI_AUTO" className="flex items-center gap-1.5">
                                            <Sparkles className="w-3 h-3" />
                                            AI Auto
                                        </TabsTrigger>
                                        <TabsTrigger value="UPLOAD">📤 Upload</TabsTrigger>
                                        <TabsTrigger value="MANUAL">✏️ Enter</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="AI_AUTO" className="mt-4">
                                        <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-xl p-4 border border-teal-500/20">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
                                                    <Sparkles className="w-5 h-5 text-teal-500" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium">Fully Automatic</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {videoCount} unique scripts with matching voiceovers. Each video gets a different hook and CTA.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="UPLOAD" className="mt-4">
                                        <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center">
                                            <p className="text-muted-foreground">Upload script or audio files</p>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="MANUAL" className="mt-4">
                                        <Textarea placeholder="Type scripts manually..." className="min-h-[120px]" />
                                    </TabsContent>
                                </Tabs>

                                {/* Voice Grid */}
                                <VoiceGrid
                                    language={language}
                                    selectedVoiceId={selectedVoiceId}
                                    onSelectVoice={setSelectedVoiceId}
                                    apiKey={elevenLabsApiKey}
                                />
                            </CardContent>
                        </Card>

                        {/* Generate Section */}
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm lg:col-span-2">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    Generate
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Video Count */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm">Number of Videos</Label>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setVideoCount(Math.max(1, videoCount - 1))}
                                                className="h-8 w-8 p-0"
                                            >
                                                -
                                            </Button>
                                            <input
                                                type="number"
                                                min={1}
                                                max={50}
                                                value={videoCount}
                                                onChange={(e) => setVideoCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                                                className="w-12 h-8 text-center bg-muted/50 rounded-lg border"
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setVideoCount(Math.min(50, videoCount + 1))}
                                                className="h-8 w-8 p-0"
                                            >
                                                +
                                            </Button>
                                        </div>
                                    </div>
                                    <Slider
                                        value={[videoCount]}
                                        onValueChange={([v]) => setVideoCount(v)}
                                        min={1}
                                        max={50}
                                        step={1}
                                    />
                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                        <span>10</span>
                                        <span>20</span>
                                        <span>30</span>
                                        <span>40</span>
                                        <span>50</span>
                                    </div>
                                </div>

                                {/* Ready Status */}
                                <div className="flex items-center justify-between py-2">
                                    <div>
                                        <p className="font-medium">{isReadyToGenerate() ? 'Ready to Generate' : 'Complete Setup'}</p>
                                        <p className="text-sm text-muted-foreground">{videoCount} video variants</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                        <span>Estimated time</span>
                                        <span className="font-medium text-foreground">~{estimatedTime} min</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Results Grid */}
                    {variants.length > 0 && (
                        <div className="mt-6">
                            <ResultsGrid variants={variants} onDownload={() => { }} />
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Generate Bar */}
            <GenerateBar
                videoCount={videoCount}
                isReady={isReadyToGenerate()}
                status={jobStatus}
                progress={progress}
                onGenerate={handleGenerate}
                estimatedTime={estimatedTime}
            />
        </div>
    );
}
