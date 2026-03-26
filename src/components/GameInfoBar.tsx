import { memo } from 'react';
import type { Player, RebuyConfig, AddOnConfig, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { computePrizePool, formatElapsedTime } from '../domain/logic';
import { useTranslation } from '../i18n';

interface Props {
  players: Player[];
  buyIn: number;
  rebuyConfig: RebuyConfig;
  addOnConfig: AddOnConfig;
  averageStack: number;
  tournamentElapsed: number;
  estimatedRemaining: number | null;
  currency?: Currency | undefined;
  onShowPayoutOverlay?: (() => void) | undefined;
}

export const GameInfoBar = memo(function GameInfoBar({
  players,
  buyIn,
  rebuyConfig,
  addOnConfig,
  averageStack,
  tournamentElapsed,
  estimatedRemaining,
  currency,
  onShowPayoutOverlay,
}: Props) {
  const { t } = useTranslation();
  const sym = CURRENCY_SYMBOLS[currency ?? 'EUR'];

  const activePlayers = players.filter(p => p.status === 'active').length;
  const totalPlayers = players.length;
  const prizePool = computePrizePool(
    players, buyIn, rebuyConfig.rebuyCost,
    addOnConfig.enabled ? addOnConfig.cost : 0,
    rebuyConfig.separatePot,
  );

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs text-gray-500 dark:text-gray-400 max-w-xl mx-auto px-2 py-1 flex-wrap">
      <span className="flex items-center gap-1" title={t('info.players')}>
        <span aria-hidden="true">{String.fromCodePoint(0x1F465)}</span>
        <span className="font-mono tabular-nums">{activePlayers}/{totalPlayers}</span>
      </span>

      {onShowPayoutOverlay ? (
        <button
          onClick={onShowPayoutOverlay}
          className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 hover:underline transition-colors"
          title={t('info.payoutDetails')}
        >
          <span aria-hidden="true">{String.fromCodePoint(0x1F4B0)}</span>
          <span className="font-mono tabular-nums">{prizePool.toFixed(0)} {sym}</span>
        </button>
      ) : (
        <span className="flex items-center gap-1" title={t('info.prizepool')}>
          <span aria-hidden="true">{String.fromCodePoint(0x1F4B0)}</span>
          <span className="font-mono tabular-nums">{prizePool.toFixed(0)} {sym}</span>
        </span>
      )}

      <span className="flex items-center gap-1" title={t('info.avgStack')}>
        <span className="text-2xs font-medium">{t('info.avgStack')}</span>
        <span className="font-mono tabular-nums">{averageStack.toLocaleString()}</span>
      </span>

      <span className="flex items-center gap-1" title={t('info.elapsed')}>
        <span aria-hidden="true">{String.fromCodePoint(0x23F1)}</span>
        <span className="font-mono tabular-nums">{formatElapsedTime(tournamentElapsed)}</span>
      </span>

      {estimatedRemaining != null && estimatedRemaining > 0 && (
        <span className="flex items-center gap-1 opacity-70" title={t('info.remaining')}>
          <span className="text-2xs">~</span>
          <span className="font-mono tabular-nums">{Math.round(estimatedRemaining / 60)} min</span>
        </span>
      )}
    </div>
  );
});
