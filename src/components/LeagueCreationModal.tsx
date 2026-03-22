import { useState, useCallback } from 'react';
import type { League, RankingAlgorithm } from '../domain/types';
import { defaultPointSystem } from '../domain/logic';
import { useTranslation } from '../i18n';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { NumberStepper } from './NumberStepper';

const RANKING_ALGORITHMS: RankingAlgorithm[] = ['points', 'elo', 'weightedPoints'];

const POINT_PRESETS: { key: string; entries: number[] }[] = [
  { key: 'standard', entries: [10, 7, 5, 4, 3, 2, 1] },
  { key: 'simple', entries: [5, 3, 1] },
  { key: 'top10', entries: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
];

interface Props {
  onClose: () => void;
  onCreate: (league: League) => void;
}

export function LeagueCreationModal({ onClose, onCreate }: Props) {
  const { t } = useTranslation();
  const dialogRef = useDialogA11y(onClose);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [entries, setEntries] = useState(() => defaultPointSystem().entries);
  const [rankingAlgorithm, setRankingAlgorithm] = useState<RankingAlgorithm>('points');

  const rankingLabel = useCallback((algo: RankingAlgorithm): string => {
    switch (algo) {
      case 'points': return t('league.ranking.points');
      case 'elo': return t('league.ranking.elo');
      case 'weightedPoints': return t('league.ranking.weighted');
    }
  }, [t]);

  const handlePreset = useCallback((presetEntries: number[]) => {
    setEntries(presetEntries.map((pts, i) => ({ place: i + 1, points: pts })));
  }, []);

  const handleAddPlace = useCallback(() => {
    const nextPlace = entries.length > 0 ? Math.max(...entries.map((e) => e.place)) + 1 : 1;
    setEntries((prev) => [...prev, { place: nextPlace, points: 0 }]);
  }, [entries]);

  const handleCreate = useCallback(() => {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    const league: League = {
      id: `league_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      pointSystem: { entries },
      rankingAlgorithm: rankingAlgorithm !== 'points' ? rankingAlgorithm : undefined,
      createdAt: new Date().toISOString(),
    };
    onCreate(league);
  }, [name, entries, rankingAlgorithm, onCreate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="league-create-title"
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700/40">
          <h2 id="league-create-title" className="text-lg font-bold text-gray-900 dark:text-white">
            {t('league.creation.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl transition-colors"
            aria-label={t('accessibility.close')}
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* League Name */}
          <div>
            <label className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 block">
              {t('league.name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder={t('league.namePlaceholder')}
              maxLength={100}
              autoFocus
              className={`w-full px-3 py-2 bg-white dark:bg-gray-800/80 border rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] transition-all ${
                nameError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-700/60 focus:border-[var(--accent-500)]'
              }`}
            />
            {nameError && (
              <p className="text-xs text-red-500 mt-1">{t('league.creation.nameRequired')}</p>
            )}
          </div>

          {/* Point System */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('league.pointSystem')}</h3>
            </div>

            {/* Preset buttons */}
            <div className="flex gap-1.5 mb-3">
              <span className="text-xs text-gray-400 dark:text-gray-500 self-center mr-0.5">{t('league.creation.presets')}:</span>
              {POINT_PRESETS.map((p) => {
                const label = p.key === 'simple' ? t('league.preset.simple') : p.key === 'top10' ? t('league.preset.top10') : t('league.preset.standard');
                return (
                  <button
                    key={p.key}
                    onClick={() => handlePreset(p.entries)}
                    className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg border border-gray-200 dark:border-gray-700/40 transition-colors font-medium"
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Entries */}
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {entries.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 w-16 shrink-0">
                    {t('league.place', { n: entry.place })}
                  </span>
                  <NumberStepper
                    value={entry.points}
                    onChange={(v) => {
                      const next = [...entries];
                      next[i] = { ...next[i]!, points: Math.max(0, v) };
                      setEntries(next);
                    }}
                    min={0}
                    step={1}
                  />
                  <span className="text-gray-400 dark:text-gray-500 text-xs">{t('league.settings.pointsAbbr')}</span>
                  <button
                    onClick={() => setEntries(entries.filter((_, idx) => idx !== i))}
                    className="ml-1 text-red-400 hover:text-red-600 dark:hover:text-red-300 text-sm px-1.5 py-0.5 rounded transition-colors"
                    aria-label={t('accessibility.remove')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Add place */}
            <button
              onClick={handleAddPlace}
              className="mt-2 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700/40 transition-colors"
            >
              + {t('league.creation.addPlace')}
            </button>
          </div>

          {/* Ranking Algorithm */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              {t('league.ranking.title')}
            </h3>
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
                >
                  {rankingLabel(algo)}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
              {t('league.creation.rankingHint')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm transition-colors"
          >
            {t('league.view.cancel')}
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-white rounded-lg text-sm font-medium shadow-md transition-all duration-200 active:scale-[0.97]"
            style={{ background: 'linear-gradient(to bottom, var(--accent-600), var(--accent-700))' }}
          >
            {t('league.view.create')}
          </button>
        </div>
      </div>
    </div>
  );
}
