import { useState, useCallback, useEffect, useRef } from 'react';
import type { TournamentEvent } from '../domain/types';
import { createEvent } from '../domain/logic';

type Mode = 'setup' | 'game' | 'league';

interface UseTournamentEventLogParams {
  mode: Mode;
  currentLevelIndex: number;
  timerStatus: 'stopped' | 'running' | 'paused';
  tournamentFinished: boolean;
  /** Whether a checkpoint is being restored (skip clearing events on game start) */
  pendingCheckpoint: boolean;
}

interface UseTournamentEventLogReturn {
  tournamentEvents: TournamentEvent[];
  setTournamentEvents: React.Dispatch<React.SetStateAction<TournamentEvent[]>>;
  handleAppendEvent: (event: TournamentEvent) => void;
}

export function useTournamentEventLog({
  mode,
  currentLevelIndex,
  timerStatus,
  tournamentFinished,
  pendingCheckpoint,
}: UseTournamentEventLogParams): UseTournamentEventLogReturn {
  const [tournamentEvents, setTournamentEvents] = useState<TournamentEvent[]>([]);

  const handleAppendEvent = useCallback((event: TournamentEvent) => {
    setTournamentEvents((prev) => [...prev, event]);
  }, []);

  // --- Timer events: level changes ---
  const prevLevelForEventsRef = useRef(currentLevelIndex);
  useEffect(() => {
    if (mode !== 'game') return;
    const lvl = currentLevelIndex;
    if (lvl !== prevLevelForEventsRef.current) {
      prevLevelForEventsRef.current = lvl;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- event logging on level change
      handleAppendEvent(createEvent('level_start', lvl, { levelNumber: lvl + 1 }));
    }
  }, [mode, currentLevelIndex, handleAppendEvent]);

  // --- Timer events: pause/resume ---
  const prevTimerStatusForEventsRef = useRef(timerStatus);
  useEffect(() => {
    if (mode !== 'game') return;
    const status = timerStatus;
    const prev = prevTimerStatusForEventsRef.current;
    prevTimerStatusForEventsRef.current = status;
    if (prev === status) return;
    if (status === 'paused' && prev === 'running') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- event logging on timer pause
      handleAppendEvent(createEvent('timer_paused', currentLevelIndex, {}));
    } else if (status === 'running' && prev === 'paused') {
      handleAppendEvent(createEvent('timer_resumed', currentLevelIndex, {}));
    }
  }, [mode, timerStatus, currentLevelIndex, handleAppendEvent]);

  // --- Mode transition events ---
  const prevModeForEventsRef = useRef(mode);
  useEffect(() => {
    const prev = prevModeForEventsRef.current;
    prevModeForEventsRef.current = mode;
    if (mode === 'game' && prev !== 'game') {
      // Clear events when starting a new tournament (not restoring from checkpoint)
      if (!pendingCheckpoint) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on tournament start
        setTournamentEvents([]);
      }
      handleAppendEvent(createEvent('tournament_started', 0, {}));
    }
    if (mode === 'setup' && prev === 'game') {
      setTournamentEvents([]);
    }
  }, [mode, handleAppendEvent, pendingCheckpoint]);

  // --- Tournament finished event ---
  const finishedEventLoggedRef = useRef(false);
  useEffect(() => {
    if (mode === 'game' && tournamentFinished && !finishedEventLoggedRef.current) {
      finishedEventLoggedRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- event logging on tournament finish
      handleAppendEvent(createEvent('tournament_finished', currentLevelIndex, {}));
    }
    if (!tournamentFinished) {
      finishedEventLoggedRef.current = false;
    }
  }, [mode, tournamentFinished, currentLevelIndex, handleAppendEvent]);

  return {
    tournamentEvents,
    setTournamentEvents,
    handleAppendEvent,
  };
}
