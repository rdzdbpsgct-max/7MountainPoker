import { useEffect, useMemo, useRef, useState } from 'react';
import type { TournamentConfig, TournamentEvent, ChipDenomination } from '../domain/types';
import type { TournamentResult } from '../domain/types';
import {
  isRebuyActive,
  isLateRegistrationOpen,
  computeTournamentElapsedSeconds,
  computeAverageStack,
  scheduleToColorUpMap,
  isBubble,
  isInTheMoney,
  buildTournamentResult,
  loadLeagues,
  computeExtendedStandings,
  loadGameDaysForLeague,
} from '../domain/logic';
import { collectStartErrors } from '../domain/startValidation';
import type { TranslationKey } from '../i18n';

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

interface UseGameComputedStateParams {
  config: TournamentConfig;
  timerState: {
    currentLevelIndex: number;
    remainingSeconds: number;
    status: 'stopped' | 'running' | 'paused';
  };
  tournamentEvents: TournamentEvent[];
  t: Translate;
  /** Pre-computed lastRebuyLevelIndex (stays in App.tsx for useTimer dependency) */
  lastRebuyLevelIndex: number;
  /** Track add-on end level for time-based rebuy */
  addOnEndLevelIndex: number | null;
  /** Whether rebuy→add-on transition was detected */
  displaySeconds: number;
}

export interface GameComputedState {
  displaySeconds: number;
  tournamentElapsed: number;
  rebuyActive: boolean;
  lateRegOpen: boolean;
  currentPlayLevel: number;
  averageStack: number;
  colorUpMap: Map<number, ChipDenomination[]>;
  activePlayerCount: number;
  paidPlaces: number;
  bubbleActive: boolean;
  inTheMoney: boolean;
  isBreak: boolean;
  tournamentFinished: boolean;
  winner: TournamentConfig['players'][number] | null;
  finishedResult: TournamentResult | null;
  startErrors: string[];
  leagueDisplayData: { name: string; standings: ReturnType<typeof computeExtendedStandings> } | undefined;
  addOnWindowOpen: boolean;
}

export function useGameComputedState({
  config,
  timerState,
  tournamentEvents,
  t,
  lastRebuyLevelIndex,
  addOnEndLevelIndex,
  displaySeconds,
}: UseGameComputedStateParams): GameComputedState {
  const tournamentElapsed = useMemo(
    () =>
      computeTournamentElapsedSeconds(
        config.levels,
        timerState.currentLevelIndex,
        displaySeconds,
      ),
    [config.levels, timerState.currentLevelIndex, displaySeconds],
  );

  const rebuyActive = useMemo(
    () =>
      isRebuyActive(
        config.rebuy,
        timerState.currentLevelIndex,
        config.levels,
        tournamentElapsed,
      ),
    [config.rebuy, timerState.currentLevelIndex, config.levels, tournamentElapsed],
  );

  const lateRegOpen = useMemo(
    () => isLateRegistrationOpen(config, timerState.currentLevelIndex, config.levels),
    [config, timerState.currentLevelIndex],
  );

  const addOnWindowOpen = useMemo(() => {
    if (!config.addOn.enabled || !config.rebuy.enabled) return false;
    const idx = timerState.currentLevelIndex;

    if (config.rebuy.limitType === 'levels' && lastRebuyLevelIndex >= 0) {
      // Show at the end of the last rebuy level (timer expired, waiting for advance)
      if (idx === lastRebuyLevelIndex && displaySeconds <= 0) return true;
      // Show during the break after the last rebuy level (if any) + next play level
      const nextIdx = lastRebuyLevelIndex + 1;
      if (nextIdx >= config.levels.length) return false;
      if (config.levels[nextIdx]?.type === 'break') {
        // Show only during the break — not in the level after the break
        return idx === nextIdx;
      }
      // No break — show during the next play level only
      return idx === nextIdx;
    }

    // Time-based: use reactive detection (addOnEndLevelIndex)
    return !rebuyActive
      && addOnEndLevelIndex !== null
      && idx === addOnEndLevelIndex;
  }, [config.addOn.enabled, config.rebuy, config.levels, lastRebuyLevelIndex, timerState.currentLevelIndex, displaySeconds, rebuyActive, addOnEndLevelIndex]);

  const currentPlayLevel = useMemo(() => {
    return config.levels
      .slice(0, timerState.currentLevelIndex + 1)
      .filter((l) => l.type === 'level').length;
  }, [config.levels, timerState.currentLevelIndex]);

  const averageStack = useMemo(
    () =>
      computeAverageStack(
        config.players,
        config.startingChips,
        config.rebuy.enabled ? config.rebuy.rebuyChips : 0,
        config.addOn.enabled ? config.addOn.chips : 0,
      ),
    [config.players, config.startingChips, config.rebuy.enabled, config.rebuy.rebuyChips, config.addOn.enabled, config.addOn.chips],
  );

  const colorUpMap = useMemo(
    () =>
      config.chips.enabled && config.chips.colorUpEnabled && config.chips.colorUpSchedule.length > 0
        ? scheduleToColorUpMap(config.chips.colorUpSchedule, config.chips.denominations)
        : new Map(),
    [config.chips.enabled, config.chips.colorUpEnabled, config.chips.colorUpSchedule, config.chips.denominations],
  );

  const activePlayerCount = useMemo(
    () => config.players.filter((p) => p.status === 'active').length,
    [config.players],
  );

  const paidPlaces = config.payout.entries.length;

  const bubbleActive = useMemo(
    () => isBubble(activePlayerCount, paidPlaces),
    [activePlayerCount, paidPlaces],
  );

  const inTheMoney = useMemo(
    () => isInTheMoney(activePlayerCount, paidPlaces),
    [activePlayerCount, paidPlaces],
  );

  const isBreak = config.levels[timerState.currentLevelIndex]?.type === 'break';

  const tournamentFinished = useMemo(() => {
    if (config.players.length < 2) return false;
    return config.players.filter((p) => p.status === 'active').length === 1;
  }, [config.players]);

  const winner = useMemo(() => {
    if (!tournamentFinished) return null;
    return config.players.find((p) => p.status === 'active') ?? null;
  }, [tournamentFinished, config.players]);

  // Capture snapshot values at the moment the tournament finishes so that the
  // finishedResult memo doesn't recompute on every timer tick.
  const [finishedResult, setFinishedResult] = useState<TournamentResult | null>(null);
  const finishedConfigRef = useRef(config);
  useEffect(() => { finishedConfigRef.current = config; });

  useEffect(() => {
    if (tournamentFinished && !finishedResult) {
      setFinishedResult(
        buildTournamentResult(finishedConfigRef.current, tournamentElapsed, currentPlayLevel, tournamentEvents),
      );
    }
    if (!tournamentFinished && finishedResult) {
      setFinishedResult(null);
    }
  }, [tournamentFinished, finishedResult, tournamentElapsed, currentPlayLevel, tournamentEvents]);

  const startErrors = useMemo(() => collectStartErrors(config, t), [config, t]);

  const leagueDisplayData = useMemo(() => {
    if (!config.leagueId) return undefined;
    const leagues = loadLeagues();
    const league = leagues.find((l) => l.id === config.leagueId);
    if (!league) return undefined;
    const gameDays = loadGameDaysForLeague(league.id);
    if (gameDays.length === 0) return undefined;
    return { name: league.name, standings: computeExtendedStandings(league, gameDays) };
  }, [config.leagueId]);

  return {
    displaySeconds,
    tournamentElapsed,
    rebuyActive,
    lateRegOpen,
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
    addOnWindowOpen,
  };
}
