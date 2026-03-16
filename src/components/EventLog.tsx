import { useState, useMemo, useCallback } from 'react';
import type { TournamentEvent, Player } from '../domain/types';
import { formatEventAsText } from '../domain/logic';
import { useTranslation } from '../i18n';
import { showToast } from '../domain/toast';

type Filter = 'all' | 'players' | 'timer';

const PLAYER_EVENT_TYPES = new Set([
  'player_eliminated', 'rebuy_taken', 'addon_taken',
  'player_reinstated', 'late_registration', 're_entry',
]);

const TIMER_EVENT_TYPES = new Set([
  'level_start', 'timer_paused', 'timer_resumed',
  'break_extended', 'break_skipped', 'level_skip_forward', 'level_skip_backward',
  'tournament_started', 'tournament_finished',
]);

interface Props {
  events: TournamentEvent[];
  players: Player[];
  onClose: () => void;
  tournamentStartTime?: number;
}

export function EventLog({ events, players, onClose, tournamentStartTime }: Props) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');

  const playerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of players) {
      map[p.id] = p.name;
    }
    return map;
  }, [players]);

  const filteredEvents = useMemo(() => {
    const sorted = [...events].reverse(); // newest first
    if (filter === 'all') return sorted;
    if (filter === 'players') return sorted.filter(e => PLAYER_EVENT_TYPES.has(e.type));
    return sorted.filter(e => TIMER_EVENT_TYPES.has(e.type));
  }, [events, filter]);

  const formatRelativeTime = useCallback((timestamp: number) => {
    const ref = tournamentStartTime ?? (events.length > 0 ? events[0].timestamp : Date.now());
    const diffSec = Math.round((timestamp - ref) / 1000);
    if (diffSec < 60) return t('eventLog.agoSeconds', { n: Math.max(0, diffSec) });
    return t('eventLog.agoMinutes', { n: Math.round(diffSec / 60) });
  }, [tournamentStartTime, events, t]);

  const handleCopyText = useCallback(() => {
    const text = [...events]
      .map(e => formatEventAsText(e, playerNameMap, t))
      .join('\n');
    navigator.clipboard.writeText(text).then(
      () => showToast(t('eventLog.copied')),
      () => showToast('Copy failed'),
    );
  }, [events, playerNameMap, t]);

  const filterClasses = (active: boolean) =>
    active
      ? 'text-white font-semibold'
      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
         onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-lg max-h-[85vh] bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col animate-scale-in overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700/40">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            📋 {t('eventLog.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('eventLog.close')}
          >
            ✕
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex gap-1 px-5 py-3 border-b border-gray-100 dark:border-gray-800/40">
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700/60 text-sm">
            {(['all', 'players', 'timer'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 transition-colors ${filterClasses(filter === f)}`}
                style={filter === f ? { backgroundColor: 'var(--accent-600)' } : undefined}
              >
                {t(`eventLog.${f}`)}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 self-center">
            {filteredEvents.length}
          </span>
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {filteredEvents.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-12 text-sm">
              {t('eventLog.empty')}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {filteredEvents.map(event => (
                <li key={event.id} className="flex items-start gap-3 py-1.5 text-sm border-b border-gray-50 dark:border-gray-800/30 last:border-b-0">
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-mono whitespace-nowrap mt-0.5 min-w-[3.5rem]">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                  <span className="text-gray-800 dark:text-gray-200 leading-snug">
                    {formatEventAsText(event, playerNameMap, t).replace(/^\d{2}:\d{2}:\d{2}\s/, '')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {events.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700/40">
            <button
              onClick={handleCopyText}
              className="w-full py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97] border shadow-sm bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600/40"
            >
              📋 {t('eventLog.copyText')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
