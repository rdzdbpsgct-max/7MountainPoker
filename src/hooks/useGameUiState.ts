import { useState, useEffect } from 'react';
import type { TableMove, PotResult, PlayerPayout } from '../domain/types';

export interface SidePotState {
  pots: PotResult[];
  total: number;
  payouts?: PlayerPayout[] | undefined;
}

export interface GameUiState {
  lastHandActive: boolean;
  handForHandActive: boolean;
  showDealerBadges: boolean;
  sidePotData: SidePotState | null;
  recentTableMoves: TableMove[];
  addOnEndLevelIndex: number | null;
}

export interface GameUiActions {
  setLastHandActive: React.Dispatch<React.SetStateAction<boolean>>;
  setHandForHandActive: React.Dispatch<React.SetStateAction<boolean>>;
  setShowDealerBadges: React.Dispatch<React.SetStateAction<boolean>>;
  setSidePotData: React.Dispatch<React.SetStateAction<SidePotState | null>>;
  setRecentTableMoves: React.Dispatch<React.SetStateAction<TableMove[]>>;
  setAddOnEndLevelIndex: React.Dispatch<React.SetStateAction<number | null>>;
}

/**
 * Consolidates game-mode UI state that is toggled or set during an active tournament.
 * Auto-dismisses recent table moves after 30 seconds.
 */
export function useGameUiState(): GameUiState & GameUiActions {
  const [lastHandActive, setLastHandActive] = useState(false);
  const [handForHandActive, setHandForHandActive] = useState(false);
  const [showDealerBadges, setShowDealerBadges] = useState(true);
  const [sidePotData, setSidePotData] = useState<SidePotState | null>(null);
  const [recentTableMoves, setRecentTableMoves] = useState<TableMove[]>([]);
  const [addOnEndLevelIndex, setAddOnEndLevelIndex] = useState<number | null>(null);

  // Auto-dismiss recent table moves after 30 seconds
  useEffect(() => {
    if (recentTableMoves.length === 0) return;
    const timerId = setTimeout(() => {
      const cutoff = Date.now() - 30_000;
      setRecentTableMoves(prev => prev.filter(m => m.timestamp > cutoff));
    }, 30_000);
    return () => clearTimeout(timerId);
  }, [recentTableMoves]);

  return {
    lastHandActive,
    handForHandActive,
    showDealerBadges,
    sidePotData,
    recentTableMoves,
    addOnEndLevelIndex,
    setLastHandActive,
    setHandForHandActive,
    setShowDealerBadges,
    setSidePotData,
    setRecentTableMoves,
    setAddOnEndLevelIndex,
  };
}
