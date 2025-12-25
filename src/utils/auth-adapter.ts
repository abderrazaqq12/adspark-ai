/**
 * Auth Adapter for VPS/Supabase Mode Compatibility
 * 
 * PURPOSE: Provides unified auth interface that works in both:
 * - VPS mode (JWT tokens from /api/login)
 * - Supabase mode (Supabase Auth)
 * 
 * USAGE: Replace all direct supabase.auth calls with these functions
 */

import { supabase } from '@/integrations/supabase/client';

// Detect deployment mode - check both 'self-hosted' and 'vps' values
const isVPSMode = (): boolean => {
    const mode = import.meta.env.VITE_DEPLOYMENT_MODE;
    return mode === 'self-hosted' || mode === 'vps';
};

/**
 * Get authenticated user - works in both VPS and Supabase modes
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(): Promise<{
    id: string;
    email: string;
    role?: string;
} | null> {
    if (isVPSMode()) {
        // VPS mode: Check for JWT token
        const token = localStorage.getItem('flowscale_token');
        if (!token) return null;

        // Return mock user structure compatible with Supabase user
        return {
            id: 'vps-admin',
            email: 'admin@flowscale.local',
            role: 'admin'
        };
    }

    // Supabase mode: Use Supabase Auth
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return null;
        return {
            id: user.id,
            email: user.email || '',
            role: user.role
        };
    } catch {
        return null;
    }
}

/**
 * Get auth token for API calls - works in both VPS and Supabase modes
 * Returns null if not authenticated
 */
export async function getAuthToken(): Promise<string | null> {
    if (isVPSMode()) {
        return localStorage.getItem('flowscale_token');
    }

    // Supabase mode
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) return null;
        return session.access_token;
    } catch {
        return null;
    }
}

/**
 * Check if user is authenticated - works in both modes
 */
export async function isAuthenticated(): Promise<boolean> {
    const user = await getAuthenticatedUser();
    return user !== null;
}

/**
 * Get user ID for database operations
 * In VPS mode, returns a constant ID since there's only one user
 */
export async function getUserId(): Promise<string | null> {
    const user = await getAuthenticatedUser();
    return user?.id || null;
}

/**
 * Helper to get auth headers for fetch calls
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
    const token = await getAuthToken();
    if (!token) return {};
    return { 'Authorization': `Bearer ${token}` };
}
