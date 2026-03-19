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
