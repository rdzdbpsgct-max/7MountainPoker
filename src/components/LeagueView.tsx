import { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import type { League, ExtendedLeagueStanding, LeagueCorrection, GameDay, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import {
  loadLeagues,
  saveLeague,
  deleteLeague,
  defaultPointSystem,
  loadGameDaysForLeague,
  loadGameDaysForSeason,
  computeExtendedStandings,
  getActiveSeason,
  computeHeadToHeadMatrix,
} from '../domain/logic';
import { useTranslation } from '../i18n';
import { LeagueStandingsTable } from './LeagueStandingsTable';
import { LeagueGameDays } from './LeagueGameDays';
import { LeagueFinances } from './LeagueFinances';
import { HeadToHeadMatrix } from './HeadToHeadMatrix';
import { LoadingFallback } from './LoadingFallback';
import { SectionErrorBoundary } from './ErrorBoundary';

const GameDayEditor = lazy(() => import('./GameDayEditor').then((m) => ({ default: m.GameDayEditor })));
const LeagueSettings = lazy(() => import('./LeagueSettings').then((m) => ({ default: m.LeagueSettings })));

type Tab = 'standings' | 'gameDays' | 'finances' | 'h2h';

interface Props {
  onStartTournament: (leagueId: string, options?: { quickStart?: boolean }) => void;
}

export function LeagueView({ onStartTournament }: Props) {
  const { t } = useTranslation();
  const [leagues, setLeagues] = useState<League[]>(() => loadLeagues());
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(() => {
    const list = loadLeagues();
    return list.length > 0 ? list[0].id : null;
  });
  const [activeTab, setActiveTab] = useState<Tab>('standings');
  const [isCreating, setIsCreating] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // Phase 2 state
  const [showGameDayEditor, setShowGameDayEditor] = useState(false);
  const [editingGameDay, setEditingGameDay] = useState<GameDay | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionPlayer, setCorrectionPlayer] = useState('');
  const [correctionPoints, setCorrectionPoints] = useState(0);
  const [correctionReason, setCorrectionReason] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<string | 'all'>('all');

  const selectedLeague = useMemo(
    () => leagues.find((l) => l.id === selectedLeagueId) ?? null,
    [leagues, selectedLeagueId],
  );

  const gameDays = useMemo(() => {
    void refreshKey;
    if (!selectedLeagueId) return [];
    if (seasonFilter !== 'all') {
      return loadGameDaysForSeason(selectedLeagueId, seasonFilter);
    }
    return loadGameDaysForLeague(selectedLeagueId);
  }, [selectedLeagueId, refreshKey, seasonFilter]);

  const standings: ExtendedLeagueStanding[] = useMemo(() => {
    if (!selectedLeague) return [];
    return computeExtendedStandings(selectedLeague, gameDays);
  }, [selectedLeague, gameDays]);

  const currencySymbol = useMemo(() => {
    const currencies = gameDays.map(gd => gd.currency).filter(Boolean) as Currency[];
    if (currencies.length === 0) return '€';
    return CURRENCY_SYMBOLS[currencies[0]] ?? '€';
  }, [gameDays]);

  const activeSeason = useMemo(
    () => selectedLeague ? getActiveSeason(selectedLeague) : undefined,
    [selectedLeague],
  );

  const refreshData = useCallback(() => {
    setLeagues(loadLeagues());
    setRefreshKey((k) => k + 1);
  }, []);

  const handleCreateLeague = useCallback(() => {
    if (!newLeagueName.trim()) return;
    const league: League = {
      id: `league_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: newLeagueName.trim(),
      pointSystem: defaultPointSystem(),
      createdAt: new Date().toISOString(),
    };
    saveLeague(league);
    setLeagues(loadLeagues());
    setSelectedLeagueId(league.id);
    setNewLeagueName('');
    setIsCreating(false);
  }, [newLeagueName]);

  const handleDeleteLeague = useCallback((id: string) => {
    deleteLeague(id);
    const updated = loadLeagues();
    setLeagues(updated);
    if (selectedLeagueId === id) {
      setSelectedLeagueId(updated.length > 0 ? updated[0].id : null);
    }
    setConfirmDeleteId(null);
  }, [selectedLeagueId]);

  const handleRenameLeague = useCallback((id: string) => {
    if (!editNameValue.trim()) return;
    const league = leagues.find((l) => l.id === id);
    if (!league) return;
    saveLeague({ ...league, name: editNameValue.trim() });
    setLeagues(loadLeagues());
    setEditingName(null);
  }, [editNameValue, leagues]);

  const handleUpdatePointSystem = useCallback((leagueId: string, place: number, points: number) => {
    const league = leagues.find((l) => l.id === leagueId);
    if (!league) return;
    const entries = league.pointSystem.entries.map((e) =>
      e.place === place ? { ...e, points } : e,
    );
    saveLeague({ ...league, pointSystem: { entries } });
    setLeagues(loadLeagues());
  }, [leagues]);

  const handleStartGameDay = useCallback(() => {
    if (!selectedLeagueId || !selectedLeague) return;
    onStartTournament(selectedLeagueId);
  }, [selectedLeagueId, selectedLeague, onStartTournament]);

  const handleQuickStartGameDay = useCallback(() => {
    if (!selectedLeagueId || !selectedLeague) return;
    onStartTournament(selectedLeagueId, { quickStart: true });
  }, [selectedLeagueId, selectedLeague, onStartTournament]);

  // Corrections (Step 17)
  const handleAddCorrection = useCallback(() => {
    if (!selectedLeague || !correctionPlayer.trim()) return;
    const correction: LeagueCorrection = {
      id: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      playerName: correctionPlayer.trim(),
      points: correctionPoints,
      reason: correctionReason.trim() || 'Manual correction',
      date: new Date().toISOString().split('T')[0],
    };
    const updated: League = {
      ...selectedLeague,
      corrections: [...(selectedLeague.corrections ?? []), correction],
    };
    saveLeague(updated);
    setLeagues(loadLeagues());
    setCorrectionPlayer('');
    setCorrectionPoints(0);
    setCorrectionReason('');
    setShowCorrectionModal(false);
  }, [selectedLeague, correctionPlayer, correctionPoints, correctionReason]);

  const h2hMatrix = useMemo(
    () => computeHeadToHeadMatrix(gameDays),
    [gameDays],
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'standings', label: t('league.tabs.standings') },
    { key: 'gameDays', label: t('league.tabs.gameDays') },
    { key: 'finances', label: t('league.tabs.finances') },
    { key: 'h2h', label: t('league.tabs.h2h') },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* League Selector */}
        <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-lg shadow-gray-300/30 dark:shadow-black/20 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('league.view.title')}</h2>
              {leagues.length > 0 && (
                <select
                  value={selectedLeagueId ?? ''}
                  onChange={(e) => setSelectedLeagueId(e.target.value || null)}
                  className="bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:outline-none min-w-0"
                >
                  {leagues.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              )}
              {/* Season Filter */}
              {selectedLeague?.seasons && selectedLeague.seasons.length > 0 && (
                <select
                  value={seasonFilter}
                  onChange={(e) => setSeasonFilter(e.target.value)}
                  className="bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:ring-2 focus:outline-none"
                >
                  <option value="all">{t('league.settings.allSeasons')}</option>
                  {selectedLeague.seasons.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedLeague && (
                <>
                  <button
                    onClick={handleStartGameDay}
                    className="px-3 py-1.5 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-md active:scale-[0.97]"
                    style={{ background: 'linear-gradient(to bottom, var(--accent-600), var(--accent-700))' }}
                  >
                    {t('league.gameDays.startNew')}
                  </button>
                  <button
                    onClick={handleQuickStartGameDay}
                    className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm font-medium transition-all duration-200 border border-emerald-300 dark:border-emerald-700/50 active:scale-[0.97]"
                    title={t('league.gameDays.quickStartHint')}
                  >
                    ⚡ {t('league.gameDays.quickStart')}
                  </button>
                  <button
                    onClick={() => {
                      setEditingGameDay(undefined);
                      setShowGameDayEditor(true);
                    }}
                    className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs transition-colors"
                    title={t('league.editor.manual')}
                    aria-label={t('league.editor.manual')}
                  >
                    📝
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="px-3 py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm transition-colors"
                    title={t('league.settings.title')}
                    aria-label={t('league.settings.title')}
                  >
                    ⚙️
                  </button>
                  {editingName === selectedLeague.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRenameLeague(selectedLeague.id); if (e.key === 'Escape') setEditingName(null); }}
                        className="bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg px-2 py-1 text-sm w-32 focus:ring-2 focus:outline-none"
                        autoFocus
                      />
                      <button onClick={() => handleRenameLeague(selectedLeague.id)} className="text-xs px-3 py-1.5 rounded" style={{ color: 'var(--accent-text)' }} aria-label={t('accessibility.confirm')}>✓</button>
                      <button onClick={() => setEditingName(null)} className="text-xs text-gray-400 px-3 py-1.5 rounded" aria-label={t('accessibility.cancel')}>✗</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingName(selectedLeague.id); setEditNameValue(selectedLeague.name); }}
                      className="px-3 py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm transition-colors"
                      title={t('league.view.editName')}
                      aria-label={t('league.view.editName')}
                    >
                      ✏️
                    </button>
                  )}
                  {confirmDeleteId === selectedLeague.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDeleteLeague(selectedLeague.id)} className="text-xs px-3 py-1.5 text-red-600 dark:text-red-400 font-medium">{t('league.view.confirmDelete')}</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs px-3 py-1.5 text-gray-400">{t('league.view.cancel')}</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(selectedLeague.id)}
                      className="px-3 py-2 text-gray-400 hover:text-red-500 text-sm transition-colors"
                      title={t('league.view.deleteLeague')}
                      aria-label={t('accessibility.delete')}
                    >
                      🗑️
                    </button>
                  )}
                </>
              )}
              {isCreating ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newLeagueName}
                    onChange={(e) => setNewLeagueName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateLeague(); if (e.key === 'Escape') setIsCreating(false); }}
                    placeholder={t('league.view.leagueName')}
                    className="bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg px-3 py-1.5 text-sm w-40 focus:ring-2 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateLeague}
                    className="px-3 py-1.5 text-white rounded-lg text-sm font-medium"
                    style={{ backgroundColor: 'var(--accent-600)' }}
                  >
                    {t('league.view.create')}
                  </button>
                  <button onClick={() => setIsCreating(false)} className="text-gray-400 text-sm px-2 py-1" aria-label={t('accessibility.cancel')}>✗</button>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-all duration-200 border border-gray-200 dark:border-gray-600/30"
                >
                  + {t('league.view.createLeague')}
                </button>
              )}
            </div>
          </div>
          {/* Active Season Badge */}
          {activeSeason && seasonFilter === 'all' && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('league.settings.activeSeason')}: <span className="font-medium text-gray-700 dark:text-gray-300">{activeSeason.name}</span>
            </div>
          )}
        </div>

        {/* No leagues state */}
        {!selectedLeague && leagues.length === 0 && (
          <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-lg p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">{t('league.view.noLeagues')}</p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 text-white rounded-lg font-medium shadow-md"
              style={{ background: 'linear-gradient(to bottom, var(--accent-600), var(--accent-700))' }}
            >
              {t('league.view.createFirst')}
            </button>
          </div>
        )}

        {/* League Content */}
        {selectedLeague && (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.key
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'standings' && (
              <LeagueStandingsTable
                league={selectedLeague}
                standings={standings}
                gameDays={gameDays}
                onUpdatePointSystem={handleUpdatePointSystem}
                onAddCorrection={() => setShowCorrectionModal(true)}
                currencySymbol={currencySymbol}
              />
            )}
            {activeTab === 'gameDays' && (
              <LeagueGameDays
                gameDays={gameDays}
                onStartGameDay={handleStartGameDay}
                onRefresh={refreshData}
                onManualEntry={() => {
                  setEditingGameDay(undefined);
                  setShowGameDayEditor(true);
                }}
                onEditGameDay={(gameDay) => {
                  setEditingGameDay(gameDay);
                  setShowGameDayEditor(true);
                }}
                currencySymbol={currencySymbol}
              />
            )}
            {activeTab === 'finances' && (
              <LeagueFinances
                gameDays={gameDays}
                standings={standings}
                currencySymbol={currencySymbol}
              />
            )}
            {activeTab === 'h2h' && (
              <HeadToHeadMatrix matrix={h2hMatrix} />
            )}
          </>
        )}
      </div>

      {/* Game Day Editor Modal */}
      {showGameDayEditor && selectedLeague && (
        <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
          <GameDayEditor
            league={selectedLeague}
            editingGameDay={editingGameDay}
            onClose={() => {
              setShowGameDayEditor(false);
              setEditingGameDay(undefined);
            }}
            onSaved={() => {
              setShowGameDayEditor(false);
              setEditingGameDay(undefined);
              refreshData();
            }}
            currencySymbol={currencySymbol}
          />
        </Suspense></SectionErrorBoundary>
      )}

      {/* League Settings Modal */}
      {showSettings && selectedLeague && (
        <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
          <LeagueSettings
            league={selectedLeague}
            onClose={() => setShowSettings(false)}
            onSaved={() => { setShowSettings(false); refreshData(); }}
          />
        </Suspense></SectionErrorBoundary>
      )}

      {/* Correction Modal (Step 17) */}
      {showCorrectionModal && selectedLeague && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in p-5 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('league.correction.title')}</h3>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('league.correction.player')}</label>
              <select
                value={correctionPlayer}
                onChange={(e) => setCorrectionPlayer(e.target.value)}
                className="w-full bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
              >
                <option value="">{t('league.correction.selectPlayer')}</option>
                {standings.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('league.correction.points')}</label>
              <input
                type="number"
                value={correctionPoints}
                onChange={(e) => setCorrectionPoints(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
                placeholder={t('league.correction.pointsPlaceholder')}
              />
              <p className="text-[10px] text-gray-400 mt-0.5">{t('league.correction.hint')}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('league.correction.reason')}</label>
              <input
                type="text"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                className="w-full bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
                placeholder={t('league.correction.reasonPlaceholder')}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setShowCorrectionModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 text-sm">{t('league.view.cancel')}</button>
              <button
                onClick={handleAddCorrection}
                disabled={!correctionPlayer.trim() || correctionPoints === 0}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(to bottom, var(--accent-600), var(--accent-700))' }}
              >
                {t('league.correction.add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
