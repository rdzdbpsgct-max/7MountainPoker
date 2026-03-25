import { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { League, ExtendedLeagueStanding, GameDay, RankingAlgorithm } from '../domain/types';
import { formatLeagueStandingsAsText, formatLeagueStandingsAsCSV, encodeLeagueStandingsForQR, normalizePlayerName } from '../domain/logic';
import { Sparkline } from './Sparkline';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';
import { LoadingFallback } from './LoadingFallback';
import { SectionErrorBoundary } from './ErrorBoundary';
import { showToast } from '../domain/toast';

const LeaguePlayerDetail = lazy(() => import('./LeaguePlayerDetail').then(m => ({ default: m.LeaguePlayerDetail })));

type SortKey = 'rank' | 'name' | 'points' | 'tournaments' | 'wins' | 'cashes' | 'avgPlace' | 'bestPlace' | 'knockouts' | 'totalCost' | 'totalPayout' | 'netBalance' | 'participationRate' | 'eloRating' | 'weightedPoints';
type SortDir = 'asc' | 'desc';

const SORT_STORAGE_KEY = 'poker-timer-league-sort';
const VALID_SORT_KEYS = new Set<SortKey>(['rank', 'name', 'points', 'tournaments', 'wins', 'cashes', 'avgPlace', 'bestPlace', 'knockouts', 'totalCost', 'totalPayout', 'netBalance', 'participationRate', 'eloRating', 'weightedPoints']);

function loadPersistedSort(): { key: SortKey; dir: SortDir } {
  try {
    const raw = localStorage.getItem(SORT_STORAGE_KEY);
    if (!raw) return { key: 'rank', dir: 'asc' };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { key: 'rank', dir: 'asc' };
    const obj = parsed as Record<string, unknown>;
    const key = VALID_SORT_KEYS.has(obj.key as SortKey) ? (obj.key as SortKey) : 'rank';
    const dir = obj.dir === 'asc' || obj.dir === 'desc' ? obj.dir : 'asc';
    return { key, dir };
  } catch {
    return { key: 'rank', dir: 'asc' };
  }
}

interface Props {
  league: League;
  standings: ExtendedLeagueStanding[];
  gameDays: GameDay[];
  onUpdatePointSystem: (leagueId: string, place: number, points: number) => void;
  onAddCorrection?: () => void;
  currencySymbol: string;
}

export function LeagueStandingsTable({ league, standings, gameDays, onUpdatePointSystem, onAddCorrection, currencySymbol }: Props) {
  const { t } = useTranslation();
  const { resolved: theme } = useTheme();
  const [sortKey, setSortKey] = useState<SortKey>(() => loadPersistedSort().key);
  const [sortDir, setSortDir] = useState<SortDir>(() => loadPersistedSort().dir);

  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ key: sortKey, dir: sortDir }));
    } catch { /* quota exceeded — ignore */ }
  }, [sortKey, sortDir]);
  const [showPointSystem, setShowPointSystem] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const rankingAlgorithm: RankingAlgorithm = league.rankingAlgorithm ?? 'points';

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }, [sortKey]);

  const sorted = useMemo(() => {
    const copy = [...standings];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'rank': cmp = a.rank - b.rank; break;
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'points': cmp = a.points - b.points; break;
        case 'tournaments': cmp = a.tournaments - b.tournaments; break;
        case 'wins': cmp = a.wins - b.wins; break;
        case 'cashes': cmp = a.cashes - b.cashes; break;
        case 'avgPlace': cmp = a.avgPlace - b.avgPlace; break;
        case 'bestPlace': cmp = a.bestPlace - b.bestPlace; break;
        case 'knockouts': cmp = a.knockouts - b.knockouts; break;
        case 'totalCost': cmp = a.totalCost - b.totalCost; break;
        case 'totalPayout': cmp = a.totalPayout - b.totalPayout; break;
        case 'netBalance': cmp = a.netBalance - b.netBalance; break;
        case 'participationRate': cmp = a.participationRate - b.participationRate; break;
        case 'eloRating': cmp = (a.eloRating ?? 0) - (b.eloRating ?? 0); break;
        case 'weightedPoints': cmp = (a.weightedPoints ?? 0) - (b.weightedPoints ?? 0); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return copy;
  }, [standings, sortKey, sortDir]);

  const handleCopyText = useCallback(async () => {
    const text = formatLeagueStandingsAsText(league, standings);
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('league.standings.textCopied'));
    } catch { /* ignore */ }
  }, [league, standings, t]);

  const handleDownloadCSV = useCallback(() => {
    const csv = formatLeagueStandingsAsCSV(standings);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${league.name.replace(/\s+/g, '_')}_standings.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [league.name, standings]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const qrValue = useMemo(() => {
    if (standings.length === 0) return '';
    const base = window.location.origin + window.location.pathname;
    return base + encodeLeagueStandingsForQR(league, standings);
  }, [league, standings]);

  // Build cumulative points per player for sparklines
  const sparklineData = useMemo(() => {
    const map = new Map<string, number[]>();
    if (gameDays.length === 0) return map;
    const sortedGDs = [...gameDays].sort((a, b) => a.date.localeCompare(b.date));
    for (const s of standings) {
      const key = normalizePlayerName(s.name);
      let cum = 0;
      const pts: number[] = [];
      for (const gd of sortedGDs) {
        const p = gd.participants.find(pp => normalizePlayerName(pp.name) === key);
        if (p) {
          cum += p.points;
          pts.push(cum);
        }
      }
      if (pts.length >= 2) {
        map.set(key, pts);
      }
    }
    return map;
  }, [gameDays, standings]);

  const renderSortHeader = (k: SortKey, label: string, className?: string) => (
    <th
      key={k}
      onClick={() => handleSort(k)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(k); } }}
      tabIndex={0}
      role="columnheader button"
      aria-sort={sortKey === k ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
      aria-label={`${label} — ${sortKey === k && sortDir === 'asc' ? t('accessibility.sortDescending') : t('accessibility.sortAscending')}`}
      className={`group px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] rounded ${className ?? ''}`}
    >
      {label}
      {sortKey === k ? (
        <span className="ml-0.5">{sortDir === 'asc' ? '▲' : '▼'}</span>
      ) : (
        <span className="ml-0.5 opacity-0 group-hover:opacity-30 transition-opacity">▼</span>
      )}
    </th>
  );

  const medal = (rank: number) => {
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}.`;
  };

  return (
    <div className="space-y-3">
      <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-lg shadow-gray-300/30 dark:shadow-black/20 overflow-hidden">
        {/* Export buttons */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700/40">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('league.tabs.standings')}</h3>
          <div className="flex items-center gap-2">
            {onAddCorrection && (
              <button
                onClick={onAddCorrection}
                className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                ±{t('league.correction.title')}
              </button>
            )}
            <button
              onClick={() => setShowPointSystem(!showPointSystem)}
              className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {t('league.standings.pointSystem')}
            </button>
            <button
              onClick={handleCopyText}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded transition-colors"
            >
              {t('league.standings.copyText')}
            </button>
            <button
              onClick={handleDownloadCSV}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded transition-colors"
            >
              {t('league.standings.downloadCSV')}
            </button>
            <button
              onClick={handlePrint}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded transition-colors"
              title={t('league.standings.print')}
              aria-label={t('league.standings.print')}
            >
              🖨️
            </button>
            {standings.length > 0 && (
              <button
                onClick={() => { void import('../domain/pdfExport').then(({ exportLeagueStandingsAsPdf }) => exportLeagueStandingsAsPdf(league, standings, currencySymbol, t)); }}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded transition-colors"
                title="PDF"
                aria-label={t('league.standings.downloadPdf')}
              >
                PDF
              </button>
            )}
            {standings.length > 0 && (
              <button
                onClick={() => setShowQR(!showQR)}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded transition-colors"
                title={t('league.standings.qrCode')}
                aria-label={t('league.standings.qrCode')}
              >
                QR
              </button>
            )}
          </div>
        </div>

        {/* QR Code */}
        {showQR && qrValue && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700/40 flex flex-col items-center gap-2">
            <QRCodeSVG
              value={qrValue}
              size={160}
              bgColor={theme === 'dark' ? '#1f2937' : '#f9fafb'}
              fgColor={theme === 'dark' ? '#e5e7eb' : '#111827'}
              level="L"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('league.standings.qrHint')}</p>
          </div>
        )}

        {/* Point system editor */}
        {showPointSystem && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700/40">
            <div className="flex flex-wrap gap-3">
              {league.pointSystem.entries.map((e) => (
                <div key={e.place} className="flex items-center gap-1 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{e.place}.</span>
                  <input
                    type="number"
                    value={e.points}
                    onChange={(ev) => onUpdatePointSystem(league.id, e.place, parseInt(ev.target.value, 10) || 0)}
                    className="w-12 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded px-1.5 py-0.5 text-center text-sm focus:ring-2 focus:outline-none"
                    min={0}
                  />
                  <span className="text-gray-400 dark:text-gray-500 text-xs">Pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Standings table */}
        {standings.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            {t('league.standings.noData')}
          </div>
        ) : (
          <div className="overflow-x-auto relative">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/40">
                  {renderSortHeader('rank', '#', 'w-10 sticky left-0 z-10 bg-white dark:bg-gray-800/90')}
                  {renderSortHeader('name', t('league.standings.name'), 'sticky left-10 z-10 bg-white dark:bg-gray-800/90')}
                  {rankingAlgorithm === 'points' && renderSortHeader('points', t('league.standings.points'))}
                  {rankingAlgorithm === 'elo' && renderSortHeader('eloRating', t('league.ranking.eloColumn'))}
                  {rankingAlgorithm === 'weightedPoints' && renderSortHeader('weightedPoints', t('league.ranking.weightedColumn'))}
                  {renderSortHeader('tournaments', t('league.standings.gameDays'))}
                  {renderSortHeader('wins', t('league.standings.wins'))}
                  {renderSortHeader('cashes', t('league.standings.itm'))}
                  {renderSortHeader('avgPlace', t('league.standings.avgPlace'))}
                  {renderSortHeader('totalCost', t('league.standings.cost'))}
                  {renderSortHeader('totalPayout', t('league.standings.payout'))}
                  {renderSortHeader('netBalance', t('league.standings.balance'))}
                  {renderSortHeader('participationRate', t('league.standings.participation'))}
                  {gameDays.length >= 2 && (
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.standings.trend')}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => {
                  const dimmed = s.meetsMinParticipation === false;
                  return (
                    <tr
                      key={s.name}
                      className={`border-b border-gray-100 dark:border-gray-700/20 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors ${dimmed ? 'opacity-50' : ''}`}
                      title={dimmed ? t('league.ranking.notQualified') : undefined}
                    >
                      <td className="px-2 py-2 font-medium text-gray-500 dark:text-gray-400 sticky left-0 z-10 bg-inherit">
                        {medal(s.rank)}
                      </td>
                      <td className="px-2 py-2 font-medium text-gray-900 dark:text-white sticky left-10 z-10 bg-inherit">
                        <button
                          onClick={() => setSelectedPlayer(s.name)}
                          className="hover:underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                          title={t('league.playerDetail.viewDetails')}
                        >
                          {s.name}
                        </button>
                        {s.corrections !== 0 && (
                          <span className={`ml-1 text-xs ${s.corrections > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            ({s.corrections > 0 ? '+' : ''}{s.corrections})
                          </span>
                        )}
                        {dimmed && (
                          <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500" title={t('league.ranking.notQualified')}>*</span>
                        )}
                      </td>
                      {rankingAlgorithm === 'points' && (
                        <td className="px-2 py-2 font-bold" style={{ color: 'var(--accent-text)' }}>{s.points}</td>
                      )}
                      {rankingAlgorithm === 'elo' && (
                        <td className="px-2 py-2 font-bold" style={{ color: 'var(--accent-text)' }}>{Math.round(s.eloRating ?? 0)}</td>
                      )}
                      {rankingAlgorithm === 'weightedPoints' && (
                        <td className="px-2 py-2 font-bold" style={{ color: 'var(--accent-text)' }}>{(s.weightedPoints ?? 0).toFixed(1)}</td>
                      )}
                      <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{s.tournaments}</td>
                      <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{s.wins}</td>
                      <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{s.cashes}</td>
                      <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{s.avgPlace}</td>
                      <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{s.totalCost.toFixed(0)} {currencySymbol}</td>
                      <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{s.totalPayout.toFixed(0)} {currencySymbol}</td>
                      <td className={`px-2 py-2 font-medium ${s.netBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {s.netBalance >= 0 ? '+' : ''}{s.netBalance.toFixed(0)} {currencySymbol}
                      </td>
                      <td className="px-2 py-2 text-gray-600 dark:text-gray-300">
                        {(s.participationRate * 100).toFixed(0)}%
                      </td>
                      {gameDays.length >= 2 && (
                        <td className="px-2 py-2">
                          {(() => {
                            const pts = sparklineData.get(normalizePlayerName(s.name));
                            return pts ? <Sparkline data={pts} /> : null;
                          })()}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Player Detail Modal */}
      {selectedPlayer && (
        <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
          <LeaguePlayerDetail
            playerName={selectedPlayer}
            gameDays={gameDays}
            onClose={() => setSelectedPlayer(null)}
          />
        </Suspense></SectionErrorBoundary>
      )}
    </div>
  );
}
