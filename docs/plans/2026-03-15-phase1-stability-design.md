# Phase 1: Stability & Maintainability — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce App.tsx complexity, optimize bundle size, formalize APIs, add retention policies, schema-version checkpoints, E2E in CI, and clean up test warnings.

**Architecture:** Extract 5 custom hooks from App.tsx (Grouped Custom Hooks pattern), lazy-load PeerJS, add storage cleanup policies, version checkpoint schema, integrate Playwright in GitHub Actions, and fix test warnings.

**Tech Stack:** React 19, TypeScript 5.9, Vitest, Playwright, PeerJS, IndexedDB (idb)

---

## 1. App.tsx State-Extraktion (Ansatz B — Grouped Custom Hooks)

### Problem

App.tsx is 1,294 LOC with 28 `useState`, 18 `useCallback`, 23 `useMemo`, and 15+ `useEffect` hooks. It's the single largest architectural bottleneck — every new feature adds state here.

### Approach

Extract 5 custom hooks that group related state and logic. App.tsx retains core state (mode, config, settings, timer) and JSX rendering.

### Hook 1: `useModalManager()`

**File:** `src/hooks/useModalManager.ts`

Manages all 14 modal boolean states + their show/close callbacks:

```typescript
interface ModalManager {
  // State
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
  // Setters (for cases where direct set is needed)
  setShowCallTheClock: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRemoteControl: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPlayerPanel: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  // Convenience toggles
  openTemplates: () => void;
  closeTemplates: () => void;
  openHistory: () => void;
  closeHistory: () => void;
  // ... etc for all modals
  toggleCallTheClock: () => void;
}
```

**Extracts from App.tsx:**
- Lines 131-138: 8 modal useState declarations
- Lines 280-296: showInstallGuide, showHelp, showTournamentLog, showPayoutOverlay, showShareHub
- Lines 308-322: toggleCleanView (interacts with showPlayerPanel/showSidebar)

**Note:** `showRemoteControl` stays in `useRemoteHostBridge` where it already lives. `cleanView` stays in App.tsx since it's game-state, not a modal — but `toggleCleanView` moves into the hook since it interacts with showPlayerPanel/showSidebar.

### Hook 2: `useGameComputedState()`

**File:** `src/hooks/useGameComputedState.ts`

Consolidates all 17 `useMemo` calculations that derive game state from config + timer:

```typescript
interface GameComputedState {
  displaySeconds: number;
  tournamentElapsed: number;
  rebuyActive: boolean;
  lateRegOpen: boolean;
  addOnWindowOpen: boolean;
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
```

**Extracts from App.tsx:**
- Lines 170-192: lastRebuyLevelIndex, addOnPauseLevelIndex
- Lines 418-537: displaySeconds through inTheMoney (all useMemo chain)
- Lines 658-707: tournamentFinished, winner, finishedResult, startErrors

**Parameters:** `config`, `settings`, `timer.timerState`, `tournamentEvents`

### Hook 3: `useCheckpointManager()`

**File:** `src/hooks/useCheckpointManager.ts`

Encapsulates checkpoint save/restore/debounce logic:

```typescript
interface CheckpointManager {
  pendingCheckpoint: TournamentCheckpoint | null;
  setPendingCheckpoint: React.Dispatch<React.SetStateAction<TournamentCheckpoint | null>>;
}
```

**Extracts from App.tsx:**
- Lines 156: pendingCheckpoint useState
- Lines 234-273: Auto-save effect with debounce + interval
- Lines 663-686: Clear checkpoint + save result on tournament finish

**Internal:** Schema version validation on load (new feature — see Section 5).

### Hook 4: `useTournamentEventLog()`

**File:** `src/hooks/useTournamentEventLog.ts`

Manages tournament event logging:

```typescript
interface TournamentEventLog {
  tournamentEvents: TournamentEvent[];
  setTournamentEvents: React.Dispatch<React.SetStateAction<TournamentEvent[]>>;
  handleAppendEvent: (event: TournamentEvent) => void;
}
```

**Extracts from App.tsx:**
- Line 153: tournamentEvents useState
- Lines 324-327: handleAppendEvent callback
- Lines 744-766: Timer event logging effects (level_start, timer_paused, timer_resumed)
- Lines 892-919: Mode transition events (tournament_started, tournament_finished)

### Hook 5: `useDisplayBridge()`

**File:** `src/hooks/useDisplayBridge.ts`

Encapsulates the BroadcastChannel + PeerJS display wiring:

```typescript
interface DisplayBridge {
  buildFullStatePayload: () => DisplayStatePayload;
  tvWindowActive: boolean;
  openTVWindow: () => void;
  closeTVWindow: () => void;
  handleToggleTVWindow: () => void;
  displayCount: number;
}
```

**Extracts from App.tsx:**
- Lines 562-607: leagueDisplayData memo + buildFullStatePayload callback
- Lines 609-625: useTVDisplay hook call
- Lines 622-643: handleToggleTVWindow + gate wrapper
- Lines 842-854: useDisplaySession hook call

### Target Result

After extraction, App.tsx should be ~750 LOC containing:
- Core state: mode, config, settings (3 useState)
- Game state: cleanView, lastHandActive, handForHandActive, showDealerBadges, sidePotData, recentTableMoves, addOnEndLevelIndex, clockTime (8 useState)
- Timer hook call
- Hook orchestration (calling the 5 new hooks + existing hooks)
- Effects that bridge between hooks (e.g. late-reg voice, add-on window, bubble/hand-for-hand)
- JSX rendering (~370 LOC)

---

## 2. Bundle-Optimierung

### Problem

Main bundle is ~606 KB. PeerJS (117 KB) is statically imported in `remote.ts` despite only being needed when Remote Control or Display is activated.

### Solution

**PeerJS dynamic import:** Change `remote.ts` to use `import('peerjs')` at the point where `RemoteHost` or `RemoteController` is instantiated.

```typescript
// Before (static)
import Peer from 'peerjs';

// After (dynamic)
let PeerModule: typeof import('peerjs') | null = null;
async function getPeer() {
  if (!PeerModule) PeerModule = await import('peerjs');
  return PeerModule.default;
}
```

**Verification:** Confirm Sentry, jspdf, html-to-image are already dynamically imported (they should be per CLAUDE.md). No changes needed if confirmed.

**Target:** Main bundle < 500 KB.

---

## 3. PeerJS-API Formalisieren

### Problem

`useDisplaySession.ts` patches `RemoteHost` internals via `(host as any).callbacks.onDisplayConnected`:

```typescript
// Current — unsafe cast
(host as any).callbacks.onDisplayConnected = onDisplayConnected;
```

### Solution

Add public `setDisplayConnectedHandler()` method to `RemoteHost`:

```typescript
class RemoteHost {
  // ... existing code ...

  /** Register callback for when a display peer connects. */
  setDisplayConnectedHandler(handler: (() => void) | undefined): void {
    this.callbacks.onDisplayConnected = handler;
  }
}
```

Update `useDisplaySession.ts`:
```typescript
// After — typed API
host.setDisplayConnectedHandler(onDisplayConnected);
return () => host.setDisplayConnectedHandler(undefined);
```

---

## 4. Storage Retention-Policies

### Problem

History and events collections grow unbounded. On a heavily-used device, this could eventually degrade IndexedDB performance.

### Solution

Add cleanup in `initStorage()` after cache population:

```typescript
// In initStorage(), after loading cache:
function enforceRetentionPolicies() {
  const MAX_HISTORY = 100;
  const MAX_EVENTS = 1000;

  if (cache.history.length > MAX_HISTORY) {
    // Sort by date descending, keep newest MAX_HISTORY
    cache.history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const toDelete = cache.history.splice(MAX_HISTORY);
    // Fire-and-forget: delete from IndexedDB
    for (const item of toDelete) deleteFromStore('history', item.id);
  }

  if (cache.events.length > MAX_EVENTS) {
    cache.events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const toDelete = cache.events.splice(MAX_EVENTS);
    for (const item of toDelete) deleteFromStore('events', item.id);
  }
}
```

Export constants for testability.

---

## 5. Checkpoint Schema-Versioning

### Problem

Checkpoint data saved from an older app version could have incompatible structure, causing runtime errors on restore.

### Solution

Add `CHECKPOINT_SCHEMA_VERSION` constant and validate on load:

```typescript
// configPersistence.ts
export const CHECKPOINT_SCHEMA_VERSION = 2; // bump when checkpoint shape changes

// In saveCheckpoint():
saveCheckpoint({
  ...checkpoint,
  schemaVersion: CHECKPOINT_SCHEMA_VERSION,
});

// In loadCheckpoint():
export function loadCheckpoint(): TournamentCheckpoint | null {
  const data = getCached('checkpoint');
  if (!data) return null;
  // Reject incompatible schema versions
  if ((data as any).schemaVersion !== CHECKPOINT_SCHEMA_VERSION) {
    clearCheckpoint();
    return null;
  }
  return data;
}
```

Add `schemaVersion: number` to `TournamentCheckpoint` type.

---

## 6. E2E in CI

### Problem

14 Playwright E2E tests exist but aren't run in CI — regressions can slip through.

### Solution

Add Playwright job to `.github/workflows/deploy.yml` (or separate workflow):

```yaml
e2e:
  runs-on: ubuntu-latest
  needs: [test]  # run after unit tests pass
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 20 }
    - run: npm ci
    - run: npx playwright install --with-deps chromium
    - run: npm run build
    - run: npx playwright test --project=chromium
```

Run only Chromium to keep CI fast (~2 min). Can expand to Firefox/WebKit later.

---

## 7. Test-Warnungen bereinigen

### Problem

`npm run test` shows React `act()` warnings and incomplete audio mocks, making output noisy and masking real issues.

### Solution

1. **Fix `act()` warnings:** Wrap state-updating operations in tests with `act()`. Common pattern:
   ```typescript
   await act(async () => {
     fireEvent.click(button);
   });
   ```

2. **Audio mocks:** In `tests/setup.ts`, add comprehensive mocks:
   ```typescript
   // Web Audio API
   window.AudioContext = vi.fn(() => ({
     createOscillator: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), type: '', frequency: { value: 0 } })),
     createGain: vi.fn(() => ({ connect: vi.fn(), gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() } })),
     destination: {},
     currentTime: 0,
     resume: vi.fn(),
   }));

   // HTMLAudioElement
   window.HTMLAudioElement.prototype.play = vi.fn(() => Promise.resolve());
   window.HTMLAudioElement.prototype.pause = vi.fn();
   ```

3. **Target:** 0 warnings in test output.

---

## Risk Assessment

| Deliverable | Risk | Mitigation |
|------------|------|------------|
| App.tsx hooks | Medium — many interdependencies | Extract one hook at a time, run tests after each |
| PeerJS dynamic | Low — well-scoped change | Test remote + display flow manually |
| PeerJS API | Low — 3 lines changed | Type-safe, backward compatible |
| Retention | Low — additive, no breaking change | Unit test the cleanup logic |
| Schema version | Low — simple guard | Test with version mismatch |
| E2E in CI | Low — additive | Separate job, doesn't block deploy |
| Test warnings | Low — test-only changes | No production code affected |

## Sequence

1. App.tsx hooks (largest, most impactful — do first while codebase is fresh)
2. Test warnings (clean baseline for verifying hook extraction)
3. Bundle optimization (PeerJS dynamic import)
4. PeerJS API formalization
5. Storage retention policies
6. Checkpoint schema versioning
7. E2E in CI (last — needs all other changes stable)
