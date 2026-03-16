import type { BountyConfig, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { useTranslation } from '../i18n';
import { NumberStepper } from './NumberStepper';

interface Props {
  bounty: BountyConfig;
  onChange: (bounty: BountyConfig) => void;
  currency?: Currency;
}

const MYSTERY_PRESETS: number[][] = [
  [1, 2, 3, 5, 5, 10],
  [2, 2, 5, 5, 10, 20],
  [5, 5, 10, 10, 25, 50],
];

export function BountyEditor({ bounty, onChange, currency }: Props) {
  const { t } = useTranslation();
  const sym = CURRENCY_SYMBOLS[currency ?? 'EUR'];

  const toggle = () => {
    onChange({ ...bounty, enabled: !bounty.enabled });
  };

  const setType = (type: 'fixed' | 'mystery') => {
    onChange({
      ...bounty,
      type,
      mysteryPool: type === 'mystery' && !bounty.mysteryPool ? [1, 2, 3, 5, 5, 10] : bounty.mysteryPool,
    });
  };

  const addPoolAmount = () => {
    const pool = bounty.mysteryPool ?? [];
    onChange({ ...bounty, mysteryPool: [...pool, bounty.amount] });
  };

  const removePoolEntry = (index: number) => {
    const pool = bounty.mysteryPool ?? [];
    onChange({ ...bounty, mysteryPool: pool.filter((_, i) => i !== index) });
  };

  const updatePoolEntry = (index: number, value: number) => {
    const pool = [...(bounty.mysteryPool ?? [])];
    pool[index] = Math.max(1, value);
    onChange({ ...bounty, mysteryPool: pool });
  };

  const applyPreset = (preset: number[]) => {
    onChange({ ...bounty, mysteryPool: [...preset] });
  };

  const poolTotal = (bounty.mysteryPool ?? []).reduce((sum, v) => sum + v, 0);

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <button
        onClick={toggle}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          bounty.enabled
            ? 'bg-accent-700 text-white'
            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}
      >
        {bounty.enabled ? t('bountyEditor.enabled') : t('bountyEditor.disabled')}
      </button>

      {/* Settings (only when enabled) */}
      {bounty.enabled && (
        <div className="space-y-3 pl-2 border-l-2" style={{ borderColor: 'var(--accent-700)' }}>
          {/* Type toggle: Fixed / Mystery */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">{t('bountyEditor.type')}</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700/40">
              <button
                onClick={() => setType('fixed')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  bounty.type === 'fixed'
                    ? 'bg-accent-700 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {t('bountyEditor.fixed')}
              </button>
              <button
                onClick={() => setType('mystery')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  bounty.type === 'mystery'
                    ? 'bg-accent-700 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {t('bountyEditor.mystery')}
              </button>
            </div>
          </div>

          {/* Fixed bounty amount */}
          {bounty.type === 'fixed' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">{t('bountyEditor.perKnockout')}</label>
              <NumberStepper
                value={bounty.amount}
                onChange={(v) => onChange({ ...bounty, amount: Math.max(1, v) })}
                min={1}
                step={1}
              />
              <span className="text-gray-400 dark:text-gray-500 text-xs">{sym}</span>
            </div>
          )}

          {/* Mystery bounty pool */}
          {bounty.type === 'mystery' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('bountyEditor.pool')}</label>

              {/* Pool entries */}
              <div className="space-y-1.5">
                {(bounty.mysteryPool ?? []).map((amount, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <NumberStepper
                      value={amount}
                      onChange={(v) => updatePoolEntry(i, v)}
                      min={1}
                      step={1}
                    />
                    <span className="text-gray-400 dark:text-gray-500 text-xs">{sym}</span>
                    <button
                      onClick={() => removePoolEntry(i)}
                      className="ml-1 px-2 py-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs font-medium transition-colors"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              {/* Add amount button */}
              <button
                onClick={addPoolAmount}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
              >
                + {t('bountyEditor.addAmount')}
              </button>

              {/* Pool total */}
              {(bounty.mysteryPool ?? []).length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('bountyEditor.poolTotal', { total: poolTotal })}
                </p>
              )}

              {/* Quick presets */}
              <div className="space-y-1">
                <label className="text-xs text-gray-400 dark:text-gray-500">{t('bountyEditor.poolPreset')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {MYSTERY_PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => applyPreset(preset)}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs transition-colors border border-gray-200 dark:border-gray-700/40"
                    >
                      [{preset.join(', ')}]
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t('bountyEditor.description')}
          </p>
        </div>
      )}
    </div>
  );
}
