import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import type { DisplayStatePayload, DisplayMessage } from '../../domain/displayChannel';
import { createDisplayChannel, deserializeColorUpMap, isDisplayMessage, sendDisplayMessage, withDisplayContract } from '../../domain/displayChannel';
import { useTranslation } from '../../i18n';
import { DisplayMode } from './DisplayMode';

const CallTheClock = lazy(() => import('../CallTheClock').then((m) => ({ default: m.CallTheClock })));

/**
 * TVDisplayWindow — standalone component rendered in the secondary TV browser window.
 *
 * Receives all display state via BroadcastChannel from the admin window.
 * Shows DisplayMode (read-only) and CallTheClock overlay when triggered remotely.
 */
export function TVDisplayWindow() {
  const { t } = useTranslation();
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Full display state from admin
  const [state, setState] = useState<DisplayStatePayload | null>(null);

  // Call the Clock overlay
  const [ctcPayload, setCtcPayload] = useState<{
    durationSeconds: number;
    soundEnabled: boolean;
    voiceEnabled: boolean;
  } | null>(null);

  // Timer tick overlay (applied on top of last full-state for smooth updates)
  const [timerTick, setTimerTick] = useState<{
    remainingSeconds: number;
    status: string;
    currentLevelIndex: number;
  } | null>(null);

  // Connect to BroadcastChannel on mount
  useEffect(() => {
    const channel = createDisplayChannel();
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<DisplayMessage | unknown>) => {
      const rawMsg = event.data;
      if (!isDisplayMessage(rawMsg)) return;
      const msg = rawMsg;
      switch (msg.type) {
        case 'full-state':
          setState(msg.payload);
          setTimerTick(null); // Reset tick overlay on full-state
          break;
        case 'timer-tick':
          setTimerTick(msg.payload);
          break;
        case 'call-the-clock':
          setCtcPayload(msg.payload);
          break;
        case 'call-the-clock-dismiss':
          setCtcPayload(null);
          break;
        case 'close':
          window.close();
          break;
      }
    };

    // Request full state from admin window (solves race condition where
    // admin sends full-state before TV window listener is ready)
    sendDisplayMessage(channel, withDisplayContract({ type: 'request-state' }));

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // Auto-request fullscreen on first interaction (browsers require user gesture)
  const handleFullscreen = useCallback(() => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => { /* ignore */ });
      } else if ((el as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
        (el as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
      }
    } catch {
      // Fullscreen not available
    }
  }, []);

  // Waiting for connection
  if (!state) {
    return (
      <div
        className="fixed inset-0 bg-gray-950 text-white flex flex-col items-center justify-center select-none cursor-pointer"
        onClick={handleFullscreen}
      >
        <div className="animate-pulse text-center">
          <p className="text-4xl mb-4">{String.fromCodePoint(0x1F4FA)}</p>
          <p className="text-xl text-gray-400">{t('display.waitingForConnection')}</p>
          <p className="text-sm text-gray-600 mt-4">{t('display.clickForFullscreen')}</p>
        </div>
      </div>
    );
  }

  // Build effective timer state (apply tick overlay if newer)
  const effectiveTimerState = timerTick
    ? {
        ...state.timerState,
        remainingSeconds: timerTick.remainingSeconds,
        status: timerTick.status as 'running' | 'stopped',
        currentLevelIndex: timerTick.currentLevelIndex,
      }
    : state.timerState;

  // Reconstruct colorUpMap from serialized schedule
  const colorUpMap = deserializeColorUpMap(state.colorUpSchedule);

  return (
    <>
      <DisplayMode
        timerState={effectiveTimerState}
        levels={state.levels}
        chipConfig={state.chipConfig}
        colorUpMap={colorUpMap}
        tournamentName={state.tournamentName}
        activePlayerCount={state.activePlayerCount}
        totalPlayerCount={state.totalPlayerCount}
        isBubble={state.isBubble}
        isLastHand={state.isLastHand}
        isHandForHand={state.isHandForHand}
        onExit={() => window.close()}
        players={state.players}
        dealerIndex={state.dealerIndex}
        buyIn={state.buyIn}
        payout={state.payout}
        rebuy={state.rebuy}
        addOn={state.addOn}
        bounty={state.bounty}
        averageStack={state.averageStack}
        tournamentElapsed={state.tournamentElapsed}
        tables={state.tables}
        showDealerBadges={state.showDealerBadges}
        leagueName={state.leagueName}
        leagueStandings={state.leagueStandings}
        sidePotData={state.sidePotData}
        displayScreens={state.displayScreens}
        displayRotationInterval={state.displayRotationInterval}
        displayLayout={state.displayLayout}
        currency={state.currency}
      />
      {ctcPayload && (
        <Suspense fallback={null}>
          <CallTheClock
            durationSeconds={ctcPayload.durationSeconds}
            soundEnabled={ctcPayload.soundEnabled}
            voiceEnabled={ctcPayload.voiceEnabled}
            onClose={() => setCtcPayload(null)}
          />
        </Suspense>
      )}
    </>
  );
}
