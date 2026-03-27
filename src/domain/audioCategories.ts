// Per-category audio toggles — extracted to avoid circular dependencies
// between audioService.ts, sounds.ts, and speech.ts.

export interface AudioCategories {
  voice: boolean;
  effects: boolean;
  countdown: boolean;
  alerts: boolean;
}

const DEFAULT_CATEGORIES: AudioCategories = {
  voice: true, effects: true, countdown: true, alerts: true,
};

let currentCategories: AudioCategories = { ...DEFAULT_CATEGORIES };

export function setAudioCategories(cats: Partial<AudioCategories> | undefined): void {
  currentCategories = cats ? { ...DEFAULT_CATEGORIES, ...cats } : { ...DEFAULT_CATEGORIES };
}

export function isCategoryEnabled(cat: keyof AudioCategories): boolean {
  return currentCategories[cat];
}
