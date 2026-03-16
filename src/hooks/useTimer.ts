import { useState, useRef, useCallback, useEffect } from 'react';
import type { Level, TimerState, Settings } from '../domain/types';
import {
  computeRemaining,
  advanceLevel,
  previousLevel as prevLevel,
  resetCurrentLevel,
  restartTournament,
} from '../domain/logic';
import { initAudio, playBeep } from '../domain/sounds';
import { initAudioContext } from '../domain/audioPlayer';
import { initSpeech, announceCountdown } from '../domain/speech';

const TICK_INTERVAL_MS = 250;

export function useTimer(levels: Level[], settings: Settings, pauseAtLevelIndex?: number) {
  const [timerState, setTimerState] = useState<TimerState>(() =>
    restartTournament(levels),
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCountdownSecRef = useRef<number | null>(null);
  const levelEndAudioPlayedRef = useRef(false);

  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Tick function: compute remaining from wall clock
  const tick = useCallback(() => {
    setTimerState((prev) => {
      if (prev.status !== 'running' || prev.startedAt === null || prev.remainingAtStart === null) {
        return prev;
      }

      const now = Date.now();
      const remaining = computeRemaining(prev.startedAt, prev.remainingAtStart, now);

      // Countdown for last 10 seconds — uses Math.floor to match the
      // displayed time (formatTime also uses Math.floor)
      const displaySec = Math.floor(remaining);
      const isPlayLevel = levels[prev.currentLevelIndex]?.type === 'level';

      if (settings.countdownEnabled) {
        if (displaySec <= 10 && displaySec >= 0 && displaySec !== lastCountdownSecRef.current) {
          lastCountdownSecRef.current = displaySec;
          if (displaySec === 0) {
            // Don't announce zero — level end beep handles this (below)
          } else if (settings.voiceEnabled && isPlayLevel && announceCountdown(displaySec)) {
            // Voice countdown (MP3 or speech) — plays for play levels only (not breaks)
          } else if (settings.soundEnabled) {
            // Beep when voice is off or during breaks
            playBeep(displaySec <= 3 ? 880 : 660, 100);
          }
        }
      }

      // Level-end beep: play when display shows 0:00 (not when remaining
      // actually crosses zero — that can be up to 1 second later)
      if (displaySec <= 0 && !levelEndAudioPlayedRef.current) {
        levelEndAudioPlayedRef.current = true;
        if (settings.soundEnabled) playBeep(1000, 500);
      }

      if (remaining <= 0) {

        if (settings.autoAdvance) {
          const next = advanceLevel(prev, levels);
          lastCountdownSecRef.current = null;
          levelEndAudioPlayedRef.current = false;
          if (next.status === 'stopped' && next.currentLevelIndex > prev.currentLevelIndex) {
            // Pause instead of auto-start when reaching add-on level (no break)
            if (pauseAtLevelIndex !== undefined && next.currentLevelIndex === pauseAtLevelIndex) {
              return { ...next, status: 'paused' };
            }
            // Auto-start the next level
            return {
              ...next,
              status: 'running',
              startedAt: now,
              remainingAtStart: next.remainingSeconds,
            };
          }
          return next;
        }

        return {
          ...prev,
          remainingSeconds: 0,
          status: 'stopped',
          startedAt: null,
          remainingAtStart: null,
        };
      }

      return { ...prev, remainingSeconds: remaining };
    });
  }, [levels, settings.autoAdvance, settings.countdownEnabled, settings.soundEnabled, settings.voiceEnabled, pauseAtLevelIndex]);

  // Start the interval when running
  useEffect(() => {
    if (timerState.status === 'running') {
      clearTick();
      intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);
    } else {
      clearTick();
    }
    return clearTick;
  }, [timerState.status, tick, clearTick]);

  // Reset timer state when levels change externally (e.g. preset switch)
  // This is a legitimate prop→state sync — setState is needed to reset the timer.
  const prevLevelsRef = useRef(levels);
  useEffect(() => {
    if (levels !== prevLevelsRef.current) {
      prevLevelsRef.current = levels;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimerState(restartTournament(levels));
      // clearTick will happen via the status-based useEffect above
      // since restartTournament returns status='stopped'
    }
  }, [levels]);

  const start = useCallback(() => {
    initAudio(); initAudioContext(); initSpeech(); // Unlock AudioContext + Speech from user gesture
    lastCountdownSecRef.current = null;
    levelEndAudioPlayedRef.current = false;
    setTimerState((prev) => {
      if (prev.status === 'running') return prev;
      const now = Date.now();
      return {
        ...prev,
        status: 'running',
        startedAt: now,
        remainingAtStart: prev.remainingSeconds,
      };
    });
  }, []);

  const pause = useCallback(() => {
    lastCountdownSecRef.current = null;
    levelEndAudioPlayedRef.current = false;
    setTimerState((prev) => {
      if (prev.status !== 'running' || prev.startedAt === null || prev.remainingAtStart === null) return prev;
      const remaining = computeRemaining(prev.startedAt, prev.remainingAtStart, Date.now());
      return {
        ...prev,
        status: 'paused',
        remainingSeconds: remaining,
        startedAt: null,
        remainingAtStart: null,
      };
    });
  }, []);

  const toggleStartPause = useCallback(() => {
    initAudio(); initAudioContext(); initSpeech(); // Unlock AudioContext + Speech from user gesture
    setTimerState((prev) => {
      if (prev.status === 'running') {
        // Pause
        lastCountdownSecRef.current = null;
        levelEndAudioPlayedRef.current = false;
        if (prev.startedAt === null || prev.remainingAtStart === null) return prev;
        const remaining = computeRemaining(prev.startedAt, prev.remainingAtStart, Date.now());
        return {
          ...prev,
          status: 'paused',
          remainingSeconds: remaining,
          startedAt: null,
          remainingAtStart: null,
        };
      } else {
        // Start / Resume
        if (prev.remainingSeconds <= 0) return prev;
        lastCountdownSecRef.current = null;
        levelEndAudioPlayedRef.current = false;
        const now = Date.now();
        return {
          ...prev,
          status: 'running',
          startedAt: now,
          remainingAtStart: prev.remainingSeconds,
        };
      }
    });
  }, []);

  const nextLevel = useCallback(() => {
    initAudio(); initAudioContext(); initSpeech(); // Unlock AudioContext + Speech from user gesture
    clearTick();
    lastCountdownSecRef.current = null;
    levelEndAudioPlayedRef.current = false;
    const now = Date.now();
    setTimerState((prev) => {
      const next = advanceLevel(prev, levels);
      if (next.remainingSeconds > 0) {
        return { ...next, status: 'running', startedAt: now, remainingAtStart: next.remainingSeconds };
      }
      return next;
    });
  }, [levels, clearTick, tick]);

  const previousLevel = useCallback(() => {
    initAudio(); initAudioContext(); initSpeech(); // Unlock AudioContext + Speech from user gesture
    clearTick();
    lastCountdownSecRef.current = null;
    levelEndAudioPlayedRef.current = false;
    const now = Date.now();
    setTimerState((prev) => {
      const next = prevLevel(prev, levels);
      if (next.remainingSeconds > 0) {
        return { ...next, status: 'running', startedAt: now, remainingAtStart: next.remainingSeconds };
      }
      return next;
    });
  }, [levels, clearTick, tick]);

  const resetLevel = useCallback(() => {
    clearTick();
    lastCountdownSecRef.current = null;
    levelEndAudioPlayedRef.current = false;
    setTimerState((prev) => resetCurrentLevel(prev, levels));
  }, [levels, clearTick]);

  const restart = useCallback(() => {
    clearTick();
    lastCountdownSecRef.current = null;
    levelEndAudioPlayedRef.current = false;
    setTimerState(restartTournament(levels));
  }, [levels, clearTick]);

  const setRemainingSeconds = useCallback((seconds: number) => {
    clearTick();
    lastCountdownSecRef.current = null;
    levelEndAudioPlayedRef.current = false;
    setTimerState((prev) => ({
      ...prev,
      remainingSeconds: Math.max(0, Math.min(seconds, levels[prev.currentLevelIndex]?.durationSeconds ?? 0)),
      status: 'paused' as const,
      startedAt: null,
      remainingAtStart: null,
    }));
  }, [levels, clearTick]);

  const extendLevel = useCallback((additionalSeconds: number) => {
    setTimerState((prev) => {
      if (additionalSeconds <= 0) return prev;
      if (prev.status === 'running' && prev.remainingAtStart !== null) {
        // Running: extend the remaining-at-start so wall-clock computation yields more time
        return {
          ...prev,
          remainingAtStart: prev.remainingAtStart + additionalSeconds,
          remainingSeconds: prev.remainingSeconds + additionalSeconds,
        };
      }
      // Paused or stopped: just add to remainingSeconds
      return {
        ...prev,
        remainingSeconds: prev.remainingSeconds + additionalSeconds,
      };
    });
  }, []);

  const restoreLevel = useCallback((levelIndex: number, remaining: number) => {
    clearTick();
    lastCountdownSecRef.current = null;
    levelEndAudioPlayedRef.current = false;
    const clamped = Math.max(0, Math.min(levelIndex, levels.length - 1));
    setTimerState({
      currentLevelIndex: clamped,
      remainingSeconds: Math.max(0, remaining),
      status: 'paused',
      startedAt: null,
      remainingAtStart: null,
    });
  }, [levels, clearTick]);

  return {
    timerState,
    start,
    pause,
    toggleStartPause,
    nextLevel,
    previousLevel,
    resetLevel,
    restart,
    setRemainingSeconds,
    extendLevel,
    restoreLevel,
  };
}
