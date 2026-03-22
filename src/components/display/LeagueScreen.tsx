import type { ExtendedLeagueStanding, Currency } from '../../domain/types';
import { CURRENCY_SYMBOLS } from '../../domain/types';
import { useTranslation } from '../../i18n';

interface Props {
  leagueName: string;
  standings: ExtendedLeagueStanding[];
  currency?: Currency | undefined;
}

export function LeagueScreen({ leagueName, standings, currency }: Props) {
  const { t } = useTranslation();
  const sym = CURRENCY_SYMBOLS[currency ?? 'EUR'];
  const top10 = standings.slice(0, 10);

  const medal = (rank: number) => {
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}.`;
  };

  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-2xl font-bold text-white text-center mb-3">
        ♠ {leagueName}
      </h2>
      <div className="flex-1 overflow-hidden">
        <table className="w-full text-lg">
          <thead>
            <tr className="border-b-2 border-gray-600 text-gray-400 text-sm">
              <th className="py-2 text-left w-12">#</th>
              <th className="py-2 text-left">{t('display.leagueName')}</th>
              <th className="py-2 text-right">{t('display.leaguePoints')}</th>
              <th className="py-2 text-right">{t('display.leagueWins')}</th>
              <th className="py-2 text-right">{t('display.leagueGames')}</th>
              <th className="py-2 text-right">{t('display.leagueBalance')}</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((s) => (
              <tr
                key={s.name}
                className={`border-b border-gray-700/30 ${s.rank <= 3 ? 'text-white' : 'text-gray-300'}`}
              >
                <td className="py-2 text-xl">{medal(s.rank)}</td>
                <td className="py-2 font-medium">
                  {s.name}
                  {s.corrections !== 0 && (
                    <span className={`ml-1 text-xs ${s.corrections > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ({s.corrections > 0 ? '+' : ''}{s.corrections})
                    </span>
                  )}
                </td>
                <td className="py-2 text-right font-bold" style={{ color: 'var(--accent-400)' }}>
                  {s.points}
                </td>
                <td className="py-2 text-right text-gray-400">{s.wins}</td>
                <td className="py-2 text-right text-gray-400">{s.tournaments}</td>
                <td className={`py-2 text-right font-medium ${s.netBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {s.netBalance >= 0 ? '+' : ''}{s.netBalance.toFixed(0)} {sym}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
