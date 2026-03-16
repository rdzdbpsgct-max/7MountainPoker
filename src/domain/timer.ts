import type { Level, TimerState } from './types';

// ---------------------------------------------------------------------------
// Drift-free remaining computation
// ---------------------------------------------------------------------------

/** Computes remaining seconds using wall-clock timestamps for drift-free timing. */
export function computeRemaining(
  startedAt: number,
  remainingAtStart: number,
  now: number,
): number {
  const elapsed = (now - startedAt) / 1000;
  return Math.max(0, remainingAtStart - elapsed);
}

// ---------------------------------------------------------------------------
// Level navigation
// ---------------------------------------------------------------------------

/** Advances to the next level and resets the timer. Returns stopped state if no more levels. */
export function advanceLevel(
  state: TimerState,
  levels: Level[],
): TimerState {
  const nextIndex = state.currentLevelIndex + 1;
  if (nextIndex >= levels.length) {
    return {
      ...state,
      status: 'stopped',
      remainingSeconds: 0,
      startedAt: null,
      remainingAtStart: null,
    };
  }
  return {
    currentLevelIndex: nextIndex,
    remainingSeconds: levels[nextIndex]!.durationSeconds,
    status: 'stopped',
    startedAt: null,
    remainingAtStart: null,
  };
}

/** Moves back to the previous level and resets the timer. Clamps to the first level. */
export function previousLevel(
  state: TimerState,
  levels: Level[],
): TimerState {
  if (levels.length === 0) {
    return { ...state, remainingSeconds: 0, status: 'stopped', startedAt: null, remainingAtStart: null };
  }
  const prevIndex = Math.max(0, state.currentLevelIndex - 1);
  return {
    currentLevelIndex: prevIndex,
    remainingSeconds: levels[prevIndex]!.durationSeconds,
    status: 'stopped',
    startedAt: null,
    remainingAtStart: null,
  };
}

/** Resets the current level's timer back to its full duration without changing the level index. */
export function resetCurrentLevel(
  state: TimerState,
  levels: Level[],
): TimerState {
  if (levels.length === 0) {
    return { ...state, remainingSeconds: 0, status: 'stopped', startedAt: null, remainingAtStart: null };
  }
  const clampedIndex = Math.min(state.currentLevelIndex, levels.length - 1);
  return {
    ...state,
    currentLevelIndex: clampedIndex,
    remainingSeconds: levels[clampedIndex]!.durationSeconds,
    status: 'stopped',
    startedAt: null,
    remainingAtStart: null,
  };
}

/** Returns a fresh TimerState starting at level 0 with the timer stopped. */
export function restartTournament(levels: Level[]): TimerState {
  return {
    currentLevelIndex: 0,
    remainingSeconds: levels.length > 0 ? levels[0]!.durationSeconds : 0,
    status: 'stopped',
    startedAt: null,
    remainingAtStart: null,
  };
}

// ---------------------------------------------------------------------------
// Elapsed / Estimated remaining
// ---------------------------------------------------------------------------

/** Computes total elapsed tournament time in seconds by summing completed levels plus current level progress. */
export function computeTournamentElapsedSeconds(
  levels: Level[],
  currentLevelIndex: number,
  remainingSeconds: number,
): number {
  let elapsed = 0;
  for (let i = 0; i < currentLevelIndex; i++) {
    elapsed += levels[i]!.durationSeconds;
  }
  if (currentLevelIndex < levels.length) {
    elapsed += levels[currentLevelIndex]!.durationSeconds - remainingSeconds;
  }
  return Math.max(0, elapsed);
}

export function computeEstimatedRemainingSeconds(
  levels: Level[],
  currentLevelIndex: number,
  remainingSeconds: number,
): number {
  let remaining = remainingSeconds;
  for (let i = currentLevelIndex + 1; i < levels.length; i++) {
    remaining += levels[i]!.durationSeconds;
  }
  return Math.max(0, remaining);
}
