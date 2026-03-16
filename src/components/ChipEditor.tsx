import { useState, useMemo } from 'react';
import type { ChipConfig, ChipDenomination, Level, ColorUpEntry } from '../domain/types';
import { NumberStepper } from './NumberStepper';
import {
  generateChipId,
  chipPresets,
  applyChipPreset,
  CHIP_COLORS,
  generateColorUpSuggestion,
  scheduleToColorUpMap,
} from '../domain/logic';
import { useTranslation } from '../i18n';

interface Props {
  chips: ChipConfig;
  onChange: (chips: ChipConfig) => void;
  levels: Level[];
}

/** Sort denominations by value (ascending) and return new config. */
function sortedChipConfig(config: ChipConfig): ChipConfig {
  const sorted = [...config.denominations].sort((a, b) => a.value - b.value);
  // Only create new object if order actually changed
  const changed = sorted.some((d, i) => d.id !== config.denominations[i]!.id);
  return changed ? { ...config, denominations: sorted } : config;
}

export function ChipEditor({ chips, onChange, levels }: Props) {
  const { t, language } = useTranslation();
  const [editingColorId, setEditingColorId] = useState<string | null>(null);

  // Auto-sort wrapper: every change automatically sorts by value
  const emitChange = (config: ChipConfig) => {
    onChange(sortedChipConfig(config));
  };

  const toggle = () => {
    const newEnabled = !chips.enabled;
    if (newEnabled && chips.denominations.length === 0) {
      emitChange(applyChipPreset(chipPresets[1]!));
    } else {
      emitChange({ ...chips, enabled: newEnabled });
    }
  };

  const updateDenomination = (id: string, partial: Partial<ChipDenomination>) => {
    emitChange({
      ...chips,
      denominations: chips.denominations.map((d) =>
        d.id === id ? { ...d, ...partial } : d,
      ),
    });
  };

  const removeDenomination = (id: string) => {
    emitChange({
      ...chips,
      denominations: chips.denominations.filter((d) => d.id !== id),
    });
    if (editingColorId === id) setEditingColorId(null);
  };

  const addDenomination = () => {
    const usedColors = new Set(chips.denominations.map((d) => d.color));
    const available = CHIP_COLORS.find((c) => !usedColors.has(c.hex));
    const color = available ?? CHIP_COLORS[0];
    const maxVal = chips.denominations.reduce((m, d) => Math.max(m, d.value), 0);
    emitChange({
      ...chips,
      denominations: [
        ...chips.denominations,
        {
          id: generateChipId(),
          value: maxVal > 0 ? maxVal * 2 : 25,
          color: color.hex,
          label: language === 'de' ? color.de : color.en,
        },
      ],
    });
  };

  // Detect duplicate colors
  const duplicateColors = useMemo(() => {
    const colorCount = new Map<string, number>();
    for (const d of chips.denominations) {
      colorCount.set(d.color, (colorCount.get(d.color) ?? 0) + 1);
    }
    const dupes = new Set<string>();
    for (const [color, count] of colorCount) {
      if (count > 1) dupes.add(color);
    }
    return dupes;
  }, [chips.denominations]);

  // Display sorted (chips.denominations is already sorted after emitChange, but
  // on first render it may not be — use a sorted view just in case)
  const sorted = [...chips.denominations].sort((a, b) => a.value - b.value);

  const presetKeys = ['4', '5', '6'] as const;

  return (
    <div className="space-y-3">
      <button
        onClick={toggle}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          chips.enabled
            ? 'bg-accent-700 text-white'
            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}
      >
        {chips.enabled ? t('chipEditor.enabled') : t('chipEditor.disabled')}
      </button>

      {chips.enabled && (
        <div className="space-y-3 pl-2 border-l-2" style={{ borderColor: 'var(--accent-700)' }}>
          <p className="text-xs text-gray-400 dark:text-gray-500">{t('chipEditor.description')}</p>

          {/* Preset buttons */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('chipEditor.presets')}
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {chipPresets.map((p, i) => (
                <button
                  key={p.key}
                  onClick={() => emitChange(applyChipPreset(p))}
                  className="flex flex-col items-start px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
                             border border-gray-300 dark:border-gray-700 hover:border-[var(--accent-600)] rounded-lg
                             transition-colors text-left"
                >
                  <span className="text-gray-900 dark:text-white font-medium text-xs">
                    {t(`chipEditor.preset${presetKeys[i]!}` as const)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                    {t(`chipEditor.preset${presetKeys[i]!}Desc` as const)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Duplicate color warning */}
          {duplicateColors.size > 0 && (
            <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/40 rounded-lg">
              <p className="text-amber-700 dark:text-amber-300 text-xs font-medium">
                {t('chipEditor.duplicateColor')}
              </p>
            </div>
          )}

          {/* Denomination list */}
          <div className="space-y-1">
            {sorted.map((denom) => {
              const isDuplicate = duplicateColors.has(denom.color);
              return (
              <div key={denom.id}>
                <div className={`flex items-center gap-2 px-2 py-1.5 bg-gray-100 dark:bg-gray-800/50 rounded-lg ${
                  isDuplicate ? 'ring-1 ring-amber-600/50' : ''
                }`}>
                  {/* Color swatch */}
                  <button
                    onClick={() =>
                      setEditingColorId(editingColorId === denom.id ? null : denom.id)
                    }
                    className={`w-6 h-6 rounded-full border-2 shrink-0 hover:border-gray-500 dark:hover:border-gray-400 transition-colors ${
                      isDuplicate ? 'border-amber-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    style={{ backgroundColor: denom.color }}
                    title={denom.label}
                  />

                  {/* Label */}
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-14 truncate">{denom.label}</span>

                  {/* Value input */}
                  <NumberStepper
                    value={denom.value}
                    onChange={(v) =>
                      updateDenomination(denom.id, { value: Math.max(1, v) })
                    }
                    min={1}
                    step={1}
                    inputClassName="w-20"
                  />

                  {/* Remove button */}
                  <button
                    onClick={() => removeDenomination(denom.id)}
                    className="px-2 py-1 rounded bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300
                               text-xs font-medium transition-colors"
                    aria-label={t('accessibility.remove')}
                  >
                    ✕
                  </button>
                </div>

                {/* Inline color palette */}
                {editingColorId === denom.id && (
                  <div className="flex flex-wrap gap-1.5 pl-8 py-1">
                    {CHIP_COLORS.map((c) => {
                      const isUsedByOther = chips.denominations.some(
                        (d) => d.id !== denom.id && d.color === c.hex,
                      );
                      return (
                        <button
                          key={c.hex}
                          onClick={() => {
                            updateDenomination(denom.id, {
                              color: c.hex,
                              label: language === 'de' ? c.de : c.en,
                            });
                            setEditingColorId(null);
                          }}
                          className={`w-7 h-7 rounded-full border-2 transition-colors relative ${
                            denom.color === c.hex
                              ? ''
                              : isUsedByOther
                                ? 'border-amber-500/50 opacity-50'
                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
                          }`}
                          style={{
                            backgroundColor: c.hex,
                            ...(denom.color === c.hex ? { borderColor: 'var(--accent-400)', boxShadow: '0 0 0 1px var(--accent-400)' } : {}),
                          }}
                          title={language === 'de' ? c.de : c.en}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
              );
            })}
          </div>

          {/* Add denomination button */}
          {chips.denominations.length < 10 && (
            <button
              onClick={addDenomination}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400
                         rounded-lg text-sm transition-colors"
            >
              {t('chipEditor.addDenomination')}
            </button>
          )}

          {/* Color-Up toggle + editable schedule */}
          {chips.denominations.length >= 2 && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700/40">
              <button
                onClick={() => emitChange({ ...chips, colorUpEnabled: !chips.colorUpEnabled })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  chips.colorUpEnabled
                    ? 'bg-amber-700/50 hover:bg-amber-700/70 text-amber-200'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {chips.colorUpEnabled ? t('chipEditor.colorUpEnabled') : t('chipEditor.colorUpDisabled')}
              </button>
              {chips.colorUpEnabled && (
                <div className="mt-2">
                  <ColorUpScheduleEditor
                    levels={levels}
                    chips={chips}
                    onChange={emitChange}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ColorUpScheduleEditor({
  levels,
  chips,
  onChange,
}: {
  levels: Level[];
  chips: ChipConfig;
  onChange: (config: ChipConfig) => void;
}) {
  const { t } = useTranslation();
  const schedule = chips.colorUpSchedule;

  // Build level options for the dropdown
  const levelOptions = useMemo(() => {
    const opts: { index: number; label: string }[] = [];
    let playCount = 0;
    for (let i = 0; i < levels.length; i++) {
      const lvl = levels[i]!;
      if (lvl.type === 'level') {
        playCount++;
        opts.push({ index: i, label: t('chipEditor.levelLabel', { n: playCount }) });
      } else {
        opts.push({ index: i, label: t('chipEditor.breakLabel', { n: playCount }) });
      }
    }
    return opts;
  }, [levels, t]);

  // Available chips not yet in the schedule
  const usedDenomIds = useMemo(
    () => new Set(schedule.map((e) => e.denomId)),
    [schedule],
  );

  const handleGenerate = () => {
    const suggestion = generateColorUpSuggestion(levels, chips.denominations);
    onChange({ ...chips, colorUpSchedule: suggestion });
  };

  const handleRemoveEntry = (idx: number) => {
    const newSchedule = schedule.filter((_, i) => i !== idx);
    onChange({ ...chips, colorUpSchedule: newSchedule });
  };

  const handleChangeLevelIndex = (entryIdx: number, newLevelIndex: number) => {
    const newSchedule = schedule.map((e, i) =>
      i === entryIdx ? { ...e, levelIndex: newLevelIndex } : e,
    );
    // Re-sort by levelIndex
    newSchedule.sort((a, b) => a.levelIndex - b.levelIndex);
    onChange({ ...chips, colorUpSchedule: newSchedule });
  };

  const handleAddEntry = (denomId: string, levelIndex: number) => {
    const newEntry: ColorUpEntry = { levelIndex, denomId };
    const newSchedule = [...schedule, newEntry].sort((a, b) => a.levelIndex - b.levelIndex);
    onChange({ ...chips, colorUpSchedule: newSchedule });
  };

  // Group schedule entries by levelIndex for display
  const grouped = useMemo(() => {
    const map = scheduleToColorUpMap(schedule, chips.denominations);
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [schedule, chips.denominations]);

  // Find the first break as default for new entries
  const defaultLevelIndex = useMemo(() => {
    const firstBreak = levels.findIndex((l) => l.type === 'break');
    return firstBreak >= 0 ? firstBreak : 0;
  }, [levels]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {t('chipEditor.colorUpSchedule')}
        </h4>
        <button
          onClick={handleGenerate}
          className="px-2 py-1 bg-amber-800/40 hover:bg-amber-800/60 text-amber-300 rounded text-xs font-medium transition-colors"
        >
          {t('chipEditor.generateSuggestion')}
        </button>
      </div>

      {schedule.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('chipEditor.noSchedule')}</p>
      ) : (
        <div className="space-y-1.5">
          {grouped.map(([levelIdx, denoms]) => (
            <div key={levelIdx} className="bg-gray-100 dark:bg-gray-800/50 rounded-lg px-2 py-1.5 space-y-1">
              {denoms.map((denom) => {
                const entryIdx = schedule.findIndex(
                  (e) => e.levelIndex === levelIdx && e.denomId === denom.id,
                );
                return (
                  <div key={denom.id} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-4 h-4 rounded-full shrink-0 border border-gray-300 dark:border-gray-600"
                      style={{ backgroundColor: denom.color }}
                    />
                    <span className="text-gray-700 dark:text-gray-300 w-12 truncate">{denom.label}</span>
                    <span className="text-gray-400 dark:text-gray-500 font-mono">{denom.value.toLocaleString()}</span>
                    <span className="text-gray-300 dark:text-gray-600 mx-1">→</span>
                    <select
                      value={levelIdx}
                      onChange={(e) => handleChangeLevelIndex(entryIdx, Number(e.target.value))}
                      className="flex-1 min-w-0 px-1 py-0.5 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-amber-500"
                    >
                      {levelOptions.map((opt) => (
                        <option key={opt.index} value={opt.index}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRemoveEntry(entryIdx)}
                      className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 text-xs transition-colors"
                      aria-label={t('accessibility.remove')}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Add new color-up entry */}
      {chips.denominations.some((d) => !usedDenomIds.has(d.id)) && levelOptions.length > 0 && (
        <AddColorUpRow
          denominations={chips.denominations.filter((d) => !usedDenomIds.has(d.id))}
          levelOptions={levelOptions}
          defaultLevelIndex={defaultLevelIndex}
          onAdd={handleAddEntry}
        />
      )}
    </div>
  );
}

function AddColorUpRow({
  denominations,
  levelOptions,
  defaultLevelIndex,
  onAdd,
}: {
  denominations: ChipDenomination[];
  levelOptions: { index: number; label: string }[];
  defaultLevelIndex: number;
  onAdd: (denomId: string, levelIndex: number) => void;
}) {
  const { t } = useTranslation();
  const sorted = useMemo(
    () => [...denominations].sort((a, b) => a.value - b.value),
    [denominations],
  );
  const [selectedDenom, setSelectedDenom] = useState(sorted[0]?.id ?? '');
  const [selectedLevel, setSelectedLevel] = useState(defaultLevelIndex);

  const handleAdd = () => {
    if (!selectedDenom) return;
    onAdd(selectedDenom, selectedLevel);
    // Select next available denom
    const remaining = sorted.filter((d) => d.id !== selectedDenom);
    if (remaining.length > 0) {
      setSelectedDenom(remaining[0]!.id);
    }
  };

  return (
    <div className="flex items-center gap-1.5 text-xs pt-1">
      {/* Chip selector */}
      <select
        value={selectedDenom}
        onChange={(e) => setSelectedDenom(e.target.value)}
        className="px-1 py-1 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-amber-500"
      >
        {sorted.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label} ({d.value.toLocaleString()})
          </option>
        ))}
      </select>
      <span className="text-gray-300 dark:text-gray-600">→</span>
      {/* Level selector */}
      <select
        value={selectedLevel}
        onChange={(e) => setSelectedLevel(Number(e.target.value))}
        className="flex-1 min-w-0 px-1 py-1 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-amber-500"
      >
        {levelOptions.map((opt) => (
          <option key={opt.index} value={opt.index}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        onClick={handleAdd}
        className="px-2 py-1 bg-amber-800/40 hover:bg-amber-800/60 text-amber-300 rounded text-xs font-medium transition-colors whitespace-nowrap"
      >
        {t('chipEditor.addColorUp')}
      </button>
    </div>
  );
}
