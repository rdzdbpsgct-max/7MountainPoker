import { useState, useRef, useEffect, useCallback } from 'react';
import type { DisplayStatePayload } from '../domain/displayChannel';
import { createDisplayChannel, sendDisplayMessage, withDisplayContract, isDisplayMessage } from '../domain/displayChannel';

interface UseTVDisplayOptions {
  mode: string;
  buildFullStatePayload: () => DisplayStatePayload;
  remainingSeconds: number;
  timerStatus: string;
  currentLevelIndex: number;
  showCallTheClock: boolean;
  callTheClockSeconds: number;
  soundEnabled: boolean;
  voiceEnabled: boolean;
}

export function useTVDisplay({
  mode,
  buildFullStatePayload,
  remainingSeconds,
  timerStatus,
  currentLevelIndex,
  showCallTheClock,
  callTheClockSeconds,
  soundEnabled,
  voiceEnabled,
}: UseTVDisplayOptions) {
  const [tvWindowActive, setTvWindowActive] = useState(false);
  const tvWindowRef = useRef<Window | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const buildPayloadRef = useRef(buildFullStatePayload);
  useEffect(() => { buildPayloadRef.current = buildFullStatePayload; }, [buildFullStatePayload]);

  // Create/destroy channel based on game mode + tvWindowActive
  useEffect(() => {
    if (mode !== 'game' || !tvWindowActive) {
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
      return;
    }
    const channel = createDisplayChannel();
    channelRef.current = channel;

    // Listen for request-state from TV window (solves race condition on TV window open)
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (isDisplayMessage(event.data) && event.data.type === 'request-state') {
        sendDisplayMessage(channel, withDisplayContract({ type: 'full-state', payload: buildPayloadRef.current() }));
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [mode, tvWindowActive]);

  // Poll for TV window closed
  useEffect(() => {
    if (!tvWindowActive) return;
    const id = setInterval(() => {
      if (tvWindowRef.current?.closed) {
        tvWindowRef.current = null;
        setTvWindowActive(false);
      }
    }, 2000);
    return () => clearInterval(id);
  }, [tvWindowActive]);

  // Open TV window
  const openTVWindow = useCallback(() => {
    if (tvWindowActive && tvWindowRef.current && !tvWindowRef.current.closed) {
      tvWindowRef.current.focus();
      return;
    }
    const basePath = import.meta.env.BASE_URL || '/';
    const url = basePath + '#display';
    const win = window.open(url, 'poker-tv', 'width=1280,height=720');
    if (win) {
      tvWindowRef.current = win;
      setTvWindowActive(true);
    }
  }, [tvWindowActive]);

  // Close TV window
  const closeTVWindow = useCallback(() => {
    if (channelRef.current) {
      sendDisplayMessage(channelRef.current, withDisplayContract({ type: 'close' }));
    }
    if (tvWindowRef.current && !tvWindowRef.current.closed) {
      tvWindowRef.current.close();
    }
    tvWindowRef.current = null;
    setTvWindowActive(false);
  }, []);

  // Sync Call the Clock state to TV window
  useEffect(() => {
    if (!channelRef.current || !tvWindowActive) return;
    if (showCallTheClock) {
      sendDisplayMessage(channelRef.current, withDisplayContract({
        type: 'call-the-clock',
        payload: {
          durationSeconds: callTheClockSeconds,
          soundEnabled,
          voiceEnabled,
        },
      }));
    } else {
      sendDisplayMessage(channelRef.current, withDisplayContract({ type: 'call-the-clock-dismiss' }));
    }
  }, [showCallTheClock, tvWindowActive, callTheClockSeconds, soundEnabled, voiceEnabled]);

  // Send full-state on significant changes
  useEffect(() => {
    if (!channelRef.current || !tvWindowActive) return;
    sendDisplayMessage(channelRef.current, withDisplayContract({ type: 'full-state', payload: buildFullStatePayload() }));
  }, [tvWindowActive, buildFullStatePayload]);

  // Send timer tick every 500ms for smooth timer display
  useEffect(() => {
    if (!tvWindowActive || mode !== 'game') return;
    const id = setInterval(() => {
      if (!channelRef.current) return;
      sendDisplayMessage(channelRef.current, withDisplayContract({
        type: 'timer-tick',
        payload: {
          remainingSeconds,
          status: timerStatus,
          currentLevelIndex,
        },
      }));
    }, 500);
    return () => clearInterval(id);
  }, [tvWindowActive, mode, remainingSeconds, timerStatus, currentLevelIndex]);

  return {
    tvWindowActive,
    openTVWindow,
    closeTVWindow,
  };
}
