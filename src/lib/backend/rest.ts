/**
 * REST API Backend Adapter
 * Implements BackendAdapter interface for generic REST APIs
 */

import { config } from '@/config';
import type { BackendAdapter, QueryOptions } from './adapter';

export class RestAdapter implements BackendAdapter {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = config.backend.restApiUrl || '';
    this.authToken = localStorage.getItem('auth_token');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  async getUser() {
    try {
      const response = await fetch(`${this.baseUrl}/auth/user`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) return null;
      const user = await response.json();
      return { id: user.id, email: user.email };
    } catch {
      return null;
    }
  }

  async signIn(email: string, password: string) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return { user: null, error: new Error(error.message || 'Login failed') };
      }
      
      const data = await response.json();
      this.authToken = data.token;
      localStorage.setItem('auth_token', data.token);
      
      return { user: { id: data.user.id, email: data.user.email }, error: null };
    } catch (e) {
      return { user: null, error: e as Error };
    }
  }

  async signUp(email: string, password: string) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return { user: null, error: new Error(error.message || 'Registration failed') };
      }
      
      const data = await response.json();
      return { user: { id: data.user.id, email: data.user.email }, error: null };
    } catch (e) {
      return { user: null, error: e as Error };
    }
  }

  async signOut() {
    this.authToken = null;
    localStorage.removeItem('auth_token');
  }

  async query<T>(table: string, options: QueryOptions = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.select) params.set('select', options.select);
      if (options.limit) params.set('limit', options.limit.toString());
      if (options.order) {
        params.set('order', `${options.order.column}:${options.order.ascending ? 'asc' : 'desc'}`);
      }
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          params.set(`filter[${key}]`, String(value));
        });
      }

      const response = await fetch(`${this.baseUrl}/${table}?${params}`, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        return { data: null, error: new Error('Query failed') };
      }
      
      const data = await response.json();
      return { data: data as T[], error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async insert<T>(table: string, data: Record<string, unknown>) {
    try {
      const response = await fetch(`${this.baseUrl}/${table}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        return { data: null, error: new Error('Insert failed') };
      }
      
      const result = await response.json();
      return { data: result as T, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async update<T>(table: string, data: Record<string, unknown>, match: Record<string, unknown>) {
    try {
      const id = match.id || match.user_id;
      const response = await fetch(`${this.baseUrl}/${table}/${id}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        return { data: null, error: new Error('Update failed') };
      }
      
      const result = await response.json();
      return { data: result as T, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async delete(table: string, match: Record<string, unknown>) {
    try {
      const id = match.id || match.user_id;
      const response = await fetch(`${this.baseUrl}/${table}/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        return { error: new Error('Delete failed') };
      }
      
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  }

  async invokeFunction<T>(name: string, body?: Record<string, unknown>) {
    try {
      const response = await fetch(`${this.baseUrl}/functions/${name}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      
      if (!response.ok) {
        return { data: null, error: new Error('Function invocation failed') };
      }
      
      const data = await response.json();
      return { data: data as T, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async uploadFile(bucket: string, path: string, file: File) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      formData.append('path', path);

      const response = await fetch(`${this.baseUrl}/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': this.authToken ? `Bearer ${this.authToken}` : '',
        },
        body: formData,
      });
      
      if (!response.ok) {
        return { url: null, error: new Error('Upload failed') };
      }
      
      const data = await response.json();
      return { url: data.url, error: null };
    } catch (e) {
      return { url: null, error: e as Error };
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    return `${this.baseUrl}/storage/${bucket}/${path}`;
  }
}
