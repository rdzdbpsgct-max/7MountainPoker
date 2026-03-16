import { useCallback, useEffect, useRef } from 'react';
import type { SetStateAction } from 'react';
import type { RemoteCommand, RemotePlayerInfo } from '../domain/remote';
import type { Level, Player, Settings, TimerState, TournamentConfig, TournamentEvent } from '../domain/types';
import type { TranslationKey } from '../i18n';
import { computePrizePool, computeAverageStackInBB, createEvent } from '../domain/logic';
import { useRemoteControl } from './useRemoteControl';

type AppMode = 'setup' | 'game' | 'league';

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

interface TimerControls {
  toggleStartPause: () => void;
  start: () => void;
  pause: () => void;
  nextLevel: () => void;
  previousLevel: () => void;
  resetLevel: () => void;
  extendLevel: (additionalSeconds: number) => void;
}

interface UseRemoteHostBridgeParams {
  mode: AppMode;
  config: TournamentConfig;
  settings: Settings;
  timerState: TimerState;
  timerControls: TimerControls;
  activePlayerCount: number;
  bubbleActive: boolean;
  rebuyActive: boolean;
  addOnWindowOpen: boolean;
  bountyEnabled: boolean;
  averageStack: number;
  tournamentElapsed: number;
  isItm: boolean;
  onAdvanceDealer: () => void;
  onEliminatePlayer: (playerId: string, eliminatedBy: string | null) => void;
  onUpdatePlayerRebuys: (playerId: string, newCount: number) => void;
  onUpdatePlayerAddOn: (playerId: string, hasAddOn: boolean) => void;
  setShowCallTheClock: (value: SetStateAction<boolean>) => void;
  setSettings: (value: SetStateAction<Settings>) => void;
  onAppendEvent: (event: TournamentEvent) => void;
  t: Translate;
}

/** Build compact player list for remote state (short field names for message size) */
function buildNextLevelLabel(levels: Level[], currentIndex: number, t: (key: string, params?: Record<string, string | number>) => string): string | undefined {
  const next = levels[currentIndex + 1];
  if (!next) return undefined;
  if (next.type === 'break') {
    const mins = Math.round(next.durationSeconds / 60);
    return `${next.label || t('config.break')} ${mins} Min`;
  }
  const nextPlayNumber = levels.slice(0, currentIndex + 2).filter((l) => l.type === 'level').length;
  return `Level ${nextPlayNumber}: ${next.smallBlind}/${next.bigBlind}${next.ante ? ` (${next.ante})` : ''}`;
}

function buildRemotePlayerList(players: Player[]): RemotePlayerInfo[] {
  // For message-size budget: only include active players when list is large
  const list = players.length > 18
    ? players.filter((p) => p.status === 'active')
    : players;

  return list.map((p) => ({
    id: p.id,
    n: p.name.slice(0, 15),
    s: p.status === 'eliminated' ? 'e' as const : 'a' as const,
    r: p.rebuys,
    ao: p.addOn,
  }));
}

export function useRemoteHostBridge({
  mode,
  config,
  settings,
  timerState,
  timerControls,
  activePlayerCount,
  bubbleActive,
  rebuyActive,
  addOnWindowOpen,
  bountyEnabled,
  averageStack,
  tournamentElapsed,
  isItm,
  onAdvanceDealer,
  onEliminatePlayer,
  onUpdatePlayerRebuys,
  onUpdatePlayerAddOn,
  setShowCallTheClock,
  setSettings,
  onAppendEvent,
  t,
}: UseRemoteHostBridgeParams) {
  // Keep stable refs for player callbacks (avoid re-creating handleRemoteCommand on every player change)
  const playersRef = useRef(config.players);
  playersRef.current = config.players;
  const eliminateRef = useRef(onEliminatePlayer);
  eliminateRef.current = onEliminatePlayer;
  const rebuyRef = useRef(onUpdatePlayerRebuys);
  rebuyRef.current = onUpdatePlayerRebuys;
  const addOnRef = useRef(onUpdatePlayerAddOn);
  addOnRef.current = onUpdatePlayerAddOn;
  const appendEventRef = useRef(onAppendEvent);
  appendEventRef.current = onAppendEvent;

  const currentLevelIndexRef = useRef(timerState.currentLevelIndex);
  currentLevelIndexRef.current = timerState.currentLevelIndex;

  // Refs for values that change every tick — excluded from useEffect deps to avoid
  // interval teardown, but the interval must read the CURRENT value (not stale closure).
  const remainingSecondsRef = useRef(timerState.remainingSeconds);
  remainingSecondsRef.current = timerState.remainingSeconds;
  const tournamentElapsedRef = useRef(tournamentElapsed);
  tournamentElapsedRef.current = tournamentElapsed;
  const averageStackRef = useRef(averageStack);
  useEffect(() => { averageStackRef.current = averageStack; });

  const handleRemoteCommand = useCallback((cmd: RemoteCommand) => {
    switch (cmd.action) {
      case 'toggle':
        timerControls.toggleStartPause();
        break;
      case 'play':
        timerControls.start();
        break;
      case 'pause':
        timerControls.pause();
        break;
      case 'next':
        timerControls.nextLevel();
        break;
      case 'prev':
        timerControls.previousLevel();
        break;
      case 'reset':
        timerControls.resetLevel();
        break;
      case 'call-the-clock':
        setShowCallTheClock((value) => !value);
        break;
      case 'advanceDealer':
        onAdvanceDealer();
        break;
      case 'toggleSound':
        setSettings((prev) => ({
          ...prev,
          soundEnabled: !prev.soundEnabled,
          voiceEnabled: !prev.voiceEnabled,
        }));
        break;
      case 'eliminatePlayer': {
        const playerId = cmd.payload?.playerId as string | undefined;
        const eliminatedBy = (cmd.payload?.eliminatedBy as string | undefined) ?? null;
        if (playerId) {
          const player = playersRef.current.find((p) => p.id === playerId);
          if (player && player.status === 'active') {
            eliminateRef.current(playerId, eliminatedBy);
          }
        }
        break;
      }
      case 'rebuyPlayer': {
        const playerId = cmd.payload?.playerId as string | undefined;
        if (playerId) {
          const player = playersRef.current.find((p) => p.id === playerId);
          if (player && player.status === 'active') {
            rebuyRef.current(playerId, player.rebuys + 1);
          }
        }
        break;
      }
      case 'addOnPlayer': {
        const playerId = cmd.payload?.playerId as string | undefined;
        const hasAddOn = cmd.payload?.hasAddOn as boolean | undefined;
        if (playerId && hasAddOn !== undefined) {
          addOnRef.current(playerId, hasAddOn);
        }
        break;
      }
      case 'skipBreak':
        timerControls.nextLevel();
        appendEventRef.current(createEvent('break_skipped', currentLevelIndexRef.current, {}));
        break;
      case 'extendBreak': {
        const rawSeconds = cmd.payload?.seconds as number | undefined;
        const seconds = typeof rawSeconds === 'number' ? Math.min(rawSeconds, 600) : undefined;
        if (seconds && seconds > 0) {
          timerControls.extendLevel(seconds);
          appendEventRef.current(createEvent('break_extended', currentLevelIndexRef.current, { seconds }));
        }
        break;
      }
    }
  }, [timerControls, onAdvanceDealer, setShowCallTheClock, setSettings]);

  const {
    hostRef: remoteHostRef,
    hostStatus: remoteHostStatus,
    controllerCount: remoteControllerCount,
    showRemoteModal: showRemoteControl,
    setShowRemoteModal: setShowRemoteControl,
    isControllerMode,
    controllerPeerId,
    controllerSecret,
    startHost: startRemoteHost,
    hostResumed: remoteHostResumed,
  } = useRemoteControl({
    onCommand: handleRemoteCommand,
    enabled: mode === 'game',
  });

  const remoteStateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const host = remoteHostRef.current;
    if (!host || !host.connected || mode !== 'game') return;

    const sendRemoteState = () => {
      const currentLevel = config.levels[timerState.currentLevelIndex];
      const levelLabel = currentLevel?.type === 'break'
        ? (currentLevel.label || t('config.break'))
        : `Level ${config.levels.slice(0, timerState.currentLevelIndex + 1).filter((level) => level.type === 'level').length}`;

      const smallBlind = currentLevel?.type === 'level' ? currentLevel.smallBlind : 0;
      const bigBlind = currentLevel?.type === 'level' ? currentLevel.bigBlind : 0;
      const ante = currentLevel?.type === 'level' ? currentLevel.ante : undefined;

      const isBreak = currentLevel?.type === 'break';
      const prizePool = computePrizePool(
        config.players, config.buyIn,
        config.rebuy.enabled ? config.rebuy.rebuyCost : undefined,
        config.addOn.enabled ? config.addOn.cost : undefined,
      );
      const avgStackBB = bigBlind && bigBlind > 0
        ? computeAverageStackInBB(averageStackRef.current, bigBlind)
        : 0;

      host.sendState({
        timerStatus: timerState.status === 'running' ? 'running' : 'paused',
        remainingSeconds: remainingSecondsRef.current,
        currentLevelIndex: timerState.currentLevelIndex,
        levelLabel,
        smallBlind: smallBlind ?? 0,
        bigBlind: bigBlind ?? 0,
        ante,
        activePlayerCount,
        totalPlayerCount: config.players.length,
        isBubble: bubbleActive,
        tournamentName: config.name,
        soundEnabled: settings.soundEnabled,
        players: buildRemotePlayerList(config.players),
        bountyEnabled,
        rebuyActive,
        addOnWindowOpen,
        prizePool,
        avgStackBB,
        elapsedSeconds: tournamentElapsedRef.current,
        nextLevelLabel: buildNextLevelLabel(config.levels, timerState.currentLevelIndex, t as (key: string) => string),
        isBreak,
        isItm,
      });
    };

    sendRemoteState();

    if (remoteStateIntervalRef.current) clearInterval(remoteStateIntervalRef.current);
    if (timerState.status === 'running') {
      remoteStateIntervalRef.current = setInterval(sendRemoteState, 1000);
    }

    return () => {
      if (remoteStateIntervalRef.current) {
        clearInterval(remoteStateIntervalRef.current);
        remoteStateIntervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- remainingSeconds intentionally excluded: interval handles periodic sync
  }, [
    mode,
    timerState.status,
    timerState.currentLevelIndex,
    config.levels,
    config.players,
    config.name,
    activePlayerCount,
    bubbleActive,
    rebuyActive,
    addOnWindowOpen,
    bountyEnabled,
    isItm,
    settings.soundEnabled,
    t,
    remoteHostRef,
  ]);

  return {
    remoteHostRef,
    remoteHostStatus,
    remoteControllerCount,
    showRemoteControl,
    setShowRemoteControl,
    isControllerMode,
    controllerPeerId,
    controllerSecret,
    startRemoteHost,
    remoteHostResumed,
  };
}
