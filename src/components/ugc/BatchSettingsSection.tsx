/**
 * UGC Batch Settings Section Component
 * Video count configuration (1-50 videos)
 */

import React from 'react';
import { Minus, Plus, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import type { UGCBatchSettings } from '@/types/ugc';

interface BatchSettingsSectionProps {
    settings: UGCBatchSettings;
    onChange: (settings: UGCBatchSettings) => void;
    compact?: boolean;
}

export function BatchSettingsSection({ settings, onChange, compact }: BatchSettingsSectionProps) {
    const updateVideoCount = (delta: number) => {
        const newCount = Math.min(50, Math.max(1, settings.videoCount + delta));
        onChange({ ...settings, videoCount: newCount });
    };

    const setVideoCount = (count: number) => {
        const newCount = Math.min(50, Math.max(1, count));
        onChange({ ...settings, videoCount: newCount });
    };

    const handleSliderChange = (value: number[]) => {
        setVideoCount(value[0]);
    };

    if (compact) {
        return (
            <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
                <Label className="text-xs text-muted-foreground shrink-0">Videos:</Label>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateVideoCount(-1)}
                    disabled={settings.videoCount <= 1}
                    className="h-7 w-7 p-0"
                >
                    <Minus className="w-3 h-3" />
                </Button>
                <span className="text-lg font-bold min-w-[2ch] text-center">{settings.videoCount}</span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateVideoCount(1)}
                    disabled={settings.videoCount >= 50}
                    className="h-7 w-7 p-0"
                >
                    <Plus className="w-3 h-3" />
                </Button>
            </div>
        );
    }

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-primary" />
                    Batch Settings
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Video count */}
                <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">Number of Videos</Label>

                    <div className="flex items-center gap-3">
                        {/* Decrement button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateVideoCount(-1)}
                            disabled={settings.videoCount <= 1}
                            className="h-9 w-9 p-0 shrink-0"
                        >
                            <Minus className="w-4 h-4" />
                        </Button>

                        {/* Slider */}
                        <div className="flex-1">
                            <Slider
                                value={[settings.videoCount]}
                                onValueChange={handleSliderChange}
                                min={1}
                                max={50}
                                step={1}
                                className="w-full"
                            />
                            <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground/60">
                                <span>1</span>
                                <span>10</span>
                                <span>25</span>
                                <span>40</span>
                                <span>50</span>
                            </div>
                        </div>

                        {/* Count display + Increment */}
                        <div className="flex items-center gap-2 shrink-0">
                            <input
                                type="number"
                                min={1}
                                max={50}
                                value={settings.videoCount}
                                onChange={(e) => setVideoCount(parseInt(e.target.value) || 1)}
                                className="w-14 h-9 text-center text-lg font-bold bg-muted/50 rounded-lg border border-border focus:ring-1 focus:ring-primary focus:outline-none"
                            />

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateVideoCount(1)}
                                disabled={settings.videoCount >= 50}
                                className="h-9 w-9 p-0"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Estimated time */}
                <div className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                    <span className="text-muted-foreground">Estimated time</span>
                    <span className="font-medium">~{Math.ceil(settings.videoCount * 0.5)} min</span>
                </div>

                {/* Variation options info */}
                <div className="text-xs text-muted-foreground bg-primary/5 rounded-lg p-3 border border-primary/10">
                    <p className="font-medium text-foreground mb-1">Anti-fatigue variations:</p>
                    <ul className="space-y-0.5 list-disc list-inside">
                        <li>Different hooks for each video</li>
                        <li>Varied CTAs and subtitle styles</li>
                        <li>Multiple avatar appearances</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}
