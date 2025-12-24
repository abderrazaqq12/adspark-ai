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
        if (token) {
            // Clone init to avoid mutating shared config objects
            const newInit = { ...(init || {}) };
            const headers = new Headers(newInit.headers || {});

            if (!headers.has('Authorization')) {
                headers.set('Authorization', `Bearer ${token}`);
            }

            newInit.headers = headers;
            return originalFetch(input, newInit);
        }
    }

    return originalFetch(input, init);
};

createRoot(document.getElementById("root")!).render(<App />);
