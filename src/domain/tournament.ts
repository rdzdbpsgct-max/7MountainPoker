import type {
  TournamentConfig,
  TournamentResult,
  TournamentEvent,
  PlayerResult,
  PayoutConfig,
  Player,
  PointSystem,
  LeagueStanding,
  League,
  SidePot,
  PlayerPotInput,
  PotResult,
  SidePotCalculationResult,
  PotWinnerAssignment,
  PlayerPayout,
  SidePotPayoutResult,
} from './types';
import { CURRENCY_SYMBOLS } from './types';
import { t as moduleT } from '../i18n/translations';

// ---------------------------------------------------------------------------
// Prize Pool & Payouts
// ---------------------------------------------------------------------------

/** Sum all rebuys across all players. */
export function computeTotalRebuys(players: Player[]): number {
  return players.reduce((sum, p) => sum + p.rebuys, 0);
}

/** Count how many players have taken an add-on. */
export function computeTotalAddOns(players: Player[]): number {
  return players.filter((p) => p.addOn).length;
}

/** Calculate the total prize pool from buy-ins, rebuys, and add-ons. Excludes rebuys when a separate rebuy pot is configured. */
export function computePrizePool(
  players: Player[], buyIn: number,
  rebuyCost?: number, addOnCost?: number,
  separateRebuyPot?: boolean,
): number {
  const totalRebuys = computeTotalRebuys(players);
  const totalAddOns = computeTotalAddOns(players);
  const costPerRebuy = rebuyCost ?? buyIn;
  const costPerAddOn = addOnCost ?? buyIn;
  const rebuyTotal = separateRebuyPot ? 0 : (totalRebuys * costPerRebuy);
  return (players.length * buyIn) + rebuyTotal + (totalAddOns * costPerAddOn);
}

/** Calculate the separate rebuy pot total (rebuys x cost per rebuy). */
export function computeRebuyPot(players: Player[], rebuyCost: number): number {
  return computeTotalRebuys(players) * rebuyCost;
}

/**
 * Compute side pots from a list of all-in stack sizes.
 * Classic side-pot algorithm: sort stacks ascending, each unique stack level
 * creates a pot where only players with at least that many chips are eligible.
 *
 * @param stacks Array of stack sizes for each player in the pot
 * @returns Array of SidePot objects (Main Pot first, then Side Pots)
 */
export function computeSidePots(stacks: number[]): SidePot[] {
  // Guard: filter out non-positive values (defensive — UI already prevents these)
  const validStacks = stacks.filter(s => s > 0);
  if (validStacks.length < 2) return [];

  // Sort ascending and work through unique levels
  const sorted = [...validStacks].sort((a, b) => a - b);
  const pots: SidePot[] = [];
  let previousLevel = 0;

  for (let i = 0; i < sorted.length; i++) {
    const currentStack = sorted[i];
    if (currentStack <= previousLevel) continue; // skip duplicate levels

    const contribution = currentStack - previousLevel;
    const eligiblePlayers = sorted.length - i;
    const amount = contribution * eligiblePlayers;

    pots.push({
      amount,
      eligiblePlayers,
      label: pots.length === 0 ? 'Main Pot' : `Side Pot ${pots.length}`,
    });

    previousLevel = currentStack;
  }

  return pots;
}

/**
 * Advanced side-pot calculator with player names, fold status, and warnings.
 *
 * Algorithm:
 * 1. Filter out players with invested <= 0
 * 2. Sort by invested amount ascending
 * 3. For each unique invested level, compute the contribution delta × number
 *    of players who invested at least that amount
 * 4. Eligible players for each pot level: active or all-in players whose
 *    invested amount >= that level (folded players contribute but cannot win)
 *
 * @param players Array of PlayerPotInput
 * @returns SidePotCalculationResult with pots, total, and warnings
 */
export function calculateSidePots(players: PlayerPotInput[]): SidePotCalculationResult {
  const warnings: string[] = [];

  // Validate inputs
  const contributing = players.filter((p) => p.invested > 0);
  const zeroPlayers = players.filter((p) => p.invested <= 0);
  if (zeroPlayers.length > 0) {
    warnings.push(moduleT('sidePot.warnZeroPlayers', { n: zeroPlayers.length }));
  }

  if (contributing.length < 2) {
    if (contributing.length === 1) {
      warnings.push(moduleT('sidePot.warnSinglePlayer'));
    }
    return { pots: [], total: 0, warnings };
  }

  // Sort by invested ascending (stable sort preserves insertion order for equals)
  const sorted = [...contributing].sort((a, b) => a.invested - b.invested);

  // Collect unique invested levels
  const uniqueLevels: number[] = [];
  for (const p of sorted) {
    if (uniqueLevels.length === 0 || uniqueLevels[uniqueLevels.length - 1] !== p.invested) {
      uniqueLevels.push(p.invested);
    }
  }

  const pots: PotResult[] = [];
  let previousLevel = 0;

  for (let levelIdx = 0; levelIdx < uniqueLevels.length; levelIdx++) {
    const currentLevel = uniqueLevels[levelIdx];
    const contribution = currentLevel - previousLevel;
    if (contribution <= 0) continue;

    // Every player with invested > previousLevel contributes to this pot layer
    const contributingToLayer = sorted.filter((p) => p.invested > previousLevel);
    const amount = contributingToLayer.reduce((sum, p) => {
      const playerContribution = Math.min(p.invested, currentLevel) - previousLevel;
      return sum + Math.max(0, playerContribution);
    }, 0);

    // Eligible: active or all-in players whose invested >= currentLevel
    const eligible = sorted.filter(
      (p) => p.status !== 'folded' && p.invested >= currentLevel,
    );

    pots.push({
      type: levelIdx === 0 ? 'main' : 'side',
      index: levelIdx,
      amount,
      eligiblePlayerIds: eligible.map((p) => p.id),
      eligiblePlayerNames: eligible.map((p) => p.name || p.id),
    });

    previousLevel = currentLevel;
  }

  // Handle remaining chips from players who invested more than the highest all-in
  // This is already covered by the unique levels

  const total = pots.reduce((sum, p) => sum + p.amount, 0);

  // Add helpful warnings
  const allEqual = uniqueLevels.length === 1;
  if (allEqual && pots.length === 1) {
    warnings.push(moduleT('sidePot.warnAllEqual'));
  }

  const allFolded = contributing.every((p) => p.status === 'folded');
  if (allFolded) {
    warnings.push(moduleT('sidePot.warnAllFolded'));
  }

  // Check for pots with zero eligible players
  for (const pot of pots) {
    if (pot.eligiblePlayerIds.length === 0) {
      const potLabel = pot.type === 'main' ? moduleT('sidePot.mainPot') : moduleT('sidePot.sidePot', { n: pot.index });
      warnings.push(moduleT('sidePot.warnPotNoEligible', { pot: potLabel }));
    }
  }

  return { pots, total, warnings };
}

/**
 * Resolve pot winners and compute payouts for each player.
 *
 * Rules:
 * - Each pot is awarded to its winner(s)
 * - Split pots divide the amount evenly; odd chips go to the first winner
 *   (standard poker convention: leftmost of dealer, approximated by array order)
 * - A player's net result = total payout − total invested
 *
 * @param players Original player inputs (for invested amounts and names)
 * @param pots Calculated pots from calculateSidePots()
 * @param winners Winner assignments per pot
 * @returns SidePotPayoutResult with per-player payouts and odd chip info
 */
export function resolvePotWinners(
  players: PlayerPotInput[],
  pots: PotResult[],
  winners: PotWinnerAssignment[],
): SidePotPayoutResult {
  // Build a quick lookup: potIndex → winnerIds
  const winnerMap = new Map<number, string[]>();
  for (const w of winners) {
    winnerMap.set(w.potIndex, w.winnerIds);
  }

  // Initialize per-player payout tracking
  const payoutMap = new Map<string, { payout: number; perPot: { potIndex: number; amount: number }[] }>();
  for (const p of players) {
    if (p.invested > 0) {
      payoutMap.set(p.id, { payout: 0, perPot: [] });
    }
  }

  const oddChips: SidePotPayoutResult['oddChips'] = [];

  for (const pot of pots) {
    const potWinners = winnerMap.get(pot.index);
    if (!potWinners || potWinners.length === 0) continue;

    // Filter to only winners who are actually eligible for this pot
    const validWinners = potWinners.filter((id) => pot.eligiblePlayerIds.includes(id));
    if (validWinners.length === 0) continue;

    if (validWinners.length === 1) {
      // Single winner takes full pot
      const entry = payoutMap.get(validWinners[0]);
      if (entry) {
        entry.payout += pot.amount;
        entry.perPot.push({ potIndex: pot.index, amount: pot.amount });
      }
    } else {
      // Split pot: divide evenly, odd chip to first winner
      const share = Math.floor(pot.amount / validWinners.length);
      const remainder = pot.amount - share * validWinners.length;

      for (let i = 0; i < validWinners.length; i++) {
        const amount = i === 0 ? share + remainder : share;
        const entry = payoutMap.get(validWinners[i]);
        if (entry) {
          entry.payout += amount;
          entry.perPot.push({ potIndex: pot.index, amount });
        }
      }

      if (remainder > 0) {
        oddChips.push({
          potIndex: pot.index,
          remainder,
          awardedTo: validWinners[0],
        });
      }
    }
  }

  // Build final payouts array
  const payouts: PlayerPayout[] = [];
  for (const p of players) {
    if (p.invested <= 0) continue;
    const entry = payoutMap.get(p.id);
    const payout = entry?.payout ?? 0;
    payouts.push({
      playerId: p.id,
      playerName: p.name || p.id,
      invested: p.invested,
      payout,
      net: payout - p.invested,
      perPot: entry?.perPot ?? [],
    });
  }

  const total = payouts.reduce((sum, p) => sum + p.payout, 0);

  return { payouts, oddChips, total };
}

/** Calculate payout amounts per place from a payout config and prize pool. Supports both percent and fixed modes. */
export function computePayouts(
  payout: PayoutConfig,
  prizePool: number,
): { place: number; amount: number }[] {
  const safePrizePool = Math.max(0, prizePool);
  return payout.entries.map((entry) => ({
    place: entry.place,
    amount:
      payout.mode === 'percent'
        ? Math.round((entry.value / 100) * safePrizePool * 100) / 100
        : entry.value,
  }));
}

// ---------------------------------------------------------------------------
// Payout defaults
// ---------------------------------------------------------------------------

/** Return the default payout config: 50/30/20 percent split for 3 places. */
export function defaultPayoutConfig(): PayoutConfig {
  return {
    mode: 'percent',
    entries: [
      { place: 1, value: 50 },
      { place: 2, value: 30 },
      { place: 3, value: 20 },
    ],
  };
}

/** Return a sensible default payout structure scaled to the number of players (1-5 paid places). */
export function defaultPayoutForPlayerCount(playerCount: number): PayoutConfig {
  let entries: { place: number; value: number }[];

  if (playerCount <= 2) {
    entries = [{ place: 1, value: 100 }];
  } else if (playerCount <= 3) {
    entries = [
      { place: 1, value: 65 },
      { place: 2, value: 35 },
    ];
  } else if (playerCount <= 4) {
    entries = [
      { place: 1, value: 60 },
      { place: 2, value: 40 },
    ];
  } else if (playerCount <= 10) {
    entries = [
      { place: 1, value: 50 },
      { place: 2, value: 30 },
      { place: 3, value: 20 },
    ];
  } else if (playerCount <= 15) {
    entries = [
      { place: 1, value: 40 },
      { place: 2, value: 25 },
      { place: 3, value: 20 },
      { place: 4, value: 15 },
    ];
  } else {
    entries = [
      { place: 1, value: 35 },
      { place: 2, value: 25 },
      { place: 3, value: 18 },
      { place: 4, value: 13 },
      { place: 5, value: 9 },
    ];
  }

  return { mode: 'percent', entries };
}

// ---------------------------------------------------------------------------
// Build Tournament Result
// ---------------------------------------------------------------------------

/** Build a complete TournamentResult from the current config, aggregating re-entries and computing payouts. */
export function buildTournamentResult(
  config: TournamentConfig,
  elapsedSeconds: number,
  levelsPlayed: number,
  events?: TournamentEvent[],
): TournamentResult {
  const prizePool = computePrizePool(
    config.players, config.buyIn,
    config.rebuy.enabled ? config.rebuy.rebuyCost : undefined,
    config.addOn.enabled ? config.addOn.cost : undefined,
    config.rebuy.separatePot,
  );
  const payouts = computePayouts(config.payout, prizePool);
  const payoutMap = new Map(payouts.map((p) => [p.place, p.amount]));

  // Group re-entry instances by original player
  const reEntryGroups = new Map<string, typeof config.players>();
  for (const p of config.players) {
    const key = p.originalPlayerId ?? p.id;
    const group = reEntryGroups.get(key) ?? [];
    group.push(p);
    reEntryGroups.set(key, group);
  }

  // Aggregate re-entry groups into single player results
  const aggregated: { name: string; bestPlace: number; isActive: boolean; totalRebuys: number; hasAddOn: boolean; totalKnockouts: number; totalBuyIns: number }[] = [];
  for (const group of reEntryGroups.values()) {
    const bestInstance = group.reduce((best, p) => {
      if (p.status === 'active') return p;
      if (best.status === 'active') return best;
      if ((p.placement ?? Infinity) < (best.placement ?? Infinity)) return p;
      return best;
    });
    const isActive = group.some((p) => p.status === 'active');
    // Active players get sequential places later in the sorted map — use 0 as sentinel
    const bestPlace = isActive ? 0 : (bestInstance.placement ?? 999);
    aggregated.push({
      name: bestInstance.name,
      bestPlace,
      isActive,
      totalRebuys: group.reduce((sum, p) => sum + p.rebuys, 0),
      hasAddOn: group.some((p) => p.addOn),
      totalKnockouts: group.reduce((sum, p) => sum + p.knockouts, 0),
      totalBuyIns: group.length, // Each entry costs one buy-in
    });
  }

  const sorted = [...aggregated].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (b.isActive && !a.isActive) return 1;
    if (a.isActive && b.isActive) return 0; // both active → preserve order
    return a.bestPlace - b.bestPlace;
  });

  const players: PlayerResult[] = sorted.map((p, i) => {
    // Active players get sequential places (1, 2, 3...) based on sorted position
    const place = p.isActive ? (i + 1) : (p.bestPlace !== 999 ? p.bestPlace : i + 1);
    const payout = payoutMap.get(place) ?? 0;
    const totalCost = p.totalBuyIns * config.buyIn
      + p.totalRebuys * (config.rebuy.enabled ? config.rebuy.rebuyCost : config.buyIn)
      + (p.hasAddOn ? (config.addOn.enabled ? config.addOn.cost : config.buyIn) : 0);
    const bountyEarned = config.bounty.enabled ? p.totalKnockouts * config.bounty.amount : 0;
    return {
      name: p.name,
      place,
      payout,
      rebuys: p.totalRebuys,
      addOn: p.hasAddOn,
      knockouts: p.totalKnockouts,
      bountyEarned,
      netBalance: payout + bountyEarned - totalCost,
    };
  });

  return {
    id: crypto.randomUUID(),
    name: config.name,
    date: new Date().toISOString(),
    playerCount: config.players.length,
    buyIn: config.buyIn,
    prizePool,
    players,
    bountyEnabled: config.bounty.enabled,
    bountyAmount: config.bounty.amount,
    rebuyEnabled: config.rebuy.enabled,
    totalRebuys: computeTotalRebuys(config.players),
    addOnEnabled: config.addOn.enabled,
    totalAddOns: computeTotalAddOns(config.players),
    elapsedSeconds,
    levelsPlayed,
    currency: config.currency,
    leagueId: config.leagueId,
    rebuyCost: config.rebuy.enabled ? config.rebuy.rebuyCost : config.buyIn,
    addOnCost: config.addOn.enabled ? config.addOn.cost : config.buyIn,
    rebuyPot: config.rebuy.separatePot
      ? computeRebuyPot(config.players, config.rebuy.enabled ? config.rebuy.rebuyCost : config.buyIn)
      : undefined,
    events: events ?? [],
  };
}

// ---------------------------------------------------------------------------
// Tournament Result -- Text & CSV Export
// ---------------------------------------------------------------------------

const PLACE_EMOJI = ['\u{1F3C6}', '\u{1F948}', '\u{1F949}'];

/** Format a tournament result as a WhatsApp-friendly text string with emoji placements. */
export function formatResultAsText(result: TournamentResult, locale: string = 'de-DE'): string {
  const isEn = locale.startsWith('en');
  const sym = CURRENCY_SYMBOLS[result.currency ?? 'EUR'];
  const lines: string[] = [];
  lines.push(`\u2660\u2665 ${result.name || 'Poker Tournament'} \u2666\u2663`);
  lines.push(new Date(result.date).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }));
  lines.push('');
  for (const p of result.players) {
    const emoji = PLACE_EMOJI[p.place - 1] ?? `${p.place}.`;
    const payoutStr = p.payout > 0 ? ` \u2192 ${p.payout.toFixed(2)} ${sym}` : '';
    lines.push(`${emoji} ${p.name}${payoutStr}`);
  }
  lines.push('');
  const playersLabel = isEn ? 'Players' : 'Spieler';
  lines.push(`Prizepool: ${result.prizePool.toFixed(2)} ${sym} | ${result.playerCount} ${playersLabel}`);
  if (result.rebuyPot && result.rebuyPot > 0) {
    lines.push(`Rebuy-Topf: ${result.rebuyPot.toFixed(2)} ${sym}`);
  }
  if (result.totalRebuys > 0) lines.push(`Rebuys: ${result.totalRebuys}`);
  return lines.join('\n');
}

/** Escape a CSV field to prevent formula injection (=, +, -, @, tab, CR) */
export function csvSafe(value: string): string {
  // Wrap in quotes and escape existing quotes
  const escaped = value.replace(/"/g, '""');
  // Prefix with single-quote if field starts with a formula-triggering character
  if (/^[=+\-@\t\r]/.test(escaped)) {
    return `"'${escaped}"`;
  }
  return `"${escaped}"`;
}

export function formatResultAsCSV(result: TournamentResult): string {
  const sym = CURRENCY_SYMBOLS[result.currency ?? 'EUR'];
  const header = `Place,Name,Payout (${sym}),Rebuys,AddOn,Knockouts,NetBalance (${sym})`;
  const rows = result.players.map((p) =>
    [p.place, csvSafe(p.name), p.payout.toFixed(2), p.rebuys, p.addOn ? 1 : 0, p.knockouts, p.netBalance.toFixed(2)].join(','),
  );
  return [header, ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// Player Statistics (cross-tournament aggregation)
// ---------------------------------------------------------------------------

export function computePlayerStats(history: TournamentResult[]): import('./types').PlayerStat[] {
  const map = new Map<string, import('./types').PlayerStat>();

  for (const tournament of history) {
    for (const p of tournament.players) {
      const key = p.name.toLowerCase().trim();
      let stat = map.get(key);
      if (!stat) {
        stat = {
          name: p.name,
          tournaments: 0,
          wins: 0,
          cashes: 0,
          totalPayout: 0,
          totalCost: 0,
          netBalance: 0,
          avgPlace: 0,
          bestPlace: Infinity,
          knockouts: 0,
        };
        map.set(key, stat);
      }
      stat.tournaments++;
      if (p.place === 1) stat.wins++;
      if (p.payout > 0) stat.cashes++;
      stat.totalPayout += p.payout + p.bountyEarned;
      stat.totalCost += p.payout + p.bountyEarned - p.netBalance; // totalCost = payout + bounty - netBalance
      stat.netBalance += p.netBalance;
      stat.avgPlace += p.place;
      if (p.place < stat.bestPlace) stat.bestPlace = p.place;
      stat.knockouts += p.knockouts;
    }
  }

  const stats = [...map.values()];
  for (const s of stats) {
    s.avgPlace = Math.round((s.avgPlace / s.tournaments) * 10) / 10;
    if (s.bestPlace === Infinity) s.bestPlace = 0;
  }
  stats.sort((a, b) => b.netBalance - a.netBalance);
  return stats;
}

// ---------------------------------------------------------------------------
// League Standings
// ---------------------------------------------------------------------------

export function computeLeagueStandings(
  leagueId: string,
  history: TournamentResult[],
  pointSystem: PointSystem,
): LeagueStanding[] {
  const pointMap = new Map(pointSystem.entries.map((e) => [e.place, e.points]));
  const map = new Map<string, LeagueStanding>();

  for (const tournament of history) {
    if (tournament.leagueId !== leagueId) continue;
    for (const p of tournament.players) {
      const key = p.name.toLowerCase().trim();
      let standing = map.get(key);
      if (!standing) {
        standing = {
          name: p.name,
          points: 0,
          tournaments: 0,
          wins: 0,
          cashes: 0,
          avgPlace: 0,
          bestPlace: Infinity,
        };
        map.set(key, standing);
      }
      standing.tournaments++;
      standing.points += pointMap.get(p.place) ?? 0;
      if (p.place === 1) standing.wins++;
      if (p.payout > 0) standing.cashes++;
      standing.avgPlace += p.place;
      if (p.place < standing.bestPlace) standing.bestPlace = p.place;
    }
  }

  const standings = [...map.values()];
  for (const s of standings) {
    s.avgPlace = Math.round((s.avgPlace / s.tournaments) * 10) / 10;
    if (s.bestPlace === Infinity) s.bestPlace = 0;
  }
  standings.sort((a, b) => b.points - a.points || a.avgPlace - b.avgPlace);
  return standings;
}

export function formatLeagueAsText(league: League, standings: LeagueStanding[]): string {
  const lines: string[] = [];
  lines.push(`\u2660 ${league.name}`);
  lines.push('');
  for (let i = 0; i < standings.length; i++) {
    const s = standings[i];
    const medal = i === 0 ? '\u{1F3C6}' : i === 1 ? '\u{1F948}' : i === 2 ? '\u{1F949}' : `${i + 1}.`;
    lines.push(`${medal} ${s.name} — ${s.points} Pts (${s.tournaments} T, ${s.wins} W)`);
  }
  return lines.join('\n');
}

export function formatLeagueAsCSV(standings: LeagueStanding[]): string {
  const header = 'Rank,Name,Points,Tournaments,Wins,Cashes,AvgPlace,BestPlace';
  const rows = standings.map((s, i) =>
    [i + 1, `"${s.name}"`, s.points, s.tournaments, s.wins, s.cashes, s.avgPlace, s.bestPlace].join(','),
  );
  return [header, ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// Mystery Bounty
// ---------------------------------------------------------------------------

export function drawMysteryBounty(pool: number[]): { amount: number; remainingPool: number[] } {
  if (pool.length === 0) return { amount: 0, remainingPool: [] };
  const idx = Math.floor(Math.random() * pool.length);
  const amount = pool[idx];
  const remainingPool = [...pool.slice(0, idx), ...pool.slice(idx + 1)];
  return { amount, remainingPool };
}

// ---------------------------------------------------------------------------
// QR Code Decoding (compact tournament result sharing)
// ---------------------------------------------------------------------------

export function decodeResultFromQR(encoded: string): TournamentResult | null {
  try {
    const parts = encoded.split('|');
    if (parts.length < 11) return null;

    const name = parts[0];
    const date = parts[1];
    const playerCount = Number(parts[2]);
    const buyIn = Number(parts[3]);
    const prizePool = Number(parts[4]);
    const bountyAmount = Number(parts[5]);
    const totalRebuys = Number(parts[6]);
    const totalAddOns = Number(parts[7]);
    const elapsedMinutes = Number(parts[8]);
    const levelsPlayed = Number(parts[9]);
    const playersRaw = parts.slice(10).join('|');

    // Validate all numeric header fields
    if (!name || [playerCount, buyIn, prizePool, bountyAmount, totalRebuys, totalAddOns, elapsedMinutes, levelsPlayed].some(isNaN)) return null;

    const players: PlayerResult[] = playersRaw.split(';').filter(Boolean).map(entry => {
      // Split with limit — name may contain ':' so grab known trailing fields from the right
      const parts = entry.split(':');
      // Expect at least 6 parts: name, place, payout, rebuys, addOn, knockouts
      // If name contains ':', it will produce extra parts at the front
      if (parts.length < 6) return null;
      const knockouts = parts.pop()!;
      const addOn = parts.pop()!;
      const rebuys = parts.pop()!;
      const payout = parts.pop()!;
      const place = parts.pop()!;
      const pName = parts.join(':'); // remaining parts = player name (may contain ':')
      const placeNum = Number(place);
      const payoutNum = Number(payout) || 0;
      const rebuyCount = Number(rebuys) || 0;
      const hasAddOn = Number(addOn) === 1;
      const knockoutsNum = Number(knockouts) || 0;
      // Reject player entries with invalid place
      if (!pName || isNaN(placeNum) || placeNum < 1) {
        return null;
      }
      const totalCost = buyIn + rebuyCount * buyIn + (hasAddOn ? buyIn : 0);
      const bountyEarned = bountyAmount > 0 ? knockoutsNum * bountyAmount : 0;
      return {
        name: pName,
        place: placeNum,
        payout: payoutNum,
        rebuys: rebuyCount,
        addOn: hasAddOn,
        knockouts: knockoutsNum,
        bountyEarned,
        netBalance: payoutNum + bountyEarned - totalCost,
      };
    }).filter((p): p is PlayerResult => p !== null);

    if (players.length === 0) return null;

    return {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      name,
      date: new Date(date).toISOString(),
      playerCount,
      buyIn,
      prizePool,
      players,
      bountyEnabled: bountyAmount > 0,
      bountyAmount,
      rebuyEnabled: totalRebuys > 0,
      totalRebuys,
      addOnEnabled: totalAddOns > 0,
      totalAddOns,
      elapsedSeconds: elapsedMinutes * 60,
      levelsPlayed,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Side Pot — Human-readable formatting
// ---------------------------------------------------------------------------

/**
 * Format side pot results as human-readable text.
 * Uses player names from the PotResult (already embedded) and a currency symbol.
 * Example: "Main pot: €1,500 between Alice, Bob, Charlie. Side pot 1: €500 between Alice, Bob."
 */
export function formatSidePotsAsText(
  pots: PotResult[],
  currencySymbol = '€',
): string {
  if (pots.length === 0) return '';
  return pots.map((pot) => {
    const label = pot.type === 'main' ? 'Main Pot' : `Side Pot ${pot.index}`;
    const amount = `${currencySymbol}${pot.amount.toLocaleString()}`;
    const names = pot.eligiblePlayerNames.length > 0
      ? pot.eligiblePlayerNames.join(', ')
      : '—';
    return `${label}: ${amount} between ${names}`;
  }).join('. ') + '.';
}
