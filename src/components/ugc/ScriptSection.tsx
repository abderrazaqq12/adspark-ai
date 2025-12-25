/**
 * UGC Script Section Component
 * Script input with AI auto-generation, file upload, or manual entry
 */

import React, { useState } from 'react';
import { FileText, Sparkles, Upload, Edit3, Plus, Trash2, Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { UGCScriptConfig, UGCScriptMode, UGCManualScript, UGCUploadedScriptFile } from '@/types/ugc';

interface ScriptSectionProps {
    script: UGCScriptConfig;
    onChange: (script: UGCScriptConfig) => void;
    videoCount: number;
    elevenLabsApiKey?: string;
    onApiKeyChange?: (key: string) => void;
}

export function ScriptSection({
    script,
    onChange,
    videoCount,
    elevenLabsApiKey,
    onApiKeyChange
}: ScriptSectionProps) {
    const [showApiKey, setShowApiKey] = useState(false);

    const handleModeChange = (mode: string) => {
        onChange({ ...script, mode: mode as UGCScriptMode });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newFiles: UGCUploadedScriptFile[] = [];

        Array.from(files).forEach(file => {
            const isVoice = file.type.startsWith('audio/');
            const isScript = file.type === 'text/plain' || file.name.endsWith('.txt');

            if (isVoice || isScript) {
                newFiles.push({
                    id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    file,
                    type: isVoice ? 'voice' : 'script',
                    name: file.name,
                });

                // Read text content for script files
                if (isScript) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const content = e.target?.result as string;
                        const updatedFiles = [...(script.uploadedFiles || []), ...newFiles];
                        const fileIndex = updatedFiles.findIndex(f => f.name === file.name);
                        if (fileIndex !== -1) {
                            updatedFiles[fileIndex].content = content;
                            onChange({ ...script, uploadedFiles: updatedFiles });
                        }
                    };
                    reader.readAsText(file);
                }
            }
        });

        if (newFiles.length > 0) {
            onChange({
                ...script,
                uploadedFiles: [...(script.uploadedFiles || []), ...newFiles],
            });
        }
    };

    const removeUploadedFile = (fileId: string) => {
        onChange({
            ...script,
            uploadedFiles: (script.uploadedFiles || []).filter(f => f.id !== fileId),
        });
    };

    const addManualScript = () => {
        const newScript: UGCManualScript = {
            id: `script-${Date.now()}`,
            text: '',
            videoNumber: (script.manualScripts?.length || 0) + 1,
        };
        onChange({
            ...script,
            manualScripts: [...(script.manualScripts || []), newScript],
        });
    };

    const updateManualScript = (id: string, text: string) => {
        onChange({
            ...script,
            manualScripts: (script.manualScripts || []).map(s =>
                s.id === id ? { ...s, text } : s
            ),
        });
    };

    const removeManualScript = (id: string) => {
        const updatedScripts = (script.manualScripts || [])
            .filter(s => s.id !== id)
            .map((s, i) => ({ ...s, videoNumber: i + 1 }));
        onChange({
            ...script,
            manualScripts: updatedScripts,
        });
    };

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Script & Voice
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* ElevenLabs API Key */}
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Key className="w-3 h-3" />
                        ElevenLabs API Key
                    </Label>
                    <div className="flex gap-2">
                        <Input
                            type={showApiKey ? 'text' : 'password'}
                            placeholder="sk-..."
                            value={elevenLabsApiKey || ''}
                            onChange={(e) => onApiKeyChange?.(e.target.value)}
                            className="bg-background/50 text-sm"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="shrink-0"
                        >
                            {showApiKey ? 'Hide' : 'Show'}
                        </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        Get your API key from{' '}
                        <a
                            href="https://elevenlabs.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                        >
                            elevenlabs.io
                        </a>
                    </p>
                </div>

                {/* Script Mode Tabs */}
                <Tabs value={script.mode} onValueChange={handleModeChange}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="AI_AUTO" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Auto
                        </TabsTrigger>
                        <TabsTrigger value="UPLOAD" className="text-xs">
                            <Upload className="w-3 h-3 mr-1" />
                            Upload
                        </TabsTrigger>
                        <TabsTrigger value="MANUAL" className="text-xs">
                            <Edit3 className="w-3 h-3 mr-1" />
                            Manual
                        </TabsTrigger>
                    </TabsList>

                    {/* AI Auto Mode */}
                    <TabsContent value="AI_AUTO" className="mt-4">
                        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm">Fully Automatic</h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        <strong>{videoCount}</strong> unique scripts with matching voiceovers.
                                        Each video gets a different hook and CTA.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Upload Mode */}
                    <TabsContent value="UPLOAD" className="mt-4 space-y-3">
                        <div
                            className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => document.getElementById('ugc-script-upload')?.click()}
                        >
                            <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                Upload .txt scripts or audio files
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                                Each file = one video
                            </p>
                            <input
                                id="ugc-script-upload"
                                type="file"
                                accept=".txt,audio/*"
                                multiple
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </div>

                        {/* Uploaded Files List */}
                        {script.uploadedFiles && script.uploadedFiles.length > 0 && (
                            <div className="space-y-2">
                                {script.uploadedFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Badge variant={file.type === 'voice' ? 'default' : 'secondary'} className="text-[10px]">
                                                {file.type === 'voice' ? '🎙️ Voice' : '📝 Script'}
                                            </Badge>
                                            <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeUploadedFile(file.id)}
                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                                <p className="text-xs text-muted-foreground text-center">
                                    {script.uploadedFiles.length} file(s) for {videoCount} videos — files will be rotated
                                </p>
                            </div>
                        )}
                    </TabsContent>

                    {/* Manual Mode */}
                    <TabsContent value="MANUAL" className="mt-4 space-y-3">
                        <div className="space-y-3">
                            {(script.manualScripts || []).map((s, index) => (
                                <div key={s.id} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs text-muted-foreground">
                                            Script #{s.videoNumber}
                                        </Label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeManualScript(s.id)}
                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    <Textarea
                                        placeholder="Enter your script text..."
                                        value={s.text}
                                        onChange={(e) => updateManualScript(s.id, e.target.value)}
                                        className="bg-background/50 min-h-[80px] resize-none text-sm"
                                    />
                                </div>
                            ))}

                            {(script.manualScripts?.length || 0) < 50 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addManualScript}
                                    className="w-full"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Script
                                </Button>
                            )}

                            {(!script.manualScripts || script.manualScripts.length === 0) && (
                                <p className="text-xs text-muted-foreground text-center py-4">
                                    No scripts added yet. Click "Add Script" to start.
                                </p>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
