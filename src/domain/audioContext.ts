// Shared AudioContext singleton — used by both sounds.ts and audioPlayer.ts
// Prevents creating multiple AudioContexts (browsers limit the count)

let sharedCtx: AudioContext | null = null;

/**
 * Get or create the shared AudioContext.
 * Returns null if AudioContext is not available (e.g. SSR).
 */
export function getSharedAudioContext(): AudioContext | null {
  try {
    if (typeof AudioContext === 'undefined') return null;
    if (!sharedCtx || sharedCtx.state === 'closed') {
      sharedCtx = new AudioContext();
    }
    if (sharedCtx.state === 'suspended') {
      void sharedCtx.resume();
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

/**
 * Initialize AudioContext from a user gesture (unlocks autoplay on Safari).
 * Call from click/touch handlers.
 */
export function initSharedAudioContext(): void {
  try {
    getSharedAudioContext();
  } catch {
    // audio not available
  }
}
