import { memo } from 'react';
import type { RebuyConfig } from '../domain/types';
import { formatTime } from '../domain/logic';
import { useTranslation } from '../i18n';

interface Props {
  active: boolean;
  rebuy: RebuyConfig;
  currentPlayLevel: number;
  elapsedSeconds: number;
}

export const RebuyStatus = memo(function RebuyStatus({ active, rebuy, currentPlayLevel, elapsedSeconds }: Props) {
  const { t } = useTranslation();

  if (!rebuy.enabled) return null;

  if (active) {
    let detail = '';
    let isClosingSoon = false;
    if (rebuy.limitType === 'levels') {
      const levelsLeft = rebuy.levelLimit - currentPlayLevel;
      detail = t('rebuyStatus.untilLevel', { limit: rebuy.levelLimit, current: currentPlayLevel });
      isClosingSoon = levelsLeft <= 1;
    } else {
      const remaining = Math.max(0, rebuy.timeLimit - elapsedSeconds);
      detail = t('rebuyStatus.timeRemaining', { time: formatTime(remaining) });
      isClosingSoon = remaining <= 300; // 5 minutes
    }

    return (
      <div
        className={`px-4 py-2 rounded-xl text-center backdrop-blur-sm shadow-sm ${isClosingSoon ? 'animate-pulse' : ''}`}
        style={{
          backgroundColor: isClosingSoon ? 'color-mix(in srgb, #f59e0b 15%, transparent)' : 'color-mix(in srgb, var(--accent-500) 10%, transparent)',
          border: `1px solid ${isClosingSoon ? 'color-mix(in srgb, #f59e0b 40%, transparent)' : 'color-mix(in srgb, var(--accent-500) 30%, transparent)'}`,
        }}
      >
        <span className="text-sm font-medium" style={{ color: isClosingSoon ? '#d97706' : 'var(--accent-text)' }}>
          {t('rebuyStatus.active')}
        </span>
        <span className="text-xs ml-2" style={{ color: isClosingSoon ? '#b45309' : 'var(--accent-text)' }}>({detail})</span>
      </div>
    );
  }

  return (
    <div className="px-4 py-1.5 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl text-center">
      <span className="text-gray-400 dark:text-gray-500 text-sm">{t('rebuyStatus.ended')}</span>
    </div>
  );
});
