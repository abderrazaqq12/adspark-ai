/**
 * DASHBOARD - Production Operational Dashboard
 * 
 * This is a READ-ONLY operational awareness dashboard.
 * It answers ONE question: "What is happening right now in my system?"
 * 
 * ARCHITECTURAL CONTRACT:
 * 1. NOT a duplicate of sidebar navigation
 * 2. READ-ONLY - No creation flows, no configuration
 * 3. GLOBAL and CONTEXT-AWARE - Reflects active project and system health
 * 
 * SECTIONS:
 * 1. System Status Bar - VPS, FFmpeg, GPU, Queue, Storage
 * 2. Active Project Snapshot - Current project context
 * 3. Live Pipeline Activity - Running and failed jobs
 * 4. Cost & Usage Snapshot - AI costs with breakdown
 * 5. Recent Outputs - Last 5 generated files
 */

import { 
  SystemStatusBar,
  ActiveProjectSnapshot,
  LivePipelineActivity,
  CostUsageSnapshot,
  RecentOutputs
} from '@/components/dashboard';

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Page Header - Minimal */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Real-time system overview
        </p>
      </div>

      {/* SECTION 1 - System Status Bar (Always Visible) */}
      <SystemStatusBar />

      {/* SECTION 2 - Active Project Snapshot */}
      <ActiveProjectSnapshot />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 3 - Live Pipeline Activity */}
        <LivePipelineActivity />

        {/* SECTION 4 - Cost & Usage Snapshot */}
        <CostUsageSnapshot />
      </div>

      {/* SECTION 5 - Recent Outputs */}
      <RecentOutputs />
    </div>
  );
}