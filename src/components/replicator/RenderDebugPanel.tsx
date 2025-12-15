import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RenderDebugInfo {
    engine: string;
    executionPath: string;
    serverJobId?: string;
    logs: string[];
    payload?: any;
    status: 'pending' | 'success' | 'failed';
}

interface RenderDebugPanelProps {
    debugInfo: RenderDebugInfo | null;
    isOpen: boolean;
}

export function RenderDebugPanel({ debugInfo, isOpen }: RenderDebugPanelProps) {
    if (!isOpen || !debugInfo) return null;

    const copyLogs = () => {
        const logText = debugInfo.logs.join('\n');
        navigator.clipboard.writeText(logText);
        toast.success("Debug logs copied to clipboard");
    };

    return (
        <Card className="mt-6 border-yellow-500/50 bg-yellow-500/5 shadow-lg">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-yellow-500" />
                    <CardTitle className="text-sm font-mono text-yellow-600">
                        RENDER PIPELINE DEBUG
                    </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={debugInfo.status === 'success' ? 'default' : debugInfo.status === 'failed' ? 'destructive' : 'outline'}>
                        {debugInfo.status.toUpperCase()}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyLogs}>
                        <Copy className="w-3 h-3" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-2 gap-px bg-border/20 border-t border-b border-border/20">
                    <div className="p-3 bg-background/50">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Engine Selected</div>
                        <div className="font-medium text-sm">{debugInfo.engine}</div>
                    </div>
                    <div className="p-3 bg-background/50">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Execution Path</div>
                        <div className="font-mono text-xs text-blue-500">{debugInfo.executionPath}</div>
                    </div>
                    <div className="p-3 bg-background/50">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Job ID</div>
                        <div className="font-mono text-xs">{debugInfo.serverJobId || 'N/A'}</div>
                    </div>
                </div>

                <ScrollArea className="h-48 w-full p-4 font-mono text-xs">
                    {debugInfo.logs.length === 0 ? (
                        <div className="text-muted-foreground italic">No logs available...</div>
                    ) : (
                        debugInfo.logs.map((log, i) => (
                            <div key={i} className="mb-1 break-all">
                                <span className="text-slate-400 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                {log}
                            </div>
                        ))
                    )}
                    <div className="mt-4 pt-4 border-t border-border/30">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Payload Summary</div>
                        <pre className="text-[10px] text-muted-foreground overflow-auto">
                            {JSON.stringify(debugInfo.payload, null, 2)}
                        </pre>
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
