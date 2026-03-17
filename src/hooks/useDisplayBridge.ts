import { useCallback, useEffect, useRef } from 'react';
import type { TournamentConfig, Settings, PotResult, PlayerPayout, TimerState } from '../domain/types';
import type { DisplayStatePayload } from '../domain/displayChannel';
import { serializeColorUpMap } from '../domain/displayChannel';
import type { GameComputedState } from './useGameComputedState';
import { useTVDisplay } from './useTVDisplay';
import { useDisplaySession } from './useDisplaySession';
import type { RemoteHost } from '../domain/remote';

type Mode = 'setup' | 'game' | 'league';

interface UseDisplayBridgeParams {
  mode: Mode;
  config: TournamentConfig;
  settings: Settings;
  timerState: TimerState;
  computed: Pick<
    GameComputedState,
    'colorUpMap' | 'activePlayerCount' | 'bubbleActive' | 'averageStack' | 'tournamentElapsed' | 'leagueDisplayData'
  >;
  lastHandActive: boolean;
  handForHandActive: boolean;
  showDealerBadges: boolean;
  sidePotData: { pots: PotResult[]; total: number; payouts?: PlayerPayout[] | undefined } | null;
  showCallTheClock: boolean;
  /** Remote host ref for PeerJS display session */
  remoteHostRef: React.RefObject<RemoteHost | null>;
  remoteHostStatus: string | null;
}

interface UseDisplayBridgeReturn {
  tvWindowActive: boolean;
  handleToggleTVWindow: () => void;
  closeTVWindow: () => void;
  displayCount: number;
}

/**
 * Consolidates TV display wiring: payload construction, local BroadcastChannel
 * sync (useTVDisplay), and cross-device PeerJS broadcast (useDisplaySession).
 */
export function useDisplayBridge({
  mode,
  config,
  settings,
  timerState,
  computed,
  lastHandActive,
  handForHandActive,
  showDealerBadges,
  sidePotData,
  showCallTheClock,
  remoteHostRef,
  remoteHostStatus,
}: UseDisplayBridgeParams): UseDisplayBridgeReturn {
  // Ref keeps timerState fresh for the payload builder without causing re-memoisation
  const timerStateForPayloadRef = useRef(timerState);
  useEffect(() => {
    timerStateForPayloadRef.current = timerState;
  });

  const buildFullStatePayload = useCallback((): DisplayStatePayload => ({
    timerState: timerStateForPayloadRef.current,
    levels: config.levels,
    chipConfig: config.chips,
    colorUpSchedule: serializeColorUpMap(computed.colorUpMap),
    tournamentName: config.name,
    activePlayerCount: computed.activePlayerCount,
    totalPlayerCount: config.players.length,
    isBubble: computed.bubbleActive,
    isLastHand: lastHandActive,
    isHandForHand: handForHandActive,
    players: config.players,
    dealerIndex: config.dealerIndex,
    buyIn: config.buyIn,
    payout: config.payout,
    rebuy: config.rebuy,
    addOn: config.addOn,
    bounty: config.bounty,
    averageStack: computed.averageStack,
    tournamentElapsed: computed.tournamentElapsed,
    tables: config.tables,
    showDealerBadges,
    leagueName: computed.leagueDisplayData?.name,
    leagueStandings: computed.leagueDisplayData?.standings,
    sidePotData: sidePotData ?? undefined,
    displayScreens: settings.displayScreens,
    displayRotationInterval: settings.displayRotationInterval,
    displayLayout: settings.displayLayout,
    currency: config.currency,
  }), [config, computed.colorUpMap, computed.activePlayerCount, computed.bubbleActive, lastHandActive, handForHandActive, computed.averageStack, computed.tournamentElapsed, showDealerBadges, computed.leagueDisplayData, sidePotData, settings.displayScreens, settings.displayRotationInterval, settings.displayLayout]);

  // Local TV window via BroadcastChannel
  const { tvWindowActive, openTVWindow, closeTVWindow } = useTVDisplay({
    mode,
    buildFullStatePayload,
    remainingSeconds: timerState.remainingSeconds,
    timerStatus: timerState.status,
    currentLevelIndex: timerState.currentLevelIndex,
    showCallTheClock,
    callTheClockSeconds: settings.callTheClockSeconds,
    soundEnabled: settings.soundEnabled,
    voiceEnabled: settings.voiceEnabled,
  });

  const handleToggleTVWindow = useCallback(() => {
    if (tvWindowActive) closeTVWindow();
    else openTVWindow();
  }, [tvWindowActive, closeTVWindow, openTVWindow]);

  // Cross-device display via PeerJS
  const { displayCount } = useDisplaySession({
    hostRef: remoteHostRef,
    enabled: mode === 'game' && remoteHostStatus !== null,
    buildFullStatePayload,
    remainingSeconds: timerState.remainingSeconds,
    timerStatus: timerState.status,
    currentLevelIndex: timerState.currentLevelIndex,
    showCallTheClock,
    callTheClockSeconds: settings.callTheClockSeconds,
    soundEnabled: settings.soundEnabled,
    voiceEnabled: settings.voiceEnabled,
  });

  return {
    tvWindowActive,
    handleToggleTVWindow,
    closeTVWindow,
    displayCount,
  };
}
