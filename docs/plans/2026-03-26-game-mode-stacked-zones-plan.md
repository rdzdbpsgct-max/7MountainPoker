# Game Mode Stacked Zones — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 3-panel game mode layout (PlayerPanel left, Timer center, Sidebar right) with a single-column stacked zones layout: Status Bar (sticky) → Timer (sticky) → Scrollable Action Area (player list + accordion quick-info cards).

**Architecture:** 5 new components (GameStatusBar, GameTimerZone, GamePlayerList, GameQuickInfo, GameLayout) replace the 3-panel toggle logic in GameModeContainer. PlayerPanel content is refactored into a row-based list with inline bounty elimination. Sidebar content (LevelPreview, ChipSidebar, MultiTablePanel) moves into accordion cards. SettingsPanel renders as a modal. Clean View is removed (the new layout is inherently clean).

**Tech Stack:** React 19, TypeScript 5.9 strict, Tailwind CSS 4, existing CollapsibleSection component for accordion behavior.

---

## Context for All Tasks

**Design doc:** `docs/plans/2026-03-26-game-mode-stacked-zones-design.md`

**Current layout (GameModeContainer.tsx, 334 lines):**
- Left sidebar: `<PlayerPanel>` (578 lines, 31 props) — prizepool, payout, active players, bounty dialog, eliminated players, lazy modals
- Center: `<TimerDisplay>` + `<BubbleIndicator>` + `<RebuyStatus>` + `<Controls>` — all existing components unchanged
- Right sidebar: `<LevelPreview>` + `<ChipSidebar>` + `<MultiTablePanel>` + `<SettingsPanel>` + ICM button + Exit button
- Desktop: absolute-positioned sidebars with chevron toggle buttons
- Mobile: toggle buttons at bottom to show/hide panels

**New layout (3 stacked zones):**
- Zone 1 (sticky, ~48px): Status bar with compact stats + icon buttons
- Zone 2 (sticky, ~40-45vh): Timer + Controls + Banners (unchanged components)
- Zone 3 (scrollable, remaining height): Player list (main area) + accordion quick-info cards

**Grouped Props interfaces** (already exist in GameModeContainer.tsx):
- `GameModeState` (13 fields), `GameModeUiState` (7 fields), `GameModeActions` (29 callbacks), `GameModeUndoState` (6 fields)

**Key conventions:**
- All imports from `'../domain/logic'` (barrel)
- All UI text via `t('key')` from `useTranslation()`
- Accent colors via `var(--accent-500)` CSS custom properties
- Dark mode via `dark:` Tailwind variants
- `memo()` on heavy components
- Lazy-load modals via `React.lazy()`

---

### Task 1: Translation Keys

**Files:**
- Modify: `src/i18n/translations.ts`
- Modify: `tests/i18n.test.ts`

**Step 1: Add new translation keys**

Add to both DE and EN sections in `translations.ts`. These keys support the new status bar icon buttons and zone labels:

```typescript
// DE section — add after existing game.* keys:
'game.statusBar.settings': 'Einstellungen',
'game.statusBar.tv': 'TV-Modus',
'game.statusBar.log': 'Protokoll',
'game.statusBar.tools': 'Werkzeuge',
'game.statusBar.help': 'Hilfe',
'game.statusBar.icm': 'ICM',
'game.statusBar.exit': 'Beenden',
'game.playerList.title': 'Aktive Spieler',
'game.playerList.eliminated': 'Ausgeschieden',
'game.playerList.dealerToggle': 'Dealer anzeigen',
'game.quickInfo.nextLevel': 'Nächstes Level',
'game.quickInfo.blindSchedule': 'Blind-Struktur',
'game.quickInfo.prizepool': 'Prizepool & Auszahlung',
'game.quickInfo.chips': 'Chips & Color-Up',
'game.quickInfo.multiTable': 'Multi-Table',

// EN section — same keys:
'game.statusBar.settings': 'Settings',
'game.statusBar.tv': 'TV Mode',
'game.statusBar.log': 'Log',
'game.statusBar.tools': 'Tools',
'game.statusBar.help': 'Help',
'game.statusBar.icm': 'ICM',
'game.statusBar.exit': 'Exit',
'game.playerList.title': 'Active Players',
'game.playerList.eliminated': 'Eliminated',
'game.playerList.dealerToggle': 'Show Dealer',
'game.quickInfo.nextLevel': 'Next Level',
'game.quickInfo.blindSchedule': 'Blind Schedule',
'game.quickInfo.prizepool': 'Prizepool & Payout',
'game.quickInfo.chips': 'Chips & Color-Up',
'game.quickInfo.multiTable': 'Multi-Table',
```

**Step 2: Update i18n test threshold**

In `tests/i18n.test.ts`, find the identical-key threshold check and bump it to accommodate new identical keys (e.g. "ICM", "Multi-Table").

**Step 3: Run tests**

Run: `npm run test -- tests/i18n.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/i18n/translations.ts tests/i18n.test.ts
git commit -m "feat(i18n): add translation keys for game mode stacked zones"
```

---

### Task 2: GameStatusBar Component (Zone 1)

**Files:**
- Create: `src/components/GameStatusBar.tsx`
- Test: `tests/components.test.tsx` (append)

**Step 1: Write the failing test**

Append to `tests/components.test.tsx`:

```typescript
describe('GameStatusBar', () => {
  // Dynamically import to test
  const { GameStatusBar } = await import('../src/components/GameStatusBar');

  const baseProps = {
    players: [
      { id: '1', name: 'Alice', status: 'active' as const, rebuys: 0, addOn: false, knockouts: 0 },
      { id: '2', name: 'Bob', status: 'active' as const, rebuys: 0, addOn: false, knockouts: 0 },
      { id: '3', name: 'Charlie', status: 'eliminated' as const, rebuys: 0, addOn: false, knockouts: 0, placement: 3 },
    ],
    prizePool: 300,
    currency: 'EUR' as const,
    elapsedSeconds: 2700,
    averageStack: 15000,
    currentBB: 200,
    onShowSettings: vi.fn(),
    onShowTV: vi.fn(),
    onShowLog: vi.fn(),
    onShowHelp: vi.fn(),
    onShowIcm: vi.fn(),
    onExitToSetup: vi.fn(),
  };

  it('renders player count and prizepool', () => {
    render(<GameStatusBar {...baseProps} />);
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText(/300/)).toBeInTheDocument();
  });

  it('renders icon buttons with aria-labels', () => {
    render(<GameStatusBar {...baseProps} />);
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tv/i })).toBeInTheDocument();
  });

  it('calls onShowSettings when settings button clicked', () => {
    render(<GameStatusBar {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect(baseProps.onShowSettings).toHaveBeenCalledOnce();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/components.test.tsx -t "GameStatusBar"`
Expected: FAIL — module not found

**Step 3: Write the component**

Create `src/components/GameStatusBar.tsx` (~100 lines):

```typescript
import { memo } from 'react';
import type { Player, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { formatElapsedTime, computeAverageStackInBB } from '../domain/logic';
import { useTranslation } from '../i18n';

interface Props {
  players: Player[];
  prizePool: number;
  rebuyPot?: number | undefined;
  currency?: Currency | undefined;
  elapsedSeconds: number;
  averageStack: number;
  currentBB: number;
  onShowSettings: () => void;
  onShowTV: () => void;
  onShowLog: () => void;
  onShowHelp: () => void;
  onShowIcm: () => void;
  onExitToSetup: () => void;
}

export const GameStatusBar = memo(function GameStatusBar({
  players, prizePool, rebuyPot, currency, elapsedSeconds,
  averageStack, currentBB, onShowSettings, onShowTV, onShowLog,
  onShowHelp, onShowIcm, onExitToSetup,
}: Props) {
  const { t } = useTranslation();
  const sym = CURRENCY_SYMBOLS[currency ?? 'EUR'];
  const activePlayers = players.filter(p => p.status === 'active').length;
  const totalPlayers = players.length;
  const avgBB = computeAverageStackInBB(averageStack, currentBB);

  return (
    <div
      className="sticky top-0 z-20 flex items-center gap-2 sm:gap-3 px-3 py-2 bg-gray-100/80 dark:bg-gray-800/40 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700/30"
      role="banner"
    >
      {/* Stats */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 overflow-x-auto text-xs">
        <StatChip label={t('stats.players')} value={`${activePlayers}/${totalPlayers}`} />
        <StatChip label={t('stats.prizePool')} value={`${prizePool} ${sym}`} />
        {rebuyPot != null && rebuyPot > 0 && (
          <StatChip label={t('rebuy.separatePotLabel')} value={`${rebuyPot} ${sym}`} />
        )}
        {currentBB > 0 && (
          <StatChip
            label={t('stats.avgStackBB')}
            value={`${avgBB} BB`}
            warn={avgBB <= 15}
          />
        )}
        <StatChip label={t('stats.elapsed')} value={formatElapsedTime(elapsedSeconds)} className="hidden sm:flex" />
      </div>

      {/* Icon buttons */}
      <div className="flex items-center gap-1">
        <IconButton label={t('game.statusBar.settings')} onClick={onShowSettings}>
          {/* Gear SVG */}
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </IconButton>
        <IconButton label={t('game.statusBar.tv')} onClick={onShowTV}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
          </svg>
        </IconButton>
        <IconButton label={t('game.statusBar.log')} onClick={onShowLog}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
        </IconButton>
        <IconButton label={t('game.statusBar.help')} onClick={onShowHelp}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>
        </IconButton>
        <IconButton label={t('game.statusBar.exit')} onClick={onExitToSetup}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
        </IconButton>
      </div>
    </div>
  );
});

function StatChip({ label, value, warn, className }: { label: string; value: string; warn?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-1 shrink-0 ${className ?? ''}`}>
      <span className="text-gray-500 dark:text-gray-500">{label}:</span>
      <span className={`font-medium font-mono ${warn ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-200'}`}>
        {value}
      </span>
      {warn && <span className="text-amber-500">⚠</span>}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--accent-500)] hover:bg-gray-200/50 dark:hover:bg-gray-700/30 transition-colors"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/components.test.tsx -t "GameStatusBar"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/GameStatusBar.tsx tests/components.test.tsx
git commit -m "feat: add GameStatusBar component (Zone 1 — compact stats + icon buttons)"
```

---

### Task 3: GameTimerZone Component (Zone 2)

**Files:**
- Create: `src/components/GameTimerZone.tsx`

**Step 1: Write the component**

This is a thin wrapper around existing components (TimerDisplay, Controls, BubbleIndicator, RebuyStatus). No new logic — just layout. No dedicated test needed beyond integration test in Task 7.

Create `src/components/GameTimerZone.tsx` (~80 lines):

```typescript
import { lazy, memo, Suspense } from 'react';
import type { TournamentConfig, Settings, ChipDenomination, TableMove } from '../domain/types';
import type { useTimer } from '../hooks/useTimer';
import type { GameModeState, GameModeUndoState, GameModeActions } from './modes/GameModeContainer';
import { LoadingFallback } from './LoadingFallback';

const TimerDisplay = lazy(() => import('./TimerDisplay').then(m => ({ default: m.TimerDisplay })));
const Controls = lazy(() => import('./Controls').then(m => ({ default: m.Controls })));
const BubbleIndicator = lazy(() => import('./BubbleIndicator').then(m => ({ default: m.BubbleIndicator })));
const RebuyStatus = lazy(() => import('./RebuyStatus').then(m => ({ default: m.RebuyStatus })));

type TimerController = ReturnType<typeof useTimer>;

interface Props {
  config: TournamentConfig;
  settings: Settings;
  timer: TimerController;
  state: GameModeState;
  actions: GameModeActions;
  undo?: GameModeUndoState | undefined;
}

export const GameTimerZone = memo(function GameTimerZone({
  config, settings, timer, state, actions, undo,
}: Props) {
  return (
    <div className="sticky top-[48px] z-10 flex flex-col items-center justify-center p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700/30"
      style={{ minHeight: '35vh' }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <TimerDisplay
          timerState={timer.timerState}
          levels={config.levels}
          largeDisplay={settings.largeDisplay}
          countdownEnabled={settings.countdownEnabled}
          onScrub={timer.setRemainingSeconds}
          onScrubEnd={timer.start}
          chipConfig={config.chips}
          cleanView={false}
          colorUpMap={state.colorUpMap}
          anteMode={config.anteMode}
        />
        <BubbleIndicator
          isBubble={state.bubbleActive}
          showItmFlash={state.showItmFlash}
          addOnWindowOpen={state.addOnWindowOpen}
          addOnCost={config.addOn.cost}
          addOnChips={config.addOn.chips}
          lastHandActive={state.lastHandActive}
          handForHandActive={state.handForHandActive}
        />
        <RebuyStatus
          active={state.rebuyActive}
          rebuy={config.rebuy}
          currentPlayLevel={state.currentPlayLevel}
          elapsedSeconds={state.tournamentElapsed}
        />
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
          hideSecondaryControls={false}
          cleanView={false}
          onToggleCleanView={actions.onToggleCleanView}
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
      </Suspense>
    </div>
  );
});
```

**Step 2: Verify build**

Run: `npm run build`
Expected: SUCCESS (no type errors)

**Step 3: Commit**

```bash
git add src/components/GameTimerZone.tsx
git commit -m "feat: add GameTimerZone component (Zone 2 — timer + controls wrapper)"
```

---

### Task 4: GamePlayerList Component (Zone 3 — Main Area)

**Files:**
- Create: `src/components/GamePlayerList.tsx`
- Test: `tests/components.test.tsx` (append)

This is the most important component — refactored from PlayerPanel.tsx. Key differences from PlayerPanel:
- Row-based layout instead of card grid
- Inline bounty elimination (expanding row with player buttons instead of select dropdown)
- No prizepool/payout sections (moved to GameQuickInfo)
- No average stack display (moved to GameStatusBar)
- Keeps: player search, active players, eliminate/rebuy/add-on buttons, eliminated players, lazy modals (SidePotCalculator, DealMaker)

**Step 1: Write the failing test**

Append to `tests/components.test.tsx`:

```typescript
describe('GamePlayerList', () => {
  const { GamePlayerList } = await import('../src/components/GamePlayerList');

  const activePlayers = [
    { id: '1', name: 'Alice', status: 'active' as const, rebuys: 1, addOn: false, knockouts: 0, chips: 15000 },
    { id: '2', name: 'Bob', status: 'active' as const, rebuys: 0, addOn: false, knockouts: 0, chips: 20000 },
  ];
  const eliminatedPlayer = { id: '3', name: 'Charlie', status: 'eliminated' as const, rebuys: 0, addOn: false, knockouts: 0, placement: 3 };

  const baseProps = {
    players: [...activePlayers, eliminatedPlayer],
    dealerIndex: 0,
    rebuyActive: false,
    rebuyConfig: { enabled: false, rebuyCost: 10, rebuyChips: 1000, maxRebuys: 3, maxRebuysPerPlayer: 3, rebuyLevels: 3, separatePot: false },
    addOnConfig: { enabled: false, cost: 10, chips: 1000 },
    addOnWindowOpen: false,
    bountyConfig: { enabled: false, amount: 5, type: 'fixed' as const },
    onUpdateRebuys: vi.fn(),
    onUpdateAddOn: vi.fn(),
    onEliminatePlayer: vi.fn(),
    onReinstatePlayer: vi.fn(),
    onAdvanceDealer: vi.fn(),
    showDealerBadges: true,
    onToggleDealerBadges: vi.fn(),
  };

  it('renders active player rows', () => {
    render(<GamePlayerList {...baseProps} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders eliminated players with placement', () => {
    render(<GamePlayerList {...baseProps} />);
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('3.')).toBeInTheDocument();
  });

  it('shows inline bounty picker when eliminating with bounty', () => {
    const bountyProps = { ...baseProps, bountyConfig: { enabled: true, amount: 5, type: 'fixed' as const } };
    render(<GamePlayerList {...bountyProps} />);
    // Click eliminate on Alice
    const eliminateButtons = screen.getAllByTitle(/eliminat/i);
    fireEvent.click(eliminateButtons[0]!);
    // Should show inline picker asking who eliminated Alice
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    // Should show Bob as a clickable button (inline, not dropdown)
    expect(screen.getByRole('button', { name: 'Bob' })).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/components.test.tsx -t "GamePlayerList"`
Expected: FAIL

**Step 3: Write the component**

Create `src/components/GamePlayerList.tsx` (~350 lines). This component extracts the player management from PlayerPanel with a **row-based layout** and **inline bounty elimination** (button grid instead of select dropdown):

The component should:
1. **Props**: Same player-management props as PlayerPanel minus prizepool/payout/averageStack (those go to StatusBar/QuickInfo)
2. **Active Players**: Row-based layout with `[Dealer Badge] Name [Rebuy Badge] [Chips] [Rebuy ±] [Add-On] [Eliminate]`
3. **Inline Bounty Elimination**: When eliminate is clicked with bounty enabled, the row expands with a grid of player-name buttons (not a dropdown) and a cancel button
4. **Eliminated Players**: Compact rows with placement, opacity-50, reinstate button
5. **Player Search**: Filter field when 10+ players (same as current)
6. **Lazy Modals**: SidePotCalculator and DealMaker (same as current)

Key implementation details:
- Use `memo()` on the component
- Player rows: `hover:bg-gray-200/50 dark:hover:bg-gray-700/30`, `border-b border-gray-200 dark:border-gray-700/20`, `py-2 px-3`
- Dealer row: accent background with 10% opacity
- Inline bounty: animated expand with player-name buttons in flex-wrap
- Mobile: Name + badges in row 1, chips + buttons in row 2 (use `flex-wrap`)

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/components.test.tsx -t "GamePlayerList"`
Expected: PASS

**Step 5: Run full test suite**

Run: `npm run test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/components/GamePlayerList.tsx tests/components.test.tsx
git commit -m "feat: add GamePlayerList component (Zone 3 — row-based players with inline elimination)"
```

---

### Task 5: GameQuickInfo Component (Zone 3 — Accordion Cards)

**Files:**
- Create: `src/components/GameQuickInfo.tsx`

**Step 1: Write the component**

This component wraps secondary info (LevelPreview, Prizepool/Payout, ChipSidebar, MultiTablePanel) in CollapsibleSection accordion cards below the player list. "Next Level" is always expanded, others collapsed with summary text.

Create `src/components/GameQuickInfo.tsx` (~200 lines):

```typescript
import { lazy, memo, Suspense, useMemo } from 'react';
import type { TournamentConfig, Settings, ChipDenomination, TableMove, Table } from '../domain/types';
import type { useTimer } from '../hooks/useTimer';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { computePrizePool, computePayouts, computeTotalRebuys, computeTotalAddOns, computeRebuyPot, getLevelLabel, getBlindsText } from '../domain/logic';
import { useTranslation } from '../i18n';
import { CollapsibleSection } from './CollapsibleSection';
import { LoadingFallback } from './LoadingFallback';

const LevelPreview = lazy(() => import('./LevelPreview').then(m => ({ default: m.LevelPreview })));
const ChipSidebar = lazy(() => import('./ChipSidebar').then(m => ({ default: m.ChipSidebar })));
const MultiTablePanel = lazy(() => import('./MultiTablePanel').then(m => ({ default: m.MultiTablePanel })));

type TimerController = ReturnType<typeof useTimer>;

interface Props {
  config: TournamentConfig;
  timer: TimerController;
  colorUpMap: Map<number, ChipDenomination[]>;
  recentTableMoves: TableMove[];
  canUseMultiTable?: boolean | undefined;
  onUpdateTables: (tables: Table[]) => void;
  onTableMoves: (moves: TableMove[]) => void;
  onAdvanceTableDealer: (tableId: string) => void;
}

export const GameQuickInfo = memo(function GameQuickInfo({
  config, timer, colorUpMap, recentTableMoves,
  canUseMultiTable, onUpdateTables, onTableMoves, onAdvanceTableDealer,
}: Props) {
  const { t } = useTranslation();
  const sym = CURRENCY_SYMBOLS[config.currency ?? 'EUR'];

  // Next level info for summary
  const nextIdx = timer.timerState.currentLevelIndex + 1;
  const nextLevel = config.levels[nextIdx];
  const nextLevelSummary = nextLevel
    ? `${getLevelLabel(nextLevel, nextIdx)} · ${getBlindsText(nextLevel)}`
    : '—';

  // Prizepool computation
  const prizePool = useMemo(() =>
    computePrizePool(config.players, config.buyIn, config.rebuy.rebuyCost,
      config.addOn.enabled ? config.addOn.cost : 0, config.rebuy.separatePot),
    [config.players, config.buyIn, config.rebuy.rebuyCost, config.addOn.enabled, config.addOn.cost, config.rebuy.separatePot]);
  const payoutAmounts = useMemo(() => computePayouts(config.payout, prizePool), [config.payout, prizePool]);
  const payoutSummary = `${prizePool.toFixed(0)} ${sym}, ${payoutAmounts.length} ${t('playerPanel.place')}`;

  // Blind schedule summary
  const totalLevels = config.levels.filter(l => l.type === 'level').length;
  const totalBreaks = config.levels.filter(l => l.type === 'break').length;
  const blindSummary = `${totalLevels} Lvl, ${totalBreaks} ${t('setup.break')}`;

  // Chip summary
  const chipCount = config.chips.denominations.length;
  const chipSummary = config.chips.enabled ? `${chipCount} Chips` : '';

  // Multi-table summary
  const activeTables = config.tables?.filter(tbl => tbl.status === 'active').length ?? 0;
  const multiTableSummary = activeTables > 0 ? `${activeTables} ${t('multiTable.tables')}` : '';

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {/* Next Level — always open */}
      <CollapsibleSection
        title={t('game.quickInfo.nextLevel')}
        summary={nextLevelSummary}
        defaultOpen
      >
        <Suspense fallback={<LoadingFallback />}>
          <LevelPreview timerState={timer.timerState} levels={config.levels} />
        </Suspense>
      </CollapsibleSection>

      {/* Blind Schedule */}
      <CollapsibleSection
        title={t('game.quickInfo.blindSchedule')}
        summary={blindSummary}
      >
        <Suspense fallback={<LoadingFallback />}>
          <LevelPreview timerState={timer.timerState} levels={config.levels} />
        </Suspense>
      </CollapsibleSection>

      {/* Prizepool & Payout */}
      <CollapsibleSection
        title={t('game.quickInfo.prizepool')}
        summary={payoutSummary}
      >
        <div className="space-y-2">
          <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-500) 10%, transparent)' }}>
            <p className="text-lg font-bold" style={{ color: 'var(--accent-text)' }}>
              {prizePool.toFixed(2)} {sym}
            </p>
          </div>
          <div className="space-y-1">
            {payoutAmounts.map(p => (
              <div key={p.place} className="flex justify-between px-3 py-1 bg-gray-100 dark:bg-gray-800/50 rounded-lg text-sm">
                <span className="text-gray-500 dark:text-gray-400">{p.place}. {t('playerPanel.place')}</span>
                <span className="text-gray-900 dark:text-white font-medium">{p.amount.toFixed(2)} {sym}</span>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* Chips & Color-Up */}
      {config.chips.enabled && (
        <CollapsibleSection
          title={t('game.quickInfo.chips')}
          summary={chipSummary}
        >
          <Suspense fallback={<LoadingFallback />}>
            <ChipSidebar
              chipConfig={config.chips}
              colorUpMap={colorUpMap}
              currentLevelIndex={timer.timerState.currentLevelIndex}
              levels={config.levels}
            />
          </Suspense>
        </CollapsibleSection>
      )}

      {/* Multi-Table */}
      {config.tables && config.tables.length > 0 && canUseMultiTable !== false && (
        <CollapsibleSection
          title={t('game.quickInfo.multiTable')}
          summary={multiTableSummary}
        >
          <Suspense fallback={<LoadingFallback />}>
            <MultiTablePanel
              config={config}
              recentMoves={recentTableMoves}
              onUpdateTables={onUpdateTables}
              onTableMoves={onTableMoves}
              onAdvanceTableDealer={onAdvanceTableDealer}
            />
          </Suspense>
        </CollapsibleSection>
      )}
    </div>
  );
});
```

**Step 2: Verify build**

Run: `npm run build`
Expected: SUCCESS

**Step 3: Commit**

```bash
git add src/components/GameQuickInfo.tsx
git commit -m "feat: add GameQuickInfo component (Zone 3 — accordion cards for schedule, payout, chips)"
```

---

### Task 6: GameLayout Component (3-Zone Orchestrator)

**Files:**
- Create: `src/components/GameLayout.tsx`

**Step 1: Write the component**

This is the main layout orchestrator that arranges the 3 zones. It receives all necessary props and passes them to the zone components.

Create `src/components/GameLayout.tsx` (~120 lines):

```typescript
import { lazy, memo, Suspense, useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Settings, TournamentConfig, ChipDenomination, Table, TableMove } from '../domain/types';
import type { useTimer } from '../hooks/useTimer';
import type { GameModeState, GameModeUiState, GameModeActions, GameModeUndoState } from './modes/GameModeContainer';
import type { AppFeature } from '../domain/entitlements';
import { computePrizePool, computeRebuyPot, computeAverageStackInBB, advanceTableDealer } from '../domain/logic';
import { SectionErrorBoundary } from './ErrorBoundary';
import { LoadingFallback } from './LoadingFallback';
import { GameStatusBar } from './GameStatusBar';
import { GameTimerZone } from './GameTimerZone';

const GamePlayerList = lazy(() => import('./GamePlayerList').then(m => ({ default: m.GamePlayerList })));
const GameQuickInfo = lazy(() => import('./GameQuickInfo').then(m => ({ default: m.GameQuickInfo })));

type TimerController = ReturnType<typeof useTimer>;

interface Props {
  config: TournamentConfig;
  settings: Settings;
  timer: TimerController;
  state: GameModeState;
  ui: GameModeUiState;
  actions: GameModeActions;
  undo?: GameModeUndoState | undefined;
  canUseSidePot?: boolean | undefined;
  canUseMultiTable?: boolean | undefined;
  onOpenFeatureGate?: ((feature: AppFeature) => void) | undefined;
  // Status bar action callbacks (from App.tsx modals)
  onShowSettings: () => void;
  onShowTV: () => void;
  onShowLog: () => void;
  onShowHelp: () => void;
}

export const GameLayout = memo(function GameLayout({
  config, settings, timer, state, ui, actions, undo,
  canUseSidePot, canUseMultiTable, onOpenFeatureGate,
  onShowSettings, onShowTV, onShowLog, onShowHelp,
}: Props) {
  const { onUpdateTables } = actions;

  // Compute values for status bar
  const prizePool = useMemo(() =>
    computePrizePool(config.players, config.buyIn, config.rebuy.rebuyCost,
      config.addOn.enabled ? config.addOn.cost : 0, config.rebuy.separatePot),
    [config.players, config.buyIn, config.rebuy.rebuyCost, config.addOn.enabled, config.addOn.cost, config.rebuy.separatePot]);
  const rebuyPot = useMemo(() => computeRebuyPot(config.players, config.rebuy.rebuyCost), [config.players, config.rebuy.rebuyCost]);
  const currentLevel = config.levels[timer.timerState.currentLevelIndex];
  const currentBB = currentLevel?.type === 'level' ? (currentLevel.bigBlind ?? 0) : 0;

  const handleAdvanceTableDealer = useCallback((tableId: string) => {
    const tables = config.tables ?? [];
    const table = tables.find(tbl => tbl.id === tableId);
    if (!table) return;
    const updated = advanceTableDealer(table, config.players);
    onUpdateTables(tables.map(tbl => tbl.id === tableId ? updated : tbl));
  }, [config.tables, config.players, onUpdateTables]);

  return (
    <SectionErrorBoundary>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Zone 1 — Status Bar (sticky) */}
        <GameStatusBar
          players={config.players}
          prizePool={prizePool}
          rebuyPot={config.rebuy.separatePot ? rebuyPot : undefined}
          currency={config.currency}
          elapsedSeconds={state.tournamentElapsed}
          averageStack={state.averageStack}
          currentBB={currentBB}
          onShowSettings={onShowSettings}
          onShowTV={onShowTV}
          onShowLog={onShowLog}
          onShowHelp={onShowHelp}
          onShowIcm={actions.onShowIcm}
          onExitToSetup={actions.onExitToSetup}
        />

        {/* Zone 2 — Timer + Controls (sticky) */}
        <GameTimerZone
          config={config}
          settings={settings}
          timer={timer}
          state={state}
          actions={actions}
          undo={undo}
        />

        {/* Zone 3 — Scrollable Action Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <Suspense fallback={<LoadingFallback />}>
            {/* Player List (main area) */}
            {config.players.length > 0 && (
              <GamePlayerList
                players={config.players}
                dealerIndex={config.dealerIndex}
                rebuyActive={state.rebuyActive}
                rebuyConfig={config.rebuy}
                addOnConfig={config.addOn}
                addOnWindowOpen={state.addOnWindowOpen}
                bountyConfig={config.bounty}
                averageStack={state.averageStack}
                onUpdateRebuys={actions.onUpdatePlayerRebuys}
                onUpdateAddOn={actions.onUpdatePlayerAddOn}
                onEliminatePlayer={actions.onEliminatePlayer}
                onReinstatePlayer={actions.onReinstatePlayer}
                onAdvanceDealer={actions.onAdvanceDealer}
                showDealerBadges={ui.showDealerBadges}
                onToggleDealerBadges={actions.onToggleDealerBadges}
                onUpdateStack={actions.onUpdatePlayerStack}
                onInitStacks={actions.onInitStacks}
                onClearStacks={actions.onClearStacks}
                lateRegOpen={state.lateRegOpen}
                onAddLatePlayer={actions.onAddLatePlayer}
                onReEntryPlayer={actions.onReEntryPlayer}
                tables={config.tables}
                onSidePotResultChange={actions.onSidePotResultChange}
                onShowPayoutOverlay={actions.onShowPayoutOverlay}
                currency={config.currency}
                canUseSidePot={canUseSidePot}
                onOpenFeatureGate={onOpenFeatureGate}
                onAcceptDeal={actions.onAcceptDeal}
              />
            )}

            {/* Quick Info Accordion Cards */}
            <div className="mt-4">
              <GameQuickInfo
                config={config}
                timer={timer}
                colorUpMap={state.colorUpMap}
                recentTableMoves={state.recentTableMoves}
                canUseMultiTable={canUseMultiTable}
                onUpdateTables={actions.onUpdateTables}
                onTableMoves={actions.onTableMoves}
                onAdvanceTableDealer={handleAdvanceTableDealer}
              />
            </div>
          </Suspense>
        </div>
      </div>
    </SectionErrorBoundary>
  );
});
```

**Step 2: Verify build**

Run: `npm run build`
Expected: SUCCESS

**Step 3: Commit**

```bash
git add src/components/GameLayout.tsx
git commit -m "feat: add GameLayout component (3-zone orchestrator for stacked zones)"
```

---

### Task 7: Refactor GameModeContainer to Use GameLayout

**Files:**
- Modify: `src/components/modes/GameModeContainer.tsx`
- Modify: `src/App.tsx` (add onShowSettings/TV/Log/Help props)

**Step 1: Modify GameModeContainer**

Replace the entire 3-panel layout in GameModeContainer with the new GameLayout component. The old code (left sidebar PlayerPanel, center timer, right sidebar with LevelPreview/ChipSidebar/SettingsPanel, toggle buttons, mobile bar) gets replaced by a single `<GameLayout>` call.

GameModeContainer needs new props for the status bar icon-button callbacks (onShowSettings, onShowTV, onShowLog, onShowHelp) that are wired up in App.tsx.

**Key changes:**
1. Remove all lazy imports for individual components (TimerDisplay, Controls, LevelPreview, PlayerPanel, ChipSidebar, RebuyStatus, BubbleIndicator, SettingsPanel, MultiTablePanel) — these are now imported inside GameLayout/GameTimerZone/GameQuickInfo/GamePlayerList
2. Remove the `handleAdvanceTableDealer` callback (moved to GameLayout)
3. Remove the entire JSX body and replace with `<GameLayout ... />`
4. Add new Props fields: `onShowSettings`, `onShowTV`, `onShowLog`, `onShowHelp`
5. Remove `ui.showPlayerPanel`, `ui.showSidebar`, `actions.onTogglePlayerPanel`, `actions.onToggleSidebar` from the interface (no longer needed — no panel toggles)

**Step 2: Update App.tsx**

In App.tsx, pass the status bar callbacks (existing modal toggles) through to GameModeContainer:
- `onShowSettings` → opens SettingsPanel as modal (new state)
- `onShowTV` → existing display mode toggle
- `onShowLog` → existing tournament log toggle
- `onShowHelp` → existing help center toggle

**Step 3: Verify build + tests**

Run: `npm run build && npm run test`
Expected: All pass

**Step 4: Commit**

```bash
git add src/components/modes/GameModeContainer.tsx src/App.tsx
git commit -m "refactor: replace 3-panel game layout with stacked zones via GameLayout"
```

---

### Task 8: SettingsPanel as Modal + Remove Clean View

**Files:**
- Modify: `src/App.tsx` — add `showSettingsModal` state, render SettingsPanel in modal overlay
- Modify: `src/components/modes/GameModeContainer.tsx` — remove cleanView from GameModeUiState
- Modify: `src/hooks/useKeyboardShortcuts.ts` — remove F shortcut for clean view
- Modify: `src/components/Controls.tsx` — remove cleanView toggle button and `hideSecondaryControls` logic
- Modify: `src/i18n/translations.ts` — remove `game.cleanViewOn`, `game.cleanViewOff` keys (keep for backward compat or delete)

**Step 1: Add SettingsPanel modal in App.tsx**

```typescript
const [showSettingsModal, setShowSettingsModal] = useState(false);
```

Render SettingsPanel in a modal overlay (similar to how HelpCenter renders):

```tsx
{showSettingsModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)}>
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
      <SettingsPanel ... />
      <button onClick={() => setShowSettingsModal(false)} className="...">
        {t('app.close')}
      </button>
    </div>
  </div>
)}
```

**Step 2: Remove Clean View**

1. In `useKeyboardShortcuts.ts`: Remove the `KeyF` case that calls `onToggleCleanView()`
2. In `Controls.tsx`: Remove the clean view toggle button. Remove `hideSecondaryControls` conditional logic — always show all controls
3. In `GameModeUiState`: Remove `cleanView` field (it's no longer used since GameTimerZone always passes `cleanView={false}`)
4. In App.tsx: Remove cleanView state from `useModalManager` or wherever it's defined

**Step 3: Remove old panel toggle code**

1. Remove `showPlayerPanel`, `showSidebar` from `GameModeUiState`
2. Remove `onTogglePlayerPanel`, `onToggleSidebar` from `GameModeActions`
3. Remove corresponding state in App.tsx
4. Remove translation keys: `app.hidePlayers`, `app.showPlayers`, `app.hideSidebar`, `app.showSidebar`, `app.players`, `app.sidebar`

**Step 4: Run tests**

Run: `npm run test`
Expected: All pass. Fix any tests that reference cleanView or panel toggles.

**Step 5: Run build**

Run: `npm run build`
Expected: SUCCESS

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: render SettingsPanel as modal, remove Clean View and panel toggles"
```

---

### Task 9: Remove TournamentStats from Center + Cleanup

**Files:**
- Modify: `src/App.tsx` — remove TournamentStats rendering in game mode (its data is now in GameStatusBar)
- Delete or deprecate: `src/components/TournamentStats.tsx` — no longer rendered in game mode (keep if used in DisplayMode or TV mode, otherwise remove)
- Verify: DisplayMode.tsx does NOT use TournamentStats directly (it has its own StatsScreen)

**Step 1: Check TournamentStats usage**

Search for imports of TournamentStats. If only used in GameModeContainer (now removed), the component can be deleted. If used elsewhere, keep it.

**Step 2: Clean up unused imports in App.tsx**

Remove any imports/state/props related to:
- `showPlayerPanel`, `showSidebar` toggles
- `cleanView` state
- Old panel toggle callbacks
- TournamentStats rendering in game mode

**Step 3: Update CLAUDE.md**

Add notes about the new game mode layout architecture:
- GameLayout orchestrates 3 zones
- GameStatusBar, GameTimerZone, GamePlayerList, GameQuickInfo are the new components
- PlayerPanel is no longer used in game mode (kept for backward compat if needed)
- Clean View removed, SettingsPanel renders as modal

**Step 4: Run full test suite + build**

Run: `npm run test && npm run build && npm run lint`
Expected: All pass

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: cleanup — remove TournamentStats from game mode, update CLAUDE.md"
```

---

## Execution Order

Tasks 1-6 are **independent new files** and can be built incrementally.
Tasks 7-9 are **refactoring** that depend on Tasks 1-6 being complete.

```
Task 1: Translation Keys (foundation)
Task 2: GameStatusBar (Zone 1) — depends on Task 1
Task 3: GameTimerZone (Zone 2) — independent
Task 4: GamePlayerList (Zone 3 main) — depends on Task 1
Task 5: GameQuickInfo (Zone 3 accordion) — independent
Task 6: GameLayout (orchestrator) — depends on Tasks 2-5
Task 7: Refactor GameModeContainer — depends on Task 6
Task 8: SettingsPanel modal + Remove Clean View — depends on Task 7
Task 9: Cleanup + docs — depends on Task 8
```

## Risk Notes

- **GamePlayerList is the hardest task** (~350 lines). The inline bounty elimination (expanding row with player buttons) is a UX change from the current dropdown. Test thoroughly.
- **GameTimerZone height**: `min-height: 35vh` on mobile may need tuning. The design says 35vh mobile / 40vh tablet / 45vh desktop — use responsive classes.
- **Sticky stacking**: Zone 1 is `sticky top-0 z-20`, Zone 2 is `sticky top-[48px] z-10`. If the status bar height varies, the `top-[48px]` offset will be wrong. Consider using a CSS variable or measuring dynamically.
- **SettingsPanel modal**: Currently SettingsPanel is a sidebar component. Rendering it in a modal should work without changes to the component itself — just wrap it in a modal overlay.
- **Clean View removal**: Any code paths that check `cleanView` need to be updated. Search for all usages before removing.
