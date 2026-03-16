import { useCallback, useEffect, useRef, useState } from 'react';
import type { DisplayStatePayload } from '../domain/displayChannel';
import { withDisplayContract } from '../domain/displayChannel';
import type { RemoteHost } from '../domain/remote';

interface UseDisplaySessionOptions {
  hostRef: React.RefObject<RemoteHost | null>;
  enabled: boolean;
  buildFullStatePayload: () => DisplayStatePayload;
  remainingSeconds: number;
  timerStatus: 'stopped' | 'running' | 'paused';
  currentLevelIndex: number;
  showCallTheClock: boolean;
  callTheClockSeconds: number;
  soundEnabled: boolean;
  voiceEnabled: boolean;
}

interface UseDisplaySessionReturn {
  displayCount: number;
}

export function useDisplaySession({
  hostRef,
  enabled,
  buildFullStatePayload,
  remainingSeconds,
  timerStatus,
  currentLevelIndex,
  showCallTheClock,
  callTheClockSeconds,
  soundEnabled,
  voiceEnabled,
}: UseDisplaySessionOptions): UseDisplaySessionReturn {
  const [displayCount, setDisplayCount] = useState(0);
  const lastPayloadRef = useRef<string>('');
  // Counter that increments when a new display connects — triggers full-state push
  const [displayConnectTrigger, setDisplayConnectTrigger] = useState(0);

  // Callback for RemoteHost.onDisplayConnected — push full state immediately
  const onDisplayConnected = useCallback(() => {
    setDisplayConnectTrigger((c) => c + 1);
  }, []);

  // Register onDisplayConnected callback on the host
  useEffect(() => {
    const host = hostRef.current;
    if (!enabled || !host) return;
    host.setDisplayConnectedHandler(onDisplayConnected);
    return () => host.setDisplayConnectedHandler(undefined);
  }, [enabled, hostRef, onDisplayConnected]);

  // Poll display count from host
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on disable
    if (!enabled) { setDisplayCount(0); return; }
    const interval = setInterval(() => {
      const host = hostRef.current;
      setDisplayCount(host?.displayCount ?? 0);
    }, 2000);
    return () => clearInterval(interval);
  }, [hostRef, enabled]);

  // Track last trigger value to detect new display connections
  const lastTriggerRef = useRef(0);

  // Send full state when payload changes OR when a new display connects
  useEffect(() => {
    const host = hostRef.current;
    if (!enabled || !host || host.displayCount === 0) return;
    const payload = buildFullStatePayload();
    const key = JSON.stringify(payload);
    const triggerChanged = displayConnectTrigger !== lastTriggerRef.current;
    lastTriggerRef.current = displayConnectTrigger;
    // Skip if payload unchanged AND no new display connected
    if (key === lastPayloadRef.current && !triggerChanged) return;
    lastPayloadRef.current = key;
    host.sendDisplayState(withDisplayContract({ type: 'full-state', payload }));
  }, [enabled, hostRef, buildFullStatePayload, displayConnectTrigger]);

  // Timer ticks every 500ms
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      const host = hostRef.current;
      if (!host || host.displayCount === 0) return;
      host.sendDisplayState(withDisplayContract({
        type: 'timer-tick',
        payload: { remainingSeconds, status: timerStatus, currentLevelIndex },
      }));
    }, 500);
    return () => clearInterval(interval);
  }, [enabled, hostRef, remainingSeconds, timerStatus, currentLevelIndex]);

  // Call-the-clock state
  useEffect(() => {
    const host = hostRef.current;
    if (!enabled || !host || host.displayCount === 0) return;
    if (showCallTheClock) {
      host.sendDisplayState(withDisplayContract({
        type: 'call-the-clock',
        payload: { durationSeconds: callTheClockSeconds, soundEnabled, voiceEnabled },
      }));
    } else {
      host.sendDisplayState(withDisplayContract({ type: 'call-the-clock-dismiss' }));
    }
  }, [enabled, hostRef, showCallTheClock, callTheClockSeconds, soundEnabled, voiceEnabled]);

  return { displayCount };
}
