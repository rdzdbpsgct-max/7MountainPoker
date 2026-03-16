import type { Level, ChipConfig, ChipDenomination, ColorUpEntry } from './types';
import { generateChipId } from './helpers';

// ---------------------------------------------------------------------------
// Chip Colors & Presets
// ---------------------------------------------------------------------------

export const CHIP_COLORS = [
  { hex: '#FFFFFF', de: 'Weiß', en: 'White' },
  { hex: '#EF4444', de: 'Rot', en: 'Red' },
  { hex: '#3B82F6', de: 'Blau', en: 'Blue' },
  { hex: '#22C55E', de: 'Grün', en: 'Green' },
  { hex: '#111827', de: 'Schwarz', en: 'Black' },
  { hex: '#A855F7', de: 'Lila', en: 'Purple' },
  { hex: '#EAB308', de: 'Gelb', en: 'Yellow' },
  { hex: '#F97316', de: 'Orange', en: 'Orange' },
  { hex: '#EC4899', de: 'Pink', en: 'Pink' },
  { hex: '#6B7280', de: 'Grau', en: 'Gray' },
  { hex: '#92400E', de: 'Braun', en: 'Brown' },
  { hex: '#06B6D4', de: 'Cyan', en: 'Cyan' },
  { hex: '#B91C1C', de: 'Dunkelrot', en: 'Dark Red' },
  { hex: '#14532D', de: 'Dunkelgrün', en: 'Dark Green' },
  { hex: '#1E3A5F', de: 'Dunkelblau', en: 'Dark Blue' },
  { hex: '#F5F5DC', de: 'Beige', en: 'Beige' },
  { hex: '#D4AF37', de: 'Gold', en: 'Gold' },
  { hex: '#C0C0C0', de: 'Silber', en: 'Silver' },
  { hex: '#7C3AED', de: 'Violett', en: 'Violet' },
  { hex: '#0EA5E9', de: 'Hellblau', en: 'Light Blue' },
] as const;

export interface ChipPreset {
  key: string;
  denominations: Omit<ChipDenomination, 'id'>[];
}

export const chipPresets: ChipPreset[] = [
  {
    key: '4color',
    denominations: [
      { value: 25, color: '#FFFFFF', label: 'Weiß' },
      { value: 50, color: '#EF4444', label: 'Rot' },
      { value: 100, color: '#22C55E', label: 'Grün' },
      { value: 500, color: '#111827', label: 'Schwarz' },
    ],
  },
  {
    key: '5color',
    denominations: [
      { value: 25, color: '#FFFFFF', label: 'Weiß' },
      { value: 50, color: '#EF4444', label: 'Rot' },
      { value: 100, color: '#3B82F6', label: 'Blau' },
      { value: 500, color: '#22C55E', label: 'Grün' },
      { value: 1000, color: '#111827', label: 'Schwarz' },
    ],
  },
  {
    key: '6color',
    denominations: [
      { value: 25, color: '#FFFFFF', label: 'Weiß' },
      { value: 50, color: '#EF4444', label: 'Rot' },
      { value: 100, color: '#3B82F6', label: 'Blau' },
      { value: 500, color: '#22C55E', label: 'Grün' },
      { value: 1000, color: '#111827', label: 'Schwarz' },
      { value: 5000, color: '#A855F7', label: 'Lila' },
    ],
  },
];

export function applyChipPreset(preset: ChipPreset): ChipConfig {
  return {
    enabled: true,
    colorUpEnabled: true,
    denominations: preset.denominations.map((d) => ({
      ...d,
      id: generateChipId(),
    })),
    colorUpSchedule: [],
  };
}

export function defaultChipConfig(): ChipConfig {
  const preset = applyChipPreset(chipPresets[1]!); // 5-color preset, disabled by default
  return { ...preset, enabled: false };
}

// ---------------------------------------------------------------------------
// Blind-Chip Compatibility
// ---------------------------------------------------------------------------

/**
 * Check whether all blind values in a level array are compatible with the given
 * chip denominations, i.e. every SB/BB/Ante is a multiple of the smallest chip.
 * Returns list of incompatible blind values (empty = all compatible).
 */
export function checkBlindChipCompatibility(
  levels: Level[],
  denominations: ChipDenomination[],
): number[] {
  if (denominations.length === 0) return [];
  const smallest = Math.min(...denominations.map((d) => d.value));
  if (smallest <= 0) return [];

  const bad = new Set<number>();
  for (const level of levels) {
    if (level.type !== 'level') continue;
    if (level.smallBlind != null && level.smallBlind % smallest !== 0) bad.add(level.smallBlind);
    if (level.bigBlind != null && level.bigBlind % smallest !== 0) bad.add(level.bigBlind);
    if (level.ante != null && level.ante > 0 && level.ante % smallest !== 0) bad.add(level.ante);
  }
  return [...bad].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Color-Up
// ---------------------------------------------------------------------------

/**
 * Check whether a denomination is needed to represent any of the given values.
 * A denomination can only be removed (color-up) when ALL future blind values
 * are multiples of the next-higher active denomination.
 */
function isDenominationNeeded(
  denomValue: number,
  allDenoms: ChipDenomination[],
  values: number[],
): boolean {
  const higherValues = allDenoms
    .map((d) => d.value)
    .filter((v) => v > denomValue)
    .sort((a, b) => a - b);

  // Highest denomination is always needed (nothing to replace it)
  if (higherValues.length === 0) return true;

  const nextHigher = higherValues[0];

  for (const val of values) {
    if (val <= 0) continue;
    if (val % nextHigher! !== 0) return true;
  }
  return false;
}

/**
 * Find the next break at or after the given level index.
 * Returns the break's level index, or null if no break follows.
 */
function findNextBreak(levels: Level[], fromIndex: number): number | null {
  for (let i = fromIndex; i < levels.length; i++) {
    if (levels[i]!.type === 'break') return i;
  }
  return null;
}

/**
 * Compute color-up events for the blind structure.
 * Color-ups are shifted to the next break (pause) after the level where
 * a denomination becomes unnecessary.
 * Returns a Map: levelIndex -> denominations to remove at that level.
 */
export function computeColorUps(
  levels: Level[],
  denominations: ChipDenomination[],
): Map<number, ChipDenomination[]> {
  const result = new Map<number, ChipDenomination[]>();
  if (denominations.length <= 1) return result;

  const sorted = [...denominations].sort((a, b) => a.value - b.value);
  const removedIds = new Set<string>();

  for (const denom of sorted) {
    for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
      const futureValues: number[] = [];
      for (let j = levelIdx; j < levels.length; j++) {
        const lvl = levels[j]!;
        if (lvl.type === 'level') {
          if (lvl.smallBlind) futureValues.push(lvl.smallBlind);
          if (lvl.bigBlind) futureValues.push(lvl.bigBlind);
          if (lvl.ante && lvl.ante > 0) futureValues.push(lvl.ante);
        }
      }

      if (futureValues.length === 0) continue;

      const activeDenoms = sorted.filter(
        (d) => !removedIds.has(d.id) || d.id === denom.id,
      );

      if (!isDenominationNeeded(denom.value, activeDenoms, futureValues)) {
        removedIds.add(denom.id);
        // Shift color-up to the next break after this level
        const firstBreak = findNextBreak(levels, levelIdx);
        // For realism: skip one more break to keep chips in play longer.
        const secondBreak = firstBreak !== null ? findNextBreak(levels, firstBreak + 1) : null;
        const targetIdx = secondBreak ?? firstBreak ?? levelIdx;
        const existing = result.get(targetIdx) ?? [];
        existing.push(denom);
        result.set(targetIdx, existing);
        break;
      }
    }
  }

  return result;
}

/** Set of denomination IDs removed at or before the given level index. */
export function getRemovedDenomIds(
  colorUpMap: Map<number, ChipDenomination[]>,
  currentLevelIndex: number,
): Set<string> {
  const removed = new Set<string>();
  for (const [levelIdx, denoms] of colorUpMap) {
    if (levelIdx <= currentLevelIndex) {
      for (const d of denoms) removed.add(d.id);
    }
  }
  return removed;
}

/** Next level index with a color-up event (strictly after currentLevelIndex). */
export function getNextColorUpLevel(
  colorUpMap: Map<number, ChipDenomination[]>,
  currentLevelIndex: number,
): number | null {
  let next: number | null = null;
  for (const levelIdx of colorUpMap.keys()) {
    if (levelIdx > currentLevelIndex) {
      if (next === null || levelIdx < next) next = levelIdx;
    }
  }
  return next;
}

/**
 * Generate a color-up suggestion by converting the auto-computed map to a flat schedule.
 */
export function generateColorUpSuggestion(
  levels: Level[],
  denominations: ChipDenomination[],
): ColorUpEntry[] {
  const map = computeColorUps(levels, denominations);
  const entries: ColorUpEntry[] = [];
  for (const [levelIndex, denoms] of map) {
    for (const d of denoms) {
      entries.push({ levelIndex, denomId: d.id });
    }
  }
  return entries.sort((a, b) => a.levelIndex - b.levelIndex);
}

/**
 * Convert a stored color-up schedule to the Map format used for display/game mode.
 * Filters out entries referencing non-existent denominations.
 */
export function scheduleToColorUpMap(
  schedule: ColorUpEntry[],
  denominations: ChipDenomination[],
): Map<number, ChipDenomination[]> {
  const denomMap = new Map(denominations.map((d) => [d.id, d]));
  const result = new Map<number, ChipDenomination[]>();
  for (const entry of schedule) {
    const denom = denomMap.get(entry.denomId);
    if (!denom) continue;
    const existing = result.get(entry.levelIndex) ?? [];
    existing.push(denom);
    result.set(entry.levelIndex, existing);
  }
  return result;
}
