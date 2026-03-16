// MP3 audio playback engine — Web Audio API for gapless playback,
// HTMLAudioElement fallback for maximum compatibility

import type { Language } from '../i18n/translations';
import { getSharedAudioContext, initSharedAudioContext } from './audioContext';

let scheduledSources: AudioBufferSourceNode[] = [];
let currentHtmlAudio: HTMLAudioElement | null = null;
let cancelRequested = false;
let audioLanguage: Language = 'de';
let audioVolume = 1.0;

/** Set the master volume for MP3 playback (0.0 – 1.0). */
export function setAudioVolume(v: number): void {
  audioVolume = Math.max(0, Math.min(1, v));
}

function getBasePath(): string {
  // import.meta.env.BASE_URL always ends with '/'
  return `${import.meta.env.BASE_URL}audio/${audioLanguage}/`;
}

/**
 * Set the language for audio file paths.
 */
export function setAudioLanguage(lang: Language): void {
  audioLanguage = lang;
}

/**
 * Trim trailing silence from an AudioBuffer.
 * Scans backwards from the end to find the last sample above the threshold,
 * then returns a new buffer trimmed to that point (+ small fade-out pad).
 */
function trimTrailingSilence(ctx: AudioContext, buffer: AudioBuffer): AudioBuffer {
  const threshold = 0.01;
  const fadeSamples = 128; // ~3ms fade-out to avoid clicks
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;

  // Find last non-silent sample across all channels
  let lastSample = 0;
  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = data.length - 1; i >= 0; i--) {
      if (Math.abs(data[i]) > threshold) {
        if (i > lastSample) lastSample = i;
        break;
      }
    }
  }

  // Add fade-out padding, but don't exceed original length
  const trimmedLength = Math.min(lastSample + fadeSamples, buffer.length);

  // Only trim if we save at least 5% of the buffer
  if (trimmedLength > buffer.length * 0.95) return buffer;

  const trimmed = ctx.createBuffer(channels, trimmedLength, sampleRate);
  for (let ch = 0; ch < channels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = trimmed.getChannelData(ch);
    // Copy data up to lastSample
    for (let i = 0; i < Math.min(lastSample + 1, trimmedLength); i++) {
      dst[i] = src[i];
    }
    // Fade out the padding region
    for (let i = lastSample + 1; i < trimmedLength; i++) {
      const fadePos = (i - lastSample) / fadeSamples;
      dst[i] = src[i] * (1 - fadePos);
    }
  }

  return trimmed;
}

// ---------------------------------------------------------------------------
// Web Audio API playback (gapless, precise scheduling)
// ---------------------------------------------------------------------------

function playWithWebAudio(files: string[], basePath: string): Promise<void> {
  const ctx = getSharedAudioContext();
  if (!ctx) return Promise.reject(new Error('AudioContext not available'));

  // Resume context if suspended (autoplay policy)
  const resumePromise = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();

  return resumePromise.then(() => {
    // Fetch and decode all audio files in parallel
    const decodePromises = files.map((file) =>
      fetch(basePath + file)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status} for ${file}`);
          return res.arrayBuffer();
        })
        .then((buf) => ctx.decodeAudioData(buf)),
    );

    return Promise.all(decodePromises);
  }).then((rawBuffers) => {
    if (cancelRequested) return;

    // Trim trailing silence from each buffer
    const buffers = rawBuffers.map((buf) => trimTrailingSilence(ctx, buf));

    // Schedule all buffers back-to-back with precise timing
    return new Promise<void>((resolve) => {
      scheduledSources = [];
      let startTime = ctx.currentTime;

      // Create a master gain node for volume control
      const gainNode = ctx.createGain();
      gainNode.gain.value = audioVolume;
      gainNode.connect(ctx.destination);

      for (let i = 0; i < buffers.length; i++) {
        const source = ctx.createBufferSource();
        source.buffer = buffers[i];
        source.connect(gainNode);
        scheduledSources.push(source);

        source.start(startTime);
        startTime += buffers[i].duration;
      }

      // Resolve when the last buffer finishes (guard against cancelled sources
      // — source.stop() also fires onended, which would corrupt isSpeaking state)
      const lastSource = scheduledSources[scheduledSources.length - 1];
      const totalDuration = buffers.reduce((sum, b) => sum + b.duration, 0);
      let resolved = false;
      const safeResolve = () => {
        if (resolved) return;
        resolved = true;
        scheduledSources = [];
        if (!cancelRequested) resolve();
      };

      lastSource.onended = safeResolve;

      // Safety timeout: if onended never fires (browser bug), force resolve
      setTimeout(safeResolve, totalDuration * 1000 + 2000);
    });
  });
}

// ---------------------------------------------------------------------------
// HTMLAudioElement fallback (sequential, maximum compatibility)
// ---------------------------------------------------------------------------

function playWithHtmlAudio(files: string[], basePath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let index = 0;

    let anyPlayed = false;

    function playNext(): void {
      if (cancelRequested || index >= files.length) {
        currentHtmlAudio = null;
        if (anyPlayed) {
          resolve();
        } else {
          reject(new Error('All files failed in HTMLAudioElement fallback'));
        }
        return;
      }

      const audio = new Audio(basePath + files[index]);
      audio.volume = audioVolume;
      currentHtmlAudio = audio;
      index++;

      let done = false;
      const safeNext = () => {
        if (done) return;
        done = true;
        if (safetyTimer) clearTimeout(safetyTimer);
        currentHtmlAudio = null;
        anyPlayed = true;
        playNext();
      };

      audio.onended = safeNext;

      audio.onerror = () => {
        if (done) return;
        done = true;
        if (safetyTimer) clearTimeout(safetyTimer);
        currentHtmlAudio = null;
        console.warn('[audioPlayer] HTMLAudioElement skipping failed file:', files[index - 1]);
        playNext(); // Continue with remaining files instead of aborting
      };

      // Safety timeout: if onended never fires, force next after 15s
      const safetyTimer = setTimeout(() => {
        if (!done) {
          console.warn('[audioPlayer] HTMLAudioElement onended timeout, forcing next:', files[index - 1]);
          safeNext();
        }
      }, 15_000);

      audio.play().catch(() => {
        if (done) return;
        done = true;
        if (safetyTimer) clearTimeout(safetyTimer);
        currentHtmlAudio = null;
        console.warn('[audioPlayer] HTMLAudioElement play() rejected, skipping:', files[index - 1]);
        playNext(); // Continue with remaining files
      });
    }

    playNext();
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether a file path is an absolute URL (blob:, http:, https:).
 * Absolute URLs are used directly without prepending the base path.
 */
function isAbsoluteUrl(path: string): boolean {
  return path.startsWith('blob:') || path.startsWith('http:') || path.startsWith('https:');
}

/**
 * Resolve file paths to full URLs. Relative paths get the base path prepended,
 * absolute URLs (blob:, http:, https:) are used as-is.
 */
function resolveFilePaths(files: string[], basePath: string): string[] {
  return files.map(f => isAbsoluteUrl(f) ? f : basePath + f);
}

/**
 * Play a sequence of MP3 files. Tries Web Audio API first (gapless),
 * falls back to HTMLAudioElement (sequential) if decoding fails.
 * Resolves when all files have finished. Rejects only when both methods fail.
 *
 * File paths can be relative (prepended with language-based base path)
 * or absolute URLs (blob:, http:, https: — used as-is).
 */
export function playAudioSequence(files: string[]): Promise<void> {
  if (files.length === 0) return Promise.resolve();
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Audio not available'));
  }

  cancelRequested = false;
  const basePath = getBasePath();

  // Resolve all file paths to full URLs
  const resolvedFiles = resolveFilePaths(files, basePath);

  // Try Web Audio API first (gapless playback)
  // Pass empty basePath since files are already resolved
  return playWithWebAudio(resolvedFiles, '').catch((webAudioErr) => {
    if (cancelRequested) return;

    console.warn(
      '[audioPlayer] Web Audio API failed, trying HTMLAudioElement fallback:',
      webAudioErr instanceof Error ? webAudioErr.message : webAudioErr,
    );

    // Fallback: HTMLAudioElement (sequential, no gapless but maximum compat)
    return playWithHtmlAudio(resolvedFiles, '');
  });
}

/**
 * Stop any currently playing audio immediately.
 */
export function cancelAudioPlayback(): void {
  cancelRequested = true;

  // Stop Web Audio API sources
  for (const source of scheduledSources) {
    try {
      source.stop();
    } catch {
      // already stopped
    }
  }
  scheduledSources = [];

  // Stop HTMLAudioElement
  if (currentHtmlAudio) {
    try {
      currentHtmlAudio.pause();
      currentHtmlAudio.currentTime = 0;
    } catch {
      // already stopped
    }
    currentHtmlAudio = null;
  }
}

/**
 * Initialize AudioContext from a user gesture (unlocks autoplay).
 */
export function initAudioContext(): void {
  initSharedAudioContext();
}
