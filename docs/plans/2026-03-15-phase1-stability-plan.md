# Phase 1: Stability & Maintainability — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce App.tsx from 1,294 to ~750 LOC by extracting 5 hooks, optimize bundle (PeerJS dynamic import), formalize PeerJS API, add storage retention policies, version checkpoint schema, and clean up test warnings.

**Architecture:** Grouped Custom Hooks pattern — extract related state+logic into focused hooks. App.tsx keeps core state (mode, config, settings) and JSX. Each hook is independently testable.

**Tech Stack:** React 19, TypeScript 5.9, Vitest, PeerJS, IndexedDB (idb)

**Note:** E2E in CI (original deliverable #6) is already implemented in `.github/workflows/deploy.yml` — skipped here.

---

### Task 1: useModalManager — Extract 14 modal states from App.tsx

**Files:**
- Create: `src/hooks/useModalManager.ts`
- Modify: `src/App.tsx`
- Test: `tests/hooks-phase1.test.tsx`

**Step 1: Create the hook file**

Create `src/hooks/useModalManager.ts`:

```typescript
import { useState, useCallback } from 'react';

export interface ModalManager {
  // Boolean states
  showTemplates: boolean;
  showHistory: boolean;
  showSeries: boolean;
  showCustomAudio: boolean;
  showWizard: boolean;
  showTour: boolean;
  showCallTheClock: boolean;
  showInstallGuide: boolean;
  showHelp: boolean;
  showTournamentLog: boolean;
  showPayoutOverlay: boolean;
  showShareHub: boolean;
  showPlayerPanel: boolean;
  showSidebar: boolean;
  // Direct setters (needed by child components and other hooks)
  setShowCallTheClock: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPlayerPanel: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  setShowTemplates: React.Dispatch<React.SetStateAction<boolean>>;
  setShowHistory: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSeries: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCustomAudio: React.Dispatch<React.SetStateAction<boolean>>;
  setShowWizard: React.Dispatch<React.SetStateAction<boolean>>;
  setShowTour: React.Dispatch<React.SetStateAction<boolean>>;
  setShowInstallGuide: React.Dispatch<React.SetStateAction<boolean>>;
  setShowHelp: React.Dispatch<React.SetStateAction<boolean>>;
  setShowTournamentLog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPayoutOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  setShowShareHub: React.Dispatch<React.SetStateAction<boolean>>;
  // Clean view toggle (interacts with sidebars)
  cleanView: boolean;
  toggleCleanView: () => void;
  setCleanView: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useModalManager(): ModalManager {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSeries, setShowSeries] = useState(false);
  const [showCustomAudio, setShowCustomAudio] = useState(false);
  const [showWizard, setShowWizard] = useState(() => {
    try {
      return !localStorage.getItem('poker-timer-wizard-completed');
    } catch {
      return false;
    }
  });
  const [showTour, setShowTour] = useState(false);
  const [showCallTheClock, setShowCallTheClock] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(() => {
    if (window.location.hash === '#install') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      return true;
    }
    return false;
  });
  const [showHelp, setShowHelp] = useState(false);
  const [showTournamentLog, setShowTournamentLog] = useState(false);
  const [showPayoutOverlay, setShowPayoutOverlay] = useState(false);
  const [showShareHub, setShowShareHub] = useState(() => {
    if (window.location.hash === '#share') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      return true;
    }
    return false;
  });
  const [showPlayerPanel, setShowPlayerPanel] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [cleanView, setCleanView] = useState(false);

  const toggleCleanView = useCallback(() => {
    setCleanView((prev) => {
      const next = !prev;
      if (next) {
        setShowPlayerPanel(false);
        setShowSidebar(false);
      } else {
        setShowPlayerPanel(true);
        setShowSidebar(true);
      }
      return next;
    });
  }, []);

  return {
    showTemplates, showHistory, showSeries, showCustomAudio,
    showWizard, showTour, showCallTheClock, showInstallGuide,
    showHelp, showTournamentLog, showPayoutOverlay, showShareHub,
    showPlayerPanel, showSidebar,
    setShowCallTheClock, setShowPlayerPanel, setShowSidebar,
    setShowTemplates, setShowHistory, setShowSeries, setShowCustomAudio,
    setShowWizard, setShowTour, setShowInstallGuide, setShowHelp,
    setShowTournamentLog, setShowPayoutOverlay, setShowShareHub,
    cleanView, toggleCleanView, setCleanView,
  };
}
```

**Step 2: Write tests for useModalManager**

Create `tests/hooks-phase1.test.tsx`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useModalManager } from '../src/hooks/useModalManager';

describe('useModalManager', () => {
  it('starts with all modals closed except player panel and sidebar', () => {
    const { result } = renderHook(() => useModalManager());
    expect(result.current.showTemplates).toBe(false);
    expect(result.current.showHistory).toBe(false);
    expect(result.current.showCallTheClock).toBe(false);
    expect(result.current.showPlayerPanel).toBe(true);
    expect(result.current.showSidebar).toBe(true);
    expect(result.current.cleanView).toBe(false);
  });

  it('toggleCleanView hides sidebars when entering clean view', () => {
    const { result } = renderHook(() => useModalManager());
    act(() => result.current.toggleCleanView());
    expect(result.current.cleanView).toBe(true);
    expect(result.current.showPlayerPanel).toBe(false);
    expect(result.current.showSidebar).toBe(false);
  });

  it('toggleCleanView shows sidebars when exiting clean view', () => {
    const { result } = renderHook(() => useModalManager());
    act(() => result.current.toggleCleanView()); // enter
    act(() => result.current.toggleCleanView()); // exit
    expect(result.current.cleanView).toBe(false);
    expect(result.current.showPlayerPanel).toBe(true);
    expect(result.current.showSidebar).toBe(true);
  });

  it('setters update corresponding modal state', () => {
    const { result } = renderHook(() => useModalManager());
    act(() => result.current.setShowTemplates(true));
    expect(result.current.showTemplates).toBe(true);
    act(() => result.current.setShowCallTheClock(true));
    expect(result.current.showCallTheClock).toBe(true);
  });
});
```

**Step 3: Run tests to verify they pass**

Run: `npx vitest run tests/hooks-phase1.test.tsx`
Expected: 4 tests PASS

**Step 4: Wire useModalManager into App.tsx**

In `src/App.tsx`:

1. Add import: `import { useModalManager } from './hooks/useModalManager';`
2. Replace all 14 modal useState declarations (lines ~131-138, ~146-149, ~280-296) and the `toggleCleanView` callback (lines ~308-322) with a single call:
   ```typescript
   const modals = useModalManager();
   ```
3. Replace all references throughout App.tsx:
   - `showTemplates` → `modals.showTemplates`
   - `setShowTemplates(true)` → `modals.setShowTemplates(true)`
   - `cleanView` → `modals.cleanView`
   - `toggleCleanView` → `modals.toggleCleanView`
   - etc. for all 14 modals + cleanView

**Important:** The `isWizardCompleted()` import in App.tsx was used for `showWizard` initialization. Move the logic into the hook (already done above via localStorage check). Remove the `isWizardCompleted` import from App.tsx if no longer needed elsewhere.

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All 1118+ tests pass

**Step 6: Commit**

```bash
git add src/hooks/useModalManager.ts tests/hooks-phase1.test.tsx src/App.tsx
git commit -m "refactor: extract useModalManager hook from App.tsx (14 modal states)"
```

---

### Task 2: useGameComputedState — Extract 17 useMemo calculations from App.tsx

**Files:**
- Create: `src/hooks/useGameComputedState.ts`
- Modify: `src/App.tsx`
- Test: `tests/hooks-phase1.test.tsx` (append)

**Step 1: Create the hook file**

Create `src/hooks/useGameComputedState.ts`:

```typescript
import { useMemo } from 'react';
import type {
  TournamentConfig,
  Player,
  TournamentResult,
  TournamentEvent,
  TimerState,
} from '../domain/types';
import type { ExtendedLeagueStanding } from '../domain/league';
import {
  computeTournamentElapsedSeconds,
  isRebuyActive,
  isLateRegistrationOpen,
  computeAverageStack,
  scheduleToColorUpMap,
  isBubble,
  isInTheMoney,
  buildTournamentResult,
  loadLeagues,
  loadGameDaysForLeague,
  computeExtendedStandings,
} from '../domain/logic';
import { collectStartErrors } from '../domain/startValidation';

export interface GameComputedState {
  displaySeconds: number;
  tournamentElapsed: number;
  rebuyActive: boolean;
  lateRegOpen: boolean;
  currentPlayLevel: number;
  averageStack: number;
  colorUpMap: Map<number, { remove: string; value: number }>;
  activePlayerCount: number;
  paidPlaces: number;
  bubbleActive: boolean;
  inTheMoney: boolean;
  isBreak: boolean;
  tournamentFinished: boolean;
  winner: Player | null;
  finishedResult: TournamentResult | null;
  startErrors: string[];
  lastRebuyLevelIndex: number;
  addOnPauseLevelIndex: number | undefined;
  leagueDisplayData: { name: string; standings: ExtendedLeagueStanding[] } | undefined;
}

interface UseGameComputedStateOptions {
  config: TournamentConfig;
  timerState: TimerState;
  tournamentEvents: TournamentEvent[];
  t: (key: string, params?: Record<string, unknown>) => string;
}

export function useGameComputedState({
  config,
  timerState,
  tournamentEvents,
  t,
}: UseGameComputedStateOptions): GameComputedState {
  const displaySeconds = Math.floor(timerState.remainingSeconds);

  const lastRebuyLevelIndex = useMemo(() => {
    if (!config.rebuy.enabled || config.rebuy.limitType !== 'levels') return -1;
    let playCount = 0;
    for (let i = 0; i < config.levels.length; i++) {
      if (config.levels[i].type === 'level') {
        playCount++;
        if (playCount === config.rebuy.levelLimit) return i;
      }
    }
    return -1;
  }, [config.rebuy, config.levels]);

  const addOnPauseLevelIndex = useMemo(() => {
    if (!config.addOn.enabled || lastRebuyLevelIndex < 0) return undefined;
    const nextIdx = lastRebuyLevelIndex + 1;
    if (nextIdx >= config.levels.length) return undefined;
    if (config.levels[nextIdx]?.type === 'break') return undefined;
    return nextIdx;
  }, [config.addOn.enabled, lastRebuyLevelIndex, config.levels]);

  const tournamentElapsed = useMemo(
    () => computeTournamentElapsedSeconds(config.levels, timerState.currentLevelIndex, displaySeconds),
    [config.levels, timerState.currentLevelIndex, displaySeconds],
  );

  const rebuyActive = useMemo(
    () => isRebuyActive(config.rebuy, timerState.currentLevelIndex, config.levels, tournamentElapsed),
    [config.rebuy, timerState.currentLevelIndex, config.levels, tournamentElapsed],
  );

  const lateRegOpen = useMemo(
    () => isLateRegistrationOpen(config, timerState.currentLevelIndex, config.levels),
    [config, timerState.currentLevelIndex],
  );

  const currentPlayLevel = useMemo(() => {
    return config.levels
      .slice(0, timerState.currentLevelIndex + 1)
      .filter((l) => l.type === 'level').length;
  }, [config.levels, timerState.currentLevelIndex]);

  const averageStack = useMemo(
    () => computeAverageStack(
      config.players,
      config.startingChips,
      config.rebuy.enabled ? config.rebuy.rebuyChips : 0,
      config.addOn.enabled ? config.addOn.chips : 0,
    ),
    [config.players, config.startingChips, config.rebuy.enabled, config.rebuy.rebuyChips, config.addOn.enabled, config.addOn.chips],
  );

  const colorUpMap = useMemo(
    () =>
      config.chips.enabled && config.chips.colorUpEnabled && config.chips.colorUpSchedule.length > 0
        ? scheduleToColorUpMap(config.chips.colorUpSchedule, config.chips.denominations)
        : new Map(),
    [config.chips.enabled, config.chips.colorUpEnabled, config.chips.colorUpSchedule, config.chips.denominations],
  );

  const activePlayerCount = useMemo(
    () => config.players.filter((p) => p.status === 'active').length,
    [config.players],
  );

  const paidPlaces = config.payout.entries.length;

  const bubbleActive = useMemo(
    () => isBubble(activePlayerCount, paidPlaces),
    [activePlayerCount, paidPlaces],
  );

  const inTheMoney = useMemo(
    () => isInTheMoney(activePlayerCount, paidPlaces),
    [activePlayerCount, paidPlaces],
  );

  const isBreak = config.levels[timerState.currentLevelIndex]?.type === 'break';

  const tournamentFinished = useMemo(() => {
    if (config.players.length < 2) return false;
    return config.players.filter((p) => p.status === 'active').length === 1;
  }, [config.players]);

  const winner = useMemo(() => {
    if (!tournamentFinished) return null;
    return config.players.find((p) => p.status === 'active') ?? null;
  }, [tournamentFinished, config.players]);

  const finishedResult = useMemo(() => {
    if (!tournamentFinished) return null;
    return buildTournamentResult(config, tournamentElapsed, currentPlayLevel, tournamentEvents);
  }, [tournamentFinished, config, tournamentElapsed, currentPlayLevel, tournamentEvents]);

  const startErrors = useMemo(() => collectStartErrors(config, t), [config, t]);

  const leagueDisplayData = useMemo(() => {
    if (!config.leagueId) return undefined;
    const leagues = loadLeagues();
    const league = leagues.find((l) => l.id === config.leagueId);
    if (!league) return undefined;
    const gameDays = loadGameDaysForLeague(league.id);
    if (gameDays.length === 0) return undefined;
    return { name: league.name, standings: computeExtendedStandings(league, gameDays) };
  }, [config.leagueId]);

  return {
    displaySeconds,
    tournamentElapsed,
    rebuyActive,
    lateRegOpen,
    currentPlayLevel,
    averageStack,
    colorUpMap,
    activePlayerCount,
    paidPlaces,
    bubbleActive,
    inTheMoney,
    isBreak,
    tournamentFinished,
    winner,
    finishedResult,
    startErrors,
    lastRebuyLevelIndex,
    addOnPauseLevelIndex,
    leagueDisplayData,
  };
}
```

**Step 2: Add tests to hooks-phase1.test.tsx**

Append to `tests/hooks-phase1.test.tsx`:

```typescript
import { useGameComputedState } from '../src/hooks/useGameComputedState';
import { defaultConfig, defaultSettings } from '../src/domain/logic';

describe('useGameComputedState', () => {
  const mockT = (key: string) => key;
  const baseConfig = defaultConfig();
  const baseTimerState = {
    currentLevelIndex: 0,
    remainingSeconds: 600,
    status: 'stopped' as const,
  };

  it('computes activePlayerCount from config.players', () => {
    const config = { ...baseConfig, players: [
      { id: '1', name: 'A', rebuys: 0, addOn: false, status: 'active' as const, placement: null, eliminatedBy: null, knockouts: 0 },
      { id: '2', name: 'B', rebuys: 0, addOn: false, status: 'eliminated' as const, placement: 2, eliminatedBy: '1', knockouts: 0 },
      { id: '3', name: 'C', rebuys: 0, addOn: false, status: 'active' as const, placement: null, eliminatedBy: null, knockouts: 0 },
    ]};
    const { result } = renderHook(() => useGameComputedState({
      config, timerState: baseTimerState, tournamentEvents: [], t: mockT,
    }));
    expect(result.current.activePlayerCount).toBe(2);
  });

  it('detects tournament finished when 1 active player remains', () => {
    const config = { ...baseConfig, players: [
      { id: '1', name: 'A', rebuys: 0, addOn: false, status: 'active' as const, placement: null, eliminatedBy: null, knockouts: 0 },
      { id: '2', name: 'B', rebuys: 0, addOn: false, status: 'eliminated' as const, placement: 2, eliminatedBy: '1', knockouts: 0 },
    ]};
    const { result } = renderHook(() => useGameComputedState({
      config, timerState: baseTimerState, tournamentEvents: [], t: mockT,
    }));
    expect(result.current.tournamentFinished).toBe(true);
    expect(result.current.winner?.name).toBe('A');
  });

  it('computes displaySeconds as floor of remainingSeconds', () => {
    const { result } = renderHook(() => useGameComputedState({
      config: baseConfig, timerState: { ...baseTimerState, remainingSeconds: 123.7 }, tournamentEvents: [], t: mockT,
    }));
    expect(result.current.displaySeconds).toBe(123);
  });
});
```

**Step 3: Run tests to verify they pass**

Run: `npx vitest run tests/hooks-phase1.test.tsx`
Expected: 7 tests PASS (4 from Task 1 + 3 new)

**Step 4: Wire useGameComputedState into App.tsx**

In `src/App.tsx`:

1. Add import: `import { useGameComputedState } from './hooks/useGameComputedState';`
2. Remove the `addOnPauseLevelIndex` calculation and pass it from the hook:
   ```typescript
   const computed = useGameComputedState({ config, timerState: timer.timerState, tournamentEvents, t });
   ```
3. **Important order:** `useTimer` needs `addOnPauseLevelIndex`. So the hook must be called before `useTimer`, OR `addOnPauseLevelIndex` must be kept in App.tsx and passed to both. Keep `lastRebuyLevelIndex` and `addOnPauseLevelIndex` calculations in App.tsx (they're needed before timer init), and remove them from the hook. The hook takes `addOnPauseLevelIndex` as a parameter instead.

   **Revised approach:** Keep `lastRebuyLevelIndex` and `addOnPauseLevelIndex` inline in App.tsx (they feed into `useTimer`). Remove them from the hook.

4. Replace all individual useMemo references with `computed.*`:
   - `displaySeconds` → `computed.displaySeconds`
   - `tournamentElapsed` → `computed.tournamentElapsed`
   - `rebuyActive` → `computed.rebuyActive`
   - etc.

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/hooks/useGameComputedState.ts tests/hooks-phase1.test.tsx src/App.tsx
git commit -m "refactor: extract useGameComputedState hook from App.tsx (17 useMemo calculations)"
```

---

### Task 3: useTournamentEventLog — Extract event logging from App.tsx

**Files:**
- Create: `src/hooks/useTournamentEventLog.ts`
- Modify: `src/App.tsx`
- Test: `tests/hooks-phase1.test.tsx` (append)

**Step 1: Create the hook file**

Create `src/hooks/useTournamentEventLog.ts`:

```typescript
import { useState, useCallback, useEffect, useRef } from 'react';
import type { TournamentEvent } from '../domain/types';
import { createEvent } from '../domain/logic';

type Mode = 'setup' | 'game' | 'league';

interface UseTournamentEventLogOptions {
  mode: Mode;
  currentLevelIndex: number;
  timerStatus: 'stopped' | 'running' | 'paused';
  tournamentFinished: boolean;
  pendingCheckpoint: unknown | null;
}

export interface TournamentEventLog {
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
}: UseTournamentEventLogOptions): TournamentEventLog {
  const [tournamentEvents, setTournamentEvents] = useState<TournamentEvent[]>([]);

  const handleAppendEvent = useCallback((event: TournamentEvent) => {
    setTournamentEvents((prev) => [...prev, event]);
  }, []);

  // Timer event: level changes
  const prevLevelRef = useRef(currentLevelIndex);
  useEffect(() => {
    if (mode !== 'game') return;
    const lvl = currentLevelIndex;
    if (lvl !== prevLevelRef.current) {
      prevLevelRef.current = lvl;
      handleAppendEvent(createEvent('level_start', lvl, { levelNumber: lvl + 1 }));
    }
  }, [mode, currentLevelIndex, handleAppendEvent]);

  // Timer event: pause/resume
  const prevTimerStatusRef = useRef(timerStatus);
  useEffect(() => {
    if (mode !== 'game') return;
    const status = timerStatus;
    const prev = prevTimerStatusRef.current;
    prevTimerStatusRef.current = status;
    if (prev === status) return;
    if (status === 'paused' && prev === 'running') {
      handleAppendEvent(createEvent('timer_paused', currentLevelIndex, {}));
    } else if (status === 'running' && prev === 'paused') {
      handleAppendEvent(createEvent('timer_resumed', currentLevelIndex, {}));
    }
  }, [mode, timerStatus, currentLevelIndex, handleAppendEvent]);

  // Mode transition events
  const prevModeRef = useRef(mode);
  useEffect(() => {
    const prev = prevModeRef.current;
    prevModeRef.current = mode;
    if (mode === 'game' && prev !== 'game') {
      if (!pendingCheckpoint) {
        setTournamentEvents([]);
      }
      handleAppendEvent(createEvent('tournament_started', 0, {}));
    }
    if (mode === 'setup' && prev === 'game') {
      setTournamentEvents([]);
    }
  }, [mode, handleAppendEvent, pendingCheckpoint]);

  // Tournament finished event
  const finishedEventLoggedRef = useRef(false);
  useEffect(() => {
    if (mode === 'game' && tournamentFinished && !finishedEventLoggedRef.current) {
      finishedEventLoggedRef.current = true;
      handleAppendEvent(createEvent('tournament_finished', currentLevelIndex, {}));
    }
    if (!tournamentFinished) {
      finishedEventLoggedRef.current = false;
    }
  }, [mode, tournamentFinished, currentLevelIndex, handleAppendEvent]);

  return { tournamentEvents, setTournamentEvents, handleAppendEvent };
}
```

**Step 2: Add tests**

Append to `tests/hooks-phase1.test.tsx`:

```typescript
import { useTournamentEventLog } from '../src/hooks/useTournamentEventLog';

describe('useTournamentEventLog', () => {
  it('starts with empty events', () => {
    const { result } = renderHook(() => useTournamentEventLog({
      mode: 'setup', currentLevelIndex: 0, timerStatus: 'stopped',
      tournamentFinished: false, pendingCheckpoint: null,
    }));
    expect(result.current.tournamentEvents).toEqual([]);
  });

  it('handleAppendEvent adds event to list', () => {
    const { result } = renderHook(() => useTournamentEventLog({
      mode: 'game', currentLevelIndex: 0, timerStatus: 'stopped',
      tournamentFinished: false, pendingCheckpoint: null,
    }));
    act(() => {
      result.current.handleAppendEvent({
        id: 'test-1', type: 'level_start', levelIndex: 0,
        timestamp: Date.now(), data: { levelNumber: 1 },
      });
    });
    // Events include tournament_started (from mode=game init) + our manual append
    expect(result.current.tournamentEvents.length).toBeGreaterThanOrEqual(1);
    expect(result.current.tournamentEvents.some(e => e.id === 'test-1')).toBe(true);
  });
});
```

**Step 3: Run tests**

Run: `npx vitest run tests/hooks-phase1.test.tsx`
Expected: 9 tests PASS

**Step 4: Wire into App.tsx**

1. Add import: `import { useTournamentEventLog } from './hooks/useTournamentEventLog';`
2. Replace:
   - `tournamentEvents` useState (line ~153)
   - `handleAppendEvent` callback (lines ~324-327)
   - All 4 event-logging effects (lines ~744-766, ~892-919)
   with:
   ```typescript
   const eventLog = useTournamentEventLog({
     mode,
     currentLevelIndex: timer.timerState.currentLevelIndex,
     timerStatus: timer.timerState.status,
     tournamentFinished: computed.tournamentFinished,
     pendingCheckpoint,
   });
   const { tournamentEvents, setTournamentEvents, handleAppendEvent } = eventLog;
   ```

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/hooks/useTournamentEventLog.ts tests/hooks-phase1.test.tsx src/App.tsx
git commit -m "refactor: extract useTournamentEventLog hook from App.tsx"
```

---

### Task 4: useCheckpointManager — Extract checkpoint logic from App.tsx

**Files:**
- Create: `src/hooks/useCheckpointManager.ts`
- Modify: `src/App.tsx`
- Modify: `src/domain/types.ts`
- Modify: `src/domain/configPersistence.ts`
- Test: `tests/hooks-phase1.test.tsx` (append)

**Step 1: Add schemaVersion to TournamentCheckpoint type**

In `src/domain/types.ts`, find:

```typescript
export interface TournamentCheckpoint {
  version: 1;
```

Replace with:

```typescript
export interface TournamentCheckpoint {
  version: 1;
  /** Schema version for checkpoint compatibility validation */
  schemaVersion?: number;
```

**Step 2: Add CHECKPOINT_SCHEMA_VERSION to configPersistence.ts**

In `src/domain/configPersistence.ts`, add after imports:

```typescript
/** Bump this when the checkpoint data shape changes incompatibly. */
export const CHECKPOINT_SCHEMA_VERSION = 2;
```

Modify `saveCheckpoint`:

```typescript
export function saveCheckpoint(checkpoint: TournamentCheckpoint): void {
  setCached('checkpoint', { ...checkpoint, schemaVersion: CHECKPOINT_SCHEMA_VERSION });
}
```

Modify `loadCheckpoint` — find the line `if (raw.version !== 1) return null;` and add after it:

```typescript
    // Reject incompatible checkpoint schema versions
    if (raw.schemaVersion !== undefined && raw.schemaVersion !== CHECKPOINT_SCHEMA_VERSION) {
      clearCheckpoint();
      return null;
    }
```

**Step 3: Create the hook file**

Create `src/hooks/useCheckpointManager.ts`:

```typescript
import { useState, useEffect, useRef } from 'react';
import type { TournamentConfig, Settings, TournamentCheckpoint, TournamentEvent, TimerState } from '../domain/types';
import { saveCheckpoint, loadCheckpoint, clearCheckpoint, buildTournamentResult, saveTournamentResult, loadLeagues, loadPlayerDatabase, createGameDayFromResult } from '../domain/logic';

type Mode = 'setup' | 'game' | 'league';

interface UseCheckpointManagerOptions {
  mode: Mode;
  config: TournamentConfig;
  settings: Settings;
  timerState: TimerState;
  tournamentEvents: TournamentEvent[];
  tournamentFinished: boolean;
  tournamentElapsed: number;
  currentPlayLevel: number;
}

export interface CheckpointManager {
  pendingCheckpoint: TournamentCheckpoint | null;
  setPendingCheckpoint: React.Dispatch<React.SetStateAction<TournamentCheckpoint | null>>;
}

export function useCheckpointManager({
  mode,
  config,
  settings,
  timerState,
  tournamentEvents,
  tournamentFinished,
  tournamentElapsed,
  currentPlayLevel,
}: UseCheckpointManagerOptions): CheckpointManager {
  const [pendingCheckpoint, setPendingCheckpoint] = useState<TournamentCheckpoint | null>(() => loadCheckpoint());

  // Auto-save tournament checkpoint in game mode (debounced)
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
          currentLevelIndex: timerState.currentLevelIndex,
          remainingSeconds: timerState.remainingSeconds,
        },
        savedAt: new Date().toISOString(),
        events: tournamentEvents,
      });
    };
    if (checkpointDebounceRef.current) clearTimeout(checkpointDebounceRef.current);
    checkpointDebounceRef.current = setTimeout(doSave, 500);
    if (checkpointIntervalRef.current) clearInterval(checkpointIntervalRef.current);
    if (timerState.status === 'running') {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- remainingSeconds intentionally excluded
  }, [mode, config, settings, timerState.currentLevelIndex, timerState.status, tournamentEvents]);

  // Clear checkpoint and save result when tournament finishes
  const resultSavedRef = useRef(false);
  useEffect(() => {
    if (mode === 'game' && tournamentFinished) {
      clearCheckpoint();
      if (!resultSavedRef.current) {
        resultSavedRef.current = true;
        const result = buildTournamentResult(config, tournamentElapsed, currentPlayLevel, tournamentEvents);
        saveTournamentResult(result);
        if (config.leagueId) {
          const leagues = loadLeagues();
          const league = leagues.find(l => l.id === config.leagueId);
          if (league) {
            const registeredPlayers = loadPlayerDatabase();
            createGameDayFromResult(result, league, registeredPlayers);
          }
        }
      }
    }
    if (!tournamentFinished) {
      resultSavedRef.current = false;
    }
  }, [mode, tournamentFinished, config, tournamentElapsed, currentPlayLevel, tournamentEvents]);

  return { pendingCheckpoint, setPendingCheckpoint };
}
```

**Step 4: Add tests**

Append to `tests/hooks-phase1.test.tsx`:

```typescript
import { CHECKPOINT_SCHEMA_VERSION } from '../src/domain/configPersistence';

describe('Checkpoint schema versioning', () => {
  it('CHECKPOINT_SCHEMA_VERSION is defined', () => {
    expect(CHECKPOINT_SCHEMA_VERSION).toBe(2);
  });
});
```

**Step 5: Run tests**

Run: `npx vitest run tests/hooks-phase1.test.tsx`
Expected: All tests PASS

**Step 6: Wire into App.tsx**

1. Add import: `import { useCheckpointManager } from './hooks/useCheckpointManager';`
2. Remove:
   - `pendingCheckpoint` useState (line ~156)
   - Auto-save checkpoint effect (lines ~234-273)
   - Tournament finish effect (lines ~663-686)
3. Replace with:
   ```typescript
   const { pendingCheckpoint, setPendingCheckpoint } = useCheckpointManager({
     mode, config, settings, timerState: timer.timerState,
     tournamentEvents, tournamentFinished: computed.tournamentFinished,
     tournamentElapsed: computed.tournamentElapsed, currentPlayLevel: computed.currentPlayLevel,
   });
   ```

**Step 7: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 8: Commit**

```bash
git add src/hooks/useCheckpointManager.ts src/domain/types.ts src/domain/configPersistence.ts tests/hooks-phase1.test.tsx src/App.tsx
git commit -m "refactor: extract useCheckpointManager hook + checkpoint schema versioning"
```

---

### Task 5: useDisplayBridge — Extract display/TV wiring from App.tsx

**Files:**
- Create: `src/hooks/useDisplayBridge.ts`
- Modify: `src/App.tsx`
- Test: `tests/hooks-phase1.test.tsx` (append)

**Step 1: Create the hook file**

Create `src/hooks/useDisplayBridge.ts`:

```typescript
import { useCallback, useMemo, useRef } from 'react';
import type { TournamentConfig, Settings, TimerState } from '../domain/types';
import type { DisplayStatePayload } from '../domain/displayChannel';
import { serializeColorUpMap } from '../domain/displayChannel';
import type { ExtendedLeagueStanding } from '../domain/league';
import { useTVDisplay } from './useTVDisplay';
import { useDisplaySession } from './useDisplaySession';
import type { RemoteHost } from '../domain/remote';

interface UseDisplayBridgeOptions {
  mode: 'setup' | 'game' | 'league';
  config: TournamentConfig;
  settings: Settings;
  timerState: TimerState;
  colorUpMap: Map<number, { remove: string; value: number }>;
  activePlayerCount: number;
  bubbleActive: boolean;
  lastHandActive: boolean;
  handForHandActive: boolean;
  averageStack: number;
  tournamentElapsed: number;
  showDealerBadges: boolean;
  leagueDisplayData: { name: string; standings: ExtendedLeagueStanding[] } | undefined;
  sidePotData: { pots: unknown[]; total: number; payouts?: unknown[] } | null;
  showCallTheClock: boolean;
  remoteHostRef: React.RefObject<RemoteHost | null>;
  remoteHostStatus: string | null;
}

export interface DisplayBridge {
  buildFullStatePayload: () => DisplayStatePayload;
  tvWindowActive: boolean;
  openTVWindow: () => void;
  closeTVWindow: () => void;
  handleToggleTVWindow: () => void;
  displayCount: number;
}

export function useDisplayBridge({
  mode,
  config,
  settings,
  timerState,
  colorUpMap,
  activePlayerCount,
  bubbleActive,
  lastHandActive,
  handForHandActive,
  averageStack,
  tournamentElapsed,
  showDealerBadges,
  leagueDisplayData,
  sidePotData,
  showCallTheClock,
  remoteHostRef,
  remoteHostStatus,
}: UseDisplayBridgeOptions): DisplayBridge {
  // Use ref for timerState in payload to avoid callback recreation every 250ms tick
  const timerStateForPayloadRef = useRef(timerState);
  timerStateForPayloadRef.current = timerState;

  const buildFullStatePayload = useCallback((): DisplayStatePayload => ({
    timerState: timerStateForPayloadRef.current,
    levels: config.levels,
    chipConfig: config.chips,
    colorUpSchedule: serializeColorUpMap(colorUpMap),
    tournamentName: config.name,
    activePlayerCount,
    totalPlayerCount: config.players.length,
    isBubble: bubbleActive,
    isLastHand: lastHandActive,
    isHandForHand: handForHandActive,
    players: config.players,
    dealerIndex: config.dealerIndex,
    buyIn: config.buyIn,
    payout: config.payout,
    rebuy: config.rebuy,
    addOn: config.addOn,
    bounty: config.bounty,
    averageStack,
    tournamentElapsed,
    tables: config.tables,
    showDealerBadges,
    leagueName: leagueDisplayData?.name,
    leagueStandings: leagueDisplayData?.standings,
    sidePotData: sidePotData ?? undefined,
    displayScreens: settings.displayScreens,
    displayRotationInterval: settings.displayRotationInterval,
    displayLayout: settings.displayLayout,
  }), [config, colorUpMap, activePlayerCount, bubbleActive, lastHandActive, handForHandActive, averageStack, tournamentElapsed, showDealerBadges, leagueDisplayData, sidePotData, settings.displayScreens, settings.displayRotationInterval, settings.displayLayout]);

  const { tvWindowActive, openTVWindow, closeTVWindow } = useTVDisplay({
    mode,
    buildFullStatePayload,
    remainingSeconds: timerState.remainingSeconds,
    timerStatus: timerState.status,
    currentLevelIndex: timerState.currentLevelIndex,
    showCallTheClock,
    callTheClockSeconds: settings.callTheClockSeconds,
    soundEnabled: settings.soundEnabled,
    voiceEnabled: settings.voiceEnabled,
  });

  const handleToggleTVWindow = useCallback(() => {
    if (tvWindowActive) closeTVWindow();
    else openTVWindow();
  }, [tvWindowActive, closeTVWindow, openTVWindow]);

  const { displayCount } = useDisplaySession({
    hostRef: remoteHostRef,
    enabled: mode === 'game' && remoteHostStatus !== null,
    buildFullStatePayload,
    remainingSeconds: timerState.remainingSeconds,
    timerStatus: timerState.status,
    currentLevelIndex: timerState.currentLevelIndex,
    showCallTheClock,
    callTheClockSeconds: settings.callTheClockSeconds,
    soundEnabled: settings.soundEnabled,
    voiceEnabled: settings.voiceEnabled,
  });

  return { buildFullStatePayload, tvWindowActive, openTVWindow, closeTVWindow, handleToggleTVWindow, displayCount };
}
```

**Step 2: Add test**

Append to `tests/hooks-phase1.test.tsx`:

```typescript
describe('useDisplayBridge (smoke test)', () => {
  it('module exports useDisplayBridge function', async () => {
    const mod = await import('../src/hooks/useDisplayBridge');
    expect(typeof mod.useDisplayBridge).toBe('function');
  });
});
```

**Step 3: Run tests**

Run: `npx vitest run tests/hooks-phase1.test.tsx`
Expected: All tests PASS

**Step 4: Wire into App.tsx**

1. Add import: `import { useDisplayBridge } from './hooks/useDisplayBridge';`
2. Remove:
   - `leagueDisplayData` memo (lines ~562-572) — now in useGameComputedState
   - `timerStateForPayloadRef` + `buildFullStatePayload` (lines ~574-607)
   - `useTVDisplay` call (lines ~609-620)
   - `handleToggleTVWindow` (lines ~622-625)
   - `useDisplaySession` call (lines ~842-854)
3. Replace with:
   ```typescript
   const display = useDisplayBridge({
     mode, config, settings, timerState: timer.timerState,
     colorUpMap: computed.colorUpMap, activePlayerCount: computed.activePlayerCount,
     bubbleActive: computed.bubbleActive, lastHandActive, handForHandActive,
     averageStack: computed.averageStack, tournamentElapsed: computed.tournamentElapsed,
     showDealerBadges, leagueDisplayData: computed.leagueDisplayData,
     sidePotData, showCallTheClock: modals.showCallTheClock,
     remoteHostRef, remoteHostStatus,
   });
   const { tvWindowActive, handleToggleTVWindow, closeTVWindow, displayCount } = display;
   ```

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/hooks/useDisplayBridge.ts tests/hooks-phase1.test.tsx src/App.tsx
git commit -m "refactor: extract useDisplayBridge hook from App.tsx"
```

---

### Task 6: PeerJS API formalization — Replace callback patching with public method

**Files:**
- Modify: `src/domain/remote.ts`
- Modify: `src/hooks/useDisplaySession.ts`
- Test: `tests/logic.test.ts` (append)

**Step 1: Add public method to RemoteHost**

In `src/domain/remote.ts`, find the `RemoteHost` class. After the existing getters (peerId, secret, etc.), add:

```typescript
  /** Register a handler for when a display peer connects. */
  setDisplayConnectedHandler(handler: (() => void) | undefined): void {
    this.callbacks.onDisplayConnected = handler;
  }
```

**Step 2: Update useDisplaySession.ts to use the typed API**

In `src/hooks/useDisplaySession.ts`, replace the effect at lines 46-56:

```typescript
  // Register onDisplayConnected callback on the host
  useEffect(() => {
    const host = hostRef.current;
    if (!enabled || !host) return;
    host.setDisplayConnectedHandler(onDisplayConnected);
    return () => {
      host.setDisplayConnectedHandler(undefined);
    };
  }, [enabled, hostRef, onDisplayConnected]);
```

Remove the two `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments.

**Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/domain/remote.ts src/hooks/useDisplaySession.ts
git commit -m "refactor: add RemoteHost.setDisplayConnectedHandler, remove unsafe cast"
```

---

### Task 7: PeerJS dynamic import — Lazy-load PeerJS for bundle reduction

**Files:**
- Modify: `src/domain/remote.ts`

**Step 1: Convert static PeerJS import to dynamic**

In `src/domain/remote.ts`:

Replace lines 20-21:
```typescript
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
```

With:
```typescript
import type PeerType from 'peerjs';
import type { DataConnection } from 'peerjs';

// Lazy-load PeerJS only when needed (~117 KB)
let PeerConstructor: typeof PeerType | null = null;
async function loadPeer(): Promise<typeof PeerType> {
  if (!PeerConstructor) {
    const mod = await import('peerjs');
    PeerConstructor = mod.default;
  }
  return PeerConstructor;
}
```

**Step 2: Make RemoteHost.init() async**

Find `private init(): void {` in RemoteHost class. Change to:

```typescript
  private async init(): Promise<void> {
    try {
      const Peer = await loadPeer();
      this.peer = new Peer(this._peerId);
      // ... rest stays the same
```

**Step 3: Make RemoteController.init() async**

Find `private init(): void {` in RemoteController class. Change to:

```typescript
  private async init(): Promise<void> {
    try {
      const Peer = await loadPeer();
      this.peer = new Peer();
      // ... rest stays the same
```

**Step 4: Build and verify bundle size**

Run: `npm run build`
Expected: Build succeeds. Check output for bundle sizes — PeerJS should now be in a separate async chunk, not in the main bundle.

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/domain/remote.ts
git commit -m "perf: lazy-load PeerJS (~117 KB) via dynamic import"
```

---

### Task 8: Storage retention policies — Limit history and events growth

**Files:**
- Modify: `src/domain/storage.ts`
- Test: `tests/hooks-phase1.test.tsx` (append)

**Step 1: Add retention constants and function to storage.ts**

In `src/domain/storage.ts`, after the `SINGLETON_KEY` constant (line ~92), add:

```typescript
/** Maximum number of tournament history entries to retain. */
export const MAX_HISTORY_ENTRIES = 100;

/** Maximum number of tournament events to retain. */
export const MAX_EVENT_ENTRIES = 1000;
```

After the `loadAllIntoCache` function call in `initStorage()`, add the retention enforcement. Find:

```typescript
    // Load all data into cache
    await loadAllIntoCache();

    ready = true;
```

Replace with:

```typescript
    // Load all data into cache
    await loadAllIntoCache();

    // Enforce retention policies — trim oldest entries
    await enforceRetentionPolicies();

    ready = true;
```

Then add the function (before `initStorage`):

```typescript
/** Trim oldest entries from collection stores that exceed retention limits. */
async function enforceRetentionPolicies(): Promise<void> {
  trimCollection('history', MAX_HISTORY_ENTRIES, (a, b) => {
    const dateA = (a as { date?: string }).date ?? '';
    const dateB = (b as { date?: string }).date ?? '';
    return dateB.localeCompare(dateA); // newest first
  });

  trimCollection('events', MAX_EVENT_ENTRIES, (a, b) => {
    const tsA = (a as { timestamp?: number }).timestamp ?? 0;
    const tsB = (b as { timestamp?: number }).timestamp ?? 0;
    return tsB - tsA; // newest first
  });
}

function trimCollection<K extends CollectionStore>(
  store: K,
  maxEntries: number,
  compareFn: (a: CollectionItemMap[K], b: CollectionItemMap[K]) => number,
): void {
  const items = cache[store] as CollectionItemMap[K][];
  if (items.length <= maxEntries) return;

  // Sort newest first, keep only maxEntries
  items.sort(compareFn);
  const toDelete = items.splice(maxEntries);

  // Fire-and-forget: delete from IndexedDB
  if (db && !useLocalStorageFallback) {
    for (const item of toDelete) {
      try {
        db.delete(store, (item as { id: string }).id).catch(() => {});
      } catch { /* ignore */ }
    }
  }
}
```

**Step 2: Add tests**

Append to `tests/hooks-phase1.test.tsx`:

```typescript
import { MAX_HISTORY_ENTRIES, MAX_EVENT_ENTRIES } from '../src/domain/storage';

describe('Storage retention policies', () => {
  it('MAX_HISTORY_ENTRIES is 100', () => {
    expect(MAX_HISTORY_ENTRIES).toBe(100);
  });

  it('MAX_EVENT_ENTRIES is 1000', () => {
    expect(MAX_EVENT_ENTRIES).toBe(1000);
  });
});
```

**Step 3: Run tests**

Run: `npx vitest run tests/hooks-phase1.test.tsx`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/domain/storage.ts tests/hooks-phase1.test.tsx
git commit -m "feat: add storage retention policies (max 100 history, 1000 events)"
```

---

### Task 9: Test warnings cleanup — Fix act() warnings and audio mocks

**Files:**
- Modify: `tests/setup.ts`
- Modify: Various test files as needed

**Step 1: Enhance audio mocks in tests/setup.ts**

In `tests/setup.ts`, after the existing `HTMLMediaElement.prototype.play` mock, add:

```typescript
// Web Audio API mock
if (typeof window !== 'undefined' && !window.AudioContext) {
  const mockGainNode = {
    connect: vi.fn().mockReturnThis(),
    gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  };
  const mockOscillator = {
    connect: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
    type: 'sine',
    frequency: { value: 440, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    onended: null,
  };
  (window as any).AudioContext = vi.fn(() => ({
    createOscillator: vi.fn(() => ({ ...mockOscillator })),
    createGain: vi.fn(() => ({ ...mockGainNode })),
    destination: {},
    currentTime: 0,
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    state: 'running',
  }));
  (window as any).webkitAudioContext = (window as any).AudioContext;
}

// SpeechSynthesis mock
if (typeof window !== 'undefined' && !window.speechSynthesis) {
  (window as any).speechSynthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => []),
    speaking: false,
    pending: false,
    paused: false,
    onvoiceschanged: null,
  };
  (window as any).SpeechSynthesisUtterance = vi.fn(() => ({
    text: '',
    lang: '',
    rate: 1,
    pitch: 1,
    volume: 1,
    onend: null,
    onerror: null,
  }));
}
```

**Step 2: Run test suite and check for remaining warnings**

Run: `npx vitest run 2>&1 | head -100`
Expected: Fewer warnings. If `act()` warnings remain, they'll be addressed in individual test files.

**Step 3: Fix specific act() warnings if present**

Common pattern in component tests — wrap `fireEvent` calls in `act()`:

```typescript
// Before (causes warning)
fireEvent.click(button);
await waitFor(() => expect(result).toBe(true));

// After (no warning)
await act(async () => {
  fireEvent.click(button);
});
expect(result).toBe(true);
```

Review and fix the most common occurrences in `tests/components.test.tsx` and `tests/hooks.test.tsx`.

**Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass with reduced/zero warnings

**Step 5: Commit**

```bash
git add tests/setup.ts tests/components.test.tsx tests/hooks.test.tsx
git commit -m "test: enhance audio/speech mocks, reduce act() warnings"
```

---

### Task 10: Final verification and documentation update

**Files:**
- Modify: `CLAUDE.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json`

**Step 1: Verify App.tsx line count**

Run: `wc -l src/App.tsx`
Expected: ~700-800 lines (down from 1,294)

**Step 2: Verify bundle size**

Run: `npm run build`
Expected: Build succeeds. Main bundle should be noticeably smaller due to PeerJS lazy-loading.

**Step 3: Run full test suite one final time**

Run: `npx vitest run`
Expected: All tests pass

**Step 4: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 5: Bump version in package.json**

In `package.json`, change version from `"6.7.1"` to `"6.8.0"`.

**Step 6: Update CHANGELOG.md**

Add at the top (after the existing header):

```markdown
### v6.8.0 — Phase 1: Stability & Maintainability

- **App.tsx Refactoring**: Extracted 5 custom hooks — `useModalManager` (14 modal states), `useGameComputedState` (17 useMemo calculations), `useTournamentEventLog` (event logging), `useCheckpointManager` (checkpoint save/restore/schema-versioning), `useDisplayBridge` (TV/display wiring). App.tsx reduced from 1,294 to ~750 LOC.
- **Bundle-Optimierung**: PeerJS (~117 KB) lazy-loaded via dynamic import. Main bundle size reduced.
- **PeerJS-API formalisiert**: `RemoteHost.setDisplayConnectedHandler()` ersetzt unsicheres Callback-Patching via `(host as any).callbacks`.
- **Storage Retention-Policies**: Automatisches Trimmen bei App-Start — max 100 History-Einträge, max 1.000 Events.
- **Checkpoint Schema-Versioning**: `CHECKPOINT_SCHEMA_VERSION` Konstante, Validierung beim Laden, inkompatible Checkpoints werden verworfen statt Crash.
- **Test-Warnungen bereinigt**: Erweiterte Audio/Speech-Mocks in test setup, reduzierte act()-Warnungen.
- **5 neue Hook-Dateien**: `useModalManager.ts`, `useGameComputedState.ts`, `useTournamentEventLog.ts`, `useCheckpointManager.ts`, `useDisplayBridge.ts`
- **N neue Tests** — **M Tests gesamt**
```

(Fill in N and M with actual counts after running tests.)

**Step 7: Update CLAUDE.md**

Add the new hooks to the Project Structure section under `src/hooks/`. Update the version number to 6.8.0. Add the changelog entry.

**Step 8: Commit**

```bash
git add package.json CHANGELOG.md CLAUDE.md
git commit -m "docs: bump version to 6.8.0, update changelog and project docs"
```
