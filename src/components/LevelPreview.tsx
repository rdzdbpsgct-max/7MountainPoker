import { memo } from 'react';
import type { Level, TimerState } from '../domain/types';
import { getLevelLabel, getBlindsText, formatTime } from '../domain/logic';
import { useTranslation } from '../i18n';

interface Props {
  timerState: TimerState;
  levels: Level[];
}

export const LevelPreview = memo(function LevelPreview({ timerState, levels }: Props) {
  const { t } = useTranslation();
  const nextIndex = timerState.currentLevelIndex + 1;

  // Show current level + next 3
  const visibleLevels = levels
    .map((level, i) => ({ level, i }))
    .filter(({ i }) => i >= timerState.currentLevelIndex && i <= timerState.currentLevelIndex + 3);

  return (
    <div className="w-full max-w-xl">
      <h3 className="text-2xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{t('levelPreview.title')}</h3>
      <div className="space-y-0.5">
        {visibleLevels.map(({ level, i }) => {
          const isCurrent = i === timerState.currentLevelIndex;
          const isNext = i === nextIndex;

          return (
            <div
              key={level.id}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                isCurrent
                  ? 'dark:text-white shadow-sm font-medium'
                  : isNext
                  ? 'bg-gray-100/80 dark:bg-gray-800/40 text-gray-800 dark:text-gray-200'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/20'
              }`}
              style={isCurrent ? { backgroundColor: 'color-mix(in srgb, var(--accent-500) 12%, transparent)', borderLeft: '2px solid var(--accent-500)' } : isNext ? { borderLeft: '2px solid color-mix(in srgb, var(--accent-500) 30%, transparent)' } : { borderLeft: '2px solid transparent' }}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="truncate">{getLevelLabel(level, i, levels)}</span>
                {level.type === 'level' && (
                  <span className={`text-xs shrink-0 ${isCurrent ? 'opacity-70' : 'text-gray-400 dark:text-gray-500'}`}>{getBlindsText(level)}</span>
                )}
              </span>
              <span className={`font-mono text-xs shrink-0 ml-2 ${isCurrent ? 'opacity-70' : 'text-gray-400 dark:text-gray-500'}`}>
                {formatTime(level.durationSeconds)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}, (prev, next) =>
  prev.timerState.currentLevelIndex === next.timerState.currentLevelIndex &&
  prev.levels === next.levels
);
