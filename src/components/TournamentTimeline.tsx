import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { TournamentEvent, TournamentEventType, Level } from '../domain/types';
import { formatTime, getLevelLabel } from '../domain/logic';
import { useTranslation } from '../i18n';
import { useDialogA11y } from '../hooks/useDialogA11y';

interface Props {
  onClose: () => void;
  events: TournamentEvent[];
  levels: Level[];
  tournamentName: string;
}

const EVENT_ICONS: Record<TournamentEventType, string> = {
  tournament_started: '🎯',
  tournament_finished: '🏆',
  level_start: '⏫',
  level_skip_forward: '⏩',
  level_skip_backward: '⏪',
  timer_paused: '⏸️',
  timer_resumed: '▶️',
  player_eliminated: '💀',
  player_reinstated: '🔄',
  rebuy_taken: '💰',
  addon_taken: '➕',
  late_registration: '🚪',
  re_entry: '🔁',
  dealer_advanced: '🎲',
  table_move: '🔀',
  table_dissolved: '🗑️',
  call_the_clock_started: '⏱️',
  call_the_clock_expired: '⚠️',
  break_extended: '☕',
  break_skipped: '⏭️',
  deal_accepted: '🤝',
};

const EVENT_COLORS: Record<string, string> = {
  player_eliminated: 'border-red-500/60',
  player_reinstated: 'border-blue-500/60',
  rebuy_taken: 'border-green-500/60',
  addon_taken: 'border-green-500/60',
  tournament_started: 'border-emerald-500/60',
  tournament_finished: 'border-amber-500/60',
  level_start: 'border-purple-500/60',
  table_move: 'border-cyan-500/60',
  table_dissolved: 'border-orange-500/60',
};

type FilterCategory = 'all' | 'players' | 'timer' | 'tables';

const FILTER_EVENT_TYPES: Record<FilterCategory, TournamentEventType[] | null> = {
  all: null,
  players: ['player_eliminated', 'player_reinstated', 'rebuy_taken', 'addon_taken', 'late_registration', 're_entry'],
  timer: ['level_start', 'level_skip_forward', 'level_skip_backward', 'timer_paused', 'timer_resumed', 'tournament_started', 'tournament_finished', 'break_extended', 'break_skipped'],
  tables: ['table_move', 'table_dissolved', 'dealer_advanced'],
};

export function TournamentTimeline({ onClose, events, levels, tournamentName }: Props) {
  const { t } = useTranslation();
  const dialogRef = useDialogA11y(onClose);
  const [filter, setFilter] = useState<FilterCategory>('all');

  const filteredEvents = useMemo(() => {
    const types = FILTER_EVENT_TYPES[filter];
    const filtered = types ? events.filter((e) => types.includes(e.type)) : events;
    return [...filtered].sort((a, b) => a.timestamp - b.timestamp);
  }, [events, filter]);

  const startTime = events.length > 0 ? Math.min(...events.map((e) => e.timestamp)) : 0;

  function getEventDescription(event: TournamentEvent): string {
    const data = event.data as Record<string, string | number>;
    switch (event.type) {
      case 'tournament_started': return t('timeline.event.started');
      case 'tournament_finished': return t('timeline.event.finished');
      case 'player_eliminated': return t('timeline.event.eliminated', { name: String(data.playerName ?? '') });
      case 'player_reinstated': return t('timeline.event.reinstated', { name: String(data.playerName ?? '') });
      case 'rebuy_taken': return t('timeline.event.rebuy', { name: String(data.playerName ?? '') });
      case 'addon_taken': return t('timeline.event.addon', { name: String(data.playerName ?? '') });
      case 'late_registration': return t('timeline.event.lateReg', { name: String(data.playerName ?? '') });
      case 're_entry': return t('timeline.event.reEntry', { name: String(data.playerName ?? '') });
      case 'level_start': {
        const lvl = levels[event.levelIndex];
        return t('timeline.event.levelStart', { level: lvl ? String(getLevelLabel(lvl, event.levelIndex, levels, t)) : `#${event.levelIndex + 1}` });
      }
      case 'level_skip_forward': return t('timeline.event.levelSkip');
      case 'level_skip_backward': return t('timeline.event.levelBack');
      case 'timer_paused': return t('timeline.event.paused');
      case 'timer_resumed': return t('timeline.event.resumed');
      case 'table_move': return t('timeline.event.tableMove', { name: String(data.playerName ?? '') });
      case 'table_dissolved': return t('timeline.event.tableDissolved');
      case 'dealer_advanced': return t('timeline.event.dealerAdvanced');
      case 'call_the_clock_started': return t('timeline.event.clockStarted');
      case 'call_the_clock_expired': return t('timeline.event.clockExpired');
      case 'break_extended': return t('timeline.event.breakExtended');
      case 'break_skipped': return t('timeline.event.breakSkipped');
      default: return event.type;
    }
  }

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('timeline.title')}
        className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/40 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700/40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('timeline.title')}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{tournamentName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={t('timeline.close')}
          >
            ✕
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-5 py-3 border-b border-gray-200 dark:border-gray-700/40">
          {(['all', 'players', 'timer', 'tables'] as FilterCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === cat
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {t(`timeline.filter.${cat}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {filteredEvents.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">{t('timeline.empty')}</p>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700/40" />

              <div className="space-y-3">
                {filteredEvents.map((event) => {
                  const elapsed = startTime > 0 ? Math.max(0, Math.floor((event.timestamp - startTime) / 1000)) : 0;
                  const colorClass = EVENT_COLORS[event.type] ?? 'border-gray-400/60';

                  return (
                    <div key={event.id} className="relative flex items-start gap-3 pl-2">
                      {/* Icon dot */}
                      <div className={`relative z-10 w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-gray-900 border-2 ${colorClass} text-xs`}>
                        {EVENT_ICONS[event.type] ?? '•'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-1">
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {getEventDescription(event)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(elapsed)} · {levels[event.levelIndex] ? getLevelLabel(levels[event.levelIndex]!, event.levelIndex, levels, t) : `#${event.levelIndex + 1}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700/40 text-xs text-gray-500 dark:text-gray-400">
          {t('timeline.eventCount', { n: filteredEvents.length })}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
