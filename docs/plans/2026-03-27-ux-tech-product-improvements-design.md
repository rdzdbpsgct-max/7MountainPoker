# UX, Tech & Product Improvements — Design Document

**Date:** 2026-03-27
**Version:** 6.12.1 → 6.13.0+
**Approach:** Phased by effort (Quick Wins → Medium → Large)

---

## Phase 1: Quick Wins

### #2 Undo-Toast Feedback

**Problem:** Undo/Redo shows action name only in button tooltip — no visible confirmation.

**Design:**
- In `useTournamentActions.ts`: after successful `handleUndo`/`handleRedo`, call `showToast(t(actionKey))` with the label from `undoStack.undoLabel`/`redoLabel`.
- Empty stack = no toast (button already disabled).
- Toast format: "Ruckgangig: {action}" / "Wiederholt: {action}"

**i18n:** 2 keys — `toast.undone`, `toast.redone`
**Files:** `useTournamentActions.ts`, `translations.ts`
**Effort:** ~30min

---

### #6 Service Worker Update Banner

**Problem:** PWA auto-updates silently — users don't know when a new version is available.

**Design:**
- Change `vite.config.ts` PWA `registerType` from `'autoUpdate'` to `'prompt'`.
- In `main.tsx`: `registerSW({ onNeedRefresh })` callback sets `updateAvailable` state.
- Persistent amber banner at top of app: "Neue Version verfugbar" + "Jetzt aktualisieren" button.
- If tournament is running: banner stays, no auto-reload — manual only.
- Dismiss button hides banner until next version.

**i18n:** 3 keys — `app.updateAvailable`, `app.updateNow`, `app.updateDismiss`
**Files:** `vite.config.ts`, `main.tsx`, `App.tsx`, `translations.ts`
**Effort:** ~1h

---

### #7 Remote Reconnect State-Sync

**Problem:** When Remote Control reconnects after disconnect, controller shows stale state until next host broadcast.

**Design:**
- New command type `'requestState'` in `RemoteCommand`.
- `RemoteHost.handleCommand()`: on `requestState`, immediately broadcast current `RemoteState` to requesting peer.
- `RemoteController`: after successful reconnect (`connection.on('open')` in reconnect path), auto-send `{ type: 'requestState' }`.
- Controller toast: "Verbindung wiederhergestellt".

**i18n:** 2 keys — `remote.reconnected`, `remote.syncing`
**Files:** `remote.ts`, `useRemoteControl.ts`, `translations.ts`
**Effort:** ~1h

---

## Phase 2: Medium

### #1 Feature Discovery / "What's New"

**Problem:** SetupWizard runs only once — returning users have no way to discover new features (Deal-Making, Series, Liga).

**Design:**
- `localStorage` key `poker-timer-last-version` stores last seen app version.
- At app start: compare with current version via `VITE_APP_VERSION` env var (injected in `vite.config.ts` via `define`).
- On mismatch: show "What's New" modal with feature highlights.
- New module `src/domain/whatsNew.ts`: array of `{ version, features: { key, icon }[] }`. Each feature line is an i18n key. Show only last 3 versions.
- Discovery badges on `SetupPage.tsx`: sections with new features get a pulsing accent dot. Badge disappears after first section open (via `markFeatureDiscovered()`).

**i18n:** ~10 keys — `whatsNew.title`, `whatsNew.dismiss`, plus per-feature highlights
**Files:** `whatsNew.ts` (new), `App.tsx`, `SetupPage.tsx`, `translations.ts`
**Effort:** ~3h

---

### #3 Drag & Drop Blind Levels

**Problem:** Level order in ConfigEditor changeable only via up/down buttons — not intuitive.

**Design:**
- Custom Pointer Events approach (no external dependency, matches existing ScrubSlider pattern).
- Drag handle: grip icon (6-dot) left of each level row. `onPointerDown` starts drag.
- `onPointerMove` calculates Y-offset, renders ghost element (absolute-positioned row clone with reduced opacity).
- `onPointerUp` determines target index via element height calculation, calls `reorderLevel(fromIndex, toIndex)`.
- Drop zone: accent-colored line between rows during hover.
- `touch-action: none` on handle, `setPointerCapture()` for drag outside element bounds.
- Up/Down buttons remain as fallback for keyboard/accessibility users.
- New function: `reorderLevel(from, to)` — array splice + state update.

**Files:** `ConfigEditor.tsx`
**Effort:** ~3h

---

### #4 Audio Category Toggles

**Problem:** Single master volume — users can't disable countdown beeps without losing voice announcements.

**Design:**
- Extend `Settings` interface: `audioCategories?: { voice: boolean, effects: boolean, countdown: boolean, alerts: boolean }`. Default: all `true`. Backward-compatible (undefined = all on).
- Category mapping:
  - `voice`: all `announce*()` functions in `speech.ts`
  - `effects`: oscillator sounds in `sounds.ts` (victory, bubble, ITM)
  - `countdown`: verbal countdown + countdown beeps
  - `alerts`: custom alert announcements
- Each function checks its category flag before playing.
- UI: 4 CheckBox toggles below volume slider in SettingsPanel Audio section. Only visible when `soundEnabled = true`.

**i18n:** 4 keys — `settings.audioVoice`, `settings.audioEffects`, `settings.audioCountdown`, `settings.audioAlerts`
**Files:** `types.ts`, `speech.ts`, `sounds.ts`, `audioService.ts`, `SettingsPanel.tsx`, `translations.ts`
**Effort:** ~2h

---

### #10 Export Formats

**Problem:** No standard poker formats — can't import results into Hendon Mob or share blind structures.

**Design:**
- **Hendon Mob CSV:** `formatResultAsHendonMobCSV(result)` in `tournament.ts`. Columns: `Event,Date,Place,Prize,Entries,Buy-In`. UTF-8 BOM for Excel.
- **Blind Structure CSV:** `formatBlindStructureAsCSV(levels)` in `blinds.ts`. Columns: `Level,Small Blind,Big Blind,Ante,Duration (min),Type`. Break levels as `Type: "Break"`.
- **Localized text export:** `formatResultAsText(result, t)` — pass `t` function from `TournamentFinished.tsx` (parameter already exists but not used). English output when `language === 'en'`.
- UI: Export dropdown in `TournamentFinished.tsx` gets "Hendon Mob CSV" option. "Export Blindstruktur" button on `SetupPage.tsx` next to Print.

**Files:** `tournament.ts`, `blinds.ts`, `TournamentFinished.tsx`, `SetupPage.tsx`, `translations.ts`
**Effort:** ~2h

---

## Phase 3: Large

### #5 React Compiler

**Problem:** 426 manual `useMemo`/`useCallback` calls — compiler can auto-optimize most of them.

**Design:**
- Install `babel-plugin-react-compiler` as devDependency.
- Configure in `vite.config.ts` → `@vitejs/plugin-react` babel plugins: `[['babel-plugin-react-compiler', {}]]`.
- Install `eslint-plugin-react-compiler`, add rule `react-compiler/react-compiler: 'warn'` to `eslint.config.js`.
- Keep all manual memos (compiler handles double-memoization gracefully).
- Validate: build, lint (check compiler warnings), run all 1381 tests.
- No manual memo cleanup in this step — incremental removal in future PRs.

**Files:** `package.json`, `vite.config.ts`, `eslint.config.js`
**Effort:** ~2h

---

### #8 Multi-Device Roles

**Problem:** All remote controllers have equal privileges — no distinction between admin and viewer.

**Design:**
- `RemoteRole = 'admin' | 'viewer'` type in `types.ts`.
- `HelloMessage` extended with `role?: RemoteRole`. Default: `'admin'` (backward-compatible).
- Host-side validation: `RemoteHost.handleCommand()` checks sender role. `viewer` may only send `requestState` — all other commands ignored with `console.warn`. Role stored in `connectedControllers: Map<string, { conn, role }>`.
- Controller UI: QR URL gets optional `&role=viewer` parameter. Default QR = admin. Second QR in ShareHub: "Viewer Link" with restricted rights. Viewer controller shows timer + players read-only, no action buttons.
- Audit: `lastCommandSource` (peer ID prefix) shown in toast for remote actions: "Spieler eliminiert (Remote)".

**i18n:** 6 keys — `remote.roleAdmin`, `remote.roleViewer`, `remote.viewerLink`, `remote.actionDenied`, `remote.commandFrom`, `remote.viewerMode`
**Files:** `types.ts`, `remote.ts`, `RemoteControl.tsx`, `ShareHub.tsx`, `translations.ts`
**Effort:** ~4h

---

### #9 Statistics Dashboard

**Problem:** Player stats hidden inside History modal — not discoverable, no trends.

**Design:**
- New component `StatsDashboard.tsx` (~400 lines, lazy-loaded). Accessible via chart-icon button in `AppHeader` (all modes).
- Top section: 4 metric cards — tournaments played, total profit, ROI%, cash rate.
- Bottom section: 2 tabs:
  - "Tabelle": sortable player stats table from `computePlayerStats()`.
  - "Trends": SVG line charts reusing `LeagueCharts.tsx` pattern (10-color palette, player toggles). 3 chart types: cumulative profit, per-tournament ROI, cash rate trend.
- Data from `TournamentResult[]` via `loadTournamentHistory()`.
- Time filter: segmented toggle — "Alle", "Letzte 10", "Letzte 20", "Dieses Jahr".
- New domain function: `computePlayerTrends(history, playerName)` in `tournament.ts` — returns `{ date, profit, roi, cashed }[]` for chart data.

**i18n:** ~15 keys — `stats.title`, `stats.tournaments`, `stats.profit`, `stats.roi`, `stats.cashRate`, `stats.tableTab`, `stats.trendsTab`, `stats.filterAll`, `stats.filterLast10`, `stats.filterLast20`, `stats.filterThisYear`, `stats.noData`, etc.
**Files:** `StatsDashboard.tsx` (new), `tournament.ts`, `AppHeader.tsx`, `App.tsx`, `translations.ts`
**Effort:** ~6h

---

## Summary

| Phase | Features | Total Effort |
|-------|----------|-------------|
| 1 — Quick Wins | #2 Undo-Toast, #6 SW-Update, #7 Remote-Sync | ~2.5h |
| 2 — Medium | #1 Discovery, #3 DnD Blinds, #4 Audio-Toggles, #10 Exports | ~10h |
| 3 — Large | #5 React Compiler, #8 Multi-Device Roles, #9 Stats Dashboard | ~12h |
| **Total** | **10 features** | **~24.5h** |

Each phase is independently shippable. Phase 1 can be released as v6.13.0, Phase 2 as v6.14.0, Phase 3 as v7.0.0.
