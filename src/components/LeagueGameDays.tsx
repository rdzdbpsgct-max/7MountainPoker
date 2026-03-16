import { useState, useCallback } from 'react';
import type { GameDay } from '../domain/types';
import { deleteGameDay } from '../domain/logic';
import { useTranslation } from '../i18n';
import { ChevronIcon } from './ChevronIcon';

interface Props {
  gameDays: GameDay[];
  onStartGameDay: () => void;
  onRefresh: () => void;
  onManualEntry?: () => void;
  onEditGameDay?: (gameDay: GameDay) => void;
  currencySymbol: string;
}

export function LeagueGameDays({ gameDays, onStartGameDay, onRefresh, onManualEntry, onEditGameDay, currencySymbol }: Props) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sort game days by date (newest first)
  const sorted = [...gameDays].sort((a, b) => b.date.localeCompare(a.date));

  const handleDelete = useCallback((id: string) => {
    deleteGameDay(id);
    onRefresh();
    setConfirmDeleteId(null);
  }, [onRefresh]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('league.gameDays.title')}</h3>
        <div className="flex items-center gap-2">
          {onManualEntry && (
            <button
              onClick={onManualEntry}
              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-all duration-200 border border-gray-200 dark:border-gray-600/30"
            >
              📝 {t('league.editor.manual')}
            </button>
          )}
          <button
            onClick={onStartGameDay}
            className="px-3 py-1.5 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-md active:scale-[0.97]"
            style={{ background: 'linear-gradient(to bottom, var(--accent-600), var(--accent-700))' }}
          >
            {t('league.gameDays.startNew')}
          </button>
        </div>
      </div>

      {/* Game Day List */}
      {sorted.length === 0 ? (
        <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">{t('league.gameDays.noGameDays')}</p>
          <button
            onClick={onStartGameDay}
            className="px-4 py-2 text-white rounded-lg font-medium"
            style={{ background: 'linear-gradient(to bottom, var(--accent-600), var(--accent-700))' }}
          >
            {t('league.gameDays.startFirst')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((gd) => {
            const isExpanded = expandedId === gd.id;
            const winner = gd.participants.find((p) => p.place === 1);

            return (
              <div
                key={gd.id}
                className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700/40 shadow-sm overflow-hidden"
              >
                {/* Game Day Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : gd.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <ChevronIcon open={isExpanded} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {gd.label ?? formatDate(gd.date)}
                        </span>
                        {gd.label && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatDate(gd.date)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <span>{gd.participants.length} {t('league.gameDays.participants')}</span>
                        {winner && <span>🏆 {winner.name}</span>}
                        {gd.venue && <span>📍 {gd.venue}</span>}
                        <span>{gd.totalPrizePool.toFixed(0)} {currencySymbol} {t('league.gameDays.prizePool')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {gd.cashBalance !== 0 && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        gd.cashBalance > 0
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {gd.cashBalance > 0 ? '+' : ''}{gd.cashBalance.toFixed(0)} {currencySymbol}
                      </span>
                    )}
                  </div>
                </button>

                {/* Expanded: Participant Table */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700/40">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700/40">
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">#</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.standings.name')}</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.standings.points')}</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.standings.payout')}</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.standings.balance')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...gd.participants].sort((a, b) => a.place - b.place).map((p) => (
                            <tr key={p.name} className="border-b border-gray-100 dark:border-gray-700/20">
                              <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">
                                {p.place === 1 ? '🏆' : p.place === 2 ? '🥈' : p.place === 3 ? '🥉' : `${p.place}.`}
                              </td>
                              <td className="px-3 py-1.5 font-medium text-gray-900 dark:text-white">
                                {p.name}
                                {p.isGuest && <span className="ml-1 text-xs text-gray-400">(G)</span>}
                              </td>
                              <td className="px-3 py-1.5" style={{ color: 'var(--accent-text)' }}>{p.points}</td>
                              <td className="px-3 py-1.5 text-gray-600 dark:text-gray-300">{p.payout.toFixed(0)} {currencySymbol}</td>
                              <td className={`px-3 py-1.5 font-medium ${p.netBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {p.netBalance >= 0 ? '+' : ''}{p.netBalance.toFixed(0)} {currencySymbol}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Notes & Actions */}
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/60">
                      {gd.notes && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 italic">{gd.notes}</span>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        {onEditGameDay && (
                          <button
                            onClick={() => onEditGameDay(gd)}
                            className="text-xs px-2 py-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                          >
                            {t('league.gameDays.edit')}
                          </button>
                        )}
                        {confirmDeleteId === gd.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(gd.id)}
                              className="text-xs px-2 py-1 text-red-600 dark:text-red-400 font-medium"
                            >
                              {t('league.view.confirmDelete')}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs px-2 py-1 text-gray-400"
                            >
                              {t('league.view.cancel')}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(gd.id)}
                            className="text-xs px-2 py-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            {t('league.gameDays.delete')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
