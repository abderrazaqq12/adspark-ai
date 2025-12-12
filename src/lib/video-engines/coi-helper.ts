/**
 * Cross-Origin Isolation Helper
 * Manages COOP/COEP headers for SharedArrayBuffer support (required by ffmpeg.wasm)
 */

export interface COIStatus {
  isIsolated: boolean;
  hasSharedArrayBuffer: boolean;
  serviceWorkerSupported: boolean;
  serviceWorkerActive: boolean;
  canUseFFmpeg: boolean;
}

/**
 * Check current Cross-Origin Isolation status
 */
export function checkCOIStatus(): COIStatus {
  const isIsolated = typeof window !== 'undefined' && window.crossOriginIsolated === true;
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const serviceWorkerSupported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  const serviceWorkerActive = serviceWorkerSupported && !!navigator.serviceWorker?.controller;
  
  return {
    isIsolated,
    hasSharedArrayBuffer,
    serviceWorkerSupported,
    serviceWorkerActive,
    canUseFFmpeg: isIsolated && hasSharedArrayBuffer,
  };
}

/**
 * Register the COI service worker if not already isolated
 * Returns true if already isolated or successfully registered (will reload)
 */
export async function ensureCrossOriginIsolation(): Promise<boolean> {
  const status = checkCOIStatus();
  
  // Already isolated, good to go
  if (status.isIsolated) {
    console.log('[COI] Already cross-origin isolated');
    return true;
  }
  
  // Service workers not supported
  if (!status.serviceWorkerSupported) {
    console.warn('[COI] Service workers not supported in this browser');
    return false;
  }
  
  // In iframe, can't register
  if (typeof window !== 'undefined' && window.parent !== window) {
    console.warn('[COI] Cannot register service worker from iframe');
    return false;
  }
  
  try {
    // Check if already registered
    const registrations = await navigator.serviceWorker.getRegistrations();
    const coiRegistration = registrations.find(r => 
      r.active?.scriptURL.includes('coi-serviceworker.js')
    );
    
    if (coiRegistration) {
      console.log('[COI] Service worker already registered');
      if (coiRegistration.active && !navigator.serviceWorker.controller) {
        // Need to reload to activate
        console.log('[COI] Reloading to activate service worker...');
        window.location.reload();
        return false;
      }
      return status.isIsolated;
    }
    
    // Register the service worker
    console.log('[COI] Registering service worker...');
    const registration = await navigator.serviceWorker.register('/coi-serviceworker.js');
    
    // Wait for it to be ready
    await new Promise<void>((resolve) => {
      if (registration.active) {
        resolve();
        return;
      }
      
      const worker = registration.installing || registration.waiting;
      if (worker) {
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') {
            resolve();
          }
        });
      }
    });
    
    // Reload to apply headers
    console.log('[COI] Service worker activated, reloading...');
    window.location.reload();
    return false; // Will reload
    
  } catch (error) {
    console.error('[COI] Failed to register service worker:', error);
    return false;
  }
}

/**
 * Get a human-readable status message
 */
export function getCOIStatusMessage(): string {
  const status = checkCOIStatus();
  
  if (status.canUseFFmpeg) {
    return 'Cross-Origin Isolated: Ready for FFmpeg.wasm';
  }
  
  if (!status.serviceWorkerSupported) {
    return 'Service Workers not supported - FFmpeg.wasm unavailable';
  }
  
  if (status.serviceWorkerActive && !status.isIsolated) {
    return 'Service Worker active but isolation pending - please reload';
  }
  
  if (!status.serviceWorkerActive) {
    return 'Service Worker not active - click Initialize to enable';
  }
  
  return 'Cross-Origin Isolation required for FFmpeg.wasm';
}
