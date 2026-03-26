import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from '../i18n';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  snap?: (raw: number, prev: number, step: number) => number;
  inputClassName?: string;
  label?: string;
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  snap,
  inputClassName = 'w-20',
  label,
}: Props) {
  const { t } = useTranslation();
  const [localValue, setLocalValue] = useState(String(value));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const clamp = useCallback(
    (v: number) => Math.max(min, Math.min(max, v)),
    [min, max],
  );

  const increment = useCallback(() => {
    const next = clamp(value + step);
    const result = snap ? snap(next, value, step) : next;
    onChange(clamp(result));
  }, [value, step, clamp, snap, onChange]);

  const decrement = useCallback(() => {
    const next = clamp(value - step);
    const result = snap ? snap(next, value, step) : next;
    onChange(clamp(result));
  }, [value, step, clamp, snap, onChange]);

  const stopHold = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }, []);

  const startHold = useCallback(
    (action: () => void) => {
      action();
      timeoutRef.current = setTimeout(() => {
        intervalRef.current = setInterval(action, 100);
      }, 400);
    },
    [],
  );

  useEffect(() => stopHold, [stopHold]);

  const handleBlur = () => {
    const n = Number(localValue);
    if (!isNaN(n)) {
      onChange(clamp(n));
    } else {
      setLocalValue(String(value));
    }
  };

  const btnBase =
    'w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold transition-all duration-150 select-none shrink-0 touch-manipulation ' +
    'bg-gray-200 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600/50 ' +
    'active:scale-[0.93] disabled:opacity-30 disabled:pointer-events-none';

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        className={btnBase}
        disabled={value <= min}
        onPointerDown={() => startHold(decrement)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onContextMenu={(e) => e.preventDefault()}
        tabIndex={0}
        aria-label={t('accessibility.decrease')}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        min={min}
        max={max === Infinity ? undefined : max}
        step={step}
        className={`${inputClassName} px-2 py-1.5 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg text-gray-900 dark:text-white text-sm text-center focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-ring)] transition-all duration-200`}
      />
      <button
        type="button"
        className={btnBase}
        disabled={value >= max}
        onPointerDown={() => startHold(increment)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onContextMenu={(e) => e.preventDefault()}
        tabIndex={0}
        aria-label={t('accessibility.increase')}
      >
        +
      </button>
    </div>
  );
}
