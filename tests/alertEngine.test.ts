/**
 * Tests for alertEngine.ts — Custom alert creation, interpolation, and trigger evaluation.
 */
import { createDefaultAlert, interpolateAlertText, shouldFireAlert } from '../src/domain/alertEngine';
import { defaultConfig } from '../src/domain/configPersistence';
import type { AlertConfig, AlertTrigger } from '../src/domain/types';

describe('createDefaultAlert', () => {
  it('creates a level_start alert with levelIndex default', () => {
    const alert = createDefaultAlert('level_start');
    expect(alert.trigger).toBe('level_start');
    expect(alert.enabled).toBe(true);
    expect(alert.levelIndex).toBe(0);
    expect(alert.text).toBe('');
    expect(alert.voice).toBe(true);
    expect(alert.sound).toBe('beep');
    expect(alert.id).toBeTruthy();
  });

  it('creates a time_remaining alert with secondsBefore default', () => {
    const alert = createDefaultAlert('time_remaining');
    expect(alert.trigger).toBe('time_remaining');
    expect(alert.secondsBefore).toBe(60);
  });

  it('creates a player_count alert with playerCount default', () => {
    const alert = createDefaultAlert('player_count');
    expect(alert.trigger).toBe('player_count');
    expect(alert.playerCount).toBe(2);
  });

  it('creates a break_start alert without extra fields', () => {
    const alert = createDefaultAlert('break_start');
    expect(alert.trigger).toBe('break_start');
    expect(alert.levelIndex).toBeUndefined();
    expect(alert.secondsBefore).toBeUndefined();
    expect(alert.playerCount).toBeUndefined();
  });

  it('generates unique IDs for each alert', () => {
    const a = createDefaultAlert('level_start');
    const b = createDefaultAlert('level_start');
    expect(a.id).not.toBe(b.id);
  });
});

describe('interpolateAlertText', () => {
  const config = defaultConfig();
  // Ensure config has known levels for testing
  config.levels = [
    { id: 'l1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50, ante: 5 },
    { id: 'b1', type: 'break', durationSeconds: 300, smallBlind: 0, bigBlind: 0 },
    { id: 'l2', type: 'level', durationSeconds: 600, smallBlind: 50, bigBlind: 100, ante: 10 },
  ];

  it('replaces {level} with play-level number', () => {
    const result = interpolateAlertText('Level {level}', { levelIndex: 0, config, activePlayers: 8 });
    expect(result).toBe('Level 1');
  });

  it('replaces {bigBlind} and {smallBlind}', () => {
    const result = interpolateAlertText('Blinds: {smallBlind}/{bigBlind}', { levelIndex: 0, config, activePlayers: 8 });
    expect(result).toBe('Blinds: 25/50');
  });

  it('replaces {ante}', () => {
    const result = interpolateAlertText('Ante: {ante}', { levelIndex: 2, config, activePlayers: 6 });
    expect(result).toBe('Ante: 10');
  });

  it('replaces {players}', () => {
    const result = interpolateAlertText('{players} players left', { levelIndex: 0, config, activePlayers: 5 });
    expect(result).toBe('5 players left');
  });

  it('replaces multiple placeholders in one string', () => {
    const result = interpolateAlertText(
      'Level {level}: {smallBlind}/{bigBlind} ante {ante} — {players} left',
      { levelIndex: 2, config, activePlayers: 4 },
    );
    expect(result).toBe('Level 2: 50/100 ante 10 — 4 left');
  });

  it('handles break level (no blinds)', () => {
    const result = interpolateAlertText('Blinds: {smallBlind}/{bigBlind}', { levelIndex: 1, config, activePlayers: 8 });
    expect(result).toBe('Blinds: 0/0');
  });
});

describe('shouldFireAlert', () => {
  function makeAlert(trigger: AlertTrigger, overrides: Partial<AlertConfig> = {}): AlertConfig {
    return {
      id: 'test',
      enabled: true,
      trigger,
      text: 'Test',
      voice: true,
      sound: 'beep',
      ...overrides,
    };
  }

  it('does not fire when disabled', () => {
    const alert = makeAlert('break_start', { enabled: false });
    expect(shouldFireAlert(alert, 'break_start', { levelIndex: 0, remainingSeconds: 0, activePlayers: 8, prevActivePlayers: 8 })).toBe(false);
  });

  it('does not fire when trigger type mismatch', () => {
    const alert = makeAlert('break_start');
    expect(shouldFireAlert(alert, 'level_start', { levelIndex: 0, remainingSeconds: 0, activePlayers: 8, prevActivePlayers: 8 })).toBe(false);
  });

  it('fires break_start for any break', () => {
    const alert = makeAlert('break_start');
    expect(shouldFireAlert(alert, 'break_start', { levelIndex: 3, remainingSeconds: 300, activePlayers: 6, prevActivePlayers: 6 })).toBe(true);
  });

  it('fires level_start only for matching levelIndex', () => {
    const alert = makeAlert('level_start', { levelIndex: 2 });
    expect(shouldFireAlert(alert, 'level_start', { levelIndex: 2, remainingSeconds: 600, activePlayers: 8, prevActivePlayers: 8 })).toBe(true);
    expect(shouldFireAlert(alert, 'level_start', { levelIndex: 1, remainingSeconds: 600, activePlayers: 8, prevActivePlayers: 8 })).toBe(false);
  });

  it('fires time_remaining when seconds match', () => {
    const alert = makeAlert('time_remaining', { secondsBefore: 60 });
    expect(shouldFireAlert(alert, 'time_remaining', { levelIndex: 0, remainingSeconds: 60, activePlayers: 8, prevActivePlayers: 8 })).toBe(true);
    expect(shouldFireAlert(alert, 'time_remaining', { levelIndex: 0, remainingSeconds: 59, activePlayers: 8, prevActivePlayers: 8 })).toBe(false);
  });

  it('fires player_count when count drops to target', () => {
    const alert = makeAlert('player_count', { playerCount: 5 });
    // Fires: dropped from 6 to 5
    expect(shouldFireAlert(alert, 'player_count', { levelIndex: 0, remainingSeconds: 0, activePlayers: 5, prevActivePlayers: 6 })).toBe(true);
    // Does NOT fire: already at 5
    expect(shouldFireAlert(alert, 'player_count', { levelIndex: 0, remainingSeconds: 0, activePlayers: 5, prevActivePlayers: 5 })).toBe(false);
    // Does NOT fire: different count
    expect(shouldFireAlert(alert, 'player_count', { levelIndex: 0, remainingSeconds: 0, activePlayers: 4, prevActivePlayers: 5 })).toBe(false);
  });

  it('returns false for unknown trigger type', () => {
    const alert = makeAlert('unknown_trigger' as AlertTrigger);
    expect(shouldFireAlert(alert, 'unknown_trigger' as AlertTrigger, { levelIndex: 0, remainingSeconds: 0, activePlayers: 8, prevActivePlayers: 8 })).toBe(false);
  });
});
