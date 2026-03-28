import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import type { AppFeature } from '../domain/entitlements';
import { trackFeatureUsed } from '../domain/monetizationTelemetry';
import { resetTourCompleted, resetWizardCompleted } from '../domain/configPersistence';
import type { RemoteHost } from '../domain/remote';
import type { Settings } from '../domain/types';

type Mode = 'setup' | 'game' | 'league';

interface UseAppHeaderCallbacksDeps {
  mode: Mode;
  setMode: Dispatch<SetStateAction<Mode>>;
  modals: {
    setShowTemplates: (v: boolean) => void;
    setShowHistory: (v: boolean) => void;
    setShowHelp: (v: boolean) => void;
    setShowStats: (v: boolean) => void;
    setShowInstallGuide: (v: boolean) => void;
    setShowTournamentLog: (v: boolean) => void;
    setShowSeries: (v: boolean) => void;
    setShowShareHub: (v: boolean) => void;
    setShowTour: (v: boolean) => void;
    setShowWizard: (v: boolean) => void;
    setShowGameSettings: (v: boolean) => void;
  };
  canUseSeries: boolean;
  openFeatureGate: (feature: AppFeature) => void;
  remoteHostRef: React.RefObject<RemoteHost | null>;
  startRemoteHost: () => void;
  tournamentFinished: boolean;
}

interface AppHeaderCallbacks {
  onSettingsChange: Dispatch<SetStateAction<Settings>>;
  onStartRemoteHost: () => void;
  onToggleSetupGame: () => void;
  onExitToSetup: () => void;
  onShowTemplates: () => void;
  onToggleLeagueMode: () => void;
  onShowHistory: () => void;
  onShowInstallGuide: () => void;
  onShowHelp: () => void;
  onShowStats: () => void;
  onShowLog: () => void;
  onOpenFeatureGate: (feature: AppFeature) => void;
  onShowSeries: () => void;
  onShowShareHub: () => void;
  onShowTour: () => void;
  onShowWizard: () => void;
  onShowSettings: (() => void) | undefined;
}

/**
 * Extracts all AppHeader callback props from App.tsx into a reusable hook.
 * Returns callbacks that can be spread onto the AppHeader component.
 */
export function useAppHeaderCallbacks(
  deps: UseAppHeaderCallbacksDeps,
  /** Passed through as-is — not wrapped */
  passThrough: {
    setSettings: Dispatch<SetStateAction<Settings>>;
    handleExitToSetup: () => void;
  },
): AppHeaderCallbacks {
  const {
    mode, setMode, modals, canUseSeries, openFeatureGate,
    remoteHostRef, startRemoteHost, tournamentFinished,
  } = deps;

  const onStartRemoteHost = useCallback(() => {
    trackFeatureUsed('remoteControl', 'game');
    startRemoteHost();
  }, [startRemoteHost]);

  const onToggleSetupGame = useCallback(() => {
    if (mode === 'league') setMode('setup');
    else setMode('game');
  }, [mode, setMode]);

  const onToggleLeagueMode = useCallback(() => {
    if (mode !== 'league') trackFeatureUsed('league', 'league');
    setMode(mode === 'league' ? 'setup' : 'league');
  }, [mode, setMode]);

  const onShowSeries = useCallback(() => {
    if (canUseSeries) modals.setShowSeries(true);
    else openFeatureGate('series');
  }, [canUseSeries, modals, openFeatureGate]);

  const onShowShareHub = useCallback(() => {
    if (!remoteHostRef.current) startRemoteHost();
    modals.setShowShareHub(true);
  }, [remoteHostRef, startRemoteHost, modals]);

  const onShowTour = useCallback(() => {
    resetTourCompleted();
    modals.setShowTour(true);
  }, [modals]);

  const onShowWizard = useCallback(() => {
    resetWizardCompleted();
    modals.setShowWizard(true);
  }, [modals]);

  const onShowSettings = mode === 'game' && !tournamentFinished
    ? () => modals.setShowGameSettings(true)
    : undefined;

  return {
    onSettingsChange: passThrough.setSettings,
    onStartRemoteHost,
    onToggleSetupGame,
    onExitToSetup: passThrough.handleExitToSetup,
    onShowTemplates: () => modals.setShowTemplates(true),
    onToggleLeagueMode,
    onShowHistory: () => modals.setShowHistory(true),
    onShowInstallGuide: () => modals.setShowInstallGuide(true),
    onShowHelp: () => modals.setShowHelp(true),
    onShowStats: () => modals.setShowStats(true),
    onShowLog: () => modals.setShowTournamentLog(true),
    onOpenFeatureGate: openFeatureGate,
    onShowSeries,
    onShowShareHub,
    onShowTour,
    onShowWizard,
    onShowSettings,
  };
}
