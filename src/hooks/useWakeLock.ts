import { useEffect, useRef } from 'react';

/**
 * Keeps the screen awake while `active` is true.
 * Re-acquires the lock when the tab regains visibility.
 */
export function useWakeLock(active: boolean): void {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      if (!('wakeLock' in navigator)) return;
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        // Wake lock request failed (e.g. low battery, tab hidden)
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch {
          // already released
        }
        wakeLockRef.current = null;
      }
    };

    if (active) {
      void requestWakeLock();
    } else {
      void releaseWakeLock();
    }

    // Re-acquire wake lock when tab becomes visible again
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && active) {
        void requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      void releaseWakeLock();
    };
  }, [active]);
}
