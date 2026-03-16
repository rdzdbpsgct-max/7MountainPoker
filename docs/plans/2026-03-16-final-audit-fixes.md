# Final-Audit Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 45 findings from the Final-Audit v6.9.2 across Quick Wins, P0, P1, and P2 priorities.

**Architecture:** Surgical fixes to existing files — no new components or architectural changes. Each fix is isolated and testable independently. Order: Quick Wins (low-risk one-liners) -> P0 (critical stability/CI) -> P1 (high-risk state/security/build) -> P2 (medium hardening).

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Vitest, ESLint 9

---

## Phase 1: Quick Wins (QW1-QW10)

### Task QW1: Remove `|| true` from npm audit in CI

**Files:**
- Modify: `.github/workflows/deploy.yml:44`

**Step 1: Fix the line**

```yaml
# Before:
      - name: Security audit
        run: npm audit --audit-level=high || true

# After:
      - name: Security audit
        run: npm audit --audit-level=high --omit=dev
```

Note: `--omit=dev` skips dev dependencies to reduce false positives while still enforcing production dependency security.

**Step 2: Commit**
```bash
git add .github/workflows/deploy.yml
git commit -m "fix(ci): enforce npm audit instead of silencing with || true"
```

---

### Task QW2: Clock interval 30s instead of 1s

**Files:**
- Modify: `src/App.tsx:150`

**Step 1: Fix the interval**

```ts
// Before (line 150):
    const id = setInterval(update, 1000);

// After:
    const id = setInterval(update, 30_000);
```

**Step 2: Commit**
```bash
git add src/App.tsx
git commit -m "perf: change clock interval from 1s to 30s (matches HH:MM display resolution)"
```

---

### Task QW3: Unify MAX_HISTORY constants

**Files:**
- Modify: `src/domain/historyPersistence.ts:9`
- Modify: `src/components/TournamentHistory.tsx` (import change)

**Step 1: Replace constant in historyPersistence.ts**

```ts
// Before (line 9):
export const MAX_HISTORY = 200;

// After:
import { MAX_HISTORY_ENTRIES } from './storage';
export const MAX_HISTORY = MAX_HISTORY_ENTRIES;
```

**Step 2: Run tests**
```bash
npm run test
```

**Step 3: Commit**
```bash
git add src/domain/historyPersistence.ts
git commit -m "fix(data): unify MAX_HISTORY with storage MAX_HISTORY_ENTRIES (100)"
```

---

### Task QW4: ErrorBoundary CSS fallback color

**Files:**
- Modify: `src/components/ErrorBoundary.tsx:43`

**Step 1: Add fallback value**

Find the reload button's inline style and add a CSS fallback:

```tsx
// Before:
style={{ backgroundColor: 'var(--accent-600)' }}

// After:
style={{ backgroundColor: 'var(--accent-600, #059669)' }}
```

**Step 2: Commit**
```bash
git add src/components/ErrorBoundary.tsx
git commit -m "fix(ui): add fallback color to ErrorBoundary reload button"
```

---

### Task QW5: Pin GitHub Actions to existing versions

**Files:**
- Modify: `.github/workflows/deploy.yml` (all occurrences of @v6)

**Step 1: Replace all `@v6` with `@v4`**

Search and replace across the file:
- `actions/checkout@v6` -> `actions/checkout@v4`
- `actions/setup-node@v6` -> `actions/setup-node@v4`

There should be ~10 occurrences total (2 per job, 5 jobs).

**Step 2: Commit**
```bash
git add .github/workflows/deploy.yml
git commit -m "fix(ci): pin GitHub Actions to existing v4 versions (v6 does not exist)"
```

---

### Task QW6: PWA maxEntries 650

**Files:**
- Modify: `vite.config.ts` (runtimeCaching maxEntries)

**Step 1: Increase maxEntries**

```ts
// Before:
          maxEntries: 500,

// After:
          maxEntries: 650,
```

**Step 2: Commit**
```bash
git add vite.config.ts
git commit -m "fix(pwa): increase audio cache maxEntries to 650 (covers all 590 MP3s)"
```

---

### Task QW7: GainNode disconnect in audioPlayer

**Files:**
- Modify: `src/domain/audioPlayer.ts:131-136`

**Step 1: Add disconnect to safeResolve**

```ts
// Before (lines 131-136):
      const safeResolve = () => {
        if (resolved) return;
        resolved = true;
        scheduledSources = [];
        if (!cancelRequested) resolve();
      };

// After:
      const safeResolve = () => {
        if (resolved) return;
        resolved = true;
        scheduledSources = [];
        gainNode.disconnect();
        if (!cancelRequested) resolve();
      };
```

**Step 2: Commit**
```bash
git add src/domain/audioPlayer.ts
git commit -m "fix(audio): disconnect GainNode after playback to prevent accumulation"
```

---

### Task QW8: maxLength on player name inputs

**Files:**
- Modify: `src/components/PlayerManager.tsx:176-183` (add maxLength)
- Modify: `src/components/GameDayEditor.tsx` (add maxLength to name/label/venue/notes inputs)

**Step 1: Add maxLength to PlayerManager**

```tsx
// Add maxLength={50} to the player name input:
<input
  type="text"
  maxLength={50}
  value={player.name}
  ...
```

**Step 2: Add maxLength to GameDayEditor text inputs**

Add `maxLength={100}` to label, venue, and notes inputs. Add `maxLength={50}` to player name input.

**Step 3: Commit**
```bash
git add src/components/PlayerManager.tsx src/components/GameDayEditor.tsx
git commit -m "fix(input): add maxLength to player name and game day text inputs"
```

---

### Task QW9: Remove dead Inter font reference

**Files:**
- Modify: `src/index.css:160`

**Step 1: Remove Inter from font stack**

```css
/* Before: */
font-family: 'Inter', system-ui, -apple-system, sans-serif;

/* After: */
font-family: system-ui, -apple-system, sans-serif;
```

**Step 2: Commit**
```bash
git add src/index.css
git commit -m "fix(css): remove dead Inter font reference (system-ui is the actual font)"
```

---

### Task QW10: Update bundle size threshold in CI

**Files:**
- Modify: `.github/workflows/deploy.yml:167`

**Step 1: Update threshold and make it a hard gate**

```bash
# Before:
MAX_SIZE=520000
...
echo "::warning::Main bundle exceeds ${MAX_SIZE} bytes (actual: ${MAIN_SIZE} bytes)"

# After:
MAX_SIZE=670000
...
echo "::error::Main bundle exceeds budget: ${MAIN_SIZE} bytes > ${MAX_SIZE} bytes"
exit 1
```

**Step 2: Commit**
```bash
git add .github/workflows/deploy.yml
git commit -m "fix(ci): update bundle size threshold to 670KB and make it a hard gate"
```

---

## Phase 2: P0 Critical Fixes (P0-1 to P0-4)

### Task P0-1: Fix useTimer dangling intervals

**Files:**
- Modify: `src/hooks/useTimer.ts:191-225`

**Step 1: Remove eager interval starts from nextLevel and previousLevel**

In `nextLevel` (around line 191-208), remove the eager interval start at the end:

```ts
// Before nextLevel (simplified):
const nextLevel = useCallback(() => {
  clearTick();
  setTimerState((prev) => { /* advance level */ });
  // REMOVE these lines:
  // if (timerStateRef.current.status === 'running') {
  //   intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);
  // }
}, [...]);
```

Do the same for `previousLevel` (around line 210-225).

The `useEffect` at lines 104-112 already handles starting/stopping the interval based on `timerState.status`. By removing the eager restart, we prevent dual intervals.

**Step 2: Run timer-related tests**
```bash
npm run test
```

**Step 3: Commit**
```bash
git add src/hooks/useTimer.ts
git commit -m "fix(timer): remove eager interval restart in nextLevel/previousLevel to prevent dangling intervals"
```

---

### Task P0-2: Fix checkpoint stale remainingSeconds

**Files:**
- Modify: `src/hooks/useCheckpointManager.ts`

**Step 1: Add ref for remainingSeconds and separate interval effect**

```ts
// Add a ref to track current remainingSeconds (after the function signature):
const remainingSecondsRef = useRef(remainingSeconds);
useEffect(() => { remainingSecondsRef.current = remainingSeconds; });

// In the doSave function, replace:
//   remainingSeconds,
// with:
//   remainingSeconds: remainingSecondsRef.current,

// Separate the periodic interval into its own effect with stable deps:
useEffect(() => {
  if (mode !== 'game' || timerStatus !== 'running') return;
  const id = setInterval(() => {
    saveCheckpoint({
      version: 1,
      config,
      settings,
      timer: {
        currentLevelIndex,
        remainingSeconds: remainingSecondsRef.current,
        status: 'paused',
      },
      tournamentEvents,
    });
  }, 5000);
  return () => clearInterval(id);
}, [mode, timerStatus]); // only restart interval when timer starts/stops
```

The debounced save effect remains as-is for config/settings changes.

**Step 2: Run tests**
```bash
npm run test
```

**Step 3: Commit**
```bash
git add src/hooks/useCheckpointManager.ts
git commit -m "fix(checkpoint): use ref for remainingSeconds to prevent stale periodic saves"
```

---

### Task P0-3: Serialize IndexedDB writes per store

**Files:**
- Modify: `src/domain/storage.ts:270-280`

**Step 1: Add write serialization**

```ts
// Add after the cache declaration (around line 85):
const persistQueue = new Map<string, Promise<void>>();

// Replace persistStore function (around line 273):
function persistStore(store: StoreKey): void {
  if (useLocalStorageFallback) {
    persistToLocalStorage(store);
    return;
  }
  if (!db) return;
  const prev = persistQueue.get(store) ?? Promise.resolve();
  const next = prev
    .then(() => persistToIndexedDB(store))
    .catch((err) => {
      console.warn(`[storage] Failed to persist "${store}":`, err);
      persistToLocalStorage(store);
    });
  persistQueue.set(store, next);
}
```

**Step 2: Run persistence tests**
```bash
npm run test
```

**Step 3: Commit**
```bash
git add src/domain/storage.ts
git commit -m "fix(storage): serialize IndexedDB writes per store to prevent race conditions"
```

---

### Task P0-4: CI concurrency fix

**Files:**
- Modify: `.github/workflows/deploy.yml:23-25`

**Step 1: Make concurrency dynamic**

```yaml
# Before:
concurrency:
  group: 'pages'
  cancel-in-progress: true

# After:
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}
```

**Step 2: Commit**
```bash
git add .github/workflows/deploy.yml
git commit -m "fix(ci): use dynamic concurrency group to prevent PR job cancellation"
```

---

## Phase 3: P1 High Fixes (P1-1 to P1-15)

### Task P1-1: Fix stale level index in handleSkipBreak/handleExtendBreak

**Files:**
- Modify: `src/App.tsx:449-463`

**Step 1: Capture level index before action**

```ts
// Before (line 449-455):
const handleSkipBreak = useCallback(() => {
  timer.nextLevel();
  handleAppendEvent(createEvent('break_skipped', timer.timerState.currentLevelIndex, {}));
  ...

// After:
const handleSkipBreak = useCallback(() => {
  const levelIndex = timer.timerState.currentLevelIndex;
  timer.nextLevel();
  handleAppendEvent(createEvent('break_skipped', levelIndex, {}));
  ...

// Same pattern for handleExtendBreak (line 457-463):
const handleExtendBreak = useCallback((seconds: number) => {
  const levelIndex = timer.timerState.currentLevelIndex;
  timer.extendLevel(seconds);
  handleAppendEvent(createEvent('break_extended', levelIndex, { seconds }));
  ...
```

**Step 2: Commit**
```bash
git add src/App.tsx
git commit -m "fix(events): capture level index before timer action to prevent stale event data"
```

---

### Task P1-2: Fix eliminatePlayer stale placement in event log

**Files:**
- Modify: `src/hooks/useTournamentActions.ts:256-332`

**Step 1: Compute placement before startTransition and log event inside setConfig**

```ts
const eliminatePlayer = useCallback((playerId: string, eliminatedBy: string | null) => {
  pushUndo('undo.actions.eliminate');
  pendingTableMovesRef.current = [];
  pendingDissolutionRef.current = null;
  startTransition(() => {
    setConfig((prev) => {
      const placement = computeNextPlacement(prev.players);
      lastPlacementRef.current = placement;
      // ... rest of mutation logic unchanged ...

      // Log event inside setConfig to have correct placement
      onAppendEvent(createEvent('player_eliminated', currentLevelIndex, {
        playerId,
        eliminatorId: eliminatedBy,
        placement,
      }));

      return { ...prev, bounty: updatedBounty, players: updatedPlayers, tables: updatedTables };
    });
  });
  // REMOVE the onAppendEvent call that was after startTransition (old line 331)
}, [setConfig, pushUndo, currentLevelIndex, onAppendEvent]);
```

**Step 2: Run tests**
```bash
npm run test
```

**Step 3: Commit**
```bash
git add src/hooks/useTournamentActions.ts
git commit -m "fix(events): move elimination event log inside setConfig for correct placement"
```

---

### Task P1-3: Fix ITM flash timeout cleanup

**Files:**
- Modify: `src/hooks/useGameEvents.ts:63-96`

**Step 1: Move cleanup to unconditional return**

```ts
// Replace the entire useEffect (lines 63-96) with:
useEffect(() => {
  if (mode !== 'game') return;

  // Bubble just started
  if (bubbleActive && !prevBubbleRef.current) {
    const play = async () => {
      if (settings.soundEnabled) await playBubbleSound();
      if (settings.voiceEnabled) announceBubble(t);
    };
    play();
  }

  // Bubble just ended (burst) -> show ITM flash
  if (!bubbleActive && prevBubbleRef.current && inTheMoney) {
    setShowItmFlash(true);
    const play = async () => {
      if (settings.soundEnabled) await playInTheMoneySound();
      if (settings.voiceEnabled) announceInTheMoney(t);
    };
    play();
    if (itmFlashTimeoutRef.current) clearTimeout(itmFlashTimeoutRef.current);
    itmFlashTimeoutRef.current = setTimeout(() => setShowItmFlash(false), 5000);
  }

  prevBubbleRef.current = bubbleActive;

  // Unconditional cleanup — always clear timeout on unmount or re-run
  return () => {
    if (itmFlashTimeoutRef.current) {
      clearTimeout(itmFlashTimeoutRef.current);
      itmFlashTimeoutRef.current = null;
    }
  };
}, [mode, bubbleActive, inTheMoney, settings.soundEnabled, settings.voiceEnabled, t]);
```

**Step 2: Run tests**
```bash
npm run test
```

**Step 3: Commit**
```bash
git add src/hooks/useGameEvents.ts
git commit -m "fix(events): unconditional cleanup for ITM flash timeout on unmount"
```

---

### Task P1-4: Fix HMAC key race in remote.ts

**Files:**
- Modify: `src/domain/remote.ts`

**Step 1: Store HMAC key promise and await it in verifyAndDispatch**

In the `RemoteHost` class:

```ts
// Add field (near other private fields):
private hmacKeyReady: Promise<void>;

// In constructor, replace:
//   this.initHmacKey();
// with:
  this.hmacKeyReady = this.initHmacKey();

// In verifyAndDispatch (line 718), add await at the start:
private async verifyAndDispatch(msg: RemoteCommand): Promise<void> {
  await this.hmacKeyReady;
  // ... rest unchanged
}
```

Do the same for `RemoteController` class:

```ts
// Add field:
private hmacKeyReady: Promise<void>;

// In constructor:
this.hmacKeyReady = this.initHmacKey();

// In sendCommand, await before signing:
async sendCommand(action: string, payload?: Record<string, unknown>): Promise<void> {
  await this.hmacKeyReady;
  // ... rest unchanged
}
```

**Step 2: Run tests**
```bash
npm run test
```

**Step 3: Commit**
```bash
git add src/domain/remote.ts
git commit -m "fix(remote): await HMAC key initialization before command dispatch"
```

---

### Task P1-5: Fix migration ordering (flag before deletion)

**Files:**
- Modify: `src/domain/storage.ts:333-379`

**Step 1: Set migration flag before deleting source keys**

```ts
async function migrateFromLocalStorage(): Promise<void> {
  if (localStorage.getItem(MIGRATED_KEY) === 'true') return;
  if (!db) return;

  // Set flag FIRST to prevent re-running a partially failed migration
  localStorage.setItem(MIGRATED_KEY, 'true');

  for (const [lsKey, store] of Object.entries(MIGRATION_MAP)) {
    try {
      const raw = localStorage.getItem(lsKey);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      // ... existing migration logic for collection/singleton ...

      // Delete source key only after successful write
      localStorage.removeItem(lsKey);
    } catch (err) {
      console.warn(`[storage] Migration failed for "${lsKey}":`, err);
    }
  }
}
```

**Step 2: Run tests**
```bash
npm run test
```

**Step 3: Commit**
```bash
git add src/domain/storage.ts
git commit -m "fix(storage): set migration flag before deleting localStorage keys"
```

---

### Task P1-6: Add source maps and Sentry release

**Files:**
- Modify: `vite.config.ts` (add sourcemap)
- Modify: `src/monitoring/initSentry.ts` (add release)

**Step 1: Enable hidden source maps**

In `vite.config.ts` build config:
```ts
build: {
  sourcemap: 'hidden',
  target: ['es2020', 'safari14'],
  // ... rest
}
```

**Step 2: Add release to Sentry init**

```ts
// initSentry.ts — replace entire file:
interface InitSentryOptions {
  dsn: string;
  environment: string;
}

export async function initSentry({ dsn, environment }: InitSentryOptions): Promise<void> {
  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn,
    environment,
    release: import.meta.env.VITE_RELEASE ?? undefined,
    tracesSampleRate: 0,
    beforeSend(event) {
      // Strip console breadcrumbs that might contain player names
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.filter(
          (b) => b.category !== 'console' || b.level === 'error'
        );
      }
      return event;
    },
  });
}
```

**Step 3: Commit**
```bash
git add vite.config.ts src/monitoring/initSentry.ts
git commit -m "feat(monitoring): enable hidden source maps and add Sentry release/PII scrubbing"
```

---

### Task P1-7: Lazy-load TVDisplayWindow and CrossDeviceDisplay

**Files:**
- Modify: `src/main.tsx:8` and the render section

**Step 1: Convert static imports to lazy**

```ts
// Before (line 8):
import { TVDisplayWindow, CrossDeviceDisplay } from './components/display'

// After:
import { lazy, Suspense } from 'react';
// ... (keep other imports)

const TVDisplayWindow = lazy(() =>
  import('./components/display').then(m => ({ default: m.TVDisplayWindow }))
);
const CrossDeviceDisplay = lazy(() =>
  import('./components/display').then(m => ({ default: m.CrossDeviceDisplay }))
);
```

Wrap the conditional renders in the `renderApp` function with `<Suspense>`:

```tsx
// Where TVDisplayWindow is rendered, wrap with Suspense:
<Suspense fallback={<div style={{ background: '#0a0a0f', width: '100vw', height: '100vh' }} />}>
  {isLocalDisplayWindow && <TVDisplayWindow />}
  {isRemoteDisplayWindow && remoteDisplayPeerId && (
    <CrossDeviceDisplay hostPeerId={remoteDisplayPeerId} />
  )}
</Suspense>
```

**Step 2: Run build to verify**
```bash
npm run build
```

**Step 3: Commit**
```bash
git add src/main.tsx
git commit -m "perf: lazy-load TVDisplayWindow and CrossDeviceDisplay out of critical path"
```

---

### Task P1-8: Debounce saveConfig

**Files:**
- Modify: `src/App.tsx:276-279`

**Step 1: Add debounced save**

```ts
// Before (lines 276-279):
useEffect(() => {
  saveConfig(config);
}, [config]);

// After:
const saveConfigTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
useEffect(() => {
  if (saveConfigTimeoutRef.current) clearTimeout(saveConfigTimeoutRef.current);
  saveConfigTimeoutRef.current = setTimeout(() => saveConfig(config), 400);
  return () => {
    if (saveConfigTimeoutRef.current) clearTimeout(saveConfigTimeoutRef.current);
  };
}, [config]);
```

**Step 2: Run tests**
```bash
npm run test
```

**Step 3: Commit**
```bash
git add src/App.tsx
git commit -m "perf: debounce saveConfig by 400ms to reduce write frequency"
```

---

### Task P1-9: parseConfigObject structural validation for payout/chips

**Files:**
- Modify: `src/domain/configPersistence.ts:236-283`

**Step 1: Add player validation filter**

```ts
// Before (line 236-247):
players: Array.isArray(parsed.players)
  ? ((parsed.players as Record<string, unknown>[]).map((p) => ({

// After:
players: Array.isArray(parsed.players)
  ? ((parsed.players as Record<string, unknown>[])
      .filter((p) => p && typeof p === 'object' && typeof p.id === 'string' && p.id.length > 0 && typeof p.name === 'string')
      .map((p) => ({
```

**Step 2: Add payout validation**

```ts
// Before (line 249):
payout: (parsed.payout as PayoutConfig) ?? defaultPayoutConfig(),

// After:
payout: (
  parsed.payout &&
  typeof parsed.payout === 'object' &&
  Array.isArray((parsed.payout as Record<string, unknown>).entries)
)
  ? { ...defaultPayoutConfig(), ...(parsed.payout as PayoutConfig) }
  : defaultPayoutConfig(),
```

**Step 3: Run tests**
```bash
npm run test
```

**Step 4: Commit**
```bash
git add src/domain/configPersistence.ts
git commit -m "fix(persistence): add structural validation for players and payout in parseConfigObject"
```

---

### Task P1-10: Clone checkpoint timer before mutation

**Files:**
- Modify: `src/domain/configPersistence.ts:385-392`

**Step 1: Clone timer object**

```ts
// Before (line 385):
    const timer = raw.timer as Record<string, unknown> | undefined;

// After:
    const timer = raw.timer ? { ...(raw.timer as Record<string, unknown>) } : undefined;
```

**Step 2: Commit**
```bash
git add src/domain/configPersistence.ts
git commit -m "fix(persistence): clone checkpoint timer before mutation to prevent cache corruption"
```

---

### Task P1-11: Fix league import orphaned IDs and result collision

**Files:**
- Modify: `src/domain/leaguePersistence.ts:111-137`

**Step 1: Assign new IDs to imported tournament results**

```ts
// Before (line 122):
    saveTournamentResult({ ...result, leagueId: newLeagueId });

// After:
    saveTournamentResult({
      ...result,
      id: `result_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      leagueId: newLeagueId,
    });
```

**Step 2: Clear orphaned registeredPlayerId in imported game days**

```ts
// Before (line 128-132):
      saveGameDay({
        ...gd,
        id: `gd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        leagueId: newLeagueId,
      });

// After:
      saveGameDay({
        ...gd,
        id: `gd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        leagueId: newLeagueId,
        participants: gd.participants?.map(p => ({
          ...p,
          registeredPlayerId: undefined,
        })),
      });
```

**Step 3: Commit**
```bash
git add src/domain/leaguePersistence.ts
git commit -m "fix(league): assign new result IDs and clear orphaned player IDs on import"
```

---

### Task P1-12: Deep clone events in undo snapshots

**Files:**
- Modify: `src/domain/undoStack.ts:129`

**Step 1: Change shallow copy to deep clone**

```ts
// Before (line 129):
    events: [...events],

// After:
    events: events.map(e => ({ ...e })),
```

**Step 2: Run tests**
```bash
npm run test
```

**Step 3: Commit**
```bash
git add src/domain/undoStack.ts
git commit -m "fix(undo): deep-clone events in snapshots for consistency with players/tables"
```

---

### Task P1-13: Fix useDisplaySession timer-tick interval stability

**Files:**
- Modify: `src/hooks/useDisplaySession.ts:81-93`

**Step 1: Use refs for rapidly-changing values**

Add refs before the effect:

```ts
const remainingRef = useRef(remainingSeconds);
const statusRef = useRef(timerStatus);
const levelIndexRef = useRef(currentLevelIndex);
useEffect(() => { remainingRef.current = remainingSeconds; });
useEffect(() => { statusRef.current = timerStatus; });
useEffect(() => { levelIndexRef.current = currentLevelIndex; });
```

Then fix the effect:

```ts
// Before (lines 82-93):
useEffect(() => {
  if (!enabled) return;
  const interval = setInterval(() => {
    const host = hostRef.current;
    if (!host || host.displayCount === 0) return;
    host.sendDisplayState(withDisplayContract({
      type: 'timer-tick',
      payload: { remainingSeconds, status: timerStatus, currentLevelIndex },
    }));
  }, 500);
  return () => clearInterval(interval);
}, [enabled, hostRef, remainingSeconds, timerStatus, currentLevelIndex]);

// After:
useEffect(() => {
  if (!enabled) return;
  const interval = setInterval(() => {
    const host = hostRef.current;
    if (!host || host.displayCount === 0) return;
    host.sendDisplayState(withDisplayContract({
      type: 'timer-tick',
      payload: { remainingSeconds: remainingRef.current, status: statusRef.current, currentLevelIndex: levelIndexRef.current },
    }));
  }, 500);
  return () => clearInterval(interval);
}, [enabled, hostRef]);
```

**Step 2: Commit**
```bash
git add src/hooks/useDisplaySession.ts
git commit -m "fix(display): stabilize timer-tick interval with refs to prevent 250ms teardowns"
```

---

### Task P1-14: Cap extendBreak remote command

**Files:**
- Modify: `src/hooks/useRemoteHostBridge.ts:185-191`

**Step 1: Add upper bound**

```ts
// Before (line 186-188):
        const seconds = cmd.payload?.seconds as number | undefined;
        if (seconds && seconds > 0) {
          timerControls.extendLevel(seconds);

// After:
        const rawSeconds = cmd.payload?.seconds as number | undefined;
        const seconds = typeof rawSeconds === 'number' ? Math.min(rawSeconds, 600) : undefined;
        if (seconds && seconds > 0) {
          timerControls.extendLevel(seconds);
```

**Step 2: Commit**
```bash
git add src/hooks/useRemoteHostBridge.ts
git commit -m "fix(remote): cap extendBreak to 600s maximum"
```

---

### Task P1-15: Add jspdf to manualChunks

**Files:**
- Modify: `vite.config.ts` (manualChunks function)

**Step 1: Add jspdf chunk rule**

```ts
// Add inside the manualChunks function, before the final return:
if (id.includes('/node_modules/jspdf/') || id.includes('/node_modules/jspdf-autotable/')) {
  return 'vendor-pdf';
}
```

**Step 2: Run build to verify**
```bash
npm run build
```

**Step 3: Commit**
```bash
git add vite.config.ts
git commit -m "perf: add jspdf to manualChunks for predictable code splitting"
```

---

## Phase 4: P2 Medium Fixes (P2-1 to P2-16)

### Task P2-1: Validate #display= hash in main.tsx

**Files:**
- Modify: `src/main.tsx:14-15`

**Step 1: Use parseDisplayHash for validation**

```ts
// Before (lines 14-15):
const isRemoteDisplayWindow = hash.startsWith('#display=');
const remoteDisplayPeerId = isRemoteDisplayWindow ? hash.slice('#display='.length) : null;

// After:
import { parseDisplayHash } from './domain/remote';
const displayResult = parseDisplayHash(hash);
const isRemoteDisplayWindow = displayResult !== null;
const remoteDisplayPeerId = displayResult;
```

Check that `parseDisplayHash` returns the peer ID string or null. If it returns an object, adjust accordingly.

**Step 2: Commit**
```bash
git add src/main.tsx
git commit -m "fix(security): validate #display= hash with regex before use"
```

---

### Task P2-2: Fix addRegisteredPlayer cache mutation

**Files:**
- Modify: `src/domain/playerDatabase.ts:22-28`

**Step 1: Clone before mutating**

```ts
// Before (lines 22-28):
  const existing = db.find((p) => p.name.toLowerCase() === normalized.toLowerCase());
  if (existing) {
    existing.lastPlayedAt = new Date().toISOString();
    setCached('players', db);
    return existing;
  }

// After:
  const existingIndex = db.findIndex((p) => p.name.toLowerCase() === normalized.toLowerCase());
  if (existingIndex !== -1) {
    const updated = { ...db[existingIndex], lastPlayedAt: new Date().toISOString() };
    const updatedDb = [...db];
    updatedDb[existingIndex] = updated;
    setCached('players', updatedDb);
    return updated;
  }
```

**Step 2: Commit**
```bash
git add src/domain/playerDatabase.ts
git commit -m "fix(data): clone player before mutation in addRegisteredPlayer"
```

---

### Task P2-3: Fix mystery bounty QR decode

**Files:**
- Modify: `src/domain/tournament.ts:688`

**Step 1: Set bountyEarned to 0 (cannot reconstruct from QR)**

```ts
// Before (line 688):
      const bountyEarned = bountyAmount > 0 ? knockoutsNum * bountyAmount : 0;

// After:
      // bountyEarned cannot be accurately reconstructed from QR for mystery bounty
      const bountyEarned = 0;
```

**Step 2: Run tests and fix any assertions that depend on this value**
```bash
npm run test
```

**Step 3: Commit**
```bash
git add src/domain/tournament.ts
git commit -m "fix(qr): set bountyEarned to 0 in QR decode (inaccurate for mystery bounty)"
```

---

### Task P2-4: Strengthen ID generators

**Files:**
- Modify: `src/domain/helpers.ts:7-21`

**Step 1: Add random entropy**

```ts
// Before:
export function generateId(): string {
  return `lvl_${Date.now()}_${idCounter++}`;
}
// ...
export function generatePlayerId(): string {
  return `player_${Date.now()}_${playerIdCounter++}`;
}
// ...
export function generateChipId(): string {
  return `chip_${Date.now()}_${chipIdCounter++}`;
}

// After:
export function generateId(): string {
  return `lvl_${Date.now()}_${idCounter++}_${Math.random().toString(36).slice(2, 6)}`;
}
// ...
export function generatePlayerId(): string {
  return `player_${Date.now()}_${playerIdCounter++}_${Math.random().toString(36).slice(2, 6)}`;
}
// ...
export function generateChipId(): string {
  return `chip_${Date.now()}_${chipIdCounter++}_${Math.random().toString(36).slice(2, 6)}`;
}
```

**Step 2: Run tests**
```bash
npm run test
```

**Step 3: Commit**
```bash
git add src/domain/helpers.ts
git commit -m "fix(data): add random entropy to ID generators for cross-session uniqueness"
```

---

### Task P2-5: Enable noUncheckedIndexedAccess

**Files:**
- Modify: `tsconfig.app.json`

**Step 1: Add compiler option**

```json
"noUncheckedIndexedAccess": true
```

**Step 2: Run TypeScript check and fix errors**
```bash
npx tsc --noEmit
```

Fix all resulting type errors by adding `| undefined` checks or non-null assertions where access is guaranteed safe.

**Step 3: Run full test suite**
```bash
npm run test
```

**Step 4: Commit**
```bash
git add tsconfig.app.json src/
git commit -m "fix(types): enable noUncheckedIndexedAccess and fix all resulting type errors"
```

---

### Task P2-6: ESLint no-console and no-explicit-any

**Files:**
- Modify: `eslint.config.js`

**Step 1: Add rules**

```js
// In the rules object, add:
'no-console': ['warn', { allow: ['warn', 'error'] }],
'@typescript-eslint/no-explicit-any': 'error',
```

**Step 2: Run lint and fix violations**
```bash
npm run lint
```

Fix `console.log` occurrences (change to `console.warn` or remove). Fix `any` types.

**Step 3: Commit**
```bash
git add eslint.config.js src/
git commit -m "fix(lint): enforce no-console and no-explicit-any rules"
```

---

### Task P2-7: Fix useVoiceAnnouncements stale fireAlert

**Files:**
- Modify: `src/hooks/useVoiceAnnouncements.ts:238-303`

**Step 1: Add fireAlert ref**

```ts
// After the fireAlert useCallback (around line 249), add:
const fireAlertRef = useRef(fireAlert);
useEffect(() => { fireAlertRef.current = fireAlert; }, [fireAlert]);
```

**Step 2: Replace fireAlert calls in the three alert effects with fireAlertRef.current**

In each of the three effects (lines 261, 285, 306), replace:
```ts
fireAlert(alert, idx, activePlayerCount);
```
with:
```ts
fireAlertRef.current(alert, idx, activePlayerCount);
```

**Step 3: Commit**
```bash
git add src/hooks/useVoiceAnnouncements.ts
git commit -m "fix(voice): use ref for fireAlert in custom alert effects to prevent stale closure"
```

---

### Task P2-8: Fix Sentry package consistency

**Files:**
- Modify: `src/monitoring/initSentry.ts` (already done in P1-6)

This was already addressed in P1-6 where we changed `import('@sentry/browser')` to `import('@sentry/react')`. Verify it's correct.

**Step 1: Verify**
```bash
grep -r "sentry/browser" src/
```

Should return no hits. If it does, update the remaining imports.

**Step 2: Commit (if needed)**

---

### Task P2-9: Fix trackSessionStarted double-fire

**Files:**
- Modify: `src/main.tsx:66,92`

**Step 1: Move trackSessionStarted out of renderApp**

```ts
// Before (line 92):
initStorage().then(renderApp).catch(renderApp)

// After:
initStorage()
  .then(() => {
    trackSessionStarted();
    renderApp();
  })
  .catch((err) => {
    console.error('[storage] init failed:', err);
    renderApp();
  });
```

Remove `trackSessionStarted()` from inside `renderApp()`.

**Step 2: Commit**
```bash
git add src/main.tsx
git commit -m "fix(telemetry): prevent trackSessionStarted double-fire on storage init failure"
```

---

### Task P2-10: Fix useRemoteHostBridge interval stability

**Files:**
- Modify: `src/hooks/useRemoteHostBridge.ts:277-294`

**Step 1: Remove averageStack from effect deps, use ref instead**

Add a ref:
```ts
const averageStackRef = useRef(averageStack);
useEffect(() => { averageStackRef.current = averageStack; });
```

Replace `averageStack` usage in `sendRemoteState` with `averageStackRef.current`, and remove `averageStack` from the dependency array.

**Step 2: Commit**
```bash
git add src/hooks/useRemoteHostBridge.ts
git commit -m "fix(remote): stabilize remote state interval by using ref for averageStack"
```

---

### Task P2-11: ICM Monte Carlo yield to event loop

**Files:**
- Modify: `src/domain/icm.ts:30-34`

**Step 1: Make computeIcmEquity async with setTimeout yield**

```ts
// Before (line 31-34):
  if (activeIndices.length <= 10) {
    activeEquities = exactIcm(activeStacks, payouts, totalChips);
  } else {
    activeEquities = monteCarloIcm(activeStacks, payouts, totalChips, 10_000);
  }

// After — make the function async and yield before Monte Carlo:
  if (activeIndices.length <= 10) {
    activeEquities = exactIcm(activeStacks, payouts, totalChips);
  } else {
    // Yield to event loop before blocking computation
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    activeEquities = monteCarloIcm(activeStacks, payouts, totalChips, 10_000);
  }
```

Update the function signature to return `Promise<number[]>` and update `IcmCalculator.tsx` to await the result.

**Step 2: Run tests**
```bash
npm run test
```

**Step 3: Commit**
```bash
git add src/domain/icm.ts src/components/IcmCalculator.tsx
git commit -m "perf: yield to event loop before ICM Monte Carlo to prevent timer stutter"
```

---

### Task P2-12: Add custom audio file count limit

**Files:**
- Modify: `src/domain/customAudio.ts`
- Modify: `src/components/CustomAudioEditor.tsx`

**Step 1: Add constant and check**

In `customAudio.ts`:
```ts
export const MAX_CUSTOM_AUDIO_FILES = 20;
```

In `CustomAudioEditor.tsx`, before processing uploads, add:
```ts
const existingFiles = loadCustomAudioFiles();
if (existingFiles.length >= MAX_CUSTOM_AUDIO_FILES) {
  setError('customAudio.errorMaxFiles');
  return;
}
```

**Step 2: Add translation key**

Add to both DE and EN translations:
```ts
'customAudio.errorMaxFiles': 'Maximale Anzahl von 20 Audiodateien erreicht.',
// EN:
'customAudio.errorMaxFiles': 'Maximum of 20 audio files reached.',
```

**Step 3: Commit**
```bash
git add src/domain/customAudio.ts src/components/CustomAudioEditor.tsx src/i18n/translations.ts
git commit -m "fix(audio): add limit of 20 custom audio files to prevent storage exhaustion"
```

---

### Task P2-13: CSP unsafe-inline documentation

**Files:**
- Modify: `index.html` (add comment)

**Step 1: Add documentation comment**

```html
<!-- CSP Note: 'unsafe-inline' is required for the theme-detection and loading-text
     inline scripts below, and for Tailwind 4's inline style injection.
     TODO: Replace with sha256 hashes for production hardening. -->
```

**Step 2: Commit**
```bash
git add index.html
git commit -m "docs: document CSP unsafe-inline requirement and future hardening plan"
```

---

### Task P2-14: Create vite-env.d.ts for typed env vars

**Files:**
- Create: `src/vite-env.d.ts`
- Modify: `src/domain/entitlements.ts:50` (remove cast)

**Step 1: Create vite-env.d.ts**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TIER?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_BASE_PATH?: string;
  readonly VITE_RELEASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

**Step 2: Remove cast in entitlements.ts**

```ts
// Before:
const fromEnv = parseTier((import.meta as ImportMeta).env?.VITE_APP_TIER);

// After:
const fromEnv = parseTier(import.meta.env.VITE_APP_TIER);
```

**Step 3: Commit**
```bash
git add src/vite-env.d.ts src/domain/entitlements.ts
git commit -m "fix(types): add vite-env.d.ts for typed env vars, remove ImportMeta cast"
```

---

### Task P2-15: Fix finishedResult useMemo recomputation

**Files:**
- Modify: `src/hooks/useGameComputedState.ts:173-176`

**Step 1: Capture snapshot at tournament finish**

```ts
// Add refs before the useMemo:
const finishedElapsedRef = useRef(0);
const finishedLevelRef = useRef(0);
const finishedEventsRef = useRef<TournamentEvent[]>([]);

useEffect(() => {
  if (tournamentFinished) {
    finishedElapsedRef.current = tournamentElapsed;
    finishedLevelRef.current = currentPlayLevel;
    finishedEventsRef.current = tournamentEvents;
  }
}, [tournamentFinished, tournamentElapsed, currentPlayLevel, tournamentEvents]);

// Replace the useMemo:
const finishedResult = useMemo(() => {
  if (!tournamentFinished) return null;
  return buildTournamentResult(
    config,
    finishedElapsedRef.current,
    finishedLevelRef.current,
    finishedEventsRef.current,
  );
}, [tournamentFinished, config]);
```

**Step 2: Run tests**
```bash
npm run test
```

**Step 3: Commit**
```bash
git add src/hooks/useGameComputedState.ts
git commit -m "perf: capture tournament finish snapshot to prevent useMemo recomputation every tick"
```

---

### Task P2-16: Validate display hash with parseDisplayHash

Already covered in P2-1. Verify and skip if already done.

---

## Verification

After all fixes are applied:

```bash
npm run lint
npm run test
npm run build
```

All three must pass. Then create a single summary commit if any fixups are needed.
