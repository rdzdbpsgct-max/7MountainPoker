import { render, screen, fireEvent, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LanguageProvider } from '../src/i18n';
import { ThemeProvider } from '../src/theme';
import { NumberStepper } from '../src/components/NumberStepper';
import { CollapsibleSection } from '../src/components/CollapsibleSection';
import { CollapsibleSubSection } from '../src/components/CollapsibleSubSection';
import { PrintView } from '../src/components/PrintView';
import { CallTheClock } from '../src/components/CallTheClock';
import { BubbleIndicator } from '../src/components/BubbleIndicator';
import { RebuyStatus } from '../src/components/RebuyStatus';
import { ChevronIcon } from '../src/components/ChevronIcon';
import { LanguageSwitcher } from '../src/components/LanguageSwitcher';
import { ThemeSwitcher } from '../src/components/ThemeSwitcher';
import { ErrorBoundary, SectionErrorBoundary } from '../src/components/ErrorBoundary';
import { useTimer } from '../src/hooks/useTimer';
import { useConfirmDialog } from '../src/hooks/useConfirmDialog';
import { useVoiceAnnouncements } from '../src/hooks/useVoiceAnnouncements';
import type { TournamentConfig, TournamentResult, Level, Settings, RebuyConfig, Player, PayoutConfig, AddOnConfig, BountyConfig, ChipDenomination, TimerState, TournamentEvent } from '../src/domain/types';
import { defaultConfig, defaultSettings } from '../src/domain/logic';
import { ConfigEditor } from '../src/components/ConfigEditor';
import { SettingsPanel } from '../src/components/SettingsPanel';
import { LoadingFallback } from '../src/components/LoadingFallback';
import { PlayerPanel } from '../src/components/PlayerPanel';

// Mock the speech module for useVoiceAnnouncements tests
vi.mock('../src/domain/speech', () => ({
  initSpeech: vi.fn(),
  setSpeechVolume: vi.fn(),
  setSpeechLanguage: vi.fn(),
  cancelSpeech: vi.fn(),
  announceLevelChange: vi.fn(),
  announceBreakStart: vi.fn(),
  announceBreakWarning: vi.fn(),
  announceBreakOver: vi.fn(),
  announceAddOn: vi.fn(),
  announceRebuyEnded: vi.fn(),
  announceColorUp: vi.fn(),
  announceColorUpWarning: vi.fn(),
  announceBounty: vi.fn(),
  announceElimination: vi.fn(),
  announceRebuyAvailable: vi.fn(),
  announceFiveMinutes: vi.fn(),
  announceThreeRemaining: vi.fn(),
  announcePlayersRemaining: vi.fn(),
  announceHeadsUp: vi.fn(),
  announceTimerPaused: vi.fn(),
  announceTimerResumed: vi.fn(),
  announceTournamentStart: vi.fn(),
  announceCountdown: vi.fn(() => false),
  announceLastHand: vi.fn(),
  announceHandForHand: vi.fn(),
  announceMysteryBounty: vi.fn(),
  announceCallTheClock: vi.fn(),
  announceCallTheClockExpired: vi.fn(),
  announceLateRegistrationClosed: vi.fn(),
  announceTableMove: vi.fn(),
  announceTableDissolution: vi.fn(),
  announceFinalTable: vi.fn(),
  announceRebuyTaken: vi.fn(),
  announceWinner: vi.fn(),
  announceTournamentWinner: vi.fn(),
  announceBubble: vi.fn(),
  announceInTheMoney: vi.fn(),
  speakCustomText: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Test wrapper — provides i18n + theme contexts
// ---------------------------------------------------------------------------

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </ThemeProvider>
  );
}

function renderWithProviders(ui: ReactNode) {
  return render(ui, { wrapper: Wrapper });
}

// ===================== NumberStepper =====================

describe('NumberStepper', () => {
  it('renders value and +/- buttons', () => {
    const onChange = vi.fn();
    renderWithProviders(<NumberStepper value={10} onChange={onChange} min={0} max={100} />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(10);
    expect(screen.getByText('+')).toBeInTheDocument();
    expect(screen.getByText('−')).toBeInTheDocument();
  });

  it('increments on + click', () => {
    const onChange = vi.fn();
    renderWithProviders(<NumberStepper value={5} onChange={onChange} min={0} max={10} step={1} />);
    fireEvent.pointerDown(screen.getByText('+'));
    fireEvent.pointerUp(screen.getByText('+'));
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it('decrements on − click', () => {
    const onChange = vi.fn();
    renderWithProviders(<NumberStepper value={5} onChange={onChange} min={0} max={10} step={1} />);
    fireEvent.pointerDown(screen.getByText('−'));
    fireEvent.pointerUp(screen.getByText('−'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('respects min boundary', () => {
    const onChange = vi.fn();
    renderWithProviders(<NumberStepper value={0} onChange={onChange} min={0} max={10} step={1} />);
    fireEvent.pointerDown(screen.getByText('−'));
    fireEvent.pointerUp(screen.getByText('−'));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('respects max boundary', () => {
    const onChange = vi.fn();
    renderWithProviders(<NumberStepper value={10} onChange={onChange} min={0} max={10} step={1} />);
    fireEvent.pointerDown(screen.getByText('+'));
    fireEvent.pointerUp(screen.getByText('+'));
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('uses custom step', () => {
    const onChange = vi.fn();
    renderWithProviders(<NumberStepper value={10} onChange={onChange} min={0} max={100} step={5} />);
    fireEvent.pointerDown(screen.getByText('+'));
    fireEvent.pointerUp(screen.getByText('+'));
    expect(onChange).toHaveBeenCalledWith(15);
  });
});

// ===================== CollapsibleSection =====================

describe('CollapsibleSection', () => {
  it('renders title and shows children when open', () => {
    renderWithProviders(
      <CollapsibleSection title="Test Section" defaultOpen>
        <div data-testid="child">Child Content</div>
      </CollapsibleSection>,
    );
    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('hides children when collapsed', () => {
    renderWithProviders(
      <CollapsibleSection title="Test Section" defaultOpen={false}>
        <div data-testid="child">Child Content</div>
      </CollapsibleSection>,
    );
    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('toggles on header click', () => {
    renderWithProviders(
      <CollapsibleSection title="Toggle Me" defaultOpen={false}>
        <div data-testid="child">Content</div>
      </CollapsibleSection>,
    );
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Toggle Me'));
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('displays summary when provided', () => {
    renderWithProviders(
      <CollapsibleSection title="Section" summary="Summary info" defaultOpen={false}>
        <div>Content</div>
      </CollapsibleSection>,
    );
    expect(screen.getByText('Summary info')).toBeInTheDocument();
  });
});

// ===================== PrintView =====================

describe('PrintView', () => {
  it('renders blind structure table', () => {
    const config = defaultConfig();
    renderWithProviders(<PrintView config={config} />);
    // Should render column headers
    expect(screen.getByText('SB')).toBeInTheDocument();
    expect(screen.getByText('BB')).toBeInTheDocument();
  });

  it('renders tournament results when provided', () => {
    const config = defaultConfig();
    const result: TournamentResult = {
      id: 'test-1',
      tournamentName: 'Test Tournament',
      date: new Date().toISOString(),
      playerCount: 4,
      prizePool: 40,
      totalRebuys: 0,
      totalAddOns: 0,
      totalBuyIns: 4,
      totalBountyPool: 0,
      levelCount: 3,
      players: [
        { name: 'Alice', place: 1, payout: 28, rebuys: 0, addOn: false, knockouts: 1, netBalance: 18 },
        { name: 'Bob', place: 2, payout: 12, rebuys: 0, addOn: false, knockouts: 0, netBalance: 2 },
        { name: 'Charlie', place: 3, payout: 0, rebuys: 0, addOn: false, knockouts: 0, netBalance: -10 },
        { name: 'Diana', place: 4, payout: 0, rebuys: 0, addOn: false, knockouts: 0, netBalance: -10 },
      ],
    };
    renderWithProviders(<PrintView config={config} result={result} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    // First place should have rank number
    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
  });

  it('renders chip denominations when enabled', () => {
    const config: TournamentConfig = {
      ...defaultConfig(),
      chips: {
        enabled: true,
        denominations: [
          { id: '1', value: 25, color: '#ff0000', label: 'Red' },
          { id: '2', value: 100, color: '#0000ff', label: 'Blue' },
        ],
        colorUpEnabled: false,
        colorUpSchedule: [],
      },
    };
    renderWithProviders(<PrintView config={config} />);
    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
  });

  it('renders payout entries when configured', () => {
    const config: TournamentConfig = {
      ...defaultConfig(),
      payout: {
        mode: 'percent',
        entries: [
          { place: 1, value: 60 },
          { place: 2, value: 30 },
          { place: 3, value: 10 },
        ],
      },
    };
    renderWithProviders(<PrintView config={config} />);
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
  });
});

// ===================== useTimer Hook =====================

const testLevels: Level[] = [
  { id: '1', type: 'level', durationSeconds: 600, smallBlind: 25, bigBlind: 50 },
  { id: '2', type: 'level', durationSeconds: 600, smallBlind: 50, bigBlind: 100 },
  { id: '3', type: 'break', durationSeconds: 300 },
];

const testSettings: Settings = {
  soundEnabled: false,
  voiceEnabled: false,
  countdownEnabled: false,
  autoAdvance: false,
  volume: 100,
  callTheClockSeconds: 60,
  accentColor: 'emerald',
  backgroundImage: 'none',
};

describe('useTimer hook', () => {
  it('initializes with first level and stopped status', () => {
    const { result } = renderHook(() => useTimer(testLevels, testSettings));
    expect(result.current.timerState.currentLevelIndex).toBe(0);
    expect(result.current.timerState.remainingSeconds).toBe(600);
    expect(result.current.timerState.status).toBe('stopped');
  });

  it('start() transitions to running', () => {
    const { result } = renderHook(() => useTimer(testLevels, testSettings));
    act(() => { result.current.start(); });
    expect(result.current.timerState.status).toBe('running');
    expect(result.current.timerState.startedAt).not.toBeNull();
  });

  it('pause() transitions to paused', () => {
    const { result } = renderHook(() => useTimer(testLevels, testSettings));
    act(() => { result.current.start(); });
    act(() => { result.current.pause(); });
    expect(result.current.timerState.status).toBe('paused');
    expect(result.current.timerState.startedAt).toBeNull();
  });

  it('toggleStartPause() toggles between running and paused', () => {
    const { result } = renderHook(() => useTimer(testLevels, testSettings));
    act(() => { result.current.toggleStartPause(); });
    expect(result.current.timerState.status).toBe('running');
    act(() => { result.current.toggleStartPause(); });
    expect(result.current.timerState.status).toBe('paused');
  });

  it('nextLevel() advances to next level and starts running', () => {
    const { result } = renderHook(() => useTimer(testLevels, testSettings));
    act(() => { result.current.nextLevel(); });
    expect(result.current.timerState.currentLevelIndex).toBe(1);
    expect(result.current.timerState.remainingSeconds).toBe(600);
    expect(result.current.timerState.status).toBe('running');
  });

  it('previousLevel() goes back to previous level', () => {
    const { result } = renderHook(() => useTimer(testLevels, testSettings));
    act(() => { result.current.nextLevel(); });
    expect(result.current.timerState.currentLevelIndex).toBe(1);
    act(() => { result.current.previousLevel(); });
    expect(result.current.timerState.currentLevelIndex).toBe(0);
  });

  it('resetLevel() resets remaining to full duration', () => {
    const { result } = renderHook(() => useTimer(testLevels, testSettings));
    act(() => { result.current.start(); });
    act(() => { result.current.pause(); });
    act(() => { result.current.resetLevel(); });
    expect(result.current.timerState.remainingSeconds).toBe(600);
    expect(result.current.timerState.status).toBe('stopped');
  });

  it('restart() resets to level 0', () => {
    const { result } = renderHook(() => useTimer(testLevels, testSettings));
    act(() => { result.current.nextLevel(); });
    act(() => { result.current.nextLevel(); });
    expect(result.current.timerState.currentLevelIndex).toBe(2);
    act(() => { result.current.restart(); });
    expect(result.current.timerState.currentLevelIndex).toBe(0);
    expect(result.current.timerState.status).toBe('stopped');
  });

  it('setRemainingSeconds() clamps to level duration and pauses', () => {
    const { result } = renderHook(() => useTimer(testLevels, testSettings));
    act(() => { result.current.start(); });
    act(() => { result.current.setRemainingSeconds(300); });
    expect(result.current.timerState.remainingSeconds).toBe(300);
    expect(result.current.timerState.status).toBe('paused');
  });

  it('setRemainingSeconds() clamps above level duration', () => {
    const { result } = renderHook(() => useTimer(testLevels, testSettings));
    act(() => { result.current.setRemainingSeconds(9999); });
    expect(result.current.timerState.remainingSeconds).toBe(600);
  });

  it('restoreLevel() restores specific level and remaining', () => {
    const { result } = renderHook(() => useTimer(testLevels, testSettings));
    act(() => { result.current.restoreLevel(1, 450); });
    expect(result.current.timerState.currentLevelIndex).toBe(1);
    expect(result.current.timerState.remainingSeconds).toBe(450);
    expect(result.current.timerState.status).toBe('paused');
  });

  it('restoreLevel() clamps level index to valid range', () => {
    const { result } = renderHook(() => useTimer(testLevels, testSettings));
    act(() => { result.current.restoreLevel(99, 100); });
    expect(result.current.timerState.currentLevelIndex).toBe(2); // clamped to last
  });

  it('does not start when remainingSeconds is 0', () => {
    const { result } = renderHook(() => useTimer(testLevels, testSettings));
    act(() => { result.current.setRemainingSeconds(0); });
    act(() => { result.current.toggleStartPause(); });
    expect(result.current.timerState.status).toBe('paused'); // stays paused
  });
});

// ===================== CallTheClock =====================

describe('CallTheClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders countdown display and close button', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <CallTheClock durationSeconds={60} soundEnabled={false} voiceEnabled={false} onClose={onClose} />,
    );
    expect(screen.getByText('60')).toBeInTheDocument();
    // Title "Call the Clock" should be visible
    expect(screen.getByText('Call the Clock')).toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <CallTheClock durationSeconds={60} soundEnabled={false} voiceEnabled={false} onClose={onClose} />,
    );
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on C key', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <CallTheClock durationSeconds={60} soundEnabled={false} voiceEnabled={false} onClose={onClose} />,
    );
    fireEvent.keyDown(window, { code: 'KeyC' });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on dismiss button click', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <CallTheClock durationSeconds={60} soundEnabled={false} voiceEnabled={false} onClose={onClose} />,
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // dismiss button
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on backdrop click', () => {
    const onClose = vi.fn();
    const { container } = renderWithProviders(
      <CallTheClock durationSeconds={60} soundEnabled={false} voiceEnabled={false} onClose={onClose} />,
    );
    // Click the backdrop (outermost fixed div)
    const backdrop = container.querySelector('.fixed');
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });
});

// ===================== BubbleIndicator =====================

describe('BubbleIndicator', () => {
  const defaultProps = {
    isBubble: false,
    showItmFlash: false,
    addOnWindowOpen: false,
    addOnCost: 10,
    addOnChips: 5000,
  };

  it('renders nothing when all flags are false', () => {
    const { container } = renderWithProviders(<BubbleIndicator {...defaultProps} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders bubble banner when isBubble is true', () => {
    renderWithProviders(<BubbleIndicator {...defaultProps} isBubble />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('renders ITM flash when showItmFlash is true', () => {
    renderWithProviders(<BubbleIndicator {...defaultProps} showItmFlash />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('renders last hand banner', () => {
    renderWithProviders(<BubbleIndicator {...defaultProps} lastHandActive />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('renders hand-for-hand banner', () => {
    renderWithProviders(<BubbleIndicator {...defaultProps} handForHandActive />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('renders add-on window banner', () => {
    renderWithProviders(<BubbleIndicator {...defaultProps} addOnWindowOpen addOnCost={15} addOnChips={10000} />);
    const statuses = screen.getAllByRole('status');
    expect(statuses.length).toBeGreaterThanOrEqual(1);
  });

  it('renders multiple banners simultaneously', () => {
    renderWithProviders(<BubbleIndicator {...defaultProps} isBubble lastHandActive handForHandActive />);
    // bubble (role="alert") + lastHand + handForHand (role="status")
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getAllByRole('status').length).toBe(2);
  });
});

// ===================== RebuyStatus =====================

describe('RebuyStatus', () => {
  const baseRebuy: RebuyConfig = {
    enabled: true,
    rebuyChips: 5000,
    rebuyCost: 10,
    limitType: 'levels',
    levelLimit: 4,
    timeLimit: 3600,
    maxRebuysPerPlayer: 3,
    reEntryEnabled: false,
    maxReEntries: 1,
  };

  it('returns null when rebuy is disabled', () => {
    const { container } = renderWithProviders(
      <RebuyStatus active={true} rebuy={{ ...baseRebuy, enabled: false }} currentPlayLevel={1} elapsedSeconds={0} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows active status with level info for level-based rebuy', () => {
    renderWithProviders(
      <RebuyStatus active={true} rebuy={baseRebuy} currentPlayLevel={2} elapsedSeconds={0} />,
    );
    // Should contain the active indicator text
    const container = document.querySelector('[class*="backdrop-blur"]');
    expect(container).toBeInTheDocument();
  });

  it('shows active status with time info for time-based rebuy', () => {
    const timeRebuy = { ...baseRebuy, limitType: 'time' as const, timeLimit: 3600 };
    renderWithProviders(
      <RebuyStatus active={true} rebuy={timeRebuy} currentPlayLevel={2} elapsedSeconds={1800} />,
    );
    const container = document.querySelector('[class*="backdrop-blur"]');
    expect(container).toBeInTheDocument();
  });

  it('shows ended status when not active', () => {
    renderWithProviders(
      <RebuyStatus active={false} rebuy={baseRebuy} currentPlayLevel={5} elapsedSeconds={0} />,
    );
    const container = document.querySelector('[class*="bg-gray"]');
    expect(container).toBeInTheDocument();
  });
});

// ===================== ChevronIcon =====================

describe('ChevronIcon', () => {
  it('renders an SVG with aria-hidden', () => {
    const { container } = render(<ChevronIcon open={false} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies rotate-0 when open', () => {
    const { container } = render(<ChevronIcon open={true} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('rotate-0');
  });

  it('applies -rotate-90 when closed', () => {
    const { container } = render(<ChevronIcon open={false} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('-rotate-90');
  });

  it('accepts custom className', () => {
    const { container } = render(<ChevronIcon open={false} className="text-red-500" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('text-red-500');
  });
});

// ===================== CollapsibleSubSection =====================

describe('CollapsibleSubSection', () => {
  it('hides children when collapsed by default', () => {
    render(
      <CollapsibleSubSection title="Sub Section">
        <div data-testid="child">Content</div>
      </CollapsibleSubSection>,
    );
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('shows children when defaultOpen is true', () => {
    render(
      <CollapsibleSubSection title="Sub Section" defaultOpen>
        <div data-testid="child">Content</div>
      </CollapsibleSubSection>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('toggles on click', () => {
    render(
      <CollapsibleSubSection title="Toggle Sub">
        <div data-testid="child">Content</div>
      </CollapsibleSubSection>,
    );
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Toggle Sub'));
    expect(screen.getByTestId('child')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Toggle Sub'));
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('shows summary when collapsed', () => {
    render(
      <CollapsibleSubSection title="Section" summary="Summary text">
        <div>Content</div>
      </CollapsibleSubSection>,
    );
    expect(screen.getByText('Summary text')).toBeInTheDocument();
  });

  it('hides summary when open', () => {
    render(
      <CollapsibleSubSection title="Section" summary="Summary text" defaultOpen>
        <div>Content</div>
      </CollapsibleSubSection>,
    );
    expect(screen.queryByText('Summary text')).not.toBeInTheDocument();
  });

  it('has aria-expanded attribute', () => {
    render(
      <CollapsibleSubSection title="Section">
        <div>Content</div>
      </CollapsibleSubSection>,
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});

// ===================== LanguageSwitcher =====================

describe('LanguageSwitcher', () => {
  it('renders DE and EN buttons', () => {
    renderWithProviders(<LanguageSwitcher />);
    expect(screen.getByText('DE')).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  it('has title attributes on buttons', () => {
    renderWithProviders(<LanguageSwitcher />);
    expect(screen.getByTitle('Deutsch')).toBeInTheDocument();
    expect(screen.getByTitle('English')).toBeInTheDocument();
  });
});

// ===================== ThemeSwitcher =====================

describe('ThemeSwitcher', () => {
  it('renders three mode buttons', () => {
    renderWithProviders(<ThemeSwitcher />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(3);
  });
});

// ===================== ErrorBoundary =====================

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors
  const originalError = console.error;
  beforeAll(() => { console.error = vi.fn(); });
  afterAll(() => { console.error = originalError; });

  function ThrowingComponent(): JSX.Element {
    throw new Error('Test error');
  }

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">OK</div>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders fallback UI on error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Reload')).toBeInTheDocument();
  });
});

describe('SectionErrorBoundary', () => {
  const originalError = console.error;
  beforeAll(() => { console.error = vi.fn(); });
  afterAll(() => { console.error = originalError; });

  function ThrowingComponent(): JSX.Element {
    throw new Error('Section error');
  }

  it('renders children when no error', () => {
    render(
      <SectionErrorBoundary>
        <div data-testid="child">OK</div>
      </SectionErrorBoundary>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders compact fallback with Retry button on error', () => {
    render(
      <SectionErrorBoundary>
        <ThrowingComponent />
      </SectionErrorBoundary>,
    );
    expect(screen.getByText('Failed to load this section.')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('recovers when Retry is clicked and child no longer throws', () => {
    let shouldThrow = true;
    function MaybeThrow() {
      if (shouldThrow) throw new Error('Chunk load error');
      return <div data-testid="recovered">Loaded!</div>;
    }
    render(
      <SectionErrorBoundary>
        <MaybeThrow />
      </SectionErrorBoundary>,
    );
    // Should show error fallback
    expect(screen.getByText('Retry')).toBeInTheDocument();

    // Fix the error and click Retry
    shouldThrow = false;
    fireEvent.click(screen.getByText('Retry'));

    // Should now render the child successfully
    expect(screen.getByTestId('recovered')).toBeInTheDocument();
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });
});

// ===================== useConfirmDialog Hook =====================

describe('useConfirmDialog', () => {
  it('starts with null confirmAction', () => {
    const { result } = renderHook(() => useConfirmDialog());
    expect(result.current.confirmAction).toBeNull();
  });

  it('confirm() sets the action', () => {
    const { result } = renderHook(() => useConfirmDialog());
    const onConfirm = vi.fn();
    act(() => { result.current.confirm('Title', 'Message', 'OK', onConfirm); });
    expect(result.current.confirmAction).toEqual({
      title: 'Title',
      message: 'Message',
      confirmLabel: 'OK',
      onConfirm,
    });
  });

  it('dismiss() clears the action', () => {
    const { result } = renderHook(() => useConfirmDialog());
    const onConfirm = vi.fn();
    act(() => { result.current.confirm('Title', 'Message', 'OK', onConfirm); });
    expect(result.current.confirmAction).not.toBeNull();
    act(() => { result.current.dismiss(); });
    expect(result.current.confirmAction).toBeNull();
  });

  it('execute() calls onConfirm and clears action', () => {
    const { result } = renderHook(() => useConfirmDialog());
    const onConfirm = vi.fn();
    act(() => { result.current.confirm('Title', 'Message', 'OK', onConfirm); });
    act(() => { result.current.execute(); });
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(result.current.confirmAction).toBeNull();
  });

  it('execute() does nothing when no action is set', () => {
    const { result } = renderHook(() => useConfirmDialog());
    act(() => { result.current.execute(); });
    expect(result.current.confirmAction).toBeNull();
  });

  it('closes on Escape key', () => {
    const { result } = renderHook(() => useConfirmDialog());
    act(() => { result.current.confirm('Title', 'Message', 'OK', vi.fn()); });
    expect(result.current.confirmAction).not.toBeNull();
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }); });
    expect(result.current.confirmAction).toBeNull();
  });
});

// ===================== LoadingFallback =====================

describe('LoadingFallback', () => {
  it('renders three pulse dots', () => {
    renderWithProviders(<LoadingFallback />);
    const dots = document.querySelectorAll('.animate-pulse');
    expect(dots).toHaveLength(3);
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(<LoadingFallback className="h-screen" />);
    expect(container.firstChild).toHaveClass('h-screen');
  });
});

// ===================== ConfigEditor =====================

describe('ConfigEditor', () => {
  const baseConfig = defaultConfig();

  it('renders level rows matching config.levels count', () => {
    renderWithProviders(
      <ConfigEditor config={baseConfig} onChange={vi.fn()} anteEnabled={false} />
    );
    // Each level/break row has a type badge (Level or Pause)
    const levelCount = baseConfig.levels.filter(l => l.type === 'level').length;
    const breakCount = baseConfig.levels.filter(l => l.type === 'break').length;
    // Index numbers (1, 2, 3...) are rendered for each row
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(String(baseConfig.levels.length))).toBeInTheDocument();
    // Total rows = levels + breaks
    expect(levelCount + breakCount).toBe(baseConfig.levels.length);
  });

  it('calls onChange when "Add Level" button is clicked', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <ConfigEditor config={baseConfig} onChange={onChange} anteEnabled={false} />
    );
    fireEvent.click(screen.getByText(/Level/i, { selector: 'button' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const newConfig = onChange.mock.calls[0][0] as TournamentConfig;
    expect(newConfig.levels.length).toBe(baseConfig.levels.length + 1);
  });

  it('calls onChange when "Add Break" button is clicked', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <ConfigEditor config={baseConfig} onChange={onChange} anteEnabled={false} />
    );
    // The add-break button text varies by language; find button containing "Pause" or "Break"
    const addBreakBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Pause') || b.textContent?.includes('Break'));
    expect(addBreakBtn).toBeTruthy();
    fireEvent.click(addBreakBtn!);
    expect(onChange).toHaveBeenCalledTimes(1);
    const newConfig = onChange.mock.calls[0][0] as TournamentConfig;
    expect(newConfig.levels.length).toBe(baseConfig.levels.length + 1);
    expect(newConfig.levels[newConfig.levels.length - 1].type).toBe('break');
  });

  it('hides ante column when anteEnabled is false', () => {
    renderWithProviders(
      <ConfigEditor config={baseConfig} onChange={vi.fn()} anteEnabled={false} />
    );
    expect(screen.queryByText('Ante:')).not.toBeInTheDocument();
  });

  it('shows ante inputs when anteEnabled is true', () => {
    renderWithProviders(
      <ConfigEditor config={baseConfig} onChange={vi.fn()} anteEnabled={true} />
    );
    // At least one Ante label should be visible
    expect(screen.getAllByText('Ante:').length).toBeGreaterThan(0);
  });

  it('prevents removing last level', () => {
    const singleLevel: TournamentConfig = {
      ...baseConfig,
      levels: [baseConfig.levels[0]],
    };
    renderWithProviders(
      <ConfigEditor config={singleLevel} onChange={vi.fn()} anteEnabled={false} />
    );
    // Delete button should be disabled when only 1 level
    const deleteButtons = screen.getAllByRole('button').filter(b => b.textContent === '✕');
    expect(deleteButtons.length).toBe(1);
    expect(deleteButtons[0]).toBeDisabled();
  });
});

// ===================== SettingsPanel =====================

describe('SettingsPanel', () => {
  const baseSettings = defaultSettings();

  it('renders all setting toggles', () => {
    renderWithProviders(
      <SettingsPanel settings={baseSettings} onChange={vi.fn()} onToggleFullscreen={vi.fn()} />
    );
    // CheckBox components have role="switch"
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThanOrEqual(3); // sound, autoAdvance, largeDisplay (countdown moved to setup)
  });

  it('calls onChange when toggling sound', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <SettingsPanel settings={baseSettings} onChange={onChange} onToggleFullscreen={vi.fn()} />
    );
    const switches = screen.getAllByRole('switch');
    // First switch is sound
    fireEvent.click(switches[0]);
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as Settings;
    expect(updated.soundEnabled).toBe(!baseSettings.soundEnabled);
  });

  it('calls onToggleFullscreen when clicking fullscreen button', () => {
    const onFullscreen = vi.fn();
    renderWithProviders(
      <SettingsPanel settings={baseSettings} onChange={vi.fn()} onToggleFullscreen={onFullscreen} />
    );
    // Fullscreen button contains translated text
    const fullscreenBtn = screen.getAllByRole('button').find(b =>
      b.textContent?.includes('Vollbild') || b.textContent?.includes('Fullscreen')
    );
    expect(fullscreenBtn).toBeTruthy();
    fireEvent.click(fullscreenBtn!);
    expect(onFullscreen).toHaveBeenCalledTimes(1);
  });

  it('renders 6 accent color buttons', () => {
    renderWithProviders(
      <SettingsPanel settings={baseSettings} onChange={vi.fn()} onToggleFullscreen={vi.fn()} />
    );
    // Appearance section is open by default — accent colors visible immediately
    expect(screen.getByTitle('Emerald')).toBeInTheDocument();
    expect(screen.getByTitle('Blue')).toBeInTheDocument();
    expect(screen.getByTitle('Purple')).toBeInTheDocument();
    expect(screen.getByTitle('Red')).toBeInTheDocument();
    expect(screen.getByTitle('Amber')).toBeInTheDocument();
    expect(screen.getByTitle('Cyan')).toBeInTheDocument();
  });

  it('renders 9 background option buttons', () => {
    renderWithProviders(
      <SettingsPanel settings={baseSettings} onChange={vi.fn()} onToggleFullscreen={vi.fn()} />
    );
    // Appearance section is open by default — background grid visible immediately
    const bgGrid = document.querySelector('.grid.grid-cols-3');
    expect(bgGrid).toBeTruthy();
    expect(bgGrid!.children.length).toBe(9);
  });
});

// ===================== PlayerPanel =====================

describe('PlayerPanel', () => {
  function makePlayer(overrides: Partial<Player> = {}): Player {
    return {
      id: 'p1',
      name: 'Alice',
      status: 'active',
      rebuys: 0,
      addOn: false,
      seatIndex: 0,
      knockouts: 0,
      ...overrides,
    };
  }

  const defaultRebuyConfig: RebuyConfig = {
    enabled: false,
    limitType: 'levels',
    levelLimit: 4,
    timeLimit: 3600,
    rebuyCost: 10,
    rebuyChips: 20000,
    maxRebuysPerPlayer: 0,
    separatePot: false,
    reEntryEnabled: false,
    maxReEntries: 1,
  };

  const defaultAddOnConfig: AddOnConfig = { enabled: false, cost: 10, chips: 20000 };
  const defaultBountyConfig: BountyConfig = { enabled: false, amount: 5, type: 'fixed' };
  const defaultPayoutConfig: PayoutConfig = { type: 'percentage', entries: [{ place: 1, value: 100 }] };

  function makeProps(overrides: Record<string, unknown> = {}) {
    return {
      players: [makePlayer({ id: 'p1', name: 'Alice', seatIndex: 0 }), makePlayer({ id: 'p2', name: 'Bob', seatIndex: 1 })],
      dealerIndex: 0,
      buyIn: 10,
      payout: defaultPayoutConfig,
      rebuyActive: false,
      rebuyConfig: defaultRebuyConfig,
      addOnConfig: defaultAddOnConfig,
      addOnWindowOpen: false,
      bountyConfig: defaultBountyConfig,
      averageStack: 20000,
      onUpdateRebuys: vi.fn(),
      onUpdateAddOn: vi.fn(),
      onEliminatePlayer: vi.fn(),
      onReinstatePlayer: vi.fn(),
      onAdvanceDealer: vi.fn(),
      ...overrides,
    };
  }

  it('renders all active player names', () => {
    const props = makeProps();
    renderWithProviders(<PlayerPanel {...props} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows eliminate buttons when more than 1 active player', () => {
    const props = makeProps();
    renderWithProviders(<PlayerPanel {...props} />);
    // German default: "Aus" for eliminate
    const eliminateButtons = screen.getAllByRole('button').filter(b =>
      b.textContent === 'Raus' || b.textContent === 'Out'
    );
    expect(eliminateButtons.length).toBe(2);
  });

  it('calls onEliminatePlayer when eliminate button is clicked (no bounty)', () => {
    const onEliminate = vi.fn();
    const props = makeProps({ onEliminatePlayer: onEliminate });
    renderWithProviders(<PlayerPanel {...props} />);
    const eliminateButtons = screen.getAllByRole('button').filter(b =>
      b.textContent === 'Raus' || b.textContent === 'Out'
    );
    fireEvent.click(eliminateButtons[0]);
    expect(onEliminate).toHaveBeenCalledWith('p1', null);
  });

  it('shows reinstate button for eliminated players', () => {
    const props = makeProps({
      players: [
        makePlayer({ id: 'p1', name: 'Alice', status: 'active', seatIndex: 0 }),
        makePlayer({ id: 'p2', name: 'Bob', status: 'eliminated', seatIndex: 1, placement: 2 }),
      ],
    });
    renderWithProviders(<PlayerPanel {...props} />);
    // German: "Zurückholen" / English: "Reinstate"
    const reinstateBtn = screen.getAllByRole('button').find(b =>
      b.textContent?.includes('Zurück') || b.textContent?.includes('Reinstate')
    );
    expect(reinstateBtn).toBeTruthy();
  });
});

// ===================== useVoiceAnnouncements (M33) =====================

describe('useVoiceAnnouncements', () => {
  // Import mocked speech functions
  let speech: Record<string, ReturnType<typeof vi.fn>>;
  beforeEach(async () => {
    speech = await import('../src/domain/speech') as unknown as Record<string, ReturnType<typeof vi.fn>>;
    // Reset all mocks
    Object.values(speech).forEach((fn) => { if (typeof fn === 'function' && fn.mockClear) fn.mockClear(); });
  });

  const makeLevel = (overrides?: Partial<Level>): Level => ({
    type: 'level',
    durationSeconds: 900,
    smallBlind: 100,
    bigBlind: 200,
    ante: 0,
    ...overrides,
  });

  const makeBreak = (durationSeconds = 600, label?: string): Level => ({
    type: 'break',
    durationSeconds,
    label,
  });

  const makeTimerState = (overrides?: Partial<TimerState>): TimerState => ({
    currentLevelIndex: 0,
    remainingSeconds: 900,
    status: 'running',
    elapsedMs: 0,
    startedAt: null,
    ...overrides,
  });

  const makeDefaultParams = (overrides?: Record<string, unknown>) => ({
    mode: 'game' as const,
    settings: { ...defaultSettings(), voiceEnabled: true },
    config: {
      ...defaultConfig(),
      levels: [
        makeLevel({ smallBlind: 25, bigBlind: 50 }),
        makeBreak(600),
        makeLevel({ smallBlind: 50, bigBlind: 100 }),
      ],
    },
    timerState: makeTimerState(),
    colorUpMap: new Map<number, ChipDenomination[]>(),
    activePlayerCount: 8,
    paidPlaces: 3,
    bubbleActive: false,
    inTheMoney: false,
    addOnWindowOpen: false,
    rebuyActive: false,
    tournamentFinished: false,
    onLevelChange: vi.fn(),
    t: ((key: string) => key) as unknown as (key: import('../src/i18n/translations').TranslationKey, params?: Record<string, string | number>) => string,
    ...overrides,
  });

  it('does not announce when voice is disabled', () => {
    const params = makeDefaultParams({
      settings: { ...defaultSettings(), voiceEnabled: false },
      timerState: makeTimerState({ currentLevelIndex: 1 }),
    });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    // Change level index
    rerender({ ...params, timerState: makeTimerState({ currentLevelIndex: 2 }) });

    expect(speech.announceLevelChange).not.toHaveBeenCalled();
    expect(speech.announceBreakStart).not.toHaveBeenCalled();
  });

  it('does not announce when not in game mode', () => {
    const params = makeDefaultParams({
      mode: 'setup' as const,
      timerState: makeTimerState({ currentLevelIndex: 0 }),
    });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    rerender({ ...params, timerState: makeTimerState({ currentLevelIndex: 2 }) });
    expect(speech.announceLevelChange).not.toHaveBeenCalled();
  });

  it('announces level change when currentLevelIndex changes to a play level', () => {
    const params = makeDefaultParams({ timerState: makeTimerState({ currentLevelIndex: 0 }) });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    // Advance to level index 2 (third entry = second play level)
    rerender({ ...params, timerState: makeTimerState({ currentLevelIndex: 2 }) });

    expect(speech.announceLevelChange).toHaveBeenCalled();
    expect(params.onLevelChange).toHaveBeenCalled();
  });

  it('announces break start when transitioning to a break level', () => {
    const params = makeDefaultParams({ timerState: makeTimerState({ currentLevelIndex: 0 }) });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    // Advance to level index 1 (break)
    rerender({ ...params, timerState: makeTimerState({ currentLevelIndex: 1 }) });

    expect(speech.announceBreakStart).toHaveBeenCalled();
    expect(params.onLevelChange).toHaveBeenCalled();
  });

  it('announces break warning at 30 seconds remaining during break', () => {
    const params = makeDefaultParams({
      timerState: makeTimerState({ currentLevelIndex: 1, remainingSeconds: 60 }),
    });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    // Timer ticks down to 30 seconds
    rerender({ ...params, timerState: makeTimerState({ currentLevelIndex: 1, remainingSeconds: 29 }) });

    expect(speech.announceBreakWarning).toHaveBeenCalled();
  });

  it('announces five-minute warning for play levels longer than 5 min', () => {
    const params = makeDefaultParams({
      timerState: makeTimerState({ currentLevelIndex: 0, remainingSeconds: 400 }),
    });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    // Timer ticks down to 300 seconds
    rerender({ ...params, timerState: makeTimerState({ currentLevelIndex: 0, remainingSeconds: 299 }) });

    expect(speech.announceFiveMinutes).toHaveBeenCalled();
  });

  it('announces heads-up when 2 players remain', () => {
    const params = makeDefaultParams({ activePlayerCount: 3 });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    rerender({ ...params, activePlayerCount: 2 });
    expect(speech.announceHeadsUp).toHaveBeenCalled();
  });

  it('announces 3 remaining', () => {
    const params = makeDefaultParams({ activePlayerCount: 4 });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    rerender({ ...params, activePlayerCount: 3 });
    expect(speech.announceThreeRemaining).toHaveBeenCalled();
  });

  it('announces timer paused/resumed', () => {
    const params = makeDefaultParams({
      timerState: makeTimerState({ status: 'running' }),
    });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    // Pause
    rerender({ ...params, timerState: makeTimerState({ status: 'paused' }) });
    expect(speech.announceTimerPaused).toHaveBeenCalled();

    // Resume
    rerender({ ...params, timerState: makeTimerState({ status: 'running' }) });
    expect(speech.announceTimerResumed).toHaveBeenCalled();
  });

  it('announces rebuy ended + add-on when addOnWindowOpen becomes true', () => {
    const params = makeDefaultParams({ addOnWindowOpen: false });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    rerender({ ...params, addOnWindowOpen: true });

    expect(speech.announceRebuyEnded).toHaveBeenCalled();
    expect(speech.announceAddOn).toHaveBeenCalled();
  });

  it('reset function clears warning refs', () => {
    const params = makeDefaultParams();
    const { result } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    // reset should not throw
    expect(() => result.current.reset()).not.toThrow();
  });

  it('announces color-up when transitioning to a level with color-up chips', () => {
    const chipDenom: ChipDenomination = { id: 'c1', value: 25, color: 'white', label: 'White 25' };
    const colorUpMap = new Map<number, ChipDenomination[]>();
    colorUpMap.set(2, [chipDenom]);
    const params = makeDefaultParams({
      timerState: makeTimerState({ currentLevelIndex: 0 }),
      colorUpMap,
      config: {
        ...defaultConfig(),
        levels: [
          makeLevel({ smallBlind: 25, bigBlind: 50 }),
          makeBreak(600),
          makeLevel({ smallBlind: 50, bigBlind: 100 }),
        ],
        chips: { ...defaultConfig().chips, enabled: true, colorUpEnabled: true },
      },
    });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    rerender({ ...params, timerState: makeTimerState({ currentLevelIndex: 2 }) });

    expect(speech.announceColorUp).toHaveBeenCalledWith('White 25', expect.any(Function));
  });

  it('does NOT announce color-up when chips are disabled', () => {
    const chipDenom: ChipDenomination = { id: 'c1', value: 25, color: 'white', label: 'White 25' };
    const colorUpMap = new Map<number, ChipDenomination[]>();
    colorUpMap.set(2, [chipDenom]);
    const params = makeDefaultParams({
      timerState: makeTimerState({ currentLevelIndex: 0 }),
      colorUpMap,
      config: {
        ...defaultConfig(),
        levels: [
          makeLevel({ smallBlind: 25, bigBlind: 50 }),
          makeBreak(600),
          makeLevel({ smallBlind: 50, bigBlind: 100 }),
        ],
        chips: { ...defaultConfig().chips, enabled: false, colorUpEnabled: true },
      },
    });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    rerender({ ...params, timerState: makeTimerState({ currentLevelIndex: 2 }) });

    expect(speech.announceColorUp).not.toHaveBeenCalled();
  });

  it('announces rebuy ended without add-on when rebuyActive becomes false', () => {
    const params = makeDefaultParams({
      rebuyActive: true,
      config: {
        ...defaultConfig(),
        levels: [makeLevel(), makeBreak(), makeLevel()],
        rebuy: { ...defaultConfig().rebuy, enabled: true },
        addOn: { ...defaultConfig().addOn, enabled: false },
      },
    });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    rerender({ ...params, rebuyActive: false });

    expect(speech.announceRebuyEnded).toHaveBeenCalled();
    expect(speech.announceAddOn).not.toHaveBeenCalled();
  });

  it('does NOT announce rebuyEnded when addOn is enabled (handled by addOnWindow effect)', () => {
    const params = makeDefaultParams({
      rebuyActive: true,
      config: {
        ...defaultConfig(),
        levels: [makeLevel(), makeBreak(), makeLevel()],
        rebuy: { ...defaultConfig().rebuy, enabled: true },
        addOn: { ...defaultConfig().addOn, enabled: true },
      },
    });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    rerender({ ...params, rebuyActive: false });

    expect(speech.announceRebuyEnded).not.toHaveBeenCalled();
  });

  it('announces rebuy taken when total rebuys increase', () => {
    const players: Player[] = [
      { id: 'p1', name: 'Alice', status: 'active', seatIndex: 0, rebuys: 0, addOn: false, placement: null, bountyEarned: 0 },
      { id: 'p2', name: 'Bob', status: 'active', seatIndex: 1, rebuys: 0, addOn: false, placement: null, bountyEarned: 0 },
    ];
    const params = makeDefaultParams({
      config: {
        ...defaultConfig(),
        levels: [makeLevel(), makeBreak(), makeLevel()],
        players,
      },
    });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    const updatedPlayers: Player[] = [
      { ...players[0], rebuys: 1 },
      players[1],
    ];
    rerender({
      ...params,
      config: { ...params.config, players: updatedPlayers },
    });

    expect(speech.announceRebuyTaken).toHaveBeenCalled();
  });

  it('announces elimination and bounty when a player is eliminated with bounty enabled', () => {
    const players: Player[] = [
      { id: 'p1', name: 'Alice', status: 'active', seatIndex: 0, rebuys: 0, addOn: false, placement: null, bountyEarned: 0 },
      { id: 'p2', name: 'Bob', status: 'active', seatIndex: 1, rebuys: 0, addOn: false, placement: null, bountyEarned: 0 },
    ];
    const params = makeDefaultParams({
      config: {
        ...defaultConfig(),
        levels: [makeLevel(), makeBreak(), makeLevel()],
        players,
        bounty: { ...defaultConfig().bounty, enabled: true, amount: 5 },
      },
    });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    const updatedPlayers: Player[] = [
      players[0],
      { ...players[1], status: 'eliminated' as const, placement: 2 },
    ];
    rerender({
      ...params,
      config: { ...params.config, players: updatedPlayers },
    });

    expect(speech.announceElimination).toHaveBeenCalled();
    expect(speech.announceBounty).toHaveBeenCalled();
  });

  it('does NOT announce timer paused when tournament is finished', () => {
    const params = makeDefaultParams({
      tournamentFinished: true,
      timerState: makeTimerState({ status: 'running' }),
    });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    rerender({ ...params, timerState: makeTimerState({ status: 'paused' }) });

    expect(speech.announceTimerPaused).not.toHaveBeenCalled();
  });

  it('announces players remaining when count drops to paidPlaces', () => {
    const params = makeDefaultParams({ activePlayerCount: 6, paidPlaces: 5 });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    rerender({ ...params, activePlayerCount: 5 });

    expect(speech.announcePlayersRemaining).toHaveBeenCalledWith(5, expect.any(Function));
  });

  it('does NOT announce players remaining when count is above paidPlaces', () => {
    const params = makeDefaultParams({ activePlayerCount: 8, paidPlaces: 3 });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    rerender({ ...params, activePlayerCount: 7 });

    expect(speech.announcePlayersRemaining).not.toHaveBeenCalled();
  });

  it('does NOT announce five-minute warning for levels with duration <= 300s', () => {
    const params = makeDefaultParams({
      config: {
        ...defaultConfig(),
        levels: [
          makeLevel({ durationSeconds: 300, smallBlind: 25, bigBlind: 50 }),
          makeBreak(600),
          makeLevel({ smallBlind: 50, bigBlind: 100 }),
        ],
      },
      timerState: makeTimerState({ currentLevelIndex: 0, remainingSeconds: 310 }),
    });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    rerender({ ...params, timerState: makeTimerState({ currentLevelIndex: 0, remainingSeconds: 299 }) });

    expect(speech.announceFiveMinutes).not.toHaveBeenCalled();
  });

  it('announces break over when returning from a break level', () => {
    const levels = [
      makeLevel({ smallBlind: 25, bigBlind: 50 }),
      makeBreak(600),
      makeLevel({ smallBlind: 50, bigBlind: 100 }),
    ];
    const params = makeDefaultParams({
      config: { ...defaultConfig(), levels },
      timerState: makeTimerState({ currentLevelIndex: 1 }),
    });
    const { rerender } = renderHook(
      (p) => useVoiceAnnouncements(p),
      { initialProps: params },
    );

    // Advance from break (index 1) to play level (index 2)
    rerender({ ...params, timerState: makeTimerState({ currentLevelIndex: 2 }) });

    expect(speech.announceBreakOver).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PayoutEditor
// ---------------------------------------------------------------------------

import { PayoutEditor } from '../src/components/PayoutEditor';

describe('PayoutEditor', () => {
  it('should render up to 20 places', () => {
    const payout = { mode: 'percent' as const, entries: Array.from({ length: 20 }, (_, i) => ({ place: i + 1, value: 5 })) };
    const { container } = renderWithProviders(<PayoutEditor payout={payout} onChange={() => {}} />);
    const placeLabels = container.querySelectorAll('[data-testid="payout-entry"]');
    expect(placeLabels.length).toBe(20);
  });

  it('should show live preview when prizePool is provided in percent mode', () => {
    const payout = { mode: 'percent' as const, entries: [{ place: 1, value: 50 }, { place: 2, value: 30 }, { place: 3, value: 20 }] };
    const { container } = renderWithProviders(
      <PayoutEditor payout={payout} onChange={() => {}} prizePool={200} currency="EUR" />
    );
    // 50% of 200 = 100 €
    expect(container.textContent).toContain('100');
    expect(container.textContent).toContain('€');
  });

  it('should show auto-split button when playerCount is provided', () => {
    const payout = { mode: 'percent' as const, entries: [{ place: 1, value: 100 }] };
    const { container } = renderWithProviders(
      <PayoutEditor payout={payout} onChange={() => {}} playerCount={8} />
    );
    expect(container.textContent).toContain('Auto');
  });

  it('should show template dropdown', () => {
    const payout = { mode: 'percent' as const, entries: [{ place: 1, value: 100 }] };
    const { container } = renderWithProviders(
      <PayoutEditor payout={payout} onChange={() => {}} />
    );
    const select = container.querySelector('select[data-testid="payout-template"]');
    expect(select).toBeTruthy();
  });

  it('should use currency symbol from prop', () => {
    const payout = { mode: 'euro' as const, entries: [{ place: 1, value: 50 }] };
    const { container } = renderWithProviders(
      <PayoutEditor payout={payout} onChange={() => {}} currency="USD" />
    );
    expect(container.textContent).toContain('$');
  });
});

// ---------------------------------------------------------------------------
// TournamentLog
// ---------------------------------------------------------------------------

import { TournamentLog } from '../src/components/TournamentLog';

describe('TournamentLog', () => {
  it('renders empty state when no events', () => {
    renderWithProviders(<TournamentLog events={[]} players={[]} onClose={() => {}} />);
    expect(screen.getByText(/keine Ereignisse|no events/i)).toBeTruthy();
  });

  it('renders event list with i18n formatting', () => {
    const events: TournamentEvent[] = [
      { id: 'e1', type: 'tournament_started', timestamp: Date.now(), levelIndex: 0, data: {} },
      { id: 'e2', type: 'player_eliminated', timestamp: Date.now(), levelIndex: 2, data: { playerId: 'p1', placement: 3 } },
    ];
    const players: Player[] = [{ id: 'p1', name: 'Alice', status: 'eliminated', placement: 3, rebuys: 0, addOn: false, knockouts: 0, eliminatedBy: null }];
    renderWithProviders(<TournamentLog events={events} players={players} onClose={() => {}} />);
    expect(screen.getByText(/Alice/)).toBeTruthy();
  });

  it('filters by elimination events', () => {
    const events: TournamentEvent[] = [
      { id: 'e1', type: 'tournament_started', timestamp: Date.now(), levelIndex: 0, data: {} },
      { id: 'e2', type: 'player_eliminated', timestamp: Date.now(), levelIndex: 2, data: { playerId: 'p1', placement: 3 } },
    ];
    const players: Player[] = [{ id: 'p1', name: 'Alice', status: 'eliminated', placement: 3, rebuys: 0, addOn: false, knockouts: 0, eliminatedBy: null }];
    renderWithProviders(<TournamentLog events={events} players={players} onClose={() => {}} />);
    // Click eliminations filter
    const elimFilter = screen.getByText(/eliminierungen|eliminations/i);
    fireEvent.click(elimFilter);
    // Tournament started should be filtered out
    expect(screen.queryByText(/gestartet|started/i)).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// SectionErrorBoundary
// ---------------------------------------------------------------------------

describe('SectionErrorBoundary', () => {
  it('shows retry button on error', () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ThrowOnce = () => { throw new Error('test'); };
    const { getByText } = render(
      <SectionErrorBoundary>
        <ThrowOnce />
      </SectionErrorBoundary>
    );
    expect(getByText(/failed to load/i)).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// collectStartErrors (startValidation)
// ---------------------------------------------------------------------------

import { collectStartErrors } from '../src/domain/startValidation';

describe('collectStartErrors', () => {
  it('returns error for 0 players', () => {
    const config = { ...defaultConfig(), players: [] };
    const errors = collectStartErrors(config, (k: string) => k);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns no errors for valid config', () => {
    const config = {
      ...defaultConfig(),
      players: [
        { id: 'p1', name: 'Alice', status: 'active' as const, placement: null, rebuys: 0, addOn: false, knockouts: 0, eliminatedBy: null },
        { id: 'p2', name: 'Bob', status: 'active' as const, placement: null, rebuys: 0, addOn: false, knockouts: 0, eliminatedBy: null },
        { id: 'p3', name: 'Charlie', status: 'active' as const, placement: null, rebuys: 0, addOn: false, knockouts: 0, eliminatedBy: null },
      ],
    };
    const errors = collectStartErrors(config, (k: string) => k);
    expect(errors.length).toBe(0);
  });
});
