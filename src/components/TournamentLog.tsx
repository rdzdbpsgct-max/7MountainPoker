import { useState, useMemo, useCallback } from 'react';
import type { TournamentEvent, Player } from '../domain/types';
import { formatEventAsText } from '../domain/logic';
import { useTranslation } from '../i18n';
import { BottomSheet } from './BottomSheet';

type FilterType = 'all' | 'eliminations' | 'rebuys' | 'levels';

interface Props {
  events: TournamentEvent[];
  players: Player[];
  onClose: () => void;
}

const FILTER_TYPES: { key: FilterType; translationKey: string; matchTypes: string[] }[] = [
  { key: 'all', translationKey: 'log.filter.all', matchTypes: [] },
  { key: 'eliminations', translationKey: 'log.filter.eliminations', matchTypes: ['player_eliminated', 'player_reinstated'] },
  { key: 'rebuys', translationKey: 'log.filter.rebuys', matchTypes: ['rebuy_taken', 'addon_taken', 're_entry'] },
  { key: 'levels', translationKey: 'log.filter.levels', matchTypes: ['level_start', 'level_skip_forward', 'level_skip_backward', 'tournament_started', 'tournament_finished'] },
];

export function TournamentLog({ events, players, onClose }: Props) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterType>('all');
  const [copied, setCopied] = useState(false);

  // Build player name map from player array
  const playerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of players) {
      map[p.id] = p.name;
    }
    return map;
  }, [players]);

  // Filter and reverse events (newest first)
  const filteredEvents = useMemo(() => {
    const filterDef = FILTER_TYPES.find((f) => f.key === filter);
    const matchTypes = filterDef?.matchTypes ?? [];
    const filtered = matchTypes.length === 0
      ? events
      : events.filter((e) => matchTypes.includes(e.type));
    return [...filtered].reverse();
  }, [events, filter]);

  const handleCopy = useCallback(async () => {
    const text = filteredEvents
      .slice()
      .reverse() // Copy in chronological order
      .map((e) => formatEventAsText(e, playerNameMap, t as never))
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  }, [filteredEvents, playerNameMap, t]);

  return (
    <BottomSheet onClose={onClose} ariaLabelledBy="log-title" maxWidth="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700/40">
        <h2 id="log-title" className="text-lg font-bold text-gray-900 dark:text-white">
          {t('log.title' as Parameters<typeof t>[0])}
        </h2>
        <button
          onClick={onClose}
          className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
        >
          {t('log.close' as Parameters<typeof t>[0])}
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 px-5 pt-4 pb-2 flex-wrap">
        {FILTER_TYPES.map(({ key, translationKey }) => {
          const isActive = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700/40'
              }`}
              style={isActive ? { backgroundColor: 'var(--accent-600)', borderColor: 'var(--accent-500)' } : undefined}
            >
              {t(translationKey as Parameters<typeof t>[0])}
            </button>
          );
        })}
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-1">
        {filteredEvents.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">
            {t('log.empty' as Parameters<typeof t>[0])}
          </p>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className="px-3 py-2 bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/40 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-mono"
            >
              {formatEventAsText(event, playerNameMap, t as never)}
            </div>
          ))
        )}
      </div>

      {/* Footer with copy button */}
      {filteredEvents.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700/40 flex justify-end">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
          >
            {copied
              ? t('log.copied' as Parameters<typeof t>[0])
              : t('log.copyText' as Parameters<typeof t>[0])}
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
