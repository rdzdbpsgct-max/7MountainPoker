import type { CustomAudioFile, CustomAudioMapping } from './types';
import { generateId } from './helpers';
import { getCached, setCachedItem, deleteCachedItem } from './storage';

// ---------------------------------------------------------------------------
// Well-known announcement keys that can be customized
// ---------------------------------------------------------------------------

export const CUSTOMIZABLE_ANNOUNCEMENTS = [
  'shuffle-up',
  'level-change',
  'break-start',
  'break-warning',
  'break-over',
  'five-minutes',
  'bubble',
  'itm',
  'elimination',
  'heads-up',
  'winner',
  'rebuy-taken',
  'rebuy-ended',
  'addon',
  'color-up',
  'color-up-warning',
  'call-the-clock',
  'call-the-clock-expired',
  'late-reg-closed',
  'hand-for-hand',
  'table-move',
  'table-dissolved',
  'final-table',
  'timer-paused',
  'timer-resumed',
  'last-hand',
  'break-skipped',
  'break-extended',
] as const;

export type AnnouncementKey = typeof CUSTOMIZABLE_ANNOUNCEMENTS[number];

/** Maximum file size for uploaded audio files: 5 MB */
export const MAX_AUDIO_FILE_SIZE = 5 * 1024 * 1024;

/** Maximum number of custom audio files allowed */
export const MAX_CUSTOM_AUDIO_FILES = 20;

/** Accepted MIME types for audio uploads */
export const ACCEPTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
];

// ---------------------------------------------------------------------------
// Audio File CRUD
// ---------------------------------------------------------------------------

export function loadCustomAudioFiles(): CustomAudioFile[] {
  return getCached('customAudio');
}

/**
 * Save a CustomAudioFile object (with ArrayBuffer data) to storage.
 * Can accept either a pre-built CustomAudioFile or a browser File object.
 */
export function saveCustomAudioFile(file: CustomAudioFile): void {
  setCachedItem('customAudio', file);
}

export function deleteCustomAudioFile(id: string): void {
  // Also remove any mappings that reference this file
  const mappings = getCached('audioMappings');
  for (const mapping of mappings) {
    if (mapping.audioFileId === id) {
      deleteCachedItem('audioMappings', mapping.id);
    }
  }
  deleteCachedItem('customAudio', id);
}

// ---------------------------------------------------------------------------
// Audio Mapping CRUD
// ---------------------------------------------------------------------------

export function loadAudioMappings(): CustomAudioMapping[] {
  return getCached('audioMappings');
}

export function setAudioMapping(
  announcementKey: string,
  audioFileId: string,
  language: 'de' | 'en' | 'all' = 'all',
): CustomAudioMapping {
  // Remove existing mapping for this key+language
  const existing = getCached('audioMappings');
  for (const m of existing) {
    if (m.announcementKey === announcementKey && m.language === language) {
      deleteCachedItem('audioMappings', m.id);
    }
  }

  const mapping: CustomAudioMapping = {
    id: generateId(),
    announcementKey,
    audioFileId,
    language,
  };
  setCachedItem('audioMappings', mapping);
  return mapping;
}

export function removeAudioMapping(announcementKey: string, language: 'de' | 'en' | 'all' = 'all'): void {
  const existing = getCached('audioMappings');
  for (const m of existing) {
    if (m.announcementKey === announcementKey && m.language === language) {
      deleteCachedItem('audioMappings', m.id);
    }
  }
}

/**
 * Get the custom audio file for an announcement key, if mapped.
 * Returns the CustomAudioFile, or null if no mapping exists.
 */
export function getCustomAudioForAnnouncement(
  announcementKey: string,
  language: string,
): CustomAudioFile | null {
  const mappings = getCached('audioMappings');

  // Try language-specific first, then 'all'
  const mapping = mappings.find(
    m => m.announcementKey === announcementKey && m.language === language,
  ) ?? mappings.find(
    m => m.announcementKey === announcementKey && m.language === 'all',
  );

  if (!mapping) return null;

  const files = getCached('customAudio');
  return files.find(f => f.id === mapping.audioFileId) ?? null;
}

/**
 * Format file size for display (KB/MB).
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
