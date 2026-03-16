import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import type { TournamentConfig, Table, TableMove, TableMoveReason } from '../domain/types';
import { balanceTables, getActivePlayersPerTable, getTablePlayerIds } from '../domain/logic';
import { useTranslation } from '../i18n';

interface Props {
  config: TournamentConfig;
  recentMoves: TableMove[];
  onUpdateTables: (tables: Table[]) => void;
  onTableMoves: (moves: TableMove[]) => void;
  onAdvanceTableDealer?: (tableId: string) => void;
}

const reasonKey: Record<TableMoveReason, string> = {
  balance: 'multiTable.reasonBalance',
  dissolution: 'multiTable.reasonDissolution',
  'final-table': 'multiTable.reasonFinalTable',
  'late-registration': 'multiTable.reasonLateReg',
  manual: 'multiTable.reasonBalance',
};

interface BalancePreview {
  tables: Table[];
  moves: TableMove[];
}

export function MultiTablePanel({ config, recentMoves, onUpdateTables, onTableMoves, onAdvanceTableDealer }: Props) {
  const { t } = useTranslation();

  const tables = useMemo(() => config.tables ?? [], [config.tables]);

  const activeCountMap = useMemo(
    () => getActivePlayersPerTable(tables, config.players),
    [tables, config.players],
  );

  // Check if tables are unbalanced (max diff > 1)
  const isUnbalanced = useMemo(() => {
    const counts = tables.filter(tbl => tbl.status === 'active').map(tbl => activeCountMap.get(tbl.id) ?? 0);
    if (counts.length < 2) return false;
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    return max - min > 1;
  }, [tables, activeCountMap]);

  const activeTables = useMemo(() => tables.filter(tbl => tbl.status === 'active'), [tables]);
  const dissolvedTables = useMemo(() => tables.filter(tbl => tbl.status === 'dissolved'), [tables]);
  const isFinalTable = activeTables.length === 1;

  // Balance preview modal state
  const [balancePreview, setBalancePreview] = useState<BalancePreview | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Escape to close + auto-focus
  useEffect(() => {
    if (!balancePreview) return;
    modalRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBalancePreview(null);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [balancePreview]);

  const handleBalance = useCallback(() => {
    const result = balanceTables(tables, config.players);
    if (result.moves.length === 0) {
      // No moves needed — show preview with empty moves (already balanced)
      setBalancePreview({ tables: result.tables, moves: [] });
    } else {
      setBalancePreview(result);
    }
  }, [tables, config.players]);

  const handleApplyBalance = useCallback(() => {
    if (!balancePreview) return;
    onUpdateTables(balancePreview.tables);
    if (balancePreview.moves.length > 0) {
      onTableMoves(balancePreview.moves);
    }
    setBalancePreview(null);
  }, [balancePreview, onUpdateTables, onTableMoves]);

  const handleCancelBalance = useCallback(() => {
    setBalancePreview(null);
  }, []);

  // Map player IDs to player names
  const playerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    config.players.forEach(p => map.set(p.id, p.name));
    return map;
  }, [config.players]);

  if (tables.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {t('multiTable.tables')}
        </h3>
        {isFinalTable && (
          <span className="px-2 py-0.5 bg-amber-600/20 text-amber-400 text-xs font-bold rounded-full border border-amber-500/30">
            {t('multiTable.finalTable')}
          </span>
        )}
      </div>

      {/* Active table cards */}
      <div className="space-y-2">
        {activeTables.map((tbl) => {
          const activeCount = activeCountMap.get(tbl.id) ?? 0;
          const playerIds = getTablePlayerIds(tbl);
          const activePlayerIds = new Set(
            config.players.filter(p => p.status === 'active').map(p => p.id),
          );

          return (
            <div
              key={tbl.id}
              className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40 rounded-lg p-2.5"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {tbl.name}
                  </span>
                  {tbl.dealerSeat != null && (
                    <span className="text-[10px] text-red-500 dark:text-red-400 font-bold">
                      D:{tbl.dealerSeat}
                    </span>
                  )}
                  {onAdvanceTableDealer && (
                    <button
                      onClick={() => onAdvanceTableDealer(tbl.id)}
                      className="px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                      aria-label={t('multiTable.advanceDealer')}
                      title={t('multiTable.advanceDealer')}
                    >
                      D→
                    </button>
                  )}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t('multiTable.playerCount', { n: activeCount })} / {tbl.maxSeats}
                </span>
              </div>
              {/* Seat grid */}
              <div className="flex flex-wrap gap-1">
                {tbl.seats.map(seat => {
                  const hasPlayer = seat.playerId !== null && activePlayerIds.has(seat.playerId);
                  const playerName = seat.playerId ? playerNameMap.get(seat.playerId) : null;
                  const isDealer = tbl.dealerSeat === seat.seatNumber;

                  if (hasPlayer && playerName) {
                    return (
                      <span
                        key={seat.seatNumber}
                        className={`px-1.5 py-0.5 text-xs rounded ${
                          isDealer
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700/40'
                            : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-gray-400 dark:text-gray-500 mr-0.5">{seat.seatNumber}.</span>
                        {playerName}
                        {isDealer && <span className="ml-0.5 text-red-500 dark:text-red-400 font-bold">D</span>}
                      </span>
                    );
                  }

                  // Empty seat — check if player ID exists but is eliminated
                  const isOccupiedByEliminated = seat.playerId !== null && !activePlayerIds.has(seat.playerId) && playerIds.includes(seat.playerId);
                  if (isOccupiedByEliminated) return null;

                  return (
                    <span
                      key={seat.seatNumber}
                      className="px-1.5 py-0.5 text-xs rounded bg-gray-50 dark:bg-gray-800/30 text-gray-300 dark:text-gray-600"
                    >
                      {seat.seatNumber}. {t('multiTable.emptySeat')}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dissolved tables (collapsed) */}
      {dissolvedTables.length > 0 && (
        <div className="space-y-1">
          {dissolvedTables.map(tbl => (
            <div
              key={tbl.id}
              className="bg-gray-100/50 dark:bg-gray-800/20 border border-gray-200 dark:border-gray-700/20 rounded-lg px-2.5 py-1.5 opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-500 line-through">
                  {tbl.name}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-600 uppercase">
                  {t('multiTable.dissolved')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Balance button */}
      {activeTables.length > 1 && (
        <button
          onClick={handleBalance}
          className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isUnbalanced
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-900/30 active:scale-[0.97]'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          {t('multiTable.balance')}
        </button>
      )}

      {/* Balance preview modal */}
      {balancePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancelBalance}
          />
          {/* Modal */}
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('multiTable.balancePreview')}
            tabIndex={-1}
            className="relative bg-white dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700/40 rounded-2xl shadow-2xl shadow-gray-300/30 dark:shadow-black/40 w-full max-w-md animate-scale-in outline-none"
          >
            <div className="p-5 space-y-4">
              {/* Title */}
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {t('multiTable.balancePreview')}
              </h3>

              {balancePreview.moves.length === 0 ? (
                /* Already balanced */
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('multiTable.balanceNoMoves')}
                </p>
              ) : (
                /* Move list */
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('multiTable.balancePreviewDesc', { n: balancePreview.moves.length })}
                  </p>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {balancePreview.moves.map((move, i) => (
                      <div
                        key={`${move.playerId}-${i}`}
                        className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg text-sm text-amber-800 dark:text-amber-200"
                      >
                        <span className="font-medium">{move.playerName}</span>
                        <span className="text-amber-600 dark:text-amber-400">
                          {': '}
                          {move.fromTableName} {t('multiTable.seat', { n: move.fromSeat })}
                          {' → '}
                          {move.toTableName} {t('multiTable.seat', { n: move.toSeat })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleCancelBalance}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                >
                  {t('multiTable.balanceCancel')}
                </button>
                {balancePreview.moves.length > 0 && (
                  <button
                    onClick={handleApplyBalance}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-900/30 active:scale-[0.97] transition-all duration-200"
                  >
                    {t('multiTable.balanceApply')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent moves log */}
      {recentMoves.length > 0 && (
        <div className="space-y-1 animate-fade-in">
          <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t('multiTable.moveLog')}
          </h4>
          {recentMoves.map((move, i) => (
            <div
              key={`${move.playerId}-${move.timestamp}-${i}`}
              className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/40 rounded-lg text-xs text-amber-700 dark:text-amber-300 space-y-0.5"
            >
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 px-1 py-0.5 bg-amber-200/50 dark:bg-amber-800/30 rounded text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  {t(reasonKey[move.reason] as Parameters<typeof t>[0])}
                </span>
                <span className="font-medium">{move.playerName}</span>
              </div>
              <div className="text-amber-600 dark:text-amber-400/70 pl-0.5">
                {move.fromTableName} {t('multiTable.seat', { n: move.fromSeat })} → {move.toTableName} {t('multiTable.seat', { n: move.toSeat })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
