import { useMemo } from 'react';
import type { Player, Level, TournamentResult, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import {
  formatElapsedTime,
  computeAverageStackInBB,
  computeLiveRemainingDuration,
  computeHistoricalDurationEstimate,
} from '../domain/logic';
import { getCached } from '../domain/logic';
import { useTranslation } from '../i18n';

interface Props {
  players: Player[];
  levels: Level[];
  currentLevelIndex: number;
  remainingSeconds: number;
  averageStack: number;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
  prizePool: number;
  rebuyPot?: number;
  currency?: Currency;
}

export function TournamentStats({
  players,
  levels,
  currentLevelIndex,
  remainingSeconds,
  averageStack,
  elapsedSeconds,
  estimatedRemainingSeconds,
  prizePool,
  rebuyPot,
  currency,
}: Props) {
  const { t } = useTranslation();
  const sym = CURRENCY_SYMBOLS[currency ?? 'EUR'];
  const activePlayers = players.filter((p) => p.status === 'active').length;
  const totalPlayers = players.length;

  const currentLevel = levels[currentLevelIndex];
  const currentBB = currentLevel?.type === 'level' ? (currentLevel.bigBlind ?? 0) : 0;
  const avgStackBB = computeAverageStackInBB(averageStack, currentBB);

  const liveEstimate = computeLiveRemainingDuration(
    levels, currentLevelIndex, remainingSeconds, activePlayers,
  );

  const history = useMemo(() => (getCached('history') as TournamentResult[]) ?? [], []);
  const historicalEstimate = useMemo(
    () => computeHistoricalDurationEstimate(totalPlayers, history),
    [totalPlayers, history],
  );

  const confidenceIndicator = historicalEstimate
    ? historicalEstimate.confidence === 'high'
      ? '\u{1F7E2}'
      : historicalEstimate.confidence === 'medium'
        ? '\u{1F7E1}'
        : '\u{1F534}'
    : null;

  const confidenceLabel = historicalEstimate
    ? historicalEstimate.confidence === 'high'
      ? t('stats.confidenceHigh')
      : historicalEstimate.confidence === 'medium'
        ? t('stats.confidenceMedium')
        : t('stats.confidenceLow')
    : null;

  return (
    <div className="w-full max-w-xl flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-3 py-2 bg-gray-100/80 dark:bg-gray-800/40 backdrop-blur-sm rounded-xl text-xs border border-gray-200 dark:border-gray-700/30 shadow-md shadow-gray-200/30 dark:shadow-black/10">
      <StatItem label={t('stats.players')} value={`${activePlayers}/${totalPlayers}`} />
      <StatItem label={t('stats.prizePool')} value={`${prizePool} ${sym}`} />
      {rebuyPot != null && rebuyPot > 0 && (
        <StatItem label={t('rebuy.separatePotLabel')} value={`${rebuyPot} ${sym}`} />
      )}
      {currentBB > 0 && (
        <StatItem
          label={t('stats.avgStackBB')}
          value={`${avgStackBB} BB`}
          tooltip={avgStackBB <= 10 ? t('stats.stackCritical') : avgStackBB <= 15 ? t('stats.stackLow') : undefined}
          warn={avgStackBB <= 15}
        />
      )}
      <StatItem label={t('stats.elapsed')} value={formatElapsedTime(elapsedSeconds)} />
      <StatItem
        label={t('stats.remaining')}
        value={t('stats.structureEstimate', { time: formatElapsedTime(estimatedRemainingSeconds) })}
      />
      <StatItem label={t('stats.liveEstimate')} value={`~${formatElapsedTime(liveEstimate)}`} />
      {historicalEstimate && (
        <StatItem
          label={`${confidenceIndicator} Hist.`}
          value={t('stats.historicalEstimate', { time: formatElapsedTime(historicalEstimate.estimateSeconds) })}
          tooltip={`${t('stats.basedOnTournaments', { n: String(historicalEstimate.sampleSize) })} — ${confidenceLabel}`}
        />
      )}
    </div>
  );
}

function StatItem({ label, value, tooltip, warn }: { label: string; value: string; tooltip?: string | undefined; warn?: boolean | undefined }) {
  return (
    <div className="flex items-center gap-1" title={tooltip}>
      <span className="text-gray-500 dark:text-gray-500">{label}:</span>
      <span className={`font-medium font-mono ${warn ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-100'}`}>{value}</span>
      {warn && <span className="text-amber-500">⚠</span>}
    </div>
  );
}
