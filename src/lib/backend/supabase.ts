/**
 * Supabase Backend Adapter
 * Implements BackendAdapter interface for Supabase/Lovable Cloud
 */

import { supabase } from '@/integrations/supabase/client';
import type { BackendAdapter, QueryOptions } from './adapter';

export class SupabaseAdapter implements BackendAdapter {
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return { id: user.id, email: user.email || '' };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return {
      user: data.user ? { id: data.user.id, email: data.user.email || '' } : null,
      error: error as Error | null,
    };
  }

  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return {
      user: data.user ? { id: data.user.id, email: data.user.email || '' } : null,
      error: error as Error | null,
    };
  }

  async signOut() {
    await supabase.auth.signOut();
  }

  async query<T>(table: string, options: QueryOptions = {}) {
    let query = supabase.from(table as any).select(options.select || '*');
    
    if (options.eq) {
      Object.entries(options.eq).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.single) {
      const { data, error } = await query.maybeSingle();
      return { data: data ? [data] as T[] : null, error: error as Error | null };
    }
    
    const { data, error } = await query;
    return { data: data as T[] | null, error: error as Error | null };
  }

  async insert<T>(table: string, data: Record<string, unknown>) {
    const { data: result, error } = await supabase
      .from(table as any)
      .insert(data as any)
      .select()
      .single();
    return { data: result as T | null, error: error as Error | null };
  }

  async update<T>(table: string, data: Record<string, unknown>, match: Record<string, unknown>) {
    let query = supabase.from(table as any).update(data as any);
    
    Object.entries(match).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { data: result, error } = await query.select().single();
    return { data: result as T | null, error: error as Error | null };
  }

  async delete(table: string, match: Record<string, unknown>) {
    let query = supabase.from(table as any).delete();
    
    Object.entries(match).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { error } = await query;
    return { error: error as Error | null };
  }

  async invokeFunction<T>(name: string, body?: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke(name, { body });
    return { data: data as T | null, error: error as Error | null };
  }

  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    
    if (error) {
      return { url: null, error: error as Error };
    }
    
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { url: publicUrl, error: null };
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  }
}
