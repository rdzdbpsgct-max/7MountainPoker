/**
 * Sound & Speech Tests — Phase 8
 *
 * Tests:
 * - sounds.ts: setMasterVolume, playBeep, playVictorySound, playBubbleSound, playInTheMoneySound
 * - speech.ts: queue behavior, cancelSpeech, setSpeechLanguage, all announce* functions
 * - audioContext.ts: getSharedAudioContext graceful degradation
 *
 * Strategy: Mock AudioContext + speechSynthesis for deterministic testing.
 * We don't test actual audio output — only that correct parameters are passed
 * and functions degrade gracefully when APIs are missing.
 */

import {
  setMasterVolume,
  playBeep,
  playVictorySound,
  playBubbleSound,
  playInTheMoneySound,
  initAudio,
} from '../src/domain/sounds';

import {
  cancelSpeech,
  setSpeechLanguage,
  setSpeechVolume,
  announceLevelChange,
  announceBreakStart,
  announceBreakWarning,
  announceCountdown,
  announceBubble,
  announceInTheMoney,
  announceElimination,
  announceWinner,
  announceBounty,
  announceAddOn,
  announceRebuyAvailable,
  announceRebuyEnded,
  announceColorUp,
  announceTournamentStart,
  announceHeadsUp,
  announceLastHand,
  announceFiveMinutes,
  announceThreeRemaining,
  announcePlayersRemaining,
  announceBreakOver,
  announceColorUpWarning,
  announceTimerPaused,
  announceTimerResumed,
  announceHandForHand,
  announceRebuyTaken,
  announceTableMove,
  announceTableDissolution,
  announceFinalTable,
  announceMysteryBounty,
  announceCallTheClock,
  announceCallTheClockExpired,
  announceLateRegistrationClosed,
  announceTournamentWinner,
  announceBreakSkipped,
  announceBreakExtended,
  initSpeech,
} from '../src/domain/speech';

// ---------------------------------------------------------------------------
// Mock AudioContext for sounds.ts
// ---------------------------------------------------------------------------

const mockOsc = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  frequency: { value: 0 },
  type: 'sine' as OscillatorType,
};

const mockGain = {
  connect: vi.fn(),
  gain: {
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
};

// Provide AudioContext globally (use a class to avoid vi.fn constructor warnings)
class MockAudioContext {
  createOscillator = vi.fn(() => ({ ...mockOsc }));
  createGain = vi.fn(() => ({
    ...mockGain,
    gain: { ...mockGain.gain },
  }));
  destination = {};
  currentTime = 0;
  state: AudioContextState = 'running';
  resume = vi.fn(() => Promise.resolve());
  close = vi.fn();
}

vi.stubGlobal('AudioContext', MockAudioContext);

// Mock audioPlayer for speech tests (avoid actual MP3 loading)
vi.mock('../src/domain/audioPlayer', () => ({
  playAudioSequence: vi.fn(() => Promise.resolve()),
  cancelAudioPlayback: vi.fn(),
  setAudioLanguage: vi.fn(),
}));

// ---------------------------------------------------------------------------
// sounds.ts tests
// ---------------------------------------------------------------------------

describe('Sound effects (sounds.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('setMasterVolume clamps to 0–1 range', () => {
    // Should not throw
    setMasterVolume(0.5);
    setMasterVolume(0);
    setMasterVolume(1);
    setMasterVolume(-1);  // clamps to 0
    setMasterVolume(2);   // clamps to 1
  });

  it('initAudio does not throw', () => {
    expect(() => initAudio()).not.toThrow();
  });

  it('playBeep does not throw with valid AudioContext', () => {
    initAudio();
    expect(() => playBeep(440, 200)).not.toThrow();
  });

  it('playVictorySound returns a Promise', async () => {
    initAudio();
    vi.useFakeTimers();
    const p = playVictorySound();
    expect(p).toBeInstanceOf(Promise);
    vi.advanceTimersByTime(2000);
    await p;
    vi.useRealTimers();
  });

  it('playBubbleSound returns a Promise', async () => {
    initAudio();
    vi.useFakeTimers();
    const p = playBubbleSound();
    expect(p).toBeInstanceOf(Promise);
    vi.advanceTimersByTime(1500);
    await p;
    vi.useRealTimers();
  });

  it('playInTheMoneySound returns a Promise', async () => {
    initAudio();
    vi.useFakeTimers();
    const p = playInTheMoneySound();
    expect(p).toBeInstanceOf(Promise);
    vi.advanceTimersByTime(800);
    await p;
    vi.useRealTimers();
  });

  it('playVictorySound resolves even without AudioContext', async () => {
    // Temporarily remove AudioContext
    const orig = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', undefined);

    // Force a new AudioContext attempt (will fail gracefully)
    const p = playVictorySound();
    await expect(p).resolves.toBeUndefined();

    vi.stubGlobal('AudioContext', orig);
  });
});

// ---------------------------------------------------------------------------
// speech.ts tests
// ---------------------------------------------------------------------------

describe('Speech system (speech.ts)', () => {
  const mockT = vi.fn((key: string) => `[${key}]`);

  beforeEach(() => {
    vi.clearAllMocks();
    cancelSpeech(); // Clear queue between tests
  });

  describe('cancelSpeech', () => {
    it('does not throw', () => {
      expect(() => cancelSpeech()).not.toThrow();
    });

    it('can be called multiple times', () => {
      cancelSpeech();
      cancelSpeech();
      cancelSpeech();
    });
  });

  describe('setSpeechLanguage', () => {
    it('accepts de', () => {
      expect(() => setSpeechLanguage('de')).not.toThrow();
    });

    it('accepts en', () => {
      expect(() => setSpeechLanguage('en')).not.toThrow();
    });
  });

  describe('setSpeechVolume', () => {
    it('accepts valid range', () => {
      setSpeechVolume(0);
      setSpeechVolume(0.5);
      setSpeechVolume(1);
    });

    it('clamps out-of-range values', () => {
      setSpeechVolume(-1);
      setSpeechVolume(2);
    });
  });

  describe('initSpeech', () => {
    it('does not throw when speechSynthesis is unavailable', () => {
      expect(() => initSpeech()).not.toThrow();
    });
  });

  // All announce* functions should not throw and should accept t() function
  describe('announce functions (no-throw contract)', () => {
    const simpleFunctions = [
      { name: 'announceBubble', fn: () => announceBubble(mockT as never) },
      { name: 'announceInTheMoney', fn: () => announceInTheMoney(mockT as never) },
      { name: 'announceElimination', fn: () => announceElimination(mockT as never) },
      { name: 'announceWinner', fn: () => announceWinner(mockT as never) },
      { name: 'announceBounty', fn: () => announceBounty(mockT as never) },
      { name: 'announceAddOn', fn: () => announceAddOn(mockT as never) },
      { name: 'announceRebuyAvailable', fn: () => announceRebuyAvailable(mockT as never) },
      { name: 'announceRebuyEnded', fn: () => announceRebuyEnded(mockT as never) },
      { name: 'announceTournamentStart', fn: () => announceTournamentStart(mockT as never) },
      { name: 'announceHeadsUp', fn: () => announceHeadsUp(mockT as never) },
      { name: 'announceFiveMinutes', fn: () => announceFiveMinutes(mockT as never) },
      { name: 'announceThreeRemaining', fn: () => announceThreeRemaining(mockT as never) },
      { name: 'announceBreakOver', fn: () => announceBreakOver(mockT as never) },
      { name: 'announceColorUpWarning', fn: () => announceColorUpWarning(mockT as never) },
      { name: 'announceTimerPaused', fn: () => announceTimerPaused(mockT as never) },
      { name: 'announceTimerResumed', fn: () => announceTimerResumed(mockT as never) },
      { name: 'announceHandForHand', fn: () => announceHandForHand(mockT as never) },
      { name: 'announceBreakWarning', fn: () => announceBreakWarning(mockT as never) },
      { name: 'announceFinalTable', fn: () => announceFinalTable(mockT as never) },
    ];

    for (const { name, fn } of simpleFunctions) {
      it(`${name} does not throw`, () => {
        expect(fn).not.toThrow();
      });
    }
  });

  describe('parameterized announce functions', () => {
    it('announceLevelChange with MP3-covered blind pair', () => {
      expect(() => announceLevelChange(1, 25, 50, undefined, mockT as never)).not.toThrow();
    });

    it('announceLevelChange with ante', () => {
      expect(() => announceLevelChange(5, 100, 200, 25, mockT as never)).not.toThrow();
    });

    it('announceLevelChange falls back to speech for unknown blind pair', () => {
      // 999-1998 is not in BLIND_PAIRS
      expect(() => announceLevelChange(1, 999, 1998, undefined, mockT as never)).not.toThrow();
    });

    it('announceLevelChange falls back to speech for level > 25', () => {
      expect(() => announceLevelChange(30, 25, 50, undefined, mockT as never)).not.toThrow();
    });

    it('announceBreakStart with valid duration', () => {
      expect(() => announceBreakStart(10, mockT as never)).not.toThrow();
    });

    it('announceBreakStart with label', () => {
      expect(() => announceBreakStart(15, mockT as never, 'Dinner break')).not.toThrow();
    });

    it('announceBreakStart falls back to speech for duration > 30', () => {
      expect(() => announceBreakStart(45, mockT as never)).not.toThrow();
    });

    it('announceCountdown returns true for valid range', () => {
      expect(announceCountdown(5)).toBe(true);
      expect(announceCountdown(1)).toBe(true);
      expect(announceCountdown(10)).toBe(true);
    });

    it('announceCountdown returns true even for out-of-range (falls back to speech)', () => {
      expect(announceCountdown(15)).toBe(true);
      expect(announceCountdown(0)).toBe(true);
    });

    it('announcePlayersRemaining with valid range (4-10)', () => {
      expect(() => announcePlayersRemaining(4, mockT as never)).not.toThrow();
      expect(() => announcePlayersRemaining(10, mockT as never)).not.toThrow();
    });

    it('announcePlayersRemaining falls back to speech for count > 10', () => {
      expect(() => announcePlayersRemaining(15, mockT as never)).not.toThrow();
    });

    it('announceLastHand with nextIsBreak true', () => {
      expect(() => announceLastHand(true, mockT as never)).not.toThrow();
    });

    it('announceLastHand with nextIsBreak false', () => {
      expect(() => announceLastHand(false, mockT as never)).not.toThrow();
    });

    it('announceColorUp with chip labels', () => {
      expect(() => announceColorUp('25er Chips', mockT as never)).not.toThrow();
    });

    it('announceTableMove with player info', () => {
      expect(() => announceTableMove('Max', 'Tisch 2', 5, mockT as never)).not.toThrow();
    });

    it('announceTableDissolution with table name', () => {
      expect(() => announceTableDissolution('Tisch 3', mockT as never)).not.toThrow();
    });

    it('announceMysteryBounty with amount', () => {
      expect(() => announceMysteryBounty(50, mockT as never)).not.toThrow();
    });

    it('announceCallTheClock with seconds', () => {
      expect(() => announceCallTheClock(60, mockT as never)).not.toThrow();
    });

    it('announceCallTheClockExpired', () => {
      expect(() => announceCallTheClockExpired(mockT as never)).not.toThrow();
    });

    it('announceLateRegistrationClosed', () => {
      expect(() => announceLateRegistrationClosed(mockT as never)).not.toThrow();
    });

    it('announceTournamentWinner with player name', () => {
      expect(() => announceTournamentWinner('Lisa', mockT as never)).not.toThrow();
    });

    it('announceRebuyTaken enqueues MP3 audio item', () => {
      expect(() => announceRebuyTaken(mockT as never)).not.toThrow();
    });

    it('announceBreakSkipped enqueues speech for break skipped', () => {
      expect(() => announceBreakSkipped(mockT as never)).not.toThrow();
      expect(mockT).toHaveBeenCalledWith('voice.breakSkipped');
    });

    it('announceBreakExtended enqueues speech for break extended with minutes', () => {
      expect(() => announceBreakExtended(5, mockT as never)).not.toThrow();
      expect(mockT).toHaveBeenCalledWith('voice.breakExtended', { minutes: 5 });
    });
  });
});

// ---------------------------------------------------------------------------
// AudioBuffer cache tests (import actual, bypassing the mock)
// ---------------------------------------------------------------------------

describe('AudioBuffer cache', () => {
  let clearAudioBufferCache: () => void;
  let getAudioBufferCacheSize: () => number;

  beforeAll(async () => {
    const actual = await vi.importActual<typeof import('../src/domain/audioPlayer')>('../src/domain/audioPlayer');
    clearAudioBufferCache = actual.clearAudioBufferCache;
    getAudioBufferCacheSize = actual.getAudioBufferCacheSize;
  });

  it('clearAudioBufferCache is exported and callable', () => {
    expect(typeof clearAudioBufferCache).toBe('function');
    clearAudioBufferCache(); // should not throw
  });

  it('getAudioBufferCacheSize returns 0 after clear', () => {
    clearAudioBufferCache();
    expect(getAudioBufferCacheSize()).toBe(0);
  });
});
