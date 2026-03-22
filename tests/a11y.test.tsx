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
