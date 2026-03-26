import { memo } from 'react';
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

  return (
    <div className="flex flex-col items-center gap-4">
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

      {/* Break controls: skip / extend */}
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

      {/* Hand-for-Hand: Next Hand button */}
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

      {/* Last Hand + Hand-for-Hand + Clean view + Call Clock */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {showHandForHand && onHandForHand && (
          <button
            onClick={onHandForHand}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-[0.97] border shadow-sm ${
              handForHandActive
                ? 'bg-red-600 dark:bg-red-700 hover:bg-red-500 dark:hover:bg-red-600 text-white border-red-500 dark:border-red-600 shadow-red-300/30 dark:shadow-red-900/30'
                : 'bg-white dark:bg-gray-800/80 hover:bg-red-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600/40 shadow-gray-200/30 dark:shadow-black/15'
            }`}
            title={t('controls.handForHandTooltip')}
          >
            {t('controls.handForHand')}
          </button>
        )}
        {onLastHand && (
          <button
            onClick={onLastHand}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-[0.97] border shadow-sm ${
              lastHandActive
                ? 'bg-amber-600 dark:bg-amber-700 hover:bg-amber-500 dark:hover:bg-amber-600 text-white border-amber-500 dark:border-amber-600 shadow-amber-300/30 dark:shadow-amber-900/30'
                : 'bg-white dark:bg-gray-800/80 hover:bg-amber-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600/40 shadow-gray-200/30 dark:shadow-black/15'
            }`}
            title={t('controls.lastHandTooltip')}
          >
            {t('controls.lastHand')}
          </button>
        )}
        {onCallTheClock && callTheClockSeconds != null && (
          <button
            onClick={onCallTheClock}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-[0.97] border shadow-sm bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600/40 shadow-gray-200/30 dark:shadow-black/15"
            title={t('controls.callTheClock')}
          >
            {String.fromCodePoint(0x23F1)} {callTheClockSeconds}s
          </button>
        )}
      </div>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 border shadow-md active:scale-[0.97] active:shadow-sm ${
                canUndo
                  ? 'bg-white dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700/30 shadow-gray-200/30 dark:shadow-black/15'
                  : 'bg-gray-100 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-800/40 shadow-none cursor-not-allowed'
              }`}
              title={undoLabel ? t('undo.undoAction', { action: undoLabel }) : t('undo.noUndo')}
              aria-label={t('undo.undo')}
            >
              {'\u21A9'} {t('undo.undo')}
            </button>
          )}
          {onRedo && (
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 border shadow-md active:scale-[0.97] active:shadow-sm ${
                canRedo
                  ? 'bg-white dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700/30 shadow-gray-200/30 dark:shadow-black/15'
                  : 'bg-gray-100 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-800/40 shadow-none cursor-not-allowed'
              }`}
              title={redoLabel ? t('undo.redoAction', { action: redoLabel }) : t('undo.noRedo')}
              aria-label={t('undo.redo')}
            >
              {'\u21AA'} {t('undo.redo')}
            </button>
          )}
          <button
            onClick={onReset}
            className="px-4 py-2 bg-white dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-all duration-200 border border-gray-200 dark:border-gray-700/30 shadow-md shadow-gray-200/30 dark:shadow-black/15 active:scale-[0.97] active:shadow-sm"
            title={t('controls.levelResetTooltip')}
            aria-label={t('controls.levelResetTooltip')}
          >
            {t('controls.levelReset')}
          </button>
          <button
            onClick={onRestart}
            className="px-4 py-2 bg-white dark:bg-gray-800/80 hover:bg-red-50 dark:hover:bg-red-900/80 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-300 rounded-lg text-xs font-medium transition-all duration-200 border border-gray-200 dark:border-gray-700/30 hover:border-red-300 dark:hover:border-red-800/50 shadow-md shadow-gray-200/30 dark:shadow-black/15 active:scale-[0.97] active:shadow-sm"
            title={t('controls.tournamentRestartTooltip')}
            aria-label={t('controls.tournamentRestartTooltip')}
          >
            {t('controls.tournamentRestart')}
          </button>
        </div>
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
