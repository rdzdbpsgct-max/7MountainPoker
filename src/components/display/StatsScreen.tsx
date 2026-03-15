import { useMemo } from 'react';
import type { Player, Level, RebuyConfig, AddOnConfig, BountyConfig, TournamentResult, Currency } from '../../domain/types';
import { CURRENCY_SYMBOLS } from '../../domain/types';
import {
  computePrizePool, computeTotalRebuys, computeTotalAddOns, computeRebuyPot,
  computeAverageStackInBB, formatElapsedTime, computeEstimatedRemainingSeconds,
  computeLiveRemainingDuration, computeHistoricalDurationEstimate, getCached,
} from '../../domain/logic';
import { useTranslation } from '../../i18n';

interface Props {
  players: Player[];
  levels: Level[];
  currentLevelIndex: number;
  remainingSeconds: number;
  buyIn: number;
  rebuy: RebuyConfig;
  addOn: AddOnConfig;
  bounty: BountyConfig;
  averageStack: number;
  tournamentElapsed: number;
  activePlayerCount: number;
  totalPlayerCount: number;
  currency?: Currency;
}

export function StatsScreen({
  players,
  levels,
  currentLevelIndex,
  remainingSeconds,
  buyIn,
  rebuy,
  addOn,
  bounty,
  averageStack,
  tournamentElapsed,
  activePlayerCount,
  totalPlayerCount,
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

  const currentLevel = levels[currentLevelIndex];
  const currentBB = currentLevel?.type === 'level' ? (currentLevel.bigBlind ?? 0) : 0;
  const avgBB = currentBB > 0 ? computeAverageStackInBB(averageStack, currentBB) : 0;
  const estRemaining = computeEstimatedRemainingSeconds(levels, currentLevelIndex, remainingSeconds);
  const liveEstimate = computeLiveRemainingDuration(levels, currentLevelIndex, remainingSeconds, activePlayerCount);

  const totalRebuys = rebuy.enabled ? computeTotalRebuys(players) : 0;
  const totalAddOns = addOn.enabled ? computeTotalAddOns(players) : 0;

  const history = useMemo(() => (getCached('history') as TournamentResult[]) ?? [], []);
  const historicalEstimate = useMemo(
    () => computeHistoricalDurationEstimate(totalPlayerCount, history),
    [totalPlayerCount, history],
  );

  const stats: { label: string; value: string }[] = [
    { label: t('display.prizePool'), value: `${prizePool.toLocaleString()} ${sym}` },
    { label: t('display.activePlayers'), value: `${activePlayerCount} / ${totalPlayerCount}` },
  ];
  if (currentBB > 0) {
    stats.push({ label: t('display.avgStack'), value: `${avgBB} BB` });
  }
  stats.push({ label: t('display.elapsed'), value: formatElapsedTime(tournamentElapsed) });
  stats.push({ label: t('display.remaining'), value: `~${formatElapsedTime(estRemaining)}` });
  stats.push({ label: t('stats.liveEstimate'), value: `~${formatElapsedTime(liveEstimate)}` });
  if (historicalEstimate) {
    const indicator = historicalEstimate.confidence === 'high' ? '\u{1F7E2}'
      : historicalEstimate.confidence === 'medium' ? '\u{1F7E1}' : '\u{1F534}';
    stats.push({
      label: `${indicator} Hist.`,
      value: t('stats.historicalEstimate', { time: formatElapsedTime(historicalEstimate.estimateSeconds) }),
    });
  }
  if (rebuy.enabled && totalRebuys > 0) {
    stats.push({ label: t('display.totalRebuys'), value: String(totalRebuys) });
  }
  if (rebuy.enabled && rebuy.separatePot && totalRebuys > 0) {
    stats.push({ label: t('rebuy.separatePotLabel'), value: `${computeRebuyPot(players, rebuy.rebuyCost).toLocaleString()} ${sym}` });
  }
  if (addOn.enabled && totalAddOns > 0) {
    stats.push({ label: t('display.totalAddOns'), value: String(totalAddOns) });
  }
  if (bounty.enabled) {
    stats.push({ label: t('display.bountyPool'), value: `${players.length * bounty.amount} ${sym}` });
  }

  return (
    <div className="w-full max-w-3xl mx-auto h-full flex flex-col">
      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">
        {t('display.stats')}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 content-center">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700/40"
          >
            <span className="text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums">
              {s.value}
            </span>
            <span className="text-xs text-gray-500 uppercase tracking-wider mt-1">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
