import { useState, useCallback } from 'react';
import type { Player, Table, TournamentConfig, TournamentEvent } from '../domain/types';
import { UndoStack, createUndoSnapshot } from '../domain/undoStack';

interface UseUndoManagerParams {
  players: Player[];
  tables: Table[] | undefined;
  tournamentEvents: TournamentEvent[];
  dealerIndex: number;
  setConfig: React.Dispatch<React.SetStateAction<TournamentConfig>>;
  setTournamentEvents: React.Dispatch<React.SetStateAction<TournamentEvent[]>>;
}

export interface UndoManagerResult {
  undoStack: UndoStack;
  setUndoStack: React.Dispatch<React.SetStateAction<UndoStack>>;
  pushUndoSnapshot: (actionKey: string) => void;
  handleUndo: () => void;
  handleRedo: () => void;
}

/**
 * Manages the undo/redo stack for tournament actions.
 * The caller is responsible for resetting the stack on mode transitions.
 */
export function useUndoManager({
  players,
  tables,
  tournamentEvents,
  dealerIndex,
  setConfig,
  setTournamentEvents,
}: UseUndoManagerParams): UndoManagerResult {
  const [undoStack, setUndoStack] = useState(() => new UndoStack());

  const pushUndoSnapshot = useCallback((actionKey: string) => {
    setUndoStack(prev => prev.push(
      createUndoSnapshot(actionKey, players, tables, tournamentEvents, dealerIndex)
    ));
  }, [players, tables, tournamentEvents, dealerIndex]);

  const handleUndo = useCallback(() => {
    const currentSnapshot = createUndoSnapshot('current', players, tables, tournamentEvents, dealerIndex);
    const result = undoStack.undo(currentSnapshot);
    if (!result) return;
    const [newStack, entry] = result;
    setUndoStack(newStack);
    setConfig(prev => ({
      ...prev,
      players: entry.players,
      tables: entry.tables,
      dealerIndex: entry.dealerIndex,
    }));
    setTournamentEvents(entry.events);
  }, [undoStack, players, tables, tournamentEvents, dealerIndex, setConfig, setTournamentEvents]);

  const handleRedo = useCallback(() => {
    const currentSnapshot = createUndoSnapshot('current', players, tables, tournamentEvents, dealerIndex);
    const result = undoStack.redo(currentSnapshot);
    if (!result) return;
    const [newStack, entry] = result;
    setUndoStack(newStack);
    setConfig(prev => ({
      ...prev,
      players: entry.players,
      tables: entry.tables,
      dealerIndex: entry.dealerIndex,
    }));
    setTournamentEvents(entry.events);
  }, [undoStack, players, tables, tournamentEvents, dealerIndex, setConfig, setTournamentEvents]);

  return { undoStack, setUndoStack, pushUndoSnapshot, handleUndo, handleRedo };
}
