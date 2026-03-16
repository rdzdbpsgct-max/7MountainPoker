// ---------------------------------------------------------------------------
// storage.ts — Cache-First IndexedDB Storage Layer
// ---------------------------------------------------------------------------
//
// Architecture: In-memory cache with async IndexedDB persistence.
// - initStorage() loads everything into cache on app start (async, ~50ms)
// - All reads are synchronous (from cache)
// - All writes update cache synchronously + fire-and-forget async persist
// - Migration: On first run, copies localStorage data → IndexedDB
// - Fallback: If IndexedDB unavailable, uses localStorage directly
// ---------------------------------------------------------------------------

import { openDB, type IDBPDatabase } from 'idb';
import type {
  TournamentConfig,
  Settings,
  TournamentCheckpoint,
  TournamentResult,
  RegisteredPlayer,
  League,
  GameDay,
  TournamentEvent,
  TournamentSeries,
  CustomAudioFile,
  CustomAudioMapping,
} from './types';
import type { TournamentTemplate } from './templatePersistence';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Stores that hold a single value (key-value pattern). */
type SingletonStore = 'config' | 'settings' | 'checkpoint';

/** Stores that hold arrays of items with an `id` field. */
type CollectionStore = 'templates' | 'history' | 'players' | 'leagues' | 'gameDays' | 'events' | 'series' | 'customAudio' | 'audioMappings';

/** All store names. */
export type StoreKey = SingletonStore | CollectionStore;

/** Map from store name to its value type. */
interface StoreTypeMap {
  config: TournamentConfig | null;
  settings: Settings | null;
  checkpoint: TournamentCheckpoint | null;
  templates: TournamentTemplate[];
  history: TournamentResult[];
  players: RegisteredPlayer[];
  leagues: League[];
  gameDays: GameDay[];
  events: TournamentEvent[];
  series: TournamentSeries[];
  customAudio: CustomAudioFile[];
  audioMappings: CustomAudioMapping[];
}

/** Item types for collection stores (all have `id: string`). */
interface CollectionItemMap {
  templates: TournamentTemplate;
  history: TournamentResult;
  players: RegisteredPlayer;
  leagues: League;
  gameDays: GameDay;
  events: TournamentEvent;
  series: TournamentSeries;
  customAudio: CustomAudioFile;
  audioMappings: CustomAudioMapping;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_NAME = 'poker-timer-db';
const DB_VERSION = 4;
const MIGRATED_KEY = 'poker-timer-migrated';

/** Maximum number of tournament history entries to retain. */
export const MAX_HISTORY_ENTRIES = 100;

/** Maximum number of tournament event log entries to retain. */
export const MAX_EVENT_ENTRIES = 1000;

/** localStorage keys that should be migrated to IndexedDB. */
const MIGRATION_MAP: Record<string, StoreKey> = {
  'poker-timer-config': 'config',
  'poker-timer-settings': 'settings',
  'poker-timer-checkpoint': 'checkpoint',
  'poker-timer-templates': 'templates',
  'poker-timer-history': 'history',
  'poker-timer-players': 'players',
  'poker-timer-leagues': 'leagues',
  'poker-timer-gamedays': 'gameDays',
};

/** Singleton stores use a fixed key. */
const SINGLETON_KEY = 'current';

/** Collection store names (for type narrowing). */
const COLLECTION_STORES: ReadonlySet<string> = new Set([
  'templates', 'history', 'players', 'leagues', 'gameDays', 'events', 'series', 'customAudio', 'audioMappings',
]);

// ---------------------------------------------------------------------------
// In-Memory Cache
// ---------------------------------------------------------------------------

const cache: StoreTypeMap = {
  config: null,
  settings: null,
  checkpoint: null,
  templates: [],
  history: [],
  players: [],
  leagues: [],
  gameDays: [],
  events: [],
  series: [],
  customAudio: [],
  audioMappings: [],
};

let ready = false;
let db: IDBPDatabase | null = null;
let useLocalStorageFallback = false;

/** Per-store write queue to serialize IndexedDB persistence and prevent race conditions. */
const persistQueue = new Map<string, Promise<void>>();

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize the storage layer. Must be called once before React mounts.
 * - Opens IndexedDB and creates stores if needed
 * - Migrates data from localStorage on first run
 * - Loads all data into the in-memory cache
 *
 * If IndexedDB is not available, falls back to localStorage-only mode.
 */
export async function initStorage(): Promise<void> {
  // Already initialized (e.g. called multiple times in tests)
  if (ready) return;

  try {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB not available');

    db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        // Singleton stores (key-value)
        for (const store of ['config', 'settings', 'checkpoint'] as const) {
          if (!database.objectStoreNames.contains(store)) {
            database.createObjectStore(store);
          }
        }
        // Collection stores (keyPath: 'id')
        for (const store of ['templates', 'history', 'players', 'leagues', 'gameDays', 'events', 'series', 'customAudio', 'audioMappings'] as const) {
          if (!database.objectStoreNames.contains(store)) {
            database.createObjectStore(store, { keyPath: 'id' });
          }
        }
      },
    });

    // Migrate from localStorage if not done yet
    await migrateFromLocalStorage();

    // Load all data into cache
    await loadAllIntoCache();

    // Enforce retention policies on collections
    enforceRetentionPolicies();

    ready = true;
  } catch {
    // IndexedDB unavailable — fall back to localStorage
    console.warn('[storage] IndexedDB unavailable, using localStorage fallback');
    useLocalStorageFallback = true;
    loadAllFromLocalStorage();
    ready = true;
  }
}

/**
 * Reset storage state. Used in tests to ensure clean state between test runs.
 * Closes the IndexedDB connection so the database can be deleted cleanly.
 */
export async function resetStorage(): Promise<void> {
  if (db) {
    db.close();
  }
  ready = false;
  db = null;
  useLocalStorageFallback = false;
  cache.config = null;
  cache.settings = null;
  cache.checkpoint = null;
  cache.templates = [];
  cache.history = [];
  cache.players = [];
  cache.leagues = [];
  cache.gameDays = [];
  cache.events = [];
  cache.series = [];
  cache.customAudio = [];
  cache.audioMappings = [];
}

/** Whether the storage layer has been initialized. */
export function isStorageReady(): boolean {
  return ready;
}

// ---------------------------------------------------------------------------
// Cache Getters (synchronous)
// ---------------------------------------------------------------------------

/** Get the cached value for a store. Synchronous — reads from in-memory cache. */
export function getCached<K extends StoreKey>(store: K): StoreTypeMap[K] {
  return cache[store] as StoreTypeMap[K];
}

// ---------------------------------------------------------------------------
// Cache Setters (synchronous cache + async persist)
// ---------------------------------------------------------------------------

/**
 * Type-safe helper to set a cache value by store key.
 * Avoids TS2352 with interface → Record<string, unknown> in strict mode.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setCacheValue(store: string, value: any): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (cache as any)[store] = value;
}

/** Set the entire value for a store. Updates cache synchronously, persists async. */
export function setCached<K extends StoreKey>(store: K, value: StoreTypeMap[K]): void {
  setCacheValue(store, value);
  persistStore(store);
}

/**
 * Upsert an item in a collection store. Updates cache synchronously, persists async.
 * If an item with the same `id` exists, it is replaced; otherwise the item is appended.
 */
export function setCachedItem<K extends CollectionStore>(store: K, item: CollectionItemMap[K]): void {
  const arr = cache[store] as Array<{ id: string }>;
  const idx = arr.findIndex((existing) => existing.id === (item as { id: string }).id);
  if (idx >= 0) {
    arr[idx] = item as { id: string };
  } else {
    arr.push(item as { id: string });
  }
  persistStore(store);
}

/**
 * Delete an item from a collection store by id. Updates cache synchronously, persists async.
 */
export function deleteCachedItem<K extends CollectionStore>(store: K, id: string): void {
  const arr = cache[store] as Array<{ id: string }>;
  const idx = arr.findIndex((item) => item.id === id);
  if (idx >= 0) {
    arr.splice(idx, 1);
    persistStore(store);
  }
}

// ---------------------------------------------------------------------------
// Async Persistence (fire-and-forget)
// ---------------------------------------------------------------------------

function persistStore(store: StoreKey): void {
  if (useLocalStorageFallback) {
    persistToLocalStorage(store);
    return;
  }
  if (!db) return;
  const prev = persistQueue.get(store) ?? Promise.resolve();
  const next = prev
    .then(() => persistToIndexedDB(store))
    .catch((err) => {
      console.warn(`[storage] Failed to persist "${store}" to IndexedDB:`, err);
      // Fallback: also write to localStorage as safety net
      persistToLocalStorage(store);
    });
  persistQueue.set(store, next);
}

async function persistToIndexedDB(store: StoreKey): Promise<void> {
  if (!db) return;

  if (COLLECTION_STORES.has(store)) {
    // For collections: clear store and put all items
    const tx = db.transaction(store, 'readwrite');
    await tx.store.clear();
    const items = cache[store] as Array<{ id: string }>;
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;
  } else {
    // For singletons: put the value at the fixed key
    const value = cache[store as SingletonStore];
    if (value === null) {
      await db.delete(store, SINGLETON_KEY);
    } else {
      await db.put(store, value, SINGLETON_KEY);
    }
  }
}

function persistToLocalStorage(store: StoreKey): void {
  const lsKey = localStorageKeyForStore(store);
  if (!lsKey) return;
  try {
    const value = cache[store];
    if (value === null) {
      localStorage.removeItem(lsKey);
    } else {
      localStorage.setItem(lsKey, JSON.stringify(value));
    }
  } catch { /* quota exceeded or private browsing */ }
}

function localStorageKeyForStore(store: StoreKey): string | null {
  for (const [lsKey, storeName] of Object.entries(MIGRATION_MAP)) {
    if (storeName === store) return lsKey;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Migration: localStorage → IndexedDB
// ---------------------------------------------------------------------------

async function migrateFromLocalStorage(): Promise<void> {
  if (!db) return;

  try {
    if (localStorage.getItem(MIGRATED_KEY) === 'true') return;
  } catch {
    return; // localStorage not available
  }

  try {
    // Set migration flag BEFORE deleting keys — if we crash mid-migration,
    // the data is still in localStorage and won't be re-migrated (safe).
    localStorage.setItem(MIGRATED_KEY, 'true');

    for (const [lsKey, store] of Object.entries(MIGRATION_MAP)) {
      const raw = localStorage.getItem(lsKey);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);

        if (COLLECTION_STORES.has(store)) {
          // Collection: write each item
          if (Array.isArray(parsed)) {
            const tx = db.transaction(store, 'readwrite');
            for (const item of parsed) {
              if (item && typeof item === 'object' && typeof item.id === 'string') {
                await tx.store.put(item);
              }
            }
            await tx.done;
          }
        } else {
          // Singleton: write at fixed key
          if (parsed !== null && typeof parsed === 'object') {
            await db.put(store, parsed, SINGLETON_KEY);
          }
        }

        // Remove migrated key from localStorage
        localStorage.removeItem(lsKey);
      } catch {
        console.warn(`[storage] Failed to migrate "${lsKey}", skipping`);
      }
    }
  } catch {
    console.warn('[storage] Migration from localStorage failed');
  }
}

// ---------------------------------------------------------------------------
// Load from IndexedDB into Cache
// ---------------------------------------------------------------------------

async function loadAllIntoCache(): Promise<void> {
  if (!db) return;

  // Singleton stores
  for (const store of ['config', 'settings', 'checkpoint'] as const) {
    try {
      const value = await db.get(store, SINGLETON_KEY);
      setCacheValue(store, value ?? null);
    } catch {
      setCacheValue(store, null);
    }
  }

  // Collection stores
  for (const store of ['templates', 'history', 'players', 'leagues', 'gameDays', 'events', 'series', 'customAudio', 'audioMappings'] as const) {
    try {
      const items = await db.getAll(store);
      setCacheValue(store, items ?? []);
    } catch {
      setCacheValue(store, []);
    }
  }
}

// ---------------------------------------------------------------------------
// Load from localStorage (fallback mode)
// ---------------------------------------------------------------------------

function loadAllFromLocalStorage(): void {
  for (const [lsKey, store] of Object.entries(MIGRATION_MAP)) {
    try {
      const raw = localStorage.getItem(lsKey);
      if (!raw) continue;
      const parsed = JSON.parse(raw);

      if (COLLECTION_STORES.has(store)) {
        if (Array.isArray(parsed)) {
          setCacheValue(store, parsed);
        }
      } else {
        if (parsed !== null && typeof parsed === 'object') {
          setCacheValue(store, parsed);
        }
      }
    } catch {
      // Skip corrupt data
    }
  }
}

// ---------------------------------------------------------------------------
// Event Log helpers
// ---------------------------------------------------------------------------

/** Clears all events from cache and persists the empty array. */
export function clearEvents(): void {
  setCached('events', []);
}

// ---------------------------------------------------------------------------
// Retention Policies
// ---------------------------------------------------------------------------

/**
 * Enforce retention limits on history and events collections.
 * Keeps the newest entries, deletes the oldest when over the limit.
 * Called once during initStorage() after cache is populated.
 */
function enforceRetentionPolicies(): void {
  // History: keep newest MAX_HISTORY_ENTRIES by date
  if (cache.history.length > MAX_HISTORY_ENTRIES) {
    cache.history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const removed = cache.history.splice(MAX_HISTORY_ENTRIES);
    // Fire-and-forget: delete excess from IndexedDB
    if (db && !useLocalStorageFallback) {
      for (const item of removed) {
        db.delete('history', item.id).catch(() => {});
      }
    }
    // Also persist trimmed array to localStorage fallback if needed
    if (useLocalStorageFallback) {
      persistToLocalStorage('history');
    }
  }

  // Events: keep newest MAX_EVENT_ENTRIES by timestamp
  if (cache.events.length > MAX_EVENT_ENTRIES) {
    cache.events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const removed = cache.events.splice(MAX_EVENT_ENTRIES);
    if (db && !useLocalStorageFallback) {
      for (const item of removed) {
        db.delete('events', item.id).catch(() => {});
      }
    }
  }
}
