/**
 * Creative Scale - Execution Debug Types & Utilities
 * Deep visibility into rendering pipeline for diagnostics
 */

import type { Capability, EngineId, CapabilityRouterResult } from './capability-router';

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

export interface RoutingDebugEvent extends ExecutionTraceEvent {
  eventType: 'routing';
  data: {
    variationIndex: number;
    requiredCapabilities: Capability[];
    enginesEvaluated: EngineEvaluation[];
    selectedEngine: EngineId;
    executionPath: EngineId[];
    allowCloudFallback: boolean;
  };
}

export interface EngineEvaluation {
  engineId: EngineId;
  engineName: string;
  evaluated: boolean;
  canHandle: boolean;
  rejectionReason?: string;
  priority: number;
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
      hasExecutionPlan: boolean;
      inputFileUrl: string;
      timelineSegments: number;
      audioTracks: number;
      outputFormat: string;
    };
    timeoutMs: number;
    retryCount: number;
    isMisrouting: boolean;
    misroutingError?: string;
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
    httpStatus?: number;
    httpStatusText?: string;
    contentType?: string;
    isJsonResponse: boolean;
    rawResponsePreview?: string;
    jsonParseError?: string;
    connectionError?: string;
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
    partialVariations: number[];
    rootCause: string;
    nextAction: string;
    totalDurationMs: number;
    fallbackChainSummary: string[];
  };
}

// ============================================
// DEBUG STATE
// ============================================

export interface VariationDebugState {
  variationIndex: number;
  planId: string;
  routing: {
    status: 'pending' | 'success' | 'error';
    requiredCapabilities: Capability[];
    selectedEngine: EngineId | null;
    engineEvaluations: EngineEvaluation[];
    executionPath: EngineId[];
  };
  serverFFmpeg: {
    status: 'pending' | 'dispatched' | 'success' | 'error' | 'skipped';
    endpoint: string | null;
    httpStatus: number | null;
    contentType: string | null;
    responsePreview: string | null;
    errorReason: string | null;
    durationMs: number | null;
  };
  cloudinary: {
    status: 'pending' | 'dispatched' | 'success' | 'error' | 'skipped';
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
    console.log('[ExecutionDebug] Session started:', triggerEvent.data);
    this.notifyListeners();

    return sessionId;
  }

  private createVariationState(index: number): VariationDebugState {
    return {
      variationIndex: index,
      planId: '',
      routing: {
        status: 'pending',
        requiredCapabilities: [],
        selectedEngine: null,
        engineEvaluations: [],
        executionPath: [],
      },
      serverFFmpeg: {
        status: 'pending',
        endpoint: null,
        httpStatus: null,
        contentType: null,
        responsePreview: null,
        errorReason: null,
        durationMs: null,
      },
      cloudinary: {
        status: 'pending',
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

  logRouting(
    variationIndex: number,
    planId: string,
    routingResult: CapabilityRouterResult,
    engineEvaluations: EngineEvaluation[]
  ): void {
    if (!this.state) return;

    const variation = this.state.variations[variationIndex];
    if (!variation) return;

    variation.planId = planId;
    variation.routing = {
      status: 'success',
      requiredCapabilities: [...routingResult.requiredCapabilities.capabilities],
      selectedEngine: routingResult.selection.selectedEngineId,
      engineEvaluations,
      executionPath: routingResult.executionPath,
    };

    const event: RoutingDebugEvent = {
      timestamp: new Date().toISOString(),
      eventType: 'routing',
      variationIndex,
      data: {
        variationIndex,
        requiredCapabilities: [...routingResult.requiredCapabilities.capabilities],
        enginesEvaluated: engineEvaluations,
        selectedEngine: routingResult.selection.selectedEngineId,
        executionPath: routingResult.executionPath,
        allowCloudFallback: routingResult.selection.allowCloudFallback,
      },
    };

    this.state.events.push(event);
    console.log('[ExecutionDebug] Routing:', event.data);
    this.notifyListeners();
  }

  logEngineDispatch(
    variationIndex: number,
    engineId: EngineId,
    endpoint: string,
    method: string,
    payloadSummary: EngineDispatchEvent['data']['payloadSummary'],
    timeoutMs: number = 30000
  ): void {
    if (!this.state) return;

    const variation = this.state.variations[variationIndex];
    if (!variation) return;

    // Check for misrouting (fal.ai or browser FFmpeg)
    const isMisrouting = endpoint.includes('fal.ai') || endpoint.includes('fal.run') ||
      endpoint.includes('wasm') || endpoint.includes('ffmpeg-core');

    if (engineId === 'server_ffmpeg') {
      variation.serverFFmpeg.status = 'dispatched';
      variation.serverFFmpeg.endpoint = endpoint;
    } else if (engineId === 'cloudinary') {
      variation.cloudinary.status = 'dispatched';
    }

    const event: EngineDispatchEvent = {
      timestamp: new Date().toISOString(),
      eventType: 'engine_dispatch',
      variationIndex,
      data: {
        variationIndex,
        engineId,
        engineName: this.getEngineName(engineId),
        targetEndpoint: endpoint,
        httpMethod: method,
        payloadSummary,
        timeoutMs,
        retryCount: 0,
        isMisrouting,
        misroutingError: isMisrouting
          ? `CRITICAL MISROUTING: External engine called while ${engineId} selected. Endpoint: ${endpoint}`
          : undefined,
      },
    };

    this.state.events.push(event);

    if (isMisrouting) {
      console.error('[ExecutionDebug] CRITICAL MISROUTING:', event.data);
    } else {
      console.log('[ExecutionDebug] Engine dispatch:', event.data);
    }

    this.notifyListeners();
  }

  logNetworkResponse(
    variationIndex: number,
    engineId: EngineId,
    details: {
      endpoint: string;
      method: string;
      requestSentAt: string;
      httpStatus?: number;
      httpStatusText?: string;
      contentType?: string;
      rawResponseBody?: string;
      jsonParseError?: string;
      connectionError?: string;
      durationMs: number;
    }
  ): void {
    if (!this.state) return;

    const variation = this.state.variations[variationIndex];
    if (!variation) return;

    const isJsonResponse = details.contentType?.includes('application/json') || false;
    const responsePreview = details.rawResponseBody?.substring(0, 500) || null;

    if (engineId === 'server_ffmpeg') {
      variation.serverFFmpeg.httpStatus = details.httpStatus || null;
      variation.serverFFmpeg.contentType = details.contentType || null;
      variation.serverFFmpeg.responsePreview = responsePreview;
      variation.serverFFmpeg.durationMs = details.durationMs;

      if (details.connectionError || details.jsonParseError || (details.httpStatus && details.httpStatus >= 400)) {
        variation.serverFFmpeg.status = 'error';
        variation.serverFFmpeg.errorReason = this.formatErrorReason(details);
      }
    } else if (engineId === 'cloudinary') {
      variation.cloudinary.durationMs = details.durationMs;
      if (details.connectionError || details.jsonParseError || (details.httpStatus && details.httpStatus >= 400)) {
        variation.cloudinary.status = 'error';
        variation.cloudinary.errorReason = this.formatErrorReason(details);
      }
    }

    const event: NetworkDebugEvent = {
      timestamp: new Date().toISOString(),
      eventType: 'network',
      variationIndex,
      data: {
        variationIndex,
        engineId,
        endpoint: details.endpoint,
        method: details.method,
        requestSentAt: details.requestSentAt,
        responseReceivedAt: new Date().toISOString(),
        durationMs: details.durationMs,
        httpStatus: details.httpStatus,
        httpStatusText: details.httpStatusText,
        contentType: details.contentType,
        isJsonResponse,
        rawResponsePreview: responsePreview || undefined,
        jsonParseError: details.jsonParseError,
        connectionError: details.connectionError,
      },
    };

    this.state.events.push(event);
    console.log('[ExecutionDebug] Network response:', event.data);
    this.notifyListeners();
  }

  private formatErrorReason(details: {
    httpStatus?: number;
    httpStatusText?: string;
    contentType?: string;
    jsonParseError?: string;
    connectionError?: string;
    rawResponseBody?: string;
  }): string {
    if (details.connectionError) {
      return `Connection failed: ${details.connectionError}`;
    }
    if (details.jsonParseError) {
      return `CRITICAL: Misconfigured Backend/Proxy. Received ${details.contentType || 'unknown'} instead of JSON. Raw: ${details.rawResponseBody?.substring(0, 50)}`;
    }
    if (details.httpStatus === 502) {
      return `502 Bad Gateway - Server unreachable or Nginx proxy misconfigured`;
    }
    if (details.httpStatus === 404) {
      return `404 Not Found - API endpoint does not exist`;
    }
    if (details.httpStatus === 500) {
      return `500 Internal Server Error - Server crashed or FFmpeg binary failed`;
    }
    if (details.httpStatus && details.httpStatus >= 400) {
      return `HTTP ${details.httpStatus} ${details.httpStatusText || ''}`;
    }
    return 'Unknown error';
  }

  logVariationComplete(
    variationIndex: number,
    result: {
      status: 'success' | 'partial' | 'plan_only' | 'failed';
      engineUsed: EngineId;
      videoUrl?: string;
      errorReason?: string;
    }
  ): void {
    if (!this.state) return;

    const variation = this.state.variations[variationIndex];
    if (!variation) return;

    variation.finalResult = {
      status: result.status === 'plan_only' ? 'partial' : result.status,
      engineUsed: result.engineUsed,
      videoUrl: result.videoUrl || null,
      errorReason: result.errorReason || null,
    };

    // Update engine statuses
    if (result.engineUsed === 'server_ffmpeg' && result.status === 'success') {
      variation.serverFFmpeg.status = 'success';
    }
    if (result.engineUsed === 'cloudinary' && result.status === 'success') {
      variation.cloudinary.status = 'success';
    }
    if (result.status === 'failed' || result.status === 'plan_only') {
      if (variation.serverFFmpeg.status !== 'success') {
        variation.serverFFmpeg.status = variation.serverFFmpeg.status === 'dispatched' ? 'error' : 'skipped';
      }
    }

    this.notifyListeners();
  }

  completeSession(): void {
    if (!this.state) return;

    const successful = this.state.variations
      .filter(v => v.finalResult.status === 'success')
      .map(v => v.variationIndex);

    const failed = this.state.variations
      .filter(v => v.finalResult.status === 'failed')
      .map(v => v.variationIndex);

    const partial = this.state.variations
      .filter(v => v.finalResult.status === 'partial')
      .map(v => v.variationIndex);

    // Determine root cause from first failure
    const firstFailure = this.state.variations.find(v => v.finalResult.status === 'failed');
    let rootCause = 'Unknown';
    let nextAction = 'Check server logs';

    if (firstFailure) {
      if (firstFailure.serverFFmpeg.errorReason) {
        rootCause = firstFailure.serverFFmpeg.errorReason;
        if (rootCause.includes('502')) {
          nextAction = 'Check VPS Node server status and Nginx proxy configuration';
        } else if (rootCause.includes('404')) {
          nextAction = 'Verify /api/execute endpoint exists in server/api.js';
        } else if (rootCause.includes('Non-JSON')) {
          nextAction = 'Check Nginx error logs - likely serving HTML error page';
        }
      }
    }

    const summary: ExecutionSummaryEvent['data'] = {
      uiAction: `Generate ${this.state.totalVariations} Videos`,
      selectedEngine: this.state.variations[0]?.routing.selectedEngine || 'plan_export',
      totalVariations: this.state.totalVariations,
      successfulVariations: successful,
      failedVariations: failed,
      partialVariations: partial,
      rootCause,
      nextAction,
      totalDurationMs: Date.now() - new Date(this.state.startedAt).getTime(),
      fallbackChainSummary: this.state.variations.map(v =>
        `Var ${v.variationIndex + 1}: ${v.routing.executionPath.join(' → ')} → ${v.finalResult.status}`
      ),
    };

    this.state.summary = summary;
    this.state.isComplete = true;

    const event: ExecutionSummaryEvent = {
      timestamp: new Date().toISOString(),
      eventType: 'summary',
      data: summary,
    };

    this.state.events.push(event);
    console.log('[ExecutionDebug] Session complete:', summary);
    this.notifyListeners();
  }

  private getEngineName(engineId: EngineId): string {
    const names: Record<EngineId, string> = {
      cloudinary: 'Cloudinary Video API',
      server_ffmpeg: 'Server FFmpeg (VPS)',
      plan_export: 'Plan Export',
    };
    return names[engineId] || engineId;
  }

  getState(): ExecutionDebugState | null {
    return this.state;
  }

  subscribe(listener: (state: ExecutionDebugState) => void): () => void {
    this.listeners.add(listener);
    if (this.state) {
      listener(this.state);
    }
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    if (!this.state) return;
    this.listeners.forEach(listener => listener(this.state!));
  }

  reset(): void {
    this.state = null;
    this.notifyListeners();
  }
}

export const executionDebugLogger = new ExecutionDebugLogger();
