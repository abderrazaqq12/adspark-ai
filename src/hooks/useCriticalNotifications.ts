/**
 * Critical Notifications Hook
 * Triggers browser notifications and optional sound alerts
 * when critical issues are detected on the dashboard
 */

import { useEffect, useRef, useCallback } from 'react';
import { useDashboardSeverity, SeveritySignal } from './useDashboardSeverity';

// Simple beep sound as base64 (short alert tone)
const ALERT_SOUND_DATA = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1sbmddaG1kXmhtZV9scGNecHNhX3N0YWB2dWFheXZiY3p3Y2R7eGNle3hjZnt4Y2Z7eGNme3hjZnt4Y2Z7eGNme3hjZnt4Y2Z7eGNme3hjZXt4Y2V7eGJle3hjZXt4Y2V7eGNle3hjZXt4Y2V7eGNle3hjZXt4Y2V7eGNle3hjZXt4Y2V7eGNle3hjZXt4Y2V7eGNle3hjZXt4Y2V7eGNle3hiZHt3YmR7d2JkeHViZHh1YmR4dWJkd3ViY3d1YmN3dWJjdnVhY3Z0YWN1dGFjdXRhY3R0YWJzdGFic3NhYnNzYWJycWFicnFgYXFwYGFxcGBhcG9gYHBvYGBvbmBfbm1fX21tX19tbV9ebGxeXmtrXl5ral1daWpdXWlpXV1oaF1dZ2ddXGdnXVxmZlxbZmZcW2VlXFtlZFxaZGRcWmRkXFpjY1xaY2NbWWJiW1liYltZYWFbWWFhW1hgYFtYYGBbWF9fWlhfX1pYXl5aV15eWldcXVpXXF1aV1xdWVdcXFlXW1xZV1tcWVZaW1lWWltZVlpaWVZaWllWWVlZVllZWVVZWVlVWFhZVVhYWFVXV1hVV1dYVFdXWFRWVlhUVlZXVFZWV1RVVVdUVVVXVFVVV1NVVVdTVFRWU1RUVVNUVFVTVFRVU1NTVVNTUlVTU1JUU1JSVFNSUlRTUlJUU1FRVFNRUVNTUFFFSU5MTElNTEpNTkpOTk1PUFBSVFNXV1VcXFpgYV1mZmJsbWdyc2x4enF+gHSDhoiFiIyKjI+NkJOQlZeUmZuXnJ2Zn6CboqOdpaaepqeep6idp6idp6icp6ecpqabpaWapKSZo6OYoqGXoaCXn5+Wnp6Vnp2UnZyTnJuSm5uRmpqQmZmPmJiOl5eNl5aMlZWLlJSKk5OJkpKIkpGIkZCHkI+Gj46FjouEjImDioiCiIeBhoWAhYR/hIN+g4J9goF8gYB7gH96f356fn15fXx4fHt3e3p2enl1eXh0eHdzd3Zy';

interface NotificationOptions {
  soundEnabled?: boolean;
  browserNotificationsEnabled?: boolean;
}

export function useCriticalNotifications(options: NotificationOptions = {}) {
  const { soundEnabled = true, browserNotificationsEnabled = true } = options;
  const { signals, getAggregatedSeverity } = useDashboardSeverity();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousCriticalIdsRef = useRef<Set<string>>(new Set());
  const notificationPermissionRef = useRef<NotificationPermission>('default');

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(ALERT_SOUND_DATA);
    audioRef.current.volume = 0.5;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if (browserNotificationsEnabled && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          notificationPermissionRef.current = permission;
        });
      } else {
        notificationPermissionRef.current = Notification.permission;
      }
    }
  }, [browserNotificationsEnabled]);

  const playAlertSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Audio play failed - likely user hasn't interacted yet
      });
    }
  }, [soundEnabled]);

  const showBrowserNotification = useCallback((signal: SeveritySignal) => {
    if (!browserNotificationsEnabled || !('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      const notification = new Notification('FlowScale Alert', {
        body: signal.message + (signal.blocksOutput ? ' (Blocks Output)' : ''),
        icon: '/favicon.ico',
        tag: signal.id, // Prevents duplicate notifications for same signal
        requireInteraction: true,
      });

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    }
  }, [browserNotificationsEnabled]);

  // Watch for new critical signals
  useEffect(() => {
    const criticalSignals = signals.filter(s => s.level === 'critical');
    const currentCriticalIds = new Set(criticalSignals.map(s => s.id));
    
    // Find newly added critical signals
    criticalSignals.forEach(signal => {
      if (!previousCriticalIdsRef.current.has(signal.id)) {
        // New critical signal detected
        playAlertSound();
        showBrowserNotification(signal);
      }
    });

    previousCriticalIdsRef.current = currentCriticalIds;
  }, [signals, playAlertSound, showBrowserNotification]);

  // Return methods for manual triggering if needed
  return {
    playAlertSound,
    showBrowserNotification,
    notificationPermission: notificationPermissionRef.current,
    requestPermission: () => {
      if ('Notification' in window && Notification.permission === 'default') {
        return Notification.requestPermission();
      }
      return Promise.resolve(Notification.permission);
    }
  };
}
