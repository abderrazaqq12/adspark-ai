import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { RenderFlowApi, RenderFlowJob } from "../api";
import { JobStatusBadge } from "../components/JobStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download, RefreshCw, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RenderFlowJobDetail() {
    const { id } = useParams();
    const [job, setJob] = useState<RenderFlowJob | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchJob = async () => {
        if (!id) return;
        try {
            // Direct API call via our client
            const data = await RenderFlowApi.getJobStatus(id);
            setJob(data);
            setError("");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Poll
    useEffect(() => {
        fetchJob();
        const interval = setInterval(fetchJob, 1000);
        return () => clearInterval(interval);
    }, [id]);

    if (loading && !job) return <div className="p-8 text-center">Loading Job...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;
    if (!job) return <div className="p-8 text-center">Job Not Found</div>;

    return (
        <div className="container py-8 max-w-4xl mx-auto space-y-6">

            {/* Nav */}
            <Link to="/renderflow">
                <Button variant="ghost" size="sm" className="pl-0 text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>
            </Link>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Job {job.id}</h1>
                    <div className="text-sm text-muted-foreground mt-1">
                        Created: {new Date(job.created_at).toLocaleString()}
                    </div>
                </div>
                <JobStatusBadge state={job.state} />
            </div>

            {/* Progress Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Progress Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {job.error ? (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Job Failed</AlertTitle>
                            <AlertDescription>{job.error.message}</AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Current State: <span className="font-medium uppercase">{job.state}</span></span>
                                <span>{job.progress_pct}%</span>
                            </div>
                            <Progress value={job.progress_pct} className="h-3" />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Output Section */}
            {job.state === 'done' && job.output && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Final Output</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                            <video
                                src={job.output.output_url}
                                controls
                                className="w-full h-full object-contain"
                            />
                        </div>

                        <div className="flex justify-between items-center text-sm border p-3 rounded bg-muted/20">
                            <div className="space-y-1">
                                <div><strong>File:</strong> {job.output.output_url.split('/').pop()}</div>
                                <div><strong>Size:</strong> {(job.output.file_size / 1024 / 1024).toFixed(2)} MB</div>
                                <div><strong>Duration:</strong> {(job.output.duration_ms / 1000).toFixed(1)}s</div>
                            </div>
                            <Button asChild variant="outline">
                                <a href={job.output.output_url} download>
                                    <Download className="mr-2 h-4 w-4" /> Download MP4
                                </a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}
