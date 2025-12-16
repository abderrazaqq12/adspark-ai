import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RenderFlowApi, RenderFlowJob } from "../api";
import { JobStatusBadge } from "./JobStatusBadge";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const JobList = ({ refreshTrigger }: { refreshTrigger: number }) => {
    const [jobs, setJobs] = useState<RenderFlowJob[]>([]);
    const [loading, setLoading] = useState(true);

    // Poll for job updates
    useEffect(() => {
        // Initial Fetch (Mocked list mostly, but in v1 we need an endpoint to LIST jobs)
        // Wait, the API spec only had POST /jobs and GET /jobs/:id.
        // We need a list endpoint! 
        // Checking server/renderflow/api.ts... it DOES NOT have list jobs end point.
        // Critical Gap.
        // I will add GET /jobs (List all) to server/renderflow/api.ts immediately after this file creation.
        // For now, I will implement clientside assuming it exists.

        const fetchJobs = async () => {
            try {
                const res = await fetch('/api/render/renderflow/jobs');
                if (res.ok) {
                    const data = await res.json();
                    setJobs(data.jobs || []);
                }
            } catch (e) { console.error("Poll error", e); }
            setLoading(false);
        };

        fetchJobs();
        const interval = setInterval(fetchJobs, 1000); // 1s Poll
        return () => clearInterval(interval);
    }, [refreshTrigger]);

    return (
        <div className="space-y-4">
            {jobs.length === 0 && !loading && (
                <div className="text-center p-8 text-gray-500 text-sm">No jobs found. Start a new render.</div>
            )}

            {jobs.map(job => (
                <Card key={job.id} className="overflow-hidden border-l-4 border-l-primary/20">
                    <CardContent className="p-4 grid grid-cols-12 gap-4 items-center">

                        {/* ID & Time */}
                        <div className="col-span-3">
                            <div className="font-mono text-xs text-muted-foreground">{job.id.slice(0, 8)}...</div>
                            <div className="text-xs text-gray-500">{new Date(job.created_at).toLocaleTimeString()}</div>
                        </div>

                        {/* Status */}
                        <div className="col-span-2 text-center">
                            <JobStatusBadge state={job.state} />
                        </div>

                        {/* Progress */}
                        <div className="col-span-5 space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>Progress</span>
                                <span>{job.progress_pct}%</span>
                            </div>
                            <Progress value={job.progress_pct} className="h-2" />
                            {job.error && (
                                <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <AlertCircle size={10} /> {job.error.message}
                                </div>
                            )}
                        </div>

                        {/* Action */}
                        <div className="col-span-2 text-right">
                            <Button variant="outline" size="sm" asChild>
                                {/* Link to Detail Page */}
                                <div onClick={() => window.location.href = `/renderflow/jobs/${job.id}`} className="cursor-pointer flex items-center">
                                    <ExternalLink className="mr-2 h-3 w-3" /> Details
                                </div>
                            </Button>
                        </div>

                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
