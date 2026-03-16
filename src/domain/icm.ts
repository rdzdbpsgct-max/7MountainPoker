// Independent Chip Model (ICM) — Malmuth-Harville equity calculation.
// Computes each player's tournament equity based on chip stacks and payout structure.

/**
 * Compute ICM equity for each player using the Malmuth-Harville model.
 *
 * @param stacks — chip count per player (must be > 0 for active players; 0 = eliminated)
 * @param payouts — prize amounts for 1st, 2nd, 3rd, ... (descending; can be fewer than players)
 * @returns equity in $ per player (same order as `stacks`), summing to total payouts
 *
 * For N ≤ 10 active players, uses exact recursive computation.
 * For N > 10, uses Monte Carlo approximation (10,000 simulations).
 */
export function computeIcmEquity(stacks: number[], payouts: number[]): number[] {
  if (stacks.length === 0 || payouts.length === 0) return stacks.map(() => 0);

  const activeIndices = stacks.map((s, i) => ({ s, i })).filter(({ s }) => s > 0);
  if (activeIndices.length === 0) return stacks.map(() => 0);

  // Single player gets all payouts combined (shouldn't happen in practice)
  if (activeIndices.length === 1) {
    const result = stacks.map(() => 0);
    result[activeIndices[0].i] = payouts.reduce((a, b) => a + b, 0);
    return result;
  }

  const activeStacks = activeIndices.map(({ s }) => s);
  const totalChips = activeStacks.reduce((a, b) => a + b, 0);

  let activeEquities: number[];
  if (activeIndices.length <= 10) {
    activeEquities = exactIcm(activeStacks, payouts, totalChips);
  } else {
    activeEquities = monteCarloIcm(activeStacks, payouts, totalChips, 10_000);
  }

  // Map back to original indices
  const result = stacks.map(() => 0);
  activeIndices.forEach(({ i }, ai) => {
    result[i] = activeEquities[ai];
  });
  return result;
}

/**
 * Exact Malmuth-Harville ICM via recursive probability computation.
 * For each place, probability = chips / remaining_chips, then recurse without that player.
 */
function exactIcm(stacks: number[], payouts: number[], totalChips: number): number[] {
  const n = stacks.length;
  const equities = new Array<number>(n).fill(0);

  // Recursive helper: compute equity contribution from placing at position `place`
  // `remaining` is a bitmask of players still in contention
  function recurse(place: number, remaining: number, probability: number, remainingChips: number): void {
    if (place >= payouts.length || probability < 1e-12) return;

    for (let i = 0; i < n; i++) {
      if (!(remaining & (1 << i))) continue;
      const p = (stacks[i] / remainingChips) * probability;
      equities[i] += p * payouts[place];
      recurse(place + 1, remaining & ~(1 << i), p, remainingChips - stacks[i]);
    }
  }

  const allMask = (1 << n) - 1;
  recurse(0, allMask, 1.0, totalChips);
  return equities;
}

/**
 * Monte Carlo ICM approximation for large player counts.
 * Simulates tournament finish order based on weighted random elimination.
 */
function monteCarloIcm(stacks: number[], payouts: number[], totalChips: number, simulations: number): number[] {
  const n = stacks.length;
  const equities = new Array<number>(n).fill(0);

  for (let sim = 0; sim < simulations; sim++) {
    // Simulate a finish order: pick players proportional to chip count
    const remaining = new Set<number>();
    for (let i = 0; i < n; i++) remaining.add(i);
    let remChips = totalChips;
    const finishOrder: number[] = [];

    while (remaining.size > 0 && finishOrder.length < payouts.length) {
      // Weighted random selection (winner of this "round")
      let roll = Math.random() * remChips;
      let winner = -1;
      for (const idx of remaining) {
        roll -= stacks[idx];
        if (roll <= 0) {
          winner = idx;
          break;
        }
      }
      if (winner === -1) winner = [...remaining][remaining.size - 1]; // fallback
      finishOrder.push(winner);
      remaining.delete(winner);
      remChips -= stacks[winner];
    }

    // Assign payouts based on finish order
    for (let place = 0; place < finishOrder.length && place < payouts.length; place++) {
      equities[finishOrder[place]] += payouts[place];
    }
  }

  // Average over simulations
  return equities.map((e) => e / simulations);
}

/**
 * Compute ICM deal: what each player "should" receive if the tournament ends now.
 * Returns equity as percentage of total prizepool and absolute $ amounts.
 */
export interface IcmResult {
  playerIndex: number;
  stack: number;
  stackPercent: number;
  equity: number;
  equityPercent: number;
}

export function computeIcmDeal(
  stacks: number[],
  payouts: number[],
): IcmResult[] {
  const totalChips = stacks.reduce((a, b) => a + b, 0);
  const totalPrize = payouts.reduce((a, b) => a + b, 0);
  const equities = computeIcmEquity(stacks, payouts);

  return stacks.map((stack, i) => ({
    playerIndex: i,
    stack,
    stackPercent: totalChips > 0 ? (stack / totalChips) * 100 : 0,
    equity: equities[i],
    equityPercent: totalPrize > 0 ? (equities[i] / totalPrize) * 100 : 0,
  }));
}
