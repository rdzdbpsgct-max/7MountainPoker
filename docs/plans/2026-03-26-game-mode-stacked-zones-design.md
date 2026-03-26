# Game Mode Redesign: Stacked Zones

**Datum:** 2026-03-26
**Status:** Approved
**Ansatz:** C — Stacked Zones mit 3 horizontalen Zonen

## Problemstellung

Der aktuelle Game Mode nutzt ein 3-Panel-Layout (PlayerPanel links, Timer Mitte, Sidebar rechts). Auf Mobile sind die Panels hinter Toggle-Buttons versteckt, verschachteltes Scrollen entsteht, und Funktionen wie Spieler-Elimination erfordern Panel-Wechsel. Die Spielerverwaltung (Kerngeschaeft) steckt in einer Sidebar mit max-h-Beschraenkung.

## Ziele

- Spielerverwaltung (Eliminate, Rebuy) als Hauptflaeche, nicht als Sidebar
- Timer gross genug fuer Single-Display-Nutzung (Laptop/Tablet aus 1-2m Entfernung)
- Kein Panel-Toggle — alles sofort sichtbar
- Ein Layout fuer alle Geraete (Mobile, Tablet, Desktop) — nur Groessenunterschiede
- Sekundaerfunktionen (Blinds, Chips, Stats, Settings) als ausklappbare Karten oder Modals
- Evolution des bestehenden Designs, kein Rewrite

## Zonen-Aufteilung

### 3 horizontale Zonen

```
+---------------------------------------------+
| ZONE 1 — STATUS BAR (sticky, ~48px)         |
| Players, Prizepool, Avg BB, Elapsed, Icons   |
+---------------------------------------------+
| ZONE 2 — TIMER + CONTROLS (sticky, ~40-45vh)|
| Level-Label, Blinds/Ante, Progress Bar       |
| Timer (gross, lesbar aus 1-2m)               |
| Naechstes Level Info                         |
| Controls: Play/Pause, Prev, Next, Last, HfH |
| Banner: Bubble, ITM, Last Hand, Add-On       |
+---------------------------------------------+
| ZONE 3 — AKTIONSFLAECHE (scrollbar, Rest)    |
| Spielerliste (Hauptflaeche)                  |
| Quick-Info-Karten (Akkordeon)                |
| Eliminierte Spieler                          |
+---------------------------------------------+
```

Zone 1 und Zone 2 sind `sticky` — bleiben beim Scrollen durch Zone 3 fixiert.

### Timer-Groessen

| Breakpoint | Timer-Zahl | Lesbar aus |
|-----------|-----------|-----------|
| Mobile (<640px) | text-5xl (3rem) | Handheld |
| Tablet (640-768px) | text-6xl (3.75rem) | ~1.5m |
| Desktop (>=768px) | text-7xl (4.5rem) | ~2m |

Zone 2 Hoehe: ~35vh (Mobile), ~40vh (Tablet), ~45vh (Desktop).

## Zone 1 — Status Bar

Kompakte Zeile mit Live-Stats und Icon-Buttons:

```
Players 6/8  |  Prizepool €400  |  Avg 25 BB  |  Elapsed 45m    [Settings] [TV] [Log] [Tools] [Help]
```

- **Stats:** Aus TournamentStats extrahiert, inline als key-value Paare
- **Desktop:** Volle Labels + Icons
- **Tablet:** Kurze Labels + Icons
- **Mobile:** Nur Icons mit Werten (kein Label-Text)
- **Icon-Buttons oeffnen Modals:**
  - Settings (Zahnrad) — Sound, Volume, Accent, Background, Layout
  - TV (Monitor) — Display Mode
  - Log (Liste) — Tournament Log
  - Tools (Wuerfel) — Side-Pot, ICM, Deal-Maker
  - Help (Fragezeichen) — Help Center

### Visuelles Design

```
bg-gray-100/80 dark:bg-gray-800/40
backdrop-blur-sm
border-b border-gray-200 dark:border-gray-700/30
```

Stats: `text-xs text-gray-500`, Werte: `font-medium text-gray-800 dark:text-gray-200`.
Icons: `text-gray-400 hover:text-[var(--accent-500)]`, 24x24.

## Zone 2 — Timer + Controls

Einbettung der bestehenden Komponenten:

1. **TimerDisplay** — unveraendert, nur Groessen-Anpassung via Props
2. **Controls** — unveraendert, horizontal zentriert unter dem Timer
3. **BubbleIndicator** — unveraendert, unter den Controls
4. **RebuyStatus** — unveraendert, zwischen Timer und Controls

### Layout

```
flex flex-col items-center justify-center
sticky top-[48px] z-10
bg-gradient (bestehender Body-Gradient, verstaerkt)
border-b border-gray-200 dark:border-gray-700/30
```

Kein visueller Unterschied zum heutigen Timer — gleiche Animationen, gleicher Glow, gleiche Farben.

## Zone 3 — Aktionsflaeche

### Spielerliste

Refactored aus PlayerPanel. Wechsel von Card-Grid zu Zeilen-Layout:

```
+--------------------------------------------------+
| Aktive Spieler (6)                   Dealer [Btn] |
+--------------------------------------------------+
| [D] Max         15.000        [Rebuy] [x Elim]   |
| [ ] Lisa    x2  22.000 CL    [Rebuy] [x Elim]   |
| [ ] Tom          8.000        [Rebuy] [x Elim]   |
| [ ] Sarah       12.000        [Rebuy] [x Elim]   |
+--------------------------------------------------+
```

**Spieler-Zeile:**
- Dealer-Badge (D) — kleiner accent-Kreis, nur beim Dealer
- Name — links, text-sm font-medium
- Rebuy-Count — amber Badge (x2), nur wenn > 0
- Chips — rechts, tabular-nums, nur bei Stack-Tracking
- CL Badge — amber Kreis, nur beim Chip-Leader
- Aktions-Buttons — kompakt rechts:
  - [Rebuy] — nur wenn Phase aktiv
  - [Add-On] — nur wenn Fenster offen
  - [x] — Eliminate (immer)

**Inline-Bounty-Elimination:**
Statt Modal expandiert die Zeile nach unten:

```
| [ ] Tom          8.000        [Rebuy] [x Elim]   |
|     +-- Wer hat Tom eliminiert? ----------------+ |
|     |  [Max] [Lisa] [Sarah] [Mike] [Julia]      | |
|     |                            [Abbrechen]    | |
|     +-------------------------------------------+ |
```

**Eliminierte Spieler:**
Kompakte Liste am Ende, opacity-50, Platzierung + Name.
Reinstate-Button bei Hover/Touch.

**Spielersuche:**
Ab 10 Spielern: Filterfeld ueber der Liste.

**Responsive:**
- Desktop: Einzeilige Zeilen mit allen Infos
- Mobile: Name + Icons in Zeile 1, Chips + Buttons in Zeile 2

### Quick-Info-Karten (Akkordeon)

Unterhalb der Spielerliste. Nutzt bestehende CollapsibleSection-Komponente.

```
+-- Naechstes Level (immer offen) --------v----+
| Level 4 · 200/400 · Ante 50                  |
| in 12:45 · danach: Level 5 · 300/600         |
+-----------------------------------------------+

+-- Blind-Schedule ----- "12 Lvl, 3 Pausen" ->-+
| (eingeklappt)                                 |
+-----------------------------------------------+

+-- Prizepool & Auszahlung --- "€400, 3 Pl." ->+
| (eingeklappt)                                 |
+-----------------------------------------------+

+-- Chips & Color-Up ---- "Next: Lvl 5" ------>+
| (eingeklappt)                                 |
+-----------------------------------------------+

+-- Multi-Table ---------- "2 Tische" -------->+
| (nur wenn Multi-Table aktiv)                  |
+-----------------------------------------------+
```

**Regeln:**
- "Naechstes Level" ist immer aufgeklappt (wichtigste Sekundaerinfo)
- Alle anderen standardmaessig eingeklappt mit Summary
- Akkordeon-Verhalten: Maximal eine weitere Karte gleichzeitig offen
- Multi-Table nur sichtbar wenn Tische konfiguriert
- Desktop: max-w-2xl zentriert
- Mobile: volle Breite

**Inhalte der Karten:**
- Blind-Schedule: LevelPreview-Inhalt (Tabelle mit Current/Past/Future)
- Prizepool: Prizepool-Betrag, Breakdown, Auszahlungsplaetze
- Chips: Denominationen, naechster Color-Up
- Multi-Table: Tisch-Grid, Balance-Button, Move-Log

## Navigation & Interaktion

### Keyboard-Shortcuts (unveraendert)
- Space: Play/Pause
- N: Next Level
- V: Previous Level
- R: Reset Level
- F: (entfaellt — kein Clean View mehr noetig, Layout ist bereits clean)
- L: Last Hand
- H: Hand-for-Hand
- T: TV Display Mode
- C: Call the Clock
- Cmd+Z/Cmd+Shift+Z: Undo/Redo

### Clean View
Entfaellt als separater Toggle. Das neue Layout ist bereits "clean" — Timer + Spieler sichtbar, Sekundaerinfo eingeklappt. Der F-Shortcut und der Button werden entfernt.

## Technische Architektur

### Neue Dateien

```
src/components/
  GameLayout.tsx           — Layout-Orchestrator (3 Zonen)
  GameStatusBar.tsx        — Zone 1: Stats + Icon-Buttons
  GameTimerZone.tsx        — Zone 2: Wrapper fuer Timer + Controls + Banner
  GamePlayerList.tsx       — Zone 3: Spielerliste (refactored aus PlayerPanel)
  GameQuickInfo.tsx        — Zone 3: Ausklappbare Info-Karten (Akkordeon)
```

### Migration

```
Heute:                              Neu:
GameModeContainer                   GameModeContainer
+- PlayerPanel (left sidebar)       +- GameLayout
+- TimerDisplay (center)                +- GameStatusBar (Zone 1, sticky)
+- Controls (center)                    |   <- Stats aus TournamentStats
+- BubbleIndicator (center)             |   <- Icon-Buttons (Settings, TV, Log, Help)
+- TournamentStats (center)             |
+- LevelPreview (right sidebar)         +- GameTimerZone (Zone 2, sticky)
+- ChipSidebar (right sidebar)         |   +- TimerDisplay (unveraendert)
+- SettingsPanel (right sidebar)        |   +- Controls (unveraendert)
+- MultiTablePanel (right sidebar)      |   +- BubbleIndicator (unveraendert)
+- ICM/SidePot (modals)                |
                                        +- Scrollable Zone 3
                                            +- GamePlayerList
                                            |   <- Refactored aus PlayerPanel
                                            |   <- Inline-Elimination (kein Modal)
                                            |   <- Prizepool -> GameQuickInfo
                                            |
                                            +- GameQuickInfo (Akkordeon)
                                                +- Naechstes Level (offen)
                                                +- Blind-Schedule (<- LevelPreview)
                                                +- Prizepool & Payout (<- PlayerPanel)
                                                +- Chips & Color-Up (<- ChipSidebar)
                                                +- Multi-Table (<- MultiTablePanel)
```

### Was sich NICHT aendert

- App.tsx — keine Aenderung
- GameModeContainer.tsx — Props-Interface bleibt identisch
- TimerDisplay.tsx — unveraendert (nur Groessen-Props)
- Controls.tsx — unveraendert
- BubbleIndicator.tsx — unveraendert
- RebuyStatus.tsx — unveraendert
- DisplayMode / TV-Modus — komplett unveraendert
- RemoteControl — unveraendert
- Alle Domain-Logic-Module — unveraendert
- Keyboard-Shortcuts (ausser F/Clean-View-Entfernung)
- Checkpoint-System — unveraendert

### Komponenten-Zuordnung

- **SettingsPanel** → wird als Modal gerendert statt als Sidebar (gleiche Komponente, anderer Container)
- **MultiTablePanel** → wird als CollapsibleSection in GameQuickInfo gerendert
- **TournamentStats** → Inhalt wandert in GameStatusBar (kompaktere Darstellung)
- **LevelPreview** → Inhalt wandert in GameQuickInfo (Blind-Schedule-Karte)
- **ChipSidebar** → Inhalt wandert in GameQuickInfo (Chips-Karte)
- **PlayerPanel** → Refactored zu GamePlayerList (Zeilen statt Cards, Inline-Elimination)

### Bundle-Impact

- Kein neues Library
- GamePlayerList (~350 Zeilen) ersetzt PlayerPanel-Layout (~578 Zeilen)
- GameStatusBar (~80 Zeilen) — compact stats
- GameQuickInfo (~120 Zeilen) — Akkordeon-Wrapper
- GameTimerZone (~60 Zeilen) — duenner Wrapper
- GameLayout (~100 Zeilen) — 3-Zonen-Orchestrator
- Netto: ~200 Zeilen weniger durch Entfernung des 3-Panel-Toggle-Codes

### Responsive Verhalten

Gleiches Layout auf allen Breakpoints — nur Groessenunterschiede:

| Element | Mobile (<640px) | Tablet (640-768px) | Desktop (>=768px) |
|---------|----------------|-------------------|-----------------|
| Timer-Zahl | text-5xl (3rem) | text-6xl (3.75rem) | text-7xl (4.5rem) |
| Spieler-Zeile | 2-zeilig | Einzeilig | Einzeilig breit |
| Quick-Info | Volle Breite | Volle Breite | max-w-2xl zentriert |
| Status-Bar | Icons + Werte | Icons + kurze Labels | Icons + volle Labels |
| Zone 2 Hoehe | ~35vh | ~40vh | ~45vh |

## Visuelles Design

### Prinzip

Evolution des bestehenden Glassmorphism-Designs. Keine neuen Farben, Fonts oder Libraries.

### Zone 1 (Status Bar)

```
bg-gray-100/80 dark:bg-gray-800/40
backdrop-blur-sm
border-b border-gray-200 dark:border-gray-700/30
sticky top-0 z-20
```

### Zone 2 (Timer)

Bestehender Body-Gradient als Hintergrund. Gleiche Timer-Animationen.

```
sticky top-[48px] z-10
border-b border-gray-200 dark:border-gray-700/30
```

### Zone 3 (Aktionsflaeche)

```
overflow-y-auto
p-3 sm:p-4
max-w-2xl mx-auto (Desktop)
```

### Spieler-Zeilen

```
hover:bg-gray-200/50 dark:hover:bg-gray-700/30
border-b border-gray-200 dark:border-gray-700/20
py-2 px-3
transition-colors
```

Dealer-Zeile: accent-Hintergrund mit 10% Opacity.
Eliminierte: opacity-50, durchgestrichen.

### Quick-Info-Karten

Bestehende CollapsibleSection-Styles:

```
bg-gray-100/80 dark:bg-gray-800/40
backdrop-blur-sm
border border-gray-200 dark:border-gray-700/40
rounded-xl shadow-lg
```

## Stitch-Integration

Die 3 Zonen werden als Screens in Google Stitch designed:
1. Screen "Game Status Bar" — Compact stats + icon buttons
2. Screen "Game Timer Zone" — Timer + Controls + Banner
3. Screen "Game Player List" — Zeilen-Layout mit Inline-Aktionen
4. Screen "Game Quick Info" — Akkordeon-Karten

Stitch generiert HTML/CSS-Vorlagen als Referenz fuer die Tailwind-Umsetzung.
