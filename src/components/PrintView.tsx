import type { TournamentConfig, TournamentResult, ExtendedLeagueStanding } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { getLevelLabel, formatTime } from '../domain/logic';
import { useTranslation } from '../i18n';

interface Props {
  config: TournamentConfig;
  result?: TournamentResult | null;
  leagueStandings?: ExtendedLeagueStanding[];
  leagueName?: string;
}

export function PrintView({ config, result, leagueStandings, leagueName }: Props) {
  const { t } = useTranslation();
  const currencySymbol = CURRENCY_SYMBOLS[config.currency ?? 'EUR'];

  const tournamentName = config.name || t('app.title');

  return (
    <div className="print-view hidden print:block p-8 bg-white text-black text-sm font-sans">
      {/* Header */}
      <h1 className="text-2xl font-bold text-center mb-1">{tournamentName}</h1>
      <h2 className="text-lg font-semibold text-center mb-6 text-gray-600">{t('print.title')}</h2>

      {/* Blind Structure Table */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-1 px-2">{t('config.level')}</th>
            <th className="text-right py-1 px-2">SB</th>
            <th className="text-right py-1 px-2">BB</th>
            {config.anteEnabled && <th className="text-right py-1 px-2">{t('timer.ante')}</th>}
            <th className="text-right py-1 px-2">{t('config.min')}</th>
          </tr>
        </thead>
        <tbody>
          {config.levels.map((level, idx) => {
            if (level.type === 'break') {
              return (
                <tr key={level.id || idx} className="bg-gray-100 border-b border-gray-300">
                  <td colSpan={config.anteEnabled ? 5 : 4} className="py-1 px-2 font-medium text-gray-600 italic">
                    {level.label || t('config.break')} — {formatTime(level.durationSeconds)}
                  </td>
                </tr>
              );
            }
            const label = getLevelLabel(level, idx, config.levels);
            return (
              <tr key={level.id || idx} className="border-b border-gray-200">
                <td className="py-1 px-2">{label}</td>
                <td className="text-right py-1 px-2 font-mono">{level.smallBlind ?? 0}</td>
                <td className="text-right py-1 px-2 font-mono">{level.bigBlind ?? 0}</td>
                {config.anteEnabled && (
                  <td className="text-right py-1 px-2 font-mono">{level.ante ?? '—'}</td>
                )}
                <td className="text-right py-1 px-2">{Math.round(level.durationSeconds / 60)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Chip Denominations (if enabled) */}
      {config.chips.enabled && config.chips.denominations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-semibold mb-2 border-b border-black pb-1">{t('app.chips')}</h3>
          <table className="w-auto border-collapse">
            <tbody>
              {[...config.chips.denominations]
                .sort((a, b) => a.value - b.value)
                .map((chip) => (
                  <tr key={chip.id} className="border-b border-gray-200">
                    <td className="py-1 px-2">
                      <span
                        className="inline-block w-4 h-4 rounded-full border border-gray-400 mr-2 align-middle"
                        style={{ backgroundColor: chip.color }}
                      />
                      {chip.label}
                    </td>
                    <td className="py-1 px-2 text-right font-mono">{chip.value}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payout Table (if configured) */}
      {config.payout.entries.length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-semibold mb-2 border-b border-black pb-1">{t('app.payout')}</h3>
          <table className="w-auto border-collapse">
            <tbody>
              {config.payout.entries.map((entry) => (
                <tr key={entry.place} className="border-b border-gray-200">
                  <td className="py-1 px-2">{t('payoutEditor.placeN', { n: entry.place })}</td>
                  <td className="py-1 px-2 text-right font-mono">
                    {config.payout.mode === 'percent' ? `${entry.value}%` : `${entry.value} ${currencySymbol}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tournament Results (if provided) */}
      {result && (
        <div className="mb-6">
          <h3 className="text-base font-semibold mb-2 border-b border-black pb-1">{t('print.results')}</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-1 px-2">{t('playerPanel.place')}</th>
                <th className="text-left py-1 px-2">{t('print.name')}</th>
                <th className="text-right py-1 px-2">{t('print.payout')}</th>
                <th className="text-right py-1 px-2">{t('print.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {result.players.map((p, idx) => (
                <tr key={idx} className={`border-b border-gray-200 ${p.place === 1 ? 'font-bold' : ''}`}>
                  <td className="py-1 px-2">{p.place}.</td>
                  <td className="py-1 px-2">{p.name}</td>
                  <td className="text-right py-1 px-2 font-mono">
                    {p.payout > 0 ? `${p.payout.toFixed(2)} ${currencySymbol}` : '—'}
                  </td>
                  <td className={`text-right py-1 px-2 font-mono ${p.netBalance > 0 ? 'text-green-700' : p.netBalance < 0 ? 'text-red-700' : ''}`}>
                    {p.netBalance >= 0 ? '+' : ''}{p.netBalance.toFixed(2)} {currencySymbol}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-xs text-gray-500">
            {t('print.prizepool')}: {result.prizePool.toFixed(2)} {currencySymbol} &middot; {result.playerCount} {t('finished.players')}
            {result.totalRebuys > 0 && ` \u00b7 ${result.totalRebuys} ${t('app.rebuy')}`}
            {result.totalAddOns > 0 && ` \u00b7 ${result.totalAddOns} ${t('app.addOn')}`}
          </div>
        </div>
      )}

      {/* League Standings (if provided) */}
      {leagueStandings && leagueStandings.length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-semibold mb-2 border-b border-black pb-1">
            {leagueName ?? t('league.standings')}
          </h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-1 px-2">#</th>
                <th className="text-left py-1 px-2">{t('league.standings.name')}</th>
                <th className="text-right py-1 px-2">{t('league.standings.points')}</th>
                <th className="text-right py-1 px-2">{t('league.standings.gameDays')}</th>
                <th className="text-right py-1 px-2">{t('league.standings.wins')}</th>
                <th className="text-right py-1 px-2">{t('league.standings.itm')}</th>
                <th className="text-right py-1 px-2">{t('league.standings.avgPlace')}</th>
                <th className="text-right py-1 px-2">{t('league.standings.cost')}</th>
                <th className="text-right py-1 px-2">{t('league.standings.payout')}</th>
                <th className="text-right py-1 px-2">{t('league.standings.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {leagueStandings.map((s) => (
                <tr key={s.name} className={`border-b border-gray-200 ${s.rank <= 3 ? 'font-bold' : ''}`}>
                  <td className="py-1 px-2">{s.rank}.</td>
                  <td className="py-1 px-2">{s.name}{s.corrections !== 0 ? ` (${s.corrections > 0 ? '+' : ''}${s.corrections})` : ''}</td>
                  <td className="text-right py-1 px-2 font-mono">{s.points}</td>
                  <td className="text-right py-1 px-2">{s.tournaments}</td>
                  <td className="text-right py-1 px-2">{s.wins}</td>
                  <td className="text-right py-1 px-2">{s.cashes}</td>
                  <td className="text-right py-1 px-2">{s.avgPlace}</td>
                  <td className="text-right py-1 px-2 font-mono">{s.totalCost.toFixed(2)}</td>
                  <td className="text-right py-1 px-2 font-mono">{s.totalPayout.toFixed(2)}</td>
                  <td className={`text-right py-1 px-2 font-mono ${s.netBalance > 0 ? 'text-green-700' : s.netBalance < 0 ? 'text-red-700' : ''}`}>
                    {s.netBalance >= 0 ? '+' : ''}{s.netBalance.toFixed(2)} {currencySymbol}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer info */}
      <div className="text-xs text-gray-400 text-center mt-8">
        {t('app.buyIn')}: {config.buyIn} {currencySymbol} &middot; {t('app.startingChips')}: {config.startingChips.toLocaleString()}
        {config.rebuy.enabled && ` \u00b7 ${t('app.rebuy')}`}
        {config.addOn.enabled && ` \u00b7 ${t('app.addOn')}`}
        {config.bounty.enabled && ` \u00b7 ${t('app.bounty')}: ${config.bounty.amount} ${currencySymbol}`}
      </div>
    </div>
  );
}
