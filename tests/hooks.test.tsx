/**
 * Hook Tests — useKeyboardShortcuts, useGameEvents
 *
 * Tests from Testplan: U-017, U-018 (Keyboard Shortcuts), useGameEvents
 */
import { renderHook, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useKeyboardShortcuts } from '../src/hooks/useKeyboardShortcuts';
import { useGameEvents } from '../src/hooks/useGameEvents';
import type { Settings } from '../src/domain/types';
import * as soundsMod from '../src/domain/sounds';
import * as speechMod from '../src/domain/speech';

// Mock sound + speech modules for useGameEvents
vi.mock('../src/domain/sounds', () => ({
  playVictorySound: vi.fn(() => Promise.resolve()),
  playBubbleSound: vi.fn(() => Promise.resolve()),
  playInTheMoneySound: vi.fn(() => Promise.resolve()),
}));
vi.mock('../src/domain/speech', () => ({
  announceWinner: vi.fn(),
  announceTournamentWinner: vi.fn(),
  announceBubble: vi.fn(),
  announceInTheMoney: vi.fn(),
}));

// ---------------------------------------------------------------------------
// useKeyboardShortcuts — U-017, U-018
// ---------------------------------------------------------------------------

describe('useKeyboardShortcuts', () => {
  function createHandlers() {
    return {
      onToggleStartPause: vi.fn(),
      onNextLevel: vi.fn(),
      onPreviousLevel: vi.fn(),
      onResetLevel: vi.fn(),
      onToggleCleanView: vi.fn(),
      onLastHand: vi.fn(),
      onToggleTVWindow: vi.fn(),
      onHandForHand: vi.fn(),
      onCallTheClock: vi.fn(),
    };
  }

  it('Space triggers onToggleStartPause in game mode', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ mode: 'game', ...handlers }));

    fireEvent.keyDown(window, { code: 'Space' });
    expect(handlers.onToggleStartPause).toHaveBeenCalledTimes(1);
  });

  it('N triggers onNextLevel in game mode', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ mode: 'game', ...handlers }));

    fireEvent.keyDown(window, { code: 'KeyN' });
    expect(handlers.onNextLevel).toHaveBeenCalledTimes(1);
  });

  it('V triggers onPreviousLevel in game mode', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ mode: 'game', ...handlers }));

    fireEvent.keyDown(window, { code: 'KeyV' });
    expect(handlers.onPreviousLevel).toHaveBeenCalledTimes(1);
  });

  it('R triggers onResetLevel in game mode', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ mode: 'game', ...handlers }));

    fireEvent.keyDown(window, { code: 'KeyR' });
    expect(handlers.onResetLevel).toHaveBeenCalledTimes(1);
  });

  it('F triggers onToggleCleanView in game mode', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ mode: 'game', ...handlers }));

    fireEvent.keyDown(window, { code: 'KeyF' });
    expect(handlers.onToggleCleanView).toHaveBeenCalledTimes(1);
  });

  it('L triggers onLastHand in game mode', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ mode: 'game', ...handlers }));

    fireEvent.keyDown(window, { code: 'KeyL' });
    expect(handlers.onLastHand).toHaveBeenCalledTimes(1);
  });

  it('T triggers onToggleTVWindow in game mode', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ mode: 'game', ...handlers }));

    fireEvent.keyDown(window, { code: 'KeyT' });
    expect(handlers.onToggleTVWindow).toHaveBeenCalledTimes(1);
  });

  it('H triggers onHandForHand in game mode', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ mode: 'game', ...handlers }));

    fireEvent.keyDown(window, { code: 'KeyH' });
    expect(handlers.onHandForHand).toHaveBeenCalledTimes(1);
  });

  it('C triggers onCallTheClock in game mode', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ mode: 'game', ...handlers }));

    fireEvent.keyDown(window, { code: 'KeyC' });
    expect(handlers.onCallTheClock).toHaveBeenCalledTimes(1);
  });

  // U-018: Shortcuts only work in game mode
  it('shortcuts do NOT fire in setup mode', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ mode: 'setup', ...handlers }));

    fireEvent.keyDown(window, { code: 'Space' });
    fireEvent.keyDown(window, { code: 'KeyN' });
    fireEvent.keyDown(window, { code: 'KeyV' });
    fireEvent.keyDown(window, { code: 'KeyR' });

    expect(handlers.onToggleStartPause).not.toHaveBeenCalled();
    expect(handlers.onNextLevel).not.toHaveBeenCalled();
    expect(handlers.onPreviousLevel).not.toHaveBeenCalled();
    expect(handlers.onResetLevel).not.toHaveBeenCalled();
  });

  it('shortcuts do NOT fire in league mode', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ mode: 'league', ...handlers }));

    fireEvent.keyDown(window, { code: 'Space' });
    fireEvent.keyDown(window, { code: 'KeyT' });

    expect(handlers.onToggleStartPause).not.toHaveBeenCalled();
    expect(handlers.onToggleTVWindow).not.toHaveBeenCalled();
  });

  it('shortcuts do NOT fire when typing in an input field', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ mode: 'game', ...handlers }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { code: 'Space' });
    document.body.removeChild(input);

    expect(handlers.onToggleStartPause).not.toHaveBeenCalled();
  });

  it('shortcuts do NOT fire when typing in a textarea', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ mode: 'game', ...handlers }));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    fireEvent.keyDown(textarea, { code: 'KeyN' });
    document.body.removeChild(textarea);

    expect(handlers.onNextLevel).not.toHaveBeenCalled();
  });

  it('shortcuts do NOT fire with Ctrl modifier held', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ mode: 'game', ...handlers }));

    fireEvent.keyDown(window, { code: 'KeyR', ctrlKey: true });
    expect(handlers.onResetLevel).not.toHaveBeenCalled();
  });

  it('shortcuts do NOT fire with Meta/Cmd modifier held', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ mode: 'game', ...handlers }));

    fireEvent.keyDown(window, { code: 'KeyN', metaKey: true });
    expect(handlers.onNextLevel).not.toHaveBeenCalled();
  });

  it('shortcuts do NOT fire with Alt modifier held', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ mode: 'game', ...handlers }));

    fireEvent.keyDown(window, { code: 'KeyT', altKey: true });
    expect(handlers.onToggleTVWindow).not.toHaveBeenCalled();
  });

  it('Space prevents default (no page scroll)', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ mode: 'game', ...handlers }));

    const event = new KeyboardEvent('keydown', { code: 'Space', cancelable: true });
    const spy = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(spy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useGameEvents — Victory, Bubble, ITM sound/voice coordination
// ---------------------------------------------------------------------------

describe('useGameEvents', () => {
  // Access the mocked module functions
  const playVictorySound = soundsMod.playVictorySound as ReturnType<typeof vi.fn>;
  const playBubbleSound = soundsMod.playBubbleSound as ReturnType<typeof vi.fn>;
  const announceWinner = speechMod.announceWinner as ReturnType<typeof vi.fn>;
  const announceTournamentWinner = speechMod.announceTournamentWinner as ReturnType<typeof vi.fn>;
  const announceBubble = speechMod.announceBubble as ReturnType<typeof vi.fn>;
  // announceInTheMoney is used indirectly via the hook's ITM effect
  void (speechMod.announceInTheMoney as ReturnType<typeof vi.fn>);

  const defaultSettings: Settings = {
    soundEnabled: true,
    countdownEnabled: true,
    autoAdvance: false,
    largeDisplay: false,
    voiceEnabled: true,
    volume: 100,
    callTheClockSeconds: 30,
  };

  const mockT = vi.fn((key: string) => key);
  const mockPause = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns showItmFlash as false initially', () => {
    const { result } = renderHook(() =>
      useGameEvents({
        mode: 'game',
        settings: defaultSettings,
        tournamentFinished: false,
        bubbleActive: false,
        inTheMoney: false,
        pause: mockPause,
        t: mockT as never,
      })
    );
    expect(result.current.showItmFlash).toBe(false);
  });

  it('pauses timer and plays victory sound when tournament finishes', async () => {
    renderHook(() =>
      useGameEvents({
        mode: 'game',
        settings: defaultSettings,
        tournamentFinished: true,
        bubbleActive: false,
        inTheMoney: false,
        pause: mockPause,
        t: mockT as never,
      })
    );

    // Allow async effects to resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockPause).toHaveBeenCalled();
    expect(playVictorySound).toHaveBeenCalled();
  });

  it('announces winner by name when winnerName is provided', async () => {
    renderHook(() =>
      useGameEvents({
        mode: 'game',
        settings: defaultSettings,
        tournamentFinished: true,
        bubbleActive: false,
        inTheMoney: false,
        winnerName: 'Max',
        pause: mockPause,
        t: mockT as never,
      })
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(announceTournamentWinner).toHaveBeenCalledWith('Max', expect.anything());
  });

  it('announces generic winner when no name provided', async () => {
    renderHook(() =>
      useGameEvents({
        mode: 'game',
        settings: defaultSettings,
        tournamentFinished: true,
        bubbleActive: false,
        inTheMoney: false,
        pause: mockPause,
        t: mockT as never,
      })
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(announceWinner).toHaveBeenCalled();
  });

  it('does not play sounds when soundEnabled is false', async () => {
    const quietSettings = { ...defaultSettings, soundEnabled: false };

    renderHook(() =>
      useGameEvents({
        mode: 'game',
        settings: quietSettings,
        tournamentFinished: true,
        bubbleActive: false,
        inTheMoney: false,
        pause: mockPause,
        t: mockT as never,
      })
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(playVictorySound).not.toHaveBeenCalled();
  });

  it('does not fire in setup mode', async () => {
    renderHook(() =>
      useGameEvents({
        mode: 'setup',
        settings: defaultSettings,
        tournamentFinished: true,
        bubbleActive: false,
        inTheMoney: false,
        pause: mockPause,
        t: mockT as never,
      })
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockPause).not.toHaveBeenCalled();
  });

  it('plays bubble sound when bubble becomes active', async () => {
    const { rerender } = renderHook(
      ({ bubbleActive }) =>
        useGameEvents({
          mode: 'game',
          settings: defaultSettings,
          tournamentFinished: false,
          bubbleActive,
          inTheMoney: false,
          pause: mockPause,
          t: mockT as never,
        }),
      { initialProps: { bubbleActive: false } }
    );

    // Transition: bubble becomes active
    rerender({ bubbleActive: true });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(playBubbleSound).toHaveBeenCalled();
    expect(announceBubble).toHaveBeenCalled();
  });

  it('reset() clears ITM flash and refs', () => {
    const { result } = renderHook(() =>
      useGameEvents({
        mode: 'game',
        settings: defaultSettings,
        tournamentFinished: false,
        bubbleActive: false,
        inTheMoney: false,
        pause: mockPause,
        t: mockT as never,
      })
    );

    act(() => {
      result.current.reset();
    });

    expect(result.current.showItmFlash).toBe(false);
  });
});
