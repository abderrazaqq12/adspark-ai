import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * FlowScale Security Perimeter: Fetch Interceptor
 * Enforces the Architectural Security Contract:
 * - Automatically attaches Opaque Session Tokens to all internal API requests
 * - Prevents token leakage to external domains (zero-trust architecture)
 * - Ensures persistent identity tracking across the entire system
 */
const { fetch: originalFetch } = window;
window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    // Determine if the request is targeting the FlowScale backend
    // This includes relative paths and explicit local/production hostnames
    const isInternal =
        url.startsWith('/') ||
        url.includes(window.location.host) ||
        url.includes('localhost:3000') ||
        url.includes('localhost:3001');

    // Only attach tokens to internal calls to prevent credential leakage to 3rd parties
    if (isInternal) {
        const token = localStorage.getItem('flowscale_token');
        const newInit = { ...(init || {}) };
        const headers = new Headers(newInit.headers || {});

        if (token && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        newInit.headers = headers;
        const response = await originalFetch(input, newInit);

        // Security Lifecycle Handling: Redirect on expired/invalid session
        if (response.status === 401 || response.status === 403) {
            console.warn('[Security] Unauthorized request detected. Purging session.');
            localStorage.removeItem('flowscale_token');
            localStorage.removeItem('flowscale_user');

            // Prevent redirect loops on the login page itself
            if (!window.location.pathname.startsWith('/auth')) {
                window.location.href = '/auth';
            }
        }

        return response;
    }

    return originalFetch(input, init);
};

createRoot(document.getElementById("root")!).render(<App />);
