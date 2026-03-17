import type {
  TournamentConfig,
  TournamentResult,
  League,
  PointSystem,
  GameDay,
} from './types';
import { parseConfigObject } from './configPersistence';
import { loadTournamentHistory, saveTournamentResult } from './historyPersistence';
import { loadGameDaysForLeague, saveGameDay } from './league';
import { getCached, setCachedItem, deleteCachedItem } from './storage';

// ---------------------------------------------------------------------------
// Leagues (backed by IndexedDB cache layer)
// ---------------------------------------------------------------------------

/** Return the default point system for new leagues. */
export function defaultPointSystem(): PointSystem {
  return {
    entries: [
      { place: 1, points: 10 },
      { place: 2, points: 7 },
      { place: 3, points: 5 },
      { place: 4, points: 4 },
      { place: 5, points: 3 },
      { place: 6, points: 2 },
      { place: 7, points: 1 },
    ],
  };
}

/** Load all leagues from storage cache. */
export function loadLeagues(): League[] {
  return getCached('leagues');
}

/** Upsert a league: update existing by id, or append if new. */
export function saveLeague(league: League): League {
  setCachedItem('leagues', league);
  return league;
}

/** Delete a league by id. */
export function deleteLeague(id: string): void {
  deleteCachedItem('leagues', id);
}

/**
 * Extract league-relevant config fields from a TournamentConfig.
 * Strips per-tournament data (players, dealerIndex, tables, leagueId)
 * so only structural settings (blinds, buy-in, payout, rebuy, etc.) remain.
 */
export function extractLeagueConfig(config: TournamentConfig): Partial<TournamentConfig> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { players: _p, dealerIndex: _d, tables: _t, leagueId: _l, ...leagueConfig } = config;
  return leagueConfig;
}

// ---------------------------------------------------------------------------
// League Export / Import
// ---------------------------------------------------------------------------

export interface LeagueExport {
  version: 1 | 2;
  league: League;
  results: TournamentResult[];
  gameDays?: GameDay[] | undefined;
  exportedAt: string;
}

/** Export a league and all its data as a JSON string. */
export function exportLeagueToJSON(league: League): string {
  const history = loadTournamentHistory();
  const results = history.filter((r) => r.leagueId === league.id);
  const gameDays = loadGameDaysForLeague(league.id);
  const payload: LeagueExport = {
    version: 2,
    league,
    results,
    gameDays: gameDays.length > 0 ? gameDays : undefined,
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(payload, null, 2);
}

/** Parse a JSON string into a LeagueExport, or null if invalid. */
export function parseLeagueFile(json: string): LeagueExport | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.league || typeof parsed.league.id !== 'string' || typeof parsed.league.name !== 'string') return null;
    if (!Array.isArray(parsed.results)) return null;
    // Normalize defaultConfig if present (backward compat)
    if (parsed.league.defaultConfig && typeof parsed.league.defaultConfig === 'object') {
      const normalized = parseConfigObject(parsed.league.defaultConfig as Record<string, unknown>);
      if (normalized) {
        parsed.league.defaultConfig = extractLeagueConfig(normalized);
      } else {
        delete parsed.league.defaultConfig;
      }
    }
    // Backward compat: v1 files have no gameDays field
    if (!parsed.gameDays) parsed.gameDays = [];
    return parsed as LeagueExport;
  } catch {
    return null;
  }
}

/** Import a league from exported data. Generates new IDs to avoid collisions. */
export function importLeague(data: LeagueExport): League {
  // Generate new ID to avoid collisions
  const newLeagueId = `league_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const league: League = {
    ...data.league,
    id: newLeagueId,
  };
  saveLeague(league);

  // Import linked tournament results with updated leagueId and new IDs
  for (const result of data.results) {
    saveTournamentResult({
      ...result,
      id: `result_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      leagueId: newLeagueId,
    });
  }

  // v2: Import game days with updated leagueId and cleared orphaned registeredPlayerId
  if (data.gameDays && data.gameDays.length > 0) {
    for (const gd of data.gameDays) {
      saveGameDay({
        ...gd,
        id: `gd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        leagueId: newLeagueId,
        participants: gd.participants?.map(p => ({
          ...p,
          registeredPlayerId: undefined,
        })),
      });
    }
  }

  return league;
}
