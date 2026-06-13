import { useEffect, useRef, useCallback } from 'react';
import { useRefSync } from './useRefSync';
import type { TournamentConfig, Settings, TimerState, ChipDenomination, AlertConfig } from '../domain/types';
import type { TranslationKey } from '../i18n/translations';
import {
  announceLevelChange,
  announceBreakStart,
  announceBreakWarning,
  announceBreakOver,
  announceAddOn,
  announceRebuyEnded,
  announceRebuyTaken,
  announceColorUp,
  announceColorUpWarning,
  announceBounty,
  announceElimination,
  announceRebuyAvailable,
  announceFiveMinutes,
  announceThreeRemaining,
  announcePlayersRemaining,
  announceHeadsUp,
  announceTimerPaused,
  announceTimerResumed,
  speakCustomText,
} from '../domain/speech';
import { shouldFireAlert, interpolateAlertText } from '../domain/alertEngine';
import { playBeep, playChimeSound } from '../domain/sounds';

interface Params {
  mode: 'setup' | 'game' | 'league';
  settings: Settings;
  config: TournamentConfig;
  timerState: TimerState;
  colorUpMap: Map<number, ChipDenomination[]>;
  activePlayerCount: number;
  paidPlaces: number;
  bubbleActive: boolean;
  inTheMoney: boolean;
  addOnWindowOpen: boolean;
  rebuyActive: boolean;
  tournamentFinished: boolean;
  onLevelChange: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

export function useVoiceAnnouncements({
  mode,
  settings,
  config,
  timerState,
  colorUpMap,
  activePlayerCount,
  paidPlaces,
  addOnWindowOpen,
  rebuyActive,
  tournamentFinished,
  onLevelChange,
  t,
}: Params) {
  // Stable integer-second value — avoids re-firing effects 4×/sec from float ticks
  const displaySeconds = Math.floor(timerState.remainingSeconds);

  // Refs for values read inside effects with minimal dependency arrays (avoids stale closures)
  const modeRef = useRefSync(mode);
  const customAlertsRef = useRefSync(settings.customAlerts ?? [] as AlertConfig[]);
  const displaySecondsRef = useRefSync(displaySeconds);
  const configLevelsRef = useRefSync(config.levels);
  const activePlayerCountRef = useRefSync(activePlayerCount);
  const currentLevelIndexRef = useRefSync(timerState.currentLevelIndex);

  // Voice: Level change announcement
  const prevLevelIdxVoiceRef = useRef(timerState.currentLevelIndex);
  useEffect(() => {
    if (mode !== 'game' || !settings.voiceEnabled) return;
    const idx = timerState.currentLevelIndex;
    if (idx === prevLevelIdxVoiceRef.current) return;
    const prevIdx = prevLevelIdxVoiceRef.current;
    prevLevelIdxVoiceRef.current = idx;
    onLevelChange();

    const level = config.levels[idx];
    if (!level) return;

    if (level.type === 'break') {
      const minutes = Math.round(level.durationSeconds / 60);
      announceBreakStart(minutes, t, level.label);
    } else {
      const prevLevel = config.levels[prevIdx];
      if (prevLevel?.type === 'break') {
        announceBreakOver(t);
      }

      const playLevelNum = config.levels.slice(0, idx + 1).filter(l => l.type === 'level').length;
      announceLevelChange(playLevelNum, level.smallBlind ?? 0, level.bigBlind ?? 0, level.ante, t);

      // Color-up warning: next level is a break with color-up event
      if (config.chips.enabled && config.chips.colorUpEnabled) {
        const nextLevel = config.levels[idx + 1];
        if (nextLevel?.type === 'break') {
          const nextColorUpChips = colorUpMap.get(idx + 1);
          if (nextColorUpChips && nextColorUpChips.length > 0) {
            announceColorUpWarning(t);
          }
        }
      }
    }

    // Color-up announcement — queued after the level/break announcement
    if (config.chips.enabled && config.chips.colorUpEnabled) {
      const colorUpChips = colorUpMap.get(idx);
      if (colorUpChips && colorUpChips.length > 0) {
        const labels = colorUpChips.map((d: { label: string }) => d.label).join(', ');
        announceColorUp(labels, t);
      }
    }
  }, [mode, timerState.currentLevelIndex, config.levels, config.chips, colorUpMap, settings.voiceEnabled, onLevelChange, t]);

  // Voice: Break warning (30 seconds remaining in break)
  const breakWarningRef = useRef(false);
  useEffect(() => {
    if (mode !== 'game' || !settings.voiceEnabled) return;
    const level = config.levels[timerState.currentLevelIndex];
    if (!level || level.type !== 'break') {
      breakWarningRef.current = false;
      return;
    }
    if (displaySeconds <= 30 && displaySeconds > 28 && !breakWarningRef.current) {
      breakWarningRef.current = true;
      announceBreakWarning(t);
    }
    if (displaySeconds > 30) {
      breakWarningRef.current = false;
    }
  }, [mode, settings.voiceEnabled, config.levels, timerState.currentLevelIndex, displaySeconds, t]);

  // Voice: Five-minute warning (play levels > 5 min only)
  const fiveMinWarningRef = useRef(false);
  useEffect(() => {
    if (mode !== 'game' || !settings.voiceEnabled) return;
    const level = config.levels[timerState.currentLevelIndex];
    if (!level || level.type !== 'level' || level.durationSeconds <= 300) {
      fiveMinWarningRef.current = false;
      return;
    }
    if (displaySeconds <= 300 && displaySeconds > 298 && !fiveMinWarningRef.current) {
      fiveMinWarningRef.current = true;
      announceFiveMinutes(t);
    }
    if (displaySeconds > 300) {
      fiveMinWarningRef.current = false;
    }
  }, [mode, settings.voiceEnabled, config.levels, timerState.currentLevelIndex, displaySeconds, t]);

  // Voice: Player elimination + Bounty collected
  const prevPlayersRef = useRef(config.players);
  useEffect(() => {
    if (mode !== 'game' || !settings.voiceEnabled) return;
    const prev = prevPlayersRef.current;
    prevPlayersRef.current = config.players;
    // Detect any newly eliminated player(s) — announce once even if multiple eliminated simultaneously
    let foundElimination = false;
    for (const player of config.players) {
      if (player.status === 'eliminated' && player.placement !== null) {
        const prevPlayer = prev.find(p => p.id === player.id);
        if (prevPlayer && prevPlayer.status === 'active') {
          foundElimination = true;
          break; // one announcement is sufficient regardless of how many eliminated
        }
      }
    }
    if (foundElimination) {
      announceElimination(t);
      if (config.bounty.enabled) announceBounty(t);
      if (rebuyActive) announceRebuyAvailable(t);
    }
  }, [mode, config.players, settings.voiceEnabled, config.bounty.enabled, rebuyActive, t]);

  // Voice: Player count milestones (dynamic based on paidPlaces) + Heads-Up
  const prevActiveCountRef = useRef(activePlayerCount);
  const headsUpAnnouncedRef = useRef(false);
  useEffect(() => {
    if (mode === 'game' && settings.voiceEnabled) {
      const prev = prevActiveCountRef.current;
      // Reset heads-up flag when count goes above 2 (e.g. re-entry)
      if (activePlayerCount > 2) headsUpAnnouncedRef.current = false;
      if (activePlayerCount < prev) {
        if (activePlayerCount === 2 && !headsUpAnnouncedRef.current) {
          announceHeadsUp(t);
          headsUpAnnouncedRef.current = true;
        } else if (activePlayerCount === 3) {
          announceThreeRemaining(t);
        } else if (activePlayerCount >= 4 && activePlayerCount <= paidPlaces) {
          announcePlayersRemaining(activePlayerCount, t);
        }
      }
    }
    prevActiveCountRef.current = activePlayerCount;
  }, [mode, activePlayerCount, paidPlaces, settings.voiceEnabled, t]);

  // Voice: Timer paused/resumed (user-initiated only, not on tournament finish)
  const prevTimerStatusRef = useRef(timerState.status);
  useEffect(() => {
    const status = timerState.status;
    const prevStatus = prevTimerStatusRef.current;
    prevTimerStatusRef.current = status;

    if (mode !== 'game' || !settings.voiceEnabled || tournamentFinished) return;

    if (status === 'paused' && prevStatus === 'running') {
      announceTimerPaused(t);
    }
    if (status === 'running' && prevStatus === 'paused') {
      announceTimerResumed(t);
    }
  }, [mode, settings.voiceEnabled, timerState.status, tournamentFinished, t]);

  // Voice: Rebuy ended + Add-On available when addOnWindowOpen becomes true
  const prevAddOnWindowRef = useRef(false);
  useEffect(() => {
    if (addOnWindowOpen && !prevAddOnWindowRef.current && settings.voiceEnabled && mode === 'game') {
      announceRebuyEnded(t);
      announceAddOn(t);
    }
    prevAddOnWindowRef.current = addOnWindowOpen;
  }, [addOnWindowOpen, settings.voiceEnabled, mode, t]);

  // Voice: Rebuy ended (without add-on)
  const prevRebuyForVoice = useRef(rebuyActive);
  useEffect(() => {
    if (prevRebuyForVoice.current && !rebuyActive && !config.addOn.enabled && config.rebuy.enabled
        && settings.voiceEnabled && mode === 'game') {
      announceRebuyEnded(t);
    }
    prevRebuyForVoice.current = rebuyActive;
  }, [rebuyActive, config.addOn.enabled, config.rebuy.enabled, settings.voiceEnabled, mode, t]);

  // Voice: Rebuy taken — announce when total rebuys increase
  const totalRebuys = config.players.reduce((sum, p) => sum + p.rebuys, 0);
  const prevTotalRebuysRef = useRef(totalRebuys);
  useEffect(() => {
    if (mode !== 'game' || !settings.voiceEnabled) {
      prevTotalRebuysRef.current = totalRebuys;
      return;
    }
    if (totalRebuys > prevTotalRebuysRef.current) {
      announceRebuyTaken(t);
    }
    prevTotalRebuysRef.current = totalRebuys;
  }, [mode, settings.voiceEnabled, totalRebuys, t]);

  // ── Custom Alert Engine ──────────────────────────────────────────────────
  const firedAlertsRef = useRef<Set<string>>(new Set());

  // Helper to fire a single alert (sound + voice)
  const fireAlert = useCallback((alert: AlertConfig, levelIdx: number, players: number) => {
    if (alert.sound === 'beep') playBeep(880, 200);
    if (alert.sound === 'chime') void playChimeSound();
    if (alert.voice && alert.text) {
      const interpolated = interpolateAlertText(alert.text, {
        levelIndex: levelIdx,
        config,
        activePlayers: players,
      });
      speakCustomText(interpolated);
    }
  }, [config]);

  const fireAlertRef = useRef(fireAlert);
  useEffect(() => { fireAlertRef.current = fireAlert; }, [fireAlert]);

  // Reset fired alerts on level change
  const prevLevelForAlertsRef = useRef(timerState.currentLevelIndex);
  useEffect(() => {
    if (timerState.currentLevelIndex !== prevLevelForAlertsRef.current) {
      firedAlertsRef.current = new Set();
      prevLevelForAlertsRef.current = timerState.currentLevelIndex;
    }
  }, [timerState.currentLevelIndex]);

  // Custom alerts: level_start + break_start
  useEffect(() => {
    if (modeRef.current !== 'game' || customAlertsRef.current.length === 0) return;
    const idx = timerState.currentLevelIndex;
    const level = configLevelsRef.current[idx];
    if (!level) return;

    const triggerType = level.type === 'break' ? 'break_start' : 'level_start';

    for (const alert of customAlertsRef.current) {
      if (firedAlertsRef.current.has(alert.id)) continue;
      if (shouldFireAlert(alert, triggerType, {
        levelIndex: idx,
        remainingSeconds: displaySecondsRef.current,
        activePlayers: activePlayerCountRef.current,
        prevActivePlayers: activePlayerCountRef.current,
      })) {
        firedAlertsRef.current.add(alert.id);
        fireAlertRef.current(alert, idx, activePlayerCountRef.current);
      }
    }
  }, [timerState.currentLevelIndex, activePlayerCountRef, configLevelsRef, customAlertsRef, displaySecondsRef, modeRef]);

  // Custom alerts: time_remaining
  useEffect(() => {
    if (modeRef.current !== 'game' || customAlertsRef.current.length === 0) return;
    const idx = currentLevelIndexRef.current;

    for (const alert of customAlertsRef.current) {
      if (alert.trigger !== 'time_remaining') continue;
      if (firedAlertsRef.current.has(alert.id)) continue;
      if (shouldFireAlert(alert, 'time_remaining', {
        levelIndex: idx,
        remainingSeconds: displaySecondsRef.current,
        activePlayers: activePlayerCountRef.current,
        prevActivePlayers: activePlayerCountRef.current,
      })) {
        firedAlertsRef.current.add(alert.id);
        fireAlertRef.current(alert, idx, activePlayerCountRef.current);
      }
    }
  }, [displaySeconds, activePlayerCountRef, currentLevelIndexRef, customAlertsRef, displaySecondsRef, modeRef]);

  // Custom alerts: player_count
  const prevActiveForAlertsRef = useRef(activePlayerCount);
  useEffect(() => {
    if (modeRef.current !== 'game' || customAlertsRef.current.length === 0) {
      prevActiveForAlertsRef.current = activePlayerCount;
      return;
    }
    const prev = prevActiveForAlertsRef.current;
    const idx = currentLevelIndexRef.current;

    for (const alert of customAlertsRef.current) {
      if (alert.trigger !== 'player_count') continue;
      if (firedAlertsRef.current.has(alert.id)) continue;
      if (shouldFireAlert(alert, 'player_count', {
        levelIndex: idx,
        remainingSeconds: displaySecondsRef.current,
        activePlayers: activePlayerCount,
        prevActivePlayers: prev,
      })) {
        firedAlertsRef.current.add(alert.id);
        fireAlertRef.current(alert, idx, activePlayerCount);
      }
    }
    prevActiveForAlertsRef.current = activePlayerCount;
  }, [activePlayerCount, currentLevelIndexRef, customAlertsRef, displaySecondsRef, modeRef]);

  // Reset function for switchToSetup
  const reset = useCallback(() => {
    fiveMinWarningRef.current = false;
    breakWarningRef.current = false;
    firedAlertsRef.current = new Set();
    headsUpAnnouncedRef.current = false;
  }, []);

  return { reset };
}
