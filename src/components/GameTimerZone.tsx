import { lazy, memo, Suspense } from 'react';
import type { TournamentConfig, Settings } from '../domain/types';
import type { useTimer } from '../hooks/useTimer';
import type { GameModeState, GameModeUndoState, GameModeActions } from './modes/GameModeContainer';
import { LoadingFallback } from './LoadingFallback';

const TimerDisplay = lazy(() => import('./TimerDisplay').then(m => ({ default: m.TimerDisplay })));
const Controls = lazy(() => import('./Controls').then(m => ({ default: m.Controls })));
const BubbleIndicator = lazy(() => import('./BubbleIndicator').then(m => ({ default: m.BubbleIndicator })));
const RebuyStatus = lazy(() => import('./RebuyStatus').then(m => ({ default: m.RebuyStatus })));

type TimerController = ReturnType<typeof useTimer>;

interface Props {
  config: TournamentConfig;
  settings: Settings;
  timer: TimerController;
  state: GameModeState;
  actions: GameModeActions;
  undo?: GameModeUndoState | undefined;
}

export const GameTimerZone = memo(function GameTimerZone({
  config, settings, timer, state, actions, undo,
}: Props) {
  return (
    <div
      className="sticky top-[48px] z-10 flex flex-col items-center justify-center p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700/30"
      style={{ minHeight: '35vh' }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <TimerDisplay
          timerState={timer.timerState}
          levels={config.levels}
          largeDisplay={settings.largeDisplay}
          countdownEnabled={settings.countdownEnabled}
          onScrub={timer.setRemainingSeconds}
          onScrubEnd={timer.start}
          chipConfig={config.chips}
          cleanView={false}
          colorUpMap={state.colorUpMap}
          anteMode={config.anteMode}
        />
        <BubbleIndicator
          isBubble={state.bubbleActive}
          showItmFlash={state.showItmFlash}
          addOnWindowOpen={state.addOnWindowOpen}
          addOnCost={config.addOn.cost}
          addOnChips={config.addOn.chips}
          lastHandActive={state.lastHandActive}
          handForHandActive={state.handForHandActive}
        />
        <RebuyStatus
          active={state.rebuyActive}
          rebuy={config.rebuy}
          currentPlayLevel={state.currentPlayLevel}
          elapsedSeconds={state.tournamentElapsed}
        />
        <Controls
          timerState={timer.timerState}
          onToggleStartPause={timer.toggleStartPause}
          onNext={timer.nextLevel}
          onPrevious={timer.previousLevel}
          onReset={actions.onResetLevel}
          onRestart={actions.onRestartTournament}
          isBreak={state.isBreak}
          onSkipBreak={actions.onSkipBreak}
          onExtendBreak={actions.onExtendBreak}
          hideSecondaryControls={false}
          cleanView={false}
          onToggleCleanView={actions.onToggleCleanView}
          lastHandActive={state.lastHandActive}
          onLastHand={actions.onLastHand}
          handForHandActive={state.handForHandActive}
          onHandForHand={actions.onHandForHand}
          onNextHand={actions.onNextHand}
          showHandForHand={state.bubbleActive}
          callTheClockSeconds={settings.callTheClockSeconds}
          onCallTheClock={actions.onShowCallTheClock}
          canUndo={undo?.canUndo}
          canRedo={undo?.canRedo}
          onUndo={undo?.onUndo}
          onRedo={undo?.onRedo}
          undoLabel={undo?.undoLabel}
          redoLabel={undo?.redoLabel}
        />
      </Suspense>
    </div>
  );
});
