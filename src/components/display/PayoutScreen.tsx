import type { Player, PayoutConfig, RebuyConfig, AddOnConfig, Currency } from '../../domain/types';
import { CURRENCY_SYMBOLS } from '../../domain/types';
import { computePrizePool, computePayouts, computeTotalRebuys, computeRebuyPot } from '../../domain/logic';
import { useTranslation } from '../../i18n';

interface Props {
  players: Player[];
  buyIn: number;
  payout: PayoutConfig;
  rebuy: RebuyConfig;
  addOn: AddOnConfig;
  isBubble: boolean;
  currency?: Currency | undefined;
}

export function PayoutScreen({
  players,
  buyIn,
  payout,
  rebuy,
  addOn,
  isBubble,
  currency,
}: Props) {
  const { t } = useTranslation();
  const sym = CURRENCY_SYMBOLS[currency ?? 'EUR'];

  const prizePool = computePrizePool(
    players, buyIn,
    rebuy.enabled ? rebuy.rebuyCost : undefined,
    addOn.enabled ? addOn.cost : undefined,
    rebuy.separatePot,
  );
  const payoutAmounts = computePayouts(payout, prizePool);
  const paidPlaces = payout.entries.length;
  const totalRebuys = rebuy.enabled ? computeTotalRebuys(players) : 0;
  const rebuyPotAmount = rebuy.separatePot && totalRebuys > 0 ? computeRebuyPot(players, rebuy.rebuyCost) : 0;

  return (
    <div className="w-full max-w-2xl mx-auto h-full flex flex-col">
      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
        {t('display.payout')} — {prizePool.toLocaleString()} {sym}
        {rebuyPotAmount > 0 && (
          <span className="text-amber-400 ml-2 text-xs font-normal">
            + {rebuyPotAmount.toLocaleString()} {sym} {t('rebuy.separatePotLabel')}
          </span>
        )}
      </h2>
      <table className="w-full flex-1 overflow-hidden" role="table">
        <thead className="sr-only">
          <tr>
            <th scope="col">{t('display.payoutPlace', { n: '' }).trim()}</th>
            <th scope="col">{t('display.payout')}</th>
          </tr>
        </thead>
        <tbody>
          {payoutAmounts.map((p) => {
            const isBubblePos = isBubble && p.place === paidPlaces;
            return (
              <tr
                key={p.place}
                className={`text-base transition-all ${
                  p.place === 1
                    ? 'bg-amber-900/40 text-amber-200'
                    : p.place <= 3
                    ? 'bg-gray-800/60 text-gray-200'
                    : 'bg-gray-900/40 text-gray-400'
                }`}
              >
                <td className={`flex items-center justify-between px-4 py-2 rounded-lg border ${
                  p.place === 1
                    ? 'border-amber-500/50'
                    : p.place <= 3
                    ? 'border-gray-700/40'
                    : 'border-gray-800/40'
                }`}>
                  <span className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm w-8">
                      {p.place === 1 ? '🏆' : p.place === 2 ? '🥈' : p.place === 3 ? '🥉' : `${p.place}.`}
                    </span>
                    <span className="font-medium">
                      {t('display.payoutPlace', { n: p.place })}
                    </span>
                    {isBubblePos && (
                      <span className="text-red-400 text-xs font-bold animate-bubble-pulse">
                        ← Bubble
                      </span>
                    )}
                  </span>
                  <span className="font-mono font-bold tabular-nums">
                    {p.amount.toLocaleString()} {sym}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
