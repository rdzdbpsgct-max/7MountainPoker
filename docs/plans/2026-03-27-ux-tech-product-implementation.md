# UX, Tech & Product Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 10 improvements across 3 phases: Quick Wins (Undo-Toast, SW-Update, Remote-Sync), Medium (Feature Discovery, DnD Blinds, Audio Toggles, Exports), Large (React Compiler, Multi-Device Roles, Stats Dashboard).

**Architecture:** Each feature is self-contained — no cross-dependencies between tasks. All features follow existing patterns: domain logic in `src/domain/`, UI in `src/components/`, hooks in `src/hooks/`, i18n in `src/i18n/translations.ts`. Tests in `tests/`.

**Tech Stack:** React 19, TypeScript 5.9 strict, Vite 7, Tailwind CSS 4, Vitest, PeerJS, vite-plugin-pwa.

---

## Phase 1: Quick Wins (v6.13.0)

### Task 1: Undo-Toast Feedback

**Files:**
- Modify: `src/hooks/useUndoManager.ts`
- Modify: `src/i18n/translations.ts`
- Test: `tests/logic.test.ts`

**Step 1: Add i18n keys**

In `src/i18n/translations.ts`, add to both `de` and `en` objects:

```typescript
// DE:
'toast.undone': 'Rückgängig: {action}',
'toast.redone': 'Wiederholt: {action}',

// EN:
'toast.undone': 'Undone: {action}',
'toast.redone': 'Redone: {action}',
```

**Step 2: Add showToast to useUndoManager**

In `src/hooks/useUndoManager.ts`:

1. Add `showToast` and `t` to params interface:
```typescript
interface UseUndoManagerParams {
  // ... existing fields ...
  showToast: (msg: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}
```

2. In `handleUndo` callback, after `setTournamentEvents(entry.events)` (line 54), add:
```typescript
const label = entry.actionKey ? t(entry.actionKey) : '';
showToast(t('toast.undone', { action: label }));
```

3. In `handleRedo` callback, after `setTournamentEvents(entry.events)` (line 69), add:
```typescript
const label = entry.actionKey ? t(entry.actionKey) : '';
showToast(t('toast.redone', { action: label }));
```

**Step 3: Update call site in App.tsx**

Pass `showToast` (already imported) and `t` to `useUndoManager()` call.

**Step 4: Write test**

In `tests/logic.test.ts`, add test:
```typescript
describe('Undo toast feedback', () => {
  it('should provide action label for toast', () => {
    const stack = new UndoStack();
    const snapshot = createUndoSnapshot('game.undo.elimination', [], undefined, [], 0);
    const pushed = stack.push(snapshot);
    expect(pushed.undoLabel).toBe('game.undo.elimination');
  });
});
```

**Step 5: Run tests and verify**

Run: `npm run test`
Expected: All 1381+ tests pass.

**Step 6: Commit**

```bash
git add src/hooks/useUndoManager.ts src/i18n/translations.ts src/App.tsx tests/logic.test.ts
git commit -m "feat: toast feedback on undo/redo actions"
```

---

### Task 2: Service Worker Update Banner

**Files:**
- Modify: `vite.config.ts`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/i18n/translations.ts`

**Step 1: Add i18n keys**

In `src/i18n/translations.ts`:

```typescript
// DE:
'app.updateAvailable': 'Neue Version verfügbar',
'app.updateNow': 'Jetzt aktualisieren',
'app.updateDismiss': 'Später',

// EN:
'app.updateAvailable': 'New version available',
'app.updateNow': 'Update now',
'app.updateDismiss': 'Later',
```

**Step 2: Change PWA registerType**

In `vite.config.ts`, line 52, change:
```typescript
registerType: 'autoUpdate',
```
to:
```typescript
registerType: 'prompt',
```

**Step 3: Expose update callback in main.tsx**

In `src/main.tsx`, after `initStorage()` and before `createRoot()`:

```typescript
import { registerSW } from 'virtual:pwa-register';

// Store the update callback globally so App.tsx can access it
let updateSWCallback: (() => Promise<void>) | null = null;
export function getUpdateSW() { return updateSWCallback; }

const updateSW = registerSW({
  onNeedRefresh() {
    // Dispatch custom event so App.tsx can react
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  },
  onOfflineReady() {
    // Silently ready for offline
  },
});
updateSWCallback = updateSW;
```

**Step 4: Add update banner in App.tsx**

1. Add state: `const [updateAvailable, setUpdateAvailable] = useState(false);`

2. Add effect:
```typescript
useEffect(() => {
  const handler = () => setUpdateAvailable(true);
  window.addEventListener('sw-update-available', handler);
  return () => window.removeEventListener('sw-update-available', handler);
}, []);
```

3. Add banner JSX at the top of the return (inside the outermost fragment/div), before AppHeader:
```tsx
{updateAvailable && (
  <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-300 dark:border-amber-700/50 px-4 py-2 flex items-center justify-center gap-3 text-sm">
    <span className="text-amber-800 dark:text-amber-200">{t('app.updateAvailable')}</span>
    <button
      onClick={() => {
        const update = getUpdateSW();
        if (update) void update();
        else window.location.reload();
      }}
      className="px-3 py-1 rounded-lg text-white font-medium text-xs"
      style={{ background: 'var(--accent-600)' }}
    >
      {t('app.updateNow')}
    </button>
    <button
      onClick={() => setUpdateAvailable(false)}
      className="text-amber-600 dark:text-amber-400 text-xs hover:underline"
    >
      {t('app.updateDismiss')}
    </button>
  </div>
)}
```

4. Import `getUpdateSW` from `main.tsx`.

**Step 5: Run lint + build + tests**

Run: `npm run lint && npm run build && npm run test`
Expected: 0 errors, build succeeds, all tests pass.

**Step 6: Commit**

```bash
git add vite.config.ts src/main.tsx src/App.tsx src/i18n/translations.ts
git commit -m "feat: SW update banner — prompt user before reload"
```

---

### Task 3: Remote Reconnect State-Sync

**Files:**
- Modify: `src/domain/remote.ts`
- Modify: `src/i18n/translations.ts`
- Test: `tests/logic.test.ts`

**Step 1: Add i18n keys**

```typescript
// DE:
'remote.reconnected': 'Verbindung wiederhergestellt',
'remote.syncing': 'Status wird synchronisiert…',

// EN:
'remote.reconnected': 'Connection restored',
'remote.syncing': 'Syncing state…',
```

**Step 2: Add `requestState` to RemoteCommand action union**

In `src/domain/remote.ts`, line 279–292, add `'requestState'` to the action union:

```typescript
export interface RemoteCommand {
  type: 'command';
  action:
    | 'play'
    | 'pause'
    | 'toggle'
    | 'next'
    | 'prev'
    | 'reset'
    | 'call-the-clock'
    | 'advanceDealer'
    | 'toggleSound'
    | 'eliminatePlayer'
    | 'rebuyPlayer'
    | 'addOnPlayer'
    | 'skipBreak'
    | 'extendBreak'
    | 'requestState';   // <-- new
```

Also add to `VALID_COMMAND_ACTIONS` set (line 367–372):

```typescript
const VALID_COMMAND_ACTIONS: ReadonlySet<RemoteCommand['action']> = new Set([
  'play', 'pause', 'toggle', 'next', 'prev', 'reset',
  'call-the-clock', 'advanceDealer', 'toggleSound',
  'eliminatePlayer', 'rebuyPlayer', 'addOnPlayer',
  'skipBreak', 'extendBreak',
  'requestState',   // <-- new
]);
```

**Step 3: Handle `requestState` in RemoteHost**

In `RemoteHost`'s command handler (the method that processes incoming commands from controllers), add a case for `requestState`:

```typescript
if (cmd.action === 'requestState') {
  // Send cached state immediately to the requesting peer
  if (this.lastBuiltState && conn.open) {
    try {
      void conn.send(JSON.stringify(this.lastBuiltState));
    } catch { /* ignore */ }
  }
  return; // Don't forward to App.tsx callbacks — no game action
}
```

This goes BEFORE the `callbacks.onCommand(cmd)` call so it's handled internally.

**Step 4: Auto-request state on controller reconnect**

In `RemoteController.setupConnection()` (line 1007–1051), after `this.reconnectAttempts = 0;` on line 1010, add:

```typescript
conn.on('open', () => {
  this.setStatus('connected');
  this.reconnectAttempts = 0;
  // Request full state on reconnect
  void this.sendCommand('requestState');
});
```

Replace the existing `conn.on('open', ...)` block.

**Step 5: Write test**

In `tests/logic.test.ts`, add:

```typescript
describe('Remote requestState', () => {
  it('requestState should be a valid command action', () => {
    // Verify the action is in the valid set
    expect(VALID_COMMAND_ACTIONS.has('requestState')).toBe(true);
  });
});
```

Note: Export `VALID_COMMAND_ACTIONS` from `remote.ts` for testing, or test via the action union type.

**Step 6: Run tests**

Run: `npm run test`
Expected: All tests pass.

**Step 7: Commit**

```bash
git add src/domain/remote.ts src/i18n/translations.ts tests/logic.test.ts
git commit -m "feat: remote state-sync on reconnect — requestState command"
```

---

### Task 4: Phase 1 Release Commit

**Step 1: Run full verification**

```bash
npm run lint && npm run test && npm run build
```

**Step 2: Bump version to 6.13.0**

In `package.json`, change `"version"` to `"6.13.0"`.

**Step 3: Update CHANGELOG.md**

Add v6.13.0 section with Phase 1 changes.

**Step 4: Commit and push**

```bash
git add -A
git commit -m "release: v6.13.0 — Undo-Toast, SW-Update-Banner, Remote-Sync"
git push
```

---

## Phase 2: Medium (v6.14.0)

### Task 5: Feature Discovery — "What's New" Modal

**Files:**
- Create: `src/domain/whatsNew.ts`
- Modify: `src/App.tsx`
- Modify: `src/i18n/translations.ts`
- Modify: `vite.config.ts` (add `VITE_APP_VERSION` define)

**Step 1: Inject version into build**

In `vite.config.ts`, add `define` block:

```typescript
export default defineConfig({
  base: basePath,
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
  },
  // ... rest
})
```

Add type declaration in `src/vite-env.d.ts` (or create):
```typescript
declare const __APP_VERSION__: string;
```

**Step 2: Create whatsNew.ts**

```typescript
// src/domain/whatsNew.ts

export interface WhatsNewFeature {
  key: string;  // i18n translation key
  icon: string; // emoji
}

export interface WhatsNewRelease {
  version: string;
  features: WhatsNewFeature[];
}

/** Feature highlights for "What's New" modal — newest first, max 3 shown */
export const WHATS_NEW: WhatsNewRelease[] = [
  {
    version: '6.13.0',
    features: [
      { key: 'whatsNew.undoToast', icon: '↩️' },
      { key: 'whatsNew.updateBanner', icon: '🔄' },
      { key: 'whatsNew.remoteSync', icon: '📱' },
    ],
  },
  {
    version: '6.12.0',
    features: [
      { key: 'whatsNew.gameInfoBar', icon: '📊' },
      { key: 'whatsNew.controlsRedesign', icon: '🎮' },
      { key: 'whatsNew.settingsModal', icon: '⚙️' },
    ],
  },
];

const VERSION_KEY = 'poker-timer-last-version';

/** Check if user should see "What's New" */
export function shouldShowWhatsNew(): boolean {
  const lastSeen = localStorage.getItem(VERSION_KEY);
  if (!lastSeen) {
    // First visit — don't show (wizard handles onboarding)
    markVersionSeen();
    return false;
  }
  return lastSeen !== __APP_VERSION__;
}

/** Mark current version as seen */
export function markVersionSeen(): void {
  try {
    localStorage.setItem(VERSION_KEY, __APP_VERSION__);
  } catch { /* ignore */ }
}

/** Get releases newer than last seen version */
export function getUnseenReleases(): WhatsNewRelease[] {
  const lastSeen = localStorage.getItem(VERSION_KEY) || '0.0.0';
  return WHATS_NEW.filter(r => r.version > lastSeen).slice(0, 3);
}
```

**Step 3: Add i18n keys**

```typescript
// DE:
'whatsNew.title': 'Was ist neu?',
'whatsNew.dismiss': 'Verstanden',
'whatsNew.undoToast': 'Rückgängig-Feedback als Toast-Benachrichtigung',
'whatsNew.updateBanner': 'Update-Banner bei neuer App-Version',
'whatsNew.remoteSync': 'Automatische Synchronisierung nach Verbindungsabbruch',
'whatsNew.gameInfoBar': 'Kompakte Info-Leiste über dem Timer',
'whatsNew.controlsRedesign': 'Überarbeitete Steuerungs-Buttons',
'whatsNew.settingsModal': 'Einstellungen als eigenes Modal',

// EN:
'whatsNew.title': "What's New",
'whatsNew.dismiss': 'Got it',
'whatsNew.undoToast': 'Undo/redo toast notification feedback',
'whatsNew.updateBanner': 'Update banner for new app versions',
'whatsNew.remoteSync': 'Automatic state sync after reconnect',
'whatsNew.gameInfoBar': 'Compact info bar above timer',
'whatsNew.controlsRedesign': 'Redesigned control buttons',
'whatsNew.settingsModal': 'Settings as standalone modal',
```

**Step 4: Add "What's New" modal in App.tsx**

1. Add state: `const [showWhatsNew, setShowWhatsNew] = useState(false);`
2. Add effect checking `shouldShowWhatsNew()` on mount.
3. Add simple modal component inline (or extract to `WhatsNewModal.tsx`):
   - List of releases with version headers and feature bullets.
   - "Got it" button calls `markVersionSeen()` + `setShowWhatsNew(false)`.
   - Uses existing modal styling (backdrop-blur, scale-in animation, rounded-2xl).

**Step 5: Run tests + lint**

Run: `npm run lint && npm run test`

**Step 6: Commit**

```bash
git add src/domain/whatsNew.ts src/App.tsx src/i18n/translations.ts vite.config.ts
git commit -m "feat: What's New modal for returning users"
```

---

### Task 6: Drag & Drop Blind Levels

**Files:**
- Modify: `src/components/ConfigEditor.tsx`

**Step 1: Add reorderLevel function**

In `ConfigEditor.tsx`, add alongside the existing `moveLevel` function:

```typescript
function reorderLevel(fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return;
  const newLevels = [...config.levels];
  const [moved] = newLevels.splice(fromIndex, 1);
  newLevels.splice(toIndex, 0, moved);
  onChange({ ...config, levels: newLevels });
}
```

**Step 2: Add drag state**

```typescript
const [dragIndex, setDragIndex] = useState<number | null>(null);
const [dropTarget, setDropTarget] = useState<number | null>(null);
const dragStartY = useRef(0);
const rowRefs = useRef<(HTMLElement | null)[]>([]);
```

**Step 3: Add pointer event handlers**

```typescript
function handleDragStart(e: React.PointerEvent, index: number) {
  e.preventDefault();
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
  setDragIndex(index);
  dragStartY.current = e.clientY;
}

function handleDragMove(e: React.PointerEvent) {
  if (dragIndex === null) return;
  const rowHeight = rowRefs.current[0]?.offsetHeight || 40;
  const delta = e.clientY - dragStartY.current;
  const offset = Math.round(delta / rowHeight);
  const target = Math.max(0, Math.min(config.levels.length - 1, dragIndex + offset));
  setDropTarget(target);
}

function handleDragEnd() {
  if (dragIndex !== null && dropTarget !== null && dragIndex !== dropTarget) {
    reorderLevel(dragIndex, dropTarget);
  }
  setDragIndex(null);
  setDropTarget(null);
}
```

**Step 4: Add grip handle to each level row**

Add a 6-dot grip icon (`⠿`) as the first element in each row:

```tsx
<span
  className="cursor-grab active:cursor-grabbing touch-none text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 select-none px-1"
  onPointerDown={(e) => handleDragStart(e, index)}
  onPointerMove={handleDragMove}
  onPointerUp={handleDragEnd}
  onPointerCancel={handleDragEnd}
>
  ⠿
</span>
```

**Step 5: Add drop indicator line**

Between rows, show an accent-colored line when `dropTarget` matches:

```tsx
{dropTarget === index && dragIndex !== null && dragIndex !== index && (
  <div className="h-0.5 rounded-full" style={{ background: 'var(--accent-500)' }} />
)}
```

**Step 6: Add visual feedback for dragged row**

When `dragIndex === index`, apply `opacity-50` to the row.

**Step 7: Run lint + tests**

Run: `npm run lint && npm run test`

**Step 8: Commit**

```bash
git add src/components/ConfigEditor.tsx
git commit -m "feat: drag & drop blind level reordering via pointer events"
```

---

### Task 7: Audio Category Toggles

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/audioService.ts`
- Modify: `src/domain/speech.ts`
- Modify: `src/domain/sounds.ts`
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/i18n/translations.ts`
- Test: `tests/logic.test.ts`

**Step 1: Extend Settings type**

In `src/domain/types.ts`, add to `Settings` interface:

```typescript
audioCategories?: {
  voice: boolean;
  effects: boolean;
  countdown: boolean;
  alerts: boolean;
};
```

**Step 2: Add category helper**

In `src/domain/audioService.ts`, add:

```typescript
export interface AudioCategories {
  voice: boolean;
  effects: boolean;
  countdown: boolean;
  alerts: boolean;
}

const DEFAULT_CATEGORIES: AudioCategories = {
  voice: true, effects: true, countdown: true, alerts: true,
};

let currentCategories: AudioCategories = { ...DEFAULT_CATEGORIES };

export function setAudioCategories(cats: Partial<AudioCategories> | undefined): void {
  currentCategories = cats ? { ...DEFAULT_CATEGORIES, ...cats } : { ...DEFAULT_CATEGORIES };
}

export function isCategoryEnabled(cat: keyof AudioCategories): boolean {
  return currentCategories[cat];
}
```

**Step 3: Guard speech.ts announce functions**

At the top of each `announce*` function in `speech.ts`, add early return:

```typescript
// For voice announcements:
if (!isCategoryEnabled('voice')) return;

// For countdown functions:
if (!isCategoryEnabled('countdown')) return;

// For alert functions:
if (!isCategoryEnabled('alerts')) return;
```

**Step 4: Guard sounds.ts effect functions**

In `sounds.ts`, guard `playVictorySound`, `playBubbleSound`, `playInTheMoneySound`:

```typescript
if (!isCategoryEnabled('effects')) return;
```

**Step 5: Sync categories from Settings**

In the existing code that calls `audioService.setVolume()` (likely in App.tsx or a hook), also call `setAudioCategories(settings.audioCategories)`.

**Step 6: Add UI toggles in SettingsPanel**

Below the volume slider in the Audio section, add 4 CheckBox toggles (only visible when `soundEnabled`):

```tsx
{settings.soundEnabled && (
  <div className="space-y-2 pt-2">
    {(['voice', 'effects', 'countdown', 'alerts'] as const).map((cat) => (
      <label key={cat} className="flex items-center justify-between">
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {t(`settings.audio${cat.charAt(0).toUpperCase() + cat.slice(1)}` as Parameters<typeof t>[0])}
        </span>
        <CheckBox
          checked={settings.audioCategories?.[cat] ?? true}
          onChange={() => {
            const current = settings.audioCategories ?? { voice: true, effects: true, countdown: true, alerts: true };
            onChange({ ...settings, audioCategories: { ...current, [cat]: !current[cat] } });
          }}
        />
      </label>
    ))}
  </div>
)}
```

**Step 7: Add i18n keys**

```typescript
// DE:
'settings.audioVoice': 'Sprachansagen',
'settings.audioEffects': 'Sound-Effekte',
'settings.audioCountdown': 'Countdown',
'settings.audioAlerts': 'Hinweise',

// EN:
'settings.audioVoice': 'Voice announcements',
'settings.audioEffects': 'Sound effects',
'settings.audioCountdown': 'Countdown',
'settings.audioAlerts': 'Alerts',
```

**Step 8: Write test**

```typescript
describe('Audio categories', () => {
  it('isCategoryEnabled defaults to true for all categories', () => {
    setAudioCategories(undefined);
    expect(isCategoryEnabled('voice')).toBe(true);
    expect(isCategoryEnabled('effects')).toBe(true);
    expect(isCategoryEnabled('countdown')).toBe(true);
    expect(isCategoryEnabled('alerts')).toBe(true);
  });

  it('respects disabled categories', () => {
    setAudioCategories({ countdown: false });
    expect(isCategoryEnabled('countdown')).toBe(false);
    expect(isCategoryEnabled('voice')).toBe(true);
  });
});
```

**Step 9: Run tests**

Run: `npm run lint && npm run test`

**Step 10: Commit**

```bash
git add src/domain/types.ts src/domain/audioService.ts src/domain/speech.ts src/domain/sounds.ts src/components/SettingsPanel.tsx src/i18n/translations.ts tests/logic.test.ts
git commit -m "feat: per-category audio toggles (voice, effects, countdown, alerts)"
```

---

### Task 8: Export Formats

**Files:**
- Modify: `src/domain/tournament.ts`
- Modify: `src/domain/blinds.ts`
- Modify: `src/components/TournamentFinished.tsx`
- Modify: `src/components/SetupPage.tsx`
- Modify: `src/i18n/translations.ts`
- Test: `tests/logic.test.ts`

**Step 1: Add Hendon Mob CSV export**

In `src/domain/tournament.ts`, add:

```typescript
export function formatResultAsHendonMobCSV(result: TournamentResult): string {
  const BOM = '\uFEFF';
  const date = new Date(result.date).toISOString().split('T')[0];
  const header = 'Event,Date,Place,Prize,Entries,Buy-In';
  const rows = result.standings.map(p =>
    [
      `"${(result.name || 'Tournament').replace(/"/g, '""')}"`,
      date,
      p.place,
      p.payout || 0,
      result.playerCount,
      result.buyIn || 0,
    ].join(',')
  );
  return BOM + header + '\n' + rows.join('\n') + '\n';
}
```

**Step 2: Add blind structure CSV export**

In `src/domain/blinds.ts`, add:

```typescript
import type { Level } from './types';

export function formatBlindStructureAsCSV(levels: Level[]): string {
  const BOM = '\uFEFF';
  const header = 'Level,Small Blind,Big Blind,Ante,Duration (min),Type';
  let levelNum = 0;
  const rows = levels.map(level => {
    const type = level.isBreak ? 'Break' : 'Play';
    if (!level.isBreak) levelNum++;
    return [
      level.isBreak ? '' : levelNum,
      level.isBreak ? '' : level.smallBlind,
      level.isBreak ? '' : level.bigBlind,
      level.isBreak ? '' : (level.ante || 0),
      level.duration,
      type,
    ].join(',');
  });
  return BOM + header + '\n' + rows.join('\n') + '\n';
}
```

**Step 3: Pass `t` function to formatResultAsText**

In `src/components/TournamentFinished.tsx`, find calls to `formatResultAsText(result)` and change to `formatResultAsText(result, t)`.

**Step 4: Add Hendon Mob CSV button to TournamentFinished export section**

Add alongside existing CSV download button:

```tsx
<button onClick={() => {
  const csv = formatResultAsHendonMobCSV(result);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${result.name || 'tournament'}-hendonmob.csv`;
  a.click();
  URL.revokeObjectURL(url);
}}>
  {t('finished.downloadHendonMob')}
</button>
```

**Step 5: Add blind structure export button to SetupPage**

Next to the Print button, add:

```tsx
<button onClick={() => {
  const csv = formatBlindStructureAsCSV(config.levels);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'blind-structure.csv';
  a.click();
  URL.revokeObjectURL(url);
}}>
  {t('setup.exportBlinds')}
</button>
```

**Step 6: Add i18n keys**

```typescript
// DE:
'finished.downloadHendonMob': 'Hendon Mob CSV',
'setup.exportBlinds': 'Blindstruktur exportieren',

// EN:
'finished.downloadHendonMob': 'Hendon Mob CSV',
'setup.exportBlinds': 'Export blind structure',
```

**Step 7: Write tests**

```typescript
describe('Hendon Mob CSV', () => {
  it('generates valid CSV with BOM and correct columns', () => {
    const result = buildTournamentResult(/* minimal test config */);
    const csv = formatResultAsHendonMobCSV(result);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Event,Date,Place,Prize,Entries,Buy-In');
  });
});

describe('Blind structure CSV', () => {
  it('exports levels with correct types', () => {
    const levels: Level[] = [
      { id: '1', smallBlind: 25, bigBlind: 50, ante: 0, duration: 15, isBreak: false },
      { id: '2', smallBlind: 0, bigBlind: 0, ante: 0, duration: 10, isBreak: true },
    ];
    const csv = formatBlindStructureAsCSV(levels);
    expect(csv).toContain('Play');
    expect(csv).toContain('Break');
    expect(csv).toContain('25,50');
  });
});
```

**Step 8: Run tests**

Run: `npm run lint && npm run test`

**Step 9: Commit**

```bash
git add src/domain/tournament.ts src/domain/blinds.ts src/components/TournamentFinished.tsx src/components/SetupPage.tsx src/i18n/translations.ts tests/logic.test.ts
git commit -m "feat: Hendon Mob CSV + blind structure CSV + localized text export"
```

---

### Task 9: Phase 2 Release Commit

Same pattern as Task 4: lint, test, build, bump version to 6.14.0, update CHANGELOG, commit and push.

---

## Phase 3: Large (v7.0.0)

### Task 10: React Compiler

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `eslint.config.js`

**Step 1: Install dependencies**

```bash
npm install --save-dev babel-plugin-react-compiler eslint-plugin-react-compiler
```

**Step 2: Configure Vite**

In `vite.config.ts`, modify the `react()` plugin:

```typescript
react({
  babel: {
    plugins: [
      ['babel-plugin-react-compiler', {}],
    ],
  },
}),
```

**Step 3: Configure ESLint**

In `eslint.config.js`, add the plugin and rule:

```typescript
import reactCompiler from 'eslint-plugin-react-compiler';

// In the plugins section:
'react-compiler': reactCompiler,

// In the rules section:
'react-compiler/react-compiler': 'warn',
```

**Step 4: Build and verify**

```bash
npm run build
```

Check for compiler warnings in build output. Address any critical violations.

**Step 5: Run full test suite**

```bash
npm run test
```

All 1381+ tests must pass unchanged.

**Step 6: Run lint**

```bash
npm run lint
```

Review any new `react-compiler/react-compiler` warnings. These indicate code the compiler can't optimize — not errors. Note them for future cleanup.

**Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts eslint.config.js
git commit -m "feat: enable React Compiler — auto-memoization, manual memos preserved"
```

---

### Task 11: Multi-Device Roles

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/remote.ts`
- Modify: `src/components/RemoteControl.tsx`
- Modify: `src/components/ShareHub.tsx`
- Modify: `src/i18n/translations.ts`
- Test: `tests/logic.test.ts`

**Step 1: Add RemoteRole type**

In `src/domain/types.ts`:

```typescript
export type RemoteRole = 'admin' | 'viewer';
```

**Step 2: Extend HelloMessage**

In `src/domain/remote.ts`, find the HelloMessage interface and add:

```typescript
role?: RemoteRole;
```

**Step 3: Store role per connection in RemoteHost**

Change `controllerConnections` map value type to include role:

```typescript
private controllerConnections: Map<string, { conn: DataConnection; role: RemoteRole }> = new Map();
```

On hello message, extract role:

```typescript
const role: RemoteRole = (msg as HelloMessage).role || 'admin';
this.controllerConnections.set(conn.peer, { conn, role });
```

**Step 4: Validate commands by role**

In command handler, before processing:

```typescript
const entry = this.controllerConnections.get(conn.peer);
const role = entry?.role || 'admin';
if (role === 'viewer' && cmd.action !== 'requestState') {
  console.warn(`[remote] Viewer ${conn.peer} attempted ${cmd.action} — denied`);
  return;
}
```

**Step 5: Parse role from URL hash**

In the hash parsing function, extract `role` parameter:

```typescript
const roleParam = params.get('role');
const role: RemoteRole = roleParam === 'viewer' ? 'viewer' : 'admin';
```

Pass to `RemoteController` constructor and include in hello message.

**Step 6: Add viewer QR in ShareHub**

Add a second QR code/link section labeled "Viewer Link" with `&role=viewer` appended to the URL.

**Step 7: Restrict UI for viewer role**

In `RemoteControl.tsx`, if role is `'viewer'`:
- Hide action buttons (play/pause still visible but disabled)
- Show "Zuschauer-Modus" badge
- Only display timer, blind info, player list (read-only)

**Step 8: Add i18n keys**

```typescript
// DE:
'remote.roleAdmin': 'Admin',
'remote.roleViewer': 'Zuschauer',
'remote.viewerLink': 'Zuschauer-Link',
'remote.actionDenied': 'Aktion im Zuschauer-Modus nicht verfügbar',
'remote.commandFrom': 'Aktion via Fernbedienung',
'remote.viewerMode': 'Zuschauer-Modus',

// EN:
'remote.roleAdmin': 'Admin',
'remote.roleViewer': 'Viewer',
'remote.viewerLink': 'Viewer link',
'remote.actionDenied': 'Action not available in viewer mode',
'remote.commandFrom': 'Action via remote',
'remote.viewerMode': 'Viewer mode',
```

**Step 9: Write tests**

```typescript
describe('Remote roles', () => {
  it('viewer role blocks non-requestState commands', () => {
    // Test validation logic
  });
  it('admin role allows all commands', () => {
    // Test validation logic
  });
  it('default role is admin when not specified', () => {
    // Test hello message parsing
  });
});
```

**Step 10: Run tests + lint**

Run: `npm run lint && npm run test`

**Step 11: Commit**

```bash
git add src/domain/types.ts src/domain/remote.ts src/components/RemoteControl.tsx src/components/ShareHub.tsx src/i18n/translations.ts tests/logic.test.ts
git commit -m "feat: multi-device roles — admin vs viewer with action validation"
```

---

### Task 12: Statistics Dashboard

**Files:**
- Create: `src/components/StatsDashboard.tsx`
- Modify: `src/domain/tournament.ts`
- Modify: `src/components/AppHeader.tsx`
- Modify: `src/App.tsx`
- Modify: `src/i18n/translations.ts`
- Test: `tests/logic.test.ts`

**Step 1: Add computePlayerTrends function**

In `src/domain/tournament.ts`:

```typescript
export interface PlayerTrendPoint {
  date: string;
  profit: number;
  cumulativeProfit: number;
  roi: number;
  cashed: boolean;
}

export function computePlayerTrends(
  history: TournamentResult[],
  playerName: string
): PlayerTrendPoint[] {
  const normalized = playerName.trim().toLowerCase();
  let cumulative = 0;

  return history
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .filter(t => t.standings.some(s => s.name.trim().toLowerCase() === normalized))
    .map(t => {
      const player = t.standings.find(s => s.name.trim().toLowerCase() === normalized)!;
      const cost = (t.buyIn || 0) + (player.rebuys || 0) * (t.buyIn || 0);
      const profit = (player.payout || 0) - cost;
      cumulative += profit;
      const roi = cost > 0 ? (profit / cost) * 100 : 0;
      return {
        date: t.date,
        profit,
        cumulativeProfit: cumulative,
        roi,
        cashed: (player.payout || 0) > 0,
      };
    });
}
```

**Step 2: Write tests for computePlayerTrends**

```typescript
describe('computePlayerTrends', () => {
  it('computes cumulative profit across tournaments', () => {
    const history = [/* 2 test tournament results */];
    const trends = computePlayerTrends(history, 'Alice');
    expect(trends).toHaveLength(2);
    expect(trends[1].cumulativeProfit).toBe(trends[0].profit + trends[1].profit);
  });

  it('returns empty for unknown player', () => {
    const trends = computePlayerTrends([], 'Nobody');
    expect(trends).toEqual([]);
  });

  it('calculates ROI correctly', () => {
    // Player with buyIn 50, payout 100 → ROI 100%
  });
});
```

**Step 3: Run test to verify**

Run: `npm run test`

**Step 4: Create StatsDashboard.tsx**

Create `src/components/StatsDashboard.tsx` (~400 lines):

- Import `computePlayerStats`, `computePlayerTrends` from domain/logic
- Import `loadTournamentHistory` (or receive history as prop)
- State: `activeTab` ('table' | 'trends'), `timeFilter` ('all' | 'last10' | 'last20' | 'thisYear'), `selectedPlayers: Set<string>`
- Metric cards section: 4 cards with aggregate values
- Table tab: reuse pattern from TournamentHistory stats tab
- Trends tab: SVG charts reusing LeagueCharts.tsx pattern (copy the SVG line chart rendering, 10-color palette, responsive viewBox, player toggle buttons)
- Modal wrapper: `useDialogA11y`, backdrop-blur, scale-in animation

**Step 5: Add header button in AppHeader.tsx**

Add 📊 button (chart icon) next to existing buttons, calls `onShowStats` callback.

**Step 6: Wire up in App.tsx**

- Add `showStats` state
- Lazy-load `StatsDashboard`
- Pass `setShowStats` to AppHeader

**Step 7: Add i18n keys**

```typescript
// DE:
'stats.title': 'Statistiken',
'stats.tournaments': 'Turniere',
'stats.profit': 'Gewinn',
'stats.roi': 'ROI',
'stats.cashRate': 'Cash-Rate',
'stats.tableTab': 'Tabelle',
'stats.trendsTab': 'Trends',
'stats.filterAll': 'Alle',
'stats.filterLast10': 'Letzte 10',
'stats.filterLast20': 'Letzte 20',
'stats.filterThisYear': 'Dieses Jahr',
'stats.noData': 'Keine Turnierdaten vorhanden',
'stats.cumulativeProfit': 'Kumulativer Gewinn',
'stats.roiTrend': 'ROI pro Turnier',
'stats.cashTrend': 'Cash-Rate Trend',

// EN:
'stats.title': 'Statistics',
'stats.tournaments': 'Tournaments',
'stats.profit': 'Profit',
'stats.roi': 'ROI',
'stats.cashRate': 'Cash Rate',
'stats.tableTab': 'Table',
'stats.trendsTab': 'Trends',
'stats.filterAll': 'All',
'stats.filterLast10': 'Last 10',
'stats.filterLast20': 'Last 20',
'stats.filterThisYear': 'This Year',
'stats.noData': 'No tournament data available',
'stats.cumulativeProfit': 'Cumulative Profit',
'stats.roiTrend': 'ROI per Tournament',
'stats.cashTrend': 'Cash Rate Trend',
```

**Step 8: Run full verification**

```bash
npm run lint && npm run test && npm run build
```

**Step 9: Commit**

```bash
git add src/components/StatsDashboard.tsx src/domain/tournament.ts src/components/AppHeader.tsx src/App.tsx src/i18n/translations.ts tests/logic.test.ts
git commit -m "feat: statistics dashboard with trend charts and time filters"
```

---

### Task 13: Phase 3 Release Commit

Same pattern: lint, test, build, bump version to 7.0.0, update CHANGELOG + README + CLAUDE.md, commit and push.

---

## Verification Checklist

After each phase:
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — all tests pass
- [ ] `npm run build` — production build succeeds
- [ ] Manual smoke test: start tournament, verify new features work
- [ ] Version bumped in package.json
- [ ] CHANGELOG.md updated
- [ ] Git pushed to main
