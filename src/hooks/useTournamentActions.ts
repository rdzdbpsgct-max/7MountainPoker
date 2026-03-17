import { useCallback, useRef, useEffect, startTransition } from 'react';
import type { TournamentConfig, TableMove, TournamentEvent } from '../domain/types';
import {
  computeNextPlacement,
  drawMysteryBounty,
  removePlayerFromTable,
  findTableToDissolve,
  dissolveTable,
  shouldMergeToFinalTable,
  mergeToFinalTable,
  balanceTables,
  seatPlayerAtSmallestTable,
  advanceDealer,
  generatePlayerId,
  initializePlayerStacks,
  reEnterPlayer,
  createEvent,
} from '../domain/logic';
import {
  announceTableMove,
  announceTableDissolution,
  announceMysteryBounty,
} from '../domain/speech';
import type { TranslationKey } from '../i18n/translations';

type TranslationFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

interface UseTournamentActionsParams {
  config: TournamentConfig;
  setConfig: React.Dispatch<React.SetStateAction<TournamentConfig>>;
  mode: 'setup' | 'game' | 'league';
  settings: { voiceEnabled: boolean };
  t: TranslationFn;
  setRecentTableMoves: React.Dispatch<React.SetStateAction<TableMove[]>>;
  currentLevelIndex: number;
  onAppendEvent: (event: TournamentEvent) => void;
  /** Push a snapshot onto the undo stack before a mutation. */
  onPushUndo?: (actionKey: string) => void;
}

export function useTournamentActions({
  config,
  setConfig,
  mode,
  settings,
  t,
  setRecentTableMoves,
  currentLevelIndex,
  onAppendEvent,
  onPushUndo,
}: UseTournamentActionsParams) {
  // Stable ref for push-undo callback (avoids re-creating all action callbacks on undo stack change)
  const pushUndoRef = useRef(onPushUndo);
  useEffect(() => {
    pushUndoRef.current = onPushUndo;
  }); // Intentionally no deps — sync ref on every render
  const pushUndo = useCallback((actionKey: string) => {
    pushUndoRef.current?.(actionKey);
  }, []);

  // Stable refs for values needed inside setConfig updater (avoids stale closures in concurrent mode)
  const onAppendEventRef = useRef(onAppendEvent);
  useEffect(() => { onAppendEventRef.current = onAppendEvent; });
  const currentLevelIndexRef = useRef(currentLevelIndex);
  useEffect(() => { currentLevelIndexRef.current = currentLevelIndex; });

  // --- Stack tracking handlers ---
  const updatePlayerStack = useCallback((playerId: string, chips: number) => {
    pushUndo('undo.actions.updateStack');
    setConfig((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === playerId ? { ...p, chips } : p,
      ),
    }));
  }, [setConfig, pushUndo]);

  const initStacks = useCallback(() => {
    pushUndo('undo.actions.initStacks');
    setConfig((prev) => ({
      ...prev,
      players: initializePlayerStacks(
        prev.players,
        prev.startingChips,
        prev.rebuy.enabled ? prev.rebuy.rebuyChips : 0,
        prev.addOn.enabled ? prev.addOn.chips : 0,
      ),
    }));
  }, [setConfig, pushUndo]);

  const clearStacks = useCallback(() => {
    pushUndo('undo.actions.clearStacks');
    setConfig((prev) => ({
      ...prev,
      players: prev.players.map((p) => ({ ...p, chips: undefined })),
    }));
  }, [setConfig, pushUndo]);

  // --- Rebuy update handler ---
  const updatePlayerRebuys = useCallback((playerId: string, newCount: number) => {
    pushUndo('undo.actions.rebuy');
    setConfig((prev) => {
      const player = prev.players.find((p) => p.id === playerId);
      const diff = player ? newCount - player.rebuys : 0;
      return {
        ...prev,
        players: prev.players.map((p) => {
          if (p.id !== playerId) return p;
          const updated = { ...p, rebuys: newCount };
          // Track rebuy timestamps
          if (diff > 0) {
            const timestamps = [...(p.rebuyTimestamps ?? [])];
            for (let i = 0; i < diff; i++) timestamps.push(Date.now());
            updated.rebuyTimestamps = timestamps;
          }
          if (p.chips !== undefined && diff !== 0) {
            updated.chips = Math.max(0, p.chips + diff * prev.rebuy.rebuyChips);
          }
          return updated;
        }),
      };
    });
    // Log one event per rebuy added
    const player = config.players.find((p) => p.id === playerId);
    const diff = player ? newCount - player.rebuys : 0;
    for (let i = 0; i < diff; i++) {
      onAppendEvent(createEvent('rebuy_taken', currentLevelIndex, { playerId }));
    }
  }, [setConfig, pushUndo, config.players, currentLevelIndex, onAppendEvent]);

  // --- Add-on update handler ---
  const updatePlayerAddOn = useCallback((playerId: string, hasAddOn: boolean) => {
    pushUndo('undo.actions.addOn');
    setConfig((prev) => ({
      ...prev,
      players: prev.players.map((p) => {
        if (p.id !== playerId) return p;
        const updated = { ...p, addOn: hasAddOn };
        if (p.chips !== undefined) {
          updated.chips = hasAddOn
            ? p.chips + prev.addOn.chips
            : Math.max(0, p.chips - prev.addOn.chips);
        }
        return updated;
      }),
    }));
    if (hasAddOn) {
      onAppendEvent(createEvent('addon_taken', currentLevelIndex, { playerId }));
    }
  }, [setConfig, pushUndo, currentLevelIndex, onAppendEvent]);

  // --- Advance dealer ---
  const handleAdvanceDealer = useCallback(() => {
    pushUndo('undo.actions.advanceDealer');
    setConfig((prev) => ({
      ...prev,
      dealerIndex: advanceDealer(prev.players, prev.dealerIndex),
    }));
    onAppendEvent(createEvent('dealer_advanced', currentLevelIndex, {}));
  }, [setConfig, pushUndo, currentLevelIndex, onAppendEvent]);

  // --- Late registration: add player during tournament ---
  const addLatePlayer = useCallback(() => {
    pushUndo('undo.actions.lateRegistration');
    const playerNumber = config.players.length + 1;
    const name = t('playerManager.playerN', { n: playerNumber });
    const newId = generatePlayerId();
    setConfig((prev) => {
      const newPlayer = {
        id: newId,
        name,
        rebuys: 0,
        addOn: false,
        status: 'active' as const,
        placement: null,
        eliminatedBy: null,
        knockouts: 0,
      };
      const updatedPlayers = [...prev.players, newPlayer];

      // Seat at table with fewest active players (multi-table mode)
      let updatedTables = prev.tables;
      if (updatedTables && updatedTables.length > 0) {
        const result = seatPlayerAtSmallestTable(updatedTables, updatedPlayers, newId);
        if (result) {
          updatedTables = result.tables;
        }
      }

      return { ...prev, players: updatedPlayers, tables: updatedTables };
    });
    onAppendEvent(createEvent('late_registration', currentLevelIndex, { playerId: newId, playerName: name }));
  }, [config.players.length, t, setConfig, pushUndo, currentLevelIndex, onAppendEvent]);

  // --- Re-Entry handler ---
  const handleReEntry = useCallback((playerId: string) => {
    pushUndo('undo.actions.reEntry');
    setConfig((prev) => {
      const newPlayers = reEnterPlayer(prev.players, playerId);
      if (newPlayers === prev.players) return prev;

      // Find the newly added player (last one)
      const newPlayer = newPlayers[newPlayers.length - 1];

      // Seat at table with fewest active players (multi-table mode)
      let updatedTables = prev.tables;
      if (updatedTables && updatedTables.length > 0 && newPlayer) {
        const result = seatPlayerAtSmallestTable(updatedTables, newPlayers, newPlayer.id);
        if (result) {
          updatedTables = result.tables;
        }
      }

      return { ...prev, players: newPlayers, tables: updatedTables };
    });
    onAppendEvent(createEvent('re_entry', currentLevelIndex, { playerId, originalPlayerId: playerId }));
  }, [setConfig, pushUndo, currentLevelIndex, onAppendEvent]);

  // --- Reinstate (undo elimination) handler ---
  const reinstatePlayer = useCallback((playerId: string) => {
    pushUndo('undo.actions.reinstate');
    setConfig((prev) => {
      const player = prev.players.find((p) => p.id === playerId);
      if (!player || player.status !== 'eliminated') return prev;

      const killedBy = player.eliminatedBy;
      const reinstatedPlacement = player.placement;

      const updated = prev.players.map((p) => {
        if (p.id === playerId) {
          return { ...p, status: 'active' as const, placement: null, eliminatedBy: null };
        }
        if (killedBy && p.id === killedBy) {
          return { ...p, knockouts: Math.max(0, p.knockouts - 1) };
        }
        if (p.status === 'eliminated' && reinstatedPlacement != null && p.placement != null && p.placement > reinstatedPlacement) {
          return { ...p, placement: p.placement - 1 };
        }
        return p;
      });

      // Re-seat reinstated player at the table with fewest active players
      let updatedTables = prev.tables;
      if (updatedTables && updatedTables.length > 0) {
        const result = seatPlayerAtSmallestTable(updatedTables, updated, playerId);
        if (result) {
          updatedTables = result.tables;
        }
      }

      return { ...prev, players: updated, tables: updatedTables };
    });
    onAppendEvent(createEvent('player_reinstated', currentLevelIndex, { playerId }));
  }, [setConfig, pushUndo, currentLevelIndex, onAppendEvent]);

  // --- Eliminate player handler ---
  const lastMysteryDrawRef = useRef<number | null>(null);
  const pendingTableMovesRef = useRef<TableMove[]>([]);
  const pendingDissolutionRef = useRef<string | null>(null);
  const lastPlacementRef = useRef<number | null>(null);

  const eliminatePlayer = useCallback((playerId: string, eliminatedBy: string | null) => {
    pushUndo('undo.actions.eliminate');
    pendingTableMovesRef.current = [];
    pendingDissolutionRef.current = null;
    // Mark as non-urgent transition — complex multi-table mutations don't need to block INP
    startTransition(() => {
    setConfig((prev) => {
      // Compute placement from fresh prev.players inside updater to avoid stale closures under concurrent mode
      const actualPlacement = computeNextPlacement(prev.players);
      lastPlacementRef.current = actualPlacement;
      onAppendEventRef.current(createEvent('player_eliminated', currentLevelIndexRef.current, {
        playerId,
        eliminatorId: eliminatedBy,
        placement: actualPlacement,
      }));

      // Mystery bounty: draw from pool if applicable
      let updatedBounty = prev.bounty;
      if (prev.bounty.enabled && prev.bounty.type === 'mystery' && prev.bounty.mysteryPool && prev.bounty.mysteryPool.length > 0 && eliminatedBy) {
        const draw = drawMysteryBounty(prev.bounty.mysteryPool);
        lastMysteryDrawRef.current = draw.amount;
        updatedBounty = { ...prev.bounty, amount: draw.amount, mysteryPool: draw.remainingPool };
      }

      const updatedPlayers = prev.players.map((p) => {
        if (p.id === playerId) {
          return { ...p, status: 'eliminated' as const, placement: actualPlacement, eliminatedBy, eliminatedAt: Date.now(), chips: p.chips !== undefined ? 0 : undefined };
        }
        if (eliminatedBy && p.id === eliminatedBy) {
          return { ...p, knockouts: p.knockouts + 1 };
        }
        return p;
      });

      // Multi-table: remove eliminated player from their table + dissolution + balance
      let updatedTables = prev.tables;
      const allMoves: TableMove[] = [];

      if (updatedTables && updatedTables.length > 0) {
        updatedTables = removePlayerFromTable(updatedTables, playerId);

        const threshold = prev.multiTable?.dissolveThreshold ?? 3;

        // Check dissolution: dissolve tables below threshold
        let tableToDissolve = findTableToDissolve(updatedTables, updatedPlayers, threshold);
        while (tableToDissolve) {
          pendingDissolutionRef.current = tableToDissolve.name;
          const dissResult = dissolveTable(updatedTables, updatedPlayers, tableToDissolve.id);
          updatedTables = dissResult.tables;
          allMoves.push(...dissResult.moves);
          tableToDissolve = findTableToDissolve(updatedTables, updatedPlayers, threshold);
        }

        // Check for final table merge
        const activeTables = updatedTables.filter(t => t.status === 'active');
        if (activeTables.length > 1 && shouldMergeToFinalTable(updatedTables, updatedPlayers)) {
          const mergeResult = mergeToFinalTable(updatedTables, updatedPlayers);
          updatedTables = mergeResult.tables;
          allMoves.push(...mergeResult.moves);
        }

        // Auto-balance if enabled
        if (prev.multiTable?.autoBalanceOnElimination !== false) {
          const balResult = balanceTables(updatedTables, updatedPlayers);
          updatedTables = balResult.tables;
          allMoves.push(...balResult.moves);
        }

        if (allMoves.length > 0) {
          pendingTableMovesRef.current = allMoves;
        }
      }

      return {
        ...prev,
        bounty: updatedBounty,
        players: updatedPlayers,
        tables: updatedTables,
      };
    });
    }); // end startTransition
  }, [setConfig, pushUndo]);

  // Voice: Mystery bounty draw
  useEffect(() => {
    if (mode !== 'game' || !settings.voiceEnabled) return;
    if (lastMysteryDrawRef.current !== null) {
      announceMysteryBounty(lastMysteryDrawRef.current, t);
      lastMysteryDrawRef.current = null;
    }
  }, [mode, settings.voiceEnabled, config.bounty, t]);

  // Process pending table moves from elimination handler (dissolution, balance, merge)
  useEffect(() => {
    if (pendingTableMovesRef.current.length === 0) return;
    const moves = pendingTableMovesRef.current;
    pendingTableMovesRef.current = [];
    setRecentTableMoves(prev => [...prev, ...moves]);
    if (settings.voiceEnabled) {
      if (pendingDissolutionRef.current) {
        announceTableDissolution(pendingDissolutionRef.current, t);
        pendingDissolutionRef.current = null;
      }
      for (const move of moves) {
        announceTableMove(move.playerName, move.toTableName, move.toSeat, t);
      }
    }
  }, [config.tables, settings.voiceEnabled, t, setRecentTableMoves]);

  return {
    updatePlayerStack,
    initStacks,
    clearStacks,
    updatePlayerRebuys,
    updatePlayerAddOn,
    handleAdvanceDealer,
    addLatePlayer,
    handleReEntry,
    reinstatePlayer,
    eliminatePlayer,
  };
}
