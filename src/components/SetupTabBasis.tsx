import { useCallback, useMemo, useState } from 'react';
import type { TournamentConfig, TournamentCheckpoint, League, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import {
  snapSpinnerValue,
  defaultPayoutForPlayerCount,
  loadLeagues,
  parseLeagueFile,
  importLeague,
  getBuiltInPresets,
  defaultPlayers,
  loadTournamentHistory,
} from '../domain/logic';
import { useTranslation } from '../i18n';
import { CollapsibleSection } from './CollapsibleSection';
import { NumberStepper } from './NumberStepper';

interface Props {
  config: TournamentConfig;
  setConfig: React.Dispatch<React.SetStateAction<TournamentConfig>>;
  pendingCheckpoint: TournamentCheckpoint | null;
  onRestoreCheckpoint: () => void;
  onDismissCheckpoint: () => void;
  onSwitchToGame: () => void;
  onConfirm: (title: string, message: string, confirmLabel: string, onConfirm: () => void) => void;
  startErrors: string[];
}

export function SetupTabBasis({
  config,
  setConfig,
  pendingCheckpoint,
  onRestoreCheckpoint,
  onDismissCheckpoint,
  onSwitchToGame,
  onConfirm,
  startErrors,
}: Props) {
  const { t } = useTranslation();

  // Load leagues for the dropdown (refresh when component mounts)
  const [leagues, setLeagues] = useState<League[]>(() => loadLeagues());

  // Backup reminder: show after 5+ tournaments and 30+ days since last backup
  const BACKUP_KEY = 'poker-timer-last-backup';
  const [showBackupReminder, setShowBackupReminder] = useState(() => {
    const historyCount = loadTournamentHistory().length;
    if (historyCount < 5) return false;
    const lastBackup = localStorage.getItem(BACKUP_KEY);
    const daysSinceBackup = lastBackup ? (Date.now() - Number(lastBackup)) / (1000 * 60 * 60 * 24) : Infinity;
    return daysSinceBackup >= 30;
  });
  const dismissBackupReminder = useCallback(() => {
    localStorage.setItem(BACKUP_KEY, String(Date.now()));
    setShowBackupReminder(false);
  }, []);

  // Setup guide steps
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

  // Quick Start Presets state
  const [expandedPresetId, setExpandedPresetId] = useState<string | null>(null);
  const [quickStartPlayers, setQuickStartPlayers] = useState(8);

  // League import handler
  const handleImportLeagueInSetup = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) return;
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

  return (
    <div className="space-y-4 sm:space-y-6">
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

      {/* Backup reminder banner */}
      {showBackupReminder && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-600/40 rounded-xl p-4 space-y-2 shadow-md animate-fade-in">
          <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">{t('backup.reminderTitle')}</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs">{t('backup.reminderDetail')}</p>
          <div className="flex gap-2">
            <button
              onClick={dismissBackupReminder}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700/40"
            >
              {t('backup.dismiss')}
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
            <ul className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-900/20 border border-rose-300/70 dark:border-rose-700/50 rounded-lg px-3 py-2 space-y-1">
              {startErrors.map((err, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="font-semibold shrink-0">{i === 0 ? `${t('setupGuide.blockerLabel')}:` : '•'}</span>
                  <span>{err}</span>
                </li>
              ))}
            </ul>
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
                      <NumberStepper value={quickStartPlayers} onChange={setQuickStartPlayers} min={2} max={30} step={1} inputClassName="w-14" />
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
      <CollapsibleSection id="setup-basics" title={t('app.tournamentBasics')}>
        <div className="space-y-3">
          <input
            type="text"
            value={config.name}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, name: e.target.value }))
            }
            maxLength={100}
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
    </div>
  );
}
