import { useEffect, useRef } from 'react';
import type { TournamentConfig, Settings, TournamentEvent } from '../domain/types';
import { saveCheckpoint } from '../domain/logic';

type Mode = 'setup' | 'game' | 'league';

interface UseCheckpointManagerParams {
  mode: Mode;
  config: TournamentConfig;
  settings: Settings;
  currentLevelIndex: number;
  remainingSeconds: number;
  timerStatus: 'stopped' | 'running' | 'paused';
  tournamentEvents: TournamentEvent[];
}

/**
 * Auto-saves tournament checkpoint in game mode.
 *
 * - Debounces saves by 500ms on config/settings changes to avoid blocking during rapid interactions.
 * - Periodic saves every 5s while timer is running (instead of every tick).
 * - `remainingSeconds` is intentionally excluded from the dependency array; the periodic
 *   interval handles timer-progress saves.
 */
export function useCheckpointManager({
  mode,
  config,
  settings,
  currentLevelIndex,
  remainingSeconds,
  timerStatus,
  tournamentEvents,
}: UseCheckpointManagerParams): void {
  const checkpointIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkpointDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode !== 'game') return;
    const doSave = () => {
      saveCheckpoint({
        version: 1,
        config,
        settings,
        timer: {
          currentLevelIndex,
          remainingSeconds,
        },
        savedAt: new Date().toISOString(),
        events: tournamentEvents,
      });
    };
    // Debounce save to avoid blocking during rapid config mutations (e.g. elimination cascade)
    if (checkpointDebounceRef.current) clearTimeout(checkpointDebounceRef.current);
    checkpointDebounceRef.current = setTimeout(doSave, 500);
    // For running timer: periodic save every 5s (instead of every tick)
    if (checkpointIntervalRef.current) clearInterval(checkpointIntervalRef.current);
    if (timerStatus === 'running') {
      checkpointIntervalRef.current = setInterval(doSave, 5000);
    }
    return () => {
      if (checkpointIntervalRef.current) {
        clearInterval(checkpointIntervalRef.current);
        checkpointIntervalRef.current = null;
      }
      if (checkpointDebounceRef.current) {
        clearTimeout(checkpointDebounceRef.current);
        checkpointDebounceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- remainingSeconds intentionally excluded: interval handles periodic saves
  }, [mode, config, settings, currentLevelIndex, timerStatus, tournamentEvents]);
}
