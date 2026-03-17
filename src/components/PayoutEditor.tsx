import { useState } from 'react';
import type { PayoutConfig, PayoutMode, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { validatePayoutConfig, defaultPayoutForPlayerCount } from '../domain/logic';
import { PAYOUT_TEMPLATES } from '../domain/logic';
import { useTranslation } from '../i18n';
import { NumberStepper } from './NumberStepper';

interface Props {
  payout: PayoutConfig;
  onChange: (payout: PayoutConfig) => void;
  maxPlaces?: number | undefined;
  prizePool?: number | undefined;
  currency?: Currency | undefined;
  playerCount?: number | undefined;
}

export function PayoutEditor({ payout, onChange, maxPlaces = 20, prizePool, currency, playerCount }: Props) {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<string[]>([]);

  const currencySymbol = currency ? CURRENCY_SYMBOLS[currency] : '€';

  const validate = (p: PayoutConfig) => validatePayoutConfig(p, maxPlaces);

  const setMode = (mode: PayoutMode) => {
    const updated = { ...payout, mode };
    onChange(updated);
    setErrors(validate(updated));
  };

  const updateEntry = (index: number, value: number) => {
    const entries = payout.entries.map((e, i) =>
      i === index ? { ...e, value } : e,
    );
    const updated = { ...payout, entries };
    onChange(updated);
    setErrors(validate(updated));
  };

  const addPlace = () => {
    if (payout.entries.length >= maxPlaces) return;
    const nextPlace = payout.entries.length + 1;
    const updated = {
      ...payout,
      entries: [...payout.entries, { place: nextPlace, value: 0 }],
    };
    onChange(updated);
    setErrors(validate(updated));
  };

  const removeLastPlace = () => {
    if (payout.entries.length <= 1) return;
    const updated = {
      ...payout,
      entries: payout.entries.slice(0, -1),
    };
    onChange(updated);
    setErrors(validate(updated));
  };

  const setPlaceCount = (count: number) => {
    const clamped = Math.max(1, Math.min(maxPlaces, count));
    let entries = [...payout.entries];
    if (clamped > entries.length) {
      for (let i = entries.length; i < clamped; i++) {
        entries.push({ place: i + 1, value: 0 });
      }
    } else {
      entries = entries.slice(0, clamped);
    }
    const updated = { ...payout, entries };
    onChange(updated);
    setErrors(validate(updated));
  };

  const applyAutoSplit = () => {
    if (!playerCount) return;
    const autoConfig = defaultPayoutForPlayerCount(playerCount);
    onChange(autoConfig);
    setErrors(validate(autoConfig));
  };

  const applyTemplate = (templateId: string) => {
    const tpl = PAYOUT_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;
    const updated: PayoutConfig = { mode: 'percent', entries: [...tpl.entries] };
    onChange(updated);
    setErrors(validate(updated));
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle + Auto + Template */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setMode('percent')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            payout.mode === 'percent'
              ? 'bg-accent-700 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {t('payoutEditor.percent')}
        </button>
        <button
          onClick={() => setMode('euro')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            payout.mode === 'euro'
              ? 'bg-accent-700 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {currencySymbol}
        </button>

        {/* Auto-split button */}
        {playerCount != null && playerCount > 0 && (
          <button
            onClick={applyAutoSplit}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Auto
          </button>
        )}

        {/* Template dropdown */}
        <select
          data-testid="payout-template"
          value=""
          onChange={(e) => applyTemplate(e.target.value)}
          className="px-2 py-1.5 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-ring)] transition-all duration-200"
        >
          <option value="">{t('payout.template')}</option>
          {PAYOUT_TEMPLATES.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>{t(tpl.label as Parameters<typeof t>[0])}</option>
          ))}
        </select>
      </div>

      {/* Place count */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('payoutEditor.paidPlaces')}</label>
        <NumberStepper
          value={payout.entries.length}
          onChange={(v) => setPlaceCount(v)}
          min={1}
          max={maxPlaces}
          step={1}
          inputClassName="w-16"
        />
      </div>

      {/* Entries */}
      <div className="space-y-2">
        {payout.entries.map((entry, i) => (
          <div key={entry.place} data-testid="payout-entry" className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm w-16">{t('payoutEditor.placeN', { n: entry.place })}</span>
            <NumberStepper
              value={entry.value}
              onChange={(v) => updateEntry(i, v)}
              min={0}
              step={payout.mode === 'percent' ? 5 : 1}
              inputClassName="w-24"
            />
            <span className="text-gray-400 dark:text-gray-500 text-sm">
              {payout.mode === 'percent' ? '%' : currencySymbol}
            </span>
            {/* Live preview for percent mode */}
            {payout.mode === 'percent' && prizePool != null && prizePool > 0 && (
              <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">
                → {(entry.value / 100 * prizePool).toFixed(0)} {currencySymbol}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          onClick={addPlace}
          disabled={payout.entries.length >= maxPlaces}
          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
        >
          {t('payoutEditor.addPlace')}
        </button>
        <button
          onClick={removeLastPlace}
          disabled={payout.entries.length <= 1}
          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
        >
          {t('payoutEditor.removePlace')}
        </button>
      </div>

      {/* Validation */}
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-2">
          {errors.map((e, i) => (
            <p key={i} className="text-red-700 dark:text-red-400 text-xs">{e}</p>
          ))}
        </div>
      )}

      {/* Sum display for percent + live total */}
      {payout.mode === 'percent' && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {t('payoutEditor.sum')} {payout.entries.reduce((s, e) => s + e.value, 0)}%
          {prizePool != null && prizePool > 0 && (
            <span className="ml-3">{t('payout.total')}: {prizePool.toFixed(0)} {currencySymbol}</span>
          )}
        </p>
      )}
    </div>
  );
}
