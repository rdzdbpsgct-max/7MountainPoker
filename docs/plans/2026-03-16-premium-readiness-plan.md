# Premium-Readiness Implementation Plan — ✅ IMPLEMENTED (v6.9.2)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire all 5 premium features through the gate system and activate telemetry — no visible change for users (default tier stays `'premium'`).

**Architecture:** Add `canUseMultiTable` / `canUseSidePot` gate checks in App.tsx following the exact pattern of the existing 3 gates. Wire `markFeatureDiscovered()` at 5 entry points and `trackFeatureUsed()` at 5 usage points. Call `trackSessionStarted()` once at app boot.

**Tech Stack:** React 19, TypeScript, Vitest, existing `entitlements.ts` + `monetizationTelemetry.ts` modules.

---

### Task 1: Add `multiTable` and `sidePot` gate checks in App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add the two missing `canUse*` memos**

After line 99 (`const canUseLeagueMode = ...`), add:

```typescript
const canUseMultiTable = useMemo(() => isFeatureAvailable('multiTable', entitlements), [entitlements]);
const canUseSidePot = useMemo(() => isFeatureAvailable('sidePot', entitlements), [entitlements]);
```

**Step 2: Pass new gate props to components**

Find where `SetupModeContainer` is rendered (around line 800+) and add the two new props. Find where `GameModeContainer` is rendered and pass `canUseSidePot` through.

In the `SetupModeContainer` call-site, add:
```typescript
canUseMultiTable={canUseMultiTable}
onOpenFeatureGate={openFeatureGate}
```

In the `GameModeContainer` call-site, add:
```typescript
canUseSidePot={canUseSidePot}
canUseMultiTable={canUseMultiTable}
onOpenFeatureGate={openFeatureGate}
```

**Step 3: Run lint + build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add canUseMultiTable/canUseSidePot gate checks in App.tsx"
```

---

### Task 2: Gate-check for Multi-Table in SetupPage.tsx

**Files:**
- Modify: `src/components/SetupPage.tsx`
- Modify: `src/components/modes/SetupModeContainer.tsx`

**Step 1: Accept gate props in SetupPage**

Add to the `Props` interface:
```typescript
canUseMultiTable?: boolean;
onOpenFeatureGate?: (feature: AppFeature) => void;
```

Import `AppFeature`:
```typescript
import type { AppFeature } from '../domain/entitlements';
```

Destructure in function signature:
```typescript
canUseMultiTable,
onOpenFeatureGate,
```

**Step 2: Guard the Multi-Table toggle button**

In the Multi-Table sub-section (around line 559), wrap the `handleToggleMultiTable` call:

Change the toggle button's `onClick`:
```typescript
onClick={() => {
  if (canUseMultiTable === false && onOpenFeatureGate) {
    onOpenFeatureGate('multiTable');
    return;
  }
  handleToggleMultiTable();
}}
```

**Step 3: Thread props through SetupModeContainer**

In `SetupModeContainer.tsx`, accept `canUseMultiTable` and `onOpenFeatureGate` in its Props and pass them down to `SetupPage`.

**Step 4: Run lint + build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/SetupPage.tsx src/components/modes/SetupModeContainer.tsx
git commit -m "feat: add multiTable gate check in SetupPage"
```

---

### Task 3: Gate-check for Side-Pot in PlayerPanel.tsx

**Files:**
- Modify: `src/components/PlayerPanel.tsx`
- Modify: `src/components/modes/GameModeContainer.tsx`

**Step 1: Accept gate prop in PlayerPanel**

Add to the `Props` interface:
```typescript
canUseSidePot?: boolean;
onOpenFeatureGate?: (feature: AppFeature) => void;
```

Import `AppFeature`:
```typescript
import type { AppFeature } from '../domain/entitlements';
```

Destructure in function signature:
```typescript
canUseSidePot,
onOpenFeatureGate,
```

**Step 2: Guard the Side-Pot button**

Change the SidePot button's `onClick` (around line 265):

```typescript
onClick={() => {
  if (canUseSidePot === false && onOpenFeatureGate) {
    onOpenFeatureGate('sidePot');
    return;
  }
  setShowSidePot(true);
}}
```

**Step 3: Thread props through GameModeContainer**

In `GameModeContainer.tsx`, accept `canUseSidePot` and `onOpenFeatureGate` in its Props interface (or the relevant grouped interface), and pass them to the `PlayerPanel` render.

**Step 4: Safety-guard for MultiTable in GameModeContainer**

Also pass `canUseMultiTable` to `GameModeContainer`. Add a guard around the `MultiTablePanel` render (around line 286):

```typescript
{config.tables && config.tables.length > 0 && canUseMultiTable !== false && (
  <MultiTablePanel ... />
)}
```

**Step 5: Run lint + build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/PlayerPanel.tsx src/components/modes/GameModeContainer.tsx
git commit -m "feat: add sidePot/multiTable gate checks in PlayerPanel + GameModeContainer"
```

---

### Task 4: Wire `markFeatureDiscovered()` at 5 entry points

**Files:**
- Modify: `src/components/AppHeader.tsx`
- Modify: `src/components/SetupPage.tsx`
- Modify: `src/components/PlayerPanel.tsx`

**Step 1: Add discovery calls in AppHeader**

Import:
```typescript
import { markFeatureDiscovered } from '../domain/entitlements';
```

At the 3 feature button `onClick` handlers (Remote, TV, Liga), add `markFeatureDiscovered` as the first line of each click handler:

- Remote button (line ~110): Add `markFeatureDiscovered('remoteControl');` before the gate check
- TV button (line ~128): Add `markFeatureDiscovered('tvDisplay');` before the gate check
- Liga button (line ~194): Add `markFeatureDiscovered('league');` before the gate check

**Step 2: Add discovery call in SetupPage Multi-Table toggle**

In the Multi-Table toggle button's `onClick` (modified in Task 2), add:
```typescript
markFeatureDiscovered('multiTable');
```
as the first line, before the gate check.

Import at top:
```typescript
import { markFeatureDiscovered } from '../domain/entitlements';
```

**Step 3: Add discovery call in PlayerPanel Side-Pot button**

In the Side-Pot button's `onClick` (modified in Task 3), add:
```typescript
markFeatureDiscovered('sidePot');
```
as the first line, before the gate check.

Import at top:
```typescript
import { markFeatureDiscovered } from '../domain/entitlements';
```

**Step 4: Run lint + build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/AppHeader.tsx src/components/SetupPage.tsx src/components/PlayerPanel.tsx
git commit -m "feat: wire markFeatureDiscovered at 5 premium feature entry points"
```

---

### Task 5: Wire `trackFeatureUsed()` at 5 usage points

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/MultiTablePanel.tsx`
- Modify: `src/components/SidePotCalculator.tsx`

**Step 1: Track TV Display, Remote, Liga usage in App.tsx**

Import:
```typescript
import { trackFeatureUsed } from './domain/monetizationTelemetry';
```

- In `handleToggleTVWindowWithGate`, after the gate check passes and before calling `handleToggleTVWindow()`, add:
  ```typescript
  trackFeatureUsed('tvDisplay', 'game');
  ```

- In the remote host start flow (find `startRemoteHost` usage), add `trackFeatureUsed('remoteControl', 'game');` when remote is started. Best place: in the `onStartRemoteHost` prop or the AppHeader click handler. Since AppHeader already has the gate check, add tracking in App.tsx where `startRemoteHost` is defined or called.

- For Liga mode: In the mode toggle handler where `setMode('league')` is called, add:
  ```typescript
  trackFeatureUsed('league', 'league');
  ```

**Step 2: Track Multi-Table usage in MultiTablePanel**

Import at top of `MultiTablePanel.tsx`:
```typescript
import { trackFeatureUsed } from '../domain/monetizationTelemetry';
```

Add a `useEffect` that fires once on mount:
```typescript
useEffect(() => {
  trackFeatureUsed('multiTable', 'game');
}, []);
```

**Step 3: Track Side-Pot usage in SidePotCalculator**

Import at top of `SidePotCalculator.tsx`:
```typescript
import { trackFeatureUsed } from '../domain/monetizationTelemetry';
```

Add a `useEffect` that fires once on mount:
```typescript
useEffect(() => {
  trackFeatureUsed('sidePot', 'game');
}, []);
```

**Step 4: Run lint + build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/App.tsx src/components/MultiTablePanel.tsx src/components/SidePotCalculator.tsx
git commit -m "feat: wire trackFeatureUsed at 5 premium feature usage points"
```

---

### Task 6: Wire `trackSessionStarted()` in main.tsx

**Files:**
- Modify: `src/main.tsx`

**Step 1: Add session tracking**

Import:
```typescript
import { trackSessionStarted } from './domain/monetizationTelemetry';
```

In the `renderApp()` function, before the `createRoot` call, add:
```typescript
trackSessionStarted();
```

This fires once per page load — the simplest and most reliable session tracking point.

**Step 2: Run lint + build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "feat: wire trackSessionStarted in main.tsx"
```

---

### Task 7: Write unit tests for new gate checks

**Files:**
- Modify: `tests/entitlements.test.ts`

**Step 1: Write tests for multiTable and sidePot gate checks**

Add to the existing `describe('entitlements', ...)`:

```typescript
it('gates multiTable for free tier', () => {
  expect(isFeatureAvailable('multiTable', { tier: 'free' })).toBe(false);
  expect(isFeatureAvailable('multiTable', { tier: 'premium' })).toBe(true);
});

it('gates sidePot for free tier', () => {
  expect(isFeatureAvailable('sidePot', { tier: 'free' })).toBe(false);
  expect(isFeatureAvailable('sidePot', { tier: 'premium' })).toBe(true);
});

it('includes multiTable and sidePot in features lost on downgrade', () => {
  const lost = featuresLostOnTierChange('premium', 'free');
  expect(lost).toContain('multiTable');
  expect(lost).toContain('sidePot');
});

it('includes multiTable and sidePot in features gained on upgrade', () => {
  const gained = featuresGainedOnTierChange('free', 'premium');
  expect(gained).toContain('multiTable');
  expect(gained).toContain('sidePot');
});
```

**Step 2: Run tests to verify they pass**

Run: `npm run test`
Expected: All tests PASS (existing 8 + 4 new = 12 entitlement tests)

**Step 3: Commit**

```bash
git add tests/entitlements.test.ts
git commit -m "test: add gate check tests for multiTable and sidePot"
```

---

### Task 8: Update documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `CHANGELOG.md`

**Step 1: Update CLAUDE.md**

- Bump version to 6.9.2
- Update test count
- Add v6.9.2 changelog entry describing premium-readiness wiring

**Step 2: Update CHANGELOG.md**

Add v6.9.2 entry:
```markdown
### v6.9.2 — Premium-Readiness: Gate-Infrastruktur vervollständigt

- **Gate-Checks für multiTable und sidePot**: `canUseMultiTable` und `canUseSidePot` in App.tsx, durchgereicht an SetupPage und PlayerPanel/GameModeContainer. Safety-Guard für MultiTablePanel.
- **Feature-Discovery verdrahtet**: `markFeatureDiscovered()` an allen 5 Premium-Feature-Einstiegspunkten (TV, Remote, Liga, Multi-Table, Side-Pot).
- **Telemetrie aktiviert**: `trackFeatureUsed()` bei Nutzung aller 5 Premium-Features, `trackSessionStarted()` beim App-Start.
- **Keine sichtbare Änderung**: Default-Tier bleibt `'premium'`, alle Features weiterhin für alle Nutzer verfügbar.
- **4 neue Tests** — **XXXX Tests gesamt**
```

**Step 3: Update README.md**

Bump version badge and test count.

**Step 4: Commit**

```bash
git add CLAUDE.md CHANGELOG.md README.md
git commit -m "docs: update documentation for v6.9.2 premium-readiness"
```

---

### Task 9: Final verification

**Step 1: Run full test suite**

Run: `npm run test`
Expected: All tests PASS

**Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 3: Run build**

Run: `npm run build`
Expected: PASS

**Step 4: Manual verification notes**

- With default `VITE_APP_TIER=premium` (or unset): all features work as before, no lock icons visible
- With `VITE_APP_TIER=free`: Multi-Table toggle shows FeatureGateModal, Side-Pot button shows FeatureGateModal, TV/Remote/Liga already gated
