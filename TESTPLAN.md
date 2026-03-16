# Testplan — 7Mountain Poker Timer

**Version**: 3.1
**Erstellt**: 2026-03-09
**Aktualisiert**: 2026-03-16
**Basis**: v6.9.2, 1199 Tests (17 Testdateien)
**App-Typ**: Client-side React/TypeScript SPA, kein Server

---

## Abschnitt A — Systemverstaendnis

### A.1 Funktionsumfang (bestaetigt vorhanden)

| Bereich | Features | Status |
|---------|----------|--------|
| **Timer** | Drift-freier Countdown (wall-clock), Play/Pause/Next/Prev/Reset/Restart, Auto-Advance, Scrub-Slider, verbaler Countdown letzte 10s | Vorhanden, getestet (Logic) |
| **Blindstruktur** | 3 Geschwindigkeiten (fast/normal/slow), Blinds nach Ziel-Endzeit, manuelle Level-Tabelle, Chip-aware Rundung, Antes (Standard + BBA) | Vorhanden, getestet (Logic) |
| **Spieler** | 2-20 Spieler, Namensvergabe, Drag&Drop-Reihenfolge, Shuffle, Dealer-Rotation, Elimination, Reinstate, Re-Entry, Stack-Tracking, Chip-Leader | Vorhanden, getestet (Logic) |
| **Rebuy/Add-On** | Rebuy-Limit (Zeit/Level), Per-Player-Cap, Add-On (einmalig, auto-disable ohne Rebuy), Stack-Updates | Vorhanden, getestet (Logic) |
| **Bounty** | Fixed Bounty, Mystery Bounty (Pool + Random Draw) | Vorhanden, getestet (Logic) |
| **Payout** | Prozent- oder Fixbetrag-Modus, 1-N Plaetze, Prizepool-Berechnung, separater Rebuy-Pot | Vorhanden, getestet (Logic) |
| **Chips** | Denominationen, Color-Up-Schedule, Kompatibilitaetspruefung, Auto-Sort, Duplikat-Warnung | Vorhanden, getestet (Logic) |
| **Multi-Table** | Seat-Level-Modell, Round-Robin-Verteilung, Auto-Balance, Dissolution, Final-Table-Merge, Seat-Locking | Vorhanden, getestet (Logic) |
| **Liga** | Multi-Liga, Punktesystem, GameDays, Extended Standings, Finanzen, Tiebreaker, Seasons, Gaeste, Korrekturen, QR-Sharing | Vorhanden, getestet (Logic) |
| **Sound** | Web Audio API Beeps, Victory/Bubble/ITM Sounds, Lautstaerke-Regler (0-100%) | Vorhanden, getestet (sound-speech.test.ts) |
| **Voice** | ElevenLabs MP3 (450 Dateien DE+EN), Web Speech API Fallback, ~27 feste Ansagen, Countdown, Level-Wechsel, Bubble, etc. | Vorhanden, getestet (sound-speech.test.ts — 54 Tests) |
| **i18n** | Deutsch (Default) + Englisch, ~700 Keys pro Sprache, `t()` Hook | Vorhanden, getestet (i18n.test.ts — 24 Tests) |
| **Theme** | Dark/Light/System, 6 Akzentfarben, 9 Hintergrundmuster | Vorhanden, minimal getestet |
| **TV-Display** | Fullscreen-Overlay, Timer permanent, 6+ rotierende Screens (Spieler/Stats/Payout/Schedule/Chips/Seating/Liga), Ticker-Banner | Vorhanden, BroadcastChannel getestet (display-channel.test.ts) |
| **Remote Control** | PeerJS WebRTC, QR-Scan-Pairing, Touch-Controller-UI, Auto-Reconnect | Vorhanden, Logic getestet |
| **Persistenz** | IndexedDB (Cache-First), localStorage-Fallback, Migration, Checkpoint-Save/Restore | Vorhanden, getestet (Logic + persistence.test.ts — 24 Tests) |
| **Templates** | Save/Load/Delete, JSON Export/Import, 3 Built-in Presets | Vorhanden, getestet (Logic) |
| **Historie** | Auto-Save, max 50 Eintraege, Spieler-Statistiken, Text/CSV-Export | Vorhanden, getestet (Logic) |
| **QR-Codes** | App-URL QR, Turnierergebnis-QR (#r=), Liga-Standings-QR (#ls=) | Vorhanden, getestet (Logic) |
| **PWA** | Service Worker, Manifest, installierbar, Offline-Audio | Vorhanden, nicht getestet (manuell) |
| **Wake Lock** | Bildschirm bleibt an waehrend Turnier | Vorhanden, nicht getestet (manuell) |
| **Keyboard Shortcuts** | Space, N, V, R, F, L, T, H, C (9 Shortcuts im Game-Mode) | Vorhanden, getestet (hooks.test.tsx — 19 Tests) |
| **Side-Pot-Rechner** | Main/Side-Pot-Berechnung, Winner-Zuordnung, Split-Pot | Vorhanden, getestet (Logic) |
| **Setup-Wizard** | 5-Schritte-Ersteinrichtung fuer neue Nutzer | Vorhanden, nicht getestet (manuell) |
| **Druckansicht** | Print-optimierte Blindstruktur, Chips, Payout, Liga-Standings | Vorhanden, getestet (Component) |
| **Screenshot/Share** | html-to-image Capture, Web Share API, PNG Download | Vorhanden, nicht getestet (manuell) |
| **Call the Clock** | Shot-Clock-Countdown (10-300s), Tension-Beeps, Auto-Close | Vorhanden, getestet (Component) |
| **Hand-for-Hand** | Manueller Toggle, Pause/Resume-Zyklus, Auto-Deaktivierung | Vorhanden, getestet (controls.test.tsx, hooks.test.tsx) |
| **Last Hand** | Toggle + Banner + Voice, Auto-Reset bei Level-Wechsel | Vorhanden, getestet (controls.test.tsx) |
| **Bubble/ITM** | Automatische Erkennung, Banner, Sound, Flash | Vorhanden, getestet (Component + hooks.test.tsx) |
| **Clean View** | Reduzierte Ansicht ohne Stats/Sidebars | Vorhanden, getestet (controls.test.tsx) |

### A.2 Unklarheiten und Verifikationsbedarf

| Punkt | Status | Zu pruefen |
|-------|--------|------------|
| Offline-Verhalten PWA | Vermutlich vorhanden | Service Worker Caching, Audio offline, App-Start ohne Netz |
| BroadcastChannel TV-Sync | Vorhanden im Code | Cross-Tab-Timing, Reconnect bei Tab-Schliessung |
| Safe-Area-Insets (iPhone) | Im Code referenziert | Tatsaechliches Rendering auf Geraeten mit Notch |
| Tablet-spezifisches Layout | Breakpoints vorhanden (md:) | Tatsaechliche Darstellung auf iPad |
| Fullscreen API | Im Code mit webkit-Prefix | Verhalten in Safari, Firefox, mobile Browser |
| File System Access API | Im TemplateManager | Fallback auf Safari/Firefox, Dialog-Verhalten |
| Mystery Bounty Pool-Exhaustion | Logic vorhanden | Was passiert wenn Pool leer ist |
| Re-Entry nach Final Table | Logic vorhanden | Interaction mit Multi-Table-Dissolution |
| Liga-Import v1 -> v2 Kompatibilitaet | Im Code referenziert | Tatsaechlicher Import alter Formate |

### A.3 Testumfang-Ableitung

**598 bestehende Tests** decken primaer Domain-Logic ab (~80% Abdeckung). Signifikante Luecken:

1. **UI-Komponenten**: 15 von ~47 Komponenten getestet (~32%)
2. **Integration/Workflows**: 0 Tests fuer App-Level-Ablaeufe
3. **E2E**: 0 Tests
4. **Keyboard Shortcuts**: 0 Tests fuer 9 Game-Mode-Shortcuts
5. **Hooks**: 3 von 8 Custom Hooks getestet (useTimer, useConfirmDialog, useVoiceAnnouncements)
6. **i18n-Vollstaendigkeit**: 0 automatisierte Pruefungen
7. **Accessibility**: 0 Tests
8. **Responsive/Visual**: 0 Tests

---

## Abschnitt B — Teststrategie

### B.1 Gesamtstrategie (5 Stufen)

```
Stufe 1: Smoke Tests (30 Min)
    → App startet, Timer laeuft, Turnier beginnt/endet

Stufe 2: Kritische Kernprozesse (2-3 Std)
    → Setup → Game → Finish Workflow
    → Timer-Praezision, Blind-Wechsel, Spieler-Elimination
    → Persistenz (Checkpoint, Reload)

Stufe 3: Vollstaendige Funktionspruefung (4-6 Std)
    → Alle Features systematisch durchgehen
    → Jede Einstellung, jeder Button, jeder Modus

Stufe 4: Edge Cases & Regression (2-3 Std)
    → Extremwerte, Fehlbedienung, Browser-Unterschiede
    → Bekannte Risiken gezielt pruefen

Stufe 5: Exploratives Testen (1-2 Std)
    → Freies Testen ohne Skript
    → Unerwartete Kombinationen
    → "Was passiert wenn..."-Szenarien
```

### B.2 Empfohlene Testreihenfolge

| Prioritaet | Bereich | Begruendung |
|------------|---------|-------------|
| 1 | Timer-Grundfunktion | Kernprodukt, alles haengt davon ab |
| 2 | Setup → Game → Finish Workflow | Hauptanwendungsfall |
| 3 | Persistenz (Checkpoint/Reload) | Datenverlust = kritisch |
| 4 | Blind-Wechsel & Pausen | Turnierlogik-Kern |
| 5 | Spieler-Elimination & Payout | Finanziell relevant |
| 6 | Sound/Voice | Wichtig fuer UX, aber nicht kritisch |
| 7 | i18n DE/EN | Vollstaendigkeit sicherstellen |
| 8 | Liga-Modus | Komplexes Feature, eigener Modus |
| 9 | Multi-Table | Seltener genutzt, aber komplex |
| 10 | Remote Control | Abhaengig von Netzwerk/PeerJS |
| 11 | TV-Display | Abhaengig von zweitem Fenster |
| 12 | Edge Cases & Responsive | Absicherung |

---

## Abschnitt C — Detaillierter manueller Testplan

### C.1 Timer & Grundfunktion

| ID | Ziel | Vorbedingungen | Testschritte | Erwartetes Ergebnis | Prio | Auto |
|----|------|----------------|--------------|---------------------|------|------|
| T-001 | App startet fehlerfrei | Frische Installation | 1. App oeffnen (localhost oder Vercel) 2. Auf Console-Fehler pruefen | App zeigt Setup-Seite, keine Console-Errors | Hoch | Ja |
| T-002 | Setup-Wizard bei Erstbesuch | localStorage leeren | 1. `localStorage.clear()` 2. App neu laden | Wizard erscheint mit 5 Schritten | Hoch | Ja |
| T-003 | Wizard ueberspringen | Wizard offen | 1. "Ueberspringen" klicken | Setup-Seite erscheint, Wizard kommt nicht wieder | Hoch | Ja |
| T-004 | Wizard durchlaufen | Wizard offen | 1. Jeden Schritt mit Weiter durchgehen 2. Im letzten Schritt "Start" | Config wird generiert, Setup-Seite mit Werten | Mittel | Spaeter |
| T-005 | Timer starten | Setup abgeschlossen, Turnier gestartet | 1. Play-Button klicken (oder Space) | Timer zaehlt runter, Status "running" | Hoch | Ja |
| T-006 | Timer pausieren | Timer laeuft | 1. Pause-Button klicken (oder Space) | Timer stoppt, verbleibende Zeit eingefroren | Hoch | Ja |
| T-007 | Timer fortsetzen | Timer pausiert | 1. Play-Button klicken (oder Space) | Timer laeuft weiter ab dem Pausenpunkt | Hoch | Ja |
| T-008 | Naechster Level | Timer laeuft oder pausiert | 1. Next-Button klicken (oder N) | Naechster Level aktiv, Timer startet automatisch | Hoch | Ja |
| T-009 | Vorheriger Level | Nicht auf Level 1 | 1. Prev-Button klicken (oder V) | Vorheriger Level aktiv, Timer startet automatisch | Hoch | Ja |
| T-010 | Level zuruecksetzen | Timer laeuft | 1. Reset-Button klicken (oder R) | Aktueller Level, volle Dauer, Timer pausiert | Hoch | Ja |
| T-011 | Turnier neustarten | Im Spielmodus | 1. Restart-Button klicken 2. Bestaetigung | Zurueck auf Level 1, alle Spieler aktiv, Timer pausiert | Hoch | Ja |
| T-012 | Zeitanzeige korrekt | Timer laeuft | 1. Timer 30s laufen lassen 2. Mit Uhr vergleichen | Maximal 1s Abweichung nach 30s | Hoch | Ja |
| T-013 | Timer-Drift bei Langzeitlauf | Timer laeuft | 1. Timer 10 Min laufen lassen 2. Mit externer Uhr vergleichen | Maximal 1s Abweichung nach 10 Min | Hoch | Nein |
| T-014 | Timer bei Tab-Wechsel | Timer laeuft | 1. Tab wechseln 2. 30s warten 3. Zurueck wechseln | Timer zeigt korrekte Zeit (wall-clock, kein Drift) | Hoch | Nein |
| T-015 | Timer bei Minimierung | Timer laeuft | 1. Browser minimieren 2. 30s warten 3. Wiederherstellen | Timer zeigt korrekte Zeit | Hoch | Nein |
| T-016 | Timer bei Bildschirm-Sleep | Timer laeuft, Laptop | 1. Deckel schliessen 2. Wieder oeffnen | Timer zeigt korrekte Zeit (wall-clock basiert) | Mittel | Nein |
| T-017 | Countdown letzte 10s | Timer < 15s verbleibend | 1. Warten bis < 10s | Akustischer/verbaler Countdown jede Sekunde | Hoch | Nein |
| T-018 | Auto-Advance Level | Timer abgelaufen, autoAdvance=true | 1. Warten bis 0:00 | Automatischer Wechsel zum naechsten Level | Hoch | Ja |
| T-019 | Kein Auto-Advance | Timer abgelaufen, autoAdvance=false | 1. Warten bis 0:00 | Timer bleibt auf 0:00, kein Wechsel | Hoch | Ja |
| T-020 | Scrub-Slider | Timer laeuft oder pausiert | 1. Fortschrittsbalken klicken/ziehen | Verbleibende Zeit aendert sich entsprechend Position | Mittel | Spaeter |
| T-021 | Seiten-Reload waehrend Timer | Timer laeuft | 1. F5 / Browser Reload | Checkpoint-Banner erscheint, "Turnier fortsetzen" moeglich | Hoch | Ja |
| T-022 | Checkpoint fortsetzen | Checkpoint-Banner sichtbar | 1. "Turnier fortsetzen" klicken | Spielstand wiederhergestellt, Timer PAUSIERT (nicht laufend) | Hoch | Ja |
| T-023 | Checkpoint verwerfen | Checkpoint-Banner sichtbar | 1. "Verwerfen" klicken | Setup-Seite, alter Checkpoint geloescht | Hoch | Ja |
| T-024 | Letzter Level erreicht | Auf vorletztem Level | 1. Next-Button klicken | Letzter Level aktiv, Next zeigt Turnierende | Mittel | Ja |
| T-025 | Anzeige aktueller + naechster Level | Im Spielmodus | 1. Aktuelle und naechste Blinds pruefen | Aktuelle Blinds gross, naechste Blinds in Vorschau sichtbar | Hoch | Nein |

### C.2 Turnier- und Blindlogik

| ID | Ziel | Vorbedingungen | Testschritte | Erwartetes Ergebnis | Prio | Auto |
|----|------|----------------|--------------|---------------------|------|------|
| B-001 | Blindstruktur generieren (Normal) | Setup-Seite | 1. BlindGenerator oeffnen 2. "Normal" waehlen 3. "Uebernehmen" | 15+ Levels mit steigenden Blinds, Pausen alle 4 Levels | Hoch | Ja |
| B-002 | Blindstruktur generieren (Schnell) | Setup-Seite | 1. "Schnell" waehlen 2. Uebernehmen | Kuerzere Levels (6 Min), steilere Progression | Hoch | Ja |
| B-003 | Blindstruktur generieren (Langsam) | Setup-Seite | 1. "Langsam" waehlen 2. Uebernehmen | Laengere Levels (20 Min), sanftere Progression | Hoch | Ja |
| B-004 | Blinds nach Ziel-Endzeit | Setup-Seite | 1. Tab "Endzeit" waehlen 2. 120 Min eingeben 3. Uebernehmen | Struktur passt ungefaehr in 120 Min (±10 Min laut Schaetzung) | Mittel | Ja |
| B-005 | Chip-aware Blindstruktur | Chips aktiviert, kleinster Chip = 25 | 1. Blindstruktur generieren | Alle Blinds sind Vielfache von 25 | Hoch | Ja |
| B-006 | Ante-Berechnung Standard | Ante aktiviert, Standard-Modus | 1. Blindstruktur generieren/pruefen | Antes ~12.5% des Big Blind, gerundet auf "nice" Werte | Mittel | Ja |
| B-007 | Big Blind Ante (BBA) | Ante aktiviert, BBA-Modus | 1. BBA Toggle waehlen 2. Blindstruktur pruefen | Ante = Big Blind fuer jeden Level, Anzeige "BBA" statt "Ante" | Mittel | Ja |
| B-008 | Pausen in Blindstruktur | Blindstruktur mit Pausen | 1. Level-Tabelle durchgehen | Pausen haben keine Blinds, eigene Dauer, Label "Pause" | Hoch | Nein |
| B-009 | Benannte Pausen | Pause mit Label editiert | 1. Pause-Label auf "Dinner Break" aendern 2. Turnier starten, Pause erreichen | Label "Dinner Break" wird angezeigt und angesagt | Mittel | Nein |
| B-010 | Manuelle Level-Bearbeitung | ConfigEditor offen | 1. Blind-Werte manuell aendern 2. Dauer aendern 3. Level hinzufuegen/entfernen | Aenderungen werden uebernommen und validiert | Hoch | Spaeter |
| B-011 | Globale Dauer aendern | ConfigEditor offen | 1. "Alle Spiel-Level: X Min" aendern | Alle Play-Levels haben neue Dauer, Pausen unveraendert | Mittel | Ja |
| B-012 | Ungueltige Blinds (BB < SB) | ConfigEditor | 1. SB=100, BB=50 eingeben | Validierungsfehler wird angezeigt | Hoch | Ja |
| B-013 | Level ohne Dauer | ConfigEditor | 1. Dauer auf 0 setzen | Validierungsfehler wird angezeigt | Hoch | Ja |
| B-014 | Sehr kurze Level (30s) | ConfigEditor | 1. Level-Dauer auf 0.5 Min setzen 2. Turnier starten | Timer funktioniert korrekt, schneller Wechsel | Mittel | Spaeter |
| B-015 | Sehr lange Level (60 Min) | ConfigEditor | 1. Level-Dauer auf 60 Min setzen 2. Turnier starten | Timer funktioniert korrekt, keine Drift-Probleme | Mittel | Nein |
| B-016 | Dauer-Schaetzung | BlindGenerator, 8 Spieler | 1. Geschaetzte Dauer pruefen | Realistische Schaetzung unter Beruecksichtigung der Spielerzahl | Mittel | Ja |
| B-017 | Chip-Blind-Kompatibilitaet | Chips aktiv, Blindstruktur inkompatibel | 1. Chip-Werte so aendern, dass Blinds nicht darstellbar sind | Warnung wird angezeigt | Hoch | Ja |
| B-018 | Color-Up-Schedule | Chips aktiv | 1. Color-Up-Plan pruefen | Chip-Entfernung an passende Pausen gekoppelt, editierbar | Mittel | Nein |
| B-019 | Level-Wechsel korrekte Reihenfolge | Turnier laeuft, mehrere Level | 1. Durch 5+ Level navigieren 2. Reihenfolge pruefen | Exakte Reihenfolge wie in Setup definiert | Hoch | Nein |
| B-020 | Pause → Play-Level Wechsel | Pause aktiv | 1. Pause abwarten/skippen | Naechster Level ist Play-Level mit korrekten Blinds | Hoch | Nein |

### C.3 Spieler- und Spielmoduslogik

| ID | Ziel | Vorbedingungen | Testschritte | Erwartetes Ergebnis | Prio | Auto |
|----|------|----------------|--------------|---------------------|------|------|
| P-001 | Spieler hinzufuegen | Setup-Seite | 1. NumberStepper auf 8 erhoehen | 8 Spieler mit Default-Namen | Hoch | Ja |
| P-002 | Spieler entfernen | 8 Spieler | 1. NumberStepper auf 6 reduzieren | Letzte 2 Spieler entfernt | Hoch | Ja |
| P-003 | Spielernamen aendern | Setup-Seite | 1. Namen editieren: "Max", "Anna" | Namen werden uebernommen und im Spiel angezeigt | Hoch | Ja |
| P-004 | Spieler-Autocomplete | Spieler-Datenbank vorhanden | 1. Im Namensfeld tippen | Datalist zeigt passende Vorschlaege | Mittel | Spaeter |
| P-005 | Spieler-Reihenfolge (Drag&Drop) | Setup-Seite | 1. Spieler per Drag&Drop umsortieren | Neue Reihenfolge gespeichert | Mittel | Nein |
| P-006 | Spieler-Reihenfolge (Pfeile) | Setup-Seite | 1. Hoch/Runter-Pfeile klicken | Spieler wechseln Position | Mittel | Ja |
| P-007 | Spieler shufflen | Setup-Seite | 1. Shuffle-Button 2. Bestaetigung | Zufaellige Reihenfolge, Dealer zufaellig | Mittel | Ja |
| P-008 | Dealer setzen | Setup-Seite | 1. Dealer-Button bei Spieler klicken | Dealer-Badge bei gewaehltem Spieler | Hoch | Ja |
| P-009 | Dealer-Rotation | Spielmodus | 1. "Dealer weiter" Button klicken | Dealer springt zum naechsten aktiven Spieler | Hoch | Ja |
| P-010 | Dealer ueberspringt Eliminierte | 2+ eliminierte Spieler | 1. "Dealer weiter" klicken | Dealer springt ueber eliminierte Spieler hinweg | Hoch | Ja |
| P-011 | Spieler eliminieren | Spielmodus, 6+ aktive Spieler | 1. Eliminieren-Button klicken 2. Killer waehlen (bei Bounty) | Spieler grau markiert, Placement vergeben | Hoch | Ja |
| P-012 | Spieler reinstaten | Eliminierter Spieler vorhanden | 1. Reinstate-Button klicken | Spieler wieder aktiv, Placement zurueckgesetzt | Hoch | Ja |
| P-013 | Bubble-Erkennung | activePlayers = paidPlaces + 1 | 1. Spieler eliminieren bis Bubble | "BUBBLE!"-Banner erscheint, Sound | Hoch | Ja |
| P-014 | In The Money | activePlayers = paidPlaces | 1. Bubble-Spieler eliminieren | "In The Money!"-Flash (5s), Sound | Hoch | Ja |
| P-015 | Turnier-Sieger | Letzter Spieler uebrig | 1. Vorletzten Spieler eliminieren | Turnierende-Screen, Sieger angezeigt, Victory-Sound | Hoch | Ja |
| P-016 | Rebuy waehrend Phase | Rebuy aktiv | 1. Rebuy-Button bei Spieler klicken | Rebuy-Counter +1, Stack erhoeht (wenn Tracking aktiv) | Hoch | Ja |
| P-017 | Rebuy nach Phase-Ende | Rebuy-Phase abgelaufen | 1. Rebuy-Button suchen | Kein Rebuy-Button mehr sichtbar | Hoch | Ja |
| P-018 | Per-Player Rebuy-Cap | maxRebuysPerPlayer = 2 | 1. Spieler 2x rebuyen 2. Erneut versuchen | Dritter Rebuy nicht moeglich | Hoch | Ja |
| P-019 | Add-On-Fenster | Rebuy-Phase endet | 1. Bis zum Add-On-Level spielen | Add-On-Banner erscheint, Add-On-Buttons sichtbar | Hoch | Nein |
| P-020 | Add-On nehmen | Add-On-Fenster offen | 1. Add-On-Button klicken | AddOn = true, Stack erhoeht | Hoch | Ja |
| P-021 | Hand-for-Hand | Bubble aktiv | 1. H-Taste druecken | Rotes Banner "Hand-for-Hand", Timer pausiert, "Naechste Hand"-Button | Hoch | Nein |
| P-022 | Hand-for-Hand beenden | Hand-for-Hand aktiv, Bubble platzt | 1. Bubble-Spieler eliminieren | Hand-for-Hand automatisch deaktiviert | Hoch | Nein |
| P-023 | Last Hand Toggle | Spielmodus | 1. L-Taste druecken | Amber "Letzte Hand"-Banner, Voice-Ansage | Mittel | Nein |
| P-024 | Last Hand Auto-Reset | Last Hand aktiv, Level wechselt | 1. Level wechseln | Last-Hand-Banner verschwindet | Mittel | Ja |
| P-025 | Stack-Initialisierung | Stack-Tracking aktiviert | 1. "Stacks initialisieren" klicken | Alle aktiven Spieler erhalten berechneten Stack | Mittel | Ja |
| P-026 | Chip-Leader-Badge | Stack-Tracking, unterschiedliche Stacks | 1. Stacks pruefen | Spieler mit meisten Chips hat "CL"-Badge | Mittel | Ja |
| P-027 | Spaete Registrierung | lateRegistration aktiv, innerhalb Limit | 1. "Spieler hinzufuegen" im Spielmodus | Neuer Spieler wird aufgenommen | Mittel | Ja |
| P-028 | Spaete Registrierung geschlossen | Ueber Level-Limit | 1. "Spieler hinzufuegen" suchen | Button nicht verfuegbar oder Hinweis | Mittel | Ja |
| P-029 | Re-Entry | Re-Entry aktiviert, Spieler eliminiert | 1. Re-Entry-Button bei eliminiertem Spieler | Neuer Spieler-Eintrag mit frischem Stack, Original-Verknuepfung | Mittel | Ja |
| P-030 | Multi-Table Verteilung | Multi-Table aktiv, 16 Spieler, 2 Tische | 1. Turnier starten | Spieler gleichmaessig verteilt (8/8), Seat-Badges sichtbar | Mittel | Ja |
| P-031 | Multi-Table Balance | 9/7 Verteilung nach Elimination | 1. Spieler am groesseren Tisch eliminieren | Auto-Balance oder Balance-Button sichtbar | Mittel | Ja |
| P-032 | Final Table Merge | Nur 1 Tisch uebrig | 1. Spieler eliminieren bis Merge | Final-Table-Anzeige, Voice-Ansage | Mittel | Nein |
| P-033 | Side-Pot-Rechner | Spielmodus | 1. Side-Pot-Button klicken 2. Stacks eingeben 3. Berechnen | Korrekte Main/Side-Pot-Aufteilung | Mittel | Spaeter |
| P-034 | Bounty-Tracking (Fixed) | Bounty aktiv | 1. Spieler eliminieren | Killer erhaelt Bounty, Bounty-Tabelle aktualisiert | Mittel | Nein |
| P-035 | Mystery Bounty Draw | Mystery Bounty aktiv | 1. Spieler eliminieren | Zufaelliger Betrag aus Pool gezogen, Voice-Ansage | Mittel | Nein |
| P-036 | Turnierende Payout | Turnier beendet | 1. Payout-Tabelle pruefen | Korrekte Betraege laut Payout-Config, Prizepool stimmt | Hoch | Ja |
| P-037 | Turnier-Historie Auto-Save | Turnier beendet | 1. Turnier beenden 2. Zu Setup zurueck 3. Historie oeffnen | Turnier in Historie gespeichert | Hoch | Ja |

### C.4 Sprache / Lokalisierung

| ID | Ziel | Vorbedingungen | Testschritte | Erwartetes Ergebnis | Prio | Auto |
|----|------|----------------|--------------|---------------------|------|------|
| I-001 | Deutsch vollstaendig | App auf Deutsch | 1. Alle Sektionen im Setup durchgehen 2. Turnier starten, alle Screens pruefen | Keine englischen Woerter, keine fehlenden Uebersetzungen | Hoch | Ja (Keys) |
| I-002 | Englisch vollstaendig | App auf Englisch | 1. Alle Sektionen im Setup durchgehen 2. Turnier starten, alle Screens pruefen | Keine deutschen Woerter, keine fehlenden Uebersetzungen | Hoch | Ja (Keys) |
| I-003 | Sprachwechsel im Setup | Setup-Seite | 1. DE→EN wechseln | Alle Labels, Buttons, Hinweise sofort auf Englisch | Hoch | Nein |
| I-004 | Sprachwechsel im Spielmodus | Turnier laeuft | 1. DE→EN wechseln | Timer-Labels, Buttons, Banner wechseln sofort | Hoch | Nein |
| I-005 | Sprachwechsel persistiert | Sprache gewechselt | 1. App neu laden | Gewaehlte Sprache bleibt gesetzt | Hoch | Ja |
| I-006 | Default-Spielernamen bei Sprachwechsel | Neue Spieler hinzufuegen | 1. Auf EN wechseln 2. Spieler hinzufuegen | "Player 7" statt "Spieler 7" | Mittel | Ja |
| I-007 | Fehlermeldungen uebersetzt | Validierung ausloesen | 1. Ungueltige Config eingeben 2. Sprache wechseln 3. Gleiche Validierung | Fehlertexte in korrekter Sprache | Mittel | Spaeter |
| I-008 | Buttons nicht abgeschnitten | Alle Buttons pruefen (beide Sprachen) | 1. Visuell alle Buttons in DE pruefen 2. In EN pruefen | Kein Text abgeschnitten, kein Overflow | Mittel | Nein |
| I-009 | Parametrisierte Strings | z.B. Spieleranzeige, Payout-Texte | 1. Texte mit Variablen pruefen (z.B. "3 Spieler", "Platz 1: 50€") | Parameter korrekt eingesetzt, keine Platzhalter sichtbar | Mittel | Ja |
| I-010 | Voice-Sprache sync | Sprachausgabe aktiv | 1. Sprache wechseln 2. Level-Wechsel abwarten | Ansagen in korrekter Sprache (DE/EN MP3s) | Hoch | Nein |
| I-011 | Mischsprache-Pruefung | App auf Deutsch | 1. Jeden Screen systematisch nach Englisch scannen (Setup, Game, Finish, Liga, TV) | Keine unuebersetzten Strings | Hoch | Nein |
| I-012 | Liga-Modus uebersetzt | Liga-View | 1. Alle Tabs durchgehen (Tabelle, Spieltage, Finanzen) 2. In beiden Sprachen | Vollstaendig uebersetzt, keine Keys sichtbar | Mittel | Nein |
| I-013 | Translation-Key-Paritaet | Code-Pruefung | 1. DE-Keys zaehlen 2. EN-Keys zaehlen 3. Vergleichen | Identische Anzahl, keine fehlenden Keys | Hoch | Ja |

### C.5 Sound / Audio

| ID | Ziel | Vorbedingungen | Testschritte | Erwartetes Ergebnis | Prio | Auto |
|----|------|----------------|--------------|---------------------|------|------|
| S-001 | Beep bei Countdown (letzte 10s) | Sound an, Timer < 15s | 1. Warten bis < 10s | Beep jede Sekunde, klar hoerbar | Hoch | Nein |
| S-002 | Level-Wechsel-Sound | Sound an, Timer laeuft ab | 1. Level-Ende abwarten | Hoerbarer Signalton beim Wechsel | Hoch | Nein |
| S-003 | Victory-Sound | Turnier endet (1 Spieler uebrig) | 1. Letzten Spieler eliminieren | Melodie (~1.7s), kein Abbruch | Hoch | Nein |
| S-004 | Bubble-Sound | Bubble wird erreicht | 1. Spieler eliminieren bis Bubble | Spannungs-Sound (Sawtooth, ~1.45s) | Mittel | Nein |
| S-005 | ITM-Sound | In The Money erreicht | 1. Bubble-Spieler eliminieren | Fanfare (~0.7s) | Mittel | Nein |
| S-006 | Sound Mute | Sound auf Aus gestellt | 1. Alle Soundereignisse ausloesen | Kein Sound hoerbar | Hoch | Nein |
| S-007 | Lautstaerke-Regler | Sound an | 1. Volume auf 20% setzen 2. Sound ausloesen 3. Volume auf 100% setzen 4. Sound ausloesen | Deutlicher Lautstaerkeunterschied | Mittel | Nein |
| S-008 | Sound nach Reload | Timer laeuft, Sound an | 1. Seite neu laden 2. Turnier fortsetzen 3. Sound-Event abwarten | Sound funktioniert nach Reload | Hoch | Nein |
| S-009 | Sound nach Tab-Wechsel | Timer laeuft, Sound an | 1. Tab wechseln, 30s warten 2. Zurueck wechseln 3. Sound-Event abwarten | Sound funktioniert | Mittel | Nein |
| S-010 | Autoplay-Blockade (Safari) | Safari, frischer Tab | 1. App oeffnen ohne Klick 2. Timer starten (erster Klick) 3. Sound-Event abwarten | Sound funktioniert nach erstem User-Gesture | Hoch | Nein |
| S-011 | Voice-Ansage Level-Wechsel | Voice an, Level wechselt | 1. Level-Wechsel abwarten | Ansage: "Level X, Blinds Y/Z" in korrekter Sprache | Hoch | Nein |
| S-012 | Voice-Ansage Pause | Voice an, Pause beginnt | 1. Pause abwarten | Ansage: "Pause, X Minuten" | Hoch | Nein |
| S-013 | Voice-Ansage Pause-Ende (30s Warnung) | Voice an, Pause laeuft | 1. 30s vor Pausen-Ende warten | Warnung: "Pause endet in 30 Sekunden" | Mittel | Nein |
| S-014 | Voice-Ansage Turnierstart | Voice an | 1. Turnier starten | "Shuffle up and deal!" | Mittel | Nein |
| S-015 | Voice-Countdown Play-Level | Voice an, < 10s | 1. Letzte 10s in Play-Level abwarten | Verbaler Countdown "10, 9, 8... 1" | Hoch | Nein |
| S-016 | Voice-Countdown Pause (nur Beeps) | Voice an, Pause, < 10s | 1. Letzte 10s in Pause abwarten | Nur Beeps, KEIN verbaler Countdown | Mittel | Nein |
| S-017 | Voice-Sound-Koordination | Voice + Sound an | 1. Sound-Event + Voice gleichzeitig | Sound zuerst, dann Voice (kein Ueberlappen) | Mittel | Nein |
| S-018 | VoiceSwitcher Toggle | Header | 1. Sound-only / Voice umschalten | Sofortiger Wechsel, konsistentes Verhalten | Mittel | Nein |
| S-019 | MP3-Fallback auf Web Speech | MP3 nicht verfuegbar (z.B. Offline ohne Cache) | 1. Voice-Event ausloesen | Web Speech API als Fallback | Mittel | Nein |
| S-020 | Call-the-Clock Beeps | Call the Clock aktiv, < 10s | 1. Warten bis < 10s | Tension-Beeps, zunehmende Frequenz | Mittel | Nein |
| S-021 | Elimination Voice | Spieler wird eliminiert, Voice an | 1. Spieler eliminieren | "Ein Spieler ist ausgeschieden!" | Mittel | Nein |
| S-022 | Turnier-Sieger Voice | Voice an, Turnier endet | 1. Letzten eliminieren | "Der Gewinner ist [Name]!" personalisiert | Mittel | Nein |
| S-023 | Color-Up Voice | Color-Up Level erreicht | 1. Entsprechenden Level erreichen | Ansage ueber Chip-Entfernung | Niedrig | Nein |
| S-024 | Alle Sound-Events Desktop vs. Mobile | Sound an | 1. Alle Events auf Desktop testen 2. Alle Events auf Smartphone testen | Gleiche Sounds, keine fehlenden Events | Mittel | Nein |

### C.6 UI/UX und Bedienbarkeit

| ID | Ziel | Vorbedingungen | Testschritte | Erwartetes Ergebnis | Prio | Auto |
|----|------|----------------|--------------|---------------------|------|------|
| U-001 | Setup-Verstaendlichkeit | Neuer Nutzer | 1. Setup betrachten: Sind Sektionen logisch geordnet? Sind Pflichtfelder erkennbar? | Intuitive Struktur, Pflichtfelder sichtbar | Hoch | Nein |
| U-002 | Collapsible Sections | Setup-Seite | 1. Jede Sektion ein-/ausklappen 2. Summary-Badges pruefen | Alle Sektionen klappbar, Summaries korrekt | Hoch | Nein |
| U-003 | Start-Button Validierung | Setup, ungueltige Config | 1. Pflichtfeld leer lassen 2. Start klicken | Fehlermeldung, kein Turnier-Start | Hoch | Ja |
| U-004 | Buttons in allen Zustaenden | Spielmodus | 1. Play/Pause/Next/Prev/Reset pruefen bei: gestoppt, laufend, pausiert, beendet | Korrekte Labels und Aktivitaetszustaende | Hoch | Nein |
| U-005 | Dark Mode Setup | Dark Mode aktiv | 1. Setup-Seite durchgehen | Alle Elemente lesbar, korrekte Kontraste | Hoch | Nein |
| U-006 | Dark Mode Game | Dark Mode, Spielmodus | 1. Alle Game-Screens pruefen | Timer, Buttons, Banner gut lesbar | Hoch | Nein |
| U-007 | Light Mode Setup | Light Mode aktiv | 1. Setup-Seite durchgehen | Alle Elemente lesbar, korrekte Kontraste | Hoch | Nein |
| U-008 | Light Mode Game | Light Mode, Spielmodus | 1. Alle Game-Screens pruefen | Timer, Buttons, Banner gut lesbar | Hoch | Nein |
| U-009 | System-Theme-Erkennung | System=Dark | 1. Theme auf "System" setzen | App folgt System-Einstellung | Mittel | Nein |
| U-010 | Akzentfarbe wechseln | Settings | 1. Alle 6 Akzentfarben durchprobieren | Buttons, Highlights, Progress-Bar passen sich an | Mittel | Nein |
| U-011 | Hintergrundmuster | Settings | 1. Alle 9 Hintergruende durchprobieren | Pattern korrekt dargestellt, Lesbarkeit erhalten | Mittel | Nein |
| U-012 | Clean View | Spielmodus, F-Taste | 1. Clean View aktivieren | Nur Timer, Blinds, Bubble-Banner sichtbar | Mittel | Nein |
| U-013 | NumberStepper Long-Press | Jeder NumberStepper | 1. +/- Button lang gedrueckt halten | Wert erhoeht/verringert sich schnell (400ms Delay, 100ms Repeat) | Mittel | Nein |
| U-014 | Modal-Verhalten | Jedes Modal (Template, Confirm, etc.) | 1. Modal oeffnen 2. Escape druecken 3. Ausserhalb klicken | Modal schliesst bei Escape, Focus-Management korrekt | Hoch | Spaeter |
| U-015 | Error-Boundary | JS-Fehler im Rendering | 1. Fehler provozieren (wenn moeglich) | Fallback-UI mit Reload-Button statt weisser Seite | Mittel | Ja |
| U-016 | Toast-Benachrichtigungen | Verschiedene Aktionen | 1. Text kopieren, CSV herunterladen, etc. | Toast erscheint, verschwindet automatisch | Mittel | Nein |
| U-017 | Keyboard Shortcuts komplett | Spielmodus | 1. Space(Play/Pause), N(Next), V(Prev), R(Reset), F(CleanView), L(LastHand), T(TV), H(H4H), C(CallClock) | Alle 9 Shortcuts funktionieren | Hoch | Ja |
| U-018 | Keyboard Shortcuts nur in Game | Setup-Seite | 1. Space, N, V etc. druecken | Keine Aktion im Setup (nur im Spielmodus) | Hoch | Ja |
| U-019 | Uhrzeit im Header | Spielmodus | 1. Uhrzeit-Anzeige pruefen | Aktuelle Uhrzeit, aktualisiert sich | Niedrig | Nein |

### C.7 Responsiveness / Geraeteklassen

| ID | Ziel | Vorbedingungen | Testschritte | Erwartetes Ergebnis | Prio | Auto |
|----|------|----------------|--------------|---------------------|------|------|
| R-001 | Desktop (1920×1080) | Chrome, Vollbild | 1. Setup durchgehen 2. Turnier starten 3. Alle Screens pruefen | Alles sauber dargestellt, keine Ueberlaeufe | Hoch | Nein |
| R-002 | Laptop (1366×768) | Kleineres Fenster | 1. Setup + Game pruefen | Layout passt sich an, kein horizontaler Scroll | Hoch | Nein |
| R-003 | Tablet Portrait (768×1024) | iPad oder DevTools | 1. Setup + Game pruefen | Touch-Targets ≥32px, lesbare Schrift | Hoch | Nein |
| R-004 | Tablet Landscape (1024×768) | iPad quer | 1. Setup + Game pruefen | Optimierte Aufteilung | Mittel | Nein |
| R-005 | Smartphone Portrait (375×812) | iPhone oder DevTools | 1. Setup + Game pruefen | Mobile-Layout, Sticky-Start-Button, Touch-Buttons | Hoch | Nein |
| R-006 | Smartphone Landscape (812×375) | iPhone quer | 1. Game-Mode pruefen | Timer lesbar, wichtige Controls erreichbar | Mittel | Nein |
| R-007 | Kleine Smartphones (320×568) | iPhone SE oder DevTools | 1. Setup + Game pruefen | Nichts abgeschnitten, scrollbar | Mittel | Nein |
| R-008 | Touch-Bedienung | Touchscreen-Geraet | 1. Alle Buttons per Touch bedienen 2. Scrub-Slider mit Finger | Alle Touch-Targets erreichbar, kein unbeabsichtigtes Ausloesen | Hoch | Nein |
| R-009 | Safe-Area-Insets | iPhone mit Notch | 1. App im Browser oeffnen | Kein Content unter Notch/Home-Indicator versteckt | Mittel | Nein |
| R-010 | Fullscreen-Modus | Desktop, Spielmodus | 1. Fullscreen-Toggle in Settings aktivieren | Vollbild, kein Browser-Chrome, Escape zum Beenden | Mittel | Nein |

### C.8 Speicherung / Persistenz

| ID | Ziel | Vorbedingungen | Testschritte | Erwartetes Ergebnis | Prio | Auto |
|----|------|----------------|--------------|---------------------|------|------|
| D-001 | Config wird gespeichert | Setup aendern | 1. Buy-In aendern 2. App schliessen + oeffnen | Geaenderter Buy-In vorhanden | Hoch | Ja |
| D-002 | Settings persistent | Einstellungen aendern | 1. Sound aus, Voice an 2. Reload | Einstellungen beibehalten | Hoch | Ja |
| D-003 | Theme persistent | Theme wechseln | 1. Dark Mode waehlen 2. Reload | Dark Mode noch aktiv | Hoch | Ja |
| D-004 | Sprache persistent | Sprache wechseln | 1. EN waehlen 2. Reload | Englisch noch aktiv | Hoch | Ja |
| D-005 | Checkpoint-Save | Turnier laeuft | 1. Beliebige Aktion (Elimination, Rebuy) 2. DevTools: IndexedDB pruefen | Checkpoint aktualisiert nach jeder Aktion | Hoch | Ja |
| D-006 | Template speichern/laden | Templates-Dialog | 1. Template speichern ("Test") 2. Config aendern 3. Template laden | Original-Config wiederhergestellt | Hoch | Ja |
| D-007 | Template loeschen | Template vorhanden | 1. Template loeschen 2. Reload | Template nicht mehr vorhanden | Hoch | Ja |
| D-008 | JSON-Export/Import | Templates-Dialog | 1. Config als JSON exportieren 2. Config aendern 3. JSON importieren | Original-Config wiederhergestellt | Hoch | Ja |
| D-009 | Historie nach Turnierende | Turnier beendet | 1. Turnier beenden 2. Historie oeffnen | Turnier mit Ergebnis in Historie | Hoch | Ja |
| D-010 | Historie max 50 | 50+ Turniere gespielt | 1. 51. Turnier beenden 2. Historie pruefen | Aeltestes Turnier entfernt, maximal 50 | Mittel | Ja |
| D-011 | Spieler-Datenbank Sync | Turnier beendet | 1. Turnier mit neuen Namen beenden 2. Neues Turnier starten 3. Autocomplete pruefen | Neue Namen in Datenbank | Mittel | Ja |
| D-012 | Liga persistent | Liga erstellen | 1. Liga erstellen 2. Reload | Liga noch vorhanden | Hoch | Ja |
| D-013 | GameDay persistent | Turnier in Liga beendet | 1. Liga-Turnier beenden 2. Reload 3. Liga-Spieltage pruefen | Spieltag gespeichert | Hoch | Ja |
| D-014 | IndexedDB Fallback | IndexedDB blockiert | 1. IndexedDB in DevTools deaktivieren/blockieren 2. App verwenden | App funktioniert mit localStorage-Fallback | Mittel | Nein |
| D-015 | Migration localStorage→IndexedDB | Alte Daten in localStorage | 1. Alte localStorage-Keys manuell setzen 2. App starten | Daten migriert, Flag `poker-timer-migrated` gesetzt | Mittel | Ja |
| D-016 | Akzentfarbe persistent | Farbe wechseln | 1. Blue waehlen 2. Reload | Blue noch aktiv | Mittel | Ja |
| D-017 | Hintergrund persistent | Hintergrund wechseln | 1. "Casino" waehlen 2. Reload | Casino-Hintergrund noch aktiv | Mittel | Ja |
| D-018 | Reset/Loesch-Logik | Daten vorhanden | 1. localStorage.clear() + IndexedDB loeschen 2. Reload | Wizard erscheint, Default-Werte, keine alten Daten | Mittel | Nein |

### C.9 Fehler- und Randfaelle

| ID | Ziel | Vorbedingungen | Testschritte | Erwartetes Ergebnis | Prio | Auto |
|----|------|----------------|--------------|---------------------|------|------|
| E-001 | Leerer Spielername | Setup | 1. Spielernamen loeschen 2. Turnier starten | Akzeptiert (Default-Name) oder Validierung | Mittel | Ja |
| E-002 | Doppelte Spielernamen | Setup | 1. Zwei Spieler "Max" nennen 2. Turnier starten | Kein Crash, Spieler unterscheidbar | Mittel | Ja |
| E-003 | Sonderzeichen in Namen | Setup | 1. Namen: "O'Brien", "Müller-Lüdenscheid", "🃏 King", "<script>" | Korrekte Anzeige, kein XSS, kein Crash | Hoch | Ja |
| E-004 | Sehr langer Spielername | Setup | 1. 50-Zeichen-Namen eingeben | Kein Layout-Bruch, Text ggf. gekuerzt | Mittel | Nein |
| E-005 | 20 Spieler (Maximum) | Setup | 1. 20 Spieler hinzufuegen 2. Turnier starten | Funktioniert, PlayerPanel scrollbar | Mittel | Nein |
| E-006 | 2 Spieler (Minimum) | Setup | 1. 2 Spieler, Turnier starten | Heads-Up funktioniert, Sieger nach 1 Elimination | Hoch | Ja |
| E-007 | Sehr hoher Buy-In | Setup | 1. Buy-In = 100000 2. Turnier mit Rebuys | Prizepool korrekt berechnet, keine Overflow-Probleme | Mittel | Ja |
| E-008 | Buy-In = 0 | Setup | 1. Buy-In = 0 2. Turnier starten | Funktioniert (Freeroll), Prizepool = 0 | Mittel | Ja |
| E-009 | Kein Sound verfuegbar | AudioContext blockiert | 1. Turnier spielen | Kein Crash, Timer laeuft, nur kein Sound | Hoch | Nein |
| E-010 | Schnelles mehrfaches Klicken | Spielmodus | 1. Play/Pause 10x schnell hintereinander klicken | Kein doppelter Timer, korrekter Zustand | Hoch | Nein |
| E-011 | Alle Spieler eliminieren (unmoeglich) | Spielmodus, 2 Spieler | 1. 1 Spieler eliminieren | Turnier endet, kein weiterer Eliminations-Button | Hoch | Ja |
| E-012 | Korrupter Checkpoint | Manuell manipulierter Checkpoint | 1. Checkpoint-Daten in IndexedDB manuell aendern 2. Reload | Fehlermeldung oder Default-Werte, kein Crash | Mittel | Spaeter |
| E-013 | App Offline | Kein Internet | 1. WiFi aus 2. App verwenden | Kernfunktionen laufen (PWA), nur Remote Control faellt aus | Hoch | Nein |
| E-014 | Private Browsing | Safari Private Mode | 1. App oeffnen 2. Config aendern 3. Reload | localStorage/IndexedDB funktioniert oder Fallback greift | Mittel | Nein |
| E-015 | Browser-History Back | Im Spielmodus | 1. Browser-Zurueck-Button druecken | Kein Datenverlust, keine unerwartete Navigation | Mittel | Nein |
| E-016 | Abbruch mitten im Turnier | Turnier laeuft, 3 eliminiert | 1. Browser schliessen 2. App erneut oeffnen | Checkpoint-Banner, Fortsetzen moeglich | Hoch | Nein |
| E-017 | Config-Import ungueltig | Template-Import | 1. Kaputtes JSON importieren | Fehlermeldung, keine Config-Aenderung | Hoch | Ja |
| E-018 | Extremwert: 0 Payout-Plaetze | Payout-Config | 1. Alle Payout-Plaetze entfernen | Validierungsfehler | Mittel | Ja |
| E-019 | Payout-Summe ≠ 100% | Payout-Config (Prozent-Modus) | 1. Prozentwerte so aendern dass Summe = 90% | Validierungsfehler oder Warnung | Hoch | Ja |
| E-020 | Liga ohne Turniere | Liga-View | 1. Neue Liga erstellen 2. Standings pruefen | Leere Tabelle, kein Crash | Mittel | Ja |

### C.10 Performance / Stabilitaet

| ID | Ziel | Vorbedingungen | Testschritte | Erwartetes Ergebnis | Prio | Auto |
|----|------|----------------|--------------|---------------------|------|------|
| PF-001 | App-Startzeit | Frischer Load | 1. Ladezeit messen (Performance DevTools) | < 2s bis interaktiv (LCP) | Mittel | Nein |
| PF-002 | Timer-Tick-Performance | Timer laeuft | 1. React DevTools Profiler oeffnen 2. 10s beobachten | Keine unnoetig haeufigen Re-Renders ausserhalb TimerDisplay | Mittel | Nein |
| PF-003 | Langzeitstabilitaet | Timer laeuft | 1. App 2 Stunden offen lassen 2. Speicherverbrauch in DevTools pruefen | Kein Speicherleck, Tabs Memory stabil | Mittel | Nein |
| PF-004 | Kein doppelter Timer | Play/Pause mehrfach | 1. Schnell Play/Pause wechseln | Nur ein Timer-Intervall aktiv (Performance Monitor) | Hoch | Nein |
| PF-005 | Lazy-Loading | Spielmodus | 1. Network-Tab pruefen | Game-Chunks werden erst bei Bedarf geladen | Mittel | Nein |
| PF-006 | IndexedDB-Schreibperformance | Turnier laeuft | 1. Schnell viele Aktionen (10 Rebuys hintereinander) | Kein spuerbares UI-Lag durch async Writes | Mittel | Nein |
| PF-007 | Viele Level (50+) | ConfigEditor | 1. 50 Level manuell hinzufuegen 2. Turnier starten | Kein Performance-Problem, scrollbarer Level-Editor | Niedrig | Nein |

### C.11 Sicherheit / technische Robustheit

| ID | Ziel | Vorbedingungen | Testschritte | Erwartetes Ergebnis | Prio | Auto |
|----|------|----------------|--------------|---------------------|------|------|
| SEC-001 | XSS in Spielernamen | Setup | 1. Name: `<img src=x onerror=alert(1)>` eingeben | Kein Script-Ausfuehrung, Name escaped dargestellt | Hoch | Ja |
| SEC-002 | XSS in Turniernamen | Setup | 1. Turniername mit HTML-Tags | Kein HTML-Rendering, escaped | Hoch | Ja |
| SEC-003 | Console-Fehler | Gesamte App | 1. Console offen lassen waehrend komplettem Workflow | Keine roten Fehler (Warnungen akzeptabel) | Hoch | Nein |
| SEC-004 | Keine sensitiven Daten | DevTools | 1. localStorage, IndexedDB, Network pruefen | Keine Passwoerter, Tokens, oder sensitive Daten gespeichert | Mittel | Nein |
| SEC-005 | Remote Control Auth | PeerJS-Verbindung | 1. Kommando ohne gueltige HMAC-Signatur senden | Kommando abgelehnt (Rate-Limiter + HMAC-Check) | Mittel | Ja |
| SEC-006 | JSON-Import Validierung | Template-Import | 1. JSON mit extra Properties importieren 2. JSON mit fehlenden Properties | Extra-Props ignoriert, fehlende mit Defaults aufgefuellt | Mittel | Ja |

---

## Abschnitt D — Testmatrix

### D.1 Funktions-Matrix (Pflicht = P, Optional = O)

| Funktion | Desktop Chrome | Desktop Firefox | Desktop Safari | iPad Safari | iPhone Safari | Android Chrome |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|
| Timer Start/Stop/Pause | P | P | P | P | P | P |
| Blind-Wechsel | P | P | O | P | P | O |
| Spieler Elimination | P | P | O | P | P | O |
| Rebuy/Add-On | P | O | O | O | P | O |
| Sound/Beeps | P | P | P | O | P | O |
| Voice-Ansagen | P | O | P | O | P | O |
| Checkpoint Save/Restore | P | P | O | O | P | O |
| Template Save/Load | P | O | O | O | O | O |
| JSON Import/Export | P | O | P | O | O | O |
| Screenshot/Share | P | O | O | O | P | O |
| QR-Code Anzeige | P | O | O | O | P | O |
| TV-Display | P | P | O | O | - | - |
| Remote Control (Host) | P | O | O | O | - | - |
| Remote Control (Controller) | - | - | - | O | P | P |
| Liga-Modus | P | O | O | O | O | O |
| Multi-Table | P | O | O | O | O | O |
| Druckansicht | P | O | P | O | O | O |
| PWA Installation | P | O | P | O | P | O |

### D.2 Sprach-Matrix

| Bereich | Deutsch | Englisch |
|---------|:---:|:---:|
| Setup-Labels | P | P |
| Game-Mode Buttons | P | P |
| Fehlermeldungen | P | P |
| Voice-Ansagen | P | P |
| Liga-Texte | P | P |
| TV-Display | P | P |
| Print-View | P | P |
| Turnier-Ende Screen | P | P |
| Remote Controller | P | P |
| Toast-Benachrichtigungen | P | P |

### D.3 Sound-Matrix

| Ereignis | Sound An | Sound Aus | Voice An | Voice Aus |
|----------|:---:|:---:|:---:|:---:|
| Countdown (10s) | Beeps | Stille | Sprach-Countdown | Stille |
| Level-Wechsel | Beep | Stille | Level-Ansage | Stille |
| Pause Start | Beep | Stille | Pausen-Ansage | Stille |
| Bubble | Tension-Sound | Stille | Bubble-Ansage | Stille |
| ITM | Fanfare | Stille | ITM-Ansage | Stille |
| Victory | Melodie | Stille | Sieger-Ansage | Stille |
| Elimination | - | - | Eliminations-Ansage | Stille |
| Call the Clock | Tension-Beeps | Stille | Clock-Ansage | Stille |

### D.4 Sonderzustaende

| Zustand | Zu pruefen |
|---------|-----------|
| Erster Besuch (kein localStorage) | Wizard, Defaults |
| Nach Migration (localStorage→IndexedDB) | Alle Daten korrekt |
| Checkpoint vorhanden | Banner, Restore, Dismiss |
| Turnier beendet | Ergebnis-Screen, Historie |
| Liga aktiv, Turnier verknuepft | GameDay-Auto-Erstellung |
| Multi-Table, Final Table erreicht | Merge-Logik, Anzeige |
| Offline (kein Netz) | PWA, kein Remote |
| Private Browsing | Storage-Fallback |

---

## Abschnitt E — Automatisierungsstrategie

### E.1 Bestehende Infrastruktur

- **Unit-Tests**: Vitest + `@testing-library/react` (598 Tests)
- **Mocks**: fake-indexeddb, speechSynthesis, matchMedia
- **CI**: GitHub Actions (lint → test → build), Vercel Auto-Deploy

### E.2 Automatisierungs-Pyramide

```
                    /\
                   /  \
                  / E2E \          5-10 Tests (Playwright)
                 /--------\        Kritische User-Flows
                / Visual   \       10-20 Tests (Playwright Snapshots)
               /------------\      Layout-Regression
              / Integration   \    20-40 Tests (Vitest + RTL)
             /----------------\    Komponenten-Workflows
            / Unit              \  500+ Tests (Vitest)
           /--------------------\  Domain Logic (vorhanden)
```

### E.3 Priorisierte Automatisierungs-Roadmap

#### Phase 1: Unit-Test-Luecken schliessen (Vitest, 1-2 Tage)

| Was | Warum | Tests |
|-----|-------|-------|
| i18n Key-Paritaet | DE/EN muessen identisch sein | 1 Test: Keys vergleichen |
| Keyboard Shortcuts Hook | 9 Shortcuts, null getestet | ~15 Tests |
| useGameEvents Hook | Sound-Trigger-Logik | ~8 Tests |
| useTournamentActions Hook | 317 Zeilen Callbacks | ~20 Tests |
| Fehlende Component-Tests | TimerDisplay, Controls, PlayerManager, BlindGenerator | ~40 Tests |

#### Phase 2: Integration-Tests (Vitest + RTL, 2-3 Tage)

| Was | Warum | Tests |
|-----|-------|-------|
| Setup → Game Transition | Kritischer Workflow | ~5 Tests |
| Bubble → ITM Flow | Finanziell relevant | ~5 Tests |
| Checkpoint Save/Restore | Datenverlust-Risiko | ~5 Tests |
| Liga: Turnier → GameDay | Automatische Verknuepfung | ~5 Tests |
| Multi-Table Distribution + Balance | Komplexe Logik | ~5 Tests |

#### Phase 3: E2E-Tests (Playwright, 3-5 Tage)

| Was | Warum | Tests |
|-----|-------|-------|
| Kompletter Turnier-Durchlauf | Rauchtest fuer Releases | 1 Test |
| Setup-Wizard Durchlauf | Erstbenutzer-Erfahrung | 1 Test |
| Template Save/Load/Import/Export | Datenpersistenz | 2 Tests |
| Liga-Modus Kompletttest | Eigener App-Modus | 1 Test |
| TV-Display Oeffnen + Screens | Zweites Fenster | 1 Test |
| Responsive Checks (3 Viewports) | Layout-Validierung | 3 Tests |

#### Phase 4: Spezial-Tests (spaeter, bei Bedarf)

| Was | Tool | Begruendung |
|-----|------|-------------|
| Visual Regression | Playwright Snapshots / Percy | Layout-Aenderungen erkennen |
| Accessibility | axe-core + Playwright | ARIA, Kontraste, Tastaturbedienung |
| Performance | Lighthouse CI | LCP, INP, CLS ueberwachen |
| i18n-Vollstaendigkeit | Custom Vitest | t()-Aufrufe gegen Keys pruefen |

### E.4 Tool-Empfehlung

| Bereich | Tool | Begruendung |
|---------|------|-------------|
| Unit + Component | **Vitest** (bereits vorhanden) | Schnell, konfiguriert, 598 Tests bestehen |
| Component Testing | **@testing-library/react** (bereits vorhanden) | Benutzerorientiert, gute Integration |
| E2E | **Playwright** | Cross-Browser, modernes API, Headless, Screenshot-Vergleich, Multi-Tab-Support (fuer TV-Display) |
| Visual Regression | **Playwright Snapshots** | Integriert in Playwright, kein Extra-Tool |
| Accessibility | **axe-core** (Vitest-Plugin oder Playwright) | Standard-Tool fuer WCAG-Checks |
| Performance | **Lighthouse CI** oder **@vercel/speed-insights** (bereits vorhanden) | Automatisiertes Web-Vitals-Tracking |

### E.5 Was manuell bleiben sollte

| Bereich | Begruendung |
|---------|-------------|
| Audio-Qualitaet (klingt es richtig?) | Subjektiv, nicht automatisierbar |
| Timer-Drift bei Langzeitlauf | Benoetigt reale Zeitmessung ueber Stunden |
| Touch-Feeling auf echten Geraeten | Emulation ≠ Realitaet |
| Responsiveness auf echten Geraeten | DevTools-Emulation deckt nicht alles ab |
| UX-Bewertung (ist es verstaendlich?) | Menschliches Urteil |
| Voice-Ansagen Verstaendlichkeit | Subjektive Hoerqualitaet |
| Remote Control (echtes Phone + Host) | PeerJS Cloud-Signaling schwer zu mocken |
| PWA-Installation auf echtem Geraet | Browser-spezifisches Verhalten |
| Sleep/Wake-Verhalten | OS-abhaengig, nicht simulierbar |

---

## Abschnitt F — Konkreter Umsetzungsplan fuer Claude Code

### Schritt 1: Bestandsaufnahme (abgeschlossen)

- **Ziel**: Features und bestehende Tests vollstaendig erfassen
- **Vorgehen**: Code-Analyse aller Module, Komponenten, Tests
- **Artefakt**: Dieser Testplan
- **Risiken**: Keine — reine Analyse

### Schritt 2: i18n-Paritaetstest

- **Ziel**: Sicherstellen dass DE und EN identische Keys haben
- **Vorgehen**: Test schreiben der `Object.keys(de)` und `Object.keys(en)` vergleicht (inkl. verschachtelter Keys)
- **Artefakt**: 1 neuer Test in `tests/logic.test.ts`
- **Risiken**: Keine — einfacher Key-Vergleich
- **Befehl**: `npm run test` zur Validierung

### Schritt 3: Keyboard-Shortcuts testen

- **Ziel**: Alle 9 Game-Mode Shortcuts abdecken
- **Vorgehen**: `useKeyboardShortcuts` Hook isoliert testen mit `renderHook` + `fireEvent.keyDown`
- **Artefakt**: ~15 neue Tests in `tests/components.test.tsx`
- **Risiken**: Hook benoetigt umfangreiche Mock-Callbacks

### Schritt 4: Fehlende Hook-Tests

- **Ziel**: `useGameEvents`, `useTournamentActions` testen
- **Vorgehen**: Hooks mit `renderHook` testen, Callbacks und Effekte pruefen
- **Artefakt**: ~25 neue Tests
- **Risiken**: `useTournamentActions` hat viele Abhaengigkeiten, Mock-Aufwand hoch

### Schritt 5: Kritische Component-Tests

- **Ziel**: TimerDisplay, Controls, PlayerManager, BlindGenerator testen
- **Vorgehen**: Render mit RTL, User-Events simulieren, Output pruefen
- **Artefakt**: ~40 neue Tests
- **Risiken**: Komponenten benoetigen umfangreiche Props und Context-Provider

### Schritt 6: Integration Smoke-Tests

- **Ziel**: Setup→Game→Finish Workflow als Test
- **Vorgehen**: App.tsx rendern, User-Flow simulieren (Config setzen → Start → Eliminate → Finish)
- **Artefakt**: ~5 Integration-Tests
- **Risiken**: App.tsx hat viele Abhaengigkeiten (IndexedDB, Audio, PeerJS) — umfangreiches Mocking noetig

### Schritt 7: Playwright E2E Setup

- **Ziel**: Playwright installieren und ersten Smoke-Test erstellen
- **Vorgehen**:
  1. `npm install -D @playwright/test`
  2. `playwright.config.ts` erstellen
  3. Ersten Test: App oeffnet, Setup sichtbar, Turnier startet
- **Artefakt**: Playwright-Config + 1 E2E-Test
- **Risiken**: CI-Integration benoetigt Browser-Download in GitHub Actions

### Schritt 8: Regressions-Test-Set

- **Ziel**: Definiertes Set an Tests das vor jedem Release laeuft
- **Vorgehen**: Tests taggen/gruppieren (smoke, critical, full)
- **Artefakt**: npm-Scripts: `test:smoke`, `test:critical`, `test:full`
- **Risiken**: Keine

---

## Abschnitt G — Risiken und blinde Flecken

### G.1 Timer-spezifische Risiken

| Risiko | Beschreibung | Gegenmassnahme |
|--------|-------------|----------------|
| **Zeitdrift** | setInterval driftet bei langer Laufzeit | Wall-clock-basiert (implementiert), trotzdem manuell pruefen bei 2h+ |
| **Doppelter Timer** | Schnelles Play/Pause erzeugt mehrere Intervalle | useTimer nutzt useRef fuer Intervall-ID, aber kein Test dafuer |
| **Timer nach Sleep** | Laptop-Deckel zu → Timer steht | Wall-clock korrigiert sich, aber Wake Lock geht verloren |
| **Timer bei 0:00** | Verhalten wenn Level ablaeuft ohne Auto-Advance | Button zeigt "Ende", aber kein visueller Hinweis bei autoAdvance=false |
| **Negative Restzeit** | Durch Rundung oder Race Condition | `Math.max(0, ...)` clamp vorhanden, aber ungetestet |

### G.2 Audio-Risiken

| Risiko | Beschreibung | Gegenmassnahme |
|--------|-------------|----------------|
| **AudioContext-Sperre** | Safari blockiert Audio bis User-Gesture | `initAudio()` bei erstem Klick, aber ungetestet |
| **MP3-Ladezeit** | Grosse MP3s bei langsamem Netz | PWA-Cache, aber Offline-Start ohne Cache? |
| **Concurrent Audio** | Beep + Voice gleichzeitig | Delay-basierte Koordination, aber fragil |
| **Memory durch Audio** | 450 MP3s im Cache | Service Worker verwaltet, aber Speicher? |
| **Voice vs. Beep Mode** | User erwartet nur Beeps, bekommt Sprache | VoiceSwitcher, aber Default-Zustand unklar |

### G.3 Persistenz-Risiken

| Risiko | Beschreibung | Gegenmassnahme |
|--------|-------------|----------------|
| **IndexedDB Quota** | Grosse Turnierhistorie + Audio-Cache | Max 50 Historien-Eintraege, aber Audio separat |
| **Korrupte Daten** | Unvollstaendiger Write (Browser-Crash) | Fire-and-forget Writes, kein Transaktionsschutz |
| **Schema-Migration** | Zukuenftige DB-Versionen | Aktuell v1, kein Upgrade-Pfad vorbereitet |
| **Cross-Tab Konflikte** | Zwei Tabs aendern gleichzeitig | In-Memory-Cache ist Tab-lokal, IndexedDB shared |
| **Checkpoint-Timing** | Checkpoint veraltet durch async Write | Cache-First macht Read konsistent, aber Write-Order? |

### G.4 Mobile-spezifische Risiken

| Risiko | Beschreibung | Gegenmassnahme |
|--------|-------------|----------------|
| **Wake Lock verloren** | Tab-Wechsel deaktiviert Wake Lock | Re-acquire bei visibilitychange, aber ungetestet |
| **Soft Keyboard** | Tastatur verdeckt Eingabefelder | inputmode="numeric", aber kein scroll-into-view Test |
| **Viewport Resize** | Adressleiste ein-/ausblenden | 100dvh statt 100vh, aber Layout-Shifts? |
| **Touch-Targets** | Zu kleine Buttons auf kleinen Screens | Min 32px, aber nicht systematisch geprueft |
| **Orientation Change** | Portrait ↔ Landscape | Responsive Layout, aber keine Tests |

### G.5 Feature-Interaktions-Risiken

| Risiko | Beschreibung | Gegenmassnahme |
|--------|-------------|----------------|
| **Rebuy + Multi-Table** | Rebuy am falschen Tisch, Stack-Update | Nicht explizit getestet |
| **Re-Entry + Final Table** | Re-Entry nachdem Final Table gemerged | Logic vorhanden, aber Integration ungetestet |
| **Liga + Mystery Bounty** | Mystery-Bounty-Werte in Liga-Finanzen | `bountyEarned` in GameDay, aber korrekt? |
| **Color-Up + Chip-Aenderung** | Chips im Setup aendern waehrend Turnier | Nicht moeglich (Game-Mode), aber nach Restart? |
| **Checkpoint + Liga** | Checkpoint Restore mit veraenderter Liga | Checkpoint speichert Config, Liga separat |
| **TV-Display + Remote** | Remote steuert Timer, TV zeigt Aenderung | BroadcastChannel Latenz? |

### G.6 Weitere blinde Flecken

- **Browser-Zurueck-Button**: Kein Router, keine History-API-Integration → unvorhersagbares Verhalten
- **Mehrere Browser-Tabs**: Gleiche App in zwei Tabs → IndexedDB-Konflikte
- **Extrem lange Turniernamen**: Layout-Bruch in Header, TV-Display, Druckansicht
- **Clipboard API fehlend**: Aeltere Browser ohne navigator.clipboard → Fallback existiert?
- **Service Worker Update**: Neue App-Version bei laufendem Turnier → Reload unterbricht Spiel
- **Timezone-Wechsel**: Reise waehrend Turnier, Systemzeit aendert sich → Wall-clock-Timer betroffen?
- **Akzentfarbe "rot"**: Rote Akzentfarbe + rotes Bubble-Banner → Unterscheidbarkeit?
- **Liga-Export v1→v2**: Alte Liga-Exports importieren → Rueckwaertskompatibilitaet?
- **QR-Code-Laenge**: Sehr viele Spieler (20) → QR-Code wird dicht, schwer scannbar
- **Druckansicht mit Akzentfarbe**: Print CSS nutzt Standard-Farben oder Akzent?

---

## Abschnitt H — Abschlussartefakte

### H.1 Priorisierte Test-Checkliste (manuell)

**Vor jedem Release durchfuehren (30-45 Min):**

- [ ] App startet fehlerfrei (T-001)
- [ ] Timer Start/Stop/Pause/Resume (T-005 bis T-007)
- [ ] Level-Wechsel vorwaerts/rueckwaerts (T-008, T-009)
- [ ] Zeitanzeige korrekt (T-012)
- [ ] Seiten-Reload → Checkpoint (T-021, T-022)
- [ ] Spieler eliminieren → Turnierende (P-011, P-015)
- [ ] Bubble-Erkennung (P-013)
- [ ] Sound-Beep bei Countdown (S-001)
- [ ] Voice-Ansage Level-Wechsel (S-011)
- [ ] Deutsch vollstaendig (I-001)
- [ ] Englisch vollstaendig (I-002)
- [ ] Dark Mode lesbar (U-005, U-006)
- [ ] Mobile Layout (R-005)
- [ ] Keine Console-Errors (SEC-003)

**Erweitert (bei groesseren Releases, +60 Min):**

- [ ] Blind-Generator alle 3 Speeds (B-001 bis B-003)
- [ ] Rebuy/Add-On Flow (P-016 bis P-020)
- [ ] Liga-Modus Grundfunktion (E-020, D-012, D-013)
- [ ] Multi-Table Verteilung + Balance (P-030, P-031)
- [ ] Template Save/Load (D-006)
- [ ] JSON Export/Import (D-008)
- [ ] Keyboard Shortcuts (U-017)
- [ ] TV-Display Screens (manuell pruefen)
- [ ] Druckansicht (B-018)
- [ ] Tablet Portrait (R-003)

### H.2 Priorisierte Automatisierungs-Roadmap

| Phase | Was | Tests | Aufwand | Nutzen |
|-------|-----|-------|---------|--------|
| **1** | i18n-Key-Paritaet | 1 | 30 Min | Hoch — verhindert Sprach-Luecken |
| **2** | Keyboard Shortcuts | 15 | 2 Std | Hoch — 9 untestete Shortcuts |
| **3** | Hook-Tests (useGameEvents, useTournamentActions) | 25 | 4 Std | Hoch — 400+ Zeilen Logik |
| **4** | Fehlende Components (TimerDisplay, Controls, PlayerManager, BlindGenerator) | 40 | 6 Std | Mittel — UI-Regression |
| **5** | Integration Smoke-Tests | 5 | 4 Std | Hoch — Workflow-Absicherung |
| **6** | Playwright E2E Setup + Smoke | 3 | 4 Std | Hoch — Browser-Reality |
| **7** | Playwright kritische Flows | 5 | 4 Std | Mittel — Release-Sicherheit |
| **8** | Visual Regression | 10 | 4 Std | Niedrig — Layout-Drift |

**Gesamtschaetzung**: ~80-100 neue Tests, ~28 Stunden Aufwand

### H.3 "Vor Release immer testen"

1. `npm run lint` — keine Fehler
2. `npm run test` — alle Tests gruen
3. `npm run build` — Build erfolgreich
4. App oeffnen → Setup → Turnier starten → 2 Level spielen → Pause → Resume → Spieler eliminieren → Turnierende
5. Seiten-Reload waehrend Turnier → Checkpoint funktioniert
6. Sprache wechseln (DE→EN→DE) → keine Mischsprache
7. Dark Mode + Light Mode → beides lesbar
8. Sound + Voice → Countdown hoerbar, Level-Ansage korrekt
9. Mobile Viewport (375px) → Layout korrekt
10. Console → keine roten Fehler

### H.4 "Manuell testen, auch wenn automatisiert"

1. **Timer-Drift bei Langzeitlauf** — Automatisierung kann 2h Echtzeit nicht ersetzen
2. **Audio-Qualitaet** — "Klingt es richtig?" ist nicht automatisierbar
3. **Touch-Feeling auf echtem Geraet** — DevTools-Emulation unzureichend
4. **Remote Control mit echtem Phone** — PeerJS Cloud-Signaling
5. **PWA-Installation** — Browser-spezifisches Verhalten
6. **TV-Display auf Projektor** — Lesbarkeit auf Distanz
7. **Responsive auf echtem iPad** — Safe-Areas, Soft-Keyboard, Rotation
8. **UX bei Erstbenutzung** — Wizard-Verstaendlichkeit, Nutzer-Fuehrung
9. **Sleep/Wake-Verhalten** — OS-abhaengig
10. **Druckansicht** — Tatsaechliches Druckergebnis pruefen

### H.5 Offene Fragen / im Code zu pruefen

1. **Mystery Bounty Pool erschoepft**: Was passiert wenn alle Werte aus dem Pool gezogen sind? Crash oder Fallback?
2. **Re-Entry nach Final Table**: Kann ein Spieler re-entrien wenn nur noch 1 Tisch aktiv ist? Wohin wird er gesetzt?
3. **BroadcastChannel Timing**: Wie schnell aktualisiert sich das TV-Display? Gibt es sichtbare Verzoegerung?
4. **Concurrent IndexedDB Writes**: Was passiert bei schnellen aufeinanderfolgenden Writes (z.B. 10 Rebuys in 5 Sekunden)?
5. **Service Worker Update Strategie**: Wird ein laufendes Turnier durch SW-Update unterbrochen?
6. **localStorage Fallback-Vollstaendigkeit**: Funktionieren wirklich ALLE Features im Fallback-Modus?
7. **Wizard-Zustand nach Clear**: Wird `poker-timer-wizard-completed` korrekt zurueckgesetzt?
8. **Liga-Season-Wechsel**: Was passiert mit laufenden Turnieren wenn die Saison gewechselt wird?
9. **Payout bei separatem Rebuy-Pot**: Wird der Rebuy-Pot korrekt auf die Plaetze verteilt oder nur auf Platz 1?
10. **QR-Code mit 20 Spielern**: Ist der QR-Code noch scannbar oder wird er zu dicht?
11. **FileSystemAccessAPI Fallback**: Funktioniert der Download-Fallback in allen Browsern identisch?
12. **Akzentfarbe Rot + Bubble-Banner**: Sind beide gleichzeitig noch unterscheidbar?
13. **Color-Up Announcement Timing**: Wird die Color-Up-Ansage vor oder nach der Pause gemacht?
14. **Multi-Table Dealer-Rotation**: Hat jeder Tisch einen eigenen Dealer oder gibt es nur einen globalen?
15. **Hand-for-Hand + Remote Control**: Funktioniert "Naechste Hand" auch ueber Remote?

---

---

## Abschnitt H — Implementierungsergebnis (v2.0)

### H.1 Test-Datei-Uebersicht

| Datei | Tests | Bereich | Phasen |
|-------|-------|---------|--------|
| `tests/logic.test.ts` | 527 | Domain-Logik (Timer, Blinds, Player, Chips, Tables, Tournament, Payout, Validation, League, Persistence, Storage, Format, Remote) | Basis |
| `tests/components.test.tsx` | 95 | UI-Komponenten (NumberStepper, CollapsibleSection, PrintView, CallTheClock, BubbleIndicator, RebuyStatus, ChevronIcon, LanguageSwitcher, ThemeSwitcher, ErrorBoundary, useTimer, useConfirmDialog, LoadingFallback, ConfigEditor, SettingsPanel, PlayerPanel) | Basis |
| `tests/i18n.test.ts` | 24 | i18n Key-Paritaet, Parametrisierung, Placeholder-Konsistenz, Key-Konventionen, Value-Qualitaet, t()-Funktionsverhalten, Strukturelle Kategorien | Phase 7 |
| `tests/toast.test.ts` | 6 | Toast-Benachrichtigungssystem (showToast, dismissToast, subscribeToasts, Auto-Dismiss) | Phase 3 |
| `tests/hooks.test.tsx` | 26 | useKeyboardShortcuts (9 Shortcuts, Mode-Guard, Input-Guard, Modifier-Guard, preventDefault), useGameEvents (Victory, Bubble, ITM Sound/Voice) | Phase 3, 8 |
| `tests/tournamentActions.test.tsx` | 31 | useTournamentActions Hook (10 Callbacks: updatePlayerStack, initStacks, clearStacks, updatePlayerRebuys, updatePlayerAddOn, handleAdvanceDealer, addLatePlayer, handleReEntry, reinstatePlayer, eliminatePlayer) | Phase 3 |
| `tests/persistence.test.ts` | 24 | Config/Settings/Checkpoint Save/Load Round-Trips, Default Config Integrity, parseConfigObject Backward-Compat, JSON Import/Export | Phase 9 |
| `tests/controls.test.tsx` | 22 | Controls-Komponente (Start/Pause/End Buttons, Callbacks, Secondary Controls, Last Hand, Hand-for-Hand, Clean View, Call the Clock, ARIA) | Phase 3 |
| `tests/edge-cases.test.ts` | 88 | Timer (computeRemaining, advanceLevel, previousLevel, resetCurrentLevel), Blinds (generateBlindStructure, roundToNice, Antes), Players (defaultPlayers, shuffle, move, placement, stacks, re-entry), Multi-Table (create, distribute, balance, dissolve, merge, seat-lock, dealer), Format (formatTime, formatElapsedTime, getLevelLabel, getBlindsText), Tournament (computeSidePots, computePayouts, csvSafe, QR decode), Validation, Helpers (ID generators, snapSpinnerValue) | Phase 4-6, 11-13 |
| `tests/sound-speech.test.ts` | 54 | Sound-Effekte (setMasterVolume, playBeep, playVictorySound, playBubbleSound, playInTheMoneySound, Graceful Degradation), Speech-System (cancelSpeech, setSpeechLanguage, setSpeechVolume, initSpeech, 35 announce*-Funktionen: Level-Wechsel, Breaks, Countdown, Bubble, ITM, Elimination, Winner, Bounty, AddOn, Rebuy, ColorUp, LastHand, Timer, Tables, Mystery, CallTheClock, etc.) | Phase 8 |
| `tests/display-channel.test.ts` | 12 | BroadcastChannel (serializeColorUpMap/deserializeColorUpMap Round-Trip, createDisplayChannel, sendDisplayMessage inkl. Closed-Channel-Handling) | Phase 9, 12 |
| **Gesamt** | **908** | **11 Dateien** | |

### H.2 Abdeckungsanalyse nach Modulen

| Modul | Exportierte Funktionen | Getestet | Abdeckung |
|-------|----------------------|----------|-----------|
| timer.ts | 7 | 7 | 100% |
| blinds.ts | 11 | 11 | 100% |
| players.ts | 16 | 16 | 100% |
| chips.ts | 10 | 10 | 100% |
| tables.ts | 20 | 20 | 100% |
| tournament.ts | 20 | 20 | 100% |
| validation.ts | 6 | 6 | 100% |
| format.ts | 4 | 4 | 100% |
| helpers.ts | 4 | 4 | 100% |
| league.ts | 19 | 19 | 100% |
| configPersistence.ts | 19 | 19 | 100% |
| templatePersistence.ts | 5 | 5 | 100% |
| historyPersistence.ts | 6 | 6 | 100% |
| playerDatabase.ts | 5 | 5 | 100% |
| leaguePersistence.ts | 8 | 8 | 100% |
| storage.ts | 5 | 5 | 100% |
| toast.ts | 3 | 3 | 100% |
| sounds.ts | 6 | 6 | 100% |
| speech.ts | 36 | 36 | 100% |
| displayChannel.ts | 4 | 4 | 100% |
| remote.ts | 9 | 9 | 100% |
| audioContext.ts | 2 | 2 | 100% |
| **Gesamt Domain** | **~225** | **~225** | **100%** |

### H.3 Komponenten-Abdeckung

| Komponente | Getestet | Test-Datei |
|-----------|----------|------------|
| NumberStepper | Ja | components.test.tsx |
| CollapsibleSection | Ja | components.test.tsx |
| CollapsibleSubSection | Ja | components.test.tsx |
| PrintView | Ja | components.test.tsx |
| CallTheClock | Ja | components.test.tsx |
| BubbleIndicator | Ja | components.test.tsx |
| RebuyStatus | Ja | components.test.tsx |
| ChevronIcon | Ja | components.test.tsx |
| LanguageSwitcher | Ja | components.test.tsx |
| ThemeSwitcher | Ja | components.test.tsx |
| ErrorBoundary | Ja | components.test.tsx |
| LoadingFallback | Ja | components.test.tsx |
| ConfigEditor | Ja | components.test.tsx |
| SettingsPanel | Ja | components.test.tsx |
| PlayerPanel | Ja | components.test.tsx |
| Controls | Ja | controls.test.tsx |

### H.4 Hook-Abdeckung

| Hook | Getestet | Test-Datei |
|------|----------|------------|
| useTimer | Ja | components.test.tsx |
| useKeyboardShortcuts | Ja | hooks.test.tsx (19 Tests) |
| useGameEvents | Ja | hooks.test.tsx (7 Tests) |
| useTournamentActions | Ja | tournamentActions.test.tsx (31 Tests) |
| useConfirmDialog | Ja | components.test.tsx |

### H.5 Nicht automatisierbare Tests (manuell)

| Test | Grund | Prioritaet |
|------|-------|-----------|
| PWA Install-Flow | Erfordert Browser-UI-Interaktion | Mittel |
| Wake Lock | Erfordert Hardware-Verifikation | Niedrig |
| Screenshot/Share | html-to-image + Web Share API, erfordert Canvas/Clipboard | Mittel |
| Setup-Wizard UX-Flow | Multi-Step-Modal, erfordert User-Interaktion | Niedrig |
| TV-Display Rendering | Layout auf 3m-Entfernung, erfordert Projektor | Niedrig |
| Remote Control Pairing | PeerJS Cloud Signaling, erfordert 2 Geraete | Mittel |
| Audio-Ausgabe | Tatsaechliche Klangerzeugung | Niedrig |
| Print-Ausgabe | window.print() CSS-Layout | Niedrig |
| Fullscreen-API | Browser-spezifisches Verhalten | Niedrig |
| Safe Area Insets (Notch) | Erfordert Geraet mit Notch | Niedrig |

### H.6 Risiken und blinde Flecken

1. **Kein E2E-Test**: Keine End-to-End-Tests die ein vollstaendiges Turnier durchspielen (Setup → Game → Finish)
2. **Keine Visual Regression**: Keine Screenshot-basierten Tests fuer UI-Aenderungen
3. **Limitierte Komponententests**: 16 von ~58 Komponenten getestet (28%). Kritische ungetestete: TimerDisplay, TournamentFinished, PlayerManager, SetupPage, LeagueView, RemoteControl
4. **Browser-Kompatibilitaet**: Tests laufen nur in jsdom — keine Safari/Firefox/Chrome-spezifischen Tests
5. **Race Conditions**: Timer-basierte Logik schwer deterministisch testbar (fake timers helfen teilweise)
6. **IndexedDB Integration**: Tests nutzen fake-indexeddb — echte Browser-IDB kann anders reagieren
7. **PeerJS Signaling**: remote.ts Tests mocken PeerJS-Internals — kein realer WebRTC-Test

### H.7 Priorisierte Roadmap fuer weitere Tests

| Prioritaet | Massnahme | Aufwand | Impact |
|-----------|-----------|---------|--------|
| **P1** | E2E Smoke-Test (Turnier-Durchlauf: Setup → Start → Elimination → Finish) | Hoch | Sehr hoch |
| **P2** | TimerDisplay + TournamentFinished Komponententests | Mittel | Hoch |
| **P3** | PlayerManager + SetupPage Tests | Mittel | Hoch |
| **P4** | LeagueView + GameDayEditor Tests | Mittel | Mittel |
| **P5** | Visual Regression (Playwright/Storybook) | Hoch | Mittel |
| **P6** | Cross-Browser CI (BrowserStack/Sauce Labs) | Hoch | Mittel |

---

---

## Abschnitt I — Qualitaetsstufe 2: Integrationstests & Release-Gate (v3.0)

**Erstellt**: 2026-03-09
**Basis**: 943 Tests, 12 Dateien, 0 Lint-Errors
**Fokus**: Cross-Module-Flows, Produktionsrisiken, Release-Entscheidung

### I.1 Restrisiko-Analyse (Section A)

| Risiko-Bereich | Schwere | Wahrscheinlichkeit | Abdeckung | Bewertung |
|----------------|---------|--------------------|-----------|-----------|
| **Checkpoint-Verlust bei Reload** | Hoch | Mittel | Automatisiert (integration.test.ts) | Round-Trip getestet: save → load → restore. Timer immer paused bei Restore. |
| **Timer-Drift bei langer Laufzeit** | Hoch | Niedrig | Automatisiert (useTimer hook tests) | Wall-clock-basiert (Date.now()), kein Interval-Counter. Drift < 250ms per tick. |
| **Blind-Struktur-Korruption bei Import** | Hoch | Mittel | Automatisiert (parseConfigObject tests) | 6 Backward-Compat-Tests: malformed levels, missing fields, old formats. |
| **Spielername-Verlust bei Sprachwechsel** | Mittel | Mittel | Automatisiert (integration.test.ts) | Regex-Pattern getestet: Custom-Namen bleiben, nur Defaults werden uebersetzt. |
| **Audio-Autoplay-Block (Safari/iOS)** | Mittel | Hoch | Manuell (siehe I.4) | initAudio() aus User-Gesture. Nicht automatisiert testbar (Browser-Policy). |
| **IndexedDB-Quota-Erschoepfung** | Niedrig | Niedrig | Manuell | Fallback auf localStorage implementiert. ~50 Turniere in History bevor relevant. |
| **BroadcastChannel TV-Sync-Verlust** | Niedrig | Mittel | Automatisiert (display-channel.test.ts) | Serialisierung getestet. Realistische Channel-Latenz nicht testbar. |
| **PWA-Cache-Stale nach Update** | Niedrig | Mittel | Manuell | Service Worker auto-update. Kein Test moeglich ohne echten Browser. |
| **Multi-Table Balancing bei vielen Tischen** | Mittel | Niedrig | Automatisiert (logic.test.ts) | Iteratives Balancing getestet, max +/-1 Differenz garantiert. |
| **Re-Entry + Elimination-Reihenfolge** | Mittel | Niedrig | Automatisiert (logic.test.ts) | originalPlayerId-Verknuepfung, Placement-Neuberechnung getestet. |

### I.2 Priorisierte naechste Teststufe (Section B)

**Implementiert: `tests/integration.test.ts` (35 Tests)**

| Prioritaet | Test-Bereich | Tests | Status |
|------------|-------------|-------|--------|
| P0 | Checkpoint Round-Trip (save/restore/clear) | 4 | Implementiert |
| P0 | Timer Hook Lifecycle (start/pause/resume/next/prev/reset/restart/restore) | 10 | Implementiert |
| P0 | Checkpoint → Timer Restore | 1 | Implementiert |
| P1 | parseConfigObject Backward Compat | 6 | Implementiert |
| P1 | Full Tournament Flow (validate → play → result) | 4 | Implementiert |
| P1 | Blind Generator → Timer Integration | 1 | Implementiert |
| P1 | Tournament History Save/Retrieve | 1 | Implementiert |
| P2 | Language Name Transformation | 2 | Implementiert |
| P2 | Tournament Elapsed Time | 1 | Implementiert |
| P2 | Config Persistence Round-Trip | 1 | Implementiert |
| P2 | computeRemaining Precision | 1 | Implementiert |
| P2 | Mode Transition Domain Functions | 3 | Implementiert |

### I.3 Konkrete Integrationstests (Section C)

Alle in `tests/integration.test.ts` implementiert:

**Checkpoint-Kette:**
1. Config mit Namen, Spielern, Buy-In → saveCheckpoint → loadCheckpoint → alle Felder identisch
2. Eliminierte Spieler mit Placement/Knockouts ueberleben Round-Trip
3. clearCheckpoint → loadCheckpoint === null
4. Rebuy/Add-On/Bounty-State ueberlebt Round-Trip

**Timer-Zustandsmaschine:**
5. Init: Level 0, stopped, volle Duration
6. Start → 2s warten → Pause → remaining < 600 und > 595
7. Resume: remainingAtStart entspricht pausiertem Wert
8. nextLevel: auto-start, Index +1
9. previousLevel: auto-start, Index -1
10. resetLevel: stopped, volle Duration, gleicher Index
11. restart: Level 0, stopped
12. restoreLevel: beliebiger Index+Zeit, IMMER paused
13. restoreLevel: Out-of-range wird geclamped
14. toggleStartPause: running ↔ paused ↔ running
15. setRemainingSeconds: paused, exakte Zeit

**Backward-Kompatibilitaet:**
16. Minimale Config (nur levels) → Defaults fuer alles andere
17. Config ohne anteMode → default "standard"
18. bigBlindAnte-Modus → korrekt normalisiert
19. Malformed Levels (duration 0, wrong type, null) → gefiltert
20. Mystery Bounty Pool → erhalten
21. Raw Player-Daten (fehlende/falsche Felder) → normalisiert

**Turnier-Gesamtfluss:**
22. Config → validate → eliminate → buildResult → korrekte Standings
23. Bubble/ITM-Detection ueber Eliminationssequenz
24. Average Stack mit Rebuys + Add-Ons
25. Rebuy-Active-Detection ueber Level-Progression

### I.4 Manuelle Test-Matrix (Section D)

Tests die aufgrund von Browser-APIs nicht automatisiert werden koennen:

#### Audio / Sound (pre-release, manuell)

| # | Testfall | Erwartung | Browser |
|---|---------|-----------|---------|
| M1 | App starten, Sound an, Timer starten | Beep bei Countdown hoerbar | Chrome, Safari, Firefox |
| M2 | Voice aktiviert, Level-Wechsel | ElevenLabs MP3 spielt, kein Stottern | Chrome, Safari |
| M3 | Safari: App ohne vorherige Interaktion | Audio stumm bis erster Tap, dann Sounds | Safari iOS |
| M4 | Lautstaerke auf 0%, Timer mit Countdown | Keine Toene hoerbar | Alle |
| M5 | Lautstaerke von 0% auf 100% waehrend Turnier | Sound kommt sofort zurueck | Alle |
| M6 | Voice DE → EN wechseln | Naechste Ansage in Englisch | Chrome |
| M7 | Victory Sound bei Turnierende | Fanfare spielt, dann Voice "Turniersieger" | Chrome |
| M8 | 3 schnelle Level-Wechsel hintereinander | Keine Audio-Queue-Ueberlaeufe, keine Crashes | Chrome |

#### Responsive / Mobile (pre-release, manuell)

| # | Testfall | Erwartung | Geraet |
|---|---------|-----------|--------|
| M9 | Setup auf iPhone SE (375px) | Alle Sektionen erreichbar, kein Overflow | iPhone SE |
| M10 | Timer auf iPad Landscape | Volle Breite, Sidebars sichtbar | iPad |
| M11 | NumberStepper Long-Press auf Touch | Wert zaehlt hoch/runter bei gehaltenem Finger | iPhone/Android |
| M12 | Swipe auf Timer-Bereich | Kein ungewolltes Scrollen | Mobile |
| M13 | Notch-Geraet im Fullscreen | Safe-Area-Insets korrekt, kein Content unter Notch | iPhone 14+ |
| M14 | PWA installieren und offline starten | App laedt, Timer funktioniert, Audio verfuegbar | Android Chrome |

#### Persistence / Edge Cases (pre-release, manuell)

| # | Testfall | Erwartung | |
|---|---------|-----------|--|
| M15 | Turnier starten, Tab schliessen, Tab neu oeffnen | Checkpoint-Banner erscheint, Fortsetzen moeglich | |
| M16 | Checkpoint fortsetzen, Timer laeuft weiter | Timer paused, manuell startbar, korrekter Level | |
| M17 | Privater Modus (Inkognito) | App startet, localStorage Fallback, kein Crash | |
| M18 | 50+ Turniere in History speichern | Kein Quota-Error, aelteste werden ggf. geloescht | |
| M19 | JSON-Template importieren (v1-Format) | Backward-compat Parser normalisiert korrekt | |
| M20 | TV-Display oeffnen, Turnier starten | BroadcastChannel sync, Timer auf TV sichtbar | |

### I.5 Release-Gate Definition (Section E)

#### Automatisierte Gates (CI blockiert bei Fehler)

| Gate | Kriterium | Aktueller Stand |
|------|-----------|----------------|
| **G1: Unit Tests** | Alle Tests in `npm run test` bestehen | 943/943 bestanden |
| **G2: Lint** | 0 ESLint-Errors | 0 Errors |
| **G3: TypeScript** | `npm run build` ohne TS-Fehler | Bestanden |
| **G4: Bundle-Size** | < 800KB main bundle | ~606KB (OK) |

#### Manuelle Gates (Pre-Release Checkliste)

| Gate | Kriterium | Frequenz |
|------|-----------|----------|
| **G5: Audio Smoke** | M1 + M2 + M3 auf Chrome + Safari | Jedes Release |
| **G6: Mobile Smoke** | M9 + M11 auf einem echten Smartphone | Jedes Release |
| **G7: Checkpoint** | M15 + M16 auf Chrome | Jedes Release |
| **G8: Full Game** | Ein komplettes 4-Spieler-Turnier durchspielen (Setup → Game → Finished) | Major Releases |

#### Optional (bei Feature-Aenderungen)

| Gate | Kriterium | Trigger |
|------|-----------|---------|
| **G9: TV-Display** | M20 manuell pruefen | Bei Aenderungen an DisplayMode/BroadcastChannel |
| **G10: Liga-Flow** | Liga erstellen → Turnier → GameDay → Standings | Bei Liga-Aenderungen |
| **G11: Multi-Table** | 3-Tisch-Setup → Balance → Dissolution → Final Table | Bei Table-Aenderungen |
| **G12: Import/Export** | Template export → re-import → Config identisch | Bei Persistence-Aenderungen |

### I.6 Verbleibende Blind Spots (Section F)

| Bereich | Risiko | Grund fuer fehlende Abdeckung | Empfehlung |
|---------|--------|------------------------------|------------|
| **App.tsx Rendering** | Mittel | Full-App-Render mit 20+ lazy-loaded Komponenten zu komplex fuer Unit-Test-Scope | Playwright E2E bei Bedarf |
| **Remote Control (PeerJS)** | Niedrig | WebRTC Data Channel erfordert echtes Netzwerk | Manuell testen bei Aenderungen |
| **PWA Service Worker** | Niedrig | Erfordert echten Browser, kein JSDOM-Support | Manuell M14 |
| **CSS Responsive Breakpoints** | Niedrig | Tailwind-Klassen erfordern visuellen Browser | Manuell M9-M13 |
| **Concurrent Tab-Nutzung** | Sehr niedrig | IndexedDB-Locking zwischen Tabs | Nicht produktionsrelevant (Single-User-App) |
| **Wake Lock API** | Sehr niedrig | Browser-API, nicht mockbar | Manuell beobachten |
| **Clipboard/Share API** | Sehr niedrig | Erfordert echte Browser-Permissions | Manuell bei Bedarf |

### I.7 Test-Datei-Uebersicht (v3.0)

| Datei | Tests | Fokus |
|-------|-------|-------|
| tests/logic.test.ts | 503 | Domain-Logik: alle 22 Module |
| tests/components.test.tsx | 95 | UI-Komponenten: 17 Components/Hooks |
| tests/edge-cases.test.ts | 88 | Grenzwerte, Overflow, leere Eingaben |
| tests/hooks.test.tsx | 41 | useTournamentActions Hook |
| tests/sound-speech.test.ts | 54 | Sound-Effekte + 35 Announce-Funktionen |
| tests/i18n.test.ts | 24 | Key-Paritaet, Parameter, Qualitaet |
| tests/toast.test.ts | 18 | Toast-Benachrichtigungen |
| tests/persistence.test.ts | 24 | Storage, Templates, History, Players |
| tests/tournamentActions.test.tsx | 34 | Elimination, Rebuy, Stacks, Config-Updates |
| tests/display-channel.test.ts | 12 | BroadcastChannel, ColorUp-Serialisierung |
| tests/integration.test.ts | 35 | Cross-Module-Flows, Checkpoint, Timer, Config-Compat |
| tests/setup.ts | — | Test-Setup: jest-dom, fake-indexeddb, matchMedia |
| **Gesamt** | **943** | **12 Dateien + Setup** |

---

---

## Abschnitt J — Entitlements & Feature-Gate-Tests (v3.1)

### J.1 Bestehende Tests (entitlements.test.ts — 12 Tests)

| Test | Beschreibung |
|------|-------------|
| Default-Tier | `defaultEntitlements()` gibt `'premium'` zurueck |
| Persistenz | `saveEntitlements()` / `loadEntitlements()` Round-Trip |
| Tier-Minimums | `isFeatureAvailable()` prueft Feature-Tier-Mapping |
| Overrides | Explizite Feature-Overrides ueberschreiben Tier |
| Downgrade-Detection | `featuresLostOnTierChange()` erkennt verlorene Features |
| Upgrade-Detection | `featuresGainedOnTierChange()` erkennt gewonnene Features |
| Tier-Transition Downgrade | `consumeTierTransition()` erkennt Downgrade |
| Tier-Transition Upgrade | `consumeTierTransition()` erkennt Upgrade |
| **multiTable Gate** | `isFeatureAvailable('multiTable', {tier: 'free'})` → false, premium → true |
| **sidePot Gate** | `isFeatureAvailable('sidePot', {tier: 'free'})` → false, premium → true |
| **multiTable/sidePot Downgrade** | Enthalten in `featuresLostOnTierChange('premium', 'free')` |
| **multiTable/sidePot Upgrade** | Enthalten in `featuresGainedOnTierChange('free', 'premium')` |

### J.2 Telemetrie-Tests (monetizationTelemetry.test.ts — 3 Tests)

| Test | Beschreibung |
|------|-------------|
| trackSessionStarted | Zaehler inkrementiert |
| trackFeatureUsed | Feature + Context werden gespeichert |
| getUsageReport | Aggregierte Nutzungsdaten zurueckgegeben |

### J.3 Manuelle Gate-Verifikation

| Szenario | Schritte | Erwartung |
|----------|---------|-----------|
| Default (Premium) | App starten ohne `VITE_APP_TIER` | Alle Features frei, keine Lock-Icons |
| Free Tier | `VITE_APP_TIER=free npm run dev` | TV/Remote/Liga/MultiTable/SidePot zeigen FeatureGateModal |
| Gate-Modal | Im Free-Tier auf gesperrtes Feature klicken | Modal mit Feature-Name und Upgrade-Hinweis |

---

*Ende des Testplans v3.1. Stand: 1199 Tests, 17 Dateien, 0 Lint-Errors.*
*Automatisierte Abdeckung: Domain-Logik 100%, Hooks 5/7, Komponenten 17/30+, Entitlements 12 Tests, Cross-Module-Flows.*
*Verbleibende Risiken: Audio-Autoplay (Browser-Policy), CSS-Responsive (visuell), PWA (Service Worker) — alle durch manuelle Test-Matrix abgedeckt.*
