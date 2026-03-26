# Setup-Modus Redesign: Guided Tabs

**Datum:** 2026-03-26
**Status:** Approved
**Ansatz:** C — Guided Tabs mit horizontalem Stepper + Smart Defaults

## Problemstellung

Die aktuelle SetupPage (1123 Zeilen) ist ein langer vertikaler Scroll mit 7 CollapsibleSections und 3 verschachtelten SubSections. Auf Mobile sind 3+ Bildschirmhöhen Scroll nötig. Erstnutzer verlieren die Orientierung, Wiederkehrer suchen lange nach der richtigen Sektion.

## Ziele

- Moderneres Aussehen + bessere Struktur (visuell und funktional)
- Erstnutzer: geführter Flow mit klarem Fortschritt
- Wiederkehrer: freie Tab-Navigation, direkter Sprung zur Sektion
- Maximal 1 Bildschirmhöhe pro Tab (kein Scroll nötig)
- Evolution des bestehenden Designs, kein Rewrite

## Tab-Struktur

### 4 Tabs mit freier Navigation

```
[Basis] ── [Spieler] ── [Struktur] ── [Starten]
━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Progress Bar (0-100%)
```

Alle Tabs jederzeit frei anklickbar (kein Lock-Stepping). Status-Badges pro Tab (checkmark gruen, warning amber, leer). Progress-Bar zeigt Gesamtfortschritt.

### Tab 1 — Basis

Inhalt: Turniername, Buy-In, Currency, Starting Chips, Liga-Auswahl, Liga-Spieler-Import, Schnellstart-Presets (Quick/Normal/Deep mit Durations), Vorlagen-Button.

Checkpoint-Recovery-Banner erscheint hier (wenn vorhanden).

### Tab 2 — Spieler

Inhalt: PlayerManager (Add/Edit/Delete/Drag, Autocomplete, Duplikat-Warnung). Multi-Table-Config als CollapsibleSubSection (nur wenn Feature verfuegbar).

### Tab 3 — Struktur

Inhalt: 4 kompakte CollapsibleSections mit Summary-Zeilen:
1. **Blind-Struktur** — Generator (Schnell/Normal/Langsam), Level-Tabelle (eingeklappt), Ante-Toggle
2. **Auszahlung** — PayoutEditor
3. **Turnier-Format** — Rebuy/Add-On/Bounty/Late Reg als Toggle-Chips, Details bei Klick
4. **Chips & Audio** — ChipEditor, Sound/Volume/Countdown, Custom Alerts, Custom Audio

Maximal 1 Bildschirmhoehe wenn alles eingeklappt.

### Tab 4 — Starten

Read-Only-Zusammenfassung aller Einstellungen als Uebersichtskarte:
- Name, Buy-In, Chips, Spieler, Tische, Levels, Dauer, Prizepool, Rebuy/Bounty-Status, Sound/Voice
- Warnungen/Errors prominent angezeigt
- Grosser Start-Button mit Glow-Animation wenn alles bereit
- Print-Button + QR-Code darunter
- Klick auf eine Zeile springt zum entsprechenden Tab

## Navigation

### Desktop
- Horizontale Tab-Leiste unter App-Header, feste Position
- Icon + Label + Status-Badge pro Tab
- Aktiver Tab: Accent-Farbe underline + filled icon
- Weiter/Zurueck-Buttons am unteren Rand
- Keyboard: Cmd+1/2/3/4 springt direkt zum Tab

### Mobile
- Kompakte Tab-Leiste: nur Icons + Badge-Dots
- Swipe-Navigation zwischen Tabs (Pointer Events, kein Library)
- Weiter/Zurueck als Sticky-Footer
- Labels als Tooltip bei Long-Press

### Tab-Uebergaenge
- slide-in-left / slide-in-right Animation (bereits in index.css vorhanden)
- 150ms duration, ease-out
- Kein Fade — direkter Slide

## Visuelles Design

### Prinzip
Evolution des bestehenden Glassmorphism-Designs. Keine neuen Farben, Fonts oder Libraries.

### Tab-Leiste
- Dark: `bg-gray-900/60 backdrop-blur-md`
- Light: `bg-white/80 backdrop-blur-md shadow-sm`
- Aktiver Tab: `text-[var(--accent-500)]` + `border-b-2 border-[var(--accent-500)]`
- Progress-Bar: Accent-Gradient unter den Tabs

### Tab-Button States
- Inaktiv: `text-gray-400 dark:text-gray-500`
- Hover: `text-gray-200` + subtle background
- Aktiv: Accent-Farbe + Underline
- Completed: checkmark Badge in accent
- Warning: warning Badge in amber

### Cards
Bestehende Glassmorphism-Cards bleiben identisch:
```
bg-gray-100/80 dark:bg-gray-800/40
backdrop-blur-sm
border border-gray-200 dark:border-gray-700/40
rounded-xl shadow-lg
```

### Weiter/Zurueck-Buttons
- Zurueck: Ghost-Button (border only)
- Weiter: Accent-gradient (primaerer Button-Stil)
- Starten: Extra-gross, animate-pulse glow wenn bereit

### Typografie
| Element | Desktop | Mobile |
|---------|---------|--------|
| Tab-Label | text-sm font-medium | Hidden (nur Icon) |
| Section-Title | text-lg font-semibold | text-base font-semibold |
| Field-Label | text-sm text-gray-400 | text-sm text-gray-400 |
| Summary-Text | text-xs text-gray-500 | text-xs text-gray-500 |
| Start-Button | text-xl font-bold | text-lg font-bold |

## Technische Architektur

### Neue Dateien
```
src/components/
  SetupTabs.tsx          — Tab-Leiste + Navigation-Logik
  SetupTabBasis.tsx      — Tab 1: Basics + Presets
  SetupTabPlayers.tsx    — Tab 2: PlayerManager + Multi-Table
  SetupTabStructure.tsx  — Tab 3: Blinds, Payout, Format, Chips, Audio
  SetupTabReview.tsx     — Tab 4: Summary + Start + Print
```

### Migration
- SetupPage.tsx: 1123 -> ~150 Zeilen (wird Tab-Orchestrator)
- Inhalte 1:1 in Tab-Komponenten verschoben (Cut & Paste)
- Editor-Komponenten bleiben unveraendert
- CollapsibleSection/SubSection bleiben in Tab 3
- Props-Interface bleibt identisch

### State
```typescript
const [activeTab, setActiveTab] = useState<0|1|2|3>(() => {
  const saved = sessionStorage.getItem('setup-active-tab');
  return saved ? Number(saved) as 0|1|2|3 : 0;
});

const tabStatus = useMemo(() => ({
  basis:     hasName && hasBuyIn ? 'complete' : 'incomplete',
  players:   players.length >= 2 ? 'complete' : 'incomplete',
  structure: hasLevels ? 'complete' : 'incomplete',
  review:    errors.length === 0 ? 'ready' : 'warning',
}), [config, players, errors]);
```

### Was sich NICHT aendert
- App.tsx — keine Aenderung
- SetupModeContainer.tsx — unveraendert
- SetupWizard.tsx — bleibt als First-Time-Overlay
- Alle Editor-Komponenten — unveraendert
- Keyboard-Shortcuts — bestehende bleiben
- Checkpoint-Recovery — Banner wandert in Tab 1
- Feature-Gates — gleiche Props, gleiche Logik

### Bundle-Impact
- Kein neues Library (Swipe via Pointer Events, Tabs sind plain divs)
- ~5 neue Dateien, gleiche Gesamtmenge Code
- Alle Tab-Inhalte eager-loaded (Setup ist kritischer Pfad)

## Stitch-Integration

Die 4 Tabs werden als Screens in Google Stitch designed:
1. Screen "Setup Basis" — Form-Layout mit Preset-Cards
2. Screen "Setup Spieler" — Player-List mit Action-Buttons
3. Screen "Setup Struktur" — Collapsible-Cards mit Toggle-Chips
4. Screen "Setup Review" — Summary-Card mit Start-CTA

Stitch generiert HTML/CSS-Vorlagen, die als Referenz fuer die Tailwind-Umsetzung dienen.
