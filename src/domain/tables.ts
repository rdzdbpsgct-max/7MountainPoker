import type { Table, TableMove, Player, Seat, MultiTableConfig } from './types';
import { generateId } from './helpers';

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

/** Create default MultiTableConfig */
export function defaultMultiTableConfig(): MultiTableConfig {
  return {
    enabled: false,
    seatsPerTable: 10,
    dissolveThreshold: 3,
    autoBalanceOnElimination: true,
  };
}

// ---------------------------------------------------------------------------
// Table CRUD
// ---------------------------------------------------------------------------

/** Create a table with empty seats */
export function createTable(name: string, maxSeats: number = 10): Table {
  const seats: Seat[] = Array.from({ length: maxSeats }, (_, i) => ({
    seatNumber: i + 1,
    playerId: null,
  }));
  return {
    id: generateId(),
    name,
    maxSeats,
    seats,
    status: 'active',
    dealerSeat: null,
  };
}

// ---------------------------------------------------------------------------
// Seat helpers
// ---------------------------------------------------------------------------

/** Get all player IDs from a table's seats (non-null only) */
export function getTablePlayerIds(table: Table): string[] {
  return table.seats.filter(s => s.playerId !== null).map(s => s.playerId!);
}

/** Get active player IDs at a table */
export function getActivePlayerIdsAtTable(table: Table, players: Player[]): string[] {
  const activeIds = new Set(players.filter(p => p.status === 'active').map(p => p.id));
  return table.seats.filter(s => s.playerId !== null && activeIds.has(s.playerId)).map(s => s.playerId!);
}

/** Count active players at a table */
export function countActivePlayersAtTable(table: Table, players: Player[]): number {
  return getActivePlayerIdsAtTable(table, players).length;
}

/** Find the lowest-numbered empty and unlocked seat at a table. Returns null if table is full. */
export function findLowestAvailableSeat(table: Table): number | null {
  for (const seat of table.seats) {
    if (seat.playerId === null && !seat.locked) return seat.seatNumber;
  }
  return null;
}

/** Find the highest-numbered seat occupied by an active player. Returns null if none. */
export function findHighestOccupiedSeat(table: Table, players: Player[]): Seat | null {
  const activeIds = new Set(players.filter(p => p.status === 'active').map(p => p.id));
  for (let i = table.seats.length - 1; i >= 0; i--) {
    const seat = table.seats[i]!;
    if (seat.playerId !== null && activeIds.has(seat.playerId)) {
      return seat;
    }
  }
  return null;
}

/** Find which table + seat a player is at */
export function findPlayerSeat(tables: Table[], playerId: string): { table: Table; seat: Seat } | null {
  for (const table of tables) {
    for (const seat of table.seats) {
      if (seat.playerId === playerId) {
        return { table, seat };
      }
    }
  }
  return null;
}

/** Toggle the locked state of a seat at a table. Only empty seats can be locked. */
export function toggleSeatLock(tables: Table[], tableId: string, seatNumber: number): Table[] {
  return tables.map(t => {
    if (t.id !== tableId) return t;
    return {
      ...t,
      seats: t.seats.map(s => {
        if (s.seatNumber !== seatNumber) return s;
        // Only toggle lock on empty seats
        if (s.playerId !== null) return s;
        return { ...s, locked: !s.locked };
      }),
    };
  });
}

// ---------------------------------------------------------------------------
// Player distribution
// ---------------------------------------------------------------------------

/**
 * Round-robin distribute players across tables with seat assignment.
 * P1→T1S1, P2→T2S1, P3→T3S1, P4→T1S2, ...
 * Only distributes to 'active' tables. Clears all seats first.
 */
export function distributePlayersToTables(playerIds: string[], tables: Table[]): Table[] {
  const activeTables = tables.filter(t => t.status === 'active');
  if (activeTables.length === 0) return tables;

  // Clear all non-locked seats on active tables
  const updated = tables.map(t => {
    if (t.status !== 'active') return t;
    return {
      ...t,
      seats: t.seats.map(s => s.locked ? s : { ...s, playerId: null }),
    };
  });

  // Build index map for active tables in the updated array
  const activeUpdated = updated.filter(t => t.status === 'active');

  // Round-robin: player i goes to table (i % tableCount), at lowest available seat
  let playerIdx = 0;
  let tableIdx = 0;
  while (playerIdx < playerIds.length) {
    const table = activeUpdated[tableIdx % activeUpdated.length]!;
    const seatNum = findLowestAvailableSeat(table);
    if (seatNum !== null) {
      const seatIdx = table.seats.findIndex(s => s.seatNumber === seatNum);
      if (seatIdx >= 0) {
        table.seats[seatIdx] = { ...table.seats[seatIdx]!, playerId: playerIds[playerIdx]! };
        playerIdx++;
      }
    }
    tableIdx++;
    // Safety: stop if we've cycled through all tables without placing anyone
    if (tableIdx > playerIds.length * activeUpdated.length) break;
  }

  // Warn if some players could not be seated (all seats full or locked)
  if (playerIdx < playerIds.length) {
    const skipped = playerIds.slice(playerIdx);
    console.warn(`[tables] distributePlayersToTables: ${skipped.length} player(s) could not be seated (all seats full or locked):`, skipped);
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Active player counts
// ---------------------------------------------------------------------------

/** Get active player count per table (only 'active' tables) */
export function getActivePlayersPerTable(tables: Table[], players: Player[]): Map<string, number> {
  const activeIds = new Set(players.filter(p => p.status === 'active').map(p => p.id));
  const result = new Map<string, number>();
  for (const table of tables) {
    if (table.status !== 'active') continue;
    const count = table.seats.filter(s => s.playerId !== null && activeIds.has(s.playerId)).length;
    result.set(table.id, count);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Player removal (on elimination)
// ---------------------------------------------------------------------------

/** Remove a player from their seat. The seat becomes empty (not removed). */
export function removePlayerFromTable(tables: Table[], playerId: string): Table[] {
  return tables.map(t => ({
    ...t,
    seats: t.seats.map(s =>
      s.playerId === playerId ? { ...s, playerId: null } : s,
    ),
  }));
}

// ---------------------------------------------------------------------------
// Seat a single player (late registration, reinstate)
// ---------------------------------------------------------------------------

/**
 * Seat a player at the active table with fewest active players, at the lowest available seat.
 * Returns null if no seat available.
 */
export function seatPlayerAtSmallestTable(
  tables: Table[],
  players: Player[],
  playerId: string,
): { tables: Table[]; tableId: string; seatNumber: number } | null {
  const activeTables = tables.filter(t => t.status === 'active');
  if (activeTables.length === 0) return null;

  const activeIds = new Set(players.filter(p => p.status === 'active').map(p => p.id));

  // Find table with fewest active players that has an available (empty + unlocked) seat
  let bestTable: Table | null = null;
  let bestSeatNumber: number | null = null;
  let bestCount = Infinity;
  for (const table of activeTables) {
    const availableSeat = findLowestAvailableSeat(table);
    if (availableSeat === null) continue;

    const count = table.seats.filter(s => s.playerId !== null && activeIds.has(s.playerId)).length;
    if (count < bestCount) {
      bestCount = count;
      bestTable = table;
      bestSeatNumber = availableSeat;
    }
  }

  if (!bestTable || bestSeatNumber === null) return null;

  const targetTableId = bestTable.id;
  const updated = tables.map(t => {
    if (t.id !== targetTableId) return t;
    return {
      ...t,
      seats: t.seats.map(s =>
        s.seatNumber === bestSeatNumber ? { ...s, playerId } : s,
      ),
    };
  });

  return { tables: updated, tableId: targetTableId, seatNumber: bestSeatNumber };
}

// ---------------------------------------------------------------------------
// Table lookup
// ---------------------------------------------------------------------------

/** Find which table a player is at (returns the table, or undefined) */
export function findPlayerTable(tables: Table[], playerId: string): Table | undefined {
  return tables.find(t => t.seats.some(s => s.playerId === playerId));
}

// ---------------------------------------------------------------------------
// Table balancing
// ---------------------------------------------------------------------------

/**
 * Balance tables so max active player difference is <= 1.
 * Move highest-seat from largest table → lowest-seat at smallest table.
 * Only considers 'active' tables.
 */
export function balanceTables(tables: Table[], players: Player[]): { tables: Table[]; moves: TableMove[] } {
  const moves: TableMove[] = [];
  const updated = tables.map(t => ({
    ...t,
    seats: t.seats.map(s => ({ ...s })),
  }));
  const activeIds = new Set(players.filter(p => p.status === 'active').map(p => p.id));
  const playerMap = new Map(players.map(p => [p.id, p]));

  let maxIterations = 50;
  while (maxIterations-- > 0) {
    // Count active players per active table
    const counts = updated
      .filter(t => t.status === 'active')
      .map(t => ({
        table: t,
        active: t.seats.filter(s => s.playerId !== null && activeIds.has(s.playerId)).length,
      }));

    if (counts.length < 2) break;

    counts.sort((a, b) => b.active - a.active); // desc
    const max = counts[0]!.active;
    const min = counts[counts.length - 1]!.active;

    if (max - min <= 1) break; // balanced

    const fromTable = counts[0]!.table;
    const toTable = counts[counts.length - 1]!.table;

    // Find highest occupied seat by active player at source
    const sourceSeat = findHighestOccupiedSeatInTable(fromTable, activeIds);
    if (!sourceSeat || !sourceSeat.playerId) break;

    // Find lowest available seat at target
    const targetSeatNum = findLowestAvailableSeat(toTable);
    if (targetSeatNum === null) break;

    const movedId = sourceSeat.playerId;
    const movedPlayer = playerMap.get(movedId);

    // Remove from source seat
    const fromSeatIdx = fromTable.seats.findIndex(s => s.seatNumber === sourceSeat.seatNumber);
    if (fromSeatIdx >= 0) fromTable.seats[fromSeatIdx] = { ...fromTable.seats[fromSeatIdx]!, playerId: null };

    // Place at target seat
    const toSeatIdx = toTable.seats.findIndex(s => s.seatNumber === targetSeatNum);
    if (toSeatIdx >= 0) toTable.seats[toSeatIdx] = { ...toTable.seats[toSeatIdx]!, playerId: movedId };

    moves.push({
      playerId: movedId,
      playerName: movedPlayer?.name ?? 'Unknown',
      fromTableId: fromTable.id,
      fromTableName: fromTable.name,
      fromSeat: sourceSeat.seatNumber,
      toTableId: toTable.id,
      toTableName: toTable.name,
      toSeat: targetSeatNum,
      reason: 'balance',
      timestamp: Date.now(),
    });
  }

  if (maxIterations <= 0) {
    console.warn('[tables] balanceTables: reached 50-iteration limit, tables may not be fully balanced');
  }

  return { tables: updated, moves };
}

/** Internal helper — find highest occupied seat by an active player ID in a set */
function findHighestOccupiedSeatInTable(table: Table, activeIds: Set<string>): Seat | null {
  for (let i = table.seats.length - 1; i >= 0; i--) {
    const seat = table.seats[i]!;
    if (seat.playerId !== null && activeIds.has(seat.playerId)) {
      return seat;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Table dissolution
// ---------------------------------------------------------------------------

/** Check if any active table should be dissolved (active count <= threshold).
 *  Requires at least 2 active tables (don't dissolve the last one). */
export function findTableToDissolve(
  tables: Table[],
  players: Player[],
  threshold: number,
): Table | null {
  const activeTables = tables.filter(t => t.status === 'active');
  if (activeTables.length < 2) return null;

  const activeIds = new Set(players.filter(p => p.status === 'active').map(p => p.id));

  for (const table of activeTables) {
    const count = table.seats.filter(s => s.playerId !== null && activeIds.has(s.playerId)).length;
    if (count <= threshold && count > 0) {
      return table;
    }
  }
  return null;
}

/**
 * Dissolve a table: distribute its active players round-robin to remaining active tables.
 * Mark dissolved table status = 'dissolved'. Clear seats on dissolved table.
 */
export function dissolveTable(
  tables: Table[],
  players: Player[],
  tableId: string,
): { tables: Table[]; moves: TableMove[]; skipped: string[] } {
  const moves: TableMove[] = [];
  const skipped: string[] = [];
  const updated = tables.map(t => ({
    ...t,
    seats: t.seats.map(s => ({ ...s })),
  }));

  const dissolvedTable = updated.find(t => t.id === tableId);
  if (!dissolvedTable) return { tables: updated, moves, skipped };

  const activeIds = new Set(players.filter(p => p.status === 'active').map(p => p.id));
  const playerMap = new Map(players.map(p => [p.id, p]));

  // Get active players at the dissolving table (ordered by seat number)
  const playersToMove = dissolvedTable.seats
    .filter(s => s.playerId !== null && activeIds.has(s.playerId!))
    .map(s => ({ playerId: s.playerId!, seatNumber: s.seatNumber }));

  // Get remaining active tables (excluding the one being dissolved)
  const remainingTables = updated.filter(t => t.status === 'active' && t.id !== tableId);
  if (remainingTables.length === 0) return { tables: updated, moves, skipped };

  // Round-robin distribute players to remaining tables
  for (let i = 0; i < playersToMove.length; i++) {
    const { playerId, seatNumber: fromSeat } = playersToMove[i]!;
    const targetTable = remainingTables[i % remainingTables.length]!;
    const targetSeatNum = findLowestAvailableSeat(targetTable);
    if (targetSeatNum === null) {
      // No seat available — track skipped player
      skipped.push(playerId);
      console.warn(`[tables] dissolveTable: player ${playerId} could not be seated (all target tables full)`);
      continue;
    }

    // Seat at target
    const seatIdx = targetTable.seats.findIndex(s => s.seatNumber === targetSeatNum);
    if (seatIdx >= 0) targetTable.seats[seatIdx] = { ...targetTable.seats[seatIdx]!, playerId };

    const movedPlayer = playerMap.get(playerId);
    moves.push({
      playerId,
      playerName: movedPlayer?.name ?? 'Unknown',
      fromTableId: dissolvedTable.id,
      fromTableName: dissolvedTable.name,
      fromSeat,
      toTableId: targetTable.id,
      toTableName: targetTable.name,
      toSeat: targetSeatNum,
      reason: 'dissolution',
      timestamp: Date.now(),
    });
  }

  // Mark table as dissolved and clear seats
  dissolvedTable.status = 'dissolved';
  dissolvedTable.seats = dissolvedTable.seats.map(s => ({ ...s, playerId: null }));
  dissolvedTable.dealerSeat = null;

  return { tables: updated, moves, skipped };
}

// ---------------------------------------------------------------------------
// Final Table
// ---------------------------------------------------------------------------

/**
 * Check if remaining active players can fit at a single table.
 * Only considers 'active' tables.
 */
export function shouldMergeToFinalTable(tables: Table[], players: Player[]): boolean {
  const activeTables = tables.filter(t => t.status === 'active');
  if (activeTables.length <= 1) return false;
  const activePlayers = players.filter(p => p.status === 'active').length;
  const maxSeats = Math.max(...activeTables.map(t => t.maxSeats));
  return activePlayers <= maxSeats;
}

/**
 * Merge all active players to the first active table (Final Table).
 * All other tables become 'dissolved'. Returns moves for all re-seated players.
 */
export function mergeToFinalTable(
  tables: Table[],
  players: Player[],
): { tables: Table[]; moves: TableMove[]; unseated: string[] } {
  const moves: TableMove[] = [];
  const unseated: string[] = [];
  const updated = tables.map(t => ({
    ...t,
    seats: t.seats.map(s => ({ ...s })),
  }));

  const activeTables = updated.filter(t => t.status === 'active');
  if (activeTables.length <= 1) return { tables: updated, moves, unseated };

  const finalTable = activeTables[0]!;
  const activeIds = new Set(players.filter(p => p.status === 'active').map(p => p.id));
  const playerMap = new Map(players.map(p => [p.id, p]));

  // Collect all active players from all active tables (with source info)
  const allPlayers: { playerId: string; fromTable: Table; fromSeat: number }[] = [];
  for (const table of activeTables) {
    for (const seat of table.seats) {
      if (seat.playerId !== null && activeIds.has(seat.playerId)) {
        allPlayers.push({
          playerId: seat.playerId,
          fromTable: table,
          fromSeat: seat.seatNumber,
        });
      }
    }
  }

  // Clear final table seats first
  finalTable.seats = finalTable.seats.map(s => ({ ...s, playerId: null }));
  finalTable.name = 'Final Table';

  // Seat at final table sequentially
  let seatIdx = 0;
  for (const { playerId, fromTable, fromSeat } of allPlayers) {
    if (seatIdx >= finalTable.seats.length) {
      // No more seats — track unseated player
      unseated.push(playerId);
      console.warn(`[tables] mergeToFinalTable: player ${playerId} could not be seated at Final Table (capacity exceeded)`);
      continue;
    }
    finalTable.seats[seatIdx] = { ...finalTable.seats[seatIdx]!, playerId };

    // Only create move if player was NOT already at the final table
    if (fromTable.id !== finalTable.id) {
      moves.push({
        playerId,
        playerName: playerMap.get(playerId)?.name ?? 'Unknown',
        fromTableId: fromTable.id,
        fromTableName: fromTable.name,
        fromSeat,
        toTableId: finalTable.id,
        toTableName: 'Final Table',
        toSeat: finalTable.seats[seatIdx]!.seatNumber,
        reason: 'final-table',
        timestamp: Date.now(),
      });
    }
    seatIdx++;
  }

  // Dissolve all other active tables
  for (const table of activeTables) {
    if (table.id === finalTable.id) continue;
    table.status = 'dissolved';
    table.seats = table.seats.map(s => ({ ...s, playerId: null }));
    table.dealerSeat = null;
  }

  return { tables: updated, moves, unseated };
}

// ---------------------------------------------------------------------------
// Resize a table (change maxSeats safely)
// ---------------------------------------------------------------------------

/**
 * Resize a table's seat count. When growing, appends new empty seats.
 * When shrinking, removes seats from the end — but only if those seats are
 * empty and unlocked. If any seat that would be removed is occupied or locked,
 * the table is returned unchanged and `warning` is set.
 */
export function resizeTable(
  tables: Table[],
  tableId: string,
  newMaxSeats: number,
): { tables: Table[]; warning?: string } {
  const table = tables.find(t => t.id === tableId);
  if (!table) return { tables };

  const currentMax = table.maxSeats;

  if (newMaxSeats === currentMax) return { tables };

  if (newMaxSeats > currentMax) {
    // Growing: append empty seats
    const newSeats: Seat[] = [...table.seats];
    for (let i = currentMax + 1; i <= newMaxSeats; i++) {
      newSeats.push({ seatNumber: i, playerId: null });
    }
    return {
      tables: tables.map(t =>
        t.id === tableId ? { ...t, maxSeats: newMaxSeats, seats: newSeats } : t,
      ),
    };
  }

  // Shrinking: check if seats to be removed are all empty and unlocked
  const seatsToRemove = table.seats.slice(newMaxSeats);
  const hasOccupied = seatsToRemove.some(s => s.playerId !== null);
  const hasLocked = seatsToRemove.some(s => s.locked);

  if (hasOccupied || hasLocked) {
    return { tables, warning: 'cannotResize' };
  }

  const trimmedSeats = table.seats.slice(0, newMaxSeats);
  return {
    tables: tables.map(t =>
      t.id === tableId ? { ...t, maxSeats: newMaxSeats, seats: trimmedSeats } : t,
    ),
  };
}

// ---------------------------------------------------------------------------
// Random seating (shuffle players to tables)
// ---------------------------------------------------------------------------

/**
 * Shuffle players randomly across tables using Fisher-Yates shuffle,
 * then distribute them via the existing round-robin distributePlayersToTables.
 */
export function shufflePlayersToTables(playerIds: string[], tables: Table[]): Table[] {
  // Fisher-Yates shuffle
  const shuffled = [...playerIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return distributePlayersToTables(shuffled, tables);
}

// ---------------------------------------------------------------------------
// Per-table dealer
// ---------------------------------------------------------------------------

/** Get the player who is the current dealer at a table, or undefined if no dealer set */
export function getTableDealer(table: Table, players: Player[]): Player | undefined {
  if (table.dealerSeat === null) return undefined;
  const seat = table.seats.find(s => s.seatNumber === table.dealerSeat);
  if (!seat || !seat.playerId) return undefined;
  return players.find(p => p.id === seat.playerId);
}

/** Advance dealer at a specific table — skip empty seats and eliminated players */
export function advanceTableDealer(table: Table, players: Player[]): Table {
  const activeIds = new Set(players.filter(p => p.status === 'active').map(p => p.id));
  const occupiedSeats = table.seats.filter(s => s.playerId !== null && activeIds.has(s.playerId));

  if (occupiedSeats.length === 0) {
    return { ...table, dealerSeat: null };
  }

  if (table.dealerSeat === null) {
    return { ...table, dealerSeat: occupiedSeats[0]!.seatNumber };
  }

  // Find next occupied seat after current dealer
  const currentIdx = occupiedSeats.findIndex(s => s.seatNumber === table.dealerSeat);
  const nextIdx = (currentIdx + 1) % occupiedSeats.length;
  return { ...table, dealerSeat: occupiedSeats[nextIdx]!.seatNumber };
}
