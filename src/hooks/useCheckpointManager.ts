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

  // Keep refs for values that change frequently so the periodic interval always reads fresh data
  const remainingSecondsRef = useRef(remainingSeconds);
  useEffect(() => { remainingSecondsRef.current = remainingSeconds; });

  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; });

  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; });

  const currentLevelIndexRef = useRef(currentLevelIndex);
  useEffect(() => { currentLevelIndexRef.current = currentLevelIndex; });

  const tournamentEventsRef = useRef(tournamentEvents);
  useEffect(() => { tournamentEventsRef.current = tournamentEvents; });

  // Debounced save on state changes (config, settings, level, events)
  useEffect(() => {
    if (mode !== 'game') return;
    if (checkpointDebounceRef.current) clearTimeout(checkpointDebounceRef.current);
    checkpointDebounceRef.current = setTimeout(() => {
      saveCheckpoint({
        version: 1,
        config,
        settings,
        timer: {
          currentLevelIndex,
          remainingSeconds: remainingSecondsRef.current,
        },
        savedAt: new Date().toISOString(),
        events: tournamentEvents,
      });
    }, 500);
    return () => {
      if (checkpointDebounceRef.current) {
        clearTimeout(checkpointDebounceRef.current);
        checkpointDebounceRef.current = null;
      }
    };
  // remainingSeconds intentionally excluded — read via ref to avoid debounce reset on every tick
  }, [mode, config, settings, currentLevelIndex, tournamentEvents]);

  // Periodic save every 5s while timer is running — reads from refs to avoid stale closures
  useEffect(() => {
    if (mode !== 'game' || timerStatus !== 'running') return;
    checkpointIntervalRef.current = setInterval(() => {
      saveCheckpoint({
        version: 1,
        config: configRef.current,
        settings: settingsRef.current,
        timer: {
          currentLevelIndex: currentLevelIndexRef.current,
          remainingSeconds: remainingSecondsRef.current,
        },
        savedAt: new Date().toISOString(),
        events: tournamentEventsRef.current,
      });
    }, 5000);
    return () => {
      if (checkpointIntervalRef.current) {
        clearInterval(checkpointIntervalRef.current);
        checkpointIntervalRef.current = null;
      }
    };
  }, [mode, timerStatus]);
}
