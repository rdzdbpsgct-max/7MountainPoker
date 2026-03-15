import { useState, useCallback } from 'react';
import { isWizardCompleted } from '../domain/configPersistence';

/**
 * Centralized modal state management hook.
 * Extracts all modal boolean states + cleanView from App.tsx into a single hook.
 */
export function useModalManager() {
  // Panel visibility (default: visible)
  const [showPlayerPanel, setShowPlayerPanel] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);

  // Modal visibility (default: false)
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSeries, setShowSeries] = useState(false);
  const [showCustomAudio, setShowCustomAudio] = useState(false);
  const [showCallTheClock, setShowCallTheClock] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTournamentLog, setShowTournamentLog] = useState(false);
  const [showPayoutOverlay, setShowPayoutOverlay] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Modals with initialization logic
  const [showWizard, setShowWizard] = useState(() => !isWizardCompleted());

  const [showInstallGuide, setShowInstallGuide] = useState(() => {
    if (window.location.hash === '#install') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      return true;
    }
    return false;
  });

  const [showShareHub, setShowShareHub] = useState(() => {
    if (window.location.hash === '#share') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      return true;
    }
    return false;
  });

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

  return {
    // Panel visibility
    showPlayerPanel,
    setShowPlayerPanel,
    showSidebar,
    setShowSidebar,

    // Modal visibility
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
    showTour,
    setShowTour,
    showWizard,
    setShowWizard,
    showInstallGuide,
    setShowInstallGuide,
    showShareHub,
    setShowShareHub,

    // Clean view
    cleanView,
    setCleanView,
    toggleCleanView,
  };
}

/** Return type for useModalManager — useful for typing props */
export type ModalManagerReturn = ReturnType<typeof useModalManager>;
