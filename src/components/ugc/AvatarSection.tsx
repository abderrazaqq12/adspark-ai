/**
 * UGC Avatar Section Component
 * AI avatar selection and generation
 */

import React, { useState } from 'react';
import { User, Sparkles, RefreshCw, Check, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { UGCAvatarConfig, UGCLanguage, UGCMarket, UGCGender, UGCGeneratedAvatar } from '@/types/ugc';
import { generatePlaceholderAvatars } from '@/services/ugc/avatarGeneration';

interface AvatarSectionProps {
    avatar: UGCAvatarConfig;
    onChange: (avatar: UGCAvatarConfig) => void;
}

const LANGUAGES: { value: UGCLanguage; label: string }[] = [
    { value: 'ENGLISH', label: '🇺🇸 English' },
    { value: 'ARABIC', label: '🇸🇦 Arabic' },
    { value: 'SPANISH', label: '🇪🇸 Spanish' },
    { value: 'FRENCH', label: '🇫🇷 French' },
];

const MARKETS: { value: UGCMarket; label: string }[] = [
    { value: 'USA', label: '🇺🇸 United States' },
    { value: 'UAE', label: '🇦🇪 UAE' },
    { value: 'SAUDI_ARABIA', label: '🇸🇦 Saudi Arabia' },
    { value: 'FRANCE', label: '🇫🇷 France' },
    { value: 'PANAMA', label: '🇵🇦 Panama' },
];

const GENDERS: { value: UGCGender; label: string }[] = [
    { value: 'ALL', label: '👥 Mixed' },
    { value: 'MALE', label: '👨 Male' },
    { value: 'FEMALE', label: '👩 Female' },
];

export function AvatarSection({ avatar, onChange }: AvatarSectionProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateAvatars = async () => {
        setIsGenerating(true);
        try {
            // For now, use placeholder avatars (real generation would use the API)
            const avatars = generatePlaceholderAvatars(5);
            onChange({
                ...avatar,
                generatedAvatars: avatars,
                selectedAvatarId: avatars[0]?.id,
            });
        } catch (error) {
            console.error('Failed to generate avatars:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const selectAvatar = (avatarId: string) => {
        if (!avatar.generatedAvatars) return;

        const updatedAvatars = avatar.generatedAvatars.map(a => ({
            ...a,
            isSelected: a.id === avatarId,
        }));

        onChange({
            ...avatar,
            generatedAvatars: updatedAvatars,
            selectedAvatarId: avatarId,
        });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const preview = URL.createObjectURL(file);
            onChange({
                ...avatar,
                type: 'upload',
                imageFile: file,
                imagePreview: preview,
            });
        }
    };

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Avatar & Target
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Tabs value={avatar.type} onValueChange={(v) => onChange({ ...avatar, type: v as 'auto' | 'upload' })}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="auto" className="text-sm">
                            <Sparkles className="w-3 h-3 mr-1.5" />
                            AI Generated
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="text-sm">
                            <Upload className="w-3 h-3 mr-1.5" />
                            Upload
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="auto" className="space-y-4 mt-4">
                        {/* Language & Market Selection */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Language</Label>
                                <Select
                                    value={avatar.language || 'ENGLISH'}
                                    onValueChange={(v) => onChange({ ...avatar, language: v as UGCLanguage })}
                                >
                                    <SelectTrigger className="bg-background/50 h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LANGUAGES.map(lang => (
                                            <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Target Market</Label>
                                <Select
                                    value={avatar.market || 'USA'}
                                    onValueChange={(v) => onChange({ ...avatar, market: v as UGCMarket })}
                                >
                                    <SelectTrigger className="bg-background/50 h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MARKETS.map(market => (
                                            <SelectItem key={market.value} value={market.value}>{market.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Gender Selection */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Avatar Gender</Label>
                            <Select
                                value={avatar.gender || 'ALL'}
                                onValueChange={(v) => onChange({ ...avatar, gender: v as UGCGender })}
                            >
                                <SelectTrigger className="bg-background/50 h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {GENDERS.map(gender => (
                                        <SelectItem key={gender.value} value={gender.value}>{gender.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Generate Button */}
                        <Button
                            onClick={handleGenerateAvatars}
                            disabled={isGenerating}
                            className="w-full"
                            variant="outline"
                        >
                            {isGenerating ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate Avatars
                                </>
                            )}
                        </Button>

                        {/* Generated Avatars Grid */}
                        {avatar.generatedAvatars && avatar.generatedAvatars.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Select Avatar</Label>
                                <div className="grid grid-cols-5 gap-2">
                                    {avatar.generatedAvatars.map((av) => (
                                        <button
                                            key={av.id}
                                            onClick={() => selectAvatar(av.id)}
                                            className={`
                        relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                        ${av.isSelected
                                                    ? 'border-primary ring-2 ring-primary/20'
                                                    : 'border-border hover:border-primary/50'}
                      `}
                                        >
                                            <img
                                                src={av.imageUrl}
                                                alt={`Avatar ${av.gender}`}
                                                className="w-full h-full object-cover"
                                            />
                                            {av.isSelected && (
                                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                    <Check className="w-5 h-5 text-primary" />
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                                                <span className="text-[10px] text-white">
                                                    {av.gender === 'MALE' ? '♂' : '♀'}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-muted-foreground text-center">
                                    Click to select • Each video uses a different avatar
                                </p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-4 mt-4">
                        {/* Upload Zone */}
                        <div
                            className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                ${avatar.imagePreview ? 'border-primary' : 'border-border hover:border-primary/50'}
              `}
                            onClick={() => document.getElementById('ugc-avatar-upload')?.click()}
                        >
                            {avatar.imagePreview ? (
                                <div className="space-y-3">
                                    <img
                                        src={avatar.imagePreview}
                                        alt="Uploaded avatar"
                                        className="w-24 h-24 mx-auto rounded-full object-cover border-2 border-primary"
                                    />
                                    <p className="text-sm text-muted-foreground">Click to change</p>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                        Upload your own avatar image
                                    </p>
                                    <p className="text-xs text-muted-foreground/60 mt-1">
                                        Recommended: Square image, at least 512x512px
                                    </p>
                                </>
                            )}
                            <input
                                id="ugc-avatar-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
