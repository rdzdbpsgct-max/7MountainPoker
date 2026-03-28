import { useEffect, useRef, useState } from 'react';
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
  const tournamentElapsed = computeTournamentElapsedSeconds(
    config.levels,
    timerState.currentLevelIndex,
    displaySeconds,
  );

  const rebuyActive = isRebuyActive(
    config.rebuy,
    timerState.currentLevelIndex,
    config.levels,
    tournamentElapsed,
  );

  const lateRegOpen = isLateRegistrationOpen(config, timerState.currentLevelIndex, config.levels);

  const addOnWindowOpen = (() => {
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
  })();

  const currentPlayLevel = config.levels
    .slice(0, timerState.currentLevelIndex + 1)
    .filter((l) => l.type === 'level').length;

  const averageStack = computeAverageStack(
    config.players,
    config.startingChips,
    config.rebuy.enabled ? config.rebuy.rebuyChips : 0,
    config.addOn.enabled ? config.addOn.chips : 0,
  );

  const colorUpMap = config.chips.enabled && config.chips.colorUpEnabled && config.chips.colorUpSchedule.length > 0
    ? scheduleToColorUpMap(config.chips.colorUpSchedule, config.chips.denominations)
    : new Map();

  const activePlayerCount = config.players.filter((p) => p.status === 'active').length;

  const paidPlaces = config.payout.entries.length;

  const bubbleActive = isBubble(activePlayerCount, paidPlaces);

  const inTheMoney = isInTheMoney(activePlayerCount, paidPlaces);

  const isBreak = config.levels[timerState.currentLevelIndex]?.type === 'break';

  const tournamentFinished = (() => {
    if (config.players.length < 2) return false;
    const active = config.players.filter((p) => p.status === 'active').length;
    if (active === 1) return true; // Normal win
    if (active === 0 && config.players.some((p) => p.dealPayout !== undefined)) return true; // Deal
    return false;
  })();

  const winner = (() => {
    if (!tournamentFinished) return null;
    // Normal win: single active player
    const active = config.players.find((p) => p.status === 'active');
    if (active) return active;
    // Deal case: player with best placement (1)
    return config.players.find((p) => p.placement === 1) ?? null;
  })();

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

  const startErrors = collectStartErrors(config, t);

  const leagueDisplayData = (() => {
    if (!config.leagueId) return undefined;
    const leagues = loadLeagues();
    const league = leagues.find((l) => l.id === config.leagueId);
    if (!league) return undefined;
    const gameDays = loadGameDaysForLeague(league.id);
    if (gameDays.length === 0) return undefined;
    return { name: league.name, standings: computeExtendedStandings(league, gameDays) };
  })();

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
