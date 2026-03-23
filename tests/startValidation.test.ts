/**
 * Tests for startValidation.ts — Centralized preflight checks
 * before switching from setup/league into game mode.
 */
import { collectStartErrors } from '../src/domain/startValidation';
import { defaultConfig } from '../src/domain/configPersistence';
import { generatePlayerId } from '../src/domain/helpers';
import type { TournamentConfig, Player } from '../src/domain/types';

// Simple mock translator that returns the key with params appended
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t: any = (key: string, params?: Record<string, string | number>) => {
  let msg = key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg += ` ${k}=${v}`;
    }
  }
  return msg;
};

function makePlayer(name: string): Player {
  return {
    id: generatePlayerId(),
    name,
    rebuys: 0,
    addOn: false,
    status: 'active',
    placement: null,
    eliminatedBy: null,
    knockouts: 0,
  };
}

function validConfig(): TournamentConfig {
  const cfg = defaultConfig();
  cfg.players = [makePlayer('Alice'), makePlayer('Bob'), makePlayer('Charlie')];
  return cfg;
}

describe('collectStartErrors', () => {
  it('returns empty array for valid config', () => {
    const errors = collectStartErrors(validConfig(), t);
    expect(errors).toEqual([]);
  });

  it('reports error when fewer than 2 players', () => {
    const cfg = validConfig();
    cfg.players = [makePlayer('Solo')];
    const errors = collectStartErrors(cfg, t);
    expect(errors.some((e) => e.includes('minPlayersRequired'))).toBe(true);
  });

  it('reports error when 0 play levels', () => {
    const cfg = validConfig();
    cfg.levels = [{ id: 'brk1', type: 'break', durationSeconds: 300, smallBlind: 0, bigBlind: 0 }];
    const errors = collectStartErrors(cfg, t);
    expect(errors.some((e) => e.includes('noLevels'))).toBe(true);
  });

  it('reports error when starting chips <= 0', () => {
    const cfg = validConfig();
    cfg.startingChips = 0;
    const errors = collectStartErrors(cfg, t);
    expect(errors.some((e) => e.includes('startingChipsMustBePositive'))).toBe(true);
  });

  it('reports error when bounty amount <= 0 with fixed bounty enabled', () => {
    const cfg = validConfig();
    cfg.bounty = { enabled: true, amount: 0, type: 'fixed' };
    const errors = collectStartErrors(cfg, t);
    expect(errors.some((e) => e.includes('bountyAmountMustBePositive'))).toBe(true);
  });

  it('does NOT report bounty error for mystery bounty type', () => {
    const cfg = validConfig();
    cfg.bounty = { enabled: true, amount: 0, type: 'mystery', mysteryPool: [10, 20, 50] };
    const errors = collectStartErrors(cfg, t);
    expect(errors.some((e) => e.includes('bountyAmountMustBePositive'))).toBe(false);
  });

  it('reports error when blinds are not monotonically increasing', () => {
    const cfg = validConfig();
    cfg.levels = [
      { id: 'l1', type: 'level', durationSeconds: 600, smallBlind: 100, bigBlind: 200 },
      { id: 'l2', type: 'level', durationSeconds: 600, smallBlind: 50, bigBlind: 100 }, // decreasing!
    ];
    const errors = collectStartErrors(cfg, t);
    expect(errors.some((e) => e.includes('blindsNotMonotonic'))).toBe(true);
  });

  it('reports error when payout places are not contiguous', () => {
    const cfg = validConfig();
    cfg.payout = {
      mode: 'fixed',
      entries: [
        { place: 1, amount: 60, percentage: 60 },
        { place: 3, amount: 40, percentage: 40 }, // gap: place 2 missing
      ],
    };
    const errors = collectStartErrors(cfg, t);
    expect(errors.some((e) => e.includes('payoutPlacesNotContiguous'))).toBe(true);
  });

  it('reports error when more payout places than players', () => {
    const cfg = validConfig();
    cfg.players = [makePlayer('A'), makePlayer('B')];
    cfg.payout = {
      mode: 'fixed',
      entries: [
        { place: 1, amount: 50, percentage: 50 },
        { place: 2, amount: 30, percentage: 30 },
        { place: 3, amount: 20, percentage: 20 },
      ],
    };
    const errors = collectStartErrors(cfg, t);
    expect(errors.some((e) => e.includes('morePlacesThanPlayers'))).toBe(true);
  });

  it('accepts valid monotonically increasing blinds', () => {
    const cfg = validConfig();
    cfg.levels = [
      { id: 'l1', type: 'level', durationSeconds: 600, smallBlind: 50, bigBlind: 100 },
      { id: 'b1', type: 'break', durationSeconds: 300, smallBlind: 0, bigBlind: 0 },
      { id: 'l2', type: 'level', durationSeconds: 600, smallBlind: 100, bigBlind: 200 },
      { id: 'l3', type: 'level', durationSeconds: 600, smallBlind: 200, bigBlind: 400 },
    ];
    const errors = collectStartErrors(cfg, t);
    // Should not contain blindsNotMonotonic
    expect(errors.some((e) => e.includes('blindsNotMonotonic'))).toBe(false);
  });

  it('reports dangling league reference', () => {
    const cfg = validConfig();
    cfg.leagueId = 'nonexistent-league-id';
    const errors = collectStartErrors(cfg, t);
    expect(errors.some((e) => e.includes('leagueNotFound'))).toBe(true);
  });
});
