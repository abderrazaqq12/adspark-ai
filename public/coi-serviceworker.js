/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
// Service Worker that enables Cross-Origin Isolation by adding COOP/COEP headers
// This is required for SharedArrayBuffer (used by ffmpeg.wasm)

let coepCredentialless = false;
if (typeof window === 'undefined') {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("message", (ev) => {
        if (!ev.data) return;
        if (ev.data.type === "deregister") {
            self.registration.unregister()
                .then(() => self.clients.matchAll())
                .then((clients) => clients.forEach((client) => client.navigate(client.url)));
        }
        if (ev.data.type === "coepCredentialless") {
            coepCredentialless = ev.data.value;
        }
    });

    self.addEventListener("fetch", function (event) {
        const r = event.request;
        const url = new URL(r.url);
        
        if (r.cache === "only-if-cached" && r.mode !== "same-origin") return;

        // BYPASS Service Worker completely for FFmpeg assets (local and CDN)
        if (url.pathname.startsWith('/ffmpeg/') || 
            url.href.includes('@ffmpeg/core') ||
            url.href.includes('ffmpeg-core')) {
            return; // Let browser handle directly - no interception
        }

        const request = (coepCredentialless && r.mode === "no-cors")
            ? new Request(r, { credentials: "omit" })
            : r;

        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.status === 0) return response;

                    const newHeaders = new Headers(response.headers);
                    newHeaders.set("Cross-Origin-Embedder-Policy",
                        coepCredentialless ? "credentialless" : "require-corp"
                    );
                    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
                    newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders,
                    });
                })
                .catch((e) => console.error(e))
        );
    });
} else {
    // This block runs in the window context
    (() => {
        const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
        window.sessionStorage.removeItem("coiReloadedBySelf");

        const coepDegrading = reloadedBySelf === "coepdegrade";

        // Check if already isolated
        if (window.crossOriginIsolated) {
            console.log("[COI] Already cross-origin isolated");
            return;
        }

        // If service workers aren't supported, we can't help
        if (!("serviceWorker" in navigator)) {
            console.warn("[COI] Service workers are not supported");
            return;
        }

        // If we're in an iframe, we can't register a service worker
        if (window.parent !== window) {
            console.warn("[COI] Cannot register service worker from iframe");
            return;
        }

        const registrationPromise = navigator.serviceWorker.register(
            window.document.currentScript?.src || "/coi-serviceworker.js"
        );

        registrationPromise
            .then((registration) => {
                console.log("[COI] Service worker registered", registration.scope);

                // Wait for the service worker to be ready
                if (registration.active && !navigator.serviceWorker.controller) {
                    console.log("[COI] Reloading page to activate service worker");
                    window.sessionStorage.setItem("coiReloadedBySelf", coepDegrading ? "coepdegrade" : "true");
                    window.location.reload();
                } else if (!registration.active) {
                    registration.addEventListener("updatefound", () => {
                        console.log("[COI] Service worker installing, will reload when ready");
                        const installing = registration.installing;
                        if (installing) {
                            installing.addEventListener("statechange", () => {
                                if (installing.state === "activated") {
                                    console.log("[COI] Service worker activated, reloading");
                                    window.sessionStorage.setItem("coiReloadedBySelf", coepDegrading ? "coepdegrade" : "true");
                                    window.location.reload();
                                }
                            });
                        }
                    });
                }
            })
            .catch((error) => {
                console.error("[COI] Service worker registration failed:", error);
            });
    })();
}
