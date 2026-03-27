import type { Level, AnteMode, TournamentResult } from './types';
import { generateId } from './helpers';
import { t as moduleT } from '../i18n/translations';

// ---------------------------------------------------------------------------
// Blind Structure Summary
// ---------------------------------------------------------------------------

export function computeBlindStructureSummary(levels: Level[]): {
  levelCount: number;
  breakCount: number;
  avgMinutes: number;
} {
  const playLevels = levels.filter((l) => l.type === 'level');
  const breaks = levels.filter((l) => l.type === 'break');
  const avgMinutes =
    playLevels.length > 0
      ? Math.round(
          playLevels.reduce((s, l) => s + l.durationSeconds, 0) /
            playLevels.length /
            60,
        )
      : 0;
  return { levelCount: playLevels.length, breakCount: breaks.length, avgMinutes };
}

// ---------------------------------------------------------------------------
// Rounding helpers
// ---------------------------------------------------------------------------

/**
 * Round a value to a "nice" poker-friendly number.
 */
export function roundToNice(value: number): number {
  if (value <= 0) return 0;
  if (value <= 10) return Math.max(1, Math.round(value));
  if (value <= 50) return Math.round(value / 5) * 5;
  if (value <= 200) return Math.round(value / 25) * 25;
  if (value <= 1000) return Math.round(value / 50) * 50;
  if (value <= 5000) return Math.round(value / 100) * 100;
  return Math.round(value / 500) * 500;
}

/**
 * Round a value to the nearest multiple of the smallest chip denomination.
 * Falls back to roundToNice() when no chip constraint is given.
 */
export function roundToChipMultiple(value: number, smallestChip: number): number {
  if (value <= 0 || smallestChip <= 0) return 0;
  return Math.max(smallestChip, Math.round(value / smallestChip) * smallestChip);
}

// ---------------------------------------------------------------------------
// Ante helpers
// ---------------------------------------------------------------------------

export function stripAnteFromLevels(levels: Level[]): Level[] {
  return levels.map((level) =>
    level.type === 'level' ? { ...level, ante: 0 } : level,
  );
}

/**
 * Compute a standard ante value based on the big blind.
 * Typical poker tournament ante ~ 10-12.5% of BB, rounded to a "nice" value.
 */
export function computeDefaultAnte(bigBlind: number, anteMode: AnteMode = 'standard'): number {
  if (bigBlind <= 0) return 0;

  // Big Blind Ante: ante equals the big blind
  if (anteMode === 'bigBlindAnte') return bigBlind;

  // Standard: ~12.5% of BB, rounded to nice values
  const raw = Math.round(bigBlind * 0.125);
  if (raw <= 0) return 0;

  if (raw <= 5) return raw;
  if (raw <= 10) return Math.round(raw / 5) * 5;
  if (raw <= 50) return Math.round(raw / 5) * 5;
  if (raw <= 100) return Math.round(raw / 25) * 25;
  if (raw <= 500) return Math.round(raw / 50) * 50;
  return Math.round(raw / 100) * 100;
}

/**
 * Apply ante values to all play levels based on their big blind and ante mode.
 */
export function applyDefaultAntes(levels: Level[], anteMode: AnteMode = 'standard'): Level[] {
  return levels.map((level) => {
    if (level.type !== 'level') return level;
    const ante = computeDefaultAnte(level.bigBlind ?? 0, anteMode);
    return { ...level, ante };
  });
}

// ---------------------------------------------------------------------------
// Blind Structure Generator
// ---------------------------------------------------------------------------

/**
 * Reference BB sequences for each speed, calibrated for 20 000 starting chips.
 * Fast: aggressive jumps, fewer levels -- turbo / multi-deck games.
 * Normal: classic home-tournament progression.
 * Slow: gradual increments, deep play.
 */
const REFERENCE_STACKS = 20000;

const BB_SEQUENCES: Record<string, number[]> = {
  fast: [
    50, 100, 200, 400, 600, 800, 1200, 1600, 2000, 3000, 4000, 6000, 8000, 10000,
  ],
  normal: [
    50, 100, 150, 200, 400, 600, 800, 1000, 1500, 2000, 3000, 4000, 6000, 8000, 10000,
  ],
  slow: [
    50, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000,
  ],
};

export type BlindSpeed = 'fast' | 'normal' | 'slow';

interface SpeedConfig {
  key: BlindSpeed;
  levelDurationSeconds: number;
  breakDurationSeconds: number;
  breakEveryNLevels: number;
}

const SPEED_CONFIGS: Record<BlindSpeed, SpeedConfig> = {
  fast:   { key: 'fast',   levelDurationSeconds: 360,  breakDurationSeconds: 300, breakEveryNLevels: 4 },
  normal: { key: 'normal', levelDurationSeconds: 720,  breakDurationSeconds: 600, breakEveryNLevels: 4 },
  slow:   { key: 'slow',   levelDurationSeconds: 1200, breakDurationSeconds: 600, breakEveryNLevels: 4 },
};

export interface GenerateBlindParams {
  startingChips: number;
  speed: BlindSpeed;
  anteEnabled: boolean;
  anteMode?: AnteMode | undefined;
  /** Smallest chip denomination -- when provided, all blind values snap to its multiples. */
  smallestChip?: number | undefined;
}

/**
 * Generate a complete blind structure based on starting chips and speed.
 * Each speed has its own BB progression (not just different durations).
 * Values are scaled from a 20k reference stack and rounded to nice poker numbers.
 * When smallestChip is provided, all values snap to chip multiples.
 */
export function generateBlindStructure(params: GenerateBlindParams): Level[] {
  const { startingChips, speed, anteEnabled, anteMode = 'standard', smallestChip } = params;
  const cfg = SPEED_CONFIGS[speed];
  const scale = startingChips / REFERENCE_STACKS;
  const round = smallestChip != null && smallestChip > 0
    ? (v: number) => roundToChipMultiple(v, smallestChip)
    : roundToNice;

  const playLevels: Level[] = [];
  let lastBB = 0;

  for (const refBB of BB_SEQUENCES[speed]!) {
    const rawBB = round(refBB * scale);
    if (rawBB <= lastBB) continue; // skip duplicates after rounding
    const sb = round(rawBB / 2);
    const bb = sb * 2; // ensure BB is always exactly double SB
    if (sb >= bb) continue; // safety: SB must be < BB
    const rawAnte = anteEnabled ? computeDefaultAnte(bb, anteMode) : 0;
    const ante = rawAnte > 0 && smallestChip ? round(rawAnte) : rawAnte;

    playLevels.push({
      id: generateId(),
      type: 'level',
      durationSeconds: cfg.levelDurationSeconds,
      smallBlind: sb,
      bigBlind: bb,
      ante,
    });
    lastBB = bb;
  }

  // Guard: ensure at least 1 play level even after rounding collapse
  if (playLevels.length === 0) {
    const fallbackBB = round(cfg.levelDurationSeconds > 0 ? 100 * scale : 100);
    const fallbackSB = round(fallbackBB / 2);
    playLevels.push({
      id: generateId(),
      type: 'level',
      durationSeconds: cfg.levelDurationSeconds,
      smallBlind: fallbackSB > 0 ? fallbackSB : 1,
      bigBlind: fallbackBB > fallbackSB ? fallbackBB : (fallbackSB > 0 ? fallbackSB * 2 : 2),
      ante: 0,
    });
  }

  // Insert breaks every N play levels
  const levels: Level[] = [];
  let playCount = 0;
  for (const level of playLevels) {
    if (playCount > 0 && playCount % cfg.breakEveryNLevels === 0) {
      levels.push({
        id: generateId(),
        type: 'break',
        durationSeconds: cfg.breakDurationSeconds,
        label: moduleT('logic.defaultBreakLabel'),
      });
    }
    levels.push(level);
    playCount++;
  }

  return levels;
}

// ---------------------------------------------------------------------------
// Blind Structure Generator — By Target End Time
// ---------------------------------------------------------------------------

export interface GenerateByEndTimeParams {
  startingChips: number;
  targetMinutes: number;
  playerCount: number;
  anteEnabled: boolean;
  anteMode?: AnteMode | undefined;
  smallestChip?: number | undefined;
}

/**
 * Generate a blind structure that aims to finish within a target duration.
 * Derives speed and level duration from the target minutes, then iteratively
 * adjusts until the estimated tournament length is within ±10 minutes.
 */
export function generateBlindsByEndTime(params: GenerateByEndTimeParams): Level[] {
  const { startingChips, targetMinutes, playerCount, anteEnabled, anteMode = 'standard', smallestChip } = params;
  if (targetMinutes <= 0 || playerCount < 2) {
    return generateBlindStructure({ startingChips, speed: 'normal', anteEnabled, anteMode, smallestChip });
  }

  const targetSeconds = targetMinutes * 60;

  // Determine best speed based on target duration and player count
  // Short tournaments → fast sequence, long → slow sequence
  const targetPerPlayer = targetMinutes / playerCount;
  let speed: BlindSpeed;
  if (targetPerPlayer < 12) {
    speed = 'fast';
  } else if (targetPerPlayer < 25) {
    speed = 'normal';
  } else {
    speed = 'slow';
  }

  // Binary search for optimal level duration
  let lowDuration = 120; // 2 min minimum
  let highDuration = 2400; // 40 min maximum
  let bestLevels: Level[] = [];
  let bestDiff = Infinity;

  for (let iteration = 0; iteration < 15; iteration++) {
    const levelDuration = Math.round((lowDuration + highDuration) / 2);
    const breakDuration = Math.round(levelDuration * 0.7); // Break ~70% of level duration

    const levels = generateBlindStructureWithDuration(
      startingChips, speed, anteEnabled, anteMode, smallestChip,
      levelDuration, breakDuration,
    );

    const playedLevels = estimatePlayedLevels(levels, playerCount, startingChips);
    const estimated = estimateDuration(playedLevels);
    const diff = estimated - targetSeconds;

    if (Math.abs(diff) < Math.abs(bestDiff)) {
      bestDiff = diff;
      bestLevels = levels;
    }

    if (Math.abs(diff) < 600) break; // Within 10 minutes — good enough

    if (diff > 0) {
      // Too long → shorter levels
      highDuration = levelDuration - 1;
    } else {
      // Too short → longer levels
      lowDuration = levelDuration + 1;
    }

    if (lowDuration > highDuration) break;
  }

  return bestLevels;
}

/**
 * Internal: generate blind structure with explicit level/break durations.
 */
function generateBlindStructureWithDuration(
  startingChips: number,
  speed: BlindSpeed,
  anteEnabled: boolean,
  anteMode: AnteMode,
  smallestChip: number | undefined,
  levelDurationSeconds: number,
  breakDurationSeconds: number,
): Level[] {
  const scale = startingChips / REFERENCE_STACKS;
  const round = smallestChip != null && smallestChip > 0
    ? (v: number) => roundToChipMultiple(v, smallestChip)
    : roundToNice;

  const playLevels: Level[] = [];
  let lastBB = 0;

  for (const refBB of BB_SEQUENCES[speed]!) {
    const rawBB = round(refBB * scale);
    if (rawBB <= lastBB) continue;
    const sb = round(rawBB / 2);
    const bb = sb * 2;
    if (sb >= bb) continue;
    const rawAnte = anteEnabled ? computeDefaultAnte(bb, anteMode) : 0;
    const ante = rawAnte > 0 && smallestChip ? round(rawAnte) : rawAnte;

    playLevels.push({
      id: generateId(),
      type: 'level',
      durationSeconds: levelDurationSeconds,
      smallBlind: sb,
      bigBlind: bb,
      ante,
    });
    lastBB = bb;
  }

  // Insert breaks every 4 play levels
  const levels: Level[] = [];
  let playCount = 0;
  for (const level of playLevels) {
    if (playCount > 0 && playCount % 4 === 0) {
      levels.push({
        id: generateId(),
        type: 'break',
        durationSeconds: breakDurationSeconds,
        label: moduleT('logic.defaultBreakLabel'),
      });
    }
    levels.push(level);
    playCount++;
  }

  return levels;
}

// ---------------------------------------------------------------------------
// Live remaining duration prognosis
// ---------------------------------------------------------------------------

/**
 * Compute a live estimate of remaining tournament duration in seconds,
 * adjusted by active player count. More players → longer estimate,
 * fewer players → shorter.
 *
 * Player factor: clamp(activePlayers / 9, 0.3, 2.0)
 * 9 players → factor 1.0 (baseline), 4 players → ~0.44, 18 → 2.0
 */
export function computeLiveRemainingDuration(
  levels: Level[],
  currentLevelIndex: number,
  remainingCurrentLevelSeconds: number,
  activePlayers: number,
): number {
  if (currentLevelIndex >= levels.length) return 0;

  let totalSeconds = remainingCurrentLevelSeconds;
  for (let i = currentLevelIndex + 1; i < levels.length; i++) {
    totalSeconds += levels[i]!.durationSeconds;
  }

  const playerFactor = Math.max(0.3, Math.min(2.0, activePlayers / 9));
  return Math.round(totalSeconds * playerFactor);
}

// ---------------------------------------------------------------------------
// Duration estimates
// ---------------------------------------------------------------------------

/**
 * Estimate total duration of a level array in seconds.
 */
export function estimateDuration(levels: Level[]): number {
  return levels.reduce((sum, l) => sum + l.durationSeconds, 0);
}

/**
 * Estimate how many levels a tournament will realistically play through,
 * based on total chips in play and blind progression.
 * Assumes tournament ends when the short stack at heads-up is ~10 BBs.
 */
export function estimatePlayedLevels(levels: Level[], playerCount: number, startingChips: number): Level[] {
  if (playerCount < 2) return levels;
  const totalChips = startingChips * playerCount;
  // Estimate end: short stack at heads-up ~ 40% of total chips = ~10 BBs
  const endBB = Math.max(1, totalChips * 0.04);

  const result: Level[] = [];
  for (const level of levels) {
    result.push(level);
    if (level.type === 'level' && level.bigBlind != null && level.bigBlind >= endBB) {
      break;
    }
  }
  return result;
}

export interface DurationEstimate {
  speed: BlindSpeed;
  levels: Level[];
  totalSeconds: number;
}

/**
 * Estimate durations for all 3 speed configs.
 * Uses player count and starting chips to estimate realistic tournament length.
 */
export function estimateAllDurations(
  startingChips: number,
  anteEnabled: boolean,
  playerCount: number,
  smallestChip?: number,
  anteMode?: AnteMode,
): DurationEstimate[] {
  const speeds: BlindSpeed[] = ['fast', 'normal', 'slow'];
  return speeds.map((speed) => {
    const allLevels = generateBlindStructure({ startingChips, speed, anteEnabled, anteMode, smallestChip });
    const playedLevels = playerCount >= 2
      ? estimatePlayedLevels(allLevels, playerCount, startingChips)
      : allLevels;
    return {
      speed,
      levels: allLevels,
      totalSeconds: estimateDuration(playedLevels),
    };
  });
}

// ---------------------------------------------------------------------------
// Historical Duration Estimate
// ---------------------------------------------------------------------------

export type DurationConfidence = 'high' | 'medium' | 'low';

export interface HistoricalDurationEstimate {
  estimateSeconds: number;
  confidence: DurationConfidence;
  sampleSize: number;
}

/**
 * Compute tournament duration estimate using historical data from past tournaments.
 * Falls back to null if insufficient history (< 3 similar tournaments).
 *
 * Uses median duration per player from tournaments with similar player counts (±30%).
 */
export function computeHistoricalDurationEstimate(
  playerCount: number,
  history: TournamentResult[],
): HistoricalDurationEstimate | null {
  if (playerCount <= 0 || history.length === 0) return null;

  // Filter for valid tournaments with elapsed time and player count
  const valid = history.filter(
    (t) => t.elapsedSeconds > 0 && t.playerCount > 0,
  );

  // Filter for similar size: playerCount within ±30%
  const lowerBound = playerCount * 0.7;
  const upperBound = playerCount * 1.3;
  const similar = valid.filter(
    (t) => t.playerCount >= lowerBound && t.playerCount <= upperBound,
  );

  if (similar.length < 3) return null;

  // Compute seconds per player for each match
  const perPlayer = similar
    .map((t) => t.elapsedSeconds / t.playerCount)
    .sort((a, b) => a - b);

  // Median
  const mid = Math.floor(perPlayer.length / 2);
  const median =
    perPlayer.length % 2 === 1
      ? perPlayer[mid]!
      : (perPlayer[mid - 1]! + perPlayer[mid]!) / 2;

  const estimateSeconds = Math.round(median! * playerCount);

  // Confidence based on sample size
  let confidence: DurationConfidence;
  if (similar.length >= 8) {
    confidence = 'high';
  } else if (similar.length >= 5) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return { estimateSeconds, confidence, sampleSize: similar.length };
}

// ---------------------------------------------------------------------------
// Blind Structure CSV Export
// ---------------------------------------------------------------------------

export function formatBlindStructureAsCSV(levels: Level[]): string {
  const BOM = '\uFEFF';
  const header = 'Level,Small Blind,Big Blind,Ante,Duration (min),Type';
  let levelNum = 0;
  const rows = levels.map(level => {
    const isBreak = level.type === 'break';
    const type = isBreak ? 'Break' : 'Play';
    if (!isBreak) levelNum++;
    return [
      isBreak ? '' : levelNum,
      isBreak ? '' : (level.smallBlind ?? 0),
      isBreak ? '' : (level.bigBlind ?? 0),
      isBreak ? '' : (level.ante ?? 0),
      Math.floor(level.durationSeconds / 60),
      type,
    ].join(',');
  });
  return BOM + header + '\n' + rows.join('\n') + '\n';
}
