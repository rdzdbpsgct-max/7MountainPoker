# Game Mode UX Redesign — Design Document

**Date**: 2026-03-26
**Status**: Approved
**Context**: Home Game (4–10 Spieler), Tablet/Laptop am Tisch, Timer zentral sichtbar

---

## Problem Statement

Der Spielmodus zeigt zu viel Unwichtiges und versteckt Wichtiges hinter Sidebars:

1. **Rechte Sidebar = Settings-Friedhof**: SettingsPanel (Akzentfarben, Hintergründe, Display-Layout, TV-Screens) frisst ~40% des Platzes mit Dingen, die man vor dem Turnier einstellt
2. **Wichtige Infos fehlen im Blickfeld**: Spielzeit, Restzeit, Spieleranzahl, Prizepool nur über Sidebar erreichbar
3. **PlayerPanel-Header ist Button-Chaos**: 6 Mini-Buttons (10px) nebeneinander, wrappen auf mehrere Zeilen
4. **Controls haben 5 Reihen mit 12+ Buttons**: Start/Pause konkurriert visuell mit selten genutzten Funktionen
5. **Redundante Information**: Blinds/Next-Level im Timer UND in der LevelPreview

---

## Design: Smartes Sidebar-Redesign

Bewährte 3-Panel-Struktur beibehalten, aber jedes Panel deutlich fokussierter machen.

### 1. Turnier-Infozeile (NEU — über dem Timer)

Kompakte, immer sichtbare Zeile mit den wichtigsten Zahlen:

```
👥 6/8  ·  💰 240 €  ·  Ø 5.000  ·  ⏱ 01:23  ·  ~45 min
```

- Spieleranzahl (aktiv/gesamt)
- Prizepool (Tap → Payout-Overlay)
- Durchschnittlicher Stack
- Spielzeit (elapsed)
- Geschätzte Restzeit
- Styling: dezente Zeile, `text-xs`, Icon+Wert-Paare, keine Interaktion außer Prizepool-Tap
- Versteckt in Clean View
- Daten kommen aus bereits vorhandenen computed values (`averageStack`, `tournamentElapsed`, `prizePool`, active/total player count)

### 2. Rechte Sidebar: Nur „Quick Info"

**Raus aus der Sidebar → eigenes Settings-Modal:**
- SettingsPanel komplett (Audio, Timer-Settings, Appearance, TV-Config, Shortcuts)
- ICM-Button
- „Zurück zum Setup"-Button

**Bleibt in der Sidebar:**
- **Nächste 3–4 Levels** (nicht alle 20 — nur `currentIndex` bis `currentIndex + 3`)
- **Chip-Werte** (wenn aktiviert; standardmäßig eingeklappt wenn kein Color-Up in den nächsten 3 Levels)
- **Multi-Table-Panel** (wenn aktiviert)

**Neues Settings-Modal (⚙️ im Header):**
- Öffnet als zentriertes Modal/BottomSheet
- Enthält alles was bisher SettingsPanel war
- Plus: ICM Calculator Button, Zurück zum Setup Button
- Keyboard-Shortcuts → Link zum Help Center

**Sidebar-Ergebnis:** Von 4 Sektionen + 2 Footer-Buttons auf 1–2 kompakte Sektionen.

### 3. Linke Sidebar: Fokus auf Spieler

**Raus aus dem PlayerPanel → in Infozeile/Modal:**
- Prizepool-Summe → Infozeile (Detail-Aufschlüsselung per Tap als Popover)
- Payout-Tabelle → Popover/Overlay bei Tap auf Prizepool
- Average Stack → Infozeile

**Bleibt im PlayerPanel:**
- Spielerliste (aktive + eliminierte)
- Alle Spieler-Aktionen (Eliminate, Rebuy, Add-On, Stack-Tracking)
- Add-On-Banner (kontextuell)

**Verbessert:**
- Action-Buttons (`+ Spätreg`, `Pots`, `Deal`, `Payout`) in ein `···` Dropdown-Menü statt 6 inline Buttons
- Dealer-Toggle + Advance zu einem kombinierten Toggle-Button: `D` (aus) → `D` (an, rot) → Tap = Advance
- Eliminierte Spieler standardmäßig eingeklappt mit Chevron

### 4. Controls: Priorisierte Reihen

**Immer sichtbar (Reihe 1):**
```
[← Prev]  [▶ START / ⏸ PAUSE]  [Next →]
```

**Kontextuell sichtbar (Reihe 2) — nur wenn relevant:**
- Während Break: `Skip` · `+2min` · `+5min`
- Während Hand-for-Hand: `Nächste Hand` (prominent)
- Während Bubble: `Hand-for-Hand` Toggle

**Hinter `···` Mehr-Menü:**
- Last Hand Toggle
- Clean View Toggle
- Call the Clock
- Undo / Redo (mit Labels)
- Reset Level
- Restart Tournament

→ Von 5 Reihen auf **max 2 Reihen + Menü-Popover**

Das `···` Menü öffnet als Popover über dem Button (nicht als Modal), zeigt Toggles + Aktionen in einer kompakten Liste.

### 5. Banner-Priorisierung

Nur den höchstpriorisierten Banner zeigen statt mehrere zu stapeln:

| Priorität | Banner | Farbe | Bedingung |
|-----------|--------|-------|-----------|
| 1 | ITM Flash | Accent | 5s Animation |
| 2 | Bubble | Rot | `bubbleActive` |
| 3 | Hand-for-Hand | Rot | `handForHandActive` |
| 4 | Last Hand | Amber | `lastHandActive` |
| 5 | Add-On verfügbar | Amber | `addOnWindowOpen` |
| 6 | Rebuy aktiv | Accent | `rebuyActive` |

Sekundäre aktive Banner als kleine Badges/Dots neben dem Timer-Status statt als eigene Zeile.

### 6. Header aufräumen

**Vorher (12+ Buttons):** Theme, Language, Voice, Share, Templates, History, Series, TV, Remote, League, Help, Wizard

**Nachher (Spielmodus, 5–6 Buttons):**
- **Links:** Turniername · Uhrzeit
- **Rechts:** `🔊` Voice-Toggle · `📡` Share · `📺` TV · `⚙️` Settings-Modal · `?` Help

- Theme/Sprache → ins ⚙️ Settings-Modal (werden während Spiel kaum gewechselt)
- Templates/History/Series/League → im Spielmodus ausblenden (nur in Setup relevant)
- Remote → unter 📡 Share (ist bereits dort im ShareHub)

---

## Nicht-Ziele

- Keine Änderung der 3-Panel-Grundstruktur (Toggle-Sidebars bleiben)
- Keine Änderung der Timer-Darstellung selbst
- Keine neuen Features — rein UX-Optimierung bestehender Funktionalität
- Keine Änderung der Domain-Logik oder Datenstrukturen
- Keine Änderung des TV-Display-Modus

---

## Zusammenfassung der Wirkung

| Bereich | Vorher | Nachher |
|---------|--------|---------|
| Rechte Sidebar | 4 Sektionen, 60% Settings | 1–2 Sektionen, reine Vorschau |
| Linke Sidebar | Prizepool + Payouts + Players | Nur Players + Aktionen |
| Timer-Bereich | Timer + 5 Reihen Controls + 3 Banner | Timer + Infozeile + 2 Reihen + 1 Banner |
| Header (Spielmodus) | 12+ Buttons | 5–6 Buttons |
| Infos auf einen Blick | Nur Timer/Blinds | Timer + Spieler + Pool + Zeit + Restzeit |

---

## Betroffene Dateien

### Neue Komponenten
- `GameInfoBar.tsx` — Turnier-Infozeile über dem Timer
- `GameSettingsModal.tsx` — Settings-Modal (extrahiert aus SettingsPanel)
- `ControlsMoreMenu.tsx` — Popover für sekundäre Controls

### Stark geändert
- `GameModeContainer.tsx` — Layout-Umbau, Infozeile einbauen, Sidebar-Inhalt reduzieren
- `PlayerPanel.tsx` — Prizepool/Payouts/AvgStack entfernen, Action-Buttons in Dropdown
- `Controls.tsx` — Auf 2 Reihen + Mehr-Menü reduzieren
- `BubbleIndicator.tsx` — Banner-Priorisierung statt Stacking
- `LevelPreview.tsx` — Auf 3–4 Levels begrenzen
- `AppHeader.tsx` — Spielmodus-Buttons reduzieren, ⚙️ Button hinzufügen

### Leicht geändert
- `SettingsPanel.tsx` — Wird zum Modal-Content (Wrapper ändert sich)
- `ChipSidebar.tsx` — Default-collapsed wenn kein Color-Up nahe
- `RebuyStatus.tsx` — Als Badge statt Banner (wenn niedrigere Priorität)

### Neue i18n-Keys
- ~10–15 neue Keys (Infozeile-Labels, Mehr-Menü-Labels, Modal-Titel)
