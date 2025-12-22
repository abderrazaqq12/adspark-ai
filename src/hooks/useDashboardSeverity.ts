/**
 * Dashboard Severity Hook
 * Aggregates severity signals from all dashboard components
 * 
 * SEVERITY LEVELS:
 * - healthy (green): All systems operational
 * - warning (yellow): Non-blocking issues exist
 * - critical (red): Blocking issues require attention
 */

import { create } from 'zustand';

export type SeverityLevel = 'healthy' | 'warning' | 'critical';

export interface SeveritySignal {
  id: string;
  component: string;
  level: SeverityLevel;
  message: string;
  blocksOutput?: boolean;
}

interface DashboardSeverityState {
  signals: SeveritySignal[];
  addSignal: (signal: SeveritySignal) => void;
  removeSignal: (id: string) => void;
  clearComponent: (component: string) => void;
  getAggregatedSeverity: () => SeverityLevel;
  getCriticalSignals: () => SeveritySignal[];
  getWarningSignals: () => SeveritySignal[];
}

export const useDashboardSeverity = create<DashboardSeverityState>((set, get) => ({
  signals: [],
  
  addSignal: (signal) => {
    set((state) => {
      // Replace existing signal with same id
      const filtered = state.signals.filter((s) => s.id !== signal.id);
      return { signals: [...filtered, signal] };
    });
  },
  
  removeSignal: (id) => {
    set((state) => ({
      signals: state.signals.filter((s) => s.id !== id)
    }));
  },
  
  clearComponent: (component) => {
    set((state) => ({
      signals: state.signals.filter((s) => s.component !== component)
    }));
  },
  
  getAggregatedSeverity: () => {
    const { signals } = get();
    if (signals.some((s) => s.level === 'critical')) return 'critical';
    if (signals.some((s) => s.level === 'warning')) return 'warning';
    return 'healthy';
  },
  
  getCriticalSignals: () => {
    return get().signals.filter((s) => s.level === 'critical');
  },
  
  getWarningSignals: () => {
    return get().signals.filter((s) => s.level === 'warning');
  }
}));
