import { useState, useCallback } from 'react';
import type { League, LeagueStanding, TournamentConfig } from '../domain/types';
import {
  loadLeagues,
  saveLeague,
  deleteLeague,
  defaultPointSystem,
  loadTournamentHistory,
  computeLeagueStandings,
  formatLeagueAsText,
  formatLeagueAsCSV,
  exportLeagueToJSON,
  parseLeagueFile,
  importLeague,
  extractLeagueConfig,
} from '../domain/logic';
import { useTranslation } from '../i18n';
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
  currentConfig?: TournamentConfig;
}

export function LeagueManager({ onClose, currentConfig }: Props) {
  const { t } = useTranslation();
  const [leagues, setLeagues] = useState<League[]>(() => loadLeagues());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fileError, setFileError] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [savedConfigId, setSavedConfigId] = useState<string | null>(null);

  const handleSaveConfigToLeague = useCallback((league: League) => {
    if (!currentConfig) return;
    const leagueConfig = extractLeagueConfig(currentConfig);
    const updated: League = { ...league, defaultConfig: leagueConfig };
    saveLeague(updated);
    setLeagues(loadLeagues());
    setSavedConfigId(league.id);
    setTimeout(() => setSavedConfigId(null), 2000);
  }, [currentConfig]);

  const createLeague = useCallback(() => {
    const league: League = {
      id: `league_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: '',
      pointSystem: defaultPointSystem(),
      createdAt: new Date().toISOString(),
    };
    saveLeague(league);
    setLeagues(loadLeagues());
    setExpandedId(league.id);
    setEditingId(league.id);
  }, []);

  const handleUpdateLeague = useCallback((league: League) => {
    saveLeague(league);
    setLeagues(loadLeagues());
  }, []);

  const handleDeleteLeague = useCallback((id: string) => {
    deleteLeague(id);
    setLeagues(loadLeagues());
    if (expandedId === id) setExpandedId(null);
    setConfirmDeleteId(null);
  }, [expandedId]);

  const handleCopyText = useCallback(async (league: League) => {
    const history = loadTournamentHistory();
    const standings = computeLeagueStandings(league.id, history, league.pointSystem);
    try {
      await navigator.clipboard.writeText(formatLeagueAsText(league, standings));
      setCopiedId(league.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* clipboard not available */ }
  }, []);

  const handleDownloadCSV = useCallback((league: League) => {
    const history = loadTournamentHistory();
    const standings = computeLeagueStandings(league.id, history, league.pointSystem);
    const csv = formatLeagueAsCSV(standings);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${league.name || 'league'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportLeague = useCallback(async (league: League) => {
    const json = exportLeagueToJSON(league);
    const fileName = `${(league.name || 'league').replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, '')}.json`;

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

  const handleImportLeague = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) return;
      try {
        const text = await file.text();
        const data = parseLeagueFile(text);
        if (data) {
          importLeague(data);
          setLeagues(loadLeagues());
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
    <BottomSheet onClose={onClose} ariaLabelledBy="league-title">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700/40">
          <h2 id="league-title" className="text-lg font-bold text-gray-900 dark:text-white">{t('league.title')}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={createLeague}
              className="px-3 py-1.5 btn-accent-gradient text-white rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97]"
            >
              + {t('league.newLeague')}
            </button>
            <button
              onClick={handleImportLeague}
              className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
            >
              {t('league.importFile')}
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
            {t('league.invalidFile')}
          </div>
        )}
        {importSuccess && (
          <div className="mx-5 mt-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-500) 8%, transparent)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'color-mix(in srgb, var(--accent-500) 30%, transparent)', color: 'var(--accent-text)' }}>
            {t('league.importSuccess')}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {leagues.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('league.noLeagues')}</p>
          ) : (
            leagues.map((league) => (
              <LeagueEntry
                key={league.id}
                league={league}
                expanded={expandedId === league.id}
                editing={editingId === league.id}
                confirmDelete={confirmDeleteId === league.id}
                copied={copiedId === league.id}
                onToggle={() => setExpandedId(expandedId === league.id ? null : league.id)}
                onEdit={() => setEditingId(editingId === league.id ? null : league.id)}
                onUpdate={handleUpdateLeague}
                onDelete={() => handleDeleteLeague(league.id)}
                onConfirmDelete={() => setConfirmDeleteId(league.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onCopyText={() => handleCopyText(league)}
                onDownloadCSV={() => handleDownloadCSV(league)}
                onExportJSON={() => handleExportLeague(league)}
                onSaveConfig={currentConfig ? () => handleSaveConfigToLeague(league) : undefined}
                savedConfig={savedConfigId === league.id}
              />
            ))
          )}
        </div>
    </BottomSheet>
  );
}

// --- League Entry ---
function LeagueEntry({
  league,
  expanded,
  editing,
  confirmDelete,
  copied,
  onToggle,
  onEdit,
  onUpdate,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onCopyText,
  onDownloadCSV,
  onExportJSON,
  onSaveConfig,
  savedConfig,
}: {
  league: League;
  expanded: boolean;
  editing: boolean;
  confirmDelete: boolean;
  copied: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onUpdate: (league: League) => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onCopyText: () => void;
  onDownloadCSV: () => void;
  onExportJSON: () => void;
  onSaveConfig?: (() => void) | undefined;
  savedConfig?: boolean | undefined;
}) {
  const { t, language } = useTranslation();

  const standings = expanded
    ? computeLeagueStandings(league.id, loadTournamentHistory(), league.pointSystem)
    : [];

  const dateStr = new Date(league.createdAt).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric',
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
              {league.name || t('league.namePlaceholder')}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{dateStr}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            <span>{league.pointSystem.entries.length} {t('league.points')}</span>
            {league.defaultConfig && (
              <span className="text-xs" style={{ color: 'var(--accent-text)' }}>{t('league.hasConfig')}</span>
            )}
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
              {/* League name */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('league.name')}</label>
                <input
                  type="text"
                  value={league.name}
                  onChange={(e) => onUpdate({ ...league, name: e.target.value })}
                  maxLength={100}
                  placeholder={t('league.namePlaceholder')}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-ring)] transition-all duration-200"
                />
              </div>

              {/* Point system */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">{t('league.pointSystem')}</label>
                <div className="space-y-1.5">
                  {league.pointSystem.entries.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-16">{t('league.place', { n: entry.place })}</span>
                      <NumberStepper
                        value={entry.points}
                        onChange={(v) => {
                          const entries = [...league.pointSystem.entries];
                          entries[i] = { ...entries[i]!, points: Math.max(0, v) };
                          onUpdate({ ...league, pointSystem: { entries } });
                        }}
                        min={0}
                        step={1}
                      />
                      <span className="text-gray-400 dark:text-gray-500 text-xs">{t('league.points')}</span>
                      <button
                        onClick={() => {
                          const entries = league.pointSystem.entries.filter((_, idx) => idx !== i);
                          onUpdate({ ...league, pointSystem: { entries } });
                        }}
                        className="ml-1 px-2 py-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs font-medium transition-colors"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const entries = [...league.pointSystem.entries];
                      const nextPlace = entries.length > 0 ? Math.max(...entries.map((e) => e.place)) + 1 : 1;
                      entries.push({ place: nextPlace, points: 1 });
                      onUpdate({ ...league, pointSystem: { entries } });
                    }}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
                  >
                    + {t('league.place', { n: league.pointSystem.entries.length + 1 })}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Standings table */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('league.standings')}</h4>
            <LeagueLeaderboard standings={standings} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
            >
              {editing ? t('history.close') : t('league.pointSystem')}
            </button>
            <button
              onClick={onCopyText}
              className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
            >
              {copied ? t('league.textCopied') : t('league.copyText')}
            </button>
            <button
              onClick={onDownloadCSV}
              className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
            >
              {t('league.downloadCSV')}
            </button>
            <button
              onClick={onExportJSON}
              className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
            >
              {t('league.exportFile')}
            </button>
            {onSaveConfig && (
              <button
                onClick={onSaveConfig}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: 'color-mix(in srgb, var(--accent-500) 10%, transparent)', color: 'var(--accent-text)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'color-mix(in srgb, var(--accent-500) 20%, transparent)' }}
              >
                {savedConfig ? t('league.configSaved') : t('league.saveConfig')}
              </button>
            )}
            <div className="flex-1" />
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500 dark:text-red-400">
                  {t('league.deleteConfirm', { name: league.name || '?' })}
                </span>
                <button
                  onClick={onDelete}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  {t('league.delete')}
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
                {t('league.delete')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- League Leaderboard (embedded in each expanded league) ---
type SortColumn = 'points' | 'tournaments' | 'wins' | 'cashes' | 'avgPlace' | 'bestPlace';

function LeagueLeaderboard({ standings }: { standings: LeagueStanding[] }) {
  const { t } = useTranslation();
  const [sortCol, setSortCol] = useState<SortColumn>('points');
  const [sortAsc, setSortAsc] = useState(false);

  if (standings.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">{t('league.noResults')}</p>;
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
            <th className="py-1.5 pr-2">{t('league.rank')}</th>
            <th className="py-1.5 pr-2">{t('league.player')}</th>
            <th className={thClass} onClick={() => handleSort('points')}>{t('league.points')}{arrow('points')}</th>
            <th className={thClass} onClick={() => handleSort('tournaments')}>{t('league.tournaments')}{arrow('tournaments')}</th>
            <th className={thClass} onClick={() => handleSort('wins')}>{t('league.wins')}{arrow('wins')}</th>
            <th className={thClass} onClick={() => handleSort('cashes')}>{t('league.cashes')}{arrow('cashes')}</th>
            <th className={thClass} onClick={() => handleSort('avgPlace')}>{t('league.avgPlace')}{arrow('avgPlace')}</th>
            <th className={thClass} onClick={() => handleSort('bestPlace')}>{t('league.bestPlace')}{arrow('bestPlace')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => (
            <tr
              key={s.name}
              className={`border-t border-gray-200/60 dark:border-gray-700/30 ${
                i < 3 ? 'font-medium' : 'text-gray-700 dark:text-gray-300'
              }`}
              style={i < 3 ? { color: 'var(--accent-text)' } : undefined}
            >
              <td className="py-1.5 pr-2 tabular-nums">{MEDAL[i] ?? i + 1}</td>
              <td className="py-1.5 pr-2 font-medium">{s.name}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums font-bold">{s.points}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums">{s.tournaments}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums">{s.wins}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums">{s.cashes}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums">{s.avgPlace}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums">{s.bestPlace || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
