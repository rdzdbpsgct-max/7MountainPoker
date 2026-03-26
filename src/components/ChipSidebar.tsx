import { useState, memo } from 'react';
import type { ChipConfig, ChipDenomination, Level } from '../domain/types';
import { getRemovedDenomIds, getNextColorUpLevel } from '../domain/logic';
import { useTranslation } from '../i18n';
import { ChevronIcon } from './ChevronIcon';

interface Props {
  chipConfig: ChipConfig;
  colorUpMap: Map<number, ChipDenomination[]>;
  currentLevelIndex: number;
  levels: Level[];
}

export const ChipSidebar = memo(function ChipSidebar({ chipConfig, colorUpMap, currentLevelIndex, levels }: Props) {
  const { t } = useTranslation();
  const hasUpcomingColorUp = (() => {
    for (let i = currentLevelIndex; i <= currentLevelIndex + 3; i++) {
      if (colorUpMap.has(i)) return true;
    }
    return false;
  })();

  const [collapsed, setCollapsed] = useState(!hasUpcomingColorUp);

  const removedIds = getRemovedDenomIds(colorUpMap, currentLevelIndex);
  const nextColorUpLevel = getNextColorUpLevel(colorUpMap, currentLevelIndex);

  const sorted = [...chipConfig.denominations].sort((a, b) => a.value - b.value);

  return (
    <div>
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center justify-between w-full text-left group"
      >
        <h3 className="text-2xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
          {t('chipSidebar.title')}
        </h3>
        <ChevronIcon open={!collapsed} className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
      </button>

      {!collapsed && (
        <div className="mt-2 space-y-0.5">
          {sorted.map((denom) => {
            const isRemoved = removedIds.has(denom.id);
            return (
              <div
                key={denom.id}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all ${
                  isRemoved ? 'opacity-30' : 'hover:bg-gray-100/60 dark:hover:bg-gray-800/30'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full shrink-0 shadow-sm ${isRemoved ? 'scale-75' : ''}`}
                  style={{ backgroundColor: denom.color, border: `2px solid color-mix(in srgb, ${denom.color} 60%, white)` }}
                />
                <span
                  className={`flex-1 ${
                    isRemoved ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {denom.label}
                </span>
                <span
                  className={`font-mono text-xs tabular-nums ${
                    isRemoved ? 'line-through text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {denom.value.toLocaleString()}
                </span>
              </div>
            );
          })}

          {/* Next color-up info (only when color-up is enabled) */}
          {chipConfig.colorUpEnabled && (
            <div className="pt-2 mt-2 border-t border-gray-200/60 dark:border-gray-700/30">
              {nextColorUpLevel !== null ? (
                <div className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400/80 border border-amber-200/60 dark:border-amber-700/30">
                  <span className="font-semibold">{t('chipSidebar.nextColorUp')}: </span>
                  {(() => {
                    const targetLevel = levels[nextColorUpLevel];
                    const isBreak = targetLevel?.type === 'break';
                    const playLevelNumber = levels
                      .slice(0, nextColorUpLevel + 1)
                      .filter((l) => l.type === 'level').length;
                    const denoms = colorUpMap.get(nextColorUpLevel) ?? [];
                    return (
                      <span>
                        {isBreak
                          ? t('chipSidebar.atBreak', { level: playLevelNumber })
                          : t('chipSidebar.atLevel', { level: playLevelNumber })}
                        {' ('}
                        {denoms.map((d) => d.label).join(', ')}
                        {')'}
                      </span>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 px-2.5">{t('chipSidebar.noMore')}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
