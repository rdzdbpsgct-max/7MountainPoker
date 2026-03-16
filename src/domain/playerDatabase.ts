import type { RegisteredPlayer } from './types';
import { getCached, setCached, setCachedItem, deleteCachedItem } from './storage';

// ---------------------------------------------------------------------------
// Persistent Player Database (backed by IndexedDB cache layer)
// ---------------------------------------------------------------------------

/** Load all registered players from storage cache. */
export function loadPlayerDatabase(): RegisteredPlayer[] {
  return getCached('players');
}

/** Replace the entire player database in storage. */
export function savePlayerDatabase(players: RegisteredPlayer[]): void {
  setCached('players', players);
}

/** Add or update a registered player by name (case-insensitive dedup). */
export function addRegisteredPlayer(name: string): RegisteredPlayer {
  const db = loadPlayerDatabase();
  const normalized = name.trim();
  // Check for duplicate (case-insensitive)
  const existingIndex = db.findIndex((p) => p.name.toLowerCase() === normalized.toLowerCase());
  if (existingIndex !== -1) {
    const updated: RegisteredPlayer = { ...db[existingIndex]!, lastPlayedAt: new Date().toISOString() };
    const updatedDb = [...db];
    updatedDb[existingIndex] = updated;
    setCached('players', updatedDb);
    return updated;
  }
  const player: RegisteredPlayer = {
    id: `rp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: normalized,
    createdAt: new Date().toISOString(),
    lastPlayedAt: new Date().toISOString(),
  };
  setCachedItem('players', player);
  return player;
}

/** Delete a registered player by id. */
export function deleteRegisteredPlayer(id: string): void {
  deleteCachedItem('players', id);
}

/**
 * Sync player names from a finished tournament into the player database.
 * Updates lastPlayedAt for existing players, adds new ones.
 */
export function syncPlayersToDatabase(playerNames: string[]): void {
  const db = loadPlayerDatabase();
  const nameMap = new Map(db.map((p) => [p.name.toLowerCase(), p]));
  const now = new Date().toISOString();
  let changed = false;

  for (const name of playerNames) {
    const normalized = name.trim();
    if (!normalized) continue;
    const existing = nameMap.get(normalized.toLowerCase());
    if (existing) {
      existing.lastPlayedAt = now;
      changed = true;
    } else {
      const player: RegisteredPlayer = {
        id: `rp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: normalized,
        createdAt: now,
        lastPlayedAt: now,
      };
      db.push(player);
      nameMap.set(normalized.toLowerCase(), player);
      changed = true;
    }
  }

  if (changed) savePlayerDatabase(db);
}
