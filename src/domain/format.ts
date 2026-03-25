import type { Level } from './types';
import { t as moduleT } from '../i18n/translations';

// ---------------------------------------------------------------------------
// Format
// ---------------------------------------------------------------------------

/** Formats seconds as `MM:SS`, clamped to zero. */
export function formatTime(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Formats seconds as `H:MM:SS` for elapsed tournament time display. */
export function formatElapsedTime(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Level label helpers
// ---------------------------------------------------------------------------

/** Returns the display label for a level — break name or sequential play-level number (e.g. "Level 3"). */
export function getLevelLabel(level: Level, index: number, levels: Level[], t = moduleT): string {
  if (level.type === 'break') {
    return level.label || t('logic.defaultBreakLabel');
  }
  const playLevels = levels.slice(0, index + 1).filter(l => l.type === 'level');
  return t('logic.levelN', { n: playLevels.length });
}

/** Returns formatted blinds string like "100 / 200 - Ante 25". Returns empty string for breaks. */
export function getBlindsText(level: Level, t = moduleT): string {
  if (level.type === 'break') return '';
  const parts = [`${level.smallBlind ?? 0} / ${level.bigBlind ?? 0}`];
  if (level.ante && level.ante > 0) {
    parts.push(`${t('logic.ante')} ${level.ante}`);
  }
  return parts.join(' - ');
}

// ---------------------------------------------------------------------------
// General-purpose format helpers (moved from pdfExport.ts for tree-shaking)
// ---------------------------------------------------------------------------

/**
 * Sanitize a string for use as a filename (remove special characters, collapse spaces).
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .slice(0, 80) || 'tournament';
}

/**
 * Format seconds into a human-readable duration string (e.g. "2h 15m").
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
