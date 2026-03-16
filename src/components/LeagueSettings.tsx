import { useState, useCallback } from 'react';
import type { League, TiebreakerCriterion, Season, RankingAlgorithm } from '../domain/types';
import { saveLeague, createSeason } from '../domain/logic';
import { useTranslation } from '../i18n';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { NumberStepper } from './NumberStepper';

interface Props {
  league: League;
  onClose: () => void;
  onSaved: () => void;
}

const ALL_CRITERIA: TiebreakerCriterion[] = ['avgPlace', 'wins', 'cashes', 'headToHead', 'lastResult'];
const RANKING_ALGORITHMS: RankingAlgorithm[] = ['points', 'elo', 'weightedPoints'];

export function LeagueSettings({ league, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const dialogRef = useDialogA11y(onClose);
  const [criteria, setCriteria] = useState<TiebreakerCriterion[]>(
    () => league.tiebreaker?.criteria ?? ['avgPlace', 'wins'],
  );
  const [seasons, setSeasons] = useState<Season[]>(() => league.seasons ?? []);
  const [activeSeasonId, setActiveSeasonId] = useState<string | undefined>(league.activeSeasonId);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [isAddingSeason, setIsAddingSeason] = useState(false);

  // Point system
  const [pointEntries, setPointEntries] = useState(
    () => [...league.pointSystem.entries],
  );

  // Ranking algorithm
  const [rankingAlgorithm, setRankingAlgorithm] = useState<RankingAlgorithm>(
    () => league.rankingAlgorithm ?? 'points',
  );
  const [eloStartRating, setEloStartRating] = useState(
    () => league.eloConfig?.startRating ?? 1500,
  );
  const [eloKFactor, setEloKFactor] = useState(
    () => league.eloConfig?.kFactor ?? 32,
  );
  const [decayFactor, setDecayFactor] = useState(
    () => league.weightedPointsConfig?.decayFactor ?? 0.85,
  );
  const [minParticipation, setMinParticipation] = useState(
    () => league.minParticipation ?? 0,
  );

  const criterionLabel = useCallback((c: TiebreakerCriterion): string => {
    switch (c) {
      case 'avgPlace': return t('league.settings.tbAvgPlace');
      case 'wins': return t('league.settings.tbWins');
      case 'cashes': return t('league.settings.tbCashes');
      case 'headToHead': return t('league.settings.tbH2H');
      case 'lastResult': return t('league.settings.tbLastResult');
    }
  }, [t]);

  const rankingLabel = useCallback((algo: RankingAlgorithm): string => {
    switch (algo) {
      case 'points': return t('league.ranking.points');
      case 'elo': return t('league.ranking.elo');
      case 'weightedPoints': return t('league.ranking.weighted');
    }
  }, [t]);

  const handleMoveCriterion = useCallback((idx: number, direction: 'up' | 'down') => {
    setCriteria((prev) => {
      const copy = [...prev];
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= copy.length) return prev;
      [copy[idx], copy[target]] = [copy[target]!, copy[idx]!];
      return copy;
    });
  }, []);

  const handleToggleCriterion = useCallback((c: TiebreakerCriterion) => {
    setCriteria((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }, []);

  const handleCreateSeason = useCallback(() => {
    const name = newSeasonName.trim();
    if (!name) return;
    const season = createSeason(name);
    setSeasons((prev) => [...prev, season]);
    if (!activeSeasonId) setActiveSeasonId(season.id);
    setNewSeasonName('');
    setIsAddingSeason(false);
  }, [newSeasonName, activeSeasonId]);

  const handleCloseSeason = useCallback((id: string) => {
    setSeasons((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, endDate: new Date().toISOString().split('T')[0] } : s,
      ),
    );
    if (activeSeasonId === id) setActiveSeasonId(undefined);
  }, [activeSeasonId]);

  const handleUpdatePoints = useCallback((place: number, points: number) => {
    setPointEntries((prev) =>
      prev.map((e) => (e.place === place ? { ...e, points } : e)),
    );
  }, []);

  const handleSave = useCallback(() => {
    const updated: League = {
      ...league,
      pointSystem: { entries: pointEntries },
      tiebreaker: criteria.length > 0 ? { criteria } : undefined,
      seasons: seasons.length > 0 ? seasons : undefined,
      activeSeasonId,
      rankingAlgorithm,
      eloConfig: rankingAlgorithm === 'elo' ? { startRating: eloStartRating, kFactor: eloKFactor } : league.eloConfig,
      weightedPointsConfig: rankingAlgorithm === 'weightedPoints' ? { decayFactor } : league.weightedPointsConfig,
      minParticipation,
    };
    saveLeague(updated);
    onSaved();
  }, [league, pointEntries, criteria, seasons, activeSeasonId, rankingAlgorithm, eloStartRating, eloKFactor, decayFactor, minParticipation, onSaved]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="league-settings-title" className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700/40">
          <h2 id="league-settings-title" className="text-lg font-bold text-gray-900 dark:text-white">{t('league.settings.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl transition-colors" aria-label={t('accessibility.close')}>✕</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Point System */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('league.standings.pointSystem')}</h3>
            <div className="flex flex-wrap gap-3">
              {pointEntries.map((e) => (
                <div key={e.place} className="flex items-center gap-1 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{e.place}.</span>
                  <input
                    type="number"
                    value={e.points}
                    onChange={(ev) => handleUpdatePoints(e.place, parseInt(ev.target.value, 10) || 0)}
                    className="w-12 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded px-1.5 py-0.5 text-center text-sm focus:ring-2 focus:outline-none"
                    min={0}
                  />
                  <span className="text-gray-400 dark:text-gray-500 text-xs">{t('league.settings.pointsAbbr')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ranking Algorithm */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('league.ranking.title')}</h3>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl p-1">
              {RANKING_ALGORITHMS.map((algo) => (
                <button
                  key={algo}
                  onClick={() => setRankingAlgorithm(algo)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    rankingAlgorithm === algo
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  aria-label={rankingLabel(algo)}
                >
                  {rankingLabel(algo)}
                </button>
              ))}
            </div>

            {/* ELO Config */}
            {rankingAlgorithm === 'elo' && (
              <div className="mt-3 space-y-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{t('league.ranking.startRating')}</label>
                  <NumberStepper value={eloStartRating} onChange={setEloStartRating} min={1000} max={2000} step={100} />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{t('league.ranking.kFactor')}</label>
                  <NumberStepper value={eloKFactor} onChange={setEloKFactor} min={8} max={64} step={4} />
                </div>
              </div>
            )}

            {/* Weighted Points Config */}
            {rankingAlgorithm === 'weightedPoints' && (
              <div className="mt-3 space-y-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{t('league.ranking.decay')}</label>
                  <NumberStepper value={decayFactor} onChange={setDecayFactor} min={0.5} max={1.0} step={0.05} />
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{t('league.ranking.decayHint')}</p>
              </div>
            )}
          </div>

          {/* Minimum Participation */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('league.ranking.minParticipation')}</h3>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex-1 pr-4">{t('league.ranking.minParticipationHint')}</p>
              <NumberStepper value={minParticipation} onChange={setMinParticipation} min={0} max={20} step={1} />
            </div>
          </div>

          {/* Tiebreaker */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('league.settings.tiebreaker')}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('league.settings.tiebreakerHint')}</p>
            <div className="space-y-1">
              {criteria.map((c, idx) => (
                <div key={c} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/40 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-gray-400 w-4">{idx + 1}.</span>
                  <span className="flex-1 text-sm text-gray-900 dark:text-white">{criterionLabel(c)}</span>
                  <button
                    onClick={() => handleMoveCriterion(idx, 'up')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs px-1"
                    disabled={idx === 0}
                    aria-label={t('accessibility.moveUp')}
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMoveCriterion(idx, 'down')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs px-1"
                    disabled={idx === criteria.length - 1}
                    aria-label={t('accessibility.moveDown')}
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => handleToggleCriterion(c)}
                    className="text-red-400 hover:text-red-600 text-xs px-1"
                    aria-label={t('accessibility.remove')}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            {/* Available criteria to add */}
            {ALL_CRITERIA.filter((c) => !criteria.includes(c)).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {ALL_CRITERIA.filter((c) => !criteria.includes(c)).map((c) => (
                  <button
                    key={c}
                    onClick={() => handleToggleCriterion(c)}
                    className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    + {criterionLabel(c)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Seasons */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('league.settings.seasons')}</h3>
            {seasons.length > 0 ? (
              <div className="space-y-1">
                {seasons.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/40 rounded-lg px-3 py-1.5">
                    <input
                      type="radio"
                      name="activeSeason"
                      checked={activeSeasonId === s.id}
                      onChange={() => setActiveSeasonId(s.id)}
                      style={{ accentColor: 'var(--accent-600)' }}
                    />
                    <span className="flex-1 text-sm text-gray-900 dark:text-white">
                      {s.name}
                      <span className="ml-2 text-xs text-gray-400">
                        {s.startDate}{s.endDate ? ` — ${s.endDate}` : ''}
                      </span>
                    </span>
                    {activeSeasonId === s.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: 'var(--accent-600)' }}>
                        {t('league.settings.active')}
                      </span>
                    )}
                    {!s.endDate && (
                      <button
                        onClick={() => handleCloseSeason(s.id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        {t('league.settings.closeSeason')}
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setActiveSeasonId(undefined)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${!activeSeasonId ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                  {t('league.settings.noSeason')}
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-400">{t('league.settings.noSeasons')}</p>
            )}

            {isAddingSeason ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSeason(); if (e.key === 'Escape') setIsAddingSeason(false); }}
                  placeholder={t('league.settings.seasonNamePlaceholder')}
                  className="flex-1 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
                  autoFocus
                />
                <button onClick={handleCreateSeason} className="text-sm px-2 py-1" style={{ color: 'var(--accent-text)' }} aria-label={t('accessibility.confirm')}>✓</button>
                <button onClick={() => setIsAddingSeason(false)} className="text-sm text-gray-400 px-2 py-1" aria-label={t('accessibility.cancel')}>✕</button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingSeason(true)}
                className="mt-2 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                + {t('league.settings.addSeason')}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700/40">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm transition-colors">
            {t('league.view.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white rounded-lg text-sm font-medium shadow-md transition-all duration-200 active:scale-[0.97]"
            style={{ background: 'linear-gradient(to bottom, var(--accent-600), var(--accent-700))' }}
          >
            {t('league.settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
