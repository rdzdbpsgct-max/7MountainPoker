/**
 * Integration Tests — Cross-Module Flows
 *
 * Tests the critical boundaries between domain modules that unit tests cannot catch:
 * - Checkpoint save → restore round-trip (configPersistence ↔ storage ↔ timer state)
 * - Config parsing backward compatibility (parseConfigObject normalization chain)
 * - Timer state machine transitions (useTimer hook lifecycle)
 * - Language switching effects on player names (i18n ↔ config)
 * - Mode transition side effects (setup → game → finished → setup)
 * - Storage initialization and cache consistency
 */

import { renderHook, act } from '@testing-library/react';
import { initStorage, getCached, setCachedItem, resetStorage } from '../src/domain/storage';
import {
  defaultConfig,
  defaultSettings,
  saveCheckpoint,
  loadCheckpoint,
  clearCheckpoint,
  parseConfigObject,
  saveConfig,
  loadConfig,
  saveSettings,
  loadSettings,
  restartTournament,
  advanceLevel,
  computeRemaining,
  resetCurrentLevel,
  previousLevel,
  generateBlindStructure,
  buildTournamentResult,
  saveTournamentResult,
  loadTournamentHistory,
  isBubble,
  isInTheMoney,
  computeAverageStack,
  isRebuyActive,
  computeTournamentElapsedSeconds,
  validateConfig,
  validatePayoutConfig,
  saveLeague,
  defaultPointSystem,
  saveGameDay,
  deleteGameDay,
  loadGameDaysForLeague,
  computeExtendedStandings,
  exportLeagueToJSON,
  parseLeagueFile,
  setAudioMapping,
  loadAudioMappings,
  removeAudioMapping,
  getCustomAudioForAnnouncement,
  saveCustomAudioFile,
} from '../src/domain/logic';
import { useTimer } from '../src/hooks/useTimer';
import type { TournamentConfig, TournamentCheckpoint, Player, TimerState, Level, League, GameDay, GameDayParticipant, Table, TournamentEvent } from '../src/domain/types';

// ---------------------------------------------------------------------------
// Module-level mocks (must be at top level for Vitest hoisting)
// ---------------------------------------------------------------------------

vi.mock('../src/domain/sounds', () => ({
  initAudio: vi.fn(),
  playBeep: vi.fn(),
  setMasterVolume: vi.fn(),
}));
vi.mock('../src/domain/audioPlayer', () => ({
  initAudioContext: vi.fn(),
  playAudioSequence: vi.fn(() => Promise.resolve()),
  cancelAudioPlayback: vi.fn(),
  setAudioLanguage: vi.fn(),
  setAudioVolume: vi.fn(),
}));
vi.mock('../src/domain/speech', () => ({
  initSpeech: vi.fn(),
  announceCountdown: vi.fn(() => false),
  setSpeechLanguage: vi.fn(),
  setSpeechVolume: vi.fn(),
  cancelSpeech: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(id: string, name: string, status: 'active' | 'eliminated' = 'active'): Player {
  return { id, name, status, rebuys: 0, addOn: false, placement: null, eliminatedBy: null, knockouts: 0 };
}

function makeLevels(count = 5, durationSeconds = 600): Level[] {
  const levels: Level[] = [];
  for (let i = 0; i < count; i++) {
    if (i === 2) {
      levels.push({ id: `break-${i}`, type: 'break', durationSeconds: 300, smallBlind: 0, bigBlind: 0 });
    } else {
      const sb = 25 * (i + 1);
      levels.push({ id: `lvl-${i}`, type: 'level', durationSeconds, smallBlind: sb, bigBlind: sb * 2 });
    }
  }
  return levels;
}

// ---------------------------------------------------------------------------
// 1. Checkpoint Round-Trip: save → reload → restore
// ---------------------------------------------------------------------------

describe('Checkpoint save/restore round-trip', () => {
  beforeEach(async () => {
    await initStorage();
  });

  it('checkpoint preserves config, settings, and timer state', () => {
    const config = defaultConfig();
    config.name = 'Integration Test Turnier';
    config.buyIn = 25;
    config.players = [makePlayer('p1', 'Alice'), makePlayer('p2', 'Bob'), makePlayer('p3', 'Charlie')];

    const settings = defaultSettings();
    settings.volume = 75;
    settings.voiceEnabled = false;

    const checkpoint: TournamentCheckpoint = {
      version: 1,
      config,
      settings,
      timer: { currentLevelIndex: 3, remainingSeconds: 245.5 },
      savedAt: new Date().toISOString(),
    };

    saveCheckpoint(checkpoint);
    const loaded = loadCheckpoint();

    expect(loaded).not.toBeNull();
    expect(loaded!.config.name).toBe('Integration Test Turnier');
    expect(loaded!.config.buyIn).toBe(25);
    expect(loaded!.config.players).toHaveLength(3);
    expect(loaded!.config.players[0].name).toBe('Alice');
    expect(loaded!.settings.volume).toBe(75);
    expect(loaded!.settings.voiceEnabled).toBe(false);
    expect(loaded!.timer.currentLevelIndex).toBe(3);
    expect(loaded!.timer.remainingSeconds).toBe(245.5);
  });

  it('checkpoint with eliminated players preserves placement and knockouts', () => {
    const config = defaultConfig();
    const players: Player[] = [
      { ...makePlayer('p1', 'Winner'), knockouts: 2 },
      { ...makePlayer('p2', 'Second'), status: 'eliminated', placement: 2, eliminatedBy: 'p1', knockouts: 0 },
      { ...makePlayer('p3', 'Third'), status: 'eliminated', placement: 3, eliminatedBy: 'p1', knockouts: 0 },
    ];
    config.players = players;

    saveCheckpoint({
      version: 1,
      config,
      settings: defaultSettings(),
      timer: { currentLevelIndex: 5, remainingSeconds: 100 },
      savedAt: new Date().toISOString(),
    });

    const loaded = loadCheckpoint();
    expect(loaded!.config.players[1].status).toBe('eliminated');
    expect(loaded!.config.players[1].placement).toBe(2);
    expect(loaded!.config.players[1].eliminatedBy).toBe('p1');
    expect(loaded!.config.players[0].knockouts).toBe(2);
  });

  it('clearCheckpoint removes saved data', () => {
    saveCheckpoint({
      version: 1,
      config: defaultConfig(),
      settings: defaultSettings(),
      timer: { currentLevelIndex: 0, remainingSeconds: 600 },
      savedAt: new Date().toISOString(),
    });
    expect(loadCheckpoint()).not.toBeNull();

    clearCheckpoint();
    expect(loadCheckpoint()).toBeNull();
  });

  it('checkpoint with rebuy/add-on/bounty state survives round-trip', () => {
    const config = defaultConfig();
    config.rebuy = { ...config.rebuy, enabled: true, levelLimit: 4, rebuyCost: 10, rebuyChips: 20000 };
    config.addOn = { ...config.addOn, enabled: true, cost: 10, chips: 30000 };
    config.bounty = { ...config.bounty, enabled: true, amount: 5, type: 'fixed' };
    config.players = [
      { ...makePlayer('p1', 'Alice'), rebuys: 2, addOn: true },
      { ...makePlayer('p2', 'Bob'), rebuys: 1, addOn: false },
    ];

    saveCheckpoint({
      version: 1, config, settings: defaultSettings(),
      timer: { currentLevelIndex: 4, remainingSeconds: 300 },
      savedAt: new Date().toISOString(),
    });

    const loaded = loadCheckpoint();
    expect(loaded!.config.rebuy.enabled).toBe(true);
    expect(loaded!.config.addOn.enabled).toBe(true);
    expect(loaded!.config.bounty.enabled).toBe(true);
    expect(loaded!.config.players[0].rebuys).toBe(2);
    expect(loaded!.config.players[0].addOn).toBe(true);
    expect(loaded!.config.players[1].rebuys).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2. parseConfigObject backward compatibility
// ---------------------------------------------------------------------------

describe('parseConfigObject backward compatibility', () => {
  it('fills missing rebuy/addOn/bounty with defaults', () => {
    const minimal = {
      levels: [{ id: 'l1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }],
      players: [],
    };
    const result = parseConfigObject(minimal);
    expect(result).not.toBeNull();
    expect(result!.rebuy.enabled).toBe(false);
    expect(result!.addOn.enabled).toBe(false);
    expect(result!.bounty.enabled).toBe(false);
    expect(result!.chips.enabled).toBe(false);
  });

  it('handles old config without anteMode (defaults to standard)', () => {
    const old = {
      levels: [{ id: 'l1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }],
      anteEnabled: true,
      // anteMode intentionally missing (pre-v2.7 config)
    };
    const result = parseConfigObject(old);
    expect(result!.anteMode).toBe('standard');
  });

  it('normalizes bigBlindAnte mode correctly', () => {
    const bba = {
      levels: [{ id: 'l1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }],
      anteEnabled: true,
      anteMode: 'bigBlindAnte',
    };
    const result = parseConfigObject(bba);
    expect(result!.anteMode).toBe('bigBlindAnte');
  });

  it('filters out malformed levels', () => {
    const withBadLevels = {
      levels: [
        { id: 'good', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 },
        { id: 'bad1', type: 'level', durationSeconds: 0, smallBlind: 10, bigBlind: 20 }, // duration 0
        { id: 'bad2', type: 'invalid' }, // wrong type
        null, // null entry
        { id: 'good2', type: 'break', durationSeconds: 300, smallBlind: 0, bigBlind: 0 },
      ],
    };
    const result = parseConfigObject(withBadLevels);
    expect(result!.levels).toHaveLength(2);
    expect(result!.levels[0].id).toBe('good');
    expect(result!.levels[1].id).toBe('good2');
  });

  it('handles mystery bounty type preservation', () => {
    const mystery = {
      levels: [{ id: 'l1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }],
      bounty: { enabled: true, amount: 10, type: 'mystery', mysteryPool: [5, 10, 25, 50, 100] },
    };
    const result = parseConfigObject(mystery);
    expect(result!.bounty.type).toBe('mystery');
    expect(result!.bounty.mysteryPool).toEqual([5, 10, 25, 50, 100]);
  });

  it('normalizes player fields from raw data', () => {
    const raw = {
      levels: [{ id: 'l1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 }],
      players: [
        { id: 'p1', name: 'Alice' }, // missing rebuys, addOn, status
        { id: 'p2', name: 'Bob', status: 'eliminated', placement: 2, rebuys: 'not-a-number' },
      ],
    };
    const result = parseConfigObject(raw);
    expect(result!.players[0].rebuys).toBe(0);
    expect(result!.players[0].addOn).toBe(false);
    expect(result!.players[0].status).toBe('active');
    expect(result!.players[1].status).toBe('eliminated');
    expect(result!.players[1].rebuys).toBe(0); // normalized from 'not-a-number'
  });
});

// ---------------------------------------------------------------------------
// 3. Timer State Machine (useTimer hook lifecycle)
// ---------------------------------------------------------------------------

describe('useTimer hook lifecycle', () => {
  const levels = makeLevels(5, 600);
  const settings = defaultSettings();

  it('initializes at level 0 with stopped status', () => {
    const { result } = renderHook(() => useTimer(levels, settings));
    expect(result.current.timerState.currentLevelIndex).toBe(0);
    expect(result.current.timerState.status).toBe('stopped');
    expect(result.current.timerState.remainingSeconds).toBe(600);
  });

  it('start → pause → resume preserves remaining time', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTimer(levels, settings));

    // Start
    act(() => result.current.start());
    expect(result.current.timerState.status).toBe('running');

    // Advance 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
      vi.advanceTimersByTime(0); // flush setTimerState
    });

    // Pause
    act(() => result.current.pause());
    expect(result.current.timerState.status).toBe('paused');
    const remainAfterPause = result.current.timerState.remainingSeconds;
    expect(remainAfterPause).toBeLessThan(600);
    expect(remainAfterPause).toBeGreaterThan(595); // ~598s

    // Resume
    act(() => result.current.start());
    expect(result.current.timerState.status).toBe('running');
    expect(result.current.timerState.remainingAtStart).toBeCloseTo(remainAfterPause, 0);

    vi.useRealTimers();
  });

  it('nextLevel auto-starts and advances index', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTimer(levels, settings));

    act(() => result.current.nextLevel());
    expect(result.current.timerState.currentLevelIndex).toBe(1);
    expect(result.current.timerState.status).toBe('running');
    expect(result.current.timerState.remainingSeconds).toBe(600);

    vi.useRealTimers();
  });

  it('previousLevel goes back and auto-starts', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTimer(levels, settings));

    // Go to level 2, then back
    act(() => result.current.nextLevel());
    act(() => result.current.nextLevel());
    expect(result.current.timerState.currentLevelIndex).toBe(2);

    act(() => result.current.previousLevel());
    expect(result.current.timerState.currentLevelIndex).toBe(1);
    expect(result.current.timerState.status).toBe('running');

    vi.useRealTimers();
  });

  it('resetLevel stops timer and restores full duration', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTimer(levels, settings));

    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(5000);
      vi.advanceTimersByTime(0);
    });

    act(() => result.current.resetLevel());
    expect(result.current.timerState.status).toBe('stopped');
    expect(result.current.timerState.remainingSeconds).toBe(600);
    expect(result.current.timerState.currentLevelIndex).toBe(0);

    vi.useRealTimers();
  });

  it('restart resets to level 0 with stopped status', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTimer(levels, settings));

    act(() => result.current.nextLevel());
    act(() => result.current.nextLevel());
    act(() => result.current.restart());

    expect(result.current.timerState.currentLevelIndex).toBe(0);
    expect(result.current.timerState.status).toBe('stopped');
    expect(result.current.timerState.remainingSeconds).toBe(600);

    vi.useRealTimers();
  });

  it('restoreLevel sets arbitrary level and remaining (always paused)', () => {
    const { result } = renderHook(() => useTimer(levels, settings));

    act(() => result.current.restoreLevel(3, 245.5));
    expect(result.current.timerState.currentLevelIndex).toBe(3);
    expect(result.current.timerState.remainingSeconds).toBe(245.5);
    expect(result.current.timerState.status).toBe('paused');
    expect(result.current.timerState.startedAt).toBeNull();
  });

  it('restoreLevel clamps out-of-range index', () => {
    const { result } = renderHook(() => useTimer(levels, settings));

    act(() => result.current.restoreLevel(99, 100));
    expect(result.current.timerState.currentLevelIndex).toBe(4); // clamped to last
  });

  it('toggleStartPause toggles between running and paused', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTimer(levels, settings));

    act(() => result.current.toggleStartPause());
    expect(result.current.timerState.status).toBe('running');

    act(() => result.current.toggleStartPause());
    expect(result.current.timerState.status).toBe('paused');

    act(() => result.current.toggleStartPause());
    expect(result.current.timerState.status).toBe('running');

    vi.useRealTimers();
  });

  it('setRemainingSeconds pauses and sets exact time', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTimer(levels, settings));

    act(() => result.current.start());
    act(() => result.current.setRemainingSeconds(120));

    expect(result.current.timerState.status).toBe('paused');
    expect(result.current.timerState.remainingSeconds).toBe(120);

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// 4. Checkpoint → Timer Restore integration
// ---------------------------------------------------------------------------

describe('Checkpoint → Timer restore', () => {
  beforeEach(async () => {
    await initStorage();
  });

  it('timer.restoreLevel matches checkpoint timer data', () => {
    const levels = makeLevels(8, 900);
    const settings = defaultSettings();
    const { result } = renderHook(() => useTimer(levels, settings));

    // Simulate: save checkpoint at level 5 with 432s remaining
    const checkpoint: TournamentCheckpoint = {
      version: 1,
      config: { ...defaultConfig(), levels },
      settings,
      timer: { currentLevelIndex: 5, remainingSeconds: 432 },
      savedAt: new Date().toISOString(),
    };
    saveCheckpoint(checkpoint);

    // Load and restore
    const loaded = loadCheckpoint()!;
    act(() => {
      result.current.restoreLevel(
        loaded.timer.currentLevelIndex,
        loaded.timer.remainingSeconds,
      );
    });

    expect(result.current.timerState.currentLevelIndex).toBe(5);
    expect(result.current.timerState.remainingSeconds).toBe(432);
    expect(result.current.timerState.status).toBe('paused'); // Always paused on restore
  });
});

// ---------------------------------------------------------------------------
// 5. Full tournament flow: config → validate → play → result
// ---------------------------------------------------------------------------

describe('Full tournament flow integration', () => {
  it('config validation → blind generation → result building', () => {
    const levels = generateBlindStructure({
      startingChips: 20000,
      speed: 'normal',
      anteEnabled: false,
    });

    const config: TournamentConfig = {
      ...defaultConfig(),
      name: 'Friday Night Poker',
      levels,
      buyIn: 10,
      startingChips: 20000,
      players: [
        makePlayer('p1', 'Alice'),
        makePlayer('p2', 'Bob'),
        makePlayer('p3', 'Charlie'),
        makePlayer('p4', 'Diana'),
      ],
      payout: { mode: 'percentage', entries: [{ place: 1, percent: 60 }, { place: 2, percent: 30 }, { place: 3, percent: 10 }] },
    };

    // Validate
    const errors = validateConfig(config);
    expect(errors).toHaveLength(0);
    expect(validatePayoutConfig(config.payout)).toEqual([]);

    // Simulate eliminations
    config.players[3] = { ...config.players[3], status: 'eliminated', placement: 4, eliminatedBy: 'p1' };
    config.players[2] = { ...config.players[2], status: 'eliminated', placement: 3, eliminatedBy: 'p2' };
    config.players[1] = { ...config.players[1], status: 'eliminated', placement: 2, eliminatedBy: 'p1' };
    config.players[0] = { ...config.players[0], placement: 1, knockouts: 2 };

    // Build result (elapsedSeconds, levelsPlayed)
    const result = buildTournamentResult(config, 5400, 3);
    expect(result.name).toBe('Friday Night Poker');
    expect(result.players).toHaveLength(4);
    expect(result.players[0].place).toBe(1);
    expect(result.players[0].name).toBe('Alice');
    expect(result.prizePool).toBe(40); // 4 players * 10 buy-in
    expect(result.playerCount).toBe(4);
  });

  it('bubble and ITM detection across elimination sequence', () => {
    const paidPlaces = 3;

    // 6 players, 3 paid places
    expect(isBubble(6, paidPlaces)).toBe(false);
    expect(isBubble(5, paidPlaces)).toBe(false);
    expect(isBubble(4, paidPlaces)).toBe(true); // BUBBLE
    expect(isInTheMoney(4, paidPlaces)).toBe(false);

    expect(isBubble(3, paidPlaces)).toBe(false);
    expect(isInTheMoney(3, paidPlaces)).toBe(true); // ITM

    expect(isBubble(2, paidPlaces)).toBe(false);
    expect(isInTheMoney(2, paidPlaces)).toBe(true);
  });

  it('average stack calculation with rebuys and add-ons', () => {
    const players: Player[] = [
      { ...makePlayer('p1', 'A'), rebuys: 2, addOn: true },
      { ...makePlayer('p2', 'B'), rebuys: 0, addOn: true },
      { ...makePlayer('p3', 'C'), rebuys: 1, addOn: false },
      { ...makePlayer('p4', 'D'), status: 'eliminated', placement: 4, eliminatedBy: 'p1', rebuys: 0, addOn: false, knockouts: 0 },
    ];

    const avg = computeAverageStack(players, 20000, 20000, 30000);
    // 3 active, total chips: 4*20000(starting) + 3*20000(rebuys) + 2*30000(addOns) = 200k
    // avg = 200000 / 3
    expect(avg).toBeCloseTo(200000 / 3, 0);
  });

  it('rebuy active detection across level progression', () => {
    const levels = makeLevels(8, 600);
    const rebuyConfig = {
      enabled: true,
      limitType: 'levels' as const,
      levelLimit: 3,
      timeLimit: 3600,
      rebuyCost: 10,
      rebuyChips: 20000,
    };

    // Play levels: idx 0 (lvl), 1 (lvl), 2 (break), 3 (lvl), 4 (lvl)
    // 3rd play level is at index 3
    expect(isRebuyActive(rebuyConfig, 0, levels, 0)).toBe(true);  // level 1 (play 1)
    expect(isRebuyActive(rebuyConfig, 1, levels, 0)).toBe(true);  // level 2 (play 2)
    expect(isRebuyActive(rebuyConfig, 2, levels, 0)).toBe(true);  // break (still active)
    expect(isRebuyActive(rebuyConfig, 3, levels, 0)).toBe(true);  // level 3 (play 3 = limit)
    expect(isRebuyActive(rebuyConfig, 4, levels, 0)).toBe(false); // level 4 (play 4 > limit)
  });
});

// ---------------------------------------------------------------------------
// 6. Tournament elapsed time integration
// ---------------------------------------------------------------------------

describe('Tournament elapsed time calculation', () => {
  it('computes correct elapsed with breaks and partial levels', () => {
    const levels = makeLevels(5, 600); // levels 0,1 are play (600s), 2 is break (300s), 3,4 are play (600s)

    // At level 0 with 400s remaining = 200s elapsed
    expect(computeTournamentElapsedSeconds(levels, 0, 400)).toBe(200);

    // At level 3 (past the break) with 500s remaining
    // elapsed: level 0 (600) + level 1 (600) + break (300) + (600 - 500) = 1600
    expect(computeTournamentElapsedSeconds(levels, 3, 500)).toBe(1600);
  });
});

// ---------------------------------------------------------------------------
// 7. Config → save → reload consistency
// ---------------------------------------------------------------------------

describe('Config persistence round-trip', () => {
  beforeEach(async () => {
    await initStorage();
  });

  it('saved config matches loaded config structure', () => {
    const config = defaultConfig();
    config.name = 'Test Tournament';
    config.buyIn = 50;
    config.players = [makePlayer('p1', 'Test'), makePlayer('p2', 'Test2')];

    saveConfig(config);

    // Config is cached — read from cache
    const cached = getCached('config');
    expect(cached).not.toBeNull();
    if (cached) {
      expect(cached.name).toBe('Test Tournament');
      expect(cached.buyIn).toBe(50);
    }
  });

  it('config and settings survive storage re-init (reload scenario)', async () => {
    const config = defaultConfig();
    config.name = 'Reload Recovery';
    config.buyIn = 37;

    const settings = defaultSettings();
    settings.volume = 64;
    settings.autoAdvance = false;

    saveConfig(config);
    saveSettings(settings);

    // setCached persists async to IndexedDB in background
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simulate app reload: storage cache resets and re-inits from IndexedDB
    await resetStorage();
    await initStorage();

    const loadedConfig = loadConfig();
    const loadedSettings = loadSettings();
    expect(loadedConfig).not.toBeNull();
    expect(loadedSettings).not.toBeNull();
    expect(loadedConfig!.name).toBe('Reload Recovery');
    expect(loadedConfig!.buyIn).toBe(37);
    expect(loadedSettings!.volume).toBe(64);
    expect(loadedSettings!.autoAdvance).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8. History save and retrieve
// ---------------------------------------------------------------------------

describe('Tournament history integration', () => {
  beforeEach(async () => {
    await initStorage();
  });

  it('tournament result saved to history is retrievable', () => {
    const config: TournamentConfig = {
      ...defaultConfig(),
      name: 'History Test',
      buyIn: 10,
      players: [
        { ...makePlayer('p1', 'Winner'), placement: 1, knockouts: 1 },
        { ...makePlayer('p2', 'Loser'), status: 'eliminated', placement: 2, eliminatedBy: 'p1', knockouts: 0 },
      ],
    };

    const result = buildTournamentResult(config, 1800, 1);
    saveTournamentResult(result);

    const history = loadTournamentHistory();
    expect(history.length).toBeGreaterThanOrEqual(1);
    const latest = history[0];
    expect(latest.name).toBe('History Test');
    expect(latest.players).toHaveLength(2);
    expect(latest.players[0].name).toBe('Winner');
  });
});

// ---------------------------------------------------------------------------
// 9. Language switching: default player name transformation
// ---------------------------------------------------------------------------

describe('Language-driven player name transformation', () => {
  it('regex matches standard player name patterns', () => {
    const pattern = /^(Spieler|Player) (\d+)$/;

    expect(pattern.test('Spieler 1')).toBe(true);
    expect(pattern.test('Spieler 12')).toBe(true);
    expect(pattern.test('Player 1')).toBe(true);
    expect(pattern.test('Player 99')).toBe(true);

    // Should NOT match custom names
    expect(pattern.test('Alice')).toBe(false);
    expect(pattern.test('Spieler')).toBe(false);
    expect(pattern.test('Player')).toBe(false);
    expect(pattern.test('Spieler 1 Extra')).toBe(false);
    expect(pattern.test('spieler 1')).toBe(false); // case sensitive
  });

  it('custom names are preserved during language switch simulation', () => {
    const players: Player[] = [
      makePlayer('p1', 'Spieler 1'),
      makePlayer('p2', 'Alice'),       // custom
      makePlayer('p3', 'Player 3'),
      makePlayer('p4', 'Bob'),          // custom
    ];

    const pattern = /^(Spieler|Player) (\d+)$/;

    // Simulate switch to English
    const switched = players.map(p => {
      const match = pattern.exec(p.name);
      if (match) {
        return { ...p, name: `Player ${match[2]}` };
      }
      return p;
    });

    expect(switched[0].name).toBe('Player 1');   // renamed
    expect(switched[1].name).toBe('Alice');       // preserved
    expect(switched[2].name).toBe('Player 3');    // unchanged (already English)
    expect(switched[3].name).toBe('Bob');         // preserved

    // Simulate switch back to German
    const switchedBack = switched.map(p => {
      const match = pattern.exec(p.name);
      if (match) {
        return { ...p, name: `Spieler ${match[2]}` };
      }
      return p;
    });

    expect(switchedBack[0].name).toBe('Spieler 1'); // renamed
    expect(switchedBack[1].name).toBe('Alice');      // preserved
    expect(switchedBack[2].name).toBe('Spieler 3');  // renamed
    expect(switchedBack[3].name).toBe('Bob');         // preserved
  });
});

// ---------------------------------------------------------------------------
// 10. Blind structure generator → timer integration
// ---------------------------------------------------------------------------

describe('Generated blinds in timer', () => {
  it('generated levels have valid durations that timer can consume', () => {
    const levels = generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: true });

    expect(levels.length).toBeGreaterThan(5);

    // Every level must have positive duration
    for (const level of levels) {
      expect(level.durationSeconds).toBeGreaterThan(0);
      expect(['level', 'break']).toContain(level.type);
    }

    // Timer can initialize with these levels
    const initial = restartTournament(levels);
    expect(initial.currentLevelIndex).toBe(0);
    expect(initial.remainingSeconds).toBe(levels[0].durationSeconds);
    expect(initial.status).toBe('stopped');

    // Can advance through all levels
    let state = initial;
    for (let i = 0; i < levels.length - 1; i++) {
      state = advanceLevel(state, levels);
      expect(state.currentLevelIndex).toBe(i + 1);
    }

    // At last level, advance should not go beyond
    const final = advanceLevel(state, levels);
    expect(final.currentLevelIndex).toBe(levels.length - 1);
  });
});

// ---------------------------------------------------------------------------
// 11. Timer domain functions: computeRemaining precision
// ---------------------------------------------------------------------------

describe('computeRemaining wall-clock precision', () => {
  it('handles sub-second precision correctly', () => {
    const startedAt = 1000000;
    const remainingAtStart = 600;

    // After 1.5 seconds
    expect(computeRemaining(startedAt, remainingAtStart, startedAt + 1500)).toBeCloseTo(598.5, 1);

    // After exactly 600 seconds
    expect(computeRemaining(startedAt, remainingAtStart, startedAt + 600000)).toBeCloseTo(0, 1);

    // After more than duration
    expect(computeRemaining(startedAt, remainingAtStart, startedAt + 700000)).toBeLessThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// 12. Mode transition side effects (domain-level)
// ---------------------------------------------------------------------------

describe('Mode transition side effects', () => {
  it('restartTournament resets timer to level 0 stopped', () => {
    const levels = makeLevels(5, 600);
    const state = restartTournament(levels);

    expect(state.currentLevelIndex).toBe(0);
    expect(state.remainingSeconds).toBe(600);
    expect(state.status).toBe('stopped');
    expect(state.startedAt).toBeNull();
    expect(state.remainingAtStart).toBeNull();
  });

  it('resetCurrentLevel preserves current index but resets time', () => {
    const levels = makeLevels(5, 600);
    const running: TimerState = {
      currentLevelIndex: 3,
      remainingSeconds: 200,
      status: 'running',
      startedAt: Date.now(),
      remainingAtStart: 200,
    };

    const reset = resetCurrentLevel(running, levels);
    expect(reset.currentLevelIndex).toBe(3);
    expect(reset.remainingSeconds).toBe(600);
    expect(reset.status).toBe('stopped');
  });

  it('previousLevel at index 0 stays at 0', () => {
    const levels = makeLevels(5, 600);
    const atZero: TimerState = {
      currentLevelIndex: 0,
      remainingSeconds: 300,
      status: 'paused',
      startedAt: null,
      remainingAtStart: null,
    };

    const prev = previousLevel(atZero, levels);
    expect(prev.currentLevelIndex).toBe(0);
    expect(prev.remainingSeconds).toBe(600); // reset to full duration
  });
});

// ---------------------------------------------------------------------------
// 13. Liga GameDay → Standings Refresh
// ---------------------------------------------------------------------------

describe('Liga GameDay → Standings refresh', () => {
  const makeLeague = (): League => ({
    id: 'league_test_1',
    name: 'Test Liga',
    pointSystem: defaultPointSystem(),
    createdAt: new Date().toISOString(),
  });

  const makeGameDayHelper = (
    id: string,
    leagueId: string,
    date: string,
    participants: GameDayParticipant[],
  ): GameDay => ({
    id,
    leagueId,
    date,
    label: `Spieltag`,
    participants,
    totalPrizePool: participants.reduce((s, p) => s + p.payout, 0),
    totalBuyIns: participants.reduce((s, p) => s + p.buyIn, 0),
    cashBalance: 0,
  });

  const makeParticipant = (name: string, place: number, points: number, payout = 0): GameDayParticipant => ({
    name,
    place,
    points,
    buyIn: 10,
    rebuys: 0,
    addOnCost: 0,
    payout,
    netBalance: payout - 10,
  });

  beforeEach(async () => {
    await initStorage();
  });

  it('computes standings from 2 game days, updates after adding 3rd', () => {
    const league = makeLeague();
    saveLeague(league);

    // Game day 1: Alice wins, Bob 2nd, Charlie 3rd
    const gd1 = makeGameDayHelper('gd1', league.id, '2025-01-01', [
      makeParticipant('Alice', 1, 10, 20),
      makeParticipant('Bob', 2, 7, 10),
      makeParticipant('Charlie', 3, 5, 0),
    ]);
    saveGameDay(gd1);

    // Game day 2: Bob wins, Alice 2nd, Charlie 3rd
    const gd2 = makeGameDayHelper('gd2', league.id, '2025-01-08', [
      makeParticipant('Bob', 1, 10, 20),
      makeParticipant('Alice', 2, 7, 10),
      makeParticipant('Charlie', 3, 5, 0),
    ]);
    saveGameDay(gd2);

    const gameDays = loadGameDaysForLeague(league.id);
    expect(gameDays).toHaveLength(2);

    const standings = computeExtendedStandings(league, gameDays);
    expect(standings).toHaveLength(3);

    // Alice: 10+7=17, Bob: 7+10=17, Charlie: 5+5=10
    expect(standings[0].points).toBe(17);
    expect(standings[1].points).toBe(17);
    expect(standings[2].points).toBe(10);
    expect(standings[2].name).toBe('Charlie');

    // Add 3rd game day: Charlie wins!
    const gd3 = makeGameDayHelper('gd3', league.id, '2025-01-15', [
      makeParticipant('Charlie', 1, 10, 20),
      makeParticipant('Alice', 2, 7, 10),
      makeParticipant('Bob', 3, 5, 0),
    ]);
    saveGameDay(gd3);

    const updatedGameDays = loadGameDaysForLeague(league.id);
    expect(updatedGameDays).toHaveLength(3);

    const updatedStandings = computeExtendedStandings(league, updatedGameDays);
    // Alice: 10+7+7=24, Bob: 7+10+5=22, Charlie: 5+5+10=20
    expect(updatedStandings[0].points).toBe(24);
    expect(updatedStandings[0].name).toBe('Alice');
    expect(updatedStandings[1].points).toBe(22);
    expect(updatedStandings[1].name).toBe('Bob');
    expect(updatedStandings[2].points).toBe(20);
    expect(updatedStandings[2].name).toBe('Charlie');
  });

  it('standings reflect game day deletion', () => {
    const league = makeLeague();
    saveLeague(league);

    const gd1 = makeGameDayHelper('gd_del_1', league.id, '2025-02-01', [
      makeParticipant('Alice', 1, 10, 20),
      makeParticipant('Bob', 2, 7, 10),
    ]);
    const gd2 = makeGameDayHelper('gd_del_2', league.id, '2025-02-08', [
      makeParticipant('Bob', 1, 10, 20),
      makeParticipant('Alice', 2, 7, 10),
    ]);
    saveGameDay(gd1);
    saveGameDay(gd2);

    // Delete gd2 — only gd1 remains
    deleteGameDay('gd_del_2');

    const gameDays = loadGameDaysForLeague(league.id);
    expect(gameDays).toHaveLength(1);

    const standings = computeExtendedStandings(league, gameDays);
    expect(standings).toHaveLength(2);
    expect(standings[0].name).toBe('Alice');
    expect(standings[0].points).toBe(10);
    expect(standings[1].name).toBe('Bob');
    expect(standings[1].points).toBe(7);
  });

  it('standings correctly track tournaments played and participation rate', () => {
    const league = makeLeague();
    saveLeague(league);

    // 3 game days but Bob only plays in 2
    saveGameDay(makeGameDayHelper('gd_pr_1', league.id, '2025-03-01', [
      makeParticipant('Alice', 1, 10, 20),
      makeParticipant('Bob', 2, 7, 10),
    ]));
    saveGameDay(makeGameDayHelper('gd_pr_2', league.id, '2025-03-08', [
      makeParticipant('Alice', 1, 10, 20),
    ]));
    saveGameDay(makeGameDayHelper('gd_pr_3', league.id, '2025-03-15', [
      makeParticipant('Alice', 1, 10, 20),
      makeParticipant('Bob', 2, 7, 10),
    ]));

    const gameDays = loadGameDaysForLeague(league.id);
    const standings = computeExtendedStandings(league, gameDays);

    const alice = standings.find(s => s.name === 'Alice')!;
    const bob = standings.find(s => s.name === 'Bob')!;

    expect(alice.tournaments).toBe(3);
    expect(alice.participationRate).toBeCloseTo(1.0, 2);
    expect(bob.tournaments).toBe(2);
    expect(bob.participationRate).toBeCloseTo(2 / 3, 2);
  });
});

// ---------------------------------------------------------------------------
// 14. Liga JSON v2 Export/Import with GameDays
// ---------------------------------------------------------------------------

describe('Liga JSON v2 export/import with GameDays', () => {
  beforeEach(async () => {
    await initStorage();
  });

  it('export → parse round-trip preserves league and game days', () => {
    const league: League = {
      id: 'league_export_1',
      name: 'Export Test Liga',
      pointSystem: defaultPointSystem(),
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    saveLeague(league);

    // Save game days for this league
    const gd1: GameDay = {
      id: 'gd_exp_1',
      leagueId: league.id,
      date: '2025-01-01',
      label: 'Spieltag 1',
      participants: [
        { name: 'Alice', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 20, netBalance: 10 },
        { name: 'Bob', place: 2, points: 7, buyIn: 10, rebuys: 1, addOnCost: 0, payout: 10, netBalance: -10 },
      ],
      totalPrizePool: 30,
      totalBuyIns: 30,
      cashBalance: 0,
    };
    const gd2: GameDay = {
      id: 'gd_exp_2',
      leagueId: league.id,
      date: '2025-01-08',
      label: 'Spieltag 2',
      participants: [
        { name: 'Bob', place: 1, points: 10, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 15, netBalance: 5 },
        { name: 'Alice', place: 2, points: 7, buyIn: 10, rebuys: 0, addOnCost: 0, payout: 5, netBalance: -5 },
      ],
      totalPrizePool: 20,
      totalBuyIns: 20,
      cashBalance: 0,
    };
    saveGameDay(gd1);
    saveGameDay(gd2);

    // Also save a tournament result linked to this league
    const result = buildTournamentResult({
      ...defaultConfig(),
      name: 'Export Tournament',
      buyIn: 10,
      leagueId: league.id,
      players: [
        { ...makePlayer('p1', 'Alice'), placement: 1, knockouts: 1 },
        { ...makePlayer('p2', 'Bob'), status: 'eliminated', placement: 2, eliminatedBy: 'p1', knockouts: 0 },
      ],
    }, 1800, 1);
    saveTournamentResult(result);

    // Export
    const json = exportLeagueToJSON(league);
    expect(json).toBeTruthy();

    // Parse
    const parsed = parseLeagueFile(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.version).toBe(2);
    expect(parsed!.league.name).toBe('Export Test Liga');
    expect(parsed!.league.id).toBe(league.id);

    // Game days preserved
    expect(parsed!.gameDays).toBeDefined();
    expect(parsed!.gameDays!.length).toBe(2);
    expect(parsed!.gameDays![0].label).toBe('Spieltag 1');
    expect(parsed!.gameDays![0].participants).toHaveLength(2);
    expect(parsed!.gameDays![0].participants[0].name).toBe('Alice');
    expect(parsed!.gameDays![0].participants[1].rebuys).toBe(1);
    expect(parsed!.gameDays![1].label).toBe('Spieltag 2');

    // Results preserved
    expect(parsed!.results.length).toBeGreaterThanOrEqual(1);
  });

  it('v1 format (no gameDays) parses with empty gameDays array', () => {
    const v1Json = JSON.stringify({
      version: 1,
      league: {
        id: 'league_v1',
        name: 'Old Liga',
        pointSystem: defaultPointSystem(),
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      results: [],
      exportedAt: '2024-06-01T00:00:00.000Z',
    });

    const parsed = parseLeagueFile(v1Json);
    expect(parsed).not.toBeNull();
    expect(parsed!.gameDays).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 15. Custom Audio Mapping Persistence
// ---------------------------------------------------------------------------

describe('Custom audio mapping persistence', () => {
  beforeEach(async () => {
    await initStorage();
  });

  it('set → load → remove audio mapping round-trip', () => {
    // Save a custom audio file first
    const audioFile = {
      id: 'audio_1',
      name: 'test-sound.mp3',
      mimeType: 'audio/mpeg',
      sizeBytes: 1024,
      data: new ArrayBuffer(1024),
      createdAt: new Date().toISOString(),
    };
    saveCustomAudioFile(audioFile);

    // Set mapping
    const mapping = setAudioMapping('shuffle-up', 'audio_1', 'all');
    expect(mapping.id).toBeTruthy();
    expect(mapping.announcementKey).toBe('shuffle-up');
    expect(mapping.audioFileId).toBe('audio_1');
    expect(mapping.language).toBe('all');

    // Load and verify
    const loaded = loadAudioMappings();
    expect(loaded.length).toBe(1);
    expect(loaded[0].announcementKey).toBe('shuffle-up');
    expect(loaded[0].audioFileId).toBe('audio_1');

    // getCustomAudioForAnnouncement should find it
    const found = getCustomAudioForAnnouncement('shuffle-up', 'de');
    expect(found).not.toBeNull();
    expect(found!.id).toBe('audio_1');
    expect(found!.name).toBe('test-sound.mp3');

    // Remove mapping
    removeAudioMapping('shuffle-up', 'all');
    const afterRemove = loadAudioMappings();
    expect(afterRemove.length).toBe(0);

    // getCustomAudioForAnnouncement should return null now
    const notFound = getCustomAudioForAnnouncement('shuffle-up', 'de');
    expect(notFound).toBeNull();
  });

  it('language-specific mapping takes priority over "all"', () => {
    const audioAll = {
      id: 'audio_all',
      name: 'all-lang.mp3',
      mimeType: 'audio/mpeg',
      sizeBytes: 512,
      data: new ArrayBuffer(512),
      createdAt: new Date().toISOString(),
    };
    const audioDe = {
      id: 'audio_de',
      name: 'german.mp3',
      mimeType: 'audio/mpeg',
      sizeBytes: 512,
      data: new ArrayBuffer(512),
      createdAt: new Date().toISOString(),
    };
    saveCustomAudioFile(audioAll);
    saveCustomAudioFile(audioDe);

    setAudioMapping('level-change', 'audio_all', 'all');
    setAudioMapping('level-change', 'audio_de', 'de');

    // German should get the DE-specific mapping
    const de = getCustomAudioForAnnouncement('level-change', 'de');
    expect(de!.id).toBe('audio_de');

    // English should fall back to 'all'
    const en = getCustomAudioForAnnouncement('level-change', 'en');
    expect(en!.id).toBe('audio_all');
  });

  it('setCachedItem/getCached work for audioMappings store', () => {
    setCachedItem('audioMappings', {
      id: 'map_direct_1',
      announcementKey: 'bubble',
      audioFileId: 'file_x',
      language: 'all' as const,
    });

    const cached = getCached('audioMappings');
    expect(cached.length).toBe(1);
    expect(cached[0].id).toBe('map_direct_1');
    expect(cached[0].announcementKey).toBe('bubble');
  });
});

// ---------------------------------------------------------------------------
// 16. Checkpoint Full Rehydration (tables + events)
// ---------------------------------------------------------------------------

describe('Checkpoint full rehydration with tables and events', () => {
  beforeEach(async () => {
    await initStorage();
  });

  it('checkpoint with tables array survives save/load round-trip', () => {
    const tables: Table[] = [
      {
        id: 'table_1',
        name: 'Table 1',
        maxSeats: 9,
        seats: [
          { seatNumber: 1, playerId: 'p1' },
          { seatNumber: 2, playerId: 'p2' },
          { seatNumber: 3, playerId: null },
        ],
        status: 'active',
        dealerSeat: 1,
      },
      {
        id: 'table_2',
        name: 'Table 2',
        maxSeats: 9,
        seats: [
          { seatNumber: 1, playerId: 'p3' },
          { seatNumber: 2, playerId: null },
        ],
        status: 'active',
        dealerSeat: null,
      },
    ];

    const config: TournamentConfig = {
      ...defaultConfig(),
      name: 'Multi-Table Checkpoint',
      players: [
        makePlayer('p1', 'Alice'),
        makePlayer('p2', 'Bob'),
        makePlayer('p3', 'Charlie'),
      ],
      tables,
      multiTable: {
        numberOfTables: 2,
        seatsPerTable: 9,
        dissolveThreshold: 3,
        autoBalanceOnElimination: true,
      },
    };

    const events: TournamentEvent[] = [
      { id: 'evt_1', type: 'level_start', timestamp: '2025-01-01T20:00:00Z', details: { levelIndex: 0 } },
      { id: 'evt_2', type: 'elimination', timestamp: '2025-01-01T20:30:00Z', details: { playerName: 'Diana', place: 4 } },
    ];

    const checkpoint: TournamentCheckpoint = {
      version: 1,
      config,
      settings: defaultSettings(),
      timer: { currentLevelIndex: 2, remainingSeconds: 180 },
      savedAt: new Date().toISOString(),
      events,
    };

    saveCheckpoint(checkpoint);
    const loaded = loadCheckpoint();

    expect(loaded).not.toBeNull();
    expect(loaded!.config.name).toBe('Multi-Table Checkpoint');
    expect(loaded!.timer.currentLevelIndex).toBe(2);
    expect(loaded!.timer.remainingSeconds).toBe(180);

    // Tables deeply restored
    expect(loaded!.config.tables).toBeDefined();
    expect(loaded!.config.tables).toHaveLength(2);
    expect(loaded!.config.tables![0].id).toBe('table_1');
    expect(loaded!.config.tables![0].seats).toHaveLength(3);
    expect(loaded!.config.tables![0].seats[0].playerId).toBe('p1');
    expect(loaded!.config.tables![0].seats[2].playerId).toBeNull();
    expect(loaded!.config.tables![0].dealerSeat).toBe(1);
    expect(loaded!.config.tables![1].id).toBe('table_2');
    expect(loaded!.config.tables![1].dealerSeat).toBeNull();

    // Tables are deeply equal but not reference-equal
    expect(loaded!.config.tables).toEqual(tables);
    expect(loaded!.config.tables).not.toBe(tables);

    // Events restored
    expect(loaded!.events).toBeDefined();
    expect(loaded!.events).toHaveLength(2);
    expect(loaded!.events![0].type).toBe('level_start');
    expect(loaded!.events![1].type).toBe('elimination');
    expect(loaded!.events![1].details).toEqual({ playerName: 'Diana', place: 4 });
  });

  it('checkpoint without tables loads with undefined tables', () => {
    const config: TournamentConfig = {
      ...defaultConfig(),
      name: 'No Tables',
      players: [makePlayer('p1', 'Solo')],
    };

    saveCheckpoint({
      version: 1,
      config,
      settings: defaultSettings(),
      timer: { currentLevelIndex: 0, remainingSeconds: 600 },
      savedAt: new Date().toISOString(),
    });

    const loaded = loadCheckpoint();
    expect(loaded).not.toBeNull();
    expect(loaded!.config.tables).toBeUndefined();
    expect(loaded!.events).toEqual([]);
  });

  it('checkpoint multiTable config survives round-trip', () => {
    const config: TournamentConfig = {
      ...defaultConfig(),
      name: 'MultiTable Config',
      players: [makePlayer('p1', 'A'), makePlayer('p2', 'B')],
      multiTable: {
        numberOfTables: 3,
        seatsPerTable: 8,
        dissolveThreshold: 4,
        autoBalanceOnElimination: false,
      },
    };

    saveCheckpoint({
      version: 1,
      config,
      settings: defaultSettings(),
      timer: { currentLevelIndex: 1, remainingSeconds: 450 },
      savedAt: new Date().toISOString(),
    });

    const loaded = loadCheckpoint();
    expect(loaded!.config.multiTable).toBeDefined();
    expect(loaded!.config.multiTable!.numberOfTables).toBe(3);
    expect(loaded!.config.multiTable!.seatsPerTable).toBe(8);
    expect(loaded!.config.multiTable!.dissolveThreshold).toBe(4);
    expect(loaded!.config.multiTable!.autoBalanceOnElimination).toBe(false);
  });
});
