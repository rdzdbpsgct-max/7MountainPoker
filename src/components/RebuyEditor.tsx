import type { RebuyConfig, RebuyLimitType, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { snapSpinnerValue } from '../domain/logic';
import { useTranslation } from '../i18n';
import { NumberStepper } from './NumberStepper';

interface Props {
  rebuy: RebuyConfig;
  onChange: (rebuy: RebuyConfig) => void;
  buyIn: number;
  startingChips: number;
  currency?: Currency;
}

export function RebuyEditor({ rebuy, onChange, buyIn, startingChips, currency }: Props) {
  const { t } = useTranslation();
  const sym = CURRENCY_SYMBOLS[currency ?? 'EUR'];

  const toggle = () => {
    onChange({
      ...rebuy,
      enabled: !rebuy.enabled,
      rebuyCost: rebuy.rebuyCost || buyIn,
      rebuyChips: rebuy.rebuyChips || startingChips,
    });
  };

  const setLimitType = (limitType: RebuyLimitType) => {
    onChange({ ...rebuy, limitType });
  };

  const setLevelLimit = (levelLimit: number) => {
    onChange({ ...rebuy, levelLimit: Math.max(1, levelLimit) });
  };

  const setTimeLimitFromHoursMinutes = (hours: number, minutes: number) => {
    const totalSeconds = Math.max(60, hours * 3600 + minutes * 60);
    onChange({ ...rebuy, timeLimit: totalSeconds });
  };

  const hours = Math.floor(rebuy.timeLimit / 3600);
  const minutes = Math.floor((rebuy.timeLimit % 3600) / 60);

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <button
        onClick={toggle}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          rebuy.enabled
            ? 'bg-accent-700 text-white'
            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}
      >
        {rebuy.enabled ? t('rebuyEditor.enabled') : t('rebuyEditor.disabled')}
      </button>

      {/* Settings (only when enabled) */}
      {rebuy.enabled && (
        <div className="space-y-3 pl-2 border-l-2" style={{ borderColor: 'var(--accent-700)' }}>
          {/* Rebuy cost & chips */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">{t('rebuyEditor.cost')}</label>
              <NumberStepper
                value={rebuy.rebuyCost}
                onChange={(v) => onChange({ ...rebuy, rebuyCost: Math.max(1, v) })}
                min={1}
                step={1}
              />
              <span className="text-gray-400 dark:text-gray-500 text-xs">{sym}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">{t('rebuyEditor.chips')}</label>
              <NumberStepper
                value={rebuy.rebuyChips}
                onChange={(raw) => {
                  const val = snapSpinnerValue(raw, rebuy.rebuyChips, 1000);
                  onChange({ ...rebuy, rebuyChips: val });
                }}
                min={1}
                step={1000}
                inputClassName="w-24"
              />
              <span className="text-gray-400 dark:text-gray-500 text-xs">{t('unit.chips')}</span>
            </div>
          </div>

          {/* Limit type toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLimitType('levels')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                rebuy.limitType === 'levels'
                  ? 'bg-accent-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t('rebuyEditor.byLevels')}
            </button>
            <button
              onClick={() => setLimitType('time')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                rebuy.limitType === 'time'
                  ? 'bg-accent-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t('rebuyEditor.byTime')}
            </button>
          </div>

          {/* Level limit */}
          {rebuy.limitType === 'levels' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">{t('rebuyEditor.untilLevel')}</label>
              <NumberStepper
                value={rebuy.levelLimit}
                onChange={(v) => setLevelLimit(v)}
                min={1}
                max={20}
                step={1}
                inputClassName="w-16"
              />
            </div>
          )}

          {/* Time limit */}
          {rebuy.limitType === 'time' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">{t('rebuyEditor.timePeriod')}</label>
              <NumberStepper
                value={hours}
                onChange={(v) => setTimeLimitFromHoursMinutes(v, minutes)}
                min={0}
                max={10}
                step={1}
                inputClassName="w-14"
              />
              <span className="text-gray-400 dark:text-gray-500 text-xs">{t('rebuyEditor.hours')}</span>
              <NumberStepper
                value={minutes}
                onChange={(v) => setTimeLimitFromHoursMinutes(hours, v)}
                min={0}
                max={59}
                step={1}
                inputClassName="w-14"
              />
              <span className="text-gray-400 dark:text-gray-500 text-xs">{t('rebuyEditor.minutes')}</span>
            </div>
          )}

          {/* Max rebuys per player */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">{t('rebuyEditor.maxPerPlayer')}</label>
            <NumberStepper
              value={rebuy.maxRebuysPerPlayer ?? 0}
              onChange={(v) => onChange({ ...rebuy, maxRebuysPerPlayer: v <= 0 ? undefined : v })}
              min={0}
              max={20}
              step={1}
              inputClassName="w-16"
            />
            <span className="text-gray-400 dark:text-gray-500 text-xs">
              {rebuy.maxRebuysPerPlayer === undefined ? t('rebuyEditor.unlimited') : ''}
            </span>
          </div>

          {/* Separate Pot */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChange({ ...rebuy, separatePot: !rebuy.separatePot })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                rebuy.separatePot
                  ? 'bg-amber-700 hover:bg-amber-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t('rebuyEditor.separatePot')}
            </button>
            <span className="text-xs text-gray-400 dark:text-gray-500">{t('rebuyEditor.separatePotHint')}</span>
          </div>

          {/* Re-Entry */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onChange({ ...rebuy, reEntryEnabled: !rebuy.reEntryEnabled })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  rebuy.reEntryEnabled
                    ? 'bg-purple-700 hover:bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {t('rebuyEditor.reEntry')}
              </button>
              <span className="text-xs text-gray-400 dark:text-gray-500">{t('rebuyEditor.reEntryHint')}</span>
            </div>
            {rebuy.reEntryEnabled && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 dark:text-gray-300">{t('rebuyEditor.maxReEntries')}</label>
                <NumberStepper
                  value={rebuy.maxReEntries ?? 0}
                  onChange={(v) => onChange({ ...rebuy, maxReEntries: v <= 0 ? undefined : v })}
                  min={0}
                  max={5}
                  step={1}
                  inputClassName="w-16"
                />
                <span className="text-gray-400 dark:text-gray-500 text-xs">
                  {rebuy.maxReEntries === undefined ? t('rebuyEditor.unlimited') : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
