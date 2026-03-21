import type { TranslationKey } from '../i18n';
import { validateConfig, validatePayoutConfig, loadLeagues } from './logic';
import type { TournamentConfig } from './types';

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

/**
 * Centralized preflight checks for switching from setup/league into game mode.
 */
export function collectStartErrors(config: TournamentConfig, t: Translate): string[] {
  const errors: string[] = [];

  // Structural guards
  if (config.levels.filter((l) => l.type === 'level').length === 0) {
    errors.push(t('app.noLevels'));
  }

  if (config.players.length < 2) {
    errors.push(t('app.minPlayersRequired'));
  }

  if (config.payout.entries.length > config.players.length) {
    errors.push(
      t('app.morePlacesThanPlayers', {
        places: config.payout.entries.length,
        players: config.players.length,
      }),
    );
  }

  // Starting chips must be positive
  if (config.startingChips <= 0) {
    errors.push(t('app.startingChipsMustBePositive'));
  }

  // Bounty amount must be positive when bounty is enabled
  if (config.bounty.enabled && config.bounty.amount <= 0 && config.bounty.type === 'fixed') {
    errors.push(t('app.bountyAmountMustBePositive'));
  }

  // Blind levels must be monotonically increasing (BB[i] >= BB[i-1])
  const playLevels = config.levels.filter((l) => l.type === 'level');
  for (let i = 1; i < playLevels.length; i++) {
    const prevBB = playLevels[i - 1]?.bigBlind ?? 0;
    const currBB = playLevels[i]?.bigBlind ?? 0;
    if (currBB < prevBB) {
      errors.push(t('app.blindsNotMonotonic', { n: i + 1, bb: currBB, prevBb: prevBB }));
      break; // one warning is enough
    }
  }

  // Payout places must be contiguous (1, 2, 3, ...)
  if (config.payout.entries.length > 0) {
    const sortedPlaces = [...config.payout.entries].map(e => e.place).sort((a, b) => a - b);
    const isContiguous = sortedPlaces.every((p, i) => p === i + 1);
    if (!isContiguous) {
      errors.push(t('app.payoutPlacesNotContiguous'));
    }
  }

  // Dangling league reference check
  if (config.leagueId) {
    const leagues = loadLeagues();
    if (!leagues.some((l) => l.id === config.leagueId)) {
      errors.push(t('app.leagueNotFound'));
    }
  }

  errors.push(...validatePayoutConfig(config.payout, config.players.length));
  errors.push(...validateConfig(config).map((issue) => issue.message));

  return errors;
}
