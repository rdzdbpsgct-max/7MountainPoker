import type {
  TournamentConfig,
  TournamentCheckpoint,
  Settings,
  Player,
  Level,
  RebuyConfig,
  AddOnConfig,
  BountyConfig,
  ChipConfig,
  PayoutConfig,
  LateRegistrationConfig,
  Table,
  Seat,
  MultiTableConfig,
  DisplayScreenConfig,
} from './types';
import { parseCurrency } from './types';
import { generateBlindStructure } from './blinds';
import { generatePlayerId } from './helpers';
import { defaultChipConfig } from './chips';
import { defaultPayoutConfig } from './tournament';
import { defaultLateRegistrationConfig } from './validation';
import { defaultMultiTableConfig } from './tables';

// ---------------------------------------------------------------------------
// Checkpoint Schema Versioning
// ---------------------------------------------------------------------------

/**
 * Schema version for tournament checkpoints. Bump this when the checkpoint
 * shape changes in a way that would be incompatible with older versions.
 */
export const CHECKPOINT_SCHEMA_VERSION = 2;

// ---------------------------------------------------------------------------
// Default Configs
// ---------------------------------------------------------------------------

/** Create a default rebuy configuration with given buy-in and chip values. */
export function defaultRebuyConfig(buyIn = 10, startingChips = 20000): RebuyConfig {
  return {
    enabled: false,
    limitType: 'levels',
    levelLimit: 4,
    timeLimit: 3600,
    rebuyCost: buyIn,
    rebuyChips: startingChips,
  };
}

/** Create a default add-on configuration with given buy-in and chip values. */
export function defaultAddOnConfig(buyIn = 10, startingChips = 20000): AddOnConfig {
  return {
    enabled: false,
    cost: buyIn,
    chips: startingChips,
  };
}

/** Create a default bounty configuration (disabled, fixed type). */
export function defaultBountyConfig(): BountyConfig {
  return { enabled: false, amount: 5, type: 'fixed' };
}

/** Default TV Display Mode secondary screens (all enabled). */
export const DEFAULT_DISPLAY_SCREENS: DisplayScreenConfig[] = [
  { id: 'players', enabled: true },
  { id: 'stats', enabled: true },
  { id: 'payout', enabled: true },
  { id: 'schedule', enabled: true },
  { id: 'chips', enabled: true },
  { id: 'seating', enabled: true },
  { id: 'league', enabled: true },
];

/** Default rotation interval for TV Display Mode in seconds. */
export const DEFAULT_ROTATION_INTERVAL = 15;

/** Create default application settings (sound, voice, auto-advance all enabled). */
export function defaultSettings(): Settings {
  return {
    soundEnabled: true,
    countdownEnabled: true,
    autoAdvance: true,
    largeDisplay: true,
    voiceEnabled: true,
    volume: 100,
    callTheClockSeconds: 30,
  };
}

/**
 * Create a default tournament config with a generated "normal" blind structure.
 */
export function defaultConfig(): TournamentConfig {
  const buyIn = 10;
  const startingChips = 20000;
  return {
    name: '',
    anteEnabled: false,
    anteMode: 'standard',
    levels: generateBlindStructure({ startingChips, speed: 'normal', anteEnabled: false }),
    players: [] as Player[],
    dealerIndex: 0,
    payout: defaultPayoutConfig(),
    rebuy: defaultRebuyConfig(buyIn, startingChips),
    addOn: defaultAddOnConfig(buyIn, startingChips),
    bounty: defaultBountyConfig(),
    chips: defaultChipConfig(),
    buyIn,
    currency: 'EUR',
    startingChips,
  };
}

// ---------------------------------------------------------------------------
// Tournament Presets (Quick Start)
// ---------------------------------------------------------------------------

export interface TournamentPreset {
  id: string;
  nameKey: string;
  descKey: string;
  config: Partial<TournamentConfig>;
}

/**
 * Return 3 built-in tournament presets for quick start.
 * Each provides a complete tournament config (minus per-tournament fields).
 */
export function getBuiltInPresets(): TournamentPreset[] {
  return [
    {
      id: 'turbo',
      nameKey: 'preset.turbo',
      descKey: 'preset.turboDesc',
      config: {
        name: '',
        buyIn: 5,
        currency: 'EUR',
        startingChips: 10000,
        anteEnabled: false,
        anteMode: 'standard',
        levels: generateBlindStructure({ startingChips: 10000, speed: 'fast', anteEnabled: false }),
        payout: defaultPayoutConfig(),
        rebuy: defaultRebuyConfig(5, 10000),
        addOn: defaultAddOnConfig(5, 10000),
        bounty: defaultBountyConfig(),
        chips: defaultChipConfig(),
      },
    },
    {
      id: 'standard',
      nameKey: 'preset.standard',
      descKey: 'preset.standardDesc',
      config: {
        name: '',
        buyIn: 10,
        currency: 'EUR',
        startingChips: 20000,
        anteEnabled: false,
        anteMode: 'standard',
        levels: generateBlindStructure({ startingChips: 20000, speed: 'normal', anteEnabled: false }),
        payout: defaultPayoutConfig(),
        rebuy: { ...defaultRebuyConfig(10, 20000), enabled: true },
        addOn: defaultAddOnConfig(10, 20000),
        bounty: defaultBountyConfig(),
        chips: defaultChipConfig(),
      },
    },
    {
      id: 'deepstack',
      nameKey: 'preset.deepStack',
      descKey: 'preset.deepStackDesc',
      config: {
        name: '',
        buyIn: 20,
        currency: 'EUR',
        startingChips: 40000,
        anteEnabled: true,
        anteMode: 'standard',
        levels: generateBlindStructure({ startingChips: 40000, speed: 'slow', anteEnabled: true }),
        payout: defaultPayoutConfig(),
        rebuy: { ...defaultRebuyConfig(20, 40000), enabled: true },
        addOn: defaultAddOnConfig(20, 40000),
        bounty: defaultBountyConfig(),
        chips: defaultChipConfig(),
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Config Parsing
// ---------------------------------------------------------------------------

/** Strip prototype-pollution keys from a raw parsed object before spread. */
function sanitize<T extends Record<string, unknown>>(raw: T): T {
  const result = Object.create(null) as T;
  for (const key of Object.keys(raw)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    (result as Record<string, unknown>)[key] = raw[key];
  }
  return result;
}

/** Shared parser: normalizes a raw parsed object into a TournamentConfig. */
export function parseConfigObject(parsed: Record<string, unknown>): TournamentConfig | null {
  if (!parsed || !Array.isArray(parsed.levels)) return null;
  const buyIn = typeof parsed.buyIn === 'number' && parsed.buyIn >= 0 ? parsed.buyIn : 10;
  const startingChips = typeof parsed.startingChips === 'number' && parsed.startingChips > 0 ? parsed.startingChips : 20000;
  const rebuyRaw = parsed.rebuy as Record<string, unknown> | undefined;
  const rebuy: RebuyConfig = rebuyRaw
    ? {
        ...defaultRebuyConfig(buyIn, startingChips),
        ...sanitize(rebuyRaw as Partial<RebuyConfig> & Record<string, unknown>),
        rebuyCost: typeof rebuyRaw.rebuyCost === 'number' ? rebuyRaw.rebuyCost : buyIn,
        rebuyChips: typeof rebuyRaw.rebuyChips === 'number' ? rebuyRaw.rebuyChips : startingChips,
      }
    : defaultRebuyConfig(buyIn, startingChips);
  const addOnRaw = parsed.addOn as Record<string, unknown> | undefined;
  const addOn: AddOnConfig = addOnRaw
    ? {
        ...defaultAddOnConfig(buyIn, startingChips),
        ...sanitize(addOnRaw as Partial<AddOnConfig> & Record<string, unknown>),
        cost: typeof addOnRaw.cost === 'number' ? addOnRaw.cost : buyIn,
        chips: typeof addOnRaw.chips === 'number' ? addOnRaw.chips : startingChips,
      }
    : defaultAddOnConfig(buyIn, startingChips);
  // Validate individual level objects — filter out malformed entries
  const rawLevels = parsed.levels as Record<string, unknown>[];
  const validatedLevels = rawLevels.filter((l) =>
    l &&
    typeof l === 'object' &&
    typeof l.id === 'string' &&
    typeof l.durationSeconds === 'number' &&
    l.durationSeconds > 0 &&
    (l.type === 'level' || l.type === 'break'),
  ) as unknown as Level[];

  return {
    name: typeof parsed.name === 'string' ? parsed.name : 'Tournament',
    levels: validatedLevels,
    anteEnabled: (parsed.anteEnabled as boolean) ?? false,
    anteMode: (parsed.anteMode === 'bigBlindAnte' ? 'bigBlindAnte' : 'standard'),
    players: Array.isArray(parsed.players)
      ? ((parsed.players as Record<string, unknown>[])
          .filter((p) => p && typeof p === 'object' && typeof p.id === 'string' && (p.id as string).length > 0 && typeof p.name === 'string' && (p.name as string).trim().length > 0)
          .map((p) => ({
          id: typeof p.id === 'string' ? p.id : generatePlayerId(),
          name: typeof p.name === 'string' ? p.name : '',
          seat: typeof p.seat === 'number' ? p.seat : undefined,
          rebuys: typeof p.rebuys === 'number' ? p.rebuys : 0,
          addOn: typeof p.addOn === 'boolean' ? p.addOn : false,
          status: p.status === 'eliminated' ? 'eliminated' as const : 'active' as const,
          placement: typeof p.placement === 'number' ? p.placement : null,
          eliminatedBy: typeof p.eliminatedBy === 'string' ? p.eliminatedBy : null,
          eliminatedAt: typeof p.eliminatedAt === 'number' ? p.eliminatedAt : undefined,
          knockouts: typeof p.knockouts === 'number' ? p.knockouts : 0,
          chips: typeof p.chips === 'number' ? p.chips : undefined,
          bountyEarned: typeof p.bountyEarned === 'number' ? p.bountyEarned : 0,
          rebuyTimestamps: Array.isArray(p.rebuyTimestamps) ? p.rebuyTimestamps : undefined,
          originalPlayerId: typeof p.originalPlayerId === 'string' ? p.originalPlayerId : undefined,
          reEntryCount: typeof p.reEntryCount === 'number' ? p.reEntryCount : undefined,
        })) as Player[])
      : ([] as Player[]),
    dealerIndex: typeof parsed.dealerIndex === 'number' ? parsed.dealerIndex : 0,
    payout: (
      parsed.payout &&
      typeof parsed.payout === 'object' &&
      Array.isArray((parsed.payout as Record<string, unknown>).entries)
    )
      ? { ...defaultPayoutConfig(), ...sanitize(parsed.payout as PayoutConfig & Record<string, unknown>) }
      : defaultPayoutConfig(),
    rebuy,
    addOn,
    bounty: parsed.bounty
      ? {
          ...defaultBountyConfig(),
          ...sanitize(parsed.bounty as Partial<BountyConfig> & Record<string, unknown>),
          type: (parsed.bounty as Record<string, unknown>).type === 'mystery' ? 'mystery' : 'fixed',
          mysteryPool: Array.isArray((parsed.bounty as Record<string, unknown>).mysteryPool)
            ? (parsed.bounty as BountyConfig).mysteryPool
            : undefined,
        }
      : defaultBountyConfig(),
    chips: parsed.chips
      ? {
          ...defaultChipConfig(),
          ...sanitize(parsed.chips as ChipConfig & Record<string, unknown>),
          colorUpEnabled: typeof (parsed.chips as Record<string, unknown>).colorUpEnabled === 'boolean'
            ? (parsed.chips as ChipConfig).colorUpEnabled
            : true,
          colorUpSchedule: Array.isArray((parsed.chips as Record<string, unknown>).colorUpSchedule)
            ? (parsed.chips as ChipConfig).colorUpSchedule
            : [],
        }
      : defaultChipConfig(),
    buyIn,
    currency: parseCurrency(parsed.currency),
    startingChips,
    lateRegistration: parsed.lateRegistration
      ? { ...defaultLateRegistrationConfig(), ...sanitize(parsed.lateRegistration as Partial<LateRegistrationConfig> & Record<string, unknown>) }
      : undefined,
    leagueId: typeof parsed.leagueId === 'string' ? parsed.leagueId : undefined,
    multiTable: parsed.multiTable
      ? { ...defaultMultiTableConfig(), ...sanitize(parsed.multiTable as Partial<MultiTableConfig> & Record<string, unknown>) }
      : undefined,
    tables: Array.isArray(parsed.tables)
      ? (parsed.tables as Record<string, unknown>[])
          .filter((t) => t && typeof t.id === 'string' && typeof t.name === 'string')
          .map((t) => migrateTable(t))
      : undefined,
  };
}

/**
 * Migrate a table from old format (playerIds: string[], seats: number)
 * to new format (seats: Seat[], maxSeats: number, status, dealerSeat).
 */
function migrateTable(raw: Record<string, unknown>): Table {
  // New format: seats is an array of Seat objects
  if (
    Array.isArray(raw.seats) &&
    raw.seats.length > 0 &&
    typeof (raw.seats[0] as Record<string, unknown>)?.seatNumber === 'number'
  ) {
    return {
      id: raw.id as string,
      name: raw.name as string,
      maxSeats: typeof raw.maxSeats === 'number' ? raw.maxSeats : (raw.seats as Seat[]).length,
      seats: raw.seats as Seat[],
      status: raw.status === 'dissolved' ? 'dissolved' : 'active',
      dealerSeat: typeof raw.dealerSeat === 'number' ? raw.dealerSeat : null,
    };
  }

  // Old format: seats is a number, playerIds is a string array
  const maxSeats = typeof raw.seats === 'number' ? raw.seats : 10;
  const playerIds = Array.isArray(raw.playerIds) ? raw.playerIds as string[] : [];
  const seats: Seat[] = Array.from({ length: maxSeats }, (_, i) => ({
    seatNumber: i + 1,
    playerId: playerIds[i] ?? null,
  }));

  return {
    id: raw.id as string,
    name: raw.name as string,
    maxSeats,
    seats,
    status: 'active',
    dealerSeat: null,
  };
}

// ---------------------------------------------------------------------------
// Config Persistence (backed by IndexedDB cache layer)
// ---------------------------------------------------------------------------

import { getCached, setCached } from './storage';

/** Persist tournament config to storage. */
export function saveConfig(config: TournamentConfig): void {
  setCached('config', config);
}

/** Load tournament config from storage. Returns null if absent. */
export function loadConfig(): TournamentConfig | null {
  return getCached('config');
}

/** Persist application settings to storage. */
export function saveSettings(settings: Settings): void {
  setCached('settings', settings);
}

/** Load application settings from storage. Returns null if absent. */
export function loadSettings(): Settings | null {
  return getCached('settings');
}

// ---------------------------------------------------------------------------
// Tournament Checkpoint (auto-save / restore, backed by IndexedDB cache)
// ---------------------------------------------------------------------------

/** Save tournament checkpoint to storage. Stamps with current schema version. */
export function saveCheckpoint(checkpoint: TournamentCheckpoint): void {
  setCached('checkpoint', { ...checkpoint, schemaVersion: CHECKPOINT_SCHEMA_VERSION });
}

/**
 * Load tournament checkpoint from storage. Returns null if absent or invalid.
 * Validates and normalizes the checkpoint data for safety.
 */
export function loadCheckpoint(): TournamentCheckpoint | null {
  const parsed = getCached('checkpoint');
  if (!parsed) return null;
  try {
    const raw = parsed as unknown as Record<string, unknown>;
    if (raw.version !== 1) return null;
    // Reject checkpoints from incompatible schema versions
    if (raw.schemaVersion !== undefined && raw.schemaVersion !== CHECKPOINT_SCHEMA_VERSION) {
      clearCheckpoint();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('checkpoint-schema-mismatch'));
      }
      return null;
    }
    const config = raw.config ? parseConfigObject(raw.config as Record<string, unknown>) : null;
    if (!config) return null;
    // Guard: empty levels array would cause downstream crashes (index -1)
    if (config.levels.length === 0) return null;
    const timer = raw.timer ? { ...(raw.timer as Record<string, unknown>) } : undefined;
    if (!timer || typeof timer.currentLevelIndex !== 'number' || typeof timer.remainingSeconds !== 'number') return null;
    // Clamp to valid ranges
    timer.currentLevelIndex = Math.max(0, Math.min(
      timer.currentLevelIndex as number, config.levels.length - 1,
    ));
    timer.remainingSeconds = Math.max(0, timer.remainingSeconds as number);
    return {
      version: 1,
      schemaVersion: CHECKPOINT_SCHEMA_VERSION,
      config,
      settings: { ...defaultSettings(), ...(raw.settings && typeof raw.settings === 'object' ? sanitize(raw.settings as Record<string, unknown>) : {}) },
      timer: timer as TournamentCheckpoint['timer'],
      savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : new Date().toISOString(),
      events: Array.isArray(raw.events) ? raw.events : [],
    } as TournamentCheckpoint;
  } catch {
    return null;
  }
}

/** Clear tournament checkpoint from storage. */
export function clearCheckpoint(): void {
  setCached('checkpoint', null);
}

// ---------------------------------------------------------------------------
// Config JSON Import / Export
// ---------------------------------------------------------------------------

export function exportConfigJSON(config: TournamentConfig): string {
  return JSON.stringify(config, null, 2);
}

export function importConfigJSON(json: string): TournamentConfig | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed.name !== 'string') return null;
    return parseConfigObject(parsed);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Setup Wizard
// ---------------------------------------------------------------------------

export const WIZARD_KEY = 'poker-timer-wizard-completed';

export function isWizardCompleted(): boolean {
  try {
    return localStorage.getItem(WIZARD_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markWizardCompleted(): void {
  try {
    localStorage.setItem(WIZARD_KEY, 'true');
  } catch { /* private browsing */ }
}

export function resetWizardCompleted(): void {
  try {
    localStorage.removeItem(WIZARD_KEY);
  } catch { /* private browsing */ }
}

// ---------------------------------------------------------------------------
// Onboarding Tour
// ---------------------------------------------------------------------------

export const TOUR_KEY = 'poker-timer-tour-completed';

export function isTourCompleted(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markTourCompleted(): void {
  try {
    localStorage.setItem(TOUR_KEY, 'true');
  } catch { /* private browsing */ }
}

export function resetTourCompleted(): void {
  try {
    localStorage.removeItem(TOUR_KEY);
  } catch { /* private browsing */ }
}
