import type { League, TournamentConfig, TournamentSeries } from './types';

export interface RecoverySanitizationResult {
  config: TournamentConfig;
  removedMissingLeagueLink: boolean;
  removedMissingSeriesLink: boolean;
}

/**
 * Remove stale league and series references from recovered tournament config.
 * This prevents restore flows from keeping IDs that no longer exist.
 */
export function sanitizeRecoveredConfig(
  config: TournamentConfig,
  leagues: Pick<League, 'id'>[],
  series?: Pick<TournamentSeries, 'id'>[],
): RecoverySanitizationResult {
  let sanitized = config;
  let removedMissingLeagueLink = false;
  let removedMissingSeriesLink = false;

  if (sanitized.leagueId) {
    const leagueExists = leagues.some((l) => l.id === sanitized.leagueId);
    if (!leagueExists) {
      sanitized = { ...sanitized, leagueId: undefined };
      removedMissingLeagueLink = true;
    }
  }

  if (sanitized.seriesId && series) {
    const seriesExists = series.some((s) => s.id === sanitized.seriesId);
    if (!seriesExists) {
      sanitized = { ...sanitized, seriesId: undefined };
      removedMissingSeriesLink = true;
    }
  }

  return { config: sanitized, removedMissingLeagueLink, removedMissingSeriesLink };
}

