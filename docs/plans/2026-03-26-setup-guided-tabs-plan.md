# Setup Guided Tabs — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the single-scroll SetupPage with a 4-tab guided layout (Basis, Spieler, Struktur, Starten) while preserving all existing functionality.

**Architecture:** Extract SetupPage content into 4 tab components + 1 tab navigation component. SetupPage becomes a thin orchestrator. All editor components (PlayerManager, BlindGenerator, etc.) remain unchanged. Tab state persisted in sessionStorage.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, existing animations from index.css. No new libraries.

---

### Task 1: SetupTabs Component (Tab Navigation)

**Files:**
- Create: `src/components/SetupTabs.tsx`
- Test: `tests/components.test.tsx` (append)

**Step 1: Write the failing test**

```tsx
// In tests/components.test.tsx — add new describe block
describe('SetupTabs', () => {
  it('renders 4 tabs with correct labels', () => {
    render(
      <SetupTabs
        activeTab={0}
        onTabChange={() => {}}
        tabStatus={{ basis: 'complete', players: 'incomplete', structure: 'incomplete', review: 'incomplete' }}
      />
    );
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
  });

  it('marks active tab with aria-selected', () => {
    render(
      <SetupTabs activeTab={1} onTabChange={() => {}} tabStatus={{ basis: 'complete', players: 'incomplete', structure: 'incomplete', review: 'incomplete' }} />
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onTabChange when tab clicked', async () => {
    const onChange = vi.fn();
    render(
      <SetupTabs activeTab={0} onTabChange={onChange} tabStatus={{ basis: 'incomplete', players: 'incomplete', structure: 'incomplete', review: 'incomplete' }} />
    );
    await userEvent.click(screen.getAllByRole('tab')[2]);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('shows completion badge on complete tabs', () => {
    render(
      <SetupTabs activeTab={0} onTabChange={() => {}} tabStatus={{ basis: 'complete', players: 'complete', structure: 'incomplete', review: 'incomplete' }} />
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveTextContent('✓');
    expect(tabs[1]).toHaveTextContent('✓');
  });

  it('renders progress bar', () => {
    render(
      <SetupTabs activeTab={0} onTabChange={() => {}} tabStatus={{ basis: 'complete', players: 'complete', structure: 'incomplete', review: 'incomplete' }} />
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components.test.tsx -t "SetupTabs"`
Expected: FAIL with "SetupTabs not found"

**Step 3: Write implementation**

```tsx
// src/components/SetupTabs.tsx
import { useTranslation } from '../i18n';

type TabStatus = 'complete' | 'incomplete' | 'warning';

interface Props {
  activeTab: number;
  onTabChange: (index: number) => void;
  tabStatus: {
    basis: TabStatus;
    players: TabStatus;
    structure: TabStatus;
    review: TabStatus;
  };
}

const TAB_ICONS = ['🎯', '👥', '📊', '🚀'];

export function SetupTabs({ activeTab, onTabChange, tabStatus }: Props) {
  const { t } = useTranslation();
  const tabKeys = ['basis', 'players', 'structure', 'review'] as const;
  const tabLabels = [
    t('app.tournamentBasics'),
    t('app.players'),
    t('setup.tabStructure' as Parameters<typeof t>[0]),
    t('setup.tabStart' as Parameters<typeof t>[0]),
  ];

  const completedCount = Object.values(tabStatus).filter(s => s === 'complete').length;
  const progress = Math.round((completedCount / 4) * 100);

  return (
    <div className="sticky top-0 z-20 bg-gray-900/60 dark:bg-gray-900/60 bg-white/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700/40">
      <div className="max-w-2xl mx-auto">
        <div role="tablist" className="flex">
          {tabKeys.map((key, i) => {
            const status = tabStatus[key];
            const isActive = activeTab === i;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(i)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors relative
                  ${isActive
                    ? 'text-[var(--accent-500)] border-b-2 border-[var(--accent-500)]'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-200 dark:hover:text-gray-300'
                  }`}
              >
                <span className="hidden sm:inline">{TAB_ICONS[i]}</span>
                <span className="hidden sm:inline">{tabLabels[i]}</span>
                <span className="sm:hidden text-lg">{TAB_ICONS[i]}</span>
                {status === 'complete' && (
                  <span className="text-[var(--accent-500)] text-xs">✓</span>
                )}
                {status === 'warning' && (
                  <span className="text-amber-500 text-xs">⚠</span>
                )}
              </button>
            );
          })}
        </div>
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-0.5 bg-gray-200 dark:bg-gray-800"
        >
          <div
            className="h-full bg-gradient-to-r from-[var(--accent-500)] to-[var(--accent-400)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components.test.tsx -t "SetupTabs"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/SetupTabs.tsx tests/components.test.tsx
git commit -m "feat: add SetupTabs navigation component with progress bar"
```

---

### Task 2: Translation Keys

**Files:**
- Modify: `src/i18n/translations.ts`

**Step 1: Add new keys**

Add to both DE and EN sections:

```typescript
// DE
'setup.tabStructure': 'Struktur',
'setup.tabStart': 'Starten',
'setup.tabBack': 'Zurück',
'setup.tabNext': 'Weiter',
'setup.reviewTitle': 'Turnier-Übersicht',
'setup.reviewName': 'Turnier',
'setup.reviewBuyIn': 'Buy-In',
'setup.reviewPlayers': 'Spieler',
'setup.reviewTables': 'Tische',
'setup.reviewLevels': 'Levels',
'setup.reviewDuration': 'Geschätzte Dauer',
'setup.reviewPrizepool': 'Prizepool',
'setup.reviewRebuy': 'Rebuy',
'setup.reviewBounty': 'Bounty',
'setup.reviewSound': 'Sound',
'setup.reviewReady': 'Alles bereit — Turnier kann starten!',
'setup.reviewErrors': 'Bitte beheben:',

// EN
'setup.tabStructure': 'Structure',
'setup.tabStart': 'Start',
'setup.tabBack': 'Back',
'setup.tabNext': 'Next',
'setup.reviewTitle': 'Tournament Overview',
'setup.reviewName': 'Tournament',
'setup.reviewBuyIn': 'Buy-In',
'setup.reviewPlayers': 'Players',
'setup.reviewTables': 'Tables',
'setup.reviewLevels': 'Levels',
'setup.reviewDuration': 'Estimated Duration',
'setup.reviewPrizepool': 'Prizepool',
'setup.reviewRebuy': 'Rebuy',
'setup.reviewBounty': 'Bounty',
'setup.reviewSound': 'Sound',
'setup.reviewReady': 'All set — tournament ready to start!',
'setup.reviewErrors': 'Please fix:',
```

**Step 2: Run i18n tests**

Run: `npx vitest run tests/i18n.test.ts`
Expected: PASS (key parity maintained)

**Step 3: Commit**

```bash
git add src/i18n/translations.ts
git commit -m "feat: add i18n keys for setup tabs and review screen"
```

---

### Task 3: SetupTabBasis (Tab 1)

**Files:**
- Create: `src/components/SetupTabBasis.tsx`

**Step 1: Extract from SetupPage.tsx**

Move these sections from SetupPage.tsx into SetupTabBasis:
- Checkpoint recovery banner (lines 276-302)
- Backup reminder banner (lines 305-318)
- Quick Start Presets (lines 401-472)
- Turnier-Grundlagen CollapsibleSection (lines 474-586)

The component receives the same props as SetupPage for the fields it uses:
`config`, `setConfig`, `pendingCheckpoint`, `onRestoreCheckpoint`, `onDismissCheckpoint`, `leagues`, `setLeagues`, `onConfirm`, `showBackupReminder`, `dismissBackupReminder`.

No CollapsibleSection wrapper — content is direct (no accordion needed, everything visible).

**Step 2: Verify lint passes**

Run: `npx eslint src/components/SetupTabBasis.tsx`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/components/SetupTabBasis.tsx
git commit -m "feat: extract SetupTabBasis from SetupPage (Tab 1)"
```

---

### Task 4: SetupTabPlayers (Tab 2)

**Files:**
- Create: `src/components/SetupTabPlayers.tsx`

**Step 1: Extract from SetupPage.tsx**

Move from SetupPage.tsx:
- Spieler CollapsibleSection content (lines 589-768) — but WITHOUT the CollapsibleSection wrapper. PlayerManager and Multi-Table SubSection rendered directly.

Props needed: `config`, `setConfig`, `canUseMultiTable`, `onOpenFeatureGate`, `onConfirm`.

**Step 2: Verify lint passes**

Run: `npx eslint src/components/SetupTabPlayers.tsx`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/components/SetupTabPlayers.tsx
git commit -m "feat: extract SetupTabPlayers from SetupPage (Tab 2)"
```

---

### Task 5: SetupTabStructure (Tab 3)

**Files:**
- Create: `src/components/SetupTabStructure.tsx`

**Step 1: Extract from SetupPage.tsx**

Move from SetupPage.tsx — these sections KEEP their CollapsibleSection wrappers:
- Blind-Struktur (lines 783-866)
- Auszahlung (lines 771-780)
- Turnier-Format (lines 869-962)
- Chip-Werte (lines 966-983)
- Audio & Ansagen (lines 986-1067)

Props needed: `config`, `setConfig`, `settings`, `onSettingsChange`, `onShowCustomAudio`, `canUseMultiTable`, `onOpenFeatureGate`.

Summary memos (`chipsSummary`, `payoutSummary`, `formatSummary`, `blindSummary`, `audioSummary`) move into this component.

**Step 2: Verify lint passes**

Run: `npx eslint src/components/SetupTabStructure.tsx`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/components/SetupTabStructure.tsx
git commit -m "feat: extract SetupTabStructure from SetupPage (Tab 3)"
```

---

### Task 6: SetupTabReview (Tab 4)

**Files:**
- Create: `src/components/SetupTabReview.tsx`

**Step 1: Write the new review component**

This is NEW — not extracted from SetupPage. It renders a read-only summary card.

```tsx
// src/components/SetupTabReview.tsx
import { useMemo, lazy, Suspense } from 'react';
import type { TournamentConfig, Settings } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { useTranslation } from '../i18n';
import { computeBlindStructureSummary, estimateTournamentDuration } from '../domain/logic';
import { LoadingFallback } from './LoadingFallback';
const SetupQRCode = lazy(() => import('./SetupQRCode').then(m => ({ default: m.SetupQRCode })));

interface Props {
  config: TournamentConfig;
  settings: Settings;
  startErrors: string[];
  onSwitchToGame: () => void;
  onTabChange: (tab: number) => void;
}

export function SetupTabReview({ config, settings, startErrors, onSwitchToGame, onTabChange }: Props) {
  const { t } = useTranslation();
  const cs = CURRENCY_SYMBOLS[config.currency ?? 'EUR'];

  const blindSummary = useMemo(() => computeBlindStructureSummary(config.levels), [config.levels]);
  const duration = useMemo(() => estimateTournamentDuration(config), [config]);
  const prizepool = useMemo(() => {
    const base = config.players.length * config.buyIn;
    return base;
  }, [config.players, config.buyIn]);

  const tables = config.tables?.filter(t => t.status === 'active').length ?? 1;
  const canStart = startErrors.length === 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-200">{t('setup.reviewTitle' as Parameters<typeof t>[0])}</h2>

      <div className="bg-gray-100/80 dark:bg-gray-800/40 backdrop-blur-sm border border-gray-200 dark:border-gray-700/40 rounded-xl p-4 space-y-3">
        {/* Summary rows — each clickable to jump to the corresponding tab */}
        <Row label={t('setup.reviewName' as Parameters<typeof t>[0])} value={config.name || '—'} onClick={() => onTabChange(0)} />
        <Row label={t('setup.reviewBuyIn' as Parameters<typeof t>[0])} value={`${config.buyIn} ${cs}`} onClick={() => onTabChange(0)} />
        <Row label={t('setup.reviewPlayers' as Parameters<typeof t>[0])} value={String(config.players.length)} onClick={() => onTabChange(1)} />
        <Row label={t('setup.reviewTables' as Parameters<typeof t>[0])} value={String(tables)} onClick={() => onTabChange(1)} />
        <Row label={t('setup.reviewLevels' as Parameters<typeof t>[0])} value={blindSummary} onClick={() => onTabChange(2)} />
        <Row label={t('setup.reviewDuration' as Parameters<typeof t>[0])} value={duration} onClick={() => onTabChange(2)} />
        <Row label={t('setup.reviewPrizepool' as Parameters<typeof t>[0])} value={`${prizepool} ${cs}`} onClick={() => onTabChange(2)} />
        <Row label={t('setup.reviewRebuy' as Parameters<typeof t>[0])} value={config.rebuy?.enabled ? '✓' : '—'} onClick={() => onTabChange(2)} />
        <Row label={t('setup.reviewBounty' as Parameters<typeof t>[0])} value={config.bounty?.enabled ? '✓' : '—'} onClick={() => onTabChange(2)} />
        <Row label={t('setup.reviewSound' as Parameters<typeof t>[0])} value={settings.soundEnabled ? '✓' : '—'} onClick={() => onTabChange(2)} />
      </div>

      {/* Errors */}
      {startErrors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-1">
          <p className="text-red-400 font-medium text-sm">{t('setup.reviewErrors' as Parameters<typeof t>[0])}</p>
          {startErrors.map((err, i) => (
            <p key={i} className="text-red-300 text-sm">• {err}</p>
          ))}
        </div>
      )}

      {/* Ready banner */}
      {canStart && (
        <div className="bg-[var(--accent-500)]/10 border border-[var(--accent-500)]/30 rounded-xl p-3 text-center">
          <p className="text-[var(--accent-400)] font-medium">{t('setup.reviewReady' as Parameters<typeof t>[0])}</p>
        </div>
      )}

      {/* Start button */}
      <button
        onClick={onSwitchToGame}
        disabled={!canStart}
        className={`w-full py-4 text-xl font-bold rounded-xl transition-all
          ${canStart
            ? 'btn-accent-gradient text-white shadow-lg shadow-[var(--accent-900)]/30 hover:shadow-xl active:scale-[0.97] animate-pulse'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
      >
        ▶ {t('app.startTournament')}
      </button>

      {/* Print + QR */}
      <div className="flex gap-3 justify-center">
        <button onClick={() => window.print()} className="text-sm text-gray-400 hover:text-gray-200">
          🖨 {t('setup.print')}
        </button>
      </div>
      <Suspense fallback={<LoadingFallback />}>
        <SetupQRCode />
      </Suspense>
    </div>
  );
}

function Row({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex justify-between items-center py-1.5 px-2 -mx-2 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/30 transition-colors text-left"
    >
      <span className="text-sm text-gray-400 dark:text-gray-500">{label}</span>
      <span className="text-sm text-gray-200 dark:text-gray-300 font-medium">{value}</span>
    </button>
  );
}
```

**Step 2: Verify lint passes**

Run: `npx eslint src/components/SetupTabReview.tsx`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/components/SetupTabReview.tsx
git commit -m "feat: add SetupTabReview summary screen (Tab 4)"
```

---

### Task 7: Refactor SetupPage as Tab Orchestrator

**Files:**
- Modify: `src/components/SetupPage.tsx` (1123 -> ~150 lines)

**Step 1: Rewrite SetupPage**

Replace SetupPage content with tab orchestrator that:
1. Manages `activeTab` state (persisted in sessionStorage)
2. Computes `tabStatus` from config/players/errors
3. Renders `SetupTabs` + active tab component + Weiter/Zurueck buttons
4. Handles `Cmd+1-4` keyboard shortcuts
5. Handles swipe gestures for mobile

Key structure:
```tsx
export function SetupPage(props: Props) {
  const [activeTab, setActiveTab] = useState<number>(() => {
    const saved = sessionStorage.getItem('setup-active-tab');
    return saved ? Math.min(Number(saved), 3) : 0;
  });

  // Persist tab on change
  useEffect(() => {
    sessionStorage.setItem('setup-active-tab', String(activeTab));
  }, [activeTab]);

  // Tab status computation
  const tabStatus = useMemo(() => ({ ... }), [config, players, errors]);

  // Keyboard: Cmd+1-4
  useEffect(() => { ... }, []);

  // Swipe detection via pointer events
  const pointerStart = useRef<number | null>(null);
  const onPointerDown = (e) => { pointerStart.current = e.clientX; };
  const onPointerUp = (e) => {
    if (pointerStart.current === null) return;
    const diff = e.clientX - pointerStart.current;
    if (Math.abs(diff) > 80) {
      setActiveTab(prev => diff > 0 ? Math.max(0, prev - 1) : Math.min(3, prev + 1));
    }
    pointerStart.current = null;
  };

  return (
    <div onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <SetupTabs activeTab={activeTab} onTabChange={setActiveTab} tabStatus={tabStatus} />
      <div className="max-w-2xl mx-auto p-3 sm:p-6">
        {activeTab === 0 && <SetupTabBasis ... />}
        {activeTab === 1 && <SetupTabPlayers ... />}
        {activeTab === 2 && <SetupTabStructure ... />}
        {activeTab === 3 && <SetupTabReview ... onTabChange={setActiveTab} />}

        {/* Weiter/Zurueck */}
        <div className="flex justify-between mt-6 sticky bottom-0 pb-3 sm:static sm:pb-0">
          {activeTab > 0 && (
            <button onClick={() => setActiveTab(activeTab - 1)} className="ghost-button">
              ← {t('setup.tabBack')}
            </button>
          )}
          {activeTab < 3 && (
            <button onClick={() => setActiveTab(activeTab + 1)} className="accent-button ml-auto">
              {t('setup.tabNext')} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: 0 errors, build succeeds

**Step 3: Commit**

```bash
git add src/components/SetupPage.tsx
git commit -m "refactor: SetupPage to tab orchestrator (1123 -> ~150 lines)"
```

---

### Task 8: Slide Animations

**Files:**
- Modify: `src/index.css` (if needed — check if slide-in-left/right exist)

**Step 1: Verify existing animations**

Check if `animate-slide-in-left` and `animate-slide-in-right` already exist in `index.css`. If they do, wrap tab content in a div with the appropriate class based on swipe direction.

If NOT present, add:
```css
@keyframes slide-in-left {
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes slide-in-right {
  from { transform: translateX(20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@utility animate-slide-in-left {
  animation: slide-in-left 150ms ease-out;
}
@utility animate-slide-in-right {
  animation: slide-in-right 150ms ease-out;
}
```

**Step 2: Add animation key to tab content**

In SetupPage, add `key={activeTab}` to the tab content wrapper so React remounts on tab change, triggering the animation.

**Step 3: Commit**

```bash
git add src/index.css src/components/SetupPage.tsx
git commit -m "feat: add slide animations for tab transitions"
```

---

### Task 9: Full Test Suite + Integration

**Files:**
- Modify: `tests/components.test.tsx` (add integration test)

**Step 1: Run full test suite**

Run: `npm run test`
Expected: All tests pass (existing + new SetupTabs tests)

**Step 2: Run lint**

Run: `npm run lint`
Expected: 0 errors

**Step 3: Run build**

Run: `npm run build`
Expected: Success

**Step 4: Manual smoke test**

Run: `npm run preview`
Verify:
- [ ] 4 tabs visible, clickable
- [ ] Tab badges show correct status
- [ ] Progress bar updates
- [ ] Content slides on tab change
- [ ] Weiter/Zurueck buttons work
- [ ] Cmd+1-4 shortcuts work
- [ ] Mobile: swipe works
- [ ] Tab 4 review shows all settings
- [ ] Start button works from Tab 4
- [ ] Review row click jumps to correct tab
- [ ] SetupWizard still works on first visit
- [ ] Checkpoint recovery still works

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Setup-Redesign — Guided Tabs Layout (4 Tabs)

Replaces single-scroll SetupPage (1123 lines) with 4-tab layout:
- Tab 1 (Basis): Name, Buy-In, Chips, Liga, Presets
- Tab 2 (Spieler): PlayerManager, Multi-Table
- Tab 3 (Struktur): Blinds, Payout, Format, Chips, Audio
- Tab 4 (Starten): Review-Summary mit Start-Button

Features:
- Free tab navigation with status badges
- Progress bar (0-100%)
- Slide animations between tabs
- Swipe support on mobile
- Cmd+1-4 keyboard shortcuts
- Tab persisted in sessionStorage
- Review screen with clickable rows
- All existing editors unchanged"
```
