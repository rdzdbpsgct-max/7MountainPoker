import { lazy, memo, Suspense, useMemo } from 'react';
import type { TournamentConfig, ChipDenomination, TableMove, Table } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import type { useTimer } from '../hooks/useTimer';
import { computePrizePool, computePayouts, getLevelLabel, getBlindsText } from '../domain/logic';
import { useTranslation } from '../i18n';
import { CollapsibleSection } from './CollapsibleSection';
import { LoadingFallback } from './LoadingFallback';

const LevelPreview = lazy(() => import('./LevelPreview').then(m => ({ default: m.LevelPreview })));
const ChipSidebar = lazy(() => import('./ChipSidebar').then(m => ({ default: m.ChipSidebar })));
const MultiTablePanel = lazy(() => import('./MultiTablePanel').then(m => ({ default: m.MultiTablePanel })));

type TimerController = ReturnType<typeof useTimer>;

interface Props {
  config: TournamentConfig;
  timer: TimerController;
  colorUpMap: Map<number, ChipDenomination[]>;
  recentTableMoves: TableMove[];
  canUseMultiTable?: boolean | undefined;
  onUpdateTables: (tables: Table[]) => void;
  onTableMoves: (moves: TableMove[]) => void;
  onAdvanceTableDealer: (tableId: string) => void;
}

export const GameQuickInfo = memo(function GameQuickInfo({
  config, timer, colorUpMap, recentTableMoves,
  canUseMultiTable, onUpdateTables, onTableMoves, onAdvanceTableDealer,
}: Props) {
  const { t } = useTranslation();
  const sym = CURRENCY_SYMBOLS[config.currency ?? 'EUR'];

  // Next level info for summary
  const nextIdx = timer.timerState.currentLevelIndex + 1;
  const nextLevel = config.levels[nextIdx];
  const nextLevelSummary = nextLevel
    ? `${getLevelLabel(nextLevel, nextIdx, config.levels)} · ${getBlindsText(nextLevel)}`
    : '—';

  // Prizepool computation
  const prizePool = useMemo(() =>
    computePrizePool(config.players, config.buyIn, config.rebuy.rebuyCost,
      config.addOn.enabled ? config.addOn.cost : 0, config.rebuy.separatePot),
    [config.players, config.buyIn, config.rebuy.rebuyCost, config.addOn.enabled, config.addOn.cost, config.rebuy.separatePot]);
  const payoutAmounts = useMemo(() => computePayouts(config.payout, prizePool), [config.payout, prizePool]);
  const payoutSummary = `${prizePool.toFixed(0)} ${sym}, ${payoutAmounts.length} ${t('playerPanel.place')}`;

  // Blind schedule summary
  const totalLevels = config.levels.filter(l => l.type === 'level').length;
  const totalBreaks = config.levels.filter(l => l.type === 'break').length;
  const blindSummary = `${totalLevels} Lvl, ${totalBreaks} ${t('timer.break')}`;

  // Chip summary
  const chipCount = config.chips.denominations.length;
  const chipSummary = config.chips.enabled ? `${chipCount} Chips` : '';

  // Multi-table summary
  const activeTables = config.tables?.filter(tbl => tbl.status === 'active').length ?? 0;
  const multiTableSummary = activeTables > 0 ? `${activeTables} ${t('multiTable.tables')}` : '';

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {/* Next Level — always open */}
      <CollapsibleSection
        title={t('game.quickInfo.nextLevel')}
        summary={nextLevelSummary}
        defaultOpen
      >
        <Suspense fallback={<LoadingFallback />}>
          <LevelPreview timerState={timer.timerState} levels={config.levels} />
        </Suspense>
      </CollapsibleSection>

      {/* Prizepool & Payout */}
      <CollapsibleSection
        title={t('game.quickInfo.prizepool')}
        summary={payoutSummary}
        defaultOpen={false}
      >
        <div className="space-y-2">
          <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-500) 10%, transparent)' }}>
            <p className="text-lg font-bold" style={{ color: 'var(--accent-500)' }}>
              {prizePool.toFixed(2)} {sym}
            </p>
          </div>
          <div className="space-y-1">
            {payoutAmounts.map(p => (
              <div key={p.place} className="flex justify-between px-3 py-1 bg-gray-100 dark:bg-gray-800/50 rounded-lg text-sm">
                <span className="text-gray-500 dark:text-gray-400">{p.place}. {t('playerPanel.place')}</span>
                <span className="text-gray-900 dark:text-white font-medium">{p.amount.toFixed(2)} {sym}</span>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* Blind Schedule */}
      <CollapsibleSection
        title={t('game.quickInfo.blindSchedule')}
        summary={blindSummary}
        defaultOpen={false}
      >
        <Suspense fallback={<LoadingFallback />}>
          <LevelPreview timerState={timer.timerState} levels={config.levels} />
        </Suspense>
      </CollapsibleSection>

      {/* Chips & Color-Up */}
      {config.chips.enabled && (
        <CollapsibleSection
          title={t('game.quickInfo.chips')}
          summary={chipSummary}
          defaultOpen={false}
        >
          <Suspense fallback={<LoadingFallback />}>
            <ChipSidebar
              chipConfig={config.chips}
              colorUpMap={colorUpMap}
              currentLevelIndex={timer.timerState.currentLevelIndex}
              levels={config.levels}
            />
          </Suspense>
        </CollapsibleSection>
      )}

      {/* Multi-Table */}
      {config.tables && config.tables.length > 0 && canUseMultiTable !== false && (
        <CollapsibleSection
          title={t('game.quickInfo.multiTable')}
          summary={multiTableSummary}
          defaultOpen={false}
        >
          <Suspense fallback={<LoadingFallback />}>
            <MultiTablePanel
              config={config}
              recentMoves={recentTableMoves}
              onUpdateTables={onUpdateTables}
              onTableMoves={onTableMoves}
              onAdvanceTableDealer={onAdvanceTableDealer}
            />
          </Suspense>
        </CollapsibleSection>
      )}
    </div>
  );
});
