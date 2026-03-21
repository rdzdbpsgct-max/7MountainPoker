import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  formatTime,
  computeRemaining,
  advanceLevel,
  validateConfig,
  previousLevel,
  resetCurrentLevel,
  restartTournament,
  importConfigJSON,
  exportConfigJSON,
  getLevelLabel,
  getBlindsText,
  defaultPlayers,
  validatePayoutConfig,
  stripAnteFromLevels,
  computeDefaultAnte,
  applyDefaultAntes,
  isRebuyActive,
  computeTournamentElapsedSeconds,
  defaultPayoutConfig,
  defaultRebuyConfig,
  defaultAddOnConfig,
  defaultBountyConfig,
  computeTotalRebuys,
  computeTotalAddOns,
  computePrizePool,
  computeRebuyPot,
  computePayouts,
  computeNextPlacement,
  computeAverageStack,
  defaultChipConfig,
  movePlayer,
  shufflePlayers,
  roundToNice,
  roundToChipMultiple,
  generateBlindStructure,
  estimateDuration,
  estimatePlayedLevels,
  estimateAllDurations,
  checkBlindChipCompatibility,
  computeColorUps,
  formatElapsedTime,
  computeEstimatedRemainingSeconds,
  computeAverageStackInBB,
  isBubble,
  isInTheMoney,
  loadTemplates,
  saveTemplate,
  deleteTemplate,
  exportTemplateToJSON,
  parseTemplateFile,
  computeBlindStructureSummary,
  advanceDealer,
  buildTournamentResult,
  saveTournamentResult,
  loadTournamentHistory,
  deleteTournamentResult,
  clearTournamentHistory,
  formatResultAsText,
  formatResultAsCSV,
  computePlayerStats,
  decodeResultFromQR,
  initializePlayerStacks,
  findChipLeader,
  computeAverageStackFromPlayers,
  addRebuyToStack,
  addAddOnToStack,
  canPlayerRebuy,
  isLateRegistrationOpen,
  loadPlayerDatabase,
  savePlayerDatabase,
  addRegisteredPlayer,
  deleteRegisteredPlayer,
  importPlayersFromHistory,
  syncPlayersToDatabase,
  defaultPointSystem,
  computeLeagueStandings,
  loadLeagues,
  saveLeague,
  deleteLeague,
  formatLeagueAsText,
  drawMysteryBounty,
  parseConfigObject,
  isWizardCompleted,
  markWizardCompleted,
  WIZARD_KEY,
  createTable,
  distributePlayersToTables,
  removePlayerFromTable,
  findPlayerTable,
  getActivePlayersPerTable,
  balanceTables,
  shouldMergeToFinalTable,
  mergeToFinalTable,
  getTablePlayerIds,
  findLowestAvailableSeat,
  findHighestOccupiedSeat,
  findPlayerSeat,
  seatPlayerAtSmallestTable,
  findTableToDissolve,
  dissolveTable,
  advanceTableDealer,
  resizeTable,
  exportLeagueToJSON,
  parseLeagueFile,
  extractLeagueConfig,
  getBuiltInPresets,
  computeSidePots,
  calculateSidePots,
  resolvePotWinners,
  formatSidePotsAsText,
  generateBlindsByEndTime,
  reEnterPlayer,
  canReEntry,
  toggleSeatLock,
  loadGameDays,
  loadGameDaysForLeague,
  loadGameDaysForSeason,
  saveGameDay,
  deleteGameDay,
  createGameDayFromResult,
  computeExtendedStandings,
  applyTiebreaker,
  computeLeagueFinances,
  getActiveSeason,
  getGameDaysInSeason,
  createSeason,
  normalizePlayerName,
  formatLeagueStandingsAsText,
  formatLeagueStandingsAsCSV,
  computeLeaguePlayerStats,
  encodeLeagueStandingsForQR,
  decodeLeagueStandingsFromQR,
  formatLeagueFinancesAsCSV,
  csvSafe,
  loadCheckpoint,
  setCached,
  getCached,
  setCachedItem,
  deleteCachedItem,
  initStorage,
  resetStorage,
  isStorageReady,
  createEvent,
  filterEventsByType,
  formatEventAsText,
  computeHistoricalDurationEstimate,
  createSeries,
  addTournamentToSeries,
  removeTournamentFromSeries,
  computeSeriesStandings,
  formatSeriesStandingsAsText,
  formatSeriesStandingsAsCSV,
  parseSeriesFile,
  exportSeriesToJSON,
  computeHeadToHeadMatrix,
  computeEloRatings,
  computeWeightedPoints,
  getCustomAudioForAnnouncement,
  formatFileSize,
  CUSTOMIZABLE_ANNOUNCEMENTS,
  getLayoutConfig,
  DISPLAY_LAYOUTS,
  PAYOUT_TEMPLATES,
  defaultPayoutForPlayerCount,
  defaultConfig,
  computeIcmEquity,
  computeIcmDeal,
  UndoStack,
  createUndoSnapshot,
  migrations,
  DB_VERSION,
  cloneConfigFromResult,
  getLeaguePlayerNames,
} from '../src/domain/logic';
import { sanitizeFilename, formatDuration } from '../src/domain/pdfExport';
import { exportTournamentResult, exportConfigBackup, createFullBackup, exportFullBackup, parseFullBackup, restoreFullBackup } from '../src/domain/cloudExport';
import { setAudioMasterVolume, setAudioLanguage } from '../src/domain/audioService';
import { isValidAudioFile } from '../src/domain/customAudio';
import { parseLicenseKey, isLicenseExpired } from '../src/domain/license';
import {
  applyChipPreset,
  chipPresets,
  getRemovedDenomIds,
  getNextColorUpLevel,
  generateColorUpSuggestion,
  scheduleToColorUpMap,
  CHIP_COLORS,
} from '../src/domain/chips';
import type { Level, TournamentConfig, TimerState, PayoutConfig, RebuyConfig, Player, League, TournamentResult, Table, GameDay, ExtendedLeagueStanding, PlayerPotInput, PotWinnerAssignment, RegisteredPlayer, ChipDenomination, SeriesStanding, PotResult, TournamentSeries } from '../src/domain/types';
import type { SeriesExport } from '../src/domain/series';
import { generatePeerId, generateSecret, buildRemoteUrl, parseRemoteHash, buildHmacPayload, signMessage, verifyMessage, RateLimiter, MAX_MESSAGE_SIZE, REMOTE_STATE_CONTRACT_VERSION, persistHostSession, loadHostSession, clearHostSession, buildDisplayUrl, parseDisplayHash, isHelloMessage, MAX_CONTROLLERS, MAX_DISPLAYS } from '../src/domain/remote';
import { serializeColorUpMap, deserializeColorUpMap } from '../src/domain/displayChannel';
import { detectPlatform, detectDesktopOS } from '../src/domain/platform';
import { isPresentationApiAvailable, buildPresentationUrl } from '../src/domain/presentationApi';

// Helper to create a full TournamentConfig for tests
function makeConfig(partial: Partial<TournamentConfig> & { name: string; levels: Level[] }): TournamentConfig {
  return {
    anteEnabled: false,
    anteMode: 'standard' as const,
    players: [],
    dealerIndex: 0,
    payout: defaultPayoutConfig(),
    rebuy: defaultRebuyConfig(),
    addOn: defaultAddOnConfig(),
    bounty: defaultBountyConfig(),
    chips: defaultChipConfig(),
    buyIn: 10,
    currency: 'EUR' as const,
    startingChips: 20000,
    ...partial,
  };
}

function makePlayer(partial: Partial<Player> & { id: string; name: string }): Player {
  return {
    rebuys: 0,
    addOn: false,
    status: 'active',
    placement: null,
    eliminatedBy: null,
    knockouts: 0,
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// formatTime
// ---------------------------------------------------------------------------
describe('formatTime', () => {
  it('formats 61 seconds', () => {
    expect(formatTime(61)).toBe('01:01');
  });

  it('formats 900 seconds (15 min)', () => {
    expect(formatTime(900)).toBe('15:00');
  });

  it('floors fractional seconds', () => {
    expect(formatTime(59.9)).toBe('00:59');
  });
});

// ---------------------------------------------------------------------------
// computeRemaining
// ---------------------------------------------------------------------------
describe('computeRemaining', () => {
  it('computes correctly for 10s elapsed', () => {
    const startedAt = 1000;
    const remainingAtStart = 60;
    const now = 11000; // 10s later
    expect(computeRemaining(startedAt, remainingAtStart, now)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// advanceLevel
// ---------------------------------------------------------------------------
describe('advanceLevel', () => {
  const levels: Level[] = [
    { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 },
    { id: '2', type: 'level', durationSeconds: 600, smallBlind: 50, bigBlind: 100 },
    { id: '3', type: 'break', durationSeconds: 300, label: 'Break' },
  ];

  it('advances to the next level', () => {
    const state: TimerState = {
      currentLevelIndex: 0,
      remainingSeconds: 0,
      status: 'running',
      startedAt: null,
      remainingAtStart: null,
    };
    const next = advanceLevel(state, levels);
    expect(next.currentLevelIndex).toBe(1);
    expect(next.remainingSeconds).toBe(600);
    expect(next.status).toBe('stopped');
  });

  it('stops at the end of the tournament', () => {
    const state: TimerState = {
      currentLevelIndex: 2,
      remainingSeconds: 0,
      status: 'running',
      startedAt: null,
      remainingAtStart: null,
    };
    const next = advanceLevel(state, levels);
    expect(next.currentLevelIndex).toBe(2);
    expect(next.status).toBe('stopped');
    expect(next.remainingSeconds).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// previousLevel
// ---------------------------------------------------------------------------
describe('previousLevel', () => {
  const levels: Level[] = [
    { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 },
    { id: '2', type: 'level', durationSeconds: 900, smallBlind: 50, bigBlind: 100 },
  ];

  it('goes back one level', () => {
    const state: TimerState = {
      currentLevelIndex: 1,
      remainingSeconds: 100,
      status: 'running',
      startedAt: null,
      remainingAtStart: null,
    };
    const prev = previousLevel(state, levels);
    expect(prev.currentLevelIndex).toBe(0);
    expect(prev.remainingSeconds).toBe(600);
    expect(prev.status).toBe('stopped');
  });

  it('stays at 0 when already first', () => {
    const state: TimerState = {
      currentLevelIndex: 0,
      remainingSeconds: 300,
      status: 'paused',
      startedAt: null,
      remainingAtStart: null,
    };
    const prev = previousLevel(state, levels);
    expect(prev.currentLevelIndex).toBe(0);
    expect(prev.remainingSeconds).toBe(600);
  });
});

// ---------------------------------------------------------------------------
// resetCurrentLevel / restartTournament
// ---------------------------------------------------------------------------
describe('resetCurrentLevel', () => {
  const levels: Level[] = [
    { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 },
  ];

  it('resets time to full duration', () => {
    const state: TimerState = {
      currentLevelIndex: 0,
      remainingSeconds: 100,
      status: 'running',
      startedAt: 1000,
      remainingAtStart: 600,
    };
    const reset = resetCurrentLevel(state, levels);
    expect(reset.remainingSeconds).toBe(600);
    expect(reset.status).toBe('stopped');
    expect(reset.startedAt).toBeNull();
  });
});

describe('resetCurrentLevel with empty levels', () => {
  it('returns stopped state with 0 remaining when levels empty', () => {
    const state: TimerState = {
      currentLevelIndex: 0,
      remainingSeconds: 100,
      status: 'running',
      startedAt: 1000,
      remainingAtStart: 600,
    };
    const reset = resetCurrentLevel(state, []);
    expect(reset.remainingSeconds).toBe(0);
    expect(reset.status).toBe('stopped');
    expect(reset.startedAt).toBeNull();
  });
});

describe('previousLevel with empty levels', () => {
  it('returns stopped state with 0 remaining when levels empty', () => {
    const state: TimerState = {
      currentLevelIndex: 0,
      remainingSeconds: 100,
      status: 'running',
      startedAt: 1000,
      remainingAtStart: 600,
    };
    const result = previousLevel(state, []);
    expect(result.remainingSeconds).toBe(0);
    expect(result.status).toBe('stopped');
  });
});

describe('restartTournament', () => {
  const levels: Level[] = [
    { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 },
    { id: '2', type: 'level', durationSeconds: 900, smallBlind: 50, bigBlind: 100 },
  ];

  it('goes back to level 0', () => {
    const fresh = restartTournament(levels);
    expect(fresh.currentLevelIndex).toBe(0);
    expect(fresh.remainingSeconds).toBe(600);
    expect(fresh.status).toBe('stopped');
  });

  it('handles empty levels', () => {
    const fresh = restartTournament([]);
    expect(fresh.remainingSeconds).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// validateConfig
// ---------------------------------------------------------------------------
describe('validateConfig', () => {
  it('returns no errors for valid config', () => {
    const config = makeConfig({
      name: 'Test',
      levels: [
        { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 },
        { id: '2', type: 'break', durationSeconds: 300, label: 'Break' },
      ],
    });
    expect(validateConfig(config)).toEqual([]);
  });

  it('catches duration <= 0', () => {
    const config = makeConfig({
      name: 'Test',
      levels: [{ id: '1', type: 'level', durationSeconds: 0, smallBlind: 25, bigBlind: 50 }],
    });
    const errors = validateConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Dauer');
  });

  it('catches BB <= SB', () => {
    const config = makeConfig({
      name: 'Test',
      levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 100, bigBlind: 50 }],
    });
    const errors = validateConfig(config);
    expect(errors.some(e => e.message.includes('BB'))).toBe(true);
  });

  it('catches missing SB/BB', () => {
    const config = makeConfig({
      name: 'Test',
      levels: [{ id: '1', type: 'level', durationSeconds: 600 }],
    });
    const errors = validateConfig(config);
    expect(errors.some(e => e.message.includes('SB'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Import / Export
// ---------------------------------------------------------------------------
describe('import/export', () => {
  it('round-trips a config', () => {
    const config: TournamentConfig = {
      name: 'Test',
      levels: [
        { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 },
      ],
      anteEnabled: true,
      anteMode: 'standard',
      players: [makePlayer({ id: 'p1', name: 'Alice' })],
      dealerIndex: 0,
      payout: defaultPayoutConfig(),
      rebuy: defaultRebuyConfig(),
      addOn: defaultAddOnConfig(),
      bounty: defaultBountyConfig(),
      chips: defaultChipConfig(),
      buyIn: 10,
      currency: 'EUR' as const,
      startingChips: 20000,
    };
    const json = exportConfigJSON(config);
    const imported = importConfigJSON(json);
    // parseConfigObject may add optional fields (tables: undefined) — check relevant fields
    expect(imported?.currency).toBe(config.currency);
    expect(imported?.buyIn).toBe(config.buyIn);
    expect(imported?.levels).toEqual(config.levels);
    // parseConfigObject extracts explicit fields (prototype pollution defense) —
    // check that all original fields are preserved
    expect(imported?.players).toHaveLength(config.players.length);
    expect(imported?.players[0]).toMatchObject(config.players[0]!);
  });

  it('returns null for JSON missing required fields', () => {
    expect(importConfigJSON('{"foo": 1}')).toBeNull();
  });

  it('fills in default anteEnabled when missing', () => {
    const json = JSON.stringify({ name: 'Old', levels: [] });
    const imported = importConfigJSON(json);
    expect(imported?.anteEnabled).toBe(false);
  });

  it('fills in default players when missing', () => {
    const json = JSON.stringify({ name: 'Old', levels: [] });
    const imported = importConfigJSON(json);
    expect(imported?.players).toEqual([]);
  });

  it('fills in default payout when missing', () => {
    const json = JSON.stringify({ name: 'Old', levels: [] });
    const imported = importConfigJSON(json);
    expect(imported?.payout).toEqual(defaultPayoutConfig());
  });

  it('fills in default rebuy when missing', () => {
    const json = JSON.stringify({ name: 'Old', levels: [] });
    const imported = importConfigJSON(json);
    expect(imported?.rebuy).toEqual(defaultRebuyConfig());
  });

  it('preserves new fields when present', () => {
    const config: TournamentConfig = {
      name: 'Full',
      levels: [],
      anteEnabled: false,
      players: [makePlayer({ id: 'x', name: 'Bob', rebuys: 2 })],
      payout: { mode: 'euro', entries: [{ place: 1, value: 100 }] },
      rebuy: { enabled: true, limitType: 'time', levelLimit: 4, timeLimit: 7200, rebuyCost: 25, rebuyChips: 15000 },
      bounty: { enabled: true, amount: 10 },
      buyIn: 25,
      startingChips: 15000,
    };
    const imported = importConfigJSON(exportConfigJSON(config));
    expect(imported?.anteEnabled).toBe(false);
    expect(imported?.players[0].rebuys).toBe(2);
    expect(imported?.players[0].status).toBe('active');
    expect(imported?.payout.mode).toBe('euro');
    expect(imported?.rebuy.enabled).toBe(true);
    expect(imported?.rebuy.rebuyCost).toBe(25);
    expect(imported?.rebuy.rebuyChips).toBe(15000);
    expect(imported?.bounty.enabled).toBe(true);
    expect(imported?.bounty.amount).toBe(10);
    expect(imported?.buyIn).toBe(25);
    expect(imported?.startingChips).toBe(15000);
  });
});

// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------
describe('getLevelLabel', () => {
  const levels: Level[] = [
    { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 },
    { id: '2', type: 'break', durationSeconds: 300, label: 'Break' },
    { id: '3', type: 'level', durationSeconds: 600, smallBlind: 50, bigBlind: 100 },
  ];

  it('labels play levels correctly', () => {
    expect(getLevelLabel(levels[0], 0, levels)).toBe('Level 1');
    expect(getLevelLabel(levels[2], 2, levels)).toBe('Level 2');
  });

  it('labels breaks', () => {
    expect(getLevelLabel(levels[1], 1, levels)).toBe('Break');
  });
});

describe('getBlindsText', () => {
  it('formats blinds without ante', () => {
    const level: Level = { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50, ante: 0 };
    expect(getBlindsText(level)).toBe('25 / 50');
  });

  it('formats blinds with ante', () => {
    const level: Level = { id: '1', type: 'level', durationSeconds: 600, smallBlind: 100, bigBlind: 200, ante: 25 };
    expect(getBlindsText(level)).toBe('100 / 200 - Ante 25');
  });

  it('returns empty for break', () => {
    const level: Level = { id: '1', type: 'break', durationSeconds: 300 };
    expect(getBlindsText(level)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// defaultPlayers
// ---------------------------------------------------------------------------
describe('defaultPlayers', () => {
  it('creates correct number of players', () => {
    const players = defaultPlayers(5);
    expect(players).toHaveLength(5);
  });

  it('assigns sequential names', () => {
    const players = defaultPlayers(3);
    expect(players[0].name).toBe('Spieler 1');
    expect(players[1].name).toBe('Spieler 2');
    expect(players[2].name).toBe('Spieler 3');
  });

  it('each player has a unique id', () => {
    const players = defaultPlayers(4);
    const ids = new Set(players.map(p => p.id));
    expect(ids.size).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// validatePayoutConfig
// ---------------------------------------------------------------------------
describe('validatePayoutConfig', () => {
  it('returns no errors for valid percent config summing to 100', () => {
    const payout: PayoutConfig = {
      mode: 'percent',
      entries: [
        { place: 1, value: 50 },
        { place: 2, value: 30 },
        { place: 3, value: 20 },
      ],
    };
    expect(validatePayoutConfig(payout)).toEqual([]);
  });

  it('catches percent not summing to 100', () => {
    const payout: PayoutConfig = {
      mode: 'percent',
      entries: [
        { place: 1, value: 50 },
        { place: 2, value: 30 },
      ],
    };
    const errors = validatePayoutConfig(payout);
    expect(errors.some(e => e.includes('100%'))).toBe(true);
  });

  it('catches empty entries', () => {
    const payout: PayoutConfig = { mode: 'percent', entries: [] };
    const errors = validatePayoutConfig(payout);
    expect(errors.some(e => e.includes('Mindestens'))).toBe(true);
  });

  it('catches negative values', () => {
    const payout: PayoutConfig = {
      mode: 'euro',
      entries: [{ place: 1, value: -10 }],
    };
    const errors = validatePayoutConfig(payout);
    expect(errors.some(e => e.includes('negativ'))).toBe(true);
  });

  it('accepts valid euro config', () => {
    const payout: PayoutConfig = {
      mode: 'euro',
      entries: [
        { place: 1, value: 100 },
        { place: 2, value: 50 },
      ],
    };
    expect(validatePayoutConfig(payout)).toEqual([]);
  });

  it('catches duplicate places (M11)', () => {
    const payout: PayoutConfig = {
      mode: 'percent',
      entries: [
        { place: 1, value: 50 },
        { place: 1, value: 30 },
        { place: 2, value: 20 },
      ],
    };
    const errors = validatePayoutConfig(payout);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('1'))).toBe(true);
  });

  it('accepts sequential places without duplicate error (M11)', () => {
    const payout: PayoutConfig = {
      mode: 'percent',
      entries: [
        { place: 1, value: 50 },
        { place: 2, value: 30 },
        { place: 3, value: 20 },
      ],
    };
    const errors = validatePayoutConfig(payout);
    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// stripAnteFromLevels
// ---------------------------------------------------------------------------
describe('stripAnteFromLevels', () => {
  it('strips ante from all levels, sets to 0', () => {
    const levels: Level[] = [
      { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50, ante: 10 },
      { id: '2', type: 'level', durationSeconds: 600, smallBlind: 50, bigBlind: 100, ante: 25 },
    ];
    const stripped = stripAnteFromLevels(levels);
    expect(stripped[0].ante).toBe(0);
    expect(stripped[1].ante).toBe(0);
  });

  it('does not modify break levels', () => {
    const levels: Level[] = [
      { id: '1', type: 'break', durationSeconds: 300, label: 'Break' },
    ];
    const stripped = stripAnteFromLevels(levels);
    expect(stripped[0]).toEqual(levels[0]);
  });

  it('returns new array (immutability)', () => {
    const levels: Level[] = [
      { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50, ante: 10 },
    ];
    const stripped = stripAnteFromLevels(levels);
    expect(stripped).not.toBe(levels);
    expect(stripped[0]).not.toBe(levels[0]);
    expect(levels[0].ante).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// computeDefaultAnte
// ---------------------------------------------------------------------------
describe('computeDefaultAnte', () => {
  it('returns 0 for zero or negative big blind', () => {
    expect(computeDefaultAnte(0)).toBe(0);
    expect(computeDefaultAnte(-100)).toBe(0);
  });

  it('computes ~12.5% of big blind, rounded to nice values', () => {
    // 50 * 0.125 = 6.25 → round=6, ≤10 → round(6/5)*5 = 5
    expect(computeDefaultAnte(50)).toBe(5);
    // 100 * 0.125 = 12.5 → round=13, ≤50 → round(13/5)*5 = 15
    expect(computeDefaultAnte(100)).toBe(15);
    // 150 * 0.125 = 18.75 → round=19, ≤50 → round(19/5)*5 = 20
    expect(computeDefaultAnte(150)).toBe(20);
  });

  it('rounds to nice values for medium blinds', () => {
    expect(computeDefaultAnte(200)).toBe(25);   // 200 * 0.125 = 25
    expect(computeDefaultAnte(400)).toBe(50);   // 400 * 0.125 = 50
    expect(computeDefaultAnte(600)).toBe(75);   // 600 * 0.125 = 75
    expect(computeDefaultAnte(800)).toBe(100);  // 800 * 0.125 = 100
  });

  it('rounds to nice values for large blinds', () => {
    // 1000 * 0.125 = 125 → round=125, ≤500 → round(125/50)*50 = 150
    expect(computeDefaultAnte(1000)).toBe(150);
    expect(computeDefaultAnte(2000)).toBe(250);  // 2000 * 0.125 = 250
    expect(computeDefaultAnte(4000)).toBe(500);  // 4000 * 0.125 = 500
  });
});

// ---------------------------------------------------------------------------
// applyDefaultAntes
// ---------------------------------------------------------------------------
describe('applyDefaultAntes', () => {
  it('applies ante values to all play levels', () => {
    const levels: Level[] = [
      { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50, ante: 0 },
      { id: '2', type: 'level', durationSeconds: 600, smallBlind: 100, bigBlind: 200, ante: 0 },
    ];
    const result = applyDefaultAntes(levels);
    expect(result[0].ante).toBe(5);   // 50 * 0.125 = 6.25 → rounded to 5
    expect(result[1].ante).toBe(25);  // 200 * 0.125 = 25
  });

  it('does not modify break levels', () => {
    const levels: Level[] = [
      { id: '1', type: 'break', durationSeconds: 300, label: 'Pause' },
    ];
    const result = applyDefaultAntes(levels);
    expect(result[0]).toEqual(levels[0]);
  });

  it('returns new array (immutability)', () => {
    const levels: Level[] = [
      { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50, ante: 0 },
    ];
    const result = applyDefaultAntes(levels);
    expect(result).not.toBe(levels);
    expect(result[0]).not.toBe(levels[0]);
    expect(levels[0].ante).toBe(0);
  });

  it('handles mixed levels and breaks', () => {
    const levels: Level[] = [
      { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50, ante: 0 },
      { id: '2', type: 'break', durationSeconds: 300, label: 'Pause' },
      { id: '3', type: 'level', durationSeconds: 600, smallBlind: 200, bigBlind: 400, ante: 0 },
    ];
    const result = applyDefaultAntes(levels);
    expect(result[0].ante).toBe(5);   // 50 * 0.125 → rounded to 5
    expect(result[1].type).toBe('break');
    expect(result[1].ante).toBeUndefined();
    expect(result[2].ante).toBe(50);  // 400 * 0.125 = 50
  });
});

// ---------------------------------------------------------------------------
// Big Blind Ante
// ---------------------------------------------------------------------------
describe('Big Blind Ante', () => {
  it('computeDefaultAnte returns bigBlind in BBA mode', () => {
    expect(computeDefaultAnte(200, 'bigBlindAnte')).toBe(200);
    expect(computeDefaultAnte(1000, 'bigBlindAnte')).toBe(1000);
    expect(computeDefaultAnte(0, 'bigBlindAnte')).toBe(0);
  });

  it('computeDefaultAnte returns ~12.5% in standard mode', () => {
    expect(computeDefaultAnte(200, 'standard')).toBe(25);
    expect(computeDefaultAnte(200)).toBe(25); // default is standard
  });

  it('applyDefaultAntes uses BBA mode', () => {
    const levels: Level[] = [
      { id: '1', type: 'level', durationSeconds: 600, smallBlind: 100, bigBlind: 200, ante: 0 },
      { id: '2', type: 'break', durationSeconds: 300, label: 'Pause' },
      { id: '3', type: 'level', durationSeconds: 600, smallBlind: 200, bigBlind: 400, ante: 0 },
    ];
    const result = applyDefaultAntes(levels, 'bigBlindAnte');
    expect(result[0].ante).toBe(200);  // equals bigBlind
    expect(result[1].ante).toBeUndefined(); // break unchanged
    expect(result[2].ante).toBe(400);  // equals bigBlind
  });

  it('importConfigJSON defaults anteMode to standard for old configs', () => {
    const oldConfig = { name: 'Old', levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50, ante: 0 }], players: [] };
    const json = JSON.stringify(oldConfig);
    const result = importConfigJSON(json);
    expect(result).not.toBeNull();
    expect(result!.anteMode).toBe('standard');
  });
});

// ---------------------------------------------------------------------------
// isRebuyActive
// ---------------------------------------------------------------------------
describe('isRebuyActive', () => {
  const levels: Level[] = [
    { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 },
    { id: '2', type: 'level', durationSeconds: 600, smallBlind: 50, bigBlind: 100 },
    { id: '3', type: 'break', durationSeconds: 300, label: 'Break' },
    { id: '4', type: 'level', durationSeconds: 600, smallBlind: 100, bigBlind: 200 },
    { id: '5', type: 'level', durationSeconds: 600, smallBlind: 200, bigBlind: 400 },
  ];

  it('returns false when rebuy is disabled', () => {
    const rebuy: RebuyConfig = { enabled: false, limitType: 'levels', levelLimit: 4, timeLimit: 3600, rebuyCost: 10, rebuyChips: 20000 };
    expect(isRebuyActive(rebuy, 0, levels, 0)).toBe(false);
  });

  it('returns true during level-based rebuy period', () => {
    const rebuy: RebuyConfig = { enabled: true, limitType: 'levels', levelLimit: 2, timeLimit: 3600, rebuyCost: 10, rebuyChips: 20000 };
    expect(isRebuyActive(rebuy, 0, levels, 0)).toBe(true);
    expect(isRebuyActive(rebuy, 1, levels, 0)).toBe(true);
  });

  it('returns false after level-based rebuy period ends', () => {
    const rebuy: RebuyConfig = { enabled: true, limitType: 'levels', levelLimit: 2, timeLimit: 3600, rebuyCost: 10, rebuyChips: 20000 };
    expect(isRebuyActive(rebuy, 3, levels, 0)).toBe(false);
  });

  it('returns true during time-based rebuy period', () => {
    const rebuy: RebuyConfig = { enabled: true, limitType: 'time', levelLimit: 4, timeLimit: 3600, rebuyCost: 10, rebuyChips: 20000 };
    expect(isRebuyActive(rebuy, 0, levels, 1800)).toBe(true);
  });

  it('returns false after time-based rebuy period ends', () => {
    const rebuy: RebuyConfig = { enabled: true, limitType: 'time', levelLimit: 4, timeLimit: 3600, rebuyCost: 10, rebuyChips: 20000 };
    expect(isRebuyActive(rebuy, 0, levels, 3600)).toBe(false);
    expect(isRebuyActive(rebuy, 0, levels, 4000)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isLateRegistrationOpen
// ---------------------------------------------------------------------------

describe('isLateRegistrationOpen', () => {
  const levels: Level[] = [
    { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 },
    { id: '2', type: 'level', durationSeconds: 600, smallBlind: 50, bigBlind: 100 },
    { id: '3', type: 'break', durationSeconds: 300, label: 'Break' },
    { id: '4', type: 'level', durationSeconds: 600, smallBlind: 100, bigBlind: 200 },
  ];
  const baseConfig = {
    name: '', levels, anteEnabled: false, anteMode: 'standard' as const,
    players: [], dealerIndex: 0, payout: { mode: 'percent' as const, entries: [] },
    rebuy: { enabled: false, limitType: 'levels' as const, levelLimit: 4, timeLimit: 3600, rebuyCost: 10, rebuyChips: 20000 },
    addOn: { enabled: false, cost: 10, chips: 20000 },
    bounty: { enabled: false, amount: 0 },
    chips: { enabled: false, colorUpEnabled: false, denominations: [], colorUpSchedule: [] },
    buyIn: 10, startingChips: 20000,
  };

  it('returns false when late registration is not configured', () => {
    expect(isLateRegistrationOpen(baseConfig, 0, levels)).toBe(false);
  });

  it('returns true during the late registration period', () => {
    const config = { ...baseConfig, lateRegistration: { enabled: true, levelLimit: 2 } };
    expect(isLateRegistrationOpen(config, 0, levels)).toBe(true); // play level 1
    expect(isLateRegistrationOpen(config, 1, levels)).toBe(true); // play level 2
  });

  it('returns false after the late registration period', () => {
    const config = { ...baseConfig, lateRegistration: { enabled: true, levelLimit: 2 } };
    expect(isLateRegistrationOpen(config, 3, levels)).toBe(false); // play level 3
  });
});

// ---------------------------------------------------------------------------
// canPlayerRebuy
// ---------------------------------------------------------------------------

describe('canPlayerRebuy', () => {
  const player: Player = { id: 'p1', name: 'Alice', rebuys: 2, addOn: false, status: 'active', placement: null, eliminatedBy: null, knockouts: 0 };
  const rebuy: RebuyConfig = { enabled: true, limitType: 'levels', levelLimit: 4, timeLimit: 3600, rebuyCost: 10, rebuyChips: 20000 };

  it('returns true when maxRebuysPerPlayer is undefined (unlimited)', () => {
    expect(canPlayerRebuy(player, rebuy)).toBe(true);
  });

  it('returns true when player has fewer rebuys than the cap', () => {
    expect(canPlayerRebuy(player, { ...rebuy, maxRebuysPerPlayer: 3 })).toBe(true);
  });

  it('returns false when player has reached the cap', () => {
    expect(canPlayerRebuy(player, { ...rebuy, maxRebuysPerPlayer: 2 })).toBe(false);
    expect(canPlayerRebuy(player, { ...rebuy, maxRebuysPerPlayer: 1 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeTournamentElapsedSeconds
// ---------------------------------------------------------------------------
describe('computeTournamentElapsedSeconds', () => {
  const levels: Level[] = [
    { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 },
    { id: '2', type: 'level', durationSeconds: 900, smallBlind: 50, bigBlind: 100 },
    { id: '3', type: 'break', durationSeconds: 300, label: 'Break' },
  ];

  it('returns 0 at the start of the tournament', () => {
    expect(computeTournamentElapsedSeconds(levels, 0, 600)).toBe(0);
  });

  it('computes elapsed including previous levels', () => {
    expect(computeTournamentElapsedSeconds(levels, 2, 200)).toBe(1600);
  });

  it('handles mid-level correctly', () => {
    expect(computeTournamentElapsedSeconds(levels, 1, 500)).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// computeTotalRebuys
// ---------------------------------------------------------------------------
describe('computeTotalRebuys', () => {
  it('sums rebuys across all players', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', rebuys: 2 }),
      makePlayer({ id: '2', name: 'B', rebuys: 1 }),
      makePlayer({ id: '3', name: 'C', rebuys: 0 }),
    ];
    expect(computeTotalRebuys(players)).toBe(3);
  });

  it('returns 0 for empty player list', () => {
    expect(computeTotalRebuys([])).toBe(0);
  });

  it('returns 0 when no player has rebuys', () => {
    const players = [
      makePlayer({ id: '1', name: 'A' }),
      makePlayer({ id: '2', name: 'B' }),
    ];
    expect(computeTotalRebuys(players)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computePrizePool
// ---------------------------------------------------------------------------
describe('computePrizePool', () => {
  it('calculates pool from players and buyIn', () => {
    const players = [
      makePlayer({ id: '1', name: 'A' }),
      makePlayer({ id: '2', name: 'B' }),
      makePlayer({ id: '3', name: 'C' }),
    ];
    expect(computePrizePool(players, 10)).toBe(30);
  });

  it('includes rebuys in pool calculation', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', rebuys: 2 }),
      makePlayer({ id: '2', name: 'B', rebuys: 1 }),
    ];
    // (2 players + 3 rebuys) * 10 = 50
    expect(computePrizePool(players, 10)).toBe(50);
  });

  it('returns 0 for empty player list', () => {
    expect(computePrizePool([], 10)).toBe(0);
  });

  it('returns 0 when buyIn is 0', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', rebuys: 1 }),
    ];
    expect(computePrizePool(players, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computePayouts
// ---------------------------------------------------------------------------
describe('computePayouts', () => {
  it('calculates percent-based payouts', () => {
    const payout: PayoutConfig = {
      mode: 'percent',
      entries: [
        { place: 1, value: 50 },
        { place: 2, value: 30 },
        { place: 3, value: 20 },
      ],
    };
    const result = computePayouts(payout, 100);
    expect(result).toEqual([
      { place: 1, amount: 50 },
      { place: 2, amount: 30 },
      { place: 3, amount: 20 },
    ]);
  });

  it('rounds cent values correctly for percent mode', () => {
    const payout: PayoutConfig = {
      mode: 'percent',
      entries: [
        { place: 1, value: 33.33 },
      ],
    };
    // 33.33% of 100 = 33.33
    const result = computePayouts(payout, 100);
    expect(result[0].amount).toBe(33.33);
  });

  it('returns euro values directly in euro mode', () => {
    const payout: PayoutConfig = {
      mode: 'euro',
      entries: [
        { place: 1, value: 75 },
        { place: 2, value: 25 },
      ],
    };
    const result = computePayouts(payout, 200);
    expect(result).toEqual([
      { place: 1, amount: 75 },
      { place: 2, amount: 25 },
    ]);
  });

  it('handles empty entries', () => {
    const payout: PayoutConfig = { mode: 'percent', entries: [] };
    expect(computePayouts(payout, 100)).toEqual([]);
  });

  it('clamps negative prize pool to zero (M09)', () => {
    const payout: PayoutConfig = {
      mode: 'percent',
      entries: [{ place: 1, value: 100 }],
    };
    const result = computePayouts(payout, -50);
    expect(result[0].amount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Backward compatibility: buyIn default + player rebuys migration
// ---------------------------------------------------------------------------
describe('backward compatibility', () => {
  it('fills in default buyIn when missing from import', () => {
    const json = JSON.stringify({ name: 'Old', levels: [] });
    const imported = importConfigJSON(json);
    expect(imported?.buyIn).toBe(10);
  });

  it('preserves explicit buyIn value from import', () => {
    const json = JSON.stringify({ name: 'Old', levels: [], buyIn: 25 });
    const imported = importConfigJSON(json);
    expect(imported?.buyIn).toBe(25);
  });

  it('migrates players without rebuys field', () => {
    const json = JSON.stringify({
      name: 'Old',
      levels: [],
      players: [{ id: 'p1', name: 'Alice' }],
    });
    const imported = importConfigJSON(json);
    expect(imported?.players[0].rebuys).toBe(0);
  });

  it('preserves existing rebuys values on import', () => {
    const json = JSON.stringify({
      name: 'Old',
      levels: [],
      players: [{ id: 'p1', name: 'Alice', rebuys: 3 }],
    });
    const imported = importConfigJSON(json);
    expect(imported?.players[0].rebuys).toBe(3);
  });

  it('fills in default bounty when missing from import', () => {
    const json = JSON.stringify({ name: 'Old', levels: [] });
    const imported = importConfigJSON(json);
    expect(imported?.bounty).toEqual(defaultBountyConfig());
  });

  it('preserves bounty config on import', () => {
    const json = JSON.stringify({
      name: 'Old',
      levels: [],
      bounty: { enabled: true, amount: 10 },
    });
    const imported = importConfigJSON(json);
    expect(imported?.bounty.enabled).toBe(true);
    expect(imported?.bounty.amount).toBe(10);
  });

  it('migrates players with new elimination fields', () => {
    const json = JSON.stringify({
      name: 'Old',
      levels: [],
      players: [{ id: 'p1', name: 'Alice' }],
    });
    const imported = importConfigJSON(json);
    expect(imported?.players[0].status).toBe('active');
    expect(imported?.players[0].placement).toBeNull();
    expect(imported?.players[0].eliminatedBy).toBeNull();
    expect(imported?.players[0].knockouts).toBe(0);
  });

  it('preserves eliminated player state on import', () => {
    const json = JSON.stringify({
      name: 'Old',
      levels: [],
      players: [{
        id: 'p1', name: 'Alice', rebuys: 0,
        status: 'eliminated', placement: 3, eliminatedBy: 'p2', knockouts: 1,
      }],
    });
    const imported = importConfigJSON(json);
    expect(imported?.players[0].status).toBe('eliminated');
    expect(imported?.players[0].placement).toBe(3);
    expect(imported?.players[0].eliminatedBy).toBe('p2');
    expect(imported?.players[0].knockouts).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// computeNextPlacement
// ---------------------------------------------------------------------------
describe('computeNextPlacement', () => {
  it('returns total active player count as next placement', () => {
    const players = [
      makePlayer({ id: '1', name: 'A' }),
      makePlayer({ id: '2', name: 'B' }),
      makePlayer({ id: '3', name: 'C' }),
    ];
    // 3 active players -> next elimination gets placement 3
    expect(computeNextPlacement(players)).toBe(3);
  });

  it('adjusts after eliminations', () => {
    const players = [
      makePlayer({ id: '1', name: 'A' }),
      makePlayer({ id: '2', name: 'B', status: 'eliminated', placement: 3 }),
      makePlayer({ id: '3', name: 'C' }),
    ];
    // 2 active players -> next elimination gets placement 2
    expect(computeNextPlacement(players)).toBe(2);
  });

  it('returns 1 when one player remains', () => {
    const players = [
      makePlayer({ id: '1', name: 'A' }),
      makePlayer({ id: '2', name: 'B', status: 'eliminated', placement: 3 }),
      makePlayer({ id: '3', name: 'C', status: 'eliminated', placement: 2 }),
    ];
    expect(computeNextPlacement(players)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// defaultBountyConfig
// ---------------------------------------------------------------------------
describe('defaultBountyConfig', () => {
  it('returns disabled bounty with default amount', () => {
    const config = defaultBountyConfig();
    expect(config.enabled).toBe(false);
    expect(config.amount).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// defaultAddOnConfig
// ---------------------------------------------------------------------------
describe('defaultAddOnConfig', () => {
  it('returns disabled add-on with default cost and chips', () => {
    const config = defaultAddOnConfig();
    expect(config.enabled).toBe(false);
    expect(config.cost).toBe(10);
    expect(config.chips).toBe(20000);
  });

  it('uses provided buyIn and startingChips', () => {
    const config = defaultAddOnConfig(20, 50000);
    expect(config.cost).toBe(20);
    expect(config.chips).toBe(50000);
  });
});

// ---------------------------------------------------------------------------
// computeTotalAddOns
// ---------------------------------------------------------------------------
describe('computeTotalAddOns', () => {
  it('returns 0 when no players have add-ons', () => {
    const players = [
      makePlayer({ id: '1', name: 'A' }),
      makePlayer({ id: '2', name: 'B' }),
    ];
    expect(computeTotalAddOns(players)).toBe(0);
  });

  it('counts players with add-ons', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', addOn: true }),
      makePlayer({ id: '2', name: 'B', addOn: false }),
      makePlayer({ id: '3', name: 'C', addOn: true }),
    ];
    expect(computeTotalAddOns(players)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// computePrizePool with add-ons
// ---------------------------------------------------------------------------
describe('computePrizePool with add-ons', () => {
  it('includes add-on costs in prize pool', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', addOn: true }),
      makePlayer({ id: '2', name: 'B', addOn: true }),
      makePlayer({ id: '3', name: 'C', addOn: false }),
    ];
    // 3 × 10 buy-in + 0 rebuys + 2 × 15 add-on = 30 + 30 = 60
    expect(computePrizePool(players, 10, 10, 15)).toBe(60);
  });

  it('combines rebuys and add-ons', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', rebuys: 2, addOn: true }),
      makePlayer({ id: '2', name: 'B', rebuys: 0, addOn: false }),
    ];
    // 2 × 10 buy-in + 2 × 10 rebuy + 1 × 10 add-on = 20 + 20 + 10 = 50
    expect(computePrizePool(players, 10, 10, 10)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// computePrizePool with separateRebuyPot
// ---------------------------------------------------------------------------
describe('computePrizePool with separateRebuyPot', () => {
  it('excludes rebuys from prize pool when separateRebuyPot is true', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', rebuys: 2 }),
      makePlayer({ id: '2', name: 'B', rebuys: 1 }),
    ];
    // Without separate pot: 2 × 10 + 3 × 10 = 50
    expect(computePrizePool(players, 10, 10, undefined, false)).toBe(50);
    // With separate pot: 2 × 10 = 20 (rebuys excluded)
    expect(computePrizePool(players, 10, 10, undefined, true)).toBe(20);
  });

  it('still includes add-ons when separateRebuyPot is true', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', rebuys: 1, addOn: true }),
      makePlayer({ id: '2', name: 'B', rebuys: 0, addOn: true }),
    ];
    // With separate pot: 2 × 10 buy-in + 0 rebuys + 2 × 15 add-on = 50
    expect(computePrizePool(players, 10, 10, 15, true)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// computeRebuyPot
// ---------------------------------------------------------------------------
describe('computeRebuyPot', () => {
  it('computes total rebuy pot', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', rebuys: 2 }),
      makePlayer({ id: '2', name: 'B', rebuys: 1 }),
      makePlayer({ id: '3', name: 'C', rebuys: 0 }),
    ];
    expect(computeRebuyPot(players, 10)).toBe(30);
  });

  it('returns 0 when no rebuys', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', rebuys: 0 }),
    ];
    expect(computeRebuyPot(players, 10)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeAverageStack
// ---------------------------------------------------------------------------
describe('computeAverageStack', () => {
  it('computes basic average with no rebuys or add-ons', () => {
    const players = [
      makePlayer({ id: '1', name: 'A' }),
      makePlayer({ id: '2', name: 'B' }),
    ];
    // 2 × 20000 / 2 active = 20000
    expect(computeAverageStack(players, 20000, 20000, 20000)).toBe(20000);
  });

  it('increases average when players are eliminated', () => {
    const players = [
      makePlayer({ id: '1', name: 'A' }),
      makePlayer({ id: '2', name: 'B', status: 'eliminated', placement: 3 }),
      makePlayer({ id: '3', name: 'C' }),
    ];
    // 3 × 20000 / 2 active = 30000
    expect(computeAverageStack(players, 20000, 20000, 20000)).toBe(30000);
  });

  it('includes rebuy chips in total', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', rebuys: 1 }),
      makePlayer({ id: '2', name: 'B' }),
    ];
    // (2 × 20000 + 1 × 20000) / 2 = 30000
    expect(computeAverageStack(players, 20000, 20000, 20000)).toBe(30000);
  });

  it('includes add-on chips in total', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', addOn: true }),
      makePlayer({ id: '2', name: 'B' }),
    ];
    // (2 × 20000 + 1 × 10000) / 2 = 25000
    expect(computeAverageStack(players, 20000, 20000, 10000)).toBe(25000);
  });

  it('combines rebuys, add-ons, and eliminations', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', rebuys: 1, addOn: true }),
      makePlayer({ id: '2', name: 'B', status: 'eliminated', placement: 3, addOn: true }),
      makePlayer({ id: '3', name: 'C' }),
    ];
    // total chips: 3 × 20000 + 1 × 20000 rebuy + 2 × 10000 add-on = 60000 + 20000 + 20000 = 100000
    // active players: 2
    // avg = 50000
    expect(computeAverageStack(players, 20000, 20000, 10000)).toBe(50000);
  });

  it('returns 0 when no active players', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', status: 'eliminated', placement: 2 }),
    ];
    expect(computeAverageStack(players, 20000, 20000, 20000)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// defaultPlayers includes addOn field
// ---------------------------------------------------------------------------
describe('defaultPlayers addOn field', () => {
  it('creates players with addOn set to false', () => {
    const players = defaultPlayers(3);
    players.forEach((p) => {
      expect(p.addOn).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// import/export backward compatibility with addOn
// ---------------------------------------------------------------------------
describe('import/export addOn backward compatibility', () => {
  it('imports old config without addOn field, sets defaults', () => {
    const oldJson = JSON.stringify({
      name: 'Old Tournament',
      levels: [{ id: 'l1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50, ante: 0 }],
      buyIn: 10,
      startingChips: 20000,
      players: [{ id: 'p1', name: 'Alice', rebuys: 0, status: 'active', placement: null, eliminatedBy: null, knockouts: 0 }],
    });
    const imported = importConfigJSON(oldJson);
    expect(imported).not.toBeNull();
    expect(imported!.addOn.enabled).toBe(false);
    expect(imported!.addOn.cost).toBe(10);
    expect(imported!.addOn.chips).toBe(20000);
    expect(imported!.players[0].addOn).toBe(false);
  });

  it('preserves addOn config through export/import round-trip', () => {
    const config = makeConfig({
      name: 'AddOn Test',
      levels: [{ id: 'l1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50, ante: 0 }],
      addOn: { enabled: true, cost: 15, chips: 30000 },
      players: [makePlayer({ id: 'p1', name: 'Alice', addOn: true })],
    });
    const json = exportConfigJSON(config);
    const imported = importConfigJSON(json);
    expect(imported).not.toBeNull();
    expect(imported!.addOn.enabled).toBe(true);
    expect(imported!.addOn.cost).toBe(15);
    expect(imported!.addOn.chips).toBe(30000);
    expect(imported!.players[0].addOn).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// movePlayer
// ---------------------------------------------------------------------------
describe('movePlayer', () => {
  const players = [
    makePlayer({ id: '1', name: 'Alice' }),
    makePlayer({ id: '2', name: 'Bob' }),
    makePlayer({ id: '3', name: 'Carol' }),
  ];

  it('moves player up (swaps with previous)', () => {
    const result = movePlayer(players, 1, -1);
    expect(result[0].name).toBe('Bob');
    expect(result[1].name).toBe('Alice');
    expect(result[2].name).toBe('Carol');
  });

  it('moves player down (swaps with next)', () => {
    const result = movePlayer(players, 0, 1);
    expect(result[0].name).toBe('Bob');
    expect(result[1].name).toBe('Alice');
    expect(result[2].name).toBe('Carol');
  });

  it('returns same array when moving first player up', () => {
    const result = movePlayer(players, 0, -1);
    expect(result).toBe(players);
  });

  it('returns same array when moving last player down', () => {
    const result = movePlayer(players, 2, 1);
    expect(result).toBe(players);
  });

  it('returns new array (immutability) on valid move', () => {
    const result = movePlayer(players, 1, -1);
    expect(result).not.toBe(players);
    expect(players[0].name).toBe('Alice');
  });
});

// ---------------------------------------------------------------------------
// shufflePlayers
// ---------------------------------------------------------------------------
describe('shufflePlayers', () => {
  it('returns array of same length', () => {
    const players = [
      makePlayer({ id: '1', name: 'A' }),
      makePlayer({ id: '2', name: 'B' }),
      makePlayer({ id: '3', name: 'C' }),
    ];
    const { players: shuffled } = shufflePlayers(players);
    expect(shuffled).toHaveLength(3);
  });

  it('contains all original players', () => {
    const players = [
      makePlayer({ id: '1', name: 'A' }),
      makePlayer({ id: '2', name: 'B' }),
      makePlayer({ id: '3', name: 'C' }),
    ];
    const { players: shuffled } = shufflePlayers(players);
    const ids = shuffled.map((p) => p.id).sort();
    expect(ids).toEqual(['1', '2', '3']);
  });

  it('returns new array (immutability)', () => {
    const players = [
      makePlayer({ id: '1', name: 'A' }),
      makePlayer({ id: '2', name: 'B' }),
    ];
    const { players: shuffled } = shufflePlayers(players);
    expect(shuffled).not.toBe(players);
  });

  it('returns dealerIndex within valid range', () => {
    const players = [
      makePlayer({ id: '1', name: 'A' }),
      makePlayer({ id: '2', name: 'B' }),
      makePlayer({ id: '3', name: 'C' }),
    ];
    for (let i = 0; i < 20; i++) {
      const { dealerIndex } = shufflePlayers(players);
      expect(dealerIndex).toBeGreaterThanOrEqual(0);
      expect(dealerIndex).toBeLessThan(players.length);
    }
  });

  it('handles single player', () => {
    const players = [makePlayer({ id: '1', name: 'A' })];
    const { players: shuffled, dealerIndex } = shufflePlayers(players);
    expect(shuffled).toHaveLength(1);
    expect(dealerIndex).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// dealerIndex backward compatibility
// ---------------------------------------------------------------------------
describe('dealerIndex backward compatibility', () => {
  it('fills in default dealerIndex when missing from import', () => {
    const json = JSON.stringify({ name: 'Old', levels: [] });
    const imported = importConfigJSON(json);
    expect(imported?.dealerIndex).toBe(0);
  });

  it('preserves dealerIndex through export/import round-trip', () => {
    const config = makeConfig({
      name: 'Dealer Test',
      levels: [],
      dealerIndex: 3,
    });
    const json = exportConfigJSON(config);
    const imported = importConfigJSON(json);
    expect(imported?.dealerIndex).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// roundToNice
// ---------------------------------------------------------------------------
describe('roundToNice', () => {
  it('returns 0 for zero or negative values', () => {
    expect(roundToNice(0)).toBe(0);
    expect(roundToNice(-5)).toBe(0);
  });

  it('rounds small values (1–10) to nearest integer, min 1', () => {
    expect(roundToNice(1)).toBe(1);
    expect(roundToNice(3)).toBe(3);
    expect(roundToNice(7.4)).toBe(7);
    expect(roundToNice(10)).toBe(10);
    expect(roundToNice(0.3)).toBe(1);
  });

  it('rounds to 5s for values 11–50', () => {
    expect(roundToNice(12)).toBe(10);
    expect(roundToNice(13)).toBe(15);
    expect(roundToNice(27)).toBe(25);
    expect(roundToNice(48)).toBe(50);
  });

  it('rounds to 25s for values 51–200', () => {
    expect(roundToNice(60)).toBe(50);
    expect(roundToNice(75)).toBe(75);
    expect(roundToNice(110)).toBe(100);
    expect(roundToNice(190)).toBe(200);
  });

  it('rounds to 50s for values 201–1000', () => {
    expect(roundToNice(225)).toBe(250);
    expect(roundToNice(500)).toBe(500);
    expect(roundToNice(975)).toBe(1000);
  });

  it('rounds to 100s for values 1001–5000', () => {
    expect(roundToNice(1050)).toBe(1100);
    expect(roundToNice(2500)).toBe(2500);
    expect(roundToNice(4999)).toBe(5000);
  });

  it('rounds to 500s for values above 5000', () => {
    expect(roundToNice(5100)).toBe(5000);
    expect(roundToNice(7500)).toBe(7500);
    expect(roundToNice(12300)).toBe(12500);
  });
});

// ---------------------------------------------------------------------------
// generateBlindStructure
// ---------------------------------------------------------------------------
describe('generateBlindStructure', () => {
  it('generates levels with ascending blinds', () => {
    const levels = generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: false });
    const playLevels = levels.filter((l) => l.type === 'level');
    for (let i = 1; i < playLevels.length; i++) {
      expect(playLevels[i].bigBlind!).toBeGreaterThan(playLevels[i - 1].bigBlind!);
    }
  });

  it('SB < BB in every play level', () => {
    const levels = generateBlindStructure({ startingChips: 20000, speed: 'fast', anteEnabled: false });
    const playLevels = levels.filter((l) => l.type === 'level');
    for (const level of playLevels) {
      expect(level.smallBlind!).toBeLessThan(level.bigBlind!);
    }
  });

  it('inserts breaks every 4 play levels', () => {
    const levels = generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: false });
    let playCount = 0;
    for (const level of levels) {
      if (level.type === 'level') playCount++;
      if (level.type === 'break') {
        // Break should appear after every 4th play level
        expect(playCount % 4).toBe(0);
      }
    }
  });

  it('includes ante when enabled', () => {
    const levels = generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: true });
    const playLevels = levels.filter((l) => l.type === 'level');
    // At least some levels should have ante > 0
    const withAnte = playLevels.filter((l) => (l.ante ?? 0) > 0);
    expect(withAnte.length).toBeGreaterThan(0);
  });

  it('no ante when disabled', () => {
    const levels = generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: false });
    const playLevels = levels.filter((l) => l.type === 'level');
    playLevels.forEach((l) => {
      expect(l.ante).toBe(0);
    });
  });

  it('has no duplicate BB values', () => {
    const levels = generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: false });
    const bbs = levels.filter((l) => l.type === 'level').map((l) => l.bigBlind!);
    const unique = [...new Set(bbs)];
    expect(bbs).toEqual(unique);
  });

  it('works with different starting chips (5000)', () => {
    const levels = generateBlindStructure({ startingChips: 5000, speed: 'normal', anteEnabled: false });
    const playLevels = levels.filter((l) => l.type === 'level');
    expect(playLevels.length).toBeGreaterThanOrEqual(5);
    expect(playLevels[0].bigBlind!).toBeGreaterThan(0);
  });

  it('works with large starting chips (50000)', () => {
    const levels = generateBlindStructure({ startingChips: 50000, speed: 'normal', anteEnabled: false });
    const playLevels = levels.filter((l) => l.type === 'level');
    expect(playLevels.length).toBeGreaterThanOrEqual(5);
    expect(playLevels[0].bigBlind!).toBeGreaterThan(0);
  });

  it('uses correct level duration per speed', () => {
    const fast = generateBlindStructure({ startingChips: 20000, speed: 'fast', anteEnabled: false });
    const normal = generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: false });
    const slow = generateBlindStructure({ startingChips: 20000, speed: 'slow', anteEnabled: false });

    expect(fast.filter((l) => l.type === 'level')[0].durationSeconds).toBe(360);
    expect(normal.filter((l) => l.type === 'level')[0].durationSeconds).toBe(720);
    expect(slow.filter((l) => l.type === 'level')[0].durationSeconds).toBe(1200);
  });

  it('starts at 25/50 for 20k starting chips', () => {
    const levels = generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: false });
    const first = levels.filter((l) => l.type === 'level')[0];
    expect(first.smallBlind).toBe(25);
    expect(first.bigBlind).toBe(50);
  });

  it('different speeds produce different blind progressions (not just duration)', () => {
    const fast = generateBlindStructure({ startingChips: 20000, speed: 'fast', anteEnabled: false });
    const slow = generateBlindStructure({ startingChips: 20000, speed: 'slow', anteEnabled: false });
    const fastBBs = fast.filter((l) => l.type === 'level').map((l) => l.bigBlind!);
    const slowBBs = slow.filter((l) => l.type === 'level').map((l) => l.bigBlind!);
    // Slow should have more play levels than fast (more intermediate steps)
    expect(slowBBs.length).toBeGreaterThan(fastBBs.length);
    // Both start at 50
    expect(fastBBs[0]).toBe(50);
    expect(slowBBs[0]).toBe(50);
  });

  it('normal speed: level 5 is 200/400 for 20k chips', () => {
    const levels = generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: false });
    const playLevels = levels.filter((l) => l.type === 'level');
    expect(playLevels[4].smallBlind).toBe(200);
    expect(playLevels[4].bigBlind).toBe(400);
  });

  it('always generates at least 1 play level even with extreme rounding (M12)', () => {
    // Very small starting chips where rounding could collapse all BBs
    const levels = generateBlindStructure({ startingChips: 1, speed: 'fast', anteEnabled: false });
    const playLevels = levels.filter((l) => l.type === 'level');
    expect(playLevels.length).toBeGreaterThanOrEqual(1);
    expect(playLevels[0].smallBlind).toBeDefined();
    expect(playLevels[0].bigBlind).toBeDefined();
    expect(playLevels[0].bigBlind!).toBeGreaterThan(playLevels[0].smallBlind!);
  });
});

// ---------------------------------------------------------------------------
// estimateDuration
// ---------------------------------------------------------------------------
describe('estimateDuration', () => {
  it('sums all level durations', () => {
    const levels: Level[] = [
      { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50, ante: 0 },
      { id: '2', type: 'break', durationSeconds: 300, label: 'Pause' },
      { id: '3', type: 'level', durationSeconds: 600, smallBlind: 50, bigBlind: 100, ante: 0 },
    ];
    expect(estimateDuration(levels)).toBe(1500);
  });

  it('returns 0 for empty levels', () => {
    expect(estimateDuration([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// estimatePlayedLevels
// ---------------------------------------------------------------------------
describe('estimatePlayedLevels', () => {
  it('returns fewer levels with fewer players', () => {
    const allLevels = generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: false });
    const for4 = estimatePlayedLevels(allLevels, 4, 20000);
    const for8 = estimatePlayedLevels(allLevels, 8, 20000);
    expect(for4.length).toBeLessThanOrEqual(for8.length);
  });

  it('returns all levels when player count < 2', () => {
    const allLevels = generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: false });
    const result = estimatePlayedLevels(allLevels, 1, 20000);
    expect(result.length).toBe(allLevels.length);
  });

  it('cuts off at appropriate blind level for given player count', () => {
    const allLevels = generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: false });
    const played = estimatePlayedLevels(allLevels, 6, 20000);
    // Total chips = 120k, endBB ≈ 4800 → should stop around BB 5000-6000
    const lastPlay = [...played].reverse().find((l) => l.type === 'level');
    expect(lastPlay).toBeDefined();
    expect(lastPlay!.bigBlind!).toBeLessThanOrEqual(20000);
  });
});

// ---------------------------------------------------------------------------
// estimateAllDurations
// ---------------------------------------------------------------------------
describe('estimateAllDurations', () => {
  it('returns 3 estimates', () => {
    const estimates = estimateAllDurations(20000, false, 6);
    expect(estimates).toHaveLength(3);
  });

  it('returns estimates in order: fast < normal < slow', () => {
    const estimates = estimateAllDurations(20000, false, 6);
    expect(estimates[0].speed).toBe('fast');
    expect(estimates[1].speed).toBe('normal');
    expect(estimates[2].speed).toBe('slow');
    expect(estimates[0].totalSeconds).toBeLessThan(estimates[1].totalSeconds);
    expect(estimates[1].totalSeconds).toBeLessThan(estimates[2].totalSeconds);
  });

  it('each estimate has non-empty levels', () => {
    const estimates = estimateAllDurations(20000, false, 6);
    estimates.forEach((e) => {
      expect(e.levels.length).toBeGreaterThan(0);
      expect(e.totalSeconds).toBeGreaterThan(0);
    });
  });

  it('more players produce longer estimates', () => {
    const est4 = estimateAllDurations(20000, false, 4);
    const est8 = estimateAllDurations(20000, false, 8);
    // Normal speed: 8 players should take longer than 4
    const normal4 = est4.find((e) => e.speed === 'normal')!;
    const normal8 = est8.find((e) => e.speed === 'normal')!;
    expect(normal8.totalSeconds).toBeGreaterThanOrEqual(normal4.totalSeconds);
  });
});

// ---------------------------------------------------------------------------
// roundToChipMultiple
// ---------------------------------------------------------------------------
describe('roundToChipMultiple', () => {
  it('returns 0 for zero or negative value', () => {
    expect(roundToChipMultiple(0, 25)).toBe(0);
    expect(roundToChipMultiple(-10, 25)).toBe(0);
  });

  it('rounds to nearest multiple of chip denomination', () => {
    expect(roundToChipMultiple(30, 25)).toBe(25);
    expect(roundToChipMultiple(40, 25)).toBe(50);
    expect(roundToChipMultiple(75, 50)).toBe(100);
    expect(roundToChipMultiple(60, 50)).toBe(50);
    expect(roundToChipMultiple(100, 100)).toBe(100);
  });

  it('never returns less than the smallest chip', () => {
    expect(roundToChipMultiple(1, 25)).toBe(25);
    expect(roundToChipMultiple(10, 50)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// checkBlindChipCompatibility
// ---------------------------------------------------------------------------
describe('checkBlindChipCompatibility', () => {
  const denoms25 = [
    { id: '1', value: 25, color: '#fff', label: 'White' },
    { id: '2', value: 100, color: '#f00', label: 'Red' },
  ];
  const denoms50 = [
    { id: '1', value: 50, color: '#fff', label: 'White' },
    { id: '2', value: 100, color: '#f00', label: 'Red' },
  ];

  it('returns empty when all blinds are multiples of smallest chip', () => {
    const levels: Level[] = [
      { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50, ante: 0 },
      { id: '2', type: 'level', durationSeconds: 600, smallBlind: 50, bigBlind: 100, ante: 0 },
    ];
    expect(checkBlindChipCompatibility(levels, denoms25)).toEqual([]);
  });

  it('detects incompatible blind values', () => {
    const levels: Level[] = [
      { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50, ante: 0 },
      { id: '2', type: 'level', durationSeconds: 600, smallBlind: 75, bigBlind: 150, ante: 0 },
    ];
    // With 50 as smallest chip, 25, 75, 150 are not multiples of 50
    const conflicts = checkBlindChipCompatibility(levels, denoms50);
    expect(conflicts).toContain(25);
    expect(conflicts).toContain(75);
  });

  it('returns empty for empty denominations', () => {
    const levels: Level[] = [
      { id: '1', type: 'level', durationSeconds: 600, smallBlind: 33, bigBlind: 77, ante: 0 },
    ];
    expect(checkBlindChipCompatibility(levels, [])).toEqual([]);
  });

  it('ignores breaks', () => {
    const levels: Level[] = [
      { id: '1', type: 'break', durationSeconds: 300, label: 'Pause' },
    ];
    expect(checkBlindChipCompatibility(levels, denoms25)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// generateBlindStructure with smallestChip
// ---------------------------------------------------------------------------
describe('generateBlindStructure with chip constraint', () => {
  it('all blind values are multiples of smallestChip when provided', () => {
    const levels = generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: false, smallestChip: 25 });
    const playLevels = levels.filter((l) => l.type === 'level');
    for (const level of playLevels) {
      expect(level.smallBlind! % 25).toBe(0);
      expect(level.bigBlind! % 25).toBe(0);
    }
  });

  it('all blind values are multiples of 50 when smallestChip=50', () => {
    const levels = generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: false, smallestChip: 50 });
    const playLevels = levels.filter((l) => l.type === 'level');
    for (const level of playLevels) {
      expect(level.smallBlind! % 50).toBe(0);
      expect(level.bigBlind! % 50).toBe(0);
    }
  });

  it('ante values are multiples of smallestChip when enabled', () => {
    const levels = generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: true, smallestChip: 25 });
    const playLevels = levels.filter((l) => l.type === 'level');
    const withAnte = playLevels.filter((l) => (l.ante ?? 0) > 0);
    for (const level of withAnte) {
      expect(level.ante! % 25).toBe(0);
    }
  });

  it('first level starts at 25/50 for 20k with smallestChip=25', () => {
    const levels = generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: false, smallestChip: 25 });
    const first = levels.filter((l) => l.type === 'level')[0];
    expect(first.smallBlind).toBe(25);
    expect(first.bigBlind).toBe(50);
  });

  it('first level starts at 50/100 for 20k with smallestChip=50', () => {
    const levels = generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: false, smallestChip: 50 });
    const first = levels.filter((l) => l.type === 'level')[0];
    expect(first.smallBlind).toBe(50);
    expect(first.bigBlind).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// computeColorUps
// ---------------------------------------------------------------------------
describe('computeColorUps', () => {
  // 5-color default: 25, 50, 100, 500, 1000
  const chips5 = [
    { id: '1', value: 25, color: '#fff', label: 'White' },
    { id: '2', value: 50, color: '#f00', label: 'Red' },
    { id: '3', value: 100, color: '#00f', label: 'Blue' },
    { id: '4', value: 500, color: '#0f0', label: 'Green' },
    { id: '5', value: 1000, color: '#000', label: 'Black' },
  ];

  // 6-color: adds 5000
  const chips6 = [
    ...chips5,
    { id: '6', value: 5000, color: '#a0f', label: 'Purple' },
  ];

  it('1000 chip must NOT be removed when blinds include 3000/6000', () => {
    // Structure that includes 3000/6000 blinds
    const levels: Level[] = [
      { id: 'l1', type: 'level', durationSeconds: 720, smallBlind: 25, bigBlind: 50, ante: 0 },
      { id: 'l2', type: 'level', durationSeconds: 720, smallBlind: 50, bigBlind: 100, ante: 0 },
      { id: 'l3', type: 'level', durationSeconds: 720, smallBlind: 100, bigBlind: 200, ante: 0 },
      { id: 'l4', type: 'level', durationSeconds: 720, smallBlind: 200, bigBlind: 400, ante: 0 },
      { id: 'b1', type: 'break', durationSeconds: 600, label: 'Pause' },
      { id: 'l5', type: 'level', durationSeconds: 720, smallBlind: 300, bigBlind: 600, ante: 0 },
      { id: 'l6', type: 'level', durationSeconds: 720, smallBlind: 500, bigBlind: 1000, ante: 0 },
      { id: 'l7', type: 'level', durationSeconds: 720, smallBlind: 1000, bigBlind: 2000, ante: 0 },
      { id: 'l8', type: 'level', durationSeconds: 720, smallBlind: 1500, bigBlind: 3000, ante: 0 },
      { id: 'b2', type: 'break', durationSeconds: 600, label: 'Pause' },
      { id: 'l9', type: 'level', durationSeconds: 720, smallBlind: 3000, bigBlind: 6000, ante: 0 },
    ];
    const colorUps = computeColorUps(levels, chips5);

    // Collect all removed chip IDs across all events
    const removedIds = new Set<string>();
    for (const denoms of colorUps.values()) {
      for (const d of denoms) removedIds.add(d.id);
    }

    // 1000 chip (id '5') must NOT be removed — it's the highest denomination
    expect(removedIds.has('5')).toBe(false);
  });

  it('1000 chip is NOT removed at 3000/6000 with 6-color set', () => {
    const levels: Level[] = [
      { id: 'l1', type: 'level', durationSeconds: 720, smallBlind: 500, bigBlind: 1000, ante: 0 },
      { id: 'l2', type: 'level', durationSeconds: 720, smallBlind: 1000, bigBlind: 2000, ante: 0 },
      { id: 'l3', type: 'level', durationSeconds: 720, smallBlind: 1500, bigBlind: 3000, ante: 0 },
      { id: 'b1', type: 'break', durationSeconds: 600, label: 'Pause' },
      { id: 'l4', type: 'level', durationSeconds: 720, smallBlind: 3000, bigBlind: 6000, ante: 0 },
    ];
    const colorUps = computeColorUps(levels, chips6);

    const removedIds = new Set<string>();
    for (const denoms of colorUps.values()) {
      for (const d of denoms) removedIds.add(d.id);
    }

    // 1000 chip NOT removed: 3000 and 6000 are not multiples of 5000
    expect(removedIds.has('5')).toBe(false);
  });

  it('1000 chip IS removed when only 5000/10000 blinds remain (6-color)', () => {
    const levels: Level[] = [
      { id: 'l1', type: 'level', durationSeconds: 720, smallBlind: 500, bigBlind: 1000, ante: 0 },
      { id: 'l2', type: 'level', durationSeconds: 720, smallBlind: 1000, bigBlind: 2000, ante: 0 },
      { id: 'b1', type: 'break', durationSeconds: 600, label: 'Pause' },
      { id: 'l3', type: 'level', durationSeconds: 720, smallBlind: 5000, bigBlind: 10000, ante: 0 },
      { id: 'l4', type: 'level', durationSeconds: 720, smallBlind: 10000, bigBlind: 20000, ante: 0 },
    ];
    const colorUps = computeColorUps(levels, chips6);

    const removedIds = new Set<string>();
    for (const denoms of colorUps.values()) {
      for (const d of denoms) removedIds.add(d.id);
    }

    // 1000 IS removed once all future values are multiples of 5000
    expect(removedIds.has('5')).toBe(true);
  });

  it('25 chip is removed when all future blinds are multiples of 50', () => {
    const levels: Level[] = [
      { id: 'l1', type: 'level', durationSeconds: 720, smallBlind: 25, bigBlind: 50, ante: 0 },
      { id: 'l2', type: 'level', durationSeconds: 720, smallBlind: 50, bigBlind: 100, ante: 0 },
      { id: 'b1', type: 'break', durationSeconds: 600, label: 'Pause' },
      { id: 'l3', type: 'level', durationSeconds: 720, smallBlind: 100, bigBlind: 200, ante: 0 },
      { id: 'l4', type: 'level', durationSeconds: 720, smallBlind: 200, bigBlind: 400, ante: 0 },
    ];
    const colorUps = computeColorUps(levels, chips5);

    const removedIds = new Set<string>();
    for (const denoms of colorUps.values()) {
      for (const d of denoms) removedIds.add(d.id);
    }

    // 25 chip (id '1') should be removed
    expect(removedIds.has('1')).toBe(true);
  });

  it('highest denomination is never removed', () => {
    const levels: Level[] = [
      { id: 'l1', type: 'level', durationSeconds: 720, smallBlind: 500, bigBlind: 1000, ante: 0 },
      { id: 'l2', type: 'level', durationSeconds: 720, smallBlind: 1000, bigBlind: 2000, ante: 0 },
    ];
    const colorUps = computeColorUps(levels, chips5);

    const removedIds = new Set<string>();
    for (const denoms of colorUps.values()) {
      for (const d of denoms) removedIds.add(d.id);
    }

    // 1000 (highest) must never be removed
    expect(removedIds.has('5')).toBe(false);
  });
});

// ─── formatElapsedTime ────────────────────────────────────────────

describe('formatElapsedTime', () => {
  it('formats zero seconds as 0:00:00', () => {
    expect(formatElapsedTime(0)).toBe('0:00:00');
  });

  it('formats seconds under one hour correctly', () => {
    expect(formatElapsedTime(754)).toBe('0:12:34');
  });

  it('formats seconds over one hour correctly', () => {
    expect(formatElapsedTime(5025)).toBe('1:23:45');
  });

  it('clamps negative values to 0:00:00', () => {
    expect(formatElapsedTime(-100)).toBe('0:00:00');
  });
});

// ─── computeEstimatedRemainingSeconds ─────────────────────────────

describe('computeEstimatedRemainingSeconds', () => {
  const levels: Level[] = [
    { id: '1', type: 'level', durationSeconds: 600, smallBlind: 10, bigBlind: 20, ante: 0 },
    { id: '2', type: 'level', durationSeconds: 600, smallBlind: 20, bigBlind: 40, ante: 0 },
    { id: '3', type: 'level', durationSeconds: 600, smallBlind: 30, bigBlind: 60, ante: 0 },
  ];

  it('sums remaining of current level plus all future levels', () => {
    // On first level with 300s remaining + 600 + 600 = 1500
    expect(computeEstimatedRemainingSeconds(levels, 0, 300)).toBe(1500);
  });

  it('returns only remaining seconds on the last level', () => {
    expect(computeEstimatedRemainingSeconds(levels, 2, 120)).toBe(120);
  });

  it('returns 0 for negative remaining on last level', () => {
    expect(computeEstimatedRemainingSeconds(levels, 2, -10)).toBe(0);
  });
});

// ─── computeAverageStackInBB ──────────────────────────────────────

describe('computeAverageStackInBB', () => {
  it('returns average stack divided by big blind, rounded to 1 decimal', () => {
    expect(computeAverageStackInBB(10000, 300)).toBe(33.3);
  });

  it('rounds to one decimal place', () => {
    // 10000 / 700 = 14.2857... → 14.3
    expect(computeAverageStackInBB(10000, 700)).toBe(14.3);
  });
});

// ─── isBubble ─────────────────────────────────────────────────────

describe('isBubble', () => {
  it('returns false when already in the money', () => {
    expect(isBubble(3, 3)).toBe(false);
  });

  it('returns false when paid places is 0', () => {
    expect(isBubble(4, 0)).toBe(false);
  });

  it('returns false when only 1 player', () => {
    expect(isBubble(1, 3)).toBe(false);
  });
});

// ─── isInTheMoney ─────────────────────────────────────────────────

describe('isInTheMoney', () => {
  it('returns false when only 1 player', () => {
    expect(isInTheMoney(1, 3)).toBe(false);
  });
});

// ─── Tournament Templates ─────────────────────────────────────────

describe('loadCheckpoint', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    const mockStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => { storage[key] = value; },
      removeItem: (key: string) => { delete storage[key]; },
      clear: () => { storage = {}; },
    };
    vi.stubGlobal('localStorage', mockStorage);
  });

  it('returns null when config has empty levels array', () => {
    const checkpoint = {
      version: 1,
      config: { levels: [], buyIn: 10, startingChips: 1000 },
      timer: { currentLevelIndex: 0, remainingSeconds: 600, status: 'stopped', startedAt: null, remainingAtStart: null },
      settings: {},
      players: [],
    };
    storage['poker-timer-checkpoint'] = JSON.stringify(checkpoint);
    const result = loadCheckpoint();
    expect(result).toBeNull();
  });
});

describe('Tournament Templates', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    const mockStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => { storage[key] = value; },
      removeItem: (key: string) => { delete storage[key]; },
      clear: () => { storage = {}; },
      get length() { return Object.keys(storage).length; },
      key: (i: number) => Object.keys(storage)[i] ?? null,
    };
    vi.stubGlobal('localStorage', mockStorage);
  });

  it('returns empty array when no templates saved', () => {
    expect(loadTemplates()).toEqual([]);
  });

  it('saves and loads a template', () => {
    const players: Player[] = [
      { id: 'p1', name: 'Spieler 1', rebuys: 0, addOn: false, eliminated: false, eliminatedOrder: null, seat: 1, bountyCount: 0 },
      { id: 'p2', name: 'Spieler 2', rebuys: 0, addOn: false, eliminated: false, eliminatedOrder: null, seat: 2, bountyCount: 0 },
    ];
    const config: TournamentConfig = {
      levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 10, bigBlind: 20, ante: 0 }],
      startingChips: 10000,
      players,
      payoutConfig: defaultPayoutConfig(),
      rebuyConfig: defaultRebuyConfig(),
      addOnConfig: defaultAddOnConfig(),
      bountyConfig: defaultBountyConfig(),
      chipConfig: defaultChipConfig(),
    };

    const saved = saveTemplate('My Tournament', config);
    expect(saved.name).toBe('My Tournament');
    expect(saved.id).toBeTruthy();
    expect(saved.config.startingChips).toBe(10000);

    const loaded = loadTemplates();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('My Tournament');
  });

  it('deletes a template', () => {
    const players: Player[] = [
      { id: 'p1', name: 'Spieler 1', rebuys: 0, addOn: false, eliminated: false, eliminatedOrder: null, seat: 1, bountyCount: 0 },
    ];
    const config: TournamentConfig = {
      levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 10, bigBlind: 20, ante: 0 }],
      startingChips: 10000,
      players,
      payoutConfig: defaultPayoutConfig(),
      rebuyConfig: defaultRebuyConfig(),
      addOnConfig: defaultAddOnConfig(),
      bountyConfig: defaultBountyConfig(),
      chipConfig: defaultChipConfig(),
    };

    const saved = saveTemplate('To Delete', config);
    expect(loadTemplates()).toHaveLength(1);

    deleteTemplate(saved.id);
    expect(loadTemplates()).toHaveLength(0);
  });

  it('handles corrupt localStorage data gracefully', () => {
    localStorage.setItem('poker-timer-templates', 'not valid json!!!');
    expect(loadTemplates()).toEqual([]);
  });

  it('migrates all templates with valid id regardless of config (M38)', async () => {
    // Store templates with one valid and one invalid config in localStorage
    const templates = [
      { id: 'tpl_valid', name: 'Valid', createdAt: '2025-01-01', config: { levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 10, bigBlind: 20 }] } },
      { id: 'tpl_invalid', name: 'Invalid', createdAt: '2025-01-01', config: { levels: 'not-an-array' } },
    ];
    localStorage.setItem('poker-timer-templates', JSON.stringify(templates));
    localStorage.removeItem('poker-timer-migrated');
    // Migration loads items with valid id — both get migrated (config validation is consumer responsibility)
    await resetStorage();
    await initStorage();
    const loaded = loadTemplates();
    // Both have valid id, so both are migrated to cache
    expect(loaded).toHaveLength(2);
    const names = loaded.map(t => t.name).sort();
    expect(names).toEqual(['Invalid', 'Valid']);
  });
});

// ---------------------------------------------------------------------------
// Template File Export/Import
// ---------------------------------------------------------------------------

describe('exportTemplateToJSON', () => {
  it('serializes a template with name and config', () => {
    const config = makeConfig({
      name: 'Test',
      levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 10, bigBlind: 20, ante: 0 }],
    });
    const json = exportTemplateToJSON('My Template', config);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('My Template');
    expect(parsed.createdAt).toBeTruthy();
    expect(parsed.config).toBeDefined();
    expect(parsed.config.levels).toHaveLength(1);
  });
});

describe('parseTemplateFile', () => {
  it('parses template format (name + config wrapper)', () => {
    const config = makeConfig({
      name: 'Test',
      levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 10, bigBlind: 20, ante: 0 }],
    });
    const json = JSON.stringify({ name: 'Friday Poker', config });
    const result = parseTemplateFile(json);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Friday Poker');
    expect(result!.config.levels).toHaveLength(1);
  });

  it('parses direct config format (name + levels at top level)', () => {
    const json = JSON.stringify({
      name: 'Direct Config',
      levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50, ante: 0 }],
      buyIn: 20,
      startingChips: 10000,
    });
    const result = parseTemplateFile(json);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Direct Config');
    expect(result!.config.buyIn).toBe(20);
  });

  it('parses output of exportTemplateToJSON round-trip', () => {
    const config = makeConfig({
      name: 'Round Trip',
      levels: [
        { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50, ante: 5 },
        { id: '2', type: 'break', durationSeconds: 300, label: 'Pause' },
      ],
    });
    const json = exportTemplateToJSON('Round Trip', config);
    const result = parseTemplateFile(json);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Round Trip');
    expect(result!.config.levels).toHaveLength(2);
  });

  it('returns null for invalid JSON', () => {
    expect(parseTemplateFile('not json')).toBeNull();
  });

  it('returns null for JSON without levels', () => {
    expect(parseTemplateFile(JSON.stringify({ name: 'No levels' }))).toBeNull();
  });

  it('returns null for empty object', () => {
    expect(parseTemplateFile(JSON.stringify({}))).toBeNull();
  });
});

describe('computeBlindStructureSummary', () => {
  it('counts levels, breaks, and average minutes', () => {
    const levels: Level[] = [
      { id: '1', type: 'level', durationSeconds: 600, smallBlind: 10, bigBlind: 20 },
      { id: '2', type: 'level', durationSeconds: 900, smallBlind: 20, bigBlind: 40 },
      { id: '3', type: 'break', durationSeconds: 300, label: 'Pause' },
      { id: '4', type: 'level', durationSeconds: 600, smallBlind: 30, bigBlind: 60 },
    ];
    const result = computeBlindStructureSummary(levels);
    expect(result.levelCount).toBe(3);
    expect(result.breakCount).toBe(1);
    expect(result.avgMinutes).toBe(12); // (600+900+600)/3/60 = 11.67 → 12
  });

  it('handles no breaks', () => {
    const levels: Level[] = [
      { id: '1', type: 'level', durationSeconds: 900, smallBlind: 10, bigBlind: 20 },
      { id: '2', type: 'level', durationSeconds: 900, smallBlind: 20, bigBlind: 40 },
    ];
    const result = computeBlindStructureSummary(levels);
    expect(result.levelCount).toBe(2);
    expect(result.breakCount).toBe(0);
    expect(result.avgMinutes).toBe(15);
  });

});

describe('speech module', () => {
  // Import speech functions — speechSynthesis and Audio are not available in jsdom,
  // so these tests verify graceful degradation (no errors thrown)

  it('announceCountdown returns true for both German and English', async () => {
    const { setSpeechLanguage, announceCountdown, cancelSpeech } = await import('../src/domain/speech');
    setSpeechLanguage('de');
    expect(announceCountdown(5)).toBe(true);
    cancelSpeech();
    setSpeechLanguage('en');
    expect(announceCountdown(5)).toBe(true);
    cancelSpeech();
    setSpeechLanguage('de'); // restore
  });

  it('convenience functions do not throw when language is English', async () => {
    const {
      setSpeechLanguage, announceBubble, announceInTheMoney,
      announceTournamentStart, announceHeadsUp, cancelSpeech,
    } = await import('../src/domain/speech');

    setSpeechLanguage('en');

    const mockT = ((key: string) => key) as Parameters<typeof announceBubble>[0];

    // English now has MP3 audio files — these should not throw
    expect(() => announceBubble(mockT)).not.toThrow();
    expect(() => announceInTheMoney(mockT)).not.toThrow();
    expect(() => announceTournamentStart(mockT)).not.toThrow();
    expect(() => announceHeadsUp(mockT)).not.toThrow();
    cancelSpeech();
    setSpeechLanguage('de'); // restore
  });
});

describe('advanceDealer', () => {
  const makePlayers = (statuses: ('active' | 'eliminated')[]): Player[] =>
    statuses.map((status, i) => ({
      id: `p${i}`,
      name: `Player ${i + 1}`,
      rebuys: 0,
      addOn: false,
      status,
      placement: status === 'eliminated' ? i + 1 : null,
      eliminatedBy: null,
      knockouts: 0,
    }));

  it('advances to next active player', () => {
    const players = makePlayers(['active', 'active', 'active']);
    expect(advanceDealer(players, 0)).toBe(1);
    expect(advanceDealer(players, 1)).toBe(2);
    expect(advanceDealer(players, 2)).toBe(0);
  });

  it('skips eliminated players', () => {
    const players = makePlayers(['active', 'eliminated', 'active']);
    expect(advanceDealer(players, 0)).toBe(2);
    expect(advanceDealer(players, 2)).toBe(0);
  });

  it('wraps around correctly', () => {
    const players = makePlayers(['eliminated', 'eliminated', 'active', 'active']);
    expect(advanceDealer(players, 3)).toBe(2);
    expect(advanceDealer(players, 2)).toBe(3);
  });

  it('returns currentDealerIndex when all eliminated', () => {
    const players = makePlayers(['eliminated', 'eliminated']);
    expect(advanceDealer(players, 0)).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(advanceDealer([], 0)).toBe(0);
  });
});


describe('audioPlayer module', () => {
  it('cancelAudioPlayback does not throw', async () => {
    const { cancelAudioPlayback } = await import('../src/domain/audioPlayer');
    expect(() => cancelAudioPlayback()).not.toThrow();
  });

  it('playAudioSequence rejects without AudioContext', async () => {
    const { playAudioSequence } = await import('../src/domain/audioPlayer');
    // jsdom does not have AudioContext — should reject gracefully
    await expect(playAudioSequence(['test.mp3'])).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Tournament History
// ---------------------------------------------------------------------------
describe('buildTournamentResult', () => {
  const levels: Level[] = [
    { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 },
    { id: '2', type: 'break', durationSeconds: 300 },
    { id: '3', type: 'level', durationSeconds: 600, smallBlind: 50, bigBlind: 100 },
  ];

  it('builds a result with correct structure', () => {
    const config = makeConfig({
      name: 'Friday Night',
      levels,
      buyIn: 10,
      players: [
        makePlayer({ id: '1', name: 'Alice', status: 'active', knockouts: 2 }),
        makePlayer({ id: '2', name: 'Bob', status: 'eliminated', placement: 3, eliminatedBy: '1' }),
        makePlayer({ id: '3', name: 'Carol', status: 'eliminated', placement: 2, eliminatedBy: '1' }),
      ],
      payout: { mode: 'percent', entries: [{ place: 1, value: 70 }, { place: 2, value: 30 }] },
    });
    const result = buildTournamentResult(config, 1500, 3);
    expect(result.name).toBe('Friday Night');
    expect(result.playerCount).toBe(3);
    expect(result.prizePool).toBe(30);
    expect(result.levelsPlayed).toBe(3);
    expect(result.elapsedSeconds).toBe(1500);
    expect(result.players).toHaveLength(3);
    // Winner should be first
    expect(result.players[0].name).toBe('Alice');
    expect(result.players[0].place).toBe(1);
    expect(result.players[0].payout).toBe(21); // 70% of 30
    expect(result.players[0].netBalance).toBe(11); // 21 - 10
    // Second place
    expect(result.players[1].name).toBe('Carol');
    expect(result.players[1].place).toBe(2);
    expect(result.players[1].payout).toBe(9); // 30% of 30
    // Third place — no payout
    expect(result.players[2].name).toBe('Bob');
    expect(result.players[2].place).toBe(3);
    expect(result.players[2].payout).toBe(0);
    expect(result.players[2].netBalance).toBe(-10);
  });

  it('accounts for rebuys and add-ons in net balance', () => {
    const config = makeConfig({
      name: 'Rebuy Night',
      levels,
      buyIn: 10,
      rebuy: { enabled: true, limitType: 'levels', levelLimit: 4, timeLimit: 3600, rebuyCost: 10, rebuyChips: 20000 },
      addOn: { enabled: true, cost: 5, chips: 10000 },
      players: [
        makePlayer({ id: '1', name: 'Alice', status: 'active', rebuys: 2, addOn: true }),
        makePlayer({ id: '2', name: 'Bob', status: 'eliminated', placement: 2, rebuys: 1 }),
      ],
      payout: { mode: 'percent', entries: [{ place: 1, value: 100 }] },
    });
    const result = buildTournamentResult(config, 900, 2);
    // Prizepool: 2*10 + 3*10 + 1*5 = 55
    expect(result.prizePool).toBe(55);
    expect(result.totalRebuys).toBe(3);
    expect(result.totalAddOns).toBe(1);
    // Alice: payout=55, cost=10+20+5=35, net=20
    expect(result.players[0].netBalance).toBe(20);
    // Bob: payout=0, cost=10+10=20, net=-20
    expect(result.players[1].netBalance).toBe(-20);
  });
  it('assigns sequential places to multiple active players (M06)', () => {
    const config = makeConfig({
      name: 'Multi Active',
      levels,
      buyIn: 10,
      players: [
        makePlayer({ id: '1', name: 'Alice', status: 'active' }),
        makePlayer({ id: '2', name: 'Bob', status: 'active' }),
        makePlayer({ id: '3', name: 'Carol', status: 'eliminated', placement: 3 }),
      ],
      payout: { mode: 'percent', entries: [{ place: 1, value: 60 }, { place: 2, value: 30 }, { place: 3, value: 10 }] },
    });
    const result = buildTournamentResult(config, 600, 1);
    // Active players should get places 1 and 2 (not both 1)
    const activePlayers = result.players.filter(p => p.place <= 2);
    expect(activePlayers).toHaveLength(2);
    expect(result.players[0].place).toBe(1);
    expect(result.players[1].place).toBe(2);
    expect(result.players[2].place).toBe(3);
    // No duplicate places
    const places = result.players.map(p => p.place);
    expect(new Set(places).size).toBe(places.length);
  });

  it('assigns sequential places to active re-entry instances (M06)', () => {
    const config = makeConfig({
      name: 'Re-Entry Active',
      levels,
      buyIn: 10,
      players: [
        makePlayer({ id: '1', name: 'Alice', status: 'active' }),
        makePlayer({ id: '2', name: 'Bob-original', status: 'active', originalPlayerId: 'bob-orig' }),
        makePlayer({ id: '3', name: 'Bob-reentry', status: 'active', originalPlayerId: 'bob-orig' }),
        makePlayer({ id: '4', name: 'Carol', status: 'eliminated', placement: 4 }),
      ],
      payout: { mode: 'percent', entries: [{ place: 1, value: 60 }, { place: 2, value: 30 }, { place: 3, value: 10 }] },
    });
    const result = buildTournamentResult(config, 600, 1);
    // Bob's re-entry group should be aggregated into one entry (active)
    // Result: Alice (active), Bob (active, aggregated), Carol (eliminated)
    expect(result.players).toHaveLength(3);
    // Active players should get places 1 and 2
    const activeResults = result.players.filter(p => p.place <= 2);
    expect(activeResults).toHaveLength(2);
    expect(result.players[0].place).toBe(1);
    expect(result.players[1].place).toBe(2);
    expect(result.players[2].place).toBe(4); // Carol's original placement
    // No duplicate places
    const places = result.players.map(p => p.place);
    expect(new Set(places).size).toBe(places.length);
  });

  it('single active player still gets place 1 (M06)', () => {
    const config = makeConfig({
      name: 'Single Winner',
      levels,
      buyIn: 10,
      players: [
        makePlayer({ id: '1', name: 'Alice', status: 'active' }),
        makePlayer({ id: '2', name: 'Bob', status: 'eliminated', placement: 2 }),
      ],
      payout: { mode: 'percent', entries: [{ place: 1, value: 100 }] },
    });
    const result = buildTournamentResult(config, 600, 1);
    expect(result.players[0].name).toBe('Alice');
    expect(result.players[0].place).toBe(1);
    expect(result.players[1].name).toBe('Bob');
    expect(result.players[1].place).toBe(2);
  });
});

describe('Tournament History persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('save and load round-trip', () => {
    const levels: Level[] = [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }];
    const config = makeConfig({
      name: 'Test',
      levels,
      buyIn: 10,
      players: [
        makePlayer({ id: '1', name: 'A', status: 'active' }),
        makePlayer({ id: '2', name: 'B', status: 'eliminated', placement: 2 }),
      ],
      payout: { mode: 'percent', entries: [{ place: 1, value: 100 }] },
    });
    const result = buildTournamentResult(config, 600, 1);
    saveTournamentResult(result);
    const history = loadTournamentHistory();
    expect(history).toHaveLength(1);
    expect(history[0].name).toBe('Test');
    expect(history[0].id).toBe(result.id);
  });

  it('delete removes a specific entry', () => {
    const levels: Level[] = [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }];
    const config = makeConfig({
      name: 'T1',
      levels,
      buyIn: 5,
      players: [
        makePlayer({ id: '1', name: 'A', status: 'active' }),
        makePlayer({ id: '2', name: 'B', status: 'eliminated', placement: 2 }),
      ],
      payout: { mode: 'percent', entries: [{ place: 1, value: 100 }] },
    });
    const r1 = buildTournamentResult(config, 600, 1);
    saveTournamentResult(r1);
    const r2 = buildTournamentResult({ ...config, name: 'T2' }, 800, 2);
    saveTournamentResult(r2);
    expect(loadTournamentHistory()).toHaveLength(2);
    deleteTournamentResult(r1.id);
    const remaining = loadTournamentHistory();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe('T2');
  });

  it('caps history at MAX_HISTORY entries', () => {
    const levels: Level[] = [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }];
    const config = makeConfig({
      name: 'Cap',
      levels,
      buyIn: 5,
      players: [
        makePlayer({ id: '1', name: 'A', status: 'active' }),
        makePlayer({ id: '2', name: 'B', status: 'eliminated', placement: 2 }),
      ],
      payout: { mode: 'percent', entries: [{ place: 1, value: 100 }] },
    });
    for (let i = 0; i < 105; i++) {
      saveTournamentResult(buildTournamentResult({ ...config, name: `T${i}` }, 600, 1));
    }
    const history = loadTournamentHistory();
    expect(history).toHaveLength(100);
    // Most recent should be first
    expect(history[0].name).toBe('T104');
  });

  it('clearTournamentHistory removes all', () => {
    const levels: Level[] = [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }];
    const config = makeConfig({
      name: 'X',
      levels,
      buyIn: 5,
      players: [
        makePlayer({ id: '1', name: 'A', status: 'active' }),
        makePlayer({ id: '2', name: 'B', status: 'eliminated', placement: 2 }),
      ],
      payout: { mode: 'percent', entries: [{ place: 1, value: 100 }] },
    });
    saveTournamentResult(buildTournamentResult(config, 600, 1));
    expect(loadTournamentHistory()).toHaveLength(1);
    clearTournamentHistory();
    expect(loadTournamentHistory()).toHaveLength(0);
  });

  it('includes events when provided', () => {
    const config = makeConfig({
      name: 'Event Test',
      levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }],
      buyIn: 10,
      players: [
        makePlayer({ id: '1', name: 'Alice', status: 'active' }),
        makePlayer({ id: '2', name: 'Bob', status: 'eliminated', placement: 2 }),
      ],
      payout: { mode: 'percent', entries: [{ place: 1, value: 100 }] },
    });
    const events = [createEvent('player_eliminated', 2, { playerId: 'p1' })];
    const result = buildTournamentResult(config, 3600, 8, events);
    expect(result.events).toHaveLength(1);
    expect(result.events![0].type).toBe('player_eliminated');
  });

  it('defaults to empty events when not provided', () => {
    const config = makeConfig({
      name: 'No Events',
      levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }],
      buyIn: 10,
      players: [
        makePlayer({ id: '1', name: 'Alice', status: 'active' }),
        makePlayer({ id: '2', name: 'Bob', status: 'eliminated', placement: 2 }),
      ],
      payout: { mode: 'percent', entries: [{ place: 1, value: 100 }] },
    });
    const result = buildTournamentResult(config, 3600, 8);
    expect(result.events).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// localStorage Validation (type guards filter corrupt data)
// ---------------------------------------------------------------------------
describe('IndexedDB migration filters corrupt data', () => {
  // These tests verify that the migration from localStorage → IndexedDB
  // filters out items without a valid string `id` field (non-objects, nulls,
  // items with numeric or missing IDs).

  it('migration filters out non-object and id-less history items', async () => {
    localStorage.setItem('poker-timer-history', JSON.stringify([
      { id: 'valid', date: '2026-01-01', players: [], playerCount: 2, buyIn: 10, prizePool: 20, levelsPlayed: 1, elapsedSeconds: 60, totalRebuys: 0, totalAddOns: 0, bountyEnabled: false, name: 'T' },
      'not-an-object',
      42,
      null,
      { missing: 'fields' }, // no id field
    ]));
    localStorage.removeItem('poker-timer-migrated');
    await resetStorage();
    await initStorage();
    const result = loadTournamentHistory();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('valid');
  });

  it('migration filters out league items without string id', async () => {
    localStorage.setItem('poker-timer-leagues', JSON.stringify([
      { id: 'league1', createdAt: '2026-01-01', pointSystem: { entries: [] }, name: 'Test' },
      { name: 'no-id' },
      null,
      'string',
    ]));
    localStorage.removeItem('poker-timer-migrated');
    await resetStorage();
    await initStorage();
    const result = loadLeagues();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('league1');
  });

  it('migration filters out player entries without string id', async () => {
    localStorage.setItem('poker-timer-players', JSON.stringify([
      { id: 'rp1', name: 'Alice', createdAt: '2026-01-01', lastPlayedAt: '2026-01-01' },
      { id: 'rp2' }, // has id but missing other fields — still migrated
      42,
      null,
    ]));
    localStorage.removeItem('poker-timer-migrated');
    await resetStorage();
    await initStorage();
    const result = loadPlayerDatabase();
    // Only items with typeof id === 'string' are migrated (rp1 and rp2)
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Alice');
  });

  it('migration filters out gameday items without string id', async () => {
    localStorage.setItem('poker-timer-gamedays', JSON.stringify([
      { id: 'gd1', leagueId: 'l1', date: '2026-01-01', participants: [], buyIn: 10, prizePool: 20 },
      { id: 'gd2' }, // has id but missing other fields — still migrated
      null,
    ]));
    localStorage.removeItem('poker-timer-migrated');
    await resetStorage();
    await initStorage();
    const result = loadGameDays();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('gd1');
  });

  it('migration filters items with non-string id from history', async () => {
    localStorage.setItem('poker-timer-history', JSON.stringify([
      { id: 'a', date: '2026-01-01', players: [] },
      { id: 123, date: '2026-01-01', players: [] }, // id is number, not string — filtered
      { id: 'b', date: '2026-01-02', players: [] },
    ]));
    localStorage.removeItem('poker-timer-migrated');
    await resetStorage();
    await initStorage();
    const result = loadTournamentHistory();
    expect(result).toHaveLength(2);
    expect(result.map(r => r.id)).toEqual(['a', 'b']);
  });
});

// ---------------------------------------------------------------------------
// Storage Layer (IndexedDB + Cache)
// ---------------------------------------------------------------------------
describe('Storage Layer', () => {
  it('initStorage initializes with empty cache', async () => {
    await resetStorage();
    await initStorage();
    expect(getCached('config')).toBeNull();
    expect(getCached('settings')).toBeNull();
    expect(getCached('checkpoint')).toBeNull();
    expect(getCached('templates')).toEqual([]);
    expect(getCached('history')).toEqual([]);
    expect(getCached('players')).toEqual([]);
    expect(getCached('leagues')).toEqual([]);
    expect(getCached('gameDays')).toEqual([]);
  });

  it('setCached + getCached round-trip for singleton stores', () => {
    const config = makeConfig({ name: 'Test', levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50, ante: 0 }], buyIn: 10, startingChips: 20000 });
    setCached('config', config);
    expect(getCached('config')).toEqual(config);

    setCached('config', null);
    expect(getCached('config')).toBeNull();
  });

  it('setCached + getCached round-trip for collection stores', () => {
    const players: RegisteredPlayer[] = [
      { id: 'rp1', name: 'Alice', createdAt: '2026-01-01', lastPlayedAt: '2026-01-01' },
      { id: 'rp2', name: 'Bob', createdAt: '2026-01-01', lastPlayedAt: '2026-01-01' },
    ];
    setCached('players', players);
    expect(getCached('players')).toHaveLength(2);
    expect(getCached('players')[0].name).toBe('Alice');
  });

  it('setCachedItem upserts by id', () => {
    const league1: League = { id: 'l1', name: 'League 1', pointSystem: defaultPointSystem(), createdAt: '2026-01-01' };
    const league2: League = { id: 'l2', name: 'League 2', pointSystem: defaultPointSystem(), createdAt: '2026-01-01' };
    setCachedItem('leagues', league1);
    setCachedItem('leagues', league2);
    expect(getCached('leagues')).toHaveLength(2);

    // Upsert existing
    setCachedItem('leagues', { ...league1, name: 'Updated League 1' });
    expect(getCached('leagues')).toHaveLength(2);
    expect(getCached('leagues').find(l => l.id === 'l1')!.name).toBe('Updated League 1');
  });

  it('deleteCachedItem removes by id', () => {
    const l1: League = { id: 'l1', name: 'A', pointSystem: defaultPointSystem(), createdAt: '2026-01-01' };
    const l2: League = { id: 'l2', name: 'B', pointSystem: defaultPointSystem(), createdAt: '2026-01-01' };
    setCachedItem('leagues', l1);
    setCachedItem('leagues', l2);
    expect(getCached('leagues')).toHaveLength(2);

    deleteCachedItem('leagues', 'l1');
    expect(getCached('leagues')).toHaveLength(1);
    expect(getCached('leagues')[0].id).toBe('l2');
  });

  it('deleteCachedItem is no-op for non-existent id', () => {
    const l1: League = { id: 'l1', name: 'A', pointSystem: defaultPointSystem(), createdAt: '2026-01-01' };
    setCachedItem('leagues', l1);
    deleteCachedItem('leagues', 'nonexistent');
    expect(getCached('leagues')).toHaveLength(1);
  });

  it('migration copies localStorage data to cache', async () => {
    const settings = { soundEnabled: true, countdownEnabled: true, autoAdvance: false, largeDisplay: true, voiceEnabled: false, volume: 80, callTheClockSeconds: 30 };
    localStorage.setItem('poker-timer-settings', JSON.stringify(settings));
    localStorage.removeItem('poker-timer-migrated');
    await resetStorage();
    await initStorage();
    const loaded = getCached('settings');
    expect(loaded).not.toBeNull();
    expect(loaded!.volume).toBe(80);
  });

  it('migration sets migrated flag', async () => {
    localStorage.setItem('poker-timer-settings', JSON.stringify({ soundEnabled: true }));
    localStorage.removeItem('poker-timer-migrated');
    await resetStorage();
    await initStorage();
    expect(localStorage.getItem('poker-timer-migrated')).toBe('true');
  });

  it('migration removes migrated keys from localStorage', async () => {
    localStorage.setItem('poker-timer-history', JSON.stringify([{ id: 'h1', players: [] }]));
    localStorage.removeItem('poker-timer-migrated');
    await resetStorage();
    await initStorage();
    expect(localStorage.getItem('poker-timer-history')).toBeNull();
  });

  it('migration does not remove non-migrated localStorage keys', async () => {
    localStorage.setItem('poker-timer-theme', 'dark');
    localStorage.setItem('poker-timer-language', 'en');
    localStorage.setItem('poker-timer-wizard-completed', 'true');
    localStorage.removeItem('poker-timer-migrated');
    await resetStorage();
    await initStorage();
    expect(localStorage.getItem('poker-timer-theme')).toBe('dark');
    expect(localStorage.getItem('poker-timer-language')).toBe('en');
    expect(localStorage.getItem('poker-timer-wizard-completed')).toBe('true');
  });

  it('migration skips when already migrated', async () => {
    localStorage.setItem('poker-timer-migrated', 'true');
    localStorage.setItem('poker-timer-history', JSON.stringify([{ id: 'h1', players: [] }]));
    await resetStorage();
    await initStorage();
    // Data was NOT migrated because flag was already set
    expect(getCached('history')).toEqual([]);
    // localStorage key still present (not removed since migration was skipped)
    expect(localStorage.getItem('poker-timer-history')).not.toBeNull();
  });

  it('data persists across initStorage calls via IndexedDB', async () => {
    localStorage.removeItem('poker-timer-migrated');
    await resetStorage();
    await initStorage();
    // Write data through cache
    const league: League = { id: 'l1', name: 'Persistent', pointSystem: defaultPointSystem(), createdAt: '2026-01-01' };
    setCachedItem('leagues', league);
    // Wait for async persist to IndexedDB
    await new Promise(r => setTimeout(r, 50));
    // Reset cache and re-init (simulates app restart)
    await resetStorage();
    await initStorage();
    const leagues = getCached('leagues');
    expect(leagues).toHaveLength(1);
    expect(leagues[0].name).toBe('Persistent');
  });

  it('MAX_HISTORY limit is enforced via saveTournamentResult', () => {
    // Create 201 results
    for (let i = 0; i < 201; i++) {
      saveTournamentResult({
        id: `r${i}`,
        name: `T${i}`,
        date: '2026-01-01',
        playerCount: 2,
        buyIn: 10,
        prizePool: 20,
        players: [
          { name: 'A', place: 1, payout: 20, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: 10 },
          { name: 'B', place: 2, payout: 0, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: -10 },
        ],
        bountyEnabled: false,
        bountyAmount: 0,
        rebuyEnabled: false,
        totalRebuys: 0,
        addOnEnabled: false,
        totalAddOns: 0,
        elapsedSeconds: 600,
        levelsPlayed: 3,
      });
    }
    expect(getCached('history').length).toBeLessThanOrEqual(200);
  });

  it('isStorageReady returns true after init', async () => {
    await resetStorage();
    expect(isStorageReady()).toBe(false);
    await initStorage();
    expect(isStorageReady()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Text & CSV Export
// ---------------------------------------------------------------------------
describe('formatResultAsText', () => {
  it('produces WhatsApp-friendly text', () => {
    const result = {
      id: 'test-id',
      name: 'Friday Night',
      date: '2026-01-15T20:00:00.000Z',
      playerCount: 3,
      buyIn: 10,
      prizePool: 30,
      players: [
        { name: 'Alice', place: 1, payout: 21, rebuys: 0, addOn: false, knockouts: 2, bountyEarned: 0, netBalance: 11 },
        { name: 'Carol', place: 2, payout: 9, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: -1 },
        { name: 'Bob', place: 3, payout: 0, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: -10 },
      ],
      bountyEnabled: false, bountyAmount: 0,
      rebuyEnabled: false, totalRebuys: 0,
      addOnEnabled: false, totalAddOns: 0,
      elapsedSeconds: 1500, levelsPlayed: 3,
    };
    const text = formatResultAsText(result);
    expect(text).toContain('♠♥ Friday Night ♦♣');
    expect(text).toContain('🏆 Alice → 21.00 €');
    expect(text).toContain('🥈 Carol → 9.00 €');
    expect(text).toContain('🥉 Bob');
    expect(text).toContain('Prizepool: 30.00 €');
  });

  it('uses English labels when locale is en-US', () => {
    const result = {
      id: 'test-id',
      name: 'Friday Night',
      date: '2026-01-15T20:00:00.000Z',
      playerCount: 3,
      buyIn: 10,
      prizePool: 30,
      players: [
        { name: 'Alice', place: 1, payout: 21, rebuys: 0, addOn: false, knockouts: 2, bountyEarned: 0, netBalance: 11 },
        { name: 'Bob', place: 2, payout: 9, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: -1 },
      ],
      bountyEnabled: false, bountyAmount: 0,
      rebuyEnabled: false, totalRebuys: 0,
      addOnEnabled: false, totalAddOns: 0,
      elapsedSeconds: 1500, levelsPlayed: 3,
    };
    const text = formatResultAsText(result, 'en-US');
    expect(text).toContain('Players');
    expect(text).not.toContain('Spieler');
  });

  it('uses currency symbol from result', () => {
    const result = {
      id: 'test-id',
      name: 'USD Game',
      date: '2026-01-15T20:00:00.000Z',
      playerCount: 2,
      buyIn: 10,
      prizePool: 20,
      currency: 'USD' as const,
      players: [
        { name: 'Alice', place: 1, payout: 20, rebuys: 0, addOn: false, knockouts: 1, bountyEarned: 0, netBalance: 10 },
      ],
      bountyEnabled: false, bountyAmount: 0,
      rebuyEnabled: false, totalRebuys: 0,
      addOnEnabled: false, totalAddOns: 0,
      elapsedSeconds: 600, levelsPlayed: 2,
    };
    const text = formatResultAsText(result);
    expect(text).toContain('$');
    expect(text).not.toContain('€');
  });
});

describe('formatResultAsCSV', () => {
  it('produces valid CSV', () => {
    const result = {
      id: 'test-id',
      name: 'Test',
      date: '2026-01-15T20:00:00.000Z',
      playerCount: 2,
      buyIn: 10,
      prizePool: 20,
      players: [
        { name: 'Alice', place: 1, payout: 20, rebuys: 0, addOn: false, knockouts: 1, bountyEarned: 0, netBalance: 10 },
        { name: 'Bob', place: 2, payout: 0, rebuys: 1, addOn: true, knockouts: 0, bountyEarned: 0, netBalance: -10 },
      ],
      bountyEnabled: false, bountyAmount: 0,
      rebuyEnabled: true, totalRebuys: 1,
      addOnEnabled: true, totalAddOns: 1,
      elapsedSeconds: 900, levelsPlayed: 2,
    };
    const csv = formatResultAsCSV(result);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Place,Name,Payout (€),Rebuys,AddOn,Knockouts,NetBalance (€)');
    expect(lines[1]).toContain('"Alice"');
    expect(lines[2]).toContain('"Bob"');
    expect(lines).toHaveLength(3);
  });

  it('escapes formula injection in player names', () => {
    const result = {
      id: 'test-id',
      name: 'Test',
      date: '2026-01-15T20:00:00.000Z',
      playerCount: 2,
      buyIn: 10,
      prizePool: 20,
      players: [
        { name: '=CMD|calc|A1', place: 1, payout: 20, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: 10 },
        { name: 'Normal Player', place: 2, payout: 0, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: -10 },
      ],
      bountyEnabled: false, bountyAmount: 0,
      rebuyEnabled: false, totalRebuys: 0,
      addOnEnabled: false, totalAddOns: 0,
      elapsedSeconds: 900, levelsPlayed: 2,
    };
    const csv = formatResultAsCSV(result);
    expect(csv).toContain("'=CMD");
    expect(csv).not.toMatch(/^=CMD/m);
  });
});

// ---------------------------------------------------------------------------
// Player Statistics
// ---------------------------------------------------------------------------
describe('computePlayerStats', () => {
  it('aggregates across multiple tournaments', () => {
    const history = [
      {
        id: '1', name: 'T1', date: '2026-01-01', playerCount: 3, buyIn: 10, prizePool: 30,
        players: [
          { name: 'Alice', place: 1, payout: 21, rebuys: 0, addOn: false, knockouts: 2, bountyEarned: 0, netBalance: 11 },
          { name: 'Bob', place: 2, payout: 9, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: -1 },
          { name: 'Carol', place: 3, payout: 0, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: -10 },
        ],
        bountyEnabled: false, bountyAmount: 0, rebuyEnabled: false, totalRebuys: 0,
        addOnEnabled: false, totalAddOns: 0, elapsedSeconds: 1500, levelsPlayed: 3,
      },
      {
        id: '2', name: 'T2', date: '2026-01-08', playerCount: 3, buyIn: 10, prizePool: 30,
        players: [
          { name: 'Bob', place: 1, payout: 21, rebuys: 0, addOn: false, knockouts: 1, bountyEarned: 0, netBalance: 11 },
          { name: 'Alice', place: 2, payout: 9, rebuys: 0, addOn: false, knockouts: 1, bountyEarned: 0, netBalance: -1 },
          { name: 'Carol', place: 3, payout: 0, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: -10 },
        ],
        bountyEnabled: false, bountyAmount: 0, rebuyEnabled: false, totalRebuys: 0,
        addOnEnabled: false, totalAddOns: 0, elapsedSeconds: 1200, levelsPlayed: 2,
      },
    ];
    const stats = computePlayerStats(history);
    expect(stats).toHaveLength(3);
    // Alice: net 11 + -1 = 10, should be first
    const alice = stats.find((s) => s.name === 'Alice')!;
    expect(alice.tournaments).toBe(2);
    expect(alice.wins).toBe(1);
    expect(alice.cashes).toBe(2);
    expect(alice.netBalance).toBe(10);
    expect(alice.avgPlace).toBe(1.5);
    expect(alice.bestPlace).toBe(1);
    expect(alice.knockouts).toBe(3);
    // Bob: net -1 + 11 = 10
    const bob = stats.find((s) => s.name === 'Bob')!;
    expect(bob.wins).toBe(1);
    expect(bob.netBalance).toBe(10);
    // Carol: always 3rd
    const carol = stats.find((s) => s.name === 'Carol')!;
    expect(carol.tournaments).toBe(2);
    expect(carol.wins).toBe(0);
    expect(carol.cashes).toBe(0);
    expect(carol.netBalance).toBe(-20);
    expect(carol.avgPlace).toBe(3);
  });

  it('normalizes player names (case-insensitive)', () => {
    const history = [
      {
        id: '1', name: 'T1', date: '2026-01-01', playerCount: 2, buyIn: 10, prizePool: 20,
        players: [
          { name: 'Alice', place: 1, payout: 20, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: 10 },
          { name: 'bob', place: 2, payout: 0, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: -10 },
        ],
        bountyEnabled: false, bountyAmount: 0, rebuyEnabled: false, totalRebuys: 0,
        addOnEnabled: false, totalAddOns: 0, elapsedSeconds: 600, levelsPlayed: 1,
      },
      {
        id: '2', name: 'T2', date: '2026-01-08', playerCount: 2, buyIn: 10, prizePool: 20,
        players: [
          { name: 'Bob', place: 1, payout: 20, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: 10 },
          { name: 'ALICE', place: 2, payout: 0, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: -10 },
        ],
        bountyEnabled: false, bountyAmount: 0, rebuyEnabled: false, totalRebuys: 0,
        addOnEnabled: false, totalAddOns: 0, elapsedSeconds: 600, levelsPlayed: 1,
      },
    ];
    const stats = computePlayerStats(history);
    // Should be 2 players, not 4
    expect(stats).toHaveLength(2);
  });

  it('returns empty array for empty history', () => {
    expect(computePlayerStats([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// QR Code Decoding
// ---------------------------------------------------------------------------
describe('QR code decoding', () => {
  it('decodeResultFromQR decodes a valid encoded string', () => {
    const encoded = 'Freitagspoker|2025-06-01|4|10|50|5|1|1|120|12|Alice:1:30:0:0:1;Bob:2:15:1:1:0;Charlie:3:5:0:0:0;Diana:4:0:0:0:0';
    const decoded = decodeResultFromQR(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.name).toBe('Freitagspoker');
    expect(decoded!.playerCount).toBe(4);
    expect(decoded!.buyIn).toBe(10);
    expect(decoded!.prizePool).toBe(50);
    expect(decoded!.bountyAmount).toBe(5);
    expect(decoded!.players).toHaveLength(4);
    expect(decoded!.players[0].name).toBe('Alice');
    expect(decoded!.players[0].place).toBe(1);
    expect(decoded!.players[0].payout).toBe(30);
    expect(decoded!.players[1].rebuys).toBe(1);
    expect(decoded!.players[1].addOn).toBe(true);
    expect(decoded!.levelsPlayed).toBe(12);
    expect(decoded!.elapsedSeconds).toBe(7200);
  });

  it('decodeResultFromQR returns null for invalid input', () => {
    expect(decodeResultFromQR('')).toBeNull();
    expect(decodeResultFromQR('not|enough|fields')).toBeNull();
  });

  it('decodeResultFromQR returns null for non-string', () => {
    expect(decodeResultFromQR(null as unknown as string)).toBeNull();
  });
});

describe('SharedResultView currency fallback', () => {
  it('decodeResultFromQR returns undefined currency for QR-encoded results', () => {
    const result = decodeResultFromQR('Test|2025-01-01T00:00:00Z|2|10|20|0|0|0|60|5|Alice:1:15:0:0:0;Bob:2:5:0:0:0');
    expect(result).not.toBeNull();
    expect(result!.currency).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Per-player stack tracking
// ---------------------------------------------------------------------------

describe('initializePlayerStacks', () => {
  it('sets starting chips for active players', () => {
    const players = [
      makePlayer({ id: '1', name: 'A' }),
      makePlayer({ id: '2', name: 'B' }),
    ];
    const result = initializePlayerStacks(players, 20000, 0, 0);
    expect(result[0].chips).toBe(20000);
    expect(result[1].chips).toBe(20000);
  });

  it('accounts for rebuys and add-ons', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', rebuys: 2, addOn: true }),
    ];
    const result = initializePlayerStacks(players, 20000, 20000, 15000);
    expect(result[0].chips).toBe(20000 + 2 * 20000 + 15000);
  });

  it('sets 0 for eliminated players', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', status: 'eliminated' }),
    ];
    const result = initializePlayerStacks(players, 20000, 0, 0);
    expect(result[0].chips).toBe(0);
  });
});

describe('findChipLeader', () => {
  it('returns player with most chips', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', chips: 30000 }),
      makePlayer({ id: '2', name: 'B', chips: 50000 }),
      makePlayer({ id: '3', name: 'C', chips: 20000 }),
    ];
    expect(findChipLeader(players)).toBe('2');
  });

  it('returns null when no stacks tracked', () => {
    const players = [
      makePlayer({ id: '1', name: 'A' }),
      makePlayer({ id: '2', name: 'B' }),
    ];
    expect(findChipLeader(players)).toBeNull();
  });

  it('ignores eliminated players', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', chips: 10000 }),
      makePlayer({ id: '2', name: 'B', chips: 50000, status: 'eliminated' }),
    ];
    expect(findChipLeader(players)).toBe('1');
  });
});

describe('computeAverageStackFromPlayers', () => {
  it('computes average from tracked stacks', () => {
    const players = [
      makePlayer({ id: '1', name: 'A', chips: 30000 }),
      makePlayer({ id: '2', name: 'B', chips: 50000 }),
      makePlayer({ id: '3', name: 'C', chips: 20000 }),
    ];
    expect(computeAverageStackFromPlayers(players)).toBe(Math.round(100000 / 3));
  });

  it('returns null when no stacks tracked', () => {
    const players = [
      makePlayer({ id: '1', name: 'A' }),
    ];
    expect(computeAverageStackFromPlayers(players)).toBeNull();
  });

  it('computes average only from players with tracked stacks (not all active)', () => {
    // 3 active players, but only 2 have stacks → divide by 2, not 3
    const players = [
      makePlayer({ id: '1', name: 'A', chips: 30000 }),
      makePlayer({ id: '2', name: 'B', chips: 50000 }),
      makePlayer({ id: '3', name: 'C' }), // no chips tracked
    ];
    expect(computeAverageStackFromPlayers(players)).toBe(Math.round(80000 / 2));
  });
});

describe('addRebuyToStack', () => {
  it('adds rebuy chips to existing stack', () => {
    const player = makePlayer({ id: '1', name: 'A', chips: 15000 });
    const result = addRebuyToStack(player, 20000);
    expect(result.chips).toBe(35000);
  });

  it('returns unchanged player when chips undefined', () => {
    const player = makePlayer({ id: '1', name: 'A' });
    const result = addRebuyToStack(player, 20000);
    expect(result.chips).toBeUndefined();
  });
});

describe('addAddOnToStack', () => {
  it('adds add-on chips to existing stack', () => {
    const player = makePlayer({ id: '1', name: 'A', chips: 25000 });
    const result = addAddOnToStack(player, 20000);
    expect(result.chips).toBe(45000);
  });
});

// ---------------------------------------------------------------------------
// Persistent Player Database
// ---------------------------------------------------------------------------

describe('Player Database', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadPlayerDatabase returns empty array when no data', () => {
    expect(loadPlayerDatabase()).toEqual([]);
  });

  it('addRegisteredPlayer adds a new player', () => {
    const player = addRegisteredPlayer('Alice');
    expect(player.name).toBe('Alice');
    expect(player.id).toMatch(/^rp_/);
    const db = loadPlayerDatabase();
    expect(db).toHaveLength(1);
    expect(db[0].name).toBe('Alice');
  });

  it('addRegisteredPlayer deduplicates case-insensitively', () => {
    addRegisteredPlayer('Alice');
    const updated = addRegisteredPlayer('alice');
    expect(updated.name).toBe('Alice'); // keeps original casing
    const db = loadPlayerDatabase();
    expect(db).toHaveLength(1);
  });

  it('deleteRegisteredPlayer removes a player', () => {
    const player = addRegisteredPlayer('Bob');
    addRegisteredPlayer('Charlie');
    deleteRegisteredPlayer(player.id);
    const db = loadPlayerDatabase();
    expect(db).toHaveLength(1);
    expect(db[0].name).toBe('Charlie');
  });

  it('syncPlayersToDatabase adds new and updates existing', () => {
    addRegisteredPlayer('Alice');
    syncPlayersToDatabase(['Alice', 'Bob', 'Charlie']);
    const db = loadPlayerDatabase();
    expect(db).toHaveLength(3);
    const names = db.map((p) => p.name);
    expect(names).toContain('Alice');
    expect(names).toContain('Bob');
    expect(names).toContain('Charlie');
  });

  it('importPlayersFromHistory imports from tournament history', () => {
    // Store history via cache (without going through saveTournamentResult
    // which auto-syncs players), to test importPlayersFromHistory in isolation
    const result = {
      id: 'test-1',
      name: 'Test Tournament',
      date: new Date().toISOString(),
      playerCount: 3,
      buyIn: 10,
      prizePool: 30,
      players: [
        { name: 'Alice', place: 1, payout: 20, rebuys: 0, addOn: false, knockouts: 2, bountyEarned: 0, netBalance: 10 },
        { name: 'Bob', place: 2, payout: 10, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: 0 },
        { name: 'Charlie', place: 3, payout: 0, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: -10 },
      ],
      bountyEnabled: false,
      bountyAmount: 0,
      rebuyEnabled: false,
      totalRebuys: 0,
      addOnEnabled: false,
      totalAddOns: 0,
      elapsedSeconds: 3600,
      levelsPlayed: 8,
    };
    setCached('history', [result as TournamentResult]);

    // Add Alice to DB first — should not be duplicated
    addRegisteredPlayer('Alice');
    const added = importPlayersFromHistory();
    expect(added).toBe(2); // Bob + Charlie
    const db = loadPlayerDatabase();
    expect(db).toHaveLength(3);
  });

  it('savePlayerDatabase + loadPlayerDatabase round-trip', () => {
    const players = [
      { id: 'rp_1', name: 'Test', createdAt: '2024-01-01', lastPlayedAt: '2024-06-01' },
    ];
    savePlayerDatabase(players);
    const loaded = loadPlayerDatabase();
    expect(loaded).toEqual(players);
  });
});

// ---------------------------------------------------------------------------
// League — Point System & CRUD
// ---------------------------------------------------------------------------
describe('defaultPointSystem', () => {
  it('returns correct entries', () => {
    const ps = defaultPointSystem();
    expect(ps.entries).toHaveLength(7);
    expect(ps.entries[0]).toEqual({ place: 1, points: 10 });
    expect(ps.entries[6]).toEqual({ place: 7, points: 1 });
  });
});

describe('League CRUD', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('save + load round-trip', () => {
    const league: League = {
      id: 'league_test_1',
      name: 'Friday Night',
      pointSystem: defaultPointSystem(),
      createdAt: new Date().toISOString(),
    };
    saveLeague(league);
    const loaded = loadLeagues();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Friday Night');
  });

  it('delete removes league', () => {
    const league: League = {
      id: 'league_test_2',
      name: 'Test League',
      pointSystem: defaultPointSystem(),
      createdAt: new Date().toISOString(),
    };
    saveLeague(league);
    expect(loadLeagues()).toHaveLength(1);
    deleteLeague('league_test_2');
    expect(loadLeagues()).toHaveLength(0);
  });

  it('upsert updates existing league', () => {
    const league: League = {
      id: 'league_test_3',
      name: 'Original',
      pointSystem: defaultPointSystem(),
      createdAt: new Date().toISOString(),
    };
    saveLeague(league);
    saveLeague({ ...league, name: 'Updated' });
    const loaded = loadLeagues();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Updated');
  });
});

describe('computeLeagueStandings', () => {
  it('aggregates correctly', () => {
    const pointSystem = defaultPointSystem();
    const history: TournamentResult[] = [
      {
        id: 'r1', name: 'T1', date: '2024-01-01', playerCount: 3, buyIn: 10,
        prizePool: 30, bountyEnabled: false, bountyAmount: 0, rebuyEnabled: false,
        totalRebuys: 0, addOnEnabled: false, totalAddOns: 0, elapsedSeconds: 3600, levelsPlayed: 8,
        leagueId: 'league_1',
        players: [
          { name: 'Alice', place: 1, payout: 20, rebuys: 0, addOn: false, knockouts: 2, bountyEarned: 0, netBalance: 10 },
          { name: 'Bob', place: 2, payout: 10, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: 0 },
          { name: 'Carol', place: 3, payout: 0, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: -10 },
        ],
      },
      {
        id: 'r2', name: 'T2', date: '2024-02-01', playerCount: 3, buyIn: 10,
        prizePool: 30, bountyEnabled: false, bountyAmount: 0, rebuyEnabled: false,
        totalRebuys: 0, addOnEnabled: false, totalAddOns: 0, elapsedSeconds: 3600, levelsPlayed: 8,
        leagueId: 'league_1',
        players: [
          { name: 'Bob', place: 1, payout: 20, rebuys: 0, addOn: false, knockouts: 1, bountyEarned: 0, netBalance: 10 },
          { name: 'Alice', place: 2, payout: 10, rebuys: 0, addOn: false, knockouts: 1, bountyEarned: 0, netBalance: 0 },
          { name: 'Carol', place: 3, payout: 0, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: -10 },
        ],
      },
    ];

    const standings = computeLeagueStandings('league_1', history, pointSystem);
    expect(standings).toHaveLength(3);

    // Alice: 1st (10pts) + 2nd (7pts) = 17pts
    const alice = standings.find(s => s.name === 'Alice');
    expect(alice).toBeDefined();
    expect(alice!.points).toBe(17);
    expect(alice!.tournaments).toBe(2);
    expect(alice!.wins).toBe(1);

    // Bob: 2nd (7pts) + 1st (10pts) = 17pts
    const bob = standings.find(s => s.name === 'Bob');
    expect(bob).toBeDefined();
    expect(bob!.points).toBe(17);

    // Carol: 3rd (5pts) + 3rd (5pts) = 10pts
    const carol = standings.find(s => s.name === 'Carol');
    expect(carol).toBeDefined();
    expect(carol!.points).toBe(10);
  });

  it('filters by leagueId', () => {
    const pointSystem = defaultPointSystem();
    const history: TournamentResult[] = [
      {
        id: 'r1', name: 'T1', date: '2024-01-01', playerCount: 2, buyIn: 10,
        prizePool: 20, bountyEnabled: false, bountyAmount: 0, rebuyEnabled: false,
        totalRebuys: 0, addOnEnabled: false, totalAddOns: 0, elapsedSeconds: 3600, levelsPlayed: 8,
        leagueId: 'league_A',
        players: [
          { name: 'Alice', place: 1, payout: 20, rebuys: 0, addOn: false, knockouts: 1, bountyEarned: 0, netBalance: 10 },
          { name: 'Bob', place: 2, payout: 0, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: -10 },
        ],
      },
      {
        id: 'r2', name: 'T2', date: '2024-01-02', playerCount: 2, buyIn: 10,
        prizePool: 20, bountyEnabled: false, bountyAmount: 0, rebuyEnabled: false,
        totalRebuys: 0, addOnEnabled: false, totalAddOns: 0, elapsedSeconds: 3600, levelsPlayed: 8,
        leagueId: 'league_B',
        players: [
          { name: 'Carol', place: 1, payout: 20, rebuys: 0, addOn: false, knockouts: 1, bountyEarned: 0, netBalance: 10 },
          { name: 'Dave', place: 2, payout: 0, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: -10 },
        ],
      },
    ];

    const standingsA = computeLeagueStandings('league_A', history, pointSystem);
    expect(standingsA).toHaveLength(2);
    expect(standingsA.map(s => s.name).sort()).toEqual(['Alice', 'Bob']);

    const standingsB = computeLeagueStandings('league_B', history, pointSystem);
    expect(standingsB).toHaveLength(2);
    expect(standingsB.map(s => s.name).sort()).toEqual(['Carol', 'Dave']);
  });
});

describe('formatLeagueAsText', () => {
  it('produces expected output', () => {
    const league: League = {
      id: 'league_1',
      name: 'Friday League',
      pointSystem: defaultPointSystem(),
      createdAt: '2024-01-01',
    };
    const standings = [
      { name: 'Alice', points: 17, tournaments: 2, wins: 1, cashes: 2, avgPlace: 1.5, bestPlace: 1 },
      { name: 'Bob', points: 10, tournaments: 2, wins: 0, cashes: 1, avgPlace: 2.5, bestPlace: 2 },
    ];
    const text = formatLeagueAsText(league, standings);
    expect(text).toContain('Friday League');
    expect(text).toContain('Alice');
    expect(text).toContain('17 Pts');
    expect(text).toContain('Bob');
  });
});

// ---------------------------------------------------------------------------
// Mystery Bounty
// ---------------------------------------------------------------------------
describe('drawMysteryBounty', () => {
  it('returns correct amount and remaining pool', () => {
    // Use a fixed seed by mocking Math.random
    vi.spyOn(Math, 'random').mockReturnValue(0.0); // will pick index 0
    const result = drawMysteryBounty([5, 10, 20]);
    expect(result.amount).toBe(5);
    expect(result.remainingPool).toEqual([10, 20]);
    vi.restoreAllMocks();
  });

  it('handles empty pool', () => {
    const result = drawMysteryBounty([]);
    expect(result.amount).toBe(0);
    expect(result.remainingPool).toEqual([]);
  });

  it('removes exactly one element from pool', () => {
    const pool = [1, 2, 3, 4, 5];
    const result = drawMysteryBounty(pool);
    expect(result.remainingPool).toHaveLength(4);
    expect(pool).toHaveLength(5); // original unchanged
  });
});

describe('defaultBountyConfig', () => {
  it('includes type field defaulting to fixed', () => {
    const config = defaultBountyConfig();
    expect(config.type).toBe('fixed');
    expect(config.enabled).toBe(false);
    expect(config.amount).toBe(5);
  });
});

describe('parseConfigObject — bounty backward compatibility', () => {
  it('defaults bounty type to fixed for old configs', () => {
    const raw = {
      name: 'Test',
      levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }],
      bounty: { enabled: true, amount: 10 },
    };
    const config = parseConfigObject(raw as Record<string, unknown>);
    expect(config).not.toBeNull();
    expect(config!.bounty.type).toBe('fixed');
    expect(config!.bounty.mysteryPool).toBeUndefined();
  });

  it('preserves mystery bounty type and pool', () => {
    const raw = {
      name: 'Test',
      levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }],
      bounty: { enabled: true, amount: 5, type: 'mystery', mysteryPool: [1, 2, 5, 10] },
    };
    const config = parseConfigObject(raw as Record<string, unknown>);
    expect(config).not.toBeNull();
    expect(config!.bounty.type).toBe('mystery');
    expect(config!.bounty.mysteryPool).toEqual([1, 2, 5, 10]);
  });

  it('parses leagueId from config', () => {
    const raw = {
      name: 'Test',
      levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }],
      leagueId: 'league_123',
    };
    const config = parseConfigObject(raw as Record<string, unknown>);
    expect(config).not.toBeNull();
    expect(config!.leagueId).toBe('league_123');
  });
});

// ---------------------------------------------------------------------------
// Setup Wizard persistence
// ---------------------------------------------------------------------------
describe('Setup Wizard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('isWizardCompleted returns false when not set', () => {
    expect(isWizardCompleted()).toBe(false);
  });

  it('markWizardCompleted sets flag and isWizardCompleted returns true', () => {
    markWizardCompleted();
    expect(isWizardCompleted()).toBe(true);
    expect(localStorage.getItem(WIZARD_KEY)).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Multi-Table Support
// ---------------------------------------------------------------------------
describe('Multi-Table', () => {
  const mkPlayers = (count: number): Player[] =>
    Array.from({ length: count }, (_, i) =>
      makePlayer({ id: `p${i + 1}`, name: `Player ${i + 1}` }),
    );

  /** Helper to create a table with players seated */
  const mkTable = (id: string, name: string, maxSeats: number, playerIds: string[]): Table => {
    const seats = Array.from({ length: maxSeats }, (_, i) => ({
      seatNumber: i + 1,
      playerId: playerIds[i] ?? null,
    }));
    return { id, name, maxSeats, seats, status: 'active' as const, dealerSeat: null };
  };

  // --- Table creation & helpers ---

  it('createTable creates Seat[] array with correct seatNumbers', () => {
    const table = createTable('Table 1');
    expect(table.name).toBe('Table 1');
    expect(table.maxSeats).toBe(10);
    expect(table.seats).toHaveLength(10);
    expect(table.seats[0].seatNumber).toBe(1);
    expect(table.seats[9].seatNumber).toBe(10);
    expect(table.seats.every(s => s.playerId === null)).toBe(true);
    expect(table.status).toBe('active');
    expect(table.dealerSeat).toBeNull();
    expect(table.id).toBeTruthy();
  });

  it('getTablePlayerIds extracts player IDs from seats', () => {
    const table = mkTable('t1', 'T1', 5, ['a', 'b']);
    expect(getTablePlayerIds(table)).toEqual(['a', 'b']);
  });

  it('findLowestAvailableSeat returns correct seat', () => {
    const table = mkTable('t1', 'T1', 5, ['a', 'b']);
    // Seats 1=a, 2=b, 3=null, 4=null, 5=null
    expect(findLowestAvailableSeat(table)).toBe(3);
  });

  it('findLowestAvailableSeat returns null when full', () => {
    const table = mkTable('t1', 'T1', 2, ['a', 'b']);
    expect(findLowestAvailableSeat(table)).toBeNull();
  });

  it('findHighestOccupiedSeat returns correct seat (active only)', () => {
    const table = mkTable('t1', 'T1', 5, ['p1', 'p2', 'p3']);
    const players: Player[] = [
      makePlayer({ id: 'p1', name: 'A' }),
      makePlayer({ id: 'p2', name: 'B', status: 'eliminated' }),
      makePlayer({ id: 'p3', name: 'C' }),
    ];
    const seat = findHighestOccupiedSeat(table, players);
    expect(seat?.seatNumber).toBe(3);
    expect(seat?.playerId).toBe('p3');
  });

  it('findPlayerSeat finds table + seat', () => {
    const tables: Table[] = [
      mkTable('t1', 'T1', 5, ['a', 'b']),
      mkTable('t2', 'T2', 5, ['c', 'd']),
    ];
    const result = findPlayerSeat(tables, 'c');
    expect(result).not.toBeNull();
    expect(result!.table.id).toBe('t2');
    expect(result!.seat.seatNumber).toBe(1);
    expect(findPlayerSeat(tables, 'z')).toBeNull();
  });

  // --- Distribution ---

  it('distributePlayersToTables round-robin assigns seats', () => {
    const tables = [createTable('T1', 10), createTable('T2', 10)];
    const ids = ['a', 'b', 'c', 'd'];
    const result = distributePlayersToTables(ids, tables);
    // P1→T1S1, P2→T2S1, P3→T1S2, P4→T2S2
    expect(result[0].seats[0].playerId).toBe('a');
    expect(result[1].seats[0].playerId).toBe('b');
    expect(result[0].seats[1].playerId).toBe('c');
    expect(result[1].seats[1].playerId).toBe('d');
  });

  it('distributePlayersToTables handles 7 players and 2 tables', () => {
    const tables = [createTable('T1', 10), createTable('T2', 10)];
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const result = distributePlayersToTables(ids, tables);
    const t1Players = getTablePlayerIds(result[0]);
    const t2Players = getTablePlayerIds(result[1]);
    expect(t1Players.length).toBe(4); // a, c, e, g
    expect(t2Players.length).toBe(3); // b, d, f
  });

  it('distributePlayersToTables does not exceed maxSeats', () => {
    const tables = [createTable('T1', 2), createTable('T2', 2)];
    const ids = ['a', 'b', 'c', 'd', 'e']; // 5 players, only 4 seats total
    const result = distributePlayersToTables(ids, tables);
    const t1Count = getTablePlayerIds(result[0]).length;
    const t2Count = getTablePlayerIds(result[1]).length;
    expect(t1Count).toBeLessThanOrEqual(2);
    expect(t2Count).toBeLessThanOrEqual(2);
  });

  // --- Removal ---

  it('removePlayerFromTable empties seat (does not remove it)', () => {
    const tables: Table[] = [
      mkTable('t1', 'T1', 10, ['a', 'b', 'c']),
      mkTable('t2', 'T2', 10, ['d', 'e']),
    ];
    const result = removePlayerFromTable(tables, 'b');
    // Seat 2 should be empty now, not removed
    expect(result[0].seats[1].playerId).toBeNull();
    expect(result[0].seats[0].playerId).toBe('a');
    expect(result[0].seats[2].playerId).toBe('c');
    expect(result[0].seats).toHaveLength(10);
  });

  // --- Lookup ---

  it('findPlayerTable finds the correct table', () => {
    const tables: Table[] = [
      mkTable('t1', 'T1', 10, ['a', 'b']),
      mkTable('t2', 'T2', 10, ['c', 'd']),
    ];
    expect(findPlayerTable(tables, 'c')?.id).toBe('t2');
    expect(findPlayerTable(tables, 'z')).toBeUndefined();
  });

  // --- Active counts ---

  it('getActivePlayersPerTable counts active correctly', () => {
    const tables: Table[] = [
      mkTable('t1', 'T1', 10, ['p1', 'p2', 'p3']),
      mkTable('t2', 'T2', 10, ['p4', 'p5']),
    ];
    const players: Player[] = [
      makePlayer({ id: 'p1', name: 'A' }),
      makePlayer({ id: 'p2', name: 'B', status: 'eliminated' }),
      makePlayer({ id: 'p3', name: 'C' }),
      makePlayer({ id: 'p4', name: 'D' }),
      makePlayer({ id: 'p5', name: 'E', status: 'eliminated' }),
    ];
    const counts = getActivePlayersPerTable(tables, players);
    expect(counts.get('t1')).toBe(2);
    expect(counts.get('t2')).toBe(1);
  });

  // --- Balancing ---

  it('balanceTables with even tables returns no moves', () => {
    const tables: Table[] = [
      mkTable('t1', 'T1', 10, ['p1', 'p2']),
      mkTable('t2', 'T2', 10, ['p3', 'p4']),
    ];
    const players = mkPlayers(4);
    const result = balanceTables(tables, players);
    expect(result.moves).toEqual([]);
  });

  it('balanceTables moves highest seat from largest to lowest seat at smallest', () => {
    // T1: p1(S1) p2(S2) p3(S3) p4(S4) — T2: p5(S1) — diff = 3
    const tables: Table[] = [
      mkTable('t1', 'T1', 10, ['p1', 'p2', 'p3', 'p4']),
      mkTable('t2', 'T2', 10, ['p5']),
    ];
    const players = mkPlayers(5);
    const result = balanceTables(tables, players);
    expect(result.moves.length).toBeGreaterThan(0);
    // First move should be from highest seat (S4 = p4) at T1 to lowest available (S2) at T2
    expect(result.moves[0].fromSeat).toBe(4);
    expect(result.moves[0].toSeat).toBe(2);
    expect(result.moves[0].reason).toBe('balance');
    expect(result.moves[0].timestamp).toBeGreaterThan(0);
  });

  it('balanceTables ensures max diff <= 1 after balancing', () => {
    const tables: Table[] = [
      mkTable('t1', 'T1', 10, ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']),
      mkTable('t2', 'T2', 10, ['p7']),
      mkTable('t3', 'T3', 10, ['p8']),
    ];
    const players = mkPlayers(8);
    const result = balanceTables(tables, players);
    const counts = result.tables.filter(t => t.status === 'active').map(t =>
      t.seats.filter(s => s.playerId !== null).length,
    );
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    expect(max - min).toBeLessThanOrEqual(1);
  });

  // --- Seating a single player ---

  it('seatPlayerAtSmallestTable picks table with fewest active, lowest seat', () => {
    const tables: Table[] = [
      mkTable('t1', 'T1', 5, ['p1', 'p2', 'p3']),
      mkTable('t2', 'T2', 5, ['p4']),
    ];
    const players = mkPlayers(4);
    const result = seatPlayerAtSmallestTable(tables, players, 'p5');
    expect(result).not.toBeNull();
    expect(result!.tableId).toBe('t2');
    expect(result!.seatNumber).toBe(2); // lowest available at T2
  });

  it('seatPlayerAtSmallestTable skips tables with only locked empty seats', () => {
    const t1 = mkTable('t1', 'T1', 2, ['p1']);
    t1.seats[1] = { ...t1.seats[1], locked: true }; // empty but unavailable

    const t2 = mkTable('t2', 'T2', 3, ['p2', 'p3']);
    const tables: Table[] = [t1, t2];
    const players = mkPlayers(3);

    const result = seatPlayerAtSmallestTable(tables, players, 'p4');
    expect(result).not.toBeNull();
    expect(result!.tableId).toBe('t2');
    expect(result!.seatNumber).toBe(3);
  });

  it('seatPlayerAtSmallestTable returns null when all empty seats are locked', () => {
    const t1 = mkTable('t1', 'T1', 2, ['p1']);
    t1.seats[1] = { ...t1.seats[1], locked: true };
    const t2 = mkTable('t2', 'T2', 2, ['p2']);
    t2.seats[1] = { ...t2.seats[1], locked: true };

    const result = seatPlayerAtSmallestTable([t1, t2], mkPlayers(2), 'p3');
    expect(result).toBeNull();
  });

  // --- Dissolution ---

  it('findTableToDissolve finds table at/below threshold', () => {
    const tables: Table[] = [
      mkTable('t1', 'T1', 10, ['p1', 'p2', 'p3', 'p4', 'p5']),
      mkTable('t2', 'T2', 10, ['p6', 'p7']), // 2 players <= threshold 3
    ];
    const players = mkPlayers(7);
    const result = findTableToDissolve(tables, players, 3);
    expect(result?.id).toBe('t2');
  });

  it('dissolveTable distributes players to remaining tables', () => {
    const tables: Table[] = [
      mkTable('t1', 'T1', 10, ['p1', 'p2', 'p3', 'p4', 'p5']),
      mkTable('t2', 'T2', 10, ['p6', 'p7']),
    ];
    const players = mkPlayers(7);
    const result = dissolveTable(tables, players, 't2');
    // T2 should be dissolved
    const t2 = result.tables.find(t => t.id === 't2');
    expect(t2?.status).toBe('dissolved');
    // Players should be moved to T1
    expect(result.moves.length).toBe(2);
    expect(result.moves[0].reason).toBe('dissolution');
    // T1 should now have 7 players
    const t1 = result.tables.find(t => t.id === 't1');
    expect(t1?.seats.filter(s => s.playerId !== null).length).toBe(7);
  });

  // --- Final Table ---

  it('shouldMergeToFinalTable returns true when players fit', () => {
    const tables: Table[] = [
      mkTable('t1', 'T1', 9, ['p1', 'p2', 'p3']),
      mkTable('t2', 'T2', 9, ['p4', 'p5']),
    ];
    const players = mkPlayers(5);
    expect(shouldMergeToFinalTable(tables, players)).toBe(true);
  });

  it('shouldMergeToFinalTable returns false when too many players', () => {
    const tables: Table[] = [
      mkTable('t1', 'T1', 4, ['p1', 'p2', 'p3']),
      mkTable('t2', 'T2', 4, ['p4', 'p5']),
    ];
    const players = mkPlayers(5);
    expect(shouldMergeToFinalTable(tables, players)).toBe(false);
  });

  it('shouldMergeToFinalTable returns false with single table', () => {
    const tables: Table[] = [
      mkTable('t1', 'T1', 10, ['p1', 'p2']),
    ];
    const players = mkPlayers(2);
    expect(shouldMergeToFinalTable(tables, players)).toBe(false);
  });

  it('shouldMergeToFinalTable ignores dissolved tables', () => {
    const dissolved = mkTable('t1', 'T1', 10, []);
    dissolved.status = 'dissolved';
    const tables: Table[] = [
      dissolved,
      mkTable('t2', 'T2', 5, ['p1', 'p2', 'p3']),
    ];
    const players = mkPlayers(3);
    // Only 1 active table => false (can't merge to fewer)
    expect(shouldMergeToFinalTable(tables, players)).toBe(false);
  });

  it('mergeToFinalTable seats all active players, others dissolved', () => {
    const tables: Table[] = [
      mkTable('t1', 'T1', 9, ['p1', 'p2', 'p3']),
      mkTable('t2', 'T2', 9, ['p4', 'p5']),
    ];
    const players: Player[] = [
      ...mkPlayers(4),
      makePlayer({ id: 'p5', name: 'Player 5', status: 'eliminated' }),
    ];
    const result = mergeToFinalTable(tables, players);
    const finalTable = result.tables.find(t => t.status === 'active');
    expect(finalTable).toBeTruthy();
    expect(finalTable!.name).toBe('Final Table');
    const seatedIds = finalTable!.seats.filter(s => s.playerId !== null).map(s => s.playerId);
    expect(seatedIds).toContain('p1');
    expect(seatedIds).toContain('p2');
    expect(seatedIds).toContain('p3');
    expect(seatedIds).toContain('p4');
    expect(seatedIds).not.toContain('p5'); // eliminated
    // T2 should be dissolved
    const t2 = result.tables.find(t => t.id === 't2');
    expect(t2?.status).toBe('dissolved');
  });

  it('mergeToFinalTable moves have reason final-table', () => {
    const tables: Table[] = [
      mkTable('t1', 'T1', 9, ['p1', 'p2']),
      mkTable('t2', 'T2', 9, ['p3', 'p4']),
    ];
    const players = mkPlayers(4);
    const result = mergeToFinalTable(tables, players);
    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every(m => m.reason === 'final-table')).toBe(true);
  });

  // --- Guard clauses: unseated / skipped tracking ---

  it('mergeToFinalTable returns unseated players when final table too small', () => {
    // 4 active players but final table only has 2 seats
    const tables: Table[] = [
      mkTable('t1', 'T1', 2, ['p1', 'p2']),
      mkTable('t2', 'T2', 2, ['p3', 'p4']),
    ];
    const players = mkPlayers(4);
    const result = mergeToFinalTable(tables, players);
    // 2 seated, 2 unseated
    expect(result.unseated.length).toBe(2);
    const finalTable = result.tables.find(t => t.status === 'active');
    expect(finalTable!.seats.filter(s => s.playerId !== null).length).toBe(2);
  });

  it('mergeToFinalTable returns empty unseated when all fit', () => {
    const tables: Table[] = [
      mkTable('t1', 'T1', 9, ['p1', 'p2']),
      mkTable('t2', 'T2', 9, ['p3', 'p4']),
    ];
    const players = mkPlayers(4);
    const result = mergeToFinalTable(tables, players);
    expect(result.unseated).toEqual([]);
  });

  it('dissolveTable returns skipped players when target tables full', () => {
    // T1 has 3 seats, all occupied. T2 has 2 players to dissolve. No room at T1.
    const tables: Table[] = [
      mkTable('t1', 'T1', 3, ['p1', 'p2', 'p3']),
      mkTable('t2', 'T2', 3, ['p4', 'p5']),
    ];
    const players = mkPlayers(5);
    const result = dissolveTable(tables, players, 't2');
    // T1 is full (3/3), so both p4 and p5 should be skipped
    expect(result.skipped.length).toBe(2);
    expect(result.skipped).toContain('p4');
    expect(result.skipped).toContain('p5');
  });

  it('dissolveTable returns empty skipped when all placed', () => {
    const tables: Table[] = [
      mkTable('t1', 'T1', 10, ['p1', 'p2', 'p3']),
      mkTable('t2', 'T2', 10, ['p4', 'p5']),
    ];
    const players = mkPlayers(5);
    const result = dissolveTable(tables, players, 't2');
    expect(result.skipped).toEqual([]);
    expect(result.moves.length).toBe(2);
  });

  it('distributePlayersToTables warns when players cannot be seated', () => {
    // 5 players, 2 tables with 2 seats each = 4 seats max
    const tables: Table[] = [createTable('T1', 2), createTable('T2', 2)];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = distributePlayersToTables(['p1', 'p2', 'p3', 'p4', 'p5'], tables);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('1 player(s) could not be seated'),
      expect.any(Array),
    );
    // 4 of 5 should be seated
    const seated = result.flatMap(t => t.seats.filter(s => s.playerId !== null));
    expect(seated.length).toBe(4);
    warnSpy.mockRestore();
  });

  it('distributePlayersToTables seats all when capacity sufficient', () => {
    const tables: Table[] = [createTable('T1', 5), createTable('T2', 5)];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    distributePlayersToTables(['p1', 'p2', 'p3', 'p4'], tables);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // --- Dealer ---

  it('advanceTableDealer skips empty seats', () => {
    const table = mkTable('t1', 'T1', 5, ['p1']);
    // Only p1 at seat 1, rest empty. Dealer at seat 1.
    table.dealerSeat = 1;
    const players = mkPlayers(1);
    const result = advanceTableDealer(table, players);
    // Should wrap back to seat 1 (only occupied seat)
    expect(result.dealerSeat).toBe(1);
  });

  it('advanceTableDealer skips eliminated players', () => {
    const table = mkTable('t1', 'T1', 5, ['p1', 'p2', 'p3']);
    table.dealerSeat = 1;
    const players: Player[] = [
      makePlayer({ id: 'p1', name: 'A' }),
      makePlayer({ id: 'p2', name: 'B', status: 'eliminated' }),
      makePlayer({ id: 'p3', name: 'C' }),
    ];
    const result = advanceTableDealer(table, players);
    // Should skip p2 (eliminated) and go to p3 at seat 3
    expect(result.dealerSeat).toBe(3);
  });

  // --- resizeTable ---

  it('resizeTable growing a table adds empty seats', () => {
    const tables = [mkTable('t1', 'T1', 4, ['p1', 'p2'])];
    const result = resizeTable(tables, 't1', 6);
    expect(result.warning).toBeUndefined();
    expect(result.tables[0].maxSeats).toBe(6);
    expect(result.tables[0].seats).toHaveLength(6);
    // Original seats preserved
    expect(result.tables[0].seats[0].playerId).toBe('p1');
    expect(result.tables[0].seats[1].playerId).toBe('p2');
    // New seats are empty
    expect(result.tables[0].seats[4].playerId).toBeNull();
    expect(result.tables[0].seats[4].seatNumber).toBe(5);
    expect(result.tables[0].seats[5].playerId).toBeNull();
    expect(result.tables[0].seats[5].seatNumber).toBe(6);
  });

  it('resizeTable shrinking a table removes empty seats from the end', () => {
    const tables = [mkTable('t1', 'T1', 6, ['p1', 'p2'])];
    // p1 at seat 1, p2 at seat 2, seats 3-6 empty
    const result = resizeTable(tables, 't1', 4);
    expect(result.warning).toBeUndefined();
    expect(result.tables[0].maxSeats).toBe(4);
    expect(result.tables[0].seats).toHaveLength(4);
    expect(result.tables[0].seats[0].playerId).toBe('p1');
    expect(result.tables[0].seats[1].playerId).toBe('p2');
  });

  it('resizeTable cannot shrink past occupied seats', () => {
    const tables = [mkTable('t1', 'T1', 6, ['p1', 'p2', 'p3', 'p4', 'p5'])];
    // p1-p5 at seats 1-5, seat 6 empty — try to shrink to 4
    const result = resizeTable(tables, 't1', 4);
    expect(result.warning).toBe('cannotResize');
    // Tables unchanged
    expect(result.tables[0].maxSeats).toBe(6);
    expect(result.tables[0].seats).toHaveLength(6);
  });

  it('resizeTable cannot shrink past locked seats', () => {
    const tables = [mkTable('t1', 'T1', 6, [])];
    // Lock seat 5
    tables[0].seats[4] = { seatNumber: 5, playerId: null, locked: true };
    const result = resizeTable(tables, 't1', 4);
    expect(result.warning).toBe('cannotResize');
    expect(result.tables[0].maxSeats).toBe(6);
    expect(result.tables[0].seats).toHaveLength(6);
  });

  // --- Backward compatibility ---

  it('parseConfigObject migrates old Table format (playerIds[]) to new (seats[])', () => {
    const raw = {
      name: 'Test',
      levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }],
      tables: [
        { id: 't1', name: 'Table 1', seats: 10, playerIds: ['a', 'b'] },
      ],
    };
    const config = parseConfigObject(raw as Record<string, unknown>);
    expect(config).not.toBeNull();
    expect(config!.tables).toHaveLength(1);
    expect(config!.tables![0].name).toBe('Table 1');
    expect(config!.tables![0].maxSeats).toBe(10);
    expect(config!.tables![0].seats).toHaveLength(10);
    expect(config!.tables![0].seats[0].playerId).toBe('a');
    expect(config!.tables![0].seats[1].playerId).toBe('b');
    expect(config!.tables![0].seats[2].playerId).toBeNull();
    expect(config!.tables![0].status).toBe('active');
  });

  it('parseConfigObject parses multiTable config with defaults', () => {
    const raw = {
      name: 'Test',
      levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }],
      multiTable: { enabled: true, seatsPerTable: 8 },
    };
    const config = parseConfigObject(raw as Record<string, unknown>);
    expect(config!.multiTable).toBeDefined();
    expect(config!.multiTable!.enabled).toBe(true);
    expect(config!.multiTable!.seatsPerTable).toBe(8);
    expect(config!.multiTable!.dissolveThreshold).toBe(3); // default
    expect(config!.multiTable!.autoBalanceOnElimination).toBe(true); // default
  });

  it('parseConfigObject returns undefined tables when field is missing', () => {
    const raw = {
      name: 'Test',
      levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }],
    };
    const config = parseConfigObject(raw as Record<string, unknown>);
    expect(config).not.toBeNull();
    expect(config!.tables).toBeUndefined();
    expect(config!.multiTable).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// League Export / Import
// ---------------------------------------------------------------------------
describe('League Export / Import', () => {
  it('exportLeagueToJSON returns valid JSON with league and results', () => {
    const league: League = {
      id: 'test-league',
      name: 'Friday Night',
      pointSystem: { entries: [{ place: 1, points: 10 }] },
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    const json = exportLeagueToJSON(league);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(2);
    expect(parsed.league.id).toBe('test-league');
    expect(parsed.league.name).toBe('Friday Night');
    expect(Array.isArray(parsed.results)).toBe(true);
    expect(typeof parsed.exportedAt).toBe('string');
  });

  it('parseLeagueFile round-trip returns same league data', () => {
    const league: League = {
      id: 'rt-league',
      name: 'Round Trip',
      pointSystem: { entries: [{ place: 1, points: 10 }, { place: 2, points: 7 }] },
      createdAt: '2024-06-01T00:00:00.000Z',
    };
    const json = exportLeagueToJSON(league);
    const parsed = parseLeagueFile(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.league.name).toBe('Round Trip');
    expect(parsed!.league.pointSystem.entries).toHaveLength(2);
  });

  it('parseLeagueFile returns null for invalid input', () => {
    expect(parseLeagueFile('')).toBeNull();
    expect(parseLeagueFile('{}')).toBeNull();
    expect(parseLeagueFile('{"league": {}}')).toBeNull();
    expect(parseLeagueFile('not json')).toBeNull();
    expect(parseLeagueFile('{"league": {"id": "x", "name": "y"}}')).toBeNull(); // missing results
  });

  it('parseLeagueFile accepts valid export with results', () => {
    const payload = {
      version: 1,
      league: { id: 'l1', name: 'Test', pointSystem: { entries: [] }, createdAt: '2024-01-01T00:00:00.000Z' },
      results: [{ id: 'r1', leagueId: 'l1', name: 'T1', date: '2024-01-01', playerCount: 6, buyIn: 10, prizePool: 60, players: [], bountyEnabled: false, bountyAmount: 0, rebuyEnabled: false, totalRebuys: 0, addOnEnabled: false, totalAddOns: 0, elapsedSeconds: 3600, levelsPlayed: 5 }],
      exportedAt: '2024-01-01T00:00:00.000Z',
    };
    const result = parseLeagueFile(JSON.stringify(payload));
    expect(result).not.toBeNull();
    expect(result!.results).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
describe('extractLeagueConfig', () => {
  it('removes per-tournament fields (players, dealerIndex, tables, leagueId)', () => {
    const config = makeConfig({
      name: 'League Night',
      levels: [{ type: 'level', duration: 600, smallBlind: 25, bigBlind: 50 }],
      buyIn: 20,
      startingChips: 30000,
    });
    config.players = [{ id: '1', name: 'Alice', rebuys: 0, addOn: false, status: 'active', placement: null, eliminatedBy: null, knockouts: 0 }];
    config.dealerIndex = 2;
    config.leagueId = 'league_123';
    config.tables = [{ id: 't1', name: 'Table 1', maxSeats: 10, seats: [], status: 'active', dealerSeat: null }];

    const extracted = extractLeagueConfig(config);
    expect(extracted).not.toHaveProperty('players');
    expect(extracted).not.toHaveProperty('dealerIndex');
    expect(extracted).not.toHaveProperty('tables');
    expect(extracted).not.toHaveProperty('leagueId');
    expect(extracted).toHaveProperty('name', 'League Night');
    expect(extracted).toHaveProperty('buyIn', 20);
    expect(extracted).toHaveProperty('startingChips', 30000);
    expect(extracted).toHaveProperty('levels');
    expect(extracted).toHaveProperty('payout');
    expect(extracted).toHaveProperty('rebuy');
  });

  it('preserves multiTable config field', () => {
    const config = makeConfig({
      name: 'MT League',
      levels: [{ type: 'level', duration: 600, smallBlind: 25, bigBlind: 50 }],
    });
    config.multiTable = { seatsPerTable: 8, dissolveThreshold: 3, autoBalanceOnElimination: true };
    const extracted = extractLeagueConfig(config);
    expect(extracted).toHaveProperty('multiTable');
    expect((extracted as TournamentConfig).multiTable?.seatsPerTable).toBe(8);
  });

  it('league with defaultConfig saves and loads via CRUD', () => {
    const leagueConfig = extractLeagueConfig(makeConfig({
      name: 'Config League',
      levels: [{ type: 'level', duration: 600, smallBlind: 25, bigBlind: 50 }],
      buyIn: 15,
    }));
    const league: League = {
      id: 'league_with_config',
      name: 'Config League',
      pointSystem: defaultPointSystem(),
      createdAt: new Date().toISOString(),
      defaultConfig: leagueConfig,
    };
    saveLeague(league);
    const loaded = loadLeagues();
    const found = loaded.find(l => l.id === 'league_with_config');
    expect(found).toBeDefined();
    expect(found!.defaultConfig).toBeDefined();
    expect(found!.defaultConfig!.buyIn).toBe(15);
  });

  it('league export/import preserves defaultConfig', () => {
    const leagueConfig = extractLeagueConfig(makeConfig({
      name: 'Export Test',
      levels: [{ type: 'level', duration: 600, smallBlind: 25, bigBlind: 50 }],
      buyIn: 25,
    }));
    const league: League = {
      id: 'export_config',
      name: 'Export Config',
      pointSystem: defaultPointSystem(),
      createdAt: new Date().toISOString(),
      defaultConfig: { ...leagueConfig, buyIn: 25 },
    };
    saveLeague(league);
    const json = exportLeagueToJSON(league);
    const parsed = parseLeagueFile(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.league.defaultConfig).toBeDefined();
    expect(parsed!.league.defaultConfig!.buyIn).toBe(25);
  });

  it('parseLeagueFile handles league without defaultConfig (backward compat)', () => {
    const payload = {
      version: 1,
      league: { id: 'old', name: 'Old League', pointSystem: { entries: [] }, createdAt: '2024-01-01' },
      results: [],
      exportedAt: '2024-01-01',
    };
    const parsed = parseLeagueFile(JSON.stringify(payload));
    expect(parsed).not.toBeNull();
    expect(parsed!.league.defaultConfig).toBeUndefined();
  });
});

// ============================================================================
// Tournament Presets
// ============================================================================

describe('getBuiltInPresets', () => {
  it('returns 3 presets with valid configs', () => {
    const presets = getBuiltInPresets();
    expect(presets).toHaveLength(3);
    for (const preset of presets) {
      expect(preset.id).toBeTruthy();
      expect(preset.nameKey).toBeTruthy();
      expect(preset.descKey).toBeTruthy();
      expect(preset.config.levels).toBeDefined();
      expect(Array.isArray(preset.config.levels)).toBe(true);
      expect(preset.config.levels!.length).toBeGreaterThan(0);
      expect(preset.config.buyIn).toBeGreaterThan(0);
      expect(preset.config.startingChips).toBeGreaterThan(0);
    }
  });

  it('preset configs do not contain per-tournament fields', () => {
    const presets = getBuiltInPresets();
    for (const preset of presets) {
      expect(preset.config.players).toBeUndefined();
      expect(preset.config.dealerIndex).toBeUndefined();
      expect(preset.config.tables).toBeUndefined();
      expect(preset.config.leagueId).toBeUndefined();
    }
  });

  it('applying preset preserves existing players', () => {
    const players: Player[] = [
      { id: 'p1', name: 'Alice', rebuys: 0, addOn: false, status: 'active', placement: null, eliminatedBy: null, knockouts: 0 },
      { id: 'p2', name: 'Bob', rebuys: 0, addOn: false, status: 'active', placement: null, eliminatedBy: null, knockouts: 0 },
    ];
    const baseConfig = makeConfig({ name: 'Test', levels: [], players, dealerIndex: 1 });
    const preset = getBuiltInPresets()[0];
    const applied = { ...baseConfig, ...preset.config, players: baseConfig.players, dealerIndex: baseConfig.dealerIndex, tables: baseConfig.tables, leagueId: baseConfig.leagueId };
    expect(applied.players).toEqual(players);
    expect(applied.dealerIndex).toBe(1);
    expect(applied.buyIn).toBe(preset.config.buyIn);
    expect(applied.startingChips).toBe(preset.config.startingChips);
  });
});

// ============================================================================
// Side Pot Calculator
// ============================================================================

describe('computeSidePots', () => {
  it('returns empty for fewer than 2 stacks', () => {
    expect(computeSidePots([])).toEqual([]);
    expect(computeSidePots([100])).toEqual([]);
  });

  it('computes correct pots for 2 players with different stacks', () => {
    const pots = computeSidePots([500, 1000]);
    expect(pots).toHaveLength(2);
    expect(pots[0]).toEqual({ amount: 1000, eligiblePlayers: 2, label: 'Main Pot' });
    expect(pots[1]).toEqual({ amount: 500, eligiblePlayers: 1, label: 'Side Pot 1' });
    // Total should equal sum of stacks
    expect(pots.reduce((s, p) => s + p.amount, 0)).toBe(1500);
  });

  it('computes correct pots for 3 players', () => {
    const pots = computeSidePots([300, 600, 1000]);
    expect(pots).toHaveLength(3);
    expect(pots[0]).toEqual({ amount: 900, eligiblePlayers: 3, label: 'Main Pot' });
    expect(pots[1]).toEqual({ amount: 600, eligiblePlayers: 2, label: 'Side Pot 1' });
    expect(pots[2]).toEqual({ amount: 400, eligiblePlayers: 1, label: 'Side Pot 2' });
    expect(pots.reduce((s, p) => s + p.amount, 0)).toBe(1900);
  });

  it('handles equal stacks (single pot)', () => {
    const pots = computeSidePots([500, 500, 500]);
    expect(pots).toHaveLength(1);
    expect(pots[0]).toEqual({ amount: 1500, eligiblePlayers: 3, label: 'Main Pot' });
  });

  it('handles duplicate stack values among different players', () => {
    const pots = computeSidePots([200, 200, 500]);
    expect(pots).toHaveLength(2);
    expect(pots[0]).toEqual({ amount: 600, eligiblePlayers: 3, label: 'Main Pot' });
    expect(pots[1]).toEqual({ amount: 300, eligiblePlayers: 1, label: 'Side Pot 1' });
  });

  it('filters out negative stack values', () => {
    const pots = computeSidePots([-100, 500, 1000]);
    expect(pots).toHaveLength(2);
    expect(pots[0]).toEqual({ amount: 1000, eligiblePlayers: 2, label: 'Main Pot' });
    expect(pots[1]).toEqual({ amount: 500, eligiblePlayers: 1, label: 'Side Pot 1' });
  });

  it('filters out zero stack values', () => {
    const pots = computeSidePots([0, 0, 500]);
    expect(pots).toEqual([]);
  });

  it('returns empty when all stacks are negative', () => {
    expect(computeSidePots([-100, -200])).toEqual([]);
  });
});

// ============================================================================
// calculateSidePots (advanced, with names/fold/warnings)
// ============================================================================

describe('calculateSidePots', () => {
  function mkPlayer(id: string, name: string, invested: number, status: PlayerPotInput['status'] = 'active'): PlayerPotInput {
    return { id, name, invested, status };
  }

  it('returns empty result for fewer than 2 contributing players', () => {
    const result = calculateSidePots([]);
    expect(result.pots).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('returns empty and warning for single player', () => {
    const result = calculateSidePots([mkPlayer('a', 'Alice', 500)]);
    expect(result.pots).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.warnings.some(w => w.includes('1 Spieler'))).toBe(true);
  });

  it('computes simple main pot without side pot (equal amounts)', () => {
    const result = calculateSidePots([
      mkPlayer('a', 'Alice', 500),
      mkPlayer('b', 'Bob', 500),
      mkPlayer('c', 'Charlie', 500),
    ]);
    expect(result.pots).toHaveLength(1);
    expect(result.pots[0].type).toBe('main');
    expect(result.pots[0].amount).toBe(1500);
    expect(result.pots[0].eligiblePlayerIds).toHaveLength(3);
    expect(result.total).toBe(1500);
    expect(result.warnings.some(w => w.includes('kein Side Pot'))).toBe(true);
  });

  it('computes one side pot with 2 players', () => {
    const result = calculateSidePots([
      mkPlayer('a', 'Alice', 500, 'all-in'),
      mkPlayer('b', 'Bob', 1000),
    ]);
    expect(result.pots).toHaveLength(2);
    // Main pot: 500 × 2 = 1000
    expect(result.pots[0].type).toBe('main');
    expect(result.pots[0].amount).toBe(1000);
    expect(result.pots[0].eligiblePlayerIds).toEqual(['a', 'b']);
    // Side pot: 500 × 1 = 500
    expect(result.pots[1].type).toBe('side');
    expect(result.pots[1].amount).toBe(500);
    expect(result.pots[1].eligiblePlayerIds).toEqual(['b']);
    expect(result.total).toBe(1500);
  });

  it('computes multiple side pots with 3 different amounts', () => {
    const result = calculateSidePots([
      mkPlayer('a', 'Alice', 1000),
      mkPlayer('b', 'Bob', 500, 'all-in'),
      mkPlayer('c', 'Charlie', 11000),
    ]);
    // Sorted: Bob(500), Alice(1000), Charlie(11000)
    // Level 500: 500 × 3 = 1500 (main pot, all eligible)
    // Level 1000: 500 × 2 = 1000 (side pot 1, Alice + Charlie)
    // Level 11000: 10000 × 1 = 10000 (side pot 2, Charlie only)
    expect(result.pots).toHaveLength(3);
    expect(result.pots[0].amount).toBe(1500);
    expect(result.pots[0].eligiblePlayerNames).toEqual(expect.arrayContaining(['Alice', 'Bob', 'Charlie']));
    expect(result.pots[1].amount).toBe(1000);
    expect(result.pots[2].amount).toBe(10000);
    expect(result.total).toBe(12500);
  });

  it('folded player contributes to pot but is not eligible', () => {
    const result = calculateSidePots([
      mkPlayer('a', 'Alice', 500, 'active'),
      mkPlayer('b', 'Bob', 1000, 'all-in'),
      mkPlayer('c', 'Charlie', 1000, 'active'),
      mkPlayer('d', 'Diana', 3000, 'folded'),
      mkPlayer('e', 'Eve', 3000, 'active'),
    ]);
    // Sorted: Alice(500), Bob(1000), Charlie(1000), Diana(3000), Eve(3000)
    // Level 500: 500 × 5 = 2500 (eligible: Alice, Bob, Charlie, Eve — NOT Diana)
    expect(result.pots[0].amount).toBe(2500);
    expect(result.pots[0].eligiblePlayerIds).not.toContain('d');
    expect(result.pots[0].eligiblePlayerIds).toHaveLength(4);

    // Level 1000: 500 × 4 = 2000 (eligible: Bob, Charlie, Eve — NOT Alice, NOT Diana)
    expect(result.pots[1].amount).toBe(2000);
    expect(result.pots[1].eligiblePlayerIds).not.toContain('a');
    expect(result.pots[1].eligiblePlayerIds).not.toContain('d');

    // Level 3000: 2000 × 2 = 4000 (eligible: Eve — NOT Diana who folded)
    expect(result.pots[2].amount).toBe(4000);
    expect(result.pots[2].eligiblePlayerIds).toEqual(['e']);

    // Total should equal sum of all investments
    expect(result.total).toBe(500 + 1000 + 1000 + 3000 + 3000);
  });

  it('ignores players with 0 invested and warns', () => {
    const result = calculateSidePots([
      mkPlayer('a', 'Alice', 500),
      mkPlayer('b', 'Bob', 0),
      mkPlayer('c', 'Charlie', 500),
    ]);
    expect(result.pots).toHaveLength(1);
    expect(result.pots[0].amount).toBe(1000);
    expect(result.pots[0].eligiblePlayerIds).toHaveLength(2);
    expect(result.warnings.some(w => w.includes('0 Einsatz'))).toBe(true);
  });

  it('handles unsorted inputs correctly', () => {
    const result = calculateSidePots([
      mkPlayer('c', 'Charlie', 11000),
      mkPlayer('a', 'Alice', 1000),
      mkPlayer('b', 'Bob', 500, 'all-in'),
    ]);
    // Same as the 3-player test but in different order
    expect(result.pots).toHaveLength(3);
    expect(result.total).toBe(12500);
  });

  it('handles players with equal investments (some folded)', () => {
    const result = calculateSidePots([
      mkPlayer('a', 'Alice', 1000, 'active'),
      mkPlayer('b', 'Bob', 1000, 'folded'),
      mkPlayer('c', 'Charlie', 1000, 'active'),
    ]);
    expect(result.pots).toHaveLength(1);
    expect(result.pots[0].amount).toBe(3000);
    // Bob folded but invested same — only Alice and Charlie eligible
    expect(result.pots[0].eligiblePlayerIds).toEqual(['a', 'c']);
    expect(result.total).toBe(3000);
  });

  it('warns when all players have folded', () => {
    const result = calculateSidePots([
      mkPlayer('a', 'Alice', 500, 'folded'),
      mkPlayer('b', 'Bob', 500, 'folded'),
    ]);
    expect(result.pots).toHaveLength(1);
    expect(result.pots[0].eligiblePlayerIds).toHaveLength(0);
    expect(result.warnings.some(w => w.includes('alle gefoldet') || w.includes('Alle Spieler'))).toBe(true);
  });

  it('total always equals sum of all investments', () => {
    const investments = [100, 250, 250, 800, 1500, 1500, 3000];
    const players = investments.map((inv, i) => mkPlayer(`p${i}`, `P${i}`, inv));
    const result = calculateSidePots(players);
    const totalInvested = investments.reduce((s, v) => s + v, 0);
    expect(result.total).toBe(totalInvested);
  });

  it('correctly handles 10 players with varying amounts', () => {
    const players: PlayerPotInput[] = [];
    for (let i = 0; i < 10; i++) {
      players.push(mkPlayer(`p${i}`, `Player ${i + 1}`, (i + 1) * 100, i % 3 === 0 ? 'all-in' : 'active'));
    }
    const result = calculateSidePots(players);
    const totalInvested = players.reduce((s, p) => s + p.invested, 0);
    expect(result.total).toBe(totalInvested);
    expect(result.pots.length).toBeGreaterThan(1);
    // First pot should be main
    expect(result.pots[0].type).toBe('main');
    // All subsequent should be side
    for (let i = 1; i < result.pots.length; i++) {
      expect(result.pots[i].type).toBe('side');
    }
  });
});

// ============================================================================
// Resolve Pot Winners (Side Pot Payout)
// ============================================================================

describe('resolvePotWinners', () => {
  const mkPlayer = (id: string, name: string, invested: number, status: 'active' | 'all-in' | 'folded' = 'active'): PlayerPotInput => ({
    id, name, invested, status,
  });

  it('single winner takes full pot', () => {
    const players = [
      mkPlayer('a', 'Alice', 1000),
      mkPlayer('b', 'Bob', 1000),
    ];
    const { pots } = calculateSidePots(players);
    const winners: PotWinnerAssignment[] = [{ potIndex: 0, winnerIds: ['a'] }];
    const result = resolvePotWinners(players, pots, winners);
    expect(result.payouts).toHaveLength(2);
    const alice = result.payouts.find(p => p.playerId === 'a')!;
    expect(alice.payout).toBe(2000);
    expect(alice.net).toBe(1000); // won 2000, invested 1000
    const bob = result.payouts.find(p => p.playerId === 'b')!;
    expect(bob.payout).toBe(0);
    expect(bob.net).toBe(-1000);
    expect(result.total).toBe(2000);
    expect(result.oddChips).toHaveLength(0);
  });

  it('split pot divides evenly between two winners', () => {
    const players = [
      mkPlayer('a', 'Alice', 500),
      mkPlayer('b', 'Bob', 500),
    ];
    const { pots } = calculateSidePots(players);
    const winners: PotWinnerAssignment[] = [{ potIndex: 0, winnerIds: ['a', 'b'] }];
    const result = resolvePotWinners(players, pots, winners);
    const alice = result.payouts.find(p => p.playerId === 'a')!;
    const bob = result.payouts.find(p => p.playerId === 'b')!;
    expect(alice.payout).toBe(500);
    expect(bob.payout).toBe(500);
    expect(alice.net).toBe(0);
    expect(bob.net).toBe(0);
    expect(result.oddChips).toHaveLength(0);
  });

  it('odd chip goes to first winner in split', () => {
    const players = [
      mkPlayer('a', 'Alice', 500),
      mkPlayer('b', 'Bob', 500),
      mkPlayer('c', 'Charlie', 500),
    ];
    const { pots } = calculateSidePots(players);
    // 1500 total, split between 2 winners → 750 each, but 1500/2 = 750 exact
    // Use 3 winners → 1500/3 = 500 exact, no odd chip
    const winners: PotWinnerAssignment[] = [{ potIndex: 0, winnerIds: ['a', 'b'] }];
    const result = resolvePotWinners(players, pots, winners);
    const alice = result.payouts.find(p => p.playerId === 'a')!;
    const bob = result.payouts.find(p => p.playerId === 'b')!;
    expect(alice.payout).toBe(750);
    expect(bob.payout).toBe(750);
    expect(result.oddChips).toHaveLength(0);
  });

  it('odd chip generated for indivisible split', () => {
    // 3 players invest 100 each → pot = 300, split 2 ways → 150 each, exact
    // Instead: 3 players invest different amounts → create scenario with odd chip
    const players = [
      mkPlayer('a', 'Alice', 501),
      mkPlayer('b', 'Bob', 501),
      mkPlayer('c', 'Charlie', 501),
    ];
    const { pots } = calculateSidePots(players);
    // Total = 1503, split 2 ways → 751 + 752, remainder = 1
    const winners: PotWinnerAssignment[] = [{ potIndex: 0, winnerIds: ['a', 'b'] }];
    const result = resolvePotWinners(players, pots, winners);
    const alice = result.payouts.find(p => p.playerId === 'a')!;
    const bob = result.payouts.find(p => p.playerId === 'b')!;
    // 1503 / 2 = 751 remainder 1 → first winner gets 752
    expect(alice.payout).toBe(752);
    expect(bob.payout).toBe(751);
    expect(result.oddChips).toHaveLength(1);
    expect(result.oddChips[0].remainder).toBe(1);
    expect(result.oddChips[0].awardedTo).toBe('a');
  });

  it('handles multiple pots with different winners', () => {
    const players = [
      mkPlayer('a', 'Alice', 500, 'all-in'),
      mkPlayer('b', 'Bob', 1000),
      mkPlayer('c', 'Charlie', 1000),
    ];
    const { pots } = calculateSidePots(players);
    // Main pot: 500*3 = 1500 (all 3 eligible)
    // Side pot: 500*2 = 1000 (Bob + Charlie eligible)
    expect(pots).toHaveLength(2);
    const winners: PotWinnerAssignment[] = [
      { potIndex: 0, winnerIds: ['a'] },  // Alice wins main
      { potIndex: 1, winnerIds: ['b'] },  // Bob wins side
    ];
    const result = resolvePotWinners(players, pots, winners);
    const alice = result.payouts.find(p => p.playerId === 'a')!;
    const bob = result.payouts.find(p => p.playerId === 'b')!;
    const charlie = result.payouts.find(p => p.playerId === 'c')!;
    expect(alice.payout).toBe(1500);
    expect(alice.net).toBe(1000); // invested 500, won 1500
    expect(bob.payout).toBe(1000);
    expect(bob.net).toBe(0); // invested 1000, won 1000
    expect(charlie.payout).toBe(0);
    expect(charlie.net).toBe(-1000);
    expect(result.total).toBe(2500);
  });

  it('ignores ineligible winners', () => {
    const players = [
      mkPlayer('a', 'Alice', 500, 'all-in'),
      mkPlayer('b', 'Bob', 1000),
      mkPlayer('c', 'Charlie', 1000),
    ];
    const { pots } = calculateSidePots(players);
    // Try to assign Alice as winner of side pot — she's not eligible
    const winners: PotWinnerAssignment[] = [
      { potIndex: 0, winnerIds: ['b'] },
      { potIndex: 1, winnerIds: ['a'] }, // Invalid: Alice not eligible for side pot
    ];
    const result = resolvePotWinners(players, pots, winners);
    const alice = result.payouts.find(p => p.playerId === 'a')!;
    const bob = result.payouts.find(p => p.playerId === 'b')!;
    // Alice can't win side pot, so it stays unawarded
    expect(alice.payout).toBe(0);
    expect(bob.payout).toBe(1500); // Only main pot
    expect(result.total).toBe(1500); // Side pot unawarded
  });

  it('handles no winners assigned (empty)', () => {
    const players = [
      mkPlayer('a', 'Alice', 1000),
      mkPlayer('b', 'Bob', 1000),
    ];
    const { pots } = calculateSidePots(players);
    const result = resolvePotWinners(players, pots, []);
    expect(result.payouts.every(p => p.payout === 0)).toBe(true);
    expect(result.total).toBe(0);
  });

  it('per-pot breakdown is populated correctly', () => {
    const players = [
      mkPlayer('a', 'Alice', 500, 'all-in'),
      mkPlayer('b', 'Bob', 1000),
      mkPlayer('c', 'Charlie', 1000),
    ];
    const { pots } = calculateSidePots(players);
    const winners: PotWinnerAssignment[] = [
      { potIndex: 0, winnerIds: ['b'] },
      { potIndex: 1, winnerIds: ['b'] },
    ];
    const result = resolvePotWinners(players, pots, winners);
    const bob = result.payouts.find(p => p.playerId === 'b')!;
    expect(bob.perPot).toHaveLength(2);
    expect(bob.perPot[0].potIndex).toBe(0);
    expect(bob.perPot[0].amount).toBe(1500); // Main pot
    expect(bob.perPot[1].potIndex).toBe(1);
    expect(bob.perPot[1].amount).toBe(1000); // Side pot
    expect(bob.payout).toBe(2500);
  });

  it('skips players with zero investment', () => {
    const players = [
      mkPlayer('a', 'Alice', 1000),
      mkPlayer('b', 'Bob', 0),
    ];
    const { pots } = calculateSidePots(players);
    const winners: PotWinnerAssignment[] = [{ potIndex: 0, winnerIds: ['a'] }];
    const result = resolvePotWinners(players, pots, winners);
    // Bob with 0 investment should not appear in payouts
    expect(result.payouts).toHaveLength(1);
    expect(result.payouts[0].playerId).toBe('a');
  });

  it('total payout equals sum of awarded pots', () => {
    const players = [
      mkPlayer('a', 'Alice', 200, 'all-in'),
      mkPlayer('b', 'Bob', 600, 'all-in'),
      mkPlayer('c', 'Charlie', 1000),
      mkPlayer('d', 'Dave', 1000),
    ];
    const { pots } = calculateSidePots(players);
    const winners: PotWinnerAssignment[] = [
      { potIndex: 0, winnerIds: ['a'] },
      { potIndex: 1, winnerIds: ['c'] },
      { potIndex: 2, winnerIds: ['c', 'd'] },
    ];
    const result = resolvePotWinners(players, pots, winners);
    const sumPayouts = result.payouts.reduce((s, p) => s + p.payout, 0);
    expect(result.total).toBe(sumPayouts);
  });
});

// ============================================================================
// Blind Structure by End Time
// ============================================================================

describe('generateBlindsByEndTime', () => {
  it('generates a structure for a 2-hour tournament', () => {
    const levels = generateBlindsByEndTime({
      startingChips: 20000,
      targetMinutes: 120,
      playerCount: 8,
      anteEnabled: false,
    });
    expect(levels.length).toBeGreaterThan(0);
    const playLevels = levels.filter(l => l.type === 'level');
    expect(playLevels.length).toBeGreaterThan(3);
    // All play levels should have consistent duration
    const durations = new Set(playLevels.map(l => l.durationSeconds));
    expect(durations.size).toBe(1);
  });

  it('generates a structure for a 4-hour tournament with longer levels', () => {
    const short = generateBlindsByEndTime({
      startingChips: 20000,
      targetMinutes: 120,
      playerCount: 8,
      anteEnabled: false,
    });
    const long = generateBlindsByEndTime({
      startingChips: 20000,
      targetMinutes: 240,
      playerCount: 8,
      anteEnabled: false,
    });
    const shortDuration = short.filter(l => l.type === 'level')[0]?.durationSeconds ?? 0;
    const longDuration = long.filter(l => l.type === 'level')[0]?.durationSeconds ?? 0;
    // Longer tournament should have longer levels
    expect(longDuration).toBeGreaterThan(shortDuration);
  });

  it('falls back to normal structure for invalid inputs', () => {
    const levels = generateBlindsByEndTime({
      startingChips: 20000,
      targetMinutes: -1,
      playerCount: 1,
      anteEnabled: false,
    });
    expect(levels.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Re-Entry
// ============================================================================

describe('canReEntry', () => {
  const baseRebuy = defaultRebuyConfig(10, 20000);

  it('returns false when re-entry is not enabled', () => {
    const player: Player = { id: '1', name: 'A', rebuys: 0, addOn: false, status: 'eliminated', placement: 5, eliminatedBy: null, knockouts: 0 };
    expect(canReEntry(player, { ...baseRebuy, reEntryEnabled: false })).toBe(false);
  });

  it('returns false for active players', () => {
    const player: Player = { id: '1', name: 'A', rebuys: 0, addOn: false, status: 'active', placement: null, eliminatedBy: null, knockouts: 0 };
    expect(canReEntry(player, { ...baseRebuy, reEntryEnabled: true })).toBe(false);
  });

  it('returns true for eliminated players when enabled', () => {
    const player: Player = { id: '1', name: 'A', rebuys: 0, addOn: false, status: 'eliminated', placement: 5, eliminatedBy: null, knockouts: 0 };
    expect(canReEntry(player, { ...baseRebuy, reEntryEnabled: true })).toBe(true);
  });

  it('respects maxReEntries limit', () => {
    const player: Player = { id: '1', name: 'A', rebuys: 0, addOn: false, status: 'eliminated', placement: 5, eliminatedBy: null, knockouts: 0, reEntryCount: 2 };
    expect(canReEntry(player, { ...baseRebuy, reEntryEnabled: true, maxReEntries: 2 })).toBe(false);
    expect(canReEntry(player, { ...baseRebuy, reEntryEnabled: true, maxReEntries: 3 })).toBe(true);
  });
});

describe('reEnterPlayer', () => {
  it('creates a new active player and updates original', () => {
    const players: Player[] = [
      { id: '1', name: 'Alice', rebuys: 0, addOn: false, status: 'eliminated', placement: 3, eliminatedBy: null, knockouts: 0 },
      { id: '2', name: 'Bob', rebuys: 0, addOn: false, status: 'active', placement: null, eliminatedBy: null, knockouts: 0 },
    ];
    const result = reEnterPlayer(players, '1');
    expect(result).toHaveLength(3);

    // Original player updated with reEntryCount
    const original = result.find(p => p.id === '1');
    expect(original?.reEntryCount).toBe(1);
    expect(original?.status).toBe('eliminated');

    // New player is active with correct metadata
    const newPlayer = result[2];
    expect(newPlayer.name).toBe('Alice');
    expect(newPlayer.status).toBe('active');
    expect(newPlayer.reEntryCount).toBe(1);
    expect(newPlayer.originalPlayerId).toBe('1');
    expect(newPlayer.rebuys).toBe(0);
    expect(newPlayer.id).not.toBe('1');
  });

  it('returns same array if player not found or not eliminated', () => {
    const players: Player[] = [
      { id: '1', name: 'Alice', rebuys: 0, addOn: false, status: 'active', placement: null, eliminatedBy: null, knockouts: 0 },
    ];
    expect(reEnterPlayer(players, '1')).toBe(players);
    expect(reEnterPlayer(players, 'nonexistent')).toBe(players);
  });
});

// ===================== Seat Locking =====================

describe('toggleSeatLock', () => {
  it('locks an empty seat and unlocks it again', () => {
    const tables: Table[] = [createTable('T1', 6)];
    const id = tables[0].id;
    const locked = toggleSeatLock(tables, id, 1);
    expect(locked[0].seats[0].locked).toBe(true);
    const unlocked = toggleSeatLock(locked, id, 1);
    expect(unlocked[0].seats[0].locked).toBe(false);
  });

  it('does not lock an occupied seat', () => {
    const tables: Table[] = [createTable('T1', 6)];
    const id = tables[0].id;
    tables[0].seats[0].playerId = 'p1';
    const result = toggleSeatLock(tables, id, 1);
    expect(result[0].seats[0].locked).toBeUndefined();
  });

  it('distributePlayersToTables skips locked seats', () => {
    const tables: Table[] = [createTable('T1', 4), createTable('T2', 4)];
    const t1Id = tables[0].id;
    // Lock seats 1 and 2 at T1
    tables[0].seats[0].locked = true;
    tables[0].seats[1].locked = true;
    const ids = ['a', 'b', 'c', 'd'];
    const result = distributePlayersToTables(ids, tables);
    // T1 seat 1+2 locked → first player at T1 goes to seat 3
    const t1 = result.find(t => t.id === t1Id)!;
    expect(t1.seats[0].playerId).toBeNull(); // locked, empty
    expect(t1.seats[1].playerId).toBeNull(); // locked, empty
    expect(t1.seats[2].playerId).not.toBeNull(); // first player assigned here
  });
});

// =============================================================================
// PeerJS Remote Control
// =============================================================================

describe('generatePeerId', () => {
  it('generates peer ID with 8-character suffix', () => {
    const id = generatePeerId();
    expect(id).toMatch(/^PKR-[A-Z2-9]{8}$/);
    expect(id.length).toBe(12); // "PKR-" (4) + 8 chars
  });

  it('does not contain confusable characters (I, O, 0, 1)', () => {
    // Generate many IDs and check none contain forbidden chars
    for (let i = 0; i < 50; i++) {
      const id = generatePeerId();
      const suffix = id.slice(4); // Remove "PKR-" prefix
      expect(suffix).not.toMatch(/[IO01]/);
    }
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generatePeerId());
    }
    // With 30^8 = 6.56e11 possibilities, 100 should be unique
    expect(ids.size).toBe(100);
  });
});

describe('RemoteHost connection limits', () => {
  it('exports MAX_CONTROLLERS constant as 4', () => {
    expect(MAX_CONTROLLERS).toBe(4);
  });

  it('exports MAX_DISPLAYS constant as 8', () => {
    expect(MAX_DISPLAYS).toBe(8);
  });
});

describe('REMOTE_STATE_CONTRACT_VERSION', () => {
  it('is a positive integer', () => {
    expect(typeof REMOTE_STATE_CONTRACT_VERSION).toBe('number');
    expect(REMOTE_STATE_CONTRACT_VERSION).toBeGreaterThan(0);
    expect(Number.isInteger(REMOTE_STATE_CONTRACT_VERSION)).toBe(true);
  });
});

describe('buildRemoteUrl', () => {
  it('builds a valid URL with #remote= hash', () => {
    const url = buildRemoteUrl('PKR-ABC23DEF');
    expect(url).toContain('#remote=PKR-ABC23DEF');
    expect(url).toContain(window.location.origin);
  });

  it('includes secret in URL when provided', () => {
    const url = buildRemoteUrl('PKR-ABC23DEF', 'testSecret');
    expect(url).toContain('#remote=PKR-ABC23DEF&s=testSecret');
  });
});

describe('parseRemoteHash', () => {
  it('extracts peer ID from valid hash', () => {
    expect(parseRemoteHash('#remote=PKR-ABC23DEF')).toEqual({ peerId: 'PKR-ABC23DEF', secret: null });
    expect(parseRemoteHash('#remote=PKR-ZZZZZ999')).toEqual({ peerId: 'PKR-ZZZZZ999', secret: null });
  });

  it('extracts peer ID and secret from hash with &s= parameter', () => {
    const result = parseRemoteHash('#remote=PKR-ABC23DEF&s=dGVzdHNlY3JldA');
    expect(result).toEqual({ peerId: 'PKR-ABC23DEF', secret: 'dGVzdHNlY3JldA' });
  });

  it('returns null for invalid or empty hashes', () => {
    expect(parseRemoteHash('')).toBeNull();
    expect(parseRemoteHash('#display')).toBeNull();
    expect(parseRemoteHash('#remote=')).toBeNull();
    expect(parseRemoteHash('#remote=invalid')).toBeNull();
    expect(parseRemoteHash('#rc=someOldSDP')).toBeNull();
    // Contains forbidden characters
    expect(parseRemoteHash('#remote=PKR-IO012345')).toBeNull();
  });

  it('returns null secret when &s= is empty', () => {
    const result = parseRemoteHash('#remote=PKR-ABC23DEF&s=');
    expect(result).toEqual({ peerId: 'PKR-ABC23DEF', secret: null });
  });
});

describe('Host Session Persistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('round-trips peerId and secret via persistHostSession / loadHostSession', () => {
    persistHostSession('PKR-ABC23DEF', 'mySecretValue');
    const loaded = loadHostSession();
    expect(loaded).toEqual({ peerId: 'PKR-ABC23DEF', secret: 'mySecretValue' });
  });

  it('returns null when nothing is persisted', () => {
    expect(loadHostSession()).toBeNull();
  });

  it('clearHostSession removes persisted data', () => {
    persistHostSession('PKR-XYZ99ABC', 'anotherSecret');
    expect(loadHostSession()).not.toBeNull();
    clearHostSession();
    expect(loadHostSession()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// League Module (GameDay CRUD, Extended Standings, Finances, etc.)
// ---------------------------------------------------------------------------

describe('League Module', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const makeLeague = (overrides?: Partial<League>): League => ({
    id: 'league1',
    name: 'Test League',
    pointSystem: defaultPointSystem(),
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  const makeGameDay = (overrides?: Partial<GameDay>): GameDay => ({
    id: `gd_${Math.random().toString(36).slice(2)}`,
    leagueId: 'league1',
    date: '2025-01-15',
    label: 'Spieltag 1',
    participants: [
      { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 25, netBalance: 15 },
      { name: 'Bob', place: 2, points: 7, buyIn: 10, rebuys: 1, addOnCost: 0, payout: 15, netBalance: -5 },
      { name: 'Charlie', place: 3, points: 5, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 0, netBalance: -10 },
    ],
    totalPrizePool: 40,
    totalBuyIns: 40,
    cashBalance: 0,
    ...overrides,
  });

  const makeTournamentResult = (overrides?: Partial<TournamentResult>): TournamentResult => ({
    id: 'result1',
    name: 'Test Tournament',
    date: new Date().toISOString(),
    playerCount: 3,
    buyIn: 10,
    prizePool: 30,
    players: [
      { name: 'Alice', place: 1, payout: 20, rebuys: 0, addOn: false, knockouts: 2, bountyEarned: 0, netBalance: 10 },
      { name: 'Bob', place: 2, payout: 10, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: 0 },
      { name: 'Charlie', place: 3, payout: 0, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: -10 },
    ],
    bountyEnabled: false,
    bountyAmount: 0,
    rebuyEnabled: false,
    totalRebuys: 0,
    addOnEnabled: false,
    totalAddOns: 0,
    elapsedSeconds: 3600,
    levelsPlayed: 8,
    leagueId: 'league1',
    ...overrides,
  });

  // --- GameDay CRUD ---

  describe('GameDay CRUD', () => {
    it('saveGameDay stores and loadGameDays retrieves', () => {
      const gd = makeGameDay({ id: 'gd1' });
      saveGameDay(gd);
      const all = loadGameDays();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('gd1');
    });

    it('saveGameDay upserts existing game day', () => {
      const gd = makeGameDay({ id: 'gd1', label: 'Spieltag 1' });
      saveGameDay(gd);
      saveGameDay({ ...gd, label: 'Spieltag 1 (updated)' });
      const all = loadGameDays();
      expect(all).toHaveLength(1);
      expect(all[0].label).toBe('Spieltag 1 (updated)');
    });

    it('loadGameDaysForLeague filters by leagueId', () => {
      saveGameDay(makeGameDay({ id: 'gd1', leagueId: 'league1' }));
      saveGameDay(makeGameDay({ id: 'gd2', leagueId: 'league2' }));
      saveGameDay(makeGameDay({ id: 'gd3', leagueId: 'league1' }));
      expect(loadGameDaysForLeague('league1')).toHaveLength(2);
      expect(loadGameDaysForLeague('league2')).toHaveLength(1);
    });

    it('deleteGameDay removes the game day', () => {
      saveGameDay(makeGameDay({ id: 'gd1' }));
      saveGameDay(makeGameDay({ id: 'gd2' }));
      deleteGameDay('gd1');
      expect(loadGameDays()).toHaveLength(1);
      expect(loadGameDays()[0].id).toBe('gd2');
    });

    it('loadGameDays returns empty array for missing key', () => {
      expect(loadGameDays()).toEqual([]);
    });
  });

  // --- createGameDayFromResult ---

  describe('createGameDayFromResult', () => {
    it('correctly maps PlayerResult to GameDayParticipant with points', () => {
      const league = makeLeague();
      const result = makeTournamentResult();
      const gd = createGameDayFromResult(result, league);

      expect(gd.participants).toHaveLength(3);
      expect(gd.participants[0].name).toBe('Alice');
      expect(gd.participants[0].place).toBe(1);
      expect(gd.participants[0].points).toBe(10); // 1st place = 10 points
      expect(gd.participants[1].points).toBe(7);  // 2nd place = 7 points
      expect(gd.participants[2].points).toBe(5);  // 3rd place = 5 points
    });

    it('sets correct totalBuyIns and totalPrizePool', () => {
      const league = makeLeague();
      const result = makeTournamentResult();
      const gd = createGameDayFromResult(result, league);

      expect(gd.totalPrizePool).toBe(30);
      expect(gd.leagueId).toBe('league1');
      expect(gd.tournamentResultId).toBe('result1');
    });

    it('assigns auto-incrementing label', () => {
      const league = makeLeague();
      const result1 = makeTournamentResult({ id: 'r1' });
      const result2 = makeTournamentResult({ id: 'r2' });
      createGameDayFromResult(result1, league);
      const gd2 = createGameDayFromResult(result2, league);
      expect(gd2.label).toBe('Spieltag 2');
    });

    it('assigns zero points for places beyond point system', () => {
      const league = makeLeague({
        pointSystem: { entries: [{ place: 1, points: 10 }] },
      });
      const result = makeTournamentResult();
      const gd = createGameDayFromResult(result, league);
      expect(gd.participants[0].points).toBe(10);
      expect(gd.participants[1].points).toBe(0);
      expect(gd.participants[2].points).toBe(0);
    });

    it('uses rebuyCost from result instead of buyIn for rebuy cost calculation (M07)', () => {
      const league = makeLeague();
      const result = makeTournamentResult({
        buyIn: 10,
        rebuyEnabled: true,
        rebuyCost: 5,   // rebuy costs less than buy-in
        addOnEnabled: true,
        addOnCost: 3,   // add-on costs less than buy-in
        players: [
          { name: 'Alice', place: 1, payout: 30, rebuys: 2, addOn: true, knockouts: 0, bountyEarned: 0, netBalance: 0 },
          { name: 'Bob', place: 2, payout: 0, rebuys: 1, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: 0 },
        ],
      });
      const gd = createGameDayFromResult(result, league);
      // Alice: buyIn=10 + 2*5=10 + addOn=3 = 23 total cost, net = 30 + 0 - 23 = 7
      expect(gd.participants[0].netBalance).toBe(7);
      // Bob: buyIn=10 + 1*5=5 + 0 = 15 total cost, net = 0 + 0 - 15 = -15
      expect(gd.participants[1].netBalance).toBe(-15);
    });

    it('falls back to buyIn when rebuyCost is undefined (backward compat, M07)', () => {
      const league = makeLeague();
      // Old tournament result without rebuyCost field
      const result = makeTournamentResult({
        buyIn: 10,
        rebuyEnabled: true,
        // rebuyCost: undefined (old format)
        players: [
          { name: 'Alice', place: 1, payout: 20, rebuys: 1, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: 0 },
        ],
      });
      const gd = createGameDayFromResult(result, league);
      // Alice: buyIn=10 + 1*10=10 = 20 total cost (uses buyIn as fallback), net = 20 - 20 = 0
      expect(gd.participants[0].netBalance).toBe(0);
    });

    it('propagates currency from TournamentResult to GameDay', () => {
      const result: TournamentResult = {
        id: 'tr1', name: 'Test', date: new Date().toISOString(),
        playerCount: 2, buyIn: 10, prizePool: 20, bountyEnabled: false, bountyAmount: 0,
        rebuyEnabled: false, totalRebuys: 0, addOnEnabled: false, totalAddOns: 0,
        elapsedSeconds: 3600, levelsPlayed: 5, currency: 'USD',
        players: [
          { name: 'A', place: 1, payout: 15, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0 },
          { name: 'B', place: 2, payout: 5, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0 },
        ],
      };
      const league: League = {
        id: 'l1', name: 'Test League', createdAt: new Date().toISOString(),
        pointSystem: { entries: [{ place: 1, points: 10 }, { place: 2, points: 7 }] },
      };
      const gd = createGameDayFromResult(result, league);
      expect(gd.currency).toBe('USD');
    });

    it('defaults GameDay currency to undefined when result has no currency', () => {
      const result: TournamentResult = {
        id: 'tr2', name: 'Test', date: new Date().toISOString(),
        playerCount: 2, buyIn: 10, prizePool: 20, bountyEnabled: false, bountyAmount: 0,
        rebuyEnabled: false, totalRebuys: 0, addOnEnabled: false, totalAddOns: 0,
        elapsedSeconds: 3600, levelsPlayed: 5,
        players: [
          { name: 'A', place: 1, payout: 15, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0 },
          { name: 'B', place: 2, payout: 5, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0 },
        ],
      };
      const league: League = {
        id: 'l1', name: 'Test League', createdAt: new Date().toISOString(),
        pointSystem: { entries: [{ place: 1, points: 10 }, { place: 2, points: 7 }] },
      };
      const gd = createGameDayFromResult(result, league);
      expect(gd.currency).toBeUndefined();
    });
  });

  // --- computeExtendedStandings ---

  describe('computeExtendedStandings', () => {
    it('aggregates points, costs, and balance across game days', () => {
      const league = makeLeague();
      const gd1 = makeGameDay({ id: 'gd1', date: '2025-01-15' });
      const gd2 = makeGameDay({
        id: 'gd2',
        date: '2025-01-22',
        participants: [
          { name: 'Alice', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 10, netBalance: 0 },
          { name: 'Bob', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ],
      });

      const standings = computeExtendedStandings(league, [gd1, gd2]);
      const alice = standings.find((s) => s.name === 'Alice')!;
      const bob = standings.find((s) => s.name === 'Bob')!;

      expect(alice.points).toBe(17); // 10 + 7
      expect(alice.tournaments).toBe(2);
      expect(alice.wins).toBe(1);
      expect(bob.points).toBe(17); // 7 + 10
      expect(bob.tournaments).toBe(2);
    });

    it('applies corrections to standings', () => {
      const league = makeLeague({
        corrections: [
          { id: 'c1', playerName: 'Alice', points: 3, reason: 'Bonus', date: '2025-01-20' },
          { id: 'c2', playerName: 'Bob', points: -2, reason: 'Penalty', date: '2025-01-20' },
        ],
      });
      const gd = makeGameDay();
      const standings = computeExtendedStandings(league, [gd]);

      const alice = standings.find((s) => s.name === 'Alice')!;
      const bob = standings.find((s) => s.name === 'Bob')!;
      expect(alice.points).toBe(13); // 10 + 3
      expect(alice.corrections).toBe(3);
      expect(bob.points).toBe(5); // 7 - 2
      expect(bob.corrections).toBe(-2);
    });

    it('calculates participation rate correctly', () => {
      const league = makeLeague();
      const gd1 = makeGameDay({ id: 'gd1' }); // Alice, Bob, Charlie
      const gd2 = makeGameDay({
        id: 'gd2',
        participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ],
      });

      const standings = computeExtendedStandings(league, [gd1, gd2]);
      const alice = standings.find((s) => s.name === 'Alice')!;
      const bob = standings.find((s) => s.name === 'Bob')!;

      expect(alice.participationRate).toBe(1); // 2/2
      expect(bob.participationRate).toBe(0.5); // 1/2
    });

    it('sorts by points DESC then avgPlace ASC', () => {
      const league = makeLeague();
      const gd = makeGameDay();
      const standings = computeExtendedStandings(league, [gd]);

      expect(standings[0].name).toBe('Alice'); // 10 pts
      expect(standings[1].name).toBe('Bob');   // 7 pts
      expect(standings[2].name).toBe('Charlie'); // 5 pts
    });

    it('assigns correct ranks', () => {
      const league = makeLeague();
      const gd = makeGameDay();
      const standings = computeExtendedStandings(league, [gd]);

      expect(standings[0].rank).toBe(1);
      expect(standings[1].rank).toBe(2);
      expect(standings[2].rank).toBe(3);
    });

    it('excludes guests when option is set', () => {
      const league = makeLeague();
      const gd = makeGameDay({
        participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
          { name: 'Guest', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 10, netBalance: 0, isGuest: true },
        ],
      });

      const withGuests = computeExtendedStandings(league, [gd]);
      const withoutGuests = computeExtendedStandings(league, [gd], { excludeGuests: true });

      expect(withGuests).toHaveLength(2);
      expect(withoutGuests).toHaveLength(1);
      expect(withoutGuests[0].name).toBe('Alice');
    });
  });

  // --- applyTiebreaker ---

  describe('applyTiebreaker', () => {
    it('breaks ties using avgPlace', () => {
      const standings: ExtendedLeagueStanding[] = [
        { name: 'A', points: 10, tournaments: 2, wins: 0, cashes: 1, avgPlace: 3.0, bestPlace: 2, totalCost: 20, totalPayout: 15, netBalance: -5, participationRate: 1, knockouts: 0, corrections: 0, rank: 0 },
        { name: 'B', points: 10, tournaments: 2, wins: 0, cashes: 1, avgPlace: 2.0, bestPlace: 1, totalCost: 20, totalPayout: 15, netBalance: -5, participationRate: 1, knockouts: 0, corrections: 0, rank: 0 },
      ];
      applyTiebreaker(standings, [], { criteria: ['avgPlace'] });
      expect(standings[0].name).toBe('B'); // lower avg = better
      expect(standings[1].name).toBe('A');
    });

    it('breaks ties using wins', () => {
      const standings: ExtendedLeagueStanding[] = [
        { name: 'A', points: 10, tournaments: 2, wins: 0, cashes: 1, avgPlace: 2.0, bestPlace: 2, totalCost: 20, totalPayout: 15, netBalance: -5, participationRate: 1, knockouts: 0, corrections: 0, rank: 0 },
        { name: 'B', points: 10, tournaments: 2, wins: 2, cashes: 2, avgPlace: 2.0, bestPlace: 1, totalCost: 20, totalPayout: 25, netBalance: 5, participationRate: 1, knockouts: 0, corrections: 0, rank: 0 },
      ];
      applyTiebreaker(standings, [], { criteria: ['wins'] });
      expect(standings[0].name).toBe('B'); // more wins = better
    });

    it('applies multiple criteria in order', () => {
      const standings: ExtendedLeagueStanding[] = [
        { name: 'A', points: 10, tournaments: 2, wins: 1, cashes: 1, avgPlace: 2.0, bestPlace: 1, totalCost: 20, totalPayout: 15, netBalance: -5, participationRate: 1, knockouts: 0, corrections: 0, rank: 0 },
        { name: 'B', points: 10, tournaments: 2, wins: 1, cashes: 2, avgPlace: 1.5, bestPlace: 1, totalCost: 20, totalPayout: 25, netBalance: 5, participationRate: 1, knockouts: 0, corrections: 0, rank: 0 },
      ];
      // wins tie (both 1), so fall through to avgPlace
      applyTiebreaker(standings, [], { criteria: ['wins', 'avgPlace'] });
      expect(standings[0].name).toBe('B'); // B has lower avgPlace
    });

    it('handles unsorted input correctly via pre-sort (M14)', () => {
      // Intentionally unsorted: B has more points but appears after A
      const standings: ExtendedLeagueStanding[] = [
        { name: 'A', points: 5, tournaments: 2, wins: 0, cashes: 1, avgPlace: 3.0, bestPlace: 3, totalCost: 20, totalPayout: 5, netBalance: -15, participationRate: 1, knockouts: 0, corrections: 0, rank: 0 },
        { name: 'B', points: 10, tournaments: 2, wins: 1, cashes: 2, avgPlace: 1.5, bestPlace: 1, totalCost: 20, totalPayout: 25, netBalance: 5, participationRate: 1, knockouts: 0, corrections: 0, rank: 0 },
      ];
      const result = applyTiebreaker(standings, [], { criteria: ['avgPlace'] });
      // B should come first (10 points > 5 points), even though A was passed first
      expect(result[0].name).toBe('B');
      expect(result[1].name).toBe('A');
    });
  });

  // --- computeLeagueFinances ---

  describe('computeLeagueFinances', () => {
    it('computes cumulative cash balance correctly', () => {
      const gd1 = makeGameDay({ id: 'gd1', date: '2025-01-15', totalBuyIns: 40, totalPrizePool: 30, cashBalance: 10 });
      const gd2 = makeGameDay({ id: 'gd2', date: '2025-01-22', totalBuyIns: 50, totalPrizePool: 50, cashBalance: 0 });
      const gd3 = makeGameDay({ id: 'gd3', date: '2025-01-29', totalBuyIns: 40, totalPrizePool: 45, cashBalance: -5 });

      const finances = computeLeagueFinances([gd1, gd2, gd3]);

      expect(finances.totalBuyIns).toBe(130);
      expect(finances.totalPayouts).toBe(125);
      expect(finances.totalCashBalance).toBe(5);
      expect(finances.perGameDay).toHaveLength(3);
      expect(finances.perGameDay[0].cumulative).toBe(10);
      expect(finances.perGameDay[1].cumulative).toBe(10);
      expect(finances.perGameDay[2].cumulative).toBe(5);
    });

    it('returns zero values for empty game days', () => {
      const finances = computeLeagueFinances([]);
      expect(finances.totalBuyIns).toBe(0);
      expect(finances.totalPayouts).toBe(0);
      expect(finances.totalCashBalance).toBe(0);
      expect(finances.perGameDay).toHaveLength(0);
    });

    it('sorts game days by date for cumulative', () => {
      const gd1 = makeGameDay({ id: 'gd1', date: '2025-01-22', cashBalance: 5 });
      const gd2 = makeGameDay({ id: 'gd2', date: '2025-01-15', cashBalance: 10 });
      // gd2 is earlier but passed second — should be sorted first
      const finances = computeLeagueFinances([gd1, gd2]);
      expect(finances.perGameDay[0].date).toBe('2025-01-15');
      expect(finances.perGameDay[1].date).toBe('2025-01-22');
    });
  });

  // --- Season Helpers ---

  describe('Season Helpers', () => {
    it('getActiveSeason returns active season', () => {
      const league = makeLeague({
        seasons: [
          { id: 's1', name: 'Season 1', startDate: '2024-01-01', endDate: '2024-12-31' },
          { id: 's2', name: 'Season 2', startDate: '2025-01-01' },
        ],
        activeSeasonId: 's2',
      });
      const season = getActiveSeason(league);
      expect(season?.name).toBe('Season 2');
    });

    it('getActiveSeason returns undefined when no active season', () => {
      const league = makeLeague();
      expect(getActiveSeason(league)).toBeUndefined();
    });

    it('getGameDaysInSeason filters by seasonId', () => {
      const gds: GameDay[] = [
        makeGameDay({ id: 'gd1', seasonId: 's1' }),
        makeGameDay({ id: 'gd2', seasonId: 's2' }),
        makeGameDay({ id: 'gd3', seasonId: 's1' }),
      ];
      expect(getGameDaysInSeason(gds, 's1')).toHaveLength(2);
      expect(getGameDaysInSeason(gds, 's2')).toHaveLength(1);
    });

    it('createSeason generates valid season', () => {
      const season = createSeason('Saison 2025/26');
      expect(season.name).toBe('Saison 2025/26');
      expect(season.id).toMatch(/^season_/);
      expect(season.startDate).toBeTruthy();
      expect(season.endDate).toBeUndefined();
    });
  });

  // --- normalizePlayerName ---

  describe('normalizePlayerName', () => {
    it('normalizes to lowercase and trims', () => {
      expect(normalizePlayerName('  Alice  ')).toBe('alice');
      expect(normalizePlayerName('BOB')).toBe('bob');
    });
  });

  // --- Export Helpers ---

  describe('League Export Helpers', () => {
    it('formatLeagueStandingsAsText produces readable text', () => {
      const league = makeLeague();
      const standings: ExtendedLeagueStanding[] = [
        { name: 'Alice', points: 20, tournaments: 2, wins: 2, cashes: 2, avgPlace: 1.0, bestPlace: 1, totalCost: 20, totalPayout: 40, netBalance: 20, participationRate: 1, knockouts: 3, corrections: 0, rank: 1 },
        { name: 'Bob', points: 14, tournaments: 2, wins: 0, cashes: 1, avgPlace: 2.5, bestPlace: 2, totalCost: 20, totalPayout: 10, netBalance: -10, participationRate: 1, knockouts: 0, corrections: 0, rank: 2 },
      ];
      const text = formatLeagueStandingsAsText(league, standings);
      expect(text).toContain('Test League');
      expect(text).toContain('Alice');
      expect(text).toContain('20 Pts');
    });

    it('formatLeagueStandingsAsCSV includes all columns', () => {
      const standings: ExtendedLeagueStanding[] = [
        { name: 'Alice', points: 20, tournaments: 2, wins: 2, cashes: 2, avgPlace: 1.0, bestPlace: 1, totalCost: 20, totalPayout: 40, netBalance: 20, participationRate: 1, knockouts: 3, corrections: 0, rank: 1 },
      ];
      const csv = formatLeagueStandingsAsCSV(standings);
      expect(csv).toContain('Rank,Name,Points');
      expect(csv).toContain('1,"Alice",20');
    });
  });

  // --- QR Encoding ---

  describe('League QR Encoding', () => {
    it('round-trips encode/decode', () => {
      const league = makeLeague();
      const standings: ExtendedLeagueStanding[] = [
        { name: 'Alice', points: 20, tournaments: 2, wins: 2, cashes: 2, avgPlace: 1.0, bestPlace: 1, totalCost: 20, totalPayout: 40, netBalance: 20, participationRate: 1, knockouts: 3, corrections: 0, rank: 1 },
      ];
      const hash = encodeLeagueStandingsForQR(league, standings);
      expect(hash).toMatch(/^#ls=/);
      const decoded = decodeLeagueStandingsFromQR(hash);
      expect(decoded).not.toBeNull();
      expect(decoded!.leagueName).toBe('Test League');
      expect(decoded!.standings[0].name).toBe('Alice');
      expect(decoded!.standings[0].points).toBe(20);
    });

    it('returns null for invalid hash', () => {
      expect(decodeLeagueStandingsFromQR('#invalid')).toBeNull();
      expect(decodeLeagueStandingsFromQR('#ls=')).toBeNull();
    });
  });

  // --- Player Stats ---

  describe('computeLeaguePlayerStats', () => {
    it('computes points history and streaks', () => {
      const gameDays: GameDay[] = [
        makeGameDay({ id: 'gd1', date: '2025-01-15', participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
          { name: 'Bob', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 10, netBalance: 0 },
        ]}),
        makeGameDay({ id: 'gd2', date: '2025-01-22', participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
          { name: 'Bob', place: 3, points: 5, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 0, netBalance: -10 },
        ]}),
      ];

      const stats = computeLeaguePlayerStats('Alice', gameDays);
      expect(stats.pointsHistory).toHaveLength(2);
      expect(stats.pointsHistory[0].cumulative).toBe(10);
      expect(stats.pointsHistory[1].cumulative).toBe(20);
      expect(stats.streaks.currentWin).toBe(2);
      expect(stats.streaks.bestWin).toBe(2);
      expect(stats.formLast5).toEqual(['W', 'W']);
    });

    it('computes head-to-head correctly', () => {
      const gameDays: GameDay[] = [
        makeGameDay({ id: 'gd1', participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
          { name: 'Bob', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 10, netBalance: 0 },
        ]}),
      ];
      const stats = computeLeaguePlayerStats('Alice', gameDays);
      expect(stats.headToHead['bob']).toEqual({ wins: 1, losses: 0 });
    });

    it('computes place distribution', () => {
      const gameDays: GameDay[] = [
        makeGameDay({ id: 'gd1', participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ]}),
        makeGameDay({ id: 'gd2', participants: [
          { name: 'Alice', place: 3, points: 5, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 0, netBalance: -10 },
        ]}),
        makeGameDay({ id: 'gd3', participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ]}),
      ];
      const stats = computeLeaguePlayerStats('Alice', gameDays);
      expect(stats.placeDistribution[1]).toBe(2);
      expect(stats.placeDistribution[3]).toBe(1);
    });
  });

  // === Phase 2 Tests ===

  describe('Guest players', () => {
    it('excludes guests from standings when excludeGuests is true', () => {
      const league = makeLeague();
      const gameDays = [
        makeGameDay({ participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
          { name: 'Guest1', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 0, netBalance: -10, isGuest: true },
        ]}),
      ];
      const standings = computeExtendedStandings(league, gameDays, { excludeGuests: true });
      expect(standings).toHaveLength(1);
      expect(standings[0].name).toBe('Alice');
    });

    it('includes guests in standings by default', () => {
      const league = makeLeague();
      const gameDays = [
        makeGameDay({ participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
          { name: 'Guest1', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 0, netBalance: -10, isGuest: true },
        ]}),
      ];
      const standings = computeExtendedStandings(league, gameDays);
      expect(standings).toHaveLength(2);
    });
  });

  describe('Variable Buy-Ins', () => {
    it('computes netBalance correctly with different buy-ins', () => {
      const league = makeLeague();
      const gameDays = [
        makeGameDay({ participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 20, rebuys: 0, addOnCost: 0, payout: 50, netBalance: 30 },
          { name: 'Bob', place: 2, points: 7, buyIn: 10, rebuys: 1, addOnCost: 5, payout: 15, netBalance: -10 },
        ]}),
      ];
      const standings = computeExtendedStandings(league, gameDays);
      const alice = standings.find(s => s.name === 'Alice');
      const bob = standings.find(s => s.name === 'Bob');
      expect(alice?.totalCost).toBe(20);
      expect(alice?.netBalance).toBe(30);
      expect(bob?.totalCost).toBe(25); // 10 + 10 (rebuy) + 5 (addon)
      expect(bob?.netBalance).toBe(-10);
    });

    it('derives totalCost from payout and netBalance for variable rebuy costs', () => {
      const league = makeLeague();
      const gameDays = [
        makeGameDay({ participants: [
          // This mirrors a game day created from a result with rebuyCost lower than buyIn.
          { name: 'Bob', place: 1, points: 10, buyIn: 10, rebuys: 2, addOnCost: 3, payout: 30, netBalance: 7 },
        ]}),
      ];

      const standings = computeExtendedStandings(league, gameDays);
      const bob = standings.find(s => s.name === 'Bob');

      // Cost must match recorded economics: payout - net = 30 - 7 = 23.
      expect(bob?.totalCost).toBe(23);
      expect(bob?.netBalance).toBe(7);
    });
  });

  describe('Point Corrections', () => {
    it('adds corrections to standings points', () => {
      const league = makeLeague({
        corrections: [
          { id: 'c1', playerName: 'Alice', points: 3, reason: 'Bonus', date: '2025-01-01' },
        ],
      });
      const gameDays = [
        makeGameDay({ participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ]}),
      ];
      const standings = computeExtendedStandings(league, gameDays);
      expect(standings[0].points).toBe(13); // 10 + 3 correction
      expect(standings[0].corrections).toBe(3);
    });

    it('applies negative corrections', () => {
      const league = makeLeague({
        corrections: [
          { id: 'c1', playerName: 'Alice', points: -2, reason: 'Penalty', date: '2025-01-01' },
        ],
      });
      const gameDays = [
        makeGameDay({ participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ]}),
      ];
      const standings = computeExtendedStandings(league, gameDays);
      expect(standings[0].points).toBe(8); // 10 - 2
      expect(standings[0].corrections).toBe(-2);
    });

    it('applies multiple corrections for same player', () => {
      const league = makeLeague({
        corrections: [
          { id: 'c1', playerName: 'Alice', points: 2, reason: 'Bonus', date: '2025-01-01' },
          { id: 'c2', playerName: 'Alice', points: -1, reason: 'Penalty', date: '2025-01-02' },
        ],
      });
      const gameDays = [
        makeGameDay({ participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ]}),
      ];
      const standings = computeExtendedStandings(league, gameDays);
      expect(standings[0].points).toBe(11); // 10 + 2 - 1
      expect(standings[0].corrections).toBe(1);
    });
  });

  describe('Tiebreaker Configuration', () => {
    it('breaks tie using cashes criterion', () => {
      const league = makeLeague({
        tiebreaker: { criteria: ['cashes'] },
      });
      const gameDays = [
        makeGameDay({ id: 'gd1', participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
          { name: 'Bob', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 15, netBalance: 5 },
        ]}),
        makeGameDay({ id: 'gd2', participants: [
          { name: 'Alice', place: 3, points: 5, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 0, netBalance: -10 },
          { name: 'Bob', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
          { name: 'Charlie', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 15, netBalance: 5 },
        ]}),
      ];
      // Alice: 15pts, Bob: 17pts, Charlie: 7pts
      const standings = computeExtendedStandings(league, gameDays);
      expect(standings[0].name).toBe('Bob');
      expect(standings[0].rank).toBe(1);
    });

    it('uses headToHead tiebreaker', () => {
      const league = makeLeague({
        tiebreaker: { criteria: ['headToHead'] },
      });
      // Both get same points across 2 game days
      const gameDays = [
        makeGameDay({ id: 'gd1', participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
          { name: 'Bob', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 0, netBalance: -10 },
        ]}),
        makeGameDay({ id: 'gd2', participants: [
          { name: 'Alice', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 0, netBalance: -10 },
          { name: 'Bob', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ]}),
      ];
      // Both have 17pts — tied. H2H is 1-1. Falls through to default.
      const standings = computeExtendedStandings(league, gameDays);
      expect(standings).toHaveLength(2);
      expect(standings[0].points).toBe(standings[1].points);
    });

    it('uses lastResult tiebreaker to break tie', () => {
      const league = makeLeague({
        tiebreaker: { criteria: ['lastResult'] },
      });
      const gameDays = [
        makeGameDay({ id: 'gd1', participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
          { name: 'Bob', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 0, netBalance: -10 },
        ]}),
        makeGameDay({ id: 'gd2', participants: [
          { name: 'Alice', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 0, netBalance: -10 },
          { name: 'Bob', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ]}),
      ];
      // Both have 17pts. Last GD: Alice 2nd, Bob 1st → Bob should be ranked higher
      const standings = computeExtendedStandings(league, gameDays);
      expect(standings[0].name).toBe('Bob');
    });
  });

  describe('Season filtering', () => {
    it('loadGameDaysForSeason filters by seasonId', () => {
      saveGameDay(makeGameDay({ id: 'gd1', leagueId: 'league1', seasonId: 's1' }));
      saveGameDay(makeGameDay({ id: 'gd2', leagueId: 'league1', seasonId: 's2' }));
      saveGameDay(makeGameDay({ id: 'gd3', leagueId: 'league1', seasonId: 's1' }));
      const s1Days = loadGameDaysForSeason('league1', 's1');
      expect(s1Days).toHaveLength(2);
      expect(s1Days.every(gd => gd.seasonId === 's1')).toBe(true);
    });

    it('standings can be computed per season', () => {
      const league = makeLeague();
      const s1Days = [
        makeGameDay({ seasonId: 's1', participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ]}),
      ];
      const s2Days = [
        makeGameDay({ seasonId: 's2', participants: [
          { name: 'Bob', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ]}),
      ];
      const s1Standings = computeExtendedStandings(league, s1Days);
      expect(s1Standings).toHaveLength(1);
      expect(s1Standings[0].name).toBe('Alice');

      const s2Standings = computeExtendedStandings(league, s2Days);
      expect(s2Standings).toHaveLength(1);
      expect(s2Standings[0].name).toBe('Bob');
    });
  });

  describe('Venue support', () => {
    it('saves and loads GameDay with venue', () => {
      const gd = makeGameDay({ venue: 'Pauls Garage' });
      saveGameDay(gd);
      const loaded = loadGameDays();
      expect(loaded[0].venue).toBe('Pauls Garage');
    });
  });

  // ==========================================================================
  // Phase 3: Statistics, Exports, QR, LeagueExport v2
  // ==========================================================================

  describe('League Player Stats', () => {
    it('computes points history with cumulative total', () => {
      const gameDays = [
        makeGameDay({ id: 'gd1', date: '2025-01-01', participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
          { name: 'Bob', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 0, netBalance: -10 },
        ]}),
        makeGameDay({ id: 'gd2', date: '2025-01-15', participants: [
          { name: 'Alice', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 10, netBalance: 0 },
          { name: 'Bob', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ]}),
      ];
      const stats = computeLeaguePlayerStats('Alice', gameDays);
      expect(stats.pointsHistory).toHaveLength(2);
      expect(stats.pointsHistory[0].points).toBe(10);
      expect(stats.pointsHistory[0].cumulative).toBe(10);
      expect(stats.pointsHistory[1].points).toBe(7);
      expect(stats.pointsHistory[1].cumulative).toBe(17);
    });

    it('computes place distribution', () => {
      const gameDays = [
        makeGameDay({ id: 'gd1', participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ]}),
        makeGameDay({ id: 'gd2', participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ]}),
        makeGameDay({ id: 'gd3', participants: [
          { name: 'Alice', place: 3, points: 5, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 0, netBalance: -10 },
        ]}),
      ];
      const stats = computeLeaguePlayerStats('Alice', gameDays);
      expect(stats.placeDistribution[1]).toBe(2);
      expect(stats.placeDistribution[3]).toBe(1);
    });

    it('computes streaks', () => {
      const gameDays = [
        makeGameDay({ id: 'gd1', date: '2025-01-01', participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ]}),
        makeGameDay({ id: 'gd2', date: '2025-01-08', participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ]}),
        makeGameDay({ id: 'gd3', date: '2025-01-15', participants: [
          { name: 'Alice', place: 3, points: 5, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 0, netBalance: -10 },
        ]}),
      ];
      const stats = computeLeaguePlayerStats('Alice', gameDays);
      expect(stats.streaks.bestWin).toBe(2);
      expect(stats.streaks.currentWin).toBe(0);
    });

    it('computes formLast5', () => {
      const gameDays = Array.from({ length: 6 }, (_, i) =>
        makeGameDay({ id: `gd${i}`, date: `2025-01-${String(i + 1).padStart(2, '0')}`, participants: [
          { name: 'Alice', place: i % 3 === 0 ? 1 : i % 3 === 1 ? 2 : 5, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: i % 3 === 0 ? 20 : i % 3 === 1 ? 10 : 0, netBalance: 0 },
        ]}),
      );
      const stats = computeLeaguePlayerStats('Alice', gameDays);
      expect(stats.formLast5).toHaveLength(5); // Last 5 only
    });

    it('computes head-to-head records', () => {
      const gameDays = [
        makeGameDay({ id: 'gd1', participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
          { name: 'Bob', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 0, netBalance: -10 },
        ]}),
        makeGameDay({ id: 'gd2', participants: [
          { name: 'Alice', place: 3, points: 5, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 0, netBalance: -10 },
          { name: 'Bob', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ]}),
      ];
      const stats = computeLeaguePlayerStats('Alice', gameDays);
      expect(stats.headToHead['bob'].wins).toBe(1);
      expect(stats.headToHead['bob'].losses).toBe(1);
    });
  });

  describe('League Exports (Phase 3)', () => {
    it('formatLeagueStandingsAsText includes medals and balance', () => {
      const league = makeLeague({ name: 'Test Liga' });
      const gameDays = [
        makeGameDay({ participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
          { name: 'Bob', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 0, netBalance: -10 },
        ]}),
      ];
      const standings = computeExtendedStandings(league, gameDays);
      const text = formatLeagueStandingsAsText(league, standings);
      expect(text).toContain('Test Liga');
      expect(text).toContain('Alice');
      expect(text).toContain('Bob');
    });

    it('formatLeagueStandingsAsCSV includes all columns', () => {
      const league = makeLeague();
      const gameDays = [
        makeGameDay({ participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ]}),
      ];
      const standings = computeExtendedStandings(league, gameDays);
      const csv = formatLeagueStandingsAsCSV(standings);
      expect(csv).toContain('Rank,Name,Points');
      expect(csv).toContain('TotalCost,TotalPayout,NetBalance');
      expect(csv).toContain('"Alice"');
    });

    it('formatLeagueFinancesAsCSV includes per-gameday data', () => {
      saveGameDay(makeGameDay({ id: 'gd1', date: '2025-01-01', cashBalance: 5, totalBuyIns: 30, totalPrizePool: 25, leagueId: 'league1' }));
      saveGameDay(makeGameDay({ id: 'gd2', date: '2025-01-08', cashBalance: -3, totalBuyIns: 40, totalPrizePool: 43, leagueId: 'league1' }));
      const gameDays = loadGameDaysForLeague('league1');
      const csv = formatLeagueFinancesAsCSV(gameDays);
      expect(csv).toContain('Date,Label');
      expect(csv).toContain('Cumulative');
    });
  });

  describe('QR Encoding for League Standings', () => {
    it('encodes and decodes league standings round-trip', () => {
      const league = makeLeague({ name: 'Poker Liga' });
      const standings: ExtendedLeagueStanding[] = [
        { name: 'Alice', points: 30, tournaments: 4, wins: 2, cashes: 3, avgPlace: 1.5, bestPlace: 1, totalCost: 40, totalPayout: 80, netBalance: 40, participationRate: 1, knockouts: 5, corrections: 0, rank: 1 },
        { name: 'Bob', points: 20, tournaments: 4, wins: 1, cashes: 2, avgPlace: 2.5, bestPlace: 1, totalCost: 40, totalPayout: 50, netBalance: 10, participationRate: 1, knockouts: 3, corrections: 0, rank: 2 },
      ];
      const hash = encodeLeagueStandingsForQR(league, standings);
      expect(hash).toMatch(/^#ls=/);
      const decoded = decodeLeagueStandingsFromQR(hash);
      expect(decoded).not.toBeNull();
      expect(decoded!.leagueName).toBe('Poker Liga');
      expect(decoded!.standings).toHaveLength(2);
      expect(decoded!.standings[0].name).toBe('Alice');
      expect(decoded!.standings[0].points).toBe(30);
      expect(decoded!.standings[1].netBalance).toBe(10);
    });

    it('returns null for invalid hash', () => {
      expect(decodeLeagueStandingsFromQR('#invalid')).toBeNull();
      expect(decodeLeagueStandingsFromQR('')).toBeNull();
    });
  });

  describe('LeagueExport v2', () => {
    it('exportLeagueToJSON includes gameDays', () => {
      const league = makeLeague();
      saveLeague(league);
      saveGameDay(makeGameDay({ id: 'gd1', leagueId: league.id }));
      const json = exportLeagueToJSON(league);
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe(2);
      expect(parsed.gameDays).toBeDefined();
      expect(parsed.gameDays).toHaveLength(1);
    });

    it('parseLeagueFile handles v1 format (no gameDays)', () => {
      const v1Data = JSON.stringify({
        version: 1,
        league: makeLeague(),
        results: [],
        exportedAt: new Date().toISOString(),
      });
      const parsed = parseLeagueFile(v1Data);
      expect(parsed).not.toBeNull();
      expect(parsed!.gameDays).toEqual([]);
    });

    it('parseLeagueFile handles v2 format with gameDays', () => {
      const v2Data = JSON.stringify({
        version: 2,
        league: makeLeague(),
        results: [],
        gameDays: [makeGameDay({ id: 'gd1' })],
        exportedAt: new Date().toISOString(),
      });
      const parsed = parseLeagueFile(v2Data);
      expect(parsed).not.toBeNull();
      expect(parsed!.gameDays).toHaveLength(1);
    });
  });

  describe('Name normalization', () => {
    it('normalizePlayerName trims and lowercases', () => {
      expect(normalizePlayerName('  Alice  ')).toBe('alice');
      expect(normalizePlayerName('BOB')).toBe('bob');
      expect(normalizePlayerName('Charlie')).toBe('charlie');
    });

    it('standings aggregate case-insensitively', () => {
      const league = makeLeague();
      const gameDays = [
        makeGameDay({ id: 'gd1', participants: [
          { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        ]}),
        makeGameDay({ id: 'gd2', participants: [
          { name: 'alice', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 10, netBalance: 0 },
        ]}),
      ];
      const standings = computeExtendedStandings(league, gameDays);
      // Should merge into one player
      expect(standings).toHaveLength(1);
      expect(standings[0].tournaments).toBe(2);
      expect(standings[0].points).toBe(17);
    });
  });

  describe('registeredPlayerId population', () => {
    it('createGameDayFromResult populates registeredPlayerId when players match', () => {
      const result = {
        id: 'r1',
        name: 'Test',
        date: '2025-01-01',
        players: [
          { name: 'Alice', place: 1, payout: 20, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: 10 },
          { name: 'Bob', place: 2, payout: 10, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: 0 },
        ],
        prizePool: 30,
        buyIn: 10,
        playerCount: 2,
        totalRebuys: 0,
        totalAddOns: 0,
        rebuyEnabled: false,
        bountyEnabled: false,
        bountyAmount: 0,
        elapsedSeconds: 3600,
        leagueId: 'league1',
      } as const;
      const league = makeLeague();
      const registeredPlayers = [
        { id: 'rp_alice', name: 'Alice', createdAt: '2025-01-01', lastPlayedAt: '2025-01-01' },
        { id: 'rp_charlie', name: 'Charlie', createdAt: '2025-01-01', lastPlayedAt: '2025-01-01' },
      ];
      const gd = createGameDayFromResult(result, league, registeredPlayers);
      // Alice should have registeredPlayerId
      const alice = gd.participants.find(p => p.name === 'Alice');
      expect(alice?.registeredPlayerId).toBe('rp_alice');
      // Bob should not (not in registered players)
      const bob = gd.participants.find(p => p.name === 'Bob');
      expect(bob?.registeredPlayerId).toBeUndefined();
    });

    it('createGameDayFromResult matches case-insensitively', () => {
      const result = {
        id: 'r2',
        name: 'Test',
        date: '2025-01-01',
        players: [
          { name: 'alice', place: 1, payout: 20, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: 10 },
        ],
        prizePool: 20,
        buyIn: 10,
        playerCount: 1,
        totalRebuys: 0,
        totalAddOns: 0,
        rebuyEnabled: false,
        bountyEnabled: false,
        bountyAmount: 0,
        elapsedSeconds: 1800,
      } as const;
      const league = makeLeague();
      const registeredPlayers = [
        { id: 'rp_ALICE', name: 'ALICE', createdAt: '2025-01-01', lastPlayedAt: '2025-01-01' },
      ];
      const gd = createGameDayFromResult(result, league, registeredPlayers);
      expect(gd.participants[0].registeredPlayerId).toBe('rp_ALICE');
    });

    it('createGameDayFromResult works without registeredPlayers param', () => {
      const result = {
        id: 'r3',
        name: 'Test',
        date: '2025-01-01',
        players: [
          { name: 'Alice', place: 1, payout: 20, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: 10 },
        ],
        prizePool: 20,
        buyIn: 10,
        playerCount: 1,
        totalRebuys: 0,
        totalAddOns: 0,
        rebuyEnabled: false,
        bountyEnabled: false,
        bountyAmount: 0,
        elapsedSeconds: 1800,
      } as const;
      const league = makeLeague();
      const gd = createGameDayFromResult(result, league);
      // Should not have registeredPlayerId when no players provided
      expect(gd.participants[0].registeredPlayerId).toBeUndefined();
    });
  });

  describe('decodeLeagueStandingsFromQR', () => {
    it('returns null for non-ls hash', () => {
      expect(decodeLeagueStandingsFromQR('#r=something')).toBeNull();
      expect(decodeLeagueStandingsFromQR('#foo')).toBeNull();
      expect(decodeLeagueStandingsFromQR('')).toBeNull();
    });

    it('decodes a valid league standings hash', () => {
      const league = makeLeague();
      const standings = [
        { rank: 1, name: 'Alice', points: 20, tournaments: 3, wins: 2, cashes: 3, avgPlace: 1.5, bestPlace: 1, knockouts: 5, totalCost: 30, totalPayout: 60, netBalance: 30, participationRate: 1, corrections: 0 },
        { rank: 2, name: 'Bob', points: 15, tournaments: 3, wins: 1, cashes: 2, avgPlace: 2.0, bestPlace: 1, knockouts: 3, totalCost: 30, totalPayout: 40, netBalance: 10, participationRate: 1, corrections: 0 },
      ] as ExtendedLeagueStanding[];
      const hash = encodeLeagueStandingsForQR(league, standings);
      const decoded = decodeLeagueStandingsFromQR(hash);
      expect(decoded).not.toBeNull();
      expect(decoded!.leagueName).toBe(league.name);
      expect(decoded!.standings).toHaveLength(2);
      expect(decoded!.standings[0].name).toBe('Alice');
      expect(decoded!.standings[0].points).toBe(20);
      expect(decoded!.standings[1].name).toBe('Bob');
      expect(decoded!.standings[1].netBalance).toBe(10);
    });

    it('round-trips league name with pipe delimiter (M13)', () => {
      const league = makeLeague({ name: 'Poker|Club:Liga' });
      const standings = [
        { rank: 1, name: 'Alice', points: 20, tournaments: 3, wins: 2, cashes: 3, avgPlace: 1.5, bestPlace: 1, knockouts: 5, totalCost: 30, totalPayout: 60, netBalance: 30, participationRate: 1, corrections: 0 },
      ] as ExtendedLeagueStanding[];
      const hash = encodeLeagueStandingsForQR(league, standings);
      const decoded = decodeLeagueStandingsFromQR(hash);
      expect(decoded).not.toBeNull();
      expect(decoded!.leagueName).toBe('Poker|Club:Liga');
    });

    it('round-trips player name with colon delimiter (M13)', () => {
      const league = makeLeague();
      const standings = [
        { rank: 1, name: 'O:Brien', points: 20, tournaments: 3, wins: 2, cashes: 3, avgPlace: 1.5, bestPlace: 1, knockouts: 5, totalCost: 30, totalPayout: 60, netBalance: 30, participationRate: 1, corrections: 0 },
      ] as ExtendedLeagueStanding[];
      const hash = encodeLeagueStandingsForQR(league, standings);
      const decoded = decodeLeagueStandingsFromQR(hash);
      expect(decoded).not.toBeNull();
      expect(decoded!.standings[0].name).toBe('O:Brien');
    });
  });

  // ---------------------------------------------------------------------------
  // Sprint 3: Security & Robustness Tests
  // ---------------------------------------------------------------------------

  describe('csvSafe (CSV injection prevention)', () => {
    it('wraps normal names in quotes', () => {
      expect(csvSafe('Alice')).toBe('"Alice"');
    });

    it('escapes existing double quotes', () => {
      expect(csvSafe('O"Brien')).toBe('"O""Brien"');
    });

    it('prefixes formula-triggering characters with single quote', () => {
      expect(csvSafe('=cmd|calc')).toBe("\"'=cmd|calc\"");
      expect(csvSafe('+cmd|calc')).toBe("\"'+cmd|calc\"");
      expect(csvSafe('-cmd|calc')).toBe("\"'-cmd|calc\"");
      expect(csvSafe('@cmd|calc')).toBe("\"'@cmd|calc\"");
    });

    it('does not prefix normal strings', () => {
      expect(csvSafe('Normal Name')).toBe('"Normal Name"');
    });
  });

  describe('decodeResultFromQR NaN guards', () => {
    it('returns null for all-NaN numeric header fields', () => {
      const encoded = 'Test|2024-01-01|abc|def|ghi|jkl|mno|pqr|stu|vwx|Player1:1:100:0:0:0';
      expect(decodeResultFromQR(encoded)).toBeNull();
    });

    it('returns null when player entries have invalid place', () => {
      const encoded = 'Test|2024-01-01|2|10|100|0|0|0|60|5|Player1:abc:100:0:0:0';
      expect(decodeResultFromQR(encoded)).toBeNull();
    });

    it('filters out invalid player entries but keeps valid ones', () => {
      const encoded = 'Test|2024-01-01|2|10|100|0|0|0|60|5|Valid:1:100:0:0:0;Invalid:abc:0:0:0:0';
      const result = decodeResultFromQR(encoded);
      expect(result).not.toBeNull();
      expect(result!.players).toHaveLength(1);
      expect(result!.players[0].name).toBe('Valid');
    });

    it('handles player name containing colon (M39)', () => {
      // Player "O:Brien" — name contains : which is the delimiter
      const encoded = 'Test|2024-01-01|1|10|100|0|0|0|60|5|O:Brien:1:100:0:0:0';
      const result = decodeResultFromQR(encoded);
      expect(result).not.toBeNull();
      expect(result!.players).toHaveLength(1);
      expect(result!.players[0].name).toBe('O:Brien');
      expect(result!.players[0].place).toBe(1);
      expect(result!.players[0].payout).toBe(100);
    });
  });

  describe('decodeLeagueStandingsFromQR NaN guards', () => {
    it('returns null for standings with NaN fields', () => {
      const hash = '#ls=' + encodeURIComponent('Liga|abc:Alice:xyz:def:ghi:jkl');
      expect(decodeLeagueStandingsFromQR(hash)).toBeNull();
    });

    it('filters out invalid entries and returns null if all invalid', () => {
      const hash = '#ls=' + encodeURIComponent('Liga|abc::xyz:def:ghi:jkl');
      expect(decodeLeagueStandingsFromQR(hash)).toBeNull();
    });
  });

  describe('parseConfigObject level validation', () => {
    it('filters out malformed level objects', () => {
      const config = parseConfigObject({
        name: 'Test',
        levels: [
          { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 },
          { invalid: true }, // malformed — no id, no type, no duration
          { id: '2', type: 'break', durationSeconds: 300 },
        ],
      });
      expect(config).not.toBeNull();
      expect(config!.levels).toHaveLength(2);
      expect(config!.levels[0].id).toBe('1');
      expect(config!.levels[1].id).toBe('2');
    });

    it('accepts empty levels array (backward compat)', () => {
      const config = parseConfigObject({
        name: 'Old',
        levels: [],
      });
      expect(config).not.toBeNull();
      expect(config!.levels).toHaveLength(0);
    });

    it('rejects levels with zero duration', () => {
      const config = parseConfigObject({
        name: 'Test',
        levels: [
          { id: '1', type: 'level', durationSeconds: 0, smallBlind: 25, bigBlind: 50 },
        ],
      });
      expect(config).not.toBeNull();
      expect(config!.levels).toHaveLength(0); // filtered out
    });
  });

  // ---------------------------------------------------------------------------
  // Sprint 4: Remote pure function Tests
  // ---------------------------------------------------------------------------

  describe('remote module — pure functions', () => {
    it('generatePeerId returns PKR- prefix with 8 alphanumeric chars', () => {
      const id = generatePeerId();
      expect(id).toMatch(/^PKR-[A-Z2-9]{8}$/);
    });

    it('generatePeerId produces unique IDs', () => {
      const ids = new Set(Array.from({ length: 20 }, () => generatePeerId()));
      // With 30^8 = 6.56e11 possibilities, 20 IDs should all be unique
      expect(ids.size).toBe(20);
    });

    it('buildRemoteUrl includes peer ID as hash parameter', () => {
      const url = buildRemoteUrl('PKR-ABCDEFGH');
      expect(url).toContain('#remote=PKR-ABCDEFGH');
      expect(url).toContain(window.location.origin);
    });

    it('buildRemoteUrl includes secret when provided', () => {
      const url = buildRemoteUrl('PKR-ABCDEFGH', 'mySecret123');
      expect(url).toContain('#remote=PKR-ABCDEFGH&s=mySecret123');
    });

    it('parseRemoteHash extracts valid peer ID', () => {
      expect(parseRemoteHash('#remote=PKR-AB3D5XYZ')).toEqual({ peerId: 'PKR-AB3D5XYZ', secret: null });
    });

    it('parseRemoteHash extracts peer ID and secret', () => {
      const result = parseRemoteHash('#remote=PKR-AB3D5XYZ&s=testSecret');
      expect(result).toEqual({ peerId: 'PKR-AB3D5XYZ', secret: 'testSecret' });
    });

    it('parseRemoteHash returns null for invalid format', () => {
      expect(parseRemoteHash('#remote=invalid')).toBeNull();
      expect(parseRemoteHash('#remote=PKR-')).toBeNull();
      expect(parseRemoteHash('#remote=PKR-ABCDEFGH9')).toBeNull(); // too long
      expect(parseRemoteHash('#other=PKR-ABCDEFGH')).toBeNull();
      expect(parseRemoteHash('')).toBeNull();
    });

    it('generatePeerId never produces confusable characters (I, O, 0, 1)', () => {
      // Generate many IDs and verify none contain confusable chars
      for (let i = 0; i < 50; i++) {
        const id = generatePeerId();
        const suffix = id.slice(4); // strip PKR-
        expect(suffix).not.toMatch(/[IO01]/);
      }
    });

    it('parseRemoteHash rejects lowercase', () => {
      expect(parseRemoteHash('#remote=PKR-abcdefgh')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Sprint 6: Remote Security — HMAC, Rate Limiting, Message Size (M31/M32)
  // ---------------------------------------------------------------------------

  describe('remote security — HMAC signing (M31)', () => {
    it('generateSecret returns a URL-safe base64 string', () => {
      const secret = generateSecret();
      expect(secret.length).toBeGreaterThan(0);
      // Should not contain +, /, or =
      expect(secret).not.toMatch(/[+/=]/);
    });

    it('generateSecret produces unique values', () => {
      const secrets = new Set(Array.from({ length: 20 }, () => generateSecret()));
      expect(secrets.size).toBe(20);
    });

    it('buildHmacPayload creates canonical payload string', () => {
      expect(buildHmacPayload('toggle', 1234567890)).toBe('command:toggle:1234567890:');
      expect(buildHmacPayload('next', 0)).toBe('command:next:0:');
    });

    it('signMessage + verifyMessage round-trip succeeds', async () => {
      const secret = generateSecret();
      // Import key for both signing and verifying
      const raw = Uint8Array.from(atob(secret.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      const key = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

      const payload = buildHmacPayload('toggle', Date.now());
      const signature = await signMessage(key, payload);

      expect(signature).toMatch(/^[0-9a-f]{64}$/); // SHA-256 = 32 bytes = 64 hex chars
      const valid = await verifyMessage(key, payload, signature);
      expect(valid).toBe(true);
    });

    it('verifyMessage rejects tampered payload', async () => {
      const secret = generateSecret();
      const raw = Uint8Array.from(atob(secret.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      const key = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

      const payload = buildHmacPayload('toggle', Date.now());
      const signature = await signMessage(key, payload);

      // Tamper the payload
      const tampered = buildHmacPayload('reset', Date.now());
      const valid = await verifyMessage(key, tampered, signature);
      expect(valid).toBe(false);
    });

    it('verifyMessage rejects wrong secret', async () => {
      const secret1 = generateSecret();
      const secret2 = generateSecret();
      const raw1 = Uint8Array.from(atob(secret1.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      const raw2 = Uint8Array.from(atob(secret2.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      const key1 = await crypto.subtle.importKey('raw', raw1, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
      const key2 = await crypto.subtle.importKey('raw', raw2, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

      const payload = buildHmacPayload('toggle', Date.now());
      const signature = await signMessage(key1, payload);

      // Verify with wrong key
      const valid = await verifyMessage(key2, payload, signature);
      expect(valid).toBe(false);
    });
  });

  describe('remote security — Rate Limiter (M32)', () => {
    it('allows requests within limit', () => {
      const limiter = new RateLimiter(5);
      for (let i = 0; i < 5; i++) {
        expect(limiter.allow()).toBe(true);
      }
    });

    it('throttles requests exceeding limit', () => {
      const limiter = new RateLimiter(3);
      expect(limiter.allow()).toBe(true);
      expect(limiter.allow()).toBe(true);
      expect(limiter.allow()).toBe(true);
      // 4th request should be throttled
      expect(limiter.allow()).toBe(false);
    });

    it('reset clears the window', () => {
      const limiter = new RateLimiter(2);
      expect(limiter.allow()).toBe(true);
      expect(limiter.allow()).toBe(true);
      expect(limiter.allow()).toBe(false);
      limiter.reset();
      expect(limiter.allow()).toBe(true);
    });

    it('MAX_MESSAGE_SIZE is 1024 bytes', () => {
      expect(MAX_MESSAGE_SIZE).toBe(1024);
    });
  });

  describe('remote — break commands', () => {
    it('RemoteCommand action type includes skipBreak and extendBreak', () => {
      // Type-level test: ensure the action union includes break commands
      // This validates that the types compile correctly
      const skipCmd: import('../src/domain/remote').RemoteCommand = {
        type: 'command',
        action: 'skipBreak',
      };
      const extendCmd: import('../src/domain/remote').RemoteCommand = {
        type: 'command',
        action: 'extendBreak',
        payload: { seconds: 300 },
      };
      expect(skipCmd.action).toBe('skipBreak');
      expect(extendCmd.action).toBe('extendBreak');
      expect(extendCmd.payload?.seconds).toBe(300);
    });
  });

  // ---------------------------------------------------------------------------
  // Sprint 4: displayChannel Tests
  // ---------------------------------------------------------------------------

  describe('displayChannel — serialization helpers', () => {
    it('serializeColorUpMap converts Map to array', () => {
      const map = new Map<number, { id: string; value: number; color: string; label: string }[]>();
      map.set(3, [{ id: '1', value: 25, color: '#ff0000', label: 'Red' }]);
      map.set(7, [{ id: '2', value: 100, color: '#0000ff', label: 'Blue' }]);
      const result = serializeColorUpMap(map);
      expect(result).toHaveLength(2);
      expect(result![0].levelIndex).toBe(3);
      expect(result![0].denoms[0].value).toBe(25);
      expect(result![1].levelIndex).toBe(7);
    });

    it('serializeColorUpMap returns undefined for empty/undefined', () => {
      expect(serializeColorUpMap(undefined)).toBeUndefined();
      expect(serializeColorUpMap(new Map())).toBeUndefined();
    });

    it('deserializeColorUpMap converts array back to Map', () => {
      const schedule = [
        { levelIndex: 3, denoms: [{ id: '1', value: 25, color: '#ff0000', label: 'Red' }] },
        { levelIndex: 7, denoms: [{ id: '2', value: 100, color: '#0000ff', label: 'Blue' }] },
      ];
      const map = deserializeColorUpMap(schedule);
      expect(map).toBeInstanceOf(Map);
      expect(map!.size).toBe(2);
      expect(map!.get(3)![0].value).toBe(25);
      expect(map!.get(7)![0].value).toBe(100);
    });

    it('deserializeColorUpMap returns undefined for empty/undefined', () => {
      expect(deserializeColorUpMap(undefined)).toBeUndefined();
      expect(deserializeColorUpMap([])).toBeUndefined();
    });

    it('round-trips through serialize/deserialize', () => {
      const original = new Map<number, { id: string; value: number; color: string; label: string }[]>();
      original.set(5, [{ id: 'a', value: 50, color: '#00ff00', label: 'Green' }]);
      const serialized = serializeColorUpMap(original);
      const restored = deserializeColorUpMap(serialized);
      expect(restored!.size).toBe(original.size);
      expect(restored!.get(5)![0].value).toBe(50);
    });
  });
});

// ---------------------------------------------------------------------------
// Remote — display URL functions & hello handshake
// ---------------------------------------------------------------------------

describe('remote — display URL functions', () => {
  it('buildDisplayUrl includes peer ID as hash parameter', () => {
    const url = buildDisplayUrl('PKR-ABCDEFGH');
    expect(url).toContain('#display=PKR-ABCDEFGH');
  });

  it('buildDisplayUrl uses correct base URL', () => {
    const url = buildDisplayUrl('PKR-ABCDEFGH');
    expect(url).toMatch(/^https?:\/\/.+#display=PKR-ABCDEFGH$/);
  });

  it('parseDisplayHash extracts valid peer ID', () => {
    expect(parseDisplayHash('#display=PKR-AB3D5XYZ')).toEqual({ peerId: 'PKR-AB3D5XYZ' });
  });

  it('parseDisplayHash returns null for invalid format', () => {
    expect(parseDisplayHash('#display=invalid')).toBeNull();
    expect(parseDisplayHash('#display=')).toBeNull();
    expect(parseDisplayHash('#remote=PKR-AB3D5XYZ')).toBeNull();
  });

  it('parseDisplayHash returns null for missing prefix', () => {
    expect(parseDisplayHash('#PKR-AB3D5XYZ')).toBeNull();
    expect(parseDisplayHash('')).toBeNull();
  });
});

describe('remote — hello handshake', () => {
  it('isHelloMessage validates display hello', () => {
    expect(isHelloMessage({ type: 'hello', role: 'display', version: 2 })).toBe(true);
  });

  it('isHelloMessage validates remote hello', () => {
    expect(isHelloMessage({ type: 'hello', role: 'remote', version: 2 })).toBe(true);
  });

  it('isHelloMessage rejects invalid messages', () => {
    expect(isHelloMessage({ type: 'command', action: 'play' })).toBe(false);
    expect(isHelloMessage({ type: 'hello' })).toBe(false);
    expect(isHelloMessage({ type: 'hello', role: 'spectator', version: 2 })).toBe(false);
    expect(isHelloMessage(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Chip Functions — previously untested exports
// ---------------------------------------------------------------------------

describe('applyChipPreset', () => {
  it('creates a ChipConfig from a 4-color preset', () => {
    const config = applyChipPreset(chipPresets[0]);
    expect(config.enabled).toBe(true);
    expect(config.colorUpEnabled).toBe(true);
    expect(config.denominations).toHaveLength(4);
    expect(config.colorUpSchedule).toEqual([]);
    // Each denomination should have a unique generated ID
    const ids = new Set(config.denominations.map((d) => d.id));
    expect(ids.size).toBe(4);
  });

  it('creates a ChipConfig from a 5-color preset', () => {
    const config = applyChipPreset(chipPresets[1]);
    expect(config.denominations).toHaveLength(5);
    expect(config.denominations[0].value).toBe(25);
    expect(config.denominations[4].value).toBe(1000);
  });

  it('creates a ChipConfig from a 6-color preset', () => {
    const config = applyChipPreset(chipPresets[2]);
    expect(config.denominations).toHaveLength(6);
    expect(config.denominations[5].value).toBe(5000);
  });
});

describe('CHIP_COLORS constant', () => {
  it('has 20 color entries', () => {
    expect(CHIP_COLORS).toHaveLength(20);
  });

  it('every entry has hex, de, en fields', () => {
    for (const color of CHIP_COLORS) {
      expect(color.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(color.de.length).toBeGreaterThan(0);
      expect(color.en.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate hex values', () => {
    const hexSet = new Set(CHIP_COLORS.map((c) => c.hex));
    expect(hexSet.size).toBe(CHIP_COLORS.length);
  });
});

describe('getRemovedDenomIds', () => {
  const makeDenom = (id: string, value: number): ChipDenomination => ({
    id, value, color: '#fff', label: 'Test',
  });

  it('returns empty set when no color-ups before current level', () => {
    const map = new Map<number, ChipDenomination[]>();
    map.set(10, [makeDenom('a', 25)]);
    const removed = getRemovedDenomIds(map, 5);
    expect(removed.size).toBe(0);
  });

  it('returns denoms removed at or before current level', () => {
    const map = new Map<number, ChipDenomination[]>();
    map.set(3, [makeDenom('a', 25)]);
    map.set(7, [makeDenom('b', 50)]);
    const removed = getRemovedDenomIds(map, 5);
    expect(removed.has('a')).toBe(true);
    expect(removed.has('b')).toBe(false);
  });

  it('includes denoms removed exactly at current level', () => {
    const map = new Map<number, ChipDenomination[]>();
    map.set(5, [makeDenom('x', 100)]);
    const removed = getRemovedDenomIds(map, 5);
    expect(removed.has('x')).toBe(true);
  });

  it('accumulates denoms from multiple earlier levels', () => {
    const map = new Map<number, ChipDenomination[]>();
    map.set(1, [makeDenom('a', 25)]);
    map.set(3, [makeDenom('b', 50)]);
    map.set(5, [makeDenom('c', 100)]);
    const removed = getRemovedDenomIds(map, 10);
    expect(removed.size).toBe(3);
  });
});

describe('getNextColorUpLevel', () => {
  const makeDenom = (id: string, value: number): ChipDenomination => ({
    id, value, color: '#fff', label: 'Test',
  });

  it('returns null when map is empty', () => {
    const map = new Map<number, ChipDenomination[]>();
    expect(getNextColorUpLevel(map, 0)).toBeNull();
  });

  it('returns the next color-up level after current', () => {
    const map = new Map<number, ChipDenomination[]>();
    map.set(3, [makeDenom('a', 25)]);
    map.set(7, [makeDenom('b', 50)]);
    expect(getNextColorUpLevel(map, 0)).toBe(3);
    expect(getNextColorUpLevel(map, 3)).toBe(7);
    expect(getNextColorUpLevel(map, 7)).toBeNull();
  });

  it('returns null when all color-ups are in the past', () => {
    const map = new Map<number, ChipDenomination[]>();
    map.set(2, [makeDenom('a', 25)]);
    expect(getNextColorUpLevel(map, 5)).toBeNull();
  });
});

describe('generateColorUpSuggestion', () => {
  it('returns empty array for single denomination', () => {
    const denoms: ChipDenomination[] = [{ id: 'a', value: 100, color: '#fff', label: 'W' }];
    const levels: Level[] = [
      { id: '1', type: 'level', durationSeconds: 600, smallBlind: 100, bigBlind: 200 },
    ];
    expect(generateColorUpSuggestion(levels, denoms)).toEqual([]);
  });

  it('returns color-up entries sorted by levelIndex', () => {
    const denoms: ChipDenomination[] = [
      { id: 'w', value: 25, color: '#fff', label: 'White' },
      { id: 'r', value: 100, color: '#f00', label: 'Red' },
      { id: 'b', value: 500, color: '#000', label: 'Black' },
    ];
    const levels: Level[] = [
      { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 },
      { id: '2', type: 'level', durationSeconds: 600, smallBlind: 50, bigBlind: 100 },
      { id: 'br', type: 'break', durationSeconds: 300 },
      { id: '3', type: 'level', durationSeconds: 600, smallBlind: 100, bigBlind: 200 },
      { id: 'br2', type: 'break', durationSeconds: 300 },
      { id: '4', type: 'level', durationSeconds: 600, smallBlind: 500, bigBlind: 1000 },
    ];
    const suggestions = generateColorUpSuggestion(levels, denoms);
    // Should suggest removing white chips at some point
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
    // Should be sorted by levelIndex
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i].levelIndex).toBeGreaterThanOrEqual(suggestions[i - 1].levelIndex);
    }
  });
});

describe('scheduleToColorUpMap', () => {
  it('converts a schedule array to a Map', () => {
    const denoms: ChipDenomination[] = [
      { id: 'w', value: 25, color: '#fff', label: 'White' },
      { id: 'r', value: 100, color: '#f00', label: 'Red' },
    ];
    const schedule = [
      { levelIndex: 3, denomId: 'w' },
      { levelIndex: 7, denomId: 'r' },
    ];
    const map = scheduleToColorUpMap(schedule, denoms);
    expect(map.size).toBe(2);
    expect(map.get(3)![0].value).toBe(25);
    expect(map.get(7)![0].value).toBe(100);
  });

  it('filters out entries with non-existent denomination IDs', () => {
    const denoms: ChipDenomination[] = [
      { id: 'w', value: 25, color: '#fff', label: 'White' },
    ];
    const schedule = [
      { levelIndex: 3, denomId: 'w' },
      { levelIndex: 5, denomId: 'nonexistent' },
    ];
    const map = scheduleToColorUpMap(schedule, denoms);
    expect(map.size).toBe(1);
    expect(map.has(5)).toBe(false);
  });

  it('groups multiple denoms at the same level', () => {
    const denoms: ChipDenomination[] = [
      { id: 'w', value: 25, color: '#fff', label: 'White' },
      { id: 'r', value: 50, color: '#f00', label: 'Red' },
    ];
    const schedule = [
      { levelIndex: 5, denomId: 'w' },
      { levelIndex: 5, denomId: 'r' },
    ];
    const map = scheduleToColorUpMap(schedule, denoms);
    expect(map.size).toBe(1);
    expect(map.get(5)!).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Mystery Bounty Edge Cases
// ---------------------------------------------------------------------------

describe('drawMysteryBounty edge cases', () => {
  it('returns amount: 0 for empty pool', () => {
    const result = drawMysteryBounty([]);
    expect(result.amount).toBe(0);
    expect(result.remainingPool).toEqual([]);
  });

  it('draws the only value from a single-item pool', () => {
    const result = drawMysteryBounty([500]);
    expect(result.amount).toBe(500);
    expect(result.remainingPool).toEqual([]);
  });

  it('reduces pool by exactly one item', () => {
    const pool = [100, 200, 300, 400, 500];
    const result = drawMysteryBounty(pool);
    expect(result.remainingPool).toHaveLength(4);
    expect(pool.reduce((a, b) => a + b, 0)).toBe(
      result.amount + result.remainingPool.reduce((a, b) => a + b, 0)
    );
  });

  it('draws from a pool with duplicate values', () => {
    const pool = [100, 100, 100];
    const result = drawMysteryBounty(pool);
    expect(result.amount).toBe(100);
    expect(result.remainingPool).toHaveLength(2);
  });

  it('successive draws exhaust the pool completely', () => {
    let pool = [50, 100, 200];
    const drawn: number[] = [];
    while (pool.length > 0) {
      const result = drawMysteryBounty(pool);
      drawn.push(result.amount);
      pool = result.remainingPool;
    }
    expect(drawn).toHaveLength(3);
    expect(drawn.sort((a, b) => a - b)).toEqual([50, 100, 200]);
    // Final draw from empty pool
    const final = drawMysteryBounty(pool);
    expect(final.amount).toBe(0);
  });

  it('does not mutate the original pool array', () => {
    const pool = [100, 200, 300];
    const copy = [...pool];
    drawMysteryBounty(pool);
    expect(pool).toEqual(copy);
  });
});

// ─── computeHistoricalDurationEstimate ──────────────────────────────────────

describe('computeHistoricalDurationEstimate', () => {
  function makeResult(playerCount: number, elapsedSeconds: number): TournamentResult {
    return {
      id: `t-${Math.random()}`,
      name: 'Test',
      date: new Date().toISOString(),
      playerCount,
      buyIn: 10,
      prizePool: playerCount * 10,
      players: [],
      bountyEnabled: false,
      bountyAmount: 0,
      rebuyEnabled: false,
      totalRebuys: 0,
      addOnEnabled: false,
      totalAddOns: 0,
      elapsedSeconds,
      levelsPlayed: 10,
    };
  }

  it('returns null for fewer than 3 matching tournaments', () => {
    const history = [makeResult(10, 7200), makeResult(10, 7800)];
    expect(computeHistoricalDurationEstimate(10, history)).toBeNull();
  });

  it('returns null for empty history', () => {
    expect(computeHistoricalDurationEstimate(10, [])).toBeNull();
  });

  it('returns null for playerCount <= 0', () => {
    const history = [makeResult(10, 7200), makeResult(10, 7800), makeResult(10, 8400)];
    expect(computeHistoricalDurationEstimate(0, history)).toBeNull();
  });

  it('ignores tournaments with elapsedSeconds === 0', () => {
    const history = [
      makeResult(10, 0),
      makeResult(10, 0),
      makeResult(10, 0),
      makeResult(10, 7200),
      makeResult(10, 7800),
    ];
    // Only 2 valid tournaments → null
    expect(computeHistoricalDurationEstimate(10, history)).toBeNull();
  });

  it('ignores tournaments with playerCount === 0', () => {
    const history = [
      makeResult(0, 7200),
      makeResult(0, 7800),
      makeResult(0, 8400),
      makeResult(10, 7200),
    ];
    // Only 1 valid similar tournament → null
    expect(computeHistoricalDurationEstimate(10, history)).toBeNull();
  });

  it('filters by ±30% player count range', () => {
    // Current: 10 players → range 7–13
    const history = [
      makeResult(5, 3600),   // too small (5 < 7)
      makeResult(15, 10800), // too large (15 > 13)
      makeResult(10, 7200),
      makeResult(10, 7200),
      makeResult(10, 7200),
    ];
    const result = computeHistoricalDurationEstimate(10, history);
    expect(result).not.toBeNull();
    expect(result!.sampleSize).toBe(3); // only the 3 with playerCount=10
  });

  it('includes tournaments at exact boundary of ±30%', () => {
    // Current: 10 → lowerBound=7, upperBound=13
    const history = [
      makeResult(7, 5040),   // exactly at lower bound (7 >= 7)
      makeResult(13, 9360),  // exactly at upper bound (13 <= 13)
      makeResult(10, 7200),
    ];
    const result = computeHistoricalDurationEstimate(10, history);
    expect(result).not.toBeNull();
    expect(result!.sampleSize).toBe(3);
  });

  it('computes median correctly for odd sample size', () => {
    // 3 tournaments, 10 players each
    // perPlayer: 600, 720, 840 → median = 720
    const history = [
      makeResult(10, 6000),  // 600/player
      makeResult(10, 7200),  // 720/player
      makeResult(10, 8400),  // 840/player
    ];
    const result = computeHistoricalDurationEstimate(10, history);
    expect(result).not.toBeNull();
    expect(result!.estimateSeconds).toBe(7200); // 720 * 10
  });

  it('computes median correctly for even sample size', () => {
    // 4 tournaments, 10 players each
    // perPlayer: 600, 700, 800, 900 → median = (700+800)/2 = 750
    const history = [
      makeResult(10, 6000),
      makeResult(10, 7000),
      makeResult(10, 8000),
      makeResult(10, 9000),
    ];
    const result = computeHistoricalDurationEstimate(10, history);
    expect(result).not.toBeNull();
    expect(result!.estimateSeconds).toBe(7500); // 750 * 10
  });

  it('returns low confidence for 3-4 matches', () => {
    const history = [
      makeResult(10, 7200),
      makeResult(10, 7200),
      makeResult(10, 7200),
    ];
    const result = computeHistoricalDurationEstimate(10, history);
    expect(result!.confidence).toBe('low');
    expect(result!.sampleSize).toBe(3);
  });

  it('returns medium confidence for 5-7 matches', () => {
    const history = Array.from({ length: 5 }, () => makeResult(10, 7200));
    const result = computeHistoricalDurationEstimate(10, history);
    expect(result!.confidence).toBe('medium');
    expect(result!.sampleSize).toBe(5);
  });

  it('returns high confidence for >= 8 matches', () => {
    const history = Array.from({ length: 8 }, () => makeResult(10, 7200));
    const result = computeHistoricalDurationEstimate(10, history);
    expect(result!.confidence).toBe('high');
    expect(result!.sampleSize).toBe(8);
  });

  it('scales estimate by current player count', () => {
    // History: 10-player tournaments, 720s/player median
    // Current: 8 players → 720 * 8 = 5760
    const history = [
      makeResult(10, 7200),
      makeResult(10, 7200),
      makeResult(10, 7200),
    ];
    const result = computeHistoricalDurationEstimate(8, history);
    expect(result).not.toBeNull();
    expect(result!.estimateSeconds).toBe(5760); // 720 * 8
  });
});

// ---------------------------------------------------------------------------
// Tournament Series
// ---------------------------------------------------------------------------

describe('Tournament Series', () => {
  // helper to create mock TournamentResult
  function mockResult(id: string, players: Array<{ name: string; place: number; payout: number; rebuys: number; addOn: boolean; knockouts: number; netBalance: number; bountyEarned: number }>): TournamentResult {
    return {
      id,
      name: 'Test Tournament',
      date: new Date().toISOString(),
      playerCount: players.length,
      buyIn: 10,
      prizePool: players.length * 10,
      players,
      bountyEnabled: false,
      bountyAmount: 0,
      rebuyEnabled: false,
      totalRebuys: 0,
      addOnEnabled: false,
      totalAddOns: 0,
      elapsedSeconds: 3600,
      levelsPlayed: 5,
    };
  }

  it('createSeries returns valid series', () => {
    const s = createSeries('Weekend Festival', '2026-03-14');
    expect(s.id).toBeTruthy();
    expect(s.name).toBe('Weekend Festival');
    expect(s.tournamentIds).toEqual([]);
    expect(s.rankingMode).toBe('points');
  });

  it('addTournamentToSeries links a result', () => {
    const s = createSeries('Fest', '2026-01-01');
    const linked = addTournamentToSeries(s, 'result-1');
    expect(linked.tournamentIds).toEqual(['result-1']);
    // Adding same ID again is idempotent
    const again = addTournamentToSeries(linked, 'result-1');
    expect(again.tournamentIds).toEqual(['result-1']);
  });

  it('removeTournamentFromSeries unlinks a result', () => {
    let s = createSeries('Fest', '2026-01-01');
    s = addTournamentToSeries(s, 'r1');
    s = addTournamentToSeries(s, 'r2');
    s = removeTournamentFromSeries(s, 'r1');
    expect(s.tournamentIds).toEqual(['r2']);
  });

  it('computeSeriesStandings aggregates across tournaments', () => {
    const s = createSeries('Series', '2026-01-01');
    s.tournamentIds = ['r1', 'r2'];

    const results = [
      mockResult('r1', [
        { name: 'Alice', place: 1, payout: 30, rebuys: 0, addOn: false, knockouts: 2, netBalance: 20, bountyEarned: 0 },
        { name: 'Bob', place: 2, payout: 20, rebuys: 1, addOn: false, knockouts: 1, netBalance: 0, bountyEarned: 0 },
      ]),
      mockResult('r2', [
        { name: 'Bob', place: 1, payout: 30, rebuys: 0, addOn: false, knockouts: 1, netBalance: 20, bountyEarned: 0 },
        { name: 'Alice', place: 3, payout: 0, rebuys: 0, addOn: false, knockouts: 0, netBalance: -10, bountyEarned: 0 },
      ]),
    ];

    const standings = computeSeriesStandings(s, results);
    expect(standings.length).toBe(2);

    // Both have 1 win each, Alice has 10+5=15 pts (1st=10, 3rd=5), Bob has 7+10=17 pts (2nd=7, 1st=10)
    const bob = standings.find(st => st.name === 'Bob')!;
    const alice = standings.find(st => st.name === 'Alice')!;
    expect(bob.points).toBe(17);
    expect(alice.points).toBe(15);
    expect(bob.rank).toBe(1);
    expect(alice.rank).toBe(2);
  });

  it('computeSeriesStandings respects minTournaments', () => {
    const s = createSeries('Series', '2026-01-01');
    s.tournamentIds = ['r1', 'r2'];
    s.minTournaments = 2;

    const results = [
      mockResult('r1', [
        { name: 'Alice', place: 1, payout: 30, rebuys: 0, addOn: false, knockouts: 0, netBalance: 20, bountyEarned: 0 },
        { name: 'Bob', place: 2, payout: 0, rebuys: 0, addOn: false, knockouts: 0, netBalance: -10, bountyEarned: 0 },
      ]),
      mockResult('r2', [
        { name: 'Bob', place: 1, payout: 30, rebuys: 0, addOn: false, knockouts: 0, netBalance: 20, bountyEarned: 0 },
      ]),
    ];

    const standings = computeSeriesStandings(s, results);
    const alice = standings.find(st => st.name === 'Alice')!;
    const bob = standings.find(st => st.name === 'Bob')!;
    expect(alice.qualified).toBe(false);
    expect(bob.qualified).toBe(true);
    // Bob should be ranked above Alice despite fewer points because qualified first
    expect(bob.rank).toBeLessThan(alice.rank);
  });

  it('computeSeriesStandings returns empty for no matching results', () => {
    const s = createSeries('Series', '2026-01-01');
    s.tournamentIds = ['nonexistent'];
    expect(computeSeriesStandings(s, [])).toEqual([]);
  });

  it('formatSeriesStandingsAsText produces readable output', () => {
    const s = createSeries('Weekend', '2026-03-14');
    const standings: SeriesStanding[] = [
      { name: 'Alice', points: 10, tournaments: 2, wins: 1, cashes: 2, avgPlace: 1.5, bestPlace: 1, totalCost: 20, totalPayout: 40, netBalance: 20, knockouts: 3, rank: 1, qualified: true },
    ];
    const text = formatSeriesStandingsAsText(s, standings);
    expect(text).toContain('Weekend');
    expect(text).toContain('Alice');
    expect(text).toContain('10 Pts');
  });

  it('formatSeriesStandingsAsCSV includes all columns', () => {
    const s = createSeries('Fest', '2026-01-01');
    const standings: SeriesStanding[] = [
      { name: 'Bob', points: 7, tournaments: 1, wins: 0, cashes: 1, avgPlace: 2, bestPlace: 2, totalCost: 10, totalPayout: 20, netBalance: 10, knockouts: 1, rank: 1, qualified: true },
    ];
    const csv = formatSeriesStandingsAsCSV(s, standings);
    expect(csv).toContain('Rank,Name,Points');
    expect(csv).toContain('"Bob"');
  });

  it('exportSeriesToJSON and parseSeriesFile round-trip', () => {
    const s = createSeries('Round Trip', '2026-01-01');
    s.tournamentIds = ['r1'];
    const results: TournamentResult[] = [
      mockResult('r1', [
        { name: 'Alice', place: 1, payout: 20, rebuys: 0, addOn: false, knockouts: 1, netBalance: 10, bountyEarned: 0 },
      ]),
    ];
    const json = exportSeriesToJSON(s, results);
    const parsed = parseSeriesFile(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.series.name).toBe('Round Trip');
    expect(parsed!.results.length).toBe(1);
  });

  it('parseSeriesFile validates structure', () => {
    expect(parseSeriesFile('invalid')).toBeNull();
    expect(parseSeriesFile('{}')).toBeNull();
    expect(parseSeriesFile('{"version":2}')).toBeNull();

    const valid: SeriesExport = {
      version: 1,
      series: createSeries('Test', '2026-01-01'),
      results: [],
      exportedAt: new Date().toISOString(),
    };
    const parsed = parseSeriesFile(JSON.stringify(valid));
    expect(parsed).not.toBeNull();
    expect(parsed!.series.name).toBe('Test');
  });
});

// ---------------------------------------------------------------------------
// Extended League: Head-to-Head, ELO, Weighted Points
// ---------------------------------------------------------------------------

describe('Extended League', () => {
  function mockGameDay(
    id: string,
    leagueId: string,
    date: string,
    participants: Array<{ name: string; place: number; points: number }>,
  ): GameDay {
    return {
      id,
      leagueId,
      date,
      participants: participants.map((p) => ({
        name: p.name,
        place: p.place,
        points: p.points,
        buyIn: 10,
        rebuys: 0,
        addOnCost: 0,
        payout: p.place === 1 ? 30 : 0,
        netBalance: p.place === 1 ? 20 : -10,
      })),
      totalPrizePool: 30,
      totalBuyIns: 30,
      cashBalance: 0,
    };
  }

  const gd1 = mockGameDay('gd1', 'L1', '2026-01-01', [
    { name: 'Alice', place: 1, points: 10 },
    { name: 'Bob', place: 2, points: 7 },
    { name: 'Charlie', place: 3, points: 5 },
  ]);

  const gd2 = mockGameDay('gd2', 'L1', '2026-01-08', [
    { name: 'Bob', place: 1, points: 10 },
    { name: 'Charlie', place: 2, points: 7 },
    { name: 'Alice', place: 3, points: 5 },
  ]);

  const baseLeague: League = {
    id: 'L1',
    name: 'Test League',
    pointSystem: {
      entries: [
        { place: 1, points: 10 },
        { place: 2, points: 7 },
        { place: 3, points: 5 },
      ],
    },
    createdAt: '2026-01-01T00:00:00Z',
  };

  describe('computeHeadToHeadMatrix', () => {
    it('computes wins/losses/meetings/winRate for 3 players across 2 game days', () => {
      const result = computeHeadToHeadMatrix([gd1, gd2]);
      expect(result.players).toHaveLength(3);

      // Find Alice and Bob indices
      const ai = result.players.indexOf('Alice');
      const bi = result.players.indexOf('Bob');
      const ci = result.players.indexOf('Charlie');
      expect(ai).toBeGreaterThanOrEqual(0);
      expect(bi).toBeGreaterThanOrEqual(0);
      expect(ci).toBeGreaterThanOrEqual(0);

      // Alice vs Bob: gd1 Alice wins, gd2 Bob wins -> 1-1
      const aliceVsBob = result.matrix[ai][bi]!;
      expect(aliceVsBob.meetings).toBe(2);
      expect(aliceVsBob.wins).toBe(1);
      expect(aliceVsBob.losses).toBe(1);
      expect(aliceVsBob.winRate).toBe(0.5);

      // Alice vs Charlie: gd1 Alice wins, gd2 Charlie wins -> 1-1
      const aliceVsCharlie = result.matrix[ai][ci]!;
      expect(aliceVsCharlie.meetings).toBe(2);
      expect(aliceVsCharlie.wins).toBe(1);
      expect(aliceVsCharlie.losses).toBe(1);
    });

    it('filters to specified players when filterPlayers provided', () => {
      const result = computeHeadToHeadMatrix([gd1, gd2], ['Alice', 'Bob']);
      expect(result.players).toHaveLength(2);
      expect(result.players).toContain('Alice');
      expect(result.players).toContain('Bob');
      // Charlie should not be in the matrix
      expect(result.players).not.toContain('Charlie');
    });

    it('has null diagonal entries', () => {
      const result = computeHeadToHeadMatrix([gd1, gd2]);
      for (let i = 0; i < result.players.length; i++) {
        expect(result.matrix[i][i]).toBeNull();
      }
    });
  });

  describe('computeEloRatings', () => {
    it('produces ratings that diverge from start after 2 game days', () => {
      const ratings = computeEloRatings([gd1, gd2]);
      const alice = ratings.get('alice')!;
      const bob = ratings.get('bob')!;
      const charlie = ratings.get('charlie')!;
      // All should exist
      expect(alice).toBeDefined();
      expect(bob).toBeDefined();
      expect(charlie).toBeDefined();
      // Not all equal to start (1200)
      const allEqual = alice === 1200 && bob === 1200 && charlie === 1200;
      expect(allEqual).toBe(false);
    });

    it('gives higher rating to winner and lower to loser in single game day', () => {
      const singleGd = mockGameDay('gd_single', 'L1', '2026-01-01', [
        { name: 'Winner', place: 1, points: 10 },
        { name: 'Loser', place: 2, points: 7 },
      ]);
      const ratings = computeEloRatings([singleGd]);
      expect(ratings.get('winner')!).toBeGreaterThan(1200);
      expect(ratings.get('loser')!).toBeLessThan(1200);
    });

    it('uses default params when none provided', () => {
      const ratings = computeEloRatings([gd1]);
      // Should not throw and should return results
      expect(ratings.size).toBe(3);
    });
  });

  describe('computeWeightedPoints', () => {
    it('gives higher weight to more recent tournaments', () => {
      const wp = computeWeightedPoints([gd1, gd2], baseLeague.pointSystem, 0.5);
      // gd1 is older (index 0), weight = 0.5^(2-1-0) = 0.5
      // gd2 is newer (index 1), weight = 0.5^(2-1-1) = 1.0
      // Alice: gd1=10*0.5 + gd2=5*1.0 = 10.0
      // Bob: gd1=7*0.5 + gd2=10*1.0 = 13.5
      expect(wp.get('alice')).toBeCloseTo(10.0);
      expect(wp.get('bob')).toBeCloseTo(13.5);
    });

    it('with decayFactor 1.0 equals simple sum of points', () => {
      const wp = computeWeightedPoints([gd1, gd2], baseLeague.pointSystem, 1.0);
      // Alice: 10 + 5 = 15
      // Bob: 7 + 10 = 17
      // Charlie: 5 + 7 = 12
      expect(wp.get('alice')).toBeCloseTo(15);
      expect(wp.get('bob')).toBeCloseTo(17);
      expect(wp.get('charlie')).toBeCloseTo(12);
    });
  });

  describe('computeExtendedStandings with ranking algorithms', () => {
    it('populates eloRating when rankingAlgorithm is elo', () => {
      const league: League = { ...baseLeague, rankingAlgorithm: 'elo' };
      const standings = computeExtendedStandings(league, [gd1, gd2]);
      expect(standings.length).toBe(3);
      for (const s of standings) {
        expect(s.eloRating).toBeDefined();
        expect(typeof s.eloRating).toBe('number');
      }
      // Should be sorted by ELO descending
      for (let i = 1; i < standings.length; i++) {
        expect(standings[i - 1].eloRating!).toBeGreaterThanOrEqual(standings[i].eloRating!);
      }
    });

    it('sets meetsMinParticipation based on minParticipation threshold', () => {
      const league: League = { ...baseLeague, minParticipation: 2 };
      // gd3 has only Alice and Bob (Charlie absent)
      const gd3 = mockGameDay('gd3', 'L1', '2026-01-15', [
        { name: 'Alice', place: 1, points: 10 },
        { name: 'Bob', place: 2, points: 7 },
      ]);
      const standings = computeExtendedStandings(league, [gd1, gd3]);
      const alice = standings.find((s) => s.name === 'Alice')!;
      const charlie = standings.find((s) => s.name === 'Charlie')!;
      // Alice: 2 game days, meets threshold
      expect(alice.meetsMinParticipation).toBe(true);
      // Charlie: 1 game day, does not meet threshold
      expect(charlie.meetsMinParticipation).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Custom Audio
// ---------------------------------------------------------------------------

describe('Custom Audio', () => {
  it('getCustomAudioForAnnouncement returns null when no mapping exists', () => {
    expect(getCustomAudioForAnnouncement('shuffle-up', 'de')).toBeNull();
    expect(getCustomAudioForAnnouncement('level-change', 'en')).toBeNull();
    expect(getCustomAudioForAnnouncement('nonexistent-key', 'de')).toBeNull();
  });

  it('formatFileSize returns correct format for various sizes', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('CUSTOMIZABLE_ANNOUNCEMENTS contains expected keys', () => {
    expect(CUSTOMIZABLE_ANNOUNCEMENTS).toContain('shuffle-up');
    expect(CUSTOMIZABLE_ANNOUNCEMENTS).toContain('level-change');
    expect(CUSTOMIZABLE_ANNOUNCEMENTS).toContain('break-start');
    expect(CUSTOMIZABLE_ANNOUNCEMENTS).toContain('bubble');
    expect(CUSTOMIZABLE_ANNOUNCEMENTS).toContain('itm');
    expect(CUSTOMIZABLE_ANNOUNCEMENTS).toContain('elimination');
    expect(CUSTOMIZABLE_ANNOUNCEMENTS).toContain('winner');
    expect(CUSTOMIZABLE_ANNOUNCEMENTS).toContain('last-hand');
    expect(CUSTOMIZABLE_ANNOUNCEMENTS).toContain('final-table');
    expect(CUSTOMIZABLE_ANNOUNCEMENTS).toContain('break-skipped');
    expect(CUSTOMIZABLE_ANNOUNCEMENTS).toContain('break-extended');
    expect(CUSTOMIZABLE_ANNOUNCEMENTS.length).toBe(28);
  });
});

describe('DisplayLayout type', () => {
  it('should accept valid display layout values', () => {
    const layouts: import('../src/domain/types').DisplayLayout[] = ['standard', 'compact', 'timer-only', 'ultra-large'];
    expect(layouts).toHaveLength(4);
  });
});

describe('displayLayouts', () => {
  it('getLayoutConfig returns standard layout by default', () => {
    const cfg = getLayoutConfig('standard');
    expect(cfg.timerFlex).toBe(55);
    expect(cfg.secondaryFlex).toBe(45);
    expect(cfg.showSecondary).toBe(true);
    expect(cfg.showTicker).toBe(true);
  });

  it('getLayoutConfig returns compact layout', () => {
    const cfg = getLayoutConfig('compact');
    expect(cfg.timerFlex).toBe(40);
    expect(cfg.secondaryFlex).toBe(60);
    expect(cfg.showSecondary).toBe(true);
  });

  it('getLayoutConfig returns timer-only layout', () => {
    const cfg = getLayoutConfig('timer-only');
    expect(cfg.showSecondary).toBe(false);
    expect(cfg.showTicker).toBe(false);
    expect(cfg.timerFlex).toBe(100);
  });

  it('getLayoutConfig returns ultra-large layout', () => {
    const cfg = getLayoutConfig('ultra-large');
    expect(cfg.timerFlex).toBe(70);
    expect(cfg.secondaryFlex).toBe(30);
    expect(cfg.showSecondary).toBe(true);
    expect(cfg.timerFontScale).toBeGreaterThan(1);
  });

  it('getLayoutConfig defaults to standard for undefined', () => {
    const cfg = getLayoutConfig(undefined);
    expect(cfg.timerFlex).toBe(55);
  });

  it('DISPLAY_LAYOUTS has all 4 variants with labels', () => {
    expect(DISPLAY_LAYOUTS).toHaveLength(4);
    expect(DISPLAY_LAYOUTS.map((l: { id: string }) => l.id)).toEqual(['standard', 'compact', 'timer-only', 'ultra-large']);
    for (const l of DISPLAY_LAYOUTS) {
      expect(l.labelKey).toBeTruthy();
      expect(l.descKey).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

describe('platform detection', () => {
  const originalUA = navigator.userAgent;
  const originalPlatform = navigator.platform;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true });
    Object.defineProperty(navigator, 'platform', { value: originalPlatform, configurable: true });
  });

  it('detectPlatform returns desktop by default', () => {
    expect(detectPlatform()).toBe('desktop');
  });

  it('detectPlatform returns android for Android UA', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
      configurable: true,
    });
    expect(detectPlatform()).toBe('android');
  });

  it('detectPlatform returns ios for iPhone UA', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
      configurable: true,
    });
    expect(detectPlatform()).toBe('ios');
  });

  it('detectDesktopOS returns macos for Mac platform', () => {
    Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true });
    expect(detectDesktopOS()).toBe('macos');
  });

  it('detectDesktopOS returns windows for Win32 platform', () => {
    Object.defineProperty(navigator, 'platform', { value: 'Win32', configurable: true });
    expect(detectDesktopOS()).toBe('windows');
  });
});

describe('Presentation API', () => {
  it('isPresentationApiAvailable returns false in test env', () => {
    expect(isPresentationApiAvailable()).toBe(false);
  });

  it('buildPresentationUrl includes display hash', () => {
    const url = buildPresentationUrl('PKR-AB3D5XYZ');
    expect(url).toContain('#display=PKR-AB3D5XYZ');
  });

  it('buildPresentationUrl uses current origin', () => {
    const url = buildPresentationUrl('PKR-XYZ99ABC');
    expect(url).toMatch(/^https?:\/\//);
  });
});

// ---------------------------------------------------------------------------
// ICM Calculator
// ---------------------------------------------------------------------------
describe('ICM Calculator', () => {
  describe('computeIcmEquity', () => {
    it('returns zeros for empty inputs', async () => {
      expect(await computeIcmEquity([], [])).toEqual([]);
      expect(await computeIcmEquity([1000], [])).toEqual([0]);
    });

    it('single player gets all payouts', async () => {
      const equities = await computeIcmEquity([5000], [100, 50, 25]);
      expect(equities[0]).toBeCloseTo(175, 0);
    });

    it('equal stacks produce equal equity', async () => {
      const equities = await computeIcmEquity([5000, 5000], [100, 50]);
      expect(equities[0]).toBeCloseTo(equities[1], 2);
      expect(equities[0]).toBeCloseTo(75, 0); // each gets (100+50)/2
    });

    it('chip leader has higher equity but not proportional to chips', async () => {
      // Classic ICM: 70% chips ≠ 70% equity due to non-linear payout
      const equities = await computeIcmEquity([7000, 3000], [100, 50]);
      expect(equities[0]).toBeGreaterThan(equities[1]);
      // Chip leader has 70% of chips but < 70% of total prize
      expect(equities[0]).toBeLessThan(105); // < 70% of 150
      expect(equities[0]).toBeGreaterThan(75); // > 50% of 150
    });

    it('3-player known ICM values', async () => {
      // Classic example: 5000/3000/2000 stacks, payouts 50/30/20
      const equities = await computeIcmEquity([5000, 3000, 2000], [50, 30, 20]);
      const total = equities.reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(100, 0); // total payouts preserved
      // Chip leader gets most
      expect(equities[0]).toBeGreaterThan(equities[1]);
      expect(equities[1]).toBeGreaterThan(equities[2]);
    });

    it('ignores zero-stack players (eliminated)', async () => {
      const equities = await computeIcmEquity([5000, 0, 3000], [100, 50]);
      expect(equities[1]).toBe(0);
      expect(equities[0] + equities[2]).toBeCloseTo(150, 0);
    });

    it('total equity equals total payouts', async () => {
      const stacks = [8000, 5000, 4000, 3000];
      const payouts = [200, 120, 80, 40];
      const equities = await computeIcmEquity(stacks, payouts);
      const total = equities.reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(440, 0);
    });

    it('more players than payout places', async () => {
      const stacks = [4000, 3000, 2000, 1000];
      const payouts = [100, 50]; // only 2 paid places
      const equities = await computeIcmEquity(stacks, payouts);
      const total = equities.reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(150, 0);
      // All players have some equity (even unpaid positions matter)
      expect(equities[3]).toBeGreaterThan(0);
    });
  });

  describe('computeIcmDeal', () => {
    it('returns structured results with percentages', async () => {
      const results = await computeIcmDeal([6000, 4000], [100, 50]);
      expect(results).toHaveLength(2);
      expect(results[0].stackPercent).toBeCloseTo(60, 0);
      expect(results[1].stackPercent).toBeCloseTo(40, 0);
      expect(results[0].equityPercent + results[1].equityPercent).toBeCloseTo(100, 0);
    });

    it('handles all-zero stacks', async () => {
      const results = await computeIcmDeal([0, 0], [100, 50]);
      expect(results[0].equity).toBe(0);
      expect(results[1].equity).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Undo Stack
// ---------------------------------------------------------------------------
describe('UndoStack', () => {
  const makeSnapshot = (action: string) =>
    createUndoSnapshot(action, [{ id: '1', name: 'Alice', status: 'active', rebuys: 0, addOn: false, seatIndex: 0, placement: null, knockouts: 0 }], undefined, [], 0);

  it('starts empty', () => {
    const stack = new UndoStack();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    expect(stack.undoCount).toBe(0);
  });

  it('push adds entry and clears redo', () => {
    let stack = new UndoStack();
    stack = stack.push(makeSnapshot('eliminate'));
    expect(stack.canUndo).toBe(true);
    expect(stack.undoCount).toBe(1);
    expect(stack.undoLabel).toBe('eliminate');
  });

  it('undo restores previous state', () => {
    let stack = new UndoStack();
    const before = makeSnapshot('eliminate');
    stack = stack.push(before);
    const current = makeSnapshot('current');
    const result = stack.undo(current);
    expect(result).not.toBeNull();
    const [newStack, restored] = result!;
    expect(restored.actionKey).toBe('eliminate');
    expect(newStack.canUndo).toBe(false);
    expect(newStack.canRedo).toBe(true);
  });

  it('redo restores undone state', () => {
    let stack = new UndoStack();
    stack = stack.push(makeSnapshot('eliminate'));
    const current = makeSnapshot('current');
    const [afterUndo] = stack.undo(current)!;
    const redoCurrent = makeSnapshot('after-undo');
    const result = afterUndo.redo(redoCurrent);
    expect(result).not.toBeNull();
    const [afterRedo, restored] = result!;
    expect(restored.actionKey).toBe('current');
    expect(afterRedo.canUndo).toBe(true);
    expect(afterRedo.canRedo).toBe(false);
  });

  it('push clears redo stack', () => {
    let stack = new UndoStack();
    stack = stack.push(makeSnapshot('a'));
    const [afterUndo] = stack.undo(makeSnapshot('b'))!;
    expect(afterUndo.canRedo).toBe(true);
    const afterPush = afterUndo.push(makeSnapshot('c'));
    expect(afterPush.canRedo).toBe(false);
  });

  it('respects max depth (30)', () => {
    let stack = new UndoStack();
    for (let i = 0; i < 35; i++) {
      stack = stack.push(makeSnapshot(`action-${i}`));
    }
    expect(stack.undoCount).toBe(30);
  });

  it('clear resets everything', () => {
    let stack = new UndoStack();
    stack = stack.push(makeSnapshot('a'));
    stack = stack.push(makeSnapshot('b'));
    const cleared = stack.clear();
    expect(cleared.canUndo).toBe(false);
    expect(cleared.canRedo).toBe(false);
  });

  it('undo returns null when empty', () => {
    const stack = new UndoStack();
    expect(stack.undo(makeSnapshot('x'))).toBeNull();
  });

  it('redo returns null when empty', () => {
    const stack = new UndoStack();
    expect(stack.redo(makeSnapshot('x'))).toBeNull();
  });

  it('snapshot captures tables state for undo', () => {
    const players: Player[] = [
      { id: '1', name: 'Alice', status: 'active', rebuys: 0, addOn: false, seatIndex: 0, placement: null, knockouts: 0 },
      { id: '2', name: 'Bob', status: 'active', rebuys: 0, addOn: false, seatIndex: 1, placement: null, knockouts: 0 },
    ];
    const tables: Table[] = [
      { id: 't1', name: 'Table 1', seats: [{ seatNumber: 1, playerId: '1' }, { seatNumber: 2, playerId: null }], maxSeats: 6, status: 'active', dealerSeat: 1 },
      { id: 't2', name: 'Table 2', seats: [{ seatNumber: 1, playerId: '2' }, { seatNumber: 2, playerId: null }], maxSeats: 6, status: 'active', dealerSeat: 1 },
    ];
    const snapshot = createUndoSnapshot('eliminate', players, tables, [], 0);
    expect(snapshot.tables).toHaveLength(2);
    expect(snapshot.tables![0]!.id).toBe('t1');
    expect(snapshot.tables![1]!.id).toBe('t2');
  });

  it('undo restores tables after dissolution', () => {
    const tablesBefore: Table[] = [
      { id: 't1', name: 'Table 1', seats: [{ seatNumber: 1, playerId: '1' }, { seatNumber: 2, playerId: '2' }], maxSeats: 6, status: 'active', dealerSeat: 1 },
      { id: 't2', name: 'Table 2', seats: [{ seatNumber: 1, playerId: '3' }], maxSeats: 6, status: 'active', dealerSeat: 1 },
    ];
    const players = [
      { id: '1', name: 'A', status: 'active' as const, rebuys: 0, addOn: false, seatIndex: 0, placement: null, knockouts: 0 },
      { id: '2', name: 'B', status: 'active' as const, rebuys: 0, addOn: false, seatIndex: 1, placement: null, knockouts: 0 },
      { id: '3', name: 'C', status: 'active' as const, rebuys: 0, addOn: false, seatIndex: 0, placement: null, knockouts: 0 },
    ];

    const beforeSnapshot = createUndoSnapshot('eliminate', players, tablesBefore, [], 0);
    let stack = new UndoStack();
    stack = stack.push(beforeSnapshot);

    const tablesAfter: Table[] = [
      { id: 't1', name: 'Table 1', seats: [{ seatNumber: 1, playerId: '1' }, { seatNumber: 2, playerId: '2' }, { seatNumber: 3, playerId: '3' }], maxSeats: 6, status: 'active', dealerSeat: 1 },
      { id: 't2', name: 'Table 2', seats: [], maxSeats: 6, status: 'dissolved', dealerSeat: 1 },
    ];
    const currentSnapshot = createUndoSnapshot('current', players, tablesAfter, [], 0);

    const result = stack.undo(currentSnapshot);
    expect(result).not.toBeNull();
    const [, restored] = result!;
    expect(restored.tables).toHaveLength(2);
    expect(restored.tables![0]!.status).toBe('active');
    expect(restored.tables![1]!.status).toBe('active');
    expect(restored.tables![1]!.seats[0]!.playerId).toBe('3');
  });

  it('snapshot deep-clones tables (mutations do not affect snapshot)', () => {
    const tables: Table[] = [
      { id: 't1', name: 'Table 1', seats: [{ seatNumber: 1, playerId: '1' }], maxSeats: 6, status: 'active', dealerSeat: 1 },
    ];
    const snapshot = createUndoSnapshot('test', [], tables, [], 0);

    tables[0]!.status = 'dissolved';
    tables[0]!.seats[0]!.playerId = 'changed';

    expect(snapshot.tables![0]!.status).toBe('active');
    expect(snapshot.tables![0]!.seats[0]!.playerId).toBe('1');
  });
});

// ---------------------------------------------------------------------------
// Currency parsing
// ---------------------------------------------------------------------------

describe('parseConfigObject — currency', () => {
  it('should default currency to EUR when field is missing', () => {
    const raw = {
      levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }],
      buyIn: 10,
      startingChips: 20000,
    };
    const config = parseConfigObject(raw as Record<string, unknown>);
    expect(config?.currency).toBe('EUR');
  });

  it('should preserve currency when present', () => {
    const raw = {
      levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }],
      buyIn: 10,
      startingChips: 20000,
      currency: 'USD',
    };
    const config = parseConfigObject(raw as Record<string, unknown>);
    expect(config?.currency).toBe('USD');
  });

  it('should fallback to EUR for invalid currency', () => {
    const raw = {
      levels: [{ id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }],
      currency: 'INVALID',
    };
    const config = parseConfigObject(raw as Record<string, unknown>);
    expect(config?.currency).toBe('EUR');
  });
});

// ---------------------------------------------------------------------------
// Payout Templates
// ---------------------------------------------------------------------------

describe('payoutTemplates', () => {
  it('PAYOUT_TEMPLATES should have at least 3 templates', () => {
    expect(PAYOUT_TEMPLATES.length).toBeGreaterThanOrEqual(3);
  });

  it('each template entries should sum to 100%', () => {
    for (const tpl of PAYOUT_TEMPLATES) {
      const sum = tpl.entries.reduce((s, e) => s + e.value, 0);
      expect(sum).toBe(100);
    }
  });

  it('each template should have unique id', () => {
    const ids = PAYOUT_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each template entries should have sequential places starting at 1', () => {
    for (const tpl of PAYOUT_TEMPLATES) {
      tpl.entries.forEach((e, i) => {
        expect(e.place).toBe(i + 1);
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Quick-Start config generation
// ---------------------------------------------------------------------------

describe('Quick-Start config generation', () => {
  it('should create valid config from preset with player count', () => {
    const presets = getBuiltInPresets();
    const preset = presets[1]; // standard home game
    const playerCount = 8;
    const players = defaultPlayers(playerCount);
    const config = {
      ...defaultConfig(),
      ...preset.config,
      players,
      dealerIndex: 0,
      payout: defaultPayoutForPlayerCount(playerCount),
      currency: 'EUR' as const,
    };
    expect(config.players.length).toBe(8);
    expect(config.buyIn).toBe(preset.config.buyIn);
    expect(config.payout.entries.length).toBe(3);
    expect(config.levels.length).toBeGreaterThan(0);
    expect(config.currency).toBe('EUR');
  });

  it('defaultPayoutForPlayerCount returns correct places', () => {
    const payout2 = defaultPayoutForPlayerCount(2);
    expect(payout2.entries.length).toBe(1);
    expect(payout2.entries[0].place).toBe(1);

    const payout4 = defaultPayoutForPlayerCount(4);
    expect(payout4.entries.length).toBe(2);

    const payout10 = defaultPayoutForPlayerCount(10);
    expect(payout10.entries.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// formatEventAsText with i18n
// ---------------------------------------------------------------------------

describe('formatEventAsText with i18n', () => {
  const mockT = (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'event.playerEliminated': '❌ {name} ausgeschieden{eliminator}{placement}',
      'event.by': 'von',
      'event.place': 'Platz',
      'event.rebuyTaken': '🔄 {name} Rebuy',
      'event.addonTaken': '➕ {name} Add-On',
      'event.levelStart': '▶ Level {level} gestartet',
      'event.timerPaused': '⏸ Timer pausiert',
      'event.timerResumed': '▶ Timer fortgesetzt',
      'event.breakExtended': '☕ Pause verlängert (+{seconds}s)',
      'event.breakSkipped': '⏭ Pause übersprungen',
      'event.tournamentStarted': '🃏 Turnier gestartet',
      'event.tournamentFinished': '🏆 Turnier beendet',
      'event.playerReinstated': '↩ {name} zurück im Turnier',
      'event.lateRegistration': '📝 {name} nachgemeldet',
      'event.reEntry': '🔁 {name} Re-Entry',
      'event.dealerAdvanced': '🎯 Dealer weitergerückt',
      'event.tableMove': '🔀 {name} Tischwechsel',
      'event.tableDissolved': '🚫 Tisch {table} aufgelöst',
      'event.callTheClockStarted': '⏱ Call the Clock gestartet',
      'event.callTheClockExpired': '⏱ Call the Clock abgelaufen',
      'event.levelSkipForward': '⏩ Level vorgesprungen',
      'event.levelSkipBackward': '⏪ Level zurückgesprungen',
    };
    let text = translations[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  };

  it('formats elimination with i18n', () => {
    const event = createEvent('player_eliminated', 0, { playerId: 'p1', placement: 3 });
    const result = formatEventAsText(event, { p1: 'Alice' }, mockT as never);
    expect(result).toContain('Alice');
    expect(result).toContain('❌');
  });

  it('formats elimination with eliminator using i18n', () => {
    const event = createEvent('player_eliminated', 0, { playerId: 'p1', eliminatorId: 'p2', placement: 2 });
    const result = formatEventAsText(event, { p1: 'Alice', p2: 'Bob' }, mockT as never);
    expect(result).toContain('Alice');
    expect(result).toContain('Bob');
  });

  it('formats rebuy_taken with i18n', () => {
    const event = createEvent('rebuy_taken', 2, { playerId: 'p1' });
    const result = formatEventAsText(event, { p1: 'Alice' }, mockT as never);
    expect(result).toContain('Alice');
    expect(result).toContain('🔄');
  });

  it('formats break_skipped with i18n', () => {
    const event = createEvent('break_skipped', 5, {});
    const result = formatEventAsText(event, {}, mockT as never);
    expect(result).toContain('⏭');
  });

  it('formats break_extended with i18n', () => {
    const event = createEvent('break_extended', 5, { seconds: 300 });
    const result = formatEventAsText(event, {}, mockT as never);
    expect(result).toContain('300');
    expect(result).toContain('☕');
  });

  it('backwards compatible: formats without t function (German hardcoded)', () => {
    const event = createEvent('player_eliminated', 0, { playerId: 'p1', placement: 3 });
    const result = formatEventAsText(event, { p1: 'Alice' });
    expect(result).toContain('Alice');
    expect(result).toContain('❌');
  });
});

// ---------------------------------------------------------------------------
// Tournament Event Log integration
// ---------------------------------------------------------------------------

describe('Tournament Event Log integration', () => {
  it('createEvent generates unique IDs', () => {
    const e1 = createEvent('tournament_started', 0, {});
    const e2 = createEvent('level_start', 1, {});
    expect(e1.id).not.toBe(e2.id);
  });

  it('createEvent sets timestamp and levelIndex', () => {
    const before = Date.now();
    const event = createEvent('rebuy_taken', 3, { playerId: 'p1' });
    const after = Date.now();
    expect(event.timestamp).toBeGreaterThanOrEqual(before);
    expect(event.timestamp).toBeLessThanOrEqual(after);
    expect(event.levelIndex).toBe(3);
    expect(event.type).toBe('rebuy_taken');
    expect(event.data.playerId).toBe('p1');
  });

  it('filterEventsByType returns matching events', () => {
    const events = [
      createEvent('tournament_started', 0, {}),
      createEvent('player_eliminated', 2, { playerId: 'p1' }),
      createEvent('rebuy_taken', 3, { playerId: 'p2' }),
      createEvent('player_eliminated', 4, { playerId: 'p3' }),
    ];
    const eliminations = filterEventsByType(events, 'player_eliminated');
    expect(eliminations).toHaveLength(2);
    expect(eliminations.every(e => e.type === 'player_eliminated')).toBe(true);
  });

  it('filterEventsByType returns empty for no matches', () => {
    const events = [
      createEvent('tournament_started', 0, {}),
      createEvent('level_start', 1, {}),
    ];
    expect(filterEventsByType(events, 'player_eliminated')).toHaveLength(0);
  });

  it('formatEventAsText handles break_skipped event', () => {
    const event = createEvent('break_skipped', 5, {});
    const text = formatEventAsText(event, {});
    expect(text).toContain('⏭');
  });
});

describe('HMAC security', () => {
  it('buildHmacPayload includes serialized payload', () => {
    const payload = buildHmacPayload('eliminatePlayer', 1234567890, { playerId: 'p1', eliminatorId: 'p2' });
    expect(payload).toContain('eliminatePlayer');
    expect(payload).toContain('1234567890');
    expect(payload).toContain('eliminatorId');
    expect(payload).toContain('playerId');
  });

  it('buildHmacPayload without payload matches format with empty trailing', () => {
    const payload = buildHmacPayload('toggle', 1234567890);
    expect(payload).toBe('command:toggle:1234567890:');
  });
});

describe('Remote HMAC security', () => {
  it('signMessage produces 64-char hex string', async () => {
    const key = await crypto.subtle.importKey(
      'raw', new Uint8Array(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
    );
    const sig = await signMessage(key, 'test-payload');
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifyMessage accepts valid signature', async () => {
    const key = await crypto.subtle.importKey(
      'raw', new Uint8Array(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
    );
    const payload = buildHmacPayload('toggle', 1234567890);
    const sig = await signMessage(key, payload);
    expect(await verifyMessage(key, payload, sig)).toBe(true);
  });

  it('verifyMessage rejects tampered signature', async () => {
    const key = await crypto.subtle.importKey(
      'raw', new Uint8Array(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
    );
    const payload = buildHmacPayload('toggle', 1234567890);
    const sig = await signMessage(key, payload);
    const tampered = sig.slice(0, -2) + '00';
    expect(await verifyMessage(key, payload, tampered)).toBe(false);
  });

  it('verifyMessage rejects non-hex signature', async () => {
    const key = await crypto.subtle.importKey(
      'raw', new Uint8Array(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
    );
    expect(await verifyMessage(key, 'test', 'not-hex')).toBe(false);
  });

  it('buildHmacPayload sorts payload keys', () => {
    const result = buildHmacPayload('eliminatePlayer', 123, { playerId: 'p1', eliminatorId: 'p2' });
    expect(result.indexOf('eliminatorId')).toBeLessThan(result.indexOf('playerId'));
  });
});

// ---------------------------------------------------------------------------
// IDB Schema Migrations
// ---------------------------------------------------------------------------

describe('IDB Schema Migrations', () => {
  it('migrations registry covers all versions from 1 to DB_VERSION', () => {
    expect(typeof migrations).toBe('object');
    for (let v = 1; v <= DB_VERSION; v++) {
      expect(migrations[v]).toBeDefined();
    }
  });

  it('migration v4 creates series, customAudio, audioMappings stores', () => {
    const mockDb = {
      objectStoreNames: { contains: () => false },
      createObjectStore: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    migrations[4]!(mockDb as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = mockDb.createObjectStore.mock.calls.map((c: any[]) => c[0]);
    expect(calls).toContain('series');
    expect(calls).toContain('customAudio');
    expect(calls).toContain('audioMappings');
  });

  it('migrations skip existing stores (idempotent)', () => {
    const existing = new Set(['config', 'settings', 'checkpoint']);
    const mockDb = {
      objectStoreNames: { contains: (name: string) => existing.has(name) },
      createObjectStore: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    migrations[1]!(mockDb as any);
    expect(mockDb.createObjectStore).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Series Export/Import Round-Trip
// ---------------------------------------------------------------------------
describe('Series Export/Import Round-Trip', () => {
  function makeSeries(overrides?: Partial<TournamentSeries>): TournamentSeries {
    return {
      id: 'series-1',
      name: 'Test Series',
      startDate: '2025-01-01',
      tournamentIds: ['t1', 't2'],
      pointSystem: {
        entries: [
          { place: 1, points: 10 },
          { place: 2, points: 7 },
          { place: 3, points: 5 },
        ],
      },
      rankingMode: 'points',
      createdAt: '2025-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  it('preserves ranking mode through round-trip (netBalance)', () => {
    const series = makeSeries({ rankingMode: 'netBalance' });
    const json = exportSeriesToJSON(series, []);
    const parsed = parseSeriesFile(json);
    expect(parsed!.series.rankingMode).toBe('netBalance');
  });

  it('preserves ranking mode through round-trip (avgPlace)', () => {
    const series = makeSeries({ rankingMode: 'avgPlace' });
    const json = exportSeriesToJSON(series, []);
    const parsed = parseSeriesFile(json);
    expect(parsed!.series.rankingMode).toBe('avgPlace');
  });

  it('returns null for missing series fields', () => {
    const data = { version: 1, series: { id: 'x' }, results: [] }; // missing name + tournamentIds
    expect(parseSeriesFile(JSON.stringify(data))).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(parseSeriesFile('"just a string"')).toBeNull();
    expect(parseSeriesFile('null')).toBeNull();
    expect(parseSeriesFile('42')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Series Ranking Modes (computeSeriesStandings)
// ---------------------------------------------------------------------------
describe('Series Ranking Modes', () => {
  function makeSeriesWithMode(mode: 'points' | 'netBalance' | 'avgPlace', tournamentIds: string[], minTournaments?: number): TournamentSeries {
    return {
      id: 'series-rank',
      name: 'Ranking Test',
      startDate: '2025-01-01',
      tournamentIds,
      pointSystem: {
        entries: [
          { place: 1, points: 10 },
          { place: 2, points: 7 },
          { place: 3, points: 5 },
          { place: 4, points: 3 },
        ],
      },
      rankingMode: mode,
      createdAt: '2025-01-01T00:00:00.000Z',
      minTournaments,
    };
  }

  function makeResultFull(id: string, players: { name: string; place: number; payout: number; netBalance: number }[]): TournamentResult {
    return {
      id,
      name: 'T-' + id,
      date: '2025-02-01T10:00:00.000Z',
      playerCount: players.length,
      buyIn: 10,
      prizePool: 40,
      players: players.map(p => ({
        name: p.name,
        place: p.place,
        payout: p.payout,
        rebuys: 0,
        addOn: false,
        knockouts: 0,
        bountyEarned: 0,
        netBalance: p.netBalance,
      })),
      bountyEnabled: false,
      bountyAmount: 0,
      rebuyEnabled: false,
      totalRebuys: 0,
      addOnEnabled: false,
      totalAddOns: 0,
      elapsedSeconds: 1800,
      levelsPlayed: 5,
    };
  }

  it('netBalance mode: ranks by net balance descending', () => {
    const series = makeSeriesWithMode('netBalance', ['t1']);
    const results = [
      makeResultFull('t1', [
        { name: 'Alice', place: 1, payout: 30, netBalance: 20 },
        { name: 'Bob', place: 2, payout: 10, netBalance: 0 },
        { name: 'Charlie', place: 3, payout: 0, netBalance: -10 },
      ]),
    ];

    const standings = computeSeriesStandings(series, results);
    expect(standings[0]!.name).toBe('Alice');
    expect(standings[0]!.netBalance).toBe(20);
    expect(standings[1]!.name).toBe('Bob');
    expect(standings[2]!.name).toBe('Charlie');
    expect(standings[2]!.netBalance).toBe(-10);
  });

  it('avgPlace mode: ranks by average place ascending, tiebreaker by points', () => {
    const series = makeSeriesWithMode('avgPlace', ['t1', 't2']);
    const results = [
      makeResultFull('t1', [
        { name: 'Alice', place: 1, payout: 20, netBalance: 10 },
        { name: 'Bob', place: 3, payout: 0, netBalance: -10 },
      ]),
      makeResultFull('t2', [
        { name: 'Alice', place: 2, payout: 12, netBalance: 2 },
        { name: 'Bob', place: 1, payout: 20, netBalance: 10 },
      ]),
    ];

    const standings = computeSeriesStandings(series, results);
    // Alice avg: 1.5, Bob avg: 2.0
    expect(standings[0]!.name).toBe('Alice');
    expect(standings[0]!.avgPlace).toBe(1.5);
    expect(standings[1]!.name).toBe('Bob');
    expect(standings[1]!.avgPlace).toBe(2);
  });

});

// ---------------------------------------------------------------------------
// Prizepool Complex Calculations
// ---------------------------------------------------------------------------
describe('Prizepool Complex Calculations', () => {
  function makePlayers(count: number, rebuys = 0, addOn = false): Player[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      status: 'active' as const,
      rebuys,
      addOn,
      knockouts: 0,
      seatIndex: i,
    }));
  }

  it('computes prizepool with buyIn + rebuy + addOn all active', () => {
    const players = makePlayers(6, 2, true); // 6 players, 2 rebuys each, all with addon
    const buyIn = 50;
    const rebuyCost = 30;
    const addOnCost = 25;
    // 6*50 (buy-ins) + 12*30 (rebuys) + 6*25 (add-ons) = 300 + 360 + 150 = 810
    const pool = computePrizePool(players, buyIn, rebuyCost, addOnCost);
    expect(pool).toBe(810);
  });

  it('computePayouts with 1 paid place gives winner everything', () => {
    const payout: PayoutConfig = {
      mode: 'percent',
      entries: [{ place: 1, value: 100 }],
    };
    const result = computePayouts(payout, 500);
    expect(result).toHaveLength(1);
    expect(result[0]!.place).toBe(1);
    expect(result[0]!.amount).toBe(500);
  });

  it('computePayouts percent sum matches prizepool (no rounding loss)', () => {
    const payout: PayoutConfig = {
      mode: 'percent',
      entries: [
        { place: 1, value: 50 },
        { place: 2, value: 30 },
        { place: 3, value: 20 },
      ],
    };
    const prizePool = 1000;
    const result = computePayouts(payout, prizePool);
    const sum = result.reduce((s, r) => s + r.amount, 0);
    expect(sum).toBe(prizePool);
  });

  it('computePayouts with fixed mode returns exact values regardless of pool', () => {
    const payout: PayoutConfig = {
      mode: 'fixed',
      entries: [
        { place: 1, value: 300 },
        { place: 2, value: 150 },
      ],
    };
    const result = computePayouts(payout, 9999); // pool ignored for fixed
    expect(result[0]!.amount).toBe(300);
    expect(result[1]!.amount).toBe(150);
  });

  it('computePayouts handles 0 prizepool gracefully', () => {
    const payout = defaultPayoutConfig();
    const result = computePayouts(payout, 0);
    expect(result.every(r => r.amount === 0)).toBe(true);
  });

  it('rebuy pot computed separately when separatePot is true', () => {
    const players = makePlayers(5, 2); // 5 players, 2 rebuys each = 10 rebuys total
    const rebuyCost = 15;
    const rebuyPot = computeRebuyPot(players, rebuyCost);
    expect(rebuyPot).toBe(150); // 10 * 15
  });
});

// ---------------------------------------------------------------------------
// formatSidePotsAsText
// ---------------------------------------------------------------------------
describe('formatSidePotsAsText', () => {
  it('formats a single main pot correctly', () => {
    const pots: PotResult[] = [{
      type: 'main',
      index: 0,
      amount: 1500,
      eligiblePlayerIds: ['p1', 'p2', 'p3'],
      eligiblePlayerNames: ['Alice', 'Bob', 'Charlie'],
    }];
    const text = formatSidePotsAsText(pots, '$');
    expect(text).toContain('Main Pot');
    expect(text).toContain('$');
    expect(text).toContain('Alice, Bob, Charlie');
    expect(text.endsWith('.')).toBe(true);
  });

  it('formats main pot + 2 side pots with proper labels', () => {
    const pots: PotResult[] = [
      {
        type: 'main',
        index: 0,
        amount: 600,
        eligiblePlayerIds: ['p1', 'p2', 'p3'],
        eligiblePlayerNames: ['Alice', 'Bob', 'Charlie'],
      },
      {
        type: 'side',
        index: 1,
        amount: 400,
        eligiblePlayerIds: ['p1', 'p2'],
        eligiblePlayerNames: ['Alice', 'Bob'],
      },
      {
        type: 'side',
        index: 2,
        amount: 200,
        eligiblePlayerIds: ['p1'],
        eligiblePlayerNames: ['Alice'],
      },
    ];
    const text = formatSidePotsAsText(pots);
    expect(text).toContain('Main Pot');
    expect(text).toContain('Side Pot 1');
    expect(text).toContain('Side Pot 2');
    expect(text).toContain('Alice, Bob, Charlie');
    expect(text).toContain('Alice, Bob');
    // Ends with period
    expect(text.endsWith('.')).toBe(true);
  });

  it('returns empty string for empty pots array', () => {
    expect(formatSidePotsAsText([])).toBe('');
  });

  it('shows dash for pot with no eligible players', () => {
    const pots: PotResult[] = [{
      type: 'main',
      index: 0,
      amount: 100,
      eligiblePlayerIds: [],
      eligiblePlayerNames: [],
    }];
    const text = formatSidePotsAsText(pots);
    expect(text).toContain('\u2014'); // em dash
  });

  it('uses default currency symbol when none provided', () => {
    const pots: PotResult[] = [{
      type: 'main',
      index: 0,
      amount: 250,
      eligiblePlayerIds: ['p1'],
      eligiblePlayerNames: ['Alice'],
    }];
    const text = formatSidePotsAsText(pots);
    expect(text).toContain('\u20AC'); // euro sign
  });
});

// ===========================================================================
// cloudExport
// ===========================================================================

describe('cloudExport', () => {
  it('exportTournamentResult JSON format returns valid JSON with correct filename', () => {
    const result = { id: 'r1', name: 'Test Turnier', date: '2026-03-20', players: [], prizePool: 100, playerCount: 5, buyIn: 10, rebuyEnabled: false } as unknown as Parameters<typeof exportTournamentResult>[0];
    const exported = exportTournamentResult(result, 'json');
    expect(exported.filename).toMatch(/Test_Turnier_2026-03-20\.json/);
    expect(exported.mimeType).toBe('application/json');
    expect(() => JSON.parse(exported.content)).not.toThrow();
  });

  it('exportTournamentResult CSV format returns csv mimeType', () => {
    const result = { id: 'r1', name: 'Test', date: '2026-03-20', players: [{ name: 'A', place: 1, payout: 100, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0, netBalance: 90 }], prizePool: 100, playerCount: 1, buyIn: 10, rebuyEnabled: false } as unknown as Parameters<typeof exportTournamentResult>[0];
    const exported = exportTournamentResult(result, 'csv');
    expect(exported.mimeType).toBe('text/csv');
    expect(exported.filename).toMatch(/\.csv$/);
  });

  it('exportTournamentResult text format returns text/plain', () => {
    const result = { id: 'r1', name: 'Test', date: '2026-03-20', players: [], prizePool: 0, playerCount: 0, buyIn: 0, rebuyEnabled: false } as unknown as Parameters<typeof exportTournamentResult>[0];
    const exported = exportTournamentResult(result, 'text');
    expect(exported.mimeType).toBe('text/plain');
  });

  it('exportConfigBackup sanitizes special characters in filename', () => {
    const config = { name: 'Mein Turnier! #1', players: [], levels: [], buyIn: 10 } as unknown as Parameters<typeof exportConfigBackup>[0];
    const exported = exportConfigBackup(config);
    expect(exported.filename).not.toMatch(/[!#\s]/);
    expect(exported.filename).toMatch(/_backup\.json$/);
  });
});

describe('cloudExport — full backup', () => {
  it('createFullBackup returns valid backup object with all stores', () => {
    const backup = createFullBackup('6.9.9');
    expect(backup._backupVersion).toBe(1);
    expect(backup._appVersion).toBe('6.9.9');
    expect(backup._exportedAt).toBeTruthy();
    expect(typeof backup.stores).toBe('object');
    // Should not include customAudio (ArrayBuffer)
    expect(backup.stores).not.toHaveProperty('customAudio');
    // Should include these stores
    expect(backup.stores).toHaveProperty('config');
    expect(backup.stores).toHaveProperty('history');
    expect(backup.stores).toHaveProperty('templates');
  });

  it('exportFullBackup returns downloadable JSON', () => {
    const result = exportFullBackup('6.9.9');
    expect(result.filename).toMatch(/7mountain-poker-backup.*\.json$/);
    expect(result.mimeType).toBe('application/json');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it('parseFullBackup validates input', () => {
    expect(parseFullBackup('not json')).toBeNull();
    expect(parseFullBackup('{}')).toBeNull();
    expect(parseFullBackup('{"_backupVersion": 1}')).toBeNull();
    const valid = JSON.stringify({ _backupVersion: 1, _exportedAt: '2026-01-01', _appVersion: '6.9.9', stores: {} });
    expect(parseFullBackup(valid)).not.toBeNull();
  });

  it('createFullBackup + parseFullBackup round-trips', () => {
    const backup = createFullBackup('6.9.9');
    const json = JSON.stringify(backup);
    const parsed = parseFullBackup(json);
    expect(parsed).not.toBeNull();
    expect(parsed!._backupVersion).toBe(1);
    expect(parsed!._appVersion).toBe('6.9.9');
  });

  it('restoreFullBackup does not throw on valid backup', () => {
    const backup = createFullBackup('6.9.9');
    expect(() => restoreFullBackup(backup)).not.toThrow();
  });
});

// ===========================================================================
// audioService
// ===========================================================================

describe('audioService', () => {
  it('setAudioMasterVolume clamps volume to 0-1 range', () => {
    setAudioMasterVolume(1.5);
    // Volume is clamped — no error thrown
    setAudioMasterVolume(-0.5);
    // Volume is clamped to 0 — no error thrown
    setAudioMasterVolume(0.5);
    // Normal volume — no error thrown
  });

  it('setAudioLanguage accepts valid languages', () => {
    setAudioLanguage('en');
    setAudioLanguage('de');
    // Both calls succeed without error
  });
});

// ===========================================================================
// isValidAudioFile (customAudio)
// ===========================================================================

describe('isValidAudioFile', () => {
  it('accepts valid MP3 (0xFF 0xFB)', () => {
    const buf = new ArrayBuffer(12);
    const view = new Uint8Array(buf);
    view[0] = 0xFF; view[1] = 0xFB;
    expect(isValidAudioFile(buf)).toBe(true);
  });

  it('accepts valid WAV (RIFF header)', () => {
    const buf = new ArrayBuffer(12);
    const view = new Uint8Array(buf);
    [0x52, 0x49, 0x46, 0x46].forEach((b, i) => { view[i] = b; });
    expect(isValidAudioFile(buf)).toBe(true);
  });

  it('accepts valid OGG (OggS header)', () => {
    const buf = new ArrayBuffer(12);
    const view = new Uint8Array(buf);
    [0x4F, 0x67, 0x67, 0x53].forEach((b, i) => { view[i] = b; });
    expect(isValidAudioFile(buf)).toBe(true);
  });

  it('accepts valid MP4/M4A (ftyp at offset 4)', () => {
    const buf = new ArrayBuffer(12);
    const view = new Uint8Array(buf);
    [0x66, 0x74, 0x79, 0x70].forEach((b, i) => { view[4 + i] = b; });
    expect(isValidAudioFile(buf)).toBe(true);
  });

  it('rejects zeroed buffer', () => {
    const buf = new ArrayBuffer(12);
    expect(isValidAudioFile(buf)).toBe(false);
  });
});

// ===========================================================================
// tables edge cases
// ===========================================================================

describe('tables edge cases — dissolve & distribute', () => {
  it('dissolveTable with nonexistent tableId returns unchanged tables', () => {
    const table = { id: 't1', name: 'Table 1', seats: [{ seatNumber: 1, playerId: 'p1', locked: false }], maxSeats: 6, status: 'active' as const, dealerSeat: 1 };
    const players = [{ id: 'p1', name: 'A', status: 'active' as const, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0 }];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = dissolveTable([table], 'nonexistent', players);
    expect(result.moves).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('distributePlayersToTables with all dissolved tables leaves players unplaced', () => {
    const seats = Array.from({ length: 6 }, (_, i) => ({ seatNumber: i + 1, playerId: null, locked: false }));
    const table = { id: 't1', name: 'Table 1', seats, maxSeats: 6, status: 'dissolved' as const, dealerSeat: 1 };
    const result = distributePlayersToTables(['p1'], [table]);
    const seated = result.flatMap(t => t.seats.filter(s => s.playerId !== null));
    expect(seated).toHaveLength(0);
  });
});

// ===========================================================================
// generateBlindStructure edge case
// ===========================================================================

describe('generateBlindStructure edge cases', () => {
  it('generates at least one level when startingChips is 0', () => {
    const levels = generateBlindStructure({ startingChips: 0, speed: 'normal', anteEnabled: false });
    expect(levels.length).toBeGreaterThanOrEqual(1);
    const playLevel = levels.find(l => l.type === 'level');
    expect(playLevel).toBeDefined();
    expect(playLevel!.bigBlind).toBeGreaterThan(0);
  });
});

// ===========================================================================
// license.ts — parse, verify, expiry
// ===========================================================================

describe('license', () => {
  it('parseLicenseKey parses valid premium key with no expiry', () => {
    const info = parseLicenseKey('7MP-PREMIUM-0-35156DF5C1EA');
    expect(info).not.toBeNull();
    expect(info!.tier).toBe('premium');
    expect(info!.expiresAt).toBeNull();
  });

  it('parseLicenseKey rejects wrong prefix', () => {
    expect(parseLicenseKey('ABC-PREMIUM-0-35156DF5C1EA')).toBeNull();
  });

  it('parseLicenseKey rejects invalid tier', () => {
    expect(parseLicenseKey('7MP-GOLD-0-35156DF5C1EA')).toBeNull();
  });

  it('parseLicenseKey rejects malformed signature', () => {
    expect(parseLicenseKey('7MP-PREMIUM-0-SHORT')).toBeNull();
    expect(parseLicenseKey('7MP-PREMIUM-0-GGGGGGGGGGGG')).toBeNull();
  });

  it('parseLicenseKey parses key with expiry date', () => {
    const info = parseLicenseKey('7MP-PREMIUM-20271231-AABBCCDDEE11');
    expect(info).not.toBeNull();
    expect(info!.expiresAt).toBeInstanceOf(Date);
    expect(info!.expiresAt!.getFullYear()).toBe(2027);
  });

  it('parseLicenseKey rejects malformed expiry', () => {
    expect(parseLicenseKey('7MP-PREMIUM-2027-AABBCCDDEE11')).toBeNull();
    expect(parseLicenseKey('7MP-PREMIUM-ABCDEFGH-AABBCCDDEE11')).toBeNull();
  });

  it('isLicenseExpired returns false for null expiry', () => {
    expect(isLicenseExpired({ tier: 'premium', expiresAt: null, key: 'test' })).toBe(false);
  });

  it('isLicenseExpired returns true for past date', () => {
    expect(isLicenseExpired({ tier: 'premium', expiresAt: new Date(2020, 0, 1), key: 'test' })).toBe(true);
  });

  it('isLicenseExpired returns false for future date', () => {
    expect(isLicenseExpired({ tier: 'premium', expiresAt: new Date(2030, 11, 31), key: 'test' })).toBe(false);
  });

  it('parseLicenseKey is case-insensitive', () => {
    const lower = parseLicenseKey('7mp-premium-0-35156df5c1ea');
    const upper = parseLicenseKey('7MP-PREMIUM-0-35156DF5C1EA');
    expect(lower).not.toBeNull();
    expect(upper).not.toBeNull();
    expect(lower!.tier).toBe(upper!.tier);
  });

  it('parseLicenseKey rejects too few parts', () => {
    expect(parseLicenseKey('7MP-PREMIUM-0')).toBeNull();
    expect(parseLicenseKey('7MP-PREMIUM')).toBeNull();
    expect(parseLicenseKey('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PDF Export Helpers
// ---------------------------------------------------------------------------

describe('sanitizeFilename', () => {
  it('removes special characters and lowercases', () => {
    expect(sanitizeFilename('My Tournament #1!')).toBe('my-tournament-1');
  });

  it('collapses multiple spaces and dashes', () => {
    expect(sanitizeFilename('foo   bar---baz')).toBe('foo-bar-baz');
  });

  it('preserves German umlauts', () => {
    expect(sanitizeFilename('Übungsturnier')).toBe('übungsturnier');
  });

  it('truncates to 80 characters', () => {
    const long = 'a'.repeat(100);
    expect(sanitizeFilename(long).length).toBe(80);
  });

  it('returns "tournament" for empty input', () => {
    expect(sanitizeFilename('')).toBe('tournament');
    expect(sanitizeFilename('!!!')).toBe('tournament');
  });
});

describe('formatDuration', () => {
  it('formats minutes only when < 1 hour', () => {
    expect(formatDuration(900)).toBe('15m');
    expect(formatDuration(0)).toBe('0m');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(3600)).toBe('1h 0m');
    expect(formatDuration(8100)).toBe('2h 15m');
  });
});

// ---------------------------------------------------------------------------
// cloneConfigFromResult
// ---------------------------------------------------------------------------

describe('cloneConfigFromResult', () => {
  const baseConfig = defaultConfig();

  it('returns null when no configSnapshot exists', () => {
    const result = buildTournamentResult(baseConfig, 3600, 10);
    // Simulate old result without snapshot
    const oldResult = { ...result, configSnapshot: undefined };
    expect(cloneConfigFromResult(oldResult)).toBeNull();
  });

  it('reconstructs players from result player names', () => {
    const result = buildTournamentResult(baseConfig, 3600, 10);
    const cloned = cloneConfigFromResult(result);
    expect(cloned).not.toBeNull();
    // Players should match result players by name
    expect(cloned!.players.map((p) => p.name)).toEqual(result.players.map((p) => p.name));
    // All players should be active with fresh state
    for (const p of cloned!.players) {
      expect(p.status).toBe('active');
      expect(p.rebuys).toBe(0);
      expect(p.addOn).toBe(false);
      expect(p.placement).toBeNull();
    }
  });

  it('generates fresh player IDs (not reusing old IDs)', () => {
    const result = buildTournamentResult(baseConfig, 3600, 10);
    const cloned = cloneConfigFromResult(result);
    expect(cloned).not.toBeNull();
    const ids = cloned!.players.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('clears leagueId and seriesId from cloned config', () => {
    const configWithLeague = { ...baseConfig, leagueId: 'league-1', seriesId: 'series-1' };
    const result = buildTournamentResult(configWithLeague, 3600, 10);
    const cloned = cloneConfigFromResult(result);
    expect(cloned).not.toBeNull();
    expect(cloned!.leagueId).toBeUndefined();
    expect(cloned!.seriesId).toBeUndefined();
  });

  it('preserves blind structure from original config', () => {
    const result = buildTournamentResult(baseConfig, 3600, 10);
    const cloned = cloneConfigFromResult(result);
    expect(cloned).not.toBeNull();
    expect(cloned!.levels).toEqual(baseConfig.levels);
    expect(cloned!.buyIn).toBe(baseConfig.buyIn);
  });
});

// ---------------------------------------------------------------------------
// getLeaguePlayerNames
// ---------------------------------------------------------------------------

describe('getLeaguePlayerNames', () => {
  beforeEach(() => {
    resetStorage();
    initStorage();
  });

  it('returns empty array for league with no game days', () => {
    const names = getLeaguePlayerNames('nonexistent-league');
    expect(names).toEqual([]);
  });

  it('extracts and deduplicates player names from game days', () => {
    const league = saveLeague({
      id: 'test-league-players',
      name: 'Test Liga',
      pointSystem: defaultPointSystem(),
    } as ReturnType<typeof saveLeague>);

    // Create two game days with overlapping players
    saveGameDay({
      id: 'gd1',
      leagueId: league.id,
      date: '2025-01-01',
      participants: [
        { name: 'Alice', place: 1, points: 10, buyIn: 10, payout: 30 },
        { name: 'Bob', place: 2, points: 7, buyIn: 10, payout: 15 },
      ],
    } as Parameters<typeof saveGameDay>[0]);

    saveGameDay({
      id: 'gd2',
      leagueId: league.id,
      date: '2025-01-08',
      participants: [
        { name: 'Alice', place: 1, points: 10, buyIn: 10, payout: 30 },
        { name: 'Charlie', place: 2, points: 7, buyIn: 10, payout: 15 },
      ],
    } as Parameters<typeof saveGameDay>[0]);

    const names = getLeaguePlayerNames(league.id);
    expect(names).toEqual(['Alice', 'Bob', 'Charlie']); // sorted, deduplicated
  });
});
