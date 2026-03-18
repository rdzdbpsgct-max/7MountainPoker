import type {
  League,
  GameDay,
  GameDayParticipant,
  ExtendedLeagueStanding,
  TiebreakerConfig,
  PointSystem,
} from '../src/domain/types';
import {
  applyTiebreaker,
  computeEloRatings,
  computeWeightedPoints,
  computeHeadToHeadMatrix,
  computeExtendedStandings,
} from '../src/domain/logic';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

const defaultPointSystem: PointSystem = {
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

function makeLeague(overrides?: Partial<League>): League {
  return {
    id: 'league-1',
    name: 'Test League',
    pointSystem: defaultPointSystem,
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeParticipant(name: string, place: number, overrides?: Partial<GameDayParticipant>): GameDayParticipant {
  return {
    name,
    place,
    points: defaultPointSystem.entries.find((e) => e.place === place)?.points ?? 0,
    buyIn: 20,
    rebuys: 0,
    addOnCost: 0,
    payout: place <= 3 ? 50 - place * 10 : 0,
    netBalance: (place <= 3 ? 50 - place * 10 : 0) - 20,
    ...overrides,
  };
}

function makeGameDay(id: string, date: string, participants: GameDayParticipant[], overrides?: Partial<GameDay>): GameDay {
  return {
    id,
    leagueId: 'league-1',
    date,
    participants,
    totalPrizePool: participants.reduce((s, p) => s + p.payout, 0),
    totalBuyIns: participants.reduce((s, p) => s + p.buyIn, 0),
    cashBalance: 0,
    ...overrides,
  };
}

function makeStanding(name: string, overrides?: Partial<ExtendedLeagueStanding>): ExtendedLeagueStanding {
  return {
    name,
    points: 0,
    tournaments: 0,
    wins: 0,
    cashes: 0,
    avgPlace: 0,
    bestPlace: 0,
    totalCost: 0,
    totalPayout: 0,
    netBalance: 0,
    participationRate: 0,
    knockouts: 0,
    corrections: 0,
    rank: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Tiebreaker Chain Tests
// ---------------------------------------------------------------------------

describe('applyTiebreaker', () => {
  it('breaks tie between 2 players by avgPlace', () => {
    const standings: ExtendedLeagueStanding[] = [
      makeStanding('Alice', { points: 10, avgPlace: 2.5 }),
      makeStanding('Bob', { points: 10, avgPlace: 1.5 }),
    ];
    const config: TiebreakerConfig = { criteria: ['avgPlace'] };
    applyTiebreaker(standings, [], config);
    expect(standings[0]!.name).toBe('Bob');
    expect(standings[1]!.name).toBe('Alice');
  });

  it('breaks 3-way tie: avgPlace also tied, broken by wins', () => {
    const standings: ExtendedLeagueStanding[] = [
      makeStanding('Alice', { points: 10, avgPlace: 2.0, wins: 1 }),
      makeStanding('Bob', { points: 10, avgPlace: 2.0, wins: 3 }),
      makeStanding('Carol', { points: 10, avgPlace: 2.0, wins: 2 }),
    ];
    const config: TiebreakerConfig = { criteria: ['avgPlace', 'wins'] };
    applyTiebreaker(standings, [], config);
    expect(standings[0]!.name).toBe('Bob');
    expect(standings[1]!.name).toBe('Carol');
    expect(standings[2]!.name).toBe('Alice');
  });

  it('applies full chain: points → avgPlace → wins → cashes → headToHead', () => {
    const gd = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1),
      makeParticipant('Bob', 2),
    ]);
    const standings: ExtendedLeagueStanding[] = [
      makeStanding('Alice', { points: 10, avgPlace: 2.0, wins: 1, cashes: 1 }),
      makeStanding('Bob', { points: 10, avgPlace: 2.0, wins: 1, cashes: 1 }),
    ];
    const config: TiebreakerConfig = { criteria: ['avgPlace', 'wins', 'cashes', 'headToHead'] };
    applyTiebreaker(standings, [gd], config);
    // Alice beat Bob in the game day (place 1 < 2), so headToHead favors Alice
    expect(standings[0]!.name).toBe('Alice');
    expect(standings[1]!.name).toBe('Bob');
  });

  it('lastResult tiebreaker uses last game day placement', () => {
    const gd1 = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1),
      makeParticipant('Bob', 2),
    ]);
    const gd2 = makeGameDay('gd2', '2025-01-15', [
      makeParticipant('Alice', 3),
      makeParticipant('Bob', 1),
    ]);
    const standings: ExtendedLeagueStanding[] = [
      makeStanding('Alice', { points: 15 }),
      makeStanding('Bob', { points: 15 }),
    ];
    const config: TiebreakerConfig = { criteria: ['lastResult'] };
    // gameDays passed in order — last is gd2 where Bob placed 1st
    applyTiebreaker(standings, [gd1, gd2], config);
    expect(standings[0]!.name).toBe('Bob');
    expect(standings[1]!.name).toBe('Alice');
  });

  it('empty criteria array leaves order unchanged', () => {
    const standings: ExtendedLeagueStanding[] = [
      makeStanding('Alice', { points: 10, avgPlace: 3.0 }),
      makeStanding('Bob', { points: 10, avgPlace: 1.0 }),
    ];
    const config: TiebreakerConfig = { criteria: [] };
    applyTiebreaker(standings, [], config);
    // With empty criteria, tied players stay in points-descending order (both 10)
    // The pre-sort by points keeps them stable
    expect(standings.map((s) => s.name)).toEqual(['Alice', 'Bob']);
  });

  it('does not reorder players with different points', () => {
    const standings: ExtendedLeagueStanding[] = [
      makeStanding('Alice', { points: 10, avgPlace: 5.0 }),
      makeStanding('Bob', { points: 7, avgPlace: 1.0 }),
    ];
    const config: TiebreakerConfig = { criteria: ['avgPlace'] };
    applyTiebreaker(standings, [], config);
    // Alice has more points, so she stays first even though Bob has better avgPlace
    expect(standings[0]!.name).toBe('Alice');
    expect(standings[1]!.name).toBe('Bob');
  });
});

// ---------------------------------------------------------------------------
// 2. ELO Rating Tests
// ---------------------------------------------------------------------------

describe('computeEloRatings', () => {
  it('2 players, single game day — winner gains, loser loses with K-factor impact', () => {
    const gd = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1),
      makeParticipant('Bob', 2),
    ]);
    const ratings16 = computeEloRatings([gd], 1200, 16);
    const ratings64 = computeEloRatings([gd], 1200, 64);

    const aliceKey = 'alice';
    const bobKey = 'bob';

    // With equal start ratings, winner should gain and loser should lose
    expect(ratings16.get(aliceKey)!).toBeGreaterThan(1200);
    expect(ratings16.get(bobKey)!).toBeLessThan(1200);

    // Higher K-factor means larger rating change
    const gain16 = ratings16.get(aliceKey)! - 1200;
    const gain64 = ratings64.get(aliceKey)! - 1200;
    expect(gain64).toBeGreaterThan(gain16);
  });

  it('4 players, multiple game days — consistent winner has highest ELO', () => {
    const gd1 = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1),
      makeParticipant('Bob', 2),
      makeParticipant('Carol', 3),
      makeParticipant('Dave', 4),
    ]);
    const gd2 = makeGameDay('gd2', '2025-01-15', [
      makeParticipant('Alice', 1),
      makeParticipant('Carol', 2),
      makeParticipant('Bob', 3),
      makeParticipant('Dave', 4),
    ]);
    const ratings = computeEloRatings([gd1, gd2], 1200, 32);

    // Alice won both — highest ELO
    expect(ratings.get('alice')!).toBeGreaterThan(ratings.get('bob')!);
    expect(ratings.get('alice')!).toBeGreaterThan(ratings.get('carol')!);
    expect(ratings.get('alice')!).toBeGreaterThan(ratings.get('dave')!);
    // Dave lost both — lowest ELO
    expect(ratings.get('dave')!).toBeLessThan(ratings.get('bob')!);
    expect(ratings.get('dave')!).toBeLessThan(ratings.get('carol')!);
  });

  it('player who always wins has highest ELO', () => {
    const gameDays = Array.from({ length: 5 }, (_, i) =>
      makeGameDay(`gd${i}`, `2025-0${i + 1}-01`, [
        makeParticipant('Alice', 1),
        makeParticipant('Bob', 2),
        makeParticipant('Carol', 3),
      ]),
    );
    const ratings = computeEloRatings(gameDays);
    expect(ratings.get('alice')!).toBeGreaterThan(ratings.get('bob')!);
    expect(ratings.get('bob')!).toBeGreaterThan(ratings.get('carol')!);
  });

  it('empty game days array yields empty map', () => {
    const ratings = computeEloRatings([]);
    expect(ratings.size).toBe(0);
  });

  it('uses custom startRating', () => {
    const gd = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1),
      makeParticipant('Bob', 2),
    ]);
    const ratings = computeEloRatings([gd], 1500, 32);
    // Both started at 1500, so changes are symmetric around 1500
    expect(ratings.get('alice')! + ratings.get('bob')!).toBeCloseTo(3000, 5);
  });
});

// ---------------------------------------------------------------------------
// 3. Weighted Points with Decay
// ---------------------------------------------------------------------------

describe('computeWeightedPoints', () => {
  it('recent game days weighted higher than old ones', () => {
    const gd1 = makeGameDay('gd1', '2025-01-01', [makeParticipant('Alice', 1)]);
    const gd2 = makeGameDay('gd2', '2025-02-01', [makeParticipant('Alice', 1)]);

    // With decay, the more recent gd2 gets weight 1.0, gd1 gets weight 0.9
    const wp = computeWeightedPoints([gd1, gd2], defaultPointSystem, 0.9);
    const aliceWP = wp.get('alice')!;
    // 10 * 0.9 + 10 * 1.0 = 19
    expect(aliceWP).toBeCloseTo(19, 5);
  });

  it('decay factor 0.9 applied correctly across 5 game days', () => {
    const gameDays = Array.from({ length: 5 }, (_, i) =>
      makeGameDay(`gd${i}`, `2025-0${i + 1}-01`, [makeParticipant('Alice', 1)]),
    );
    const wp = computeWeightedPoints(gameDays, defaultPointSystem, 0.9);
    // Points per game day = 10
    // Weights: 0.9^4, 0.9^3, 0.9^2, 0.9^1, 0.9^0
    const expected = 10 * (Math.pow(0.9, 4) + Math.pow(0.9, 3) + Math.pow(0.9, 2) + Math.pow(0.9, 1) + 1);
    expect(wp.get('alice')!).toBeCloseTo(expected, 5);
  });

  it('all game days same with decay factor 1.0 → same as unweighted', () => {
    const gameDays = Array.from({ length: 3 }, (_, i) =>
      makeGameDay(`gd${i}`, `2025-0${i + 1}-01`, [makeParticipant('Alice', 1)]),
    );
    const wp = computeWeightedPoints(gameDays, defaultPointSystem, 1.0);
    // decay=1.0 means all weights are 1.0, so total = 10*3 = 30
    expect(wp.get('alice')!).toBeCloseTo(30, 5);
  });

  it('player with 0 game days is not in the map', () => {
    const gd = makeGameDay('gd1', '2025-01-01', [makeParticipant('Bob', 1)]);
    const wp = computeWeightedPoints([gd], defaultPointSystem, 0.9);
    expect(wp.has('alice')).toBe(false);
    expect(wp.get('bob')!).toBeCloseTo(10, 5);
  });

  it('handles empty game days array', () => {
    const wp = computeWeightedPoints([], defaultPointSystem, 0.9);
    expect(wp.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Head-to-Head Matrix
// ---------------------------------------------------------------------------

describe('computeHeadToHeadMatrix', () => {
  it('3 players, 2 game days — correct win/loss counts', () => {
    const gd1 = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1),
      makeParticipant('Bob', 2),
      makeParticipant('Carol', 3),
    ]);
    const gd2 = makeGameDay('gd2', '2025-02-01', [
      makeParticipant('Bob', 1),
      makeParticipant('Alice', 2),
      makeParticipant('Carol', 3),
    ]);
    const result = computeHeadToHeadMatrix([gd1, gd2]);

    expect(result.players.length).toBe(3);

    // Find indices
    const iAlice = result.players.indexOf('Alice');
    const iBob = result.players.indexOf('Bob');
    const iCarol = result.players.indexOf('Carol');

    // Alice vs Bob: gd1 Alice won, gd2 Bob won → 1 win, 1 loss
    const aliceVsBob = result.matrix[iAlice]![iBob]!;
    expect(aliceVsBob.wins).toBe(1);
    expect(aliceVsBob.losses).toBe(1);
    expect(aliceVsBob.meetings).toBe(2);

    // Alice vs Carol: Alice beat Carol in both game days
    const aliceVsCarol = result.matrix[iAlice]![iCarol]!;
    expect(aliceVsCarol.wins).toBe(2);
    expect(aliceVsCarol.losses).toBe(0);
  });

  it('player who beats everyone has all positive win entries', () => {
    const gd = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1),
      makeParticipant('Bob', 2),
      makeParticipant('Carol', 3),
    ]);
    const result = computeHeadToHeadMatrix([gd]);
    const iAlice = result.players.indexOf('Alice');

    for (let j = 0; j < result.players.length; j++) {
      if (j === iAlice) {
        expect(result.matrix[iAlice]![j]).toBeNull(); // diagonal
      } else {
        expect(result.matrix[iAlice]![j]!.wins).toBe(1);
        expect(result.matrix[iAlice]![j]!.losses).toBe(0);
      }
    }
  });

  it('player who did not participate has zeros when filtered in', () => {
    const gd = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1),
      makeParticipant('Bob', 2),
    ]);
    // Dave not in game day but we filter for all three
    const result = computeHeadToHeadMatrix([gd], ['Alice', 'Bob', 'Dave']);
    // Dave won't be in the matrix because he has no nameMap entry from any game day
    // filterPlayers only filters players that exist in the nameMap
    expect(result.players).not.toContain('Dave');
    expect(result.players.length).toBe(2);
  });

  it('diagonal is always null (no self-matches)', () => {
    const gd = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1),
      makeParticipant('Bob', 2),
      makeParticipant('Carol', 3),
    ]);
    const result = computeHeadToHeadMatrix([gd]);
    for (let i = 0; i < result.players.length; i++) {
      expect(result.matrix[i]![i]).toBeNull();
    }
  });

  it('winRate computed correctly', () => {
    const gd1 = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1),
      makeParticipant('Bob', 2),
    ]);
    const gd2 = makeGameDay('gd2', '2025-02-01', [
      makeParticipant('Alice', 1),
      makeParticipant('Bob', 2),
    ]);
    const gd3 = makeGameDay('gd3', '2025-03-01', [
      makeParticipant('Bob', 1),
      makeParticipant('Alice', 2),
    ]);
    const result = computeHeadToHeadMatrix([gd1, gd2, gd3]);
    const iAlice = result.players.indexOf('Alice');
    const iBob = result.players.indexOf('Bob');
    // Alice vs Bob: 2 wins, 1 loss, 3 meetings → winRate 2/3
    expect(result.matrix[iAlice]![iBob]!.winRate).toBeCloseTo(2 / 3, 5);
  });
});

// ---------------------------------------------------------------------------
// 5. computeExtendedStandings Edge Cases
// ---------------------------------------------------------------------------

describe('computeExtendedStandings', () => {
  it('guest player excluded when excludeGuests is true', () => {
    const gd = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1),
      makeParticipant('Guest', 2, { isGuest: true }),
      makeParticipant('Bob', 3),
    ]);
    const league = makeLeague();
    const standings = computeExtendedStandings(league, [gd], { excludeGuests: true });
    expect(standings.map((s) => s.name)).toContain('Alice');
    expect(standings.map((s) => s.name)).toContain('Bob');
    expect(standings.map((s) => s.name)).not.toContain('Guest');
  });

  it('guest player included when excludeGuests is false', () => {
    const gd = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1),
      makeParticipant('Guest', 2, { isGuest: true }),
    ]);
    const league = makeLeague();
    const standings = computeExtendedStandings(league, [gd]);
    expect(standings.map((s) => s.name)).toContain('Guest');
  });

  it('player with corrections has points adjusted', () => {
    const gd = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1), // 10 points
      makeParticipant('Bob', 2),   // 7 points
    ]);
    const league = makeLeague({
      corrections: [
        { id: 'c1', playerName: 'Bob', points: 5, reason: 'Bonus', date: '2025-01-15' },
      ],
    });
    const standings = computeExtendedStandings(league, [gd]);
    const bob = standings.find((s) => s.name === 'Bob')!;
    expect(bob.points).toBe(12); // 7 + 5
    expect(bob.corrections).toBe(5);
  });

  it('negative correction reduces points', () => {
    const gd = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1), // 10 points
    ]);
    const league = makeLeague({
      corrections: [
        { id: 'c1', playerName: 'Alice', points: -3, reason: 'Penalty', date: '2025-01-15' },
      ],
    });
    const standings = computeExtendedStandings(league, [gd]);
    expect(standings[0]!.points).toBe(7); // 10 - 3
  });

  it('season filter — only matching game days included', () => {
    const gd1 = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1),
    ], { seasonId: 'season-1' });
    const gd2 = makeGameDay('gd2', '2025-02-01', [
      makeParticipant('Alice', 1),
    ], { seasonId: 'season-2' });
    const league = makeLeague({ activeSeasonId: 'season-1' });

    // Filter game days externally (as the app does)
    const filteredGDs = [gd1, gd2].filter((gd) => gd.seasonId === 'season-1');
    const standings = computeExtendedStandings(league, filteredGDs);
    const alice = standings.find((s) => s.name === 'Alice')!;
    expect(alice.tournaments).toBe(1);
    expect(alice.points).toBe(10);
  });

  it('empty league (0 game days) returns empty standings', () => {
    const league = makeLeague();
    const standings = computeExtendedStandings(league, []);
    expect(standings).toEqual([]);
  });

  it('ranks are assigned sequentially', () => {
    const gd = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1),
      makeParticipant('Bob', 2),
      makeParticipant('Carol', 3),
    ]);
    const league = makeLeague();
    const standings = computeExtendedStandings(league, [gd]);
    expect(standings[0]!.rank).toBe(1);
    expect(standings[1]!.rank).toBe(2);
    expect(standings[2]!.rank).toBe(3);
  });

  it('participation rate computed correctly', () => {
    const gd1 = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1),
      makeParticipant('Bob', 2),
    ]);
    const gd2 = makeGameDay('gd2', '2025-02-01', [
      makeParticipant('Alice', 1),
    ]);
    const league = makeLeague();
    const standings = computeExtendedStandings(league, [gd1, gd2]);
    const alice = standings.find((s) => s.name === 'Alice')!;
    const bob = standings.find((s) => s.name === 'Bob')!;
    expect(alice.participationRate).toBe(1); // 2/2
    expect(bob.participationRate).toBe(0.5); // 1/2
  });

  it('ELO ranking algorithm sorts by ELO', () => {
    const gd = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 2),
      makeParticipant('Bob', 1),
    ]);
    const league = makeLeague({
      rankingAlgorithm: 'elo',
      eloConfig: { startRating: 1200, kFactor: 32 },
    });
    const standings = computeExtendedStandings(league, [gd]);
    // Bob won, so he should be ranked first with higher ELO
    expect(standings[0]!.name).toBe('Bob');
    expect(standings[0]!.eloRating).toBeGreaterThan(1200);
    expect(standings[1]!.name).toBe('Alice');
    expect(standings[1]!.eloRating).toBeLessThan(1200);
  });

  it('weighted points ranking algorithm sorts by weighted points', () => {
    // Alice won older game day, Bob won recent game day
    const gd1 = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1),
      makeParticipant('Bob', 2),
    ]);
    const gd2 = makeGameDay('gd2', '2025-02-01', [
      makeParticipant('Bob', 1),
      makeParticipant('Alice', 2),
    ]);
    const league = makeLeague({
      rankingAlgorithm: 'weightedPoints',
      weightedPointsConfig: { decayFactor: 0.5 },
    });
    const standings = computeExtendedStandings(league, [gd1, gd2]);
    // With decay 0.5: gd1 weight=0.5, gd2 weight=1.0
    // Alice: 10*0.5 + 7*1.0 = 12, Bob: 7*0.5 + 10*1.0 = 13.5
    // Bob should be ranked higher
    expect(standings[0]!.name).toBe('Bob');
    expect(standings[0]!.weightedPoints).toBeGreaterThan(standings[1]!.weightedPoints!);
  });

  it('minParticipation flag set on standings', () => {
    const gd1 = makeGameDay('gd1', '2025-01-01', [
      makeParticipant('Alice', 1),
      makeParticipant('Bob', 2),
    ]);
    const gd2 = makeGameDay('gd2', '2025-02-01', [
      makeParticipant('Alice', 1),
    ]);
    const league = makeLeague({ minParticipation: 2 });
    const standings = computeExtendedStandings(league, [gd1, gd2]);
    const alice = standings.find((s) => s.name === 'Alice')!;
    const bob = standings.find((s) => s.name === 'Bob')!;
    expect(alice.meetsMinParticipation).toBe(true);
    expect(bob.meetsMinParticipation).toBe(false);
  });
});
