/**
 * RENDER BACKEND STATUS - VPS Truth Enforcement
 * 
 * This hook fetches real VPS status from backend health endpoints.
 * NO FRONTEND GUESSING - All data comes from /api/health/* endpoints.
 * 
 * Deployment mode, FFmpeg, GPU, storage all detected by backend.
 */
import { useState, useEffect } from 'react';

export interface RenderBackendStatus {
  vpsServer: {
    available: boolean;
    latency?: number;
    version?: string;
    uptime?: string;
    cpus?: number;
  };
  ffmpeg: {
    available: boolean;
    version?: string;
    gpuAcceleration?: string;
    encoders?: {
      cpu?: string;
      gpu?: string | null;
    };
  };
  gpu: {
    available: boolean;
    vendor?: string | null;
    count?: number;
    gpus?: Array<{
      name: string;
      memory: string;
      driver: string;
    }>;
  };
  storage: {
    available: boolean;
    used?: string;
    free?: string;
    total?: string;
    usagePercent?: number;
    usedBytes?: number;
    totalBytes?: number;
    availableBytes?: number;
  };
  queue: {
    active: number;
    waiting: number;
    completed: number;
    failed: number;
    failed24h: number;
  };
  deployment: {
    mode: string;
    environment: string;
    platform?: string;
  };
  loading: boolean;
}

export function useRenderBackendStatus() {
  const [status, setStatus] = useState<RenderBackendStatus>({
    vpsServer: { available: false },
    ffmpeg: { available: false },
    gpu: { available: false },
    storage: { available: false },
    queue: { active: 0, waiting: 0, completed: 0, failed: 0, failed24h: 0 },
    deployment: { mode: 'unknown', environment: 'unknown' },
    loading: true,
  });

  useEffect(() => {
    checkBackends();

    // Refresh every 30 seconds
    const interval = setInterval(checkBackends, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkBackends = async () => {
    setStatus(prev => ({ ...prev, loading: true }));

    try {
      // Fetch all health data in parallel
      const [vpsRes, ffmpegRes, gpuRes, storageRes, queueRes, deploymentRes] = await Promise.all([
        fetch('/api/health/vps', { signal: AbortSignal.timeout(5000) }).catch(() => null),
        fetch('/api/health/ffmpeg', { signal: AbortSignal.timeout(5000) }).catch(() => null),
        fetch('/api/health/gpu', { signal: AbortSignal.timeout(5000) }).catch(() => null),
        fetch('/api/health/storage', { signal: AbortSignal.timeout(5000) }).catch(() => null),
        fetch('/api/health/queue', { signal: AbortSignal.timeout(5000) }).catch(() => null),
        fetch('/api/health/deployment', { signal: AbortSignal.timeout(5000) }).catch(() => null),
      ]);

      const results: RenderBackendStatus = {
        vpsServer: { available: false },
        ffmpeg: { available: false },
        gpu: { available: false },
        storage: { available: false },
        queue: { active: 0, waiting: 0, completed: 0, failed: 0, failed24h: 0 },
        deployment: { mode: 'unknown', environment: 'unknown' },
        loading: false,
      };

      // Parse VPS data
      if (vpsRes?.ok) {
        const vpsData = await vpsRes.json();
        if (vpsData.status === 'ok' && vpsData.data) {
          results.vpsServer = {
            available: vpsData.data.available,
            uptime: vpsData.data.uptimeFormatted,
            cpus: vpsData.data.cpus,
          };
        }
      }

      // Parse FFmpeg data
      if (ffmpegRes?.ok) {
        const ffmpegData = await ffmpegRes.json();
        if (ffmpegData.status === 'ok' && ffmpegData.data) {
          results.ffmpeg = {
            available: ffmpegData.data.available,
            version: ffmpegData.data.version,
            gpuAcceleration: ffmpegData.data.gpuAcceleration,
            encoders: ffmpegData.data.encoders,
          };
        }
      }

      // Parse GPU data
      if (gpuRes?.ok) {
        const gpuData = await gpuRes.json();
        if (gpuData.status === 'ok' && gpuData.data) {
          results.gpu = {
            available: gpuData.data.available,
            vendor: gpuData.data.vendor,
            count: gpuData.data.count,
            gpus: gpuData.data.gpus,
          };
        }
      }

      // Parse Storage data
      if (storageRes?.ok) {
        const storageData = await storageRes.json();
        if (storageData.status === 'ok' && storageData.data) {
          results.storage = {
            available: storageData.data.available,
            used: storageData.data.used,
            free: storageData.data.free,
            total: storageData.data.total,
            usagePercent: storageData.data.usagePercent,
            usedBytes: storageData.data.usedBytes,
            totalBytes: storageData.data.totalBytes,
            availableBytes: storageData.data.availableBytes,
          };
        }
      }

      // Parse Queue data
      if (queueRes?.ok) {
        const queueData = await queueRes.json();
        if (queueData.status === 'ok' && queueData.data) {
          results.queue = queueData.data;
        }
      }

      // Parse Deployment data
      if (deploymentRes?.ok) {
        const deploymentData = await deploymentRes.json();
        if (deploymentData.status === 'ok' && deploymentData.data) {
          results.deployment = {
            mode: deploymentData.data.mode,
            environment: deploymentData.data.environment,
            platform: deploymentData.data.platform,
          };
        }
      }

      setStatus(results);
    } catch (error) {
      console.error('[Backend Check] Error fetching health data:', error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const refresh = () => checkBackends();

  return { ...status, refresh };
}
