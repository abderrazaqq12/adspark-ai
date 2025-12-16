import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, Clock, FileVideo, Music } from 'lucide-react';
import type { ExecutionPlan } from '@/lib/creative-scale/compiler-types';

interface PlanInputDetailsProps {
    plan: ExecutionPlan;
    index: number;
    total: number;
}

export function PlanInputDetails({ plan, index, total }: PlanInputDetailsProps) {
    const durationSec = (plan.validation.total_duration_ms / 1000).toFixed(1);
    const segmentCount = plan.timeline.length;
    const audioCount = plan.audio_tracks.length;
    const resolution = `${plan.output_format.width}x${plan.output_format.height}`;

    return (
        <Card className="mb-4 border-slate-700 bg-slate-900/50">
            <CardHeader className="py-3 px-4 border-b border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <CardTitle className="text-sm font-medium text-slate-200">
                            Strategy Input: Variation {index + 1}/{total}
                        </CardTitle>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                        {plan.plan_id.substring(0, 8)}...
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="py-3 px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Duration</span>
                            <span className="text-sm font-mono">{durationSec}s</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <FileVideo className="w-4 h-4 text-slate-500" />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Segments</span>
                            <span className="text-sm font-mono">{segmentCount} clips</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-slate-500" />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Audio</span>
                            <span className="text-sm font-mono">{audioCount} tracks</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border border-slate-500 flex items-center justify-center text-[8px] font-mono text-slate-500">
                            HD
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Format</span>
                            <span className="text-sm font-mono">{resolution}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
