import { useState, useMemo } from 'react';
import type { HeadToHeadMatrix as H2HMatrix, HeadToHeadEntry } from '../domain/types';
import { useTranslation } from '../i18n';

type SortMode = 'meetings' | 'alpha';

interface Props {
  matrix: H2HMatrix;
}

function cellBg(entry: HeadToHeadEntry | null, isDiag: boolean): string {
  if (isDiag) return 'bg-gray-200 dark:bg-gray-700';
  if (!entry || entry.meetings === 0) return 'bg-gray-50 dark:bg-gray-800/60';
  if (entry.winRate === null) return 'bg-gray-50 dark:bg-gray-800/60';
  const wr = entry.winRate;
  if (wr > 0.75) return 'bg-green-200 dark:bg-green-900/60';
  if (wr > 0.66) return 'bg-green-100 dark:bg-green-900/40';
  if (wr > 0.5) return 'bg-green-50 dark:bg-green-900/20';
  if (wr >= 0.34) return 'bg-gray-50 dark:bg-gray-800/60';
  if (wr >= 0.25) return 'bg-red-50 dark:bg-red-900/20';
  if (wr > 0) return 'bg-red-100 dark:bg-red-900/40';
  return 'bg-red-200 dark:bg-red-900/60';
}

function cellText(entry: HeadToHeadEntry | null, isDiag: boolean): string {
  if (isDiag) return '\u2014';
  if (!entry || entry.meetings === 0) return '\u2013';
  return `${entry.wins}-${entry.losses}`;
}

export function HeadToHeadMatrix({ matrix }: Props) {
  const { t } = useTranslation();
  const [sortMode, setSortMode] = useState<SortMode>('meetings');
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const { players: rawPlayers, matrix: rawMatrix } = matrix;

  // Sort order
  const sortedIndices = useMemo(() => {
    const indices = rawPlayers.map((_, i) => i);
    if (sortMode === 'alpha') {
      indices.sort((a, b) => rawPlayers[a]!.localeCompare(rawPlayers[b]!));
    }
    // 'meetings' keeps the original order (already sorted by total meetings)
    return indices;
  }, [rawPlayers, sortMode]);

  const players = sortedIndices.map((i) => rawPlayers[i]!);
  const reorderedMatrix = sortedIndices.map((i) =>
    sortedIndices.map((j) => rawMatrix[i]![j]!),
  );

  if (rawPlayers.length === 0) {
    return (
      <div className="bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/40 rounded-xl p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('league.h2h.noData')}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden">
      {/* Header row with sort toggle */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700/40">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('league.h2h.title')}</h3>
        <button
          onClick={() => setSortMode((m) => (m === 'meetings' ? 'alpha' : 'meetings'))}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors px-2 py-1 rounded"
          aria-label={sortMode === 'meetings' ? t('league.h2h.sortAlpha') : t('league.h2h.sortMeetings')}
        >
          {sortMode === 'meetings' ? 'A\u2193' : '#\u2193'}
        </button>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse w-full" role="grid" aria-label={t('league.h2h.title')}>
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-white dark:bg-gray-900 px-2 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400 border-b border-r border-gray-200 dark:border-gray-700/40 min-w-[80px]">
                {/* empty corner */}
              </th>
              {players.map((name, j) => (
                <th
                  key={j}
                  className="px-1.5 py-1.5 text-center font-medium text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700/40 min-w-[48px] max-w-[64px]"
                  title={name}
                >
                  <span className="block truncate text-2xs">{name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((rowName, i) => (
              <tr key={i}>
                <td
                  className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-2 py-1 font-medium text-gray-700 dark:text-gray-200 border-r border-b border-gray-200 dark:border-gray-700/40 max-w-[100px]"
                  title={rowName}
                >
                  <span className="block truncate">{rowName}</span>
                </td>
                {reorderedMatrix[i]!.map((entry, j) => {
                  const isDiag = i === j;
                  const isHovered = hoveredCell?.row === i && hoveredCell?.col === j;
                  return (
                    <td
                      key={j}
                      className={`px-1 py-1 text-center border-b border-gray-200/60 dark:border-gray-700/30 tabular-nums transition-colors ${cellBg(entry, isDiag)} ${
                        isHovered && !isDiag ? 'ring-1 ring-inset ring-gray-400 dark:ring-gray-500' : ''
                      }`}
                      onMouseEnter={() => !isDiag && setHoveredCell({ row: i, col: j })}
                      onMouseLeave={() => setHoveredCell(null)}
                      title={
                        isDiag
                          ? undefined
                          : entry && entry.meetings > 0
                            ? `${rowName} vs ${players[j]}: ${entry.wins}W ${entry.losses}L (${entry.meetings} ${t('league.h2h.encounters')}) \u2013 ${t('league.h2h.winRate')}: ${entry.winRate !== null ? `${Math.round(entry.winRate * 100)}%` : '-'}`
                            : `${rowName} vs ${players[j]}: ${t('league.h2h.noData')}`
                      }
                    >
                      <span className={`${isDiag ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
                        {cellText(entry, isDiag)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 px-4 py-2 border-t border-gray-200 dark:border-gray-700/40 text-2xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-200 dark:bg-green-900/60" /> {t('league.h2h.wins')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-200 dark:bg-red-900/60" /> {t('league.h2h.losses')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-gray-200 dark:bg-gray-700" /> \u2014
        </span>
        <span>W-L</span>
      </div>
    </div>
  );
}
