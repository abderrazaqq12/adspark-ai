/**
 * Backend Connection Status Hook
 * 
 * Fetches connection status from VPS backend API.
 * Frontend NEVER stores credentials - only reflects backend state.
 * 
 * Backend endpoints expected:
 * - GET /api/connections/status - List all connection statuses
 * - POST /api/connections/connect/:service - Initiate OAuth flow
 * - POST /api/connections/disconnect/:service - Disconnect a service
 */

import { useState, useEffect, useCallback } from 'react';
import { config } from '@/config';

export type ConnectionService = 
  | 'google_drive' 
  | 'elevenlabs' 
  | 'openai' 
  | 'runway' 
  | 'heygen'
  | 'fal_ai'
  | 'gemini';

export interface ConnectionStatus {
  service: ConnectionService;
  connected: boolean;
  displayName: string;
  lastChecked: string | null;
  metadata?: {
    email?: string;
    folderId?: string;
    folderName?: string;
  };
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
  connect: (service: ConnectionService) => Promise<{ success: boolean; redirectUrl?: string }>;
  disconnect: (service: ConnectionService) => Promise<boolean>;
}

// VPS API base URL - read from config or env
const getApiBaseUrl = (): string => {
  // Check for VPS API URL first (production)
  const vpsUrl = config.backend.restApiUrl;
  if (vpsUrl) return vpsUrl;
  
  // Fallback to edge functions for Lovable Cloud
  if (config.backend.supabaseUrl) {
    return `${config.backend.supabaseUrl}/functions/v1`;
  }
  
  // Local development
  return 'http://localhost:3001/api';
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
        credentials: 'include', // Include cookies for session
      });

      if (!response.ok) {
        // If backend doesn't have this endpoint yet, return empty state
        if (response.status === 404) {
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
      
      setState({
        connections: data.connections || [],
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching connection status:', error);
      // Return defaults with not-connected state on error
      setState({
        connections: getDefaultConnectionStatuses(),
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch status',
      });
    }
  }, [apiBaseUrl]);

  const getStatus = useCallback((service: ConnectionService): ConnectionStatus | undefined => {
    return state.connections.find(c => c.service === service);
  }, [state.connections]);

  const isConnected = useCallback((service: ConnectionService): boolean => {
    const status = getStatus(service);
    return status?.connected ?? false;
  }, [getStatus]);

  const connect = useCallback(async (service: ConnectionService): Promise<{ success: boolean; redirectUrl?: string }> => {
    try {
      const response = await fetch(`${apiBaseUrl}/connections/connect/${service}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to initiate connection: ${response.statusText}`);
      }

      const data = await response.json();
      
      // If OAuth, backend returns redirect URL
      if (data.redirectUrl) {
        return { success: true, redirectUrl: data.redirectUrl };
      }

      // Refresh status after connect
      await fetchStatus();
      return { success: true };
    } catch (error) {
      console.error(`Error connecting ${service}:`, error);
      return { success: false };
    }
  }, [apiBaseUrl, fetchStatus]);

  const disconnect = useCallback(async (service: ConnectionService): Promise<boolean> => {
    try {
      const response = await fetch(`${apiBaseUrl}/connections/disconnect/${service}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to disconnect: ${response.statusText}`);
      }

      // Refresh status after disconnect
      await fetchStatus();
      return true;
    } catch (error) {
      console.error(`Error disconnecting ${service}:`, error);
      return false;
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
    { service: 'google_drive', connected: false, displayName: 'Google Drive', lastChecked: null },
    { service: 'elevenlabs', connected: false, displayName: 'ElevenLabs', lastChecked: null },
    { service: 'openai', connected: false, displayName: 'OpenAI', lastChecked: null },
    { service: 'runway', connected: false, displayName: 'Runway', lastChecked: null },
    { service: 'heygen', connected: false, displayName: 'HeyGen', lastChecked: null },
    { service: 'fal_ai', connected: false, displayName: 'Fal AI', lastChecked: null },
    { service: 'gemini', connected: false, displayName: 'Google Gemini', lastChecked: null },
  ];
}