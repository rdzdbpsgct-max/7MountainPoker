import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { computeIcmDeal } from '../domain/logic';
import type { IcmResult } from '../domain/logic';
import type { Player, PayoutConfig } from '../domain/types';
import { useTranslation } from '../i18n';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { NumberStepper } from './NumberStepper';

interface Props {
  onClose: () => void;
  /** Active players with tracked stacks */
  players: Player[];
  /** Payout config for prize distribution */
  payout: PayoutConfig;
  /** Total prizepool */
  prizePool: number;
}

export function IcmCalculator({ onClose, players, payout, prizePool }: Props) {
  const { t } = useTranslation();
  const dialogRef = useDialogA11y(onClose);

  // Initialize stacks from player data or allow manual entry
  const activePlayers = useMemo(
    () => players.filter((p) => p.status === 'active'),
    [players],
  );

  const [stacks, setStacks] = useState<number[]>(() =>
    activePlayers.map((p) => p.chips ?? 0),
  );

  const hasTrackedStacks = activePlayers.some((p) => p.chips != null && p.chips > 0);

  const handleStackChange = useCallback((index: number, value: number) => {
    setStacks((prev) => {
      const next = [...prev];
      next[index] = Math.max(0, value);
      return next;
    });
  }, []);

  // Compute payout amounts from config
  const payoutAmounts = useMemo(() => {
    if (payout.entries.length === 0) return [];
    if (payout.mode === 'percent') {
      return payout.entries.map((e) => Math.round((e.value / 100) * prizePool));
    }
    return payout.entries.map((e) => e.value);
  }, [payout, prizePool]);

  // Compute ICM (async)
  const hasValidInputs = !stacks.every((s) => s === 0) && payoutAmounts.length > 0;
  const [icmResultsRaw, setIcmResultsRaw] = useState<IcmResult[] | null>(null);
  useEffect(() => {
    if (!hasValidInputs) return;
    let cancelled = false;
    void computeIcmDeal(stacks, payoutAmounts).then((results) => {
      if (!cancelled) setIcmResultsRaw(results);
    });
    return () => { cancelled = true; };
  }, [stacks, payoutAmounts, hasValidInputs]);
  const icmResults = hasValidInputs ? icmResultsRaw : null;

  const totalChips = stacks.reduce((a, b) => a + b, 0);
  const totalPayout = payoutAmounts.reduce((a, b) => a + b, 0);

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('icm.title')}
        className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/40 shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700/40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('icm.title')}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={t('icm.close')}
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Info */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('icm.description')}
          </p>

          {/* Prize pool info */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t('icm.prizePool')}:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {totalPayout > 0 ? `€${totalPayout.toLocaleString()}` : '—'}
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500 dark:text-gray-400">{t('icm.totalChips')}:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {totalChips > 0 ? totalChips.toLocaleString() : '—'}
            </span>
          </div>

          {/* Stack inputs */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('icm.playerStacks')}
            </h3>
            {!hasTrackedStacks && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t('icm.noStacksHint')}
              </p>
            )}
            <div className="space-y-1.5">
              {activePlayers.map((player, i) => (
                <div key={player.id} className="flex items-center gap-3">
                  <span className="w-24 truncate text-sm text-gray-700 dark:text-gray-300">
                    {player.name}
                  </span>
                  <div className="flex-1">
                    <NumberStepper
                      value={stacks[i]!}
                      onChange={(v) => handleStackChange(i, v)}
                      min={0}
                      step={1000}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payout structure info */}
          {payoutAmounts.length === 0 && (
            <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 text-sm text-amber-700 dark:text-amber-300">
              {t('icm.noPayoutHint')}
            </div>
          )}

          {/* ICM Results */}
          {icmResults && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('icm.results')}
              </h3>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700/40 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/60">
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                        {t('icm.player')}
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">
                        {t('icm.chips')}
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">
                        {t('icm.chipPercent')}
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">
                        {t('icm.equity')}
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">
                        {t('icm.equityPercent')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {icmResults
                      .filter((r) => r.stack > 0)
                      .sort((a, b) => b.equity - a.equity)
                      .map((r) => (
                        <tr
                          key={r.playerIndex}
                          className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                        >
                          <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                            {activePlayers[r.playerIndex]?.name ?? `#${r.playerIndex + 1}`}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                            {r.stack.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">
                            {r.stackPercent.toFixed(1)}%
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                            €{r.equity.toFixed(0)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">
                            {r.equityPercent.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Chip equity comparison note */}
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                {t('icm.note')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
