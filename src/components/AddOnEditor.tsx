import { useState } from 'react';
import type { AddOnConfig, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { snapSpinnerValue } from '../domain/logic';
import { useTranslation } from '../i18n';
import { NumberStepper } from './NumberStepper';

interface Props {
  addOn: AddOnConfig;
  onChange: (addOn: AddOnConfig) => void;
  buyIn: number;
  startingChips: number;
  rebuyEnabled: boolean;
  onEnableRebuy: () => void;
  currency?: Currency;
}

export function AddOnEditor({ addOn, onChange, buyIn, startingChips, rebuyEnabled, onEnableRebuy, currency }: Props) {
  const { t } = useTranslation();
  const sym = CURRENCY_SYMBOLS[currency ?? 'EUR'];
  const [showRebuyHint, setShowRebuyHint] = useState(false);

  const toggle = () => {
    if (!addOn.enabled && !rebuyEnabled) {
      // Trying to enable Add-On without Rebuy → show hint
      setShowRebuyHint(true);
      return;
    }
    setShowRebuyHint(false);
    onChange({
      ...addOn,
      enabled: !addOn.enabled,
      cost: addOn.cost || buyIn,
      chips: addOn.chips || startingChips,
    });
  };

  const handleEnableRebuy = () => {
    onEnableRebuy();
    setShowRebuyHint(false);
    // Now enable add-on too
    onChange({
      ...addOn,
      enabled: true,
      cost: addOn.cost || buyIn,
      chips: addOn.chips || startingChips,
    });
  };

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <button
        onClick={toggle}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          addOn.enabled
            ? 'bg-accent-700 text-white'
            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}
      >
        {addOn.enabled ? t('addOnEditor.enabled') : t('addOnEditor.disabled')}
      </button>

      {/* Rebuy required hint */}
      {showRebuyHint && (
        <div className="px-3 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/40 rounded-lg space-y-2">
          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
            {t('addOnEditor.requiresRebuy')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRebuyHint(false)}
              className="flex-1 px-2 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-xs font-medium transition-colors"
            >
              {t('app.cancel')}
            </button>
            <button
              onClick={handleEnableRebuy}
              className="flex-1 px-2 py-1.5 bg-accent-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              {t('addOnEditor.enableRebuy')}
            </button>
          </div>
        </div>
      )}

      {/* Settings (only when enabled) */}
      {addOn.enabled && (
        <div className="space-y-3 pl-2 border-l-2" style={{ borderColor: 'var(--accent-700)' }}>
          <p className="text-xs text-gray-400 dark:text-gray-500">{t('addOnEditor.description')}</p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">{t('addOnEditor.cost')}</label>
              <NumberStepper
                value={addOn.cost}
                onChange={(v) => onChange({ ...addOn, cost: Math.max(1, v) })}
                min={1}
                step={1}
              />
              <span className="text-gray-400 dark:text-gray-500 text-xs">{sym}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">{t('addOnEditor.chips')}</label>
              <NumberStepper
                value={addOn.chips}
                onChange={(raw) => {
                  const val = snapSpinnerValue(raw, addOn.chips, 1000);
                  onChange({ ...addOn, chips: val });
                }}
                min={1}
                step={1000}
                inputClassName="w-24"
              />
              <span className="text-gray-400 dark:text-gray-500 text-xs">{t('unit.chips')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
