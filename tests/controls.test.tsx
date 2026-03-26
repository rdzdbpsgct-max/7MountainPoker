/**
 * Controls Component Tests — Phase 3
 *
 * Tests the primary user interaction surface during a tournament:
 * Play/Pause, Next Level, Previous Level, Reset, Restart, Last Hand,
 * Hand-for-Hand, Clean View, Call the Clock.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { Controls } from '../src/components/Controls';
import type { TimerState } from '../src/domain/types';

// Mock i18n
vi.mock('../src/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'controls.start': 'Start',
        'controls.pause': 'Pause',
        'controls.end': 'End',
        'controls.next': 'Next',
        'controls.previous': 'Previous',
        'controls.levelReset': 'Reset Level',
        'controls.tournamentRestart': 'Restart',
        'controls.lastHand': 'Last Hand',
        'controls.handForHand': 'Hand for Hand',
        'controls.callTheClock': 'Call the Clock',
        'controls.nextHand': 'Next Hand',
        'controls.previousTooltip': 'Previous level',
        'controls.nextTooltip': 'Next level',
        'controls.startPauseTooltip': 'Start/Pause',
        'controls.levelResetTooltip': 'Reset this level',
        'controls.tournamentRestartTooltip': 'Restart tournament',
        'controls.lastHandTooltip': 'Toggle last hand',
        'controls.handForHandTooltip': 'Toggle hand for hand',
        'controls.nextHandTooltip': 'Next hand',
        'controls.skipBreak': 'Skip Break',
        'controls.extendBreak2': '+2 min',
        'controls.extendBreak5': '+5 min',
      };
      return map[key] ?? key;
    },
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

function stoppedTimer(remaining = 600): TimerState {
  return { currentLevelIndex: 0, remainingSeconds: remaining, status: 'stopped', startedAt: null, remainingAtStart: null };
}

function runningTimer(): TimerState {
  return { currentLevelIndex: 0, remainingSeconds: 300, status: 'running', startedAt: Date.now(), remainingAtStart: 300 };
}

function pausedTimer(): TimerState {
  return { currentLevelIndex: 0, remainingSeconds: 300, status: 'paused', startedAt: null, remainingAtStart: null };
}

describe('Controls', () => {
  const noop = vi.fn();

  function renderControls(overrides?: Partial<Parameters<typeof Controls>[0]>) {
    const props = {
      timerState: stoppedTimer(),
      onToggleStartPause: noop,
      onNext: noop,
      onPrevious: noop,
      onReset: noop,
      onRestart: noop,
      ...overrides,
    };
    return render(<Controls {...props} />);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Core buttons ---
  it('renders Start button when timer is stopped', () => {
    renderControls({ timerState: stoppedTimer() });
    expect(screen.getByText('Start')).toBeDefined();
  });

  it('renders Pause button when timer is running', () => {
    renderControls({ timerState: runningTimer() });
    expect(screen.getByText('Pause')).toBeDefined();
  });

  it('renders Start button when timer is paused', () => {
    renderControls({ timerState: pausedTimer() });
    expect(screen.getByText('Start')).toBeDefined();
  });

  it('renders End when stopped and remainingSeconds is 0', () => {
    renderControls({ timerState: stoppedTimer(0) });
    expect(screen.getByText('End')).toBeDefined();
  });

  it('calls onToggleStartPause when start button is clicked', () => {
    const handler = vi.fn();
    renderControls({ onToggleStartPause: handler });
    fireEvent.click(screen.getByText('Start'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when next button is clicked', () => {
    const handler = vi.fn();
    renderControls({ onNext: handler });
    fireEvent.click(screen.getByText('Next'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls onPrevious when previous button is clicked', () => {
    const handler = vi.fn();
    renderControls({ onPrevious: handler });
    fireEvent.click(screen.getByText('Previous'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // --- Secondary controls ---
  it('renders reset and restart buttons by default', () => {
    renderControls();
    expect(screen.getByText('Reset Level')).toBeDefined();
    expect(screen.getByText('Restart')).toBeDefined();
  });

  it('calls onReset when reset button is clicked', () => {
    const handler = vi.fn();
    renderControls({ onReset: handler });
    fireEvent.click(screen.getByText('Reset Level'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls onRestart when restart button is clicked', () => {
    const handler = vi.fn();
    renderControls({ onRestart: handler });
    fireEvent.click(screen.getByText('Restart'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // --- Last Hand ---
  it('renders last hand button when onLastHand is provided', () => {
    renderControls({ onLastHand: noop });
    expect(screen.getByText('Last Hand')).toBeDefined();
  });

  it('does not render last hand button when onLastHand is undefined', () => {
    renderControls();
    expect(screen.queryByText('Last Hand')).toBeNull();
  });

  it('calls onLastHand when last hand button is clicked', () => {
    const handler = vi.fn();
    renderControls({ onLastHand: handler });
    fireEvent.click(screen.getByText('Last Hand'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // --- Hand-for-Hand ---
  it('renders hand-for-hand button when showHandForHand + onHandForHand', () => {
    renderControls({ showHandForHand: true, onHandForHand: noop });
    expect(screen.getByText('Hand for Hand')).toBeDefined();
  });

  it('shows Next Hand button when handForHandActive and timer not running', () => {
    renderControls({
      handForHandActive: true,
      onNextHand: noop,
      showHandForHand: true,
      onHandForHand: noop,
      timerState: pausedTimer(),
    });
    expect(screen.getByText('Next Hand')).toBeDefined();
  });

  it('hides Next Hand button when timer is running', () => {
    renderControls({
      handForHandActive: true,
      onNextHand: noop,
      showHandForHand: true,
      onHandForHand: noop,
      timerState: runningTimer(),
    });
    expect(screen.queryByText('Next Hand')).toBeNull();
  });

  // --- Call the Clock ---
  it('renders call the clock button with seconds', () => {
    renderControls({ onCallTheClock: noop, callTheClockSeconds: 60 });
    // Button text contains the seconds value
    const btn = screen.getByTitle('Call the Clock');
    expect(btn.textContent).toContain('60');
  });

  it('calls onCallTheClock when clicked', () => {
    const handler = vi.fn();
    renderControls({ onCallTheClock: handler, callTheClockSeconds: 30 });
    fireEvent.click(screen.getByTitle('Call the Clock'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // --- Aria attributes ---
  it('sets aria-pressed on start/pause button based on running state', () => {
    const { rerender } = render(
      <Controls
        timerState={runningTimer()}
        onToggleStartPause={noop}
        onNext={noop}
        onPrevious={noop}
        onReset={noop}
        onRestart={noop}
      />
    );
    const btn = screen.getByText('Pause');
    expect(btn.getAttribute('aria-pressed')).toBe('true');

    rerender(
      <Controls
        timerState={stoppedTimer()}
        onToggleStartPause={noop}
        onNext={noop}
        onPrevious={noop}
        onReset={noop}
        onRestart={noop}
      />
    );
    const startBtn = screen.getByText('Start');
    expect(startBtn.getAttribute('aria-pressed')).toBe('false');
  });

  // --- Break controls ---
  it('renders skip and extend buttons when isBreak is true', () => {
    renderControls({
      timerState: runningTimer(),
      isBreak: true,
      onSkipBreak: noop,
      onExtendBreak: noop,
    });
    expect(screen.getByTitle('Skip Break')).toBeTruthy();
    expect(screen.getByTitle('+2 min')).toBeTruthy();
    expect(screen.getByTitle('+5 min')).toBeTruthy();
  });

  it('does not render break buttons when isBreak is false', () => {
    renderControls({
      timerState: runningTimer(),
      isBreak: false,
      onSkipBreak: noop,
      onExtendBreak: noop,
    });
    expect(screen.queryByTitle('Skip Break')).toBeFalsy();
    expect(screen.queryByTitle('+2 min')).toBeFalsy();
  });

  it('calls onExtendBreak with correct seconds', () => {
    const extend = vi.fn();
    renderControls({
      timerState: runningTimer(),
      isBreak: true,
      onExtendBreak: extend,
    });
    fireEvent.click(screen.getByTitle('+2 min'));
    expect(extend).toHaveBeenCalledWith(120);
    fireEvent.click(screen.getByTitle('+5 min'));
    expect(extend).toHaveBeenCalledWith(300);
  });

  it('calls onSkipBreak when skip button clicked', () => {
    const skip = vi.fn();
    renderControls({
      timerState: runningTimer(),
      isBreak: true,
      onSkipBreak: skip,
    });
    fireEvent.click(screen.getByTitle('Skip Break'));
    expect(skip).toHaveBeenCalledOnce();
  });
});
