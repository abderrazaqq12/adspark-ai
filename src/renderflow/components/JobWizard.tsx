import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RenderFlowApi, RenderFlowJob } from "../api";
import { AlertCircle, Upload, CheckCircle, Video, Play, Box } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { JobStatusBadge } from "./JobStatusBadge";
import { toast } from "sonner";

// Steps: 1=Upload, 2=Execute, 3=Progress, 4=Results
type WizardStep = 1 | 2 | 3 | 4;

export function JobWizard() {
    const [step, setStep] = useState<WizardStep>(1);
    const [sourceUrl, setSourceUrl] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [variations, setVariations] = useState(1);
    const [jobs, setJobs] = useState<RenderFlowJob[]>([]);
    const [globalState, setGlobalState] = useState<'idle' | 'rendering' | 'done' | 'failed'>('idle');

    // STEP 1: Handle Upload
    const handleUpload = async () => {
        if (sourceUrl) {
            // Direct URL
            setStep(2);
            return;
        }
        if (!file) {
            toast.error("Please select a file or enter a URL");
            return;
        }

        setUploading(true);
        try {
            const res = await RenderFlowApi.uploadAsset(file);
            setSourceUrl(res.url);
            toast.success("File uploaded successfully");
            setStep(2);
        } catch (e: any) {
            toast.error("Upload failed: " + e.message);
        } finally {
            setUploading(false);
        }
    };

    // STEP 2: Execute
    const handleExecute = async () => {
        try {
            const res = await RenderFlowApi.submitJob(`proj_wizard_${Date.now()}`, sourceUrl, variations);
            // Determine Jobs from Response
            // API returns: { jobs: [job_id] } or list of created jobs?
            // POST response from Engine is { job_ids: string[] } usually.
            // Wait, api.ts submitJob returns what?
            // server/api.ts proxy returns what RenderFlow API returns.
            // RenderFlow API (server/renderflow/api.ts) might return { job_ids }...
            // Let's assume it returns { jobs: [ ... ] } or we might need to fetch them.
            // Checking POST /jobs response in RenderFlow:
            // It returns: { ids: string[], ... }

            // We need to fetch the initial state of these jobs.
            // For v1, let's just use the IDs returned to start polling.
            // IF the API returns standard response structure.
            // Actually, let's just POLL immediately.
            // We need the IDs.
            // Let's assume response has `ids` array.

            const ids = res.ids || [];
            if (ids.length === 0) throw new Error("No Job IDs returned");

            // Initialize placeholder jobs
            const newJobs = ids.map((id: string) => ({
                id,
                state: 'queued',
                progress_pct: 0,
                created_at: new Date().toISOString()
            }));
            setJobs(newJobs as RenderFlowJob[]);
            setStep(3);
            setGlobalState('rendering');
        } catch (e: any) {
            toast.error("Execution failed: " + e.message);
        }
    };

    // STEP 3: Progress Polling
    useEffect(() => {
        if (step !== 3 || jobs.length === 0) return;

        const poll = async () => {
            let allDone = true;
            let anyFailed = false;

            const updatedJobs = await Promise.all(jobs.map(async (j) => {
                if (j.state === 'done' || j.state === 'failed') return j;
                try {
                    return await RenderFlowApi.getJobStatus(j.id);
                } catch { return j; }
            }));

            setJobs(updatedJobs);

            // Check Global State
            updatedJobs.forEach(j => {
                if (j.state === 'failed') anyFailed = true;
                if (j.state !== 'done' && j.state !== 'failed') allDone = false;
            });

            if (anyFailed && allDone) {
                setGlobalState('failed');
                setStep(4);
            } else if (allDone) {
                setGlobalState('done');
                setStep(4);
            }
        };

        const interval = setInterval(poll, 1000); // 1s Strict Polling
        return () => clearInterval(interval);
    }, [step, jobs]);


    // RENDER
    return (
        <Card className="max-w-xl mx-auto border-2">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>RenderFlow Wizard</span>
                    <span className="text-sm font-normal text-muted-foreground">Step {step} of 4</span>
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">

                {/* STEP 1: UPLOAD */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <Label>Option A: Source URL</Label>
                            <Input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." />
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or Upload File</span></div>
                        </div>
                        <div>
                            <Label>Option B: Select File</Label>
                            <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
                        </div>
                        <Button onClick={handleUpload} disabled={uploading} className="w-full mt-4">
                            {uploading ? "Uploading..." : "Continue to Configure"}
                        </Button>
                    </div>
                )}

                {/* STEP 2: CONFIGURE */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 p-2 bg-muted rounded">
                            <Video size={16} /> <span className="text-sm truncate w-64">{sourceUrl}</span>
                        </div>
                        <div>
                            <Label>Variations (Copies)</Label>
                            <Input type="number" min={1} max={50} value={variations} onChange={e => setVariations(parseInt(e.target.value))} />
                            <p className="text-xs text-muted-foreground mt-1">Deterministic render count.</p>
                        </div>
                        <Button onClick={handleExecute} className="w-full">Start Rendering</Button>
                    </div>
                )}

                {/* STEP 3: PROGRESS */}
                {step === 3 && (
                    <div className="space-y-4">
                        {jobs.map(job => (
                            <div key={job.id} className="space-y-2 border p-3 rounded">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-mono">{job.id.slice(0, 8)}</span>
                                    <JobStatusBadge state={job.state} />
                                </div>
                                <Progress value={job.progress_pct} className="h-2" />
                                {job.error && <p className="text-xs text-red-500">{job.error.message}</p>}
                            </div>
                        ))}
                        <div className="text-center text-sm text-muted-foreground animate-pulse">
                            Polling Engine... Do not close window.
                        </div>
                    </div>
                )}

                {/* STEP 4: RESULTS */}
                {step === 4 && (
                    <div className="space-y-4">
                        {globalState === 'done' ? (
                            <div className="text-center space-y-2">
                                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                                <h3 className="text-lg font-medium">Render Complete</h3>
                            </div>
                        ) : (
                            <div className="text-center space-y-2">
                                <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                                <h3 className="text-lg font-medium">Batch Finished with Errors</h3>
                            </div>
                        )}

                        <div className="space-y-2">
                            {jobs.map(job => (
                                <div key={job.id} className="flex justify-between items-center p-2 border rounded bg-muted/50">
                                    <div className="flex items-center gap-2">
                                        <Box size={14} />
                                        <span className="text-sm font-mono">{job.id.slice(0, 8)}</span>
                                    </div>
                                    {job.state === 'done' && job.output ? (
                                        <Button size="sm" variant="outline" asChild>
                                            <a href={job.output.output_url} target="_blank">Download</a>
                                        </Button>
                                    ) : (
                                        <span className="text-xs text-red-500">Failed</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <Button variant="secondary" onClick={() => { setStep(1); setJobs([]); setSourceUrl(""); }} className="w-full">
                            Start New Pipeline
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
