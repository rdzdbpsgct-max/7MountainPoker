import { memo, useState, useEffect, useRef, useCallback } from 'react';
import type { TimerState } from '../domain/types';
import { useTranslation } from '../i18n';

interface Props {
  timerState: TimerState;
  onToggleStartPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onReset: () => void;
  onRestart: () => void;
  isBreak?: boolean | undefined;
  onSkipBreak?: (() => void) | undefined;
  onExtendBreak?: ((seconds: number) => void) | undefined;
  hideSecondaryControls?: boolean | undefined;
  cleanView?: boolean | undefined;
  onToggleCleanView?: (() => void) | undefined;
  lastHandActive?: boolean | undefined;
  onLastHand?: (() => void) | undefined;
  handForHandActive?: boolean | undefined;
  onHandForHand?: (() => void) | undefined;
  onNextHand?: (() => void) | undefined;
  showHandForHand?: boolean | undefined;
  callTheClockSeconds?: number | undefined;
  onCallTheClock?: (() => void) | undefined;
  canUndo?: boolean | undefined;
  canRedo?: boolean | undefined;
  onUndo?: (() => void) | undefined;
  onRedo?: (() => void) | undefined;
  undoLabel?: string | null | undefined;
  redoLabel?: string | null | undefined;
}

export const Controls = memo(function Controls({
  timerState,
  onToggleStartPause,
  onNext,
  onPrevious,
  onReset,
  onRestart,
  isBreak,
  onSkipBreak,
  onExtendBreak,
  hideSecondaryControls,
  cleanView,
  onToggleCleanView,
  lastHandActive,
  onLastHand,
  handForHandActive,
  onHandForHand,
  onNextHand,
  showHandForHand,
  callTheClockSeconds,
  onCallTheClock,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoLabel,
  redoLabel,
}: Props) {
  const { t } = useTranslation();
  const isRunning = timerState.status === 'running';
  const isStopped = timerState.status === 'stopped';
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const hasActiveIndicator = !!lastHandActive || !!cleanView;

  const closeMore = useCallback(() => setShowMore(false), []);

  // Close popover on click outside
  useEffect(() => {
    if (!showMore) return;
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) closeMore();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMore, closeMore]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Row 1: Main transport controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onPrevious}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-md shadow-gray-300/30 dark:shadow-black/20 active:scale-[0.97] active:shadow-sm border border-gray-200 dark:border-gray-600/30"
          title={t('controls.previousTooltip')}
          aria-label={t('controls.previousTooltip')}
        >
          {t('controls.previous')}
        </button>

        <button
          onClick={onToggleStartPause}
          className="px-8 py-3 rounded-xl text-lg font-bold transition-all duration-200 active:scale-[0.97] active:shadow-md text-white shadow-lg"
          style={isRunning
            ? { background: 'linear-gradient(to bottom, #eab308, #a16207)', boxShadow: '0 10px 15px -3px rgba(113,63,18,0.3)' }
            : { background: `linear-gradient(to bottom, var(--accent-500), var(--accent-700))`, boxShadow: `0 10px 15px -3px var(--accent-900)` }
          }
          title={t('controls.startPauseTooltip')}
          aria-label={isRunning ? t('controls.pause') : t('controls.start')}
          aria-pressed={isRunning}
        >
          {isRunning ? t('controls.pause') : isStopped && timerState.remainingSeconds <= 0 ? t('controls.end') : t('controls.start')}
        </button>

        <button
          onClick={onNext}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-md shadow-gray-300/30 dark:shadow-black/20 active:scale-[0.97] active:shadow-sm border border-gray-200 dark:border-gray-600/30"
          title={t('controls.nextTooltip')}
          aria-label={t('controls.nextTooltip')}
        >
          {t('controls.next')}
        </button>
      </div>

      {/* Row 2: Contextual — break controls, H4H next hand, or H4H toggle */}
      {isBreak && (onSkipBreak || onExtendBreak) && (
        <div className="flex items-center gap-2">
          {onSkipBreak && (
            <button
              onClick={onSkipBreak}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97] border shadow-sm bg-amber-600 dark:bg-amber-700 hover:bg-amber-500 dark:hover:bg-amber-600 text-white border-amber-500 dark:border-amber-600 shadow-amber-300/30 dark:shadow-amber-900/30"
              title={t('controls.skipBreak')}
            >
              {t('controls.skipBreak')}
            </button>
          )}
          {onExtendBreak && (
            <>
              <button
                onClick={() => onExtendBreak(120)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97] border shadow-sm bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600/40 shadow-gray-200/30 dark:shadow-black/15"
                title={t('controls.extendBreak2')}
              >
                {t('controls.extendBreak2')}
              </button>
              <button
                onClick={() => onExtendBreak(300)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97] border shadow-sm bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600/40 shadow-gray-200/30 dark:shadow-black/15"
                title={t('controls.extendBreak5')}
              >
                {t('controls.extendBreak5')}
              </button>
            </>
          )}
        </div>
      )}
      {handForHandActive && onNextHand && timerState.status !== 'running' && (
        <button
          onClick={onNextHand}
          className="px-8 py-3 rounded-xl text-lg font-bold transition-all duration-200 active:scale-[0.97] active:shadow-md text-white shadow-lg"
          style={{ background: `linear-gradient(to bottom, var(--accent-500), var(--accent-700))`, boxShadow: `0 10px 15px -3px var(--accent-900)` }}
          title={t('controls.nextHandTooltip')}
        >
          {t('controls.nextHand')}
        </button>
      )}
      {!isBreak && !handForHandActive && showHandForHand && onHandForHand && (
        <button
          onClick={onHandForHand}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-[0.97] border shadow-sm bg-white dark:bg-gray-800/80 hover:bg-red-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600/40 shadow-gray-200/30 dark:shadow-black/15"
          title={t('controls.handForHandTooltip')}
        >
          {t('controls.handForHand')}
        </button>
      )}

      {/* More menu (···) */}
      {!hideSecondaryControls && (
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setShowMore(prev => !prev)}
            className="relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97] border shadow-sm bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600/40 shadow-gray-200/30 dark:shadow-black/15"
            title={t('controls.moreActions')}
            aria-label={t('controls.moreActions')}
          >
            {String.fromCodePoint(0x22EF)}
            {hasActiveIndicator && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-500)' }} />
            )}
          </button>
          {showMore && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-40 min-w-[180px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/40 rounded-xl shadow-xl shadow-gray-300/30 dark:shadow-black/30 py-1.5 animate-fade-in">
              {onLastHand && (
                <button
                  onClick={() => { onLastHand(); closeMore(); }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                    lastHandActive
                      ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {t('controls.lastHand')} {lastHandActive ? String.fromCodePoint(0x2713) : ''}
                </button>
              )}
              {onToggleCleanView && (
                <button
                  onClick={() => { onToggleCleanView(); closeMore(); }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                    cleanView
                      ? 'bg-gray-100 dark:bg-gray-700/50'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }`}
                  style={cleanView ? { color: 'var(--accent-500)' } : undefined}
                >
                  {cleanView ? t('game.cleanViewOn') : t('game.cleanViewOff')} {cleanView ? String.fromCodePoint(0x2713) : ''}
                </button>
              )}
              {showHandForHand && onHandForHand && handForHandActive && (
                <button
                  onClick={() => { onHandForHand(); closeMore(); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 transition-colors"
                >
                  {t('controls.handForHand')} {String.fromCodePoint(0x2713)}
                </button>
              )}
              {onCallTheClock && callTheClockSeconds != null && (
                <button
                  onClick={() => { onCallTheClock(); closeMore(); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                >
                  {String.fromCodePoint(0x23F1)} {t('controls.callTheClock')} ({callTheClockSeconds}s)
                </button>
              )}
              {(onUndo || onRedo) && (
                <div className="border-t border-gray-200 dark:border-gray-700/30 my-1" />
              )}
              {onUndo && (
                <button
                  onClick={() => { onUndo(); closeMore(); }}
                  disabled={!canUndo}
                  className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                    canUndo
                      ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {'\u21A9'} {t('undo.undo')}{undoLabel ? ` (${undoLabel})` : ''}
                </button>
              )}
              {onRedo && (
                <button
                  onClick={() => { onRedo(); closeMore(); }}
                  disabled={!canRedo}
                  className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                    canRedo
                      ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {'\u21AA'} {t('undo.redo')}{redoLabel ? ` (${redoLabel})` : ''}
                </button>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700/30 my-1" />
              <button
                onClick={() => { onReset(); closeMore(); }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              >
                {t('controls.levelReset')}
              </button>
              <button
                onClick={() => { onRestart(); closeMore(); }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                {t('controls.tournamentRestart')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}, (prev, next) =>
  prev.timerState.status === next.timerState.status &&
  (prev.timerState.remainingSeconds <= 0) === (next.timerState.remainingSeconds <= 0) &&
  prev.onToggleStartPause === next.onToggleStartPause &&
  prev.onNext === next.onNext &&
  prev.onPrevious === next.onPrevious &&
  prev.onReset === next.onReset &&
  prev.onRestart === next.onRestart &&
  prev.isBreak === next.isBreak &&
  prev.onSkipBreak === next.onSkipBreak &&
  prev.onExtendBreak === next.onExtendBreak &&
  prev.hideSecondaryControls === next.hideSecondaryControls &&
  prev.cleanView === next.cleanView &&
  prev.onToggleCleanView === next.onToggleCleanView &&
  prev.lastHandActive === next.lastHandActive &&
  prev.onLastHand === next.onLastHand &&
  prev.handForHandActive === next.handForHandActive &&
  prev.onHandForHand === next.onHandForHand &&
  prev.onNextHand === next.onNextHand &&
  prev.showHandForHand === next.showHandForHand &&
  prev.callTheClockSeconds === next.callTheClockSeconds &&
  prev.onCallTheClock === next.onCallTheClock &&
  prev.canUndo === next.canUndo &&
  prev.canRedo === next.canRedo &&
  prev.onUndo === next.onUndo &&
  prev.onRedo === next.onRedo &&
  prev.undoLabel === next.undoLabel &&
  prev.redoLabel === next.redoLabel
);
