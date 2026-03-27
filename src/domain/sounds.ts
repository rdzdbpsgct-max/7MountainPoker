// Sound effects using Web Audio API (no external files needed)

import { getSharedAudioContext, initSharedAudioContext } from './audioContext';
import { isCategoryEnabled } from './audioCategories';

let masterVolume = 1.0;

/** Set the master volume for all sound effects (0.0 – 1.0). */
export function setMasterVolume(v: number): void {
  masterVolume = Math.max(0, Math.min(1, v));
}

function getAudioContext(): AudioContext {
  const ctx = getSharedAudioContext();
  if (!ctx) throw new Error('AudioContext not available');
  return ctx;
}

/**
 * Pre-initialize audio context from a user gesture (required by Safari).
 * Call this from click/touch handlers (e.g. Play button) so the AudioContext
 * is unlocked before any programmatic sound playback.
 */
export function initAudio(): void {
  initSharedAudioContext();
}

function playNote(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume = 0.3,
  type: OscillatorType = 'sine',
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume * masterVolume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

/** Simple beep for countdown and level-end (used by useTimer) */
export function playBeep(frequency: number, durationMs: number): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    gain.gain.value = 0.3 * masterVolume;
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch (err) {
    console.warn('[audio] playBeep failed:', err);
  }
}

/** Victory melody for tournament winner. Resolves after melody finishes (~1700ms). */
export function playVictorySound(): Promise<void> {
  if (!isCategoryEnabled('effects')) return Promise.resolve();
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    // Siegesmelodie: G4-C5-E5 - G5-E5-G5-C6
    playNote(ctx, 392, t, 0.15, 0.2, 'triangle');        // G4
    playNote(ctx, 523, t + 0.15, 0.15, 0.2, 'triangle');  // C5
    playNote(ctx, 659, t + 0.30, 0.15, 0.2, 'triangle');  // E5
    playNote(ctx, 784, t + 0.50, 0.2, 0.25, 'triangle');  // G5
    playNote(ctx, 659, t + 0.70, 0.15, 0.2, 'triangle');  // E5
    playNote(ctx, 784, t + 0.85, 0.2, 0.25, 'triangle');  // G5
    playNote(ctx, 1047, t + 1.10, 0.6, 0.3, 'triangle');  // C6 (lang)
    return new Promise(resolve => setTimeout(resolve, 1700));
  } catch (err) {
    console.warn('[audio] playVictorySound failed:', err);
    return Promise.resolve();
  }
}

/** Tension sound for reaching the bubble. Resolves after sound finishes (~1450ms). */
export function playBubbleSound(): Promise<void> {
  if (!isCategoryEnabled('effects')) return Promise.resolve();
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    playNote(ctx, 440, t, 0.3, 0.25, 'sawtooth');         // A4
    playNote(ctx, 554, t + 0.35, 0.3, 0.25, 'sawtooth');  // C#5
    playNote(ctx, 440, t + 0.70, 0.2, 0.2, 'sawtooth');   // A4
    playNote(ctx, 554, t + 0.95, 0.5, 0.3, 'sawtooth');   // C#5 (held)
    return new Promise(resolve => setTimeout(resolve, 1450));
  } catch (err) {
    console.warn('[audio] playBubbleSound failed:', err);
    return Promise.resolve();
  }
}

/** Two-note chime for custom alerts. Resolves after sound finishes (~500ms). */
export function playChimeSound(): Promise<void> {
  if (!isCategoryEnabled('alerts')) return Promise.resolve();
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    playNote(ctx, 659, t, 0.2, 0.25, 'triangle');        // E5
    playNote(ctx, 880, t + 0.2, 0.3, 0.25, 'triangle');   // A5
    return new Promise(resolve => setTimeout(resolve, 500));
  } catch (err) {
    console.warn('[audio] playChimeSound failed:', err);
    return Promise.resolve();
  }
}

/** Short celebratory fanfare for reaching In The Money. Resolves after sound finishes (~700ms). */
export function playInTheMoneySound(): Promise<void> {
  if (!isCategoryEnabled('effects')) return Promise.resolve();
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    playNote(ctx, 523, t, 0.15, 0.2, 'triangle');         // C5
    playNote(ctx, 659, t + 0.15, 0.15, 0.2, 'triangle');  // E5
    playNote(ctx, 784, t + 0.30, 0.4, 0.25, 'triangle');  // G5 (held)
    return new Promise(resolve => setTimeout(resolve, 700));
  } catch (err) {
    console.warn('[audio] playInTheMoneySound failed:', err);
    return Promise.resolve();
  }
}
