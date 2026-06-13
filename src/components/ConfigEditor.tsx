import { useState, useRef } from 'react';
import type { Level, TournamentConfig } from '../domain/types';
import { generateId, validateConfig, formatTime } from '../domain/logic';
import { useTranslation } from '../i18n';
import { NumberStepper } from './NumberStepper';

interface Props {
  config: TournamentConfig;
  onChange: (config: TournamentConfig) => void;
  anteEnabled: boolean;
}

export function ConfigEditor({ config, onChange, anteEnabled }: Props) {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<string[]>([]);
  const firstLevelMinutes = Math.round(
    (config.levels.find((l) => l.type === 'level')?.durationSeconds ?? 600) / 60,
  );
  const [globalMinutes, setGlobalMinutes] = useState(firstLevelMinutes);

  const firstBreakMinutes = Math.round(
    (config.levels.find((l) => l.type === 'break')?.durationSeconds ?? 600) / 60,
  );
  const [globalBreakMinutes, setGlobalBreakMinutes] = useState(firstBreakMinutes);

  // Sync global inputs when levels change externally (e.g. preset switch).
  // Render-phase state adjustment per https://react.dev/learn/you-might-not-need-an-effect
  const [prevFirstLevelMinutes, setPrevFirstLevelMinutes] = useState(firstLevelMinutes);
  if (prevFirstLevelMinutes !== firstLevelMinutes) {
    setPrevFirstLevelMinutes(firstLevelMinutes);
    setGlobalMinutes(firstLevelMinutes);
  }
  const [prevFirstBreakMinutes, setPrevFirstBreakMinutes] = useState(firstBreakMinutes);
  if (prevFirstBreakMinutes !== firstBreakMinutes) {
    setPrevFirstBreakMinutes(firstBreakMinutes);
    setGlobalBreakMinutes(firstBreakMinutes);
  }

  const applyGlobalDuration = () => {
    const seconds = Math.max(60, globalMinutes * 60);
    const newLevels = config.levels.map((l) =>
      l.type === 'level' ? { ...l, durationSeconds: seconds } : l,
    );
    onChange({ ...config, levels: newLevels });
  };

  const applyGlobalBreakDuration = () => {
    const seconds = Math.max(60, globalBreakMinutes * 60);
    const newLevels = config.levels.map((l) =>
      l.type === 'break' ? { ...l, durationSeconds: seconds } : l,
    );
    onChange({ ...config, levels: newLevels });
  };

  const updateLevel = (index: number, partial: Partial<Level>) => {
    const newLevels = config.levels.map((l, i) =>
      i === index ? { ...l, ...partial } : l,
    );
    const newConfig = { ...config, levels: newLevels };
    onChange(newConfig);
    setErrors(validateConfig(newConfig).map((e) => e.message));
  };

  const addLevel = () => {
    const last = config.levels[config.levels.length - 1];
    const newLevel: Level = {
      id: generateId(),
      type: 'level',
      durationSeconds: last?.durationSeconds ?? 900,
      smallBlind: last?.bigBlind ?? 50,
      bigBlind: (last?.bigBlind ?? 50) * 2,
      ante: last?.ante ?? 0,
    };
    onChange({ ...config, levels: [...config.levels, newLevel] });
  };

  const addBreak = () => {
    const newBreak: Level = {
      id: generateId(),
      type: 'break',
      durationSeconds: 600,
      label: t('logic.defaultBreakLabel'),
    };
    onChange({ ...config, levels: [...config.levels, newBreak] });
  };

  const duplicateLevel = (index: number) => {
    const dup: Level = { ...config.levels[index]!, id: generateId() };
    const newLevels = [...config.levels];
    newLevels.splice(index + 1, 0, dup);
    onChange({ ...config, levels: newLevels });
  };

  const removeLevel = (index: number) => {
    if (config.levels.length <= 1) return;
    onChange({ ...config, levels: config.levels.filter((_, i) => i !== index) });
  };

  const moveLevel = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= config.levels.length) return;
    const newLevels = [...config.levels];
    [newLevels[index], newLevels[newIndex]] = [newLevels[newIndex]!, newLevels[index]!];
    onChange({ ...config, levels: newLevels });
  };

  // --- Drag & Drop reordering ---
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const dragStartY = useRef(0);
  const rowHeight = useRef(0);

  function reorderLevel(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const newLevels = [...config.levels];
    const [moved] = newLevels.splice(fromIndex, 1);
    newLevels.splice(toIndex, 0, moved!);
    onChange({ ...config, levels: newLevels });
  }

  function handleDragStart(e: React.PointerEvent, index: number) {
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    setDragIndex(index);
    dragStartY.current = e.clientY;
    const row = el.closest('[data-level-row]');
    rowHeight.current = row?.getBoundingClientRect().height || 48;
  }

  function handleDragMove(e: React.PointerEvent) {
    if (dragIndex === null) return;
    const delta = e.clientY - dragStartY.current;
    const offset = Math.round(delta / (rowHeight.current || 48));
    const target = Math.max(0, Math.min(config.levels.length - 1, dragIndex + offset));
    setDropTarget(target);
  }

  function handleDragEnd() {
    if (dragIndex !== null && dropTarget !== null && dragIndex !== dropTarget) {
      reorderLevel(dragIndex, dropTarget);
    }
    setDragIndex(null);
    setDropTarget(null);
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700/60 rounded-lg p-3">
          {errors.map((e, i) => (
            <p key={i} className="text-red-700 dark:text-red-400 text-xs">{e}</p>
          ))}
        </div>
      )}

      {/* Global duration controls */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-lg">
          <label className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{t('config.allLevels')}</label>
          <NumberStepper
            value={globalMinutes}
            onChange={(v) => setGlobalMinutes(Math.max(1, v))}
            min={1}
            step={1}
            inputClassName="w-16"
          />
          <span className="text-gray-400 dark:text-gray-500 text-xs">{t('config.min')}</span>
          <button
            onClick={applyGlobalDuration}
            className="px-3 py-1.5 bg-accent-800 text-white rounded text-xs font-medium transition-colors"
          >
            {t('config.apply')}
          </button>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/40 rounded-lg">
          <label className="text-amber-600 dark:text-amber-400/70 text-xs whitespace-nowrap">{t('config.allBreaks')}</label>
          <NumberStepper
            value={globalBreakMinutes}
            onChange={(v) => setGlobalBreakMinutes(Math.max(1, v))}
            min={1}
            step={1}
            inputClassName="w-16"
          />
          <span className="text-gray-400 dark:text-gray-500 text-xs">{t('config.min')}</span>
          <button
            onClick={applyGlobalBreakDuration}
            className="px-3 py-1.5 bg-amber-800 hover:bg-amber-700 text-amber-200 rounded text-xs font-medium transition-colors"
          >
            {t('config.apply')}
          </button>
        </div>
      </div>

      {/* Levels */}
      <div className="space-y-2">
        {config.levels.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
            {t('config.emptyLevels')}
          </div>
        )}
        {config.levels.map((level, i) => (
          <div key={level.id}>
            {/* Drop indicator line */}
            {dropTarget === i && dragIndex !== null && dragIndex !== i && (
              <div className="h-0.5 -my-0.5 rounded-full" style={{ background: 'var(--accent-500)' }} />
            )}
            <div
              data-level-row
              className={`flex flex-wrap items-center gap-2 p-3 rounded-lg border hover:bg-gray-200/30 dark:hover:bg-gray-800/30 transition-colors ${
                level.type === 'break'
                  ? 'bg-amber-50 dark:bg-amber-900/15 border-amber-300 dark:border-amber-800/60'
                  : 'bg-gray-100/80 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700/40'
              }${dragIndex === i ? ' opacity-50' : ''}`}
            >
              {/* Drag grip handle */}
              <span
                className="cursor-grab active:cursor-grabbing touch-none text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 select-none px-1 flex items-center"
                onPointerDown={(e) => handleDragStart(e, i)}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerCancel={handleDragEnd}
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="5" cy="3" r="1.5"/>
                  <circle cx="11" cy="3" r="1.5"/>
                  <circle cx="5" cy="8" r="1.5"/>
                  <circle cx="11" cy="8" r="1.5"/>
                  <circle cx="5" cy="13" r="1.5"/>
                  <circle cx="11" cy="13" r="1.5"/>
                </svg>
              </span>

              {/* Index */}
              <span className="text-gray-400 dark:text-gray-500 text-xs w-6 text-center">{i + 1}</span>

            {/* Type badge */}
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                level.type === 'break'
                  ? 'bg-amber-800 text-amber-200'
                  : 'text-white'
              }`}
              style={level.type !== 'break' ? { backgroundColor: 'color-mix(in srgb, var(--accent-700) 80%, black)' } : undefined}
            >
              {level.type === 'break' ? t('config.break') : t('config.level')}
            </span>

            {/* Duration */}
            <div className="flex items-center gap-1">
              <label className="text-gray-400 dark:text-gray-500 text-xs">{t('config.min')}:</label>
              <NumberStepper
                value={Math.round(level.durationSeconds / 60)}
                onChange={(v) =>
                  updateLevel(i, { durationSeconds: Math.max(60, v * 60) })
                }
                min={1}
                step={1}
                inputClassName="w-16"
              />
              <span className="text-gray-300 dark:text-gray-600 text-xs font-mono">{formatTime(level.durationSeconds)}</span>
            </div>

            {/* Blinds (only for level type) */}
            {level.type === 'level' && (
              <>
                <div className="flex items-center gap-1">
                  <label className="text-gray-400 dark:text-gray-500 text-xs">SB:</label>
                  <NumberStepper
                    value={level.smallBlind ?? 0}
                    onChange={(v) => updateLevel(i, { smallBlind: v })}
                    min={1}
                    step={1}
                    inputClassName="w-20"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-gray-400 dark:text-gray-500 text-xs">BB:</label>
                  <NumberStepper
                    value={level.bigBlind ?? 0}
                    onChange={(v) => updateLevel(i, { bigBlind: v })}
                    min={1}
                    step={1}
                    inputClassName="w-20"
                  />
                </div>
                {anteEnabled && (
                  <div className="flex items-center gap-1">
                    <label className="text-gray-400 dark:text-gray-500 text-xs">{t('timer.ante')}:</label>
                    <NumberStepper
                      value={level.ante ?? 0}
                      onChange={(v) => updateLevel(i, { ante: v })}
                      min={0}
                      step={1}
                      inputClassName="w-20"
                    />
                  </div>
                )}
              </>
            )}

            {/* Break label */}
            {level.type === 'break' && (
              <div className="flex items-center gap-1">
                <label className="text-gray-400 dark:text-gray-500 text-xs">{t('config.label')}</label>
                <input
                  type="text"
                  value={level.label ?? t('logic.defaultBreakLabel')}
                  onChange={(e) => updateLevel(i, { label: e.target.value })}
                  className="w-24 px-2 py-1 bg-white dark:bg-gray-900/80 border border-gray-300 dark:border-gray-600/60 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-ring)] transition-all duration-200"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => moveLevel(i, -1)}
                disabled={i === 0}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 text-xs"
                title={t('config.moveUp')}
                aria-label={t('accessibility.moveUp')}
              >
                ▲
              </button>
              <button
                onClick={() => moveLevel(i, 1)}
                disabled={i === config.levels.length - 1}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 text-xs"
                title={t('config.moveDown')}
                aria-label={t('accessibility.moveDown')}
              >
                ▼
              </button>
              <button
                onClick={() => duplicateLevel(i)}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-400 text-xs"
                title={t('config.duplicate')}
                aria-label={t('config.duplicate')}
              >
                ⧉
              </button>
              <button
                onClick={() => removeLevel(i)}
                disabled={config.levels.length <= 1}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-400 disabled:opacity-30 text-xs"
                title={t('config.delete')}
                aria-label={t('accessibility.delete')}
              >
                ✕
              </button>
            </div>
          </div>
          </div>
        ))}
      </div>

      {/* Add buttons */}
      <div className="flex gap-2">
        <button
          onClick={addLevel}
          className="px-4 py-2 bg-accent-800 text-white rounded-lg text-sm font-medium transition-all duration-200"
        >
          {t('config.addLevel')}
        </button>
        <button
          onClick={addBreak}
          className="px-4 py-2 bg-amber-800/80 hover:bg-amber-700 text-amber-200 rounded-lg text-sm font-medium transition-all duration-200 border border-amber-700/30"
        >
          {t('config.addBreak')}
        </button>
      </div>
    </div>
  );
}
