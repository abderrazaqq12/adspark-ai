import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RenderFlowApi, RenderFlowJob } from "../api";
import { AlertCircle, CheckCircle, Download, RotateCcw } from "lucide-react";
import { JobStatusBadge } from "./JobStatusBadge";

// STRICT 4-STEP WIZARD: Input → Configure → Review → Execute
type WizardStep = 1 | 2 | 3 | 4;

export function JobWizard() {
    const [step, setStep] = useState<WizardStep>(1);
    
    // Step 1: Input
    const [sourceUrl, setSourceUrl] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    
    // Step 2: Configure
    const [variations, setVariations] = useState(1);
    
    // Step 4: Execution
    const [jobs, setJobs] = useState<RenderFlowJob[]>([]);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    // Derived state from API responses only
    const allDone = jobs.length > 0 && jobs.every(j => j.state === 'done' || j.state === 'failed');
    const anyFailed = jobs.some(j => j.state === 'failed');

    // STEP 1: Handle input validation (client-side emptiness check only)
    const handleStep1Continue = async () => {
        setUploadError(null);
        
        if (sourceUrl.trim()) {
            // URL provided - proceed directly
            setStep(2);
            return;
        }
        
        if (!file) {
            setUploadError("Provide a source URL or select a file");
            return;
        }
        
        // Upload file - raw FormData, no retry
        setUploading(true);
        try {
            const res = await RenderFlowApi.uploadAsset(file);
            setSourceUrl(res.url);
            setStep(2);
        } catch (e: any) {
            // Show backend error verbatim
            setUploadError(e.message);
        } finally {
            setUploading(false);
        }
    };

    // STEP 3: Submit job
    const handleStartRendering = async () => {
        setSubmitError(null);
        setIsSubmitting(true);
        
        try {
            const res = await RenderFlowApi.submitJob(
                `proj_${Date.now()}`,
                sourceUrl,
                variations
            );
            
            const ids = res.ids || [];
            if (ids.length === 0) {
                throw new Error("Backend returned empty job IDs");
            }
            
            // Initialize jobs from API response IDs - NO state inference
            const initialJobs: RenderFlowJob[] = ids.map((id: string) => ({
                id,
                variation_id: '',
                project_id: '',
                state: 'queued' as const,
                progress_pct: 0,
                created_at: new Date().toISOString()
            }));
            
            setJobs(initialJobs);
            setStep(4);
        } catch (e: any) {
            setSubmitError(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // STEP 4: Strict 1-second polling - stops ONLY when state === done OR state === failed for ALL
    useEffect(() => {
        if (step !== 4 || jobs.length === 0) return;
        if (allDone) return; // Stop polling

        const poll = async () => {
            const updatedJobs = await Promise.all(
                jobs.map(async (job) => {
                    // Don't poll completed/failed jobs
                    if (job.state === 'done' || job.state === 'failed') return job;
                    
                    try {
                        return await RenderFlowApi.getJobStatus(job.id);
                    } catch {
                        // Return existing job on poll error - no inference
                        return job;
                    }
                })
            );
            setJobs(updatedJobs);
        };

        pollRef.current = setInterval(poll, 1000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [step, jobs, allDone]);

    // Reset wizard
    const handleReset = () => {
        setStep(1);
        setSourceUrl("");
        setFile(null);
        setUploadError(null);
        setVariations(1);
        setJobs([]);
        setSubmitError(null);
        if (pollRef.current) clearInterval(pollRef.current);
    };

    return (
        <Card className="border-2 border-border">
            <CardHeader className="border-b border-border">
                <CardTitle className="flex justify-between items-center">
                    <span className="text-lg font-semibold">RenderFlow Wizard</span>
                    <span className="text-sm font-mono text-muted-foreground">Step {step} of 4</span>
                </CardTitle>
            </CardHeader>

            <CardContent className="p-6 space-y-6">

                {/* STEP 1: INPUT */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Option A: Source URL</Label>
                            <Input 
                                value={sourceUrl} 
                                onChange={e => { setSourceUrl(e.target.value); setUploadError(null); }} 
                                placeholder="https://..."
                                className="font-mono text-sm"
                                disabled={uploading}
                            />
                        </div>
                        
                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border"></span>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-background px-3 text-xs uppercase text-muted-foreground tracking-wide">
                                    Or Upload File
                                </span>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Option B: Select File</Label>
                            <Input 
                                type="file" 
                                accept="video/*"
                                onChange={e => { setFile(e.target.files?.[0] || null); setUploadError(null); }}
                                disabled={uploading}
                            />
                        </div>
                        
                        {uploadError && (
                            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive font-mono">
                                {uploadError}
                            </div>
                        )}
                        
                        <Button 
                            onClick={handleStep1Continue} 
                            disabled={uploading} 
                            className="w-full"
                        >
                            {uploading ? "Uploading..." : "Continue to Configure"}
                        </Button>
                    </div>
                )}

                {/* STEP 2: CONFIGURE */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="p-3 bg-muted rounded border border-border">
                            <Label className="text-xs text-muted-foreground">Source</Label>
                            <p className="font-mono text-sm truncate">{sourceUrl}</p>
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Variations</Label>
                            <Input 
                                type="number" 
                                min={1} 
                                max={50} 
                                value={variations} 
                                onChange={e => setVariations(Math.max(1, parseInt(e.target.value) || 1))}
                                className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">Deterministic render count. No presets.</p>
                        </div>
                        
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                                Back
                            </Button>
                            <Button onClick={() => setStep(3)} className="flex-1">
                                Review
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 3: REVIEW */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div className="space-y-3 p-4 bg-muted/50 rounded border border-border">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Source:</span>
                                <span className="font-mono truncate max-w-[250px]">{sourceUrl}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Variations:</span>
                                <span className="font-mono">{variations}</span>
                            </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground text-center">
                            No edits allowed. Verify configuration before proceeding.
                        </p>
                        
                        {submitError && (
                            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive font-mono">
                                {submitError}
                            </div>
                        )}
                        
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep(2)} className="flex-1" disabled={isSubmitting}>
                                Back
                            </Button>
                            <Button onClick={handleStartRendering} className="flex-1" disabled={isSubmitting}>
                                {isSubmitting ? "Submitting..." : "Start Rendering"}
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 4: EXECUTION */}
                {step === 4 && (
                    <div className="space-y-4">
                        {/* Form disabled indicator */}
                        <div className="text-xs text-muted-foreground text-center uppercase tracking-wide">
                            {allDone ? "Execution Complete" : "Executing — Polling Backend"}
                        </div>
                        
                        {/* Job list from API */}
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {jobs.map(job => (
                                <div key={job.id} className="p-3 border border-border rounded bg-muted/30 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-mono text-xs">{job.id}</span>
                                        <JobStatusBadge state={job.state} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Progress value={job.progress_pct} className="h-2 flex-1" />
                                        <span className="text-xs font-mono w-10 text-right">{job.progress_pct}%</span>
                                    </div>
                                    {job.error && (
                                        <div className="text-xs text-destructive font-mono flex items-center gap-1">
                                            <AlertCircle size={12} />
                                            {job.error.message}
                                        </div>
                                    )}
                                    {job.state === 'done' && job.output && (
                                        <a 
                                            href={job.output.output_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                        >
                                            <Download size={12} /> Download ({(job.output.file_size / 1024 / 1024).toFixed(2)} MB)
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        {/* Status summary from API state */}
                        {allDone && (
                            <div className={`p-3 rounded border text-center ${anyFailed ? 'bg-destructive/10 border-destructive/30' : 'bg-green-500/10 border-green-500/30'}`}>
                                <div className="flex items-center justify-center gap-2">
                                    {anyFailed ? (
                                        <>
                                            <AlertCircle className="h-5 w-5 text-destructive" />
                                            <span className="text-sm">Batch finished with errors</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                            <span className="text-sm">All jobs completed</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {!allDone && (
                            <p className="text-xs text-muted-foreground text-center">
                                Polling every 1000ms. Do not close window.
                            </p>
                        )}
                        
                        {allDone && (
                            <Button variant="outline" onClick={handleReset} className="w-full">
                                <RotateCcw size={14} className="mr-2" />
                                Start New Pipeline
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
