/**
 * useTournamentActions Hook Tests
 *
 * Tests from Testplan: T-001..T-008 (elimination, rebuy, add-on, reinstate,
 * dealer, late registration, re-entry, mystery bounty, multi-table chain).
 *
 * Strategy: render the hook with a mock `setConfig`, call the returned actions,
 * then extract the updater function from setConfig to verify the state
 * transformation against a known previous config.
 */
import { renderHook, act } from '@testing-library/react';
import { useTournamentActions } from '../src/hooks/useTournamentActions';
import type { TournamentConfig, Player, Table } from '../src/domain/types';
import * as logicMod from '../src/domain/logic';

// ---------------------------------------------------------------------------
// Mocks — domain logic + speech
// ---------------------------------------------------------------------------

let eventIdSeq = 0;
vi.mock('../src/domain/logic', () => ({
  computeNextPlacement: vi.fn(() => 3),
  drawMysteryBounty: vi.fn(() => ({ amount: 50, remainingPool: [25] })),
  removePlayerFromTable: vi.fn((tables: Table[]) => tables),
  findTableToDissolve: vi.fn(() => null),
  dissolveTable: vi.fn(() => ({ tables: [], moves: [] })),
  shouldMergeToFinalTable: vi.fn(() => false),
  mergeToFinalTable: vi.fn(() => ({ tables: [], moves: [] })),
  balanceTables: vi.fn((tables: Table[]) => ({ tables, moves: [] })),
  seatPlayerAtSmallestTable: vi.fn(() => null),
  advanceDealer: vi.fn(() => 2),
  generatePlayerId: vi.fn(() => 'new-player-id'),
  initializePlayerStacks: vi.fn((players: Player[]) =>
    players.map((p) => ({ ...p, chips: 10000 })),
  ),
  reEnterPlayer: vi.fn((players: Player[]) => [
    ...players,
    {
      id: 'reentry-id',
      name: players[0]?.name ?? 'ReEntry',
      rebuys: 0,
      addOn: false,
      status: 'active' as const,
      placement: null,
      eliminatedBy: null,
      knockouts: 0,
    },
  ]),
  createEvent: vi.fn((type: string, levelIndex: number, data: Record<string, unknown>) => ({
    id: `evt_test_${eventIdSeq++}`,
    type,
    timestamp: Date.now(),
    levelIndex,
    data,
  })),
}));

vi.mock('../src/domain/speech', () => ({
  announceTableMove: vi.fn(),
  announceTableDissolution: vi.fn(),
  announceMysteryBounty: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(overrides?: Partial<Player>): Player {
  return {
    id: 'p1',
    name: 'Alice',
    rebuys: 0,
    addOn: false,
    status: 'active' as const,
    placement: null,
    eliminatedBy: null,
    knockouts: 0,
    ...overrides,
  };
}

function makeConfig(overrides?: Partial<TournamentConfig>): TournamentConfig {
  return {
    name: 'Test',
    levels: [],
    anteEnabled: false,
    anteMode: 'standard',
    players: [
      makePlayer({ id: 'p1', name: 'Alice' }),
      makePlayer({ id: 'p2', name: 'Bob' }),
      makePlayer({ id: 'p3', name: 'Charlie' }),
    ],
    dealerIndex: 0,
    payout: { mode: 'percent', entries: [] },
    rebuy: {
      enabled: true,
      limitType: 'levels',
      levelLimit: 3,
      timeLimit: 3600,
      rebuyCost: 10,
      rebuyChips: 5000,
    },
    addOn: { enabled: true, cost: 10, chips: 5000 },
    bounty: { enabled: false, amount: 0, type: 'fixed' },
    chips: { enabled: false, colorUpEnabled: false, denominations: [], colorUpSchedule: [] },
    buyIn: 10,
    startingChips: 10000,
    ...overrides,
  };
}

/**
 * Render the hook with mocked setConfig, return helpers for assertions.
 */
function renderActions(config: TournamentConfig, currentLevelIndex = 2) {
  const setConfig = vi.fn();
  const setRecentTableMoves = vi.fn();
  const onAppendEvent = vi.fn();
  const mockT = vi.fn((key: string) => key) as never;

  const { result } = renderHook(() =>
    useTournamentActions({
      config,
      setConfig,
      mode: 'game',
      settings: { voiceEnabled: true },
      t: mockT,
      setRecentTableMoves,
      currentLevelIndex,
      onAppendEvent,
    }),
  );

  /** Apply the most recent setConfig updater to a given prev config. */
  function applyUpdate(prev: TournamentConfig): TournamentConfig {
    const lastCall = setConfig.mock.calls[setConfig.mock.calls.length - 1];
    const updater = lastCall[0];
    return typeof updater === 'function' ? updater(prev) : updater;
  }

  return { result, setConfig, setRecentTableMoves, onAppendEvent, applyUpdate };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTournamentActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // updatePlayerStack
  // -----------------------------------------------------------------------
  describe('updatePlayerStack', () => {
    it('updates the target player chips only', () => {
      const config = makeConfig({
        players: [
          makePlayer({ id: 'p1', chips: 8000 }),
          makePlayer({ id: 'p2', chips: 12000 }),
        ],
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.updatePlayerStack('p1', 15000);
      });

      const next = applyUpdate(config);
      expect(next.players[0].chips).toBe(15000);
      expect(next.players[1].chips).toBe(12000); // unchanged
    });
  });

  // -----------------------------------------------------------------------
  // initStacks
  // -----------------------------------------------------------------------
  describe('initStacks', () => {
    it('calls initializePlayerStacks with correct arguments', () => {
      const config = makeConfig();
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.initStacks();
      });

      // Must apply the updater first — the mock is called inside setConfig's updater
      const next = applyUpdate(config);

      const initFn = logicMod.initializePlayerStacks as ReturnType<typeof vi.fn>;
      expect(initFn).toHaveBeenCalledWith(
        config.players,
        config.startingChips,
        config.rebuy.rebuyChips, // rebuy enabled → rebuyChips
        config.addOn.chips,       // addOn enabled → addOn chips
      );
      expect(next.players.every((p: Player) => p.chips === 10000)).toBe(true);
    });

    it('passes 0 for rebuyChips when rebuy is disabled', () => {
      const config = makeConfig({
        rebuy: { enabled: false, limitType: 'levels', levelLimit: 3, timeLimit: 3600, rebuyCost: 10, rebuyChips: 5000 },
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.initStacks();
      });

      // Must apply updater to trigger the mock call
      applyUpdate(config);

      const initFn = logicMod.initializePlayerStacks as ReturnType<typeof vi.fn>;
      expect(initFn).toHaveBeenCalledWith(config.players, 10000, 0, 5000);
    });
  });

  // -----------------------------------------------------------------------
  // clearStacks
  // -----------------------------------------------------------------------
  describe('clearStacks', () => {
    it('sets all players chips to undefined', () => {
      const config = makeConfig({
        players: [
          makePlayer({ id: 'p1', chips: 8000 }),
          makePlayer({ id: 'p2', chips: 12000 }),
        ],
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.clearStacks();
      });

      const next = applyUpdate(config);
      expect(next.players.every((p: Player) => p.chips === undefined)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // updatePlayerRebuys
  // -----------------------------------------------------------------------
  describe('updatePlayerRebuys', () => {
    it('increases rebuy count and adds chips proportionally', () => {
      const config = makeConfig({
        players: [makePlayer({ id: 'p1', chips: 10000, rebuys: 0 })],
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.updatePlayerRebuys('p1', 2);
      });

      const next = applyUpdate(config);
      expect(next.players[0].rebuys).toBe(2);
      expect(next.players[0].chips).toBe(20000); // 10000 + 2 * 5000
    });

    it('decreases rebuy count and removes chips (clamped to 0)', () => {
      const config = makeConfig({
        players: [makePlayer({ id: 'p1', chips: 3000, rebuys: 2 })],
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.updatePlayerRebuys('p1', 0);
      });

      const next = applyUpdate(config);
      expect(next.players[0].rebuys).toBe(0);
      // 3000 + (-2) * 5000 = -7000 → clamped to 0
      expect(next.players[0].chips).toBe(0);
    });

    it('does not adjust chips when chips tracking is inactive', () => {
      const config = makeConfig({
        players: [makePlayer({ id: 'p1', rebuys: 0 })], // chips is undefined
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.updatePlayerRebuys('p1', 1);
      });

      const next = applyUpdate(config);
      expect(next.players[0].rebuys).toBe(1);
      expect(next.players[0].chips).toBeUndefined();
    });

    it('leaves other players unchanged', () => {
      const config = makeConfig({
        players: [
          makePlayer({ id: 'p1', chips: 10000, rebuys: 0 }),
          makePlayer({ id: 'p2', chips: 8000, rebuys: 1 }),
        ],
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.updatePlayerRebuys('p1', 1);
      });

      const next = applyUpdate(config);
      expect(next.players[1].rebuys).toBe(1); // unchanged
      expect(next.players[1].chips).toBe(8000); // unchanged
    });
  });

  // -----------------------------------------------------------------------
  // updatePlayerAddOn
  // -----------------------------------------------------------------------
  describe('updatePlayerAddOn', () => {
    it('adds chips when granting add-on', () => {
      const config = makeConfig({
        players: [makePlayer({ id: 'p1', chips: 10000, addOn: false })],
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.updatePlayerAddOn('p1', true);
      });

      const next = applyUpdate(config);
      expect(next.players[0].addOn).toBe(true);
      expect(next.players[0].chips).toBe(15000); // 10000 + 5000
    });

    it('removes chips when revoking add-on (clamped to 0)', () => {
      const config = makeConfig({
        players: [makePlayer({ id: 'p1', chips: 2000, addOn: true })],
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.updatePlayerAddOn('p1', false);
      });

      const next = applyUpdate(config);
      expect(next.players[0].addOn).toBe(false);
      expect(next.players[0].chips).toBe(0); // 2000 - 5000 → clamped to 0
    });

    it('does not adjust chips when chips tracking is inactive', () => {
      const config = makeConfig({
        players: [makePlayer({ id: 'p1', addOn: false })], // chips undefined
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.updatePlayerAddOn('p1', true);
      });

      const next = applyUpdate(config);
      expect(next.players[0].addOn).toBe(true);
      expect(next.players[0].chips).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // handleAdvanceDealer
  // -----------------------------------------------------------------------
  describe('handleAdvanceDealer', () => {
    it('calls advanceDealer and updates dealerIndex', () => {
      const config = makeConfig();
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.handleAdvanceDealer();
      });

      const next = applyUpdate(config);

      const advanceFn = logicMod.advanceDealer as ReturnType<typeof vi.fn>;
      expect(advanceFn).toHaveBeenCalledWith(config.players, config.dealerIndex);
      expect(next.dealerIndex).toBe(2); // mock returns 2
    });
  });

  // -----------------------------------------------------------------------
  // addLatePlayer
  // -----------------------------------------------------------------------
  describe('addLatePlayer', () => {
    it('adds a new active player with correct defaults', () => {
      const config = makeConfig(); // 3 players
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.addLatePlayer();
      });

      const next = applyUpdate(config);
      expect(next.players).toHaveLength(4);

      const newPlayer = next.players[3];
      expect(newPlayer.id).toBe('new-player-id');
      expect(newPlayer.status).toBe('active');
      expect(newPlayer.rebuys).toBe(0);
      expect(newPlayer.addOn).toBe(false);
      expect(newPlayer.knockouts).toBe(0);
      expect(newPlayer.placement).toBeNull();
    });

    it('seats new player at smallest table in multi-table mode', () => {
      const tables: Table[] = [{
        id: 't1', name: 'Tisch 1', maxSeats: 9,
        seats: [
          { seatNumber: 1, playerId: 'p1' },
          { seatNumber: 2, playerId: null },
        ],
        status: 'active', dealerSeat: null,
      }];
      const seatFn = logicMod.seatPlayerAtSmallestTable as ReturnType<typeof vi.fn>;
      seatFn.mockReturnValueOnce({ tables, move: null });

      const config = makeConfig({ tables });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.addLatePlayer();
      });

      // Must apply updater first to trigger mock calls inside
      const next = applyUpdate(config);
      expect(seatFn).toHaveBeenCalled();
      expect(next.tables).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // handleReEntry
  // -----------------------------------------------------------------------
  describe('handleReEntry', () => {
    it('calls reEnterPlayer and adds re-entry player', () => {
      const config = makeConfig({
        players: [
          makePlayer({ id: 'p1', status: 'eliminated', placement: 3 }),
          makePlayer({ id: 'p2' }),
        ],
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.handleReEntry('p1');
      });

      // Must apply updater first to trigger mock calls inside
      const next = applyUpdate(config);

      const reEntryFn = logicMod.reEnterPlayer as ReturnType<typeof vi.fn>;
      expect(reEntryFn).toHaveBeenCalledWith(config.players, 'p1');
      // Mock adds a new player at the end
      expect(next.players).toHaveLength(3);
      expect(next.players[2].id).toBe('reentry-id');
      expect(next.players[2].status).toBe('active');
    });
  });

  // -----------------------------------------------------------------------
  // reinstatePlayer
  // -----------------------------------------------------------------------
  describe('reinstatePlayer', () => {
    it('restores eliminated player to active status', () => {
      const config = makeConfig({
        players: [
          makePlayer({ id: 'p1', status: 'eliminated', placement: 3, eliminatedBy: 'p2' }),
          makePlayer({ id: 'p2', knockouts: 1 }),
          makePlayer({ id: 'p3' }),
        ],
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.reinstatePlayer('p1');
      });

      const next = applyUpdate(config);
      expect(next.players[0].status).toBe('active');
      expect(next.players[0].placement).toBeNull();
      expect(next.players[0].eliminatedBy).toBeNull();
    });

    it('decrements the killer knockouts', () => {
      const config = makeConfig({
        players: [
          makePlayer({ id: 'p1', status: 'eliminated', placement: 3, eliminatedBy: 'p2' }),
          makePlayer({ id: 'p2', knockouts: 2 }),
        ],
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.reinstatePlayer('p1');
      });

      const next = applyUpdate(config);
      expect(next.players[1].knockouts).toBe(1);
    });

    it('adjusts placements of players eliminated after the reinstated one', () => {
      const config = makeConfig({
        players: [
          makePlayer({ id: 'p1', status: 'eliminated', placement: 3, eliminatedBy: 'p2' }),
          makePlayer({ id: 'p2', knockouts: 1 }),
          makePlayer({ id: 'p3', status: 'eliminated', placement: 4, eliminatedBy: null }),
          makePlayer({ id: 'p4', status: 'eliminated', placement: 2, eliminatedBy: null }),
        ],
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.reinstatePlayer('p1');
      });

      const next = applyUpdate(config);
      // p3 had placement 4 (> 3) → shifted to 3
      expect(next.players[2].placement).toBe(3);
      // p4 had placement 2 (< 3) → unchanged
      expect(next.players[3].placement).toBe(2);
    });

    it('does nothing when player is already active', () => {
      const config = makeConfig({
        players: [makePlayer({ id: 'p1', status: 'active' })],
      });
      const { result, setConfig } = renderActions(config);

      act(() => {
        result.current.reinstatePlayer('p1');
      });

      // Updater should return prev unchanged (identity)
      const updater = setConfig.mock.calls[0][0];
      const next = updater(config);
      expect(next).toBe(config);
    });

    it('does nothing when player does not exist', () => {
      const config = makeConfig();
      const { result, setConfig } = renderActions(config);

      act(() => {
        result.current.reinstatePlayer('nonexistent');
      });

      const updater = setConfig.mock.calls[0][0];
      const next = updater(config);
      expect(next).toBe(config);
    });
  });

  // -----------------------------------------------------------------------
  // eliminatePlayer
  // -----------------------------------------------------------------------
  describe('eliminatePlayer', () => {
    it('sets player status to eliminated with correct placement', () => {
      const config = makeConfig();
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.eliminatePlayer('p1', 'p2');
      });

      const next = applyUpdate(config);
      const p1 = next.players.find((p: Player) => p.id === 'p1')!;
      expect(p1.status).toBe('eliminated');
      expect(p1.placement).toBe(3); // from mock computeNextPlacement
      expect(p1.eliminatedBy).toBe('p2');
    });

    it('increments the killer knockouts', () => {
      const config = makeConfig();
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.eliminatePlayer('p1', 'p2');
      });

      const next = applyUpdate(config);
      const p2 = next.players.find((p: Player) => p.id === 'p2')!;
      expect(p2.knockouts).toBe(1);
    });

    it('sets chips to 0 when stack tracking is active', () => {
      const config = makeConfig({
        players: [
          makePlayer({ id: 'p1', chips: 5000 }),
          makePlayer({ id: 'p2', chips: 15000 }),
        ],
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.eliminatePlayer('p1', 'p2');
      });

      const next = applyUpdate(config);
      expect(next.players[0].chips).toBe(0);
    });

    it('leaves chips undefined when stack tracking is inactive', () => {
      const config = makeConfig({
        players: [
          makePlayer({ id: 'p1' }), // chips undefined
          makePlayer({ id: 'p2' }),
        ],
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.eliminatePlayer('p1', 'p2');
      });

      const next = applyUpdate(config);
      expect(next.players[0].chips).toBeUndefined();
    });

    it('draws mystery bounty when mystery bounty is enabled and killer exists', () => {
      const config = makeConfig({
        bounty: { enabled: true, type: 'mystery', amount: 0, mysteryPool: [25, 50, 100] },
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.eliminatePlayer('p1', 'p2');
      });

      const next = applyUpdate(config);

      const drawFn = logicMod.drawMysteryBounty as ReturnType<typeof vi.fn>;
      expect(drawFn).toHaveBeenCalledWith([25, 50, 100]);
      expect(next.bounty.amount).toBe(50);
      expect(next.bounty.mysteryPool).toEqual([25]);
    });

    it('does NOT draw mystery bounty when there is no killer', () => {
      const config = makeConfig({
        bounty: { enabled: true, type: 'mystery', amount: 0, mysteryPool: [25, 50] },
      });
      const { result } = renderActions(config);

      act(() => {
        result.current.eliminatePlayer('p1', null);
      });

      const drawFn = logicMod.drawMysteryBounty as ReturnType<typeof vi.fn>;
      expect(drawFn).not.toHaveBeenCalled();
    });

    it('does NOT draw mystery bounty for fixed bounty type', () => {
      const config = makeConfig({
        bounty: { enabled: true, type: 'fixed', amount: 10 },
      });
      const { result } = renderActions(config);

      act(() => {
        result.current.eliminatePlayer('p1', 'p2');
      });

      const drawFn = logicMod.drawMysteryBounty as ReturnType<typeof vi.fn>;
      expect(drawFn).not.toHaveBeenCalled();
    });

    it('removes player from table in multi-table mode', () => {
      const tables: Table[] = [{
        id: 't1', name: 'Tisch 1', maxSeats: 9,
        seats: [
          { seatNumber: 1, playerId: 'p1' },
          { seatNumber: 2, playerId: 'p2' },
        ],
        status: 'active', dealerSeat: null,
      }];
      const config = makeConfig({ tables });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.eliminatePlayer('p1', 'p2');
      });

      applyUpdate(config);

      const removeFn = logicMod.removePlayerFromTable as ReturnType<typeof vi.fn>;
      expect(removeFn).toHaveBeenCalledWith(tables, 'p1');
    });

    it('calls balanceTables when autoBalanceOnElimination is enabled', () => {
      const tables: Table[] = [{
        id: 't1', name: 'Tisch 1', maxSeats: 9,
        seats: [{ seatNumber: 1, playerId: 'p1' }],
        status: 'active', dealerSeat: null,
      }];
      const config = makeConfig({
        tables,
        multiTable: { enabled: true, seatsPerTable: 9, dissolveThreshold: 3, autoBalanceOnElimination: true },
      });
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.eliminatePlayer('p1', 'p2');
      });

      applyUpdate(config);

      const balanceFn = logicMod.balanceTables as ReturnType<typeof vi.fn>;
      expect(balanceFn).toHaveBeenCalled();
    });

    it('does NOT call multi-table functions when no tables configured', () => {
      const config = makeConfig(); // no tables
      const { result } = renderActions(config);

      act(() => {
        result.current.eliminatePlayer('p1', 'p2');
      });

      const removeFn = logicMod.removePlayerFromTable as ReturnType<typeof vi.fn>;
      expect(removeFn).not.toHaveBeenCalled();
    });

    it('allows self-elimination (eliminatedBy is null)', () => {
      const config = makeConfig();
      const { result, applyUpdate } = renderActions(config);

      act(() => {
        result.current.eliminatePlayer('p1', null);
      });

      const next = applyUpdate(config);
      const p1 = next.players.find((p: Player) => p.id === 'p1')!;
      expect(p1.status).toBe('eliminated');
      expect(p1.eliminatedBy).toBeNull();
      // No other player should have increased knockouts
      const others = next.players.filter((p: Player) => p.id !== 'p1');
      expect(others.every((p: Player) => p.knockouts === 0)).toBe(true);
    });

    it('sets eliminatedAt timestamp on the eliminated player', () => {
      const config = makeConfig();
      const { result, applyUpdate } = renderActions(config);
      const before = Date.now();

      act(() => {
        result.current.eliminatePlayer('p1', 'p2');
      });

      const next = applyUpdate(config);
      const p1 = next.players.find((p: Player) => p.id === 'p1')!;
      expect(p1.eliminatedAt).toBeGreaterThanOrEqual(before);
      expect(p1.eliminatedAt).toBeLessThanOrEqual(Date.now());
    });
  });

  // -----------------------------------------------------------------------
  // Event logging
  // -----------------------------------------------------------------------
  describe('event logging', () => {
    it('creates player_eliminated event when eliminating a player', () => {
      const config = makeConfig();
      const { result, onAppendEvent, applyUpdate } = renderActions(config, 3);

      act(() => {
        result.current.eliminatePlayer('p1', 'p2');
      });

      // Event is now appended inside the setConfig updater, so we must run the updater
      applyUpdate(config);

      expect(onAppendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'player_eliminated',
          levelIndex: 3,
          data: expect.objectContaining({ playerId: 'p1', eliminatorId: 'p2' }),
        }),
      );
    });

    it('creates rebuy_taken event when doing a rebuy', () => {
      const config = makeConfig({
        players: [makePlayer({ id: 'p1', rebuys: 0 })],
      });
      const { result, onAppendEvent, applyUpdate } = renderActions(config, 1);

      act(() => {
        result.current.updatePlayerRebuys('p1', 1);
      });

      // Event logging now happens inside the setConfig updater — run it
      applyUpdate(config);

      expect(onAppendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rebuy_taken',
          levelIndex: 1,
          data: expect.objectContaining({ playerId: 'p1' }),
        }),
      );
    });

    it('creates multiple rebuy_taken events for multi-rebuy increase', () => {
      const config = makeConfig({
        players: [makePlayer({ id: 'p1', rebuys: 0 })],
      });
      const { result, onAppendEvent, applyUpdate } = renderActions(config, 1);

      act(() => {
        result.current.updatePlayerRebuys('p1', 3);
      });

      // Event logging now happens inside the setConfig updater — run it
      applyUpdate(config);

      const rebuyCalls = onAppendEvent.mock.calls.filter(
        (call: unknown[]) => (call[0] as { type: string }).type === 'rebuy_taken',
      );
      expect(rebuyCalls).toHaveLength(3);
    });

    it('creates addon_taken event for add-ons', () => {
      const config = makeConfig({
        players: [makePlayer({ id: 'p1', addOn: false })],
      });
      const { result, onAppendEvent } = renderActions(config, 4);

      act(() => {
        result.current.updatePlayerAddOn('p1', true);
      });

      expect(onAppendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'addon_taken',
          levelIndex: 4,
          data: expect.objectContaining({ playerId: 'p1' }),
        }),
      );
    });

    it('does NOT create addon_taken event when revoking add-on', () => {
      const config = makeConfig({
        players: [makePlayer({ id: 'p1', addOn: true })],
      });
      const { result, onAppendEvent } = renderActions(config, 4);

      act(() => {
        result.current.updatePlayerAddOn('p1', false);
      });

      expect(onAppendEvent).not.toHaveBeenCalled();
    });

    it('creates player_reinstated event when reinstating', () => {
      const config = makeConfig({
        players: [
          makePlayer({ id: 'p1', status: 'eliminated', placement: 3, eliminatedBy: 'p2' }),
          makePlayer({ id: 'p2', knockouts: 1 }),
        ],
      });
      const { result, onAppendEvent } = renderActions(config, 5);

      act(() => {
        result.current.reinstatePlayer('p1');
      });

      expect(onAppendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'player_reinstated',
          levelIndex: 5,
          data: expect.objectContaining({ playerId: 'p1' }),
        }),
      );
    });

    it('creates late_registration event when adding late player', () => {
      const config = makeConfig();
      const { result, onAppendEvent } = renderActions(config, 2);

      act(() => {
        result.current.addLatePlayer();
      });

      expect(onAppendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'late_registration',
          levelIndex: 2,
          data: expect.objectContaining({ playerId: 'new-player-id' }),
        }),
      );
    });

    it('creates re_entry event for re-entry', () => {
      const config = makeConfig({
        players: [
          makePlayer({ id: 'p1', status: 'eliminated', placement: 3 }),
          makePlayer({ id: 'p2' }),
        ],
      });
      const { result, onAppendEvent } = renderActions(config, 6);

      act(() => {
        result.current.handleReEntry('p1');
      });

      expect(onAppendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 're_entry',
          levelIndex: 6,
          data: expect.objectContaining({ playerId: 'p1', originalPlayerId: 'p1' }),
        }),
      );
    });

    it('creates dealer_advanced event when advancing dealer', () => {
      const config = makeConfig();
      const { result, onAppendEvent } = renderActions(config, 0);

      act(() => {
        result.current.handleAdvanceDealer();
      });

      expect(onAppendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'dealer_advanced',
          levelIndex: 0,
        }),
      );
    });
  });
});
