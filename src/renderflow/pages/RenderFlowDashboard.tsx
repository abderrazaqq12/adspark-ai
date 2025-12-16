import { useState } from "react";
import { JobWizard } from "../components/JobWizard";
import { JobList } from "../components/JobList";

export default function RenderFlowDashboard() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    return (
        <div className="container py-8 max-w-5xl mx-auto space-y-12">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold tracking-tight">RenderFlow Engine</h1>
                <p className="text-muted-foreground mt-2">
                    Deterministic FFmpeg Rendering Pipeline. CPU-Only. Strict Persistence.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-12">
                {/* Wizard Pipeline (Takes Center Stage) */}
                <div>
                    <JobWizard />
                </div>

                {/* Historical List */}
                <div>
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2">Recent Execution History</h2>
                    <JobList refreshTrigger={refreshTrigger} />
                </div>
            </div>
        </div>
    );
}
