import type { TournamentResult } from './types';
import { loadPlayerDatabase, savePlayerDatabase, syncPlayersToDatabase } from './playerDatabase';
import { getCached, setCached, deleteCachedItem, MAX_HISTORY_ENTRIES } from './storage';

// ---------------------------------------------------------------------------
// Tournament History (backed by IndexedDB cache layer)
// ---------------------------------------------------------------------------

export const MAX_HISTORY = MAX_HISTORY_ENTRIES;

/** Save a tournament result to history (prepend, trim to MAX_HISTORY). Returns true if oldest entries were trimmed. */
export function saveTournamentResult(result: TournamentResult): boolean {
  const history = [...getCached('history')];
  history.unshift(result);
  const trimmed = history.length > MAX_HISTORY;
  if (trimmed) history.length = MAX_HISTORY;
  setCached('history', history);

  // Auto-save player names to persistent database
  syncPlayersToDatabase(result.players.map((p) => p.name));
  return trimmed;
}

/** Save multiple tournament results to history in a single batch (prepend, trim to MAX_HISTORY). */
export function saveTournamentResults(results: TournamentResult[]): void {
  const history = [...getCached('history')];
  history.unshift(...results);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  setCached('history', history);
}

/** Load all tournament history from storage cache. */
export function loadTournamentHistory(): TournamentResult[] {
  return getCached('history');
}

/** Delete a single tournament result by id. */
export function deleteTournamentResult(id: string): void {
  deleteCachedItem('history', id);
}

/** Clear all tournament history. */
export function clearTournamentHistory(): void {
  setCached('history', []);
}

/**
 * Import player names from tournament history into the player database.
 * Deduplicates by normalized (lowercased) name.
 */
export function importPlayersFromHistory(): number {
  const history = loadTournamentHistory();
  const db = loadPlayerDatabase();
  const existingNames = new Set(db.map((p) => p.name.toLowerCase()));
  let added = 0;
  const now = new Date().toISOString();

  for (const result of history) {
    for (const player of result.players) {
      const normalized = player.name.trim();
      if (!normalized) continue;
      if (existingNames.has(normalized.toLowerCase())) continue;
      existingNames.add(normalized.toLowerCase());
      db.push({
        id: `rp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${added}`,
        name: normalized,
        createdAt: now,
        lastPlayedAt: result.date,
      });
      added++;
    }
  }

  if (added > 0) savePlayerDatabase(db);
  return added;
}
