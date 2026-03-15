import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import type { TournamentConfig, Settings, TournamentCheckpoint, Table, TableMove, PotResult, PlayerPayout } from './domain/types';
import { serializeColorUpMap } from './domain/displayChannel';
import type { DisplayStatePayload } from './domain/displayChannel';
import {
  defaultConfig,
  defaultSettings,
  saveConfig,
  loadConfig,
  saveSettings,
  loadSettings,
  saveCheckpoint,
  loadCheckpoint,
  clearCheckpoint,
  buildTournamentResult,
  saveTournamentResult,
  loadLeagues,
  createGameDayFromResult,
  loadPlayerDatabase,
  createEvent,
} from './domain/logic';
import { useTimer } from './hooks/useTimer';
import { useVoiceAnnouncements } from './hooks/useVoiceAnnouncements';
import { useGameEvents } from './hooks/useGameEvents';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTournamentActions } from './hooks/useTournamentActions';
import { useTournamentModeTransitions } from './hooks/useTournamentModeTransitions';
import { useTVDisplay } from './hooks/useTVDisplay';
import { useWakeLock } from './hooks/useWakeLock';
import { useConfirmDialog } from './hooks/useConfirmDialog';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useTranslation } from './i18n';
import { showToast } from './domain/toast';
import {
  loadEntitlements,
  isFeatureAvailable,
  getRequiredTier,
} from './domain/entitlements';
import {
  setSpeechLanguage,
  announceLastHand,
  announceHandForHand,
  announceTableMove,
  announceFinalTable,
  announceLateRegistrationClosed,
  setSpeechVolume,
} from './domain/speech';
import { setMasterVolume } from './domain/sounds';
import { setAudioVolume } from './domain/audioPlayer';
// Setup-mode components (static imports — used immediately on load)
import { isTourCompleted } from './domain/configPersistence';
import { useModalManager } from './hooks/useModalManager';
import { ToastContainer } from './components/Toast';
import { useRemoteHostBridge } from './hooks/useRemoteHostBridge';
import { useDisplaySession } from './hooks/useDisplaySession';
import { collectStartErrors } from './domain/startValidation';
import { SectionErrorBoundary } from './components/ErrorBoundary';
import { LoadingFallback } from './components/LoadingFallback';
import { SetupModeContainer } from './components/modes/SetupModeContainer';
import { LeagueModeContainer } from './components/modes/LeagueModeContainer';
import { TournamentFinishedContainer } from './components/modes/TournamentFinishedContainer';
import { GameModeContainer } from './components/modes/GameModeContainer';
import { AppHeader } from './components/AppHeader';
import { FeatureGateModal } from './components/FeatureGateModal';
import { useFeatureGate } from './hooks/useFeatureGate';
import { usePrintViewWarmup } from './hooks/usePrintViewWarmup';
import { useSharedPayloads } from './hooks/useSharedPayloads';
import { useGameComputedState } from './hooks/useGameComputedState';
import { useTournamentEventLog } from './hooks/useTournamentEventLog';

// Game-mode components (lazy — only needed after tournament starts)
// DisplayMode is now rendered in a separate TV window via TVDisplayWindow
const SetupWizard = lazy(() => import('./components/SetupWizard').then(m => ({ default: m.SetupWizard })));
const PrintView = lazy(() => import('./components/PrintView').then(m => ({ default: m.PrintView })));
const SharedResultView = lazy(() => import('./components/SharedResultView').then(m => ({ default: m.SharedResultView })));
const SharedLeagueView = lazy(() => import('./components/SharedLeagueView').then(m => ({ default: m.SharedLeagueView })));
const CallTheClock = lazy(() => import('./components/CallTheClock').then(m => ({ default: m.CallTheClock })));
const SeatingOverlay = lazy(() => import('./components/SeatingOverlay').then(m => ({ default: m.SeatingOverlay })));
const RemoteHostModal = lazy(() => import('./components/RemoteControl').then(m => ({ default: m.RemoteHostModal })));
const RemoteControllerView = lazy(() => import('./components/RemoteControl').then(m => ({ default: m.RemoteControllerView })));
const OnboardingTour = lazy(() => import('./components/OnboardingTour').then(m => ({ default: m.OnboardingTour })));
const PWAInstallGuide = lazy(() => import('./components/PWAInstallGuide').then(m => ({ default: m.PWAInstallGuide })));
const HelpCenter = lazy(() => import('./components/HelpCenter').then(m => ({ default: m.HelpCenter })));
const TemplateManager = lazy(() => import('./components/TemplateManager').then(m => ({ default: m.TemplateManager })));
const TournamentHistory = lazy(() => import('./components/TournamentHistory').then(m => ({ default: m.TournamentHistory })));
const TournamentLog = lazy(() => import('./components/TournamentLog').then(m => ({ default: m.TournamentLog })));
const PayoutOverlay = lazy(() => import('./components/PayoutOverlay').then(m => ({ default: m.PayoutOverlay })));
const SeriesManager = lazy(() => import('./components/SeriesManager').then(m => ({ default: m.SeriesManager })));
const CustomAudioEditor = lazy(() => import('./components/CustomAudioEditor').then(m => ({ default: m.CustomAudioEditor })));
const ShareHub = lazy(() => import('./components/ShareHub').then(m => ({ default: m.ShareHub })));

type Mode = 'setup' | 'game' | 'league';

function App() {
  const { t, language } = useTranslation();
  const entitlements = useMemo(() => loadEntitlements(), []);
  const canUseTVDisplay = useMemo(() => isFeatureAvailable('tvDisplay', entitlements), [entitlements]);
  const canUseRemoteControl = useMemo(() => isFeatureAvailable('remoteControl', entitlements), [entitlements]);
  const canUseLeagueMode = useMemo(() => isFeatureAvailable('league', entitlements), [entitlements]);

  // Sync speech language with app language
  useEffect(() => {
    setSpeechLanguage(language);
  }, [language]);

  const [mode, setMode] = useState<Mode>('setup');
  const [config, setConfig] = useState<TournamentConfig>(
    () => {
      const persisted = loadConfig();
      return persisted && persisted.levels.length > 0 ? persisted : defaultConfig();
    },
  );
  const [settings, setSettings] = useState<Settings>(
    () => {
      const persisted = loadSettings();
      return persisted ? { ...defaultSettings(), ...persisted } : defaultSettings();
    },
  );
  useEffect(() => {
    if (mode === 'league' && !canUseLeagueMode) {
      setMode('setup');
    }
  }, [mode, canUseLeagueMode]);
  const modals = useModalManager();
  const printViewReady = usePrintViewWarmup();
  const {
    sharedResult,
    setSharedResult,
    sharedLeague,
    setSharedLeague,
  } = useSharedPayloads();
  const [lastHandActive, setLastHandActive] = useState(false);
  const [handForHandActive, setHandForHandActive] = useState(false);
  const [showDealerBadges, setShowDealerBadges] = useState(true);
  const [sidePotData, setSidePotData] = useState<{ pots: PotResult[]; total: number; payouts?: PlayerPayout[] } | null>(null);
  const [recentTableMoves, setRecentTableMoves] = useState<TableMove[]>([]);
  const { confirmAction, dialogRef: confirmDialogRef, confirm: confirmBeforeAction, dismiss: dismissConfirm, execute: executeConfirm } = useConfirmDialog();

  const [pendingCheckpoint, setPendingCheckpoint] = useState<TournamentCheckpoint | null>(() => loadCheckpoint());

  // Clock display in game mode — update every second for reliable sync
  const [clockTime, setClockTime] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  useEffect(() => {
    if (mode !== 'game') return;
    const update = () => setClockTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [mode]);

  // Index of the last rebuy level (for level-based rebuy).
  // Used by addOnPauseLevelIndex, addOnWindowOpen, and voice announcements.
  const lastRebuyLevelIndex = useMemo(() => {
    if (!config.rebuy.enabled || config.rebuy.limitType !== 'levels') return -1;
    let playCount = 0;
    for (let i = 0; i < config.levels.length; i++) {
      if (config.levels[i].type === 'level') {
        playCount++;
        if (playCount === config.rebuy.levelLimit) return i;
      }
    }
    return -1;
  }, [config.rebuy, config.levels]);

  // When add-on is enabled and no break follows the last rebuy level,
  // the timer should pause at that level so players can take their add-on.
  const addOnPauseLevelIndex = useMemo(() => {
    if (!config.addOn.enabled || lastRebuyLevelIndex < 0) return undefined;
    const nextIdx = lastRebuyLevelIndex + 1;
    if (nextIdx >= config.levels.length) return undefined;
    // Only pause if there's NO break — breaks already give players time
    if (config.levels[nextIdx]?.type === 'break') return undefined;
    return nextIdx;
  }, [config.addOn.enabled, lastRebuyLevelIndex, config.levels]);

  const timer = useTimer(config.levels, settings, addOnPauseLevelIndex);

  // Tournament event log (state + timer/mode/finish event effects)
  const {
    tournamentEvents,
    setTournamentEvents,
    handleAppendEvent,
  } = useTournamentEventLog({
    mode,
    currentLevelIndex: timer.timerState.currentLevelIndex,
    timerStatus: timer.timerState.status,
    tournamentFinished: config.players.length >= 2 && config.players.filter(p => p.status === 'active').length === 1,
    pendingCheckpoint: pendingCheckpoint !== null,
  });

  // Track the level where rebuy ended (for one-level add-on window)
  const [addOnEndLevelIndex, setAddOnEndLevelIndex] = useState<number | null>(null);

  // Rename default player names when language changes
  const defaultNamePattern = /^(Spieler|Player) (\d+)$/;
  useEffect(() => {
    setConfig((prev) => {
      const updated = prev.players.map((p) => {
        const match = defaultNamePattern.exec(p.name);
        if (match) {
          return { ...p, name: t('playerManager.playerN', { n: Number(match[2]) }) };
        }
        return p;
      });
      if (updated.some((p, i) => p.name !== prev.players[i].name)) {
        return { ...prev, players: updated };
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Persist config & settings
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Sync master volume to all audio modules
  useEffect(() => {
    const v = settings.volume / 100;
    setMasterVolume(v);
    setAudioVolume(v);
    setSpeechVolume(v);
  }, [settings.volume]);

  // Auto-save tournament checkpoint in game mode
  // Debounced on config/settings changes (500ms) to avoid blocking during rapid interactions.
  // Level/status changes and periodic saves (running timer) remain immediate.
  const checkpointIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkpointDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (mode !== 'game') return;
    const doSave = () => {
      saveCheckpoint({
        version: 1,
        config,
        settings,
        timer: {
          currentLevelIndex: timer.timerState.currentLevelIndex,
          remainingSeconds: timer.timerState.remainingSeconds,
        },
        savedAt: new Date().toISOString(),
        events: tournamentEvents,
      });
    };
    // Debounce save to avoid blocking during rapid config mutations (e.g. elimination cascade)
    if (checkpointDebounceRef.current) clearTimeout(checkpointDebounceRef.current);
    checkpointDebounceRef.current = setTimeout(doSave, 500);
    // For running timer: periodic save every 5s (instead of every tick)
    if (checkpointIntervalRef.current) clearInterval(checkpointIntervalRef.current);
    if (timer.timerState.status === 'running') {
      checkpointIntervalRef.current = setInterval(doSave, 5000);
    }
    return () => {
      if (checkpointIntervalRef.current) {
        clearInterval(checkpointIntervalRef.current);
        checkpointIntervalRef.current = null;
      }
      if (checkpointDebounceRef.current) {
        clearTimeout(checkpointDebounceRef.current);
        checkpointDebounceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- remainingSeconds intentionally excluded: interval handles periodic saves
  }, [mode, config, settings, timer.timerState.currentLevelIndex, timer.timerState.status, tournamentEvents]);

  // Wake Lock: prevent screen from sleeping during active tournament
  useWakeLock(mode === 'game' && timer.timerState.status === 'running');

  // PWA install prompt
  const { canPrompt: canInstallPrompt, isInstalled: isPWAInstalled, promptInstall } = useInstallPrompt();
  // Online/Offline detection — show toast on status change
  const isOnline = useOnlineStatus();
  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    if (prevOnlineRef.current === isOnline) return;
    prevOnlineRef.current = isOnline;
    showToast(isOnline ? t('app.onlineNotice') : t('app.offlineNotice'));
  }, [isOnline, t]);

  // Toggle last hand announcement
  const handleLastHand = useCallback(() => {
    setLastHandActive((prev) => {
      if (prev) return false; // toggle off
      const nextIsBreak = config.levels[timer.timerState.currentLevelIndex + 1]?.type === 'break';
      if (settings.voiceEnabled) announceLastHand(nextIsBreak, t);
      return true;
    });
  }, [config.levels, timer.timerState.currentLevelIndex, settings.voiceEnabled, t]);

  // Hand-for-Hand toggle
  const handleHandForHand = useCallback(() => {
    setHandForHandActive((prev) => {
      if (prev) return false;
      timer.pause();
      if (settings.voiceEnabled) announceHandForHand(t);
      return true;
    });
  }, [timer, settings.voiceEnabled, t]);

  const handleNextHand = useCallback(() => {
    timer.start();
  }, [timer]);

  // Tournament actions (eliminate, rebuy, add-on, stacks, late reg, re-entry, dealer)
  const {
    updatePlayerStack,
    initStacks,
    clearStacks,
    updatePlayerRebuys,
    updatePlayerAddOn,
    handleAdvanceDealer,
    addLatePlayer,
    handleReEntry,
    reinstatePlayer,
    eliminatePlayer,
  } = useTournamentActions({
    config,
    setConfig,
    mode,
    settings,
    t,
    setRecentTableMoves,
    currentLevelIndex: timer.timerState.currentLevelIndex,
    onAppendEvent: handleAppendEvent,
  });

  // Keyboard shortcuts (only in game mode)
  const handleResetLevelShortcut = useCallback(() => {
    confirmBeforeAction(
      t('confirm.resetLevel.title'),
      t('confirm.resetLevel.message'),
      t('confirm.resetLevel.confirm'),
      timer.resetLevel,
    );
  }, [t, timer.resetLevel, confirmBeforeAction]);


  const toggleFullscreen = useCallback(() => {
    try {
      const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
      const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };

      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      } else {
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      }
    } catch {
      // Fullscreen not available
    }
  }, []);

  const handleToggleDealerBadges = useCallback(() => {
    setShowDealerBadges((prev) => !prev);
  }, []);

  // Auto-dismiss recent table moves after 30 seconds
  useEffect(() => {
    if (recentTableMoves.length === 0) return;
    const timerId = setTimeout(() => {
      const cutoff = Date.now() - 30_000;
      setRecentTableMoves(prev => prev.filter(m => m.timestamp > cutoff));
    }, 30_000);
    return () => clearTimeout(timerId);
  }, [recentTableMoves]);

  // --- Computed game state (extracted to useGameComputedState hook) ---
  const displaySeconds = Math.floor(timer.timerState.remainingSeconds);

  const computed = useGameComputedState({
    config,
    timerState: timer.timerState,
    tournamentEvents,
    t,
    lastRebuyLevelIndex,
    addOnEndLevelIndex,
    displaySeconds,
  });
  const {
    tournamentElapsed,
    rebuyActive,
    lateRegOpen,
    addOnWindowOpen,
    currentPlayLevel,
    averageStack,
    colorUpMap,
    activePlayerCount,
    paidPlaces,
    bubbleActive,
    inTheMoney,
    isBreak,
    tournamentFinished,
    winner,
    finishedResult,
    startErrors,
    leagueDisplayData,
  } = computed;

  // Voice: Late registration closed
  const prevLateRegRef = useRef(lateRegOpen);
  useEffect(() => {
    if (mode === 'game' && settings.voiceEnabled && prevLateRegRef.current && !lateRegOpen && config.lateRegistration?.enabled) {
      announceLateRegistrationClosed(t);
    }
    prevLateRegRef.current = lateRegOpen;
  }, [mode, settings.voiceEnabled, lateRegOpen, config.lateRegistration?.enabled, t]);

  // Compute add-on window: show announcement at the END of the last rebuy level
  // (when timer reaches 0) and during the break/next level after it.
  // For time-based rebuy: detect transition reactively.
  const prevRebuyActive = useRef(rebuyActive);
  useEffect(() => {
    // Time-based rebuy: track the level where rebuy ended
    if (prevRebuyActive.current && !rebuyActive && config.addOn.enabled && config.rebuy.enabled
        && config.rebuy.limitType !== 'levels') {
      setAddOnEndLevelIndex(timer.timerState.currentLevelIndex);
    }
    prevRebuyActive.current = rebuyActive;
  }, [rebuyActive, config.addOn.enabled, config.rebuy.enabled, config.rebuy.limitType, timer.timerState.currentLevelIndex]);

  // Break detection for skip/extend buttons (also in computed, but needed for local callbacks)

  const handleSkipBreak = useCallback(() => {
    timer.nextLevel();
    handleAppendEvent(createEvent('break_skipped', timer.timerState.currentLevelIndex, {}));
  }, [timer, handleAppendEvent]);

  const handleExtendBreak = useCallback((seconds: number) => {
    timer.extendLevel(seconds);
    handleAppendEvent(createEvent('break_extended', timer.timerState.currentLevelIndex, { seconds }));
  }, [timer, handleAppendEvent]);

  // Auto-deactivate Hand-for-Hand when bubble bursts
  const prevBubbleForHfH = useRef(bubbleActive);
  useEffect(() => {
    if (prevBubbleForHfH.current && !bubbleActive) {
      setHandForHandActive(false);
    }
    prevBubbleForHfH.current = bubbleActive;
  }, [bubbleActive]);

  // ---------------------------------------------------------------------------
  // BroadcastChannel: send state to TV display window (placed after computed values)
  // ---------------------------------------------------------------------------

  // Use ref for timerState in payload to avoid callback recreation every 250ms tick.
  // TV display receives timer updates separately via timer-tick BroadcastChannel messages.
  const timerStateForPayloadRef = useRef(timer.timerState);
  timerStateForPayloadRef.current = timer.timerState;

  const buildFullStatePayload = useCallback((): DisplayStatePayload => ({
    timerState: timerStateForPayloadRef.current,
    levels: config.levels,
    chipConfig: config.chips,
    colorUpSchedule: serializeColorUpMap(colorUpMap),
    tournamentName: config.name,
    activePlayerCount,
    totalPlayerCount: config.players.length,
    isBubble: bubbleActive,
    isLastHand: lastHandActive,
    isHandForHand: handForHandActive,
    players: config.players,
    dealerIndex: config.dealerIndex,
    buyIn: config.buyIn,
    payout: config.payout,
    rebuy: config.rebuy,
    addOn: config.addOn,
    bounty: config.bounty,
    averageStack,
    tournamentElapsed,
    tables: config.tables,
    showDealerBadges,
    leagueName: leagueDisplayData?.name,
    leagueStandings: leagueDisplayData?.standings,
    sidePotData: sidePotData ?? undefined,
    displayScreens: settings.displayScreens,
    displayRotationInterval: settings.displayRotationInterval,
    displayLayout: settings.displayLayout,
  }), [config, colorUpMap, activePlayerCount, bubbleActive, lastHandActive, handForHandActive, averageStack, tournamentElapsed, showDealerBadges, leagueDisplayData, sidePotData, settings.displayScreens, settings.displayRotationInterval, settings.displayLayout]);

  // TV Display: BroadcastChannel sync + window management
  const { tvWindowActive, openTVWindow, closeTVWindow } = useTVDisplay({
    mode,
    buildFullStatePayload,
    remainingSeconds: timer.timerState.remainingSeconds,
    timerStatus: timer.timerState.status,
    currentLevelIndex: timer.timerState.currentLevelIndex,
    showCallTheClock: modals.showCallTheClock,
    callTheClockSeconds: settings.callTheClockSeconds,
    soundEnabled: settings.soundEnabled,
    voiceEnabled: settings.voiceEnabled,
  });

  const handleToggleTVWindow = useCallback(() => {
    if (tvWindowActive) closeTVWindow();
    else openTVWindow();
  }, [tvWindowActive, closeTVWindow, openTVWindow]);
  const {
    lockedFeature,
    openFeatureGate,
    closeFeatureGate,
    handleUpgradeIntent,
  } = useFeatureGate({
    currentTier: entitlements.tier,
    mode,
    t,
  });

  const handleToggleTVWindowWithGate = useCallback(() => {
    if (!canUseTVDisplay) {
      openFeatureGate('tvDisplay');
      return;
    }
    handleToggleTVWindow();
  }, [canUseTVDisplay, openFeatureGate, handleToggleTVWindow]);

  useKeyboardShortcuts({
    mode,
    onToggleStartPause: timer.toggleStartPause,
    onNextLevel: timer.nextLevel,
    onPreviousLevel: timer.previousLevel,
    onResetLevel: handleResetLevelShortcut,
    onToggleCleanView: modals.toggleCleanView,
    onLastHand: handleLastHand,
    onToggleTVWindow: handleToggleTVWindowWithGate,
    onHandForHand: handleHandForHand,
    onCallTheClock: useCallback(() => modals.setShowCallTheClock((v) => !v), [modals]),
  });

  // Clear checkpoint and save result when tournament finishes
  const resultSavedRef = useRef(false);
  useEffect(() => {
    if (mode === 'game' && tournamentFinished) {
      clearCheckpoint();
      if (!resultSavedRef.current) {
        resultSavedRef.current = true;
        const result = buildTournamentResult(config, tournamentElapsed, currentPlayLevel, tournamentEvents);
        saveTournamentResult(result);
        // Auto-create GameDay when tournament is linked to a league
        if (config.leagueId) {
          const leagues = loadLeagues();
          const league = leagues.find(l => l.id === config.leagueId);
          if (league) {
            const registeredPlayers = loadPlayerDatabase();
            createGameDayFromResult(result, league, registeredPlayers);
          }
        }
      }
    }
    if (!tournamentFinished) {
      resultSavedRef.current = false;
    }
  }, [mode, tournamentFinished, config, tournamentElapsed, currentPlayLevel, tournamentEvents]);

  // Warn before navigating away during active tournament
  useEffect(() => {
    if (mode !== 'game' || tournamentFinished) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [mode, tournamentFinished]);

  // Game events: victory sound/pause, bubble/ITM effects
  const { showItmFlash, reset: resetGameEvents } = useGameEvents({
    mode,
    settings,
    tournamentFinished,
    bubbleActive,
    inTheMoney,
    winnerName: winner?.name,
    pause: timer.pause,
    t,
  });

  // Voice announcements: level change, break warning, 5-min warning, bounty, milestones, timer pause/resume
  const handleLevelChange = useCallback(() => {
    setLastHandActive(false);
    setShowDealerBadges(false);
  }, []);
  const { reset: resetVoice } = useVoiceAnnouncements({
    mode,
    settings,
    config,
    timerState: timer.timerState,
    colorUpMap,
    activePlayerCount,
    paidPlaces,
    bubbleActive,
    inTheMoney,
    addOnWindowOpen,
    rebuyActive,
    tournamentFinished,
    onLevelChange: handleLevelChange,
    t,
  });

  // --- Multi-table handlers ---
  const prevTableCountRef = useRef<number>(config.tables?.length ?? 0);
  useEffect(() => {
    const tableCount = config.tables?.length ?? 0;
    // Detect final table merge: went from >1 to exactly 1 table
    if (mode === 'game' && prevTableCountRef.current > 1 && tableCount === 1 && settings.voiceEnabled) {
      announceFinalTable(t);
    }
    prevTableCountRef.current = tableCount;
  }, [config.tables?.length, mode, settings.voiceEnabled, t]);

  const handleUpdateTables = useCallback((tables: Table[]) => {
    setConfig((prev) => ({ ...prev, tables }));
  }, []);

  const handleTableMoves = useCallback((moves: TableMove[]) => {
    setRecentTableMoves(prev => [...prev, ...moves]);
    if (!settings.voiceEnabled) return;
    for (const move of moves) {
      announceTableMove(move.playerName, move.toTableName, move.toSeat, t);
    }
  }, [settings.voiceEnabled, t]);

  const {
    remoteHostRef,
    remoteHostStatus,
    showRemoteControl,
    setShowRemoteControl,
    isControllerMode,
    controllerPeerId,
    controllerSecret,
    startRemoteHost,
    remoteHostResumed,
  } = useRemoteHostBridge({
    mode,
    config,
    settings,
    timerState: timer.timerState,
    timerControls: {
      toggleStartPause: timer.toggleStartPause,
      start: timer.start,
      pause: timer.pause,
      nextLevel: timer.nextLevel,
      previousLevel: timer.previousLevel,
      resetLevel: timer.resetLevel,
      extendLevel: timer.extendLevel,
    },
    activePlayerCount,
    bubbleActive,
    rebuyActive,
    addOnWindowOpen,
    bountyEnabled: config.bounty.enabled,
    averageStack,
    tournamentElapsed,
    isItm: inTheMoney,
    onAdvanceDealer: handleAdvanceDealer,
    onEliminatePlayer: eliminatePlayer,
    onUpdatePlayerRebuys: updatePlayerRebuys,
    onUpdatePlayerAddOn: updatePlayerAddOn,
    setShowCallTheClock: modals.setShowCallTheClock,
    setSettings,
    onAppendEvent: handleAppendEvent,
    t,
  });

  // Show toast when remote session is restored after page refresh
  const remoteResumedToastShown = useRef(false);
  useEffect(() => {
    if (remoteHostResumed && remoteHostStatus === 'ready' && !remoteResumedToastShown.current) {
      remoteResumedToastShown.current = true;
      showToast(t('remote.sessionRestored'));
    }
  }, [remoteHostResumed, remoteHostStatus, t]);

  // Display session: broadcast state to connected display peers (TV windows via PeerJS)
  const { displayCount } = useDisplaySession({
    hostRef: remoteHostRef,
    enabled: mode === 'game' && remoteHostStatus !== null,
    buildFullStatePayload,
    remainingSeconds: timer.timerState.remainingSeconds,
    timerStatus: timer.timerState.status,
    currentLevelIndex: timer.timerState.currentLevelIndex,
    showCallTheClock: modals.showCallTheClock,
    callTheClockSeconds: settings.callTheClockSeconds,
    soundEnabled: settings.soundEnabled,
    voiceEnabled: settings.voiceEnabled,
  });

  const {
    showSeatingOverlay,
    switchToGame,
    handleDismissSeating,
    switchToSetup,
    restoreFromCheckpoint,
    dismissCheckpoint,
    handleResetLevel,
    handleRestart,
    handleExitToSetup,
  } = useTournamentModeTransitions({
    config,
    settings,
    pendingCheckpoint,
    timer,
    t,
    setConfig,
    setSettings,
    setMode,
    setPendingCheckpoint,
    setAddOnEndLevelIndex,
    setRecentTableMoves,
    setCleanView: modals.setCleanView,
    setShowPlayerPanel: modals.setShowPlayerPanel,
    setShowSidebar: modals.setShowSidebar,
    setShowDealerBadges,
    setLastHandActive,
    setHandForHandActive,
    setShowRemoteControl,
    setTournamentEvents,
    closeTVWindow,
    resetGameEvents,
    resetVoice,
    confirmBeforeAction,
  });

  // Remote Controller Mode — render ONLY the controller view, skip all other UI
  if (isControllerMode && controllerPeerId) {
    return (
      <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
        <RemoteControllerView
          hostPeerId={controllerPeerId}
          secret={controllerSecret}
          onClose={() => window.close()}
        />
      </Suspense></SectionErrorBoundary>
    );
  }

  return (
    <>
    {printViewReady && (
      <SectionErrorBoundary><Suspense fallback={null}>
        <PrintView config={config} result={finishedResult} />
      </Suspense></SectionErrorBoundary>
    )}
    <div className="min-h-full flex flex-col">
      <AppHeader
        mode={mode}
        tournamentName={config.name}
        clockTime={clockTime}
        settings={settings}
        onSettingsChange={setSettings}
        tournamentFinished={tournamentFinished}
        canUseRemoteControl={canUseRemoteControl}
        canUseTVDisplay={canUseTVDisplay}
        canUseLeagueMode={canUseLeagueMode}
        remoteHostConnected={remoteHostStatus === 'connected'}
        tvWindowActive={tvWindowActive}
        onStartRemoteHost={startRemoteHost}
        onToggleTVWindow={handleToggleTVWindow}
        onToggleSetupGame={() => {
          if (mode === 'league') setMode('setup');
          else setMode('game');
        }}
        onExitToSetup={handleExitToSetup}
        onShowTemplates={() => modals.setShowTemplates(true)}
        onToggleLeagueMode={() => setMode(mode === 'league' ? 'setup' : 'league')}
        onShowHistory={() => modals.setShowHistory(true)}
        onShowInstallGuide={() => modals.setShowInstallGuide(true)}
        onShowHelp={() => modals.setShowHelp(true)}
        onShowLog={() => modals.setShowTournamentLog(true)}
        showLogButton={mode === 'game' && !tournamentFinished}
        onOpenFeatureGate={openFeatureGate}
        onShowSeries={() => modals.setShowSeries(true)}
        onShowShareHub={() => {
          if (!remoteHostRef.current) startRemoteHost();
          modals.setShowShareHub(true);
        }}
        displayCount={displayCount}
      />

      {/* Main content */}
      <main id="main-content" className="flex-1 flex">
        {mode === 'league' ? (
          /* League Mode */
          <LeagueModeContainer
            onStartTournament={(leagueId, options) => {
              setConfig(prev => ({ ...prev, leagueId }));
              if (options?.quickStart) {
                const quickConfig = { ...config, leagueId };
                const quickStartErrors = collectStartErrors(quickConfig, t);
                if (quickStartErrors.length === 0) {
                  switchToGame();
                  return;
                }
                showToast(quickStartErrors[0]);
              }
              setMode('setup');
            }}
          />
        ) : mode === 'setup' ? (
          /* Setup Mode */
          <SetupModeContainer
            config={config}
            setConfig={setConfig}
            settings={settings}
            onSettingsChange={setSettings}
            onShowCustomAudio={() => modals.setShowCustomAudio(true)}
            pendingCheckpoint={pendingCheckpoint}
            onRestoreCheckpoint={restoreFromCheckpoint}
            onDismissCheckpoint={dismissCheckpoint}
            onSwitchToGame={switchToGame}
            onConfirm={confirmBeforeAction}
            startErrors={startErrors}
          />
        ) : tournamentFinished && winner ? (
          /* Tournament Finished */
          <TournamentFinishedContainer
            players={config.players}
            winner={winner}
            buyIn={config.buyIn}
            payout={config.payout}
            bounty={config.bounty}
            rebuy={config.rebuy}
            addOn={config.addOn}
            tournamentResult={finishedResult}
            onBackToSetup={switchToSetup}
          />
        ) : (
          /* Game Mode */
          <GameModeContainer
            config={config}
            settings={settings}
            timer={timer}
            state={{
              rebuyActive,
              addOnWindowOpen,
              currentPlayLevel,
              tournamentElapsed,
              averageStack,
              bubbleActive,
              showItmFlash,
              lastHandActive,
              handForHandActive,
              lateRegOpen,
              colorUpMap,
              recentTableMoves,
              isBreak,
            }}
            ui={{
              cleanView: modals.cleanView,
              showPlayerPanel: modals.showPlayerPanel,
              showSidebar: modals.showSidebar,
              showDealerBadges,
            }}
            actions={{
              onTogglePlayerPanel: () => modals.setShowPlayerPanel((v) => !v),
              onToggleSidebar: () => modals.setShowSidebar((v) => !v),
              onUpdatePlayerRebuys: updatePlayerRebuys,
              onUpdatePlayerAddOn: updatePlayerAddOn,
              onEliminatePlayer: eliminatePlayer,
              onReinstatePlayer: reinstatePlayer,
              onAdvanceDealer: handleAdvanceDealer,
              onToggleDealerBadges: handleToggleDealerBadges,
              onUpdatePlayerStack: updatePlayerStack,
              onInitStacks: initStacks,
              onClearStacks: clearStacks,
              onAddLatePlayer: addLatePlayer,
              onReEntryPlayer: handleReEntry,
              onSidePotResultChange: setSidePotData,
              onSkipBreak: handleSkipBreak,
              onExtendBreak: handleExtendBreak,
              onResetLevel: handleResetLevel,
              onRestartTournament: handleRestart,
              onToggleCleanView: modals.toggleCleanView,
              onLastHand: handleLastHand,
              onHandForHand: handleHandForHand,
              onNextHand: handleNextHand,
              onShowCallTheClock: () => modals.setShowCallTheClock(true),
              onShowPayoutOverlay: () => modals.setShowPayoutOverlay(true),
              onUpdateTables: handleUpdateTables,
              onTableMoves: handleTableMoves,
              onSettingsChange: setSettings,
              onToggleFullscreen: toggleFullscreen,
              onShowInstallGuide: () => modals.setShowInstallGuide(true),
              onExitToSetup: handleExitToSetup,
            }}
          />
        )}
      </main>

      {/* Seating Overlay (multi-table start) */}
      {showSeatingOverlay && mode === 'game' && config.tables && (
        <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
          <SeatingOverlay
            tables={config.tables}
            players={config.players}
            onDismiss={handleDismissSeating}
          />
        </Suspense></SectionErrorBoundary>
      )}

      {/* Remote Control Modal */}
      {showRemoteControl && mode === 'game' && (
        <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
          <RemoteHostModal
            peerId={remoteHostRef.current?.peerId ?? ''}
            secret={remoteHostRef.current?.secret}
            status={remoteHostStatus}
            onClose={() => setShowRemoteControl(false)}
          />
        </Suspense></SectionErrorBoundary>
      )}

      {/* Share Hub Modal */}
      {modals.showShareHub && (
        <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
          <ShareHub
            sessionId={remoteHostRef.current?.peerId ?? null}
            secret={remoteHostRef.current?.secret}
            displayCount={displayCount}
            remoteConnected={remoteHostStatus === 'connected'}
            localTVActive={tvWindowActive}
            onOpenLocalTV={handleToggleTVWindow}
            onToggleFullscreen={toggleFullscreen}
            onClose={() => modals.setShowShareHub(false)}
          />
        </Suspense></SectionErrorBoundary>
      )}

      {/* Call the Clock Modal */}
      {modals.showCallTheClock && mode === 'game' && (
        <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
          <CallTheClock
            durationSeconds={settings.callTheClockSeconds}
            soundEnabled={settings.soundEnabled}
            voiceEnabled={settings.voiceEnabled}
            onClose={() => modals.setShowCallTheClock(false)}
          />
        </Suspense></SectionErrorBoundary>
      )}

      {/* Templates Modal */}
      {modals.showTemplates && (
        <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
          <TemplateManager
            config={config}
            onLoad={setConfig}
            onClose={() => modals.setShowTemplates(false)}
          />
        </Suspense></SectionErrorBoundary>
      )}

      {modals.showHistory && (
        <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
          <TournamentHistory onClose={() => modals.setShowHistory(false)} />
        </Suspense></SectionErrorBoundary>
      )}

      {/* Series Modal */}
      {modals.showSeries && (
        <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
          <SeriesManager
            onClose={() => modals.setShowSeries(false)}
            currentConfig={config}
            onLinkSeries={(seriesId) => setConfig(prev => ({ ...prev, seriesId }))}
          />
        </Suspense></SectionErrorBoundary>
      )}

      {/* Custom Audio Editor */}
      {modals.showCustomAudio && (
        <SectionErrorBoundary><Suspense fallback={null}>
          <CustomAudioEditor onClose={() => modals.setShowCustomAudio(false)} />
        </Suspense></SectionErrorBoundary>
      )}

      {/* Setup Wizard (first-time users) */}
      {modals.showWizard && mode === 'setup' && !pendingCheckpoint && (
        <SectionErrorBoundary><Suspense fallback={null}>
          <SetupWizard
            onComplete={(wizardConfig) => {
              setConfig(wizardConfig);
              modals.setShowWizard(false);
              // Show onboarding tour after wizard if not already completed
              if (!isTourCompleted()) {
                setTimeout(() => modals.setShowTour(true), 500);
              }
            }}
            onSkip={() => modals.setShowWizard(false)}
          />
        </Suspense></SectionErrorBoundary>
      )}

      {/* Onboarding Tour (after wizard completion) */}
      {modals.showTour && mode === 'setup' && (
        <Suspense fallback={null}>
          <OnboardingTour onComplete={() => modals.setShowTour(false)} />
        </Suspense>
      )}

      {/* Help Center */}
      {modals.showHelp && (
        <SectionErrorBoundary><Suspense fallback={null}>
          <HelpCenter onClose={() => modals.setShowHelp(false)} />
        </Suspense></SectionErrorBoundary>
      )}

      {/* Tournament Log */}
      {modals.showTournamentLog && mode === 'game' && (
        <SectionErrorBoundary><Suspense fallback={null}>
          <TournamentLog
            events={tournamentEvents}
            players={config.players}
            onClose={() => modals.setShowTournamentLog(false)}
          />
        </Suspense></SectionErrorBoundary>
      )}

      {/* Payout Overlay */}
      {modals.showPayoutOverlay && mode === 'game' && (
        <SectionErrorBoundary><Suspense fallback={null}>
          <PayoutOverlay
            config={config}
            players={config.players}
            onClose={() => modals.setShowPayoutOverlay(false)}
          />
        </Suspense></SectionErrorBoundary>
      )}

      {/* PWA Install Guide */}
      {modals.showInstallGuide && (
        <SectionErrorBoundary><Suspense fallback={null}>
          <PWAInstallGuide
            onClose={() => modals.setShowInstallGuide(false)}
            canPrompt={canInstallPrompt}
            isInstalled={isPWAInstalled}
            onPromptInstall={promptInstall}
          />
        </Suspense></SectionErrorBoundary>
      )}

      {/* Shared Result Modal (from QR code) */}
      {sharedResult && (
        <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
          <SharedResultView result={sharedResult} onClose={() => setSharedResult(null)} />
        </Suspense></SectionErrorBoundary>
      )}

      {/* Shared League Standings Modal (from QR code) */}
      {sharedLeague && (
        <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
          <SharedLeagueView
            leagueName={sharedLeague.leagueName}
            standings={sharedLeague.standings}
            onClose={() => setSharedLeague(null)}
          />
        </Suspense></SectionErrorBoundary>
      )}

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div ref={confirmDialogRef} role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="bg-white/95 dark:bg-gray-900/95 border border-gray-300 dark:border-gray-700/50 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl shadow-gray-300/40 dark:shadow-black/40 animate-scale-in">
            <h3 id="confirm-title" className="text-lg font-bold text-gray-900 dark:text-white">{confirmAction.title}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{confirmAction.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={dismissConfirm}
                className="px-4 py-2 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-all duration-200 border border-gray-200 dark:border-gray-700/40"
              >
                {t('app.cancel')}
              </button>
              <button
                onClick={executeConfirm}
                className="px-4 py-2 bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-lg shadow-red-900/40 border border-red-700/30 active:scale-[0.97]"
              >
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      {lockedFeature && (
        <FeatureGateModal
          feature={lockedFeature}
          currentTier={entitlements.tier}
          requiredTier={getRequiredTier(lockedFeature)}
          onClose={closeFeatureGate}
          onUpgrade={handleUpgradeIntent}
        />
      )}
      <ToastContainer />
    </div>
    </>
  );
}

export default App;
