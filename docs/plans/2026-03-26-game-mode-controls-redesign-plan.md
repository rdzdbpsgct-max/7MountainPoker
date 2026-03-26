# Game Mode Controls Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the ··· popover with direct icon buttons for gameplay actions, make "Details" toggle only hide sidebars/RebuyStatus, and move Reset/Restart into the Settings modal.

**Architecture:** Modify Controls.tsx to render icon buttons directly instead of a popover. Update GameModeContainer to decouple sidebar visibility from cleanView. Add Reset/Restart buttons to GameSettingsModal footer. Add a central "show details" button when details are hidden.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS 4, Vitest

---

### Task 1: Add new translation keys

**Files:**
- Modify: `src/i18n/translations.ts`

**Step 1: Add i18n keys for icon button tooltips and details toggle**

Add to DE section (after `game.cleanViewOff` around line 531):
```typescript
'controls.detailsShow': 'Details einblenden',
'controls.detailsHide': 'Details ausblenden',
```

Add to EN section (after `game.cleanViewOff` around line 2013):
```typescript
'controls.detailsShow': 'Show details',
'controls.detailsHide': 'Hide details',
```

Note: Existing keys `game.cleanViewOn`/`game.cleanViewOff` will be replaced by these new keys.

**Step 2: Commit**
```bash
git add src/i18n/translations.ts
git commit -m "feat(i18n): add controls redesign translation keys"
```

---

### Task 2: Rewrite Controls.tsx — icon buttons replace popover

**Files:**
- Modify: `src/components/Controls.tsx`

**Step 1: Remove popover state/refs/effects and replace with icon button row**

Remove:
- `useState(showMore)`, `useRef(moreRef)`, `hasActiveIndicator`, `closeMore` callback
- `useEffect` for click-outside
- The entire `{!hideSecondaryControls && (` popover block (lines 170–272)

Replace `hideSecondaryControls` prop with `detailsHidden` prop. Remove `cleanView` and `onToggleCleanView` props.

Add new prop: `onToggleDetails?: (() => void) | undefined`

New Props interface:
```typescript
interface Props {
  timerState: TimerState;
  onToggleStartPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onReset: () => void;    // kept for keyboard shortcut, but not rendered as button
  onRestart: () => void;  // kept for keyboard shortcut, but not rendered as button
  isBreak?: boolean | undefined;
  onSkipBreak?: (() => void) | undefined;
  onExtendBreak?: ((seconds: number) => void) | undefined;
  detailsHidden?: boolean | undefined;
  onToggleDetails?: (() => void) | undefined;
  lastHandActive?: boolean | undefined;
  onLastHand?: (() => void) | undefined;
  handForHandActive?: boolean | undefined;
  onHandForHand?: (() => void) | undefined;
  onNextHand?: (() => void) | undefined;
  showHandForHand?: boolean | undefined;
  callTheClockSeconds?: number | undefined;
  onCallTheClock?: (() => void) | undefined;
  canUndo?: boolean | undefined;
  canRedo?: boolean | undefined;
  onUndo?: (() => void) | undefined;
  onRedo?: (() => void) | undefined;
  undoLabel?: string | null | undefined;
  redoLabel?: string | null | undefined;
}
```

**Step 2: Add icon button row after contextual controls**

After the break/H4H contextual row, add a new row with compact icon buttons:

```tsx
{/* Row: Action icon buttons */}
<div className="flex items-center justify-center gap-1.5 flex-wrap">
  {onUndo && (
    <button
      onClick={onUndo}
      disabled={!canUndo}
      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-[0.97] border shadow-sm ${
        canUndo
          ? 'bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600/40'
          : 'bg-gray-100 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700/30 cursor-not-allowed'
      }`}
      title={`${t('undo.undo')}${undoLabel ? ` (${undoLabel})` : ''}`}
      aria-label={t('undo.undo')}
    >
      {'\u21A9'}
    </button>
  )}
  {onRedo && (
    <button
      onClick={onRedo}
      disabled={!canRedo}
      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-[0.97] border shadow-sm ${
        canRedo
          ? 'bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600/40'
          : 'bg-gray-100 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700/30 cursor-not-allowed'
      }`}
      title={`${t('undo.redo')}${redoLabel ? ` (${redoLabel})` : ''}`}
      aria-label={t('undo.redo')}
    >
      {'\u21AA'}
    </button>
  )}
  {onLastHand && (
    <button
      onClick={onLastHand}
      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-[0.97] border shadow-sm ${
        lastHandActive
          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-600/40'
          : 'bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600/40'
      }`}
      title={t('controls.lastHand')}
      aria-label={t('controls.lastHand')}
    >
      {'\u270B'}
    </button>
  )}
  {showHandForHand && onHandForHand && !handForHandActive && (
    <button
      onClick={onHandForHand}
      className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-[0.97] border shadow-sm bg-white dark:bg-gray-800/80 hover:bg-red-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600/40"
      title={t('controls.handForHand')}
      aria-label={t('controls.handForHand')}
    >
      H4H
    </button>
  )}
  {handForHandActive && onHandForHand && (
    <button
      onClick={onHandForHand}
      className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-[0.97] border shadow-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-600/40"
      title={t('controls.handForHand')}
      aria-label={t('controls.handForHand')}
    >
      H4H {'\u2713'}
    </button>
  )}
  {onCallTheClock && callTheClockSeconds != null && (
    <button
      onClick={onCallTheClock}
      className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-[0.97] border shadow-sm bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600/40"
      title={t('controls.callTheClock')}
      aria-label={t('controls.callTheClock')}
    >
      {'\u23F1'} {callTheClockSeconds}s
    </button>
  )}
</div>
```

**Step 3: Add details toggle button (shown only when details hidden)**

After the icon button row:
```tsx
{/* Details toggle — only shown when details are hidden */}
{detailsHidden && onToggleDetails && (
  <button
    onClick={onToggleDetails}
    className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-[0.97] border shadow-sm bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600/40"
    title={t('controls.detailsShow')}
    aria-label={t('controls.detailsShow')}
  >
    {'\u2630'} {t('controls.detailsShow')}
  </button>
)}
```

**Step 4: Remove the standalone H4H button outside the break block**

Delete the block at old lines 160–168 (`{!isBreak && !handForHandActive && showHandForHand && ...}`) — H4H is now always in the icon button row.

**Step 5: Update memo comparison**

Remove: `hideSecondaryControls`, `cleanView`, `onToggleCleanView` comparisons.
Add: `detailsHidden`, `onToggleDetails` comparisons.

**Step 6: Commit**
```bash
git add src/components/Controls.tsx
git commit -m "refactor: Controls icon buttons replace popover menu"
```

---

### Task 3: Update GameModeContainer — decouple details from clean view

**Files:**
- Modify: `src/components/modes/GameModeContainer.tsx`

**Step 1: Replace clean view logic with details toggle**

The `ui.cleanView` state now only controls sidebar/RebuyStatus visibility, NOT GameInfoBar or Controls.

Change the Controls props:
```tsx
<Controls
  timerState={timer.timerState}
  onToggleStartPause={timer.toggleStartPause}
  onNext={timer.nextLevel}
  onPrevious={timer.previousLevel}
  onReset={actions.onResetLevel}
  onRestart={actions.onRestartTournament}
  isBreak={state.isBreak}
  onSkipBreak={actions.onSkipBreak}
  onExtendBreak={actions.onExtendBreak}
  detailsHidden={ui.cleanView}
  onToggleDetails={actions.onToggleCleanView}
  lastHandActive={state.lastHandActive}
  onLastHand={actions.onLastHand}
  handForHandActive={state.handForHandActive}
  onHandForHand={actions.onHandForHand}
  onNextHand={actions.onNextHand}
  showHandForHand={state.bubbleActive}
  callTheClockSeconds={settings.callTheClockSeconds}
  onCallTheClock={actions.onShowCallTheClock}
  canUndo={undo?.canUndo}
  canRedo={undo?.canRedo}
  onUndo={undo?.onUndo}
  onRedo={undo?.onRedo}
  undoLabel={undo?.undoLabel}
  redoLabel={undo?.redoLabel}
/>
```

**Step 2: Keep GameInfoBar always visible (remove cleanView guard)**

Change from:
```tsx
{!ui.cleanView && (
  <GameInfoBar ... />
)}
```
To:
```tsx
<GameInfoBar ... />
```

GameInfoBar is always shown now.

**Step 3: Hide sidebars and RebuyStatus when cleanView is true**

The left sidebar already has `{ui.showPlayerPanel && ...}` — when cleanView is toggled, the `onToggleCleanView` action in App.tsx should set `showPlayerPanel=false` and `showSidebar=false` (or we guard with cleanView).

Update sidebar visibility guards:
```tsx
{/* LEFT sidebar: hidden when details hidden */}
{!ui.cleanView && ui.showPlayerPanel && config.players.length > 0 && (
  <aside ...>
    <PlayerPanel ... />
  </aside>
)}
```

```tsx
{/* RIGHT sidebar: hidden when details hidden */}
{!ui.cleanView && ui.showSidebar && (
  <aside ...>
    ...
  </aside>
)}
```

RebuyStatus already has `{!ui.cleanView && (` guard — keep that.

**Step 4: Hide sidebar toggle arrows when details hidden**

Wrap desktop sidebar buttons with `{!ui.cleanView && (`:
```tsx
{!ui.cleanView && config.players.length > 0 && (
  <button onClick={actions.onTogglePlayerPanel} className="hidden md:flex ..." ... />
)}
{!ui.cleanView && (
  <button onClick={actions.onToggleSidebar} className="hidden md:flex ..." ... />
)}
```

Also hide mobile toggle pills:
```tsx
{!ui.cleanView && (
  <div className="flex md:hidden justify-center gap-1.5 px-3 pb-2">
    ...
  </div>
)}
```

**Step 5: Commit**
```bash
git add src/components/modes/GameModeContainer.tsx
git commit -m "refactor: decouple details toggle from sidebar visibility"
```

---

### Task 4: Add Reset/Restart to GameSettingsModal

**Files:**
- Modify: `src/components/GameSettingsModal.tsx`

**Step 1: Add onReset and onRestart props**

Add to Props interface:
```typescript
onResetLevel: () => void;
onRestartTournament: () => void;
```

**Step 2: Add buttons to footer**

Add Reset Level and Restart Tournament buttons in the footer (before "Back to Setup"):
```tsx
<div className="sticky bottom-0 px-5 py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-gray-200/60 dark:border-gray-700/30 rounded-b-2xl space-y-2">
  <button
    onClick={() => { onShowIcm(); onClose(); }}
    className="w-full px-3 py-2 bg-gray-100/80 dark:bg-gray-800/50 hover:bg-gray-200/80 dark:hover:bg-gray-700/60 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium transition-all duration-200 border border-gray-200/60 dark:border-gray-700/30 hover:border-gray-300 dark:hover:border-gray-600/40"
  >
    {t('icm.title')}
  </button>
  <div className="border-t border-gray-200/60 dark:border-gray-700/30 my-1" />
  <button
    onClick={() => { onResetLevel(); onClose(); }}
    className="w-full px-3 py-2 bg-gray-100/80 dark:bg-gray-800/50 hover:bg-gray-200/80 dark:hover:bg-gray-700/60 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium transition-all duration-200 border border-gray-200/60 dark:border-gray-700/30 hover:border-gray-300 dark:hover:border-gray-600/40"
  >
    {t('controls.levelReset')}
  </button>
  <button
    onClick={() => { onRestartTournament(); onClose(); }}
    className="w-full px-3 py-2 bg-red-50/80 dark:bg-red-900/20 hover:bg-red-100/80 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium transition-all duration-200 border border-red-200/60 dark:border-red-700/30 hover:border-red-300 dark:hover:border-red-600/40"
  >
    {t('controls.tournamentRestart')}
  </button>
  <button
    onClick={() => { onExitToSetup(); onClose(); }}
    className="w-full px-3 py-2 bg-gray-100/80 dark:bg-gray-800/50 hover:bg-gray-200/80 dark:hover:bg-gray-700/60 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium transition-all duration-200 border border-gray-200/60 dark:border-gray-700/30 hover:border-gray-300 dark:hover:border-gray-600/40"
  >
    {t('settings.backToSetup')}
  </button>
</div>
```

**Step 3: Wire new props in App.tsx**

In App.tsx where `<GameSettingsModal>` is rendered, pass the new props:
```tsx
<GameSettingsModal
  ...existing props...
  onResetLevel={resetLevel}
  onRestartTournament={handleRestart}
/>
```

Find the existing callback references — `resetLevel` is called `onResetLevel` in `GameModeActions`, passed through `GameModeContainer` → `Controls`. The same callbacks need to reach `GameSettingsModal` directly from App.tsx.

**Step 4: Commit**
```bash
git add src/components/GameSettingsModal.tsx src/App.tsx
git commit -m "feat: add Reset Level and Restart to Settings modal"
```

---

### Task 5: Update tests

**Files:**
- Modify: `tests/controls.test.tsx`
- Modify: `tests/components.test.tsx` (if BubbleIndicator/clean view tests exist)

**Step 1: Update controls.test.tsx**

Major changes:
1. Remove all `openMoreMenu()` calls and the helper function
2. Last Hand, Call the Clock are now direct buttons with `aria-label` / `title`
3. Reset Level / Restart are no longer in Controls — remove those tests
4. Clean View tests → Details toggle tests
5. Add tests for icon buttons (Undo, Redo, Last Hand, H4H, CtC)

Replace the entire test file with updated tests reflecting the new layout:
- Core buttons (Start/Pause/Next/Prev) — keep as-is
- Icon buttons: test Undo/Redo render + disabled state, Last Hand toggle, H4H, CtC
- Details toggle: test `detailsHidden` shows the ☰ button, clicking calls `onToggleDetails`
- Break controls — keep as-is
- Remove: Reset/Restart tests (moved to settings), popover tests, clean view tests

**Step 2: Update mock translations**

Add to the translation mock:
```typescript
'controls.detailsShow': 'Show details',
'controls.detailsHide': 'Hide details',
```

Remove: `'controls.moreActions'`

**Step 3: Run tests**

```bash
npm run test
```

Expected: All tests pass.

**Step 4: Commit**
```bash
git add tests/controls.test.tsx tests/components.test.tsx
git commit -m "test: update controls tests for icon button layout"
```

---

### Task 6: Update docs (CHANGELOG, CLAUDE.md, README)

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `CLAUDE.md`
- Modify: `README.md`
- Modify: `package.json`

**Step 1: Bump version to 6.12.1**

In `package.json`: `"version": "6.12.1"`

**Step 2: Add CHANGELOG entry**

Add `### v6.12.1 — Game Mode Controls Redesign` entry:
- ··· Popover entfernt → direkte Icon-Buttons für Undo/Redo, Last Hand, H4H, Call the Clock
- "Details ausblenden" verbirgt nur Sidebars + RebuyStatus, nicht Controls/GameInfoBar
- Reset Level + Restart Tournament ins ⚙️ Settings-Modal verschoben
- Zentraler ☰-Button zum Wiedereinblenden der Details
- Test-Count aktualisieren

**Step 3: Update CLAUDE.md**

- Version: 6.12.1
- Changelog section: add v6.12.1 entry
- Update test count

**Step 4: Update README.md**

- Version badge: 6.12.1
- Test count badge: updated number

**Step 5: Commit**
```bash
git add CHANGELOG.md CLAUDE.md README.md package.json package-lock.json
git commit -m "docs: Game Mode Controls Redesign v6.12.1"
```
