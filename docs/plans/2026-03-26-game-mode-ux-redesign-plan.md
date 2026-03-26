# Game Mode UX Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fokussierter Spielmodus — wichtige Infos auf einen Blick, Sidebars entrümpelt, Controls reduziert.

**Architecture:** Bestehende 3-Panel-Struktur beibehalten. Neue `GameInfoBar` über dem Timer zeigt Kernzahlen. SettingsPanel in eigenes Modal extrahiert. Controls auf 2 Reihen + Popover-Menü reduziert. BubbleIndicator zeigt nur höchstpriorisierten Banner. PlayerPanel ohne Prizepool/Payouts (wandern in InfoBar + Popover).

**Tech Stack:** React 19, TypeScript 5.9 strict (`exactOptionalPropertyTypes`), Tailwind CSS 4, Vitest

**Design Document:** `docs/plans/2026-03-26-game-mode-ux-redesign-design.md`

---

## Task 1: Translation Keys hinzufügen

Alle neuen i18n-Keys zuerst anlegen, damit alle folgenden Tasks sie nutzen können.

**Files:**
- Modify: `src/i18n/translations.ts`
- Test: `tests/i18n.test.ts` (existing key-parity test covers this automatically)

**Step 1:** Neue Keys in `translations.ts` einfügen (DE + EN Objekte).

Neue Keys:

```typescript
// Info bar
'info.players': 'Spieler',              // EN: 'Players'
'info.prizepool': 'Prizepool',          // EN: 'Prize Pool'
'info.avgStack': 'Ø Stack',             // EN: 'Avg Stack'
'info.elapsed': 'Spielzeit',            // EN: 'Elapsed'
'info.remaining': 'Rest',               // EN: 'Remaining'
'info.payoutDetails': 'Auszahlungsdetails', // EN: 'Payout Details'

// Settings modal
'settings.modalTitle': 'Einstellungen', // EN: 'Settings'
'settings.backToSetup': 'Zurück zum Setup', // EN: 'Back to Setup'

// Controls more menu
'controls.more': 'Mehr',               // EN: 'More'
'controls.moreActions': 'Weitere Aktionen', // EN: 'More Actions'

// Player panel
'playerPanel.actions': 'Aktionen',      // EN: 'Actions'
```

**Step 2:** Tests laufen lassen — `npm run test` — i18n.test.ts prüft Key-Parität automatisch.

**Step 3:** Commit: `feat(i18n): add game mode UX redesign translation keys`

---

## Task 2: GameInfoBar — Turnier-Infozeile

Neue Komponente: kompakte Zeile über dem Timer mit Spieler, Prizepool, Ø Stack, Spielzeit, Restzeit.

**Files:**
- Create: `src/components/GameInfoBar.tsx`
- Modify: `src/components/modes/GameModeContainer.tsx` (lines 196–197, insert before TimerDisplay)
- Modify: `src/components/modes/GameModeContainer.tsx` (Props interface, lines 109–120)
- Modify: `src/App.tsx` (gameModeState memo, lines 778–784 — add `prizePool`)
- Test: `tests/components.test.tsx` (add GameInfoBar test)

**Step 1:** Create `GameInfoBar.tsx`:

```tsx
import { memo } from 'react';
import type { Player, PayoutConfig, RebuyConfig, AddOnConfig, BountyConfig, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { computePrizePool, computePayouts, formatElapsedTime, computeEstimatedRemainingSeconds } from '../domain/logic';
import { useTranslation } from '../i18n';

interface Props {
  players: Player[];
  buyIn: number;
  payout: PayoutConfig;
  rebuyConfig: RebuyConfig;
  addOnConfig: AddOnConfig;
  bountyConfig: BountyConfig;
  averageStack: number;
  tournamentElapsed: number;
  estimatedRemaining: number | null;
  currency?: Currency | undefined;
  onShowPayoutOverlay?: (() => void) | undefined;
}

export const GameInfoBar = memo(function GameInfoBar({ ... }: Props) {
  // Compute prizePool, active/total count
  // Render: compact flex row with icon+value pairs
  // Prizepool is tappable (onClick → onShowPayoutOverlay)
  // Hidden via parent when cleanView is active
});
```

Styling: `text-xs text-gray-500 dark:text-gray-400`, flex row, `gap-3`, icon+value pairs, Prizepool als `button` mit hover-underline. Max-width `max-w-xl`, centered.

**Step 2:** Integrate into `GameModeContainer.tsx` — insert `<GameInfoBar>` at line 197, before `<TimerDisplay>`. Pass props from `config`, `state`, `actions`. Add to lazy imports.

**Step 3:** Extend `GameModeState` interface (line 44–58) with `prizePool: number`. Compute in `App.tsx` gameModeState memo.

**Step 4:** Write test in `tests/components.test.tsx`: render GameInfoBar with mock data, verify player count, prizepool, elapsed time displayed.

**Step 5:** Visual check: `npm run dev` → start tournament → verify info bar visible above timer.

**Step 6:** Commit: `feat: add GameInfoBar tournament info line above timer`

---

## Task 3: GameSettingsModal — Settings ins Modal extrahieren

SettingsPanel aus der Sidebar in ein eigenes Modal verschieben. Neuer ⚙️-Button im Header öffnet es.

**Files:**
- Create: `src/components/GameSettingsModal.tsx`
- Modify: `src/components/modes/GameModeContainer.tsx` (lines 306–329 — remove SettingsPanel + ICM + BackToSetup from sidebar)
- Modify: `src/components/AppHeader.tsx` (add ⚙️ button for game mode)
- Modify: `src/App.tsx` (add `showGameSettings` state + handler, pass to header + modal)

**Step 1:** Create `GameSettingsModal.tsx` — modal wrapper around existing `SettingsPanel` content:

```tsx
import { memo, lazy, Suspense } from 'react';
import type { Settings } from '../domain/types';
import type { AppFeature } from '../domain/entitlements';
import { useTranslation } from '../i18n';
import { LoadingFallback } from './LoadingFallback';

const SettingsPanel = lazy(() => import('./SettingsPanel').then(m => ({ default: m.SettingsPanel })));

interface Props {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
  onToggleFullscreen: () => void;
  onShowInstallGuide?: (() => void) | undefined;
  onShowIcm: () => void;
  onExitToSetup: () => void;
  canUseCustomAccent?: boolean | undefined;
  canUseCustomBackground?: boolean | undefined;
  canUseCustomLayout?: boolean | undefined;
  onOpenFeatureGate?: ((feature: AppFeature) => void) | undefined;
}

export const GameSettingsModal = memo(function GameSettingsModal({ open, onClose, ...rest }: Props) {
  if (!open) return null;
  const { t } = useTranslation();
  // Render: backdrop + centered modal card
  // Title: t('settings.modalTitle')
  // Body: <SettingsPanel {...rest} />
  // Footer: ICM button + Back to Setup button + Close button
  // Escape to close, click backdrop to close
});
```

Modal-Styling: `fixed inset-0 z-50`, backdrop `bg-black/40 backdrop-blur-sm`, card `max-w-md mx-auto my-8 max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-5`.

**Step 2:** Remove from `GameModeContainer.tsx` sidebar (lines 306–329): SettingsPanel, ICM button, Back to Setup button. The sidebar now only has: LevelPreview, ChipSidebar, MultiTablePanel.

**Step 3:** Add `⚙️` button to `AppHeader.tsx` — only visible when `mode === 'game'`. New prop: `onShowSettings?: () => void`.

**Step 4:** In `App.tsx`: add `const [showGameSettings, setShowGameSettings] = useState(false)`. Pass `onShowSettings={() => setShowGameSettings(true)}` to AppHeader. Render `<GameSettingsModal>` with all settings props. Include `onExitToSetup` and `onShowIcm` in the modal.

**Step 5:** Verify: sidebar now only shows level preview + chips + multi-table. ⚙️ button in header opens settings modal.

**Step 6:** Commit: `refactor: extract SettingsPanel into GameSettingsModal`

---

## Task 4: PlayerPanel entrümpeln — Prizepool/Payouts raus

Prizepool-Karte, Payout-Tabelle und Average Stack aus dem PlayerPanel entfernen (jetzt in InfoBar). Action-Buttons in kompaktes Dropdown.

**Files:**
- Modify: `src/components/PlayerPanel.tsx` (lines 147–207 — remove Prize Pool, Payout, Average Stack sections)
- Modify: `src/components/PlayerPanel.tsx` (lines 260–329 — simplify action buttons header)

**Step 1:** Aus PlayerPanel entfernen (lines 147–207):
- Prize Pool div (lines 147–179)
- Payout breakdown div (lines 181–197)
- Average Stack div (lines 199–207)

Diese Infos sind jetzt über die GameInfoBar + Prizepool-Tap-Popover erreichbar.

**Step 2:** Action-Buttons vereinfachen (lines 264–329). Aktuell 6 inline Mini-Buttons. Neues Layout:

- `+ Spätreg` Button bleibt (wenn `lateRegOpen`) — wichtig und kontextuell
- Dealer-Buttons: Kombinieren zu einem Toggle: `D` off → `D` on (rot) → Tap wenn on = advance
- Restliche Buttons (`Pots`, `Deal`, `Payout`) in ein `···` Popover-Menü

```tsx
// New: compact action popover
const [showActions, setShowActions] = useState(false);

// In render:
<button onClick={() => setShowActions(v => !v)} className="...">···</button>
{showActions && (
  <div className="absolute right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border ...">
    <button onClick={() => { setShowSidePot(true); setShowActions(false); }}>
      {t('sidePot.titleShort')}
    </button>
    {onAcceptDeal && activePlayers.length >= 2 && activePlayers.length <= 6 && (
      <button onClick={() => { setShowDealMaker(true); setShowActions(false); }}>
        {t('deal.button')}
      </button>
    )}
    {onShowPayoutOverlay && (
      <button onClick={() => { onShowPayoutOverlay(); setShowActions(false); }}>
        {t('payout.overlay.titleShort')}
      </button>
    )}
  </div>
)}
```

**Step 3:** Props aufräumen — `averageStack`, `payout`, `buyIn`, `currency` etc. können als Props bleiben (werden für Berechnungen intern noch gebraucht, z.B. SidePotCalculator, DealMaker). Aber die Render-Sektionen werden entfernt.

**Step 4:** Eliminierte Spieler standardmäßig eingeklappt — Chevron-Toggle mit `useState(false)`.

**Step 5:** Verify: PlayerPanel zeigt nur noch Spielerliste + kontextuelle Aktionen. Kompakter.

**Step 6:** Commit: `refactor: slim down PlayerPanel — move prizepool/payouts to InfoBar`

---

## Task 5: Controls reduzieren — 2 Reihen + Mehr-Menü

Controls auf Hauptreihe + kontextuelle Reihe + Popover reduzieren.

**Files:**
- Modify: `src/components/Controls.tsx` (lines 68–249)

**Step 1:** Neue Struktur:

**Reihe 1 (immer sichtbar):** Previous, Start/Pause, Next — wie bisher (lines 68–100), keine Änderung.

**Reihe 2 (kontextuell):**
- Break: Skip + Extend Buttons (wie bisher, lines 103–133)
- Hand-for-Hand aktiv + paused: Next Hand Button (wie bisher, lines 135–145)
- Bubble (kein Break, kein H4H): Hand-for-Hand Toggle
- Sonst: nichts

**`···` Mehr-Menü (Popover):**
Neuer State: `const [showMore, setShowMore] = useState(false)`

Button rechts neben Reihe 1 oder unterhalb. Popover zeigt:
- Last Hand Toggle (amber wenn aktiv)
- Clean View Toggle (accent wenn aktiv)
- Call the Clock Button
- Undo / Redo (mit Labels, wenn verfügbar)
- Reset Level
- Restart Tournament (rot)

Close on click outside (useEffect mit document click listener oder onBlur).

**Step 2:** Bestehende Reihen 4+5 (lines 148–249) durch das Popover ersetzen. Der `···` Button bekommt einen Indikator-Dot wenn Last Hand oder Clean View aktiv ist.

**Step 3:** Props bleiben alle gleich — keine Interface-Änderung nötig. Nur die Render-Logik ändert sich.

**Step 4:** Verify: nur 1–2 Reihen + kleiner `···` Button sichtbar. Popover öffnet sich bei Klick.

**Step 5:** Commit: `refactor: reduce Controls to 2 rows + more menu popover`

---

## Task 6: BubbleIndicator — Banner-Priorisierung

Nur den höchstpriorisierten Banner anzeigen statt alle gleichzeitig.

**Files:**
- Modify: `src/components/BubbleIndicator.tsx` (lines 18–71)

**Step 1:** Priorisierungslogik einbauen. Statt Fragment mit 5 unabhängigen Conditions:

```tsx
// Priority: ITM > Bubble > HandForHand > LastHand > AddOn
const banner = showItmFlash ? 'itm'
  : isBubble ? 'bubble'
  : handForHandActive ? 'h4h'
  : lastHandActive ? 'lastHand'
  : addOnWindowOpen ? 'addOn'
  : null;

if (!banner) return null;

// Render only the selected banner
switch (banner) {
  case 'itm': return <div className="...">💰 IN THE MONEY 💰</div>;
  case 'bubble': return <div className="...">🫧 BUBBLE 🫧</div>;
  // ... etc
}
```

**Step 2:** Sekundäre Banner als kleine Badge-Dots: Wenn z.B. Bubble aktiv UND Last Hand aktiv → nur Bubble-Banner, aber kleiner amber Dot neben der Anzeige als Hinweis auf Last Hand.

Optional: Sekundäre Badges können in v1 weggelassen werden — nur der Hauptbanner reicht.

**Step 3:** Tests anpassen in `tests/components.test.tsx` — BubbleIndicator-Tests prüfen, dass bei mehreren aktiven Conditions nur der höchstpriorisierte sichtbar ist.

**Step 4:** Commit: `refactor: BubbleIndicator shows only highest-priority banner`

---

## Task 7: LevelPreview begrenzen

Nur noch die nächsten 3–4 Levels anzeigen statt aller 20.

**Files:**
- Modify: `src/components/LevelPreview.tsx` (lines 18–52)

**Step 1:** Level-Array filtern:

```tsx
const visibleLevels = levels
  .map((level, i) => ({ level, i }))
  .filter(({ i }) => i >= timerState.currentLevelIndex && i <= timerState.currentLevelIndex + 3);
```

Zeige: aktuelles Level + nächste 3. Vergangene Levels nicht mehr anzeigen (sind irrelevant für den Spielfluss).

**Step 2:** Header-Text anpassen: „NÄCHSTE LEVELS" statt „LEVEL ÜBERSICHT" (Key `levelPreview.title` bestehend, Wert evtl. anpassen).

**Step 3:** `max-h-48` entfernen — bei nur 4 Einträgen braucht man keinen Scroll.

**Step 4:** Commit: `refactor: LevelPreview shows only next 3-4 levels`

---

## Task 8: AppHeader im Spielmodus aufräumen

Im Spielmodus nur die relevanten Buttons zeigen.

**Files:**
- Modify: `src/components/AppHeader.tsx`
- Modify: `src/App.tsx` (neue Props an AppHeader)

**Step 1:** Im Spielmodus ausblenden:
- Templates-Button (nur Setup/Liga)
- History-Button (nur Setup/Liga)
- Series-Button (nur Setup/Liga)
- League-Button (nur Setup/Liga)
- Theme-Switcher (→ ins Settings-Modal, wird während Spiel kaum gewechselt)
- Language-Switcher (→ ins Settings-Modal)

**Step 2:** Im Spielmodus sichtbar:
- Turniername + Uhrzeit (links, wie bisher)
- Voice-Toggle 🔊 (häufig genutzt, bleibt)
- Share Hub 📡 (wie bisher)
- TV Display 📺 (wie bisher)
- Event Log 📋 (wie bisher)
- **⚙️ Settings** (NEU — öffnet GameSettingsModal, aus Task 3)
- Help ? (wie bisher)

**Step 3:** Conditional rendering: `mode === 'game'` zeigt reduzierten Button-Satz. `mode === 'setup'` und `mode === 'league'` zeigen alles wie bisher.

**Step 4:** Commit: `refactor: reduce AppHeader buttons during game mode`

---

## Task 9: ChipSidebar smart-collapse

ChipSidebar standardmäßig eingeklappt wenn kein Color-Up in den nächsten 3 Levels ansteht.

**Files:**
- Modify: `src/components/ChipSidebar.tsx` (line 16 — collapsed state init)

**Step 1:** `collapsed` Initial-State berechnen:

```tsx
const hasUpcomingColorUp = (() => {
  for (let i = currentLevelIndex; i <= currentLevelIndex + 3; i++) {
    if (colorUpMap.has(i)) return true;
  }
  return false;
})();

const [collapsed, setCollapsed] = useState(!hasUpcomingColorUp);
```

Wenn Color-Up in den nächsten 3 Levels → offen. Sonst → eingeklappt.

**Step 2:** Commit: `refactor: ChipSidebar auto-collapses when no upcoming color-up`

---

## Task 10: Integration, Tests & Docs

Alles zusammenbringen, testen, dokumentieren.

**Files:**
- Test: `npm run test` (all 1370 tests must pass)
- Test: `npm run build` (production build)
- Test: `npm run lint` (0 errors)
- Modify: `CLAUDE.md`, `README.md`, `CHANGELOG.md`

**Step 1:** Alle Tests laufen lassen. Bestehende Tests anpassen wo nötig (z.B. PlayerPanel-Tests die Prizepool-Rendering testen, BubbleIndicator-Tests).

**Step 2:** Manueller Test im Browser: Turnier starten, alle Spielmodus-Features durchgehen:
- InfoBar sichtbar mit korrekten Zahlen?
- Sidebars kompakt?
- Controls nur 2 Reihen?
- ⚙️ Modal funktioniert?
- Banner-Priorisierung korrekt?
- Mobile-Layout brauchbar?

**Step 3:** Version bump → 6.12.0 (Feature-Release). CHANGELOG, README, CLAUDE.md aktualisieren.

**Step 4:** Commit: `feat: Game Mode UX Redesign v6.12.0`

---

## Task-Abhängigkeiten

```
Task 1 (i18n) ──────────────────────────────────┐
Task 2 (GameInfoBar) ───── depends on Task 1 ───┤
Task 3 (GameSettingsModal) ── depends on Task 1 ─┤
Task 4 (PlayerPanel slim) ── depends on Task 2 ──┤
Task 5 (Controls reduce) ── independent ──────────┤
Task 6 (BubbleIndicator) ── independent ──────────┤
Task 7 (LevelPreview) ── independent ─────────────┤
Task 8 (AppHeader) ── depends on Task 3 ──────────┤
Task 9 (ChipSidebar) ── independent ──────────────┤
Task 10 (Integration) ── depends on ALL ──────────┘
```

**Parallelisierbare Tasks:** 5, 6, 7, 9 können parallel zu 2+3 laufen.

**Empfohlene Reihenfolge:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

**Batch-Aufteilung für executing-plans:**
- **Batch 1** (Foundation): Tasks 1, 2, 3
- **Batch 2** (Cleanup): Tasks 4, 5, 6
- **Batch 3** (Polish): Tasks 7, 8, 9, 10
