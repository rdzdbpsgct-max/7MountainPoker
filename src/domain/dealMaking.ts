// ---------------------------------------------------------------------------
// dealMaking.ts — Deal / Chop Calculator
// ---------------------------------------------------------------------------
//
// Three deal-making methods for splitting a prize pool among remaining players.
// Pure functions, no React dependencies.
// ---------------------------------------------------------------------------

import { computeIcmEquity } from './icm';

export interface DealShare {
  playerIndex: number;
  amount: number;
}

/**
 * Even Chop — split the remaining prize pool equally among all players.
 */
export function computeEvenChop(playerCount: number, prizePool: number): DealShare[] {
  if (playerCount <= 0) return [];
  const share = Math.round((prizePool / playerCount) * 100) / 100;
  return Array.from({ length: playerCount }, (_, i) => ({
    playerIndex: i,
    amount: share,
  }));
}

/**
 * Chip Chop — split proportionally to chip stacks.
 */
export function computeChipChop(stacks: number[], prizePool: number): DealShare[] {
  const totalChips = stacks.reduce((a, b) => a + b, 0);
  if (totalChips <= 0) return stacks.map((_, i) => ({ playerIndex: i, amount: 0 }));
  return stacks.map((stack, i) => ({
    playerIndex: i,
    amount: Math.round((stack / totalChips) * prizePool * 100) / 100,
  }));
}

/**
 * ICM Chop — split based on ICM equity (Malmuth-Harville model).
 * Uses the existing computeIcmEquity engine.
 */
export async function computeIcmChop(
  stacks: number[],
  payouts: number[],
): Promise<DealShare[]> {
  const equities = await computeIcmEquity(stacks, payouts);
  return equities.map((equity, i) => ({
    playerIndex: i,
    amount: Math.round(equity * 100) / 100,
  }));
}
