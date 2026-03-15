import { renderHook, act } from '@testing-library/react';
import { useModalManager } from '../src/hooks/useModalManager';

// Mock isWizardCompleted — default: wizard completed (showWizard = false)
vi.mock('../src/domain/configPersistence', () => ({
  isWizardCompleted: vi.fn(() => true),
  isTourCompleted: vi.fn(() => true),
}));

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
