import { useCallback, useState } from 'react';
import type { SetStateAction } from 'react';
import type { Settings, TableMove, TournamentCheckpoint, TournamentConfig, TournamentEvent } from '../domain/types';
import { clearCheckpoint, distributePlayersToTables, loadLeagues, loadAllSeries, sanitizeRecoveredConfig } from '../domain/logic';
import { announceTournamentStart, cancelSpeech, initSpeech } from '../domain/speech';
import { showToast } from '../domain/toast';
import type { TranslationKey } from '../i18n';

type AppMode = 'setup' | 'game' | 'league';

export interface TimerModeTransitions {
  restart: () => void;
  resetLevel: () => void;
  restoreLevel: (levelIndex: number, remainingSeconds: number) => void;
}

type ConfirmBeforeAction = (
  title: string,
  message: string,
  confirmLabel: string,
  action: () => void,
) => void;

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** Read-only tournament state needed for mode transitions. */
export interface TransitionState {
  config: TournamentConfig;
  settings: Settings;
  pendingCheckpoint: TournamentCheckpoint | null;
}

/** All setState dispatchers used during mode transitions. */
export interface TransitionSetters {
  setConfig: (value: SetStateAction<TournamentConfig>) => void;
  setSettings: (value: SetStateAction<Settings>) => void;
  setMode: (value: SetStateAction<AppMode>) => void;
  setPendingCheckpoint: (value: SetStateAction<TournamentCheckpoint | null>) => void;
  setAddOnEndLevelIndex: (value: SetStateAction<number | null>) => void;
  setRecentTableMoves: (value: SetStateAction<TableMove[]>) => void;
  setShowDealerBadges: (value: SetStateAction<boolean>) => void;
  setLastHandActive: (value: SetStateAction<boolean>) => void;
  setHandForHandActive: (value: SetStateAction<boolean>) => void;
  setShowRemoteControl: (value: boolean) => void;
  setTournamentEvents: (value: SetStateAction<TournamentEvent[]>) => void;
}

/** Side-effect callbacks triggered during mode transitions. */
export interface TransitionCallbacks {
  closeTVWindow: () => void;
  resetGameEvents: () => void;
  resetVoice: () => void;
  confirmBeforeAction: ConfirmBeforeAction;
}

interface UseTournamentModeTransitionsParams {
  state: TransitionState;
  timer: TimerModeTransitions;
  t: Translate;
  setters: TransitionSetters;
  callbacks: TransitionCallbacks;
}

function resetPlayerForNewTournament(player: TournamentConfig['players'][number]) {
  return {
    ...player,
    rebuys: 0,
    addOn: false,
    status: 'active' as const,
    placement: null,
    eliminatedBy: null,
    knockouts: 0,
  };
}

export function useTournamentModeTransitions({
  state,
  timer,
  t,
  setters,
  callbacks,
}: UseTournamentModeTransitionsParams) {
  const { config, settings, pendingCheckpoint } = state;
  const {
    setConfig,
    setSettings,
    setMode,
    setPendingCheckpoint,
    setAddOnEndLevelIndex,
    setRecentTableMoves,
    setShowDealerBadges,
    setLastHandActive,
    setHandForHandActive,
    setShowRemoteControl,
    setTournamentEvents,
  } = setters;
  const { closeTVWindow, resetGameEvents, resetVoice, confirmBeforeAction } = callbacks;
  const [showSeatingOverlay, setShowSeatingOverlay] = useState(false);

  const switchToGame = useCallback(() => {
    // Starting a fresh tournament supersedes any stale recoverable checkpoint.
    clearCheckpoint();
    setPendingCheckpoint(null);

    setConfig((prev) => {
      const resetPlayers = prev.players.map(resetPlayerForNewTournament);

      let updatedTables = prev.tables;
      if (updatedTables && updatedTables.length > 0) {
        const playerIds = resetPlayers.map((player) => player.id);
        updatedTables = distributePlayersToTables(playerIds, updatedTables);
        updatedTables = updatedTables.map((table) => {
          if (table.status !== 'active') return table;
          const firstOccupiedSeat = table.seats.find((seat) => seat.playerId !== null);
          return { ...table, dealerSeat: firstOccupiedSeat?.seatNumber ?? null };
        });
      }

      return { ...prev, players: resetPlayers, tables: updatedTables };
    });

    setAddOnEndLevelIndex(null);
    setRecentTableMoves([]);
    setShowDealerBadges(true);
    setMode('game');
    initSpeech();

    if (config.tables && config.tables.length > 0) {
      setShowSeatingOverlay(true);
      return;
    }

    timer.restart();
    if (settings.voiceEnabled) {
      announceTournamentStart(t);
    }
  }, [
    config.tables,
    setConfig,
    setPendingCheckpoint,
    setAddOnEndLevelIndex,
    setRecentTableMoves,
    setShowDealerBadges,
    setMode,
    timer,
    settings.voiceEnabled,
    t,
  ]);

  const handleDismissSeating = useCallback(() => {
    setShowSeatingOverlay(false);
    timer.restart();
    if (settings.voiceEnabled) {
      announceTournamentStart(t);
    }
  }, [timer, settings.voiceEnabled, t]);

  const switchToSetup = useCallback(() => {
    cancelSpeech();
    timer.restart();
    setShowSeatingOverlay(false);
    setAddOnEndLevelIndex(null);
    setLastHandActive(false);
    setHandForHandActive(false);
    closeTVWindow();
    setShowRemoteControl(false);
    resetGameEvents();
    resetVoice();
    clearCheckpoint();
    setPendingCheckpoint(null);
    setMode('setup');
  }, [
    timer,
    setAddOnEndLevelIndex,
    setLastHandActive,
    setHandForHandActive,
    closeTVWindow,
    setShowRemoteControl,
    resetGameEvents,
    resetVoice,
    setPendingCheckpoint,
    setMode,
  ]);

  const restoreFromCheckpoint = useCallback(() => {
    if (!pendingCheckpoint) return;

    const { config: sanitizedConfig, removedMissingLeagueLink, removedMissingSeriesLink } = sanitizeRecoveredConfig(
      pendingCheckpoint.config,
      loadLeagues(),
      loadAllSeries(),
    );
    if (removedMissingLeagueLink) {
      showToast(t('checkpoint.leagueMissing'));
    }
    if (removedMissingSeriesLink) {
      showToast(t('checkpoint.seriesMissing'));
    }

    setConfig(sanitizedConfig);
    setSettings(pendingCheckpoint.settings);
    timer.restoreLevel(
      pendingCheckpoint.timer.currentLevelIndex,
      pendingCheckpoint.timer.remainingSeconds,
    );
    // Restore tournament events from checkpoint (if available)
    if (pendingCheckpoint.events) {
      setTournamentEvents(pendingCheckpoint.events);
    }

    setPendingCheckpoint(null);
    setShowSeatingOverlay(false);
    setMode('game');
  }, [
    pendingCheckpoint,
    setConfig,
    setSettings,
    timer,
    setPendingCheckpoint,
    setTournamentEvents,
    setMode,
    t,
  ]);

  const dismissCheckpoint = useCallback(() => {
    clearCheckpoint();
    setPendingCheckpoint(null);
  }, [setPendingCheckpoint]);

  const handleResetLevel = useCallback(() => {
    confirmBeforeAction(
      t('confirm.resetLevel.title'),
      t('confirm.resetLevel.message'),
      t('confirm.resetLevel.confirm'),
      timer.resetLevel,
    );
  }, [confirmBeforeAction, t, timer]);

  const handleRestart = useCallback(() => {
    confirmBeforeAction(
      t('confirm.restartTournament.title'),
      t('confirm.restartTournament.message'),
      t('confirm.restartTournament.confirm'),
      () => {
        clearCheckpoint();
        setPendingCheckpoint(null);
        timer.restart();
        setConfig((prev) => ({
          ...prev,
          players: prev.players.map((player) => ({
            ...resetPlayerForNewTournament(player),
            chips: undefined,
          })),
        }));
        setAddOnEndLevelIndex(null);
        setHandForHandActive(false);
        setShowSeatingOverlay(false);
        resetGameEvents();
      },
    );
  }, [
    confirmBeforeAction,
    t,
    timer,
    setConfig,
    setPendingCheckpoint,
    setAddOnEndLevelIndex,
    setHandForHandActive,
    resetGameEvents,
  ]);

  const handleExitToSetup = useCallback(() => {
    confirmBeforeAction(
      t('confirm.exitTournament.title'),
      t('confirm.exitTournament.message'),
      t('confirm.exitTournament.confirm'),
      switchToSetup,
    );
  }, [confirmBeforeAction, t, switchToSetup]);

  return {
    showSeatingOverlay,
    switchToGame,
    handleDismissSeating,
    switchToSetup,
    restoreFromCheckpoint,
    dismissCheckpoint,
    handleResetLevel,
    handleRestart,
    handleExitToSetup,
  };
}
