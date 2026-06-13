import { useState, useMemo } from 'react';
import type { TournamentConfig, Player } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { computePrizePool, computePayouts } from '../domain/logic';
import { useTranslation } from '../i18n';
import { BottomSheet } from './BottomSheet';

interface Props {
  config: TournamentConfig;
  players: Player[];
  onClose: () => void;
}

const MEDALS = ['', '', ''];

export function PayoutOverlay({ config, players, onClose }: Props) {
  const { t } = useTranslation();
  const currencySymbol = CURRENCY_SYMBOLS[config.currency ?? 'EUR'];

  const activePlayers = useMemo(
    () => players.filter((p) => p.status === 'active').length,
    [players],
  );

  const totalPlayers = players.length;
  const paidPlaces = config.payout.entries.length;
  const sliderMin = Math.max(paidPlaces, 1);

  const [simulatedCount, setSimulatedCount] = useState(activePlayers);

  const prizePool = useMemo(
    () =>
      computePrizePool(
        players,
        config.buyIn,
        config.rebuy.rebuyCost,
        config.addOn.enabled ? config.addOn.cost : 0,
        config.rebuy.separatePot,
      ),
    [players, config.buyIn, config.rebuy.rebuyCost, config.addOn.enabled, config.addOn.cost, config.rebuy.separatePot],
  );

  const payouts = useMemo(
    () => computePayouts(config.payout, prizePool),
    [config.payout, prizePool],
  );

  const isBubble = simulatedCount === paidPlaces + 1;

  return (
    <BottomSheet onClose={onClose} ariaLabelledBy="payout-overlay-title" maxWidth="max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 id="payout-overlay-title" className="text-lg font-bold text-gray-900 dark:text-white">
          {t('payout.overlay.title')}
        </h2>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          aria-label={t('payout.overlay.close')}
        >
          ✕
        </button>
      </div>

      {/* Prize Pool */}
      <div className="text-center mb-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          {t('payout.overlay.currentPrizePool')}
        </div>
        <div
          className="text-3xl font-bold tabular-nums"
          style={{ color: 'var(--accent-500)' }}
        >
          {prizePool.toLocaleString()} {currencySymbol}
        </div>
      </div>

      {/* Slider */}
      <div className="mb-4 px-1">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t('payout.overlay.playersLeft')}: <span className="font-semibold text-gray-800 dark:text-gray-200">{simulatedCount}</span>
          {simulatedCount === activePlayers && (
            <span className="ml-1 text-2xs opacity-60">
              ({t('payout.overlay.hint')})
            </span>
          )}
        </label>
        <input
          type="range"
          min={sliderMin}
          max={totalPlayers}
          value={simulatedCount}
          onChange={(e) => setSimulatedCount(Number(e.target.value))}
          className="w-full accent-[var(--accent-500)]"
        />
        <div className="flex justify-between text-2xs text-gray-400 mt-0.5">
          <span>{sliderMin}</span>
          <span>{totalPlayers}</span>
        </div>
      </div>

      {/* Bubble indicator */}
      {isBubble && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs text-center font-medium animate-bubble-pulse">
          {t('bubble.bubble')}
        </div>
      )}

      {/* Payout Table */}
      <div className="space-y-1">
        {payouts.map(({ place, amount }) => {
          const medal = MEDALS[place - 1] ?? '';
          const isInRange = place <= simulatedCount;
          return (
            <div
              key={place}
              className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                isInRange
                  ? 'bg-gray-100/80 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/20'
                  : 'opacity-30 bg-gray-100/40 dark:bg-gray-800/20 border border-transparent'
              }`}
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {medal ? `${medal} ` : ''}{t('payout.overlay.place')} {place}
              </span>
              <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                {amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {currencySymbol}
              </span>
            </div>
          );
        })}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="w-full mt-4 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
      >
        {t('payout.overlay.close')}
      </button>
    </BottomSheet>
  );
}
