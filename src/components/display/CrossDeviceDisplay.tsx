import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import type { DisplayStatePayload } from '../../domain/displayChannel';
import { isDisplayMessage, deserializeColorUpMap } from '../../domain/displayChannel';
import { useTranslation } from '../../i18n';
import { DisplayMode } from './DisplayMode';

const CallTheClock = lazy(() => import('../CallTheClock').then((m) => ({ default: m.CallTheClock })));

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'error';

interface Props {
  hostPeerId: string;
}

/**
 * CrossDeviceDisplay — PeerJS-based remote display client.
 *
 * Connects to a host peer, receives DisplayStatePayload messages,
 * and renders the full DisplayMode with timer interpolation for smooth
 * countdown display. Auto-reconnect with exponential backoff.
 */
export function CrossDeviceDisplay({ hostPeerId }: Props) {
  const { t } = useTranslation();

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [state, setState] = useState<DisplayStatePayload | null>(null);

  // Call the Clock overlay
  const [ctcPayload, setCtcPayload] = useState<{
    durationSeconds: number;
    soundEnabled: boolean;
    voiceEnabled: boolean;
  } | null>(null);

  // Timer interpolation refs (single-writer pattern from RemoteControllerView)
  const [displaySeconds, setDisplaySeconds] = useState<number | null>(null);
  const lastStateTimeRef = useRef<number>(0);
  const remainingRef = useRef<number>(0);
  const timerStatusRef = useRef<string>('paused');
  const levelIndexRef = useRef<number>(-1);
  const forceUpdateRef = useRef(false);

  // Reconnect state
  const peerRef = useRef<import('peerjs').default | null>(null);
  const connRef = useRef<import('peerjs').DataConnection | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destroyedRef = useRef(false);

  const MAX_RECONNECT = 3;
  const BACKOFF_BASE = 2000;

  const connect = useCallback(async () => {
    if (destroyedRef.current) return;

    try {
      const { default: Peer } = await import('peerjs');

      // Clean up existing peer
      if (peerRef.current) {
        try { peerRef.current.destroy(); } catch { /* ignore */ }
        peerRef.current = null;
      }

      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', () => {
        if (destroyedRef.current) return;
        const conn = peer.connect(hostPeerId, { reliable: true });
        connRef.current = conn;

        conn.on('open', () => {
          if (destroyedRef.current) return;
          setStatus('connected');
          reconnectAttemptRef.current = 0;

          // Send hello handshake
          conn.send({ type: 'hello', role: 'display', version: 2 });
        });

        conn.on('data', (raw: unknown) => {
          if (destroyedRef.current) return;
          // PeerJS delivers JSON strings (binary serialization preserves type) — parse before checking
          const msg = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : raw;
          if (!isDisplayMessage(msg)) return;

          switch (msg.type) {
            case 'full-state':
              setState(msg.payload);
              // Reset tick on full-state, update interpolation refs
              remainingRef.current = msg.payload.timerState.remainingSeconds;
              timerStatusRef.current = msg.payload.timerState.status;
              lastStateTimeRef.current = Date.now();
              if (msg.payload.timerState.currentLevelIndex !== levelIndexRef.current) {
                forceUpdateRef.current = true;
              }
              levelIndexRef.current = msg.payload.timerState.currentLevelIndex;
              break;
            case 'timer-tick':
              // Detect level or status change
              if (msg.payload.currentLevelIndex !== levelIndexRef.current || msg.payload.status !== timerStatusRef.current) {
                forceUpdateRef.current = true;
              }
              remainingRef.current = msg.payload.remainingSeconds;
              timerStatusRef.current = msg.payload.status;
              lastStateTimeRef.current = Date.now();
              levelIndexRef.current = msg.payload.currentLevelIndex;
              break;
            case 'call-the-clock':
              setCtcPayload(msg.payload);
              break;
            case 'call-the-clock-dismiss':
              setCtcPayload(null);
              break;
            case 'close':
              window.close();
              break;
          }
        });

        conn.on('close', () => {
          if (destroyedRef.current) return;
          attemptReconnect();
        });

        conn.on('error', () => {
          if (destroyedRef.current) return;
          attemptReconnect();
        });
      });

      peer.on('error', () => {
        if (destroyedRef.current) return;
        attemptReconnect();
      });

      peer.on('disconnected', () => {
        if (destroyedRef.current) return;
        attemptReconnect();
      });
    } catch {
      if (!destroyedRef.current) {
        attemptReconnect();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostPeerId]);

  const attemptReconnect = useCallback(() => {
    if (destroyedRef.current) return;
    const attempt = reconnectAttemptRef.current;
    if (attempt >= MAX_RECONNECT) {
      setStatus('error');
      return;
    }
    setStatus('reconnecting');
    reconnectAttemptRef.current = attempt + 1;
    const delay = BACKOFF_BASE * Math.pow(2, attempt); // 2s, 4s, 8s
    reconnectTimerRef.current = setTimeout(() => {
      if (!destroyedRef.current) {
        connect();
      }
    }, delay);
  }, [connect]);

  // Connect on mount, clean up on unmount
  useEffect(() => {
    destroyedRef.current = false;
    connect();

    // Timer interpolation — permanent 100ms interval, sole writer of displaySeconds
    const tickId = setInterval(() => {
      const running = timerStatusRef.current === 'running';
      let target: number;

      if (running) {
        const elapsed = (Date.now() - lastStateTimeRef.current) / 1000;
        target = Math.floor(Math.max(0, remainingRef.current - elapsed));
      } else {
        target = Math.floor(remainingRef.current);
      }

      setDisplaySeconds((prev) => {
        if (forceUpdateRef.current) {
          forceUpdateRef.current = false;
          return target;
        }
        if (prev === null) return target;
        if (running && target > prev) return prev;
        return target;
      });
    }, 100);

    return () => {
      destroyedRef.current = true;
      clearInterval(tickId);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (connRef.current) {
        try { connRef.current.close(); } catch { /* ignore */ }
      }
      if (peerRef.current) {
        try { peerRef.current.destroy(); } catch { /* ignore */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  // Auto-fullscreen on first click
  const handleFullscreen = useCallback(() => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => { /* ignore */ });
      } else if ((el as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
        (el as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
      }
    } catch {
      // Fullscreen not available
    }
  }, []);

  const handleRetry = useCallback(() => {
    reconnectAttemptRef.current = 0;
    setStatus('connecting');
    connect();
  }, [connect]);

  // --- Render ---

  // Connecting state
  if (status === 'connecting' && !state) {
    return (
      <div
        className="fixed inset-0 bg-gray-950 text-white flex flex-col items-center justify-center select-none cursor-pointer"
        onClick={handleFullscreen}
      >
        <div className="animate-pulse text-center">
          <p className="text-4xl mb-4">{String.fromCodePoint(0x1F4FA)}</p>
          <p className="text-xl text-gray-400">{t('share.display.connecting' as Parameters<typeof t>[0])}</p>
          <p className="text-sm text-gray-600 mt-4">{t('display.clickForFullscreen')}</p>
        </div>
      </div>
    );
  }

  // Error state (exhausted reconnects, no state yet)
  if (status === 'error' && !state) {
    return (
      <div
        className="fixed inset-0 bg-gray-950 text-white flex flex-col items-center justify-center select-none"
        onClick={handleFullscreen}
      >
        <div className="text-center space-y-4 px-6">
          <div className="text-5xl">{String.fromCodePoint(0x274C)}</div>
          <p className="text-lg text-red-400">{t('share.display.connectionError' as Parameters<typeof t>[0])}</p>
          <button
            onClick={handleRetry}
            className="px-6 py-3 text-white rounded-xl text-sm font-medium active:scale-95 transition-transform"
            style={{ backgroundColor: 'var(--accent-600)' }}
          >
            {t('remote.retry' as Parameters<typeof t>[0])}
          </button>
        </div>
      </div>
    );
  }

  // Waiting for first full-state (connected but no data yet)
  if (!state) {
    return (
      <div
        className="fixed inset-0 bg-gray-950 text-white flex flex-col items-center justify-center select-none cursor-pointer"
        onClick={handleFullscreen}
      >
        <div className="animate-pulse text-center">
          <p className="text-4xl mb-4">{String.fromCodePoint(0x1F4FA)}</p>
          <p className="text-xl text-gray-400">{t('share.display.waitingForState' as Parameters<typeof t>[0])}</p>
        </div>
      </div>
    );
  }

  // Build effective timer state with interpolated seconds
  const shownSeconds = displaySeconds ?? state.timerState.remainingSeconds;
  const effectiveTimerState = {
    ...state.timerState,
    remainingSeconds: shownSeconds,
  };

  // Reconstruct colorUpMap from serialized schedule
  const colorUpMap = deserializeColorUpMap(state.colorUpSchedule);

  return (
    <div onClick={handleFullscreen}>
      {/* Reconnecting banner overlay */}
      {status === 'reconnecting' && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 text-center text-sm text-amber-400">
          {t('remote.reconnecting' as Parameters<typeof t>[0])}
        </div>
      )}

      {/* Error banner overlay (when we have state but lost connection) */}
      {status === 'error' && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-red-500/20 border-b border-red-500/30 px-4 py-2 text-center text-sm text-red-400 flex items-center justify-center gap-3">
          <span>{t('share.display.connectionError' as Parameters<typeof t>[0])}</span>
          <button
            onClick={handleRetry}
            className="px-3 py-1 text-white rounded-lg text-xs font-medium active:scale-95 transition-transform"
            style={{ backgroundColor: 'var(--accent-600)' }}
          >
            {t('remote.retry' as Parameters<typeof t>[0])}
          </button>
        </div>
      )}

      <DisplayMode
        timerState={effectiveTimerState}
        levels={state.levels}
        chipConfig={state.chipConfig}
        colorUpMap={colorUpMap}
        tournamentName={state.tournamentName}
        activePlayerCount={state.activePlayerCount}
        totalPlayerCount={state.totalPlayerCount}
        isBubble={state.isBubble}
        isLastHand={state.isLastHand}
        isHandForHand={state.isHandForHand}
        onExit={() => window.close()}
        players={state.players}
        dealerIndex={state.dealerIndex}
        buyIn={state.buyIn}
        payout={state.payout}
        rebuy={state.rebuy}
        addOn={state.addOn}
        bounty={state.bounty}
        averageStack={state.averageStack}
        tournamentElapsed={state.tournamentElapsed}
        tables={state.tables}
        showDealerBadges={state.showDealerBadges}
        leagueName={state.leagueName}
        leagueStandings={state.leagueStandings}
        sidePotData={state.sidePotData}
        displayScreens={state.displayScreens}
        displayRotationInterval={state.displayRotationInterval}
        displayLayout={state.displayLayout}
        currency={state.currency}
      />
      {ctcPayload && (
        <Suspense fallback={null}>
          <CallTheClock
            durationSeconds={ctcPayload.durationSeconds}
            soundEnabled={ctcPayload.soundEnabled}
            voiceEnabled={ctcPayload.voiceEnabled}
            onClose={() => setCtcPayload(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
