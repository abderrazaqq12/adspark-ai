/**
 * DASHBOARD - Premium Operator Dashboard
 * 
 * High-density, operator-grade dashboard for at-a-glance understanding.
 * Matches professional SaaS references with compact KPI row, activity table, charts.
 */

import {
  SystemStatusBar,
  ActiveProjectSnapshot,
  LivePipelineActivity,
  CostUsageSnapshot,
  RecentOutputs,
  ActiveJobsProgress,
  KPIRow
} from '@/components/dashboard';
import { Video, DollarSign, Zap, HardDrive } from 'lucide-react';

export default function Dashboard() {
  // Sample KPI data - would come from hooks in production
  const kpis = [
    {
      label: 'Videos Generated',
      value: '1,247',
      icon: <Video className="w-3.5 h-3.5" />,
      trend: { value: 12, direction: 'up' as const },
      sparkline: [3, 5, 4, 7, 8, 6, 9, 11]
    },
    {
      label: 'Credits Left',
      value: '$42.50',
      icon: <DollarSign className="w-3.5 h-3.5" />,
      trend: { value: 8, direction: 'down' as const }
    },
    {
      label: 'Active Jobs',
      value: '3',
      icon: <Zap className="w-3.5 h-3.5" />,
      trend: { value: 0, direction: 'neutral' as const }
    },
    {
      label: 'Storage Used',
      value: '847 MB',
      icon: <HardDrive className="w-3.5 h-3.5" />,
      trend: { value: 5, direction: 'up' as const }
    },
  ];

  return (
    <div className="p-4 space-y-4 animate-fade-in h-[calc(100vh-3.5rem)] overflow-y-auto scrollbar-thin">
      {/* Page Header - Compact */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title">Dashboard</h1>
          <p className="text-caption">Real-time system overview</p>
        </div>
        {/* System Status Bar inline */}
        <SystemStatusBar />
      </div>

      {/* KPI Row - Compact 4-column */}
      <KPIRow kpis={kpis} />

      {/* Active Project + Jobs Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <ActiveProjectSnapshot />
        </div>
        <ActiveJobsProgress />
      </div>

      {/* Main Grid - Pipeline + Cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <LivePipelineActivity />
        <CostUsageSnapshot />
      </div>

      {/* Recent Outputs */}
      <RecentOutputs />
    </div>
  );
}
