/**
 * Local Storage Backend Adapter
 * Implements BackendAdapter interface for local development/demo mode
 */

import type { BackendAdapter, QueryOptions } from './adapter';

export class LocalAdapter implements BackendAdapter {
  private prefix = 'flowscale_';
  
  private getStore<T>(table: string): T[] {
    const data = localStorage.getItem(`${this.prefix}${table}`);
    return data ? JSON.parse(data) : [];
  }
  
  private setStore<T>(table: string, data: T[]): void {
    localStorage.setItem(`${this.prefix}${table}`, JSON.stringify(data));
  }

  async getUser() {
    const userStr = localStorage.getItem(`${this.prefix}current_user`);
    if (!userStr) return null;
    return JSON.parse(userStr);
  }

  async signIn(email: string, password: string) {
    const users = this.getStore<{ id: string; email: string; password: string }>('users');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return { user: null, error: new Error('Invalid credentials') };
    }
    
    localStorage.setItem(`${this.prefix}current_user`, JSON.stringify({ id: user.id, email: user.email }));
    return { user: { id: user.id, email: user.email }, error: null };
  }

  async signUp(email: string, password: string) {
    const users = this.getStore<{ id: string; email: string; password: string }>('users');
    
    if (users.find(u => u.email === email)) {
      return { user: null, error: new Error('Email already exists') };
    }
    
    const newUser = {
      id: crypto.randomUUID(),
      email,
      password,
    };
    
    users.push(newUser);
    this.setStore('users', users);
    
    return { user: { id: newUser.id, email: newUser.email }, error: null };
  }

  async signOut() {
    localStorage.removeItem(`${this.prefix}current_user`);
  }

  async query<T>(table: string, options: QueryOptions = {}) {
    try {
      let data = this.getStore<T>(table);
      
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          data = data.filter((item: any) => item[key] === value);
        });
      }
      
      if (options.order) {
        data.sort((a: any, b: any) => {
          const aVal = a[options.order!.column];
          const bVal = b[options.order!.column];
          const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          return options.order!.ascending ? comparison : -comparison;
        });
      }
      
      if (options.limit) {
        data = data.slice(0, options.limit);
      }
      
      return { data, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async insert<T>(table: string, data: Record<string, unknown>) {
    try {
      const store = this.getStore<T>(table);
      const newItem = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...data,
      } as T;
      
      store.push(newItem);
      this.setStore(table, store);
      
      return { data: newItem, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async update<T>(table: string, data: Record<string, unknown>, match: Record<string, unknown>) {
    try {
      const store = this.getStore<any>(table);
      const index = store.findIndex((item: any) => {
        return Object.entries(match).every(([key, value]) => item[key] === value);
      });
      
      if (index === -1) {
        return { data: null, error: new Error('Record not found') };
      }
      
      store[index] = { ...store[index], ...data, updated_at: new Date().toISOString() };
      this.setStore(table, store);
      
      return { data: store[index] as T, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async delete(table: string, match: Record<string, unknown>) {
    try {
      const store = this.getStore<any>(table);
      const filtered = store.filter((item: any) => {
        return !Object.entries(match).every(([key, value]) => item[key] === value);
      });
      
      this.setStore(table, filtered);
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  }

  async invokeFunction<T>(name: string, body?: Record<string, unknown>) {
    // Mock function responses for local development
    console.log(`[LocalAdapter] Mock function call: ${name}`, body);
    
    return {
      data: {
        success: true,
        message: `Mock response for ${name}`,
        mockData: true,
      } as T,
      error: null,
    };
  }

  async uploadFile(bucket: string, path: string, file: File) {
    try {
      const reader = new FileReader();
      
      return new Promise<{ url: string | null; error: Error | null }>((resolve) => {
        reader.onload = () => {
          const url = reader.result as string;
          localStorage.setItem(`${this.prefix}file_${bucket}_${path}`, url);
          resolve({ url, error: null });
        };
        reader.onerror = () => {
          resolve({ url: null, error: new Error('File read failed') });
        };
        reader.readAsDataURL(file);
      });
    } catch (e) {
      return { url: null, error: e as Error };
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    return localStorage.getItem(`${this.prefix}file_${bucket}_${path}`) || '';
  }
}
