import { useState, useRef, useCallback, memo } from 'react';
import type { Level, TimerState, ChipConfig, ChipDenomination, AnteMode } from '../domain/types';
import { formatTime, getLevelLabel, getBlindsText } from '../domain/logic';
import { useTranslation } from '../i18n';

interface Props {
  timerState: TimerState;
  levels: Level[];
  largeDisplay: boolean;
  countdownEnabled: boolean;
  onScrub?: ((seconds: number) => void) | undefined;
  onScrubEnd?: (() => void) | undefined;
  chipConfig?: ChipConfig | undefined;
  colorUpMap?: Map<number, ChipDenomination[]> | undefined;
  cleanView?: boolean | undefined;
  anteMode?: AnteMode | undefined;
}

function NextLevelInfo({ levels, currentLevelIndex, largeDisplay }: { levels: Level[]; currentLevelIndex: number; largeDisplay: boolean }) {
  const { t } = useTranslation();
  const nextIdx = currentLevelIndex + 1;
  const nextLvl = nextIdx < levels.length ? levels[nextIdx] : null;
  if (!nextLvl) return null;
  const nextLabel = getLevelLabel(nextLvl, nextIdx, levels);
  return (
    <div className="text-center">
      <p className={`text-gray-400 dark:text-gray-500 ${largeDisplay ? 'text-sm' : 'text-xs'} uppercase tracking-wider`}>
        {t('timer.next')} {nextLabel}
      </p>
      {nextLvl.type === 'break' ? (
        <p className={`text-amber-500/70 font-medium mt-0.5 ${largeDisplay ? 'text-lg' : 'text-sm'}`}>
          {formatTime(nextLvl.durationSeconds)}
        </p>
      ) : (
        <p className={`text-gray-500 dark:text-gray-400 font-medium mt-0.5 ${largeDisplay ? 'text-lg' : 'text-sm'}`}>
          {getBlindsText(nextLvl)} ({formatTime(nextLvl.durationSeconds)})
        </p>
      )}
    </div>
  );
}

function ScrubSlider({
  trackRef,
  progress,
  remaining,
  duration,
  isBreak,
  onScrub,
  onScrubEnd,
  ariaLabel,
}: {
  trackRef: React.RefObject<HTMLDivElement | null>;
  progress: number;
  remaining: number;
  duration: number;
  isBreak: boolean;
  onScrub: (seconds: number) => void;
  onScrubEnd?: (() => void) | undefined;
  ariaLabel: string;
}) {
  const scrubFromEvent = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onScrub(Math.round(duration * (1 - fraction)));
    },
    [trackRef, duration, onScrub],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      trackRef.current?.setPointerCapture(e.pointerId);
      scrubFromEvent(e);
    },
    [trackRef, scrubFromEvent],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!trackRef.current?.hasPointerCapture(e.pointerId)) return;
      scrubFromEvent(e);
    },
    [trackRef, scrubFromEvent],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      trackRef.current?.releasePointerCapture(e.pointerId);
      onScrubEnd?.();
    },
    [trackRef, onScrubEnd],
  );

  const pct = Math.min(100, progress * 100);

  return (
    <div className="w-full flex items-center gap-3">
      <span className="text-xs text-gray-400 dark:text-gray-500 w-12 text-right">0:00</span>
      <div
        ref={trackRef}
        className="flex-1 relative cursor-pointer touch-none py-2"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="slider"
        aria-valuenow={Math.round(remaining)}
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-label={ariaLabel}
        tabIndex={0}
      >
        {/* Track */}
        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              isBreak
                ? 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                : ''
            }`}
            style={isBreak ? undefined : {
              background: 'linear-gradient(to right, var(--accent-600), var(--accent-400))',
              boxShadow: `0 0 8px var(--accent-glow)`,
            }}
          />
        </div>
        {/* Thumb */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white/30 pointer-events-none ${
            isBreak
              ? 'bg-gradient-to-b from-amber-400 to-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
              : ''
          }`}
          style={{
            left: `${pct}%`,
            ...(isBreak ? {} : {
              background: 'linear-gradient(to bottom, var(--accent-400), var(--accent-600))',
              boxShadow: `0 0 8px var(--accent-glow)`,
            }),
          }}
        />
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 w-12">
        {formatTime(duration)}
      </span>
    </div>
  );
}

export const TimerDisplay = memo(function TimerDisplay({ timerState, levels, largeDisplay, countdownEnabled, onScrub, onScrubEnd, chipConfig, colorUpMap, cleanView, anteMode }: Props) {
  const { t } = useTranslation();
  const [scrubbing, setScrubbing] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Screen reader announcement — only changes every 15s or during countdown (≤10s)
  // Pure derived value: aria-live="polite" announces only when text changes
  const displaySeconds = Math.floor(timerState.remainingSeconds);
  const currentLevel = levels[timerState.currentLevelIndex];
  const srLabel = currentLevel ? getLevelLabel(currentLevel, timerState.currentLevelIndex, levels) : '';
  const srSnapshotSeconds = displaySeconds <= 10 ? displaySeconds : Math.floor(displaySeconds / 15) * 15;
  const srAnnouncement = currentLevel ? `${srLabel}: ${formatTime(srSnapshotSeconds)}` : '';

  if (!currentLevel) return null;

  const label = srLabel;
  const remaining = timerState.remainingSeconds;
  const isCountdown = countdownEnabled && remaining <= 10 && remaining > 0 && timerState.status === 'running';
  const isBreak = currentLevel.type === 'break';
  const progress = 1 - remaining / currentLevel.durationSeconds;

  return (
    <div className="flex flex-col items-center justify-center gap-2 sm:gap-4 select-none w-full">
      {/* Progress bar */}
      <div
        className="w-full max-w-xl h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(Math.min(100, progress * 100))}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('timer.progress')}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isBreak ? 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : ''
          }`}
          style={{
            width: `${Math.min(100, progress * 100)}%`,
            ...(isBreak ? {} : {
              background: 'linear-gradient(to right, var(--accent-600), var(--accent-400))',
              boxShadow: `0 0 8px var(--accent-glow)`,
            }),
          }}
        />
      </div>

      {/* Level info */}
      <div className="text-center" aria-live="polite">
        <p
          className={`font-bold uppercase tracking-wider ${
            isBreak ? 'text-amber-400' : ''
          } ${largeDisplay ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'}`}
          style={isBreak ? undefined : { color: 'var(--accent-400)' }}
        >
          {label}
        </p>
        {currentLevel.type === 'level' && (
          <div className={`mt-2 ${largeDisplay ? 'space-y-1' : 'space-y-0.5'}`}>
            <p className={`text-gray-900 dark:text-white font-bold tabular-nums tracking-wide drop-shadow-[0_0_12px_rgba(255,255,255,0.1)] ${
              largeDisplay ? 'text-[3rem] sm:text-[5.5rem] lg:text-[8rem]' : 'text-4xl sm:text-6xl'
            }`}>
              {currentLevel.smallBlind ?? 0} / {currentLevel.bigBlind ?? 0}
            </p>
            {currentLevel.ante != null && currentLevel.ante > 0 && (
              <p className={`text-gray-500 dark:text-gray-400 font-semibold ${
                largeDisplay ? 'text-lg sm:text-2xl' : 'text-base sm:text-lg'
              }`}>
                {anteMode === 'bigBlindAnte' ? t('timer.bba') : t('timer.ante')} {currentLevel.ante}
              </p>
            )}
          </div>
        )}
        {isBreak && (
          <p className={`text-amber-300 font-semibold mt-2 ${
            largeDisplay ? 'text-3xl sm:text-5xl' : 'text-xl sm:text-2xl'
          }`}>
            {t('timer.break')}
          </p>
        )}
      </div>

      {/* Next Level info */}
      <NextLevelInfo
        levels={levels}
        currentLevelIndex={timerState.currentLevelIndex}
        largeDisplay={largeDisplay}
      />

      {/* Color-Up Banner */}
      {chipConfig?.enabled && chipConfig.colorUpEnabled && (() => {
        const currentColorUp = colorUpMap?.get(timerState.currentLevelIndex);
        if (!currentColorUp || currentColorUp.length === 0) return null;
        return (
          <div className="w-full max-w-xl px-4 py-2 bg-amber-50 dark:bg-amber-900/40 border border-amber-400 dark:border-amber-600 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2">
              {currentColorUp.map((d) => (
                <span
                  key={d.id}
                  className="w-5 h-5 rounded-full inline-block border border-amber-400"
                  style={{ backgroundColor: d.color }}
                />
              ))}
              <span className="text-amber-700 dark:text-amber-300 text-sm font-bold">
                {t('colorUp.banner', {
                  chips: currentColorUp.map((d) => d.label).join(', '),
                })}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Timer */}
      <div
        className={`font-mono font-bold tabular-nums ${
          largeDisplay ? 'text-[4rem] sm:text-[7rem] lg:text-[10rem] leading-none' : 'text-5xl sm:text-8xl'
        } ${
          isCountdown
            ? 'text-red-500 animate-countdown-pulse'
            : timerState.status === 'paused'
            ? 'text-yellow-400 opacity-80'
            : remaining <= 0
            ? 'text-gray-400 dark:text-gray-500'
            : 'text-gray-900 dark:text-white animate-timer-glow'
        }`}
        aria-label={formatTime(remaining)}
        aria-hidden="true"
      >
        {formatTime(remaining)}
      </div>
      {/* Screen reader: periodic timer announcement (every 15s + countdown) */}
      <div aria-live="polite" role="timer" className="sr-only">{srAnnouncement}</div>

      {/* Time-Scrub Controls (hidden in clean view) */}
      {!cleanView && onScrub && (
        <div className="flex flex-col items-center gap-2 w-full max-w-xl">
          <button
            onClick={() => setScrubbing((v) => !v)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              scrubbing
                ? 'bg-amber-700 hover:bg-amber-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {scrubbing ? t('timer.closeSlider') : t('timer.adjustTime')}
          </button>
          {scrubbing && (
            <ScrubSlider
              trackRef={trackRef}
              progress={progress}
              remaining={remaining}
              duration={currentLevel.durationSeconds}
              isBreak={isBreak}
              onScrub={onScrub}
              onScrubEnd={onScrubEnd}
              ariaLabel={t('timer.adjustTime')}
            />
          )}
        </div>
      )}

      {/* Status (hidden in clean view) */}
      {!cleanView && (
        <p className="text-sm text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          {timerState.status === 'running'
            ? t('timer.running')
            : timerState.status === 'paused'
            ? t('timer.paused')
            : remaining <= 0
            ? t('timer.finished')
            : t('timer.stopped')}
        </p>
      )}
    </div>
  );
});
