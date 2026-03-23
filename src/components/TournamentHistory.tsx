import { useState, useCallback } from 'react';
import type { TournamentResult, PlayerStat, Currency } from '../domain/types';
import type { TournamentConfig } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import {
  loadTournamentHistory,
  deleteTournamentResult,
  clearTournamentHistory,
  formatResultAsText,
  formatResultAsCSV,
  formatElapsedTime,
  computePlayerStats,
  cloneConfigFromResult,
  MAX_HISTORY,
} from '../domain/logic';
import { useTranslation } from '../i18n';
import { ChevronIcon } from './ChevronIcon';
import { BottomSheet } from './BottomSheet';

type Tab = 'history' | 'stats';

interface Props {
  onClose: () => void;
  onCloneConfig?: ((config: TournamentConfig) => void) | undefined;
}

export function TournamentHistory({ onClose, onCloneConfig }: Props) {
  const { t, language } = useTranslation();
  const [history, setHistory] = useState<TournamentResult[]>(() => loadTournamentHistory());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('history');

  const handleDelete = useCallback((id: string) => {
    deleteTournamentResult(id);
    setHistory(loadTournamentHistory());
    if (expandedId === id) setExpandedId(null);
  }, [expandedId]);

  const handleClearAll = useCallback(() => {
    clearTournamentHistory();
    setHistory([]);
    setConfirmClear(false);
    setExpandedId(null);
  }, []);

  const handleCopyText = useCallback(async (result: TournamentResult) => {
    try {
      await navigator.clipboard.writeText(formatResultAsText(result, language === 'de' ? 'de-DE' : 'en-US'));
      setCopiedId(result.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* clipboard not available */ }
  }, [language]);

  const handleDownloadCSV = useCallback((result: TournamentResult) => {
    const csv = formatResultAsCSV(result);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.name || 'tournament'}-${new Date(result.date).toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const stats = tab === 'stats' ? computePlayerStats(history) : [];

  return (
    <BottomSheet onClose={onClose} ariaLabelledBy="history-title">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700/40">
          <h2 id="history-title" className="text-lg font-bold text-gray-900 dark:text-white">{t('history.title')}</h2>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
          >
            {t('history.close')}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700/40 px-5">
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === 'history'
                ? ''
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            style={tab === 'history' ? { borderColor: 'var(--accent-500)', color: 'var(--accent-text)' } : undefined}
          >
            {t('history.title')}
          </button>
          <button
            onClick={() => setTab('stats')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === 'stats'
                ? ''
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            style={tab === 'stats' ? { borderColor: 'var(--accent-500)', color: 'var(--accent-text)' } : undefined}
          >
            {t('history.statsTab')}
          </button>
        </div>

        {/* History capacity warning */}
        {history.length >= MAX_HISTORY * 0.9 && (
          <div className="mx-5 mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/50 rounded-lg text-xs text-amber-700 dark:text-amber-400">
            {t('history.capacityWarning', { n: history.length, max: MAX_HISTORY })}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {tab === 'history' ? (
            history.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('history.noEntries')}</p>
            ) : (
              history.map((result) => (
                <HistoryEntry
                  key={result.id}
                  result={result}
                  expanded={expandedId === result.id}
                  onToggle={() => setExpandedId(expandedId === result.id ? null : result.id)}
                  onDelete={() => handleDelete(result.id)}
                  onCopyText={() => handleCopyText(result)}
                  onDownloadCSV={() => handleDownloadCSV(result)}
                  onClone={onCloneConfig && result.configSnapshot ? () => {
                    const cloned = cloneConfigFromResult(result);
                    if (cloned) { onCloneConfig(cloned); onClose(); }
                  } : undefined}
                  copied={copiedId === result.id}
                />
              ))
            )
          ) : (
            <StatsTable stats={stats} history={history} />
          )}
        </div>

        {/* Footer */}
        {tab === 'history' && history.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700/40 flex justify-end">
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-500 dark:text-red-400">{t('history.clearConfirm')}</span>
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {t('history.clearAll')}
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
                >
                  {t('app.cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-200 dark:border-red-800/40"
              >
                {t('history.clearAll')}
              </button>
            )}
          </div>
        )}
    </BottomSheet>
  );
}

// --- History Entry ---
function HistoryEntry({
  result,
  expanded,
  onToggle,
  onDelete,
  onCopyText,
  onDownloadCSV,
  onClone,
  copied,
}: {
  result: TournamentResult;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onCopyText: () => void;
  onDownloadCSV: () => void;
  onClone?: (() => void) | undefined;
  copied: boolean;
}) {
  const { t, language } = useTranslation();
  const sym = CURRENCY_SYMBOLS[(result.currency ?? 'EUR') as Currency];
  const winner = result.players.find((p) => p.place === 1);
  const dateStr = new Date(result.date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden transition-all">
      {/* Summary row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors group"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white truncate">
              {result.name || 'Tournament'}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{dateStr}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {winner && (
              <span>
                {t('history.winner')}: <span className="font-medium" style={{ color: 'var(--accent-text)' }}>{winner.name}</span>
              </span>
            )}
            <span>{result.playerCount} {t('history.players')}</span>
            <span>{result.prizePool.toFixed(0)} {sym}</span>
          </div>
        </div>
        <ChevronIcon open={expanded} />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 animate-fade-in">
          {/* Meta info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <span>{t('history.duration')}: {formatElapsedTime(result.elapsedSeconds)}</span>
            <span>{t('history.levels')}: {result.levelsPlayed}</span>
            {result.totalRebuys > 0 && <span>{t('finished.rebuys')}: {result.totalRebuys}</span>}
            {result.totalAddOns > 0 && <span>{t('finished.addOns')}: {result.totalAddOns}</span>}
            {result.events && result.events.length > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                {t('log.eventCount' as Parameters<typeof t>[0], { n: result.events.length })}
              </span>
            )}
          </div>

          {/* Standings table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 text-left text-xs uppercase tracking-wider">
                  <th className="py-1.5 pr-2">#</th>
                  <th className="py-1.5 pr-2">{t('history.nameCol')}</th>
                  <th className="py-1.5 pr-2 text-right">{t('history.prizePool')}</th>
                  {result.bountyEnabled && <th className="py-1.5 pr-2 text-right">{t('history.bountyCol')}</th>}
                  <th className="py-1.5 text-right">{t('history.balance')}</th>
                </tr>
              </thead>
              <tbody>
                {result.players.map((p, i) => (
                  <tr
                    key={i}
                    className={`border-t border-gray-200/60 dark:border-gray-700/30 ${
                      p.place === 1 ? 'font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}
                    style={p.place === 1 ? { color: 'var(--accent-text)' } : undefined}
                  >
                    <td className="py-1.5 pr-2 tabular-nums">{p.place}</td>
                    <td className="py-1.5 pr-2">{p.name}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {p.payout > 0 ? `${p.payout.toFixed(2)} ${sym}` : '–'}
                    </td>
                    {result.bountyEnabled && (
                      <td className="py-1.5 pr-2 text-right tabular-nums">
                        {p.bountyEarned > 0 ? `${p.bountyEarned.toFixed(2)} ${sym}` : '–'}
                      </td>
                    )}
                    <td className={`py-1.5 text-right tabular-nums font-medium ${
                      p.netBalance < 0
                        ? 'text-red-500 dark:text-red-400'
                        : p.netBalance === 0
                        ? 'text-gray-500'
                        : ''
                    }`} style={p.netBalance > 0 ? { color: 'var(--accent-text)' } : undefined}>
                      {p.netBalance > 0 ? '+' : ''}{p.netBalance.toFixed(2)} {sym}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onCopyText}
              className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
            >
              {copied ? t('finished.textCopied') : t('finished.copyText')}
            </button>
            <button
              onClick={onDownloadCSV}
              className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
            >
              {t('finished.downloadCSV')}
            </button>
            {onClone && (
              <button
                onClick={onClone}
                className="px-3 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
                style={{ backgroundColor: 'color-mix(in srgb, var(--accent-500) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-500) 30%, transparent)' }}
                title={t('history.cloneTooltip')}
              >
                {t('history.clone')}
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={onDelete}
              className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium transition-colors border border-red-200 dark:border-red-800/40"
            >
              {t('history.delete')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Player Stats Table ---
function StatsTable({ stats, history }: { stats: PlayerStat[]; history: TournamentResult[] }) {
  const { t } = useTranslation();
  const sym = CURRENCY_SYMBOLS[(history[0]?.currency ?? 'EUR') as Currency];

  if (stats.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('history.noEntries')}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 dark:text-gray-400 text-left text-xs uppercase tracking-wider">
            <th className="py-2 pr-2">{t('history.nameCol')}</th>
            <th className="py-2 pr-2 text-center">{t('history.tournaments')}</th>
            <th className="py-2 pr-2 text-center">{t('history.wins')}</th>
            <th className="py-2 pr-2 text-center">{t('history.cashes')}</th>
            <th className="py-2 pr-2 text-right">{t('history.totalPayout')}</th>
            <th className="py-2 pr-2 text-right">{t('history.totalCost')}</th>
            <th className="py-2 pr-2 text-right">{t('history.balance')}</th>
            <th className="py-2 pr-2 text-center">{t('history.avgPlace')}</th>
            <th className="py-2 text-center">{t('history.knockouts')}</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr
              key={s.name}
              className="border-t border-gray-200/60 dark:border-gray-700/30 text-gray-700 dark:text-gray-300"
            >
              <td className="py-2 pr-2 font-medium text-gray-900 dark:text-white">{s.name}</td>
              <td className="py-2 pr-2 text-center tabular-nums">{s.tournaments}</td>
              <td className="py-2 pr-2 text-center tabular-nums">{s.wins}</td>
              <td className="py-2 pr-2 text-center tabular-nums">{s.cashes}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{s.totalPayout.toFixed(2)} {sym}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{s.totalCost.toFixed(2)} {sym}</td>
              <td className={`py-2 pr-2 text-right tabular-nums font-medium ${
                s.netBalance < 0
                  ? 'text-red-500 dark:text-red-400'
                  : s.netBalance === 0
                  ? 'text-gray-500'
                  : ''
              }`} style={s.netBalance > 0 ? { color: 'var(--accent-text)' } : undefined}>
                {s.netBalance > 0 ? '+' : ''}{s.netBalance.toFixed(2)} {sym}
              </td>
              <td className="py-2 pr-2 text-center tabular-nums">{s.avgPlace}</td>
              <td className="py-2 text-center tabular-nums">{s.knockouts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
