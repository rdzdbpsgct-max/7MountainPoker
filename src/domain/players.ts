import type { Player, RebuyConfig } from './types';
import { generatePlayerId } from './helpers';
import { t as moduleT } from '../i18n/translations';

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

/** Creates an array of new players with default names based on the current locale. */
export function defaultPlayers(count: number, t = moduleT): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: generatePlayerId(),
    name: t('logic.defaultPlayerName', { n: i + 1 }),
    rebuys: 0,
    addOn: false,
    status: 'active' as const,
    placement: null,
    eliminatedBy: null,
    knockouts: 0,
  }));
}

// ---------------------------------------------------------------------------
// Seating
// ---------------------------------------------------------------------------

/**
 * Swaps a player with their neighbour (direction -1 = up, +1 = down).
 * Returns the same array reference if the move is out of bounds.
 */
export function movePlayer(players: Player[], fromIndex: number, direction: -1 | 1): Player[] {
  const toIndex = fromIndex + direction;
  if (toIndex < 0 || toIndex >= players.length) return players;
  const result = [...players];
  [result[fromIndex], result[toIndex]] = [result[toIndex]!, result[fromIndex]!];
  return result;
}

/**
 * Fisher-Yates shuffle -- returns a new shuffled array plus a random dealer index.
 */
export function shufflePlayers(players: Player[]): { players: Player[]; dealerIndex: number } {
  const result = [...players];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  const dealerIndex = Math.floor(Math.random() * result.length);
  return { players: result, dealerIndex };
}

/**
 * Advances the dealer button to the next active player (skipping eliminated ones).
 */
export function advanceDealer(players: Player[], currentDealerIndex: number): number {
  const n = players.length;
  if (n === 0) return 0;
  for (let i = 1; i <= n; i++) {
    const candidate = (currentDealerIndex + i) % n;
    if (players[candidate]!.status === 'active') return candidate;
  }
  return currentDealerIndex;
}

// ---------------------------------------------------------------------------
// Re-Entry
// ---------------------------------------------------------------------------

/**
 * Check if a player can re-enter the tournament.
 * Requires: reEntryEnabled, player is eliminated, within max re-entries limit.
 */
export function canReEntry(player: Player, rebuy: RebuyConfig): boolean {
  if (!rebuy.reEntryEnabled) return false;
  if (player.status !== 'eliminated') return false;
  const count = player.reEntryCount ?? 0;
  if (rebuy.maxReEntries !== undefined && count >= rebuy.maxReEntries) return false;
  return true;
}

/**
 * Create a re-entry for an eliminated player.
 * Returns the updated players array with the eliminated player's re-entry count
 * incremented and a new active player added.
 */
export function reEnterPlayer(players: Player[], eliminatedPlayerId: string): Player[] {
  const eliminated = players.find((p) => p.id === eliminatedPlayerId);
  if (!eliminated || eliminated.status !== 'eliminated') return players;

  const originalId = eliminated.originalPlayerId ?? eliminated.id;
  const reEntryCount = (eliminated.reEntryCount ?? 0) + 1;

  const newPlayer: Player = {
    id: generatePlayerId(),
    name: eliminated.name,
    rebuys: 0,
    addOn: false,
    status: 'active',
    placement: null,
    eliminatedBy: null,
    knockouts: 0,
    reEntryCount,
    originalPlayerId: originalId,
  };

  // Mark old instance with updated reEntryCount, add new player
  const updated = players.map((p) =>
    p.id === eliminatedPlayerId ? { ...p, reEntryCount } : p,
  );
  return [...updated, newPlayer];
}

// ---------------------------------------------------------------------------
// Placement & Bubble
// ---------------------------------------------------------------------------

/** Returns the placement number for the next eliminated player (= count of active players). */
export function computeNextPlacement(players: Player[]): number {
  return players.filter((p) => p.status === 'active').length;
}

/** Returns true when exactly one more elimination would put remaining players in the money. */
export function isBubble(activePlayers: number, paidPlaces: number): boolean {
  if (paidPlaces <= 0 || activePlayers <= 1) return false;
  return activePlayers === paidPlaces + 1;
}

/** Returns true when all remaining active players are guaranteed a payout. */
export function isInTheMoney(activePlayers: number, paidPlaces: number): boolean {
  if (paidPlaces <= 0 || activePlayers <= 1) return false;
  return activePlayers <= paidPlaces;
}

// ---------------------------------------------------------------------------
// Average stack
// ---------------------------------------------------------------------------

/** Computes the average chip stack per active player based on total chips in play.
 * Each player entry (including re-entries) contributed a starting stack buy-in.
 * Eliminated players' chips are redistributed to active players, so total chips = all buy-ins + rebuys + add-ons. */
export function computeAverageStack(
  players: Player[],
  startingChips: number,
  rebuyChips: number,
  addOnChips: number,
): number {
  const activePlayers = players.filter((p) => p.status === 'active').length;
  if (activePlayers === 0) return 0;
  const safeStarting = startingChips || 0;
  const safeRebuy = rebuyChips || 0;
  const safeAddOn = addOnChips || 0;
  const totalRebuys = players.reduce((sum, p) => sum + (p.rebuys || 0), 0);
  const totalAddOns = players.filter((p) => p.addOn).length;
  const totalChips =
    players.length * safeStarting +
    totalRebuys * safeRebuy +
    totalAddOns * safeAddOn;
  return Math.round(totalChips / activePlayers);
}

/** Converts an average chip stack to big blind units (e.g. 15000 / 200 = 75.0 BB). */
export function computeAverageStackInBB(averageStack: number, currentBigBlind: number): number {
  if (currentBigBlind <= 0) return 0;
  return Math.round((averageStack / currentBigBlind) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Per-player stack tracking
// ---------------------------------------------------------------------------

/** Sets each player's chip count based on starting chips plus rebuys and add-ons. */
export function initializePlayerStacks(
  players: Player[],
  startingChips: number,
  rebuyChips: number,
  addOnChips: number,
): Player[] {
  const safeStarting = startingChips || 0;
  const safeRebuy = rebuyChips || 0;
  const safeAddOn = addOnChips || 0;
  return players.map((p) => ({
    ...p,
    chips: p.status === 'active'
      ? safeStarting + (p.rebuys || 0) * safeRebuy + (p.addOn ? safeAddOn : 0)
      : 0,
  }));
}

/** Returns the player ID of the active player with the most chips, or null if no stacks are tracked. */
export function findChipLeader(players: Player[]): string | null {
  const withChips = players.filter((p) => p.status === 'active' && p.chips !== undefined && p.chips > 0);
  if (withChips.length === 0) return null;
  return withChips.reduce((leader, p) => (p.chips! > (leader.chips ?? 0) ? p : leader)).id;
}

/** Computes the average stack from individually tracked player chips. Returns null if no stacks are tracked. */
export function computeAverageStackFromPlayers(players: Player[]): number | null {
  const active = players.filter((p) => p.status === 'active');
  if (active.length === 0) return null;
  const tracked = active.filter((p) => p.chips !== undefined);
  if (tracked.length === 0) return null;
  const total = tracked.reduce((sum, p) => sum + (p.chips ?? 0), 0);
  return Math.round(total / tracked.length);
}

export function addRebuyToStack(player: Player, rebuyChips: number): Player {
  if (player.chips === undefined) return player;
  return { ...player, chips: player.chips + (rebuyChips || 0) };
}

export function addAddOnToStack(player: Player, addOnChips: number): Player {
  if (player.chips === undefined) return player;
  return { ...player, chips: player.chips + (addOnChips || 0) };
}
