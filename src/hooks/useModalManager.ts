import { useState, useCallback, useMemo } from 'react';
import { isWizardCompleted } from '../domain/configPersistence';

/** All mutually exclusive modal keys */
type ModalKey =
  | 'templates'
  | 'history'
  | 'series'
  | 'customAudio'
  | 'callTheClock'
  | 'help'
  | 'tournamentLog'
  | 'payoutOverlay'
  | 'icm'
  | 'tour'
  | 'gameSettings'
  | 'wizard'
  | 'installGuide'
  | 'shareHub'
  | 'stats';

/** Setter type compatible with React's Dispatch<SetStateAction<boolean>> */
type ModalSetter = (value: boolean | ((prev: boolean) => boolean)) => void;

/**
 * Compute initial modal from wizard state and URL hash.
 * Clears hash if consumed.
 */
function computeInitialModal(): ModalKey | null {
  if (!isWizardCompleted()) return 'wizard';
  const hash = window.location.hash;
  if (hash === '#install') {
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return 'installGuide';
  }
  if (hash === '#share') {
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return 'shareHub';
  }
  return null;
}

/**
 * Centralized modal state management hook.
 * Uses a single activeModal state to ensure only one modal is open at a time.
 * Panel visibility (showPlayerPanel, showSidebar) and cleanView are NOT modals.
 */
export function useModalManager() {
  // Single mutex state for all modals
  const [activeModal, setActiveModal] = useState<ModalKey | null>(computeInitialModal);

  // Panel visibility (default: visible) — NOT modals, kept as separate state
  const [showPlayerPanel, setShowPlayerPanel] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);

  // Clean view state
  const [cleanView, setCleanView] = useState(false);

  const toggleCleanView = useCallback(() => {
    setCleanView((prev) => {
      const next = !prev;
      if (next) {
        // Hiding details -> also hide both sidebars
        setShowPlayerPanel(false);
        setShowSidebar(false);
      } else {
        // Showing details -> also show both sidebars
        setShowPlayerPanel(true);
        setShowSidebar(true);
      }
      return next;
    });
  }, []);

  // Close any open modal
  const closeAllModals = useCallback(() => {
    setActiveModal(null);
  }, []);

  // Factory for creating a setter that's compatible with React's Dispatch<SetStateAction<boolean>>
  // Supports: setter(true), setter(false), setter(prev => !prev)
  const makeModalSetter = useCallback((key: ModalKey): ModalSetter => {
    return (value: boolean | ((prev: boolean) => boolean)) => {
      if (typeof value === 'function') {
        // Updater function pattern: e.g. setShowCallTheClock((v) => !v)
        setActiveModal((current) => {
          const currentlyOpen = current === key;
          const next = value(currentlyOpen);
          return next ? key : (currentlyOpen ? null : current);
        });
      } else {
        // Direct value pattern: e.g. setShowTemplates(true) or setShowTemplates(false)
        setActiveModal((current) => {
          if (value) return key;
          // Only close if this modal is currently active
          return current === key ? null : current;
        });
      }
    };
  }, []);

  // Computed booleans
  const showTemplates = activeModal === 'templates';
  const showHistory = activeModal === 'history';
  const showSeries = activeModal === 'series';
  const showCustomAudio = activeModal === 'customAudio';
  const showCallTheClock = activeModal === 'callTheClock';
  const showHelp = activeModal === 'help';
  const showTournamentLog = activeModal === 'tournamentLog';
  const showPayoutOverlay = activeModal === 'payoutOverlay';
  const showIcm = activeModal === 'icm';
  const showTour = activeModal === 'tour';
  const showGameSettings = activeModal === 'gameSettings';
  const showWizard = activeModal === 'wizard';
  const showInstallGuide = activeModal === 'installGuide';
  const showShareHub = activeModal === 'shareHub';
  const showStats = activeModal === 'stats';

  // Stable setter references (memoized so consumers get the same function reference)
  const setShowTemplates = useMemo(() => makeModalSetter('templates'), [makeModalSetter]);
  const setShowHistory = useMemo(() => makeModalSetter('history'), [makeModalSetter]);
  const setShowSeries = useMemo(() => makeModalSetter('series'), [makeModalSetter]);
  const setShowCustomAudio = useMemo(() => makeModalSetter('customAudio'), [makeModalSetter]);
  const setShowCallTheClock = useMemo(() => makeModalSetter('callTheClock'), [makeModalSetter]);
  const setShowHelp = useMemo(() => makeModalSetter('help'), [makeModalSetter]);
  const setShowTournamentLog = useMemo(() => makeModalSetter('tournamentLog'), [makeModalSetter]);
  const setShowPayoutOverlay = useMemo(() => makeModalSetter('payoutOverlay'), [makeModalSetter]);
  const setShowIcm = useMemo(() => makeModalSetter('icm'), [makeModalSetter]);
  const setShowTour = useMemo(() => makeModalSetter('tour'), [makeModalSetter]);
  const setShowGameSettings = useMemo(() => makeModalSetter('gameSettings'), [makeModalSetter]);
  const setShowWizard = useMemo(() => makeModalSetter('wizard'), [makeModalSetter]);
  const setShowInstallGuide = useMemo(() => makeModalSetter('installGuide'), [makeModalSetter]);
  const setShowShareHub = useMemo(() => makeModalSetter('shareHub'), [makeModalSetter]);
  const setShowStats = useMemo(() => makeModalSetter('stats'), [makeModalSetter]);

  return {
    // Panel visibility
    showPlayerPanel,
    setShowPlayerPanel,
    showSidebar,
    setShowSidebar,

    // Modal visibility (computed from activeModal)
    showTemplates,
    setShowTemplates,
    showHistory,
    setShowHistory,
    showSeries,
    setShowSeries,
    showCustomAudio,
    setShowCustomAudio,
    showCallTheClock,
    setShowCallTheClock,
    showHelp,
    setShowHelp,
    showTournamentLog,
    setShowTournamentLog,
    showPayoutOverlay,
    setShowPayoutOverlay,
    showIcm,
    setShowIcm,
    showTour,
    setShowTour,
    showGameSettings,
    setShowGameSettings,
    showWizard,
    setShowWizard,
    showInstallGuide,
    setShowInstallGuide,
    showShareHub,
    setShowShareHub,
    showStats,
    setShowStats,

    // Clean view
    cleanView,
    setCleanView,
    toggleCleanView,

    // Modal mutex controls
    closeAllModals,
    activeModal,
  };
}

/** Return type for useModalManager — useful for typing props */
export type ModalManagerReturn = ReturnType<typeof useModalManager>;
