import { useCallback, useMemo } from 'react';
import type { TournamentConfig, Settings } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import type { AppFeature } from '../domain/entitlements';
import {
  stripAnteFromLevels,
  applyDefaultAntes,
  checkBlindChipCompatibility,
  computeBlindStructureSummary,
} from '../domain/logic';
import { useTranslation } from '../i18n';
import { ConfigEditor } from './ConfigEditor';
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

interface Props {
  config: TournamentConfig;
  setConfig: React.Dispatch<React.SetStateAction<TournamentConfig>>;
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
  onShowCustomAudio: () => void;
  canUseMultiTable?: boolean | undefined;
  onOpenFeatureGate?: ((feature: AppFeature) => void) | undefined;
}

export function SetupTabStructure({
  config,
  setConfig,
  settings,
  onSettingsChange,
  onShowCustomAudio,
}: Props) {
  const { t } = useTranslation();

  // --- Section summaries ---
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
    const sym = CURRENCY_SYMBOLS[config.currency ?? 'EUR'];
    const parts: string[] = [];
    if (config.rebuy.enabled) parts.push('Rebuy');
    if (config.addOn.enabled) parts.push('Add-On');
    if (config.bounty.enabled) parts.push(t('section.bountyLabel', { amount: config.bounty.amount, symbol: sym }));
    if (config.lateRegistration?.enabled) parts.push(t('lateReg.short'));
    return parts.length > 0 ? parts.join(', ') : t('section.allDisabled');
  }, [config.rebuy, config.addOn, config.bounty, config.lateRegistration, config.currency, t]);

  const blindSummary = useMemo(() => {
    const s = computeBlindStructureSummary(config.levels);
    return t('config.summary', { levels: s.levelCount, breaks: s.breakCount, min: s.avgMinutes });
  }, [config.levels, t]);

  const audioSummary = useMemo(() => {
    if (!settings.soundEnabled) return t('setup.audioSummary.off' as Parameters<typeof t>[0]);
    return t('setup.audioSummary.on' as Parameters<typeof t>[0], { volume: settings.volume });
  }, [settings.soundEnabled, settings.volume, t]);

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

  const blindChipConflicts = useMemo(() => {
    if (!config.chips.enabled) return [];
    return checkBlindChipCompatibility(config.levels, config.chips.denominations);
  }, [config.levels, config.chips]);

  return (
    <div className="space-y-4">
      {/* Blind-Struktur (Generator + Ante Toggle + Level-Tabelle) */}
      <CollapsibleSection id="setup-blinds" title={t('app.blindStructure')} summary={blindSummary} data-tour="blind-generator">
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
          {/* Estimated Schedule */}
          {config.levels.length > 0 && (() => {
            const totalSeconds = config.levels.reduce((sum, l) => sum + l.durationSeconds, 0);
            const totalMinutes = Math.floor(totalSeconds / 60);
            const hours = Math.floor(totalMinutes / 60);
            const mins = totalMinutes % 60;
            const playLevels = config.levels.filter(l => l.type === 'level').length;
            const breaks = config.levels.filter(l => l.type === 'break').length;
            return (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <span>{t('schedule.totalDuration')}: <strong className="text-gray-700 dark:text-gray-300">{hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}</strong></span>
                <span>{playLevels} {t('schedule.levels')}</span>
                <span>{breaks} {t('schedule.breaks')}</span>
              </div>
            );
          })()}
        </div>
      </CollapsibleSection>

      {/* Auszahlung */}
      <CollapsibleSection id="setup-payout" title={t('app.payout')} summary={payoutSummary} defaultOpen={false}>
        <PayoutEditor
          payout={config.payout}
          onChange={(payout) => setConfig((prev) => ({ ...prev, payout }))}
          maxPlaces={Math.max(config.players.length, 20)}
          prizePool={config.players.length > 0 ? config.players.length * config.buyIn : undefined}
          currency={config.currency}
          playerCount={config.players.length || undefined}
        />
      </CollapsibleSection>

      {/* Turnier-Format: Rebuy + Add-On + Bounty (collapsed by default) */}
      <CollapsibleSection id="setup-format" title={t('app.tournamentFormat')} summary={formatSummary} defaultOpen={false}>
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
      <CollapsibleSection id="setup-chips" title={t('app.chips')} summary={chipsSummary} defaultOpen={false}>
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
    </div>
  );
}
