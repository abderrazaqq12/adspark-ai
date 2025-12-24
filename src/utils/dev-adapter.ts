/**
 * Frontend Dev Adapter (Builder Mode)
 * 
 * Purpose:
 * Enables the UI to render in preview environments (e.g. Lovable.dev)
 * without requiring authentication or touching the VPS backend.
 * 
 * Non-Negotiable Rules:
 * - Production behavior must remain UNCHANGED.
 * - NEVER call /api/login or /api/health in Builder Mode.
 * - Block all execution attempts in Builder Mode.
 */

// Detect if running in a builder/preview environment
export const isBuilderMode = (): boolean => {
    // 1. Explicit flag (for local testing/previews)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('builder') === 'true') return true;

    // 2. Iframe detection (Builder environments usually embed in iframes)
    if (window !== window.parent) return true;

    // 3. Origin check (Lovable domains)
    const hostname = window.location.hostname;
    if (hostname.includes('lovable.dev') || hostname.includes('lovable.app')) return true;

    return false;
};

// Mock Data
const MOCK_PROFILE = {
    id: 'builder-dev',
    email: 'builder@lovable.dev',
    plan: 'Builder',
    credits: 9999,
    role: 'dev',
    mode: 'BUILDER_MODE'
};

const MOCK_SETTINGS = {
    preferences: {
        theme: 'dark'
    }
};

const MOCK_PROJECTS: any[] = [];

// Intercept window.fetch to provide mocks in Builder Mode
export const injectBuilderMocks = () => {
    if (!isBuilderMode()) return; // SAFETY: Do nothing in production

    console.warn('⚠️  BUILDER MODE ACTIVE - Backend disconnected');
    console.warn('⚠️  All API calls are being mocked');

    const originalFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        // 1. Block Auth & Health Checks (Never hit VPS)
        if (urlString.includes('/api/auth') ||
            urlString.includes('/api/login') ||
            urlString.includes('/api/health') ||
            urlString.includes('/api/verify')) {
            console.log(`[Builder] Blocked remote call: ${urlString}`);
            return new Response(JSON.stringify({ ok: true, status: 'mocked' }), { status: 200 });
        }

        // 2. Mock Profile
        if (urlString.includes('/api/user/profile')) {
            return new Response(JSON.stringify({ ok: true, profile: MOCK_PROFILE }), { status: 200 });
        }

        // 3. Mock Settings
        if (urlString.includes('/api/settings')) {
            return new Response(JSON.stringify({ ok: true, settings: MOCK_SETTINGS }), { status: 200 });
        }

        // 4. Mock Projects
        if (urlString.includes('/api/projects')) {
            return new Response(JSON.stringify({ ok: true, projects: MOCK_PROJECTS }), { status: 200 });
        }

        // 5. Block Execution
        if (urlString.includes('/api/execute') || urlString.includes('/api/render')) {
            console.warn(`[Builder] Blocked execution attempt: ${urlString}`);
            return new Response(JSON.stringify({
                ok: false,
                error: 'DEV_BUILDER_MODE_EXECUTION_DISABLED',
                message: 'Execution is disabled in Builder Mode.'
            }), { status: 403 });
        }

        // Fallback for unhandled routes (log warning but let pass if needed, or block?)
        // Decision: Block everything else to be safe
        console.warn(`[Builder] Blocked unknown call: ${urlString}`);
        return new Response(JSON.stringify({ ok: false, error: 'BUILDER_MODE_BLOCKED' }), { status: 404 });
    };
};
