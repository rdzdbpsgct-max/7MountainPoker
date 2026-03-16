import type { Dispatch, SetStateAction } from 'react';
import type { TournamentConfig, TournamentCheckpoint, Settings } from '../../domain/types';
import type { AppFeature } from '../../domain/entitlements';
import { SetupPage } from '../SetupPage';

interface Props {
  config: TournamentConfig;
  setConfig: Dispatch<SetStateAction<TournamentConfig>>;
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
  onShowCustomAudio: () => void;
  pendingCheckpoint: TournamentCheckpoint | null;
  onRestoreCheckpoint: () => void;
  onDismissCheckpoint: () => void;
  onSwitchToGame: () => void;
  onConfirm: (title: string, message: string, confirmLabel: string, onConfirm: () => void) => void;
  startErrors: string[];
  canUseMultiTable?: boolean;
  onOpenFeatureGate?: (feature: AppFeature) => void;
}

export function SetupModeContainer({
  config,
  setConfig,
  settings,
  onSettingsChange,
  onShowCustomAudio,
  pendingCheckpoint,
  onRestoreCheckpoint,
  onDismissCheckpoint,
  onSwitchToGame,
  onConfirm,
  startErrors,
  canUseMultiTable,
  onOpenFeatureGate,
}: Props) {
  return (
    <SetupPage
      config={config}
      setConfig={setConfig}
      settings={settings}
      onSettingsChange={onSettingsChange}
      onShowCustomAudio={onShowCustomAudio}
      pendingCheckpoint={pendingCheckpoint}
      onRestoreCheckpoint={onRestoreCheckpoint}
      onDismissCheckpoint={onDismissCheckpoint}
      onSwitchToGame={onSwitchToGame}
      onConfirm={onConfirm}
      startErrors={startErrors}
      canUseMultiTable={canUseMultiTable}
      onOpenFeatureGate={onOpenFeatureGate}
    />
  );
}
