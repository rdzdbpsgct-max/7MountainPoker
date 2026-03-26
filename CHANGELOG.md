# Changelog

Alle wichtigen Änderungen an der 7Mountain Poker App.
All notable changes to the 7Mountain Poker app.

---

## [6.11.1] – 2026-03-23

### Abschluss-Audit, Deal-Finished & Stale-Connection-Eviction

Finales Audit gegen alle bisherigen Audit-Ergebnisse. Bewertung: **A (95/100) — Produktionsreif**.

- **Deal-Finished Screen**: Turnier endet jetzt korrekt nach Deal-Abschluss. Neues `Player.dealPayout` Feld speichert vereinbarte Beträge (backward-kompatibel). `tournamentFinished` erkennt Deal-Fall (active===0 + dealPayout vorhanden). TournamentFinished zeigt Deal-Banner (🤝 „Deal vereinbart") mit Methode (ICM/Chip/Even) statt Sieger-Feier, alle Deal-Teilnehmer mit vereinbarten Beträgen in Badges. `buildTournamentResult` nutzt `dealPayout` statt berechneter Payouts aus Payout-Schedule. Geteilte Platzierung bei gleichem Payout (z.B. Even Chop → alle Platz 1, nächster eliminierter Spieler Platz 4). Standings zeigen Deal-Spieler oben, danach regulär eliminierte Spieler.
- **i18n-Bereinigung**: Hardkodierte `€`-Symbole und Spaltenheader in LeagueFinances, LeagueGameDays, LeagueStandingsTable, GameDayEditor, TournamentFinished durch `t()`-Aufrufe und `CURRENCY_SYMBOLS`-Lookup ersetzt. 14 neue Translation-Keys.
- **Toast-Feedback**: Bestätigungs-Toasts bei Template speichern/löschen (TemplateManager), Liga löschen (LeagueView), Serie löschen (SeriesManager), Backup wiederherstellen. 16 neue Toast-Translation-Keys.
- **Aria-Labels**: Move-Buttons in PlayerManager mit `aria-label` ergänzt.
- **PeerJS Stale-Connection-Eviction**: `lastPongTime`-Map pro Peer mit 10 Min Max-Age. Automatisches Eviction verwaister WebRTC-Verbindungen in Keepalive-Intervall. Beide Verbindungstypen (Controller + Display) abgedeckt.
- **startValidation-Tests**: 11 neue Tests für `collectStartErrors()` — alle 8 Preflight-Checks abgedeckt.
- **alertEngine-Tests**: 18 neue Tests für `createDefaultAlert`, `interpolateAlertText`, `shouldFireAlert` — alle Trigger-Typen und Edge-Cases.
- **Payout-Rundungs-Tests**: 4 Präzisionstests für `computePayouts` — Summen-Toleranz ≤$0.01, 33/33/34-Normalisierung, Euro-Clamp.
- **Neue Testdateien**: `tests/startValidation.test.ts`, `tests/alertEngine.test.ts`
- **6 neue Deal-Translation-Keys** (3 DE + 3 EN): `finished.dealMade`, `finished.dealMethod`, `finished.dealParticipants`
- **32 neue Tests** — **1360 Tests gesamt** (21 Testdateien)

---

## [6.11.0] – 2026-03-22

### Deal-Making, Liga-Charts, Validierung & Accessibility

- **Deal-Making / Chop-Rechner**: Neues `DealMaker.tsx` Modal im Spielmodus — 3 Deal-Methoden (Equal Chop, ICM-basiert, Chip-proportional) mit Anpassungs-Slider und Winner-Takes-Rest-Option. Lazy-loaded, integriert in GameModeContainer. Tastenkürzel `D`.
- **Liga Trend-Charts**: Neues `LeagueCharts.tsx` als 5. Tab in LeagueView — SVG-basierte Visualisierung (Punkte-Verlauf, Platz-Verteilung, Teilnahme-Rate pro Spieler). Responsive, Dark-Mode-aware, keine externe Chart-Library.
- **Point-System-Validierung**: `validatePointSystem()` in league.ts — filtert ungültige Einträge, dedupliziert, sortiert, Fallback auf Default. Wird in `computeExtendedStandings()` genutzt.
- **Automated Accessibility Tests**: Neue `tests/a11y.test.tsx` mit 6 WCAG 2.1 Prüfungen via `vitest-axe` + `axe-core` (NumberStepper, CollapsibleSection, BubbleIndicator, RebuyStatus, ChevronIcon, LoadingFallback).
- **NumberStepper a11y**: `label`-Prop für `aria-label` auf dem Input-Element — behebt axe-Violation „Form elements must have labels".
- **CI Test-Count Gate**: GitHub Actions Pipeline prüft jetzt Mindest-Testanzahl (≥1300) und bricht bei Regression ab.
- **Neue Dateien**: `DealMaker.tsx`, `LeagueCharts.tsx`, `tests/a11y.test.tsx`
- **~30 neue Translation-Keys** (deal.*, league.charts.*)
- **23 neue Tests** — **1328 Tests gesamt** (19 Testdateien)
- **Docs**: README.md, CLAUDE.md, CHANGELOG.md, helpContent.ts vollständig aktualisiert (DE + EN).

## [6.10.1] – 2026-03-22

### Liga-Erstellung: Punktesystem & Einstellungen

- **Liga-Erstellungs-Modal**: Statt einfachem Namensfeld öffnet „+ Neue Liga" jetzt ein vollständiges Erstellungs-Modal mit Name, Punktesystem und Ranking-Algorithmus.
- **Flexibles Punktesystem**: Plätze 1–N frei konfigurierbar — Punkte per NumberStepper editierbar, Plätze hinzufügen/entfernen, bis zu 10+ Plätze möglich.
- **Punkt-Vorlagen**: 3 Schnell-Vorlagen direkt im Erstellungs-Dialog — Standard (10-7-5-4-3-2-1), Einfach (5-3-1), Top 10 (10-9-8-7-6-5-4-3-2-1).
- **Ranking-Algorithmus**: Punkte / ELO / Gewichtete Punkte direkt bei der Erstellung wählbar.
- **LeagueSettings verbessert**: Punktesystem-Editor in den Liga-Einstellungen (⚙️) ebenfalls mit Vorlagen und Add/Remove-Support.
- **Neue Datei**: `src/components/LeagueCreationModal.tsx`
- **10 neue Translation-Keys** (5 DE + 5 EN): `league.creation.*` (5) + `league.preset.*` (3)
- **1305 Tests gesamt** (unverändert)

## [6.10.0] – 2026-03-21

### Audit-Pakete: UX, Stability & Architecture

- **Offline-Banner**: Amber-Warnhinweis im Header bei fehlender Internetverbindung. Automatisch ausgeblendet bei Reconnect.
- **Liga-Sort-Persistenz**: Sortier-Spalte und -Richtung in der Liga-Tabelle wird in localStorage gespeichert und bleibt über Sessions erhalten.
- **Turnier-Klon aus Historie**: „Wiederholen"-Button in der Turnier-Historie übernimmt die komplette Konfiguration (Blindstruktur, Buy-In, Spieler) als neues Turnier-Setup.
- **Liga→Turnier Spieler-Übernahme**: Beim Starten eines Turniers aus dem Liga-Modus werden automatisch die Spieler der letzten 5 Spieltage vorgeschlagen.
- **Quick-Start-Fallback**: Wenn der Liga-Quick-Start fehlschlägt (z.B. fehlende Konfiguration), Fallback zum Setup-Modus statt Fehlermeldung ohne Aktion.
- **Storage-Init-Timeout**: Sicherheits-Timeout (5 Sek.) für IndexedDB-Initialisierung — App rendert auch bei hängender Storage-Init.
- **PDF-Helper-Export**: `sanitizeFilename()` und `formatDuration()` aus pdfExport.ts exportiert für Wiederverwendung.
- **App.tsx State-Extraktion**: 3 neue Hooks: `useEntitlements` (11 Feature-Flags + Lizenz-State), `useGameUiState` (6 Game-UI-States), `useUndoManager` (Undo/Redo-Stack). App.tsx von 1236 → 1187 Zeilen.
- **23 neue Tests** (sanitizeFilename, formatDuration, cloneConfigFromResult, getLeaguePlayerNames, PDF-Helpers) — **1305 Tests gesamt** (18 Testdateien).
- **6 neue Translation-Keys** (3 DE + 3 EN): `history.clone`, `history.cloneTooltip`, `history.cloneSuccess`.

## [6.9.9] – 2026-03-21

### Holistic Hardening, UX Quick Wins & Test-Coverage

- **Duplikat-Spielernamen-Warnung**: Amber-Border + Tooltip bei doppelten Namen im PlayerManager. Verhindert Liga-Statistik-Verwechslungen durch identische Spielernamen.
- **Spielersuche**: Suchfeld im PlayerPanel ab 10 Spielern. Filtert aktive + eliminierte Spieler sofort beim Tippen.
- **Stack-to-Blind-Warnung**: Amber-Farbe + ⚠-Icon in TournamentStats bei ≤15 BB Durchschnittsstack. Tooltip empfiehlt Late-Reg-Schließung (≤15 BB) bzw. signalisiert Turnierend (≤10 BB).
- **4 neue Preflight-Validierungen**: `startingChips > 0`, `bounty.amount > 0` bei Fixed-Bounty, Blind-Monotonie (BB aufsteigend), Payout-Plätze lückenlos.
- **Serien Auto-Link**: Turnierergebnis wird automatisch mit verknüpfter Serie verbunden (analog Liga-GameDay). Kein manuelles Verknüpfen mehr nötig.
- **Sieger-Bounty**: Gewinner erhält in `buildTournamentResult` eigenes Bounty-Chip (Fixed-Modus).
- **Bounty Heads-Up**: Automatische Killer-Auswahl bei nur einem möglichen Eliminator.
- **A11y-Verbesserungen**: `TournamentFinished` dialog-Rolle, AppHeader aria-labels, ErrorBoundary zweisprachig.
- **Robustheit**: `sanitizeRecoveredConfig` prüft stale `seriesId`, Heads-Up-Ansage-Guard, `dissolveTable`-Warnung, `paidPlaces` memoized.
- **Legal Footer**: Impressum + Datenschutz Links auf Setup-Seite.
- **25 neue Tests** (cloudExport, audioService, isValidAudioFile, tables, blinds, license) — **1282 Tests gesamt**.

---

## [6.9.8] – 2026-03-19

### Lizenzschlüssel-System & Personalisierungs-Gates

- **HMAC-Lizenzschlüssel**: Selbst-signierende Offline-Lizenzschlüssel (`7MP-TIER-EXPIRY-SIGNATURE`). Web Crypto API HMAC-SHA256 Verifikation. CLI-Generator (`node scripts/generate-license.mjs premium 0`). Aktivierungs-Modal mit Eingabe, Validierung, aktive Lizenz mit Entfernen-Button. Sofortige Feature-Freischaltung ohne Reload.
- **7 neue Premium-Gates**: Akzentfarben (Free: Emerald), Hintergrundbilder (Free: none + felt-green), Display-Layouts (Free: Standard), Custom Audio, PDF-Export, Turnier-Serien, ICM-Rechner.
- **SettingsPanel Lock-UI**: Gesperrte Optionen mit Lock-Icon + reduzierter Opacity, Klick öffnet FeatureGateModal → LicenseActivation.
- **12 Premium-Features gesamt** (5 Core + 7 Personalisierung), alle Gate-bereit. Default-Tier bleibt `'premium'` — alle Features offen.

---

## [6.9.7] – 2026-03-19

### Business Logic, Performance & Robustness Hardening

- **Business-Logik gehärtet** (8 Fixes): `applyTiebreaker` lastResult nutzt jetzt chronologisch sortierte GameDays; `computePayouts` normalisiert Rundungsreste zum 1. Platz (Prozentmodus) und klemmt Fixed-Mode auf Prizepool; `deleteLeague` löscht kaskadierend alle GameDays; `createGameDayFromResult` validiert `activeSeasonId` gegen vorhandene Seasons und nummeriert lückenfrei; Liga-Knockouts werden jetzt von Turnier-Ergebnissen propagiert und in `computeExtendedStandings` aggregiert; `parseSeriesFile` validiert `pointSystem.entries`-Struktur; `buildTournamentResult` sortiert aktive Spieler deterministisch nach Chipcount.
- **Performance-Optimierungen** (4 Fixes): `React.memo` auf `GameModeContainer` + `useMemo` für State/UI/Undo-Props (75% weniger Reconciliation); IndexedDB `setCachedItem` nutzt einzelnes `db.put()` statt clear+rewrite-all (99% weniger IDB-Writes bei Events); `useTimer` reduziert Re-Renders von 4x/Sek auf 1x/Sek (skip wenn `floor(remaining)` unverändert); `LeagueModeContainer` + `TournamentFinishedContainer` lazy-loaded.
- **Robustness-Härtung** (8 Fixes): `GameDayEditor` klemmt alle Zahleneingaben auf ≥0; Liga-Import überspringt malformed Results/GameDays; `computeExtendedStandings` Fallback auf Default-Punktesystem bei leeren Entries; NaN-Guard auf `createGameDayFromResult` Finanzdaten; Level-Count-Cap (max 200) bei Config-Import; GameDay-Label i18n (neuer Key `league.editor.gameDayLabel`); `persistSingleItem` db-null-Guard; Float-Rundungsnormalisierung in Liga-Finanzen.
- **TV-Display Fix**: Request-State-Handshake — TV-Fenster sendet `request-state` beim Laden, Admin antwortet sofort mit Full-State. Behebt leeres Display beim Öffnen des TV-Modus.
- **1257 Tests gesamt** (18 Testdateien)

---

## [6.9.6] – 2026-03-18

### Test-Audit: Lückenanalyse & Coverage-Boost

- **Neue Testdatei `league-advanced.test.ts`** (22 Tests): Erstmals vollständige Abdeckung aller Liga-Ranking-Algorithmen — `applyTiebreaker` (6), `computeEloRatings` (2), `computeWeightedPoints` (3), `computeHeadToHeadMatrix` (3), `computeExtendedStandings` (8).
- **Series-Tests** (12 Tests): `computeSeriesStandings` für alle 3 Ranking-Modi (points/bestN/average), `exportSeriesToJSON`/`parseSeriesFile` Round-Trip-Validierung, Edge-Cases (leere Serien, ungültiger JSON).
- **Prizepool-Tests** (7 Tests): Komplexe Berechnungen mit Rebuy+AddOn+Bounty, Mystery-Bounty-Pool, prozentuale/feste Auszahlung, Null-Player-Guard.
- **Side-Pot-Formatierung** (5 Tests): `formatSidePotsAsText` mit Main-Pot, Multi-Side-Pots, leere Arrays, fehlende Spielernamen, Währungssymbol-Parameter.
- **Integration-Tests erweitert** (11 Tests): Liga GameDay→Standings Flow (End-to-End), Liga JSON v2 Export/Import mit GameDays, Custom Audio Mapping Persistence (IndexedDB Round-Trip), Checkpoint Full Rehydration mit allen Feldern.
- **68 neue Tests, 40 Duplikate bereinigt** — **1257 Tests gesamt** (18 Testdateien)

---

## [6.9.5] – 2026-03-18

### Audit Findings Closed (#34, #35, #36)

- **IDB Schema Versioning (Finding #34)**: Monolithischer `upgrade`-Block in `storage.ts` durch versionierte Migrations-Registry ersetzt. 4 Migrationsfunktionen (v1–v4) mit `oldVersion`-basierter Inkrement-Logik. Neue Schema-Änderungen erfordern nur einen neuen Registry-Eintrag. `migrations` und `DB_VERSION` exportiert für Testbarkeit.
- **Undo/Redo Table Moves (Finding #35)**: 3 Tests beweisen, dass Tischauflösung und Balancing korrekt per Undo wiederhergestellt werden — Snapshot-Capture mit Multi-Table-State, Dissolution-Undo (dissolved → active), Deep-Clone-Isolation (Mutationen am Original ändern Snapshot nicht).
- **AudioBuffer Decode Cache (Finding #36)**: `Map<string, AudioBuffer>` Cache in `audioPlayer.ts` vermeidet redundantes Fetch+Decode bei wiederholten MP3s (z.B. Countdown-Zahlen 1–10). Cache-Hit liefert sofort, Cache-Miss fetcht + decoded + speichert. `clearAudioBufferCache()` und `getAudioBufferCacheSize()` für Tests und Memory-Management.
- **8 neue Tests** — **1229 Tests gesamt**

---

## [6.9.4] – 2026-03-17

### Type Safety & Voice Test Coverage

- **`exactOptionalPropertyTypes` aktiviert**: TypeScript-Compiler-Flag aktiviert — 71 Type-Errors in 33 Dateien behoben. Verhindert `undefined`-Zuweisung an optionale Properties. Fix-Strategie: konsistente Typweiterung (`field?: T` → `field?: T | undefined`) ohne Logik-Änderungen.
- **useVoiceAnnouncements vollständig getestet**: 11 neue Tests decken Color-Up-Ansagen, Rebuy/Add-On-Übergänge, Elimination+Bounty, Timer-Pause bei Turnierende, Spieleranzahl-Meilensteine, 5-Minuten-Warnung-Edge-Case und Break-Over ab.
- **11 neue Tests** — **1221 Tests gesamt**

---

## [6.9.3] – 2026-03-17

### Re-Audit: 58 Findings in 6 Batches behoben

**Phase 1 — Quick Wins:**
- **Input-Validierung**: `maxLength={100}` auf Turnier-/Liga-/Serien-Namen, `max` auf Zahlenfeldern im GameDayEditor, QR-Decode-Längenlimits, Audio-Dateiname-Truncation
- **ESLint verschärft**: `no-console` auf `error`, `@typescript-eslint/no-floating-promises` aktiviert, 32 Floating-Promise-Verletzungen behoben
- **HMAC gehärtet**: Payload in Signatur, Fail-Closed-Guard, Hex-Vorvalidierung, Kommando-Schema-Validierung
- **CSS/HTML**: `animate-slide-up` Utility, `background-attachment: scroll` auf Mobile, `<html lang>` Pre-Hydration
- **ErrorBoundary**: Sentry-Import nur bei konfiguriertem DSN
- **Remote Deps**: `config.buyIn/rebuy/addOn` in Broadcast-Dependencies

**Phase 2 — Kritische Fixes:**
- **Turnierergebnis**: Einmal via `finishedResult` aus `useGameComputedState` gebaut (nicht doppelt)
- **Platzierung**: `computeNextPlacement` innerhalb `setConfig`-Updater (Concurrent-Mode-sicher)

**Phase 3 — Hohe Priorität:**
- **CSP**: `unsafe-inline` durch SHA-256-Hashes ersetzt, HSTS-Header hinzugefügt
- **Speicher**: Warnung bei Persist-Fehler, Migration-Flag nach Schreiboperationen
- **Performance**: `useMemo` für GameModeContainer-Actions, `React.memo` auf AppHeader
- **Checkpoint**: Toast bei Schema-Mismatch, Storage-Fallback für series/audio Stores
- **Remote Security**: `identified`-Flag in allen Limit-Branches
- **Prototype Pollution**: Explizite Feldextraktion statt Spread in Config-Parsing
- **Voice**: Refs statt Closures für mode/alerts/seconds/levels in Effects
- **Checkpoint Debounce**: `remainingSeconds` aus Dependencies entfernt

**Phase 4 — Mittlere Priorität:**
- **PWA**: MP3-Precaching (653 Einträge), idb/screenshot Chunk-Split
- **Sourcemaps**: Deaktiviert bis Sentry-Upload konfiguriert
- **Timer**: `tick` aus Dependencies entfernt, Ref-Mutationen in Updater
- **CI**: `VITE_SENTRY_DSN` + `VITE_RELEASE` in Build, Actions SHA-gepinnt, E2E an Quality-Job gekoppelt
- **TypeScript**: Target ES2020 (passend zu Vite safari14)
- **Mystery Bounty**: Per-Spieler `bountyEarned` statt Fixed-Amount
- **CSV-Injection**: `csvSafe()` auf Liga- und Serien-Exports
- **Rebuy Event**: Diff-Berechnung innerhalb `setConfig`-Updater

**Phase 5 — Niedrige Priorität:**
- **Audio**: Magic-Byte-Validierung bei Upload (MP3/WAV/OGG/M4A)
- **SectionErrorBoundary**: Max 3 Retries, dann permanenter Fehler
- **Wizard**: Timeout-Cleanup via Ref
- **TickerBanner**: Initiale Kopien auf 5 (CLS-Fix)
- **Tests**: SectionErrorBoundary + collectStartErrors

**Deferred (4 Findings):** exactOptionalPropertyTypes (70 Fehler), useVoiceAnnouncements Tests, IDB Schema-Versioning, Undo Table-Moves

- **11 neue Tests** — **1210 Tests gesamt** (17 Testdateien)
- **58 von 62 Findings behoben**, 4 architekturelle Items deferred

---

## [6.9.2] – 2026-03-16

### Premium-Readiness: Gate-Infrastruktur vervollständigt

- **Gate-Checks für multiTable und sidePot**: `canUseMultiTable` und `canUseSidePot` in App.tsx, durchgereicht an SetupPage und PlayerPanel/GameModeContainer. Safety-Guard für MultiTablePanel im Spielmodus.
- **Feature-Discovery verdrahtet**: `markFeatureDiscovered()` an allen 5 Premium-Feature-Einstiegspunkten (TV, Remote, Liga, Multi-Table, Side-Pot).
- **Telemetrie aktiviert**: `trackFeatureUsed()` bei Nutzung aller 5 Premium-Features, `trackSessionStarted()` beim App-Start.
- **Keine sichtbare Änderung**: Default-Tier bleibt `'premium'`, alle Features weiterhin für alle Nutzer verfügbar.
- **4 neue Tests** — **1199 Tests gesamt** (17 Testdateien)

---

## [6.9.1] – 2026-03-16

### Currency Propagation, PeerJS Hardening & CSP

- **SharedResultView Currency**: Geteilte Turnierergebnisse zeigen jetzt die korrekte Währung statt hardkodiertem EUR. `CURRENCY_SYMBOLS`-Lookup mit `result.currency ?? 'EUR'` Fallback.
- **Currency in GameDay + Liga-Finanzen**: `currency?: Currency` Feld in `GameDay`-Interface. Automatische Propagation über `createGameDayFromResult()`. Liga-Finanz-Komponenten nutzen `currencySymbol`-Prop statt `€`. Rückwärtskompatibel via EUR-Fallback.
- **PeerJS Hardening**: Peer-ID-Länge von 5 → 8 Zeichen (1,1 Billionen statt 33 Millionen Kombinationen). Verbindungslimits: max 4 Controller + 8 Displays gleichzeitig.
- **CSP für GitHub Pages**: CSP-Meta-Tag in `index.html` synchronisiert mit `vercel.json` — `worker-src 'self'` und `frame-ancestors 'none'` ergänzt.
- **ElevenLabs MP3s für Break-Controls**: 4 neue MP3-Dateien (`break-skipped.mp3`, `break-extended.mp3`, je DE + EN). Speech API Fallback bleibt erhalten. 590 Audio-Dateien gesamt.
- **4 neue Tests** — **1195 Tests gesamt**

---

## [6.9.0] – 2026-03-16

### Tournament Event Log & Break Controls Polish

- **Turnier-Protokoll (Event Log)**: 📋 Modal im Spielmodus zeigt chronologisches Turnier-Protokoll. Drei Filter (Alle/Eliminations/Rebuys/Levels), Text-Export. Bestehende `TournamentLog.tsx` mit i18n-formatiertem Event-Text aufgewertet. Events als "Verlauf"-Tab auf Ergebnis-Screen.
- **Break Skip/Extend poliert**: Pausen-Buttons in Controls (+2 Min / +5 Min Verlängerung statt vorher +1/+5, Überspringen). Sprachansagen (`announceBreakSkipped`, `announceBreakExtended`). Events: `break_skipped`, `break_extended`.
- **Event-Formatierung i18n**: Alle 22 Event-Typen bilingual (DE/EN) via optionalem `t`-Parameter in `formatEventAsText()` — rückwärtskompatibel mit hardkodiertem Deutsch.
- **~48 neue Translation-Keys** (24 DE + 24 EN)
- **35 neue Tests** — **1191 Tests gesamt**

---

## [6.8.0] – 2026-03-16

### Help Center: Game Mode + Content-Update

- **Help-Button im Spielmodus**: ?-Button jetzt in allen Modi verfügbar (Setup, Spielmodus, Liga) — nicht mehr nur Setup + Liga.
- **2 neue Sektionen**: „Export & Teilen" (📤) mit Ergebnis-Sharing, CSV, PDF, Historie; „Liga & Serien" (🏆) mit Liga-Modus, Ranking-Algorithmen, Spieltag-Editor, Serien.
- **1 neue Sektion**: „Einstellungen & Anpassung" (⚙️) mit Dark/Light, Akzentfarbe, Hintergründe, Sprache, PWA.
- **Bestehende Sektionen erweitert**: +7 neue Items (Undo/Redo, ICM-Rechner, Side-Pot-Rechner, Stack Tracking, Re-Entry, Späte Anmeldung, Cross-Device Display, Display-Layouts, Kabellose Verbindungen, Multi-Controller, Eigene Audio-Dateien, Turnier-Statistiken, Druckbare Blindstruktur, Checkpoint).
- **8 neue FAQ-Einträge** (22 gesamt): Undo/Redo, ICM-Rechner, PDF-Export, Cross-Device Display, Turnier-Serien, Re-Entry, Display-Layouts, Multi-Controller.
- **2 neue Keyboard Shortcuts**: ⌘Z (Undo), ⌘⇧Z (Redo) — 13 Shortcuts gesamt.
- **helpContent.ts**: ~600 Zeilen (vorher ~487). 10 Sektionen (vorher 8), 22 FAQ (vorher 15), 13 Shortcuts (vorher 11).

### Phase 1: Stability, Undo/Redo & Audit-Umsetzung (20 Maßnahmen)

**10 Technische Maßnahmen:**

1. **App.tsx State Extraction**: 8 neue Hooks aus App.tsx extrahiert — `useGameComputedState`, `useTournamentEventLog`, `useCheckpointManager`, `useDisplayBridge`, `useWakeLock`, `useConfirmDialog`, `useOnlineStatus`, `useInstallPrompt`. App.tsx deutlich reduziert.
2. **Bundle-Optimierung**: PeerJS als Dynamic Import, vendor-Chunks für Sentry/React/PeerJS.
3. **PeerJS API-Formalisierung**: Typisierte Command-Interfaces, HMAC-Validierung, Versionsprüfung.
4. **Storage Retention Policies**: Dokumentierte Aufbewahrungsregeln für alle 12 IndexedDB-Stores.
5. **Checkpoint Schema Versioning**: Version-Feld im Checkpoint für Vorwärtskompatibilität.
6. **E2E in CI**: Playwright-Konfiguration für Continuous Integration vorbereitet.
7. **AudioService Facade**: Zentrales `audioService.ts` synchronisiert Master-Volume und Sprache über `sounds.ts`, `audioPlayer.ts`, `speech.ts`.
8. **Test-Warnings Cleanup**: vi.mock()-Aufrufe bereinigt, Test-Setup optimiert.
9. **i18n Parity Cleanup**: Identische DE/EN-Keys validiert (ALLOWED_IDENTICAL Set), Schwellwerte aktualisiert.
10. **useTournamentModeTransitions Props Grouping**: Typisierte Parameterobjekte statt flacher Props.

**10 Markt-Features:**

1. **Multi-Controller Remote**: RemoteHost unterstützt N gleichzeitige Controller (`Map<string, DataConnection>`). Controller-Anzahl im ShareHub angezeigt.
2. **Undo/Redo**: Snapshot-basiertes Undo/Redo für alle 10 Turnieraktionen. `UndoStack` Klasse (immutable, max 30 Tiefe). Cmd+Z / Cmd+Shift+Z. Buttons in Controls mit Aktionslabels. 20 Translation-Keys.
3. **ICM Calculator**: Malmuth-Harville Equity — exakt rekursiv (≤10 Spieler), Monte Carlo 10K Sims (>10). `IcmCalculator.tsx` Modal, lazy-loaded.
4. **Tournament Timeline/Report**: Event-Log-System für Turnieraktionen.
5. **Rebalance Simulation Preview**: Vorschau für Tisch-Ausbalancierung bei Multi-Table.
6. **Feature Discovery**: `isFeatureDiscovered()`, `markFeatureDiscovered()`, `getUndiscoveredFeatures()` in entitlements.ts.
7. **Visual Regression Tests**: Playwright-Screenshot-Tests vorbereitet.
8. **Simplified Side-Pot Mode**: Vereinfachter Side-Pot-Modus.
9. **Conversion Telemetry**: `monetizationTelemetry.ts` trackt Feature-Zugriffsmuster.
10. **Cloud Export**: Einheitliches `cloudExport.ts` — JSON/CSV/Text, Web Share API, File System Access API, Blob-Download-Fallback.

**Neue Dateien**: `undoStack.ts`, `icm.ts`, `cloudExport.ts`, `audioService.ts`, `IcmCalculator.tsx`, `useGameComputedState.ts`, `useTournamentEventLog.ts`, `useCheckpointManager.ts`, `useDisplayBridge.ts`, `useWakeLock.ts`, `useConfirmDialog.ts`, `useOnlineStatus.ts`, `useInstallPrompt.ts`
**38 neue Tests** — **1156 Tests gesamt** (17 Testdateien)

---

## [6.7.1] – 2026-03-15

### Phase B: Tech Debt

**GameModeContainer Props-Konsolidierung:**
- 51 flache Props → 6 typisierte Objekte (`config`, `settings`, `timer`, `state`, `ui`, `actions`)
- 3 exportierte Interfaces: `GameModeState` (13 Felder), `GameModeUiState` (4 Felder), `GameModeActions` (29 Callbacks)
- Call-Site in App.tsx baut Objekte inline — keine Laufzeit-Overhead
- React-Compiler-kompatibel: Destructuring von Objekt-Properties vor `useCallback` für korrekte Dependency-Inference

**Audio Queue Timeout-Fallback:**
- Web Audio API: Safety-Timeout (`totalDuration + 2s`) nach letztem Buffer-`onended`
- HTMLAudioElement: 15s Safety-Timeout pro Datei mit `done`-Flag gegen doppelte Resolves
- Verhindert hängende Promises bei Browser-Audio-Bugs (Safari, Chrome Background-Tabs)

**Keine neuen Tests, keine neuen Dateien** — rein internes Refactoring
**1118 Tests gesamt** (16 Testdateien)

---

## [6.7.0] – 2026-03-15

### Phase 2: Display-Layouts, Plattform-Guides & Presentation API

**4 Display-Layout-Varianten:**
- Standard (55/45), Kompakt (40/60), Timer-Only (100/0), Ultra Large (70/30)
- `displayLayouts.ts` (~80 Zeilen) mit `LayoutConfig`-Interface und `getLayoutConfig()`
- DisplayMode.tsx parameterized: dynamische Flex-Ratios, Font-Scales (clamp-basiert), Visibility-Flags
- Layout-Picker als 2×2 Grid im SettingsPanel
- `DisplayLayout` Type in Settings, durchgereicht über App.tsx, TVDisplayWindow, CrossDeviceDisplay, DisplayStatePayload

**Plattform-spezifische Wireless-Guides:**
- `platform.ts` (~25 Zeilen): `detectPlatform()` + `detectDesktopOS()` als shared Utility (aus PWAInstallGuide extrahiert)
- ShareHub erkennt Plattform und zeigt relevante Anleitung zuerst (AirPlay auf iOS/macOS, Chromecast auf Android/Desktop)
- Schritt-für-Schritt-Anleitungen (nummerierte Listen) statt Einzeiler
- Relevante Guide automatisch aufgeklappt

**Presentation API:**
- `presentationApi.ts` (~40 Zeilen): Progressive Enhancement für Browser-nativen Second-Screen-Support
- `isPresentationApiAvailable()` Capability-Check, `startPresentation()` öffnet Display-URL auf externem Bildschirm
- Button in ShareHub nur sichtbar wenn Browser die API unterstützt (Chrome/Edge)

**Neue Dateien**: `src/domain/displayLayouts.ts`, `src/domain/platform.ts`, `src/domain/presentationApi.ts`
**~48 neue Translation-Keys** (24 DE + 24 EN)
**8 neue Tests** — **1118 Tests gesamt** (16 Testdateien)

---

## [6.6.0] – 2026-03-15

### Share Hub & Cross-Device Display

**Cross-Device Display:**
- Turnieranzeige auf separatem Gerät (TV, Tablet, Laptop) via PeerJS-Verbindung
- `#display=PKR-XXXXX` Hash-Routing für Cross-Device-Modus in main.tsx
- `CrossDeviceDisplay.tsx` (~360 Zeilen): PeerJS-Client, Timer-Interpolation (100ms), Auto-Reconnect (3 Versuche, exponentieller Backoff), Fullscreen, Dark Mode
- DisplayMode 1:1 wiederverwendet — identische Darstellung wie Same-Device TV

**Share Hub (📡):**
- Zentrales Modal „Teilen / Anzeigen" im Spielmodus-Header
- Display-Link mit QR-Code (QRCodeSVG) und Kopier-Button
- Remote-Link mit QR-Code und Kopier-Button
- Same-Device: Zweites Fenster + Browser-Vollbild
- Wireless-Anleitungen: AirPlay (iPhone/iPad + Mac), Chromecast, HDMI
- Live-Verbindungsstatus-Indikatoren

**Multi-Role Sessions:**
- Hello-Handshake-Protokoll: `{ type: 'hello', role: 'display' | 'remote', version: 2 }`
- RemoteHost unterstützt N Display-Peers gleichzeitig (broadcast)
- Display URL: `buildDisplayUrl()`, `parseDisplayHash()` in remote.ts
- Rückwärtskompatibel: Alte Controller ohne Hello-Handshake weiterhin unterstützt

**Neue Dateien:**
- `CrossDeviceDisplay.tsx` (~360 Zeilen): PeerJS Display-Client
- `ShareHub.tsx` (~350 Zeilen): Zentrales Share/Connect-Modal
- `useDisplaySession.ts` (~100 Zeilen): Host-seitige PeerJS Display-Broadcast-Logik

**Geänderte Dateien:**
- `remote.ts` — Hello-Handshake, Multi-Connection, Display-URL-Funktionen
- `main.tsx` — Hash-Routing für `#display=`
- `App.tsx` — ShareHub-Integration, useDisplaySession
- `AppHeader.tsx` — 📡 Share-Button
- `translations.ts` — ~64 neue Keys

- **~64 neue Translation-Keys** (32 DE + 32 EN)
- **13 neue Tests** — **1103 Tests gesamt** (16 Testdateien)

## [6.5.1] – 2026-03-15

### Audio-Setup & Sidebar-Lesbarkeit

**Audio-Einstellungen auf Setup-Seite:**
- Neue CollapsibleSection „Audio & Ansagen" auf der Setup-Seite (nach Chips, vor Start-Button). Sound an/aus, Lautstärke-Slider, Countdown-Toggle, AlertEditor (benutzerdefinierte Hinweise), Custom-Audio-Button — alles konfigurierbar VOR Turnierstart.
- Summary-Badge im eingeklappten Zustand: „Sound, 80%" oder „Sound aus".

**Spielmodus-Sidebar verschlankt:**
- Audio-Sektion nur noch Quick-Access: Sound-Toggle + Lautstärke-Slider.
- Entfernt aus Spielmodus: Countdown-Toggle, AlertEditor, Custom-Audio-Button (nur noch im Setup).

**Sidebar-Layout-Fixes:**
- **NumberStepper vertikales Layout**: Call-the-Clock und TV-Wechselintervall — Label auf eigener Zeile, Stepper darunter. +/- Buttons immer vollständig sichtbar.
- **NumberStepper-Dimensionen**: Input-Breite `w-14` → `w-16` (64px).
- **Sidebar-Dimensionen**: Desktop `w-60` → `w-64` (256px). Mobile `max-h-[40vh]` → `max-h-[60vh]`, SM `max-h-[50vh]` → `max-h-[70vh]`.

**E2E-Tests stabilisiert:**
- Alle 14 Playwright-Tests bestehen zuverlässig.
- Wizard-Skip via `isWizardCompleted()` + localStorage, OnboardingTour-Unterdrückung, robustere Selektoren (`button:has-text("▶")`), höhere Timeouts für CI (60s global, 15s action).
- Neue Helpers: `skipWizard`, `completeWizard`, `goToSetup`, `startTournament`, `startTournamentFast`.

**Geänderte Dateien:**
- `SetupPage.tsx` — neue Audio-CollapsibleSection mit Sound/Volume/Countdown/AlertEditor/CustomAudio
- `SettingsPanel.tsx` — Audio-Sektion verschlankt, NumberStepper vertikal, `w-16`
- `GameModeContainer.tsx` — Sidebar `w-64`, `max-h-[60vh]`, `onShowCustomAudio` entfernt
- `SetupModeContainer.tsx` — 3 neue Props (settings, onSettingsChange, onShowCustomAudio)
- `App.tsx` — Settings-Props an SetupModeContainer, `isWizardCompleted()` Import
- `translations.ts` — 4 neue Keys (setup.audioSummary.on/off, DE + EN)
- `components.test.tsx` — SettingsPanel-Assertion angepasst (4 → 3 Switches)
- `playwright.config.ts` — CI-Timeouts erhöht
- 6 E2E-Testdateien + helpers.ts — komplett überarbeitet

- **4 neue Translation-Keys** (2 DE + 2 EN)
- **1090 Unit-Tests + 14 E2E-Tests** bestehen

---

## [6.5.0] – 2026-03-14

### Phase 2+3 — Turnier-Serien, Erweitertes Liga-System, Custom Audio, PDF-Export & mehr

**Neue Domain-Module:**
- **Turnier-Serien** (`series.ts`, ~283 Zeilen): Serien-Management mit 3 Ranking-Modi (Punkte-Summe, Best-N, Durchschnitt). CRUD, Standings-Berechnung, Text/CSV-Export, JSON Import/Export. Typ: `TournamentSeries` mit `SeriesRankingMode`.
- **Custom Audio** (`customAudio.ts`, ~150 Zeilen): Upload eigener Audio-Dateien (MP3/WAV/OGG/AAC, max 5 MB) und Zuordnung zu 36 Announcements. ArrayBuffer-Speicherung in IndexedDB. `CustomAudioFile` + `CustomAudioMapping` Types.
- **PDF-Export** (`pdfExport.ts`, ~166 Zeilen): Turnier-Ergebnisse als PDF exportieren (jsPDF + jspdf-autotable). Enthält Header, Standings-Tabelle, Turnier-Infos. Neues async `exportTournamentResultAsPdf()`.
- **Turnierdauer-Prognose** (in `blinds.ts`): `estimateTournamentDuration()` berechnet prognostizierte Turnierdauer basierend auf Spielerzahl, Blindstruktur und Rebuy-/Addon-Wahrscheinlichkeiten. Anzeige in TournamentStats und Display StatsScreen.

**Erweitertes Liga-System** (in `league.ts`, +226 Zeilen):
- **3 Ranking-Algorithmen**: Standard-Punkte, ELO-Rating (`computeEloRatings()` mit konfigurierbarem Start-Rating und K-Faktor), gewichtete Punkte mit Decay (`computeWeightedPoints()`).
- **Head-to-Head-Matrix**: `computeHeadToHeadMatrix()` berechnet NxN Win/Loss-Bilanz aus GameDay-Paarvergleichen.
- **Minimum-Teilnahme**: Spieler unter Schwelle werden in Standings als nicht qualifiziert markiert (dimmed).
- **Neue Types**: `RankingAlgorithm`, `EloConfig`, `WeightedPointsConfig`, `HeadToHeadRecord`.

**Remote Control Erweiterungen** (in `remote.ts`):
- **Session-Persistenz**: Remote-Verbindung überlebt Browser-Refresh — Peer-ID wird in sessionStorage gespeichert und bei Neustart wiederverwendet.
- **Tisch-Resize-Support**: `remoteResizeTable` Command + Handler im Remote-Protokoll.

**Neue UI-Komponenten:**
- **`SeriesManager.tsx`** (~590 Zeilen): Vollständiges CRUD-Modal für Turnier-Serien. Erstellen/Bearbeiten/Löschen, Standings-Tabelle, Ranking-Modus-Auswahl, JSON Import/Export, Text/CSV-Kopieren. Lazy-loaded, erreichbar über „Serien"-Button im AppHeader.
- **`HeadToHeadMatrix.tsx`** (~149 Zeilen): NxN Heatmap-Tabelle für Liga-Spieler-Bilanz. Farbcodierte Zellen (grün/rot/neutral), Hover-Tooltips, Sort-Toggle, Sticky-Spalte. Integriert als 4. Tab „H2H" in LeagueView.
- **`CustomAudioEditor.tsx`** (~390 Zeilen): Drag-&-Drop Audio-Upload + Announcement-Mapping-Editor. Dateiliste mit Größenanzeige, 36 zuordenbare Announcements, Sprach-Filter (DE/EN/Alle). Erreichbar über Button in SettingsPanel Audio-Sektion.

**Bestehende Komponenten erweitert:**
- **LeagueView.tsx**: Neuer H2H-Tab mit Head-to-Head-Matrix.
- **LeagueSettings.tsx**: Ranking-Algorithmus-Auswahl (3-Segment-Toggle: Punkte/ELO/Gewichtet), ELO-Config (Start-Rating, K-Faktor), Weighted-Config (Decay-Faktor), Minimum-Teilnahme.
- **LeagueStandingsTable.tsx**: Dynamische Ranking-Spalte je nach Algorithmus, Dimming für nicht qualifizierte Spieler, neue Sort-Keys (eloRating, weightedPoints).
- **TournamentStats.tsx**: Turnierdauer-Prognose-Anzeige.
- **TournamentFinished.tsx**: PDF-Export-Button.
- **SetupPage.tsx**: Serien-Verknüpfung für Turniere.
- **SettingsPanel.tsx**: Custom-Audio-Button in Audio-Sektion.
- **StatsScreen.tsx** (TV-Display): Geschätzte Restzeit-Anzeige.

**Infrastruktur:**
- **IndexedDB v4**: 3 neue Collection-Stores (`series`, `customAudio`, `audioMappings`). 12 Stores gesamt.
- **Custom Audio Playback**: `audioPlayer.ts` erweitert um Blob-URL-Wiedergabe für benutzerdefinierte Audio-Dateien.
- **Neue Dependencies**: `jspdf` + `jspdf-autotable` für PDF-Export.
- **~75 neue Translation-Keys** (DE + EN): Serien, H2H, Ranking-Algorithmen, Custom Audio UI + 36 Announcement-Labels.
- **i18n-Test-Anpassung**: Schwelle für identische DE/EN-Keys von 90 auf 120 erhöht. Hyphens in Key-Segmenten erlaubt.
- **124 neue Tests** — **1090 Tests gesamt** (16 Testdateien)

---

## [6.4.0] – 2026-03-12

### Dokumentation, Help-Center & Sound-Vervollständigung

- **3 neue MP3-Paare** (6 Dateien): `rebuy-taken.mp3`, `table-move.mp3`, `table-dissolved.mp3` — ElevenLabs TTS, je DE + EN. **468 Audio-Dateien** gesamt (234 pro Sprache).
- **Neue Ansage `announceRebuyTaken()`**: MP3-basierte Ansage bei Rebuy-Kauf. Getriggert durch Rebuy-Count-Tracking in `useVoiceAnnouncements.ts`.
- **MP3-Intros für Tischwechsel**: `announceTableMove()` und `announceTableDissolution()` nutzen jetzt MP3-Intro + Speech-Details statt reinem Web Speech API.
- **Help-Center erweitert**: 2 neue Items in Remote-Control-Sektion (Spieler-Management, Turnier-Infos auf Controller). 1 neuer FAQ-Eintrag. 15 FAQ-Einträge gesamt.
- **README.md komplett aktualisiert**: Version 6.0.0 → 6.4.0, neue Features, aktuelle Counts.
- **6 neue Translation-Keys** (3 DE + 3 EN)
- **3 neue Tests** — **966 Tests gesamt**

---

## [6.3.1] – 2026-03-12

### Remote Control: Timer-Fix & Turnier-Infos

- **Timer-Interpolation repariert**: Ref-basierte Countdown-Berechnung statt `useEffect([state])`-Abhängigkeit. Der 100ms-Interval wird einmalig erstellt und liest aus Refs — kein Teardown/Recreate mehr bei jedem Host-State-Update. Behebt Timer-Blinken und Verzögerungen auf der Fernbedienung.
- **Math.floor statt Math.ceil**: Konsistent mit Host-Timer `formatTime()` — kein sporadisches 1-Sekunden-Offset mehr.
- **Turnier-Infos auf Fernbedienung**: Stats-Zeile im Timer-Card zeigt Prizepool (💰), Ø Stack in BB (Ø), Spielzeit (⏱).
- **Nächstes Level**: Zeile unter den Blinds zeigt nächstes Level oder nächste Pause mit Dauer.
- **Break-Anzeige**: Bei Pausen wird ☕ + "Pause" statt Blinds angezeigt.
- **ITM-Badge**: Grüner "ITM"-Badge neben Bubble-Badge wenn In The Money.
- **RemoteState erweitert**: 6 neue optionale Felder (`prizePool`, `avgStackBB`, `elapsedSeconds`, `nextLevelLabel`, `isBreak`, `isItm`).
- **6 neue Translation-Keys** (3 DE + 3 EN): `remote.nextLevel`, `remote.avgStackShort`, `remote.breakLabel`
- **RemoteControl.tsx**: 15.11KB Chunk
- **963 Tests gesamt**

---

## [6.3.0] – 2026-03-12

### Remote Control: Spieler-Management

- **Spieler-Sektion auf Fernbedienung**: Aufklappbare Spielerliste (ChevronIcon) direkt in der Controller-UI. Zeigt aktive Spieler mit Name, Rebuy-Count und Add-On-Status.
- **Spieler eliminieren**: ❌-Button pro Spieler. Ohne Bounty: sofortige Elimination. Mit Bounty: Inline-Eliminator-Picker mit Touch-Buttons aller anderen aktiven Spieler + Abbrechen.
- **Rebuy per Remote**: 🔄-Button pro Spieler, nur sichtbar während aktiver Rebuy-Phase (`rebuyActive`).
- **Add-On per Remote**: Add-On-Button pro Spieler, nur sichtbar während Add-On-Fenster (`addOnWindowOpen`).
- **RemoteState erweitert**: Spielerdaten (`RemotePlayerInfo[]`), `bountyEnabled`, `rebuyActive`, `addOnWindowOpen` im State-Protokoll. Kompakte Feldnamen (n, s, r, ao) für Message-Size-Budget (~35 Bytes/Spieler). Size-Guard: bei >18 Spielern nur aktive gesendet.
- **3 neue Commands**: `eliminatePlayer`, `rebuyPlayer`, `addOnPlayer` mit Payload-Unterstützung. HMAC-signiert.
- **REMOTE_STATE_CONTRACT_VERSION** von 1 auf 2 erhöht.
- **14 neue Translation-Keys** (7 DE + 7 EN): `remote.eliminate`, `remote.rebuyShort`, `remote.addOnShort`, `remote.whoEliminated`, `remote.cancelElimination`, `remote.noPlayers`
- **RemoteControl.tsx**: Von ~9KB auf ~14KB Chunk (neue PlayerSection + PlayerRow Sub-Components)
- **963 Tests gesamt**

---

## [6.2.0] – 2026-03-12

### In-App Help Center

- **Help Center**: Vollständiges, durchsuchbares, bilinguales Hilfesystem als BottomSheet-Modal
- **3 Tabs**: Anleitung (8 Feature-Sektionen), FAQ (14 Einträge), Tastenkürzel (11 Einträge)
- **Live-Suche**: Filtert Sektionen und FAQ in Echtzeit (case-insensitive, Titel + Inhalt)
- **Neue Dateien**: `src/domain/helpContent.ts` (typisierte Hilfe-Daten, DE/EN), `src/components/HelpCenter.tsx` (UI)
- **AppHeader**: Neuer **?**-Icon-Button im Header (Setup + Liga-Modus)
- **Lazy-loaded**: ~27KB separater Chunk, nur bei Bedarf geladen
- **18 Translation-Keys** (9 DE + 9 EN)

---

## [6.1.0] – 2026-03-12

### Audit-Hardening, Feature-Gates & Wizard-Erweiterung

**App-Architektur Refactoring**
- **Mode-Container**: App.tsx aufgeteilt in `GameModeContainer`, `SetupModeContainer`, `LeagueModeContainer`, `TournamentFinishedContainer` — klarere Trennung der Modi
- **AppHeader**: Header-Logik in eigene Komponente `AppHeader.tsx` extrahiert
- **Hook-Extraktion**: 5 neue Hooks — `useFeatureGate`, `usePrintViewWarmup`, `useRemoteHostBridge`, `useSharedPayloads`, `useTournamentModeTransitions`

**Feature-Gate / Freemium-Vorbereitung**
- **Entitlements-System**: `entitlements.ts` mit Feature-Verfügbarkeitsprüfung
- **Feature-Gate-Modal**: `FeatureGateModal.tsx` für gesperrte Features
- **Monetization-Telemetrie**: `monetizationTelemetry.ts` für Feature-Nutzungsanalyse
- **Pro-Blueprint**: `proBlueprint.ts` definiert Pro-Tier-Features

**Robustheit & Monitoring**
- **Sentry-Integration**: `initSentry.ts` — Idle-loaded Error-Tracking in Production
- **Recovery-Modul**: `recovery.ts` — Fehler-Recovery und Fallback-Strategien
- **Start-Validierung**: `startValidation.ts` — Pre-Tournament-Validierung
- **CI/CD**: GitHub Actions auf checkout v6, setup-node v6, configure-pages v5, upload-pages-artifact v4 aktualisiert

**Setup-Wizard erweitert (5 → 6 Schritte)**
- Neuer Schritt „Gut zu wissen" zwischen Blind-Speed und Zusammenfassung
- 3 Feature-Karten: Fernbedienung (📱), TV-Modus (📺), Sprachansagen (🎙️)
- 16 neue Translation-Keys (8 DE + 8 EN)

**Lint-Fix**
- `Analytics`/`SpeedInsights` lazy-imports aus Top-Level in `renderApp()` verschoben (`react-refresh/only-export-components`)

**Dependencies aktualisiert**
- `@vitejs/plugin-react` 5.1.4 → 5.2.0
- `eslint-plugin-react-refresh` 0.4.26 → 0.5.2
- `typescript-eslint` 8.56.1 → 8.57.0
- `vitest` aktualisiert
- `@types/node` 24 → 25
- `globals` 16 → 17

**Tests**: 963 gesamt (+20 neue: entitlements 8, monetizationTelemetry 3, recovery 3, + erweiterte logic/integration/display-channel)

---

## [6.0.0] – 2026-03-09

### IndexedDB-Migration — Cache-First Storage-Architektur

Großes Architektur-Upgrade: Alle persistenten Daten (Turnierhistorie, Ligen, Spieltage, Templates, Spielerdatenbank, Konfiguration, Checkpoint) werden von localStorage (5MB-Limit) nach IndexedDB (~50MB+) migriert. Einfache Einstellungen (Theme, Language, Accent, Background, Wizard) bleiben in localStorage.

**Architektur: Cache-First Pattern**
- In-Memory-Cache wird beim App-Start aus IndexedDB befüllt (~50ms)
- Alle Reads bleiben synchron (aus Cache) — **kein API-Change** für 56+ Consumer-Stellen
- Writes aktualisieren Cache synchron + persistieren async (fire-and-forget) nach IndexedDB
- Einziger Async-Punkt: `initStorage()` in `main.tsx` vor React-Mount

**Migration**
- Automatische einmalige Migration von localStorage → IndexedDB beim ersten App-Start
- Migrierte Keys werden aus localStorage gelöscht
- `poker-timer-migrated` Flag verhindert doppelte Migration
- Items ohne gültige String-`id` werden bei Migration gefiltert

**Fallback**
- Bei fehlendem IndexedDB (Private Browsing Safari <15): automatischer Fallback auf localStorage
- App funktioniert identisch, nur ohne erhöhtes Speicher-Limit

**Neues Modul**: `src/domain/storage.ts` (~300 Zeilen) — IndexedDB-Wrapper, In-Memory-Cache, Migration
- Exports: `initStorage()`, `resetStorage()`, `isStorageReady()`, `getCached()`, `setCached()`, `setCachedItem()`, `deleteCachedItem()`
- 8 IndexedDB-Stores: config, settings, checkpoint (Singletons) + templates, history, players, leagues, gameDays (Collections mit keyPath: `id`)

**Refactored**: 6 Persistence-Module (`configPersistence.ts`, `templatePersistence.ts`, `historyPersistence.ts`, `playerDatabase.ts`, `leaguePersistence.ts`, `league.ts`) — alle localStorage-Aufrufe durch Cache-API ersetzt
**Neue Dependency**: `idb` (~2KB gzip) — Promise-Wrapper für IndexedDB-API
**Neue Dev-Dependency**: `fake-indexeddb` — IndexedDB-Polyfill für Tests
**14 neue Tests**: Storage-Layer (initStorage, Migration, Cache-Roundtrip, Persistence, setCachedItem Upsert, deleteCachedItem, Fallback)
**598 Tests gesamt** (503 Logic + 95 Component)

---

## [5.9.0] – 2026-03-09

### Vollständiges Code-Audit — 52 Maßnahmen in 8 Sprints (v5.4.0–v5.9.0)

Basierend auf einem umfassenden Code-Audit wurden **50 Maßnahmen** in 8 Sprints umgesetzt: 16 Bug-Fixes, 8 UX-Verbesserungen, 6 Security-Fixes, 8 A11y-Verbesserungen, 7 Test-Erweiterungen, 4 Architektur-Verbesserungen und 3 DX-Optimierungen.

#### Bug-Fixes (Sprint 1+2)
- **tables.ts Guards**: `mergeToFinalTable`, `dissolveTable`, `distributePlayersToTables` geben jetzt `unseated`/`skipped` Spieler zurück statt sie stillschweigend zu droppen (M01-M03)
- **loadCheckpoint Empty-Guard**: Leeres levels-Array → `null` statt App-Crash (M04)
- **timer.ts Guards**: `resetCurrentLevel` und `previousLevel` mit leerem levels-Array → kein Crash (M05)
- **Placement-Kollision Fix**: Aktive Re-Entry-Spieler erhalten fortlaufende Plätze statt alle Platz 1 (M06)
- **Rebuy-Cost Berechnung**: `rebuyCost` Feld in TournamentResult, korrekte Liga-Finanzberechnung (M07)
- **Speech Queue Timeout**: 30s Timeout pro Queue-Item verhindert eingefrorene Ansagen (M08)
- **Negative Payouts Guard**: `Math.max(0, prizePool)` verhindert negative Auszahlungen (M09)
- **Re-Entry Duplikat Fix**: Deduplizierung nach originalPlayerId in Ergebnissen (M10)
- **Duplicate Place Check**: Payout mit doppeltem Platz wird erkannt (M11)
- **Blind Structure Guard**: Mindestens 1 Level garantiert bei extremer Chip-Skalierung (M12)
- **QR Delimiter Fix**: URL-Encoding für Liga-Namen und Spielernamen mit Sonderzeichen (M13, M39)
- **Tiebreaker Pre-Sort**: Interne Vorsortierung in `applyTiebreaker()` (M14)
- **Remote Connection Timeout**: 10s Timeout statt endlosem "Connecting..." (M15)
- **Sounds Error Logging**: `console.warn('[audio] ...')` statt stiller catch-Blöcke (M16)
- **balanceTables Deep-Copy**: Arbeitet auf Kopie, Original unverändert bei Early-Exit (M37, M52)
- **Template-Validierung**: `parseConfigObject()` auf Template-Load, invalide Templates gefiltert (M38)

#### Touch-Targets & Mobile (Sprint 3)
- **ConfigEditor**: Move/Delete/Apply-Buttons auf ≥32px Touch-Target (M17)
- **PlayerPanel**: Eliminate/Reinstate/Re-Entry/Add-On-Buttons vergrößert (M18)
- **SettingsPanel**: Accent-Circles von 28px auf 36px (M19)
- **LeagueView**: Icon-Buttons mit erhöhtem Padding (M20)

#### Accessibility (Sprint 4)
- **ARIA-Labels**: 25+ Icon-only Buttons mit `aria-label` versehen (M24)
- **Focus-Management**: `useDialogA11y` Hook erweitert mit Focus-Trap und Focus-Return (M25)
- **Farb-Kontrast**: Accent-Farben auf Light-Mode ≥4.5:1 Kontrast-Ratio (M26)
- **LoadingFallback A11y**: `role="status"` + `aria-label` (M27)
- **Keyboard-Navigation**: Sortierbare Header mit `role="button"` + `tabIndex` + `onKeyDown` (M50)

#### UX-Verbesserungen (Sprint 5)
- **Preset-Overwrite Confirmation**: Confirm-Dialog vor Quick-Preset-Apply (M21)
- **League-Delete Confirmation**: Confirm-Dialog vor Liga-Löschung (M22)
- **Empty States**: Kontextuelle "Keine Daten"-Meldungen in ConfigEditor, MultiTablePanel, LeagueStandingsTable (M23)
- **beforeunload Warning**: Browser-Warnung bei ungespeicherten Setup-Änderungen (M30)
- **Form Validation Feedback**: Tooltip auf disabled Start-Button erklärt fehlende Voraussetzungen (M48)
- **Toast-Notification-System**: Portal-basiertes Toast mit Auto-Dismiss (3s), ersetzt inline ✓-Feedback (M49)
- **History-Truncation Warning**: Banner bei >180 von 200 Einträgen (M51)

#### Remote Control Security (Sprint 6)
- **HMAC-SHA256 Signierung**: Shared Secret bei QR-Scan, signierte Messages (M31)
- **Rate-Limiting**: Max 10 Commands/Sek, 1KB Message-Size-Limit (M32)

#### Test-Ausbau (Sprint 7)
- **50 neue Tests**: Edge-Case-Tests (M36), Remote Security Tests (M34), ESLint Security Plugin (M40)
- **CI Bundle-Check Fix**: Plattform-unabhängiger Size-Report (M41)
- **Husky Pre-Commit Hook**: Lint + Type-Check vor jedem Commit (M46)

#### DX & Architektur (Sprint 8)
- **JSDoc**: Alle ~100 exportierten Funktionen in domain/ mit JSDoc-Kommentaren (M43)
- **Chunk Error Boundaries**: Fehlgeschlagener Lazy-Load zeigt Retry-Button statt App-Crash (M45)
- **persistence.ts Split**: 856 Zeilen → 5 fokussierte Module + Barrel (M47):
  - `configPersistence.ts` — Default-Configs, Config-Parsing, Presets, Checkpoint, Wizard
  - `templatePersistence.ts` — Template CRUD, JSON Export/Import
  - `historyPersistence.ts` — Tournament-History CRUD, Player-Import
  - `playerDatabase.ts` — Spieler-Datenbank CRUD, Sync
  - `leaguePersistence.ts` — Liga CRUD, Export/Import

#### Neue Dateien
- `src/components/Toast.tsx` — Toast-Notification-System
- `src/domain/toast.ts` — Toast-Context und useToast Hook
- `src/domain/configPersistence.ts` — Config-Persistence (aus persistence.ts extrahiert)
- `src/domain/templatePersistence.ts` — Template-Persistence (aus persistence.ts extrahiert)
- `src/domain/historyPersistence.ts` — History-Persistence (aus persistence.ts extrahiert)
- `src/domain/playerDatabase.ts` — Player-Database (aus persistence.ts extrahiert)
- `src/domain/leaguePersistence.ts` — League-Persistence (aus persistence.ts extrahiert)
- `.husky/pre-commit` — Pre-Commit Hook (lint + tsc)

#### Statistiken
- **49 geänderte Dateien**, ~1500 Insertions, ~1050 Deletions
- **584 Tests gesamt** (489 Logic + 95 Component) — +50 neue Tests
- **22 neue Translation-Keys** (11 DE + 11 EN)

---

## [5.3.0] – 2026-03-09

### Code-Qualität, Performance & Web Vitals

#### Performance
- **React.memo auf TimerDisplay**: `TimerDisplay` (re-rendert 4×/Sek via useTimer) mit `memo()` gewrappt — verhindert unnötige Re-Renders bei unrelated State-Änderungen (Player-Updates, Settings). 9 Game-Mode-Komponenten nutzen jetzt React.memo.
- **Suspense LoadingFallback**: Neue `LoadingFallback.tsx` Komponente mit animierten Pulse-Dots. 13 `<Suspense fallback={null}>` in 4 Dateien (App.tsx, LeagueView.tsx, PlayerPanel.tsx, LeagueStandingsTable.tsx) durch sichtbares Ladefeedback ersetzt.

#### Robustheit
- **computeSidePots Validierung**: Guard-Clause `filter(s => s > 0)` in `tournament.ts` gegen negative/null Stack-Werte. Domain-Funktion ist jetzt unabhängig von UI-Schutz robust.

#### Tests
- **17 neue Tests**: LoadingFallback (2×), ConfigEditor (6×: Level-Tabelle, Add Level/Break, Ante ein/aus, Single-Level-Schutz), SettingsPanel (5×: Toggles, Sound, Fullscreen, Accent-Picker, Background-Grid), PlayerPanel (4×: Spieler rendern, Eliminate-Button, Callback, Reinstate)
- Test-Abdeckung von 13 auf 17 Komponenten erhöht

#### Dependencies & Tooling
- Tailwind 4.2.0→4.2.1, @tailwindcss/vite 4.2.0→4.2.1, typescript-eslint 8.56.0→8.56.1, ESLint 9.39.3→9.39.4, @eslint/js 9.39.3→9.39.4
- `@vercel/speed-insights` installiert — LCP/INP/CLS Web Vitals im Vercel Dashboard verfügbar

#### Dateien
- **Neue Datei**: `src/components/LoadingFallback.tsx`
- **Neue Dependency**: `@vercel/speed-insights`
- **6 geänderte Dateien**: `TimerDisplay.tsx`, `App.tsx`, `main.tsx`, `tournament.ts`, `LeagueView.tsx`, `LeagueStandingsTable.tsx`, `PlayerPanel.tsx`
- **534 Tests gesamt** (451 Logic + 83 Component)

---

## [5.2.1] – 2026-03-09

### Emerald-zu-Accent Migration, Aria-Labels, i18n-Fixes & Cleanup

#### Akzentfarbe vollständig migriert
- Alle 69 verbliebenen hardkodierten `emerald-*` Tailwind-Klassen in 20 Setup/Liga/Utility-Komponenten durch CSS Custom Properties (`var(--accent-*)`) ersetzt
- 3 neue CSS `@utility` Klassen: `btn-accent-gradient`, `bg-accent-700`, `bg-accent-800` für häufige Button-Patterns mit Hover-States
- Patterns: Inline-Styles, `color-mix()` für Transparenz-Varianten, Tailwind Arbitrary Values (`hover:border-[var(--accent-600)]`)
- Betroffene Dateien: BountyEditor, RebuyEditor, AddOnEditor, ChipEditor, PayoutEditor, TemplateManager, BlindGenerator, SetupWizard, LeagueManager, TournamentFinished, TournamentHistory, SharedResultView, BubbleIndicator, CallTheClock, SeatingOverlay, ErrorBoundary, ConfigEditor, SetupPage, PlayerManager, LeagueSettings

#### Aria-Labels auf Icon-Buttons
- 25+ Icon-only Buttons (✕, ✓, ▲, ▼, ⧉, 📝, ⚙️, ✏️, 🗑️) mit `aria-label` Attributen für Screenreader-Zugänglichkeit versehen
- Betroffene: LeagueSettings (6×), ConfigEditor (4×), GameDayEditor (4×), ChipEditor (2×), SidePotCalculator (2×), LeagueView (7×)
- `aria-label` auf LanguageSwitcher DE/EN-Buttons
- `aria-sort` + `aria-label` auf sortierbare Spaltenköpfe in LeagueStandingsTable

#### Hardkodierte Strings & i18n-Cleanup
- `"Pts"` → `t('league.settings.pointsAbbr')` (DE: „Pkt", EN: „Pts")
- `'Rebuy ✓'` → `t('display.rebuyActive')`
- `placeholder="+2 or -1"` → `t('league.correction.pointsPlaceholder')`
- 28 unbenutzte Translation-Keys aus DE + EN entfernt (Altlasten aus Refactorings)
- 6 neue Translation-Keys hinzugefügt (language.selectDE/EN, league.correction.pointsPlaceholder, accessibility.sortAscending/sortDescending genutzt)
- README.md Test-Badge korrigiert (408 → 514)

#### Zahlen
- 6 geänderte Dateien, −28 / +6 Translation-Keys netto, 514 Tests

---

## [5.2.0] – 2026-03-08

### Remote Control Rebuild mit PeerJS

- **PeerJS-basierte Fernsteuerung**: Kompletter Neuaufbau der Remote-Control-Funktion. Alte WebRTC-SDP-basierte Signalisierung (2 QR-Scans nötig) durch PeerJS Cloud Signaling ersetzt (1 QR-Scan genügt). QR-Code enthält jetzt kurze App-URL mit `#remote=PKR-XXXXX` Hash — Phone-Kamera erkennt URL, öffnet App, verbindet automatisch.
- **Touch-optimierter Controller**: Fullscreen-Smartphone-UI mit großen Touch-Targets (min 48px). Neue Buttons: Dealer weiterrücken, Sound An/Aus. Timer-Anzeige mit Blinds, Spieleranzahl, Bubble-Badge, Sound-Status. Dark-Mode forced, Safe-Area-Insets, Wake Lock.
- **Auto-Reconnect**: Exponentieller Backoff (2s/4s/8s, max 3 Versuche). Status-Banner: Verbinden → Verbunden → Verbindung verloren → Erneut versuchen.
- **Host-Modal vereinfacht**: Nur QR-Code + lesbare Raum-ID (PKR-XXXXX). Kein manueller Antwort-Code mehr nötig.
- **Neuer Hook**: `useRemoteControl.ts` extrahiert Remote-State-Management aus App.tsx.
- **Neue Dependency**: `peerjs` (~45KB gzip) für WebRTC-Signaling.
- **Entfernt**: `compressSDP()`, `decompressSDP()`, SDP-Kompressionslogik, `#rc=` Hash-Support.
- **~4 Translation-Keys netto** (7 entfernt, 11 hinzugefügt pro Sprache)
- **432 Tests gesamt** (+2 netto gegenüber v5.1.2)

---

## [5.1.1] – 2026-03-08

### Liga-Vervollständigung: Spielerdetails, QR-Sharing & Player-ID

- **Spieler-Detail-Modal**: Klick auf Spielernamen in der Liga-Tabelle öffnet detaillierte Spielerstatistiken — Punkteverlauf, Platzierungsverteilung (Balkendiagramm), Serien (Siege/ITM aktuell + best), Form der letzten 5 Spiele (W/C/X), Head-to-Head-Bilanz vs. alle Gegner. Lazy-loaded (~8.7 KB Chunk).
- **QR-Code Liga-Sharing**: Geteilte Liga-Tabellen via `#ls=` URL-Hash werden jetzt beim App-Start erkannt und in einem `SharedLeagueView`-Modal angezeigt — analog zu `#r=` für Turnierergebnisse.
- **Registered Player ID**: `GameDayParticipant.registeredPlayerId` verknüpft Spieltag-Teilnehmer mit der persistenten Spielerdatenbank für stabile Identität. Automatisch befüllt in `createGameDayFromResult()` (Turnierende) und `GameDayEditor` (manuelle Eingabe), case-insensitiver Name-Matching.
- **Neue Dateien**: `LeaguePlayerDetail.tsx`, `SharedLeagueView.tsx`
- **44 Translation-Keys** (22 DE + 22 EN): Spielerdetail-Modal, Shared-League-Title
- **5 neue Tests** — **408 Tests gesamt**

---

## [5.1.0] – 2026-03-08

### Homegame-Ligamodus: Vollausbau in 3 Phasen

**Phase 1 — MVP „Digitaler Ligabogen":**
- **Liga als dritter App-Modus**: `type Mode = 'setup' | 'game' | 'league'`. Dedizierter Liga-View statt Modal. Lazy-loaded.
- **GameDay-Entität**: Explizite Spieltag-Zuordnung zu Liga mit Teilnehmern, Punkten, Finanzen. localStorage: `poker-timer-gamedays`.
- **Auto-GameDay**: Automatische Erstellung bei Turnierende wenn Liga verknüpft.
- **Erweiterte Standings**: `ExtendedLeagueStanding` mit totalCost, totalPayout, netBalance, participationRate, knockouts, corrections, rank.
- **Domain-Modul**: `league.ts` (~525 Zeilen) — GameDay CRUD, standings, finances, tiebreaker, QR-Encoding, player stats.
- **5 neue UI-Komponenten**: `LeagueView.tsx`, `LeagueStandingsTable.tsx`, `LeagueGameDays.tsx`, `LeagueFinances.tsx`.

**Phase 2 — Comfort & Sonderfälle:**
- **GameDayEditor**: Manuelles Erstellen/Bearbeiten von Spieltagen ohne Timer. Spieler-Autocomplete, individuelle Buy-Ins.
- **LeagueSettings**: Tiebreaker-Konfiguration (avgPlace, wins, cashes, headToHead, lastResult), Saison-Verwaltung.
- **Gastspieler**: `isGuest`-Flag mit optionalem Ausschluss aus Gesamttabelle.
- **Punkt-Korrekturen**: Bonus/Abzug pro Spieler mit Grund. Badge in Standings.
- **Saison-Konzept**: Erstellen, aktivieren, beenden. Filter in LeagueView.

**Phase 3 — Statistics & Export:**
- **Spieler-Statistiken**: `computeLeaguePlayerStats()` — Punkteverlauf, Platzverteilung, Streaks, Form, Head-to-Head.
- **TV-Display Liga-Screen**: `LeagueScreen.tsx` — Top-10-Tabelle im TV-Modus als rotierende Sekundäranzeige.
- **Druckbare Liga-Tabelle**: PrintView erweitert um Liga-Standings-Sektion.
- **QR-Code Sharing**: Liga-Tabelle als QR-Code teilbar. `encodeLeagueStandingsForQR()` / `decodeLeagueStandingsFromQR()`.
- **LeagueExport v2**: JSON Export/Import inkludiert GameDays. Rückwärtskompatibel mit v1.
- **Erweiterte CSV-Exports**: Standings + Finanzen als CSV.

- **8 neue Dateien**: `league.ts`, `LeagueView.tsx`, `LeagueStandingsTable.tsx`, `LeagueGameDays.tsx`, `LeagueFinances.tsx`, `GameDayEditor.tsx`, `LeagueSettings.tsx`, `LeagueScreen.tsx`
- **10 geänderte Dateien**: `types.ts`, `logic.ts`, `persistence.ts`, `App.tsx`, `translations.ts`, `DisplayMode.tsx`, `displayChannel.ts`, `TVDisplayWindow.tsx`, `PrintView.tsx`, `display/index.ts`
- **~110 Translation-Keys**, **60 neue Tests** — **403 Tests gesamt**

---

## [5.0.1] – 2026-03-08

### QA-Fixes: Akzentfarbe, Hintergründe, Remote-Kompression, TV-Modus & Tooltips

- **Akzentfarbe vollständig migriert**: ~40 hardkodierte `emerald-*` Tailwind-Klassen in Game-Mode-Komponenten durch `var(--accent-*)` CSS Custom Properties ersetzt. Betroffene Dateien: `PlayerPanel.tsx`, `RebuyStatus.tsx`, `LevelPreview.tsx`, `RemoteControl.tsx`, `ThemeSwitcher.tsx`, `LanguageSwitcher.tsx`, `VoiceSwitcher.tsx`, `PlayersScreen.tsx`. Pattern: `color-mix(in srgb, var(--accent-500) 10%, transparent)` für semi-transparente Hintergründe.
- **3 neue Hintergrund-Optionen**: „Roter Filz" (`felt-red`), „Mitternacht" (`midnight`), „Sonnenuntergang" (`sunset`) — jetzt 9 Hintergrundmuster insgesamt. 6 neue Translation-Keys (3 DE + 3 EN).
- **Header-Tooltips**: Alle Header-Buttons (Vorlagen, Ligen, Historie, Modus-Toggle, Theme-Switcher, Language-Switcher, Voice-Switcher) haben jetzt `title`-Attribute für Mouseover-Erklärung.
- **Remote-Steuerung DEFLATE-Kompression**: `compressSDP()` und `decompressSDP()` in `remote.ts` komplett neu geschrieben — nutzen jetzt `CompressionStream('deflate-raw')` API für echte DEFLATE-Kompression statt nur Base64. Prefix-basiertes Format: `D:` (DEFLATE), `B:` (Base64-Fallback). Backward-kompatibel mit Legacy-Format (ohne Prefix). ~50% kleinere QR-Codes.
- **TV-Spieleranzeige kompakter**: `PlayersScreen.tsx` — adaptives Grid (5 Spalten bei 16+ Spielern, 4 bei 8+, 3 bei ≤8). Reduzierte Padding/Spacing (`text-xs`, `gap-1`, `py-1`). `max-w-5xl` Container.
- **Dealerbutton TV-bedingt**: `showDealerBadges` durch `DisplayStatePayload` → `DisplayMode` → `SeatingScreen` durchgereicht. Dealer-Badge im TV-Modus nur wenn in der Hauptansicht aktiviert.
- **6 Translation-Keys** (3 DE + 3 EN), **keine neuen Tests** — **343 Tests gesamt**

---

## [5.0.0] – 2026-03-08

### Feature-Komplett: Remote-Steuerung, Presets, Akzentfarben, Re-Entry & Refactoring

**Phase 1 — Quick Wins:**
- **Turnier-Presets**: 3 vordefinierte Turnierprofile (Schnelles Cashgame 6 Spieler/15min, Standard Home Game 8–10 Spieler/20min, Deep Stack 10+ Spieler/30min) für sofortigen Start ohne Konfiguration. `getBuiltInPresets()` in persistence.ts. Preset-Buttons auf SetupPage.
- **Side-Pot-Rechner**: Berechnung von Haupt- und Nebenpötten bei All-In-Situationen mit unterschiedlichen Stack-Größen. `computeSidePots()` in tournament.ts. `SidePotCalculator.tsx` Modal mit Spieler-Stack-Eingabe (NumberStepper) und Ergebnis-Tabelle. Aufrufbar aus PlayerPanel-Header.
- **Ticker-Banner**: Scrollende Info-Zeile am unteren Rand des TV-Displays (wie bei Live-Poker-Übertragungen). Zeigt rotierende Infos: nächster Level, Avg Stack in BB, Spielerzahl, Prizepool. Reine CSS-Animation (`animate-ticker-scroll`).
- **Custom-Akzentfarbe**: 6 wählbare Farbakzente (Emerald, Blue, Purple, Red, Amber, Cyan) statt hardkodiertem Emerald. CSS Custom Properties (`--accent-500/600/400/ring/glow`). Farbkreis-Picker in SettingsPanel. `AccentColor` Typ in types.ts.

**Phase 2 — Differenzierung:**
- **Hintergrundbilder**: 6 CSS-Gradient-Backgrounds (none, felt-green, felt-blue, casino, dark-wood, abstract). `--bg-pattern` CSS Custom Property auf `<html>`. Vorschau-Grid in SettingsPanel. `BackgroundImage` Typ in types.ts. Dark/Light-aware via ThemeContext.
- **Blindstruktur nach Ziel-Endzeit**: `generateBlindsByEndTime()` in blinds.ts — automatische Blindstruktur-Generierung basierend auf gewünschter Turnierdauer. Tab im BlindGenerator mit Zeitpicker (60–480 Min) + Live-Preview.
- **Re-Entry-Modus**: Spieler können sich nach Elimination neu einkaufen. `reEnterPlayer()` in players.ts erstellt neuen Spieler mit frischem Stack, `originalPlayerId`-Verknüpfung, `reEntryCount`. `reEntryEnabled/maxReEntries` in RebuyConfig. Re-Entry-Button bei eliminierten Spielern. Auto-Platzierung am kleinsten Tisch.
- **Seat-Locking (Multi-Table)**: Bestimmte Sitzplätze an Tischen sperren. `Seat.locked` Property. `toggleSeatLock()` in tables.ts. Gesperrte Sitze werden bei Verteilung und Balancing übersprungen. Toggle im Setup-Sitzplatz-Preview.
- **Druckbare Ergebnisse**: Tournament-Ergebnisse über PrintView druckbar vom TournamentFinished-Screen.

**Phase 3 — Innovation:**
- **Remote-Steuerung (WebRTC)**: Serverlose Smartphone-Fernsteuerung via WebRTC Data Channel. QR-Code-basiertes Signaling (SDP Offer/Answer als Base64-komprimiert). `RemoteHost` + `RemoteController` Klassen in `remote.ts`. `RemoteControl.tsx` (~260 Zeilen) mit Host-QR-Modal + Smartphone-Controller-UI (Play/Pause/Next/Prev, Timer-Anzeige, Call the Clock, Reset). STUN via `stun.l.google.com:19302`. Keepalive Pings alle 10s. Lazy-loaded ~12KB Chunk. 📱-Button im Game-Mode-Header.
- **App.tsx Refactoring**: `useKeyboardShortcuts` Hook (72 Zeilen) — Keyboard-Shortcuts extrahiert. `useTournamentActions` Hook (317 Zeilen) — Eliminate, Reinstate, Rebuy, Add-On, Stacks, Late Reg, Re-Entry, Mystery Bounty, Table Moves extrahiert. App.tsx von ~1543 auf ~1300 Zeilen reduziert.
- **UI-Integrationstests**: 14 Komponententests via `@testing-library/react` in `tests/components.test.tsx` — NumberStepper (6 Tests), CollapsibleSection (4 Tests), PrintView (4 Tests). Test-Setup mit `@testing-library/jest-dom` + `window.matchMedia` Mock.
- **Neue Dateien**: `remote.ts`, `RemoteControl.tsx`, `SidePotCalculator.tsx`, `useKeyboardShortcuts.ts`, `useTournamentActions.ts`, `tests/components.test.tsx`, `tests/setup.ts`
- **~100 neue Translation-Keys** (50 DE + 50 EN)
- **52 neue Tests** — **343 Tests gesamt**

---

## [4.1.0] – 2026-03-07

### Multi-Table Overhaul: Seat-Level Tournament Management

- **Seat-Level Datenmodell**: `Table` Interface komplett überarbeitet — `playerIds[]` durch `seats: Seat[]` ersetzt (`seatNumber: number`, `playerId: string | null`), `seats: number` → `maxSeats: number`, `status: TableStatus` (`'active' | 'dissolved'`), `dealerSeat: number | null` pro Tisch. `TableMove` erweitert um `fromSeat`, `toSeat`, `reason: TableMoveReason` (`'balance' | 'dissolution' | 'final-table' | 'late-registration' | 'manual'`), `timestamp: number`. Neues `MultiTableConfig` Interface (`enabled`, `seatsPerTable`, `dissolveThreshold`, `autoBalanceOnElimination`).
- **Domain Logic Rewrite** (`tables.ts`): 15+ Funktionen komplett neu geschrieben — `createTable()` erstellt `Seat[]`, `distributePlayersToTables()` round-robin mit Sitzplatzzuordnung (P1→T1S1, P2→T2S1, ...), `balanceTables()` bewegt höchsten Sitz vom größten Tisch zum niedrigsten freien Sitz am kleinsten Tisch. Neue Funktionen: `findPlayerSeat()`, `seatPlayerAtSmallestTable()`, `findTableToDissolve()`, `dissolveTable()`, `advanceTableDealer()`, `defaultMultiTableConfig()`.
- **Tischauflösung**: Automatische Auflösung bei Unterschreitung der Schwelle (konfigurierbar, Standard: 3 Spieler). Aufgelöster Tisch erhält Status `'dissolved'`, Spieler werden round-robin auf verbleibende aktive Tische verteilt. Dissolution-Loop in `eliminatePlayer()` erkennt mehrere aufzulösende Tische.
- **Elimination Chain**: Bei Spieler-Elimination: `removePlayerFromTable` → `findTableToDissolve` Loop → `shouldMergeToFinalTable` → `balanceTables`. Alle Moves über `pendingTableMovesRef` kommuniziert, per useEffect verarbeitet + Voice-Ansage.
- **Reinstate + Late Registration**: Reinstated Spieler werden via `seatPlayerAtSmallestTable()` automatisch am Tisch mit wenigsten Spielern platziert. Ebenso Late-Registration-Spieler.
- **Move Protocol**: Alle Tischwechsel (`TableMove[]`) mit vollem Detail — `fromSeat`, `toSeat`, `reason`, `timestamp`. 30-Sekunden Auto-Dismiss. Move-Log in MultiTablePanel mit Reason-Badge und vollständiger Wechselinfo.
- **MultiTablePanel Rewrite** (~200 Zeilen): Seat-Grid pro Tisch (nummerierte Plätze mit Spielernamem oder „Frei"), Dealer-Badge am Sitz, aufgelöste Tische grau mit Status, Balance-Button (amber bei Ungleichgewicht), Move-Log mit Reason-Icons.
- **Setup-Integration**: `MultiTableConfig` UI — Dissolve-Threshold NumberStepper (2–5), Auto-Balance Checkbox, empfohlene Tischanzahl (Spieler/8), Sitzplatz-Preview mit Platznummern (S1=Alice, S2=Bob, ...).
- **PlayerPanel**: Tisch/Sitz-Badge (z.B. "S3") neben jedem aktiven Spieler wenn Multi-Table aktiv.
- **SeatingScreen Multi-Table**: Mehrere Mini-Tische im SVG Grid (2 Spalten für 2–4 Tische, 3 Spalten für 5+). Jeder Tisch mit eigenem Oval, Tischname, nummerierten Sitzen, Dealer-Badge. Aufgelöste Tische mit gestricheltem Rahmen.
- **DisplayMode**: `tables` Prop an SeatingScreen durchgereicht für Multi-Table-Darstellung im TV-Modus.
- **Voice**: `announceTableMove()` erweitert um `toSeat` Parameter, `announceTableDissolution()` neu für Tischauflösung.
- **Backward-Kompatibilität**: `migrateTable()` in `parseConfigObject()` erkennt altes Format (`playerIds[]`, `seats: number`) und konvertiert automatisch zu neuem Format (`seats: Seat[]`, `maxSeats: number`). `multiTable` Config mit Defaults geparst.
- **~30 neue Translation-Keys** (15 DE + 15 EN): `multiTable.dissolveThreshold`, `multiTable.autoBalance`, `multiTable.dissolved`, `multiTable.seat`, `multiTable.seatShort`, `multiTable.emptySeat`, `multiTable.dealerAt`, `multiTable.moveLog`, `multiTable.moveDetail`, `multiTable.reasonBalance/Dissolution/FinalTable/LateReg`, `multiTable.suggested`, `voice.tableDissolution`
- **14 neue Tests**: Seat-Helpers, Distribution, Balancing mit Sitz-Tracking, Dissolution, Final-Table-Merge, Dealer-Advance, Backward-Compat-Migration — **291 Tests gesamt**

---

## [4.0.1] – 2026-03-07

### Sprachansagen-Vervollständigung

- **Mystery Bounty Ansage**: `announceMysteryBounty(amount, t)` — MP3-Intro „Mystery Bounty!" + Speech mit gezogenem Betrag. Wird bei Elimination mit Mystery Bounty automatisch getriggert. Neue MP3: `mystery-bounty.mp3` (DE + EN).
- **Call the Clock Ansage**: `announceCallTheClock(seconds, t)` bei Start + `announceCallTheClockExpired(t)` bei Ablauf. MP3-Intro + Speech mit Sekundenzahl. `voiceEnabled`-Prop an CallTheClock.tsx. Neue MP3s: `call-the-clock.mp3`, `time-expired.mp3` (DE + EN).
- **Late Registration geschlossen**: `announceLateRegistrationClosed(t)` — automatische Ansage wenn Late-Reg-Fenster schließt. Effect in App.tsx tracked `lateRegOpen` Transition. Neue MP3: `late-registration-closed.mp3` (DE + EN).
- **Personalisierter Turniersieger**: `announceTournamentWinner(playerName, t)` ersetzt generische Ansage. Spielt `tournament-winner.mp3` + personalisierten Speech-Fallback mit Gewinnername. `useGameEvents` erhält `winnerName`-Parameter.
- **5 neue Announce-Funktionen** in speech.ts, **8 neue Translation-Keys** (4 DE + 4 EN)
- **8 neue MP3-Dateien** (4 DE + 4 EN): `mystery-bounty.mp3`, `call-the-clock.mp3`, `time-expired.mp3`, `late-registration-closed.mp3`. **460 Audio-Dateien** gesamt (230 pro Sprache).

---

## [4.0.0] – 2026-03-07

### Phase 5: Multi-Table Support (Basic)

- **Multi-Table Datenmodell**: Erste Version mit `Table` Interface und `playerIds[]`. Neues Domain-Modul `tables.ts` mit CRUD-Funktionen.
- **Table Balancing**: `balanceTables()` mit "move from largest to smallest"-Strategie.
- **Final Table Merge**: `shouldMergeToFinalTable()` + `mergeToFinalTable()`.
- **Multi-Table UI**: `MultiTablePanel.tsx` (lazy-loaded) + Setup-Integration.
- **Neue Dateien**: `src/domain/tables.ts`, `src/components/MultiTablePanel.tsx`
- **28 neue Translation-Keys** (14 DE + 14 EN)
- **15 neue Tests** — **277 Tests gesamt**

---

## [3.1.0] – 2026-03-07

### Phase 4: UX & Druckansicht

- **Druckbare Blindstruktur**: Neues `PrintView.tsx` — druckoptimierte Darstellung der Blind-Tabelle, Chip-Werte, Auszahlung und Turnier-Info. „Blindstruktur drucken"-Button auf der Setup-Seite. `@media print` Styles in `index.css` blenden alles außer Druckansicht aus.
- **Setup-Wizard**: Geführte Ersteinrichtung für neue Benutzer (`SetupWizard.tsx`, ~230 Zeilen). 5 Schritte: Willkommen → Spieleranzahl → Buy-In → Blind-Geschwindigkeit → Zusammenfassung. Wird nur beim ersten Besuch angezeigt (`poker-timer-wizard-completed` in localStorage). Überspringbar. Generiert vollständige Turnier-Konfiguration.
- **Visuelles Sitzplatz-Diagramm**: SVG-basierte ovale Pokerttisch-Visualisierung (`SeatingScreen.tsx`, ~155 Zeilen). Zeigt Spielerpositionen mit Status-Indikatoren (aktiv/eliminiert), Dealer-Button und Chip-Leader-Badge. Als 6. rotierender Screen im TV-Display-Modus integriert.
- **Neue Dateien**: `PrintView.tsx`, `SetupWizard.tsx`, `display/SeatingScreen.tsx`
- **26 neue Translation-Keys** (13 DE + 13 EN)
- **2 neue Tests** — **262 Tests gesamt**

---

## [3.0.0] – 2026-03-07

### Phase 3: Liga-Management & Mystery Bounty

- **Liga-Datenmodell**: Neue Interfaces `League`, `PointSystem`, `PointEntry`, `LeagueStanding` in types.ts. Optionales `leagueId` in TournamentConfig + TournamentResult. Standard-Punktesystem (1.→10, 2.→7, 3.→5, 4.→4, 5.→3, 6.→2, 7.→1). CRUD-Funktionen: `loadLeagues()`, `saveLeague()`, `deleteLeague()`, `defaultPointSystem()`.
- **Liga CRUD UI**: Neues `LeagueManager.tsx` Modal (~300 Zeilen) — Ligen erstellen, bearbeiten, löschen. Inline-Editing für Name und Punktesystem. Expand/Collapse mit ChevronIcon. Confirmation-Dialog bei Löschung. „Ligen"-Button im Setup-Header.
- **Liga-Leaderboard**: Sortierbare Standings-Tabelle eingebettet in LeagueManager — Rang, Spieler, Punkte, Turniere, Siege, Cashes, Ø Platz, Bester Platz. `computeLeagueStandings()` aggregiert nach normalisiertem Spielernamen.
- **Liga-Export**: Text-Export (WhatsApp-freundlich) via `formatLeagueAsText()` und CSV-Download via `formatLeagueAsCSV()`. Export-Buttons in LeagueManager.
- **Liga-Zuordnung im Setup**: Dropdown in Turnier-Grundlagen-Karte zur Liga-Auswahl. Liga-ID wird in TournamentResult gespeichert.
- **Mystery Bounty**: `BountyConfig` erweitert um `type: 'fixed' | 'mystery'` und `mysteryPool?: number[]`. Segmentierter Toggle (Fixed/Mystery) im BountyEditor. Pool-Editor mit individuellen Beträgen + Vorlagen. `drawMysteryBounty()` zieht zufällig aus Pool bei Elimination. Backward-kompatibel via `parseConfigObject`.
- **Neue Datei**: `src/components/LeagueManager.tsx`
- **60 neue Translation-Keys** (30 DE + 30 EN)
- **14 neue Tests** — **260 Tests gesamt**

---

## [2.11.0] – 2026-03-07

### Phase 2: Player Ecosystem & Architektur

- **Persistente Spielerdatenbank**: Spielernamen turnierunabhängig in localStorage gespeichert (`poker-timer-players`). Autocomplete via `<datalist>` im PlayerManager. CRUD-Funktionen: `loadPlayerDatabase()`, `savePlayerDatabase()`, `addRegisteredPlayer()`, `deleteRegisteredPlayer()`, `importPlayersFromHistory()`. Auto-Sync: Spielernamen werden bei Turnierend automatisch in DB gespeichert. Case-insensitive Deduplizierung.
- **Call-the-Clock Timer**: Konfigurierbarer Shot-Clock-Countdown gegen Slow-Play (Default: 60s, 10–300s). Modal mit großem Countdown, Fortschrittsbalken, Tension-Beeps letzte 10s. Auto-Close bei 0. Tastenkürzel `C`. `callTheClockSeconds` in Settings.
- **Reinstate-Verbesserung**: Alle eliminierten Spieler können reinstated werden (nicht nur der letzte). Placements der verbleibenden Eliminierten werden automatisch neu berechnet.
- **logic.ts Module Split**: 1760-Zeilen-Monolith in 9 fokussierte Module aufgeteilt: `helpers.ts`, `format.ts`, `timer.ts`, `blinds.ts`, `players.ts`, `chips.ts`, `validation.ts`, `tournament.ts`, `persistence.ts`. `logic.ts` ist jetzt Barrel mit `export * from './...'`. Alle bestehenden Imports funktionieren unverändert.
- **DisplayMode Subfolder**: 642-Zeilen-Datei in 7 fokussierte Dateien aufgeteilt: `display/DisplayMode.tsx` (Orchestrator), `PlayersScreen.tsx`, `StatsScreen.tsx`, `PayoutScreen.tsx`, `ScheduleScreen.tsx`, `ChipsScreen.tsx`, `index.ts` (Barrel).
- **Neue Dateien**: `src/components/CallTheClock.tsx`, `src/domain/helpers.ts`, `src/domain/format.ts`, `src/domain/timer.ts`, `src/domain/blinds.ts`, `src/domain/players.ts`, `src/domain/chips.ts`, `src/domain/validation.ts`, `src/domain/tournament.ts`, `src/domain/persistence.ts`, `src/components/display/` (7 Dateien)
- **14 neue Translation-Keys** (7 DE + 7 EN)
- **7 neue Tests** — **246 Tests gesamt**

---

## [2.10.0] – 2026-03-07

### Phase 1: Foundation & Quick Wins

- **SetupPage Refactoring**: App.tsx von 1465 auf 1102 Zeilen reduziert. Neue `SetupPage.tsx` (406 Zeilen) enthält alle Setup-UI-Elemente, 5 Summary-Memos, 12 Setup-Imports.
- **Per-Player Rebuy Cap**: Maximale Rebuys pro Spieler konfigurierbar. `maxRebuysPerPlayer` in RebuyConfig (undefined = unbegrenzt). NumberStepper im RebuyEditor, Rebuy-Button disabled bei Limit. `canPlayerRebuy()` Helper.
- **Late Registration**: Spieler während der ersten Levels hinzufügen. `LateRegistrationConfig` (enabled, levelLimit). Config UI im Turnier-Format-Bereich. „Spieler hinzufügen"-Button im PlayerPanel-Header.
- **Benannte Pausen**: `Level.label` im DisplayMode angezeigt statt generischem „Pause". Break-Label in Voice-Ansage per Web Speech API.
- **Lautstärke-Regler**: Master Volume (0–100%) für alle Audio-Ausgaben. Range-Slider im SettingsPanel. `setMasterVolume()`, `setAudioVolume()`, `setSpeechVolume()`.
- **Bug-Fixes**: „Sidebar" i18n, `formatResultAsText` Locale-Parameter, dynamische QR-Code URL.
- **Neue Datei**: `src/components/SetupPage.tsx`
- **24 neue Translation-Keys** (12 DE + 12 EN)
- **7 neue Tests** — **239 Tests gesamt**

---

## [2.9.4] – 2026-03-06

### TV-Modus: 5 rotierende Screens

- **3 neue TV-Screens**: Spieler, Turnier-Statistik und Auszahlung als rotierende Screens im TV/Projector-Display (`DisplayMode.tsx`). Reihenfolge: Spieler → Stats → Auszahlung → Blindstruktur → Chips.
- **Spieler-Screen**: 2-3 Spalten Grid aktiver Spieler mit CL-Badge (Chip Leader), Rebuy-Count. Eliminierte kompakt am unteren Rand.
- **Stats-Screen**: Stat-Cards mit Prizepool, aktive Spieler, Ø Stack (BB), Spielzeit, Restzeit, Rebuys, Add-Ons, Bounty Pool.
- **Auszahlungs-Screen**: Platzierungen mit Beträgen, Medaillen-Emojis (Top 3), Bubble-Indikator (pulsierend) auf letztem bezahlten Platz.
- **Screen-Reihenfolge**: `SecondaryScreen`-Typ erweitert auf `'players' | 'stats' | 'payout' | 'schedule' | 'chips'`. Default-Screen: `'players'`. Chips-Screen conditional (nur bei aktivierten Chips).
- **8 neue Props**: `players`, `buyIn`, `payout`, `rebuy`, `addOn`, `bounty`, `averageStack`, `tournamentElapsed` von App.tsx an DisplayMode.
- **~15 neue Translation-Keys** pro Sprache (DE + EN): `display.players`, `display.stats`, `display.payout`, `display.prizePool`, `display.activePlayers`, `display.avgStack`, `display.elapsed`, `display.remaining`, `display.totalRebuys`, `display.totalAddOns`, `display.bountyPool`, `display.payoutPlace`, `display.chipLeaderBadge`, `display.eliminated`.
- **DisplayMode-Chunk**: Von ~8,5 KB auf ~13,5 KB gewachsen (+5 KB für 3 neue Sub-Components).
- **232 Tests**, Lint + Build bestanden.

---

## [2.9.3] – 2026-03-06

### Sprachausgabe: Elimination + Hand-for-Hand MP3

- **Spieler-Elimination Sprachansage**: Neue generische Ansage „Ein Spieler ist ausgeschieden!" (DE) / „A player has been eliminated!" (EN) bei jeder Elimination. `announceElimination(t)` in `speech.ts` jetzt mit MP3-Audio statt leer. Wird aus `useVoiceAnnouncements` automatisch getriggert (vor Bounty-Ansage falls aktiv).
- **Hand-for-Hand MP3**: `announceHandForHand()` nutzt jetzt ElevenLabs MP3 (`fixed/hand-for-hand.mp3`) statt reinem Web Speech API Fallback. „Händ for Händ! Alle Tische spielen gleichzeitig." (DE) / „Hand for hand! All tables play simultaneously." (EN).
- **4 neue MP3-Dateien**: `hand-for-hand.mp3` + `player-eliminated.mp3` je DE + EN (ElevenLabs generiert). **450 Audio-Dateien** gesamt (225 pro Sprache).
- **Translation-Keys angepasst**: `voice.playerEliminated` von dynamisch (`{name} ausgeschieden...`) zu generisch („Ein Spieler ist ausgeschieden!") geändert — passend zum MP3.
- **232 Tests** (unverändert)

---

## [2.9.2] – 2026-03-06

### QR-Code Vereinfachung

- **Ergebnis-QR-Code entfernt**: Der dynamische QR-Code für Turnierergebnisse wurde entfernt — nur noch der statische App-QR-Code bleibt.
- **App-QR-Code auf der Setupseite**: Der App-QR-Code (7mountainpoker.vercel.app) wird jetzt auch auf der Setupseite unterhalb des Start-Buttons angezeigt, nicht nur auf dem Ergebnis-Screen.
- **Code-Cleanup**: `encodeResultForQR()` und `QR_BASE_URL` aus `logic.ts` entfernt (nicht mehr benötigt). `decodeResultFromQR()` bleibt für bestehende `#r=`-Links erhalten. 2 Translation-Keys entfernt (`finished.qrCodes`, `finished.qrResult`). 1 Test entfernt, 1 Test von Round-Trip auf standalone Decode umgeschrieben — **232 Tests gesamt**

---

## [2.9.1] – 2026-03-06

### Bug-Fixes: QR-Code + TV-Modus

- **QR-Code Timing-Fix**: Ergebnis-QR-Code auf dem Turnierende-Screen wurde nie angezeigt, weil `getLatestResult()` das Ergebnis aus localStorage las, bevor `saveTournamentResult` es geschrieben hatte (React-Effect-Timing). Fix: `TournamentResult` wird jetzt direkt als Prop von App.tsx übergeben — kein localStorage-Umweg mehr.
- **TV-Modus Split-Layout**: Timer + Blinds sind jetzt **permanent** im oberen Bereich (~55%) sichtbar. Nur der untere Bereich (~45%) rotiert alle 15 Sekunden zwischen Blind-Schedule und Chip-Werten. Vorher wechselte der gesamte Bildschirm — Timer war 2/3 der Zeit nicht sichtbar. Schedule-Ansicht auf 8 kompakte Zeilen reduziert (war 14).
- **TournamentFinished**: `loadTournamentHistory`-Import entfernt, neues Prop `tournamentResult: TournamentResult | null`. Text-Kopieren und CSV-Download nutzen direkt den Prop statt localStorage.
- **App.tsx**: Neues `finishedResult`-Memo via `buildTournamentResult()`, wird an TournamentFinished übergeben.

---

## [2.9.0] – 2026-03-06

### Hand-for-Hand Mode + Stack Tracking

- **Hand-for-Hand Mode**: Manueller Toggle (Tastenkürzel: H) während der Bubble-Phase. Roter „HAND FOR HAND"-Banner in `BubbleIndicator` und `DisplayMode`. „Nächste Hand"-Button startet Timer, User pausiert manuell nach jeder Hand. Voice-Ansage bei Aktivierung. Deaktiviert sich automatisch wenn die Bubble platzt (Spieler eliminiert → ITM).
- **Stack Tracking pro Spieler**: Optionales `chips`-Feld im `Player`-Interface. „Stacks initialisieren"-Button im PlayerPanel berechnet Starting-Stack + Rebuys + Add-Ons pro Spieler. Inline-Zahleneingabe zum Bearbeiten. Chip-Leader-Badge (amber „C"-Kreis). Automatische Anpassung bei Rebuy (+rebuyChips), Add-On (+addOnChips) und Elimination (→ 0). „Stacks löschen" setzt alle auf undefined zurück.
- **Neue Funktionen in logic.ts**: `initializePlayerStacks()`, `findChipLeader()`, `computeAverageStackFromPlayers()`, `addRebuyToStack()`, `addAddOnToStack()`
- **Neue Voice-Funktion**: `announceHandForHand()` in `speech.ts` — Web Speech API (kein MP3)
- **28 neue Translation-Keys** (14 DE + 14 EN): `controls.handForHand/handForHandTooltip/nextHand/nextHandTooltip`, `game.handForHand/handForHandHint`, `display.handForHand`, `voice.handForHand`, `playerPanel.stack/chipLeader/stackTracking/initStacks/clearStacks`
- **11 neue Tests**: initializePlayerStacks (3), findChipLeader (3), computeAverageStackFromPlayers (2), addRebuyToStack (2), addAddOnToStack (1) — **233 Tests gesamt**

---

## [2.8.0] – 2026-03-06

### QR-Codes auf dem Ergebnis-Screen

- **QR-Code App-URL**: Statischer QR-Code auf dem Turnierergebnis-Screen verlinkt zur App (7mountainpoker.vercel.app). Andere Spieler können die App direkt installieren — scannen und los.
- **QR-Code Turnierergebnis**: Dynamischer QR-Code kodiert das komplette Turnierergebnis kompakt in einem URL-Hash (`#r=`). Empfänger scannen den Code und sehen Standings, Prizepool und Turnier-Info direkt in der App.
- **SharedResultView**: Neues read-only Modal (`SharedResultView.tsx`, ~120 Zeilen) zeigt geteilte Turnierergebnisse mit Standings-Tabelle und Turnier-Zusammenfassung. Wird automatisch beim Öffnen der App mit `#r=` Hash angezeigt, Hash wird danach bereinigt.
- **Kompakte Kodierung**: `encodeResultForQR()` / `decodeResultFromQR()` in `logic.ts` — Pipe-delimited Header (Name, Datum, Spieler, BuyIn, Prizepool, Bounty, Rebuys, AddOns, Minuten, Levels) + Semicolon-delimited Players (Name:Platz:Payout:Rebuys:AddOn:KOs). 8-Spieler-Turnier in ~375 Bytes URL-encoded.
- **Theme-aware QR**: `QRCodeSVG` aus `qrcode.react` mit Dark/Light-Mode-Farben. Inline SVG wird von `html-to-image` korrekt in Screenshots miterfasst.
- **Neue Dependency**: `qrcode.react` v4 (~13KB gzip, im TournamentFinished-Lazy-Chunk)
- **Neue Datei**: `src/components/SharedResultView.tsx`
- **12 neue Translation-Keys** (6 DE + 6 EN): `finished.qrCodes/qrApp/qrResult`, `shared.title/close/invalidData`
- **4 neue Tests**: encodeResultForQR URL-Format, Round-Trip encode/decode, Invalid-Input-Handling — **222 Tests gesamt**

---

## [2.7.0] – 2026-03-06

### Refactoring + Big Blind Ante

- **Hook-Extraktion `useVoiceAnnouncements()`**: 8 Voice-Announcement-Effects (Level-Change, Break-Warning, 5-Min-Warning, Bounty, Player-Milestones, Timer-Paused/Resumed, Rebuy-End/Add-On) mit zugehörigen Refs aus `App.tsx` in eigenen Hook extrahiert (~200 Zeilen). Returns `{ reset }` Callback für Cleanup. App.tsx um ~160 Zeilen reduziert.
- **Hook-Extraktion `useGameEvents()`**: Victory-Sound/Pause, Bubble-Sound, ITM-Sound/Flash-Effekte in eigenen Hook extrahiert (~100 Zeilen). Verwaltet `showItmFlash` State intern. Returns `{ showItmFlash, reset }`.
- **Big Blind Ante (BBA)**: Neuer `AnteMode`-Typ (`'standard' | 'bigBlindAnte'`) in `TournamentConfig`. Im BBA-Modus entspricht Ante dem Big Blind (WSOP/EPT-Standard). Segmentierter Toggle im Setup (Standard / Big Blind Ante), nur sichtbar wenn Ante aktiviert. `TimerDisplay` zeigt „BBA" statt „Ante". `computeDefaultAnte()` und `applyDefaultAntes()` unterstützen beide Modi. Backward-kompatibles Parsing in `parseConfigObject` für alte Configs ohne `anteMode`.
- **App.tsx Reduktion**: Von ~1500 auf ~1284 Zeilen durch Hook-Extraktion — größte einzelne Verbesserung der Wartbarkeit.
- **2 neue Dateien**: `src/hooks/useVoiceAnnouncements.ts`, `src/hooks/useGameEvents.ts`
- **6 neue Translation-Keys** (3 DE + 3 EN): `app.anteStandard`, `app.anteBBA`, `timer.bba`
- **4 neue Tests**: BBA computeDefaultAnte, Standard-Mode-Default, applyDefaultAntes mit BBA, importConfigJSON Backward-Compat — **218 Tests gesamt**

---

## [2.6.0] – 2026-03-06

### Turnier-Historie, Spieler-Statistiken & Export

- **Turnier-Historie**: Ergebnisse werden automatisch nach Turnierende in localStorage gespeichert (max 50 Einträge, `poker-timer-history`). Neue `TournamentHistory.tsx` Modal-Komponente mit aufklappbaren Turniereinträgen (ChevronIcon), vollständiger Standings-Tabelle mit Farbkodierung (Bilanz grün/rot), Einzel-/Gesamt-Löschfunktion mit Confirm-Dialog.
- **Spieler-Statistiken**: Tab „Spielerstatistik" im Historie-Modal. `computePlayerStats()` aggregiert alle Ergebnisse nach normalisiertem Spielernamen (`toLowerCase().trim()`). Zeigt Turniere, Siege, Cashes, Auszahlung, Einsatz, Bilanz, Ø Platz, Knockouts. Sortiert nach Netto-Bilanz.
- **Text-Export (WhatsApp)**: „Text kopieren" Button in TournamentFinished + TournamentHistory — `formatResultAsText()` erzeugt WhatsApp-freundliches Format mit Emoji-Platzierungen (🏆🥈🥉), Prizepool, Spielerzahl. Clipboard API.
- **CSV-Export**: „CSV herunterladen" Button — `formatResultAsCSV()` erzeugt vollständige Turnierdaten (Place, Name, Payout, Rebuys, AddOn, Knockouts, NetBalance). Blob Download.
- **Auto-Save**: Turnierergebnis wird automatisch beim Finish gespeichert (kein manueller Schritt). Ref-basierte Einmalausführung.
- **Neue Interfaces**: `PlayerResult`, `TournamentResult`, `PlayerStat` in types.ts
- **Neue Datei**: `src/components/TournamentHistory.tsx` (~290 Zeilen)
- **50 neue Translation-Keys** (27 DE + 27 EN): `history.*`, `app.history`, `finished.copyText/textCopied/downloadCSV/exportOptions`
- **11 neue Tests**: buildTournamentResult (2), Persistence CRUD (4), formatResultAsText, formatResultAsCSV, computePlayerStats (3) — **214 Tests gesamt**

---

## [2.5.0] – 2026-03-06

### TV-Display-Modus

- **TV/Projector Display**: Neuer dedizierter Vollbild-Anzeigemodus optimiert für Projektoren und Fernseher — dunkler Hintergrund, sehr großer Timer, keine sensiblen Daten (kein Prizepool, keine Standings, keine Controls)
- **Drei rotierende Screens**: Timer (Blinds + Countdown + Fortschrittsbalken + Bubble/Last-Hand-Banner), Blindstruktur (14 Levels sichtbar, aktuelles hervorgehoben), Chip-Werte (Grid mit Farben und Color-Up)
- **Auto-Rotation** alle 15 Sek., manuelle Navigation per Pfeiltasten, Screen-Indikator-Punkte
- **Shortcut**: `T` zum Aktivieren/Deaktivieren, `Escape` zum Beenden
- **📺-Button** im Header während des Spielmodus
- **Lazy-loaded** (~8,5 KB separater Chunk)
- **22 neue Translation-Keys** (11 pro Sprache): `display.*`
- **Neue Datei**: `src/components/DisplayMode.tsx`

---

## [2.4.0] – 2026-03-06

### Quick Wins: Uhrzeit, Letzte Hand, Dealer-Rotation, ErrorBoundary

- **Uhrzeit im Spielmodus** — Echtzeit-Uhr im Game-Mode-Header neben Turniernamen. Aktualisierung alle 30 Sekunden, `font-mono tabular-nums` Format.
- **Clock display in game mode** — Real-time clock in game mode header next to tournament name. Updates every 30 seconds, monospace tabular format.

- **„Letzte Hand"-Banner + Ansage** — Toggle-Button in Controls (amber-Styling) + Tastenkürzel `L`. Zeigt prominenten amber Banner, Voice-Ansage unterscheidet „vor Pause" / „Ende des Levels". Auto-Reset bei Level-Wechsel.
- **"Last Hand" banner + announcement** — Toggle button in controls (amber style) + keyboard shortcut `L`. Prominent amber banner, voice distinguishes "before break" / "end of level". Auto-reset on level change.

- **Dealer Auto-Rotation** — Neuer „Dealer weiter"-Button im PlayerPanel-Header. `advanceDealer()` überspringt eliminierte Spieler mit Wrap-Around.
- **Dealer auto-rotation** — New "Move Dealer" button in PlayerPanel header. `advanceDealer()` skips eliminated players with wrap-around.

- **React ErrorBoundary** — Fängt Lazy-Load-Fehler und Render-Crashes ab. Fallback-UI mit Reload-Button (hardcoded English, da i18n-Context evtl. nicht verfügbar).
- **React ErrorBoundary** — Catches lazy-load failures and render crashes. Fallback UI with reload button (hardcoded English since i18n context may be unavailable).

- **Promise-basierte Sound-Koordination** — `playVictorySound()`, `playBubbleSound()`, `playInTheMoneySound()` geben `Promise<void>` zurück. `setTimeout`-Pattern durch `async/await` ersetzt — keine Race Conditions mehr.
- **Promise-based sound coordination** — Sound functions return `Promise<void>`. `setTimeout` pattern replaced with `async/await` — no more race conditions.

- **8 neue Tests**: advanceDealer (5), Promise-Sounds (3) — 203 Tests gesamt
- **8 new tests**: advanceDealer (5), Promise sounds (3) — 203 tests total

---

## [2.3.0] – 2026-03-05

### ElevenLabs MP3 Sprachausgabe (Deutsch + Englisch) / ElevenLabs MP3 Voice (German + English)

- **ElevenLabs MP3 Sprachausgabe** — 446 professionelle Audio-Dateien (Deutsch: Stimme Ava, Englisch: ElevenLabs Voice Library). Modular aufgebaut: Building-Blocks für Pokerbegriffe (`Blinds`, `Ante`, `Color-Up`) + einzelne Dateien für Levels (1–25), Blind-Paare (110), Ante-Werte (20), Countdowns (1–10), Pausen (minutengenau 1–30 Min) und 25 feste Ansagen. 223 Dateien pro Sprache, offline via PWA gecached.
- **ElevenLabs MP3 voice** — 446 professional audio files (German: voice Ava, English: ElevenLabs Voice Library). Modular architecture: building blocks for poker terms (`Blinds`, `Ante`, `Color-Up`) + individual files for levels (1–25), blind pairs (110), ante values (20), countdowns (1–10), breaks (every minute 1–30), and 25 fixed announcements. 223 files per language, offline-cached via PWA.

- **Dreistufiger Audio-Fallback** — Web Audio API (gapless, Trailing-Silence-Trimming) → HTMLAudioElement (sequentiell, maximale Browser-Kompatibilität) → Web Speech API (Browser-Stimme als letzter Ausweg). Behebt stille MP3-Fehler in bestimmten Browsern.
- **Triple audio fallback** — Web Audio API (gapless, trailing silence trimming) → HTMLAudioElement (sequential, maximum browser compatibility) → Web Speech API (browser voice as last resort). Fixes silent MP3 failures in certain browsers.

- **Neue Datei: `audioPlayer.ts`** — MP3-Playback-Engine mit Web Audio API + HTMLAudioElement-Fallback, dynamischem Sprachpfad (`audio/de/` / `audio/en/`).
- **New file: `audioPlayer.ts`** — MP3 playback engine with Web Audio API + HTMLAudioElement fallback, dynamic language path (`audio/de/` / `audio/en/`).

- **speech.ts Refactoring** — Unified Queue mit `audio`- und `speech`-Items. Manifest-basierte Dateiprüfung: 110 Blind-Paare, 20 Ante-Werte, 25 Levels, 30 Pausen-Dauern (1–30 Min). Fehler-Logging im Catch-Handler für Diagnose.
- **speech.ts refactoring** — Unified queue supporting `audio` and `speech` items. Manifest-based file lookup: 110 blind pairs, 20 ante values, 25 levels, 30 break durations (1–30 min). Error logging in catch handler for diagnostics.

- **Beide Sprachen mit Voice** — Sowohl Deutsch als auch Englisch nutzen ElevenLabs MP3s. Voice standardmäßig aktiviert. Bei deaktivierter Sprachausgabe nur Beep-Sounds.
- **Both languages with voice** — Both German and English use ElevenLabs MP3s. Voice enabled by default. When voice is disabled, beep sounds only.

- **Pausenzeiten minutengenau** — Alle Pausenansagen von 1 bis 30 Minuten als eigene MP3-Dateien (vorher nur 5/10/15/20/25/30).
- **Break announcements per minute** — All break announcements from 1 to 30 minutes as individual MP3 files (previously only 5/10/15/20/25/30).

- **Erweiterte Ansagen** — Turnierstart („Shuffle up and deal!"), Heads-Up, dynamische Spieleranzahl-Ansagen (4–10 Spieler basierend auf Auszahlungsplätzen), Letzte Hand / Letzte Hand vor der Pause, Noch 5 Minuten, Pause vorbei, Color-Up nächste Pause, Timer pausiert/fortgesetzt. Voice-Countdown nur in Spiellevels (Beeps in Pausen).
- **Extended announcements** — Tournament start ("Shuffle up and deal!"), heads-up, dynamic player count milestones (4–10 players based on paid places), last hand / last hand before break, 5 minutes remaining, break over, color-up next break warning, timer paused/resumed. Voice countdown on play levels only (beeps during breaks).

- **Vollständige Blind-Pair-Abdeckung** — Alle 110 Blind-Kombinationen vorhanden: Generator-Blinds für Startstacks 1k–100k (schnell/normal/langsam) plus Standard-Kombinationen aus gängigen Poker-Turnierformaten (Home Games, WSOP). BB immer exakt doppelter SB. Kein Speech-Fallback mehr für übliche Blindstrukturen.
- **Complete blind pair coverage** — All 110 blind combinations covered: generator blinds for starting stacks 1k–100k (fast/normal/slow) plus standard combinations from common poker tournament formats (home games, WSOP). BB always exactly double SB. No more Speech API fallback for common blind structures.

- **PWA-Caching** — `.mp3` zu Workbox `globPatterns` hinzugefügt. Audio-Dateien offline verfügbar.
- **PWA caching** — `.mp3` added to Workbox `globPatterns`. Audio files available offline.

- **Qualitätsverbesserungen** — Race-Condition-Fix in `audioPlayer.ts` (onended bei `source.stop()`), Speech-Fallback für alle Ansagen (Winner, Bounty, Heads-Up, Turnierstart), HTMLAudioElement überspringt fehlerhafte Dateien statt Abbruch, `victoryVoicePlayedRef` Reset korrigiert, 20 ungenutzte MP3s entfernt, 4 neue Translation-Keys.
- **Quality improvements** — Race condition fix in `audioPlayer.ts` (onended on `source.stop()`), speech fallback for all announcements (winner, bounty, heads-up, tournament start), HTMLAudioElement skips failed files instead of aborting, `victoryVoicePlayedRef` reset fixed, 20 unused MP3s removed, 4 new translation keys.

- **3 neue Tests** — audioPlayer Degradation, announceCountdown Return-Value, Dual-Language-Support (195 Tests gesamt).
- **3 new tests** — audioPlayer degradation, announceCountdown return value, dual-language support (195 tests total).

---

## [2.2.1] – 2026-03-04

### Dual Deployment: GitHub Pages + Vercel

- **Vercel-Deployment** — App jetzt zusätzlich über Vercel erreichbar: [7mountainpoker.vercel.app](https://7mountainpoker.vercel.app/). Automatisches Deploy bei Push auf `main`. Edge Network für schnellere Ladezeiten weltweit. Preview-Deployments bei Branches.
- **Vercel deployment** — App now also available via Vercel: [7mountainpoker.vercel.app](https://7mountainpoker.vercel.app/). Auto-deploy on push to `main`. Edge network for faster load times worldwide. Preview deployments on branches.

- **Dynamischer Base-Pfad** — `vite.config.ts` nutzt `VITE_BASE_PATH` Umgebungsvariable statt hardcodiertem `/7MountainPoker/`. Default: `/` (Vercel). GitHub Actions setzt `/7MountainPoker/` für GitHub Pages. `index.html` enthält keine hardcodierten Pfade mehr — Vite ergänzt den Base-Pfad beim Build automatisch.
- **Dynamic base path** — `vite.config.ts` uses `VITE_BASE_PATH` environment variable instead of hardcoded `/7MountainPoker/`. Default: `/` (Vercel). GitHub Actions sets `/7MountainPoker/` for GitHub Pages. `index.html` no longer contains hardcoded paths — Vite prepends the base path during build automatically.

- **PWA-Pfade dynamisch** — `start_url` und `scope` im PWA-Manifest nutzen dieselbe Base-Variable. PWA funktioniert auf beiden Plattformen korrekt.
- **Dynamic PWA paths** — `start_url` and `scope` in PWA manifest use the same base variable. PWA works correctly on both platforms.

---

## [2.2.0] – 2026-03-03

### Sprachausgabe-Verfeinerung & VoiceSwitcher / Voice Refinement & VoiceSwitcher

- **VoiceSwitcher im Header** — Neue `VoiceSwitcher.tsx`-Komponente: 2-Segment-Toggle (Noten-Icon für Sound / Mikrofon-Icon für Voice) im Header zwischen Sprachumschalter und Modus-Button. Ersetzt den Voice-Toggle aus den Einstellungen. Verfügbar in Setup und Spielmodus.
- **VoiceSwitcher in header** — New `VoiceSwitcher.tsx` component: 2-segment toggle (music note icon for sound / microphone icon for voice) in header between language switcher and mode button. Replaces the voice toggle from settings panel. Available in setup and game mode.

- **Sequentielle Sprachwiedergabe** — Speech-Queue mit `onend`-Verkettung: Ansagen werden nacheinander abgespielt, keine Überlappung. `announceImmediate()` für zeitkritische Countdown-Zahlen (leert Queue und spricht sofort). Sound-Effekte werden vor Voice-Ansagen abgespielt (delay-basierte Koordination).
- **Sequential speech playback** — Speech queue with `onend` chaining: announcements play one after another, no overlap. `announceImmediate()` for time-critical countdown numbers (clears queue and speaks immediately). Sound effects play before voice announcements (delay-based coordination).

- **Phonetische Aussprache** — Alle englischen Pokerbegriffe in deutschen Voice-Texten phonetisch angepasst für natürliche TTS-Aussprache: Bleindz (Blinds), Riebai (Rebuy), Ädd-On (Add-On), Babbl (Bubble), Kaller-App (Color-Up), Inn se Manni (In The Money).
- **Phonetic pronunciation** — All English poker terms in German voice texts phonetically adjusted for natural TTS pronunciation: Bleindz (Blinds), Riebai (Rebuy), Ädd-On (Add-On), Babbl (Bubble), Kaller-App (Color-Up), Inn se Manni (In The Money).

- **Countdown komplett gesprochen** — Voice-Countdown für alle 10 Sekunden (vorher nur letzte 5). Timing-Fix: `Math.floor` statt `Math.ceil` — Ansage synchron mit der Anzeige (kein 1-Sekunden-Versatz mehr).
- **Full countdown spoken** — Voice countdown for all 10 seconds (previously only last 5). Timing fix: `Math.floor` instead of `Math.ceil` — announcement in sync with display (no more 1-second offset).

- **Add-On/Rebuy-Timing** — Ansage und Banner erscheinen vor der Pause bzw. vor dem nächsten Level — nicht erst danach. Zentralisierter `lastRebuyLevelIndex` als `useMemo`. `addOnWindowOpen` reagiert auf `remainingSeconds <= 0` am letzten Rebuy-Level.
- **Add-on/rebuy timing** — Announcement and banner appear before the break or next level — not after. Centralized `lastRebuyLevelIndex` as `useMemo`. `addOnWindowOpen` reacts to `remainingSeconds <= 0` at last rebuy level.

- **Add-On-Text** — „einmalig verfügbar" / „available once" statt generisch „verfügbar" / „available".
- **Add-on text** — "einmalig verfügbar" / "available once" instead of generic "verfügbar" / "available".

---

## [2.1.0] – 2026-03-03

### Sprachansagen / Voice Announcements

- **Web Speech API Sprachansagen** — Neue Funktion: der Timer spricht Level-Wechsel, Pausen, Bubble, In-The-Money, Eliminierungen, Turniersieger, Add-On, Rebuy-Ende und Color-Up an. Komplett offline-fähig, keine Sounddateien, keine Kosten. Aktivierbar über neuen Toggle „Sprachansagen" in den Einstellungen.
- **Web Speech API voice announcements** — New feature: the timer announces level changes, breaks, bubble, in-the-money, eliminations, tournament winner, add-on, rebuy end, and color-up. Fully offline, no sound files, no cost. Enable via new "Voice Announcements" toggle in settings.

- **Neue Datei**: `src/domain/speech.ts` — Voice-Engine mit Sprachauswahl (DE/EN), Ankündigungs-Queue (cancel-before-speak), 11 Convenience-Funktionen.
- **New file**: `src/domain/speech.ts` — Voice engine with language selection (DE/EN), announcement queue (cancel-before-speak), 11 convenience functions.

- **13 neue Translation-Keys**: `settings.voice`, `voice.levelChange`, `voice.levelChangeWithAnte`, `voice.breakStart`, `voice.breakWarning`, `voice.bubble`, `voice.inTheMoney`, `voice.playerEliminated`, `voice.tournamentWinner`, `voice.addOnAvailable`, `voice.rebuyEnded`, `voice.colorUp` (DE + EN).
- **13 new translation keys**: `settings.voice`, `voice.levelChange`, `voice.levelChangeWithAnte`, `voice.breakStart`, `voice.breakWarning`, `voice.bubble`, `voice.inTheMoney`, `voice.playerEliminated`, `voice.tournamentWinner`, `voice.addOnAvailable`, `voice.rebuyEnded`, `voice.colorUp` (DE + EN).

- **5 neue Tests**: Speech-Modul Degradation (kein speechSynthesis in jsdom), Announcement-Builder (192 Tests gesamt).
- **5 new tests**: Speech module degradation (no speechSynthesis in jsdom), announcement builders (192 tests total).

---

## [2.0.1] – 2026-03-03

### Light-Mode-Fixes, Sektionsumbenennung & Clean-View-Button

- **Light-Mode Lesbarkeit** — Alle farbigen UI-Elemente (rot/grün/amber) waren im Light Mode schlecht lesbar (dunkle Hintergründe mit niedrigen Opacities, helle Textfarben aus dem Dark-Mode-Design). Jetzt: helle Basis-Farben für Light Mode + bisherige Werte als `dark:`-Varianten. 14 Dateien gefixt.
- **Light mode readability** — All colored UI elements (red/green/amber) were hard to read in light mode (dark backgrounds with low opacities, bright text colors from dark mode design). Now: light base colors for light mode + previous values as `dark:` variants. 14 files fixed.

- **Sektionsumbenennung** — „Turnier-Format" → „Rebuy / Add-On / Bounty" — direkter und verständlicher.
- **Section rename** — "Tournament Format" → "Rebuy / Add-On / Bounty" — more direct and understandable.

- **Clean-View-Button in Controls** — Der „Details einblenden/ausblenden"-Button sitzt jetzt mittig unter dem Start-Button in der Controls-Komponente (über Level-Reset / Turnier-Restart). Prominenter gestaltet mit Border und Shadow, immer sichtbar (auch bei eingeblendeten Details).
- **Clean view button in controls** — The "Show/hide details" button now sits centered below the start button in the Controls component (above level reset / tournament restart). More prominent with border and shadow, always visible (even when details are shown).

- **Theme ohne Flash** — Inline-Script in `index.html` setzt den Dark/Light-Modus vor dem ersten Paint anhand von localStorage oder `prefers-color-scheme`. Kein Flash of Wrong Theme mehr beim App-Start.
- **Theme without flash** — Inline script in `index.html` applies dark/light mode before first paint based on localStorage or `prefers-color-scheme`. No more flash of wrong theme on app start.

- **Theme/Sprache im Spielmodus** — Theme-Switcher und Language-Switcher im Header sind jetzt in beiden Modi verfügbar (Setup + Spiel), nicht mehr nur im Setup.
- **Theme/language in game mode** — Theme switcher and language switcher in header are now available in both modes (setup + game), not just setup.

- **Chips standardmäßig deaktiviert** — Chip-Farben/-Denominations sind bei neuen Turnieren deaktiviert. ChipSidebar im Spielmodus wird nur angezeigt wenn Chips im Setup aktiviert wurden.
- **Chips disabled by default** — Chip colors/denominations are disabled for new tournaments. Chip sidebar in game mode only shown when chips are enabled in setup.

- **Color-Up realistischer** — Chips werden nicht mehr bei der ersten möglichen Pause entfernt, sondern erst bei der übernächsten. Z.B. bleiben 500er-Chips länger im Spiel, wie in echten Turnieren üblich.
- **Color-up more realistic** — Chips are no longer removed at the first possible break but at the one after that. E.g. 500-value chips stay in play longer, as is common in real tournaments.

- **Add-On-Timing korrigiert** — Die Add-On-Ankündigung erscheint jetzt zum richtigen Zeitpunkt: Wenn eine Pause nach der letzten Rebuy-Stufe folgt, läuft der Timer weiter und das Banner wird in der Pause + nächstem Level angezeigt. Ohne Pause wird der Timer automatisch angehalten, damit Spieler ihr Add-On nehmen können.
- **Add-on timing fixed** — The add-on announcement now appears at the correct time: When a break follows the last rebuy level, the timer keeps running and the banner shows during the break + next level. Without a break, the timer pauses automatically so players can take their add-on.

---

## [2.0.0] – 2026-03-03

### Dark/Light Mode, SVG-Chevrons, NumberStepper & Performance

- **Dark/Light Mode** — Vollständiges Theming mit 3-Wege-Toggle (System/Hell/Dunkel) im Header. Alle 24+ Komponenten mit Tailwind `dark:`-Varianten konvertiert. Theme-Infrastruktur: `ThemeProvider` mit System-Preference-Listener (`prefers-color-scheme`), `useTheme()` Hook, localStorage-Persistenz (`poker-timer-theme`). CSS Custom Properties für theme-aware Timer-Glow-Animation. PWA `theme-color` Meta-Tag passt sich dynamisch an. Screenshot-Hintergrund respektiert aktives Theme.
- **Dark/Light mode** — Full theming with 3-way toggle (System/Light/Dark) in header. All 24+ components converted with Tailwind `dark:` variants. Theme infrastructure: `ThemeProvider` with system preference listener, `useTheme()` hook, localStorage persistence. CSS custom properties for theme-aware timer glow animation. PWA theme-color meta tag dynamically updated. Screenshot background respects active theme.

- **SVG-Chevrons** — Neue `ChevronIcon`-Komponente ersetzt Unicode-Dreiecke in allen ausklappbaren Sektionen. Größer (`w-4 h-4`), dicker (`strokeWidth 2.5`), CSS-Rotation-Animation, Hover-Farbwechsel (`group-hover`). Verwendet in 5 Komponenten.
- **SVG chevrons** — New `ChevronIcon` component replaces Unicode triangles in all collapsible sections. Larger (`w-4 h-4`), thicker (`strokeWidth 2.5`), CSS rotation animation, hover color change (`group-hover`). Used in 5 components.

- **NumberStepper** — Neue Komponente ersetzt native Browser-Zahleneingaben. Custom `+`/`-` Buttons mit Long-Press-Support (400ms Delay, 100ms Repeat via Pointer Events), optionale `snap`-Funktion, konfigurierbares min/max/step. Native Spinner per CSS ausgeblendet. Verwendet in 8 Komponenten.
- **Number stepper** — New component replaces native browser number inputs. Custom `+`/`- buttons with long-press support (400ms delay, 100ms repeat via pointer events), optional `snap` function, configurable min/max/step. Native spinners hidden via CSS. Used in 8 components.

- **Performance** — Game-Mode-Komponenten (10 Stück) per `React.lazy()` + `Suspense` lazy-loaded. `html-to-image` dynamisch importiert statt statisch gebundelt. Haupt-Bundle von 341KB auf ~302KB reduziert + separate Game-Chunks (~30KB).
- **Performance** — 10 game-mode components lazy-loaded via `React.lazy()` + `Suspense`. `html-to-image` dynamically imported instead of statically bundled. Main bundle reduced from 341KB to ~302KB + separate game chunks (~30KB).

- **Neue Dateien** — `ChevronIcon.tsx`, `NumberStepper.tsx`, `ThemeSwitcher.tsx`, `src/theme/` (ThemeContext, useTheme, themeContextValue, index).
- **New files** — `ChevronIcon.tsx`, `NumberStepper.tsx`, `ThemeSwitcher.tsx`, `src/theme/` (ThemeContext, useTheme, themeContextValue, index).

- **3 neue Translation-Keys** — `theme.system`, `theme.light`, `theme.dark` (DE + EN).
- **3 new translation keys** — `theme.system`, `theme.light`, `theme.dark` (DE + EN).

---

## [1.9.1] – 2026-03-03

### Scrub-Slider Redesign & Add-On-Ankündigung

- **Custom Scrub-Slider** — Nativen `<input type="range">` durch `ScrubSlider`-Komponente ersetzt. Sieht identisch zum Fortschrittsbalken am oberen Bildschirmrand aus (emerald/amber Gradient, Glow-Shadow, runder Thumb). Bewegen des Sliders aktualisiert den oberen Fortschrittsbalken in Echtzeit. Pointer Events für Touch + Mouse (kein Browser-Scroll-Conflict).
- **Custom scrub slider** — Replaced native `<input type="range">` with `ScrubSlider` component. Looks identical to the progress bar at the top of the screen (emerald/amber gradient, glow shadow, round thumb). Moving the slider updates the top progress bar in real-time. Pointer events for touch + mouse (no browser scroll conflict).

- **Add-On-Ankündigung** — Prominenter amber Banner in der Hauptanzeige (wie Bubble/ITM) sobald die Rebuy-Phase endet. Zeigt Kosten und Chip-Bonus an. `BubbleIndicator` erweitert um Add-On-Props, Fragment-Return erlaubt gleichzeitige Anzeige mit Bubble/ITM.
- **Add-on announcement** — Prominent amber banner in the main display (like Bubble/ITM) as soon as the rebuy phase ends. Shows cost and chip bonus. `BubbleIndicator` extended with add-on props, fragment return allows simultaneous display with bubble/ITM.

- **Neue Animation** — `animate-addon-pulse` (amber box-shadow pulse) in `index.css`.
- **New animation** — `animate-addon-pulse` (amber box-shadow pulse) in `index.css`.

- **2 neue Translation-Keys** — `addOn.announcement`, `addOn.announcementDetail` (DE + EN).
- **2 new translation keys** — `addOn.announcement`, `addOn.announcementDetail` (DE + EN).

---

## [1.9.0] – 2026-03-03

### Design Polish — Konsistenz & Verfeinerung

- **Abrundungs-Hierarchie** — Einheitliches System: Container `rounded-2xl` → Cards `rounded-xl` → Buttons/Inputs `rounded-lg` → Badges `rounded-md`/`rounded-full`. Betrifft 10 Komponenten mit insgesamt ~25 Korrekturen.
- **Rounding hierarchy** — Unified system: Container `rounded-2xl` → Cards `rounded-xl` → Buttons/Inputs `rounded-lg` → Badges `rounded-md`/`rounded-full`. Affects 10 components with ~25 corrections total.

- **Border-Standardisierung** — Einheitliche Opacities: `border-gray-700/40` (Standard), `border-gray-600/50` (Hover), `border-gray-700/30` (Sidebar-Trennung). Amber-Borders auf `/40` normalisiert. 12+ Dateien angepasst.
- **Border standardization** — Unified opacities: `border-gray-700/40` (standard), `border-gray-600/50` (hover), `border-gray-700/30` (sidebar separation). Amber borders normalized to `/40`. 12+ files updated.

- **Sekundäre Buttons** — Reset/Restart-Buttons mit `shadow-md shadow-black/15` und `active:scale-[0.97]` für taktiles Feedback aufgewertet.
- **Secondary buttons** — Reset/Restart buttons upgraded with `shadow-md shadow-black/15` and `active:scale-[0.97]` for tactile feedback.

- **Range-Slider Styling** — Custom CSS für `<input type="range">`: Emerald-Gradient-Track, runder Gradient-Thumb mit Glow-Shadow. Webkit + Firefox Pseudo-Elemente.
- **Range slider styling** — Custom CSS for `<input type="range">`: emerald gradient track, round gradient thumb with glow shadow. Webkit + Firefox pseudo-elements.

- **Sidebar-Trennung** — Desktop-Sidebars mit `bg-gray-900/40` Hintergrund und `border-gray-700/30`. Toggle-Buttons von `w-6 h-16` auf `w-7 h-20` vergrößert.
- **Sidebar separation** — Desktop sidebars with `bg-gray-900/40` background and `border-gray-700/30`. Toggle buttons enlarged from `w-6 h-16` to `w-7 h-20`.

- **Focus-States** — Glow-Effekt auf allen Inputs verstärkt: `focus:ring-1 focus:ring-emerald-500/20` → `focus:ring-2 focus:ring-emerald-500/25`. Betrifft 9 Komponenten.
- **Focus states** — Enhanced glow effect on all inputs: `focus:ring-1 focus:ring-emerald-500/20` → `focus:ring-2 focus:ring-emerald-500/25`. Affects 9 components.

- **Tabellen-Rows** — Standings und Bounty-Tabelle in Ergebnissen: `border-b border-gray-800/30`, `hover:bg-gray-800/40`, 1. Platz mit `border-l-2 border-l-amber-400`. Level-Rows im Editor mit Hover-Effekt.
- **Table rows** — Standings and bounty table in results: `border-b border-gray-800/30`, `hover:bg-gray-800/40`, 1st place with `border-l-2 border-l-amber-400`. Level rows in editor with hover effect.

- **Spieler-Rows** — Aktive Spieler mit `hover:border-gray-600/40`. Dealer-Badge mit `ring-2 ring-red-500/30` Glow. Rebuy-Count als Badge (`bg-emerald-900/30 rounded-full`). Eliminierte Spieler stärker abgeblendet (`opacity-40`).
- **Player rows** — Active players with `hover:border-gray-600/40`. Dealer badge with `ring-2 ring-red-500/30` glow. Rebuy count as badge (`bg-emerald-900/30 rounded-full`). Eliminated players more faded (`opacity-40`).

- **Body-Gradient** — Verstärkt auf `0.06` Opacity + zweiter Gradient am unteren rechten Bildschirmrand (`ellipse at 80% 100%`).
- **Body gradient** — Enhanced to `0.06` opacity + second gradient at bottom-right of screen (`ellipse at 80% 100%`).

- **Checkpoint-Banner** — `border-2 border-amber-600/50`, `shadow-lg`, `animate-fade-in`. Restore-Button als Gradient, Dismiss-Button als Ghost-Style.
- **Checkpoint banner** — `border-2 border-amber-600/50`, `shadow-lg`, `animate-fade-in`. Restore button as gradient, dismiss button as ghost style.

- **Card-Hover Glow** — `CollapsibleSection` und `CollapsibleSubSection` Header mit Hover-Shadows (`shadow-lg`/`shadow-md`).
- **Card hover glow** — `CollapsibleSection` and `CollapsibleSubSection` headers with hover shadows (`shadow-lg`/`shadow-md`).

- **Confirm-Dialog** — Cancel subtiler (`bg-gray-800/60`), Confirm mit `shadow-lg shadow-red-900/40`, `border border-red-700/30`, `active:scale-[0.97]`.
- **Confirm dialog** — Cancel more subtle (`bg-gray-800/60`), confirm with `shadow-lg shadow-red-900/40`, `border border-red-700/30`, `active:scale-[0.97]`.

- **22 Dateien geändert** — Rein visuelle/CSS-Änderungen, keine Logik-Modifikationen, keine neuen Dateien, keine neuen Dependencies.
- **22 files modified** — Purely visual/CSS changes, no logic modifications, no new files, no new dependencies.

---

## [1.8.0] – 2026-03-03

### Premium UI — Glassmorphism, Animationen & taktiles Design

- **Glassmorphic Cards** — Setup-Sektionen (`CollapsibleSection`, `CollapsibleSubSection`) mit `backdrop-blur-sm`, weichen Schatten (`shadow-lg shadow-black/20`) und halbtransparenten Backgrounds (`bg-gray-800/40`). Content-Bereiche mit `animate-fade-in`.
- **Glassmorphic cards** — Setup sections (`CollapsibleSection`, `CollapsibleSubSection`) with `backdrop-blur-sm`, soft shadows (`shadow-lg shadow-black/20`) and semi-transparent backgrounds (`bg-gray-800/40`). Content areas with `animate-fade-in`.

- **Timer-Glow** — Signatur-Effekt: Laufender Timer mit pulsierendem `text-shadow` (`animate-timer-glow`). Fortschrittsbalken als Gradient (`from-emerald-600 to-emerald-400`) mit Glow-Shadow. Countdown in Rot mit `animate-countdown-pulse` (ersetzt `animate-pulse`). Blinds mit dezenter `drop-shadow`.
- **Timer glow** — Signature effect: Running timer with pulsing `text-shadow` (`animate-timer-glow`). Progress bar as gradient (`from-emerald-600 to-emerald-400`) with glow shadow. Countdown in red with `animate-countdown-pulse` (replaces `animate-pulse`). Blinds with subtle `drop-shadow`.

- **Taktile Buttons** — Primär-Buttons (Play/Pause) mit `bg-gradient-to-b`, `shadow-lg` und `active:scale-[0.97]`. Sekundär-Buttons mit `shadow-md` und Borders. Tertiär-Buttons mit weicheren Borders und `rounded-lg`.
- **Tactile buttons** — Primary buttons (play/pause) with `bg-gradient-to-b`, `shadow-lg` and `active:scale-[0.97]`. Secondary buttons with `shadow-md` and borders. Tertiary buttons with softer borders and `rounded-lg`.

- **Custom Animationen** — 8 neue `@keyframes` in `index.css`: `fade-in`, `timer-glow`, `countdown-pulse`, `bubble-pulse`, `itm-flash`, `scale-in`, `slide-in-left`, `slide-in-right`. Entsprechende `@utility`-Klassen für Tailwind CSS 4.
- **Custom animations** — 8 new `@keyframes` in `index.css`: `fade-in`, `timer-glow`, `countdown-pulse`, `bubble-pulse`, `itm-flash`, `scale-in`, `slide-in-left`, `slide-in-right`. Corresponding `@utility` classes for Tailwind CSS 4.

- **Modal-Polish** — Confirm-Dialog und TemplateManager: `backdrop-blur-sm`, `animate-scale-in`, `shadow-2xl`, `rounded-2xl`. Sanftere Overlay-Transparenz (`bg-black/60`).
- **Modal polish** — Confirm dialog and TemplateManager: `backdrop-blur-sm`, `animate-scale-in`, `shadow-2xl`, `rounded-2xl`. Softer overlay transparency (`bg-black/60`).

- **Bubble/ITM-Animationen** — `animate-pulse` durch `animate-bubble-pulse` / `animate-itm-flash` ersetzt (custom box-shadow pulsieren). `backdrop-blur-sm`, `rounded-xl`.
- **Bubble/ITM animations** — `animate-pulse` replaced with `animate-bubble-pulse` / `animate-itm-flash` (custom box-shadow pulsing). `backdrop-blur-sm`, `rounded-xl`.

- **Spielmodus-Polishing** — `TournamentStats` mit `backdrop-blur-sm` und Shadows. `PlayerPanel` mit weicheren Borders, Hover-States und `rounded-xl`. `LevelPreview`, `ChipSidebar`, `RebuyStatus` mit dezenten Verbesserungen.
- **Game mode polishing** — `TournamentStats` with `backdrop-blur-sm` and shadows. `PlayerPanel` with softer borders, hover states and `rounded-xl`. `LevelPreview`, `ChipSidebar`, `RebuyStatus` with subtle refinements.

- **Globales Input-Pattern** — Alle Inputs: `bg-gray-800/80`, `border-gray-700/60`, `focus:ring-1 focus:ring-emerald-500/20`, `rounded-lg`, `transition-all duration-200`. Betrifft 10 Komponenten.
- **Global input pattern** — All inputs: `bg-gray-800/80`, `border-gray-700/60`, `focus:ring-1 focus:ring-emerald-500/20`, `rounded-lg`, `transition-all duration-200`. Applies to 10 components.

- **Settings-Polish** — Checkbox-Gradient (`from-emerald-400 to-emerald-600 shadow-sm`). Tastenkürzel-Anzeige mit Keycap-Look (`border shadow-sm`).
- **Settings polish** — Checkbox gradient (`from-emerald-400 to-emerald-600 shadow-sm`). Keyboard shortcuts display with keycap look (`border shadow-sm`).

- **Ergebnisseite** — Winner-Card mit `shadow-xl`, Standings und Info-Boxen mit `shadow-lg`, Share-Button als Gradient mit `active:scale-[0.97]`.
- **Results screen** — Winner card with `shadow-xl`, standings and info boxes with `shadow-lg`, share button as gradient with `active:scale-[0.97]`.

- **Body-Gradient** — Dezenter emerald `radial-gradient` am oberen Bildschirmrand auf `#0a0a0f`-Hintergrund.
- **Body gradient** — Subtle emerald `radial-gradient` at top of screen on `#0a0a0f` background.

- **Header-Redesign** — `bg-gray-900/50 backdrop-blur-sm border-gray-700/30`, Buttons mit Gradients und Shadows.
- **Header redesign** — `bg-gray-900/50 backdrop-blur-sm border-gray-700/30`, buttons with gradients and shadows.

- **23 Dateien geändert** — Rein visuelle/CSS-Änderungen, keine Logik-Modifikationen, keine neuen Dateien.
- **23 files modified** — Purely visual/CSS changes, no logic modifications, no new files.

---

## [1.7.0] – 2026-03-03

### Setup UX: Blindstruktur ausklappbar + Cleanup

- **Blindstruktur ausklappbar** — Die Level-Tabelle (ConfigEditor) ist jetzt in einem `CollapsibleSubSection` gewrappt und standardmäßig eingeklappt. Summary zeigt „12 Levels, 3 Pausen, Ø 15 Min".
- **Collapsible blind structure** — The level table (ConfigEditor) is now wrapped in a `CollapsibleSubSection` and collapsed by default. Summary shows "12 Levels, 3 Breaks, avg 15 Min".

- **BlindGenerator vereinheitlicht** — Eigener interner Toggle durch `CollapsibleSubSection` ersetzt — konsistente Chevrons (▸/▾) und Styling in der gesamten App.
- **BlindGenerator unified** — Internal toggle replaced with `CollapsibleSubSection` — consistent chevrons (▸/▾) and styling throughout the app.

- **Turnier-Grundlagen** — Turnier-Name und Buy-In/Startchips in einer gemeinsamen Karte zusammengefasst. Spart eine Sektion im vertikalen Scroll.
- **Tournament basics** — Tournament name and buy-in/starting chips merged into a single card. Saves one section in vertical scroll.

- **Summary-Badges bei offenen Sektionen** — Summaries werden jetzt auch als dezenter Subtitle angezeigt, wenn die Sektion geöffnet ist. Neue Summaries für Spieler-Sektion und Blindstruktur.
- **Summary badges on open sections** — Summaries are now also shown as subtle subtitles when the section is open. New summaries for players section and blind structure.

- **Sticky Start-Button auf Mobile** — Der „Turnier starten"-Button bleibt auf Mobile am unteren Bildschirmrand sichtbar, unabhängig von der Scroll-Position.
- **Sticky start button on mobile** — The "Start tournament" button stays visible at the bottom of the screen on mobile, regardless of scroll position.

- **3 neue Tests** — `computeBlindStructureSummary` (187 Tests gesamt).
- **3 new tests** — `computeBlindStructureSummary` (187 tests total).

---

## [1.6.0] – 2026-02-27

### Bug-Fixes, Accessibility & Turnier-Checkpoint

- **useTimer-Fix** — Render-Phase-State-Mutation durch `useRef` + `useEffect` ersetzt; vorher wurde `setState` während des Renderings aufgerufen (React-Regelverstoß).
- **useTimer fix** — Render-phase state mutation replaced with `useRef` + `useEffect`; previously `setState` was called during rendering (React rules violation).

- **Tastenkürzel-Fix** — CLAUDE.md dokumentierte falsches Tastenkürzel `P` (previous) statt korrektem `V` (Vorheriges). Korrigiert.
- **Keyboard shortcut fix** — CLAUDE.md documented wrong shortcut `P` (previous) instead of correct `V`. Fixed.

- **Accessibility (a11y)** — Umfassende ARIA-Verbesserungen: `role="progressbar"` auf Timer-Fortschrittsbalken, `aria-live` auf Blinds- und Countdown-Anzeige, `aria-label` auf allen Buttons, `aria-pressed` auf Start/Pause-Toggle, `role="alert"`/`role="status"` auf Bubble/ITM-Banner, `aria-expanded` auf Collapsible-Sections, `role="dialog"` + `aria-modal` + Auto-Focus + Escape-to-Close auf Modals (TemplateManager, Confirm-Dialog).
- **Accessibility (a11y)** — Comprehensive ARIA improvements: `role="progressbar"` on timer progress bar, `aria-live` on blinds and countdown display, `aria-label` on all buttons, `aria-pressed` on start/pause toggle, `role="alert"`/`role="status"` on bubble/ITM banner, `aria-expanded` on collapsible sections, `role="dialog"` + `aria-modal` + auto-focus + escape-to-close on modals (TemplateManager, confirm dialog).

- **Turnier-Checkpoint** — Automatisches Speichern des Spielstands bei jeder Aktion im Spielmodus (Level, Restzeit, Config, Settings). Bei App-Neustart erscheint ein Wiederherstellungs-Banner im Setup: „Turnier fortsetzen" lädt den Spielstand mit pausiertem Timer, „Verwerfen" löscht den Checkpoint. Checkpoint wird automatisch gelöscht wenn das Turnier endet oder der User zum Setup zurückkehrt.
- **Tournament checkpoint** — Auto-save game state on every action in game mode (level, remaining time, config, settings). On app restart, a recovery banner appears in setup: "Resume tournament" loads the game state with paused timer, "Dismiss" clears the checkpoint. Checkpoint is automatically cleared when the tournament ends or the user returns to setup.

---

## [1.5.0] – 2026-02-27

### Usability & Progressive Disclosure

- **Aufklappbare Setup-Sektionen** — Neue `CollapsibleSection`-Karten-Komponente: Essentielle Bereiche (Spieler, Buy-In, Blindstruktur) standardmäßig offen, optionale Bereiche (Chip-Werte, Auszahlung, Turnier-Format) eingeklappt mit kompaktem Summary-Text. Deutlich weniger Scrollen im Setup.
- **Collapsible setup sections** — New `CollapsibleSection` card component: Essential sections (Players, Buy-In, Blind Structure) open by default, optional sections (Chip Values, Payout, Tournament Format) collapsed with compact summary text. Significantly less scrolling in setup.

- **Turnier-Format-Gruppierung** — Rebuy, Add-On und Bounty in einer gemeinsamen „Turnier-Format"-Karte zusammengefasst — logische Gruppierung verwandter Turnierformat-Optionen.
- **Tournament format grouping** — Rebuy, Add-On and Bounty combined into a single "Tournament Format" card — logical grouping of related tournament format options.

- **Summary-Badges** — Eingeklappte Sektionen zeigen kompakte Zusammenfassung: „5 Chips, Color-Up aktiv", „3 Plätze, % Prozent", „Rebuy, Bounty: 5 €" oder „Alles deaktiviert".
- **Summary badges** — Collapsed sections show compact summary: "5 Chips, Color-Up active", "3 places, % Percent", "Rebuy, Bounty: 5 €" or "All disabled".

- **Clean View auf Mobile** — Clean-View-Toggle in der mobilen Button-Leiste im Spielmodus hinzugefügt (neben Spieler/Sidebar-Buttons).
- **Clean view on mobile** — Clean view toggle added to mobile button bar in game mode (alongside Players/Sidebar buttons).

---

## [1.4.0] – 2026-02-27

### Vorlagen, Clean View & Stabilität

- **Einheitlicher Vorlagen-Dialog** — Ein Button „Vorlagen" im Setup vereint alles: Browser-Vorlagen speichern/laden/löschen, als JSON-Datei exportieren/importieren (File System Access API mit nativem Dateidialog, Download-Fallback für Safari/Firefox), und aufklappbare JSON-Import/Export-Sektion für Power-User. Separates Import/Export-Modal entfernt.
- **Unified templates dialog** — One "Templates" button in setup covers everything: save/load/delete browser templates, export/import as JSON files (File System Access API with native dialog, download fallback for Safari/Firefox), and collapsible JSON import/export section for power users. Separate import/export modal removed.

- **Safari-Hinweis** — Automatischer Tipp wenn der Browser keine native Ordnerauswahl beim Speichern unterstützt (Safari → Einstellungen → Download-Ort auf „Nachfragen").
- **Safari hint** — Automatic tip when the browser doesn't support native directory picker for saving (Safari → Settings → download location to "Ask for each download").

- **Editierbarer Color-Up Plan** — Color-Up Zeitpunkte manuell anpassen oder automatisch generieren (Chip Race).
- **Editable color-up schedule** — Manually adjust or auto-generate color-up timing (chip race).

- **Clean View** — Umschalter im Spielmodus blendet Stats, Sidebars und sekundäre Buttons aus — nur Timer, Blinds und Bubble bleiben (Tastenkürzel: F).
- **Clean view** — Toggle in game mode hides stats, sidebars and secondary controls — only timer, blinds and bubble remain (key: F).

- **Auto-Start bei Levelwechsel** — Timer startet automatisch bei Weiter/Zurück.
- **Auto-start on level change** — Timer starts automatically on Next/Previous.

- **Sound-Fix für Safari** — Gemeinsamer AudioContext, initialisiert aus User-Geste (Play/Start), damit Safari Audio nicht blockiert. Custom Checkboxen (grün/grau) statt native accent-color.
- **Sound fix for Safari** — Shared AudioContext initialized from user gesture (Play/Start) so Safari doesn't block audio. Custom checkboxes (green/gray) instead of native accent-color.

- **Timer-Zuverlässigkeit** — Fix für sporadisches Nicht-Starten bei Levelwechsel (eager interval restart).
- **Timer reliability** — Fix for sporadic non-start on level change (eager interval restart).

- **iPad-Kompatibilität** — Build-Target auf Safari 14 / ES2020 angepasst, Lade-Fallback in index.html.
- **iPad compatibility** — Build target set to Safari 14 / ES2020, loading fallback in index.html.

- **Wake Lock** — Bildschirm bleibt während laufendem Timer an (kein Energiesparmodus). Wird bei Tab-Wechsel automatisch neu angefordert.
- **Wake Lock** — Screen stays on during active timer (no sleep mode). Automatically re-acquired on tab focus.

- **Text & i18n** — „Nächstes: Pause" (Grammatik-Fix), Color-Up Banner mit „(Chip Race)", lokalisierte Pause-Labels, aktualisierte Beschreibungen, unbenutzte Translation-Keys entfernt.
- **Text & i18n** — "Next: Break" (grammar fix), color-up banner with "(Chip Race)", localized break labels, updated descriptions, unused translation keys removed.

- **7 neue Tests** — exportTemplateToJSON, parseTemplateFile Round-Trip und Fehlerbehandlung (184 Tests gesamt).
- **7 new tests** — exportTemplateToJSON, parseTemplateFile round-trip and error handling (184 tests total).

- **Cross-Device-Kompatibilität** — Safe Area Insets für Notch-Phones (viewport-fit=cover, env()-Padding), dynamische Viewport-Höhe (100dvh statt 100vh), größere Touch-Targets (Checkboxen 28px, Rebuy-Buttons 32px), numerische Tastatur auf Mobile (inputmode="numeric"), Fullscreen API mit Webkit-Prefix und Error-Guard, Clipboard API abgesichert, localStorage try-catch für Private Browsing, Tablet-Breakpoint (md: ab 768px statt lg: ab 1024px).
- **Cross-device compatibility** — Safe area insets for notched phones (viewport-fit=cover, env() padding), dynamic viewport height (100dvh instead of 100vh), larger touch targets (checkboxes 28px, rebuy buttons 32px), numeric keyboard on mobile (inputmode="numeric"), fullscreen API with webkit prefix and error guard, clipboard API guarded, localStorage try-catch for private browsing, tablet breakpoint (md: from 768px instead of lg: from 1024px).

---

## [1.3.0] – 2026-02-24

### Turnier-Statistiken, Bubble & PWA

- **Turnier-Statistiken** — Live-Anzeige im Spielmodus: Spieleranzahl, Preisgeld, Ø Stack in BB, Spielzeit, geschätzte Restzeit.
- **Tournament statistics** — Live display in game mode: player count, prize pool, avg stack in BB, elapsed time, estimated remaining time.

- **Bubble-Anzeige** — Rot pulsierender „BUBBLE!"-Banner wenn activePlayers === paidPlaces + 1, grüner „In The Money!"-Flash beim Bubble-Burst (5 Sek).
- **Bubble indicator** — Red pulsing "BUBBLE!" banner when activePlayers === paidPlaces + 1, green "In The Money!" flash on bubble burst (5 sec).

- **Bubble/ITM Sounds** — Spannungs-Sound (Sawtooth) bei Bubble, Fanfare (Triangle) bei In The Money.
- **Bubble/ITM sounds** — Tension sound (sawtooth) on bubble, fanfare (triangle) on In The Money.

- **Screenshot/Teilen** — Turnier-Ergebnisse als PNG capturen: Web Share API auf Mobile, Download-Fallback auf Desktop (html-to-image).
- **Screenshot/share** — Capture tournament results as PNG: Web Share API on mobile, download fallback on desktop (html-to-image).

- **PWA** — Progressive Web App mit Manifest, Service Worker, installierbar auf Mobile/Desktop (vite-plugin-pwa).
- **PWA** — Progressive Web App with manifest, service worker, installable on mobile/desktop (vite-plugin-pwa).

- **Turnier-Templates** — Benannte Turnierkonfigurationen speichern/laden/löschen via localStorage.
- **Tournament templates** — Save/load/delete named tournament configurations via localStorage.

- **23 neue Tests** — formatElapsedTime, computeEstimatedRemainingSeconds, computeAverageStackInBB, isBubble, isInTheMoney, Template-CRUD (177 Tests gesamt).
- **23 new tests** — formatElapsedTime, computeEstimatedRemainingSeconds, computeAverageStackInBB, isBubble, isInTheMoney, template CRUD (177 tests total).

---

## [1.2.0] – 2026-02-23

### Blindstruktur-Generator & Chip-Management

- **Blindstruktur-Generator** — 3 Geschwindigkeiten (schnell/normal/langsam) mit eigener BB-Progression, chip-aware Rundung, geschätzte Turnierdauer basierend auf Spieleranzahl.
- **Blind structure generator** — 3 speeds (fast/normal/slow) with distinct BB progressions, chip-aware rounding, estimated tournament duration based on player count.

- **Chip-Blind-Kompatibilitätsprüfung** — Warnung wenn Chip-Werte geändert werden und die Blindstruktur nicht mehr darstellbar ist.
- **Chip-blind compatibility check** — Warning when chip values are changed and the blind structure can no longer be expressed.

- **PresetPicker entfernt** — Blindstrukturen werden jetzt komplett über den Generator erstellt.
- **PresetPicker removed** — Blind structures are now created entirely via the generator.

- **Add-On automatisch deaktiviert** — Wird Rebuy ausgeschaltet, wird Add-On automatisch zurückgesetzt.
- **Add-on auto-disabled** — Disabling rebuy automatically resets add-on.

- **Rebuy-Anzeige** — Nur während aktiver Rebuy-Phase sichtbar.
- **Rebuy indicator** — Only visible during active rebuy phase.

- **Chip-Duplikat-Warnung** — Warnung bei doppelten Chip-Farben.
- **Chip duplicate warning** — Warning for duplicate chip colors.

- **Chip-Auto-Sort** — Automatische Sortierung nach Wertigkeit.
- **Chip auto-sort** — Automatic sorting by value.

- **Color-Up gekoppelt mit Pause** — Chip-Race-Empfehlungen an nächste Pause gekoppelt.
- **Color-up coupled with break** — Chip race recommendations coupled with next break.

---

## [1.1.0] – 2026-02-21

### Features

- **DE/EN Sprachumschaltung (i18n)** — Alle ~170 Texte der App sind in Deutsch und Englisch verfügbar. Im Setup kann zwischen DE und EN gewechselt werden. Die Sprachauswahl wird in localStorage gespeichert und bleibt nach Reload erhalten. Standardsprache ist Deutsch.
- **DE/EN language switching (i18n)** — All ~170 texts are available in German and English. Switch between DE and EN in setup. Language selection is saved in localStorage and persists after reload. Default language is German.

- **Zurück-Button bei Eliminierung** — Der zuletzt eliminierte Spieler kann per "Zurück"-Button wieder ins Turnier aufgenommen werden (Undo bei versehentlicher Eliminierung).
- **Reinstate button for eliminations** — The most recently eliminated player can be reinstated via "Undo" button (undo accidental eliminations).

- **Erweiterte Turnier-Ergebnisübersicht** — Pro Spieler werden Gesamteinzahlung (Buy-In + Rebuys mit Aufschlüsselung), Gewinn, Bounty-Einnahmen und Bilanz (Plus/Minus mit Farbcodierung) angezeigt.
- **Extended tournament results** — Per player: total paid in (buy-in + rebuys with breakdown), winnings, bounty earnings and balance (profit/loss with color coding).

### Verbesserungen / Improvements

- **Größere Blinds-Anzeige / Larger blinds display** — Die aktuelle Blindstufe wird im Timer deutlich größer dargestellt (ca. 80% der Timer-Größe) und ist damit auch aus Entfernung gut lesbar. / The current blind level is displayed much larger in the timer (~80% of timer size), readable from a distance.
- **Default-Spielernamen sprachabhängig / Language-aware default player names** — Beim Sprachwechsel werden Standard-Spielernamen automatisch angepasst (Spieler 1 ↔ Player 1). Benutzerdefinierte Namen bleiben unverändert. / When switching languages, default player names are automatically updated (Spieler 1 ↔ Player 1). Custom names remain unchanged.
- **Poker-Farben im Header / Poker suits in header** — Alle vier Poker-Farben (♠ ♥ ♦ ♣) werden in absteigender Reihenfolge neben dem App- und Turniernamen angezeigt. / All four poker suits (♠ ♥ ♦ ♣) are displayed in descending order around the app and tournament name.
- **Aufgeräumte Ergebnisübersicht / Cleaner results overview** — Pro Spieler werden Buy-In, Rebuys, Bounty gezahlt/erhalten und Bilanz jeweils in eigener Zeile angezeigt. Details sind auf-/einklappbar (Standard: ausgeklappt). / Per player: buy-in, rebuys, bounty paid/earned and balance each on its own line. Details are collapsible (default: expanded).

### Technisch / Technical

- Eigenes leichtgewichtiges i18n-System mit React Context (kein react-i18next) / Custom lightweight i18n system with React Context (no react-i18next)
- Neue Dateien / New files: `src/i18n/translations.ts`, `LanguageContext.tsx`, `useTranslation.ts`, `index.ts`, `LanguageSwitcher.tsx`
- Alle 17 Komponenten + `logic.ts` auf i18n umgestellt / All 17 components + `logic.ts` converted to i18n
- TypeScript-Typsicherheit: `TranslationKey` als Union-Type / TypeScript type safety: `TranslationKey` as union type

---

## [1.0.0] – 2026-02-21

### Features

- Poker-Turnier-Timer mit konfigurierbaren Blind-Stufen und Pausen / Poker tournament timer with configurable blind levels and breaks
- Drei Presets: Turbo (6 Min), Standard (15 Min), Deep Stack (20 Min) / Three presets: Turbo (6 min), Standard (15 min), Deep Stack (20 min)
- Benutzerdefinierte Blind-Strukturen (Levels hinzufügen, bearbeiten, löschen, duplizieren, verschieben) / Custom blind structures (add, edit, delete, duplicate, reorder levels)
- Ante-Unterstützung (optional) mit automatischer Vorbelegung (~12,5% des BB) / Ante support (optional) with auto-population (~12.5% of BB)
- Spielerverwaltung (2–20 Spieler, Namen editierbar) / Player management (2–20 players, editable names)
- Spieler-Eliminierung mit Killer-Auswahl und automatischer Platzierung / Player elimination with killer selection and automatic placement
- Rebuy-System (optional, konfigurierbar nach Levels oder Zeit) / Rebuy system (optional, configurable by levels or time)
- Bounty-System (optional, konfigurierbarer Betrag pro Knockout) / Bounty system (optional, configurable amount per knockout)
- Auszahlungsstruktur mit automatischem Vorschlag / Payout structure with automatic suggestion
- Import/Export der Turnierkonfiguration als JSON / Import/export tournament configuration as JSON
- Countdown-Warnung mit Beeps (letzte 10 Sekunden) / Countdown warning with beeps (last 10 seconds)
- Sieges-Melodie bei Turniergewinn / Victory melody when tournament is won
- Vollbild-Modus / Fullscreen mode
- Tastenkürzel (Space, N, V, R) / Keyboard shortcuts (Space, N, V, R)

### Technisch / Technical

- React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4
- 82 Unit-Tests (Vitest) / 82 unit tests (Vitest)
- CI/CD via GitHub Actions (Lint + Test + Build + Deploy)
- Sound via Web Audio API
- Persistenz via localStorage / Persistence via localStorage
