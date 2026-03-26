<div align="center">

<img src="https://img.shields.io/badge/%F0%9F%83%8F%207Mountain%20Poker-1a1a2e?style=for-the-badge&labelColor=065f46&color=1a1a2e" alt="7Mountain Poker" height="40" />

# 7Mountain Poker

**Der Poker-Turnier-Timer für deinen Spieleabend**

[![Version](https://img.shields.io/badge/Version-6.12.0-blue?style=flat-square)](#)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-34d399?style=flat-square&logo=github)](https://rdzdbpsgct-max.github.io/7MountainPoker/)
[![Vercel](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=flat-square&logo=vercel)](https://7mountainpoker.vercel.app/)
[![Tests](https://img.shields.io/badge/Tests-1370%20passed-brightgreen?style=flat-square)](#)
[![Build](https://img.shields.io/badge/Build-passing-brightgreen?style=flat-square)](#)
[![PWA](https://img.shields.io/badge/PWA-installierbar-7c3aed?style=flat-square)](#)

</div>

---

## Deutsch

Eine vollständig clientseitige Web-App zur Verwaltung von Poker-Heimturnieren. Kein Server, kein Account, kein Schnickschnack — einfach öffnen und losspielen. Installierbar als PWA auf Mobile und Desktop.

- **DE / EN** — Deutsch/Englisch umschaltbar im Setup
- **Timer & Blindstruktur** mit Generator (3 Geschwindigkeiten) oder eigener Konfiguration
- **Spielerverwaltung** mit Drag & Drop Sitzordnung, Eliminierungen, Rebuys, Add-Ons und Bounties
- **Chip-Management** mit Color-Up Plan und Chip-Blind-Kompatibilitätsprüfung
- **Turnier-Vorlagen** speichern/laden (Browser + Datei-Export/Import)
- **Live-Statistiken** mit Bubble-Anzeige und In-The-Money-Erkennung
- **Dark/Light Mode** — 3-Wege-Umschalter (System/Hell/Dunkel)
- **Mobilfreundlich** und offline nutzbar (PWA, kein Backend nötig)

### Verwendung

1. **Blindstruktur generieren** (schnell/normal/langsam) oder eigene erstellen
2. **Spieler hinzufügen** (2–20), Buy-In und Startchips festlegen
3. **Optional**: Chips, Rebuys, Add-Ons, Bounties, Auszahlung konfigurieren
4. **Turnier starten** — Timer läuft, Blinds steigen automatisch, Color-Up-Banner bei Chip Race
5. **Spieler eliminieren** — Platzierung, Killer und Bounties werden erfasst
6. **Ergebnis** — Auszahlungen, Bounties und Platzierungen als Screenshot teilen

### Tastenkürzel

| Taste | Aktion |
|-------|--------|
| `Space` | Start / Pause |
| `N` | Nächstes Level |
| `V` | Vorheriges Level |
| `R` | Level zurücksetzen |
| `F` | Clean View ein/aus |
| `Cmd+Z` | Rückgängig (Undo) |
| `Cmd+Shift+Z` | Wiederherstellen (Redo) |

### Features

| Feature | Beschreibung |
|---------|-------------|
| Sprache | DE/EN-Umschalter im Setup, alle Texte zweisprachig |
| Timer | Drift-freier Countdown mit Fortschrittsbalken und Countdown-Warnung (letzte 10 Sek.) |
| Blindstruktur | Generator mit 3 Geschwindigkeiten + vollständig anpassbare Levels und Pausen |
| Ante | Standard (~12,5 % BB) oder Big Blind Ante (BBA) — umschaltbar im Setup |
| Chip-Management | Chip-Farben/-Werte verwalten, editierbarer Color-Up Plan, Chip-Blind-Kompatibilitätsprüfung |
| Spielerverwaltung | Drag & Drop Sitzordnung, Shuffle, Dealer-Button, Eliminierung mit Killer-Auswahl |
| Rebuys & Add-Ons | Konfigurierbares Limit (nach Levels oder Zeit), Add-On einmalig pro Spieler |
| Bounty | Optionales Kopfgeld pro Knockout mit Gesamtauswertung |
| Auszahlung | Prozentual oder fest, automatischer Vorschlag je nach Spielerzahl |
| Vorlagen | Turnierkonfigurationen speichern/laden (Browser + JSON-Datei-Export/Import) |
| Turnier-Protokoll | 📋 Chronologisches Event-Log mit Filter (Alle/Eliminations/Rebuys/Levels), Text-Export, „Verlauf"-Tab auf Ergebnis-Screen |
| Pausen-Steuerung | Pause überspringen, +2 Min / +5 Min verlängern — mit Sprachansagen und Event-Logging |
| Turnier-Statistiken | Live: Spieleranzahl, Preisgeld, Ø Stack in BB, Spielzeit, geschätzte Restzeit |
| Bubble / ITM | Rot pulsierender BUBBLE!-Banner, grüner In-The-Money-Flash mit Sound |
| Hand-for-Hand | Manueller Bubble-Modus (Taste: H) — Timer pausiert nach jeder Hand, „Nächste Hand"-Button |
| Stack Tracking | Optionales Chip-Tracking pro Spieler, Chip-Leader-Badge, Auto-Anpassung bei Rebuy/Add-On |
| Clean View | Reduzierte Ansicht im Spielmodus — nur Timer, Blinds und Bubble (Taste: F) |
| Screenshot/Teilen | Turnier-Ergebnisse als PNG — Web Share API auf Mobile, Download auf Desktop |
| QR-Codes | App-URL + Turnierergebnis als QR-Code — scannen und Ergebnis in der App sehen |
| Sound | Countdown-Beeps, Level-Ende, Bubble-Spannung, ITM-Fanfare, Sieges-Melodie (Web Audio API) |
| Sprachansagen | Professionelle ElevenLabs-MP3-Stimmen (Deutsch + Englisch) für Level-Wechsel, Pausen (1–30 Min), 5-Min-Warnung, Letzte Hand, Bubble, dynamische Spieleranzahl (basierend auf Auszahlungsplätzen), Heads-Up, ITM, Eliminierungen, Rebuys, Sieger, Turnierstart, Color-Up, Tischwechsel, Timer-Status. Dreistufiger Fallback: Web Audio API → HTMLAudioElement → Web Speech API. 590 Audio-Dateien (295 pro Sprache), offline via PWA. |
| TV-Modus | Split-Layout: Timer permanent oben, 8 rotierende Screens unten (Spieler, Stats, Auszahlung, Blindstruktur, Chips, Sitzplan, Liga, Side-Pots) — optimiert für TV/Beamer. 4 Display-Layouts (Standard, Kompakt, Timer-Only, Ultra Large). Sofortige Anzeige beim Öffnen (auch bei pausiertem Timer) |
| Cross-Device Display | Turnieranzeige auf separatem Gerät (TV, Tablet, Laptop) via PeerJS — Display-Link teilen, QR-Code scannen, fertig |
| Share Hub | Zentrales „Teilen/Anzeigen"-Modal — Display-Link, Remote-Link, QR-Codes, Vollbild, plattformspezifische Wireless-Anleitungen (AirPlay, Chromecast, HDMI) |
| PWA | Installierbar auf Mobile/Desktop, offline nutzbar |
| Wake Lock | Bildschirm bleibt während laufendem Timer an (kein Energiesparmodus) |
| Persistenz | Cache-First IndexedDB-Speicher (12 IndexedDB-Stores) mit automatischem localStorage-Fallback |
| Turnier-Checkpoint | Automatische Spielstandsicherung, Wiederherstellung nach Browser-Crash |
| Barrierefreiheit | ARIA-Labels, Dialog-Rollen, Auto-Fokus, Escape-zum-Schließen |
| Kompatibilität | Safe Area Insets, dynamische Viewport-Höhe, optimierte Touch-Targets, numerische Tastatur, Tablet-Layout |
| Usability | Aufklappbare Sektionen mit Summary-Badges, ausklappbare Blindstruktur, Sticky Start-Button auf Mobile |
| Dark/Light Mode | 3-Wege-Umschalter (System/Hell/Dunkel), folgt Systemeinstellung, merkt sich Auswahl |
| Turnier-Presets | 3 vordefinierte Profile (Schnelles Cashgame, Standard, Deep Stack) für sofortigen Start |
| Side-Pot-Rechner | Berechnung von Haupt- und Nebenpötten bei All-In-Situationen |
| Auszahlungs-Simulator | Live-Vorschau der Auszahlungen per Slider — „Was bekommt Platz X bei Y verbleibenden Spielern?" |
| Akzentfarbe | 6 wählbare Farbthemen (Emerald, Blue, Purple, Red, Amber, Cyan) |
| Hintergrundbilder | 9 CSS-Gradient-Backgrounds (Filz-Grün, Filz-Blau, Filz-Rot, Casino, Holz, Abstrakt, Midnight, Sunset) |
| Blinds nach Endzeit | Blindstruktur automatisch generieren basierend auf gewünschter Turnierdauer |
| Re-Entry | Spieler können sich nach Elimination neu einkaufen (neuer Stack, separate Statistik) |
| Seat-Locking | Bestimmte Sitzplätze an Tischen sperren (Multi-Table) |
| Liga-Erstellung | Neues Liga-Erstellungs-Modal: Name, flexibles Punktesystem (Plätze 1–N, Punkte frei konfigurierbar), Vorlagen (Standard, Einfach, Top 10), Ranking-Algorithmus direkt bei Erstellung wählbar |
| Liga-Modus | Homegame-Liga mit Spieltagen, Punktesystem, Tiebreaker, Saisons, Finanzen, Gastspieler, Spieler-Detailansicht, QR-Teilen, TV-Display, Druckansicht |
| Hilfe-Center | Durchsuchbares bilinguales Hilfesystem mit Anleitung (10 Sektionen), FAQ (22 Einträge), Tastenkürzel (13 Einträge) — erreichbar über ?-Button im Header (Setup, Spielmodus & Liga) |
| Fernsteuerung | Turnier vom Smartphone steuern via PeerJS (Play/Pause/Next/Dealer/Sound/Call the Clock + Spieler-Management: Elimination, Rebuy, Add-On + Turnier-Infos: Prizepool, Avg Stack, Spielzeit) — Ein-QR-Verbindung |
| Turnier-Serien | Serien-Management mit 3 Ranking-Modi (Punkte, Best-N, Durchschnitt), Standings, JSON Import/Export |
| Erweitertes Liga-System | 3 Ranking-Algorithmen (Punkte, ELO, Gewichtete Punkte), Head-to-Head-Matrix, Minimum-Teilnahme |
| Eigene Ansagen | Eigene Audio-Dateien (MP3/WAV/OGG, max 5 MB) hochladen und beliebigen der 36 Sprachansagen zuordnen — ersetzt die Standard-Stimme für einzelne Events |
| PDF-Export | Turnier-Ergebnisse als professionelles PDF exportieren |
| Turnierdauer-Prognose | Geschätzte Turnierdauer basierend auf Spieleranzahl und Blindstruktur |
| Undo/Redo | Alle Turnieraktionen rückgängig machen (Cmd+Z / Cmd+Shift+Z) — Elimination, Rebuy, Add-On, Reinstate, Dealer, Late Reg, Re-Entry, Stack-Änderungen |
| ICM-Rechner | Independent Chip Model Equity-Berechnung — exakt (≤10 Spieler) oder Monte Carlo (>10 Spieler). Modal im Spielmodus |
| Deal-Making | Chop-Rechner am Final Table (2–6 Spieler) — ICM Chop, Chip Chop oder Even Split. Manuelle Anpassung, Deal-Bestätigung mit Auszahlung. Deal-Banner (🤝) auf Ergebnis-Screen mit Methode und vereinbarten Beträgen. Geteilte Platzierung bei gleichem Payout |
| Liga-Charts | SVG-Diagramme im Liga-Modus — kumulative Punkte, Platzierungsverlauf und Finanzbilanz über alle Spieltage |
| Cloud Export | Einheitlicher Export (JSON/CSV/Text) über Web Share API, File System Access API oder Download |
| Multi-Controller | Mehrere Smartphones gleichzeitig als Fernsteuerung verbinden |
| Premium UI | Glassmorphism, Gradient-Buttons, Timer-Glow, benutzerdefinierte Animationen, taktile Interaktionen |
| Design-System | Einheitliche Abrundungen, Border-Opacities, Focus-Glow, Custom Number-Stepper, SVG-Chevrons |
| Validierung | Eingabeprüfung vor Turnierstart mit klaren Fehlermeldungen |
| Offline-Banner | Amber-Warnhinweis im Header bei fehlender Internetverbindung |
| Turnier-Klon | Turnier-Konfiguration aus der Historie wiederholen — gleiche Blinds, Buy-In, Spieler |
| Liga-Spielerübernahme | Beim Start aus dem Liga-Modus werden Spieler der letzten 5 Spieltage automatisch übernommen |
| Setup-Wizard | Geführte 6-Schritte-Ersteinrichtung (Spieler, Buy-In, Blind-Geschwindigkeit, Tipps, Überblick) — erscheint nur beim ersten Besuch |
| Call the Clock | Shot-Clock-Countdown (Standard 60s, konfigurierbar 10–300s) — Spannungs-Beeps in den letzten 10 Sekunden (Taste: C) |

### Mitwirken

Beiträge sind willkommen!

1. Fork erstellen
2. Feature-Branch anlegen (`git checkout -b feature/mein-feature`)
3. Änderungen committen (`git commit -m 'Feature hinzugefügt'`)
4. Branch pushen (`git push origin feature/mein-feature`)
5. Pull Request öffnen

Bitte stelle sicher, dass `npm run lint` und `npm run test` fehlerfrei durchlaufen.

---

## English

A fully client-side web app for managing home poker tournaments. No server, no account, no fuss — just open and play. Installable as a PWA on mobile and desktop.

- **DE / EN** — Switch between German and English in setup
- **Timer & blind structure** with generator (3 speeds) or custom configuration
- **Player management** with drag & drop seating, eliminations, rebuys, add-ons and bounties
- **Chip management** with color-up schedule and blind-chip compatibility check
- **Tournament templates** save/load (browser + file export/import)
- **Live statistics** with bubble indicator and in-the-money detection
- **Dark/Light mode** — 3-way toggle (System/Light/Dark)
- **Mobile-friendly** and works offline (PWA, no backend needed)

### Usage

1. **Generate blind structure** (fast/normal/slow) or create your own
2. **Add players** (2–20), set buy-in and starting chips
3. **Optional**: Configure chips, rebuys, add-ons, bounties, payout
4. **Start the tournament** — timer runs, blinds increase automatically, color-up banner on chip race
5. **Eliminate players** — placement, killer and bounties are tracked
6. **Results** — share payouts, bounties and placements as screenshot

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` | Start / Pause |
| `N` | Next level |
| `V` | Previous level |
| `R` | Reset level |
| `F` | Clean view toggle |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |

### Features

| Feature | Description |
|---------|-------------|
| Language | DE/EN toggle in setup, all texts bilingual |
| Timer | Drift-free countdown with progress bar and countdown warning (last 10 sec.) |
| Blind structure | Generator with 3 speeds + fully customizable levels and breaks |
| Ante | Standard (~12.5% BB) or Big Blind Ante (BBA) — switchable in setup |
| Chip management | Manage chip colors/values, editable color-up schedule, blind-chip compatibility check |
| Player management | Drag & drop seating, shuffle, dealer button, elimination with killer selection |
| Rebuys & add-ons | Configurable limit (by levels or time), add-on once per player |
| Bounty | Optional bounty per knockout with total overview |
| Payout | Percentage or fixed, automatic suggestion based on player count |
| Templates | Save/load tournament configurations (browser + JSON file export/import) |
| Tournament stats | Live: player count, prize pool, avg stack in BB, elapsed time, estimated remaining |
| Bubble / ITM | Red pulsing BUBBLE! banner, green In The Money flash with sound |
| Hand-for-Hand | Manual bubble mode (key: H) — timer pauses after each hand, "Next Hand" button |
| Stack Tracking | Optional per-player chip tracking, chip leader badge, auto-adjust on rebuy/add-on |
| Clean view | Reduced game mode — only timer, blinds and bubble visible (key: F) |
| Screenshot/share | Tournament results as PNG — Web Share API on mobile, download on desktop |
| QR Codes | App URL + tournament result as QR code — scan and view results in the app |
| Sound | Countdown beeps, level end, bubble tension, ITM fanfare, victory melody (Web Audio API) |
| Voice announcements | Professional ElevenLabs MP3 voices (German + English) for level changes, breaks (1–30 min), 5-min warning, last hand, bubble, dynamic player count milestones (based on paid places), heads-up, ITM, eliminations, rebuys, winner, tournament start, color-up, table moves, timer status. Triple fallback: Web Audio API → HTMLAudioElement → Web Speech API. 590 audio files (295 per language), offline via PWA. |
| Clock display | Real-time clock in game mode header — never lose track of time at the table |
| Last Hand | Toggle button + keyboard shortcut (L) + amber banner + voice announcement (before break / end of level) |
| Dealer rotation | One-click dealer button advance, skips eliminated players |
| Error boundary | Catches React crashes with user-friendly reload page |
| TV Display Mode | Dedicated fullscreen overlay for projectors/TVs — eight rotating screens (players, stats, payout, blind schedule, chip values, seating, league, side pots), auto-rotation, arrow key navigation (T). 4 display layouts (Standard, Compact, Timer-Only, Ultra Large). Instant display on open (even with paused timer) |
| Cross-Device Display | Show tournament on a separate device (TV, tablet, laptop) via PeerJS — share display link, scan QR code, done |
| Share Hub | Central "Share/Display" modal — display link, remote link, QR codes, fullscreen, platform-specific wireless guides (AirPlay, Chromecast, HDMI) |
| Fullscreen | Large timer mode for TV or projector display |
| PWA | Installable on mobile/desktop, works offline |
| Wake Lock | Screen stays on during active timer (no sleep mode) |
| Persistence | Cache-first IndexedDB storage (12 IndexedDB stores) with automatic localStorage fallback |
| Tournament checkpoint | Auto-save game state, recovery after browser crash |
| Tournament history | Persistent results across sessions (max 50), expandable standings, player statistics, WhatsApp text copy, CSV download |
| Accessibility | ARIA labels, dialog roles, auto-focus, escape-to-close |
| Compatibility | Safe area insets, dynamic viewport height, optimized touch targets, numeric keyboard, tablet layout |
| Usability | Collapsible sections with summary badges, collapsible blind structure, sticky start button on mobile |
| Dark/Light mode | 3-way toggle (System/Light/Dark), follows system preference, remembers selection |
| Tournament Presets | 3 built-in profiles (Quick Cash Game, Standard, Deep Stack) for instant start |
| Side-Pot Calculator | Calculate main and side pots for all-in situations |
| Payout Simulator | Live payout preview via slider — "What does place X get with Y players remaining?" |
| Accent Color | 6 selectable color themes (Emerald, Blue, Purple, Red, Amber, Cyan) |
| Backgrounds | 9 CSS gradient backgrounds (felt-green, felt-blue, felt-red, casino, wood, abstract, midnight, sunset) |
| Blinds by End Time | Auto-generate blind structure based on target tournament duration |
| Re-Entry | Players can re-enter after elimination (fresh stack, separate stats) |
| Seat Locking | Lock specific seats at tables (multi-table) |
| League Creation | New league creation modal: name, flexible point system (places 1–N, fully configurable), presets (Standard, Simple, Top 10), ranking algorithm selectable at creation |
| League Mode | Home game league with game days, point system, tiebreaker, seasons, finances, guest players, player detail modal, QR sharing, TV display, print view |
| Help Center | Searchable bilingual help system with guide (10 sections), FAQ (22 entries), keyboard shortcuts (13 entries) — accessible via ? button in header (setup, game mode & league) |
| Remote Control | Control tournament from smartphone via PeerJS (Play/Pause/Next/Dealer/Sound/Call the Clock + player management: elimination, rebuy, add-on + tournament info: prize pool, avg stack, elapsed time) — single QR scan |
| Tournament Series | Series management with 3 ranking modes (points, best-N, average), standings, JSON import/export |
| Extended League System | 3 ranking algorithms (points, ELO, weighted points), head-to-head matrix, minimum participation |
| Custom Announcements | Upload custom audio files (MP3/WAV/OGG, max 5 MB) and assign them to any of the 36 voice announcements — replaces the default voice for individual events |
| PDF Export | Export tournament results as professional PDF |
| Duration Estimate | Estimated tournament duration based on player count and blind structure |
| Undo/Redo | Undo any tournament action (Cmd+Z / Cmd+Shift+Z) — elimination, rebuy, add-on, reinstate, dealer, late reg, re-entry, stack changes |
| ICM Calculator | Independent Chip Model equity calculation — exact (≤10 players) or Monte Carlo (>10 players). Modal in game mode |
| Deal-Making | Chop calculator at final table (2–6 players) — ICM Chop, Chip Chop, or Even Split. Manual adjustment, deal confirmation with payout. Deal banner (🤝) on results screen with method and agreed amounts. Shared placement for equal payouts |
| League Charts | SVG charts in league mode — cumulative points, placement history, and financial balance across all game days |
| Cloud Export | Unified export (JSON/CSV/text) via Web Share API, File System Access API, or download |
| Multi-Controller | Connect multiple smartphones as remote controllers simultaneously |
| Premium UI | Glassmorphism, gradient buttons, timer glow, custom animations, tactile interactions |
| Design system | Unified rounding, border opacities, focus glow, custom number stepper, SVG chevrons |
| Validation | Input validation before tournament start with clear error messages |
| Offline Banner | Amber warning in header when internet connection is lost |
| Tournament Log | 📋 Chronological event log with filter (All/Eliminations/Rebuys/Levels), text export, "History" tab on results screen |
| Break Controls | Skip break, +2 min / +5 min extension — with voice announcements and event logging |
| Setup Wizard | Guided 6-step first-time setup (players, buy-in, blind speed, tips, review) — only shown on first visit |
| Call the Clock | Shot clock countdown (default 60s, configurable 10–300s) — tension beeps in last 10 sec (key: C) |
| Tournament Clone | Repeat a past tournament from history — same blind structure, buy-in, and players |
| League Player Import | When starting a tournament from league mode, players from the last 5 game days are pre-filled |
| Tournament Cloning | Repeat a tournament configuration from history — same blinds, buy-in, players |
| League Player Pre-fill | When starting from league mode, players from the last 5 game days are auto-suggested |

### Contributing

Contributions are welcome!

1. Create a fork
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add feature'`)
4. Push the branch (`git push origin feature/my-feature`)
5. Open a pull request

Please make sure `npm run lint` and `npm run test` pass without errors.

---

## Technologien / Tech Stack

![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646cff?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-1360_Tests-6e9f18?style=flat-square&logo=vitest&logoColor=white)

- **React 19** — Funktionale Komponenten und Hooks / Functional components and hooks
- **TypeScript 5.9** — Strikte Typisierung / Strict typing
- **Vite 7** — Build-Tool / Build tool
- **Tailwind CSS 4** — Styling (keine CSS-Dateien / no CSS files)
- **Vitest** — 1360 Tests / Unit tests
- **GitHub Actions** — CI/CD mit Deploy auf GitHub Pages / with deploy to GitHub Pages
- **Vercel** — Automatisches Deploy / Auto-deploy on push
- **PWA** — vite-plugin-pwa, offline-fähig / offline-capable

---

## Quickstart

### Voraussetzungen / Prerequisites

- Node.js 20+
- npm

### Installation

```bash
git clone https://github.com/rdzdbpsgct-max/7MountainPoker.git
cd 7MountainPoker
npm install
```

### Entwicklung / Development

```bash
npm run dev
```

App: `http://localhost:5173/`

### Build & Test

```bash
npm run lint        # ESLint
npm run test        # 1360 Tests
npm run build       # Production-Build → ./dist
```

---

## Projektstruktur / Project Structure

```
src/
  domain/
    types.ts            # TypeScript-Typen / Types
    logic.ts            # Barrel-Export / Barrel re-export (15 fokussierte Module)
    sounds.ts           # Web Audio API Sounds (Beeps, Melodien)
    speech.ts           # Sprachansagen (ElevenLabs MP3 + Web Speech API Fallback)
    audioPlayer.ts      # MP3-Playback-Engine
    series.ts           # Turnier-Serien-Logik / Tournament series logic
    undoStack.ts        # Undo/Redo Stack (immutable, max 30 Tiefe) / Undo/Redo stack
    icm.ts              # ICM-Rechner (Malmuth-Harville) / ICM Calculator
    cloudExport.ts      # Cloud Export (JSON/CSV/Text) / Cloud export
    audioService.ts     # Audio-Facade (Volume/Sprache) / Audio facade
    displayLayouts.ts   # Display-Layout-Varianten / Display layout variants
    platform.ts         # Plattform-Erkennung / Platform detection
    presentationApi.ts  # Presentation API (Second Screen) / Presentation API support
    customAudio.ts      # Custom Audio Management / Custom audio management
    pdfExport.ts        # PDF-Export / PDF export
  hooks/
    useTimer.ts              # Timer-Hook (drift-free, shared AudioContext)
    useVoiceAnnouncements.ts # Voice-Announcement-Effects (extrahiert aus App.tsx)
    useGameEvents.ts         # Game-Event-Effects: Victory, Bubble, ITM
  theme/
    ThemeContext.tsx     # Dark/Light Mode Provider
    useTheme.ts         # useTheme() Hook
    themeContextValue.ts # Context + Types
    index.ts            # Barrel-Export
  i18n/
    translations.ts     # DE/EN Übersetzungen / Translations (~700+ Keys)
    LanguageContext.tsx  # React Context Provider
    useTranslation.ts   # useTranslation() Hook
    index.ts            # Barrel-Export
  components/
    TimerDisplay.tsx     # Timer-Anzeige / Timer display
    ConfigEditor.tsx     # Blindstruktur-Editor / Blind structure editor
    DisplayMode.tsx      # TV-Display mit 8 rotierenden Screens / TV display with 8 rotating screens
    CrossDeviceDisplay.tsx # PeerJS Display-Client / PeerJS display client
    ShareHub.tsx          # Zentrales Teilen-Modal / Central sharing modal
    TournamentHistory.tsx # Turnier-Historie mit Statistiken & Export / Tournament history with stats & export
    ErrorBoundary.tsx    # React-Error-Boundary mit Reload / Error boundary with reload
    BlindGenerator.tsx   # Blindstruktur-Generator / Blind structure generator
    PlayerManager.tsx    # Spielerverwaltung / Player management (Drag & Drop)
    PlayerPanel.tsx      # Spieler-Panel / Player panel (during tournament)
    PayoutEditor.tsx     # Auszahlungsstruktur / Payout structure
    RebuyEditor.tsx      # Rebuy-Konfiguration / Rebuy configuration
    AddOnEditor.tsx      # Add-On-Konfiguration / Add-on configuration
    BountyEditor.tsx     # Bounty-Konfiguration / Bounty configuration
    ChipEditor.tsx       # Chip-Werte & Color-Up / Chip values & color-up
    ChipSidebar.tsx      # Chip-Info im Spiel / Chip info during game
    CollapsibleSubSection.tsx # Leichteres Collapsible für Verschachtelung / Lighter collapsible for nesting
    TemplateManager.tsx  # Vorlagen + JSON Import/Export / Templates + JSON import/export
    TournamentStats.tsx  # Live-Statistiken / Live statistics
    BubbleIndicator.tsx  # Bubble / In The Money Banner
    TournamentFinished.tsx # Ergebnisse, Screenshot & QR-Codes / Results, screenshot & QR codes
    SharedResultView.tsx   # Geteilte Ergebnisse (QR) / Shared results modal (QR)
    SettingsPanel.tsx    # Einstellungen / Settings (custom checkboxes)
    Controls.tsx         # Start/Pause/Next/Prev/Reset
    ChevronIcon.tsx      # SVG-Chevron mit Animation / SVG chevron with animation
    NumberStepper.tsx     # Custom +/- Stepper mit Long-Press / Custom +/- stepper with long-press
    ThemeSwitcher.tsx     # Dark/Light Mode Toggle
    VoiceSwitcher.tsx     # Sound/Voice Toggle im Header / Sound/voice toggle in header
    LanguageSwitcher.tsx  # DE/EN-Umschalter / Language toggle
    SeriesManager.tsx     # Turnier-Serien-Verwaltung / Tournament series manager
    HeadToHeadMatrix.tsx  # Head-to-Head-Matrix / Head-to-head matrix
    CustomAudioEditor.tsx # Custom Audio Editor / Custom audio editor
    LevelPreview.tsx      # Level-Vorschau / Level preview
    RebuyStatus.tsx      # Rebuy-Anzeige / Rebuy indicator
    LeagueCreationModal.tsx  # Liga-Erstellungs-Modal mit Punktesystem & Vorlagen / League creation modal with point system & presets
public/
  audio/de/             # 295 ElevenLabs MP3 Audiodateien (Deutsch, Stimme: Ava)
  audio/en/             # 295 ElevenLabs MP3 Audiodateien (Englisch)
tests/
  logic.test.ts         # 1360 Tests (21 Testdateien / test files)
```

## Architektur / Architecture

- **Timer ohne Drift / Drift-free timer** — `startTimestamp` + `Date.now()` statt inkrementeller `setInterval`-Zählung / instead of incremental `setInterval` counting
- **Domain/UI-Trennung / Separation** — `domain/` enthält reine, testbare Funktionen / contains pure, testable functions
- **Eigenes i18n-System / Custom i18n** — Leichtgewichtiger React Context (~700+ Keys), kein react-i18next / Lightweight React Context, no react-i18next
- **Shared AudioContext** — Alle Sounds teilen einen AudioContext, initialisiert aus User-Geste (Safari-kompatibel) / All sounds share one AudioContext, initialized from user gesture (Safari-compatible)
- **Dark/Light Mode** — `ThemeProvider` + `useTheme()` Hook, 3-Wege-Toggle (System/Hell/Dunkel), `prefers-color-scheme` Listener, Tailwind `dark:`-Varianten / `ThemeProvider` + `useTheme()` hook, 3-way toggle (System/Light/Dark), `prefers-color-scheme` listener, Tailwind `dark:` variants
- **Keine externen State-Libraries / No external state libraries** — React Hooks + Props + Context (i18n + Theme) / Only React hooks + props + Context (i18n + theme)
- **Sound via Web Audio API** — Beep-Sounds als Oszillatoren (keine externen Dateien) / Beep sounds as oscillators (no external files)
- **Sprachausgabe / Voice** — ElevenLabs MP3 (Deutsch + Englisch, je 295 Dateien in `public/audio/de/` + `public/audio/en/`), Web Speech API Fallback, Pausenansagen minutengenau 1–30 Min / ElevenLabs MP3 (German + English, 295 files each in `public/audio/de/` + `public/audio/en/`), Web Speech API fallback, break announcements for every minute 1–30
- **PWA** — Offline-fähig, installierbar / Offline-capable, installable
- **Backward-Kompatibilität / Backward compatibility** — Alte localStorage-Daten werden mit Defaults ergänzt / Old localStorage data is augmented with defaults

---

<div align="center">

> **Live-Demo / Live Demo:** [7mountainpoker.vercel.app](https://7mountainpoker.vercel.app/) · [rdzdbpsgct-max.github.io/7MountainPoker](https://rdzdbpsgct-max.github.io/7MountainPoker/)

**[Vercel](https://7mountainpoker.vercel.app/)** · **[GitHub Pages](https://rdzdbpsgct-max.github.io/7MountainPoker/)** · **[Issues](https://github.com/rdzdbpsgct-max/7MountainPoker/issues)**

Gebaut mit React, TypeScript und viel Liebe zum Pokern.
Built with React, TypeScript and a love for poker.

</div>
