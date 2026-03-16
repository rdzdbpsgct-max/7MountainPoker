# Roadmap — 7Mountain Poker

Implementierungsplan zur schrittweisen Weiterentwicklung der App.
Basierend auf Markt- und Gap-Analyse (Stand: März 2026).

---

## Phasenübersicht

| Phase | Version | Thema | Features | Aufwand | Neue Tests |
|-------|---------|-------|----------|---------|------------|
| 1 | v2.4.0 | Quick Wins | 5 Features | ~185 LOC | +8 | **DONE** |
| 2 | v2.5.0 | TV-Display-Modus | 2 Features | ~530 LOC | — | **DONE** |
| 3 | v2.6.0 | Turnier-Historie | 4 Features | ~500 LOC | +12 | **DONE** |
| 4 | v2.7.0 | Refactoring + BBA | 3 Features | ~445 LOC | +4 | **DONE** |
| **Gesamt** | | | **14 Features** | **~1660 LOC** | **+21** |

---

## Phase 1: Quick Wins (v2.4.0)

Sofort umsetzbar, hoher Nutzen, minimales Risiko.

### Feature 1.1 — Uhrzeit im Spielmodus

**Problem**: „Wie spät ist es?" ist die häufigste Frage am Pokertisch. 8 von 11 Wettbewerbern zeigen die Uhrzeit.

**Umsetzung**:
- `App.tsx` Header (Zeile ~909): `useState<string>` + `setInterval(30000)` mit `toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })`
- Anzeige rechts neben dem Turniernamen im Game-Mode-Header
- Styling: `text-sm text-gray-400 dark:text-gray-500 font-mono tabular-nums`

**Dateien**: `App.tsx` (~20 Zeilen)
**Translation-Keys**: Keine (Browser-Locale)
**Tests**: Keine (rein visuell)
**Abhängigkeiten**: Keine

---

### Feature 1.2 — „Letzte Hand"-Banner + Ansage

**Problem**: `announceLastHand()` existiert in `speech.ts:341` mit MP3-Dateien, wird aber nie aufgerufen. Kein visueller Indikator.

**Umsetzung**:
1. **App.tsx**: `announceLastHand` importieren, `lastHandActive: boolean` State, Handler:
   ```tsx
   const handleLastHand = useCallback(() => {
     setLastHandActive(true);
     const nextIsBreak = config.levels[timer.timerState.currentLevelIndex + 1]?.type === 'break';
     if (settings.voiceEnabled) announceLastHand(nextIsBreak, t);
   }, [...]);
   ```
2. **App.tsx**: `setLastHandActive(false)` bei Level-Wechsel (im bestehenden `prevLevelIdxVoiceRef` Effect)
3. **App.tsx**: Keyboard-Shortcut `KeyL` im bestehenden Handler (Zeile ~274)
4. **Controls.tsx**: „Letzte Hand"-Button in den sekundären Controls (amber-Styling)
5. **BubbleIndicator.tsx**: `lastHandActive` Prop, amber Banner analog zu Add-On-Banner

**Dateien**: `App.tsx`, `Controls.tsx`, `BubbleIndicator.tsx` (~50 Zeilen)
**Translation-Keys** (4 pro Sprache):
- `controls.lastHand` — DE: `'🃏 Letzte Hand'` / EN: `'🃏 Last Hand'`
- `controls.lastHandTooltip` — DE: `'Letzte Hand ansagen (L)'` / EN: `'Announce last hand (L)'`
- `game.lastHand` — DE: `'LETZTE HAND!'` / EN: `'LAST HAND!'`
- `game.lastHandHint` — DE: `'Diese Hand ist die letzte des aktuellen Levels'` / EN: `'This is the last hand of the current level'`
**Tests**: Keine
**Abhängigkeiten**: Keine

---

### Feature 1.3 — Dealer Auto-Rotation

**Problem**: Dealer-Button ist manuell — Turnierleiter muss ihn nach jeder Hand selbst weitersetzen. 5/11 Wettbewerber bieten Auto-Rotation.

**Umsetzung**:
1. **logic.ts**: Neue Funktion:
   ```typescript
   export function advanceDealer(players: Player[], currentDealerIndex: number): number {
     const n = players.length;
     if (n === 0) return 0;
     for (let i = 1; i <= n; i++) {
       const candidate = (currentDealerIndex + i) % n;
       if (players[candidate].status === 'active') return candidate;
     }
     return currentDealerIndex;
   }
   ```
2. **App.tsx**: Handler `handleAdvanceDealer`, als Prop an `PlayerPanel` weitergeben
3. **PlayerPanel.tsx**: „Dealer weiter"-Button neben der Spieler-Überschrift

**Dateien**: `logic.ts`, `App.tsx`, `PlayerPanel.tsx` (~30 Zeilen)
**Translation-Keys** (1 pro Sprache):
- `playerPanel.advanceDealer` — DE: `'Dealer weiter'` / EN: `'Move Dealer'`
**Tests** (3): Überspringt eliminierte Spieler, Wrap-Around, alle eliminiert
**Abhängigkeiten**: Keine

---

### Feature 1.4 — React ErrorBoundary

**Problem**: Kein Error-Handling für Lazy-Load-Fehler — App zeigt weiße Seite bei Crash.

**Umsetzung**:
1. **Neue Datei** `src/components/ErrorBoundary.tsx`: Class Component (einzige Ausnahme — React-Requirement), Fallback-UI mit „Neu laden"-Button
2. **main.tsx**: `<ErrorBoundary>` um `<ThemeProvider>` wrappen
3. Fallback-UI nutzt hardcoded English (i18n-Context evtl. nicht verfügbar bei Error)

**Dateien**: `ErrorBoundary.tsx` (neu, ~45 Zeilen), `main.tsx` (~3 Zeilen)
**Translation-Keys**: Keine (hardcoded Fallback)
**Tests**: Keine
**Abhängigkeiten**: Keine

---

### Feature 1.5 — Promise-basierte Sound-Voice-Koordination

**Problem**: 4 Stellen in App.tsx nutzen `setTimeout(() => announceX(t), 1800)` — fragil, Overlap möglich bei langsamer AudioContext-Initialisierung.

**Umsetzung**:
1. **sounds.ts**: `playVictorySound()`, `playBubbleSound()`, `playInTheMoneySound()` geben `Promise<void>` zurück (resolve nach Melodie-Dauer: 1700ms, 1450ms, 700ms)
2. **App.tsx**: setTimeout-Pattern ersetzen:
   ```tsx
   // Vorher:
   playVictorySound();
   setTimeout(() => announceWinner(t), settings.soundEnabled ? 1800 : 0);

   // Nachher:
   const announce = async () => {
     if (settings.soundEnabled) await playVictorySound();
     if (settings.voiceEnabled) announceWinner(t);
   };
   announce();
   ```
3. Gleiches Pattern für Bubble-Sound → `announceBubble(t)` und ITM-Sound → `announceInTheMoney(t)`

**Dateien**: `sounds.ts` (~30 Zeilen), `App.tsx` (~40 Zeilen refactored)
**Translation-Keys**: Keine
**Tests** (2): `playVictorySound` und `playBubbleSound` geben Promise zurück
**Abhängigkeiten**: Keine

---

### Phase 1 — Reihenfolge

Alle 5 Features sind unabhängig und können parallel umgesetzt werden.
Empfohlene Reihenfolge (niedrigstes Risiko zuerst):
1. ErrorBoundary (1.4) — Zero Risk
2. Uhrzeit (1.1) — Trivial
3. Promise-Sounds (1.5) — Enables bessere Patterns
4. Dealer-Rotation (1.3) — Logic + Simple UI
5. Letzte Hand (1.2) — Komplexestes Quick Win

---

## Phase 2: TV-Display-Modus (v2.5.0)

Professionellere Präsentation, Differenzierung zum Wettbewerb.

### Feature 2.1 — Dedizierter TV-/Projector-Modus

**Problem**: Im Game-Mode sind Prizepool, Spieler-Standings und Controls sichtbar — sensibel bei Projektion. Clean View blendet alles aus, aber das Layout ist nicht für TV optimiert. 6/11 Wettbewerber bieten einen separaten Display-Modus.

**Umsetzung**:
1. **App.tsx**: `displayMode: boolean` State (zusätzlich zu `mode`, nicht statt — Timer läuft weiter)
2. **Neue Datei** `src/components/DisplayMode.tsx` (~200 Zeilen):
   ```tsx
   interface Props {
     timerState: TimerState;
     levels: Level[];
     currentPlayLevel: number;
     chipConfig?: ChipConfig;
     colorUpMap?: Map<number, ChipDenomination[]>;
     tournamentName: string;
     activePlayerCount: number;
     totalPlayerCount: number;
     isBubble: boolean;
     isLastHand: boolean;
     onExit: () => void;
   }
   ```
   Zeigt:
   - Sehr großen Timer (größer als `largeDisplay`, optimiert für 3+ Meter Distanz)
   - Aktuelle Blinds + Ante
   - Nächstes Level Preview
   - Spieleranzahl als „6/10" (keine Namen, kein Prizepool)
   - Bubble-/Letzte-Hand-Banner
   - Kein Prizepool, keine Standings, keine Controls, keine Settings
3. **App.tsx**: Keyboard-Shortcut `KeyT` für TV-Modus Toggle
4. **Controls.tsx** oder Header: „TV-Modus"-Button

**Dateien**: `DisplayMode.tsx` (neu, ~200 Zeilen), `App.tsx` (~30 Zeilen)
**Translation-Keys** (8 pro Sprache):
- `display.title` — `'TV-Modus'` / `'TV Mode'`
- `display.exit` — `'TV-Modus beenden (T)'` / `'Exit TV Mode (T)'`
- `display.playersRemaining` — `'Spieler'` / `'Players'`
- `display.nextLevel` — `'Nächstes'` / `'Next'`
- `display.blind` — `'Blinds'` / `'Blinds'`
- `display.ante` — `'Ante'` / `'Ante'`
- `display.break` — `'Pause'` / `'Break'`
- `display.activate` — `'TV-Modus (T)'` / `'TV Mode (T)'`
**Tests**: Keine (rein visuell)
**Abhängigkeiten**: Feature 1.2 (Last Hand Banner)

---

### Feature 2.2 — Rotierende Info-Screens

**Problem**: Auf professionellen Turnieren rotieren Displays zwischen Timer, Blindstruktur und Chip-Werten. Kein Web-Timer bietet dies.

**Umsetzung**:
1. **DisplayMode.tsx**: Interner State `activeScreen: 'timer' | 'schedule' | 'chips'`
2. Auto-Rotation alle 15 Sekunden via `setInterval`:
   ```tsx
   const screens = ['timer', 'schedule'];
   if (chipConfig?.enabled) screens.push('chips');
   ```
3. Screens:
   - **Timer**: Hauptanzeige (Feature 2.1)
   - **Schedule**: Blindstruktur-Tabelle (groß, TV-optimiert, aktuelles Level hervorgehoben)
   - **Chips**: Chip-Denominationen mit Farben, nächster Color-Up
4. Manuelle Navigation per Pfeiltasten links/rechts
5. Screen-Wechsel mit `animate-fade-in` Transition

**Dateien**: `DisplayMode.tsx` (~100 Zeilen ergänzt)
**Translation-Keys** (3 pro Sprache):
- `display.schedule` — `'Blindstruktur'` / `'Blind Schedule'`
- `display.chips` — `'Chip-Werte'` / `'Chip Values'`
- `display.rotationHint` — `'Automatischer Wechsel alle {n} Sek.'` / `'Auto-rotate every {n} sec.'`
**Tests**: Keine
**Abhängigkeiten**: Feature 2.1

---

## Phase 3: Turnier-Historie (v2.6.0) ✅ DONE

Session-übergreifender Mehrwert — die App „erinnert sich".

### Feature 3.1 — Turnier-Ergebnisse speichern

**Problem**: Nach Turnierende gehen alle Daten verloren. Keine Möglichkeit, vergangene Abende zu vergleichen.

**Umsetzung**:
1. **types.ts**: Neue Interfaces:
   ```typescript
   export interface PlayerResult {
     name: string;
     place: number;
     payout: number;
     rebuys: number;
     addOn: boolean;
     knockouts: number;
     bountyEarned: number;
     netBalance: number;
   }

   export interface TournamentResult {
     id: string;
     name: string;
     date: string;          // ISO timestamp
     playerCount: number;
     buyIn: number;
     prizePool: number;
     players: PlayerResult[];
     bountyEnabled: boolean;
     bountyAmount: number;
     rebuyEnabled: boolean;
     totalRebuys: number;
     addOnEnabled: boolean;
     totalAddOns: number;
     elapsedSeconds: number;
     levelsPlayed: number;
   }
   ```
2. **logic.ts**: Persistenz-Funktionen:
   - `buildTournamentResult(config, winner, elapsed, levels): TournamentResult`
   - `saveTournamentResult(result): void` — speichert in `poker-timer-history`, max 50 Einträge
   - `loadTournamentHistory(): TournamentResult[]`
   - `deleteTournamentResult(id): void`
   - `clearTournamentHistory(): void`
3. **App.tsx**: Im `tournamentFinished` Effect (Zeile ~564):
   ```tsx
   if (mode === 'game' && tournamentFinished && winner) {
     clearCheckpoint();
     saveTournamentResult(buildTournamentResult(config, winner, tournamentElapsed, currentPlayLevel));
   }
   ```

**Dateien**: `types.ts` (~30 Zeilen), `logic.ts` (~80 Zeilen), `App.tsx` (~10 Zeilen)
**Translation-Keys**: Keine (kein UI in diesem Schritt)
**Tests** (5): buildTournamentResult, save/load Round-Trip, delete, 50er-Cap, clearAll
**Abhängigkeiten**: Keine

---

### Feature 3.2 — Historie-Ansicht UI

**Problem**: Gespeicherte Ergebnisse brauchen eine Oberfläche.

**Umsetzung**:
1. **Neue Datei** `src/components/TournamentHistory.tsx` (~200 Zeilen):
   - Modal-Pattern wie `TemplateManager` (Zeile 1362 in App.tsx)
   - Aufklappbare Zeilen (ChevronIcon) mit: Datum, Name, Spielerzahl, Sieger, Prizepool
   - Expandiert: Vollständige Standings-Tabelle
   - Löschen einzelner Einträge, „Alle löschen" mit Confirm-Dialog
2. **App.tsx**: `showHistory: boolean` State, Button im Setup-Header neben Templates

**Dateien**: `TournamentHistory.tsx` (neu, ~200 Zeilen), `App.tsx` (~20 Zeilen)
**Translation-Keys** (15 pro Sprache):
- `app.history`, `history.title`, `history.noEntries`, `history.clearAll`, `history.clearConfirm`, `history.delete`, `history.winner`, `history.prizePool`, `history.players`, `history.duration`, `history.levels`, `history.date`, `history.standings`, `history.close`, `history.balance`
**Tests**: Keine (UI)
**Abhängigkeiten**: Feature 3.1

---

### Feature 3.3 — Spieler-Statistiken

**Problem**: Wer hat am meisten gewonnen? Wer spielt am häufigsten? Session-übergreifende Daten fehlen.

**Umsetzung**:
1. **types.ts**: Neues Interface:
   ```typescript
   export interface PlayerStat {
     name: string;
     tournaments: number;
     wins: number;
     cashes: number;
     totalPayout: number;
     totalCost: number;
     netBalance: number;
     avgPlace: number;
     bestPlace: number;
     knockouts: number;
   }
   ```
2. **logic.ts**: `computePlayerStats(history: TournamentResult[]): PlayerStat[]` — aggregiert nach normalisiertem Spielernamen (`toLowerCase().trim()`), sortiert nach netBalance
3. **TournamentHistory.tsx**: Tab/Sektion „Spielerstatistik" mit Tabelle

**Dateien**: `types.ts` (~15 Zeilen), `logic.ts` (~50 Zeilen), `TournamentHistory.tsx` (~50 Zeilen)
**Translation-Keys** (8 pro Sprache):
- `history.statsTab`, `history.tournaments`, `history.wins`, `history.cashes`, `history.totalPayout`, `history.totalCost`, `history.avgPlace`, `history.knockouts`
**Tests** (4): Mehrere Turniere, Namens-Normalisierung, Win/Cash-Counting, leere Historie
**Abhängigkeiten**: Feature 3.1

---

### Feature 3.4 — Text-Export (WhatsApp) + CSV-Export

**Problem**: Screenshot ist die einzige Share-Option. WhatsApp-Gruppen sind der primäre Kanal bei Home Games — Text-Copy wäre ideal.

**Umsetzung**:
1. **logic.ts**: Zwei neue Funktionen:
   ```typescript
   export function formatResultAsText(result: TournamentResult): string {
     // ♠♥ Turniernam ♦♣
     // Datum
     // 🏆 Spieler1 → 50.00 EUR
     // 🥈 Spieler2 → 30.00 EUR
     // ...
     // Prizepool: 100 EUR | 6 Spieler
   }

   export function formatResultAsCSV(result: TournamentResult): string {
     // Place,Name,Payout,Rebuys,AddOn,Knockouts,NetBalance
   }
   ```
2. **TournamentFinished.tsx**: „Text kopieren" Button (Clipboard API) + „CSV herunterladen" Button (Blob Download)
3. **TournamentHistory.tsx**: Gleiche Export-Buttons pro Eintrag

**Dateien**: `logic.ts` (~40 Zeilen), `TournamentFinished.tsx` (~20 Zeilen), `TournamentHistory.tsx` (~20 Zeilen)
**Translation-Keys** (4 pro Sprache):
- `finished.copyText` — `'Text kopieren'` / `'Copy Text'`
- `finished.textCopied` — `'Kopiert!'` / `'Copied!'`
- `finished.downloadCSV` — `'CSV herunterladen'` / `'Download CSV'`
- `finished.exportOptions` — `'Teilen'` / `'Share'`
**Tests** (3): formatResultAsText Format, formatResultAsCSV valid, leere Spieler
**Abhängigkeiten**: Feature 3.1 (TournamentResult Type)

---

### Phase 3 — Reihenfolge

Sequentiell, da aufeinander aufbauend:
1. Feature 3.1 — Types + Persistenz (Basis)
2. Feature 3.2 — Historie UI
3. Feature 3.3 — Spieler-Statistiken (parallel zu 3.4 möglich)
4. Feature 3.4 — Text/CSV Export (parallel zu 3.3 möglich)

---

## Phase 4: Refactoring + Big Blind Ante (v2.7.0) ✅ DONE

Technische Schulden abbauen, Erweiterbarkeit sichern.

### Feature 4.1 — `useVoiceAnnouncements()` Hook extrahieren

**Problem**: App.tsx hat ~170 Zeilen Voice-Announcement-Effects mit 8 separaten `useEffect` Hooks und 8+ Refs (Zeilen 456–781). Größte technische Schuld im Projekt.

**Umsetzung**:
1. **Neue Datei** `src/hooks/useVoiceAnnouncements.ts` (~200 Zeilen):
   ```typescript
   interface UseVoiceAnnouncementsParams {
     mode: 'setup' | 'game';
     settings: Settings;
     config: TournamentConfig;
     timerState: TimerState;
     colorUpMap: Map<number, ChipDenomination[]>;
     activePlayerCount: number;
     paidPlaces: number;
     bubbleActive: boolean;
     itmActive: boolean;
     addOnWindowOpen: boolean;
     rebuyActive: boolean;
     tournamentFinished: boolean;
     lastHandActive: boolean;
     t: TranslateFn;
   }
   ```
   Verschiebt: Level-Change, Break-Warning, 5-Min-Warning, Bounty, Player-Count-Milestones, Timer-Paused/Resumed, Rebuy-End/Add-On, Victory-Voice
2. **App.tsx**: Alle verschobenen Effects + Refs entfernen, ersetzen durch:
   ```tsx
   useVoiceAnnouncements({ mode, settings, config, ... });
   ```

**Dateien**: `useVoiceAnnouncements.ts` (neu, ~200 Zeilen), `App.tsx` (-160 Zeilen)
**Netto**: App.tsx von ~1400 auf ~1240 Zeilen
**Tests**: Keine (identisches Verhalten, nur Relocation)
**Abhängigkeiten**: Idealerweise nach Feature 1.5 (Promise-Sounds)

---

### Feature 4.2 — `useGameEvents()` Hook extrahieren

**Problem**: Bubble/ITM-Sound/Visual und Victory-Sound/Pause sind ebenfalls in App.tsx (Zeilen 589–641) mit separaten Refs.

**Umsetzung**:
1. **Neue Datei** `src/hooks/useGameEvents.ts` (~120 Zeilen):
   ```typescript
   interface UseGameEventsReturn {
     showItmFlash: boolean;
   }
   ```
   Verschiebt: Victory-Sound/Pause, Bubble-Sound, ITM-Sound/Flash
2. **App.tsx**: Effects + Refs entfernen, ersetzen durch:
   ```tsx
   const { showItmFlash } = useGameEvents({ mode, settings, ... });
   ```

**Dateien**: `useGameEvents.ts` (neu, ~120 Zeilen), `App.tsx` (-55 Zeilen)
**Netto**: App.tsx von ~1240 auf ~1185 Zeilen
**Tests**: Keine
**Abhängigkeiten**: Feature 1.5, Feature 4.1

---

### Feature 4.3 — Big Blind Ante Format

**Problem**: Big Blind Ante (BBA) ist das moderne Standard-Format bei Turnieren (WSOP, EPT). Signalisiert, dass die App aktuelle Formate kennt. 3/11 Wettbewerber unterstützen es.

**Umsetzung**:
1. **types.ts**: `anteMode: 'standard' | 'bigBlindAnte'` in `TournamentConfig`
2. **logic.ts**:
   - `computeDefaultAnte(bb, mode)` — BBA: ante = BB; Standard: ~12.5%
   - `applyDefaultAntes()` nutzt `anteMode`
   - `defaultConfig()` enthält `anteMode: 'standard'`
   - `parseConfigObject()` Backward-Compat für fehlenden `anteMode`
3. **App.tsx**: Segmentierter Toggle „Standard / BBA" im Setup (nur sichtbar wenn Ante aktiviert)
4. **TimerDisplay.tsx**: Zeigt „BBA" statt „Ante" wenn BBA-Modus aktiv

**Dateien**: `types.ts`, `logic.ts`, `App.tsx`, `TimerDisplay.tsx` (~60 Zeilen)
**Translation-Keys** (4 pro Sprache):
- `app.anteStandard` — `'Standard-Ante'` / `'Standard Ante'`
- `app.anteBBA` — `'Big Blind Ante'` / `'Big Blind Ante'`
- `timer.bba` — `'BBA'` / `'BBA'`
- `app.anteModeLabel` — `'Ante-Modus'` / `'Ante Mode'`
**Tests** (4): BBA gibt BB zurück, Standard gibt ~12.5%, applyDefaultAntes mit BBA, parseConfigObject Backward-Compat
**Abhängigkeiten**: Keine (aber sauberer nach Refactoring)

---

## Phase 5: Premium-Readiness (v6.9.2) ✅ DONE

Gate-Infrastruktur fuer zukuenftigen Freemium-Betrieb vorbereiten — ohne sichtbare Aenderung fuer Nutzer.

### Feature 5.1 — Gate-Checks fuer multiTable und sidePot

**Problem**: 3 von 5 Premium-Features hatten bereits Gate-Checks (TV, Remote, Liga), aber Multi-Table und Side-Pot liefen ungeprueft.

**Umsetzung**:
- `canUseMultiTable` / `canUseSidePot` Memos in App.tsx
- Prop-Threading: App.tsx → SetupModeContainer → SetupPage (multiTable), App.tsx → GameModeContainer → PlayerPanel (sidePot)
- Safety-Guard: MultiTablePanel im Spielmodus wird bei `canUseMultiTable === false` nicht gerendert

**Dateien**: App.tsx, SetupPage.tsx, SetupModeContainer.tsx, PlayerPanel.tsx, GameModeContainer.tsx

---

### Feature 5.2 — Feature-Discovery und Telemetrie

**Problem**: Kein Tracking, welche Premium-Features Nutzer entdecken und verwenden.

**Umsetzung**:
- `markFeatureDiscovered()` an 5 Feature-Einstiegspunkten (AppHeader: TV/Remote/Liga, SetupPage: MultiTable, PlayerPanel: SidePot)
- `trackFeatureUsed()` an 5 Nutzungspunkten (App.tsx: TV/Remote/Liga, MultiTablePanel/SidePotCalculator: useEffect on mount)
- `trackSessionStarted()` einmal pro Page-Load in main.tsx

**Dateien**: AppHeader.tsx, SetupPage.tsx, PlayerPanel.tsx, App.tsx, MultiTablePanel.tsx, SidePotCalculator.tsx, main.tsx
**Tests**: 4 neue Entitlement-Tests (12 gesamt)

---

## Zusammenfassung

### Translation-Keys gesamt: 48 pro Sprache (96 total)

| Phase | Feature | Keys |
|-------|---------|------|
| 1 | Letzte Hand | 4 |
| 1 | Dealer-Rotation | 1 |
| 2 | Display-Modus | 8 |
| 2 | Rotierende Screens | 3 |
| 3 | Historie-Ansicht | 15 |
| 3 | Spieler-Statistiken | 8 |
| 3 | Text/CSV-Export | 4 |
| 4 | Big Blind Ante | 4 |

### Tests gesamt: 195 → 216 (+21)

| Phase | Feature | Tests |
|-------|---------|-------|
| 1 | Dealer-Rotation | +3 |
| 1 | Promise-Sounds | +2 |
| 3 | Ergebnisse speichern | +5 |
| 3 | Spieler-Statistiken | +4 |
| 3 | Text/CSV-Export | +3 |
| 4 | Big Blind Ante | +4 |

### Neue Dateien

| Phase | Datei | Typ |
|-------|-------|-----|
| 1 | `src/components/ErrorBoundary.tsx` | Komponente |
| 2 | `src/components/DisplayMode.tsx` | Komponente |
| 3 | `src/components/TournamentHistory.tsx` | Komponente |
| 4 | `src/hooks/useVoiceAnnouncements.ts` | Hook |
| 4 | `src/hooks/useGameEvents.ts` | Hook |

### App.tsx Reduktion

| Phase | Vorher | Nachher | Delta |
|-------|--------|---------|-------|
| Start | ~1400 | — | — |
| Phase 1 | ~1400 | ~1440 | +40 (neue Features) |
| Phase 4 | ~1440 | ~1225 | -215 (Hook-Extraktion) |
