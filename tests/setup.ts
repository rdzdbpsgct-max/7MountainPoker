import '@testing-library/jest-dom/vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import 'fake-indexeddb/auto';

// Extend expect with axe a11y matchers
expect.extend(axeMatchers);
import { resetStorage } from '../src/domain/storage';

const originalEmitWarning = process.emitWarning.bind(process);
const originalConsoleWarn = console.warn.bind(console);

process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
  const message = typeof warning === 'string' ? warning : warning?.message ?? '';
  // Environment-level noise from jsdom/node runtime in this workspace.
  if (message.includes('--localstorage-file was provided without a valid path')) {
    return;
  }
  originalEmitWarning(warning, ...(args as [unknown?]));
}) as typeof process.emitWarning;

function filteredWarn(...args: unknown[]) {
  const first = typeof args[0] === 'string' ? args[0] : '';
  // Keep test output focused: these warnings are expected in test scenarios.
  if (
    first.startsWith('[audio]')
    || first.startsWith('[audioPlayer]')
    || first.startsWith('[tables]')
    || first.startsWith('[i18n]')
  ) {
    return;
  }
  originalConsoleWarn(...args);
}

// Reset storage cache before each test to ensure isolation
beforeEach(async () => {
  vi.spyOn(console, 'warn').mockImplementation(filteredWarn);
  await resetStorage();
  // Clear IndexedDB databases between tests
  if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
    try {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
    } catch { /* ignore */ }
  }
});

// Mock window.matchMedia for theme provider tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

if (typeof HTMLMediaElement !== 'undefined') {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn(() => Promise.reject(new Error('Not implemented'))),
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
  });
}

// Mock Web Audio API — prevents "AudioContext is not defined" warnings
const mockGainNode = {
  connect: vi.fn(),
  gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
};
const mockOscillator = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  type: '' as OscillatorType,
  frequency: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  onended: null as (() => void) | null,
};
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  configurable: true,
  value: vi.fn(() => ({
    createOscillator: vi.fn(() => ({ ...mockOscillator })),
    createGain: vi.fn(() => ({ ...mockGainNode })),
    destination: {},
    currentTime: 0,
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    state: 'running' as AudioContextState,
    decodeAudioData: vi.fn(() => Promise.resolve({ duration: 1, length: 44100, sampleRate: 44100, numberOfChannels: 1, getChannelData: vi.fn() })),
    createBufferSource: vi.fn(() => ({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      buffer: null,
      onended: null as (() => void) | null,
    })),
  })),
});

// Mock SpeechSynthesis — prevents "speechSynthesis is not defined" warnings
if (typeof window.speechSynthesis === 'undefined') {
  Object.defineProperty(window, 'speechSynthesis', {
    writable: true,
    value: {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn(() => []),
      speaking: false,
      pending: false,
      paused: false,
      onvoiceschanged: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
}

if (typeof window.SpeechSynthesisUtterance === 'undefined') {
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    writable: true,
    value: vi.fn(() => ({
      text: '',
      lang: '',
      voice: null,
      volume: 1,
      rate: 1,
      pitch: 1,
      onend: null,
      onerror: null,
    })),
  });
}
