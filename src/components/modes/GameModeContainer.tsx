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

interface Props {
  config: TournamentConfig;
  settings: Settings;
  timer: TimerController;
  cleanView: boolean;
  showPlayerPanel: boolean;
  showSidebar: boolean;
  showDealerBadges: boolean;
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
  isBreak: boolean;
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
  onUpdateTables: (tables: Table[]) => void;
  onTableMoves: (moves: TableMove[]) => void;
  onSettingsChange: Dispatch<SetStateAction<Settings>>;
  onToggleFullscreen: () => void;
  onShowInstallGuide: () => void;
  onExitToSetup: () => void;
}

export function GameModeContainer({
  config,
  settings,
  timer,
  cleanView,
  showPlayerPanel,
  showSidebar,
  showDealerBadges,
  rebuyActive,
  addOnWindowOpen,
  currentPlayLevel,
  tournamentElapsed,
  averageStack,
  bubbleActive,
  showItmFlash,
  lastHandActive,
  handForHandActive,
  lateRegOpen,
  colorUpMap,
  recentTableMoves,
  onTogglePlayerPanel,
  onToggleSidebar,
  onUpdatePlayerRebuys,
  onUpdatePlayerAddOn,
  onEliminatePlayer,
  onReinstatePlayer,
  onAdvanceDealer,
  onToggleDealerBadges,
  onUpdatePlayerStack,
  onInitStacks,
  onClearStacks,
  onAddLatePlayer,
  onReEntryPlayer,
  onSidePotResultChange,
  isBreak,
  onSkipBreak,
  onExtendBreak,
  onResetLevel,
  onRestartTournament,
  onToggleCleanView,
  onLastHand,
  onHandForHand,
  onNextHand,
  onShowCallTheClock,
  onShowPayoutOverlay,
  onUpdateTables,
  onTableMoves,
  onSettingsChange,
  onToggleFullscreen,
  onShowInstallGuide,
  onExitToSetup,
}: Props) {
  const { t } = useTranslation();

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
        {showPlayerPanel && config.players.length > 0 && (
          <aside className="w-full md:absolute md:left-0 md:top-0 md:bottom-0 md:w-60 lg:w-72 md:z-20 md:shadow-xl md:shadow-black/20 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700/30 bg-gray-50 dark:bg-gray-900/40 p-3 sm:p-4 overflow-y-auto max-h-[40vh] sm:max-h-[50vh] md:max-h-none">
            <PlayerPanel
              players={config.players}
              dealerIndex={config.dealerIndex}
              buyIn={config.buyIn}
              payout={config.payout}
              rebuyActive={rebuyActive}
              rebuyConfig={config.rebuy}
              addOnConfig={config.addOn}
              addOnWindowOpen={addOnWindowOpen}
              bountyConfig={config.bounty}
              averageStack={averageStack}
              onUpdateRebuys={onUpdatePlayerRebuys}
              onUpdateAddOn={onUpdatePlayerAddOn}
              onEliminatePlayer={onEliminatePlayer}
              onReinstatePlayer={onReinstatePlayer}
              onAdvanceDealer={onAdvanceDealer}
              showDealerBadges={showDealerBadges}
              onToggleDealerBadges={onToggleDealerBadges}
              onUpdateStack={onUpdatePlayerStack}
              onInitStacks={onInitStacks}
              onClearStacks={onClearStacks}
              lateRegOpen={lateRegOpen}
              onAddLatePlayer={onAddLatePlayer}
              onReEntryPlayer={onReEntryPlayer}
              tables={config.tables}
              onSidePotResultChange={onSidePotResultChange}
              onShowPayoutOverlay={onShowPayoutOverlay}
              currency={config.currency}
            />
          </aside>
        )}

        {/* Timer area (CENTER) with edge toggle buttons */}
        <div className="flex-1 flex flex-col relative">
          {/* Desktop: side toggle buttons */}
          {config.players.length > 0 && (
            <button
              onClick={onTogglePlayerPanel}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-30 w-7 h-20 items-center justify-center bg-white dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700/80 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-r-lg text-xs transition-all duration-200 border-r border-y border-gray-200 dark:border-gray-700/30 shadow-md shadow-gray-300/30 dark:shadow-black/10"
              title={showPlayerPanel ? t('app.hidePlayers') : t('app.showPlayers')}
            >
              {showPlayerPanel ? '\u25C0' : '\u25B6'}
            </button>
          )}
          <button
            onClick={onToggleSidebar}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-30 w-7 h-20 items-center justify-center bg-white dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700/80 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-l-lg text-xs transition-all duration-200 border-l border-y border-gray-200 dark:border-gray-700/30 shadow-md shadow-gray-300/30 dark:shadow-black/10"
            title={showSidebar ? t('app.hideSidebar') : t('app.showSidebar')}
          >
            {showSidebar ? '\u25B6' : '\u25C0'}
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
              cleanView={cleanView}
              colorUpMap={colorUpMap}
              anteMode={config.anteMode}
            />
            <BubbleIndicator
              isBubble={bubbleActive}
              showItmFlash={showItmFlash}
              addOnWindowOpen={addOnWindowOpen}
              addOnCost={config.addOn.cost}
              addOnChips={config.addOn.chips}
              lastHandActive={lastHandActive}
              handForHandActive={handForHandActive}
            />
            {!cleanView && (
              <RebuyStatus
                active={rebuyActive}
                rebuy={config.rebuy}
                currentPlayLevel={currentPlayLevel}
                elapsedSeconds={tournamentElapsed}
              />
            )}
            <Controls
              timerState={timer.timerState}
              onToggleStartPause={timer.toggleStartPause}
              onNext={timer.nextLevel}
              onPrevious={timer.previousLevel}
              onReset={onResetLevel}
              onRestart={onRestartTournament}
              isBreak={isBreak}
              onSkipBreak={onSkipBreak}
              onExtendBreak={onExtendBreak}
              hideSecondaryControls={cleanView}
              cleanView={cleanView}
              onToggleCleanView={onToggleCleanView}
              lastHandActive={lastHandActive}
              onLastHand={onLastHand}
              handForHandActive={handForHandActive}
              onHandForHand={onHandForHand}
              onNextHand={onNextHand}
              showHandForHand={bubbleActive}
              callTheClockSeconds={settings.callTheClockSeconds}
              onCallTheClock={onShowCallTheClock}
            />
          </div>

          {/* Mobile: sidebar toggle buttons */}
          <div className="flex md:hidden justify-center gap-2 px-3 pb-2">
            {config.players.length > 0 && (
              <button
                onClick={onTogglePlayerPanel}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  showPlayerPanel
                    ? 'text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
                style={showPlayerPanel ? { backgroundColor: 'var(--accent-700)' } : undefined}
              >
                {showPlayerPanel ? `✓ ${t('app.players')}` : t('app.players')}
              </button>
            )}
            <button
              onClick={onToggleSidebar}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showSidebar
                  ? 'text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
              style={showSidebar ? { backgroundColor: 'var(--accent-700)' } : undefined}
            >
              {showSidebar ? `✓ ${t('app.sidebar')}` : t('app.sidebar')}
            </button>
          </div>
        </div>

        {/* Sidebar (RIGHT) */}
        {showSidebar && (
          <aside className="w-full md:absolute md:right-0 md:top-0 md:bottom-0 md:w-64 lg:w-72 md:z-20 md:shadow-xl md:shadow-black/20 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700/30 bg-gray-50 dark:bg-gray-900/40 p-3 sm:p-4 space-y-4 sm:space-y-6 overflow-y-auto max-h-[60vh] sm:max-h-[70vh] md:max-h-none">
            <LevelPreview timerState={timer.timerState} levels={config.levels} />
            {config.chips.enabled && (
              <ChipSidebar
                chipConfig={config.chips}
                colorUpMap={colorUpMap}
                currentLevelIndex={timer.timerState.currentLevelIndex}
                levels={config.levels}
              />
            )}
            {config.tables && config.tables.length > 0 && (
              <MultiTablePanel
                config={config}
                recentMoves={recentTableMoves}
                onUpdateTables={onUpdateTables}
                onTableMoves={onTableMoves}
                onAdvanceTableDealer={handleAdvanceTableDealer}
              />
            )}
            <SettingsPanel
              settings={settings}
              onChange={onSettingsChange}
              onToggleFullscreen={onToggleFullscreen}
              onShowInstallGuide={onShowInstallGuide}
            />
            <button
              onClick={onExitToSetup}
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
