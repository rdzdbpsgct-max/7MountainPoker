import { lazy, Suspense, useCallback } from 'react';
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
import { advanceTableDealer } from '../../domain/logic';
import type { AppFeature } from '../../domain/entitlements';
import { useTranslation } from '../../i18n';
import { SectionErrorBoundary } from '../ErrorBoundary';
import { LoadingFallback } from '../LoadingFallback';

const TimerDisplay = lazy(() => import('../TimerDisplay').then((m) => ({ default: m.TimerDisplay })));
const Controls = lazy(() => import('../Controls').then((m) => ({ default: m.Controls })));
const LevelPreview = lazy(() => import('../LevelPreview').then((m) => ({ default: m.LevelPreview })));
const PlayerPanel = lazy(() => import('../PlayerPanel').then((m) => ({ default: m.PlayerPanel })));
const ChipSidebar = lazy(() => import('../ChipSidebar').then((m) => ({ default: m.ChipSidebar })));
const RebuyStatus = lazy(() => import('../RebuyStatus').then((m) => ({ default: m.RebuyStatus })));
const BubbleIndicator = lazy(() => import('../BubbleIndicator').then((m) => ({ default: m.BubbleIndicator })));
const SettingsPanel = lazy(() => import('../SettingsPanel').then((m) => ({ default: m.SettingsPanel })));
const MultiTablePanel = lazy(() => import('../MultiTablePanel').then((m) => ({ default: m.MultiTablePanel })));

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
  onSidePotResultChange: (data: { pots: PotResult[]; total: number; payouts?: PlayerPayout[] } | null) => void;
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
}

// ─── Component Props ────────────────────────────────────────────────────────

interface Props {
  config: TournamentConfig;
  settings: Settings;
  timer: TimerController;
  state: GameModeState;
  ui: GameModeUiState;
  actions: GameModeActions;
  undo?: GameModeUndoState;
  canUseSidePot?: boolean;
  canUseMultiTable?: boolean;
  onOpenFeatureGate?: (feature: AppFeature) => void;
}

export function GameModeContainer({ config, settings, timer, state, ui, actions, undo, canUseSidePot, canUseMultiTable, onOpenFeatureGate }: Props) {
  const { t } = useTranslation();
  const { onUpdateTables } = actions;

  const handleAdvanceTableDealer = useCallback((tableId: string) => {
    const tables = config.tables ?? [];
    const table = tables.find(tbl => tbl.id === tableId);
    if (!table) return;
    const updated = advanceTableDealer(table, config.players);
    onUpdateTables(tables.map(tbl => tbl.id === tableId ? updated : tbl));
  }, [config.tables, config.players, onUpdateTables]);

  return (
    <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Player Panel (LEFT) */}
        {ui.showPlayerPanel && config.players.length > 0 && (
          <aside className="w-full md:absolute md:left-0 md:top-0 md:bottom-0 md:w-60 lg:w-72 md:z-20 md:shadow-xl md:shadow-black/20 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700/30 bg-gray-50 dark:bg-gray-900/40 p-3 sm:p-4 overflow-y-auto max-h-[40vh] sm:max-h-[50vh] md:max-h-none">
            <PlayerPanel
              players={config.players}
              dealerIndex={config.dealerIndex}
              buyIn={config.buyIn}
              payout={config.payout}
              rebuyActive={state.rebuyActive}
              rebuyConfig={config.rebuy}
              addOnConfig={config.addOn}
              addOnWindowOpen={state.addOnWindowOpen}
              bountyConfig={config.bounty}
              averageStack={state.averageStack}
              onUpdateRebuys={actions.onUpdatePlayerRebuys}
              onUpdateAddOn={actions.onUpdatePlayerAddOn}
              onEliminatePlayer={actions.onEliminatePlayer}
              onReinstatePlayer={actions.onReinstatePlayer}
              onAdvanceDealer={actions.onAdvanceDealer}
              showDealerBadges={ui.showDealerBadges}
              onToggleDealerBadges={actions.onToggleDealerBadges}
              onUpdateStack={actions.onUpdatePlayerStack}
              onInitStacks={actions.onInitStacks}
              onClearStacks={actions.onClearStacks}
              lateRegOpen={state.lateRegOpen}
              onAddLatePlayer={actions.onAddLatePlayer}
              onReEntryPlayer={actions.onReEntryPlayer}
              tables={config.tables}
              onSidePotResultChange={actions.onSidePotResultChange}
              onShowPayoutOverlay={actions.onShowPayoutOverlay}
              currency={config.currency}
              canUseSidePot={canUseSidePot}
              onOpenFeatureGate={onOpenFeatureGate}
            />
          </aside>
        )}

        {/* Timer area (CENTER) with edge toggle buttons */}
        <div className="flex-1 flex flex-col relative">
          {/* Desktop: side toggle buttons */}
          {config.players.length > 0 && (
            <button
              onClick={actions.onTogglePlayerPanel}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-30 w-7 h-20 items-center justify-center bg-white dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700/80 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-r-lg text-xs transition-all duration-200 border-r border-y border-gray-200 dark:border-gray-700/30 shadow-md shadow-gray-300/30 dark:shadow-black/10"
              title={ui.showPlayerPanel ? t('app.hidePlayers') : t('app.showPlayers')}
            >
              {ui.showPlayerPanel ? '\u25C0' : '\u25B6'}
            </button>
          )}
          <button
            onClick={actions.onToggleSidebar}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-30 w-7 h-20 items-center justify-center bg-white dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700/80 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-l-lg text-xs transition-all duration-200 border-l border-y border-gray-200 dark:border-gray-700/30 shadow-md shadow-gray-300/30 dark:shadow-black/10"
            title={ui.showSidebar ? t('app.hideSidebar') : t('app.showSidebar')}
          >
            {ui.showSidebar ? '\u25B6' : '\u25C0'}
          </button>

          {/* Timer + Controls */}
          <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 gap-3 sm:gap-6 relative">
            <TimerDisplay
              timerState={timer.timerState}
              levels={config.levels}
              largeDisplay={settings.largeDisplay}
              countdownEnabled={settings.countdownEnabled}
              onScrub={timer.setRemainingSeconds}
              onScrubEnd={timer.start}
              chipConfig={config.chips}
              cleanView={ui.cleanView}
              colorUpMap={state.colorUpMap}
              anteMode={config.anteMode}
            />
            <BubbleIndicator
              isBubble={state.bubbleActive}
              showItmFlash={state.showItmFlash}
              addOnWindowOpen={state.addOnWindowOpen}
              addOnCost={config.addOn.cost}
              addOnChips={config.addOn.chips}
              lastHandActive={state.lastHandActive}
              handForHandActive={state.handForHandActive}
            />
            {!ui.cleanView && (
              <RebuyStatus
                active={state.rebuyActive}
                rebuy={config.rebuy}
                currentPlayLevel={state.currentPlayLevel}
                elapsedSeconds={state.tournamentElapsed}
              />
            )}
            <Controls
              timerState={timer.timerState}
              onToggleStartPause={timer.toggleStartPause}
              onNext={timer.nextLevel}
              onPrevious={timer.previousLevel}
              onReset={actions.onResetLevel}
              onRestart={actions.onRestartTournament}
              isBreak={state.isBreak}
              onSkipBreak={actions.onSkipBreak}
              onExtendBreak={actions.onExtendBreak}
              hideSecondaryControls={ui.cleanView}
              cleanView={ui.cleanView}
              onToggleCleanView={actions.onToggleCleanView}
              lastHandActive={state.lastHandActive}
              onLastHand={actions.onLastHand}
              handForHandActive={state.handForHandActive}
              onHandForHand={actions.onHandForHand}
              onNextHand={actions.onNextHand}
              showHandForHand={state.bubbleActive}
              callTheClockSeconds={settings.callTheClockSeconds}
              onCallTheClock={actions.onShowCallTheClock}
              canUndo={undo?.canUndo}
              canRedo={undo?.canRedo}
              onUndo={undo?.onUndo}
              onRedo={undo?.onRedo}
              undoLabel={undo?.undoLabel}
              redoLabel={undo?.redoLabel}
            />
          </div>

          {/* Mobile: sidebar toggle buttons */}
          <div className="flex md:hidden justify-center gap-2 px-3 pb-2">
            {config.players.length > 0 && (
              <button
                onClick={actions.onTogglePlayerPanel}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  ui.showPlayerPanel
                    ? 'text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
                style={ui.showPlayerPanel ? { backgroundColor: 'var(--accent-700)' } : undefined}
              >
                {ui.showPlayerPanel ? `✓ ${t('app.players')}` : t('app.players')}
              </button>
            )}
            <button
              onClick={actions.onToggleSidebar}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                ui.showSidebar
                  ? 'text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
              style={ui.showSidebar ? { backgroundColor: 'var(--accent-700)' } : undefined}
            >
              {ui.showSidebar ? `✓ ${t('app.sidebar')}` : t('app.sidebar')}
            </button>
          </div>
        </div>

        {/* Sidebar (RIGHT) */}
        {ui.showSidebar && (
          <aside className="w-full md:absolute md:right-0 md:top-0 md:bottom-0 md:w-64 lg:w-72 md:z-20 md:shadow-xl md:shadow-black/20 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700/30 bg-gray-50 dark:bg-gray-900/40 p-3 sm:p-4 space-y-4 sm:space-y-6 overflow-y-auto max-h-[60vh] sm:max-h-[70vh] md:max-h-none">
            <LevelPreview timerState={timer.timerState} levels={config.levels} />
            {config.chips.enabled && (
              <ChipSidebar
                chipConfig={config.chips}
                colorUpMap={state.colorUpMap}
                currentLevelIndex={timer.timerState.currentLevelIndex}
                levels={config.levels}
              />
            )}
            {config.tables && config.tables.length > 0 && canUseMultiTable !== false && (
              <MultiTablePanel
                config={config}
                recentMoves={state.recentTableMoves}
                onUpdateTables={actions.onUpdateTables}
                onTableMoves={actions.onTableMoves}
                onAdvanceTableDealer={handleAdvanceTableDealer}
              />
            )}
            <SettingsPanel
              settings={settings}
              onChange={actions.onSettingsChange}
              onToggleFullscreen={actions.onToggleFullscreen}
              onShowInstallGuide={actions.onShowInstallGuide}
            />
            <button
              onClick={actions.onShowIcm}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm transition-colors"
            >
              {t('icm.title')}
            </button>
            <button
              onClick={actions.onExitToSetup}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm transition-colors"
            >
              {t('app.backToSetup')}
            </button>
          </aside>
        )}
      </div>
    </Suspense></SectionErrorBoundary>
  );
}
