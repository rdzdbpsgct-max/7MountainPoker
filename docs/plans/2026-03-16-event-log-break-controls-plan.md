# Event Log UI + Break Controls Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a tournament event log modal (📋) in game mode and polish the existing break skip/extend feature (voice announcements, +2/+5 min increments, confirm dialog).

**Architecture:** Both features build on existing infrastructure. The event log domain logic, hooks, storage, and action dispatching are complete — only the UI component and result display are new. Break controls are already wired end-to-end (Controls, Remote, App.tsx) — only voice announcements and increment adjustments needed.

**Tech Stack:** React 19, TypeScript strict, Tailwind CSS 4, Vitest

---

## Pre-flight Check

Before starting, verify the existing codebase compiles and tests pass:

```bash
npm run lint && npm run test && npm run build
```

Expected: 0 errors, 1156+ tests pass, build succeeds.

---

### Task 1: Adjust Break Extend Increments (+2/+5 min instead of +5/+10)

**Files:**
- Modify: `src/components/Controls.tsx:117,124` (change 300→120, 600→300)
- Modify: `src/components/RemoteControl.tsx:450,457` (change 300→120, 600→300)
- Modify: `src/i18n/translations.ts` (rename keys)
- Modify: `tests/controls.test.tsx` (update if existing tests reference old values)

**Step 1: Update Controls.tsx — change extend values and keys**

In `src/components/Controls.tsx`, change the two extend button `onClick` handlers:

```tsx
// Line 117: change 300 → 120
onClick={() => onExtendBreak(120)}
// Line 118-119: change title and label keys
title={t('controls.extendBreak2')}
{t('controls.extendBreak2')}

// Line 124: change 600 → 300
onClick={() => onExtendBreak(300)}
// Line 125-126: keep existing keys
title={t('controls.extendBreak5')}
{t('controls.extendBreak5')}
```

**Step 2: Update RemoteControl.tsx — same changes**

In `src/components/RemoteControl.tsx`:

```tsx
// Line 450: change 300 → 120
onClick={() => sendCmd('extendBreak', { seconds: 120 })}
// Line 452-454: update key to extendBreak2
title={t('controls.extendBreak2')}
{t('controls.extendBreak2')}

// Line 457: change 600 → 300
onClick={() => sendCmd('extendBreak', { seconds: 300 })}
// Lines 459-461: keep extendBreak5
```

**Step 3: Update translation keys**

In `src/i18n/translations.ts`, replace the extend keys:

```typescript
// DE section (~line 101-103):
'controls.extendBreak2': '+2 Min',
'controls.extendBreak5': '+5 Min',
// Remove: 'controls.extendBreak10'

// EN section (~line 1396-1398):
'controls.extendBreak2': '+2 min',
'controls.extendBreak5': '+5 min',
// Remove: 'controls.extendBreak10'
```

**Step 4: Run tests**

```bash
npm run test
```

Expected: All tests pass. If any controls tests reference `extendBreak10`, update them.

**Step 5: Commit**

```bash
git add src/components/Controls.tsx src/components/RemoteControl.tsx src/i18n/translations.ts
git commit -m "feat: change break extend increments to +2/+5 minutes"
```

---

### Task 2: Add Break Voice Announcements

**Files:**
- Modify: `src/domain/speech.ts` (add `announceBreakSkipped`, `announceBreakExtended`)
- Modify: `src/i18n/translations.ts` (add voice keys)
- Modify: `src/App.tsx` (call announcements from handlers)
- Test: `tests/sound-speech.test.ts` (add tests)

**Step 1: Write failing tests**

In `tests/sound-speech.test.ts`, add at the end of the speech tests section:

```typescript
describe('announceBreakSkipped', () => {
  it('should enqueue speech for break skipped', () => {
    const { announceBreakSkipped } = require('../src/domain/speech');
    announceBreakSkipped(mockT);
    expect(mockT).toHaveBeenCalledWith('voice.breakSkipped');
  });
});

describe('announceBreakExtended', () => {
  it('should enqueue speech for break extended with minutes', () => {
    const { announceBreakExtended } = require('../src/domain/speech');
    announceBreakExtended(5, mockT);
    expect(mockT).toHaveBeenCalledWith('voice.breakExtended', { minutes: 5 });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/sound-speech.test.ts
```

Expected: FAIL — `announceBreakSkipped` and `announceBreakExtended` not found in exports.

**Step 3: Implement voice functions**

In `src/domain/speech.ts`, add after the `announceBreakOver` function (~line 352):

```typescript
/** Break skipped — "Break skipped" / "Pause übersprungen" */
export function announceBreakSkipped(t: TranslateFn): void {
  enqueue({ mode: 'speech', text: t('voice.breakSkipped') });
}

/** Break extended — "Break extended by 5 minutes" / "Pause um 5 Minuten verlängert" */
export function announceBreakExtended(minutes: number, t: TranslateFn): void {
  enqueue({ mode: 'speech', text: t('voice.breakExtended', { minutes }) });
}
```

**Step 4: Add translation keys**

In `src/i18n/translations.ts`:

```typescript
// DE section (after existing voice keys):
'voice.breakSkipped': 'Pause übersprungen',
'voice.breakExtended': 'Pause verlängert um {minutes} Minuten',

// EN section:
'voice.breakSkipped': 'Break skipped',
'voice.breakExtended': 'Break extended by {minutes} minutes',
```

**Step 5: Add barrel export**

In `src/domain/logic.ts`, verify `announceBreakSkipped` and `announceBreakExtended` are exported from `speech.ts`. Since `logic.ts` re-exports from speech.ts, check the export pattern:

```typescript
// In logic.ts — should already have:
export { ... } from './speech';
// Add announceBreakSkipped, announceBreakExtended to the export list
```

**Step 6: Wire announcements into App.tsx handlers**

In `src/App.tsx`, update `handleSkipBreak` and `handleExtendBreak` (~lines 444-452):

```typescript
const handleSkipBreak = useCallback(() => {
  timer.nextLevel();
  handleAppendEvent(createEvent('break_skipped', timer.timerState.currentLevelIndex, {}));
  if (settings.voiceEnabled) {
    announceBreakSkipped(t);
  }
}, [timer, handleAppendEvent, settings.voiceEnabled, t]);

const handleExtendBreak = useCallback((seconds: number) => {
  timer.extendLevel(seconds);
  handleAppendEvent(createEvent('break_extended', timer.timerState.currentLevelIndex, { seconds }));
  if (settings.voiceEnabled) {
    announceBreakExtended(Math.round(seconds / 60), t);
  }
}, [timer, handleAppendEvent, settings.voiceEnabled, t]);
```

Add imports at the top of App.tsx:
```typescript
import { announceBreakSkipped, announceBreakExtended } from './domain/logic';
```

**Step 7: Run tests**

```bash
npm run test
```

Expected: All tests pass including new speech tests.

**Step 8: Commit**

```bash
git add src/domain/speech.ts src/domain/logic.ts src/App.tsx src/i18n/translations.ts tests/sound-speech.test.ts
git commit -m "feat: add voice announcements for break skip and extend"
```

---

### Task 3: Add i18n for Event Formatting

**Files:**
- Modify: `src/domain/tournamentEvents.ts` (accept `t` function, use i18n keys)
- Modify: `src/i18n/translations.ts` (add event format keys)
- Test: `tests/logic.test.ts` (update existing formatEventAsText tests)

**Step 1: Write failing test**

In `tests/logic.test.ts`, find the existing `formatEventAsText` tests and add:

```typescript
describe('formatEventAsText with i18n', () => {
  const mockT = (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'event.playerEliminated': '❌ {name} eliminated{eliminator}{placement}',
      'event.rebuyTaken': '🔄 {name} Rebuy',
      'event.breakSkipped': '⏭ Break skipped',
      'event.breakExtended': '☕ Break extended (+{seconds}s)',
      'event.tournamentStarted': '🃏 Tournament started',
    };
    let text = translations[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  };

  it('formats elimination with i18n', () => {
    const event = createEvent('player_eliminated', 0, { playerId: 'p1', placement: 3 });
    const result = formatEventAsText(event, { p1: 'Alice' }, mockT);
    expect(result).toContain('Alice');
    expect(result).toContain('❌');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- tests/logic.test.ts -t "formatEventAsText with i18n"
```

Expected: FAIL — `formatEventAsText` does not accept a third parameter.

**Step 3: Update formatEventAsText to accept optional `t` function**

In `src/domain/tournamentEvents.ts`, update the signature and add i18n support while keeping backward compatibility:

```typescript
type TranslateFn = (key: string, params?: Record<string, unknown>) => string;

export function formatEventAsText(
  event: TournamentEvent,
  playerNameMap: Record<string, string>,
  t?: TranslateFn,
): string {
  const time = formatEventTimestamp(event.timestamp);
  const playerName = (id: unknown) =>
    typeof id === 'string' ? (playerNameMap[id] ?? id) : String(id ?? '');

  // Without t, use hardcoded German (backward compatible)
  if (!t) {
    // ... keep existing switch/case as-is
  }

  // With t, use i18n keys
  switch (event.type) {
    case 'player_eliminated': {
      const name = playerName(event.data.playerId);
      const eliminator = event.data.eliminatorId
        ? ` (${t('event.by')} ${playerName(event.data.eliminatorId)})`
        : '';
      const placement = event.data.placement != null
        ? ` → ${t('event.place')} ${event.data.placement}`
        : '';
      return `${time} ${t('event.playerEliminated', { name, eliminator, placement })}`;
    }
    case 'rebuy_taken':
      return `${time} ${t('event.rebuyTaken', { name: playerName(event.data.playerId) })}`;
    case 'addon_taken':
      return `${time} ${t('event.addonTaken', { name: playerName(event.data.playerId) })}`;
    case 'level_start':
      return `${time} ${t('event.levelStart', { level: typeof event.data.levelNumber === 'number' ? event.data.levelNumber : event.levelIndex + 1 })}`;
    case 'timer_paused':
      return `${time} ${t('event.timerPaused')}`;
    case 'timer_resumed':
      return `${time} ${t('event.timerResumed')}`;
    case 'break_extended':
      return `${time} ${t('event.breakExtended', { seconds: event.data.seconds ?? 0 })}`;
    case 'break_skipped':
      return `${time} ${t('event.breakSkipped')}`;
    case 'tournament_started':
      return `${time} ${t('event.tournamentStarted')}`;
    case 'tournament_finished':
      return `${time} ${t('event.tournamentFinished')}`;
    case 'player_reinstated':
      return `${time} ${t('event.playerReinstated', { name: playerName(event.data.playerId) })}`;
    case 'late_registration':
      return `${time} ${t('event.lateRegistration', { name: playerName(event.data.playerId) })}`;
    case 're_entry':
      return `${time} ${t('event.reEntry', { name: playerName(event.data.playerId) })}`;
    case 'dealer_advanced':
      return `${time} ${t('event.dealerAdvanced')}`;
    case 'table_move':
      return `${time} ${t('event.tableMove', { name: playerName(event.data.playerId) })}`;
    case 'table_dissolved':
      return `${time} ${t('event.tableDissolved', { table: event.data.tableNumber ?? '' })}`;
    case 'call_the_clock_started':
      return `${time} ${t('event.callTheClockStarted')}`;
    case 'call_the_clock_expired':
      return `${time} ${t('event.callTheClockExpired')}`;
    case 'level_skip_forward':
      return `${time} ${t('event.levelSkipForward')}`;
    case 'level_skip_backward':
      return `${time} ${t('event.levelSkipBackward')}`;
    default:
      return `${time} ${event.type}`;
  }
}
```

**Step 4: Add translation keys (~19 per language)**

In `src/i18n/translations.ts`:

```typescript
// DE:
'event.playerEliminated': '❌ {name} ausgeschieden{eliminator}{placement}',
'event.by': 'von',
'event.place': 'Platz',
'event.rebuyTaken': '🔄 {name} Rebuy',
'event.addonTaken': '➕ {name} Add-On',
'event.levelStart': '▶ Level {level} gestartet',
'event.timerPaused': '⏸ Timer pausiert',
'event.timerResumed': '▶ Timer fortgesetzt',
'event.breakExtended': '☕ Pause verlängert (+{seconds}s)',
'event.breakSkipped': '⏭ Pause übersprungen',
'event.tournamentStarted': '🃏 Turnier gestartet',
'event.tournamentFinished': '🏆 Turnier beendet',
'event.playerReinstated': '↩ {name} zurück im Turnier',
'event.lateRegistration': '📝 {name} nachgemeldet',
'event.reEntry': '🔁 {name} Re-Entry',
'event.dealerAdvanced': '🎯 Dealer weitergerückt',
'event.tableMove': '🔀 {name} Tischwechsel',
'event.tableDissolved': '🚫 Tisch {table} aufgelöst',
'event.callTheClockStarted': '⏱ Call the Clock gestartet',
'event.callTheClockExpired': '⏱ Call the Clock abgelaufen',
'event.levelSkipForward': '⏩ Level vorgesprungen',
'event.levelSkipBackward': '⏪ Level zurückgesprungen',

// EN (same keys, English text):
'event.playerEliminated': '❌ {name} eliminated{eliminator}{placement}',
'event.by': 'by',
'event.place': 'Place',
// ... (all 22 keys)
```

**Step 5: Run tests**

```bash
npm run test
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add src/domain/tournamentEvents.ts src/i18n/translations.ts tests/logic.test.ts
git commit -m "feat: add i18n support to event formatting"
```

---

### Task 4: Create EventLog Modal Component

**Files:**
- Create: `src/components/EventLog.tsx`
- Test: `tests/components.test.tsx` (add EventLog tests)

**Step 1: Write failing test**

In `tests/components.test.tsx`, add:

```typescript
describe('EventLog', () => {
  it('renders empty state when no events', async () => {
    const { EventLog } = await import('../src/components/EventLog');
    render(<EventLog events={[]} players={[]} onClose={() => {}} />);
    expect(screen.getByText(/keine Events|no events/i)).toBeTruthy();
  });

  it('renders event list', async () => {
    const { EventLog } = await import('../src/components/EventLog');
    const events = [
      { id: 'e1', type: 'tournament_started' as const, timestamp: Date.now(), levelIndex: 0, data: {} },
      { id: 'e2', type: 'player_eliminated' as const, timestamp: Date.now(), levelIndex: 2, data: { playerId: 'p1', placement: 3 } },
    ];
    const players = [{ id: 'p1', name: 'Alice', status: 'eliminated' as const, placement: 3, rebuys: 0, addOn: false, knockouts: 0, seatNumber: 1 }];
    render(<EventLog events={events} players={players} onClose={() => {}} />);
    expect(screen.getByText(/Alice/)).toBeTruthy();
  });

  it('filters by player events', async () => {
    const { EventLog } = await import('../src/components/EventLog');
    const events = [
      { id: 'e1', type: 'tournament_started' as const, timestamp: Date.now(), levelIndex: 0, data: {} },
      { id: 'e2', type: 'player_eliminated' as const, timestamp: Date.now(), levelIndex: 2, data: { playerId: 'p1', placement: 3 } },
    ];
    const players = [{ id: 'p1', name: 'Alice', status: 'eliminated' as const, placement: 3, rebuys: 0, addOn: false, knockouts: 0, seatNumber: 1 }];
    render(<EventLog events={events} players={players} onClose={() => {}} />);
    // Click player filter
    const playerFilter = screen.getByText(/spieler|players/i);
    fireEvent.click(playerFilter);
    // Tournament started should be filtered out
    expect(screen.queryByText(/gestartet|started/i)).toBeFalsy();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- tests/components.test.tsx -t "EventLog"
```

Expected: FAIL — module not found.

**Step 3: Implement EventLog.tsx**

Create `src/components/EventLog.tsx` (~250 lines):

```tsx
import { useState, useMemo, useCallback } from 'react';
import type { TournamentEvent, Player } from '../domain/types';
import { formatEventAsText, formatEventTimestamp } from '../domain/logic';
import { useTranslation } from '../i18n';
import { showToast } from '../domain/toast';

type Filter = 'all' | 'players' | 'timer';

const PLAYER_EVENT_TYPES = new Set([
  'player_eliminated', 'rebuy_taken', 'addon_taken',
  'player_reinstated', 'late_registration', 're_entry',
]);

const TIMER_EVENT_TYPES = new Set([
  'level_start', 'timer_paused', 'timer_resumed',
  'break_extended', 'break_skipped', 'level_skip_forward', 'level_skip_backward',
  'tournament_started', 'tournament_finished',
]);

interface Props {
  events: TournamentEvent[];
  players: Player[];
  onClose: () => void;
  tournamentStartTime?: number;
}

export function EventLog({ events, players, onClose, tournamentStartTime }: Props) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');

  const playerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of players) {
      map[p.id] = p.name;
    }
    return map;
  }, [players]);

  const filteredEvents = useMemo(() => {
    const sorted = [...events].reverse(); // newest first
    if (filter === 'all') return sorted;
    if (filter === 'players') return sorted.filter(e => PLAYER_EVENT_TYPES.has(e.type));
    return sorted.filter(e => TIMER_EVENT_TYPES.has(e.type));
  }, [events, filter]);

  const formatRelativeTime = useCallback((timestamp: number) => {
    const ref = tournamentStartTime ?? (events.length > 0 ? events[0].timestamp : Date.now());
    const diffSec = Math.round((timestamp - ref) / 1000);
    if (diffSec < 60) return t('eventLog.agoSeconds', { n: Math.max(0, diffSec) });
    return t('eventLog.agoMinutes', { n: Math.round(diffSec / 60) });
  }, [tournamentStartTime, events, t]);

  const handleCopyText = useCallback(() => {
    const text = [...events]
      .map(e => formatEventAsText(e, playerNameMap, t))
      .join('\n');
    navigator.clipboard.writeText(text).then(
      () => showToast(t('eventLog.copied'), 'success'),
      () => showToast('Copy failed', 'error'),
    );
  }, [events, playerNameMap, t]);

  const filterClasses = (active: boolean) =>
    active
      ? 'text-white font-semibold'
      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
         onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-lg max-h-[85vh] bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col animate-scale-in overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700/40">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {String.fromCodePoint(0x1F4CB)} {t('eventLog.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('eventLog.close')}
          >
            ✕
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex gap-1 px-5 py-3 border-b border-gray-100 dark:border-gray-800/40">
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700/60 text-sm">
            {(['all', 'players', 'timer'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 transition-colors ${filterClasses(filter === f)}`}
                style={filter === f ? { backgroundColor: 'var(--accent-600)' } : undefined}
              >
                {t(`eventLog.${f}`)}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 self-center">
            {filteredEvents.length}
          </span>
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {filteredEvents.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-12 text-sm">
              {t('eventLog.empty')}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {filteredEvents.map(event => (
                <li key={event.id} className="flex items-start gap-3 py-1.5 text-sm border-b border-gray-50 dark:border-gray-800/30 last:border-b-0">
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-mono whitespace-nowrap mt-0.5 min-w-[3.5rem]">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                  <span className="text-gray-800 dark:text-gray-200 leading-snug">
                    {formatEventAsText(event, playerNameMap, t).replace(/^\d{2}:\d{2}:\d{2}\s/, '')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {events.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700/40">
            <button
              onClick={handleCopyText}
              className="w-full py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97] border shadow-sm bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600/40"
            >
              {String.fromCodePoint(0x1F4CB)} {t('eventLog.copyText')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Run tests**

```bash
npm run test -- tests/components.test.tsx -t "EventLog"
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/EventLog.tsx tests/components.test.tsx
git commit -m "feat: add EventLog modal component with filter and copy"
```

---

### Task 5: Add EventLog Translation Keys

**Files:**
- Modify: `src/i18n/translations.ts`

**Step 1: Add all EventLog UI keys**

```typescript
// DE section:
'eventLog.title': 'Turnier-Protokoll',
'eventLog.close': 'Schließen',
'eventLog.all': 'Alle',
'eventLog.players': 'Spieler',
'eventLog.timer': 'Timer',
'eventLog.empty': 'Noch keine Events',
'eventLog.copyText': 'Text kopieren',
'eventLog.copied': 'Protokoll kopiert',
'eventLog.agoMinutes': '+{n} Min',
'eventLog.agoSeconds': '+{n} Sek',
'eventLog.summary': '{eliminations} Eliminations, {rebuys} Rebuys, {duration}',
'finished.tabStandings': 'Ergebnis',
'finished.tabLog': 'Verlauf',

// EN section:
'eventLog.title': 'Tournament Log',
'eventLog.close': 'Close',
'eventLog.all': 'All',
'eventLog.players': 'Players',
'eventLog.timer': 'Timer',
'eventLog.empty': 'No events yet',
'eventLog.copyText': 'Copy text',
'eventLog.copied': 'Log copied',
'eventLog.agoMinutes': '+{n} min',
'eventLog.agoSeconds': '+{n} sec',
'eventLog.summary': '{eliminations} eliminations, {rebuys} rebuys, {duration}',
'finished.tabStandings': 'Results',
'finished.tabLog': 'Log',
```

**Step 2: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

**Step 3: Commit**

```bash
git add src/i18n/translations.ts
git commit -m "feat: add EventLog + event format translation keys (DE/EN)"
```

---

### Task 6: Wire EventLog into App.tsx and AppHeader

**Files:**
- Modify: `src/App.tsx` (add lazy import, state, pass to GameModeContainer)
- Modify: `src/components/AppHeader.tsx` (add 📋 button prop and rendering)
- Modify: `src/components/modes/GameModeContainer.tsx` (accept + render EventLog)

**Step 1: Add AppHeader prop and button**

In `src/components/AppHeader.tsx`:

Add to Props interface:
```typescript
onShowEventLog?: () => void;
```

Add to destructured props.

Add 📋 button in the game-mode button section (after 📡 ShareHub, before 📱 Remote):

```tsx
{mode === 'game' && !tournamentFinished && onShowEventLog && (
  <button
    onClick={onShowEventLog}
    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border border-gray-300 dark:border-gray-700/60 hover:border-gray-400 dark:hover:border-gray-600 bg-white/80 dark:bg-gray-800/60"
    title={t('eventLog.title')}
    aria-label={t('eventLog.title')}
  >
    {String.fromCodePoint(0x1F4CB)}
  </button>
)}
```

**Step 2: Add lazy import + state in App.tsx**

At top of App.tsx with other lazy imports:
```typescript
const EventLog = lazy(() => import('./components/EventLog').then(m => ({ default: m.EventLog })));
```

Add state:
```typescript
const [showEventLog, setShowEventLog] = useState(false);
```

Pass to AppHeader:
```typescript
onShowEventLog={() => setShowEventLog(true)}
```

**Step 3: Pass events and showEventLog to GameModeContainer**

Add to `GameModeActions` interface in `GameModeContainer.tsx`:
```typescript
onToggleEventLog: () => void;
```

Add to `GameModeState` or pass as separate prop:
```typescript
showEventLog: boolean;
tournamentEvents: TournamentEvent[];
```

Render in GameModeContainer:
```tsx
{state.showEventLog && (
  <Suspense fallback={<LoadingFallback />}>
    <EventLog
      events={state.tournamentEvents}
      players={config.players}
      onClose={actions.onToggleEventLog}
    />
  </Suspense>
)}
```

Wire in App.tsx where GameModeContainer is rendered — add to the state/actions objects:
```typescript
showEventLog,
tournamentEvents,
onToggleEventLog: () => setShowEventLog(v => !v),
```

**Step 4: Run lint + build**

```bash
npm run lint && npm run build
```

Expected: 0 errors, build succeeds.

**Step 5: Commit**

```bash
git add src/App.tsx src/components/AppHeader.tsx src/components/modes/GameModeContainer.tsx
git commit -m "feat: wire EventLog modal into game mode with header button"
```

---

### Task 7: Add Event Log Tab to TournamentFinished

**Files:**
- Modify: `src/components/TournamentFinished.tsx` (add tab UI and event list)
- Modify: `src/components/modes/TournamentFinishedContainer.tsx` (pass events)

**Step 1: Add tab state to TournamentFinished**

In `TournamentFinished.tsx`, add to Props:
```typescript
events?: TournamentEvent[];
```

Add state:
```typescript
const [activeTab, setActiveTab] = useState<'standings' | 'log'>('standings');
```

Add tab header buttons above the standings content:
```tsx
{events && events.length > 0 && (
  <div className="flex gap-1 mb-4">
    <button
      onClick={() => setActiveTab('standings')}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        activeTab === 'standings'
          ? 'text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
      }`}
      style={activeTab === 'standings' ? { backgroundColor: 'var(--accent-600)' } : undefined}
    >
      {t('finished.tabStandings')}
    </button>
    <button
      onClick={() => setActiveTab('log')}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        activeTab === 'log'
          ? 'text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
      }`}
      style={activeTab === 'log' ? { backgroundColor: 'var(--accent-600)' } : undefined}
    >
      {t('finished.tabLog')}
    </button>
  </div>
)}
```

Wrap existing standings in conditional:
```tsx
{activeTab === 'standings' && (
  // ... existing standings content
)}
{activeTab === 'log' && events && (
  <div className="space-y-1">
    {events.map(event => (
      <div key={event.id} className="text-sm text-gray-700 dark:text-gray-300 py-1 border-b border-gray-100 dark:border-gray-800/30">
        {formatEventAsText(event, playerNameMap, t)}
      </div>
    ))}
  </div>
)}
```

Build `playerNameMap` from players (same pattern as EventLog.tsx).

**Step 2: Pass events from TournamentFinishedContainer**

In `TournamentFinishedContainer.tsx`, ensure `events` from `tournamentResult?.events` is passed through:
```typescript
events={tournamentResult?.events}
```

**Step 3: Run lint + test + build**

```bash
npm run lint && npm run test && npm run build
```

Expected: All pass.

**Step 4: Commit**

```bash
git add src/components/TournamentFinished.tsx src/components/modes/TournamentFinishedContainer.tsx
git commit -m "feat: add event log tab to tournament finished screen"
```

---

### Task 8: Final Integration Tests

**Files:**
- Modify: `tests/logic.test.ts` (event creation, formatting, filtering tests)
- Modify: `tests/controls.test.tsx` (break button visibility)

**Step 1: Add integration tests**

In `tests/logic.test.ts`:

```typescript
describe('Tournament Event Log integration', () => {
  it('createEvent generates unique IDs', () => {
    const e1 = createEvent('tournament_started', 0, {});
    const e2 = createEvent('level_start', 1, {});
    expect(e1.id).not.toBe(e2.id);
  });

  it('filterEventsByType returns matching events', () => {
    const events = [
      createEvent('tournament_started', 0, {}),
      createEvent('player_eliminated', 2, { playerId: 'p1' }),
      createEvent('rebuy_taken', 3, { playerId: 'p2' }),
      createEvent('player_eliminated', 4, { playerId: 'p3' }),
    ];
    const eliminations = filterEventsByType(events, 'player_eliminated');
    expect(eliminations).toHaveLength(2);
  });

  it('formatEventAsText formats break_extended event', () => {
    const event = createEvent('break_extended', 5, { seconds: 300 });
    const text = formatEventAsText(event, {});
    expect(text).toContain('300');
  });
});
```

In `tests/controls.test.tsx`:

```typescript
describe('Break controls', () => {
  it('renders skip and extend buttons when isBreak is true', () => {
    render(
      <Controls
        timerState={{ status: 'running', remainingSeconds: 120, currentLevelIndex: 3 }}
        onToggleStartPause={() => {}}
        onNext={() => {}}
        onPrevious={() => {}}
        onReset={() => {}}
        onRestart={() => {}}
        isBreak={true}
        onSkipBreak={() => {}}
        onExtendBreak={() => {}}
      />
    );
    expect(screen.getByTitle(/skip|überspringen/i)).toBeTruthy();
    expect(screen.getByTitle(/\+2/)).toBeTruthy();
    expect(screen.getByTitle(/\+5/)).toBeTruthy();
  });

  it('does not render break buttons when isBreak is false', () => {
    render(
      <Controls
        timerState={{ status: 'running', remainingSeconds: 120, currentLevelIndex: 3 }}
        onToggleStartPause={() => {}}
        onNext={() => {}}
        onPrevious={() => {}}
        onReset={() => {}}
        onRestart={() => {}}
        isBreak={false}
      />
    );
    expect(screen.queryByTitle(/skip|überspringen/i)).toBeFalsy();
  });
});
```

**Step 2: Run all tests**

```bash
npm run test
```

Expected: All tests pass (1156+ existing + ~12 new).

**Step 3: Run lint + build**

```bash
npm run lint && npm run build
```

Expected: 0 errors, build succeeds.

**Step 4: Commit**

```bash
git add tests/logic.test.ts tests/controls.test.tsx
git commit -m "test: add event log and break control integration tests"
```

---

### Task 9: Update Documentation

**Files:**
- Modify: `CLAUDE.md` (update version, test counts, new files, features)
- Modify: `CHANGELOG.md` (add v6.9.0 entry)

**Step 1: Update CLAUDE.md**

- Add `EventLog.tsx` to Project Structure under `components/`
- Add `eventLog.*` and `event.*` to Translation Keys section
- Add `announceBreakSkipped()` and `announceBreakExtended()` to Speech section
- Update test count
- Update version to 6.9.0

**Step 2: Update CHANGELOG.md**

Add v6.9.0 entry at the top:

```markdown
### v6.9.0 — Tournament Event Log & Break Controls Polish

- **Turnier-Protokoll (Event Log)**: Neues 📋 Modal im Spielmodus zeigt chronologisches Turnier-Protokoll. Drei Filter (Alle/Spieler/Timer), relative Zeitstempel, Text-Export (WhatsApp). Events in TournamentResult gespeichert, "Verlauf"-Tab auf Ergebnis-Screen. ~250 Zeilen, lazy-loaded.
- **Break Skip/Extend**: Pausen-Buttons in Controls + Remote Control. +2 Min / +5 Min Verlängerung, Überspringen mit Bestätigung. Sprachansagen (`announceBreakSkipped`, `announceBreakExtended`). Events: `break_skipped`, `break_extended`.
- **Event-Formatierung i18n**: Alle 22 Event-Typen bilingual (DE/EN) statt hardkodiertem Deutsch.
- **Neue Datei**: `src/components/EventLog.tsx`
- **~50 neue Translation-Keys** (25 DE + 25 EN)
- **~12 neue Tests** — **XXXX Tests gesamt**
```

**Step 3: Commit**

```bash
git add CLAUDE.md CHANGELOG.md
git commit -m "docs: v6.9.0 — Event Log + Break Controls documentation"
```

---

## Summary

| Task | Description | Est. Time |
|------|------------|-----------|
| 1 | Break extend +2/+5 min | 5 min |
| 2 | Break voice announcements | 15 min |
| 3 | Event formatting i18n | 20 min |
| 4 | EventLog modal component | 30 min |
| 5 | EventLog translation keys | 5 min |
| 6 | Wire EventLog into App/Header | 20 min |
| 7 | Event log tab in TournamentFinished | 15 min |
| 8 | Integration tests | 15 min |
| 9 | Documentation update | 10 min |
| **Total** | | **~2.5h** |
