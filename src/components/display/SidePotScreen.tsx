import type { PotResult, PlayerPayout } from '../../domain/types';
import { useTranslation } from '../../i18n';

export interface SidePotDisplayData {
  pots: PotResult[];
  total: number;
  /** Per-player payouts (only present when winners are fully resolved) */
  payouts?: PlayerPayout[] | undefined;
}

interface Props {
  data: SidePotDisplayData;
}

export function SidePotScreen({ data }: Props) {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-3xl mx-auto h-full flex flex-col">
      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">
        {t('sidePot.title')}
      </h2>

      {/* Pot cards */}
      <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: `repeat(${Math.min(data.pots.length, 3)}, 1fr)` }}>
        {data.pots.map((pot) => (
          <div
            key={pot.index}
            className={`rounded-lg px-3 py-2 border text-center ${
              pot.type === 'main'
                ? 'bg-gray-800/60 border-gray-600/50'
                : 'bg-gray-800/30 border-gray-700/40'
            }`}
          >
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
              {pot.type === 'main' ? t('sidePot.mainPot') : t('sidePot.sidePot', { n: pot.index })}
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">
              {pot.amount.toLocaleString()}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--accent-400)' }}>
              {pot.eligiblePlayerNames.join(', ')}
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="text-center text-sm text-gray-400 mb-3">
        {t('sidePot.total')}: <span className="font-bold text-white">{data.total.toLocaleString()}</span>
      </div>

      {/* Payout table (if winners resolved) */}
      {data.payouts && data.payouts.length > 0 && (
        <div className="flex-1 overflow-hidden">
          <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 text-center">
            {t('sidePot.payoutTitle')}
          </h3>
          <div className="space-y-1">
            {data.payouts
              .sort((a, b) => b.net - a.net)
              .map((p) => {
                const isPositive = p.net > 0;
                const isNegative = p.net < 0;
                return (
                  <div
                    key={p.playerId}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-gray-800/40 border border-gray-700/30"
                  >
                    <span className="font-medium text-white text-sm">{p.playerName}</span>
                    <div className="flex items-center gap-3 text-sm tabular-nums">
                      <span className="text-gray-400">
                        {t('sidePot.payoutLabel')}: {p.payout.toLocaleString()}
                      </span>
                      <span className={`font-bold ${isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-400'}`}>
                        {p.net >= 0 ? '+' : ''}{p.net.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
