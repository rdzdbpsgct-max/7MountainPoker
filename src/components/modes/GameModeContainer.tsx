import { memo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  ChipDenomination,
  PlayerPayout,
  PotResult,
  Settings,
  Table,
  TableMove,
  TournamentConfig,
} from '../../domain/types';
import type { useTimer } from '../../hooks/useTimer';
import type { AppFeature } from '../../domain/entitlements';
import { GameLayout } from '../GameLayout';

type TimerController = ReturnType<typeof useTimer>;

// ─── Grouped Props Interfaces ──────────────────────────────────────────────

/** Undo/Redo state for Controls */
export interface GameModeUndoState {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  onUndo: () => void;
  onRedo: () => void;
}

/** Computed/derived tournament game state */
export interface GameModeState {
  rebuyActive: boolean;
  addOnWindowOpen: boolean;
  currentPlayLevel: number;
  tournamentElapsed: number;
  averageStack: number;
  bubbleActive: boolean;
  showItmFlash: boolean;
  lastHandActive: boolean;
  handForHandActive: boolean;
  lateRegOpen: boolean;
  colorUpMap: Map<number, ChipDenomination[]>;
  recentTableMoves: TableMove[];
  isBreak: boolean;
}

/** UI visibility toggles */
export interface GameModeUiState {
  cleanView: boolean;
  showPlayerPanel: boolean;
  showSidebar: boolean;
  showDealerBadges: boolean;
  canUseCustomAccent?: boolean | undefined;
  canUseCustomBackground?: boolean | undefined;
  canUseCustomLayout?: boolean | undefined;
}

/** All action callbacks for game mode */
export interface GameModeActions {
  onTogglePlayerPanel: () => void;
  onToggleSidebar: () => void;
  onUpdatePlayerRebuys: (playerId: string, newCount: number) => void;
  onUpdatePlayerAddOn: (playerId: string, hasAddOn: boolean) => void;
  onEliminatePlayer: (playerId: string, eliminatedBy: string | null) => void;
  onReinstatePlayer: (playerId: string) => void;
  onAdvanceDealer: () => void;
  onToggleDealerBadges: () => void;
  onUpdatePlayerStack: (playerId: string, chips: number) => void;
  onInitStacks: () => void;
  onClearStacks: () => void;
  onAddLatePlayer: () => void;
  onReEntryPlayer: (playerId: string) => void;
  onSidePotResultChange: (data: { pots: PotResult[]; total: number; payouts?: PlayerPayout[] | undefined } | null) => void;
  onSkipBreak: () => void;
  onExtendBreak: (seconds: number) => void;
  onResetLevel: () => void;
  onRestartTournament: () => void;
  onToggleCleanView: () => void;
  onLastHand: () => void;
  onHandForHand: () => void;
  onNextHand: () => void;
  onShowCallTheClock: () => void;
  onShowPayoutOverlay: () => void;
  onShowIcm: () => void;
  onUpdateTables: (tables: Table[]) => void;
  onTableMoves: (moves: TableMove[]) => void;
  onSettingsChange: Dispatch<SetStateAction<Settings>>;
  onToggleFullscreen: () => void;
  onShowInstallGuide: () => void;
  onExitToSetup: () => void;
  onAcceptDeal: (payouts: Map<string, number>, method: string) => void;
}

// ─── Component Props ────────────────────────────────────────────────────────

interface Props {
  config: TournamentConfig;
  settings: Settings;
  timer: TimerController;
  state: GameModeState;
  ui: GameModeUiState;
  actions: GameModeActions;
  undo?: GameModeUndoState | undefined;
  canUseSidePot?: boolean | undefined;
  canUseMultiTable?: boolean | undefined;
  onOpenFeatureGate?: ((feature: AppFeature) => void) | undefined;
  onShowSettings: () => void;
  onShowTV: () => void;
  onShowLog: () => void;
  onShowHelp: () => void;
}

export const GameModeContainer = memo(function GameModeContainer({
  config, settings, timer, state, ui, actions, undo,
  canUseSidePot, canUseMultiTable, onOpenFeatureGate,
  onShowSettings, onShowTV, onShowLog, onShowHelp,
}: Props) {
  return (
    <GameLayout
      config={config}
      settings={settings}
      timer={timer}
      state={state}
      ui={ui}
      actions={actions}
      undo={undo}
      canUseSidePot={canUseSidePot}
      canUseMultiTable={canUseMultiTable}
      onOpenFeatureGate={onOpenFeatureGate}
      onShowSettings={onShowSettings}
      onShowTV={onShowTV}
      onShowLog={onShowLog}
      onShowHelp={onShowHelp}
    />
  );
});
