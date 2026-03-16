import { useCallback, useMemo, useState, lazy, Suspense } from 'react';
import type { TournamentConfig, TournamentCheckpoint, League, Table, MultiTableConfig, Settings, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import type { AppFeature } from '../domain/entitlements';
import { markFeatureDiscovered } from '../domain/entitlements';
import {
  stripAnteFromLevels,
  applyDefaultAntes,
  defaultPayoutForPlayerCount,
  snapSpinnerValue,
  checkBlindChipCompatibility,
  computeBlindStructureSummary,
  loadLeagues,
  createTable,
  distributePlayersToTables,
  defaultMultiTableConfig,
  parseLeagueFile,
  importLeague,
  getBuiltInPresets,
  toggleSeatLock,
  shufflePlayersToTables,
  resizeTable,
  defaultPlayers,
} from '../domain/logic';
import { useTranslation } from '../i18n';
import { ConfigEditor } from './ConfigEditor';
import { PlayerManager } from './PlayerManager';
import { PayoutEditor } from './PayoutEditor';
import { RebuyEditor } from './RebuyEditor';
import { AddOnEditor } from './AddOnEditor';
import { BountyEditor } from './BountyEditor';
import { ChipEditor } from './ChipEditor';
import { BlindGenerator } from './BlindGenerator';
import { CollapsibleSection } from './CollapsibleSection';
import { CollapsibleSubSection } from './CollapsibleSubSection';
import { NumberStepper } from './NumberStepper';
import { AlertEditor } from './AlertEditor';
const SetupQRCode = lazy(() => import('./SetupQRCode').then(m => ({ default: m.SetupQRCode })));

interface Props {
  config: TournamentConfig;
  setConfig: React.Dispatch<React.SetStateAction<TournamentConfig>>;
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

export function SetupPage({
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
  const { t } = useTranslation();

  // Load leagues for the dropdown (refresh when SetupPage mounts)
  const [leagues, setLeagues] = useState<League[]>(() => loadLeagues());

  // --- Section summaries for collapsed CollapsibleSection cards ---
  const chipsSummary = useMemo(() => {
    if (!config.chips.enabled) return t('section.chipsDisabled');
    const count = config.chips.denominations.length;
    const colorUp = config.chips.colorUpEnabled ? `, ${t('section.colorUpActive')}` : '';
    return `${count} Chips${colorUp}`;
  }, [config.chips, t]);

  const payoutSummary = useMemo(() => {
    const mode = config.payout.mode === 'percent' ? t('payoutEditor.percent') : t('payoutEditor.euro');
    return t('section.payoutSummary', { places: config.payout.entries.length, mode });
  }, [config.payout, t]);

  const formatSummary = useMemo(() => {
    const parts: string[] = [];
    if (config.rebuy.enabled) parts.push('Rebuy');
    if (config.addOn.enabled) parts.push('Add-On');
    if (config.bounty.enabled) parts.push(`Bounty: ${config.bounty.amount} €`);
    if (config.lateRegistration?.enabled) parts.push(t('lateReg.short'));
    return parts.length > 0 ? parts.join(', ') : t('section.allDisabled');
  }, [config.rebuy, config.addOn, config.bounty, config.lateRegistration, t]);

  const playersSummary = useMemo(() => {
    const base = t('section.playerCount', { n: config.players.length });
    if (config.tables && config.tables.length > 0) {
      return `${base}, ${t('multiTable.tableCount', { n: config.tables.length })}`;
    }
    return base;
  }, [config.players.length, config.tables, t]);

  const blindSummary = useMemo(() => {
    const s = computeBlindStructureSummary(config.levels);
    return t('config.summary', { levels: s.levelCount, breaks: s.breakCount, min: s.avgMinutes });
  }, [config.levels, t]);

  const multiTableSummary = useMemo(() => {
    if (!config.tables || config.tables.length === 0) return t('section.allDisabled');
    return t('multiTable.tableCount', { n: config.tables.length });
  }, [config.tables, t]);

  const audioSummary = useMemo(() => {
    if (!settings.soundEnabled) return t('setup.audioSummary.off' as Parameters<typeof t>[0]);
    return t('setup.audioSummary.on' as Parameters<typeof t>[0], { volume: settings.volume });
  }, [settings.soundEnabled, settings.volume, t]);

  const setupGuideSteps = useMemo(() => ([
    {
      key: 'players',
      done: config.players.length >= 2,
      label: t('setupGuide.stepPlayers'),
    },
    {
      key: 'levels',
      done: config.levels.length > 0,
      label: t('setupGuide.stepLevels'),
    },
    {
      key: 'payout',
      done: config.payout.entries.length > 0,
      label: t('setupGuide.stepPayout'),
    },
  ]), [config.players.length, config.levels.length, config.payout.entries.length, t]);

  const completedGuideSteps = setupGuideSteps.filter((step) => step.done).length;
  const setupGuideProgress = Math.round((completedGuideSteps / setupGuideSteps.length) * 100);

  // Multi-table toggle and config handlers
  const handleToggleMultiTable = useCallback(() => {
    setConfig((prev) => {
      if (prev.tables && prev.tables.length > 0) {
        return { ...prev, tables: undefined, multiTable: undefined };
      }
      // Enable: create 2 tables by default with MultiTableConfig
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
          tables.push(existing[i]);
        } else {
          tables.push(createTable(t('multiTable.tableName', { n: i + 1 }), 10));
        }
      }
      return { ...prev, tables };
    });
  }, [setConfig, t]);

  const [resizeWarningTableId, setResizeWarningTableId] = useState<string | null>(null);
  const [expandedPresetId, setExpandedPresetId] = useState<string | null>(null);
  const [quickStartPlayers, setQuickStartPlayers] = useState(8);

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

  const handleImportLeagueInSetup = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = parseLeagueFile(text);
        if (!data) return;
        const imported = importLeague(data);
        setLeagues(loadLeagues());
        setConfig((prev) => {
          if (imported.defaultConfig) {
            return {
              ...prev,
              ...imported.defaultConfig,
              players: prev.players,
              dealerIndex: prev.dealerIndex,
              tables: prev.tables,
              leagueId: imported.id,
            };
          }
          return { ...prev, leagueId: imported.id };
        });
      } catch { /* ignore */ }
    };
    input.click();
  }, [setConfig]);

  // --- Ante toggle ---
  const toggleAnte = useCallback(() => {
    setConfig((prev) => {
      const newAnteEnabled = !prev.anteEnabled;
      return {
        ...prev,
        anteEnabled: newAnteEnabled,
        levels: newAnteEnabled
          ? applyDefaultAntes(prev.levels, prev.anteMode)
          : stripAnteFromLevels(prev.levels),
      };
    });
  }, [setConfig]);

  // Detect blind values that are incompatible with current chip denominations
  const blindChipConflicts = useMemo(
    () =>
      config.chips.enabled
        ? checkBlindChipCompatibility(config.levels, config.chips.denominations)
        : [],
    [config.chips.enabled, config.chips.denominations, config.levels],
  );

  return (
    <div className="flex-1 p-3 sm:p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        {/* Checkpoint recovery banner */}
        {pendingCheckpoint && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-600/50 rounded-xl p-4 space-y-2 shadow-lg shadow-amber-200/30 dark:shadow-amber-900/20 backdrop-blur-sm animate-fade-in">
            <p className="text-amber-700 dark:text-amber-300 text-sm font-medium">{t('checkpoint.found')}</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              {t('checkpoint.details', {
                name: pendingCheckpoint.config.name || 'Tournament',
                date: new Date(pendingCheckpoint.savedAt).toLocaleString(),
              })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={onRestoreCheckpoint}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97]"
                style={{ background: 'linear-gradient(to bottom, var(--accent-600), var(--accent-700))', boxShadow: `0 4px 6px -1px var(--accent-900)` }}
              >
                {t('checkpoint.restore')}
              </button>
              <button
                onClick={onDismissCheckpoint}
                className="px-4 py-2 bg-white dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
              >
                {t('checkpoint.dismiss')}
              </button>
            </div>
          </div>
        )}

        {/* Quick-start guidance card */}
        <div className="relative overflow-hidden rounded-2xl border border-teal-300/70 dark:border-teal-700/50 bg-gradient-to-br from-teal-50 via-cyan-50 to-white dark:from-teal-950/35 dark:via-cyan-950/20 dark:to-gray-900/20 shadow-lg shadow-cyan-200/40 dark:shadow-cyan-950/20 p-4 sm:p-5 animate-fade-in">
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-teal-200/30 dark:from-teal-500/10 to-transparent pointer-events-none" />
          <div className="relative space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700 dark:text-teal-300">
                  {t('setupGuide.badge')}
                </p>
                <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                  {t('setupGuide.title')}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                  {startErrors.length === 0 ? t('setupGuide.subtitleReady') : t('setupGuide.subtitlePending')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('setupGuide.progress')}</p>
                <p className="text-lg font-bold text-teal-700 dark:text-teal-300">{setupGuideProgress}%</p>
              </div>
            </div>

            <div className="h-2 rounded-full bg-white/70 dark:bg-gray-800/70 border border-teal-200/60 dark:border-teal-800/40 overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${setupGuideProgress}%`,
                  background: 'linear-gradient(90deg, var(--accent-500), var(--accent-600))',
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {setupGuideSteps.map((step) => (
                <div
                  key={step.key}
                  className={`rounded-lg border px-3 py-2 text-xs sm:text-sm ${
                    step.done
                      ? 'border-teal-300/70 dark:border-teal-700/60 bg-teal-100/70 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200'
                      : 'border-gray-300/70 dark:border-gray-700/60 bg-white/70 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <span className="font-semibold mr-1.5">{step.done ? '✓' : '•'}</span>
                  {step.label}
                </div>
              ))}
            </div>

            {startErrors.length > 0 && (
              <p className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-900/20 border border-rose-300/70 dark:border-rose-700/50 rounded-lg px-3 py-2">
                <span className="font-semibold">{t('setupGuide.blockerLabel')}: </span>
                {startErrors[0]}
              </p>
            )}
          </div>
        </div>

        {/* Quick Start Presets */}
        <div className="space-y-2" data-tour="presets">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('preset.title')}</p>
          <div className="flex gap-2 flex-wrap">
            {getBuiltInPresets().map((preset) => (
              <div
                key={preset.id}
                className="flex-1 min-w-[140px] bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40 rounded-xl transition-all duration-200 overflow-hidden"
              >
                <button
                  onClick={() => {
                    onConfirm(
                      t('confirm.presetOverwrite.title'),
                      t('confirm.presetOverwrite.message'),
                      t('confirm.presetOverwrite.confirm'),
                      () => {
                        setConfig((prev) => ({
                          ...prev,
                          ...preset.config,
                          players: prev.players,
                          dealerIndex: prev.dealerIndex,
                          tables: prev.tables,
                          leagueId: prev.leagueId,
                        }));
                      },
                    );
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[color-mix(in_srgb,var(--accent-500)_8%,transparent)] transition-all duration-200 group"
                >
                  <span className="block text-sm font-medium text-gray-800 dark:text-gray-100 group-hover:text-[var(--accent-600)]">{t(preset.nameKey as Parameters<typeof t>[0])}</span>
                  <span className="block text-xs text-gray-400 dark:text-gray-500">{t(preset.descKey as Parameters<typeof t>[0])}</span>
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700/40">
                  <button
                    onClick={() => setExpandedPresetId(expandedPresetId === preset.id ? null : preset.id)}
                    className="w-full px-3 py-1.5 text-xs font-medium text-[var(--accent-600)] hover:bg-[color-mix(in_srgb,var(--accent-500)_8%,transparent)] transition-all duration-200 flex items-center justify-center gap-1"
                    data-testid={`quick-start-toggle-${preset.id}`}
                  >
                    {t('setup.quickStart')}
                    <svg className={`w-3 h-3 transition-transform ${expandedPresetId === preset.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {expandedPresetId === preset.id && (
                    <div className="px-3 pb-2 pt-1 space-y-2 animate-fade-in">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('setup.quickStartPlayers')}</span>
                        <NumberStepper value={quickStartPlayers} onChange={setQuickStartPlayers} min={2} max={30} step={1} />
                      </div>
                      <button
                        onClick={() => {
                          const players = defaultPlayers(quickStartPlayers, t);
                          setConfig((prev) => ({
                            ...prev,
                            ...preset.config,
                            players,
                            dealerIndex: 0,
                            payout: defaultPayoutForPlayerCount(quickStartPlayers),
                            currency: prev.currency,
                          }));
                          onSwitchToGame();
                        }}
                        className="w-full py-1.5 btn-accent-gradient text-white text-sm font-medium rounded-lg shadow-md active:scale-[0.97] transition-all"
                        data-testid={`quick-start-go-${preset.id}`}
                      >
                        {t('setup.quickStartGo')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Turnier-Grundlagen (Name + Buy-In + Startchips) */}
        <CollapsibleSection title={t('app.tournamentBasics')}>
          <div className="space-y-3">
            <input
              type="text"
              value={config.name}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t('app.tournamentNamePlaceholder')}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-ring)] transition-all duration-200"
            />
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 dark:text-gray-500">{t('app.buyIn')}</label>
                <NumberStepper
                  value={config.buyIn}
                  onChange={(newBuyIn) => {
                    setConfig((prev) => ({
                      ...prev,
                      buyIn: newBuyIn,
                      rebuy: {
                        ...prev.rebuy,
                        rebuyCost: prev.rebuy.rebuyCost === prev.buyIn ? newBuyIn : prev.rebuy.rebuyCost,
                      },
                      addOn: {
                        ...prev.addOn,
                        cost: prev.addOn.cost === prev.buyIn ? newBuyIn : prev.addOn.cost,
                      },
                    }));
                  }}
                  min={1}
                  step={1}
                />
                <select
                  value={config.currency}
                  onChange={(e) => setConfig((prev) => ({ ...prev, currency: e.target.value as Currency }))}
                  className="px-2 py-1 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-ring)] transition-all duration-200"
                  aria-label={t('setup.currency')}
                >
                  {(Object.keys(CURRENCY_SYMBOLS) as Currency[]).map((c) => (
                    <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 dark:text-gray-500">{t('app.startingChips')}</label>
                <NumberStepper
                  value={config.startingChips}
                  onChange={(raw) => {
                    setConfig((prev) => {
                      const newChips = snapSpinnerValue(raw, prev.startingChips, 1000);
                      return {
                        ...prev,
                        startingChips: newChips,
                        rebuy: {
                          ...prev.rebuy,
                          rebuyChips: prev.rebuy.rebuyChips === prev.startingChips ? newChips : prev.rebuy.rebuyChips,
                        },
                        addOn: {
                          ...prev.addOn,
                          chips: prev.addOn.chips === prev.startingChips ? newChips : prev.addOn.chips,
                        },
                      };
                    });
                  }}
                  min={1}
                  step={1000}
                  inputClassName="w-24"
                />
                <span className="text-gray-500 dark:text-gray-400 text-sm">{t('unit.chips')}</span>
              </div>
            </div>
            {/* League dropdown + import */}
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs text-gray-400 dark:text-gray-500">{t('league.assignLeague')}</label>
              <select
                value={config.leagueId ?? ''}
                onChange={(e) => {
                  const leagueId = e.target.value || undefined;
                  setConfig((prev) => {
                    if (!leagueId) return { ...prev, leagueId: undefined };
                    const selectedLeague = leagues.find(l => l.id === leagueId);
                    if (selectedLeague?.defaultConfig) {
                      return {
                        ...prev,
                        ...selectedLeague.defaultConfig,
                        players: prev.players,
                        dealerIndex: prev.dealerIndex,
                        tables: prev.tables,
                        leagueId,
                      };
                    }
                    return { ...prev, leagueId };
                  });
                }}
                className="px-3 py-1.5 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-ring)] transition-all duration-200"
              >
                <option value="">{t('league.noLeague')}</option>
                {leagues.map((l) => (
                  <option key={l.id} value={l.id}>{l.name || l.id}</option>
                ))}
              </select>
              <button
                onClick={handleImportLeagueInSetup}
                className="px-2 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
              >
                {t('league.importFile')}
              </button>
            </div>
          </div>
        </CollapsibleSection>

        {/* Spieler */}
        <CollapsibleSection title={t('app.players')} summary={playersSummary}>
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
            <CollapsibleSubSection title={t('multiTable.title')} summary={multiTableSummary} defaultOpen={config.tables != null && config.tables.length > 0}>
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
                  {config.tables && config.tables.length > 0 ? t('multiTable.title') + ' ✓' : t('multiTable.title')}
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
        </CollapsibleSection>

        {/* Auszahlung */}
        <CollapsibleSection title={t('app.payout')} summary={payoutSummary} defaultOpen={false}>
          <PayoutEditor
            payout={config.payout}
            onChange={(payout) => setConfig((prev) => ({ ...prev, payout }))}
            maxPlaces={Math.max(config.players.length, 20)}
            prizePool={config.players.length > 0 ? config.players.length * config.buyIn : undefined}
            currency={config.currency}
            playerCount={config.players.length || undefined}
          />
        </CollapsibleSection>

        {/* Blind-Struktur (Generator + Ante Toggle + Level-Tabelle) */}
        <CollapsibleSection title={t('app.blindStructure')} summary={blindSummary} data-tour="blind-generator">
          <div className="space-y-4">
            <BlindGenerator
              startingChips={config.startingChips}
              anteEnabled={config.anteEnabled}
              anteMode={config.anteMode}
              playerCount={config.players.length}
              chipConfig={config.chips}
              onApply={(levels) =>
                setConfig((prev) => ({ ...prev, levels }))
              }
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={toggleAnte}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  config.anteEnabled
                    ? 'text-white'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
                style={config.anteEnabled ? { backgroundColor: 'var(--accent-700)' } : undefined}
              >
                {config.anteEnabled ? t('app.withAnte') : t('app.withoutAnte')}
              </button>
              {config.anteEnabled && (
                <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700/40">
                  <button
                    onClick={() => setConfig((prev) => ({
                      ...prev,
                      anteMode: 'standard',
                      levels: applyDefaultAntes(prev.levels, 'standard'),
                    }))}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      config.anteMode === 'standard'
                        ? 'text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    style={config.anteMode === 'standard' ? { backgroundColor: 'var(--accent-700)' } : undefined}
                  >
                    {t('app.anteStandard')}
                  </button>
                  <button
                    onClick={() => setConfig((prev) => ({
                      ...prev,
                      anteMode: 'bigBlindAnte',
                      levels: applyDefaultAntes(prev.levels, 'bigBlindAnte'),
                    }))}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      config.anteMode === 'bigBlindAnte'
                        ? 'text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    style={config.anteMode === 'bigBlindAnte' ? { backgroundColor: 'var(--accent-700)' } : undefined}
                  >
                    {t('app.anteBBA')}
                  </button>
                </div>
              )}
            </div>
            <CollapsibleSubSection title={t('config.levelTable')} summary={blindSummary} defaultOpen={false}>
              <ConfigEditor
                config={config}
                onChange={setConfig}
                anteEnabled={config.anteEnabled}
              />
            </CollapsibleSubSection>
          </div>
        </CollapsibleSection>

        {/* Turnier-Format: Rebuy + Add-On + Bounty (collapsed by default) */}
        <CollapsibleSection title={t('app.tournamentFormat')} summary={formatSummary} defaultOpen={false}>
          <div className="space-y-4">
            {/* Rebuy */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                {t('app.rebuy')}
              </h3>
              <RebuyEditor
                rebuy={config.rebuy}
                onChange={(rebuy) => setConfig((prev) => ({
                  ...prev,
                  rebuy,
                  // Auto-disable add-on when rebuy is turned off
                  addOn: !rebuy.enabled ? { ...prev.addOn, enabled: false } : prev.addOn,
                }))}
                buyIn={config.buyIn}
                startingChips={config.startingChips}
                currency={config.currency}
              />
            </div>
            {/* Add-On */}
            <div className="border-t border-gray-300 dark:border-gray-700/50 pt-4">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                {t('app.addOn')}
              </h3>
              <AddOnEditor
                addOn={config.addOn}
                onChange={(addOn) => setConfig((prev) => ({ ...prev, addOn }))}
                buyIn={config.buyIn}
                startingChips={config.startingChips}
                rebuyEnabled={config.rebuy.enabled}
                onEnableRebuy={() =>
                  setConfig((prev) => ({
                    ...prev,
                    rebuy: { ...prev.rebuy, enabled: true },
                  }))
                }
                currency={config.currency}
              />
            </div>
            {/* Bounty */}
            <div className="border-t border-gray-300 dark:border-gray-700/50 pt-4">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                {t('app.bounty')}
              </h3>
              <BountyEditor
                bounty={config.bounty}
                onChange={(bounty) => setConfig((prev) => ({ ...prev, bounty }))}
                currency={config.currency}
              />
            </div>
            {/* Late Registration */}
            <div className="border-t border-gray-300 dark:border-gray-700/50 pt-4">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                {t('lateReg.title')}
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setConfig((prev) => ({
                    ...prev,
                    lateRegistration: {
                      enabled: !prev.lateRegistration?.enabled,
                      levelLimit: prev.lateRegistration?.levelLimit ?? 4,
                    },
                  }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    config.lateRegistration?.enabled
                      ? 'text-white'
                      : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                  style={config.lateRegistration?.enabled ? { backgroundColor: 'var(--accent-700)' } : undefined}
                >
                  {config.lateRegistration?.enabled ? t('lateReg.enabled') : t('lateReg.disabled')}
                </button>
                {config.lateRegistration?.enabled && (
                  <div className="flex items-center gap-2 pl-2 border-l-2" style={{ borderColor: 'var(--accent-700)' }}>
                    <label className="text-sm text-gray-700 dark:text-gray-300">{t('lateReg.untilLevel')}</label>
                    <NumberStepper
                      value={config.lateRegistration.levelLimit}
                      onChange={(v) => setConfig((prev) => ({
                        ...prev,
                        lateRegistration: { ...prev.lateRegistration!, levelLimit: Math.max(1, v) },
                      }))}
                      min={1}
                      max={20}
                      step={1}
                      inputClassName="w-16"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CollapsibleSection>


        {/* Chip-Werte (collapsed by default) */}
        <CollapsibleSection title={t('app.chips')} summary={chipsSummary} defaultOpen={false}>
          <ChipEditor
            chips={config.chips}
            onChange={(chips) => setConfig((prev) => ({ ...prev, chips }))}
            levels={config.levels}
          />
          {/* Chip-Blind compatibility warning */}
          {blindChipConflicts.length > 0 && (
            <div className="mt-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/40 rounded-lg">
              <p className="text-amber-700 dark:text-amber-300 text-xs font-medium">
                {t('app.chipBlindConflict', { values: blindChipConflicts.join(', ') })}
              </p>
              <p className="text-amber-600 dark:text-amber-400/60 text-xs mt-1">
                {t('app.chipBlindConflictHint')}
              </p>
            </div>
          )}
        </CollapsibleSection>

        {/* Audio & Ansagen (collapsed by default) */}
        <CollapsibleSection title={t('settings.sectionAudio' as Parameters<typeof t>[0])} summary={audioSummary} defaultOpen={false}>
          <div className="space-y-3">
            {/* Sound toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.sound')}</span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.soundEnabled}
                onClick={() => onSettingsChange({ ...settings, soundEnabled: !settings.soundEnabled })}
                className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 ${
                  settings.soundEnabled
                    ? 'shadow-sm'
                    : 'bg-gray-200 dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600/60'
                }`}
                style={settings.soundEnabled ? { background: 'linear-gradient(to bottom, var(--accent-400), var(--accent-600))', boxShadow: `0 1px 2px var(--accent-glow)` } : undefined}
              >
                {settings.soundEnabled && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </label>
            {/* Volume slider */}
            {settings.soundEnabled && (
              <div className="flex items-center gap-3 pl-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">{t('settings.volume')}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={settings.volume}
                  onChange={(e) => onSettingsChange({ ...settings, volume: Number(e.target.value) })}
                  className="flex-1 h-1.5 cursor-pointer"
                  style={{ accentColor: 'var(--accent-500)' }}
                />
                <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums w-8 text-right">{settings.volume}%</span>
              </div>
            )}
            {/* Countdown toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.countdown')}</span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.countdownEnabled}
                onClick={() => onSettingsChange({ ...settings, countdownEnabled: !settings.countdownEnabled })}
                className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 ${
                  settings.countdownEnabled
                    ? 'shadow-sm'
                    : 'bg-gray-200 dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600/60'
                }`}
                style={settings.countdownEnabled ? { background: 'linear-gradient(to bottom, var(--accent-400), var(--accent-600))', boxShadow: `0 1px 2px var(--accent-glow)` } : undefined}
              >
                {settings.countdownEnabled && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </label>
            {/* Custom Alerts */}
            <CollapsibleSubSection title={t('alerts.title')} defaultOpen={false}>
              <AlertEditor
                alerts={settings.customAlerts ?? []}
                onChange={(alerts) => onSettingsChange({ ...settings, customAlerts: alerts })}
              />
            </CollapsibleSubSection>
            {/* Custom Audio Files */}
            <button
              onClick={onShowCustomAudio}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors text-left flex items-center gap-2"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
              {t('customAudio.title')}
            </button>
          </div>
        </CollapsibleSection>

        {/* Validation */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700/40">
          {startErrors.length > 0 ? (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3">
              <p className="text-red-700 dark:text-red-400 text-xs font-bold uppercase tracking-wider mb-1">{t('app.checkConfig')}</p>
              {startErrors.map((e, i) => (
                <p key={i} className="text-red-700 dark:text-red-400 text-sm">• {e}</p>
              ))}
            </div>
          ) : (
            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-500) 10%, transparent)', borderColor: 'var(--accent-600)' }}>
              <p className="text-sm" style={{ color: 'var(--accent-text)' }}>{t('app.allReady')}</p>
            </div>
          )}
        </div>

        {/* Start button + Print — sticky on mobile */}
        <div className="sticky bottom-0 pt-3 pb-3 bg-gray-100 dark:bg-gray-900 sm:static sm:bg-transparent sm:pt-0 sm:pb-0 space-y-2" data-tour="start-tournament">
          <button
            onClick={onSwitchToGame}
            disabled={startErrors.length > 0}
            title={startErrors.length > 0 ? startErrors.join(' · ') : undefined}
            className="w-full px-6 py-3 text-white rounded-xl text-lg font-bold transition-all duration-200 active:scale-[0.98] active:shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            style={{ background: 'linear-gradient(to bottom, var(--accent-600), var(--accent-700))', boxShadow: `0 10px 15px -3px var(--accent-900)` }}
          >
            {t('app.startTournament')}
          </button>
          <button
            onClick={() => window.print()}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700/40 no-print"
          >
            {t('print.button')}
          </button>
        </div>

        {/* QR Code — App link (lazy-loaded to keep qrcode.react out of main bundle) */}
        <Suspense fallback={null}>
          <SetupQRCode />
        </Suspense>
      </div>
    </div>
  );
}
