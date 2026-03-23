import { useState, useCallback, useMemo } from 'react';
import type { TournamentSeries, SeriesStanding, TournamentConfig, TournamentResult } from '../domain/types';
import {
  loadAllSeries,
  saveSeries,
  deleteSeries as deleteSeriesFromStore,
  createSeries,
  loadTournamentHistory,
  computeSeriesStandings,
  formatSeriesStandingsAsText,
  formatSeriesStandingsAsCSV,
  exportSeriesToJSON,
  parseSeriesFile,
  saveTournamentResults,
} from '../domain/logic';
import { useTranslation } from '../i18n';
import { showToast } from '../domain/toast';
import { ChevronIcon } from './ChevronIcon';
import { BottomSheet } from './BottomSheet';
import { NumberStepper } from './NumberStepper';

interface WindowWithFilePicker extends Window {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{
    createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>;
  }>;
}

interface Props {
  onClose: () => void;
  currentConfig: TournamentConfig;
  onLinkSeries: (seriesId: string | undefined) => void;
}

export function SeriesManager({ onClose, currentConfig, onLinkSeries }: Props) {
  const { t } = useTranslation();
  const [seriesList, setSeriesList] = useState<TournamentSeries[]>(() => loadAllSeries());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fileError, setFileError] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleCreate = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    const series = createSeries('', today);
    saveSeries(series);
    setSeriesList(loadAllSeries());
    setExpandedId(series.id);
    setEditingId(series.id);
  }, []);

  const handleUpdate = useCallback((series: TournamentSeries) => {
    saveSeries(series);
    setSeriesList(loadAllSeries());
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteSeriesFromStore(id);
    setSeriesList(loadAllSeries());
    if (expandedId === id) setExpandedId(null);
    setConfirmDeleteId(null);
    // Unlink if the deleted series was linked to current config
    if (currentConfig.seriesId === id) {
      onLinkSeries(undefined);
    }
    showToast(t('toast.seriesDeleted'));
  }, [expandedId, currentConfig.seriesId, onLinkSeries, t]);

  const handleCopyText = useCallback(async (series: TournamentSeries) => {
    const history = loadTournamentHistory();
    const standings = computeSeriesStandings(series, history);
    try {
      await navigator.clipboard.writeText(formatSeriesStandingsAsText(series, standings));
      setCopiedId(series.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* clipboard not available */ }
  }, []);

  const handleDownloadCSV = useCallback((series: TournamentSeries) => {
    const history = loadTournamentHistory();
    const standings = computeSeriesStandings(series, history);
    const csv = formatSeriesStandingsAsCSV(series, standings);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${series.name || 'series'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportJSON = useCallback(async (series: TournamentSeries) => {
    const history = loadTournamentHistory();
    const json = exportSeriesToJSON(series, history);
    const fileName = `${(series.name || 'series').replace(/[^a-zA-Z0-9\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df\-_ ]/g, '')}.json`;

    const fsWindow = window as unknown as WindowWithFilePicker;
    if (typeof fsWindow.showSaveFilePicker === 'function') {
      try {
        const handle = await fsWindow.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        return;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) return;
      try {
        const text = await file.text();
        const data = parseSeriesFile(text);
        if (data) {
          // Import: save series + results
          saveSeries(data.series);
          // After importing the series, also save any embedded results to history
          if (data.results && Array.isArray(data.results)) {
            const validResults = data.results.slice(0, 100).filter(
              (result): result is TournamentResult => result != null && typeof result === 'object' && typeof result.id === 'string',
            );
            if (validResults.length > 0) {
              saveTournamentResults(validResults);
            }
          }
          setSeriesList(loadAllSeries());
          setImportSuccess(true);
          setTimeout(() => setImportSuccess(false), 3000);
        } else {
          setFileError(true);
          setTimeout(() => setFileError(false), 3000);
        }
      } catch {
        setFileError(true);
        setTimeout(() => setFileError(false), 3000);
      }
    };
    input.click();
  }, []);

  return (
    <BottomSheet onClose={onClose} ariaLabelledBy="series-title">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700/40">
        <h2 id="series-title" className="text-lg font-bold text-gray-900 dark:text-white">{t('series.title')}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreate}
            className="px-3 py-1.5 btn-accent-gradient text-white rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97]"
          >
            + {t('series.create')}
          </button>
          <button
            onClick={handleImport}
            className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
          >
            {t('series.import')}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
          >
            {t('history.close')}
          </button>
        </div>
      </div>

      {/* Status banners */}
      {fileError && (
        <div className="mx-5 mt-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700/40 rounded-lg text-red-700 dark:text-red-300 text-xs">
          {t('series.invalidFile')}
        </div>
      )}
      {importSuccess && (
        <div className="mx-5 mt-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-500) 8%, transparent)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'color-mix(in srgb, var(--accent-500) 30%, transparent)', color: 'var(--accent-text)' }}>
          {t('series.importSuccess')}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {seriesList.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('series.noSeries')}</p>
        ) : (
          seriesList.map((series) => (
            <SeriesEntry
              key={series.id}
              series={series}
              expanded={expandedId === series.id}
              editing={editingId === series.id}
              confirmDelete={confirmDeleteId === series.id}
              copied={copiedId === series.id}
              isLinked={currentConfig.seriesId === series.id}
              onToggle={() => setExpandedId(expandedId === series.id ? null : series.id)}
              onEdit={() => setEditingId(editingId === series.id ? null : series.id)}
              onUpdate={handleUpdate}
              onDelete={() => handleDelete(series.id)}
              onConfirmDelete={() => setConfirmDeleteId(series.id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onCopyText={() => handleCopyText(series)}
              onDownloadCSV={() => handleDownloadCSV(series)}
              onExportJSON={() => handleExportJSON(series)}
              onLink={() => onLinkSeries(series.id)}
              onUnlink={() => onLinkSeries(undefined)}
            />
          ))
        )}
      </div>
    </BottomSheet>
  );
}

// --- Series Entry ---
function SeriesEntry({
  series,
  expanded,
  editing,
  confirmDelete,
  copied,
  isLinked,
  onToggle,
  onEdit,
  onUpdate,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onCopyText,
  onDownloadCSV,
  onExportJSON,
  onLink,
  onUnlink,
}: {
  series: TournamentSeries;
  expanded: boolean;
  editing: boolean;
  confirmDelete: boolean;
  copied: boolean;
  isLinked: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onUpdate: (series: TournamentSeries) => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onCopyText: () => void;
  onDownloadCSV: () => void;
  onExportJSON: () => void;
  onLink: () => void;
  onUnlink: () => void;
}) {
  const { t, language } = useTranslation();

  const allResults = useMemo(() => expanded ? loadTournamentHistory() : [], [expanded]);
  const standings = useMemo(
    () => expanded ? computeSeriesStandings(series, allResults) : [],
    [expanded, series, allResults],
  );

  const dateStr = new Date(series.createdAt).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const rankingModeLabel = series.rankingMode === 'points'
    ? t('series.rankingPoints')
    : series.rankingMode === 'netBalance'
      ? t('series.rankingBalance')
      : t('series.rankingAvgPlace');

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
              {series.name || t('series.namePlaceholder')}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{dateStr}</span>
            {isLinked && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-500) 15%, transparent)', color: 'var(--accent-text)' }}>
                {t('series.linked')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            <span>{series.tournamentIds.length} {t('series.tournaments')}</span>
            <span>{rankingModeLabel}</span>
          </div>
        </div>
        <ChevronIcon open={expanded} />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in">
          {/* Edit mode */}
          {editing && (
            <div className="space-y-3 p-3 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg">
              {/* Series name */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('series.name')}</label>
                <input
                  type="text"
                  value={series.name}
                  onChange={(e) => onUpdate({ ...series, name: e.target.value })}
                  maxLength={100}
                  placeholder={t('series.namePlaceholder')}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-ring)] transition-all duration-200"
                />
              </div>

              {/* Start/End date */}
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('series.startDate')}</label>
                  <input
                    type="date"
                    value={series.startDate}
                    onChange={(e) => onUpdate({ ...series, startDate: e.target.value })}
                    className="px-3 py-2 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-ring)] transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('series.endDate')}</label>
                  <input
                    type="date"
                    value={series.endDate ?? ''}
                    onChange={(e) => onUpdate({ ...series, endDate: e.target.value || undefined })}
                    className="px-3 py-2 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-ring)] transition-all duration-200"
                  />
                </div>
              </div>

              {/* Ranking mode */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">{t('series.rankingMode')}</label>
                <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700/40">
                  {(['points', 'netBalance', 'avgPlace'] as const).map((mode) => {
                    const label = mode === 'points'
                      ? t('series.rankingPoints')
                      : mode === 'netBalance'
                        ? t('series.rankingBalance')
                        : t('series.rankingAvgPlace');
                    const active = series.rankingMode === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => onUpdate({ ...series, rankingMode: mode })}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? 'text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        style={active ? { backgroundColor: 'var(--accent-700)' } : undefined}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Min tournaments */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-gray-400">{t('series.minTournaments')}</label>
                <NumberStepper
                  value={series.minTournaments ?? 0}
                  onChange={(v) => onUpdate({ ...series, minTournaments: v > 0 ? v : undefined })}
                  min={0}
                  max={50}
                  step={1}
                />
              </div>

              {/* Point system */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">{t('series.pointSystem')}</label>
                <div className="space-y-1.5">
                  {series.pointSystem.entries.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-16">{t('series.place', { n: entry.place })}</span>
                      <NumberStepper
                        value={entry.points}
                        onChange={(v) => {
                          const entries = [...series.pointSystem.entries];
                          entries[i] = { ...entries[i]!, points: Math.max(0, v) };
                          onUpdate({ ...series, pointSystem: { entries } });
                        }}
                        min={0}
                        step={1}
                      />
                      <span className="text-gray-400 dark:text-gray-500 text-xs">{t('series.rankingPoints')}</span>
                      <button
                        onClick={() => {
                          const entries = series.pointSystem.entries.filter((_, idx) => idx !== i);
                          onUpdate({ ...series, pointSystem: { entries } });
                        }}
                        className="ml-1 px-2 py-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs font-medium transition-colors"
                        aria-label={t('series.delete')}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const entries = [...series.pointSystem.entries];
                      const nextPlace = entries.length > 0 ? Math.max(...entries.map((e) => e.place)) + 1 : 1;
                      entries.push({ place: nextPlace, points: 1 });
                      onUpdate({ ...series, pointSystem: { entries } });
                    }}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
                  >
                    + {t('series.place', { n: series.pointSystem.entries.length + 1 })}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Standings table */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('series.standings')}</h4>
            <SeriesLeaderboard standings={standings} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
            >
              {editing ? t('history.close') : t('series.pointSystem')}
            </button>
            {isLinked ? (
              <button
                onClick={onUnlink}
                className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
              >
                {t('series.unlinkTournament')}
              </button>
            ) : (
              <button
                onClick={onLink}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: 'color-mix(in srgb, var(--accent-500) 10%, transparent)', color: 'var(--accent-text)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'color-mix(in srgb, var(--accent-500) 20%, transparent)' }}
              >
                {t('series.linkTournament')}
              </button>
            )}
            <button
              onClick={onCopyText}
              className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
            >
              {copied ? t('series.textCopied') : t('series.copyText')}
            </button>
            <button
              onClick={onDownloadCSV}
              className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
            >
              {t('series.downloadCSV')}
            </button>
            <button
              onClick={onExportJSON}
              className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
            >
              {t('series.exportJSON')}
            </button>
            <div className="flex-1" />
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500 dark:text-red-400">
                  {t('series.deleteConfirm', { name: series.name || '?' })}
                </span>
                <button
                  onClick={onDelete}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  {t('series.delete')}
                </button>
                <button
                  onClick={onCancelDelete}
                  className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
                >
                  {t('app.cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={onConfirmDelete}
                className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium transition-colors border border-red-200 dark:border-red-800/40"
              >
                {t('series.delete')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Series Leaderboard ---
type SortColumn = 'points' | 'tournaments' | 'wins' | 'cashes' | 'avgPlace' | 'bestPlace' | 'netBalance' | 'knockouts';

function SeriesLeaderboard({ standings }: { standings: SeriesStanding[] }) {
  const { t } = useTranslation();
  const [sortCol, setSortCol] = useState<SortColumn>('points');
  const [sortAsc, setSortAsc] = useState(false);

  if (standings.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">{t('series.noResults')}</p>;
  }

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(col === 'avgPlace'); // ascending for avgPlace, descending for others
    }
  };

  const sorted = [...standings].sort((a, b) => {
    const aVal = a[sortCol];
    const bVal = b[sortCol];
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  const MEDAL = ['\u{1F3C6}', '\u{1F948}', '\u{1F949}'];

  const thClass = 'py-1.5 pr-2 text-center cursor-pointer hover:text-[var(--accent-500)] transition-colors select-none';
  const arrow = (col: SortColumn) => sortCol === col ? (sortAsc ? ' \u25B2' : ' \u25BC') : '';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 dark:text-gray-400 text-left text-xs uppercase tracking-wider">
            <th className="py-1.5 pr-2">{t('series.rank')}</th>
            <th className="py-1.5 pr-2">{t('series.player')}</th>
            <th className={thClass} onClick={() => handleSort('points')}>{t('series.rankingPoints')}{arrow('points')}</th>
            <th className={thClass} onClick={() => handleSort('tournaments')}>{t('series.tournaments')}{arrow('tournaments')}</th>
            <th className={thClass} onClick={() => handleSort('wins')}>{t('series.wins')}{arrow('wins')}</th>
            <th className={thClass} onClick={() => handleSort('cashes')}>{t('series.cashes')}{arrow('cashes')}</th>
            <th className={thClass} onClick={() => handleSort('avgPlace')}>{t('series.rankingAvgPlace')}{arrow('avgPlace')}</th>
            <th className={thClass} onClick={() => handleSort('bestPlace')}>{t('series.bestPlace')}{arrow('bestPlace')}</th>
            <th className={thClass} onClick={() => handleSort('netBalance')}>{t('series.netBalance')}{arrow('netBalance')}</th>
            <th className={thClass} onClick={() => handleSort('knockouts')}>{t('series.knockouts')}{arrow('knockouts')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => (
            <tr
              key={s.name}
              className={`border-t border-gray-200/60 dark:border-gray-700/30 ${
                i < 3 ? 'font-medium' : 'text-gray-700 dark:text-gray-300'
              } ${!s.qualified ? 'opacity-50' : ''}`}
              style={i < 3 && s.qualified ? { color: 'var(--accent-text)' } : undefined}
            >
              <td className="py-1.5 pr-2 tabular-nums">{MEDAL[i] ?? i + 1}</td>
              <td className="py-1.5 pr-2 font-medium">
                {s.name}
                {!s.qualified && <span className="ml-1 text-xs text-gray-400">(*)</span>}
              </td>
              <td className="py-1.5 pr-2 text-center tabular-nums font-bold">{s.points}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums">{s.tournaments}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums">{s.wins}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums">{s.cashes}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums">{s.avgPlace}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums">{s.bestPlace || '-'}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums">{s.netBalance >= 0 ? '+' : ''}{s.netBalance.toFixed(0)}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums">{s.knockouts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
