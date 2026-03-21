import type {
  GameDay,
  GameDayParticipant,
  League,
  ExtendedLeagueStanding,
  TournamentResult,
  TiebreakerConfig,
  Season,
  HeadToHeadEntry,
  HeadToHeadMatrix,
  PointSystem,
} from './types';
import { csvSafe } from './tournament';
import { getCached, setCachedItem, deleteCachedItem } from './storage';

// ---------------------------------------------------------------------------
// Player Name Normalization
// ---------------------------------------------------------------------------

export function normalizePlayerName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Compute participant cost from recorded payout/netBalance when available.
 * This keeps standings consistent with historical game day records that may
 * use per-result rebuy/add-on costs differing from buy-in.
 */
function computeParticipantTotalCost(p: GameDayParticipant): number {
  const derived = p.payout - p.netBalance;
  if (Number.isFinite(derived) && derived >= 0) {
    return derived;
  }
  // Backward-compatible fallback for malformed legacy records.
  return p.buyIn + (p.rebuys * p.buyIn) + p.addOnCost;
}

// ---------------------------------------------------------------------------
// GameDay CRUD (backed by IndexedDB cache layer)
// ---------------------------------------------------------------------------

/** Load all game days from storage cache. */
export function loadGameDays(): GameDay[] {
  return getCached('gameDays');
}

/** Load game days for a specific league. */
export function loadGameDaysForLeague(leagueId: string): GameDay[] {
  return getCached('gameDays').filter((gd) => gd.leagueId === leagueId);
}

/**
 * Extract unique player names from recent game days for a league.
 * Returns names from the most recent game days, deduplicated and sorted.
 */
export function getLeaguePlayerNames(leagueId: string, maxGameDays = 5): string[] {
  const gameDays = loadGameDaysForLeague(leagueId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, maxGameDays);
  const names = new Set<string>();
  for (const gd of gameDays) {
    for (const p of gd.participants) {
      names.add(p.name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** Load game days for a specific league season. */
export function loadGameDaysForSeason(leagueId: string, seasonId: string): GameDay[] {
  return getCached('gameDays').filter((gd) => gd.leagueId === leagueId && gd.seasonId === seasonId);
}

/** Upsert a game day: update existing by id, or append if new. */
export function saveGameDay(gameDay: GameDay): GameDay {
  setCachedItem('gameDays', gameDay);
  return gameDay;
}

/** Delete a game day by id. */
export function deleteGameDay(id: string): void {
  deleteCachedItem('gameDays', id);
}

// ---------------------------------------------------------------------------
// Auto-Create GameDay from TournamentResult
// ---------------------------------------------------------------------------

/**
 * Create a GameDay from a finished tournament result.
 * Maps PlayerResult[] → GameDayParticipant[] with points from the league's point system.
 * Optionally accepts registered players to populate registeredPlayerId for stable identity.
 */
export function createGameDayFromResult(
  result: TournamentResult,
  league: League,
  registeredPlayers?: { id: string; name: string }[],
  gameDayLabel?: string,
): GameDay {
  const pointMap = new Map(league.pointSystem.entries.map((e) => [e.place, e.points]));

  // Build a name→id lookup for registered players (case-insensitive)
  const playerIdMap = new Map<string, string>();
  if (registeredPlayers) {
    for (const rp of registeredPlayers) {
      playerIdMap.set(normalizePlayerName(rp.name), rp.id);
    }
  }

  const participants: GameDayParticipant[] = result.players.map((p) => {
    const perRebuyCost = result.rebuyCost ?? result.buyIn; // backward-compat fallback
    const perAddOnCost = result.addOnCost ?? result.buyIn; // backward-compat fallback
    const rebuyCost = result.rebuyEnabled ? p.rebuys * perRebuyCost : 0;
    const addOnCost = p.addOn ? perAddOnCost : 0;
    const totalCost = result.buyIn + rebuyCost + addOnCost;
    const registeredPlayerId = playerIdMap.get(normalizePlayerName(p.name));
    return {
      name: p.name,
      place: p.place,
      points: pointMap.get(p.place) ?? 0,
      buyIn: result.buyIn,
      rebuys: p.rebuys,
      addOnCost: addOnCost,
      payout: p.payout,
      netBalance: p.payout + p.bountyEarned - totalCost,
      knockouts: p.knockouts,
      ...(registeredPlayerId ? { registeredPlayerId } : {}),
    };
  });

  const rawTotalBuyIns = participants.reduce((sum, p) => sum + p.buyIn + (result.rebuyEnabled ? p.rebuys * (result.rebuyCost ?? result.buyIn) : 0) + p.addOnCost, 0);
  const totalBuyIns = Number.isFinite(rawTotalBuyIns) ? rawTotalBuyIns : 0;
  const totalPrizePool = Number.isFinite(result.prizePool) ? result.prizePool : 0;

  // Determine next game day number for this league (max existing + 1 to avoid gaps after deletions)
  const existingGameDays = loadGameDaysForLeague(league.id);
  const maxNumber = existingGameDays.reduce((max, gd) => {
    const m = gd.label?.match(/\d+/);
    return m ? Math.max(max, parseInt(m[0], 10)) : max;
  }, 0);
  const nextNumber = maxNumber + 1;

  // Validate activeSeasonId refers to an existing season
  const validSeasonId = league.activeSeasonId && league.seasons?.some(s => s.id === league.activeSeasonId)
    ? league.activeSeasonId
    : undefined;

  const gameDay: GameDay = {
    id: `gd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    leagueId: league.id,
    seasonId: validSeasonId,
    date: result.date,
    label: gameDayLabel ?? `Spieltag ${nextNumber}`,
    tournamentResultId: result.id,
    participants,
    totalPrizePool,
    totalBuyIns,
    cashBalance: totalBuyIns - totalPrizePool,
    ...(result.currency ? { currency: result.currency } : {}),
  };

  saveGameDay(gameDay);
  return gameDay;
}

// ---------------------------------------------------------------------------
// Head-to-Head Matrix
// ---------------------------------------------------------------------------

/**
 * Compute head-to-head comparison matrix from game day data.
 * For each pair of players who both participated in a game day,
 * tracks who finished above whom.
 */
export function computeHeadToHeadMatrix(
  gameDays: GameDay[],
  filterPlayers?: string[],
): HeadToHeadMatrix {
  // Collect all player names (normalized → display name)
  const nameMap = new Map<string, string>();
  const meetingsMap = new Map<string, { wins: number; losses: number; meetings: number }>();

  const pairKey = (a: string, b: string) => `${a}|||${b}`;

  for (const gd of gameDays) {
    const participants = gd.participants;
    for (let i = 0; i < participants.length; i++) {
      const pi = participants[i]!;
      const keyI = normalizePlayerName(pi.name);
      if (!nameMap.has(keyI)) nameMap.set(keyI, pi.name);

      for (let j = i + 1; j < participants.length; j++) {
        const pj = participants[j]!;
        const keyJ = normalizePlayerName(pj.name);
        if (!nameMap.has(keyJ)) nameMap.set(keyJ, pj.name);

        // Update i vs j
        const keyIJ = pairKey(keyI, keyJ);
        let entryIJ = meetingsMap.get(keyIJ);
        if (!entryIJ) { entryIJ = { wins: 0, losses: 0, meetings: 0 }; meetingsMap.set(keyIJ, entryIJ); }
        entryIJ.meetings++;
        if (pi.place < pj.place) entryIJ.wins++;
        else if (pj.place < pi.place) entryIJ.losses++;

        // Update j vs i
        const keyJI = pairKey(keyJ, keyI);
        let entryJI = meetingsMap.get(keyJI);
        if (!entryJI) { entryJI = { wins: 0, losses: 0, meetings: 0 }; meetingsMap.set(keyJI, entryJI); }
        entryJI.meetings++;
        if (pj.place < pi.place) entryJI.wins++;
        else if (pi.place < pj.place) entryJI.losses++;
      }
    }
  }

  // Determine player list
  let playerKeys = [...nameMap.keys()];
  if (filterPlayers) {
    const filterSet = new Set(filterPlayers.map(normalizePlayerName));
    playerKeys = playerKeys.filter((k) => filterSet.has(k));
  }

  // Count total meetings per player for sorting
  const totalMeetings = new Map<string, number>();
  for (const key of playerKeys) {
    let total = 0;
    for (const otherKey of playerKeys) {
      if (key === otherKey) continue;
      const entry = meetingsMap.get(pairKey(key, otherKey));
      if (entry) total += entry.meetings;
    }
    totalMeetings.set(key, total);
  }

  // Sort by total meetings DESC
  playerKeys.sort((a, b) => (totalMeetings.get(b) ?? 0) - (totalMeetings.get(a) ?? 0));

  const players = playerKeys.map((k) => nameMap.get(k)!);
  const matrix: (HeadToHeadEntry | null)[][] = [];

  for (let i = 0; i < playerKeys.length; i++) {
    const row: (HeadToHeadEntry | null)[] = [];
    for (let j = 0; j < playerKeys.length; j++) {
      if (i === j) {
        row.push(null);
        continue;
      }
      const entry = meetingsMap.get(pairKey(playerKeys[i]!, playerKeys[j]!));
      if (!entry || entry.meetings === 0) {
        row.push({ wins: 0, losses: 0, meetings: 0, winRate: null });
      } else {
        row.push({
          wins: entry.wins,
          losses: entry.losses,
          meetings: entry.meetings,
          winRate: entry.wins / entry.meetings,
        });
      }
    }
    matrix.push(row);
  }

  return { players, matrix };
}

// ---------------------------------------------------------------------------
// ELO Rating System
// ---------------------------------------------------------------------------

/**
 * Compute ELO ratings from game day history.
 * Processes game days chronologically, running pairwise ELO updates
 * for all player pairs where one finished above the other.
 */
export function computeEloRatings(
  gameDays: GameDay[],
  startRating: number = 1200,
  kFactor: number = 32,
): Map<string, number> {
  const ratings = new Map<string, number>();
  const sorted = [...gameDays].sort((a, b) => a.date.localeCompare(b.date));

  // Initialize all players with startRating
  for (const gd of sorted) {
    for (const p of gd.participants) {
      const key = normalizePlayerName(p.name);
      if (!ratings.has(key)) ratings.set(key, startRating);
    }
  }

  // Process each game day
  for (const gd of sorted) {
    const participants = gd.participants;
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const pi = participants[i]!;
        const pj = participants[j]!;
        if (pi.place === pj.place) continue; // tie — skip

        const winnerKey = pi.place < pj.place ? normalizePlayerName(pi.name) : normalizePlayerName(pj.name);
        const loserKey = pi.place < pj.place ? normalizePlayerName(pj.name) : normalizePlayerName(pi.name);

        const ratingWinner = ratings.get(winnerKey)!;
        const ratingLoser = ratings.get(loserKey)!;

        const expectedWin = 1 / (1 + Math.pow(10, (ratingLoser - ratingWinner) / 400));
        ratings.set(winnerKey, ratingWinner + kFactor * (1 - expectedWin));
        ratings.set(loserKey, ratingLoser + kFactor * (0 - (1 - expectedWin)));
      }
    }
  }

  return ratings;
}

// ---------------------------------------------------------------------------
// Weighted Points
// ---------------------------------------------------------------------------

/**
 * Compute weighted points where more recent tournaments are worth more.
 * weight = decayFactor^(totalGameDays - 1 - index) where index 0 = oldest.
 */
export function computeWeightedPoints(
  gameDays: GameDay[],
  pointSystem: PointSystem,
  decayFactor: number = 0.9,
): Map<string, number> {
  const pointMap = new Map(pointSystem.entries.map((e) => [e.place, e.points]));
  const sorted = [...gameDays].sort((a, b) => a.date.localeCompare(b.date));
  const total = sorted.length;
  const result = new Map<string, number>();

  for (let i = 0; i < total; i++) {
    const weight = Math.pow(decayFactor, total - 1 - i);
    for (const p of sorted[i]!.participants) {
      const key = normalizePlayerName(p.name);
      const pts = pointMap.get(p.place) ?? p.points;
      result.set(key, (result.get(key) ?? 0) + pts * weight);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Extended League Standings
// ---------------------------------------------------------------------------

/**
 * Compute extended standings from game days, including financial data,
 * participation rate, corrections, and tiebreaker sorting.
 */
export function computeExtendedStandings(
  league: League,
  gameDays: GameDay[],
  options?: { excludeGuests?: boolean },
): ExtendedLeagueStanding[] {
  const entries = league.pointSystem?.entries ?? [];
  // Fallback: if pointSystem is empty, generate default 1st=10, 2nd=7, 3rd=5, 4th=4, ...
  const effectiveEntries = entries.length > 0 ? entries : [
    { place: 1, points: 10 }, { place: 2, points: 7 }, { place: 3, points: 5 },
    { place: 4, points: 4 }, { place: 5, points: 3 }, { place: 6, points: 2 }, { place: 7, points: 1 },
  ];
  const pointMap = new Map(effectiveEntries.map((e) => [e.place, e.points]));
  const map = new Map<string, ExtendedLeagueStanding>();

  for (const gd of gameDays) {
    for (const p of gd.participants) {
      if (options?.excludeGuests && p.isGuest) continue;

      const key = normalizePlayerName(p.name);
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
          totalCost: 0,
          totalPayout: 0,
          netBalance: 0,
          participationRate: 0,
          knockouts: 0,
          corrections: 0,
          rank: 0,
        };
        map.set(key, standing);
      }
      standing.tournaments++;
      standing.points += pointMap.get(p.place) ?? p.points;
      if (p.place === 1) standing.wins++;
      if (p.payout > 0) standing.cashes++;
      standing.avgPlace += p.place;
      if (p.place < standing.bestPlace) standing.bestPlace = p.place;
      standing.knockouts += p.knockouts ?? 0;
      const cost = computeParticipantTotalCost(p);
      standing.totalCost += cost;
      standing.totalPayout += p.payout;
      standing.netBalance += p.netBalance;
    }
  }

  // Apply corrections
  if (league.corrections) {
    for (const correction of league.corrections) {
      const key = normalizePlayerName(correction.playerName);
      const standing = map.get(key);
      if (standing) {
        standing.points += correction.points;
        standing.corrections += correction.points;
      }
    }
  }

  const totalGameDays = gameDays.length;
  const standings = [...map.values()];
  for (const s of standings) {
    s.avgPlace = s.tournaments > 0 ? Math.round((s.avgPlace / s.tournaments) * 10) / 10 : 0;
    if (s.bestPlace === Infinity) s.bestPlace = 0;
    s.participationRate = totalGameDays > 0 ? s.tournaments / totalGameDays : 0;
    // Normalize accumulated floats to avoid display artifacts like "-0.00"
    s.totalCost = Math.round(s.totalCost * 100) / 100;
    s.totalPayout = Math.round(s.totalPayout * 100) / 100;
    s.netBalance = Math.round(s.netBalance * 100) / 100;
  }

  // Apply minimum participation flag
  if (league.minParticipation != null && league.minParticipation > 0) {
    for (const s of standings) {
      s.meetsMinParticipation = s.tournaments >= league.minParticipation!;
    }
  }

  const algorithm = league.rankingAlgorithm ?? 'points';

  if (algorithm === 'elo') {
    // Compute ELO ratings and attach to standings
    const eloConfig = league.eloConfig;
    const eloMap = computeEloRatings(
      gameDays,
      eloConfig?.startRating ?? 1200,
      eloConfig?.kFactor ?? 32,
    );
    for (const s of standings) {
      s.eloRating = eloMap.get(normalizePlayerName(s.name)) ?? (eloConfig?.startRating ?? 1200);
    }
    // Sort by ELO rating DESC
    standings.sort((a, b) => (b.eloRating ?? 0) - (a.eloRating ?? 0));
  } else if (algorithm === 'weightedPoints') {
    // Compute weighted points and attach to standings
    const decay = league.weightedPointsConfig?.decayFactor ?? 0.9;
    const wpMap = computeWeightedPoints(gameDays, league.pointSystem, decay);
    for (const s of standings) {
      s.weightedPoints = wpMap.get(normalizePlayerName(s.name)) ?? 0;
    }
    // Sort by weighted points DESC
    standings.sort((a, b) => (b.weightedPoints ?? 0) - (a.weightedPoints ?? 0));
  } else {
    // Default: points DESC, then avgPlace ASC
    standings.sort((a, b) => b.points - a.points || a.avgPlace - b.avgPlace);

    // Apply tiebreaker if configured (only for points mode)
    if (league.tiebreaker) {
      applyTiebreaker(standings, gameDays, league.tiebreaker);
    }
  }

  // Assign ranks
  for (let i = 0; i < standings.length; i++) {
    standings[i]!.rank = i + 1;
  }

  return standings;
}

// ---------------------------------------------------------------------------
// Tiebreaker
// ---------------------------------------------------------------------------

/**
 * Re-sort standings in-place by applying tiebreaker criteria to groups with equal points.
 */
export function applyTiebreaker(
  standings: ExtendedLeagueStanding[],
  gameDays: GameDay[],
  config: TiebreakerConfig,
): ExtendedLeagueStanding[] {
  // Pre-sort by points descending to ensure correct grouping (defensive)
  const preSorted = [...standings].sort((a, b) => b.points - a.points);

  // Group by points (using pre-sorted input)
  const groups: ExtendedLeagueStanding[][] = [];
  let currentGroup: ExtendedLeagueStanding[] = [];
  for (const s of preSorted) {
    if (currentGroup.length === 0 || currentGroup[0]!.points === s.points) {
      currentGroup.push(s);
    } else {
      groups.push(currentGroup);
      currentGroup = [s];
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  // Sort within each group
  const sorted: ExtendedLeagueStanding[] = [];
  for (const group of groups) {
    if (group.length <= 1) {
      sorted.push(...group);
      continue;
    }
    group.sort((a, b) => {
      for (const criterion of config.criteria) {
        let diff = 0;
        switch (criterion) {
          case 'avgPlace':
            diff = a.avgPlace - b.avgPlace; // lower is better
            break;
          case 'wins':
            diff = b.wins - a.wins; // more is better
            break;
          case 'cashes':
            diff = b.cashes - a.cashes; // more is better
            break;
          case 'lastResult': {
            // Compare last game day placement (lower is better) — sort by date to ensure chronological order
            const sortedGDs = [...gameDays].sort((x, y) => x.date.localeCompare(y.date));
            const lastGD = sortedGDs.length > 0 ? sortedGDs[sortedGDs.length - 1] : null;
            if (lastGD) {
              const aLast = lastGD.participants.find((p) => normalizePlayerName(p.name) === normalizePlayerName(a.name));
              const bLast = lastGD.participants.find((p) => normalizePlayerName(p.name) === normalizePlayerName(b.name));
              diff = (aLast?.place ?? 999) - (bLast?.place ?? 999);
            }
            break;
          }
          case 'headToHead':
            // Head-to-head: count how often a placed higher than b across all game days
            {
              let aWins = 0;
              let bWins = 0;
              for (const gd of gameDays) {
                const aP = gd.participants.find((p) => normalizePlayerName(p.name) === normalizePlayerName(a.name));
                const bP = gd.participants.find((p) => normalizePlayerName(p.name) === normalizePlayerName(b.name));
                if (aP && bP) {
                  if (aP.place < bP.place) aWins++;
                  else if (bP.place < aP.place) bWins++;
                }
              }
              diff = bWins - aWins; // more wins → better → comes first
            }
            break;
        }
        if (diff !== 0) return diff;
      }
      return 0;
    });
    sorted.push(...group);
  }

  // Replace standings in-place
  for (let i = 0; i < sorted.length; i++) {
    standings[i] = sorted[i]!;
  }
  return standings;
}

// ---------------------------------------------------------------------------
// League Finances
// ---------------------------------------------------------------------------

export interface LeagueFinanceSummary {
  totalBuyIns: number;
  totalPayouts: number;
  totalCashBalance: number;
  perGameDay: {
    id: string;
    date: string;
    label: string;
    cashBalance: number;
    cumulative: number;
  }[];
}

export function computeLeagueFinances(gameDays: GameDay[]): LeagueFinanceSummary {
  let totalBuyIns = 0;
  let totalPayouts = 0;
  let cumulative = 0;

  // Sort game days by date for correct cumulative calculation
  const sorted = [...gameDays].sort((a, b) => a.date.localeCompare(b.date));

  const perGameDay = sorted.map((gd) => {
    totalBuyIns += gd.totalBuyIns;
    totalPayouts += gd.totalPrizePool;
    cumulative += gd.cashBalance;
    return {
      id: gd.id,
      date: gd.date,
      label: gd.label ?? gd.date,
      cashBalance: gd.cashBalance,
      cumulative,
    };
  });

  return {
    totalBuyIns: Math.round(totalBuyIns * 100) / 100,
    totalPayouts: Math.round(totalPayouts * 100) / 100,
    totalCashBalance: Math.round(cumulative * 100) / 100,
    perGameDay,
  };
}

// ---------------------------------------------------------------------------
// Season Helpers
// ---------------------------------------------------------------------------

export function getActiveSeason(league: League): Season | undefined {
  if (!league.seasons || !league.activeSeasonId) return undefined;
  return league.seasons.find((s) => s.id === league.activeSeasonId);
}

export function getGameDaysInSeason(gameDays: GameDay[], seasonId: string): GameDay[] {
  return gameDays.filter((gd) => gd.seasonId === seasonId);
}

export function createSeason(name: string): Season {
  return {
    id: `season_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    startDate: new Date().toISOString().split('T')[0]!,
  };
}

// ---------------------------------------------------------------------------
// Export Helpers
// ---------------------------------------------------------------------------

export function formatLeagueStandingsAsText(
  league: League,
  standings: ExtendedLeagueStanding[],
): string {
  const lines: string[] = [];
  lines.push(`\u2660 ${league.name}`);
  lines.push('');
  for (const s of standings) {
    const medal = s.rank === 1 ? '\u{1F3C6}' : s.rank === 2 ? '\u{1F948}' : s.rank === 3 ? '\u{1F949}' : `${s.rank}.`;
    const balance = s.netBalance >= 0 ? `+${s.netBalance.toFixed(2)}` : s.netBalance.toFixed(2);
    lines.push(`${medal} ${s.name} — ${s.points} Pts (${s.tournaments} T, ${s.wins} W, ${balance} \u20AC)`);
  }
  return lines.join('\n');
}

export function formatLeagueStandingsAsCSV(
  standings: ExtendedLeagueStanding[],
): string {
  const header = 'Rank,Name,Points,GameDays,Wins,Cashes,AvgPlace,BestPlace,Knockouts,TotalCost,TotalPayout,NetBalance,ParticipationRate,Corrections';
  const rows = standings.map((s) =>
    `${s.rank},${csvSafe(s.name)},${s.points},${s.tournaments},${s.wins},${s.cashes},${s.avgPlace},${s.bestPlace},${s.knockouts},${s.totalCost.toFixed(2)},${s.totalPayout.toFixed(2)},${s.netBalance.toFixed(2)},${(s.participationRate * 100).toFixed(0)}%,${s.corrections}`,
  );
  return [header, ...rows].join('\n');
}

export function formatLeagueFinancesAsCSV(
  gameDays: GameDay[],
): string {
  const finances = computeLeagueFinances(gameDays);
  const header = 'Date,Label,BuyIns,Payouts,CashBalance,Cumulative';
  const rows = finances.perGameDay.map((gd) =>
    `${gd.date},${csvSafe(gd.label)},${gameDays.find((g) => g.id === gd.id)?.totalBuyIns.toFixed(2) ?? '0.00'},${gameDays.find((g) => g.id === gd.id)?.totalPrizePool.toFixed(2) ?? '0.00'},${gd.cashBalance.toFixed(2)},${gd.cumulative.toFixed(2)}`,
  );
  return [header, ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// League Player Stats (Phase 3)
// ---------------------------------------------------------------------------

export interface LeaguePlayerStats {
  name: string;
  pointsHistory: { gameDayId: string; date: string; points: number; cumulative: number }[];
  placeDistribution: Record<number, number>;
  streaks: { currentWin: number; bestWin: number; currentCash: number; bestCash: number };
  formLast5: ('W' | 'C' | 'X')[];
  headToHead: Record<string, { wins: number; losses: number }>;
}

export function computeLeaguePlayerStats(
  playerName: string,
  gameDays: GameDay[],
): LeaguePlayerStats {
  const key = normalizePlayerName(playerName);
  const sorted = [...gameDays].sort((a, b) => a.date.localeCompare(b.date));

  const pointsHistory: LeaguePlayerStats['pointsHistory'] = [];
  const placeDistribution: Record<number, number> = {};
  const headToHead: Record<string, { wins: number; losses: number }> = {};
  let cumulative = 0;
  let currentWin = 0;
  let bestWin = 0;
  let currentCash = 0;
  let bestCash = 0;
  const form: ('W' | 'C' | 'X')[] = [];

  for (const gd of sorted) {
    const participant = gd.participants.find((p) => normalizePlayerName(p.name) === key);
    if (!participant) continue;

    cumulative += participant.points;
    pointsHistory.push({
      gameDayId: gd.id,
      date: gd.date,
      points: participant.points,
      cumulative,
    });

    placeDistribution[participant.place] = (placeDistribution[participant.place] ?? 0) + 1;

    // Streaks
    if (participant.place === 1) {
      currentWin++;
      bestWin = Math.max(bestWin, currentWin);
    } else {
      currentWin = 0;
    }
    if (participant.payout > 0) {
      currentCash++;
      bestCash = Math.max(bestCash, currentCash);
    } else {
      currentCash = 0;
    }

    // Form
    if (participant.place === 1) form.push('W');
    else if (participant.payout > 0) form.push('C');
    else form.push('X');

    // Head-to-head
    for (const other of gd.participants) {
      if (normalizePlayerName(other.name) === key) continue;
      const otherKey = normalizePlayerName(other.name);
      if (!headToHead[otherKey]) headToHead[otherKey] = { wins: 0, losses: 0 };
      if (participant.place < other.place) headToHead[otherKey].wins++;
      else if (participant.place > other.place) headToHead[otherKey].losses++;
    }
  }

  return {
    name: playerName,
    pointsHistory,
    placeDistribution,
    streaks: { currentWin, bestWin, currentCash, bestCash },
    formLast5: form.slice(-5),
    headToHead,
  };
}

// ---------------------------------------------------------------------------
// QR Encoding for League Standings (Phase 3)
// ---------------------------------------------------------------------------

export function encodeLeagueStandingsForQR(
  league: League,
  standings: ExtendedLeagueStanding[],
): string {
  // Compact format: leagueName|rank:name:points:tournaments:wins:netBalance;...
  // URL-encode league name and player names individually to protect delimiters
  const safeName = (n: string) => encodeURIComponent(n);
  const players = standings.map((s) =>
    `${s.rank}:${safeName(s.name)}:${s.points}:${s.tournaments}:${s.wins}:${s.netBalance.toFixed(2)}`,
  ).join(';');
  const encoded = encodeURIComponent(`${safeName(league.name)}|${players}`);
  return `#ls=${encoded}`;
}

export function decodeLeagueStandingsFromQR(hash: string): { leagueName: string; standings: { rank: number; name: string; points: number; tournaments: number; wins: number; netBalance: number }[] } | null {
  try {
    if (!hash.startsWith('#ls=')) return null;
    const decoded = decodeURIComponent(hash.slice(4));
    // Split on first | only — league name may be URL-encoded
    const pipeIdx = decoded.indexOf('|');
    if (pipeIdx < 0) return null;
    const leagueName = decodeURIComponent(decoded.slice(0, pipeIdx));
    const playersStr = decoded.slice(pipeIdx + 1);
    if (!leagueName || !playersStr) return null;
    const standings = playersStr.split(';').filter(Boolean).map((entry) => {
      const [rank, name, points, tournaments, wins, netBalance] = entry.split(':');
      const rankNum = parseInt(rank ?? '', 10);
      // Player names may be URL-encoded
      const decodedName = decodeURIComponent(name ?? '');
      const pointsNum = parseInt(points ?? '', 10);
      const tournamentsNum = parseInt(tournaments ?? '', 10);
      const winsNum = parseInt(wins ?? '', 10);
      const balanceNum = parseFloat(netBalance ?? '');
      if (!decodedName || [rankNum, pointsNum, tournamentsNum, winsNum, balanceNum].some(isNaN)) {
        return null;
      }
      return {
        rank: rankNum,
        name: decodedName,
        points: pointsNum,
        tournaments: tournamentsNum,
        wins: winsNum,
        netBalance: balanceNum,
      };
    }).filter(<T,>(v: T | null): v is T => v !== null);
    if (standings.length === 0) return null;
    return { leagueName, standings };
  } catch {
    return null;
  }
}
