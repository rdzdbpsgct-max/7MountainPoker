// 7MPX — 7Mountain Poker Interchange Format v1
// Shared JSON exchange format between the web app and the native iOS app.
// Spec: docs/7mpx-v1.md (kept identical in both repos).
//
// Three payload kinds: 'template' (TournamentConfig), 'result' (TournamentResult),
// 'league' (standings snapshot). Transported as JSON file, clipboard text, or a
// Base64URL-encoded `#7mpx=` hash for QR / deep links.

import type {
  TournamentConfig,
  TournamentResult,
  PlayerResult,
  PointSystem,
  Currency,
} from './types';
import { parseConfigObject } from './configPersistence';
import { generateId, generatePlayerId } from './helpers';

export const SEVENMPX_FMT = '7mpx' as const;
export const SEVENMPX_VERSION = 1 as const;
export const SEVENMPX_HASH_PREFIX = '#7mpx=';
/** Hard cap on accepted payload size (defensive, matches QR/URL limits). */
const MAX_ENCODED_BYTES = 64 * 1024;

export type SevenMpxKind = 'template' | 'result' | 'league';

export interface SevenMpxLeaguePayload {
  name: string;
  pointSystem?: PointSystem;
  standings: Array<{
    rank: number;
    name: string;
    points: number;
    tournaments: number;
    wins: number;
    netBalance: number;
  }>;
}

export interface SevenMpxEnvelope {
  fmt: typeof SEVENMPX_FMT;
  v: number;
  kind: SevenMpxKind;
  app?: { src: string; ver: string } | undefined;
  createdAt?: string | undefined;
  payload: unknown;
}

const APP_ORIGIN = { src: 'web', ver: '7.1.0' };
const VALID_KINDS: ReadonlySet<string> = new Set(['template', 'result', 'league']);
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// ---------------------------------------------------------------------------
// Base64URL (UTF-8 safe) — for #7mpx= hash / QR transport
// ---------------------------------------------------------------------------

export function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(encoded: string): string {
  const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

function wrap(kind: SevenMpxKind, payload: unknown, pretty: boolean): string {
  const envelope: SevenMpxEnvelope = {
    fmt: SEVENMPX_FMT,
    v: SEVENMPX_VERSION,
    kind,
    app: APP_ORIGIN,
    payload,
  };
  return pretty ? JSON.stringify(envelope, null, 2) : JSON.stringify(envelope);
}

/** Encode a tournament template (config) as a 7MPX JSON string. */
export function encodeTemplate7mpx(config: TournamentConfig, pretty = false): string {
  return wrap('template', config, pretty);
}

/**
 * Encode a tournament result as a 7MPX JSON string.
 * When `forQR` is true, the (potentially large) event log is dropped and the
 * payload is flagged `truncated` so receivers know the log is incomplete.
 */
export function encodeResult7mpx(
  result: TournamentResult,
  options: { forQR?: boolean; pretty?: boolean } = {},
): string {
  const { forQR = false, pretty = false } = options;
  let payload: (TournamentResult & { truncated?: boolean }) | Record<string, unknown> = result;
  if (forQR && ((result.events && result.events.length > 0) || result.configSnapshot)) {
    const rest: Record<string, unknown> = { ...result };
    delete rest.events;
    delete rest.configSnapshot;
    rest.truncated = true;
    payload = rest;
  }
  return wrap('result', payload, pretty);
}

/** Encode a league standings snapshot as a 7MPX JSON string. */
export function encodeLeague7mpx(payload: SevenMpxLeaguePayload, pretty = false): string {
  return wrap('league', payload, pretty);
}

/** Wrap any 7MPX JSON string into a `#7mpx=<base64url>` hash for QR / links. */
export function to7mpxHash(json: string): string {
  return SEVENMPX_HASH_PREFIX + toBase64Url(json);
}

// ---------------------------------------------------------------------------
// Decoding & validation
// ---------------------------------------------------------------------------

function stripDangerousKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripDangerousKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (DANGEROUS_KEYS.has(k)) continue;
      out[k] = stripDangerousKeys(v);
    }
    return out;
  }
  return value;
}

/**
 * Parse & validate a 7MPX envelope from a JSON string.
 * Returns the envelope (payload still raw) or null if the wrapper is invalid
 * or the format version is newer than supported.
 */
export function decode7mpx(input: string): SevenMpxEnvelope | null {
  try {
    if (typeof input !== 'string' || input.length > MAX_ENCODED_BYTES) return null;
    const parsed = stripDangerousKeys(JSON.parse(input)) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.fmt !== SEVENMPX_FMT) return null;
    if (typeof parsed.v !== 'number' || parsed.v > SEVENMPX_VERSION) return null;
    if (typeof parsed.kind !== 'string' || !VALID_KINDS.has(parsed.kind)) return null;
    if (!parsed.payload || typeof parsed.payload !== 'object') return null;
    return {
      fmt: SEVENMPX_FMT,
      v: parsed.v,
      kind: parsed.kind as SevenMpxKind,
      app: parsed.app as { src: string; ver: string } | undefined,
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : undefined,
      payload: parsed.payload,
    };
  } catch {
    return null;
  }
}

/** Decode a `#7mpx=` hash (or raw base64url) into an envelope. */
export function parse7mpxHash(hash: string): SevenMpxEnvelope | null {
  try {
    if (typeof hash !== 'string') return null;
    const encoded = hash.startsWith(SEVENMPX_HASH_PREFIX)
      ? hash.slice(SEVENMPX_HASH_PREFIX.length)
      : hash.startsWith('7mpx=')
        ? hash.slice('7mpx='.length)
        : hash;
    if (!encoded) return null;
    return decode7mpx(fromBase64Url(decodeURIComponent(encoded)));
  } catch {
    return null;
  }
}

/**
 * Decode a 7MPX template into a validated TournamentConfig (or null).
 *
 * The interchange format intentionally omits instance-specific `id` fields on
 * levels and players (they are device-local). We generate fresh ids here before
 * handing the object to parseConfigObject, which requires them.
 */
export function decodeTemplate7mpx(input: string): TournamentConfig | null {
  const env = decode7mpx(input);
  if (!env || env.kind !== 'template') return null;
  const raw = env.payload as Record<string, unknown>;
  const hydrated: Record<string, unknown> = { ...raw };
  if (Array.isArray(raw.levels)) {
    hydrated.levels = raw.levels.map((lvl) => {
      const l = (lvl && typeof lvl === 'object' ? lvl : {}) as Record<string, unknown>;
      return { ...l, id: typeof l.id === 'string' && l.id ? l.id : generateId() };
    });
  }
  if (Array.isArray(raw.players)) {
    hydrated.players = raw.players.map((plr) => {
      const p = (plr && typeof plr === 'object' ? plr : {}) as Record<string, unknown>;
      return { ...p, id: typeof p.id === 'string' && p.id ? p.id : generatePlayerId() };
    });
  }
  return parseConfigObject(hydrated);
}

const CURRENCIES: ReadonlySet<string> = new Set(['EUR', 'USD', 'GBP', 'CHF', 'SEK']);

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

/** Decode a 7MPX result into a sanitized TournamentResult (or null). */
export function decodeResult7mpx(input: string): TournamentResult | null {
  const env = decode7mpx(input);
  if (!env || env.kind !== 'result') return null;
  const p = env.payload as Record<string, unknown>;
  if (typeof p.name !== 'string' || !Array.isArray(p.players)) return null;

  const players: PlayerResult[] = p.players.map((raw) => {
    const pr = raw as Record<string, unknown>;
    return {
      name: str(pr.name, '?'),
      place: num(pr.place, 0),
      payout: num(pr.payout, 0),
      rebuys: num(pr.rebuys, 0),
      addOn: pr.addOn === true,
      knockouts: num(pr.knockouts, 0),
      bountyEarned: num(pr.bountyEarned, 0),
      netBalance: num(pr.netBalance, 0),
    };
  });

  const currency = CURRENCIES.has(str(p.currency)) ? (p.currency as Currency) : undefined;

  const result: TournamentResult = {
    id: str(p.id, `7mpx_${players.length}`),
    name: str(p.name, 'Tournament'),
    date: str(p.date, ''),
    playerCount: num(p.playerCount, players.length),
    buyIn: num(p.buyIn, 0),
    prizePool: num(p.prizePool, 0),
    players,
    bountyEnabled: p.bountyEnabled === true,
    bountyAmount: num(p.bountyAmount, 0),
    rebuyEnabled: p.rebuyEnabled === true,
    totalRebuys: num(p.totalRebuys, 0),
    addOnEnabled: p.addOnEnabled === true,
    totalAddOns: num(p.totalAddOns, 0),
    elapsedSeconds: num(p.elapsedSeconds, 0),
    levelsPlayed: num(p.levelsPlayed, 0),
    ...(currency ? { currency } : {}),
    ...(typeof p.dealApplied === 'boolean' ? { dealApplied: p.dealApplied } : {}),
  };
  return result;
}

/** Decode a 7MPX league snapshot into `{ leagueName, standings }` (or null). */
export function decodeLeague7mpx(
  input: string,
): { leagueName: string; standings: SevenMpxLeaguePayload['standings'] } | null {
  const env = decode7mpx(input);
  if (!env || env.kind !== 'league') return null;
  const p = env.payload as Record<string, unknown>;
  if (typeof p.name !== 'string' || !Array.isArray(p.standings)) return null;
  const standings = p.standings
    .map((raw) => {
      const s = raw as Record<string, unknown>;
      const name = str(s.name);
      if (!name) return null;
      return {
        rank: num(s.rank, 0),
        name,
        points: num(s.points, 0),
        tournaments: num(s.tournaments, 0),
        wins: num(s.wins, 0),
        netBalance: num(s.netBalance, 0),
      };
    })
    .filter(<T>(v: T | null): v is T => v !== null)
    .slice(0, 500);
  if (standings.length === 0) return null;
  return { leagueName: p.name, standings };
}
