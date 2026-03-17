import { useState, useEffect, useRef, useCallback } from 'react';
import type { Settings } from '../domain/types';
import type { TranslationKey } from '../i18n/translations';
import { playVictorySound, playBubbleSound, playInTheMoneySound } from '../domain/sounds';
import { announceWinner, announceTournamentWinner, announceBubble, announceInTheMoney } from '../domain/speech';

interface Params {
  mode: 'setup' | 'game' | 'league';
  settings: Settings;
  tournamentFinished: boolean;
  bubbleActive: boolean;
  inTheMoney: boolean;
  winnerName?: string;
  pause: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

interface GameEventsReturn {
  showItmFlash: boolean;
  reset: () => void;
}

export function useGameEvents({
  mode,
  settings,
  tournamentFinished,
  bubbleActive,
  inTheMoney,
  winnerName,
  pause,
  t,
}: Params): GameEventsReturn {
  const [showItmFlash, setShowItmFlash] = useState(false);

  // Auto-pause timer and play victory sound/voice when tournament finishes
  const victoryPlayedRef = useRef(false);
  useEffect(() => {
    if (mode === 'game' && tournamentFinished) {
      pause();
      if (!victoryPlayedRef.current) {
        victoryPlayedRef.current = true;
        const play = async () => {
          if (settings.soundEnabled) await playVictorySound();
          if (settings.voiceEnabled) {
            if (winnerName) {
              announceTournamentWinner(winnerName, t);
            } else {
              announceWinner(t);
            }
          }
        };
        void play();
      }
    }
    if (!tournamentFinished) {
      victoryPlayedRef.current = false;
    }
  }, [mode, tournamentFinished, winnerName, pause, settings.soundEnabled, settings.voiceEnabled, t]);

  // Bubble & ITM sound/voice/visual effects
  const prevBubbleRef = useRef(false);
  const itmFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (mode === 'game') {
      // Bubble just started
      if (bubbleActive && !prevBubbleRef.current) {
        const play = async () => {
          if (settings.soundEnabled) await playBubbleSound();
          if (settings.voiceEnabled) announceBubble(t);
        };
        void play();
      }

      // Bubble just ended (burst) → show ITM flash
      if (!bubbleActive && prevBubbleRef.current && inTheMoney) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: transient ITM flash triggered by external state transition
        setShowItmFlash(true);
        const play = async () => {
          if (settings.soundEnabled) await playInTheMoneySound();
          if (settings.voiceEnabled) announceInTheMoney(t);
        };
        void play();
        if (itmFlashTimeoutRef.current) clearTimeout(itmFlashTimeoutRef.current);
        itmFlashTimeoutRef.current = setTimeout(() => setShowItmFlash(false), 5000);
      }

      prevBubbleRef.current = bubbleActive;
    }

    return () => {
      if (itmFlashTimeoutRef.current) {
        clearTimeout(itmFlashTimeoutRef.current);
        itmFlashTimeoutRef.current = null;
      }
    };
  }, [mode, bubbleActive, inTheMoney, settings.soundEnabled, settings.voiceEnabled, t]);

  // Reset function for switchToSetup
  const reset = useCallback(() => {
    setShowItmFlash(false);
    prevBubbleRef.current = false;
    victoryPlayedRef.current = false;
    if (itmFlashTimeoutRef.current) {
      clearTimeout(itmFlashTimeoutRef.current);
      itmFlashTimeoutRef.current = null;
    }
  }, []);

  return { showItmFlash, reset };
}
