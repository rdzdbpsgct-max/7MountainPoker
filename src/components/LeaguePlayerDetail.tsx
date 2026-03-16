import { useMemo } from 'react';
import type { GameDay } from '../domain/types';
import type { LeaguePlayerStats } from '../domain/league';
import { computeLeaguePlayerStats } from '../domain/logic';
import { useTranslation } from '../i18n';
import { useDialogA11y } from '../hooks/useDialogA11y';

interface Props {
  playerName: string;
  gameDays: GameDay[];
  onClose: () => void;
}

export function LeaguePlayerDetail({ playerName, gameDays, onClose }: Props) {
  const { t } = useTranslation();
  const dialogRef = useDialogA11y(onClose);

  const stats: LeaguePlayerStats = useMemo(
    () => computeLeaguePlayerStats(playerName, gameDays),
    [playerName, gameDays],
  );

  const totalGames = stats.pointsHistory.length;
  const totalPoints = totalGames > 0 ? stats.pointsHistory[totalGames - 1]!.cumulative : 0;

  // Sort head-to-head by most games played together
  const headToHeadSorted = useMemo(() => {
    return Object.entries(stats.headToHead)
      .map(([name, record]) => ({ name, ...record, total: record.wins + record.losses }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [stats.headToHead]);

  // Sort place distribution by place
  const placeDistSorted = useMemo(() => {
    return Object.entries(stats.placeDistribution)
      .map(([place, count]) => ({ place: parseInt(place, 10), count }))
      .sort((a, b) => a.place - b.place);
  }, [stats.placeDistribution]);

  const formLabel = (f: 'W' | 'C' | 'X') => {
    if (f === 'W') return { label: 'W', color: 'bg-amber-500 text-white' };
    if (f === 'C') return { label: 'C', color: 'bg-green-500 text-white' };
    return { label: 'X', color: 'bg-gray-400 dark:bg-gray-600 text-white' };
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="player-detail-title" className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700/40 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-800/50 flex items-center justify-between">
          <div>
            <h2 id="player-detail-title" className="text-lg font-bold text-gray-900 dark:text-white">
              {playerName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {totalGames} {t('league.playerDetail.gameDays')} · {totalPoints} {t('league.standings.points')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Form (last 5) */}
          {stats.formLast5.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                {t('league.playerDetail.form')}
              </h3>
              <div className="flex gap-1.5">
                {stats.formLast5.map((f, i) => {
                  const { label, color } = formLabel(f);
                  return (
                    <span
                      key={i}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${color}`}
                      title={f === 'W' ? t('league.playerDetail.win') : f === 'C' ? t('league.playerDetail.cash') : t('league.playerDetail.out')}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Streaks */}
          <div>
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              {t('league.playerDetail.streaks')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl px-3 py-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('league.playerDetail.currentWinStreak')}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.streaks.currentWin}</div>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl px-3 py-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('league.playerDetail.bestWinStreak')}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.streaks.bestWin}</div>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl px-3 py-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('league.playerDetail.currentCashStreak')}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.streaks.currentCash}</div>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl px-3 py-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('league.playerDetail.bestCashStreak')}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.streaks.bestCash}</div>
              </div>
            </div>
          </div>

          {/* Place Distribution */}
          {placeDistSorted.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                {t('league.playerDetail.placeDistribution')}
              </h3>
              <div className="bg-white/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden">
                {placeDistSorted.map(({ place, count }) => {
                  const pct = totalGames > 0 ? (count / totalGames) * 100 : 0;
                  return (
                    <div key={place} className="flex items-center px-3 py-1.5 border-b border-gray-100 dark:border-gray-800/30 last:border-b-0">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-12">
                        {place === 1 ? '🏆' : place === 2 ? '🥈' : place === 3 ? '🥉' : `${place}.`}
                      </span>
                      <div className="flex-1 mx-2">
                        <div className="h-4 bg-gray-100 dark:bg-gray-700/40 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: place <= 3 ? 'var(--accent-500)' : 'rgb(156, 163, 175)',
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">{count}×</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Points History */}
          {stats.pointsHistory.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                {t('league.playerDetail.pointsHistory')}
              </h3>
              <div className="bg-white/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700/40">
                      <th className="text-left px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.playerDetail.date')}</th>
                      <th className="text-right px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.standings.points')}</th>
                      <th className="text-right px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.playerDetail.cumulative')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.pointsHistory.map((ph) => (
                      <tr key={ph.gameDayId} className="border-b border-gray-100 dark:border-gray-800/30 last:border-b-0">
                        <td className="px-3 py-1.5 text-gray-600 dark:text-gray-300">{new Date(ph.date).toLocaleDateString()}</td>
                        <td className="px-3 py-1.5 text-right font-medium" style={{ color: 'var(--accent-text)' }}>{ph.points}</td>
                        <td className="px-3 py-1.5 text-right font-bold text-gray-900 dark:text-white">{ph.cumulative}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Head-to-Head */}
          {headToHeadSorted.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                {t('league.playerDetail.headToHead')}
              </h3>
              <div className="bg-white/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700/40">
                      <th className="text-left px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.playerDetail.opponent')}</th>
                      <th className="text-right px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.playerDetail.winsShort')}</th>
                      <th className="text-right px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.playerDetail.lossesShort')}</th>
                      <th className="text-right px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.playerDetail.record')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headToHeadSorted.map((h) => (
                      <tr key={h.name} className="border-b border-gray-100 dark:border-gray-800/30 last:border-b-0">
                        <td className="px-3 py-1.5 text-gray-900 dark:text-white font-medium">{h.name}</td>
                        <td className="px-3 py-1.5 text-right text-green-600 dark:text-green-400">{h.wins}</td>
                        <td className="px-3 py-1.5 text-right text-red-600 dark:text-red-400">{h.losses}</td>
                        <td className="px-3 py-1.5 text-right font-medium text-gray-600 dark:text-gray-300">
                          {h.wins > h.losses ? (
                            <span className="text-green-600 dark:text-green-400">+{h.wins - h.losses}</span>
                          ) : h.wins < h.losses ? (
                            <span className="text-red-600 dark:text-red-400">{h.wins - h.losses}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Close button */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl text-base font-medium transition-all duration-200 border border-gray-200 dark:border-gray-600/30"
          >
            {t('shared.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
