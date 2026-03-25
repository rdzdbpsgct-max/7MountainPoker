/**
 * Accessibility Tests — automated a11y checks via vitest-axe
 *
 * Uses axe-core to validate WCAG 2.1 compliance on key components.
 */
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { LanguageProvider } from '../src/i18n';

// Helper to wrap components that need i18n context
function renderWithProviders(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

// ---------------------------------------------------------------------------
// a11y checks on key UI components
// ---------------------------------------------------------------------------

describe('a11y: NumberStepper', () => {
  it('has no a11y violations', async () => {
    const { NumberStepper } = await import('../src/components/NumberStepper');
    const { container } = renderWithProviders(
      <NumberStepper value={5} onChange={() => {}} label="Players" min={1} max={10} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('a11y: CollapsibleSection', () => {
  it('has no a11y violations', async () => {
    const { CollapsibleSection } = await import('../src/components/CollapsibleSection');
    const { container } = render(
      <CollapsibleSection title="Test Section" defaultOpen>
        <p>Content inside</p>
      </CollapsibleSection>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('a11y: BubbleIndicator', () => {
  it('has no a11y violations', async () => {
    const { BubbleIndicator } = await import('../src/components/BubbleIndicator');
    const { container } = renderWithProviders(
      <BubbleIndicator
        isBubble={true}
        isItm={false}
        lastHandActive={false}
        handForHandActive={false}
        addOnWindowOpen={false}
        addOnWindowLabel=""
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('a11y: RebuyStatus', () => {
  it('has no a11y violations', async () => {
    const { RebuyStatus } = await import('../src/components/RebuyStatus');
    const { container } = renderWithProviders(
      <RebuyStatus
        active={true}
        rebuy={{ enabled: true, limitType: 'levels', levelLimit: 5, maxRebuysPerPlayer: 3 }}
        currentPlayLevel={2}
        elapsedSeconds={600}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('a11y: ChevronIcon', () => {
  it('has no a11y violations', async () => {
    const { ChevronIcon } = await import('../src/components/ChevronIcon');
    const { container } = render(
      <ChevronIcon isOpen={false} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('a11y: LoadingFallback', () => {
  it('has no a11y violations', async () => {
    const { LoadingFallback } = await import('../src/components/LoadingFallback');
    const { container } = renderWithProviders(<LoadingFallback />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// Complex component a11y checks
// ---------------------------------------------------------------------------

describe('a11y: Controls', () => {
  it('has no a11y violations', async () => {
    const { Controls } = await import('../src/components/Controls');
    const timerState = {
      currentLevelIndex: 0,
      remainingSeconds: 600,
      status: 'stopped' as const,
      startedAt: null,
      remainingAtStart: null,
    };
    const noop = () => {};
    const { container } = renderWithProviders(
      <Controls
        timerState={timerState}
        onToggleStartPause={noop}
        onNext={noop}
        onPrevious={noop}
        onReset={noop}
        onRestart={noop}
        onLastHand={noop}
        onToggleCleanView={noop}
        onCallTheClock={noop}
        callTheClockSeconds={60}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('a11y: TimerDisplay', () => {
  it('has no a11y violations', async () => {
    const { TimerDisplay } = await import('../src/components/TimerDisplay');
    const timerState = {
      currentLevelIndex: 0,
      remainingSeconds: 600,
      status: 'stopped' as const,
      startedAt: null,
      remainingAtStart: null,
    };
    const levels = [
      { id: '1', type: 'level' as const, durationSeconds: 900, smallBlind: 25, bigBlind: 50 },
      { id: '2', type: 'level' as const, durationSeconds: 900, smallBlind: 50, bigBlind: 100 },
    ];
    const { container } = renderWithProviders(
      <TimerDisplay
        timerState={timerState}
        levels={levels}
        largeDisplay={false}
        countdownEnabled={false}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('a11y: TournamentStats', () => {
  it('has no a11y violations', async () => {
    const { TournamentStats } = await import('../src/components/TournamentStats');
    const players = [
      { id: '1', name: 'Alice', rebuys: 0, addOn: false, status: 'active' as const, placement: null, eliminatedBy: null, knockouts: 0 },
      { id: '2', name: 'Bob', rebuys: 0, addOn: false, status: 'active' as const, placement: null, eliminatedBy: null, knockouts: 0 },
    ];
    const levels = [
      { id: '1', type: 'level' as const, durationSeconds: 900, smallBlind: 25, bigBlind: 50 },
    ];
    const { container } = renderWithProviders(
      <TournamentStats
        players={players}
        levels={levels}
        currentLevelIndex={0}
        remainingSeconds={600}
        averageStack={5000}
        elapsedSeconds={300}
        estimatedRemainingSeconds={3600}
        prizePool={100}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('a11y: SettingsPanel', () => {
  it('has no a11y violations', async () => {
    const { ThemeProvider } = await import('../src/theme');
    const { SettingsPanel } = await import('../src/components/SettingsPanel');
    const settings = {
      soundEnabled: true,
      countdownEnabled: true,
      autoAdvance: true,
      largeDisplay: false,
      voiceEnabled: false,
      volume: 80,
      callTheClockSeconds: 60,
    };
    const { container } = render(
      <ThemeProvider>
        <LanguageProvider>
          <SettingsPanel
            settings={settings}
            onChange={() => {}}
            onToggleFullscreen={() => {}}
          />
        </LanguageProvider>
      </ThemeProvider>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('a11y: AppHeader', () => {
  it('has no a11y violations in setup mode', async () => {
    const { ThemeProvider } = await import('../src/theme');
    const { AppHeader } = await import('../src/components/AppHeader');
    const settings = {
      soundEnabled: true,
      countdownEnabled: true,
      autoAdvance: true,
      largeDisplay: false,
      voiceEnabled: false,
      volume: 80,
      callTheClockSeconds: 60,
    };
    const noop = () => {};
    const { container } = render(
      <ThemeProvider>
        <LanguageProvider>
          <AppHeader
            mode="setup"
            tournamentName=""
            clockTime="12:00"
            settings={settings}
            onSettingsChange={noop}
            tournamentFinished={false}
            canUseRemoteControl={true}
            canUseTVDisplay={true}
            canUseLeagueMode={true}
            remoteHostConnected={false}
            tvWindowActive={false}
            onStartRemoteHost={noop}
            onToggleTVWindow={noop}
            onToggleSetupGame={noop}
            onExitToSetup={noop}
            onShowTemplates={noop}
            onToggleLeagueMode={noop}
            onShowHistory={noop}
            onShowInstallGuide={noop}
            onShowHelp={noop}
            onOpenFeatureGate={noop}
          />
        </LanguageProvider>
      </ThemeProvider>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
