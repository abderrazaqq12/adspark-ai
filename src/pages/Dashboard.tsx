/**
 * DASHBOARD - Production Control Center
 * 
 * This is NOT a navigation or marketing page.
 * This is a real-time operational dashboard for monitoring system health,
 * active jobs, failures, and making operational decisions.
 * 
 * CORE QUESTIONS THIS ANSWERS:
 * 1. Is my system healthy right now?
 * 2. What is running?
 * 3. What failed?
 * 4. What needs my attention?
 * 5. Where is money/time being spent?
 */

import { 
  SystemStatusPanel,
  LiveOperationsPanel,
  OperationalMetricsPanel,
  AttentionQueuePanel,
  PrimaryActionsPanel
} from '@/components/dashboard';

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Page Header - Minimal */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Control Center</h1>
          <p className="text-sm text-muted-foreground">
            Real-time system monitoring and operations
          </p>
        </div>
      </div>

      {/* 1. SYSTEM STATUS - Always visible at top */}
      <SystemStatusPanel />

      {/* 2. PRIMARY ACTIONS - Task-oriented entry */}
      <PrimaryActionsPanel />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. LIVE OPERATIONS - Active and failed jobs */}
        <LiveOperationsPanel />

        {/* 5. ATTENTION QUEUE - Blocking issues */}
        <AttentionQueuePanel />
      </div>

      {/* 4. COST & PERFORMANCE - Operational metrics */}
      <OperationalMetricsPanel />
    </div>
  );
}
