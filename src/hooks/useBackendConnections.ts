/**
 * Backend Connection Status Hook
 * 
 * Fetches connection status from VPS backend API.
 * Frontend NEVER stores credentials - only reflects backend state.
 * 
 * Backend endpoints:
 * - GET /api/connections/status - List all connection statuses
 * - GET /api/connections/status/:providerId - Get specific provider status
 * - POST /api/connections/connect/:providerId - Initiate OAuth/connection flow
 * - POST /api/connections/disconnect/:providerId - Disconnect a service
 */

import { useState, useEffect, useCallback } from 'react';
import { config } from '@/config';

export type ConnectionService = 
  | 'google_drive' 
  | 'elevenlabs' 
  | 'openai' 
  | 'anthropic'
  | 'gemini'
  | 'fal'
  | 'runway' 
  | 'kling'
  | 'heygen'
  | 'deepseek'
  | 'openrouter';

export interface ConnectionStatus {
  id: ConnectionService;
  name: string;
  description: string;
  category: 'storage' | 'ai' | 'video';
  connected: boolean;
  configuredVars?: string[];
  lastChecked: string | null;
}

interface BackendConnectionsState {
  connections: ConnectionStatus[];
  loading: boolean;
  error: string | null;
}

interface UseBackendConnectionsReturn extends BackendConnectionsState {
  refresh: () => Promise<void>;
  getStatus: (service: ConnectionService) => ConnectionStatus | undefined;
  isConnected: (service: ConnectionService) => boolean;
  connect: (service: ConnectionService) => Promise<{ success: boolean; redirectUrl?: string; message?: string }>;
  disconnect: (service: ConnectionService) => Promise<{ success: boolean; message?: string }>;
}

// VPS API base URL - read from config
const getApiBaseUrl = (): string => {
  // Check for VPS API URL first (production)
  const vpsUrl = config.backend.restApiUrl;
  if (vpsUrl) return vpsUrl;
  
  // Check for localhost in dev
  if (config.deploymentTarget === 'local') {
    return 'http://localhost:3000/api';
  }
  
  // Production VPS
  return '/api';
};

export function useBackendConnections(): UseBackendConnectionsReturn {
  const [state, setState] = useState<BackendConnectionsState>({
    connections: [],
    loading: true,
    error: null,
  });

  const apiBaseUrl = getApiBaseUrl();

  const fetchStatus = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch(`${apiBaseUrl}/connections/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If backend doesn't have this endpoint yet, return empty state
        if (response.status === 404) {
          console.warn('[Connections] Backend endpoint not found, using defaults');
          setState({
            connections: getDefaultConnectionStatuses(),
            loading: false,
            error: null,
          });
          return;
        }
        throw new Error(`Failed to fetch connection status: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.error?.message || 'Backend returned error');
      }
      
      // Map backend response to frontend format
      const connections: ConnectionStatus[] = Object.entries(data.connections || {}).map(
        ([id, conn]: [string, any]) => ({
          id: id as ConnectionService,
          name: conn.name,
          description: conn.description,
          category: conn.category,
          connected: conn.connected,
          configuredVars: conn.configuredVars,
          lastChecked: data.timestamp || null,
        })
      );
      
      setState({
        connections,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('[Connections] Error fetching status:', error);
      setState({
        connections: getDefaultConnectionStatuses(),
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch status',
      });
    }
  }, [apiBaseUrl]);

  const getStatus = useCallback((service: ConnectionService): ConnectionStatus | undefined => {
    return state.connections.find(c => c.id === service);
  }, [state.connections]);

  const isConnected = useCallback((service: ConnectionService): boolean => {
    const status = getStatus(service);
    return status?.connected ?? false;
  }, [getStatus]);

  const connect = useCallback(async (service: ConnectionService): Promise<{ success: boolean; redirectUrl?: string; message?: string }> => {
    try {
      const response = await fetch(`${apiBaseUrl}/connections/connect/${service}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          message: data.error?.message || `Failed to connect: ${response.statusText}` 
        };
      }
      
      // If OAuth, backend returns redirect URL
      if (data.action === 'redirect' && data.redirectUrl) {
        return { success: true, redirectUrl: data.redirectUrl };
      }

      // Already connected or just connected
      if (data.connected) {
        await fetchStatus();
        return { success: true, message: data.message };
      }

      await fetchStatus();
      return { success: true, message: data.message };
    } catch (error) {
      console.error(`[Connections] Error connecting ${service}:`, error);
      return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }, [apiBaseUrl, fetchStatus]);

  const disconnect = useCallback(async (service: ConnectionService): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${apiBaseUrl}/connections/disconnect/${service}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          message: data.error?.message || `Failed to disconnect: ${response.statusText}` 
        };
      }

      await fetchStatus();
      return { success: true, message: data.message };
    } catch (error) {
      console.error(`[Connections] Error disconnecting ${service}:`, error);
      return { success: false, message: error instanceof Error ? error.message : 'Disconnect failed' };
    }
  }, [apiBaseUrl, fetchStatus]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    ...state,
    refresh: fetchStatus,
    getStatus,
    isConnected,
    connect,
    disconnect,
  };
}

// Default connection statuses when backend is unavailable
function getDefaultConnectionStatuses(): ConnectionStatus[] {
  return [
    { id: 'google_drive', name: 'Google Drive', description: 'Cloud storage for video outputs', category: 'storage', connected: false, lastChecked: null },
    { id: 'elevenlabs', name: 'ElevenLabs', description: 'AI voice generation', category: 'ai', connected: false, lastChecked: null },
    { id: 'openai', name: 'OpenAI', description: 'GPT models for content generation', category: 'ai', connected: false, lastChecked: null },
    { id: 'anthropic', name: 'Anthropic', description: 'Claude models for content generation', category: 'ai', connected: false, lastChecked: null },
    { id: 'gemini', name: 'Google Gemini', description: 'Gemini models for content generation', category: 'ai', connected: false, lastChecked: null },
    { id: 'fal', name: 'Fal.ai', description: 'Video generation models', category: 'video', connected: false, lastChecked: null },
    { id: 'runway', name: 'Runway', description: 'AI video generation', category: 'video', connected: false, lastChecked: null },
    { id: 'kling', name: 'Kling AI', description: 'AI video generation', category: 'video', connected: false, lastChecked: null },
    { id: 'heygen', name: 'HeyGen', description: 'AI avatar video generation', category: 'video', connected: false, lastChecked: null },
    { id: 'deepseek', name: 'DeepSeek', description: 'DeepSeek AI models', category: 'ai', connected: false, lastChecked: null },
    { id: 'openrouter', name: 'OpenRouter', description: 'Multi-model AI gateway', category: 'ai', connected: false, lastChecked: null },
  ];
}
