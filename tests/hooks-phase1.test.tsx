import { renderHook, act } from '@testing-library/react';
import { useModalManager } from '../src/hooks/useModalManager';
import { useGameComputedState } from '../src/hooks/useGameComputedState';
import { useTournamentEventLog } from '../src/hooks/useTournamentEventLog';
import { useCheckpointManager } from '../src/hooks/useCheckpointManager';
import { defaultConfig, defaultSettings, loadCheckpoint, clearCheckpoint } from '../src/domain/logic';

// Mock isWizardCompleted — default: wizard completed (showWizard = false)
// Use partial mock to keep defaultConfig and other exports available
vi.mock('../src/domain/configPersistence', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/domain/configPersistence')>();
  return {
    ...actual,
    isWizardCompleted: vi.fn(() => true),
    isTourCompleted: vi.fn(() => true),
  };
});

describe('useModalManager', () => {
  beforeEach(() => {
    // Reset hash before each test
    window.location.hash = '';
  });

  it('returns correct default states', () => {
    const { result } = renderHook(() => useModalManager());

    // Panels default to visible
    expect(result.current.showPlayerPanel).toBe(true);
    expect(result.current.showSidebar).toBe(true);

    // All modals default to false
    expect(result.current.showTemplates).toBe(false);
    expect(result.current.showHistory).toBe(false);
    expect(result.current.showSeries).toBe(false);
    expect(result.current.showCustomAudio).toBe(false);
    expect(result.current.showCallTheClock).toBe(false);
    expect(result.current.showHelp).toBe(false);
    expect(result.current.showTournamentLog).toBe(false);
    expect(result.current.showPayoutOverlay).toBe(false);
    expect(result.current.showTour).toBe(false);
    expect(result.current.showWizard).toBe(false);
    expect(result.current.showInstallGuide).toBe(false);
    expect(result.current.showShareHub).toBe(false);

    // Clean view defaults to false
    expect(result.current.cleanView).toBe(false);
  });

  it('showWizard is true when wizard is not completed', async () => {
    const { isWizardCompleted } = await import('../src/domain/configPersistence');
    (isWizardCompleted as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

    const { result } = renderHook(() => useModalManager());
    expect(result.current.showWizard).toBe(true);
  });

  it('toggleCleanView hides player panel and sidebar when entering clean view', () => {
    const { result } = renderHook(() => useModalManager());

    expect(result.current.cleanView).toBe(false);
    expect(result.current.showPlayerPanel).toBe(true);
    expect(result.current.showSidebar).toBe(true);

    act(() => {
      result.current.toggleCleanView();
    });

    expect(result.current.cleanView).toBe(true);
    expect(result.current.showPlayerPanel).toBe(false);
    expect(result.current.showSidebar).toBe(false);
  });

  it('toggleCleanView shows player panel and sidebar when exiting clean view', () => {
    const { result } = renderHook(() => useModalManager());

    // Enter clean view
    act(() => {
      result.current.toggleCleanView();
    });
    expect(result.current.cleanView).toBe(true);

    // Exit clean view
    act(() => {
      result.current.toggleCleanView();
    });

    expect(result.current.cleanView).toBe(false);
    expect(result.current.showPlayerPanel).toBe(true);
    expect(result.current.showSidebar).toBe(true);
  });

  it('setters update individual modal states', () => {
    const { result } = renderHook(() => useModalManager());

    act(() => { result.current.setShowTemplates(true); });
    expect(result.current.showTemplates).toBe(true);

    act(() => { result.current.setShowHistory(true); });
    expect(result.current.showHistory).toBe(true);

    act(() => { result.current.setShowCallTheClock(true); });
    expect(result.current.showCallTheClock).toBe(true);

    act(() => { result.current.setShowHelp(true); });
    expect(result.current.showHelp).toBe(true);

    act(() => { result.current.setShowShareHub(true); });
    expect(result.current.showShareHub).toBe(true);
  });

  it('setters support functional updates', () => {
    const { result } = renderHook(() => useModalManager());

    act(() => { result.current.setShowCallTheClock((v) => !v); });
    expect(result.current.showCallTheClock).toBe(true);

    act(() => { result.current.setShowCallTheClock((v) => !v); });
    expect(result.current.showCallTheClock).toBe(false);
  });

  it('setCleanView works independently of toggleCleanView', () => {
    const { result } = renderHook(() => useModalManager());

    act(() => { result.current.setCleanView(true); });
    expect(result.current.cleanView).toBe(true);
    // setCleanView does NOT auto-hide panels (only toggleCleanView does)
    expect(result.current.showPlayerPanel).toBe(true);

    act(() => { result.current.setCleanView(false); });
    expect(result.current.cleanView).toBe(false);
  });

  it('panel toggles work independently', () => {
    const { result } = renderHook(() => useModalManager());

    act(() => { result.current.setShowPlayerPanel(false); });
    expect(result.current.showPlayerPanel).toBe(false);
    expect(result.current.showSidebar).toBe(true);

    act(() => { result.current.setShowSidebar(false); });
    expect(result.current.showSidebar).toBe(false);
  });
});

// Minimal t() stub for useGameComputedState tests
const stubT = ((key: string) => key) as Parameters<typeof useGameComputedState>[0]['t'];

function makeComputedConfig(overrides?: Partial<ReturnType<typeof defaultConfig>>) {
  return { ...defaultConfig(), ...overrides };
}

describe('useGameComputedState', () => {
  it('computes activePlayerCount from config.players', () => {
    const config = makeComputedConfig();
    const { result } = renderHook(() =>
      useGameComputedState({
        config,
        timerState: { currentLevelIndex: 0, remainingSeconds: 600, status: 'stopped' },
        tournamentEvents: [],
        t: stubT,
        lastRebuyLevelIndex: -1,
        addOnEndLevelIndex: null,
        displaySeconds: 600,
      }),
    );
    expect(result.current.activePlayerCount).toBe(config.players.filter(p => p.status === 'active').length);
  });

  it('detects tournamentFinished when only 1 active player', () => {
    const config = makeComputedConfig();
    // Default config has empty players — add 3 players, eliminate 2
    const basePlayers = [
      { id: '1', name: 'A', rebuys: 0, addOn: false, status: 'active' as const, placement: null, eliminatedBy: null, knockouts: 0 },
      { id: '2', name: 'B', rebuys: 0, addOn: false, status: 'active' as const, placement: null, eliminatedBy: null, knockouts: 0 },
      { id: '3', name: 'C', rebuys: 0, addOn: false, status: 'active' as const, placement: null, eliminatedBy: null, knockouts: 0 },
    ];
    const players = basePlayers.map((p, i) =>
      i === 0 ? p : { ...p, status: 'eliminated' as const, placement: basePlayers.length - i },
    );
    const { result } = renderHook(() =>
      useGameComputedState({
        config: { ...config, players },
        timerState: { currentLevelIndex: 0, remainingSeconds: 300, status: 'paused' },
        tournamentEvents: [],
        t: stubT,
        lastRebuyLevelIndex: -1,
        addOnEndLevelIndex: null,
        displaySeconds: 300,
      }),
    );
    expect(result.current.tournamentFinished).toBe(true);
    expect(result.current.winner).not.toBeNull();
    expect(result.current.winner?.id).toBe('1');
  });

  it('returns isBreak true for break levels', () => {
    const config = makeComputedConfig();
    const breakIndex = config.levels.findIndex(l => l.type === 'break');
    if (breakIndex < 0) return; // No break in default config — skip
    const { result } = renderHook(() =>
      useGameComputedState({
        config,
        timerState: { currentLevelIndex: breakIndex, remainingSeconds: 300, status: 'running' },
        tournamentEvents: [],
        t: stubT,
        lastRebuyLevelIndex: -1,
        addOnEndLevelIndex: null,
        displaySeconds: 300,
      }),
    );
    expect(result.current.isBreak).toBe(true);
  });

  it('computes paidPlaces from payout entries', () => {
    const config = makeComputedConfig();
    const { result } = renderHook(() =>
      useGameComputedState({
        config,
        timerState: { currentLevelIndex: 0, remainingSeconds: 600, status: 'stopped' },
        tournamentEvents: [],
        t: stubT,
        lastRebuyLevelIndex: -1,
        addOnEndLevelIndex: null,
        displaySeconds: 600,
      }),
    );
    expect(result.current.paidPlaces).toBe(config.payout.entries.length);
  });
});

describe('useTournamentEventLog', () => {
  it('starts with empty events and provides handleAppendEvent', () => {
    const { result } = renderHook(() =>
      useTournamentEventLog({
        mode: 'setup',
        currentLevelIndex: 0,
        timerStatus: 'stopped',
        tournamentFinished: false,
        pendingCheckpoint: false,
      }),
    );
    expect(result.current.tournamentEvents).toEqual([]);
    expect(typeof result.current.handleAppendEvent).toBe('function');
    expect(typeof result.current.setTournamentEvents).toBe('function');
  });

  it('logs tournament_started event on mode transition to game', () => {
    const { result, rerender } = renderHook(
      (props) => useTournamentEventLog(props),
      {
        initialProps: {
          mode: 'setup' as const,
          currentLevelIndex: 0,
          timerStatus: 'stopped' as const,
          tournamentFinished: false,
          pendingCheckpoint: false,
        },
      },
    );
    expect(result.current.tournamentEvents).toEqual([]);

    // Transition to game mode
    rerender({
      mode: 'game',
      currentLevelIndex: 0,
      timerStatus: 'stopped' as const,
      tournamentFinished: false,
      pendingCheckpoint: false,
    });

    // Should have tournament_started event
    expect(result.current.tournamentEvents.length).toBeGreaterThanOrEqual(1);
    expect(result.current.tournamentEvents[0].type).toBe('tournament_started');
  });

  it('clears events when returning to setup from game', () => {
    const { result, rerender } = renderHook(
      (props) => useTournamentEventLog(props),
      {
        initialProps: {
          mode: 'game' as const,
          currentLevelIndex: 0,
          timerStatus: 'running' as const,
          tournamentFinished: false,
          pendingCheckpoint: false,
        },
      },
    );

    // Transition back to setup
    rerender({
      mode: 'setup',
      currentLevelIndex: 0,
      timerStatus: 'stopped' as const,
      tournamentFinished: false,
      pendingCheckpoint: false,
    });

    expect(result.current.tournamentEvents).toEqual([]);
  });
});

describe('useCheckpointManager', () => {
  beforeEach(() => {
    clearCheckpoint();
  });

  it('does not save when mode is setup', () => {
    vi.useFakeTimers();
    const config = defaultConfig();
    const settings = defaultSettings();

    renderHook(() =>
      useCheckpointManager({
        mode: 'setup',
        config,
        settings,
        currentLevelIndex: 0,
        remainingSeconds: 600,
        timerStatus: 'stopped',
        tournamentEvents: [],
      }),
    );

    // Advance past debounce
    vi.advanceTimersByTime(1000);
    expect(loadCheckpoint()).toBeNull();
    vi.useRealTimers();
  });

  it('saves checkpoint after debounce in game mode', () => {
    vi.useFakeTimers();
    const config = defaultConfig();
    const settings = defaultSettings();

    renderHook(() =>
      useCheckpointManager({
        mode: 'game',
        config,
        settings,
        currentLevelIndex: 2,
        remainingSeconds: 300,
        timerStatus: 'paused',
        tournamentEvents: [],
      }),
    );

    // Before debounce: no checkpoint saved yet
    expect(loadCheckpoint()).toBeNull();

    // After debounce (500ms)
    vi.advanceTimersByTime(600);
    const cp = loadCheckpoint();
    expect(cp).not.toBeNull();
    expect(cp!.timer.currentLevelIndex).toBe(2);
    expect(cp!.timer.remainingSeconds).toBe(300);
    vi.useRealTimers();
  });
});
