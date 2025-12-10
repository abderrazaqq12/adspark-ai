/**
 * Centralized Configuration System
 * Supports multiple deployment targets: Lovable Cloud, Self-Hosted, Docker
 */

export type DeploymentTarget = 'lovable-cloud' | 'self-hosted' | 'docker' | 'local';
export type AIProvider = 'lovable' | 'openai' | 'gemini' | 'ollama' | 'custom';
export type BackendProvider = 'supabase' | 'rest' | 'n8n' | 'local';

interface AppConfig {
  // Deployment
  deploymentTarget: DeploymentTarget;
  
  // Backend
  backend: {
    provider: BackendProvider;
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseProjectId: string;
    restApiUrl?: string;
    n8nWebhookUrl?: string;
  };
  
  // AI Providers
  ai: {
    defaultProvider: AIProvider;
    lovableGatewayUrl: string;
    openaiApiUrl: string;
    geminiApiUrl: string;
    ollamaUrl: string;
    customApiUrl?: string;
  };
  
  // Features
  features: {
    enableLocalMode: boolean;
    enableMockData: boolean;
    enableDebugLogs: boolean;
  };
  
  // URLs
  urls: {
    app: string;
    edgeFunctions: string;
    storage: string;
  };
}

// Environment variable getters with fallbacks
const getEnvVar = (key: string, fallback: string = ''): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env as Record<string, string>)[key] || fallback;
  }
  return fallback;
};

// Detect deployment target
const detectDeploymentTarget = (): DeploymentTarget => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  
  if (hostname.includes('lovable.app') || hostname.includes('lovable.dev')) {
    return 'lovable-cloud';
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'local';
  }
  if (getEnvVar('VITE_DOCKER_MODE') === 'true') {
    return 'docker';
  }
  return 'self-hosted';
};

// Build configuration
const buildConfig = (): AppConfig => {
  const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', '');
  const supabaseProjectId = getEnvVar('VITE_SUPABASE_PROJECT_ID', '');
  
  return {
    deploymentTarget: detectDeploymentTarget(),
    
    backend: {
      provider: (getEnvVar('VITE_BACKEND_PROVIDER', 'supabase') as BackendProvider),
      supabaseUrl,
      supabaseAnonKey: getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY', ''),
      supabaseProjectId,
      restApiUrl: getEnvVar('VITE_REST_API_URL'),
      n8nWebhookUrl: getEnvVar('VITE_N8N_WEBHOOK_URL'),
    },
    
    ai: {
      defaultProvider: (getEnvVar('VITE_AI_PROVIDER', 'lovable') as AIProvider),
      lovableGatewayUrl: 'https://ai.gateway.lovable.dev/v1/chat/completions',
      openaiApiUrl: getEnvVar('VITE_OPENAI_API_URL', 'https://api.openai.com/v1'),
      geminiApiUrl: getEnvVar('VITE_GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta'),
      ollamaUrl: getEnvVar('VITE_OLLAMA_URL', 'http://localhost:11434'),
      customApiUrl: getEnvVar('VITE_CUSTOM_AI_API_URL'),
    },
    
    features: {
      enableLocalMode: getEnvVar('VITE_ENABLE_LOCAL_MODE') === 'true',
      enableMockData: getEnvVar('VITE_ENABLE_MOCK_DATA') === 'true',
      enableDebugLogs: getEnvVar('VITE_DEBUG') === 'true',
    },
    
    urls: {
      app: typeof window !== 'undefined' ? window.location.origin : '',
      edgeFunctions: supabaseUrl ? `${supabaseUrl}/functions/v1` : '',
      storage: supabaseUrl ? `${supabaseUrl}/storage/v1` : '',
    },
  };
};

// Singleton config instance
let configInstance: AppConfig | null = null;

export const getConfig = (): AppConfig => {
  if (!configInstance) {
    configInstance = buildConfig();
  }
  return configInstance;
};

// Shorthand exports
export const config = getConfig();

// Helper functions
export const isLovableCloud = (): boolean => config.deploymentTarget === 'lovable-cloud';
export const isSelfHosted = (): boolean => config.deploymentTarget === 'self-hosted';
export const isDocker = (): boolean => config.deploymentTarget === 'docker';
export const isLocal = (): boolean => config.deploymentTarget === 'local';

export const getEdgeFunctionUrl = (functionName: string): string => {
  return `${config.urls.edgeFunctions}/${functionName}`;
};

export const getStorageUrl = (bucket: string, path: string): string => {
  return `${config.urls.storage}/object/public/${bucket}/${path}`;
};

// Debug logging
export const debugLog = (...args: unknown[]): void => {
  if (config.features.enableDebugLogs) {
    console.log('[FlowScale]', ...args);
  }
};
