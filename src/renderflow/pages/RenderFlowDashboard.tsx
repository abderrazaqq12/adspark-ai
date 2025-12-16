import { useState, useEffect } from "react";
import { JobWizard } from "../components/JobWizard";
import { JobList } from "../components/JobList";
import { RenderFlowApi } from "../api";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function RenderFlowDashboard() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [healthStatus, setHealthStatus] = useState<'checking' | 'ready' | 'unavailable'>('checking');
    const [healthError, setHealthError] = useState<string | null>(null);

    // Health check on mount - no retries
    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await RenderFlowApi.checkHealth();
                if (res.ok && res.ffmpeg === 'ready') {
                    setHealthStatus('ready');
                } else {
                    setHealthStatus('unavailable');
                    setHealthError(res.error || 'FFmpeg not ready');
                }
            } catch (e: any) {
                setHealthStatus('unavailable');
                setHealthError(e.message);
            }
        };
        checkHealth();
    }, []);

    return (
        <div className="container py-8 max-w-5xl mx-auto space-y-10">
            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">RenderFlow Engine</h1>
                <p className="text-muted-foreground">
                    Deterministic FFmpeg Rendering Pipeline. CPU-Only. Strict Persistence.
                </p>
                
                {/* Health Status */}
                <div className="flex justify-center pt-2">
                    {healthStatus === 'checking' && (
                        <span className="text-xs text-muted-foreground font-mono">
                            Checking backend health...
                        </span>
                    )}
                    {healthStatus === 'ready' && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-500 font-mono">
                            <CheckCircle size={12} /> Backend Ready
                        </span>
                    )}
                    {healthStatus === 'unavailable' && (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive font-mono">
                            <AlertCircle size={12} /> Backend Unavailable: {healthError}
                        </span>
                    )}
                </div>
            </div>

            {/* Wizard Section */}
            <section>
                <JobWizard />
            </section>

            {/* History Section */}
            <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                    <h2 className="text-xl font-semibold">Recent Execution History</h2>
                    <span className="text-xs text-muted-foreground font-mono">Polling every 1000ms</span>
                </div>
                <JobList refreshTrigger={refreshTrigger} />
            </section>
        </div>
    );
}
