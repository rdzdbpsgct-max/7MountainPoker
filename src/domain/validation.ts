import type {
  TournamentConfig,
  Level,
  PayoutConfig,
  RebuyConfig,
  LateRegistrationConfig,
  Player,
} from './types';
import { t as moduleT } from '../i18n/translations';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationError {
  levelIndex: number;
  message: string;
}

export function validateConfig(config: TournamentConfig, t = moduleT): ValidationError[] {
  const errors: ValidationError[] = [];

  config.levels.forEach((level, i) => {
    if (level.durationSeconds <= 0) {
      errors.push({ levelIndex: i, message: t('logic.durationMustBePositive', { n: i + 1 }) });
    }
    if (level.type === 'level') {
      if (level.smallBlind == null || level.bigBlind == null) {
        errors.push({ levelIndex: i, message: t('logic.blindsMustBeSet', { n: i + 1 }) });
      } else if (level.smallBlind <= 0 || level.bigBlind <= 0) {
        errors.push({ levelIndex: i, message: t('logic.blindsMustBePositive', { n: i + 1 }) });
      } else if (level.bigBlind <= level.smallBlind) {
        errors.push({ levelIndex: i, message: t('logic.bbMustBeGreaterThanSb', { n: i + 1 }) });
      }
    }
  });

  return errors;
}

// ---------------------------------------------------------------------------
// Payout Validation
// ---------------------------------------------------------------------------

export function validatePayoutConfig(payout: PayoutConfig, maxPlaces?: number, t = moduleT, prizePool?: number): string[] {
  const errors: string[] = [];

  if (payout.entries.length === 0) {
    errors.push(t('logic.minOnePayoutPlace'));
    return errors;
  }

  if (maxPlaces !== undefined && payout.entries.length > maxPlaces) {
    errors.push(t('logic.maxPayoutPlaces', { max: maxPlaces }));
  }

  // Check for duplicate places
  const places = new Set<number>();
  for (const entry of payout.entries) {
    if (places.has(entry.place)) {
      errors.push(t('logic.duplicatePlaces', { place: entry.place }));
    }
    places.add(entry.place);
  }

  payout.entries.forEach((entry) => {
    if (entry.value < 0) {
      errors.push(t('logic.valueMustNotBeNegative', { place: entry.place }));
    }
  });

  if (payout.mode === 'percent') {
    const sum = payout.entries.reduce((s, e) => s + e.value, 0);
    if (Math.abs(sum - 100) > 0.01) {
      errors.push(t('logic.percentMustBe100', { sum: Math.round(sum) }));
    }
  }

  // In euro mode, warn if fixed payouts exceed the actual prize pool
  if (payout.mode === 'euro' && prizePool !== undefined && prizePool > 0) {
    const sum = payout.entries.reduce((s, e) => s + e.value, 0);
    if (sum > prizePool) {
      errors.push(t('logic.euroPayoutExceedsPrizePool', { sum: Math.round(sum), pool: Math.round(prizePool) }));
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Late Registration
// ---------------------------------------------------------------------------

export function isLateRegistrationOpen(
  config: TournamentConfig,
  currentLevelIndex: number,
  levels: Level[],
): boolean {
  const lr = config.lateRegistration;
  if (!lr?.enabled) return false;
  const playLevelNumber = levels
    .slice(0, currentLevelIndex + 1)
    .filter((l) => l.type === 'level').length;
  return playLevelNumber <= lr.levelLimit;
}

// ---------------------------------------------------------------------------
// Rebuy
// ---------------------------------------------------------------------------

export function isRebuyActive(
  rebuy: RebuyConfig,
  currentLevelIndex: number,
  levels: Level[],
  elapsedSeconds: number,
): boolean {
  if (!rebuy.enabled) return false;

  if (rebuy.limitType === 'levels') {
    const playLevelNumber = levels
      .slice(0, currentLevelIndex + 1)
      .filter((l) => l.type === 'level').length;
    return playLevelNumber <= rebuy.levelLimit;
  }

  return elapsedSeconds < rebuy.timeLimit;
}

/** Check if a specific player can still rebuy (considering per-player cap) */
export function canPlayerRebuy(player: Player, rebuy: RebuyConfig): boolean {
  if (rebuy.maxRebuysPerPlayer === undefined) return true;
  return player.rebuys < rebuy.maxRebuysPerPlayer;
}

// ---------------------------------------------------------------------------
// Default late registration config
// ---------------------------------------------------------------------------

export function defaultLateRegistrationConfig(): LateRegistrationConfig {
  return { enabled: false, levelLimit: 4 };
}
