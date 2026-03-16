# Design: Tournament Event Log (A1) + Break Skip/Extend (A3)

**Date:** 2026-03-16
**Version target:** 6.9.0
**Scope:** Two features sharing a dependency — event log as foundation, break controls as consumer.

---

## Decisions

| Question | Decision |
|----------|----------|
| Event Log UI level | **B — Log-Liste als Modal** im Spielmodus (📋-Button) |
| Break controls scope | **B — Controls + Remote** (Skip + Extend auf Smartphone) |
| Extend increments | **B — Zwei Stufen** (+2 Min, +5 Min) |
| Result integration | **B — Live + Ergebnis** (Log in TournamentResult, TournamentFinished, TournamentHistory) |

---

## Feature A1: Tournament Event Log

### Existing Infrastructure (~60% complete)

- `TournamentEventType` enum: 19 event types including `break_extended`, `break_skipped`
- `TournamentEvent` interface: `{ id, type, timestamp, levelIndex, data }`
- `tournamentEvents.ts`: `createEvent()`, `formatEventAsText()`, filter helpers
- `useTournamentEventLog` hook: manages event state, auto-creates events for mode/timer/level transitions
- `useTournamentActions`: each action calls `onAppendEvent(createEvent(...))` with action-specific data
- IndexedDB `events` store (keyPath: `id`, retention: 1000 entries)
- `TournamentResult.events?: TournamentEvent[]` — optional field exists
- `TournamentCheckpoint.events?: TournamentEvent[]` — optional field exists

### New Component: `EventLog.tsx`

- **Size estimate:** ~250 lines, lazy-loaded
- **Trigger:** 📋-Button in game-mode header (next to 📡 ShareHub)
- **Layout:** Modal/BottomSheet with chronological event list (newest first)
- **Each row:** Relative timestamp ("vor 12 Min") + emoji + event text + level badge
- **Filter:** Segmented toggle — All / Players (elimination, rebuy, add-on) / Timer (level, break, skip/extend)
- **Footer:** "Text kopieren" button → `formatEventAsText()` (WhatsApp-friendly)
- **Empty state:** Subtle hint "Noch keine Events" at tournament start

### Result Integration

- `buildTournamentResult()` in `tournament.ts`: populate `events` field from current event state
- `TournamentFinished.tsx`: New tab "Verlauf" alongside standings
- `TournamentHistory.tsx`: Events as expandable subsection in tournament entry
- `formatResultAsText()`: Append event summary (X eliminations, Y rebuys, duration)

### Translation Keys (~12 new)

```
eventLog.title, eventLog.all, eventLog.players, eventLog.timer,
eventLog.empty, eventLog.copyText, eventLog.copied,
finished.tabStandings, finished.tabLog, eventLog.summary,
eventLog.agoMinutes, eventLog.agoSeconds
```

---

## Feature A3: Break Skip/Extend

### Existing Infrastructure (~40% complete)

- `useTimer` hook: `extendLevel(additionalSeconds)` method works for breaks and play levels
- `remote.ts`: `skipBreak` and `extendBreak` in `SUPPORTED_COMMANDS` (handlers empty)
- `RemoteState.isBreak` field exists (not populated)
- Event types `break_skipped` and `break_extended` defined in enum (never fired)

### Timer Extension

- `skipBreak()`: new method in `useTimer` — calls `nextLevel()` internally, fires `break_skipped` event
- `extendLevel()`: already exists — called with `+120s` or `+300s`

### UI: Controls Component

Two buttons appear **only when `currentLevel.type === 'break'`**:

- **⏭ Skip** — Amber button, skips break immediately → next play level. Shows confirm dialog (skip is irreversible).
- **+2 / +5** — Two compact buttons side by side, extend break duration

### Remote Control

- `RemoteControl.tsx` controller UI: Same two buttons when `isBreak === true`
- `remote.ts`: Implement handlers for `skipBreak` and `extendBreak` commands
- `RemoteState.isBreak`: Populate from `levels[currentLevelIndex]?.type === 'break'`

### Voice Announcements

- **Skip:** `announceBreakSkipped(t)` — "Pause übersprungen" / "Break skipped" (Speech API fallback)
- **Extend:** `announceBreakExtended(minutes, t)` — "Pause verlängert um 5 Minuten" / "Break extended by 5 minutes"

### Events

- `break_skipped` with data: `{ originalDuration, remainingAtSkip }`
- `break_extended` with data: `{ addedSeconds }`

### Translation Keys (~10 new)

```
controls.skipBreak, controls.extendBreak2, controls.extendBreak5,
controls.confirmSkipBreak, voice.breakSkipped, voice.breakExtended,
remote.skipBreak, remote.extendBreak, event.breakSkipped, event.breakExtended
```

---

## Dependency Graph

```
A3 (Break Skip/Extend) ──fires──▶ A1 (Event Log Domain)
                                     ▲
                                     │ displays
                                     │
                              EventLog.tsx Modal
```

**Implementation order:**
1. A1 domain — event formatting, result integration
2. A3 domain — timer skipBreak(), voice announcements
3. A1 UI — EventLog.tsx modal
4. A3 UI — Controls break buttons + Remote handlers
5. Integration — wire everything, tests

---

## Files to Create

| File | Est. Lines | Purpose |
|------|-----------|---------|
| `src/components/EventLog.tsx` | ~250 | Event log modal |

## Files to Modify

| File | Changes |
|------|---------|
| `src/domain/tournamentEvents.ts` | i18n for event formatting, summary function |
| `src/domain/tournament.ts` | `buildTournamentResult()` includes events |
| `src/domain/speech.ts` | `announceBreakSkipped()`, `announceBreakExtended()` |
| `src/hooks/useTimer.ts` | `skipBreak()` method |
| `src/hooks/useTournamentActions.ts` | Break skip/extend action callbacks |
| `src/hooks/useTournamentEventLog.ts` | Break events dispatch |
| `src/components/Controls.tsx` | Conditional break buttons |
| `src/components/RemoteControl.tsx` | Break buttons on controller |
| `src/components/TournamentFinished.tsx` | Event log tab |
| `src/components/TournamentHistory.tsx` | Event subsection |
| `src/components/modes/GameModeContainer.tsx` | Pass events + onAppendEvent |
| `src/components/AppHeader.tsx` | 📋 button |
| `src/domain/remote.ts` | skipBreak/extendBreak handlers, isBreak state |
| `src/hooks/useRemoteHostBridge.ts` | Break state broadcast |
| `src/i18n/translations.ts` | ~22 new keys (DE + EN) |
| `src/App.tsx` | EventLog lazy import, showEventLog state |
| `tests/logic.test.ts` | Event formatting, skipBreak, extend tests |
| `tests/components.test.tsx` | EventLog component tests |

## Estimated Effort

- **A1 Domain + Result integration:** ~2h
- **A3 Domain (timer, voice, remote):** ~2h
- **A1 UI (EventLog.tsx):** ~1.5h
- **A3 UI (Controls + Remote):** ~1.5h
- **Tests:** ~1h
- **Total:** ~8h
