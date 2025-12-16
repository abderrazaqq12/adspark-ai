/**
 * Creative Scale - Execution Debug Types & Utilities
 * Deep visibility into rendering pipeline for diagnostics
 */

import type { EngineId } from './execution-engine';

// ============================================
// DEBUG EVENT TYPES
// ============================================

export interface ExecutionTraceEvent {
  timestamp: string;
  eventType: 'ui_trigger' | 'routing' | 'engine_dispatch' | 'network' | 'response' | 'error' | 'summary';
  variationIndex?: number;
  data: Record<string, unknown>;
}

export interface UITriggerEvent extends ExecutionTraceEvent {
  eventType: 'ui_trigger';
  data: {
    eventName: string;
    sessionId: string;
    variationsCount: number;
    timestamp: string;
  };
}

// Keeping RoutingEvent for backward compat/completeness, though mostly irrelevant now
export interface RoutingDebugEvent extends ExecutionTraceEvent {
  eventType: 'routing';
  data: {
    variationIndex: number;
    selectedEngine: EngineId;
    executionPath: EngineId[];
  };
}

export interface EngineDispatchEvent extends ExecutionTraceEvent {
  eventType: 'engine_dispatch';
  data: {
    variationIndex: number;
    engineId: EngineId;
    engineName: string;
    targetEndpoint: string;
    httpMethod: string;
    payloadSummary: {
      planSegments: number;
      audioTracks: number;
    };
  };
}

export interface NetworkDebugEvent extends ExecutionTraceEvent {
  eventType: 'network';
  data: {
    variationIndex: number;
    engineId: EngineId;
    endpoint: string;
    method: string;
    requestSentAt: string;
    responseReceivedAt?: string;
    durationMs?: number;
    error?: string;
  };
}

export interface ExecutionSummaryEvent extends ExecutionTraceEvent {
  eventType: 'summary';
  data: {
    uiAction: string;
    selectedEngine: EngineId;
    totalVariations: number;
    successfulVariations: number[];
    failedVariations: number[];
    rootCause: string;
    totalDurationMs: number;
  };
}

// ============================================
// DEBUG STATE
// ============================================

export interface VariationDebugState {
  variationIndex: number;
  planId: string;
  jobId: string | null;
  unifiedServer: {
    status: 'pending' | 'dispatched' | 'success' | 'error';
    jobId: string | null;
    errorReason: string | null;
    durationMs: number | null;
  };
  finalResult: {
    status: 'pending' | 'success' | 'partial' | 'failed';
    engineUsed: EngineId | null;
    videoUrl: string | null;
    errorReason: string | null;
  };
}

export interface ExecutionDebugState {
  sessionId: string;
  startedAt: string;
  totalVariations: number;
  variations: VariationDebugState[];
  events: ExecutionTraceEvent[];
  summary: ExecutionSummaryEvent['data'] | null;
  isComplete: boolean;
}

// ============================================
// DEBUG LOGGER
// ============================================

class ExecutionDebugLogger {
  private state: ExecutionDebugState | null = null;
  private listeners: Set<(state: ExecutionDebugState) => void> = new Set();

  startSession(variationsCount: number): string {
    const sessionId = `debug_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    this.state = {
      sessionId,
      startedAt: new Date().toISOString(),
      totalVariations: variationsCount,
      variations: Array.from({ length: variationsCount }, (_, i) => this.createVariationState(i)),
      events: [],
      summary: null,
      isComplete: false,
    };

    const triggerEvent: UITriggerEvent = {
      timestamp: new Date().toISOString(),
      eventType: 'ui_trigger',
      data: {
        eventName: 'CreativeScale.GenerateVideos.Click',
        sessionId,
        variationsCount,
        timestamp: new Date().toISOString(),
      },
    };

    this.state.events.push(triggerEvent);
    this.notifyListeners();
    return sessionId;
  }

  private createVariationState(index: number): VariationDebugState {
    return {
      variationIndex: index,
      planId: '',
      jobId: null,
      unifiedServer: {
        status: 'pending',
        jobId: null,
        errorReason: null,
        durationMs: null,
      },
      finalResult: {
        status: 'pending',
        engineUsed: null,
        videoUrl: null,
        errorReason: null,
      },
    };
  }

  logEngineDispatch(
    variationIndex: number,
    engineId: EngineId,
    endpoint: string,
    method: string,
    payloadSummary: EngineDispatchEvent['data']['payloadSummary']
  ): void {
    if (!this.state) return;

    if (engineId === 'unified_server') {
      const v = this.state.variations[variationIndex];
      if (v) v.unifiedServer.status = 'dispatched';
    }

    const event: EngineDispatchEvent = {
      timestamp: new Date().toISOString(),
      eventType: 'engine_dispatch',
      variationIndex,
      data: {
        variationIndex,
        engineId,
        engineName: 'Unified VPS Engine',
        targetEndpoint: endpoint,
        httpMethod: method,
        payloadSummary
      },
    };
    this.state.events.push(event);
    this.notifyListeners();
  }

  logEngineError(
    variationIndex: number,
    engineId: EngineId,
    errorMessage: string,
    stack?: string
  ): void {
    if (!this.state) return;
    const v = this.state.variations[variationIndex];
    if (v && engineId === 'unified_server') {
      v.unifiedServer.status = 'error';
      v.unifiedServer.errorReason = errorMessage;
    }

    const event: ExecutionTraceEvent = {
      timestamp: new Date().toISOString(),
      eventType: 'error',
      variationIndex,
      data: {
        engineId,
        message: errorMessage,
        stack
      }
    };
    this.state.events.push(event);
    this.notifyListeners();
  }

  // No-op for now as we removed capability router, but kept for method signature compat if needed (though avoiding calls is better)
  logRouting(): void { }

  setJobId(variationIndex: number, jobId: string): void {
    if (!this.state) return;
    const v = this.state.variations[variationIndex];
    if (v) {
      v.jobId = jobId;
      v.unifiedServer.jobId = jobId;
    }
    this.notifyListeners();
  }

  completeSession(): void {
    if (!this.state) return;
    this.state.isComplete = true;
    // Basic summary logic
    const successful = this.state.variations.filter(v => v.finalResult.status === 'success').map(v => v.variationIndex);
    const failed = this.state.variations.filter(v => v.finalResult.status === 'failed').map(v => v.variationIndex);

    const summary: ExecutionSummaryEvent['data'] = {
      uiAction: `Generate ${this.state.totalVariations}`,
      selectedEngine: 'unified_server',
      totalVariations: this.state.totalVariations,
      successfulVariations: successful,
      failedVariations: failed,
      rootCause: failed.length > 0 ? 'VPS Error' : '',
      totalDurationMs: Date.now() - new Date(this.state.startedAt).getTime()
    }

    this.state.summary = summary;
    this.notifyListeners();
  }

  subscribe(listener: (state: ExecutionDebugState) => void): () => void {
    this.listeners.add(listener);
    if (this.state) listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    if (!this.state) return;
    this.listeners.forEach(listener => listener(this.state!));
  }
}

export const executionDebugLogger = new ExecutionDebugLogger();
