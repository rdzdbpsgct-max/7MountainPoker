# Feature-Inventur & Testbarkeitsanalyse — 7Mountain Poker

**Erstellt**: 2026-03-09
**Aktualisiert**: 2026-03-16
**Basis**: v6.9.2, 1199 Tests, 23 Domain-Module, ~350+ exportierte Funktionen

---

## 1. Feature-Inventur mit Testbarkeits-Bewertung

### Legende
- **T** = Bereits getestet (Unit/Component)
- **P** = Partiell getestet
- **U** = Ungetestet
- **Auto** = Gut automatisierbar
- **Semi** = Mit Aufwand automatisierbar (Mocks noetig)
- **Man** = Besser manuell testen

---

### 1.1 Timer & Kernlogik

| Feature | Funktionen | Test-Status | Automatisierbar | Fehleranfaellig | Notizen |
|---------|-----------|:-----------:|:---------------:|:---------------:|---------|
| computeRemaining (wall-clock) | `computeRemaining()` | T | Auto | **Hoch** | Kernstueck, Drift-Risiko bei langer Laufzeit |
| advanceLevel | `advanceLevel()` | T | Auto | Mittel | Randfall: letzter Level |
| previousLevel | `previousLevel()` | T | Auto | Niedrig | |
| resetCurrentLevel | `resetCurrentLevel()` | T | Auto | Niedrig | |
| restartTournament | `restartTournament()` | T | Auto | Mittel | Alle States zuruecksetzen |
| formatTime | `formatTime()` | T | Auto | Niedrig | |
| formatElapsedTime | `formatElapsedTime()` | T | Auto | Niedrig | |
| getLevelLabel | `getLevelLabel()` | T | Auto | Niedrig | i18n-abhaengig |
| getBlindsText | `getBlindsText()` | T | Auto | Niedrig | BBA-Modus beachten |
| useTimer Hook | `useTimer()` | T | Auto | **Hoch** | 8 Tests vorhanden, Interval-Cleanup kritisch |
| Keyboard Shortcuts | `useKeyboardShortcuts()` | **U** | **Auto** | Mittel | 9 Shortcuts, 0 Tests — **Prio 1** |
| Scrub-Slider | TimerDisplay inline | **U** | Semi | Mittel | Pointer-Events, Touch |

### 1.2 Blindstruktur

| Feature | Funktionen | Test-Status | Automatisierbar | Fehleranfaellig | Notizen |
|---------|-----------|:-----------:|:---------------:|:---------------:|---------|
| generateBlindStructure (3 Speeds) | `generateBlindStructure()` | T | Auto | Niedrig | |
| generateBlindsByEndTime | `generateBlindsByEndTime()` | T | Auto | Mittel | Binary-Search-Algorithmus |
| Chip-aware Rundung | `roundToChipMultiple()` | T | Auto | Niedrig | |
| roundToNice | `roundToNice()` | T | Auto | Niedrig | |
| Ante Standard + BBA | `computeDefaultAnte()`, `applyDefaultAntes()` | T | Auto | Niedrig | |
| Dauer-Schaetzung | `estimateDuration()`, `estimatePlayedLevels()` | T | Auto | Niedrig | |
| Blind-Struktur-Summary | `computeBlindStructureSummary()` | T | Auto | Niedrig | |
| stripAnteFromLevels | `stripAnteFromLevels()` | T | Auto | Niedrig | |

### 1.3 Spielerverwaltung

| Feature | Funktionen | Test-Status | Automatisierbar | Fehleranfaellig | Notizen |
|---------|-----------|:-----------:|:---------------:|:---------------:|---------|
| defaultPlayers | `defaultPlayers()` | T | Auto | Niedrig | Sprachabhaengig |
| movePlayer / shuffle | `movePlayer()`, `shufflePlayers()` | T | Auto | Niedrig | |
| Dealer-Rotation | `advanceDealer()` | T | Auto | Mittel | Skip Eliminierte |
| Bubble / ITM | `isBubble()`, `isInTheMoney()` | T | Auto | Mittel | Korrekte Schwelle |
| Placement | `computeNextPlacement()` | T | Auto | Niedrig | |
| Re-Entry | `canReEntry()`, `reEnterPlayer()` | T | Auto | **Hoch** | Komplexe ID-Verknuepfung |
| Stack-Tracking | `initializePlayerStacks()`, `findChipLeader()`, etc. | T | Auto | Mittel | |
| useGameEvents Hook | `useGameEvents()` | **U** | **Auto** | **Hoch** | Victory/Bubble/ITM-Logik — **Prio 2** |
| useTournamentActions Hook | `useTournamentActions()` | **U** | Semi | **Hoch** | 317 Zeilen, viele Callbacks — **Prio 3** |
| PlayerPanel Component | `PlayerPanel` | P (10 Tests) | Semi | Mittel | Elimination, Rebuy, Stacks |
| PlayerManager Component | `PlayerManager` | **U** | Semi | Mittel | Drag&Drop schwer testbar |

### 1.4 Rebuy / Add-On / Bounty

| Feature | Funktionen | Test-Status | Automatisierbar | Fehleranfaellig | Notizen |
|---------|-----------|:-----------:|:---------------:|:---------------:|---------|
| isRebuyActive | `isRebuyActive()` | T | Auto | Mittel | Zeit- und Level-Limit |
| canPlayerRebuy | `canPlayerRebuy()` | T | Auto | Niedrig | Per-Player Cap |
| lateRegistration | `isLateRegistrationOpen()` | T | Auto | Niedrig | |
| computePrizePool | `computePrizePool()` | T | Auto | Mittel | Rebuy-Pot separat |
| computeRebuyPot | `computeRebuyPot()` | T | Auto | Niedrig | |
| computePayouts | `computePayouts()` | T | Auto | **Hoch** | Finanziell relevant |
| Mystery Bounty | `drawMysteryBounty()` | T | Auto | Mittel | Pool-Erschoepfung unklar |
| AddOn-Banner/Timing | BubbleIndicator | P (5 Tests) | Semi | Mittel | Timer-Pause-Interaktion |

### 1.5 Chips & Color-Up

| Feature | Funktionen | Test-Status | Automatisierbar | Fehleranfaellig | Notizen |
|---------|-----------|:-----------:|:---------------:|:---------------:|---------|
| checkBlindChipCompatibility | `checkBlindChipCompatibility()` | T | Auto | Niedrig | |
| computeColorUps | `computeColorUps()` | T | Auto | Niedrig | |
| defaultChipConfig | `defaultChipConfig()` | T | Auto | Niedrig | |
| applyChipPreset | `applyChipPreset()` | **U** | **Auto** | Niedrig | Einfacher Test |
| getRemovedDenomIds | `getRemovedDenomIds()` | **U** | **Auto** | Niedrig | |
| getNextColorUpLevel | `getNextColorUpLevel()` | **U** | **Auto** | Niedrig | |
| generateColorUpSuggestion | `generateColorUpSuggestion()` | **U** | **Auto** | Mittel | Algorithmisch |
| scheduleToColorUpMap | `scheduleToColorUpMap()` | **U** | **Auto** | Niedrig | |

### 1.6 Multi-Table

| Feature | Funktionen | Test-Status | Automatisierbar | Fehleranfaellig | Notizen |
|---------|-----------|:-----------:|:---------------:|:---------------:|---------|
| distributePlayersToTables | `distributePlayersToTables()` | T | Auto | Mittel | Round-Robin |
| balanceTables | `balanceTables()` | T | Auto | **Hoch** | Iterativer Algorithmus |
| mergeToFinalTable | `mergeToFinalTable()` | T | Auto | Mittel | Dealer-Erhalt |
| seatPlayerAtSmallestTable | `seatPlayerAtSmallestTable()` | T | Auto | Mittel | Late-Reg/Re-Entry |
| toggleSeatLock | `toggleSeatLock()` | T | Auto | Niedrig | |
| advanceTableDealer | `advanceTableDealer()` | T | Auto | Niedrig | |
| MultiTablePanel UI | `MultiTablePanel` | **U** | Semi | Mittel | |

### 1.7 Liga-Modus

| Feature | Funktionen | Test-Status | Automatisierbar | Fehleranfaellig | Notizen |
|---------|-----------|:-----------:|:---------------:|:---------------:|---------|
| GameDay CRUD | `saveGameDay()`, `deleteGameDay()`, etc. | T | Auto | Niedrig | |
| createGameDayFromResult | `createGameDayFromResult()` | T | Auto | **Hoch** | Auto-Erstellung, viele Felder |
| computeExtendedStandings | `computeExtendedStandings()` | T | Auto | **Hoch** | Finanz-Aggregation |
| applyTiebreaker | `applyTiebreaker()` | T | Auto | Mittel | Kriterien-Kette |
| computeLeagueFinances | `computeLeagueFinances()` | T | Auto | Mittel | |
| computeLeaguePlayerStats | `computeLeaguePlayerStats()` | T | Auto | Mittel | |
| QR-Encoding/Decoding | `encodeLeagueStandingsForQR()`, etc. | T | Auto | Niedrig | |
| Seasons | Season-Helpers | T | Auto | Niedrig | |
| Guest Players | Exclusion-Logik | T | Auto | Niedrig | |
| Point Corrections | `corrections` Handling | T | Auto | Niedrig | |
| LeagueView UI | `LeagueView`, `LeagueStandingsTable`, etc. | **U** | Semi | Mittel | 5 UI-Komponenten |
| Liga Import v1→v2 | `parseLeagueFile()` | P | Auto | Mittel | Rueckwaertskompatibilitaet |

### 1.8 Sound / Voice / Audio

| Feature | Funktionen | Test-Status | Automatisierbar | Fehleranfaellig | Notizen |
|---------|-----------|:-----------:|:---------------:|:---------------:|---------|
| playVictorySound | `playVictorySound()` | P | Semi | Mittel | Promise-basiert, Web Audio |
| playBubbleSound | `playBubbleSound()` | P | Semi | Mittel | |
| playInTheMoneySound | `playInTheMoneySound()` | P | Semi | Mittel | |
| setMasterVolume | `setMasterVolume()` | **U** | Semi | Niedrig | |
| initAudio (Safari) | `initAudio()` | **U** | **Man** | **Hoch** | AudioContext-Sperre |
| 27+ Voice-Ansagen | `announceLevel()`, etc. | P (gemockt) | Semi | **Hoch** | MP3-Fallback-Kette |
| audioPlayer | `playAudioSequence()` | **U** | Semi | **Hoch** | Gapless, Fallback-Kette |
| VoiceSwitcher UI | `VoiceSwitcher` | **U** | Semi | Niedrig | |

### 1.9 Persistenz

| Feature | Funktionen | Test-Status | Automatisierbar | Fehleranfaellig | Notizen |
|---------|-----------|:-----------:|:---------------:|:---------------:|---------|
| initStorage | `initStorage()` | T | Auto | Mittel | Migration-Logik |
| getCached/setCached | Cache-API | T | Auto | Niedrig | |
| setCachedItem/deleteCachedItem | Collection-API | T | Auto | Niedrig | |
| localStorage→IndexedDB Migration | Migration-Code | T | Auto | **Hoch** | Einmal-Migration |
| Fallback auf localStorage | Fallback-Logik | T | Auto | Mittel | |
| Checkpoint Save/Restore | `saveCheckpoint()`, `loadCheckpoint()` | T | Auto | **Hoch** | Datenverlust-Risiko |
| Template CRUD | `saveTemplate()`, etc. | T | Auto | Niedrig | |
| Historie CRUD | `saveTournamentResult()`, etc. | T | Auto | Niedrig | max 200 |
| Player Database | `syncPlayersToDatabase()`, etc. | T | Auto | Niedrig | |
| Cross-Tab Konflikte | In-Memory vs IndexedDB | **U** | Semi | **Hoch** | Nicht adressiert |

### 1.10 TV-Display / Remote / PWA

| Feature | Funktionen | Test-Status | Automatisierbar | Fehleranfaellig | Notizen |
|---------|-----------|:-----------:|:---------------:|:---------------:|---------|
| DisplayMode 6+ Screens | `DisplayMode`, Sub-Screens | **U** | Semi | Mittel | BroadcastChannel |
| BroadcastChannel Serialization | `serializeColorUpMap()`, etc. | T (3 Tests) | Auto | Niedrig | |
| Remote: Pure Functions | `generatePeerId()`, HMAC, etc. | T | Auto | Niedrig | |
| Remote: PeerJS Connection | Host/Controller Classes | **U** | **Man** | **Hoch** | Netzwerk-abhaengig |
| PWA Service Worker | vite-plugin-pwa | **U** | **Man** | Mittel | Offline-Test manuell |
| Wake Lock | Wake Lock API | **U** | **Man** | Mittel | Geraete-abhaengig |
| Screenshot/Share | html-to-image + Web Share | **U** | **Man** | Mittel | Browser-API |
| QR-Codes | `qrcode.react` Rendering | P | Semi | Niedrig | |

### 1.11 i18n / Theme

| Feature | Funktionen | Test-Status | Automatisierbar | Fehleranfaellig | Notizen |
|---------|-----------|:-----------:|:---------------:|:---------------:|---------|
| DE/EN Key-Paritaet | `translations.ts` | **U** | **Auto** | **Hoch** | Prio 1 — einfachster High-Value-Test |
| t() mit Parametern | `t('key', {n: 5})` | **U** | Auto | Mittel | Platzhalter-Ersetzung |
| LanguageSwitcher | Component | P (3 Tests) | Auto | Niedrig | |
| ThemeSwitcher | Component | P (3 Tests) | Auto | Niedrig | |
| Akzentfarben (6) | CSS Custom Properties | **U** | Semi | Niedrig | Visuell |
| Hintergrundmuster (9) | CSS Custom Properties | **U** | **Man** | Niedrig | Visuell |

### 1.12 Toast / Utility

| Feature | Funktionen | Test-Status | Automatisierbar | Fehleranfaellig | Notizen |
|---------|-----------|:-----------:|:---------------:|:---------------:|---------|
| showToast / dismissToast | `toast.ts` | **U** | **Auto** | Niedrig | Einfach, aber 0 Tests |
| subscribeToasts | `subscribeToasts()` | **U** | **Auto** | Niedrig | |
| snapSpinnerValue | `snapSpinnerValue()` | T | Auto | Niedrig | |
| generateId/generatePlayerId | `helpers.ts` | T | Auto | Niedrig | |

---

## 2. Risikoanalyse

### 2.1 Hoechstes Risiko (sofort adressieren)

| Risiko | Betroffene Funktion | Wahrscheinlichkeit | Impact | Gegenmassnahme |
|--------|--------------------|--------------------|--------|----------------|
| **i18n-Keys asynchron** | `translations.ts` | Hoch (bei jedem Feature) | Mittel (fehlende Texte) | Key-Paritaetstest (1 Test, 30 Min) |
| **Keyboard Shortcuts brechen** | `useKeyboardShortcuts()` | Mittel | Hoch (Hauptbedienung) | Hook-Tests (15 Tests, 2 Std) |
| **Timer-Doppelinstanz** | `useTimer()` | Niedrig | **Kritisch** (falscher Countdown) | Integration-Test Play/Pause Rapid Toggle |
| **Checkpoint-Datenverlust** | `saveCheckpoint()`/`loadCheckpoint()` | Niedrig | **Kritisch** (Turnier weg) | Schon getestet, Integration fehlt |
| **Payout-Berechnung falsch** | `computePayouts()` | Niedrig | **Kritisch** (Geld) | Schon getestet, mehr Edge Cases |

### 2.2 Hohes Risiko (zeitnah adressieren)

| Risiko | Betroffene Funktion | Wahrscheinlichkeit | Impact | Gegenmassnahme |
|--------|--------------------|--------------------|--------|----------------|
| **useGameEvents nicht getestet** | Victory/Bubble/ITM | Mittel | Hoch | Hook-Test mit Mocks |
| **AudioContext-Sperre Safari** | `initAudio()` | Hoch (Safari) | Mittel | Manueller Test + Dokumentation |
| **Voice-Sound-Ueberlappung** | Speech-Queue | Mittel | Mittel | Schwer automatisierbar |
| **Multi-Table Balance Race** | `balanceTables()` | Niedrig | Hoch | Mehr Edge-Case-Tests |
| **Mystery Bounty Pool leer** | `drawMysteryBounty()` | Mittel | Hoch | Fehlender Edge-Case-Test |

### 2.3 Mittleres Risiko (in Phase 2)

| Risiko | Betroffene Funktion | Wahrscheinlichkeit | Impact |
|--------|--------------------|--------------------|--------|
| Cross-Tab IndexedDB-Konflikte | `storage.ts` | Niedrig | Mittel |
| Liga-Import v1→v2 fehlerhaft | `parseLeagueFile()` | Niedrig | Mittel |
| Re-Entry + Final Table | `reEnterPlayer()` + `mergeToFinalTable()` | Niedrig | Mittel |
| Remote Control Reconnect | PeerJS Auto-Reconnect | Mittel | Niedrig |
| BroadcastChannel Timing | `displayChannel.ts` | Niedrig | Niedrig |

---

## 3. Empfohlene Testarchitektur

### 3.1 Verzeichnisstruktur

```
tests/
├── setup.ts                     # Besteht (fake-indexeddb, matchMedia, resetStorage)
├── logic.test.ts                # Besteht: 503 Domain-Logic-Tests (6288 Zeilen)
├── components.test.tsx          # Besteht: 95 Component-Tests (1266 Zeilen)
├── i18n.test.ts                 # NEU: Translation-Key-Paritaet, Parameterersetzung
├── hooks.test.tsx               # NEU: useKeyboardShortcuts, useGameEvents
├── toast.test.ts                # NEU: Toast-System-Tests
├── chips.test.ts                # NEU: Ungetestete Chip-Funktionen
└── e2e/                         # SPAETER: Playwright-Tests
    ├── playwright.config.ts
    ├── smoke.spec.ts
    └── tournament-flow.spec.ts
```

### 3.2 Begruendung fuer separate Dateien

- **logic.test.ts** hat bereits 6288 Zeilen — weitere Logik-Tests dort anhaengen
- **Hooks mit JSX/renderHook** brauchen `.tsx` → eigene Datei `hooks.test.tsx`
- **i18n-Tests** sind reine Key-Vergleiche → eigene Datei `i18n.test.ts`
- **Toast** ist ein eigenstaendiges System → eigene Datei `toast.test.ts`
- **Chip-Funktionen** koennen in `logic.test.ts` oder eigene Datei

### 3.3 Konventionen

- Test-IDs aus dem Testplan als Kommentare: `// T-005, T-006, T-007`
- Describe-Bloecke nach Feature-Bereich
- Factories in `setup.ts` oder oben in jeder Testdatei
- Mocks nur wo noetig (Web Audio, Speech, PeerJS)
- `vi.useFakeTimers()` fuer Timer-abhaengige Tests

---

## 4. Erste priorisierte Testfaelle

### Prio 1: i18n Key-Paritaet (1 Test, 30 Min)
→ Verhindert Sprach-Luecken bei jedem neuen Feature

### Prio 2: Keyboard Shortcuts (12 Tests, 2 Std)
→ 9 Shortcuts ohne jeglichen Test, Hauptbedienweg im Spiel

### Prio 3: Toast-System (5 Tests, 30 Min)
→ 0 Tests fuer ein eigenstaendiges Modul, einfach zu testen

### Prio 4: Ungetestete Chip-Funktionen (8 Tests, 1 Std)
→ 5 exportierte Funktionen ohne Tests

### Prio 5: useGameEvents Hook (8 Tests, 2 Std)
→ Victory/Bubble/ITM-Logik mit Refs und Timeouts

### Prio 6: Mystery Bounty Edge Case (2 Tests, 30 Min)
→ Pool-Erschoepfung ist ein Produktionsrisiko

---

## 5. Feature-Gating Status (v6.9.2)

### 5.1 Premium-Tier Features

| Feature | Gate-Check | Discovery | Telemetrie | Gate-Location |
|---------|:----------:|:---------:|:----------:|---------------|
| TV Display | ✅ | ✅ | ✅ | AppHeader.tsx |
| Remote Control | ✅ | ✅ | ✅ | AppHeader.tsx |
| Liga-Modus | ✅ | ✅ | ✅ | AppHeader.tsx |
| Multi-Table | ✅ | ✅ | ✅ | SetupPage.tsx + GameModeContainer.tsx |
| Side-Pot | ✅ | ✅ | ✅ | PlayerPanel.tsx |

### 5.2 Pro-Tier Features (Zukunft, noch nicht implementiert)

| Feature | Definiert in | Status |
|---------|-------------|--------|
| Cloud Backup | proBlueprint.ts | Nur Blueprint |
| Team Roles | proBlueprint.ts | Nur Blueprint |
| Multi-Event | proBlueprint.ts | Nur Blueprint |

### 5.3 Gate-Infrastruktur

- **Entitlements**: `entitlements.ts` — `isFeatureAvailable()`, `loadEntitlements()`, `markFeatureDiscovered()`
- **Telemetrie**: `monetizationTelemetry.ts` — `trackFeatureUsed()`, `trackSessionStarted()`
- **UI**: `FeatureGateModal.tsx` — zeigt Upgrade-Dialog bei gesperrtem Feature
- **Default-Tier**: `'premium'` — alle Features frei, Wechsel zu `'free'` per `VITE_APP_TIER` Env-Variable
- **Tests**: 12 Unit-Tests in `entitlements.test.ts`, 3 in `monetizationTelemetry.test.ts`
