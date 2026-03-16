import { useMemo, useCallback } from 'react';
import type { GameDay, ExtendedLeagueStanding } from '../domain/types';
import { computeLeagueFinances, formatLeagueFinancesAsCSV } from '../domain/logic';
import { useTranslation } from '../i18n';

interface Props {
  gameDays: GameDay[];
  standings: ExtendedLeagueStanding[];
  currencySymbol: string;
}

export function LeagueFinances({ gameDays, standings, currencySymbol }: Props) {
  const { t } = useTranslation();

  const finances = useMemo(() => computeLeagueFinances(gameDays), [gameDays]);

  const handleDownloadCSV = useCallback(() => {
    const csv = formatLeagueFinancesAsCSV(gameDays);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'league_finances.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [gameDays]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Per-player net balance from standings
  const playerBalances = useMemo(() =>
    [...standings]
      .sort((a, b) => b.netBalance - a.netBalance)
      .filter((s) => s.netBalance !== 0),
    [standings],
  );

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700/40 shadow-sm p-4 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('league.finances.totalBuyIns')}</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{finances.totalBuyIns.toFixed(0)} {currencySymbol}</div>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700/40 shadow-sm p-4 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('league.finances.totalPayouts')}</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{finances.totalPayouts.toFixed(0)} {currencySymbol}</div>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700/40 shadow-sm p-4 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('league.finances.cashBalance')}</div>
          <div className={`text-xl font-bold ${finances.totalCashBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {finances.totalCashBalance >= 0 ? '+' : ''}{finances.totalCashBalance.toFixed(0)} {currencySymbol}
          </div>
        </div>
      </div>

      {/* Per-GameDay Table */}
      <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-lg shadow-gray-300/30 dark:shadow-black/20 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700/40">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('league.finances.perGameDay')}</h3>
          <button
            onClick={handleDownloadCSV}
            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded transition-colors"
          >
            {t('league.standings.downloadCSV')}
          </button>
        </div>

        {finances.perGameDay.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            {t('league.finances.noData')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/40">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.finances.date')}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.finances.label')}</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.finances.buyIns')}</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.finances.payouts')}</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.finances.saldo')}</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.finances.cumulative')}</th>
                </tr>
              </thead>
              <tbody>
                {finances.perGameDay.map((gd) => {
                  const fullGD = gameDays.find((g) => g.id === gd.id);
                  return (
                    <tr key={gd.id} className="border-b border-gray-100 dark:border-gray-700/20 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{formatDate(gd.date)}</td>
                      <td className="px-3 py-2 text-gray-900 dark:text-white font-medium">{gd.label}</td>
                      <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">{fullGD?.totalBuyIns.toFixed(0) ?? '—'} {currencySymbol}</td>
                      <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">{fullGD?.totalPrizePool.toFixed(0) ?? '—'} {currencySymbol}</td>
                      <td className={`px-3 py-2 text-right font-medium ${gd.cashBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {gd.cashBalance >= 0 ? '+' : ''}{gd.cashBalance.toFixed(0)} {currencySymbol}
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${gd.cumulative >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {gd.cumulative >= 0 ? '+' : ''}{gd.cumulative.toFixed(0)} {currencySymbol}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-Player Balance */}
      {playerBalances.length > 0 && (
        <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-lg shadow-gray-300/30 dark:shadow-black/20 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700/40">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('league.finances.perPlayer')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/40">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.standings.name')}</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.standings.cost')}</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.standings.payout')}</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.standings.balance')}</th>
                </tr>
              </thead>
              <tbody>
                {playerBalances.map((s) => (
                  <tr key={s.name} className="border-b border-gray-100 dark:border-gray-700/20">
                    <td className="px-3 py-1.5 font-medium text-gray-900 dark:text-white">{s.name}</td>
                    <td className="px-3 py-1.5 text-right text-gray-600 dark:text-gray-300">{s.totalCost.toFixed(0)} {currencySymbol}</td>
                    <td className="px-3 py-1.5 text-right text-gray-600 dark:text-gray-300">{s.totalPayout.toFixed(0)} {currencySymbol}</td>
                    <td className={`px-3 py-1.5 text-right font-medium ${s.netBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {s.netBalance >= 0 ? '+' : ''}{s.netBalance.toFixed(0)} {currencySymbol}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
