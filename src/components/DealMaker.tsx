import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Player, PayoutConfig, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { computeEvenChop, computeChipChop, computeIcmChop } from '../domain/logic';
import type { DealShare } from '../domain/logic';
import { useTranslation } from '../i18n';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { NumberStepper } from './NumberStepper';

type DealMethod = 'icm' | 'chip' | 'even';

interface Props {
  onClose: () => void;
  players: Player[];
  payout: PayoutConfig;
  prizePool: number;
  currency?: Currency | undefined;
  onAcceptDeal: (payouts: Map<string, number>, method: string) => void;
}

export function DealMaker({ onClose, players, payout, prizePool, currency, onAcceptDeal }: Props) {
  const { t } = useTranslation();
  const dialogRef = useDialogA11y(onClose);
  const sym = CURRENCY_SYMBOLS[currency ?? 'EUR'];

  const activePlayers = useMemo(
    () => players.filter((p) => p.status === 'active'),
    [players],
  );

  const [method, setMethod] = useState<DealMethod>('icm');
  const [manualAmounts, setManualAmounts] = useState<number[] | null>(null);
  const [icmAmounts, setIcmAmounts] = useState<number[] | null>(null);

  // Compute payout amounts from config
  const payoutAmounts = useMemo(() => {
    if (payout.entries.length === 0) return [];
    if (payout.mode === 'percent') {
      return payout.entries.map((e) => Math.round((e.value / 100) * prizePool));
    }
    return payout.entries.map((e) => e.value);
  }, [payout, prizePool]);

  const stacks = useMemo(() => activePlayers.map((p) => p.chips ?? 0), [activePlayers]);
  const hasStacks = stacks.some((s) => s > 0);

  // Sync computation for even/chip methods
  const computedAmounts = useMemo((): number[] | null => {
    if (method === 'even') {
      return computeEvenChop(activePlayers.length, prizePool).map((s) => s.amount);
    }
    if (method === 'chip') {
      if (hasStacks) {
        return computeChipChop(stacks, prizePool).map((s) => s.amount);
      }
      return computeEvenChop(activePlayers.length, prizePool).map((s) => s.amount);
    }
    // ICM: use async result or fallback to even
    if (icmAmounts) return icmAmounts;
    if (!hasStacks || payoutAmounts.length === 0) {
      return computeEvenChop(activePlayers.length, prizePool).map((s) => s.amount);
    }
    return null; // Still computing
  }, [method, activePlayers.length, prizePool, hasStacks, stacks, icmAmounts, payoutAmounts.length]);

  // Reset manual overrides when method changes
  const handleMethodChange = useCallback((m: DealMethod) => {
    setManualAmounts(null);
    setIcmAmounts(null);
    setMethod(m);
  }, []);

  // Async ICM computation
  useEffect(() => {
    if (method !== 'icm' || !hasStacks || payoutAmounts.length === 0) return;
    let cancelled = false;
    void computeIcmChop(stacks, payoutAmounts).then((shares: DealShare[]) => {
      if (!cancelled) {
        setIcmAmounts(shares.map((s) => s.amount));
      }
    });
    return () => { cancelled = true; };
  }, [method, stacks, payoutAmounts, hasStacks]);

  // Derive computing state from whether ICM result is pending
  const computing = method === 'icm' && hasStacks && payoutAmounts.length > 0 && !icmAmounts;

  // Effective amounts: manual > computed > zeros
  const amounts = manualAmounts ?? computedAmounts ?? activePlayers.map(() => 0);

  const handleAmountChange = useCallback((index: number, value: number) => {
    setManualAmounts((prev) => {
      const base = prev ?? computedAmounts ?? activePlayers.map(() => 0);
      const next = [...base];
      next[index] = Math.max(0, Math.round(value * 100) / 100);
      return next;
    });
  }, [computedAmounts, activePlayers]);

  const total = amounts.reduce((a, b) => a + b, 0);
  const totalRounded = Math.round(total * 100) / 100;
  const isValid = Math.abs(totalRounded - prizePool) < 1; // Allow €1 rounding tolerance

  const handleConfirm = useCallback(() => {
    if (!isValid) return;
    const payoutMap = new Map<string, number>();
    activePlayers.forEach((p, i) => {
      payoutMap.set(p.id, amounts[i]!);
    });
    onAcceptDeal(payoutMap, method);
  }, [isValid, activePlayers, amounts, method, onAcceptDeal]);

  const methodTabs: { key: DealMethod; label: string }[] = [
    { key: 'icm', label: t('deal.icmChop') },
    { key: 'chip', label: t('deal.chipChop') },
    { key: 'even', label: t('deal.evenChop') },
  ];

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('deal.title')}
        className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/40 shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700/40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('deal.title')}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={t('deal.title')}
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('deal.description')}
          </p>

          {/* Method tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/60">
            {methodTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleMethodChange(tab.key)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  method === tab.key
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Prize pool info */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t('deal.remaining')}:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {sym}{prizePool.toLocaleString()}
            </span>
          </div>

          {/* Player amounts */}
          {computing ? (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              ...
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                {t('deal.adjustHint')}
              </p>
              <div className="space-y-1.5">
                {activePlayers.map((player, i) => (
                  <div key={player.id} className="flex items-center gap-3">
                    <span className="w-28 truncate text-sm text-gray-700 dark:text-gray-300">
                      {player.name}
                    </span>
                    <div className="flex-1">
                      <NumberStepper
                        value={amounts[i]!}
                        onChange={(v) => handleAmountChange(i, v)}
                        min={0}
                        step={1}
                      />
                    </div>
                    <span className="w-16 text-right text-sm font-mono text-gray-500 dark:text-gray-400">
                      {sym}{amounts[i]!.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold ${
                isValid
                  ? 'bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-gray-100'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 text-red-700 dark:text-red-300'
              }`}>
                <span>{t('deal.total')}</span>
                <span>{sym}{totalRounded.toLocaleString()}</span>
              </div>
              {!isValid && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {t('deal.invalidTotal')}
                </p>
              )}
            </div>
          )}

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={!isValid || computing}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-b from-[var(--accent-500)] to-[var(--accent-600)] hover:from-[var(--accent-600)] hover:to-[var(--accent-700)] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-[0.97] transition-all"
          >
            {t('deal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
