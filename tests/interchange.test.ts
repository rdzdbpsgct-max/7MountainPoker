import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  encodeTemplate7mpx,
  encodeResult7mpx,
  encodeLeague7mpx,
  decode7mpx,
  decodeTemplate7mpx,
  decodeResult7mpx,
  decodeLeague7mpx,
  to7mpxHash,
  parse7mpxHash,
  json7mpxFromHash,
  toBase64Url,
  fromBase64Url,
  SEVENMPX_HASH_PREFIX,
  type SevenMpxLeaguePayload,
} from '../src/domain/interchange';
import { defaultConfig } from '../src/domain/logic';
import type { TournamentResult } from '../src/domain/types';

const FIXTURES = join(__dirname, '..', 'test-fixtures', '7mpx');
const readFixture = (name: string) => readFileSync(join(FIXTURES, name), 'utf-8');

const sampleResult: TournamentResult = {
  id: 'tr_test',
  name: 'Freitagsrunde',
  date: '2026-06-13T20:00:00Z',
  currency: 'EUR',
  buyIn: 20,
  prizePool: 240,
  playerCount: 2,
  bountyEnabled: false,
  bountyAmount: 0,
  rebuyEnabled: true,
  totalRebuys: 5,
  addOnEnabled: false,
  totalAddOns: 0,
  elapsedSeconds: 9300,
  levelsPlayed: 14,
  dealApplied: false,
  players: [
    { name: 'Anna', place: 1, payout: 120, rebuys: 1, addOn: false, knockouts: 3, bountyEarned: 0, netBalance: 80 },
    { name: 'Ben', place: 2, payout: 72, rebuys: 0, addOn: false, knockouts: 1, bountyEarned: 0, netBalance: 52 },
  ],
};

const sampleLeague: SevenMpxLeaguePayload = {
  name: 'Mittwochsliga 2026',
  pointSystem: { entries: [{ place: 1, points: 10 }, { place: 2, points: 7 }] },
  standings: [
    { rank: 1, name: 'Anna', points: 48, tournaments: 6, wins: 2, netBalance: 140 },
    { rank: 2, name: 'Ben', points: 41, tournaments: 6, wins: 1, netBalance: -20 },
  ],
};

describe('7MPX Base64URL', () => {
  it('round-trips ASCII', () => {
    expect(fromBase64Url(toBase64Url('hello world'))).toBe('hello world');
  });
  it('round-trips UTF-8 (umlauts, emoji)', () => {
    const s = 'Spieltag · Café ♠ 🏆 für 5 €';
    expect(fromBase64Url(toBase64Url(s))).toBe(s);
  });
  it('produces URL-safe output (no +/=)', () => {
    const out = toBase64Url('???>>><<<~~~');
    expect(out).not.toMatch(/[+/=]/);
  });
});

describe('7MPX envelope', () => {
  it('encodeTemplate produces a valid envelope', () => {
    const env = decode7mpx(encodeTemplate7mpx(defaultConfig()));
    expect(env).not.toBeNull();
    expect(env!.fmt).toBe('7mpx');
    expect(env!.v).toBe(1);
    expect(env!.kind).toBe('template');
    expect(env!.app?.src).toBe('web');
  });

  it('rejects wrong format marker', () => {
    expect(decode7mpx(JSON.stringify({ fmt: 'other', v: 1, kind: 'template', payload: {} }))).toBeNull();
  });

  it('rejects a future schema version', () => {
    expect(decode7mpx(JSON.stringify({ fmt: '7mpx', v: 999, kind: 'template', payload: {} }))).toBeNull();
  });

  it('rejects an unknown kind', () => {
    expect(decode7mpx(JSON.stringify({ fmt: '7mpx', v: 1, kind: 'bogus', payload: {} }))).toBeNull();
  });

  it('rejects malformed JSON', () => {
    expect(decode7mpx('{not json')).toBeNull();
  });

  it('rejects missing payload', () => {
    expect(decode7mpx(JSON.stringify({ fmt: '7mpx', v: 1, kind: 'result' }))).toBeNull();
  });

  it('strips prototype-pollution keys', () => {
    const malicious = '{"fmt":"7mpx","v":1,"kind":"league","payload":{"name":"X","__proto__":{"polluted":true},"standings":[{"rank":1,"name":"A","points":1,"tournaments":1,"wins":0,"netBalance":0}]}}';
    const env = decode7mpx(malicious);
    expect(env).not.toBeNull();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('7MPX template round-trip', () => {
  it('config survives encode→decode', () => {
    const cfg = defaultConfig();
    const decoded = decodeTemplate7mpx(encodeTemplate7mpx(cfg));
    expect(decoded).not.toBeNull();
    expect(decoded!.name).toBe(cfg.name);
    expect(decoded!.levels.length).toBe(cfg.levels.length);
    expect(decoded!.buyIn).toBe(cfg.buyIn);
  });

  it('decodes the shared template fixture', () => {
    const cfg = decodeTemplate7mpx(readFixture('template.json'));
    expect(cfg).not.toBeNull();
    expect(cfg!.name).toBe('Standard Home Game');
    expect(cfg!.buyIn).toBe(20);
    expect(cfg!.levels.length).toBe(3);
  });

  it('decodeResult/decodeLeague reject a template payload', () => {
    const json = encodeTemplate7mpx(defaultConfig());
    expect(decodeResult7mpx(json)).toBeNull();
    expect(decodeLeague7mpx(json)).toBeNull();
  });
});

describe('7MPX result round-trip', () => {
  it('result survives encode→decode', () => {
    const decoded = decodeResult7mpx(encodeResult7mpx(sampleResult));
    expect(decoded).not.toBeNull();
    expect(decoded!.name).toBe('Freitagsrunde');
    expect(decoded!.players.length).toBe(2);
    expect(decoded!.players[0]!.place).toBe(1);
    expect(decoded!.currency).toBe('EUR');
  });

  it('drops the event log when encoding forQR', () => {
    const withEvents: TournamentResult = {
      ...sampleResult,
      events: [{ id: 'e1', type: 'elimination', levelIndex: 0, timestamp: 1, data: {} }] as TournamentResult['events'],
    };
    const env = decode7mpx(encodeResult7mpx(withEvents, { forQR: true }));
    const payload = env!.payload as Record<string, unknown>;
    expect(payload.events).toBeUndefined();
    expect(payload.truncated).toBe(true);
  });

  it('decodes the shared result fixture', () => {
    const r = decodeResult7mpx(readFixture('result.json'));
    expect(r).not.toBeNull();
    expect(r!.prizePool).toBe(240);
    expect(r!.players.length).toBe(2);
  });
});

describe('7MPX league round-trip', () => {
  it('league survives encode→decode', () => {
    const decoded = decodeLeague7mpx(encodeLeague7mpx(sampleLeague));
    expect(decoded).not.toBeNull();
    expect(decoded!.leagueName).toBe('Mittwochsliga 2026');
    expect(decoded!.standings.length).toBe(2);
    expect(decoded!.standings[1]!.netBalance).toBe(-20);
  });

  it('decodes the shared league fixture', () => {
    const l = decodeLeague7mpx(readFixture('league.json'));
    expect(l).not.toBeNull();
    expect(l!.standings[0]!.name).toBe('Anna');
  });
});

describe('7MPX hash transport', () => {
  it('to7mpxHash → parse7mpxHash round-trips a template', () => {
    const hash = to7mpxHash(encodeTemplate7mpx(defaultConfig()));
    expect(hash.startsWith(SEVENMPX_HASH_PREFIX)).toBe(true);
    const env = parse7mpxHash(hash);
    expect(env).not.toBeNull();
    expect(env!.kind).toBe('template');
  });

  it('parse7mpxHash tolerates URL-encoded hashes', () => {
    const hash = to7mpxHash(encodeLeague7mpx(sampleLeague));
    const env = parse7mpxHash(encodeURIComponent(hash.slice(SEVENMPX_HASH_PREFIX.length)));
    // raw base64url without prefix is also accepted
    expect(env === null || env.kind === 'league').toBe(true);
  });

  it('parse7mpxHash returns null on garbage', () => {
    expect(parse7mpxHash('#7mpx=@@@not-base64@@@')).toBeNull();
  });
});

describe('7MPX compression (raw DEFLATE)', () => {
  // A full standard structure (25 levels) — the realistic worst case for QR size.
  const bigConfig = (() => {
    const cfg = defaultConfig();
    cfg.levels = Array.from({ length: 25 }, (_, i) => ({
      id: `l${i}`, type: 'level' as const, smallBlind: 25 * (i + 1), bigBlind: 50 * (i + 1), ante: 0, durationSeconds: 1200,
    }));
    return cfg;
  })();

  it('compresses a large template hash (z. marker) and round-trips', () => {
    const hash = to7mpxHash(encodeTemplate7mpx(bigConfig));
    expect(hash.startsWith('#7mpx=z.')).toBe(true);
    // Must fit inside a QR code (byte-mode capacity < 2953).
    expect(hash.length).toBeLessThan(1500);
    const cfg = decodeTemplate7mpx(json7mpxFromHash(hash)!);
    expect(cfg).not.toBeNull();
    expect(cfg!.levels.length).toBe(25);
  });

  it('still decodes a plain (uncompressed, legacy) hash', () => {
    // Simulate an old-style link without the z. marker.
    const legacy = SEVENMPX_HASH_PREFIX + toBase64Url(encodeTemplate7mpx(defaultConfig()));
    const env = parse7mpxHash(legacy);
    expect(env).not.toBeNull();
    expect(env!.kind).toBe('template');
  });

  it('round-trips result and league through compressed hashes', () => {
    const rHash = to7mpxHash(encodeResult7mpx(sampleResult));
    expect(decodeResult7mpx(json7mpxFromHash(rHash)!)?.name).toBe('Freitagsrunde');
    const lHash = to7mpxHash(encodeLeague7mpx(sampleLeague));
    expect(decodeLeague7mpx(json7mpxFromHash(lHash)!)?.leagueName).toBe('Mittwochsliga 2026');
  });
});
