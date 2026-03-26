import { lazy, memo, Suspense, useCallback, useMemo } from 'react';
import type { Settings, TournamentConfig } from '../domain/types';
import type { useTimer } from '../hooks/useTimer';
import type { GameModeState, GameModeUiState, GameModeActions, GameModeUndoState } from './modes/GameModeContainer';
import type { AppFeature } from '../domain/entitlements';
import { computePrizePool, computeRebuyPot, advanceTableDealer } from '../domain/logic';
import { SectionErrorBoundary } from './ErrorBoundary';
import { LoadingFallback } from './LoadingFallback';
import { GameStatusBar } from './GameStatusBar';
import { GameTimerZone } from './GameTimerZone';

const GamePlayerList = lazy(() => import('./GamePlayerList').then(m => ({ default: m.GamePlayerList })));
const GameQuickInfo = lazy(() => import('./GameQuickInfo').then(m => ({ default: m.GameQuickInfo })));

type TimerController = ReturnType<typeof useTimer>;

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

export const GameLayout = memo(function GameLayout({
  config, settings, timer, state, ui, actions, undo,
  canUseSidePot, canUseMultiTable, onOpenFeatureGate,
  onShowSettings, onShowTV, onShowLog, onShowHelp,
}: Props) {
  const { onUpdateTables } = actions;

  // Compute values for status bar
  const prizePool = useMemo(() =>
    computePrizePool(config.players, config.buyIn, config.rebuy.rebuyCost,
      config.addOn.enabled ? config.addOn.cost : 0, config.rebuy.separatePot),
    [config.players, config.buyIn, config.rebuy.rebuyCost, config.addOn.enabled, config.addOn.cost, config.rebuy.separatePot]);
  const rebuyPot = useMemo(() => computeRebuyPot(config.players, config.rebuy.rebuyCost), [config.players, config.rebuy.rebuyCost]);
  const currentLevel = config.levels[timer.timerState.currentLevelIndex];
  const currentBB = currentLevel?.type === 'level' ? (currentLevel.bigBlind ?? 0) : 0;

  const handleAdvanceTableDealer = useCallback((tableId: string) => {
    const tables = config.tables ?? [];
    const table = tables.find(tbl => tbl.id === tableId);
    if (!table) return;
    const updated = advanceTableDealer(table, config.players);
    onUpdateTables(tables.map(tbl => tbl.id === tableId ? updated : tbl));
  }, [config.tables, config.players, onUpdateTables]);

  return (
    <SectionErrorBoundary>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Zone 1 — Status Bar (sticky) */}
        <GameStatusBar
          players={config.players}
          prizePool={prizePool}
          rebuyPot={config.rebuy.separatePot ? rebuyPot : undefined}
          currency={config.currency}
          elapsedSeconds={state.tournamentElapsed}
          averageStack={state.averageStack}
          currentBB={currentBB}
          onShowSettings={onShowSettings}
          onShowTV={onShowTV}
          onShowLog={onShowLog}
          onShowHelp={onShowHelp}
          onShowIcm={actions.onShowIcm}
          onExitToSetup={actions.onExitToSetup}
        />

        {/* Zone 2 — Timer + Controls (sticky) */}
        <GameTimerZone
          config={config}
          settings={settings}
          timer={timer}
          state={state}
          actions={actions}
          undo={undo}
        />

        {/* Zone 3 — Scrollable Action Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <Suspense fallback={<LoadingFallback />}>
            {/* Player List */}
            {config.players.length > 0 && (
              <GamePlayerList
                players={config.players}
                dealerIndex={config.dealerIndex}
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
                onAcceptDeal={actions.onAcceptDeal}
                payout={config.payout}
                buyIn={config.buyIn}
              />
            )}

            {/* Quick Info Accordion Cards */}
            <div className="mt-4">
              <GameQuickInfo
                config={config}
                timer={timer}
                colorUpMap={state.colorUpMap}
                recentTableMoves={state.recentTableMoves}
                canUseMultiTable={canUseMultiTable}
                onUpdateTables={actions.onUpdateTables}
                onTableMoves={actions.onTableMoves}
                onAdvanceTableDealer={handleAdvanceTableDealer}
              />
            </div>
          </Suspense>
        </div>
      </div>
    </SectionErrorBoundary>
  );
});
