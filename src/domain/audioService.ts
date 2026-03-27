// Centralized audio facade — syncs volume/language across sounds, speech, and audioPlayer modules.
// Eliminates the 3-call volume pattern scattered in App.tsx.

import { setMasterVolume } from './sounds';
import { setAudioVolume } from './audioPlayer';
import { setSpeechVolume, setSpeechLanguage } from './speech';
import type { Language } from '../i18n/translations';

// Re-export audio category management (separate module to avoid circular deps)
export { setAudioCategories, isCategoryEnabled } from './audioCategories';
export type { AudioCategories } from './audioCategories';

// ---------------------------------------------------------------------------
// Volume & language
// ---------------------------------------------------------------------------

/**
 * Set master volume for all audio subsystems (sounds, MP3 player, speech).
 * Value: 0.0 (silent) to 1.0 (full volume).
 */
export function setAudioMasterVolume(volume: number): void {
  const v = Math.max(0, Math.min(1, volume));
  setMasterVolume(v);
  setAudioVolume(v);
  setSpeechVolume(v);
}

/**
 * Set the language for all audio subsystems (speech synthesis + MP3 file paths).
 */
export function setAudioLanguage(language: Language): void {
  setSpeechLanguage(language);
}
