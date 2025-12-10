/**
 * Backend Adapter Interface
 * Abstracts database operations to support multiple backends
 */

import { config, BackendProvider } from '@/config';

export interface QueryOptions {
  select?: string;
  eq?: Record<string, unknown>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  single?: boolean;
}

export interface BackendAdapter {
  // Auth
  getUser(): Promise<{ id: string; email: string } | null>;
  signIn(email: string, password: string): Promise<{ user: { id: string; email: string } | null; error: Error | null }>;
  signUp(email: string, password: string): Promise<{ user: { id: string; email: string } | null; error: Error | null }>;
  signOut(): Promise<void>;
  
  // Database
  query<T>(table: string, options?: QueryOptions): Promise<{ data: T[] | null; error: Error | null }>;
  insert<T>(table: string, data: Record<string, unknown>): Promise<{ data: T | null; error: Error | null }>;
  update<T>(table: string, data: Record<string, unknown>, match: Record<string, unknown>): Promise<{ data: T | null; error: Error | null }>;
  delete(table: string, match: Record<string, unknown>): Promise<{ error: Error | null }>;
  
  // Functions
  invokeFunction<T>(name: string, body?: Record<string, unknown>): Promise<{ data: T | null; error: Error | null }>;
  
  // Storage
  uploadFile(bucket: string, path: string, file: File): Promise<{ url: string | null; error: Error | null }>;
  getPublicUrl(bucket: string, path: string): string;
}

// Factory function to get the appropriate adapter
export const getBackendAdapter = async (): Promise<BackendAdapter> => {
  const provider = config.backend.provider;
  
  switch (provider) {
    case 'supabase':
      const { SupabaseAdapter } = await import('./supabase');
      return new SupabaseAdapter();
    case 'rest':
      const { RestAdapter } = await import('./rest');
      return new RestAdapter();
    case 'local':
      const { LocalAdapter } = await import('./local');
      return new LocalAdapter();
    default:
      const { SupabaseAdapter: DefaultAdapter } = await import('./supabase');
      return new DefaultAdapter();
  }
};

// Singleton instance
let adapterInstance: BackendAdapter | null = null;

export const getAdapter = async (): Promise<BackendAdapter> => {
  if (!adapterInstance) {
    adapterInstance = await getBackendAdapter();
  }
  return adapterInstance;
};
