import { supabase } from '@/integrations/supabase/client';

/**
 * Invokes an Edge Function or its VPS Backend equivalent
 * Handles routing based on deployment mode (Cloud vs Self-Hosted)
 * Designed to be a drop-in replacement for supabase.functions.invoke
 */
export const invokeEdgeFunction = async (functionName: string, options: { body?: any; headers?: any } = {}) => {
    // Check if running in VPS/self-hosted mode
    const isSelfHosted = true; // Forced for VPS deployment


    if (isSelfHosted) {
        try {
            const token = localStorage.getItem('flowscale_token');
            // Use VPS backend endpoint: /api/{functionName}
            const endpoint = `/api/${functionName}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    ...(options.headers || {})
                },
                body: JSON.stringify(options.body || {})
            });

            if (!response.ok) {
                let errorMsg = 'Generation failed';
                try {
                    const err = await response.json();
                    errorMsg = err.description || err.error || err.message || errorMsg;
                } catch {
                    const text = await response.text();
                    if (text) errorMsg = text;
                }
                return { data: null, error: new Error(errorMsg) };
            }

            const result = await response.json();
            return { data: result, error: null };
        } catch (e: any) {
            console.error(`[EdgeProxy] Error invoking ${functionName}:`, e);
            return { data: null, error: e };
        }
    } else {
        // Cloud Mode: Direct Edge Function call
        return await supabase.functions.invoke(functionName, options);
    }
};
