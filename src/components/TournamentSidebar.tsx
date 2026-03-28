import { memo } from 'react';
import type { Player, PayoutConfig, RebuyConfig, AddOnConfig, BountyConfig, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { computePrizePool, computeTotalRebuys, computeTotalAddOns, computePayouts, computeRebuyPot } from '../domain/logic';
import { useTranslation } from '../i18n';

interface Props {
  players: Player[];
  buyIn: number;
  payout: PayoutConfig;
  rebuyConfig: RebuyConfig;
  addOnConfig: AddOnConfig;
  bountyConfig: BountyConfig;
  currency?: Currency | undefined;
}

export const TournamentSidebar = memo(function TournamentSidebar({
  players,
  buyIn,
  payout,
  rebuyConfig,
  addOnConfig,
  bountyConfig,
  currency,
}: Props) {
  const { t } = useTranslation();
  const sym = CURRENCY_SYMBOLS[currency ?? 'EUR'];

  const activePlayers = players.filter(p => p.status === 'active').length;
  const totalRebuys = computeTotalRebuys(players);
  const totalAddOns = computeTotalAddOns(players);

  const prizePool = computePrizePool(
    players, buyIn, rebuyConfig.rebuyCost,
    addOnConfig.enabled ? addOnConfig.cost : 0,
    rebuyConfig.separatePot,
  );

  const rebuyPot = rebuyConfig.separatePot ? computeRebuyPot(players, rebuyConfig.rebuyCost ?? buyIn) : 0;

  const payouts = computePayouts(payout, prizePool);

  const bountyPool = (() => {
    if (!bountyConfig.enabled) return 0;
    if (bountyConfig.type === 'mystery') {
      return (bountyConfig.mysteryPool ?? []).reduce((s, v) => s + v, 0);
    }
    return players.length * (bountyConfig.amount ?? 0);
  })();

  return (
    <div className="w-full">
      <h3 className="text-2xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
        {t('sidebar.tournamentInfo')}
      </h3>

      {/* Prize Pool */}
      <div className="px-3 py-2 rounded-lg bg-gray-100/60 dark:bg-gray-800/30 border border-gray-200/40 dark:border-gray-700/15 mb-2">
        <div className="flex items-center justify-between">
          <span className="text-2xs text-gray-400 dark:text-gray-500 uppercase">{t('sidebar.prizePool')}</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white font-mono tabular-nums">
            {prizePool.toLocaleString()} {sym}
          </span>
        </div>
        {rebuyConfig.separatePot && rebuyPot > 0 && (
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-2xs text-gray-400 dark:text-gray-500">{t('sidebar.rebuyPot')}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono tabular-nums">
              + {rebuyPot.toLocaleString()} {sym}
            </span>
          </div>
        )}
        {bountyConfig.enabled && bountyPool > 0 && (
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-2xs text-gray-400 dark:text-gray-500">{t('sidebar.bountyPool')}</span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-mono tabular-nums">
              {bountyPool.toLocaleString()} {sym}
            </span>
          </div>
        )}
      </div>

      {/* Rebuys & Add-Ons */}
      {(rebuyConfig.enabled || addOnConfig.enabled) && (
        <div className="px-3 py-2 rounded-lg bg-gray-100/60 dark:bg-gray-800/30 border border-gray-200/40 dark:border-gray-700/15 mb-2">
          <div className="flex items-center justify-between gap-3">
            {rebuyConfig.enabled && (
              <div className="flex items-center gap-1.5">
                <span className="text-2xs text-gray-400 dark:text-gray-500 uppercase">{t('sidebar.rebuys')}</span>
                <span className="text-sm font-bold font-mono tabular-nums" style={{ color: 'var(--accent-400)' }}>
                  {totalRebuys}
                </span>
                {rebuyConfig.rebuyCost != null && totalRebuys > 0 && (
                  <span className="text-2xs text-gray-400 dark:text-gray-500">
                    ({(totalRebuys * (rebuyConfig.rebuyCost ?? buyIn)).toLocaleString()} {sym})
                  </span>
                )}
              </div>
            )}
            {addOnConfig.enabled && (
              <div className="flex items-center gap-1.5">
                <span className="text-2xs text-gray-400 dark:text-gray-500 uppercase">{t('sidebar.addOns')}</span>
                <span className="text-sm font-bold font-mono tabular-nums" style={{ color: 'var(--accent-400)' }}>
                  {totalAddOns}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payout Structure */}
      {payouts.length > 0 && (
        <div className="px-3 py-2 rounded-lg bg-gray-100/60 dark:bg-gray-800/30 border border-gray-200/40 dark:border-gray-700/15">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-2xs text-gray-400 dark:text-gray-500 uppercase">{t('sidebar.payouts')}</span>
            <span className="text-2xs text-gray-400 dark:text-gray-500">
              {activePlayers} {t('sidebar.playersLeft')}
            </span>
          </div>
          <div className="space-y-0.5">
            {payouts.map(({ place, amount }) => {
              const medal = place === 1 ? '\u{1F947}' : place === 2 ? '\u{1F948}' : place === 3 ? '\u{1F949}' : '';
              const isInMoney = activePlayers <= place;
              return (
                <div
                  key={place}
                  className={`flex items-center justify-between py-0.5 text-xs transition-colors ${
                    isInMoney
                      ? 'text-gray-300 dark:text-gray-600'
                      : place <= 3
                        ? 'text-gray-800 dark:text-gray-200 font-medium'
                        : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    {medal && <span className="text-sm">{medal}</span>}
                    <span>{place}.</span>
                  </span>
                  <span className="font-mono tabular-nums">
                    {amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {sym}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
