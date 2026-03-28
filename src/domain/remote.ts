/**
 * PeerJS-based remote control for poker tournament timer.
 *
 * Architecture:
 * - Host (TV/main display): creates PeerJS peer, shows QR code with short URL
 * - Controller (smartphone): scans QR → opens app → connects via PeerJS → sends commands
 * - Data channel: bidirectional JSON messages over WebRTC (brokered by PeerJS Cloud)
 * - Security: HMAC-SHA256 authentication on all commands, rate-limiting, message-size caps
 *
 * Signaling flow:
 * 1. Host creates Peer with generated ID (PKR-XXXXXXXX) and a 16-byte random secret
 * 2. QR code contains app URL with #remote=PKR-XXXXXXXX&s=BASE64SECRET hash
 * 3. Phone scans QR → opens app → auto-connects to host peer
 * 4. Controller signs every command with HMAC-SHA256(secret, payload)
 * 5. Host verifies HMAC — rejects unsigned or tampered messages
 *
 * One QR scan — no second scan or paste required.
 */

import type PeerType from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { RemoteRole } from './types';

/** Instance type alias for the dynamically-loaded Peer class. */
type Peer = InstanceType<typeof PeerType>;

// ---------------------------------------------------------------------------
// Lazy PeerJS import — PeerJS (~117 KB) is only loaded when needed
// ---------------------------------------------------------------------------

let PeerConstructor: typeof PeerType | null = null;

async function getPeerConstructor(): Promise<typeof PeerType> {
  if (!PeerConstructor) {
    const mod = await import('peerjs');
    PeerConstructor = mod.default;
  }
  return PeerConstructor;
}

// ---------------------------------------------------------------------------
// Peer ID generation
// ---------------------------------------------------------------------------

/** Alphabet without confusable characters (no I, O, 0, 1) */
const PEER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PEER_ID_LENGTH = 8;
const PEER_PREFIX = 'PKR-';

/** Generate a readable peer ID like "PKR-X7K3MN2P" */
export function generatePeerId(): string {
  let id = '';
  const array = new Uint8Array(PEER_ID_LENGTH);
  crypto.getRandomValues(array);
  for (let i = 0; i < PEER_ID_LENGTH; i++) {
    id += PEER_ALPHABET[array[i]! % PEER_ALPHABET.length];
  }
  return PEER_PREFIX + id;
}

// ---------------------------------------------------------------------------
// HMAC-SHA256 authentication (M31)
// ---------------------------------------------------------------------------

const SECRET_BYTES = 16;
/** Max age for a signed message timestamp (30 seconds) */
const MAX_MESSAGE_AGE_MS = 30_000;

/** Maximum simultaneous controller connections */
export const MAX_CONTROLLERS = 4;
/** Maximum simultaneous display connections */
export const MAX_DISPLAYS = 8;

/** Generate a 16-byte random secret, returned as URL-safe base64 */
export function generateSecret(): string {
  const bytes = new Uint8Array(SECRET_BYTES);
  crypto.getRandomValues(bytes);
  // Convert to base64 (URL-safe: replace + → -, / → _)
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Import a base64 secret into a CryptoKey for HMAC operations */
async function importHmacKey(secretB64: string): Promise<CryptoKey> {
  // Reverse URL-safe base64
  const b64 = secretB64.replace(/-/g, '+').replace(/_/g, '/');
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** Sign a payload string with HMAC-SHA256, returning hex digest */
export async function signMessage(key: CryptoKey, payload: string): Promise<string> {
  const encoded = new TextEncoder().encode(payload);
  const sig = await crypto.subtle.sign('HMAC', key, encoded);
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Verify an HMAC-SHA256 signature against a payload */
export async function verifyMessage(key: CryptoKey, payload: string, signature: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  const sigBytes = new Uint8Array(signature.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const encoded = new TextEncoder().encode(payload);
  return crypto.subtle.verify('HMAC', key, sigBytes, encoded);
}

/** Build the canonical payload string for HMAC: "type:action:timestamp" */
export function buildHmacPayload(action: string, ts: number, payload?: Record<string, unknown>): string {
  const payloadStr = payload ? JSON.stringify(payload, Object.keys(payload).sort()) : '';
  return `command:${action}:${ts}:${payloadStr}`;
}

// ---------------------------------------------------------------------------
// Rate limiting (M32)
// ---------------------------------------------------------------------------

/** Max message size in bytes */
export const MAX_MESSAGE_SIZE = 1024;
/** Max commands per second */
const MAX_COMMANDS_PER_SECOND = 10;

/** Sliding-window rate limiter */
export class RateLimiter {
  private timestamps: number[] = [];
  private windowMs: number;
  private maxCount: number;

  constructor(maxPerSecond: number = MAX_COMMANDS_PER_SECOND) {
    this.windowMs = 1000;
    this.maxCount = maxPerSecond;
  }

  /** Returns true if the request is allowed, false if throttled */
  allow(): boolean {
    const now = Date.now();
    // Evict timestamps older than the window
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    if (this.timestamps.length >= this.maxCount) {
      return false;
    }
    this.timestamps.push(now);
    return true;
  }

  /** Reset the limiter */
  reset(): void {
    this.timestamps = [];
  }
}

// ---------------------------------------------------------------------------
// Host session persistence (survives page refresh via sessionStorage)
// ---------------------------------------------------------------------------

const SESSION_PEER_ID_KEY = 'poker-remote-peerId';
const SESSION_SECRET_KEY = 'poker-remote-secret';

/** Persist host peerId and secret to sessionStorage (tab lifetime). */
export function persistHostSession(peerId: string, secret: string): void {
  try {
    sessionStorage.setItem(SESSION_PEER_ID_KEY, peerId);
    sessionStorage.setItem(SESSION_SECRET_KEY, secret);
  } catch {
    // Private browsing or quota exceeded — ignore
  }
}

/** Load a previously persisted host session. Returns null if nothing stored. */
export function loadHostSession(): { peerId: string; secret: string } | null {
  try {
    const peerId = sessionStorage.getItem(SESSION_PEER_ID_KEY);
    const secret = sessionStorage.getItem(SESSION_SECRET_KEY);
    if (peerId && secret) {
      return { peerId, secret };
    }
  } catch {
    // Private browsing — ignore
  }
  return null;
}

/** Remove persisted host session from sessionStorage. */
export function clearHostSession(): void {
  try {
    sessionStorage.removeItem(SESSION_PEER_ID_KEY);
    sessionStorage.removeItem(SESSION_SECRET_KEY);
  } catch {
    // Private browsing — ignore
  }
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/** Build a scannable app URL with the peer ID and secret as hash parameters */
export function buildRemoteUrl(peerId: string, secret?: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const hash = secret ? `#remote=${peerId}&s=${secret}` : `#remote=${peerId}`;
  return `${window.location.origin}${base}${hash}`;
}

/** Parse result from URL hash */
export interface RemoteHashResult {
  peerId: string;
  secret: string | null;
  role: RemoteRole;
}

/** Extract peer ID, optional secret, and optional role from URL hash */
export function parseRemoteHash(hash: string): RemoteHashResult | null {
  if (!hash.startsWith('#remote=')) return null;
  const rest = hash.slice('#remote='.length).trim();

  // Parse using URLSearchParams for robust multi-param support
  // The first segment before any & is the peer ID
  const firstAmp = rest.indexOf('&');
  let idPart: string;
  let params: URLSearchParams;

  if (firstAmp !== -1) {
    idPart = rest.slice(0, firstAmp);
    params = new URLSearchParams(rest.slice(firstAmp + 1));
  } else {
    idPart = rest;
    params = new URLSearchParams();
  }

  // Validate format: PKR- followed by 8 alphanumeric chars
  if (!/^PKR-[A-Z2-9]{8}$/.test(idPart)) {
    return null;
  }

  // Extract secret (param key: s)
  const secret = params.get('s') || null;

  // Extract role (param key: role) — default to 'admin'
  const roleParam = params.get('role');
  const role: RemoteRole = roleParam === 'viewer' ? 'viewer' : 'admin';

  return { peerId: idPart, secret, role };
}

/* ── Display URL helpers ──────────────────────────────────── */

export interface DisplayHashResult {
  peerId: string;
}

export function buildDisplayUrl(peerId: string): string {
  const base = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : 'https://7mountainpoker.vercel.app/';
  return `${base}#display=${peerId}`;
}

export function parseDisplayHash(hash: string): DisplayHashResult | null {
  if (!hash.startsWith('#display=')) return null;
  const peerId = hash.slice('#display='.length);
  if (!/^PKR-[A-Z2-9]{8}$/.test(peerId)) return null;
  return { peerId };
}

/* ── Hello handshake protocol ─────────────────────────────── */

export type SessionRole = 'display' | 'remote';

export interface HelloMessage {
  type: 'hello';
  role: SessionRole;
  version: number;
  /** Remote role for controller connections — admin (full control) or viewer (read-only) */
  remoteRole?: RemoteRole | undefined;
}

export function isHelloMessage(msg: unknown): msg is HelloMessage {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;
  return (
    m.type === 'hello' &&
    (m.role === 'display' || m.role === 'remote') &&
    typeof m.version === 'number'
  );
}

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

/** Commands sent from Controller → Host */
export interface RemoteCommand {
  type: 'command';
  action:
    | 'play'
    | 'pause'
    | 'toggle'
    | 'next'
    | 'prev'
    | 'reset'
    | 'call-the-clock'
    | 'advanceDealer'
    | 'toggleSound'
    | 'eliminatePlayer'
    | 'rebuyPlayer'
    | 'addOnPlayer'
    | 'skipBreak'
    | 'extendBreak'
    | 'requestState';
  payload?: Record<string, unknown> | undefined;
  /** HMAC-SHA256 signature (hex) — required when secret is configured */
  hmac?: string | undefined;
  /** Timestamp (ms since epoch) — used for HMAC replay protection */
  ts?: number | undefined;
}

/** Compact player info sent in RemoteState (short field names for message size) */
export interface RemotePlayerInfo {
  /** Player ID (needed for commands) */
  id: string;
  /** Display name (truncated to 15 chars for size) */
  n: string;
  /** 'a' = active, 'e' = eliminated */
  s: 'a' | 'e';
  /** Current rebuy count */
  r: number;
  /** Has add-on */
  ao: boolean;
}

/** State updates sent from Host → Controller */
export interface RemoteState {
  type: 'state';
  version: number;
  /** Contract version for mismatch detection across app versions */
  _v: number;
  data: {
    timerStatus: 'running' | 'paused' | 'finished';
    remainingSeconds: number;
    currentLevelIndex: number;
    levelLabel: string;
    smallBlind: number;
    bigBlind: number;
    ante?: number | undefined;
    activePlayerCount: number;
    totalPlayerCount: number;
    isBubble: boolean;
    tournamentName?: string | undefined;
    soundEnabled?: boolean | undefined;
    /** Compact player list for remote player management */
    players?: RemotePlayerInfo[] | undefined;
    /** Whether bounty is enabled (controller needs for eliminator selection) */
    bountyEnabled?: boolean | undefined;
    /** Whether rebuy phase is currently active */
    rebuyActive?: boolean | undefined;
    /** Whether add-on window is currently open */
    addOnWindowOpen?: boolean | undefined;
    /** Prize pool in currency units */
    prizePool?: number | undefined;
    /** Average stack in big blinds (1 decimal) */
    avgStackBB?: number | undefined;
    /** Tournament elapsed time in seconds */
    elapsedSeconds?: number | undefined;
    /** Next level description, e.g. "Level 5: 200/400" or "Pause 10 Min" */
    nextLevelLabel?: string | undefined;
    /** Whether current level is a break */
    isBreak?: boolean | undefined;
    /** Whether players are in the money */
    isItm?: boolean | undefined;
  };
}

/** Ping/pong for keepalive */
export interface RemotePing {
  type: 'ping' | 'pong';
}

export type RemoteMessage = RemoteCommand | RemoteState | RemotePing;

export const REMOTE_STATE_CONTRACT_VERSION = 2;

/** Valid command actions for whitelist validation */
const VALID_COMMAND_ACTIONS: ReadonlySet<RemoteCommand['action']> = new Set([
  'play', 'pause', 'toggle', 'next', 'prev', 'reset',
  'call-the-clock', 'advanceDealer', 'toggleSound',
  'eliminatePlayer', 'rebuyPlayer', 'addOnPlayer',
  'skipBreak', 'extendBreak',
  'requestState',
]);

export type HostStatus = 'initializing' | 'ready' | 'connected' | 'error';
export type ControllerStatus = 'connecting' | 'connected' | 'reconnecting' | 'error';

// ---------------------------------------------------------------------------
// Remote Host (TV/Main Display)
// ---------------------------------------------------------------------------

export interface RemoteHostCallbacks {
  onCommand: (cmd: RemoteCommand) => void;
  onStatusChange: (status: HostStatus) => void;
  onError?: ((error: string) => void) | undefined;
  onDisplayCountChange?: ((count: number) => void) | undefined;
  onControllerCountChange?: ((count: number) => void) | undefined;
  /** Called when a new display peer connects — host should push full DisplayMessage */
  onDisplayConnected?: (() => void) | undefined;
}

export interface RemoteHostOptions {
  /** Re-use an existing peer ID (e.g. from a persisted session) */
  peerId?: string;
  /** Re-use an existing secret (e.g. from a persisted session) */
  secret?: string;
}

export class RemoteHost {
  private peer: Peer | null = null;
  /** Connected controller peers (smartphones) with their role */
  private controllerConns: Map<string, { conn: DataConnection; role: RemoteRole }> = new Map();
  /** Timestamp of last received pong per peer (for stale connection detection) */
  private lastPongTime: Map<string, number> = new Map();
  /** Maximum time without a pong before closing a connection (10 min = 60 missed pings).
   *  Long timeout because the admin is actively playing poker and doesn't interact
   *  with the remote every few seconds. */
  private static readonly STALE_CONNECTION_MS = 600_000;
  private callbacks: RemoteHostCallbacks;
  private keepaliveInterval: ReturnType<typeof setInterval> | null = null;
  private _status: HostStatus = 'initializing';
  private _peerId: string;
  private _secret: string;
  private _resumed: boolean;
  private hmacKey: CryptoKey | null = null;
  private hmacKeyReady: Promise<void>;
  private rateLimiter = new RateLimiter();
  /** Most recently built state message for immediate snapshot on reconnect */
  private lastBuiltState: RemoteState | null = null;
  /** Most recently sent display message for immediate snapshot on display connect */
  private lastDisplayMessage: string | null = null;
  /** Connected display peers (TV windows, projectors) */
  private displayConnections: Map<string, DataConnection> = new Map();

  constructor(callbacks: RemoteHostCallbacks, options?: RemoteHostOptions) {
    this.callbacks = callbacks;
    this._peerId = options?.peerId || generatePeerId();
    this._secret = options?.secret || generateSecret();
    this._resumed = !!(options?.peerId && options?.secret);
    persistHostSession(this._peerId, this._secret);
    this.hmacKeyReady = this.initHmacKey();
    void this.init();
  }

  get peerId(): string {
    return this._peerId;
  }

  get secret(): string {
    return this._secret;
  }

  get status(): HostStatus {
    return this._status;
  }

  get connected(): boolean {
    return this._status === 'connected';
  }

  /** Number of currently connected controller peers */
  get controllerCount(): number {
    return this.controllerConns.size;
  }

  /** True if this host was created from a persisted session (page refresh). */
  get resumed(): boolean {
    return this._resumed;
  }

  /** Number of currently connected display peers */
  get displayCount(): number {
    return this.displayConnections.size;
  }

  /** Register a handler for when a display peer connects. */
  setDisplayConnectedHandler(handler: (() => void) | undefined): void {
    this.callbacks.onDisplayConnected = handler;
  }

  private async initHmacKey(): Promise<void> {
    try {
      this.hmacKey = await importHmacKey(this._secret);
    } catch {
      console.warn('[remote] Failed to init HMAC key');
    }
  }

  private setStatus(status: HostStatus): void {
    this._status = status;
    this.callbacks.onStatusChange(status);
  }

  private async init(): Promise<void> {
    try {
      const Peer = await getPeerConstructor();
      this.peer = new Peer(this._peerId);

      this.peer.on('open', () => {
        this.setStatus('ready');
      });

      this.peer.on('connection', (conn) => {
        // Connection limit guard — reject if both pools are full
        const totalConns = this.controllerConns.size + this.displayConnections.size;
        if (totalConns >= MAX_CONTROLLERS + MAX_DISPLAYS) {
          console.warn(`[RemoteHost] Connection rejected — limit reached (${totalConns})`);
          try { conn.close(); } catch { /* ignore */ }
          return;
        }

        // Wait for first message to determine role (hello handshake)
        let identified = false;

        const onFirstData = (raw: unknown) => {
          if (identified) return;
          try {
            const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (isHelloMessage(msg) && msg.role === 'display') {
              // Display peer — register and set up close handler
              if (this.displayConnections.size >= MAX_DISPLAYS) {
                console.warn(`[RemoteHost] Display connection rejected — limit reached`);
                identified = true;  // prevent timeout from re-registering as controller
                try { conn.close(); } catch { /* ignore */ }
                return;
              }
              identified = true;
              conn.off('data', onFirstData);
              this.displayConnections.set(conn.peer, conn);
              this.lastPongTime.set(conn.peer, Date.now());
              this.callbacks.onDisplayCountChange?.(this.displayConnections.size);

              conn.on('data', (d) => {
                // Display peers only send pongs
                try {
                  const m = typeof d === 'string' ? JSON.parse(d) : d;
                  if (m.type === 'pong') { this.lastPongTime.set(conn.peer, Date.now()); }
                } catch { /* ignore */ }
              });

              conn.on('close', () => {
                this.displayConnections.delete(conn.peer);
                this.callbacks.onDisplayCountChange?.(this.displayConnections.size);
              });

              conn.on('error', () => {
                this.displayConnections.delete(conn.peer);
                this.callbacks.onDisplayCountChange?.(this.displayConnections.size);
              });

              // Send immediate display state snapshot (correct DisplayMessage format)
              if (this.lastDisplayMessage && conn.open) {
                try { void conn.send(this.lastDisplayMessage); } catch { /* ignore */ }
              }
              // Notify host to build and push fresh full-state
              this.callbacks.onDisplayConnected?.();
              return;
            }
            if (isHelloMessage(msg) && msg.role === 'remote') {
              // Remote controller hello — add to controller map
              if (this.controllerConns.size >= MAX_CONTROLLERS) {
                console.warn(`[RemoteHost] Controller connection rejected — limit reached`);
                identified = true;  // prevent timeout from re-registering as controller
                try { conn.close(); } catch { /* ignore */ }
                return;
              }
              identified = true;
              conn.off('data', onFirstData);
              const remoteRole: RemoteRole = msg.remoteRole === 'viewer' ? 'viewer' : 'admin';
              this.controllerConns.set(conn.peer, { conn, role: remoteRole });
              this.lastPongTime.set(conn.peer, Date.now());
              this.setupControllerConnection(conn);
              // Connection is already open at hello time — PeerJS won't re-fire 'open'.
              // Manually trigger what on('open') would have done:
              if (conn.open) {
                this.setStatus('connected');
                this.startKeepalive();
                this.rateLimiter.reset();
                this.callbacks.onControllerCountChange?.(this.controllerConns.size);
              }
              // Send immediate state snapshot
              if (this.lastBuiltState && conn.open) {
                try { void conn.send(JSON.stringify(this.lastBuiltState)); } catch { /* ignore */ }
              }
              return;
            }
          } catch { /* not a hello — fall through to remote */ }

          // No hello at all → treat as legacy remote controller (admin by default)
          if (this.controllerConns.size >= MAX_CONTROLLERS) {
            console.warn(`[RemoteHost] Controller connection rejected — limit reached`);
            identified = true;  // prevent timeout from re-registering as controller
            try { conn.close(); } catch { /* ignore */ }
            return;
          }
          identified = true;
          conn.off('data', onFirstData);
          this.controllerConns.set(conn.peer, { conn, role: 'admin' });
          this.lastPongTime.set(conn.peer, Date.now());
          this.setupControllerConnection(conn);
          // Connection is already open (data was received) — manually activate
          if (conn.open) {
            this.setStatus('connected');
            this.startKeepalive();
            this.rateLimiter.reset();
            this.callbacks.onControllerCountChange?.(this.controllerConns.size);
          }
          // Re-process this first message through normal handler
          this.handleIncoming(raw, conn);
        };

        conn.on('data', onFirstData);

        // Timeout: if no hello within 2s, assume remote controller
        setTimeout(() => {
          if (!identified) {
            if (this.controllerConns.size >= MAX_CONTROLLERS) {
              console.warn(`[RemoteHost] Controller connection rejected — limit reached`);
              identified = true;  // prevent double registration
              try { conn.close(); } catch { /* ignore */ }
              return;
            }
            identified = true;
            conn.off('data', onFirstData);
            this.controllerConns.set(conn.peer, { conn, role: 'admin' });
            this.lastPongTime.set(conn.peer, Date.now());
            this.setupControllerConnection(conn);
            // Connection may already be open — manually activate
            if (conn.open) {
              this.setStatus('connected');
              this.startKeepalive();
              this.rateLimiter.reset();
              this.callbacks.onControllerCountChange?.(this.controllerConns.size);
            }
          }
        }, 2000);
      });

      this.peer.on('error', (err) => {
        // If ID is taken, generate a new one and retry
        if (err.type === 'unavailable-id') {
          this._peerId = generatePeerId();
          this._resumed = false;
          persistHostSession(this._peerId, this._secret);
          this.peer?.destroy();
          this.peer = null;
          void this.init();
          return;
        }
        this.setStatus('error');
        this.callbacks.onError?.(err.message || 'Connection error');
      });

      this.peer.on('disconnected', () => {
        // Try to reconnect to signaling server
        if (this.peer && !this.peer.destroyed) {
          try {
            this.peer.reconnect();
          } catch {
            // Already destroyed
          }
        }
      });
    } catch {
      this.setStatus('error');
      this.callbacks.onError?.('Failed to create peer');
    }
  }

  private setupControllerConnection(conn: DataConnection): void {
    conn.on('open', () => {
      // Preserve existing role if already registered (from hello handshake)
      const existing = this.controllerConns.get(conn.peer);
      this.controllerConns.set(conn.peer, { conn, role: existing?.role ?? 'admin' });
      this.lastPongTime.set(conn.peer, Date.now());
      this.setStatus('connected');
      this.startKeepalive();
      this.rateLimiter.reset();
      this.callbacks.onControllerCountChange?.(this.controllerConns.size);
      // Send immediate state snapshot so controller doesn't wait for next periodic update
      if (this.lastBuiltState && conn.open) {
        try {
          void conn.send(JSON.stringify(this.lastBuiltState));
        } catch {
          // Connection not ready yet
        }
      }
    });

    conn.on('data', (raw) => {
      this.handleIncoming(raw, conn);
    });

    conn.on('close', () => {
      this.controllerConns.delete(conn.peer);
      this.lastPongTime.delete(conn.peer);
      this.callbacks.onControllerCountChange?.(this.controllerConns.size);
      // If no controllers left, go back to 'ready'
      if (this.controllerConns.size === 0) {
        this.stopKeepalive();
        if (this._status !== 'error') {
          this.setStatus('ready');
        }
      }
    });

    conn.on('error', () => {
      this.controllerConns.delete(conn.peer);
      this.lastPongTime.delete(conn.peer);
      this.callbacks.onControllerCountChange?.(this.controllerConns.size);
      if (this.controllerConns.size === 0) {
        this.stopKeepalive();
        if (this._status !== 'error') {
          this.setStatus('ready');
        }
      }
    });
  }

  private handleIncoming(raw: unknown, conn?: DataConnection): void {
    try {
      const str = typeof raw === 'string' ? raw : JSON.stringify(raw);

      // M32: Message-size check (max 1KB)
      if (str.length > MAX_MESSAGE_SIZE) {
        console.warn(`[remote] Message rejected: size ${str.length} exceeds ${MAX_MESSAGE_SIZE}`);
        return;
      }

      const msg = (typeof raw === 'string' ? JSON.parse(raw) : raw) as RemoteMessage;

      if (msg.type === 'pong') {
        // Pong tracking handled in connection-level data handler (where conn is available)
        return;
      }

      if (msg.type === 'command' && VALID_COMMAND_ACTIONS.has(msg.action)) {
        // M32: Rate-limit commands
        if (!this.rateLimiter.allow()) {
          console.warn('[remote] Command throttled (rate limit exceeded)');
          return;
        }

        // M31: HMAC verification (async)
        void this.verifyAndDispatch(msg, conn);
      }
    } catch {
      // Invalid message
    }
  }

  private async verifyAndDispatch(msg: RemoteCommand, conn?: DataConnection): Promise<void> {
    // Ensure HMAC key is ready before verifying
    await this.hmacKeyReady;

    // Fail-closed: if secret was provided but key init failed, reject all commands
    if (this._secret && !this.hmacKey) {
      console.warn('[remote] Command rejected: HMAC key unavailable');
      return;
    }

    // If HMAC key is available, require valid signature
    if (this.hmacKey) {
      if (!msg.hmac || msg.ts == null) {
        console.warn('[remote] Command rejected: missing HMAC or timestamp');
        return;
      }

      // Check timestamp freshness (prevent replay attacks)
      const age = Math.abs(Date.now() - msg.ts);
      if (age > MAX_MESSAGE_AGE_MS) {
        console.warn(`[remote] Command rejected: timestamp too old (${age}ms)`);
        return;
      }

      const hmacPayload = buildHmacPayload(msg.action, msg.ts, msg.payload);
      const valid = await verifyMessage(this.hmacKey, hmacPayload, msg.hmac);
      if (!valid) {
        console.warn('[remote] Command rejected: invalid HMAC signature');
        return;
      }
    }

    // Validate payload structure per command
    if (msg.payload) {
      const p = msg.payload;
      if (msg.action === 'eliminatePlayer' && typeof p.playerId !== 'string') return;
      if (msg.action === 'rebuyPlayer' && typeof p.playerId !== 'string') return;
      if (msg.action === 'addOnPlayer' && typeof p.playerId !== 'string') return;
    }

    // requestState: send cached state immediately, no game action needed
    if (msg.action === 'requestState') {
      if (this.lastBuiltState && conn?.open) {
        try {
          void conn.send(JSON.stringify(this.lastBuiltState));
        } catch { /* ignore */ }
      }
      return;
    }

    // Role-based access control: viewers can only request state (handled above)
    if (conn) {
      const entry = this.controllerConns.get(conn.peer);
      if (entry?.role === 'viewer') {
        console.warn(`[remote] Viewer ${conn.peer} attempted ${msg.action} — denied`);
        return;
      }
    }

    this.callbacks.onCommand(msg);
  }

  private startKeepalive(): void {
    this.stopKeepalive();
    this.keepaliveInterval = setInterval(() => {
      const now = Date.now();
      const pingMsg = JSON.stringify({ type: 'ping' });

      // Ping all connected controllers + evict stale connections
      for (const [peerId, entry] of this.controllerConns) {
        const lastPong = this.lastPongTime.get(peerId) ?? now;
        if (now - lastPong > RemoteHost.STALE_CONNECTION_MS) {
          console.warn(`[RemoteHost] Evicting stale controller: ${peerId}`);
          this.controllerConns.delete(peerId);
          this.lastPongTime.delete(peerId);
          this.callbacks.onControllerCountChange?.(this.controllerConns.size);
          try { entry.conn.close(); } catch { /* ignore */ }
          continue;
        }
        if (entry.conn.open) {
          try { void entry.conn.send(pingMsg); } catch {
            this.controllerConns.delete(peerId);
            this.lastPongTime.delete(peerId);
            this.callbacks.onControllerCountChange?.(this.controllerConns.size);
          }
        }
      }

      // Ping all connected displays + evict stale
      for (const [peerId, conn] of this.displayConnections) {
        const lastPong = this.lastPongTime.get(peerId) ?? now;
        if (now - lastPong > RemoteHost.STALE_CONNECTION_MS) {
          console.warn(`[RemoteHost] Evicting stale display: ${peerId}`);
          this.displayConnections.delete(peerId);
          this.lastPongTime.delete(peerId);
          this.callbacks.onDisplayCountChange?.(this.displayConnections.size);
          try { conn.close(); } catch { /* ignore */ }
          continue;
        }
        if (conn.open) {
          try { void conn.send(pingMsg); } catch {
            this.displayConnections.delete(peerId);
            this.lastPongTime.delete(peerId);
            this.callbacks.onDisplayCountChange?.(this.displayConnections.size);
          }
        }
      }
    }, 10_000);
  }

  private stopKeepalive(): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }
  }

  /** Send state update to all connected controllers */
  sendState(state: RemoteState['data']): void {
    const msg: RemoteState = {
      type: 'state',
      version: REMOTE_STATE_CONTRACT_VERSION,
      _v: REMOTE_STATE_CONTRACT_VERSION,
      data: state,
    };
    this.lastBuiltState = msg;
    if (this.controllerConns.size === 0) return;
    const json = JSON.stringify(msg);
    for (const [peerId, entry] of this.controllerConns) {
      if (entry.conn.open) {
        try { void entry.conn.send(json); } catch {
          // Connection lost — clean up
          this.controllerConns.delete(peerId);
          this.callbacks.onControllerCountChange?.(this.controllerConns.size);
        }
      }
    }
  }

  /** Broadcast a state payload to all connected display peers */
  sendDisplayState(payload: unknown): void {
    const json = JSON.stringify(payload);
    // Cache last display message for immediate snapshot on new display connect
    this.lastDisplayMessage = json;
    if (this.displayConnections.size === 0) return;
    for (const [peerId, conn] of this.displayConnections) {
      if (conn.open) {
        try { void conn.send(json); } catch {
          // Connection lost — clean up
          this.displayConnections.delete(peerId);
          this.callbacks.onDisplayCountChange?.(this.displayConnections.size);
        }
      }
    }
  }

  /** Close all connections and destroy peer */
  destroy(): void {
    this.stopKeepalive();
    clearHostSession();
    // Close all display connections
    for (const [, conn] of this.displayConnections) {
      try { conn.close(); } catch { /* ignore */ }
    }
    this.displayConnections.clear();
    // Close all controller connections
    for (const [, entry] of this.controllerConns) {
      try { entry.conn.close(); } catch { /* ignore */ }
    }
    this.controllerConns.clear();
    this.lastPongTime.clear();
    if (this.peer) {
      try { this.peer.destroy(); } catch { /* ignore */ }
      this.peer = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Remote Controller (Smartphone)
// ---------------------------------------------------------------------------

export interface RemoteControllerCallbacks {
  onState: (state: RemoteState['data']) => void;
  onStatusChange: (status: ControllerStatus) => void;
  onError?: ((error: string) => void) | undefined;
  /** Called when a state update has a different contract version than expected */
  onVersionMismatch?: (remoteVersion: number) => void;
}

export class RemoteController {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private callbacks: RemoteControllerCallbacks;
  private hostPeerId: string;
  private _status: ControllerStatus = 'connecting';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private secret: string | null;
  private hmacKey: CryptoKey | null = null;
  private hmacKeyReady: Promise<void>;
  private _role: RemoteRole;

  constructor(hostPeerId: string, callbacks: RemoteControllerCallbacks, secret?: string | null, role?: RemoteRole) {
    this.callbacks = callbacks;
    this.hostPeerId = hostPeerId;
    this.secret = secret ?? null;
    this._role = role ?? 'admin';
    this.hmacKeyReady = this.initHmacKey();
    void this.connect();
  }

  get role(): RemoteRole {
    return this._role;
  }

  get status(): ControllerStatus {
    return this._status;
  }

  get connected(): boolean {
    return this._status === 'connected';
  }

  private setStatus(status: ControllerStatus): void {
    this._status = status;
    this.callbacks.onStatusChange(status);
  }

  private async initHmacKey(): Promise<void> {
    if (this.secret) {
      try {
        this.hmacKey = await importHmacKey(this.secret);
      } catch {
        console.warn('[remote] Failed to init controller HMAC key');
      }
    }
  }

  private async connect(): Promise<void> {
    if (this.destroyed) return;

    try {
      const Peer = await getPeerConstructor();
      this.peer = new Peer();

      // 10s timeout: if 'open' never fires → set error status
      const openTimeout = setTimeout(() => {
        if (this.destroyed || this._status === 'connected') return;
        console.warn('[remote] Peer connection timeout after 10s');
        this.setStatus('error');
        this.callbacks.onError?.('Connection timeout');
      }, 10_000);

      this.peer.on('open', () => {
        clearTimeout(openTimeout);
        if (this.destroyed || !this.peer) return;
        // Connect to host
        const conn = this.peer.connect(this.hostPeerId, { reliable: true });
        this.conn = conn;
        this.setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        clearTimeout(openTimeout);
        if (this.destroyed) return;
        if (err.type === 'peer-unavailable') {
          // Host not found — try reconnect
          this.handleDisconnect();
          return;
        }
        this.setStatus('error');
        this.callbacks.onError?.(err.message || 'Connection error');
      });

      this.peer.on('disconnected', () => {
        if (this.destroyed) return;
        // 'disconnected' means the PeerJS signaling server connection dropped,
        // NOT the WebRTC data channel. If the data channel is still open,
        // just try to reconnect the signaling server — don't destroy the connection.
        if (this.conn?.open) {
          try { this.peer?.reconnect(); } catch { /* ignore */ }
          return;
        }
        this.handleDisconnect();
      });
    } catch {
      this.setStatus('error');
      this.callbacks.onError?.('Failed to create peer');
    }
  }

  private setupConnection(conn: DataConnection): void {
    conn.on('open', () => {
      // Send hello handshake with role
      const hello: HelloMessage = { type: 'hello', role: 'remote', version: 2, remoteRole: this._role };
      try { void conn.send(JSON.stringify(hello)); } catch { /* ignore */ }
      this.setStatus('connected');
      this.reconnectAttempts = 0;
      // Request full state snapshot on (re)connect
      void this.sendCommand('requestState');
    });

    conn.on('data', (raw) => {
      try {
        const msg = (typeof raw === 'string' ? JSON.parse(raw) : raw) as RemoteMessage;
        if (msg.type === 'state') {
          // Check contract version — notify UI on mismatch instead of silently dropping
          const remoteV = (msg as RemoteState)._v;
          if (remoteV != null && remoteV !== REMOTE_STATE_CONTRACT_VERSION) {
            this.callbacks.onVersionMismatch?.(remoteV);
            return;
          }
          if (msg.version !== REMOTE_STATE_CONTRACT_VERSION) return;
          this.callbacks.onState(msg.data);
        } else if (msg.type === 'ping') {
          // Reply to keepalive
          if (conn.open) {
            try {
              void conn.send(JSON.stringify({ type: 'pong' }));
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // Invalid message
      }
    });

    conn.on('close', () => {
      if (!this.destroyed) {
        this.handleDisconnect();
      }
    });

    conn.on('error', () => {
      if (!this.destroyed) {
        this.handleDisconnect();
      }
    });
  }

  private handleDisconnect(): void {
    if (this.destroyed) return;

    this.conn = null;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.setStatus('reconnecting');
      const delay = Math.pow(2, this.reconnectAttempts + 1) * 1000; // 2s, 4s, 8s
      this.reconnectTimer = setTimeout(() => {
        if (this.destroyed) return;
        this.reconnectAttempts++;
        // Destroy old peer and create fresh connection
        if (this.peer) {
          try { this.peer.destroy(); } catch { /* ignore */ }
          this.peer = null;
        }
        void this.connect();
      }, delay);
    } else {
      this.setStatus('error');
      this.callbacks.onError?.('Connection failed after multiple attempts');
    }
  }

  /** Retry connection (called manually after error) */
  retry(): void {
    this.reconnectAttempts = 0;
    this.destroyed = false;
    if (this.peer) {
      try { this.peer.destroy(); } catch { /* ignore */ }
      this.peer = null;
    }
    this.setStatus('connecting');
    void this.connect();
  }

  /** Send command to host (signed with HMAC if secret is configured) */
  async sendCommand(action: RemoteCommand['action'], payload?: Record<string, unknown>): Promise<void> {
    if (!this.conn?.open) return;
    // Ensure HMAC key is ready before signing
    await this.hmacKeyReady;
    try {
      const msg: RemoteCommand = { type: 'command', action, payload };

      // Sign with HMAC if key is available
      if (this.hmacKey) {
        const ts = Date.now();
        const hmacPayload = buildHmacPayload(action, ts, payload);
        const hmac = await signMessage(this.hmacKey, hmacPayload);
        msg.ts = ts;
        msg.hmac = hmac;
      }

      void this.conn.send(JSON.stringify(msg));
    } catch {
      // Connection lost
    }
  }

  /** Close the connection and destroy peer */
  destroy(): void {
    this.destroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.conn) {
      try { this.conn.close(); } catch { /* ignore */ }
      this.conn = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch { /* ignore */ }
      this.peer = null;
    }
  }
}
