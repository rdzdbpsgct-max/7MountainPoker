import { useCallback, useMemo, useState } from 'react';
import type { TournamentConfig, Table, MultiTableConfig } from '../domain/types';
import type { AppFeature } from '../domain/entitlements';
import { markFeatureDiscovered } from '../domain/entitlements';
import {
  createTable,
  distributePlayersToTables,
  defaultMultiTableConfig,
  toggleSeatLock,
  shufflePlayersToTables,
  resizeTable,
  defaultPayoutForPlayerCount,
} from '../domain/logic';
import { useTranslation } from '../i18n';
import { PlayerManager } from './PlayerManager';
import { CollapsibleSubSection } from './CollapsibleSubSection';
import { NumberStepper } from './NumberStepper';

interface Props {
  config: TournamentConfig;
  setConfig: React.Dispatch<React.SetStateAction<TournamentConfig>>;
  canUseMultiTable?: boolean | undefined;
  onOpenFeatureGate?: ((feature: AppFeature) => void) | undefined;
  onConfirm: (title: string, message: string, confirmLabel: string, onConfirm: () => void) => void;
}

export function SetupTabPlayers({
  config,
  setConfig,
  canUseMultiTable,
  onOpenFeatureGate,
}: Props) {
  const { t } = useTranslation();

  // --- Summaries ---
  const playersSummary = useMemo(() => {
    const base = t('section.playerCount', { n: config.players.length });
    if (config.tables && config.tables.length > 0) {
      return `${base}, ${t('multiTable.tableCount', { n: config.tables.length })}`;
    }
    return base;
  }, [config.players.length, config.tables, t]);

  const multiTableSummary = useMemo(() => {
    if (!config.tables || config.tables.length === 0) return t('section.allDisabled');
    return t('multiTable.tableCount', { n: config.tables.length });
  }, [config.tables, t]);

  // --- Multi-table state & handlers ---
  const [resizeWarningTableId, setResizeWarningTableId] = useState<string | null>(null);

  const handleToggleMultiTable = useCallback(() => {
    setConfig((prev) => {
      if (prev.tables && prev.tables.length > 0) {
        return { ...prev, tables: undefined, multiTable: undefined };
      }
      const seatsPerTable = 10;
      const tables: Table[] = [
        createTable(t('multiTable.tableName', { n: 1 }), seatsPerTable),
        createTable(t('multiTable.tableName', { n: 2 }), seatsPerTable),
      ];
      const multiTable: MultiTableConfig = { ...defaultMultiTableConfig(), enabled: true, seatsPerTable };
      return { ...prev, tables, multiTable };
    });
  }, [setConfig, t]);

  const handleSetTableCount = useCallback((count: number) => {
    setConfig((prev) => {
      const existing = prev.tables ?? [];
      if (count <= 0) return { ...prev, tables: undefined };
      const tables: Table[] = [];
      for (let i = 0; i < count; i++) {
        if (i < existing.length) {
          tables.push(existing[i]!);
        } else {
          tables.push(createTable(t('multiTable.tableName', { n: i + 1 }), 10));
        }
      }
      return { ...prev, tables };
    });
  }, [setConfig, t]);

  const handleSetTableSeats = useCallback((tableId: string, maxSeats: number) => {
    setConfig((prev) => {
      if (!prev.tables) return prev;
      const result = resizeTable(prev.tables, tableId, maxSeats);
      if (result.warning) {
        setResizeWarningTableId(tableId);
        setTimeout(() => setResizeWarningTableId(null), 3000);
        return prev;
      }
      setResizeWarningTableId(null);
      return { ...prev, tables: result.tables };
    });
  }, [setConfig]);

  const handleDistributePlayers = useCallback(() => {
    setConfig((prev) => {
      if (!prev.tables || prev.tables.length === 0) return prev;
      const playerIds = prev.players.map(p => p.id);
      const tables = distributePlayersToTables(playerIds, prev.tables);
      return { ...prev, tables };
    });
  }, [setConfig]);

  return (
    <div className="space-y-4">
      {/* Optional subtitle with player summary */}
      {playersSummary && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{playersSummary}</p>
      )}

      <PlayerManager
        players={config.players}
        dealerIndex={config.dealerIndex}
        onChange={(players, dealerIndex) =>
          setConfig((prev) => ({
            ...prev,
            players,
            dealerIndex,
            payout: defaultPayoutForPlayerCount(players.length),
          }))
        }
        multiTableEnabled={config.multiTable?.enabled}
        onShuffleToTables={() => {
          if (!config.tables || config.tables.length === 0) return;
          const playerIds = config.players.map(p => p.id);
          const updated = shufflePlayersToTables(playerIds, config.tables);
          setConfig(prev => ({ ...prev, tables: updated }));
        }}
      />

      {/* Multi-Table hint for >10 players */}
      {config.players.length > 10 && (!config.tables || config.tables.length === 0) && (
        <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700/40 rounded-lg">
          <p className="text-blue-700 dark:text-blue-300 text-xs">
            {t('multiTable.hint')}
          </p>
        </div>
      )}

      {/* Multi-Table sub-section */}
      {config.players.length >= 6 && (
        <CollapsibleSubSection title={t('multiTable.title')} summary={multiTableSummary} defaultOpen={(config.tables != null && config.tables.length > 0) || config.players.length > 10}>
          <div className="space-y-3">
            <button
              onClick={() => {
                markFeatureDiscovered('multiTable');
                if (canUseMultiTable === false && onOpenFeatureGate) {
                  onOpenFeatureGate('multiTable');
                  return;
                }
                handleToggleMultiTable();
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                config.tables && config.tables.length > 0
                  ? 'text-white'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
              style={config.tables && config.tables.length > 0 ? { backgroundColor: 'var(--accent-700)' } : undefined}
            >
              {config.tables && config.tables.length > 0 ? t('multiTable.title') + ' \u2713' : t('multiTable.title')}
            </button>
            {config.tables && config.tables.length > 0 && (
              <div className="space-y-3 pl-2 border-l-2" style={{ borderColor: 'var(--accent-700)' }}>
                {config.players.length >= 6 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {t('multiTable.suggested', { n: Math.max(2, Math.ceil(config.players.length / 8)) })}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">{t('multiTable.tables')}</label>
                  <NumberStepper
                    value={config.tables.length}
                    onChange={handleSetTableCount}
                    min={2}
                    max={10}
                    step={1}
                    inputClassName="w-16"
                  />
                </div>
                {config.tables.map((tbl) => (
                  <div key={tbl.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[80px]">{tbl.name}</span>
                      <label className="text-xs text-gray-400 dark:text-gray-500">{t('multiTable.seatsAtTable', { table: tbl.name })}</label>
                      <NumberStepper
                        value={tbl.maxSeats}
                        onChange={(v) => handleSetTableSeats(tbl.id, v)}
                        min={2}
                        max={14}
                        step={1}
                        inputClassName="w-16"
                      />
                    </div>
                    {resizeWarningTableId === tbl.id && (
                      <p className="text-xs text-red-600 dark:text-red-400 pl-[80px] ml-2">{t('multiTable.cannotResize')}</p>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">{t('multiTable.dissolveThreshold')}</label>
                  <NumberStepper
                    value={config.multiTable?.dissolveThreshold ?? 3}
                    onChange={(v) => setConfig((prev) => ({
                      ...prev,
                      multiTable: { ...defaultMultiTableConfig(), ...prev.multiTable, dissolveThreshold: Math.max(2, Math.min(5, v)) },
                    }))}
                    min={2}
                    max={5}
                    step={1}
                    inputClassName="w-16"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.multiTable?.autoBalanceOnElimination !== false}
                    onChange={(e) => setConfig((prev) => ({
                      ...prev,
                      multiTable: { ...defaultMultiTableConfig(), ...prev.multiTable, autoBalanceOnElimination: e.target.checked },
                    }))}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: 'var(--accent-600)' }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('multiTable.autoBalance')}</span>
                </label>
                <button
                  onClick={handleDistributePlayers}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium transition-colors"
                >
                  {t('multiTable.distribute')}
                </button>
                {config.tables.length > 0 && !config.tables.some(tbl => tbl.seats.some(s => s.playerId !== null)) && (
                  <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/40 rounded-lg">
                    <p className="text-amber-700 dark:text-amber-300 text-xs">
                      {t('multiTable.notDistributed')}
                    </p>
                  </div>
                )}
                {config.tables.some(tbl => tbl.seats.some(s => s.playerId !== null || s.locked)) && (
                  <div className="space-y-1.5">
                    {config.tables.map((tbl) => {
                      const seatInfos = tbl.seats.map(s => {
                        const player = s.playerId ? config.players.find(p => p.id === s.playerId) : null;
                        return { seat: s.seatNumber, name: player?.name ?? null, locked: !!s.locked, empty: s.playerId === null };
                      });
                      const hasContent = seatInfos.some(s => s.name || s.locked);
                      if (!hasContent) return null;
                      return (
                        <div key={tbl.id} className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-gray-600 dark:text-gray-300">{tbl.name}:</span>{' '}
                          {seatInfos.filter(s => s.name || s.locked).map((sp, i) => (
                            <span key={sp.seat}>
                              {i > 0 && ', '}
                              <span className="text-gray-400 dark:text-gray-500">{t('multiTable.seatShort', { n: sp.seat })}</span>
                              ={sp.locked ? (
                                <button
                                  onClick={() => setConfig(prev => ({ ...prev, tables: toggleSeatLock(prev.tables ?? [], tbl.id, sp.seat) }))}
                                  className="text-red-400 hover:text-red-300"
                                  title={t('multiTable.unlockSeat')}
                                >&#128274;</button>
                              ) : sp.name ?? '?'}
                            </span>
                          ))}
                          {/* Show lock buttons for empty unlocked seats */}
                          {seatInfos.filter(s => s.empty && !s.locked).length > 0 && (
                            <span className="ml-1">
                              {seatInfos.filter(s => s.empty && !s.locked).slice(0, 3).map(s => (
                                <button
                                  key={s.seat}
                                  onClick={() => setConfig(prev => ({ ...prev, tables: toggleSeatLock(prev.tables ?? [], tbl.id, s.seat) }))}
                                  className="text-gray-400 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 ml-0.5"
                                  title={t('multiTable.lockSeat', { n: s.seat })}
                                >
                                  S{s.seat}&#128275;
                                </button>
                              ))}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleSubSection>
      )}
    </div>
  );
}
