import { useState, useCallback, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RemoteController, buildRemoteUrl } from '../domain/remote';
import type { RemoteCommand, RemoteState, RemotePlayerInfo, HostStatus, ControllerStatus } from '../domain/remote';
import { useTranslation } from '../i18n';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { useTheme } from '../theme';
import { formatTime, formatElapsedTime } from '../domain/logic';
import { ChevronIcon } from './ChevronIcon';

// ---------------------------------------------------------------------------
// Host Modal — pure display component (host lifecycle managed by useRemoteControl hook)
// ---------------------------------------------------------------------------

interface HostProps {
  /** Peer ID of the running host */
  peerId: string;
  /** HMAC secret for authentication */
  secret?: string;
  /** Current host connection status */
  status: HostStatus | null;
  /** Number of connected controller peers */
  controllerCount?: number;
  onClose: () => void;
}

export function RemoteHostModal({ peerId, secret, status, controllerCount = 0, onClose }: HostProps) {
  const { t } = useTranslation();
  const dialogRef = useDialogA11y(onClose);
  const { resolved } = useTheme();

  const qrUrl = peerId ? buildRemoteUrl(peerId, secret) : '';

  const qrFg = resolved === 'dark' ? '#e5e7eb' : '#111827';
  const qrBg = resolved === 'dark' ? '#1f2937' : '#ffffff';

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="remote-host-title" className="bg-white/95 dark:bg-gray-900/95 border border-gray-300 dark:border-gray-700/50 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between">
          <h3 id="remote-host-title" className="text-lg font-bold text-gray-900 dark:text-white">{t('remote.hostTitle')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
        </div>

        {(status === 'initializing' || status === null) && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 animate-pulse">
            {t('remote.waitingForConnection')}
          </div>
        )}

        {(status === 'ready' || status === 'connected') && qrUrl && (
          <div className="space-y-4">
            {status === 'ready' && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('remote.scanQR')}</p>
            )}

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-xl">
                <QRCodeSVG
                  value={qrUrl}
                  size={220}
                  fgColor={qrFg}
                  bgColor={qrBg}
                  level="M"
                />
              </div>
            </div>

            {/* Peer ID display */}
            <div className="text-center space-y-1">
              <p className="text-xs text-gray-400 dark:text-gray-500">{t('remote.peerId')}</p>
              <p className="text-2xl font-mono font-bold tracking-widest text-gray-900 dark:text-white select-all">
                {peerId}
              </p>
            </div>

            {/* Connection status */}
            {status === 'connected' && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 py-2">
                  <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-500)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>
                    {controllerCount > 1
                      ? (t as (key: string, params?: Record<string, string | number>) => string)('remote.controllersConnected', { n: controllerCount })
                      : t('remote.connected')}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                  {t('remote.canClose')}
                </p>
              </div>
            )}

            {status === 'ready' && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                {t('remote.waitingForConnection')}
              </p>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-6 space-y-3">
            <div className="text-4xl">{String.fromCodePoint(0x274C)}</div>
            <p className="text-sm text-red-500">{t('remote.error')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Controller View — smartphone remote control UI (touch-optimized fullscreen)
// ---------------------------------------------------------------------------

interface ControllerProps {
  hostPeerId: string;
  /** HMAC secret for command authentication */
  secret?: string | null;
  onClose: () => void;
}

export function RemoteControllerView({ hostPeerId, secret, onClose }: ControllerProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ControllerStatus>('connecting');
  const [state, setState] = useState<RemoteState['data'] | null>(null);
  const controllerRef = useRef<RemoteController | null>(null);

  // Local timer interpolation — SINGLE writer pattern: only the interval writes displaySeconds.
  // onState only updates refs. This prevents two-writer race conditions that cause display flicker.
  const [displaySeconds, setDisplaySeconds] = useState<number | null>(null);
  const lastStateTimeRef = useRef<number>(0);
  const remainingRef = useRef<number>(0);
  const timerStatusRef = useRef<string>('paused');
  const levelIndexRef = useRef<number>(-1);
  const forceUpdateRef = useRef(false);

  // Version mismatch detection
  const [versionMismatch, setVersionMismatch] = useState(false);

  // Syncing indicator after reconnect
  const [isSyncing, setIsSyncing] = useState(false);
  const prevStatusRef = useRef<ControllerStatus>('connecting');

  // Player management section state
  const [playersExpanded, setPlayersExpanded] = useState(false);
  const [eliminatingId, setEliminatingId] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new RemoteController(hostPeerId, {
      onState: (s) => {
        setState(s);
        // Clear syncing indicator on first state update after reconnect
        setIsSyncing(false);
        // Detect level change or status change → force display update (allow jump to any value)
        if (s.currentLevelIndex !== levelIndexRef.current || s.timerStatus !== timerStatusRef.current) {
          forceUpdateRef.current = true;
        }
        // Only update refs — NEVER call setDisplaySeconds here (single-writer pattern)
        remainingRef.current = s.remainingSeconds;
        timerStatusRef.current = s.timerStatus;
        lastStateTimeRef.current = Date.now();
        levelIndexRef.current = s.currentLevelIndex;
      },
      onStatusChange: (s) => setStatus(s),
      onVersionMismatch: () => setVersionMismatch(true),
    }, secret);
    controllerRef.current = ctrl;

    // Permanent 100ms interval — SOLE writer of displaySeconds
    const tickId = setInterval(() => {
      const running = timerStatusRef.current === 'running';
      let target: number;

      if (running) {
        const elapsed = (Date.now() - lastStateTimeRef.current) / 1000;
        target = Math.floor(Math.max(0, remainingRef.current - elapsed));
      } else {
        // Paused: show host's authoritative value directly
        target = Math.floor(remainingRef.current);
      }

      setDisplaySeconds((prev) => {
        // Force update on level/status change (reset, level advance, pause/resume)
        if (forceUpdateRef.current) {
          forceUpdateRef.current = false;
          return target;
        }
        // First value
        if (prev === null) return target;
        // Monotonic decrease: during running countdown, never jump UP (suppresses network-jitter flicker)
        if (running && target > prev) return prev;
        return target;
      });
    }, 100);

    // Request Wake Lock to keep screen on
    let wakeLock: WakeLockSentinel | null = null;
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(wl => { wakeLock = wl; }).catch(() => { /* ignore */ });
    }

    return () => {
      ctrl.destroy();
      clearInterval(tickId);
      if (wakeLock) { wakeLock.release().catch(() => { /* ignore */ }); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendCmd = useCallback((action: RemoteCommand['action'], payload?: Record<string, unknown>) => {
    controllerRef.current?.sendCommand(action, payload);
  }, []);

  const handleRetry = useCallback(() => {
    controllerRef.current?.retry();
  }, []);

  // Detect reconnect → connected transition to show syncing indicator
  useEffect(() => {
    if (status === 'connected' && prevStatusRef.current === 'reconnecting') {
      setIsSyncing(true);
    }
    prevStatusRef.current = status;
  }, [status]);

  // Force dark mode on controller via class
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  // Use interpolated seconds for display, fallback to state
  const shownSeconds = displaySeconds ?? state?.remainingSeconds ?? 0;

  return (
    <div
      className="min-h-screen bg-gray-950 text-white flex flex-col select-none"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Version mismatch warning */}
      {versionMismatch && (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center space-y-4">
            <div className="bg-amber-500/20 border border-amber-500/40 rounded-2xl p-6 space-y-3">
              <div className="text-3xl">{String.fromCodePoint(0x26A0, 0xFE0F)}</div>
              <h3 className="text-lg font-bold text-amber-400">{t('remote.versionMismatch')}</h3>
              <p className="text-sm text-amber-300/80">{t('remote.versionMismatchHint')}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-amber-600 text-white rounded-xl text-sm font-medium active:scale-95 transition-transform mt-2"
              >
                {t('remote.reload')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection status banner */}
      {!versionMismatch && status === 'reconnecting' && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 text-center text-sm text-amber-400">
          {t('remote.reconnecting')}
        </div>
      )}

      {/* Connecting state */}
      {!versionMismatch && status === 'connecting' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 animate-pulse">
            <div className="text-5xl">{String.fromCodePoint(0x1F4F1)}</div>
            <p className="text-lg text-gray-400">{t('remote.connecting')}</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {!versionMismatch && status === 'error' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 px-6">
            <div className="text-5xl">{String.fromCodePoint(0x274C)}</div>
            <p className="text-lg text-red-400">{t('remote.reconnectFailed')}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRetry}
                className="px-6 py-3 text-white rounded-xl text-sm font-medium active:scale-95 transition-transform"
                style={{ backgroundColor: 'var(--accent-600)' }}
              >
                {t('remote.retry')}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium active:scale-95 transition-transform border border-gray-700/60"
              >
                {t('remote.disconnect')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connected state — full controller UI */}
      {!versionMismatch && (status === 'connected' || (status === 'reconnecting' && state)) && (
        <div className="flex-1 flex flex-col px-4 py-3 max-w-md mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              {state?.tournamentName && (
                <h2 className="text-sm font-medium text-gray-400 truncate">{state.tournamentName}</h2>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: status === 'connected' ? 'var(--accent-500)' : '#f59e0b' }}
              />
              <span className="text-xs text-gray-500">
                {status === 'connected' ? t('remote.connected') : t('remote.reconnecting')}
              </span>
            </div>
          </div>

          {/* Syncing indicator after reconnect */}
          {isSyncing && (
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl px-4 py-2 text-center text-sm text-blue-400 mb-3 animate-pulse">
              {t('remote.syncing')}
            </div>
          )}

          {/* Timer display */}
          {state && (
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 mb-4">
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">
                  {state.isBreak ? `${String.fromCodePoint(0x2615)} ${state.levelLabel}` : state.levelLabel}
                </div>
                <div className="text-5xl font-mono font-bold tabular-nums tracking-tight mb-2">
                  {formatTime(shownSeconds)}
                </div>
                {state.isBreak ? (
                  <div className="text-lg text-amber-400 font-medium">
                    {t('remote.breakLabel')}
                  </div>
                ) : (
                  <div className="text-xl font-mono text-gray-300">
                    {state.smallBlind}/{state.bigBlind}
                    {state.ante ? ` (${state.ante})` : ''}
                  </div>
                )}
                {state.nextLevelLabel && (
                  <div className="text-xs text-gray-500 mt-1">
                    {t('remote.nextLevel')}: {state.nextLevelLabel}
                  </div>
                )}
              </div>

              {/* Status row */}
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-800">
                <span className="text-xs text-gray-500">
                  {state.activePlayerCount}/{state.totalPlayerCount} {t('remote.players')}
                </span>
                <div className="flex items-center gap-2">
                  {state.isItm && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-500) 20%, transparent)', color: 'var(--accent-400)' }}>
                      ITM
                    </span>
                  )}
                  {state.isBubble && (
                    <span className="text-xs font-bold text-red-400 animate-pulse">BUBBLE!</span>
                  )}
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={state.timerStatus === 'running'
                      ? { backgroundColor: 'color-mix(in srgb, var(--accent-500) 20%, transparent)', color: 'var(--accent-400)' }
                      : { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }
                    }
                  >
                    {state.timerStatus === 'running' ? t('remote.play') : t('remote.pause')}
                  </span>
                </div>
              </div>

              {/* Tournament stats row */}
              {(state.prizePool != null || state.avgStackBB != null || state.elapsedSeconds != null) && (
                <div className="flex justify-center gap-3 mt-2 pt-2 border-t border-gray-800/60">
                  {state.prizePool != null && state.prizePool > 0 && (
                    <span className="text-xs text-gray-500">
                      {String.fromCodePoint(0x1F4B0)} {state.prizePool}{String.fromCodePoint(0x20AC)}
                    </span>
                  )}
                  {state.avgStackBB != null && state.avgStackBB > 0 && !state.isBreak && (
                    <span className="text-xs text-gray-500">
                      {t('remote.avgStackShort')} {state.avgStackBB} BB
                    </span>
                  )}
                  {state.elapsedSeconds != null && state.elapsedSeconds > 0 && (
                    <span className="text-xs text-gray-500">
                      {String.fromCodePoint(0x23F1)} {formatElapsedTime(state.elapsedSeconds)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Main control buttons */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <button
              onClick={() => sendCmd('prev')}
              className="aspect-square flex items-center justify-center bg-gray-800 border border-gray-700/60 rounded-xl text-2xl active:scale-95 transition-transform"
              title={t('remote.prev')}
              aria-label={t('remote.prev')}
            >
              {String.fromCodePoint(0x23EE)}
            </button>
            <button
              onClick={() => sendCmd('toggle')}
              className="aspect-square flex items-center justify-center text-white rounded-xl text-3xl active:scale-95 transition-transform shadow-lg"
              style={{ backgroundColor: 'var(--accent-600)', boxShadow: '0 10px 15px -3px var(--accent-900)' }}
              title={state?.timerStatus === 'running' ? t('remote.pause') : t('remote.play')}
              aria-label={state?.timerStatus === 'running' ? t('remote.pause') : t('remote.play')}
            >
              {state?.timerStatus === 'running' ? String.fromCodePoint(0x23F8) : String.fromCodePoint(0x25B6, 0xFE0F)}
            </button>
            <button
              onClick={() => sendCmd('next')}
              className="aspect-square flex items-center justify-center bg-gray-800 border border-gray-700/60 rounded-xl text-2xl active:scale-95 transition-transform"
              title={t('remote.next')}
              aria-label={t('remote.next')}
            >
              {String.fromCodePoint(0x23ED)}
            </button>
          </div>

          {/* Break controls: skip / extend */}
          {state?.isBreak && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                onClick={() => sendCmd('skipBreak')}
                className="px-4 py-3 bg-amber-900/30 text-amber-400 rounded-xl text-sm font-medium active:scale-95 transition-transform border border-amber-700/40"
                title={t('controls.skipBreak')}
              >
                {String.fromCodePoint(0x23ED)} {t('controls.skipBreak')}
              </button>
              <button
                onClick={() => sendCmd('extendBreak', { seconds: 120 })}
                className="px-4 py-3 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium active:scale-95 transition-transform border border-gray-700/40"
                title={t('controls.extendBreak2')}
              >
                {t('controls.extendBreak2')}
              </button>
              <button
                onClick={() => sendCmd('extendBreak', { seconds: 300 })}
                className="px-4 py-3 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium active:scale-95 transition-transform border border-gray-700/40"
                title={t('controls.extendBreak5')}
              >
                {t('controls.extendBreak5')}
              </button>
            </div>
          )}

          {/* Secondary actions */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => sendCmd('advanceDealer')}
              className="px-4 py-3 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium active:scale-95 transition-transform border border-gray-700/40"
            >
              {String.fromCodePoint(0x1F3B2)} {t('remote.dealer')}
            </button>
            <button
              onClick={() => sendCmd('toggleSound')}
              className="px-4 py-3 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium active:scale-95 transition-transform border border-gray-700/40"
            >
              {state?.soundEnabled ? String.fromCodePoint(0x1F50A) : String.fromCodePoint(0x1F507)} {t('remote.sound')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => sendCmd('call-the-clock')}
              className="px-4 py-3 bg-amber-900/30 text-amber-400 rounded-xl text-sm font-medium active:scale-95 transition-transform border border-amber-700/40"
            >
              {String.fromCodePoint(0x23F1)} {t('remote.callClock')}
            </button>
            <button
              onClick={() => sendCmd('reset')}
              className="px-4 py-3 bg-red-900/30 text-red-400 rounded-xl text-sm font-medium active:scale-95 transition-transform border border-red-700/40"
            >
              {String.fromCodePoint(0x1F504)} {t('remote.reset')}
            </button>
          </div>

          {/* Player management section */}
          {state?.players && state.players.length > 0 && (
            <PlayerSection
              players={state.players}
              expanded={playersExpanded}
              onToggle={() => setPlayersExpanded((v) => !v)}
              eliminatingId={eliminatingId}
              onStartEliminate={(id) => setEliminatingId(id)}
              onCancelEliminate={() => setEliminatingId(null)}
              onConfirmEliminate={(playerId, eliminatedBy) => {
                sendCmd('eliminatePlayer', { playerId, eliminatedBy });
                setEliminatingId(null);
              }}
              onRebuy={(playerId) => sendCmd('rebuyPlayer', { playerId })}
              onAddOn={(playerId, hasAddOn) => sendCmd('addOnPlayer', { playerId, hasAddOn })}
              bountyEnabled={state.bountyEnabled ?? false}
              rebuyActive={state.rebuyActive ?? false}
              addOnWindowOpen={state.addOnWindowOpen ?? false}
              activeCount={state.activePlayerCount}
              totalCount={state.totalPlayerCount}
              t={t as TFn}
            />
          )}

          {/* Footer with disconnect */}
          <div className="mt-auto pt-3">
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-gray-800/60 text-gray-500 rounded-xl text-sm active:scale-95 transition-transform border border-gray-700/30"
            >
              {t('remote.disconnect')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Player management sub-components
// ---------------------------------------------------------------------------

type TFn = (key: string, params?: Record<string, string | number>) => string;

interface PlayerSectionProps {
  players: RemotePlayerInfo[];
  expanded: boolean;
  onToggle: () => void;
  eliminatingId: string | null;
  onStartEliminate: (playerId: string) => void;
  onCancelEliminate: () => void;
  onConfirmEliminate: (playerId: string, eliminatedBy: string | null) => void;
  onRebuy: (playerId: string) => void;
  onAddOn: (playerId: string, hasAddOn: boolean) => void;
  bountyEnabled: boolean;
  rebuyActive: boolean;
  addOnWindowOpen: boolean;
  activeCount: number;
  totalCount: number;
  t: TFn;
}

function PlayerSection({
  players,
  expanded,
  onToggle,
  eliminatingId,
  onStartEliminate,
  onCancelEliminate,
  onConfirmEliminate,
  onRebuy,
  onAddOn,
  bountyEnabled,
  rebuyActive,
  addOnWindowOpen,
  activeCount,
  totalCount,
  t,
}: PlayerSectionProps) {
  const activePlayers = players.filter((p) => p.s === 'a');

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden mb-3">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={onToggle}
        className="group w-full flex items-center justify-between px-4 py-3 active:bg-gray-800 transition-colors"
      >
        <span className="text-sm font-medium text-gray-300">
          {String.fromCodePoint(0x1F465)} {activeCount}/{totalCount} {t('remote.players')}
        </span>
        <ChevronIcon
          open={expanded}
          className="text-gray-500 group-active:text-gray-300"
        />
      </button>

      {/* Player list */}
      {expanded && (
        <div className="border-t border-gray-800 max-h-[40vh] overflow-y-auto">
          {activePlayers.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              {t('remote.noPlayers')}
            </div>
          ) : (
            <div className="divide-y divide-gray-800/60">
              {activePlayers.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  isEliminating={eliminatingId === player.id}
                  onStartEliminate={() => onStartEliminate(player.id)}
                  onCancelEliminate={onCancelEliminate}
                  onConfirmEliminate={(eliminatedBy) => onConfirmEliminate(player.id, eliminatedBy)}
                  onRebuy={() => onRebuy(player.id)}
                  onAddOn={(hasAddOn) => onAddOn(player.id, hasAddOn)}
                  bountyEnabled={bountyEnabled}
                  rebuyActive={rebuyActive}
                  addOnWindowOpen={addOnWindowOpen}
                  otherActivePlayers={activePlayers.filter((p) => p.id !== player.id)}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PlayerRowProps {
  player: RemotePlayerInfo;
  isEliminating: boolean;
  onStartEliminate: () => void;
  onCancelEliminate: () => void;
  onConfirmEliminate: (eliminatedBy: string | null) => void;
  onRebuy: () => void;
  onAddOn: (hasAddOn: boolean) => void;
  bountyEnabled: boolean;
  rebuyActive: boolean;
  addOnWindowOpen: boolean;
  otherActivePlayers: RemotePlayerInfo[];
  t: TFn;
}

function PlayerRow({
  player,
  isEliminating,
  onStartEliminate,
  onCancelEliminate,
  onConfirmEliminate,
  onRebuy,
  onAddOn,
  bountyEnabled,
  rebuyActive,
  addOnWindowOpen,
  otherActivePlayers,
  t,
}: PlayerRowProps) {
  return (
    <div className="px-4 py-2.5">
      {/* Main row: Name + action buttons */}
      <div className="flex items-center gap-2">
        <span className="flex-1 min-w-0 text-sm text-gray-200 truncate">
          {player.n}
          {player.r > 0 && (
            <span className="ml-1.5 text-xs text-gray-500">R{player.r}</span>
          )}
          {player.ao && (
            <span className="ml-1 text-xs text-gray-500">A</span>
          )}
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Rebuy button — only during rebuy phase */}
          {rebuyActive && (
            <button
              onClick={onRebuy}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium active:scale-95 transition-transform border"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent-500) 15%, transparent)',
                borderColor: 'color-mix(in srgb, var(--accent-500) 30%, transparent)',
                color: 'var(--accent-400)',
              }}
              title={t('remote.rebuyShort')}
            >
              {String.fromCodePoint(0x1F504)} {t('remote.rebuyShort')}
            </button>
          )}

          {/* Add-On toggle — only during add-on window */}
          {addOnWindowOpen && !player.ao && (
            <button
              onClick={() => onAddOn(true)}
              className="px-2.5 py-1.5 bg-amber-900/30 text-amber-400 rounded-lg text-xs font-medium active:scale-95 transition-transform border border-amber-700/40"
              title={t('remote.addOnShort')}
            >
              {t('remote.addOnShort')}
            </button>
          )}

          {/* Eliminate button */}
          <button
            onClick={() => {
              if (bountyEnabled) {
                onStartEliminate();
              } else {
                onConfirmEliminate(null);
              }
            }}
            className="px-2.5 py-1.5 bg-red-900/30 text-red-400 rounded-lg text-xs font-medium active:scale-95 transition-transform border border-red-700/40"
            title={t('remote.eliminate')}
          >
            {String.fromCodePoint(0x274C)} {t('remote.eliminate')}
          </button>
        </div>
      </div>

      {/* Bounty eliminator picker — shown inline when this player is being eliminated */}
      {isEliminating && (
        <div className="mt-2.5 pt-2.5 border-t border-gray-700/40 animate-fade-in">
          <p className="text-xs text-gray-400 mb-2">
            {t('remote.whoEliminated', { name: player.n })}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {otherActivePlayers.map((other) => (
              <button
                key={other.id}
                onClick={() => onConfirmEliminate(other.id)}
                className="px-3 py-2 bg-gray-800 text-gray-200 rounded-lg text-xs font-medium active:scale-95 transition-transform border border-gray-700/50 hover:bg-gray-700"
              >
                {other.n}
              </button>
            ))}
            <button
              onClick={onCancelEliminate}
              className="px-3 py-2 bg-gray-800/60 text-gray-500 rounded-lg text-xs font-medium active:scale-95 transition-transform border border-gray-700/30"
            >
              {t('remote.cancelElimination')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
