import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { RemoteHost, parseRemoteHash, loadHostSession } from '../domain/remote';
import type { RemoteCommand, HostStatus } from '../domain/remote';

interface UseRemoteControlOptions {
  onCommand: (cmd: RemoteCommand) => void;
  enabled: boolean; // typically: mode === 'game'
}

interface UseRemoteControlReturn {
  /** Ref to the RemoteHost instance (for sending state updates) */
  hostRef: React.RefObject<RemoteHost | null>;
  /** Current host status */
  hostStatus: HostStatus | null;
  /** Number of currently connected controller peers */
  controllerCount: number;
  /** Whether the host modal should be shown */
  showRemoteModal: boolean;
  setShowRemoteModal: (v: boolean) => void;
  /** True if this window was opened via #remote= hash (controller mode) */
  isControllerMode: boolean;
  /** The host peer ID to connect to (only set in controller mode) */
  controllerPeerId: string | null;
  /** The HMAC secret for controller mode (only set when present in URL) */
  controllerSecret: string | null;
  /** Start hosting (create RemoteHost if not already running) */
  startHost: () => void;
  /** True if the host was resumed from a persisted session (page refresh) */
  hostResumed: boolean;
}

/**
 * Hook to manage remote control state.
 *
 * - Creates and manages RemoteHost lifecycle (survives modal close)
 * - Detects #remote= hash on mount → enters controller mode
 * - Cleans up on mode switch / unmount
 */
export function useRemoteControl({ onCommand, enabled }: UseRemoteControlOptions): UseRemoteControlReturn {
  const hostRef = useRef<RemoteHost | null>(null);
  const [showRemoteModalRaw, setShowRemoteModal] = useState(false);
  const [hostStatusRaw, setHostStatusRaw] = useState<HostStatus | null>(null);
  const [controllerCountRaw, setControllerCountRaw] = useState(0);
  const [hostResumed, setHostResumed] = useState(false);

  // Keep onCommand ref fresh so the host always calls the latest handler
  const onCommandRef = useRef(onCommand);
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  // Derive effective modal visibility — only show when enabled (game mode)
  const showRemoteModal = useMemo(() => showRemoteModalRaw && enabled, [showRemoteModalRaw, enabled]);

  // Derive effective host status — null when disabled
  const hostStatus = useMemo(() => enabled ? hostStatusRaw : null, [enabled, hostStatusRaw]);

  // Derive effective controller count — 0 when disabled
  const controllerCount = useMemo(() => enabled ? controllerCountRaw : 0, [enabled, controllerCountRaw]);

  // Detect controller mode from URL hash (only once on mount)
  const [controllerInfo] = useState<{ peerId: string; secret: string | null } | null>(() => {
    const hash = window.location.hash;
    const result = parseRemoteHash(hash);
    if (result) {
      // Clear hash from URL
      history.replaceState(null, '', window.location.pathname + window.location.search);
      return result;
    }
    return null;
  });

  const controllerPeerId = controllerInfo?.peerId ?? null;
  const controllerSecret = controllerInfo?.secret ?? null;
  const isControllerMode = controllerPeerId !== null;

  // Start hosting — creates RemoteHost if not already active
  const startHost = useCallback(() => {
    if (hostRef.current) {
      // Host already running — just show modal
      setShowRemoteModal(true);
      return;
    }

    // Check for persisted session from a previous page load (same tab)
    const persisted = loadHostSession();
    const host = new RemoteHost(
      {
        onCommand: (cmd) => onCommandRef.current(cmd),
        onStatusChange: (s) => setHostStatusRaw(s),
        onControllerCountChange: (n) => setControllerCountRaw(n),
      },
      persisted ? { peerId: persisted.peerId, secret: persisted.secret } : undefined,
    );
    hostRef.current = host;
    setHostResumed(host.resumed);
    setShowRemoteModal(true);
  }, []);

  // Cleanup host when switching away from game mode
  useEffect(() => {
    if (!enabled && hostRef.current) {
      hostRef.current.destroy();
      hostRef.current = null;
      // hostStatusRaw will be stale but hostStatus derives null when !enabled
    }
  }, [enabled]);

  return {
    hostRef,
    hostStatus,
    controllerCount,
    showRemoteModal,
    setShowRemoteModal,
    isControllerMode,
    controllerPeerId,
    controllerSecret,
    startHost,
    hostResumed,
  };
}
