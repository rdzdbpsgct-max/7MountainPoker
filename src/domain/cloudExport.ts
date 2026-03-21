// Cloud Export — unified export module for tournament data.
// Provides JSON, CSV, and share-ready formats for tournament results and league data.
// All client-side — no server needed. Uses Web Share API or File System Access API.

import type { TournamentResult, TournamentConfig } from './types';
import { formatResultAsCSV, formatResultAsText } from './tournament';
import { getCached, setCached, type StoreKey } from './storage';

export type ExportFormat = 'json' | 'csv' | 'text';

export interface ExportResult {
  filename: string;
  mimeType: string;
  content: string;
}

/**
 * Export tournament result in the specified format.
 */
export function exportTournamentResult(
  result: TournamentResult,
  format: ExportFormat,
): ExportResult {
  const date = new Date(result.date).toISOString().split('T')[0];
  const safeName = (result.name || 'tournament').replace(/[^a-zA-Z0-9-_]/g, '_');

  switch (format) {
    case 'json':
      return {
        filename: `${safeName}_${date}.json`,
        mimeType: 'application/json',
        content: JSON.stringify(result, null, 2),
      };
    case 'csv':
      return {
        filename: `${safeName}_${date}.csv`,
        mimeType: 'text/csv',
        content: formatResultAsCSV(result),
      };
    case 'text':
      return {
        filename: `${safeName}_${date}.txt`,
        mimeType: 'text/plain',
        content: formatResultAsText(result),
      };
  }
}

/**
 * Export full tournament config as JSON (for backup/transfer).
 */
export function exportConfigBackup(config: TournamentConfig): ExportResult {
  const safeName = (config.name || 'config').replace(/[^a-zA-Z0-9-_]/g, '_');
  return {
    filename: `${safeName}_backup.json`,
    mimeType: 'application/json',
    content: JSON.stringify(config, null, 2),
  };
}

/**
 * Download an export result as a file using Blob + URL.
 */
export function downloadExport(result: ExportResult): void {
  const blob = new Blob([result.content], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Share an export result via Web Share API (mobile).
 * Returns true if shared, false if unsupported.
 */
export async function shareExport(result: ExportResult): Promise<boolean> {
  if (!navigator.share) return false;
  try {
    const file = new File([result.content], result.filename, { type: result.mimeType });
    await navigator.share({ files: [file] });
    return true;
  } catch {
    // User cancelled or share failed
    return false;
  }
}

// ---------------------------------------------------------------------------
// Full Database Backup / Restore
// ---------------------------------------------------------------------------

const BACKUP_VERSION = 1;
const ALL_STORES: StoreKey[] = [
  'config', 'settings', 'checkpoint',
  'templates', 'history', 'players', 'leagues', 'gameDays',
  'events', 'series', 'customAudio', 'audioMappings',
];

export interface FullBackup {
  _backupVersion: number;
  _exportedAt: string;
  _appVersion: string;
  stores: Record<string, unknown>;
}

/**
 * Create a full backup of all IndexedDB stores as a JSON-serializable object.
 * Note: CustomAudio data (ArrayBuffers) are excluded as they can't be serialized to JSON.
 */
export function createFullBackup(appVersion: string): FullBackup {
  const stores: Record<string, unknown> = {};
  for (const key of ALL_STORES) {
    if (key === 'customAudio') continue; // ArrayBuffer can't be JSON-serialized
    stores[key] = getCached(key);
  }
  return {
    _backupVersion: BACKUP_VERSION,
    _exportedAt: new Date().toISOString(),
    _appVersion: appVersion,
    stores,
  };
}

/**
 * Export a full backup as a downloadable JSON file.
 */
export function exportFullBackup(appVersion: string): ExportResult {
  const backup = createFullBackup(appVersion);
  const date = new Date().toISOString().split('T')[0];
  return {
    filename: `7mountain-poker-backup_${date}.json`,
    mimeType: 'application/json',
    content: JSON.stringify(backup, null, 2),
  };
}

/**
 * Validate and parse a full backup JSON string.
 * Returns the parsed backup or null if invalid.
 */
export function parseFullBackup(json: string): FullBackup | null {
  try {
    const data = JSON.parse(json) as Record<string, unknown>;
    if (typeof data !== 'object' || data === null) return null;
    if (typeof data._backupVersion !== 'number') return null;
    if (typeof data.stores !== 'object' || data.stores === null) return null;
    return data as unknown as FullBackup;
  } catch {
    return null;
  }
}

/**
 * Restore all stores from a full backup.
 * Overwrites all existing data.
 */
export function restoreFullBackup(backup: FullBackup): void {
  for (const key of ALL_STORES) {
    if (key === 'customAudio') continue;
    const value = (backup.stores as Record<string, unknown>)[key];
    if (value !== undefined) {
      setCached(key, value as never);
    }
  }
  // Mark backup timestamp
  try { localStorage.setItem('poker-timer-last-backup', String(Date.now())); } catch { /* ignore */ }
}

/**
 * Save using File System Access API (for cloud-synced folders).
 * Returns true if saved, false if unsupported or cancelled.
 */
export async function saveToFileSystem(result: ExportResult): Promise<boolean> {
  if (!('showSaveFilePicker' in window)) return false;
  try {
    const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
      suggestedName: result.filename,
      types: [{
        description: result.mimeType.includes('json') ? 'JSON' : result.mimeType.includes('csv') ? 'CSV' : 'Text',
        accept: { [result.mimeType]: [`.${result.filename.split('.').pop()}`] },
      }],
    });
    const writable = await handle.createWritable();
    await writable.write(result.content);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}
