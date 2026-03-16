// Undo/Redo stack — snapshot-based undo for tournament actions.
// Stores full player + table + event arrays before each mutation.

import type { Player, Table, TournamentEvent } from './types';

export interface UndoEntry {
  /** Human-readable action label key (i18n) */
  actionKey: string;
  /** Full players array before mutation */
  players: Player[];
  /** Full tables array before mutation (if multi-table) */
  tables: Table[] | undefined;
  /** Full events array before mutation */
  events: TournamentEvent[];
  /** Dealer index before mutation */
  dealerIndex: number;
  /** Timestamp when snapshot was taken */
  timestamp: number;
}

const MAX_UNDO_DEPTH = 30;

/**
 * Immutable undo/redo stack.
 * Each mutation returns a new UndoStack instance (functional style).
 */
export class UndoStack {
  private readonly undoEntries: UndoEntry[];
  private readonly redoEntries: UndoEntry[];

  constructor(
    undoEntries: UndoEntry[] = [],
    redoEntries: UndoEntry[] = [],
  ) {
    this.undoEntries = undoEntries;
    this.redoEntries = redoEntries;
  }

  get canUndo(): boolean {
    return this.undoEntries.length > 0;
  }

  get canRedo(): boolean {
    return this.redoEntries.length > 0;
  }

  get undoCount(): number {
    return this.undoEntries.length;
  }

  get redoCount(): number {
    return this.redoEntries.length;
  }

  /** Label of the action that would be undone. */
  get undoLabel(): string | null {
    return this.undoEntries.length > 0
      ? this.undoEntries[this.undoEntries.length - 1].actionKey
      : null;
  }

  /** Label of the action that would be redone. */
  get redoLabel(): string | null {
    return this.redoEntries.length > 0
      ? this.redoEntries[this.redoEntries.length - 1].actionKey
      : null;
  }

  /**
   * Push a snapshot before an action. Clears redo stack (new branch).
   * Returns a new UndoStack.
   */
  push(entry: UndoEntry): UndoStack {
    const newUndo = [...this.undoEntries, entry];
    // Trim to max depth
    if (newUndo.length > MAX_UNDO_DEPTH) {
      newUndo.shift();
    }
    return new UndoStack(newUndo, []);
  }

  /**
   * Pop the last undo entry and push the current state as a redo entry.
   * @param currentState — snapshot of current state before undoing
   * @returns [newStack, entryToRestore] or null if nothing to undo
   */
  undo(currentState: UndoEntry): [UndoStack, UndoEntry] | null {
    if (this.undoEntries.length === 0) return null;
    const entry = this.undoEntries[this.undoEntries.length - 1];
    const newUndo = this.undoEntries.slice(0, -1);
    const newRedo = [...this.redoEntries, currentState];
    return [new UndoStack(newUndo, newRedo), entry];
  }

  /**
   * Pop the last redo entry and push the current state as an undo entry.
   * @param currentState — snapshot of current state before redoing
   * @returns [newStack, entryToRestore] or null if nothing to redo
   */
  redo(currentState: UndoEntry): [UndoStack, UndoEntry] | null {
    if (this.redoEntries.length === 0) return null;
    const entry = this.redoEntries[this.redoEntries.length - 1];
    const newRedo = this.redoEntries.slice(0, -1);
    const newUndo = [...this.undoEntries, currentState];
    return [new UndoStack(newUndo, newRedo), entry];
  }

  /** Clear entire stack. */
  clear(): UndoStack {
    return new UndoStack([], []);
  }
}

/**
 * Create a snapshot of the current tournament state for undo purposes.
 */
export function createUndoSnapshot(
  actionKey: string,
  players: Player[],
  tables: Table[] | undefined,
  events: TournamentEvent[],
  dealerIndex: number,
): UndoEntry {
  return {
    actionKey,
    // Deep-clone arrays to capture current state
    players: JSON.parse(JSON.stringify(players)),
    tables: tables ? JSON.parse(JSON.stringify(tables)) : undefined,
    events: events.map(e => ({ ...e })),
    dealerIndex,
    timestamp: Date.now(),
  };
}
