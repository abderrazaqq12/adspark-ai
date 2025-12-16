import { useEffect, useState } from "react";
import { RenderFlowApi, RenderFlowJob } from "../api";
import { JobStatusBadge } from "./JobStatusBadge";
import { Download, AlertCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export const JobList = () => {
    const [jobs, setJobs] = useState<RenderFlowJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Strict 1-second polling
    useEffect(() => {
        let mounted = true;

        const fetchJobs = async () => {
            try {
                const res = await RenderFlowApi.getHistory();
                if (mounted) {
                    setJobs(res.jobs || []);
                    setError(null);
                }
            } catch (e: any) {
                if (mounted) {
                    setError(e.message);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchJobs();
        const interval = setInterval(fetchJobs, 1000);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    if (loading) {
        return (
            <div className="text-center py-8 text-muted-foreground text-sm font-mono">
                Loading history...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive font-mono">
                <div className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>Failed to fetch history: {error}</span>
                </div>
            </div>
        );
    }

    if (jobs.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground text-sm">
                No jobs found. Start a new render.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border text-left">
                        <th className="py-3 px-2 font-medium text-muted-foreground">Job ID</th>
                        <th className="py-3 px-2 font-medium text-muted-foreground">State</th>
                        <th className="py-3 px-2 font-medium text-muted-foreground">Progress</th>
                        <th className="py-3 px-2 font-medium text-muted-foreground">Created At</th>
                        <th className="py-3 px-2 font-medium text-muted-foreground">Completed At</th>
                        <th className="py-3 px-2 font-medium text-muted-foreground">Result</th>
                        <th className="py-3 px-2 font-medium text-muted-foreground">Error</th>
                    </tr>
                </thead>
                <tbody>
                    {jobs.map(job => (
                        <tr key={job.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-3 px-2">
                                <Link 
                                    to={`/renderflow/jobs/${job.id}`}
                                    className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                    {job.id.slice(0, 12)}...
                                    <ExternalLink size={10} />
                                </Link>
                            </td>
                            <td className="py-3 px-2">
                                <JobStatusBadge state={job.state} />
                            </td>
                            <td className="py-3 px-2 font-mono text-xs">
                                {job.progress_pct}%
                            </td>
                            <td className="py-3 px-2 font-mono text-xs text-muted-foreground">
                                {job.created_at ? new Date(job.created_at).toLocaleString() : '-'}
                            </td>
                            <td className="py-3 px-2 font-mono text-xs text-muted-foreground">
                                {job.completed_at ? new Date(job.completed_at).toLocaleString() : '-'}
                            </td>
                            <td className="py-3 px-2">
                                {job.state === 'done' && job.output ? (
                                    <a 
                                        href={job.output.output_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                    >
                                        <Download size={12} /> Download
                                    </a>
                                ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                )}
                            </td>
                            <td className="py-3 px-2">
                                {job.error ? (
                                    <span className="text-xs text-destructive font-mono">
                                        {job.error.message}
                                    </span>
                                ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
