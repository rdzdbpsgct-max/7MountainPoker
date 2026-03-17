import type { TournamentSeries, SeriesStanding, TournamentResult, PointSystem } from './types';
import { generateId } from './helpers';
import { getCached, setCachedItem, deleteCachedItem } from './storage';
import { csvSafe } from './tournament';

// ---------------------------------------------------------------------------
// Default Point System (same as leagues)
// ---------------------------------------------------------------------------

function defaultSeriesPointSystem(): PointSystem {
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

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function loadAllSeries(): TournamentSeries[] {
  return getCached('series');
}

export function saveSeries(series: TournamentSeries): void {
  setCachedItem('series', series);
}

export function deleteSeries(id: string): void {
  deleteCachedItem('series', id);
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createSeries(name: string, startDate: string): TournamentSeries {
  return {
    id: generateId(),
    name,
    startDate,
    tournamentIds: [],
    pointSystem: defaultSeriesPointSystem(),
    rankingMode: 'points',
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Link/Unlink Tournaments
// ---------------------------------------------------------------------------

export function addTournamentToSeries(series: TournamentSeries, resultId: string): TournamentSeries {
  if (series.tournamentIds.includes(resultId)) return series;
  return { ...series, tournamentIds: [...series.tournamentIds, resultId] };
}

export function removeTournamentFromSeries(series: TournamentSeries, resultId: string): TournamentSeries {
  return { ...series, tournamentIds: series.tournamentIds.filter(id => id !== resultId) };
}

// ---------------------------------------------------------------------------
// Standings Computation
// ---------------------------------------------------------------------------

/** Normalize player name for aggregation (trim + lowercase) */
function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function computeSeriesStandings(
  series: TournamentSeries,
  allResults: TournamentResult[],
): SeriesStanding[] {
  // Filter to only results in this series
  const seriesResultIds = new Set(series.tournamentIds);
  const results = allResults.filter(r => seriesResultIds.has(r.id));

  if (results.length === 0) return [];

  // Aggregate per player
  const map = new Map<string, {
    displayName: string;
    points: number;
    tournaments: number;
    wins: number;
    cashes: number;
    places: number[];
    totalCost: number;
    totalPayout: number;
    netBalance: number;
    knockouts: number;
  }>();

  for (const result of results) {
    for (const player of result.players) {
      const key = normalizeName(player.name);
      let entry = map.get(key);
      if (!entry) {
        entry = {
          displayName: player.name,
          points: 0,
          tournaments: 0,
          wins: 0,
          cashes: 0,
          places: [],
          totalCost: 0,
          totalPayout: 0,
          netBalance: 0,
          knockouts: 0,
        };
        map.set(key, entry);
      }

      // Points from point system
      const pointEntry = series.pointSystem.entries.find(e => e.place === player.place);
      entry.points += pointEntry?.points ?? 0;

      entry.tournaments += 1;
      if (player.place === 1) entry.wins += 1;
      if (player.payout > 0) entry.cashes += 1;
      entry.places.push(player.place);

      // Financial
      const rebuyCost = result.rebuyCost ?? result.buyIn;
      const addOnCost = result.addOnCost ?? result.buyIn;
      const cost = result.buyIn + (player.rebuys * rebuyCost) + (player.addOn ? addOnCost : 0);
      entry.totalCost += cost;
      entry.totalPayout += player.payout;
      entry.netBalance += player.netBalance;
      entry.knockouts += player.knockouts;
    }
  }

  // Convert to standings
  const standings: SeriesStanding[] = [];
  for (const entry of map.values()) {
    const avgPlace = entry.places.length > 0
      ? entry.places.reduce((a, b) => a + b, 0) / entry.places.length
      : 0;
    const bestPlace = entry.places.length > 0
      ? Math.min(...entry.places)
      : 0;

    const qualified = series.minTournaments
      ? entry.tournaments >= series.minTournaments
      : true;

    standings.push({
      name: entry.displayName,
      points: entry.points,
      tournaments: entry.tournaments,
      wins: entry.wins,
      cashes: entry.cashes,
      avgPlace: Math.round(avgPlace * 100) / 100,
      bestPlace,
      totalCost: entry.totalCost,
      totalPayout: entry.totalPayout,
      netBalance: entry.netBalance,
      knockouts: entry.knockouts,
      rank: 0, // assigned below
      qualified,
    });
  }

  // Sort by ranking mode
  standings.sort((a, b) => {
    // Qualified first
    if (a.qualified !== b.qualified) return a.qualified ? -1 : 1;

    switch (series.rankingMode) {
      case 'points':
        if (b.points !== a.points) return b.points - a.points;
        return a.avgPlace - b.avgPlace; // tiebreaker
      case 'netBalance':
        return b.netBalance - a.netBalance;
      case 'avgPlace':
        if (a.avgPlace !== b.avgPlace) return a.avgPlace - b.avgPlace;
        return b.points - a.points; // tiebreaker
      default:
        return b.points - a.points;
    }
  });

  // Assign ranks
  standings.forEach((s, i) => { s.rank = i + 1; });

  return standings;
}

// ---------------------------------------------------------------------------
// Text Export
// ---------------------------------------------------------------------------

export function formatSeriesStandingsAsText(
  series: TournamentSeries,
  standings: SeriesStanding[],
): string {
  const lines: string[] = [];
  lines.push(`\u{1F3C6} ${series.name}`);
  lines.push(`${series.startDate}${series.endDate ? ` \u2013 ${series.endDate}` : ''}`);
  lines.push('');

  const medals = ['\u{1F3C6}', '\u{1F948}', '\u{1F949}'];
  for (const s of standings) {
    const medal = s.rank <= 3 ? medals[s.rank - 1] : `${s.rank}.`;
    const qualified = s.qualified ? '' : ' (*)';
    lines.push(`${medal} ${s.name}: ${s.points} Pts, ${s.tournaments} T, \u00D8 ${s.avgPlace.toFixed(1)}${qualified}`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

export function formatSeriesStandingsAsCSV(
  series: TournamentSeries,
  standings: SeriesStanding[],
): string {
  void series; // included for API consistency
  const headers = ['Rank', 'Name', 'Points', 'Tournaments', 'Wins', 'Cashes', 'Avg Place', 'Best Place', 'Cost', 'Payout', 'Net Balance', 'KO', 'Qualified'];
  const rows = standings.map(s => [
    s.rank,
    csvSafe(s.name),
    s.points,
    s.tournaments,
    s.wins,
    s.cashes,
    s.avgPlace.toFixed(2),
    s.bestPlace,
    s.totalCost.toFixed(2),
    s.totalPayout.toFixed(2),
    s.netBalance.toFixed(2),
    s.knockouts,
    s.qualified ? 'Y' : 'N',
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// JSON Export/Import
// ---------------------------------------------------------------------------

export interface SeriesExport {
  version: 1;
  series: TournamentSeries;
  results: TournamentResult[];
  exportedAt: string;
}

export function exportSeriesToJSON(series: TournamentSeries, allResults: TournamentResult[]): string {
  const seriesResultIds = new Set(series.tournamentIds);
  const results = allResults.filter(r => seriesResultIds.has(r.id));
  const data: SeriesExport = {
    version: 1,
    series,
    results,
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function parseSeriesFile(json: string): SeriesExport | null {
  try {
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object') return null;
    if (data.version !== 1) return null;
    if (!data.series || !data.series.id || !data.series.name) return null;
    if (!Array.isArray(data.series.tournamentIds)) return null;
    return data as SeriesExport;
  } catch {
    return null;
  }
}
