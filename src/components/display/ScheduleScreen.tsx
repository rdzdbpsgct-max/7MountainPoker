import type { Level } from '../../domain/types';
import { getLevelLabel, getBlindsText, formatTime } from '../../domain/logic';
import { useTranslation } from '../../i18n';

interface Props {
  levels: Level[];
  currentLevelIndex: number;
}

export function ScheduleScreen({ levels, currentLevelIndex }: Props) {
  const { t } = useTranslation();
  const visibleCount = 8;
  const start = Math.max(0, currentLevelIndex - 1);
  const end = Math.min(levels.length, start + visibleCount);
  const visible = levels.slice(start, end);

  return (
    <div className="w-full max-w-4xl mx-auto h-full flex flex-col">
      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
        {t('display.schedule')}
      </h2>
      <table className="w-full flex-1 overflow-hidden">
        <thead className="sr-only">
          <tr>
            <th scope="col">Level</th>
            <th scope="col">Blinds</th>
            <th scope="col">Ante</th>
            <th scope="col">Duration</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((level, vi) => {
            const i = start + vi;
            const isCurrent = i === currentLevelIndex;
            const isPast = i < currentLevelIndex;
            const levelLabel = getLevelLabel(level, i, levels);

            return (
              <tr
                key={level.id}
                className={`text-sm sm:text-base transition-all ${
                  isCurrent
                    ? level.type === 'break'
                      ? 'bg-amber-900/40 text-amber-200'
                      : 'text-white'
                    : isPast
                    ? 'bg-gray-900/30 text-gray-600 line-through'
                    : level.type === 'break'
                    ? 'bg-amber-950/20 text-amber-400/70'
                    : 'bg-gray-900/40 text-gray-400'
                }`}
              >
                <td
                  className={`px-4 py-1.5 rounded-l-lg border-l border-y ${
                    isCurrent
                      ? level.type === 'break'
                        ? 'border-amber-500/70 shadow-lg shadow-amber-900/20'
                        : 'border shadow-lg'
                      : isPast
                      ? 'border-transparent'
                      : level.type === 'break'
                      ? 'border-amber-800/30'
                      : 'border-gray-800/40'
                  }`}
                  style={isCurrent && level.type !== 'break' ? {
                    backgroundColor: 'color-mix(in srgb, var(--accent-600) 25%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--accent-500) 70%, transparent)',
                    boxShadow: `0 10px 15px -3px var(--accent-900)`,
                  } : undefined}
                >
                  <span className="flex items-center gap-2">
                    {isCurrent && <span className="text-base" style={{ color: 'var(--accent-400)' }}>▸</span>}
                    <span className="font-medium">{levelLabel}</span>
                  </span>
                </td>
                <td
                  className={`py-1.5 border-y ${
                    isCurrent
                      ? level.type === 'break'
                        ? 'border-amber-500/70'
                        : 'border'
                      : isPast
                      ? 'border-transparent'
                      : level.type === 'break'
                      ? 'border-amber-800/30'
                      : 'border-gray-800/40'
                  }`}
                  style={isCurrent && level.type !== 'break' ? {
                    backgroundColor: 'color-mix(in srgb, var(--accent-600) 25%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--accent-500) 70%, transparent)',
                  } : undefined}
                >
                  {level.type === 'level' && (
                    <span className={isCurrent ? 'text-gray-300' : 'text-gray-500'}>{getBlindsText(level)}</span>
                  )}
                </td>
                <td
                  className={`py-1.5 border-y ${
                    isCurrent
                      ? level.type === 'break'
                        ? 'border-amber-500/70'
                        : 'border'
                      : isPast
                      ? 'border-transparent'
                      : level.type === 'break'
                      ? 'border-amber-800/30'
                      : 'border-gray-800/40'
                  }`}
                  style={isCurrent && level.type !== 'break' ? {
                    backgroundColor: 'color-mix(in srgb, var(--accent-600) 25%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--accent-500) 70%, transparent)',
                  } : undefined}
                >
                  {level.type === 'level' && level.ante != null && level.ante > 0 && (
                    <span className={`text-xs ${isCurrent ? 'text-gray-400' : 'text-gray-600'}`}>
                      Ante {level.ante}
                    </span>
                  )}
                </td>
                <td
                  className={`px-4 py-1.5 rounded-r-lg border-r border-y text-right ${
                    isCurrent
                      ? level.type === 'break'
                        ? 'border-amber-500/70'
                        : 'border'
                      : isPast
                      ? 'border-transparent'
                      : level.type === 'break'
                      ? 'border-amber-800/30'
                      : 'border-gray-800/40'
                  }`}
                  style={isCurrent && level.type !== 'break' ? {
                    backgroundColor: 'color-mix(in srgb, var(--accent-600) 25%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--accent-500) 70%, transparent)',
                  } : undefined}
                >
                  <span className="font-mono text-xs text-gray-500">{formatTime(level.durationSeconds)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
