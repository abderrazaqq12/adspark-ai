/**
 * VPS-ONLY AUTH UTILITY
 * 
 * ABSOLUTE LAW: VPS Backend is the ONLY authority for authentication.
 * 
 * FORBIDDEN:
 * - Supabase Auth (supabase.auth.*)
 * - Any fallback auth source
 * - Any dual-mode logic
 * - Frontend-derived auth state
 * 
 * This file contains the ONLY approved auth functions for the entire codebase.
 */

// Token storage keys (set by /api/login)
const AUTH_TOKEN_KEY = 'flowscale_token';
const AUTH_USER_KEY = 'flowscale_user';

/**
 * Get the current auth token
 * Token is set by VPS backend /api/login
 */
export function getAuthToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Get the current authenticated user
 * User data is set by VPS backend /api/login
 */
export function getUser(): { id: string; email: string; role?: string } | null {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Check if user is authenticated
 * ONLY checks for token presence - actual validation happens on VPS backend
 */
export function isAuthenticated(): boolean {
    return !!getAuthToken();
}

/**
 * Get Authorization headers for API calls
 * All protected endpoints require this header
 */
export function getAuthHeaders(): Record<string, string> {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Logout - clear tokens and redirect to login
 * Called when user explicitly logs out or on 401 response
 */
export function logout(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    window.location.href = '/login';
}

/**
 * Handle 401 response - force re-login
 * Call this whenever a 401 is received from any API
 */
export function handle401(): void {
    console.warn('[Auth] 401 Unauthorized - forcing re-login');
    logout();
}

/**
 * Get user ID for operations that need it
 * Returns 'vps-admin' as default for single-user VPS mode
 */
export function getUserId(): string {
    const user = getUser();
    return user?.id || 'vps-admin';
}

// ============================================
// COMPLIANCE NOTICE
// ============================================
// This file MUST NOT contain:
// - import { supabase } from anywhere
// - Any reference to supabase.auth
// - Any fallback to external auth
// - Any conditional auth based on deployment mode
//
// All auth decisions come from VPS backend.
// Frontend only stores and forwards tokens.
// ============================================
