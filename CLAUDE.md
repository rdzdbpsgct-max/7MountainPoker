# CLAUDE.md — 7Mountain Poker

## Project Overview

Poker tournament timer — a fully client-side React/TypeScript SPA for managing home poker tournaments. Handles blind levels, timers, player tracking, rebuys, bounties, chip management, and payouts. No server required, all data persisted in IndexedDB (with localStorage fallback).

**Version**: 6.11.1
**Live**: Deployed to [GitHub Pages](https://rdzdbpsgct-max.github.io/7MountainPoker/) and [Vercel](https://7mountainpoker.vercel.app/)

## Tech Stack

- **React 19** with TypeScript (~5.9) in strict mode
- **Vite 7** — build tool and dev server
- **Tailwind CSS 4** — utility-first styling via Vite plugin (no separate CSS files)
- **Vitest** — unit testing with `@testing-library/react` and `jsdom`
- **ESLint 9** — flat config with typescript-eslint, react-hooks, react-refresh plugins
- **No external state library** — React hooks + props + Context (i18n, theme)
- **No CSS-in-JS** — pure Tailwind utility classes + custom `@keyframes`, `@utility`, CSS custom properties, and body gradient in `index.css`

## Commands

```bash
npm run dev          # Start dev server (http://localhost:5173/)
npm run build        # TypeScript compile + Vite bundle → dist/
npm run lint         # ESLint check
npm run test         # Vitest run (1360 tests, single run)
npm run test:watch   # Vitest in watch mode
npm run preview      # Preview production build locally
```

**CI/CD pipelines**:
- **GitHub Pages** (`.github/workflows/deploy.yml`): install → lint → test → build (with `VITE_BASE_PATH=/7MountainPoker/`) → deploy to GitHub Pages (Node 20)
- **Vercel**: Auto-deploy on push to `main`, builds with default base `/`

## Project Structure

```
src/
├── App.tsx                      # Root component: game mode, central state, timer, keyboard shortcuts
├── main.tsx                     # React entry point, wraps app in ThemeProvider + LanguageProvider
├── index.css                    # Tailwind base imports, @keyframes animations, @utility classes, CSS custom properties, body gradient
├── components/                  # UI components (one export per file)
│   ├── AddOnEditor.tsx          # Add-On config (requires Rebuy, auto-disable)
│   ├── BlindGenerator.tsx       # Blind structure generator (3 speeds, chip-aware)
│   ├── BountyEditor.tsx         # Bounty config: fixed amount or mystery bounty pool
│   ├── ChevronIcon.tsx          # Reusable SVG chevron with rotation animation
│   ├── ChipEditor.tsx           # Chip denomination management, editable color-up schedule
│   ├── ChipSidebar.tsx          # Game-mode chip info, next color-up display
│   ├── CollapsibleSection.tsx   # Reusable collapsible card for setup sections
│   ├── CollapsibleSubSection.tsx # Lighter collapsible for nesting inside cards
│   ├── CallTheClock.tsx          # Call-the-Clock shot clock modal
│   ├── ConfigEditor.tsx         # Blind level table editor
│   ├── Controls.tsx             # Play/Pause/Next/Prev/Reset/Restart buttons
│   ├── display/                 # TV/Projector display subfolder
│   │   ├── DisplayMode.tsx      # Main orchestrator — timer + rotating screens
│   │   ├── PlayersScreen.tsx    # Active players grid
│   │   ├── StatsScreen.tsx      # Tournament statistics
│   │   ├── PayoutScreen.tsx     # Payout places display
│   │   ├── ScheduleScreen.tsx   # Blind schedule table
│   │   ├── ChipsScreen.tsx      # Chip denominations display
│   │   ├── SeatingScreen.tsx    # SVG oval poker table seating diagram
│   │   ├── LeagueScreen.tsx      # League standings display for TV mode
│   │   ├── CrossDeviceDisplay.tsx  # PeerJS-based cross-device display client
│   │   └── index.ts             # Barrel export
│   ├── AppHeader.tsx            # App header: mode toggle, clock, theme/language/voice switchers, feature gates
│   ├── FeatureGateModal.tsx     # Modal for locked features (freemium paywall)
│   ├── ErrorBoundary.tsx        # React error boundary with reload fallback
│   ├── LanguageSwitcher.tsx     # DE/EN toggle
│   ├── LoadingFallback.tsx      # Suspense fallback with animated pulse dots
│   ├── MultiTablePanel.tsx      # Game-mode multi-table panel with balancing and moves
│   ├── PrintView.tsx            # Print-optimized blind structure for window.print()
│   ├── LeagueManager.tsx        # League CRUD, leaderboard, export
│   ├── LeagueView.tsx           # Dedicated league mode — standings, game days, finances, corrections
│   ├── LeagueStandingsTable.tsx  # Sortable league standings with financial data, QR sharing
│   ├── LeagueGameDays.tsx        # League game day list with expandable details
│   ├── LeagueFinances.tsx        # League financial overview — per game day and cumulative
│   ├── DealMaker.tsx             # Deal-Making / Chop Calculator modal (ICM, Chip, Even)
│   ├── GameDayEditor.tsx         # Manual game day entry modal with player management
│   ├── LeagueCharts.tsx           # SVG line charts for league trends (points, placement, balance)
│   ├── LeagueCreationModal.tsx   # League creation modal — name, point system presets, ranking algorithm
│   ├── LeagueSettings.tsx        # League settings — tiebreaker config, seasons, point system (with presets)
│   ├── LeaguePlayerDetail.tsx    # League player detail stats modal
│   ├── HeadToHeadMatrix.tsx      # NxN heatmap table for league player win-loss records
│   ├── SeriesManager.tsx         # Tournament series CRUD modal with standings and export
│   ├── CustomAudioEditor.tsx     # Drag & drop audio upload + announcement mapping editor
│   ├── IcmCalculator.tsx        # ICM Calculator modal (Malmuth-Harville equity, lazy-loaded)
│   ├── LevelPreview.tsx         # Next-level sidebar
│   ├── NumberStepper.tsx        # Custom +/- stepper with long-press support
│   ├── PayoutEditor.tsx         # Prize distribution config
│   ├── PlayerManager.tsx        # Add/edit/delete/seat players with drag & drop + autocomplete
│   ├── PlayerPanel.tsx          # Active players, elimination, bounty tracking
│   ├── RebuyEditor.tsx          # Rebuy limit config
│   ├── RebuyStatus.tsx          # Rebuy active indicator
│   ├── BubbleIndicator.tsx      # Bubble / In The Money visual banner
│   ├── SetupPage.tsx            # Setup mode UI — collapsible sections, config editors, audio settings, start button
│   ├── SetupWizard.tsx          # Guided first-time setup wizard (6 steps)
│   ├── HelpCenter.tsx           # In-app help center — bilingual guide, FAQ, keyboard shortcuts
│   ├── RemoteControl.tsx        # PeerJS remote control — host QR modal + smartphone controller UI
│   ├── ShareHub.tsx              # Central share/display/connect modal with QR codes
│   ├── SettingsPanel.tsx        # Quick-access sound/volume, auto-advance, fullscreen, call-the-clock, accent color, background, TV screen config
│   ├── SidePotCalculator.tsx    # Side pot calculator modal for all-in situations
│   ├── TemplateManager.tsx      # Save/load/delete tournament templates, JSON import/export
│   ├── ThemeSwitcher.tsx        # System/Light/Dark 3-way toggle
│   ├── VoiceSwitcher.tsx        # Sound/Voice segmented toggle in header
│   ├── TimerDisplay.tsx         # Main timer, blinds display, progress bar
│   ├── TournamentLog.tsx        # Tournament event log modal — filter, copy, i18n formatted events
│   ├── TournamentFinished.tsx   # Results & payout display with screenshot/share/text-copy/CSV/QR + event log tab
│   ├── SharedLeagueView.tsx      # Shared league standings from QR code
│   ├── SharedResultView.tsx     # Read-only modal for QR-shared tournament results
│   ├── TournamentHistory.tsx    # Tournament history modal with standings, player stats, export
│   ├── Toast.tsx                # Lightweight toast notification system (portal-based, auto-dismiss)
│   ├── TournamentStats.tsx      # Live stats bar (players, prizepool, avg BB, time)
│   └── modes/                   # Mode container components (extracted from App.tsx)
│       ├── GameModeContainer.tsx         # Game mode orchestrator
│       ├── LeagueModeContainer.tsx       # League mode container
│       ├── SetupModeContainer.tsx        # Setup mode container
│       └── TournamentFinishedContainer.tsx # Tournament finished container
├── domain/                      # Business logic (no React imports)
│   ├── types.ts                 # All TypeScript interfaces and type aliases
│   ├── logic.ts                 # Barrel re-exports from all domain modules
│   ├── helpers.ts               # ID generators, snapSpinnerValue
│   ├── format.ts                # formatTime, formatElapsedTime, getLevelLabel, getBlindsText
│   ├── timer.ts                 # computeRemaining, advanceLevel, previousLevel, resetCurrentLevel
│   ├── blinds.ts                # Blind structure generation, ante calculation, duration estimates
│   ├── players.ts               # Player management, stacks, bubble detection
│   ├── chips.ts                 # Chip denominations, color-up, compatibility checks
│   ├── validation.ts            # Config validation, rebuy/late-reg checks
│   ├── tournament.ts            # Results, payouts, stats, CSV/text export, league standings, mystery bounty
│   ├── storage.ts               # Cache-First IndexedDB storage layer, migration, in-memory cache
│   ├── persistence.ts           # Barrel re-export from 5 focused sub-modules (config, templates, history, players, leagues)
│   ├── configPersistence.ts     # Default configs, config parsing, presets, config/settings/checkpoint persistence, wizard
│   ├── templatePersistence.ts   # Tournament template CRUD, JSON file export/import
│   ├── historyPersistence.ts    # Tournament history CRUD, player import from history
│   ├── playerDatabase.ts        # Persistent player name database CRUD, sync from tournaments
│   ├── leaguePersistence.ts     # League CRUD, league config extraction, league JSON export/import
│   ├── league.ts                 # League domain logic — game days, standings, finances, tiebreaker, QR
│   ├── tables.ts                # Multi-table management: seat-level CRUD, distribution, balancing, dissolution, final table merge, per-table dealer
│   ├── series.ts                # Tournament series management: CRUD, 3 ranking modes, standings, text/CSV/JSON export
│   ├── customAudio.ts           # Custom audio file management: upload, mapping to announcements, playback integration
│   ├── pdfExport.ts             # PDF export for tournament results (jsPDF + jspdf-autotable)
│   ├── tournamentEvents.ts       # Tournament event creation, filtering, i18n-aware text formatting
│   ├── toast.ts                  # Toast notification context and hook (useToast)
│   ├── helpContent.ts            # Bilingual help content data — sections, FAQ, keyboard shortcuts
│   ├── displayChannel.ts         # BroadcastChannel communication for TV display window
│   ├── displayLayouts.ts         # Display layout variants (Standard, Compact, Timer-Only, Ultra Large)
│   ├── platform.ts               # Platform detection utility (detectPlatform, detectDesktopOS)
│   ├── presentationApi.ts        # Presentation API progressive enhancement for second-screen
│   ├── remote.ts                # PeerJS-based remote control (host + controller, signaling via PeerJS Cloud)
│   ├── sounds.ts                # Web Audio API sound effects (beeps, victory, bubble, ITM)
│   ├── speech.ts                # Voice announcements — ElevenLabs MP3 (German) + Web Speech API fallback
│   ├── audioPlayer.ts           # MP3 playback engine — sequential file playback with timeout fallbacks
│   ├── audioService.ts          # AudioService facade — centralized volume/language sync across sound modules
│   ├── undoStack.ts             # Immutable undo/redo stack (UndoStack class, max 30 depth, createUndoSnapshot)
│   ├── icm.ts                   # ICM Calculator — Malmuth-Harville equity (exact ≤10, Monte Carlo >10)
│   ├── cloudExport.ts           # Cloud Export — JSON/CSV/text, Web Share API, File System Access API
│   ├── entitlements.ts          # Feature gate / freemium entitlement checks, feature discovery
│   ├── monetizationTelemetry.ts # Telemetry for feature access and trial usage
│   ├── proBlueprint.ts          # Pro tier feature definitions
│   ├── recovery.ts              # Error recovery and fallback strategies
│   └── startValidation.ts       # Pre-tournament start validation
├── hooks/
│   ├── useTimer.ts              # Drift-free timer hook (wall-clock based, 100ms tick)
│   ├── useVoiceAnnouncements.ts # Voice announcement effects (extracted from App.tsx)
│   ├── useGameEvents.ts         # Game event effects: victory, bubble, ITM sounds
│   ├── useKeyboardShortcuts.ts  # Keyboard shortcut handler (extracted from App.tsx)
│   ├── useTournamentActions.ts  # Tournament action callbacks (extracted from App.tsx)
│   ├── useRemoteControl.ts     # Remote control state management hook (PeerJS)
│   ├── useFeatureGate.ts       # Feature gate hook (entitlement checks)
│   ├── usePrintViewWarmup.ts   # Warm-up print view for faster capture
│   ├── useRemoteHostBridge.ts  # Remote host bridge communication
│   ├── useSharedPayloads.ts    # Shared payload management across modes
│   ├── useDisplaySession.ts      # Host-side PeerJS display broadcast to connected peers
│   ├── useTournamentModeTransitions.ts # Tournament mode transition logic
│   ├── useGameComputedState.ts  # Extracted computed game state from App.tsx
│   ├── useTournamentEventLog.ts # Tournament event log state + effects
│   ├── useCheckpointManager.ts  # Checkpoint auto-save management
│   ├── useDisplayBridge.ts      # Display bridge (BroadcastChannel + PeerJS)
│   ├── useWakeLock.ts           # Wake Lock API wrapper
│   ├── useConfirmDialog.ts      # Confirm dialog state management
│   ├── useEntitlements.ts        # Entitlements state + 11 canUse* feature-gate flags
│   ├── useGameUiState.ts         # Game-mode UI state (lastHand, handForHand, dealerBadges, sidePot, tableMoves, addOnEndLevel)
│   ├── useUndoManager.ts         # Undo/Redo stack management (push, undo, redo callbacks)
│   ├── useOnlineStatus.ts       # Online/offline detection
│   └── useInstallPrompt.ts      # PWA install prompt
├── theme/                       # Dark/Light mode system
│   ├── index.ts                 # Public re-exports
│   ├── ThemeContext.tsx          # React Context provider, system preference listener, localStorage persistence
│   ├── themeContextValue.ts     # Context value type + ThemeMode type
│   └── useTheme.ts              # Hook: mode, setMode, resolved
├── monitoring/                  # Error tracking
│   └── initSentry.ts           # Sentry initialization (idle-loaded in production)
└── i18n/                        # Lightweight custom i18n (no react-i18next)
    ├── index.ts                 # Public re-exports
    ├── LanguageContext.tsx       # React Context provider, localStorage persistence
    ├── languageContextValue.ts  # Context value type
    ├── translations.ts          # DE/EN translation strings (~700 keys per language)
    └── useTranslation.ts        # Hook: t(key, params) + language state

tests/
├── logic.test.ts                # 711 unit tests for domain logic + PeerJS remote control + undo/redo + ICM + cloud export + series + prizepool + side-pots + license + payout rounding
├── components.test.tsx          # 117 UI component tests (NumberStepper, CollapsibleSection, PrintView, CallTheClock, BubbleIndicator, RebuyStatus, ChevronIcon, CollapsibleSubSection, LanguageSwitcher, ThemeSwitcher, ErrorBoundary, useTimer, useConfirmDialog, LoadingFallback, ConfigEditor, SettingsPanel, PlayerPanel, TournamentLog)
├── edge-cases.test.ts           # 101 edge case tests (timer, blinds, players, multi-table, format, tournament, validation, helpers)
├── events.test.ts               # 52 tournament event creation, filtering, i18n formatting tests
├── integration.test.ts          # 51 cross-module integration tests (checkpoint, timer, config compat, tournament flow, league, audio)
├── tournamentActions.test.tsx   # 41 useTournamentActions hook tests
├── sound-speech.test.ts         # 41 sound effects + speech announcement + AudioBuffer cache tests
├── league-advanced.test.ts      # 31 league advanced tests (tiebreaker, ELO, weighted points, H2H, extended standings)
├── controls.test.tsx            # 26 Controls component tests (buttons, callbacks, ARIA, break controls)
├── hooks.test.tsx               # 25 useKeyboardShortcuts + useGameEvents tests
├── persistence.test.ts          # 25 config/settings/checkpoint save/load round-trips
├── i18n.test.ts                 # 24 i18n key parity, parameters, placeholder consistency, quality
├── display-channel.test.ts      # 19 BroadcastChannel serialization + communication tests
├── hooks-phase1.test.tsx        # 19 useVoiceAnnouncements + phase transition hook tests
├── alertEngine.test.ts          # 18 alert engine tests (createDefaultAlert, interpolateAlertText, shouldFireAlert)
├── entitlements.test.ts         # 12 feature gate / entitlement tests
├── startValidation.test.ts      # 11 pre-tournament start validation tests (collectStartErrors)
├── a11y.test.tsx                # 6 automated WCAG accessibility tests (axe-core)
├── toast.test.ts                # 6 toast notification system tests
├── monetizationTelemetry.test.ts # 3 monetization telemetry tests
├── recovery.test.ts             # 3 error recovery tests
└── setup.ts                     # Test setup: jest-dom matchers, matchMedia mock, fake-indexeddb

public/
├── favicon.svg                  # Spade symbol favicon
├── pwa-192x192.png              # PWA icon 192×192
└── pwa-512x512.png              # PWA icon 512×512 (+ maskable)
```

## Architecture & Patterns

### State Management
- **App.tsx** owns all tournament state (config, settings, mode) via `useState`
- **useTimer** hook manages timer state with drift-free wall-clock computation
- **Props drilling** for passing state and callbacks to child components; large components use **grouped prop objects** (e.g., `GameModeContainer` receives `state: GameModeState`, `ui: GameModeUiState`, `actions: GameModeActions` instead of 51 flat props)
- **React Context** for i18n (language selection) and theme (dark/light mode)
- **Storage**: Cache-First IndexedDB architecture (see Storage Architecture below). Simple values remain in localStorage: `poker-timer-theme`, `poker-timer-language`, `poker-timer-accent`, `poker-timer-bg`, `poker-timer-wizard-completed`, `poker-timer-migrated`

### Component Conventions
- Functional components with hooks only (no class components)
- Props interface defined as `Props` type above each component
- Destructured props in function signature: `export function Foo({ bar, baz }: Props)`
- Single named export per file (no default exports)
- `useCallback` for stable handler references, `useMemo` for derived values

### Domain Logic Separation
- `src/domain/` contains pure business logic with no React dependencies
- `src/domain/types.ts` — all shared types (`Level`, `TournamentConfig`, `Player`, `Settings`, `TimerState`, `League`, `PointSystem`, `LeagueStanding`, etc.)
- `src/domain/logic.ts` — barrel re-export file; actual logic split into 15 focused modules:
  - `storage.ts` (IndexedDB cache layer, migration), `helpers.ts` (ID generators, spinner rounding), `format.ts` (time/level formatting), `timer.ts` (level navigation, elapsed time), `blinds.ts` (blind generation, ante calculation), `players.ts` (player management, stacks, bubble), `chips.ts` (chip denominations, color-up), `validation.ts` (config validation, rebuy/late-reg checks), `tournament.ts` (results, payouts, stats, export, league standings, mystery bounty), `persistence.ts` (config parsing, templates, player database, league management, wizard), `tables.ts` (multi-table management, balancing, final table merge), `undoStack.ts` (undo/redo snapshots), `icm.ts` (ICM equity calculation), `cloudExport.ts` (unified export), `audioService.ts` (audio facade)
- All imports use `from '../domain/logic'` (barrel) — no direct module imports needed

### Storage Architecture (v6.0.0)
- **Cache-First**: In-memory cache populated from IndexedDB on app start (~50ms)
- **Reads**: Synchronous from cache — `getCached('history')`, `getCached('config')`, etc.
- **Writes**: Synchronous cache update + async fire-and-forget IndexedDB persist — `setCached()`, `setCachedItem()`, `deleteCachedItem()`
- **Init**: `initStorage()` in `main.tsx` before React mount — only async point
- **Migration**: On first run, copies 8 localStorage keys → IndexedDB, sets `poker-timer-migrated` flag, deletes migrated keys
- **Fallback**: If IndexedDB unavailable → localStorage-only mode (same API, no code changes)
- **IndexedDB schema** (`poker-timer-db`, v4): 3 singleton stores (config, settings, checkpoint) + 9 collection stores (templates, history, players, leagues, gameDays, events, series, customAudio, audioMappings — keyPath: `id`)
- **localStorage retains**: `poker-timer-theme`, `poker-timer-language`, `poker-timer-accent`, `poker-timer-bg`, `poker-timer-wizard-completed`, `poker-timer-migrated`

### i18n
- Two languages: German (DE, default) and English (EN)
- `useTranslation()` hook returns `{ t, language, setLanguage }`
- `t('key')` or `t('key', { n: 5 })` for parameterized strings (template vars: `{n}`, `{place}`, etc.)
- All user-facing strings must go through `t()` — no hardcoded UI text

### Feature Gating & Entitlements (v6.9.8)
- **3-Tier Model**: `free` → `premium` → `pro` (defined in `entitlements.ts`)
- **Default tier**: `'premium'` — all features available. Controlled via `VITE_APP_TIER` env var (or `loadEntitlements()` from localStorage). To activate gating: set `VITE_APP_TIER=free` in Vercel/`.env.local`
- **12 Premium features**: `tvDisplay`, `remoteControl`, `league`, `multiTable`, `sidePot`, `customAccent`, `customBackground`, `customLayout`, `customAudio`, `pdfExport`, `series`, `icmCalculator` — all gated via `isFeatureAvailable(feature, entitlements)`
- **Gate checks in App.tsx**: `canUseTVDisplay`, `canUseRemoteControl`, `canUseLeagueMode`, `canUseMultiTable`, `canUseSidePot`, `canUseCustomAccent`, `canUseCustomBackground`, `canUseCustomLayout`, `canUseCustomAudio`, `canUseSeries`, `canUseIcm` — `useMemo` based on entitlements
- **Gate UI flow**: Button click → `canUse*` check → if false: `openFeatureGate(feature)` shows `FeatureGateModal` → "Upgrade" opens `LicenseActivation` modal → if true: normal action
- **Gate prop threading**: App.tsx → SetupModeContainer → SetupPage (multiTable); App.tsx → GameModeContainer → PlayerPanel (sidePot); App.tsx → GameModeContainer → SettingsPanel (customAccent/Background/Layout); GameModeContainer safety-guards MultiTablePanel render
- **License Key System**: HMAC-SHA256 signed keys (`7MP-TIER-EXPIRY-SIGNATURE`), offline-verifiable via Web Crypto API. `license.ts` domain module, `LicenseActivation.tsx` modal, `scripts/generate-license.mjs` CLI generator. Keys stored in `poker-timer-license` localStorage. Activation immediately updates entitlements (reactive `useState`)
- **Free tier defaults**: Emerald accent only, none/felt-green backgrounds, standard display layout. All 5 core features (TV, Remote, Liga, Multi-Table, Side-Pot) gated. Custom Audio, Series, ICM gated
- **Feature Discovery**: `markFeatureDiscovered(feature)` called at all premium feature entry points — persisted in localStorage
- **Usage Telemetry**: `trackFeatureUsed(feature, context)` called at premium feature usage points
- **Session Telemetry**: `trackSessionStarted()` called once per page load in `main.tsx`
- **Pro tier** (future): `cloudBackup`, `teamRoles`, `multiEvent` — defined in `proBlueprint.ts`, requires backend

### Styling
- Tailwind utility classes + custom `@keyframes` and `@utility` in `index.css` — no CSS modules, no CSS-in-JS
- **Dark/Light mode**: `@custom-variant dark (&:is(.dark *))` in `index.css`; class-based via `.dark` on `<html>`; every component uses `dark:` variants (e.g., `bg-gray-100/80 dark:bg-gray-800/40`)
- Light theme: `#f9fafb` body, `#111827` text. Dark theme: `#0a0a0f` body with subtle emerald radial-gradient, `#e5e7eb` text
- CSS custom properties: `--timer-glow-color` / `--timer-glow-color-strong` for theme-aware animation colors
- Color palette: accent color (active/success, user-selectable), amber (breaks/warnings), red (danger/elimination)
- Glassmorphism: `backdrop-blur-sm`, soft shadows (`shadow-lg shadow-gray-300/30 dark:shadow-black/20`), semi-transparent backgrounds
- Buttons: `bg-gradient-to-b` for tactile feel, `active:scale-[0.97]` feedback, `shadow-lg` depth
- Animations: `animate-fade-in` (content), `animate-timer-glow` (running timer), `animate-countdown-pulse`, `animate-scale-in` (modals), `animate-bubble-pulse`/`animate-itm-flash`/`animate-addon-pulse`
- Design system hierarchy: Rounding (`rounded-2xl` > `rounded-xl` > `rounded-lg` > `rounded-md`), borders (`border-gray-200 dark:border-gray-700/40` standard), focus (`ring-2 ring-emerald-500/25`)
- Inputs: Global pattern — `bg-white dark:bg-gray-800/80`, `border-gray-300 dark:border-gray-700/60`, `focus:ring-2 focus:ring-emerald-500/25`, `rounded-lg`
- NumberStepper: Custom `+`/`-` buttons with long-press support (400ms delay, 100ms repeat), replaces native number input spinners
- Scrub slider: Custom `ScrubSlider` component in `TimerDisplay.tsx` — mirrors progress bar styling (emerald/amber gradient, glow thumb, pointer events for drag)
- Responsive: mobile-first, `sm:` and `lg:` breakpoints, flex layouts
- No component library (fully custom UI)

## Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| Components | PascalCase | `TimerDisplay`, `PlayerPanel` |
| Functions | camelCase | `computeRemaining`, `validateConfig` |
| Types/Interfaces | PascalCase | `TournamentConfig`, `TimerState` |
| Files | Match export name | `TimerDisplay.tsx`, `logic.ts` |
| Translation keys | dot.separated | `setup.players.title`, `game.timer.paused` |
| localStorage keys | kebab-case | `poker-timer-config` |

## Key Implementation Details

- **Drift-free timer**: Uses `Date.now()` wall-clock timestamps, not interval counters
- **Sound**: Web Audio API oscillators — no external audio files. Sound functions return Promises for precise voice coordination (victory: 1700ms, bubble: 1450ms, ITM: 700ms)
- **Voice announcements**: Triple-fallback system — ElevenLabs pre-recorded MP3s (German: Ava, English: voice `xctasy8XvGp2cVO9HL9k`), HTMLAudioElement fallback, Web Speech API (`speechSynthesis`) as last resort. 295 MP3 files per language in `public/audio/de/` and `public/audio/en/` (590 total, PWA-cached for offline use). `audioPlayer.ts` handles gapless sequential MP3 playback via Web Audio API with trailing-silence trimming, falls back to HTMLAudioElement for maximum browser compatibility; `speech.ts` unified queue supports both `audio` and `speech` items. Manifest-based file lookup (110 blind pairs, 20 ante values, 25 levels, 30 break durations 1–30 min) determines MP3 availability; falls back to Web Speech API for missing files or dynamic content (player names, mystery bounty amounts). `VoiceSwitcher` header toggle (sound-only / voice). Announces: tournament start ("Shuffle up and deal!"), level changes, breaks (start + 30s warning + break over), 5-minute warning, last hand (before break / end of level), bubble, dynamic player count milestones (based on paid places — announces from paidPlaces down to 3 + heads-up), ITM, eliminations, rebuy taken, tournament winner (personalized with name), add-on, rebuy end, color-up (+ next-break warning), timer paused/resumed, mystery bounty draw, call the clock (start + expired), late registration closed, table moves (MP3 intro + speech details), table dissolution (MP3 intro + speech details), final table. Verbal countdown for last 10 seconds (play levels only, beeps during breaks). Sound effects finish before voice starts (delay-based coordination).
- **Keyboard shortcuts** (in App.tsx): Space (play/pause), N (next level), V (previous), R (reset), F (clean view toggle), L (last hand toggle), T (TV display mode toggle), H (hand-for-hand toggle), C (call the clock), Cmd+Z (undo), Cmd+Shift+Z (redo)
- **TV Display Mode**: Dedicated fullscreen overlay (`DisplayMode.tsx`) optimized for projectors/TVs at 3+ meter distance. Split-layout: **Timer always visible** (top ~55% — level label, blinds, countdown, progress bar, next level preview, banners) + **8 rotating secondary screens** (bottom ~45% — Players → Stats → Payout → Blind Schedule → Chips → Seating → League → Side-Pots, every 15 seconds). Players screen: active grid with CL badge, rebuys, eliminated compact. Stats screen: prizepool, active players, avg BB, elapsed/remaining, rebuys, add-ons, bounty pool. Payout screen: places with amounts, medal emojis top 3, bubble indicator. Dark background, large timer (8rem). Manual navigation via arrow keys. Indicator dots for secondary screens. Exit via T/Escape. Lazy-loaded (~13.5 KB chunk). 📺 button in header during game mode.
- **Ante calculation**: Two modes — Standard (~12.5% of big blind, rounded to "nice" values) or Big Blind Ante (BBA, ante = big blind). Toggle in setup when ante is enabled. `AnteMode` type in `types.ts`
- **Blind structure generator**: 3 speeds (fast/normal/slow) with distinct BB progressions scaled from 20k reference; chip-aware rounding via `roundToChipMultiple()` when denominations are active
- **Chip management**: Editable color-up schedule with auto-suggestion; color-up events coupled with next break; duplicate color warnings; auto-sort by value
- **Chip-blind compatibility**: `checkBlindChipCompatibility()` detects blind values not expressible with current chip denominations
- **Duration estimates**: Factor in player count to estimate realistic tournament length
- **Import/export**: Full config as JSON with backward compatibility for old formats (integrated into TemplateManager)
- **Tournament templates**: Save/load/delete named configs via localStorage or local JSON files (File System Access API with download fallback)
- **Clean View**: Toggle to hide stats, sidebars, and secondary controls during game (keyboard: F)
- **Auto-start on level jump**: Timer automatically starts when pressing Next/Previous level
- **Bubble detection**: `isBubble()` and `isInTheMoney()` based on active players vs paid places; `BubbleIndicator` also shows Add-On announcement banner (amber, center-screen) when rebuy phase ends — with break: shown during break + next level (timer runs); without break: timer pauses automatically for add-on
- **Hand-for-Hand mode**: Manual toggle (keyboard: H) during bubble phase. Activates pause/resume cycle — timer pauses, user clicks "Next Hand" to resume, manually pauses after each hand. Red banner in BubbleIndicator and DisplayMode. Voice announcement on activation. Auto-deactivates when bubble bursts.
- **Stack Tracking**: Optional per-player `chips` field in Player interface. "Initialize stacks" button in PlayerPanel computes starting chips + rebuys + add-ons. Inline number input for editing stacks. Chip Leader badge ("C" amber circle). Auto-adjusts on rebuy/add-on/elimination. `initializePlayerStacks()`, `findChipLeader()`, `computeAverageStackFromPlayers()` in logic.ts.
- **Tournament stats**: Live display of players, prizepool, avg stack in BB, elapsed/remaining time
- **Dark/Light mode**: 3-way toggle (System/Light/Dark) in header; `ThemeProvider` manages mode + system preference listener + `dark` class on `<html>`; `useTheme()` hook; `poker-timer-theme` in localStorage; PWA `theme-color` meta tag updated dynamically
- **Code splitting**: Game-mode components lazy-loaded via `React.lazy()` + `Suspense`; `html-to-image` dynamically imported only when capturing screenshots; main bundle ~606KB + game chunks (incl. RemoteControl ~9KB)
- **SVG Chevrons**: `ChevronIcon` component with CSS rotation animation replaces Unicode triangles for collapsible sections
- **NumberStepper**: Custom `+`/`-` stepper component replaces native number input spinners; long-press support via pointer events (400ms delay, 100ms repeat); optional `snap` function; used across all numeric inputs in setup
- **Screenshot/share**: `html-to-image` (dynamic import) capture → Web Share API (mobile) or PNG download (desktop); theme-aware background color
- **QR codes**: Two QR codes on TournamentFinished screen — App-URL (static, Vercel link) and tournament result data (compact pipe-delimited format in URL hash `#r=`). `TournamentResult` passed directly as prop from App.tsx (not read from localStorage — avoids timing issues). `qrcode.react` (`QRCodeSVG`) renders inline SVG captured by html-to-image. `encodeResultForQR()` / `decodeResultFromQR()` in logic.ts. `SharedResultView.tsx` modal for viewing shared results. Theme-aware QR colors.
- **PWA**: `vite-plugin-pwa` with auto-update service worker, installable on mobile/desktop
- **Wake Lock**: Screen stays on during active tournament (Wake Lock API, re-acquired on tab focus)
- **Cross-device compatibility**: Safe area insets (notch/gesture-bar), `100dvh` viewport height, `inputmode="numeric"` on all number inputs, webkit fullscreen prefix, localStorage try-catch for private browsing, tablet breakpoint (`md:` at 768px), touch targets ≥32px
- **Progressive disclosure in setup**: `CollapsibleSection` card component wraps each setup section; essential sections (Tournament Basics, Players, Blinds) open by default, optional sections (Chips, Payout, Rebuy/Add-On/Bounty) collapsed with summary text; `CollapsibleSubSection` for nested collapsibles inside cards (BlindGenerator, Level Table); Tournament Name + Buy-In merged into "Turnier-Grundlagen" card; Rebuy/Add-On/Bounty grouped into one card; Summary badges visible as subtitles even on open sections
- **Tournament checkpoint**: Auto-save game state to localStorage on every action in game mode; on restart, offer to resume with timer always paused (timestamps invalid after reload)
- **Accessibility**: ARIA roles/labels on timer, controls, modals, collapsible sections; `aria-label` on all icon-only buttons (✕, ✓, ▲, ▼, emoji buttons); auto-focus and Escape-to-close on dialogs; `useDialogA11y` hook for consistent dialog behavior; `prefers-reduced-motion` respected
- **Premium UI**: Glassmorphism (`backdrop-blur-sm`, soft shadows), gradient buttons (`bg-gradient-to-b`), custom animations (9 `@keyframes` in `index.css`), tactile feedback (`active:scale-[0.97]`), timer glow (`animate-timer-glow`), dual body gradient, focus glow on all inputs, custom scrub slider matching progress bar, card hover glow, table row hover states
- **Clock display**: Real-time clock in game mode header, updated every 30 seconds via `setInterval`
- **Last Hand**: Toggle button (L key) + amber banner via `BubbleIndicator`, voice announcement via `announceLastHand()` (distinguishes before-break vs end-of-level), auto-reset on level change
- **Dealer auto-rotation**: `advanceDealer()` in logic.ts skips eliminated players with wrap-around; button in PlayerPanel header
- **ErrorBoundary**: React class component in `main.tsx` wrapping entire app; catches lazy-load failures and render errors; hardcoded English fallback UI with reload button
- **Tournament history**: Persistent result storage in `poker-timer-history` (localStorage, max 50 entries). Auto-save on tournament finish. `TournamentHistory.tsx` modal with expandable standings, player statistics tab (`computePlayerStats` aggregation by normalized name), text export (WhatsApp-friendly), CSV download. Accessible from setup header "Historie" button.
- **Player database**: Persistent player name storage in `poker-timer-players` (localStorage). Auto-save on tournament finish via `syncPlayersToDatabase()`. Autocomplete via native `<datalist>` in PlayerManager. `importPlayersFromHistory()` for one-time migration. Case-insensitive deduplication.
- **Call the Clock**: Shot-clock countdown modal (`CallTheClock.tsx`, lazy-loaded ~2.3 KB). Configurable duration (10–300s, default 60s) via `callTheClockSeconds` in Settings. Wall-clock-based countdown, progress bar, tension beeps in last 10s, auto-close at 0. Keyboard shortcut `C` to toggle. `NumberStepper` config in SettingsPanel. Voice announcements: `announceCallTheClock()` on start, `announceCallTheClockExpired()` on timeout.
- **League Creation Modal**: `LeagueCreationModal.tsx` — opened when clicking "+ New League" in LeagueView. Provides: league name field, flexible point system editor (places 1–N, each with NumberStepper, add/remove), 3 quick presets (Standard: 10-7-5-4-3-2-1, Simple: 5-3-1, Top 10: 10-9-8-7-6-5-4-3-2-1), ranking algorithm toggle (points/ELO/weighted). Full configuration in one place at creation time.
- **League Management**: Multi-league support with point system. `League` type with customizable `PointSystem` (default: 1st→10, 2nd→7, 3rd→5, ..., 7th→1). CRUD in `poker-timer-leagues` (IndexedDB). `LeagueManager.tsx` modal with create/edit/delete, inline point editing, embedded sortable leaderboard. `computeLeagueStandings()` aggregates by normalized player name across league-tagged tournaments. Text export (WhatsApp-friendly) + CSV download. Tournament-to-league assignment via `leagueId` dropdown in Setup. `LeagueSettings.tsx` ⚙️ button also has full point system editor with presets.
- **League Mode (Homegame Liga)**: Third app mode (`'league'`). `GameDay` entity links tournaments to leagues with per-player financials. `league.ts` domain module with pure functions: GameDay CRUD, `computeExtendedStandings()` (aggregates points, costs, payout, netBalance, participationRate, tiebreaker), `applyTiebreaker()` (configurable criteria chain), `computeLeagueFinances()`, `computeLeaguePlayerStats()`. Season support, guest players, point corrections. QR-sharing via `encodeLeagueStandingsForQR()`. LeagueExport v2 includes GameDays. TV display integration via `LeagueScreen` secondary screen.
- **Player Detail Modal**: Click on player name in LeagueStandingsTable → lazy-loaded `LeaguePlayerDetail.tsx` modal showing per-player stats (points history, place distribution, streaks, form, head-to-head). Uses `computeLeaguePlayerStats()` from league.ts.
- **QR Sharing for League Standings**: `encodeLeagueStandingsForQR()` creates compact `#ls=` hash URL. `decodeLeagueStandingsFromQR()` parses it back. App.tsx handles `#ls=` on startup and shows `SharedLeagueView.tsx` modal (similar to `#r=` for tournament results).
- **Registered Player ID**: `GameDayParticipant.registeredPlayerId` links game day participants to the persistent `RegisteredPlayer` database for stable identity across name changes. Populated in `createGameDayFromResult()` (from App.tsx) and `GameDayEditor.tsx` save handler.
- **Mystery Bounty**: Alternative to fixed bounty — `BountyConfig.type: 'fixed' | 'mystery'`. Configurable pool of random bounty amounts (`mysteryPool: number[]`). `drawMysteryBounty()` randomly draws from pool on elimination. Voice announcement `announceMysteryBounty()` reveals drawn amount. Segmented toggle in BountyEditor with pool editor + presets. Backward-compatible via `parseConfigObject`.
- **Printable blind structure**: `PrintView.tsx` renders print-optimized blind table, chip values, payout, and tournament info. "Print" button in SetupPage triggers `window.print()`. `@media print` CSS hides all UI except print content. Clean black-on-white design.
- **Setup Wizard**: Guided 6-step first-time setup (`SetupWizard.tsx`, ~280 lines). Steps: Welcome → Players → Buy-In → Blind Speed → Tips (Remote, TV, Voice) → Review. Shows only on first visit (`poker-timer-wizard-completed` in localStorage). Generates full config with `defaultConfig`, `generateBlindStructure`, `defaultPlayers`. Skippable. `isWizardCompleted()` / `markWizardCompleted()` in persistence.ts.
- **Help Center**: In-app documentation system (`HelpCenter.tsx`, ~300 lines + `helpContent.ts`, ~600 lines). Bilingual (DE/EN) with 3 tabs: Guide (10 collapsible sections covering all features), FAQ (22 entries), Keyboard Shortcuts (13 entries). Live search filters sections and FAQ. Uses `BottomSheet` for responsive modal. Accessible via **?** icon button in header (**all modes** — setup, game, league). Lazy-loaded ~27KB chunk.
- **Seating Diagram**: SVG oval poker table in TV Display Mode (`SeatingScreen.tsx`, ~155 lines). Players arranged elliptically around green felt table. Shows active/eliminated status, dealer button (D), chip leader badge (CL). 6th rotating screen in DisplayMode. `viewBox="0 0 1000 600"`, responsive.
- **Multi-Table Support**: `Table` and `TableMove` types in types.ts. `tables.ts` module with pure functions: `createTable()`, `distributePlayersToTables()`, `getActivePlayersPerTable()`, `removePlayerFromTable()`, `findPlayerTable()`, `balanceTables()` (iterative, max ±1 diff), `shouldMergeToFinalTable()`, `mergeToFinalTable()`. `MultiTablePanel.tsx` (lazy-loaded) shows table list, balance button, move announcements. Setup: CollapsibleSection with table count/seats config, distribute button. Auto-detect final table on elimination. Voice: `announceTableMove()` and `announceFinalTable()` via Web Speech API. `parseConfigObject()` handles backward-compat (undefined if missing).
- **Tournament Presets**: 3 built-in tournament profiles ("Quick Cash Game", "Standard Home Game", "Deep Stack Tournament") for instant start. `getBuiltInPresets()` in persistence.ts. Preset buttons on SetupPage.
- **Side-Pot Calculator**: `computeSidePots()` in tournament.ts calculates main/side pots from all-in stacks. `SidePotCalculator.tsx` modal with player stack input and result table. Accessible from PlayerPanel header.
- **Ticker Banner**: Scrolling info bar at bottom of TV Display Mode. Shows rotating tournament info (next level, avg stack, player count, prizepool). Pure CSS animation (`animate-ticker-scroll`).
- **Custom Accent Color**: 6 selectable accent colors (emerald, blue, purple, red, amber, cyan). CSS custom properties (`--accent-500/600/400/700/900/ring/glow/glow-strong`). Picker in SettingsPanel. `AccentColor` type in types.ts. All components fully migrated from hardcoded `emerald-*` classes to `var(--accent-*)` — via inline styles, `color-mix()` for semi-transparent variants, 3 CSS `@utility` classes (`btn-accent-gradient`, `bg-accent-700`, `bg-accent-800`) for common button patterns, and Tailwind arbitrary values (`hover:border-[var(--accent-600)]`) for hover states.
- **Background Patterns**: 9 selectable CSS gradient backgrounds (none, felt-green, felt-blue, felt-red, casino, dark-wood, abstract, midnight, sunset). `--bg-pattern` CSS custom property. Picker in SettingsPanel. `BackgroundImage` type in types.ts.
- **Display Layout Variants**: 4 TV display layouts — Standard (55/45 split), Compact (40/60, more info), Timer-Only (100/0, no secondary), Ultra Large (70/30, oversized timer). `displayLayouts.ts` with `LayoutConfig` interface, `getLayoutConfig()`, `DISPLAY_LAYOUTS`. DisplayMode.tsx parameterized with dynamic flex, clamp-based font scales, visibility flags. Layout picker in SettingsPanel.
- **Platform Detection**: `platform.ts` with `detectPlatform()` (android/ios/desktop) and `detectDesktopOS()` (macos/windows/chromeos/linux). Extracted from PWAInstallGuide, shared with ShareHub for platform-aware wireless guides.
- **Presentation API**: `presentationApi.ts` — progressive enhancement for browser second-screen API. `isPresentationApiAvailable()` capability check. Button in ShareHub only visible in Chrome/Edge. Opens display URL on external screen.
- **Blinds by End Time**: `generateBlindsByEndTime()` in blinds.ts generates blind structure targeting a specific tournament duration. Tab in BlindGenerator with time picker + live preview.
- **Re-Entry Mode**: Players can re-enter after elimination (new ID, same person). `reEnterPlayer()` in players.ts. `reEntryEnabled/maxReEntries` in RebuyConfig. Re-entry button on eliminated players. Auto-seat at smallest table.
- **Seat Locking**: Lock individual seats at multi-table setup. `Seat.locked` property. `toggleSeatLock()` in tables.ts. Locked seats skipped during distribution and balancing.
- **Druckbare Ergebnisse**: Tournament results printable from TournamentFinished screen via PrintView.
- **Remote Control (PeerJS)**: Smartphone remote control via PeerJS (WebRTC data channel with cloud-brokered signaling). One-scan flow: host generates peer ID (`PKR-XXXXXXXX`), QR code contains app URL with `#remote=` hash, phone scans → opens app → auto-connects. `RemoteHost` + `RemoteController` classes in `remote.ts`. `RemoteControl.tsx` with host QR modal + touch-optimized fullscreen controller UI (play/pause/next/prev/dealer/sound/call-the-clock + **player management**: collapsible player section with elimination, rebuy, add-on buttons). Bounty-aware eliminator-picker (touch-button grid). `RemotePlayerInfo` compact protocol (~35 bytes/player). `useRemoteControl` hook manages state, `useRemoteHostBridge` bridges commands to tournament actions. Auto-reconnect (3 attempts, exponential backoff). Wake Lock on controller. Keepalive pings every 10s. Lazy-loaded ~14KB chunk.
- **App.tsx Refactoring**: Extracted `useKeyboardShortcuts` (72 lines) and `useTournamentActions` (317 lines) hooks. App.tsx reduced from ~1543 to ~1300 lines.
- **UI Integration Tests**: 95 component tests via `@testing-library/react` in `tests/components.test.tsx` covering 17 components/hooks (NumberStepper, CollapsibleSection, CollapsibleSubSection, PrintView, CallTheClock, BubbleIndicator, RebuyStatus, ChevronIcon, LanguageSwitcher, ThemeSwitcher, ErrorBoundary, useTimer, useConfirmDialog, LoadingFallback, ConfigEditor, SettingsPanel, PlayerPanel).
- **Offline-first**: Core functionality works offline. PeerJS signaling server required only for Remote Control pairing
- **Tournament Series**: `TournamentSeries` type with `SeriesRankingMode` (`'points' | 'bestN' | 'average'`). `series.ts` module (~283 lines): CRUD, `computeSeriesStandings()`, text/CSV/JSON export. `SeriesManager.tsx` modal (~590 lines, lazy-loaded) for create/edit/delete, standings table, ranking mode selection. Linked to tournaments via `seriesId`. Accessible via "Serien" button in AppHeader.
- **Extended League Rankings**: 3 algorithms in `league.ts`: Standard points, ELO rating (`computeEloRatings()` with configurable `EloConfig`), weighted points with decay (`computeWeightedPoints()` with `WeightedPointsConfig`). `RankingAlgorithm` type. `computeHeadToHeadMatrix()` for NxN win-loss records. `HeadToHeadMatrix.tsx` heatmap component (~149 lines). Minimum participation threshold with dimming in standings. `LeagueSettings.tsx` extended with ranking config UI.
- **Custom Audio**: `customAudio.ts` (~150 lines): Upload audio files (MP3/WAV/OGG/AAC, max 5 MB) as `CustomAudioFile` (ArrayBuffer in IndexedDB). Map files to 36 `AnnouncementKey`s via `CustomAudioMapping`. `CustomAudioEditor.tsx` (~390 lines, lazy-loaded) with drag-and-drop upload, file list, announcement mapping. 3 new IndexedDB stores: `series`, `customAudio`, `audioMappings`.
- **PDF Export**: `pdfExport.ts` (~166 lines): `exportTournamentResultAsPdf()` generates professional PDF with header, standings table, tournament info. Dependencies: `jspdf` + `jspdf-autotable`.
- **Duration Prognosis**: `estimateTournamentDuration()` in blinds.ts estimates total tournament duration based on player count, blind structure, rebuy/addon probabilities. Displayed in TournamentStats and TV StatsScreen.
- **Remote Session Persistence**: Peer ID stored in `sessionStorage` — remote connection survives browser refresh. `remoteResizeTable` command for table resize support.
- **Cross-Device Display**: PeerJS-based display on remote devices (TV, tablet, laptop). Hash `#display=PKR-XXXXX` connects to host session, receives `DisplayStatePayload` via PeerJS data channel. `CrossDeviceDisplay.tsx` renders same `DisplayMode` component as local TV window. Timer interpolation (100ms), auto-reconnect (3 attempts, exponential backoff). Hello handshake protocol (`{ type: 'hello', role: 'display', version: 2 }`) differentiates display from remote controller connections. Host broadcasts to N display peers simultaneously.
- **Share Hub**: Central `ShareHub.tsx` modal (📡 button in game mode header) for all sharing/display options. Sections: Display on another device (QR + link), Remote control (QR + link), This device (second window + fullscreen), Cable & Wireless guides (AirPlay, Chromecast, HDMI). Live connection status indicators. Auto-starts PeerJS host session when opened.
- **Undo/Redo System**: Full snapshot-based undo/redo for all tournament actions (eliminate, rebuy, add-on, reinstate, dealer, late reg, re-entry, stacks). `UndoStack` class in `undoStack.ts` (immutable, max 30 depth). `createUndoSnapshot()` captures players + tables + config state. Keyboard: Cmd+Z (undo) / Cmd+Shift+Z (redo). Buttons in Controls component with action labels. 20 translation keys.
- **ICM Calculator**: Independent Chip Model equity calculation. `icm.ts` implements Malmuth-Harville algorithm — exact recursive permutation for ≤10 players, Monte Carlo simulation (10K iterations) for >10. `IcmCalculator.tsx` modal accessible from game mode sidebar. Lazy-loaded.
- **Deal-Making / Chop Calculator**: 3 methods in `dealMaking.ts`: `computeEvenChop()` (equal split), `computeChipChop()` (stack-proportional), `computeIcmChop()` (ICM equity via Malmuth-Harville). `DealMaker.tsx` lazy-loaded modal in PlayerPanel (2–6 active players). NumberStepper for manual payout adjustment with sum validation. `acceptDeal` action stores agreed payouts as `Player.dealPayout`, eliminates all deal players with shared placements (equal payouts → same place, e.g. all place 1), creates `deal_accepted` tournament event. `dealApplied` flag in TournamentResult auto-detected from events. `buildTournamentResult` uses `dealPayout` instead of computed payouts when present. TournamentFinished shows deal banner (🤝) with method subtitle instead of winner celebration, deal participants with amounts in badges, and full standings with deal players at top followed by previously eliminated players.
- **Liga Trend-Charts**: `LeagueCharts.tsx` — lightweight SVG line charts (no external charting library). 3 chart types: cumulative points, placement progression (inverted Y), cumulative financial balance. Per-player data via `computeLeaguePlayerStats()`. 10-color palette, player toggle buttons (default: top 5), responsive `viewBox`. Lazy-loaded as 5th tab in LeagueView. Requires ≥2 game days.
- **Point-System-Validierung**: `validatePointSystem()` in `league.ts` — sanitizes PointSystem input: filters invalid entries (negative places, NaN/Infinity points, negative points), deduplicates by place, sorts ascending, falls back to default 7-place system if empty/null/undefined.
- **Cloud Export**: Unified export module `cloudExport.ts` — JSON/CSV/text formats, Web Share API for mobile, File System Access API for desktop save dialogs, Blob download fallback.
- **Multi-Controller Remote**: `RemoteHost` supports N simultaneous controllers via `Map<string, DataConnection>`. Controller count displayed in ShareHub.
- **AudioService Facade**: Centralized `audioService.ts` syncs master volume and language across `sounds.ts`, `audioPlayer.ts`, `speech.ts`. Single point for audio configuration changes.
- **App.tsx State Extraction**: 8 new hooks extracted from App.tsx reducing complexity: `useGameComputedState`, `useTournamentEventLog`, `useCheckpointManager`, `useDisplayBridge`, `useWakeLock`, `useConfirmDialog`, `useOnlineStatus`, `useInstallPrompt`.
- **Checkpoint Schema Versioning**: Version field in checkpoint for forward compatibility.
- **Feature Discovery**: `isFeatureDiscovered()`, `markFeatureDiscovered()`, `getUndiscoveredFeatures()` in `entitlements.ts`. Tracks which features users have found.
- **Conversion Telemetry**: `monetizationTelemetry.ts` tracks feature access patterns for conversion insights.

## Testing

- **1360 tests** across 21 test files + 1 setup file
- Core files: `logic.test.ts` (711), `components.test.tsx` (117), `edge-cases.test.ts` (101), `events.test.ts` (52), `integration.test.ts` (51), `tournamentActions.test.tsx` (41), `sound-speech.test.ts` (41), `league-advanced.test.ts` (31), `controls.test.tsx` (26), `hooks.test.tsx` (25), `persistence.test.ts` (25), `i18n.test.ts` (24), `display-channel.test.ts` (19), `hooks-phase1.test.tsx` (19), `alertEngine.test.ts` (18), `entitlements.test.ts` (12), `startValidation.test.ts` (11), `a11y.test.tsx` (6), `toast.test.ts` (6), `monetizationTelemetry.test.ts` (3), `recovery.test.ts` (3)
- Use Vitest with globals mode (`describe`, `it`, `expect` available without imports)
- Run `npm run test` before committing — CI will fail on test failures
- When modifying `logic.ts`, add or update corresponding tests
- All domain module functions (225+) have test coverage
- Integration tests cover cross-module flows: checkpoint round-trip, timer lifecycle, config backward compat, tournament flow
- No snapshot tests, no E2E tests currently

## Development Workflow

1. `npm install` to set up dependencies
2. `npm run dev` for local development with hot reload
3. Make changes — all UI text through `t()`, all styling via Tailwind classes
4. `npm run lint` to check code style
5. `npm run test` to verify logic
6. `npm run build` to verify production build succeeds

## Documentation Sync

When making changes to the project, **always update all three documentation files**:
- **CLAUDE.md** — Technical reference for AI-assisted development (this file)
- **README.md** — Public-facing GitHub project page (features, badges, structure)
- **CHANGELOG.md** — Human-readable changelog with all version history

Version numbers, test counts, feature lists, and project structure must stay in sync.

## Gotchas

- The Vite base path is configurable via `VITE_BASE_PATH` env var (defaults to `/`). GitHub Actions sets it to `/7MountainPoker/` for GitHub Pages; Vercel uses the default `/`. Never hardcode base paths in `index.html` — Vite prepends the base during build
- TypeScript strict mode is on — no implicit any, strict null checks enforced
- ESLint uses flat config format (not `.eslintrc`) in `eslint.config.js`
- The project language is bilingual — commit messages and docs are in German, code and comments are in English
- Default player names change when the language is switched (DE: "Spieler 1", EN: "Player 1")
- PresetPicker was removed in v1.2.0 — blind structures are now generated via BlindGenerator
- When chips are enabled, the blind generator uses the smallest chip denomination as rounding base

## Changelog

### v6.11.1 — Abschluss-Audit, Deal-Finished & Stale-Connection-Eviction

- **Deal-Finished Screen**: Turnier endet jetzt korrekt nach Deal-Abschluss. Neues `Player.dealPayout` Feld speichert vereinbarte Beträge. `tournamentFinished` erkennt Deal-Fall (active===0 + dealPayout). TournamentFinished zeigt Deal-Banner (🤝) mit Methode statt Sieger-Feier, Deal-Teilnehmer mit Beträgen in Badges. `buildTournamentResult` nutzt `dealPayout` statt berechneter Payouts. Geteilte Platzierung bei gleichem Payout (Even Chop → alle Platz 1).
- **i18n-Bereinigung**: Hardkodierte `€`-Symbole und Spaltenheader durch `t()`/`CURRENCY_SYMBOLS`-Lookup ersetzt. 14 neue Translation-Keys (7 DE + 7 EN).
- **Toast-Feedback**: `showToast()` bei Template speichern/löschen, Liga löschen, Serie löschen, Backup wiederherstellen. 16 neue Toast-Translation-Keys (8 DE + 8 EN).
- **Aria-Labels**: Move-Buttons in PlayerManager mit `aria-label` ergänzt.
- **startValidation-Tests**: 11 neue Tests für `collectStartErrors()` — alle Preflight-Checks abgedeckt.
- **PeerJS Stale-Connection-Eviction**: `lastPongTime`-Map pro Peer, 10 Min Max-Age, automatisches Eviction in Keepalive-Intervall.
- **alertEngine-Tests**: 18 neue Tests für alle 3 exportierten Funktionen.
- **Payout-Rundungs-Tests**: 4 Präzisionstests für `computePayouts`.
- **Neue Testdateien**: `tests/startValidation.test.ts`, `tests/alertEngine.test.ts`
- **6 neue Deal-Translation-Keys** (3 DE + 3 EN): `finished.dealMade`, `finished.dealMethod`, `finished.dealParticipants`
- **1360 Tests gesamt** (21 Testdateien)

### v6.11.0 — Audit-Pakete C/D/E: Deal-Making, Liga-Charts, QA-Härtung

- **Deal-Making / Chop Calculator** (Paket C): `dealMaking.ts` Domain-Modul mit 3 Chop-Methoden (ICM, Chip-Proportional, Even Split). `DealMaker.tsx` lazy-loaded Modal im PlayerPanel (2–6 Spieler). NumberStepper für manuelle Anpassung, Summen-Validierung. `deal_accepted` Event + `dealApplied` in TournamentResult. Integration über useTournamentActions → App.tsx → GameModeContainer → PlayerPanel. 15 neue i18n-Keys pro Sprache.
- **Liga Trend-Charts** (Paket D): `LeagueCharts.tsx` SVG-Chart-Komponente mit 3 Diagrammtypen (kumulative Punkte, Platzierungsverlauf, Finanzbilanz). Lazy-loaded als 5. Tab in LeagueView. 10-Farben-Palette, Spieler-Toggles, responsive SVG. 8 neue i18n-Keys pro Sprache.
- **Point-System-Validierung** (Paket E): `validatePointSystem()` in league.ts — filtert ungültige Einträge (negative Plätze, NaN/Infinity Punkte), dedupliziert, sortiert, Fallback auf Standard-System.
- **a11y-Testing** (Paket E): `vitest-axe` + `axe-core` als DevDependencies. 6 automatisierte WCAG-Tests für NumberStepper, CollapsibleSection, BubbleIndicator, RebuyStatus, ChevronIcon, LoadingFallback. NumberStepper `aria-label`-Prop für Input-Feld.
- **Test-Count-Validierung in CI** (Paket E): GitHub Actions prüft Minimum 1300 Tests — Pipeline bricht ab wenn Schwelle unterschritten.
- **Neue Dateien**: `dealMaking.ts`, `DealMaker.tsx`, `LeagueCharts.tsx`, `a11y.test.tsx`
- **Neue DevDependencies**: `vitest-axe`, `axe-core`
- **1328 Tests gesamt** (19 Testdateien) → aktualisiert in v6.11.1 auf 1360 Tests (21 Testdateien)

### v6.10.1 — Liga-Erstellungs-Modal mit flexiblem Punktesystem

- **Liga-Erstellungs-Modal**: `+ Neue Liga` öffnet jetzt vollständiges Modal (Name, Punktesystem, Ranking-Algorithmus) statt Inline-Namensfeld.
- **Flexibles Punktesystem**: Plätze 1–N frei konfigurierbar — NumberStepper pro Platz, Add/Remove-Buttons.
- **Punkt-Vorlagen**: Standard (10-7-5-4-3-2-1), Einfach (5-3-1), Top 10 (10-9-8-7-6-5-4-3-2-1).
- **LeagueSettings verbessert**: Punktesystem-Editor auch in ⚙️-Einstellungen mit Vorlagen und Add/Remove.
- **Neue Datei**: `src/components/LeagueCreationModal.tsx`
- **Docs**: README, CLAUDE.md, CHANGELOG.md, helpContent.ts aktualisiert (League-Hilfetext + FAQ).
- **10 neue Translation-Keys** (5 DE + 5 EN)
- **1305 Tests gesamt**

### v6.10.0 — Audit-Pakete: UX, Stability & Architecture

- **Offline-Banner**: Amber-Warnhinweis im Header bei fehlender Internetverbindung.
- **Liga-Sort-Persistenz**: Sortier-Spalte/-Richtung in Liga-Tabelle wird in localStorage gespeichert.
- **Turnier-Klon aus Historie**: „Wiederholen"-Button übernimmt komplette Konfiguration als neues Setup. `configSnapshot` in TournamentResult, `cloneConfigFromResult()` in tournament.ts.
- **Liga→Turnier Spieler-Übernahme**: `getLeaguePlayerNames()` extrahiert Namen der letzten 5 Spieltage. LeagueView reicht Spielernamen an `onStartTournament` weiter.
- **Quick-Start-Fallback**: Liga-Quick-Start bei Fehler → Fallback zu Setup statt Toast-Only.
- **Storage-Init-Timeout**: 5s Sicherheits-Timeout in main.tsx für IndexedDB-Init. `renderAppOnce()` Guard gegen Doppel-Render.
- **PDF-Helper-Export**: `sanitizeFilename()` und `formatDuration()` aus pdfExport.ts exportiert.
- **App.tsx State-Extraktion**: 3 neue Hooks: `useEntitlements` (11 Feature-Flags + Lizenz-State), `useGameUiState` (6 Game-UI-States + Auto-Dismiss), `useUndoManager` (Undo/Redo-Stack + Callbacks). App.tsx 1236 → 1187 Zeilen.
- **23 neue Tests** — **1305 Tests gesamt** (18 Testdateien)
- **6 neue Translation-Keys** (3 DE + 3 EN)

### v6.9.9 — Holistic Hardening, UX Quick Wins & Test-Coverage

- **UX Quick Wins**: Duplikat-Spielernamen-Warnung (amber Border + Tooltip im PlayerManager), Spielersuche ab 10 Spielern (Filterfeld im PlayerPanel), Stack-to-Blind-Warnung ≤15 BB (amber + ⚠ in TournamentStats).
- **Validierungs-Härtung** (4 neue Preflight-Checks): `startingChips > 0`, `bounty.amount > 0` (Fixed), Blind-Monotonie (BB aufsteigend), Payout-Plätze lückenlos (1,2,3,…).
- **Fachliche Vollständigkeit**: Serien Auto-Link bei Turnierende (analog Liga-GameDay); Sieger erhält eigenes Bounty-Chip; Bounty Heads-Up auto-selektiert einzigen Killer.
- **A11y**: TournamentFinished `role="dialog"` + `aria-modal` + `aria-labelledby`; AppHeader aria-labels auf Remote/TV Buttons; ErrorBoundary + SectionErrorBoundary zweisprachig (DE/EN aus localStorage).
- **Robustheit**: `sanitizeRecoveredConfig` validiert stale `seriesId`; `dissolveTable` warnt bei unbekannter tableId; `computeExtendedStandings` Fallback bei leerem PointSystem; Heads-Up-Ansage-Guard gegen Doppelansage nach Re-Entry; Elimination-Voice sauber umstrukturiert; `paidPlaces` memoized.
- **Legal**: Impressum + Datenschutz Footer-Links auf Setup-Seite (→ Marketing-Website).
- **25 neue Tests** (cloudExport 4, audioService 2, isValidAudioFile 5, tables 2, blinds 1, license 11) — **1282 Tests gesamt** (18 Testdateien)
- **~20 neue Translation-Keys** (10 DE + 10 EN)

### v6.9.8 — Lizenzschlüssel-System & Personalisierungs-Gates

- **HMAC-Lizenzschlüssel**: Selbst-signierende Lizenzschlüssel (`7MP-TIER-EXPIRY-SIGNATURE`) mit Web Crypto API HMAC-SHA256 Verifikation. Offline-verifizierbar, kein Backend. `license.ts` Domain-Modul, `LicenseActivation.tsx` Modal, `scripts/generate-license.mjs` CLI-Generator. Reaktive Entitlements in App.tsx (`useState` statt `useMemo`).
- **7 neue Personalisierungs-Gates**: `customAccent` (Free: nur Emerald), `customBackground` (Free: none + felt-green), `customLayout` (Free: nur Standard), `customAudio`, `pdfExport`, `series`, `icmCalculator` — alle als Premium-Features definiert.
- **SettingsPanel Lock-UI**: Gesperrte Optionen mit 🔒-Icon + reduzierter Opacity, Klick öffnet FeatureGateModal.
- **FeatureGateModal → LicenseActivation**: "Upgrade"-Button öffnet jetzt Lizenz-Eingabe statt Toast.
- **Neue Dateien**: `license.ts`, `LicenseActivation.tsx`, `scripts/generate-license.mjs`
- **26 neue Translation-Keys** (13 DE + 13 EN): `license.*` (12) + `paywall.feature.*` (7 neue Features)
- **Default-Tier bleibt `'premium'`** — alle Features für alle Nutzer freigeschaltet. Gating aktivierbar via `VITE_APP_TIER=free`.
- **1257 Tests gesamt** (18 Testdateien)

### v6.9.7 — Business Logic, Performance & Robustness Hardening

- **Business-Logik gehärtet** (8 Fixes): Tiebreaker-Sort, Payout-Rundung normalisiert, League-Cascade-Delete, Season-Validierung, Knockouts-Propagation, Series-Import-Validierung, deterministische Platzierung, GameDay-Nummerierung.
- **Performance** (4 Fixes): `React.memo` GameModeContainer + `useMemo` Props (4→1x/Sek Re-Renders), IndexedDB single-item `put` statt clear+rewrite, Timer-Tick nur bei `floor(s)` Änderung, Lazy-load LeagueModeContainer + TournamentFinishedContainer.
- **Robustness** (8 Fixes): GameDayEditor negative-Werte-Guard, Import-Validierung, Empty-PointSystem-Fallback, NaN-Guard Finanzen, Level-Cap 200, GameDay-Label i18n, db-null-Guard, Float-Normalisierung.
- **TV-Display**: Request-State-Handshake — sofortige Anzeige beim Öffnen des TV-Modus (auch bei pausiertem Timer).
- **2 neue Translation-Keys** (league.editor.gameDayLabel DE + EN)
- **1257 Tests gesamt** (18 Testdateien)

### v6.9.6 — Test-Audit: Lückenanalyse & Coverage-Boost

- **Neue Testdatei `league-advanced.test.ts`**: 22 Tests für `applyTiebreaker` (6), `computeEloRatings` (2), `computeWeightedPoints` (3), `computeHeadToHeadMatrix` (3), `computeExtendedStandings` (8) — erstmals alle Liga-Ranking-Algorithmen vollständig getestet.
- **Series-Tests**: 12 Tests für `computeSeriesStandings` (3 Ranking-Modi: points/bestN/average), `exportSeriesToJSON`/`parseSeriesFile` Round-Trip, Edge-Cases (leere Serien, ungültige JSON).
- **Prizepool-Tests**: 7 Tests für komplexe Prizepool-Berechnungen (Rebuy+AddOn+Bounty, Mystery-Bounty, prozentuale/feste Auszahlung, Edge-Cases).
- **Side-Pot-Formatierung**: 5 Tests für `formatSidePotsAsText` (Einzel-Pot, Multi-Pot, leere Pots, fehlende Spieler, Währungssymbol).
- **Integration-Tests erweitert**: 11 neue Tests — Liga GameDay→Standings Flow (3), Liga JSON v2 Export/Import (2), Custom Audio Mapping Persistence (3), Checkpoint Full Rehydration (3).
- **68 neue Tests, 40 Duplikate bereinigt** — **1257 Tests gesamt** (18 Testdateien)

### v6.9.5 — Audit Findings Closed (#34, #35, #36)

- **IDB Schema Versioning**: Monolithischer `upgrade`-Block durch versionierte Migrations-Registry ersetzt. Jede DB-Version (1–4) hat eine eigene Migrationsfunktion. `oldVersion`-basierte Inkrement-Logik für sichere Schema-Upgrades.
- **Undo/Redo Table Moves verifiziert**: 3 Tests beweisen Snapshot-Capture, Dissolution-Undo und Deep-Clone-Isolation für Multi-Table-State.
- **AudioBuffer Decode Cache**: `Map<string, AudioBuffer>` Cache vermeidet redundantes Fetch+Decode bei wiederholten MP3s (z.B. Countdown 1–10). `clearAudioBufferCache()` für Tests/Memory.
- **8 neue Tests** — **1229 Tests gesamt**

### v6.9.4 — Type Safety & Voice Test Coverage

- **exactOptionalPropertyTypes aktiviert**: TypeScript-Compiler-Flag aktiviert — 71 Type-Errors in 33 Dateien behoben. Verhindert `undefined`-Zuweisung an optionale Properties, fängt subtile Bugs zur Compile-Zeit ab. Fix-Strategie: konsistente Typweiterung (`field?: T` → `field?: T | undefined`).
- **useVoiceAnnouncements vollständig getestet**: 11 neue Tests für Color-Up-Ansagen, Rebuy/Add-On-Übergänge, Timer-Pause-Edge-Cases, Spieleranzahl-Meilensteine und Break-Over.
- **11 neue Tests** — **1221 Tests gesamt**

### v6.9.3 — Re-Audit: 58 Findings behoben (Stabilität, Sicherheit, Performance)

- **Input-Validierung**: maxLength/max auf allen Text-/Zahlenfeldern, QR-Decode-Limits, Audio-Dateiname-Truncation
- **ESLint**: `no-console` → error, `no-floating-promises` aktiviert, 32 Violations behoben
- **HMAC gehärtet**: Payload-Signatur, Fail-Closed-Guard, Hex-Validierung, Schema-Validierung
- **CSP**: `unsafe-inline` → SHA-256-Hashes, HSTS-Header
- **Kritisch**: Turnierergebnis nur einmal gebaut, Platzierung Concurrent-Mode-sicher
- **Speicher**: Persist-Failure-Warnung, Migration-Flag-Timing, Fallback-Stores
- **Performance**: `useMemo` GameModeContainer-Actions, `React.memo` AppHeader, Checkpoint-Debounce-Fix
- **Security**: Prototype-Pollution-Schutz, CSV-Injection-Escaping, Audio-Magic-Byte-Validierung
- **Remote**: Display-Peer-Flag, Ref-basierte Deps, Remote-State-Guard
- **Voice**: Stale-Closure-Fix via Refs in 3 Effects
- **Timer**: `tick`-Dependency entfernt, Ref-Mutationen in Updater
- **CI**: Actions SHA-gepinnt, E2E an Quality gekoppelt, Sentry-Env-Vars
- **TypeScript**: Target ES2020 (Safari 14 Alignment)
- **PWA**: MP3-Precaching (653 Einträge), idb/screenshot Chunk-Split
- **Mystery Bounty**: Per-Spieler bountyEarned
- **SectionErrorBoundary**: Max 3 Retries
- **11 neue Tests** — **1210 Tests gesamt**

### v6.9.2 — Premium-Readiness: Gate-Infrastruktur vervollständigt

- **Gate-Checks für multiTable und sidePot**: `canUseMultiTable` und `canUseSidePot` in App.tsx, durchgereicht an SetupPage und PlayerPanel/GameModeContainer. Safety-Guard für MultiTablePanel.
- **Feature-Discovery verdrahtet**: `markFeatureDiscovered()` an allen 5 Premium-Feature-Einstiegspunkten (TV, Remote, Liga, Multi-Table, Side-Pot).
- **Telemetrie aktiviert**: `trackFeatureUsed()` bei Nutzung aller 5 Premium-Features, `trackSessionStarted()` beim App-Start.
- **Keine sichtbare Änderung**: Default-Tier bleibt `'premium'`, alle Features weiterhin für alle Nutzer verfügbar.
- **4 neue Tests** — **1199 Tests gesamt**

### v6.9.1 — Currency Propagation, PeerJS Hardening & CSP

- **SharedResultView Currency**: 4 hardkodierte `t('unit.eur')` durch `result.currency ?? 'EUR'` mit `CURRENCY_SYMBOLS`-Lookup ersetzt. Geteilte Turnierergebnisse zeigen jetzt die korrekte Währung.
- **Currency in GameDay + Liga-Finanzen**: `currency?: Currency` zu `GameDay`-Interface hinzugefügt. Automatische Propagation über `createGameDayFromResult()`. Alle Liga-Finanz-Komponenten (`LeagueFinances`, `LeagueGameDays`, `LeagueStandingsTable`, `GameDayEditor`) nutzen `currencySymbol`-Prop statt hardkodiertem `€`. Fallback `'EUR'` für alte Daten.
- **PeerJS Hardening**: `PEER_ID_LENGTH` von 5 → 8 (32⁸ = 1,1 Billionen Kombinationen). Verbindungslimits: `MAX_CONTROLLERS = 4`, `MAX_DISPLAYS = 8` — überzählige Verbindungen werden mit Close + Console.warn abgewiesen. `parseRemoteHash`/`parseDisplayHash` Regex aktualisiert. Alte 5-Zeichen-URLs funktionieren weiterhin.
- **CSP für GitHub Pages**: CSP-Meta-Tag in `index.html` mit `vercel.json` synchronisiert — `worker-src 'self'` und `frame-ancestors 'none'` hinzugefügt.
- **ElevenLabs MP3s für Break-Controls**: 4 neue MP3-Dateien (2 DE + 2 EN): `break-skipped.mp3`, `break-extended.mp3`. `announceBreakSkipped`/`announceBreakExtended` nutzen jetzt MP3s statt reinem Web Speech API. `CUSTOMIZABLE_ANNOUNCEMENTS` um 2 Keys erweitert (28 gesamt). 590 Audio-Dateien gesamt (295 pro Sprache).
- **4 neue Tests** — **1195 Tests gesamt** (17 Testdateien)

### v6.9.0 — Tournament Event Log & Break Controls Polish

- **Turnier-Protokoll (Event Log)**: 📋 Modal im Spielmodus zeigt chronologisches Turnier-Protokoll. Drei Filter (Alle/Eliminations/Rebuys/Levels), Text-Export. Bestehende `TournamentLog.tsx` mit i18n-formatiertem Event-Text aufgewertet. Events als "Verlauf"-Tab auf Ergebnis-Screen.
- **Break Skip/Extend**: Pausen-Buttons in Controls (+2 Min / +5 Min Verlängerung, Überspringen). Sprachansagen (`announceBreakSkipped`, `announceBreakExtended`). Events: `break_skipped`, `break_extended`.
- **Event-Formatierung i18n**: Alle 22 Event-Typen bilingual (DE/EN) via optionalem `t`-Parameter in `formatEventAsText()` — rückwärtskompatibel mit hardkodiertem Deutsch.
- **~48 neue Translation-Keys** (24 DE + 24 EN): `event.*` (22 Keys), `controls.skipBreak/extendBreak2/extendBreak5`, `voice.breakSkipped/breakExtended`, `finished.tabStandings/tabLog`, `log.*` (filter/title/close/empty/copyText/copied)
- **35 neue Tests** — **1191 Tests gesamt** (17 Testdateien)

### v6.8.0 — Phase 1: Stability, Undo/Redo & App.tsx Extraction

- **Undo/Redo System**: Snapshot-basiertes Undo/Redo für alle Turnieraktionen (Elimination, Rebuy, Add-On, Reinstate, Dealer, Late Reg, Re-Entry, Stacks). `UndoStack` Klasse in `undoStack.ts` (immutable, max 30 Tiefe). `createUndoSnapshot()` erfasst Players + Tables + Config. Tastenkürzel: Cmd+Z / Cmd+Shift+Z. Buttons in Controls mit Aktionslabels. 20 Translation-Keys.
- **ICM Calculator**: Independent Chip Model Equity-Berechnung. `icm.ts` implementiert Malmuth-Harville — exakt rekursiv für ≤10 Spieler, Monte Carlo (10K Sims) für >10. `IcmCalculator.tsx` Modal im Spielmodus. Lazy-loaded.
- **Cloud Export**: Einheitliches Export-Modul `cloudExport.ts` — JSON/CSV/Text-Formate, Web Share API, File System Access API, Blob-Download-Fallback.
- **Multi-Controller Remote**: RemoteHost unterstützt N gleichzeitige Controller (`Map<string, DataConnection>`). Controller-Anzahl im ShareHub angezeigt.
- **AudioService Facade**: Zentrales `audioService.ts` synchronisiert Master-Volume und Sprache über sounds.ts, audioPlayer.ts, speech.ts.
- **App.tsx State Extraction**: 8 neue Hooks aus App.tsx extrahiert: `useGameComputedState`, `useTournamentEventLog`, `useCheckpointManager`, `useDisplayBridge`, `useWakeLock`, `useConfirmDialog`, `useOnlineStatus`, `useInstallPrompt`.
- **GameModeContainer Props-Konsolidierung**: 51 flache Props → 6 typisierte Objekte (config, settings, timer, state, ui, actions + undo). 3 exportierte Interfaces.
- **Checkpoint Schema Versioning**: Version-Feld im Checkpoint für Vorwärtskompatibilität.
- **Feature Discovery**: `isFeatureDiscovered()`, `markFeatureDiscovered()`, `getUndiscoveredFeatures()` in entitlements.ts.
- **Conversion Telemetry**: monetizationTelemetry.ts trackt Feature-Zugriffsmuster.
- **Storage Retention Policies**: Dokumentiert in storage.ts.
- **Neue Dateien**: `undoStack.ts`, `icm.ts`, `cloudExport.ts`, `audioService.ts`, `IcmCalculator.tsx`, `useGameComputedState.ts`, `useTournamentEventLog.ts`, `useCheckpointManager.ts`, `useDisplayBridge.ts`, `useWakeLock.ts`, `useConfirmDialog.ts`, `useOnlineStatus.ts`, `useInstallPrompt.ts`
- **38 neue Tests** — **1156 Tests gesamt** (17 Testdateien)

### v6.7.1 — Phase B: Tech Debt

- **GameModeContainer Props-Konsolidierung**: 51 flache Props → 6 typisierte Objekte (`config`, `settings`, `timer`, `state`, `ui`, `actions`). 3 exportierte Interfaces: `GameModeState` (13 Felder), `GameModeUiState` (4 Felder), `GameModeActions` (29 Callbacks). Call-Site in App.tsx baut Objekte inline. React-Compiler-kompatibel durch Destructuring vor `useCallback`.
- **Audio Queue Timeout-Fallback**: Web Audio API Pfad: Safety-Timeout (`totalDuration + 2s`) nach letztem Buffer-`onended`. HTMLAudioElement Pfad: 15s Safety-Timeout pro Datei mit `done`-Flag gegen doppelte Resolves. Verhindert hängende Promises bei Browser-Audio-Bugs.
- **Keine neuen Tests, keine neuen Dateien** — rein internes Refactoring. **1118 Tests gesamt**.

### v6.7.0 — Phase 2: Display-Layouts, Plattform-Guides & Presentation API

- **4 Display-Layout-Varianten**: Standard (55/45), Kompakt (40/60), Timer-Only (100/0), Ultra Large (70/30). `displayLayouts.ts` (~80 Zeilen). DisplayMode.tsx parameterized. Layout-Picker im SettingsPanel.
- **Plattform-spezifische Guides**: `platform.ts` — `detectPlatform()` + `detectDesktopOS()`. ShareHub erkennt Plattform, zeigt relevante Anleitung zuerst mit Schritt-für-Schritt-Instruktionen.
- **Presentation API**: `presentationApi.ts` — Browser Second-Screen-Support. Button in ShareHub nur bei Chrome/Edge.
- **Neue Dateien**: `displayLayouts.ts`, `platform.ts`, `presentationApi.ts`
- **~48 neue Translation-Keys**, **8 neue Tests** — **1118 Tests gesamt**

### v6.6.0 — Share Hub & Cross-Device Display

- **Cross-Device Display**: Turnieranzeige auf separatem Gerät via PeerJS. `CrossDeviceDisplay.tsx` (~360 Zeilen), `#display=PKR-XXXXX` Hash-Routing, Timer-Interpolation, Auto-Reconnect.
- **Share Hub**: Zentrales Modal `ShareHub.tsx` (~350 Zeilen) mit Display-Link, Remote-Link, QR-Codes, Vollbild, AirPlay/Chromecast/HDMI-Anleitungen. 📡 Button im Header.
- **Multi-Role Sessions**: Hello-Handshake-Protokoll in RemoteHost, N Display-Peers gleichzeitig, Session-ID teilen.
- **useDisplaySession Hook**: Host-seitige PeerJS Display-Broadcast-Logik (~100 Zeilen).
- **~64 neue Translation-Keys** (32 DE + 32 EN)
- **Neue Dateien**: `CrossDeviceDisplay.tsx`, `ShareHub.tsx`, `useDisplaySession.ts`, `session.ts` (via remote.ts)
- **13 neue Tests** — **1103 Tests gesamt**

### v6.5.1 — Audio-Setup & Sidebar-Lesbarkeit

- **Audio-Einstellungen auf Setup-Seite**: Neue CollapsibleSection „Audio & Ansagen" auf der Setup-Seite — Sound an/aus, Lautstärke, Countdown-Toggle, AlertEditor (benutzerdefinierte Hinweise), Custom-Audio-Button. Konfigurierbar VOR Turnierstart.
- **SettingsPanel verschlankt**: Audio-Sektion im Spielmodus nur noch Quick-Access (Sound-Toggle + Lautstärke-Slider). Countdown-Toggle, AlertEditor und Custom-Audio-Button entfernt (nur noch im Setup).
- **NumberStepper vertikales Layout**: Call-the-Clock und TV-Wechselintervall — Label auf eigener Zeile, Stepper darunter. Input-Breite `w-14` → `w-16`. +/- Buttons nie mehr abgeschnitten.
- **Sidebar-Dimensionen erweitert**: Desktop `w-60` → `w-64`, Mobile `max-h-[40vh]` → `max-h-[60vh]`, SM `max-h-[50vh]` → `max-h-[70vh]`.
- **E2E-Tests stabilisiert**: Alle 14 Playwright-Tests bestehen — Wizard-Skip, OnboardingTour-Unterdrückung, robustere Selektoren, höhere Timeouts für CI.
- **4 neue Translation-Keys** (2 DE + 2 EN): `setup.audioSummary.on`, `setup.audioSummary.off`
- **1090 Tests gesamt** (1090 Unit + 14 E2E)

### v6.5.0 — Phase 2+3: Turnier-Serien, Erweitertes Liga-System, Custom Audio, PDF-Export

- **Turnier-Serien**: `series.ts` (~283 Zeilen) — Serien-Management mit 3 Ranking-Modi (Punkte, Best-N, Durchschnitt). `SeriesManager.tsx` (~590 Zeilen, lazy-loaded) — CRUD-Modal mit Standings, JSON Import/Export, Text/CSV-Export.
- **Erweitertes Liga-System**: 3 Ranking-Algorithmen (Punkte, ELO, Gewichtete Punkte mit Decay). `HeadToHeadMatrix.tsx` (~149 Zeilen) — NxN Heatmap als 4. Tab in LeagueView. LeagueSettings + LeagueStandingsTable erweitert.
- **Custom Audio**: `customAudio.ts` (~150 Zeilen) — Audio-Upload + Announcement-Mapping. `CustomAudioEditor.tsx` (~390 Zeilen) — Drag-&-Drop-Editor. 3 neue IndexedDB-Stores.
- **PDF-Export**: `pdfExport.ts` (~166 Zeilen) — Turnier-Ergebnisse als PDF (jsPDF + jspdf-autotable).
- **Turnierdauer-Prognose**: `estimateTournamentDuration()` in blinds.ts. Anzeige in TournamentStats + TV StatsScreen.
- **Remote Session-Persistenz**: Peer-ID in sessionStorage — Verbindung überlebt Browser-Refresh.
- **Tisch-Resize**: `resizeTable()` in tables.ts + Remote-Command-Support.
- **IndexedDB v4**: 12 Stores (3 Singleton + 9 Collection). 3 neue: `series`, `customAudio`, `audioMappings`.
- **Neue Dependencies**: `jspdf`, `jspdf-autotable`
- **~75 neue Translation-Keys** (DE + EN)
- **124 neue Tests** — **1090 Tests gesamt** (16 Testdateien)

### v6.4.0 — Dokumentation, Help-Center & Sound-Vervollständigung

- **3 neue MP3-Paare** (6 Dateien): `rebuy-taken.mp3`, `table-move.mp3`, `table-dissolved.mp3` — ElevenLabs TTS, je DE + EN. 468 Audio-Dateien gesamt (234 pro Sprache).
- **Neue Ansage `announceRebuyTaken()`**: MP3-basierte Ansage bei Rebuy-Kauf (über Remote oder PlayerPanel). Automatisch getriggert durch Rebuy-Count-Tracking in `useVoiceAnnouncements.ts`.
- **MP3-Intros für Tischwechsel**: `announceTableMove()` und `announceTableDissolution()` nutzen jetzt MP3-Intro + Speech-Details statt reinem Web Speech API.
- **Help-Center erweitert**: 2 neue Items in Remote-Control-Sektion (Spieler-Management, Turnier-Infos auf Controller). 1 neuer FAQ-Eintrag (Spieler per Fernbedienung eliminieren). 15 FAQ-Einträge gesamt.
- **README.md aktualisiert**: Version 6.0.0 → 6.4.0, neue Features (Hilfe-Center, Remote-Turnier-Infos), Audio-Counts (468), Test-Count (966), IndexedDB-Persistenz.
- **6 neue Translation-Keys** (3 DE + 3 EN): `voice.rebuyTaken`, `voice.tableMoveIntro`, `voice.tableDissolutionIntro`
- **3 neue Tests** — **966 Tests gesamt**

### v6.3.1 — Remote Control: Timer-Fix & Turnier-Infos

- **Timer-Interpolation repariert**: Ref-basierte Countdown-Berechnung — permanenter 100ms-Interval liest aus Refs statt `useEffect([state])`-Teardown/Recreate bei jedem Host-Update. `Math.floor` statt `Math.ceil` (konsistent mit Host). Behebt Timer-Blinken und Verzögerungen.
- **Turnier-Infos auf Fernbedienung**: Stats-Zeile (💰 Prizepool, Ø Avg BB, ⏱ Spielzeit), nächstes Level, Break-Anzeige (☕), ITM-Badge.
- **RemoteState erweitert**: 6 neue optionale Felder (`prizePool`, `avgStackBB`, `elapsedSeconds`, `nextLevelLabel`, `isBreak`, `isItm`).
- **useRemoteHostBridge**: 3 neue Props (`averageStack`, `tournamentElapsed`, `isItm`), `buildNextLevelLabel()` Helper, `computePrizePool()`/`computeAverageStackInBB()` Berechnung.
- **6 neue Translation-Keys** (3 DE + 3 EN)
- **RemoteControl.tsx**: 15.11KB Chunk
- **963 Tests gesamt**

### v6.3.0 — Remote Control: Spieler-Management

- **Spieler-Sektion auf Fernbedienung**: Aufklappbare Spielerliste in Controller-UI. Zeigt aktive Spieler mit Name, Rebuy-Count, Add-On-Status.
- **Spieler eliminieren**: ❌-Button pro Spieler. Ohne Bounty: sofortige Elimination. Mit Bounty: Touch-Eliminator-Picker mit anderen aktiven Spielern.
- **Rebuy/Add-On per Remote**: Kontextuelle Buttons pro Spieler (nur sichtbar wenn Phase aktiv).
- **RemoteState v2**: `RemotePlayerInfo[]`, `bountyEnabled`, `rebuyActive`, `addOnWindowOpen`. Kompakte Feldnamen (~35 Bytes/Spieler).
- **3 neue Commands**: `eliminatePlayer`, `rebuyPlayer`, `addOnPlayer` mit Payload + HMAC.
- **14 neue Translation-Keys** (7 DE + 7 EN)
- **RemoteControl.tsx**: ~14KB Chunk (+5KB für Player-Management)
- **963 Tests gesamt**

### v6.2.0 — In-App Help Center

- **Help Center**: Vollständiges, durchsuchbares, bilinguales Hilfesystem als BottomSheet-Modal. 3 Tabs: Anleitung (8 Sektionen mit allen Features), FAQ (14 Einträge), Tastenkürzel (11 Einträge). Live-Suche filtert Sektionen und FAQ. Erreichbar über **?**-Button im Header.
- **Neue Dateien**: `src/domain/helpContent.ts` (~350 Zeilen — typisierte Datenstruktur mit DE/EN Texten), `src/components/HelpCenter.tsx` (~300 Zeilen — UI mit BottomSheet, Tabs, Accordions, Suche)
- **18 neue Translation-Keys** (9 DE + 9 EN): `help.title`, `help.close`, `help.search`, `help.guideTab`, `help.faqTab`, `help.shortcutsTab`, `help.noResults`, `help.shortcutKey`, `help.shortcutAction`
- **AppHeader.tsx**: Neuer `onShowHelp` Prop, **?**-Icon-Button mit SVG
- **App.tsx**: `showHelp` State, lazy-loaded HelpCenter (~27KB Chunk)
- **963 Tests gesamt**

### v6.1.0 — Audit-Hardening, Feature-Gates & Wizard-Erweiterung

- **Mode-Container Refactoring**: App.tsx aufgeteilt in `GameModeContainer`, `SetupModeContainer`, `LeagueModeContainer`, `TournamentFinishedContainer`. Neuer `AppHeader.tsx`.
- **Feature-Gate System**: `entitlements.ts`, `FeatureGateModal.tsx`, `useFeatureGate.ts` — Freemium-Vorbereitung mit Feature-Verfügbarkeitsprüfung.
- **Monitoring**: Sentry-Integration (`initSentry.ts`), Monetization-Telemetrie, Recovery-Modul, Start-Validierung.
- **5 neue Hooks**: `useFeatureGate`, `usePrintViewWarmup`, `useRemoteHostBridge`, `useSharedPayloads`, `useTournamentModeTransitions`.
- **Setup-Wizard 6 Schritte**: Neuer „Gut zu wissen"-Schritt mit Feature-Tipps (Fernbedienung, TV-Modus, Sprachansagen). 16 neue Translation-Keys.
- **Lint-Fix**: Lazy-imports in `renderApp()` verschoben (`react-refresh/only-export-components`).
- **Dependencies**: GH Actions v6, @vitejs/plugin-react 5.2.0, eslint-plugin-react-refresh 0.5.2, @types/node 25, globals 17.
- **963 Tests gesamt** (15 Dateien, +20 neue Tests)

### v6.0.0 — IndexedDB-Migration: Cache-First Storage-Architektur

- **IndexedDB als primärer Speicher**: Alle persistenten Daten (config, settings, checkpoint, templates, history, players, leagues, gameDays) von localStorage nach IndexedDB migriert. Speicher-Limit von ~5MB auf ~50MB+ erhöht.
- **Cache-First Pattern**: In-Memory-Cache mit synchronen Reads, async IndexedDB-Writes. Kein API-Change für 56+ Consumer-Stellen. Einziger Async-Punkt: `initStorage()` vor React-Mount.
- **Automatische Migration**: Einmalige Migration von localStorage → IndexedDB beim ersten App-Start. Items ohne gültige String-`id` werden gefiltert. Migrierte Keys werden aus localStorage gelöscht.
- **Graceful Fallback**: Bei fehlendem IndexedDB → automatischer Fallback auf localStorage. App funktioniert identisch.
- **Neues Modul**: `src/domain/storage.ts` (~300 Zeilen) — IndexedDB-Wrapper, In-Memory-Cache, Migration, Exports: `initStorage()`, `resetStorage()`, `isStorageReady()`, `getCached()`, `setCached()`, `setCachedItem()`, `deleteCachedItem()`
- **6 Persistence-Module refactored**: configPersistence.ts, templatePersistence.ts, historyPersistence.ts, playerDatabase.ts, leaguePersistence.ts, league.ts — alle localStorage-Aufrufe durch Cache-API ersetzt
- **main.tsx**: Async `initStorage()` vor React-Mount mit Fallback
- **Neue Dependency**: `idb` (~2KB gzip), **Neue Dev-Dependency**: `fake-indexeddb`
- **14 neue Tests**, **598 Tests gesamt** (503 Logic + 95 Component)

### Test-Suite Erweiterung — 943 Tests

- **345 neue Tests** in 9 neuen Dateien, alle Domain-Module 100% abgedeckt
- **edge-cases.test.ts** (88 Tests): Timer, Blinds, Player, Multi-Table, Format, Tournament, Validation, Helpers
- **sound-speech.test.ts** (54 Tests): Sound-Effekte, alle 35 announce*-Funktionen, Graceful Degradation
- **hooks.test.tsx** (41 Tests): useKeyboardShortcuts, useGameEvents, useVoiceAnnouncements
- **integration.test.ts** (35 Tests): Cross-Module-Flows (Checkpoint Round-Trip, Timer-Lifecycle, Config-Backward-Compat, Full Tournament Flow, Language Switching)
- **tournamentActions.test.tsx** (34 Tests): useTournamentActions Hook (10 Callbacks inkl. eliminatePlayer Chain)
- **i18n.test.ts** (24 Tests): Key-Paritaet, Placeholder-Konsistenz, Value-Qualitaet, t()-Edge-Cases
- **persistence.test.ts** (24 Tests): Config/Settings/Checkpoint Round-Trips, parseConfigObject Backward-Compat
- **toast.test.ts** (18 Tests): Toast-System Module-Level State
- **controls.test.tsx** (15 Tests): Controls-Komponente, ARIA, Last Hand, Hand-for-Hand, Clean View
- **display-channel.test.ts** (12 Tests): BroadcastChannel Serialization, Communication
- **943 Tests gesamt** (12 Dateien)

### v5.3.0 — Code-Qualität, Performance & Web Vitals

- **React.memo auf TimerDisplay**: `TimerDisplay` (re-rendert 4×/Sek via useTimer) mit `memo()` gewrappt — verhindert unnötige Re-Renders bei unrelated State-Änderungen. 9 Game-Mode-Komponenten nutzen jetzt React.memo.
- **Suspense LoadingFallback**: Neue `LoadingFallback.tsx` Komponente mit animierten Pulse-Dots. 13 `<Suspense fallback={null}>` in 4 Dateien durch `<Suspense fallback={<LoadingFallback />}>` ersetzt — sichtbares Ladefeedback statt leerer Fläche.
- **computeSidePots Validierung**: Guard-Clause `filter(s => s > 0)` gegen negative/null Stack-Werte. 3 neue Tests.
- **Komponenten-Tests erweitert**: 17 neue Tests für ConfigEditor (6×), SettingsPanel (5×), PlayerPanel (4×), LoadingFallback (2×). Test-Abdeckung von 13 auf 17 Komponenten erhöht.
- **Dependency-Updates**: Tailwind 4.2.0→4.2.1, @tailwindcss/vite 4.2.0→4.2.1, typescript-eslint 8.56.0→8.56.1, ESLint 9.39.3→9.39.4, @eslint/js 9.39.3→9.39.4.
- **Web Vitals Tracking**: `@vercel/speed-insights` installiert und in main.tsx eingebunden. LCP/INP/CLS-Metriken im Vercel Dashboard verfügbar.
- **Neue Datei**: `LoadingFallback.tsx`
- **Neue Dependency**: `@vercel/speed-insights`
- **534 Tests gesamt** (451 Logic + 83 Component)

### v5.2.1 — Emerald-zu-Accent Migration, Aria-Labels, i18n-Fixes & Cleanup

- **Akzentfarbe vollständig migriert**: Alle 69 verbliebenen hardkodierten `emerald-*` Tailwind-Klassen in 20 Setup/Liga/Utility-Komponenten durch CSS Custom Properties (`var(--accent-*)`) ersetzt. 3 neue CSS `@utility` Klassen (`btn-accent-gradient`, `bg-accent-700`, `bg-accent-800`) für häufige Button-Patterns mit Hover-States.
- **Aria-Labels auf Icon-Buttons**: 25+ Icon-only Buttons (✕, ✓, ▲, ▼, ⧉, 📝, ⚙️, ✏️, 🗑️) mit `aria-label` Attributen versehen. `aria-label` auf LanguageSwitcher DE/EN-Buttons. `aria-sort` + `aria-label` auf sortierbare Spaltenköpfe in LeagueStandingsTable.
- **Hardkodierte Strings i18n**: `"Pts"` → `t('league.settings.pointsAbbr')`, `'Rebuy ✓'` → `t('display.rebuyActive')`, `placeholder="+2 or -1"` → `t('league.correction.pointsPlaceholder')`.
- **i18n-Cleanup**: 28 unbenutzte Translation-Keys aus DE + EN entfernt (Altlasten aus Refactorings). 6 neue Keys hinzugefügt (language.selectDE/EN, league.correction.pointsPlaceholder). README.md Test-Badge korrigiert.
- **534 Tests gesamt** (451 Logic + 83 Component)

### v5.2.0 — Remote Control Rebuild mit PeerJS

- **PeerJS-basierte Fernsteuerung**: Kompletter Neuaufbau der Remote-Control-Funktion. Alte WebRTC-SDP-basierte Signalisierung (2 QR-Scans) ersetzt durch PeerJS Cloud Signaling (1 QR-Scan). QR-Code enthält jetzt kurze App-URL mit `#remote=PKR-XXXXX` Hash — Phone-Kamera erkennt URL, öffnet App, verbindet automatisch.
- **Touch-optimierter Controller**: Fullscreen-Smartphone-UI mit großen Touch-Targets (min 48px). Buttons: Play/Pause, Nächster/Vorheriger Level, Dealer weiterrücken, Sound An/Aus, Call the Clock, Level zurücksetzen. Timer-Anzeige mit Blinds, Spieleranzahl, Bubble-Badge. Dark-Mode forced, Safe-Area-Insets, Wake Lock.
- **Auto-Reconnect**: Exponentieller Backoff (2s/4s/8s, max 3 Versuche). Status-Banner: Verbinden → Verbunden → Verbindung verloren → Erneut versuchen.
- **Host-Modal vereinfacht**: Nur QR-Code + lesbare Raum-ID. Kein manueller Antwort-Code mehr nötig.
- **Neuer Hook**: `useRemoteControl.ts` extrahiert Remote-State-Management aus App.tsx.
- **Neue Dependency**: `peerjs` (~45KB gzip) für WebRTC-Signaling via PeerJS Cloud Server.
- **Entfernt**: `compressSDP()`, `decompressSDP()`, SDP-Kompressionslogik, `#rc=` Hash-Support.
- **Neue Dateien**: `useRemoteControl.ts`
- **3 geänderte Dateien**: `remote.ts` (komplett neu), `RemoteControl.tsx` (komplett neu), `App.tsx`
- **~4 Translation-Keys netto** (7 entfernt, 11 hinzugefügt pro Sprache), **432 Tests gesamt** (+2 netto)

### v5.1.1 — Liga-Detail & QR-Sharing

- **Spieler-Detail-Modal**: Klick auf Spielername in LeagueStandingsTable öffnet lazy-loaded `LeaguePlayerDetail.tsx` — Punkteverlauf, Platzverteilung, Streaks, Form, Head-to-Head-Statistiken. Nutzt `computeLeaguePlayerStats()` aus league.ts.
- **QR-Sharing für Liga-Tabelle**: `encodeLeagueStandingsForQR()` erzeugt kompakte `#ls=` Hash-URL. `decodeLeagueStandingsFromQR()` parst zurück. `SharedLeagueView.tsx` Modal für geteilte Liga-Standings (analog zu `#r=` für Turnierergebnisse). App.tsx erkennt `#ls=` beim Start.
- **Registered Player ID**: `GameDayParticipant.registeredPlayerId` verknüpft Spieltag-Teilnehmer mit persistenter `RegisteredPlayer`-Datenbank für stabile Identität bei Namensänderungen. Befüllt in `createGameDayFromResult()` (App.tsx) und `GameDayEditor.tsx`.
- **Neue Dateien**: `LeaguePlayerDetail.tsx`, `SharedLeagueView.tsx`
- **~44 Translation-Keys** (22 DE + 22 EN: playerDetail + shared.leagueTitle), **5 neue Tests** — **408 Tests gesamt**

### v5.1.0 — Homegame-Ligamodus: Vollausbau in 3 Phasen

**Phase 1 — MVP „Digitaler Ligabogen":**
- **Liga als dritter App-Modus**: `type Mode = 'setup' | 'game' | 'league'`. Dedizierter Liga-View statt Modal.
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

### v5.0.1 — QA-Fixes: Akzentfarbe, Hintergründe, Remote-Kompression, TV-Modus & Tooltips

- **Akzentfarbe vollständig migriert**: ~40 hardkodierte `emerald-*` Tailwind-Klassen in Game-Mode-Komponenten durch `var(--accent-*)` CSS Custom Properties ersetzt. Betroffene: `PlayerPanel.tsx`, `RebuyStatus.tsx`, `LevelPreview.tsx`, `RemoteControl.tsx`, `ThemeSwitcher.tsx`, `LanguageSwitcher.tsx`, `VoiceSwitcher.tsx`, `PlayersScreen.tsx`. Pattern: `color-mix(in srgb, var(--accent-500) 10%, transparent)`.
- **3 neue Hintergrund-Optionen**: `felt-red`, `midnight`, `sunset` — 9 Hintergrundmuster gesamt. 6 neue Translation-Keys.
- **Header-Tooltips**: `title`-Attribute auf allen Header-Buttons (Vorlagen, Ligen, Historie, Modus-Toggle, Theme/Language/Voice-Switcher).
- **Remote DEFLATE-Kompression** (veraltet, ersetzt durch PeerJS in v5.2.0): `compressSDP()` / `decompressSDP()` entfernt.
- **TV-Spieleranzeige kompakter**: `PlayersScreen.tsx` — adaptives Grid (5/4/3 Spalten nach Spielerzahl), reduziertes Spacing.
- **Dealerbutton TV-bedingt**: `showDealerBadges` durch `DisplayStatePayload` → `DisplayMode` → `SeatingScreen` durchgereicht.
- **6 Translation-Keys**, **343 Tests gesamt**

### v5.0.0 — Feature-Komplett: Remote-Steuerung, Presets, Akzentfarben, Re-Entry & Refactoring

**Phase 1 — Quick Wins:**
- **Turnier-Presets**: 3 vordefinierte Turnierprofile (Schnelles Cashgame, Standard Home Game, Deep Stack). `getBuiltInPresets()` in persistence.ts. Preset-Buttons auf SetupPage.
- **Side-Pot-Rechner**: `computeSidePots()` in tournament.ts. `SidePotCalculator.tsx` Modal mit Spieler-Stack-Eingabe. Aufrufbar aus PlayerPanel.
- **Ticker-Banner**: Scrollende Info-Zeile im TV-Display (nächster Level, Avg Stack, Spielerzahl, Prizepool). Reine CSS-Animation.
- **Custom-Akzentfarbe**: 6 wählbare Farben (emerald/blue/purple/red/amber/cyan). CSS Custom Properties `--accent-*`. Farbkreis-Picker im SettingsPanel.

**Phase 2 — Differenzierung:**
- **Hintergrundbilder**: 6 CSS-Gradient-Backgrounds (none/felt-green/felt-blue/casino/dark-wood/abstract). `--bg-pattern` Custom Property. Vorschau-Grid im SettingsPanel.
- **Blindstruktur nach Ziel-Endzeit**: `generateBlindsByEndTime()` in blinds.ts. Tab im BlindGenerator mit Zeitpicker + Live-Preview.
- **Re-Entry-Modus**: `reEnterPlayer()` in players.ts. Neuer Spieler-Eintrag mit frischem Stack, `originalPlayerId`-Verknüpfung, `reEntryCount`. Button bei eliminierten Spielern. Auto-Platzierung am kleinsten Tisch.
- **Seat-Locking**: `Seat.locked` Property. `toggleSeatLock()` in tables.ts. Gesperrte Sitze werden bei Verteilung und Balancing übersprungen. Toggle im Setup.
- **Druckbare Ergebnisse**: Tournament-Ergebnisse über PrintView druckbar.

**Phase 3 — Innovation:**
- **Remote-Steuerung (WebRTC)**: Smartphone-Fernsteuerung via WebRTC Data Channel (ab v5.2.0 mit PeerJS Cloud Signaling). `RemoteHost` + `RemoteController` Klassen in `remote.ts`. `RemoteControl.tsx` mit Host-QR-Modal + Controller-UI. Lazy-loaded ~9KB Chunk.
- **App.tsx Refactoring**: `useKeyboardShortcuts` (72 Zeilen) und `useTournamentActions` (317 Zeilen) extrahiert. App.tsx von ~1543 auf ~1300 Zeilen reduziert.
- **UI-Integrationstests**: 14 Komponententests via `@testing-library/react` (NumberStepper, CollapsibleSection, PrintView). Test-Setup mit jest-dom + matchMedia Mock.
- **Neue Dateien**: `remote.ts`, `RemoteControl.tsx`, `SidePotCalculator.tsx`, `useKeyboardShortcuts.ts`, `useTournamentActions.ts`, `tests/components.test.tsx`, `tests/setup.ts`
- **~100 Translation-Keys**, **52 neue Tests** — **343 Tests gesamt**

### v4.1.0 — Multi-Table Overhaul: Seat-Level Tournament Management

- **Seat-Level Datenmodell**: `Table` mit `seats: Seat[]` (statt `playerIds[]`), `maxSeats`, `status: TableStatus`, `dealerSeat`. `TableMove` mit `fromSeat/toSeat`, `reason: TableMoveReason`, `timestamp`. `MultiTableConfig` (`dissolveThreshold`, `autoBalanceOnElimination`).
- **Domain Logic Rewrite**: 15+ Funktionen in `tables.ts` — seat-basierte Distribution (round-robin P1→T1S1, P2→T2S1), Balancing (höchster Sitz → niedrigster Sitz), Dissolution, `seatPlayerAtSmallestTable()`, `advanceTableDealer()`, `findPlayerSeat()`.
- **Tischauflösung**: Auto-Dissolution bei ≤ Schwelle Spieler, Status `'dissolved'`, Round-Robin-Verteilung auf aktive Tische.
- **Elimination Chain**: removeFromTable → Dissolution Loop → Final Table Check → Auto-Balance. Move-Protocol über Refs + useEffect + Voice.
- **Reinstate/Late Reg**: Automatische Platzierung am kleinsten Tisch.
- **MultiTablePanel Rewrite**: Seat-Grid, Dealer-Badge, Move-Log mit Reason-Icons, aufgelöste Tische.
- **Setup**: `MultiTableConfig` UI (Dissolve-Threshold, Auto-Balance, empfohlene Tischanzahl, Sitzplatz-Preview).
- **PlayerPanel**: Tisch/Sitz-Badge. **SeatingScreen**: Multi-Table SVG Grid. **DisplayMode**: Tables-Prop.
- **Voice**: `announceTableMove()` mit Sitz, `announceTableDissolution()` neu.
- **Backward-Compat**: `migrateTable()` konvertiert altes → neues Format.
- **~30 Translation-Keys**, **14 neue Tests** — **291 Tests gesamt**

### v4.0.1 — Sprachansagen-Vervollständigung

- **5 neue Ansagen**: Mystery Bounty Draw, Call the Clock (Start + Ablauf), Late Registration geschlossen, personalisierter Turniersieger.
- **8 neue MP3s** (4 DE + 4 EN). **460 Audio-Dateien** (230 pro Sprache).
- **8 Translation-Keys**, `voiceEnabled`-Prop an CallTheClock, `winnerName` an useGameEvents.

### v4.0.0 — Phase 5: Multi-Table Support (Basic)

- **Multi-Table Datenmodell**: Erste Version mit `Table`, `TableMove`, `tables.ts`, `MultiTablePanel.tsx`.
- **Table Balancing**, **Final Table Merge**, **Setup-Integration**.
- **28 Translation-Keys**, **15 neue Tests** — **277 Tests gesamt**

### v3.1.0 — Phase 4: UX & Druckansicht

- **Druckbare Blindstruktur**: `PrintView.tsx` — Print-Button auf Setup-Seite, `@media print` Styles, Blind-Tabelle + Chips + Auszahlung.
- **Setup-Wizard**: `SetupWizard.tsx` — 5-Schritte-Ersteinrichtung (Willkommen → Spieler → Buy-In → Geschwindigkeit → Start). Nur bei erstem Besuch.
- **Sitzplatz-Diagramm**: `SeatingScreen.tsx` — SVG-Pokertisch im TV-Modus. Dealer-Button, Chip-Leader, Status-Indikatoren.
- **Neue Dateien**: `PrintView.tsx`, `SetupWizard.tsx`, `display/SeatingScreen.tsx`
- **26 Translation-Keys**, **2 neue Tests** — **262 Tests gesamt**

### v3.0.0 — Phase 3: Liga-Management & Mystery Bounty

- **Liga-Management**: `League`, `PointSystem`, `LeagueStanding` Types. CRUD in `poker-timer-leagues`. `LeagueManager.tsx` Modal mit Leaderboard, Text/CSV-Export. `computeLeagueStandings()`. Liga-Dropdown im Setup.
- **Mystery Bounty**: `BountyConfig.type: 'fixed' | 'mystery'`, `mysteryPool`. `drawMysteryBounty()`. Segmentierter Toggle + Pool-Editor im BountyEditor.
- **Neue Datei**: `LeagueManager.tsx`
- **60 Translation-Keys**, **14 neue Tests** — **260 Tests gesamt**

### v2.11.0 — Phase 2: Player Ecosystem & Architektur

- **Persistente Spielerdatenbank**: Spielernamen in `poker-timer-players` (localStorage) gespeichert. Autocomplete via `<datalist>` im PlayerManager. CRUD: `loadPlayerDatabase()`, `addRegisteredPlayer()`, `deleteRegisteredPlayer()`, `importPlayersFromHistory()`, `syncPlayersToDatabase()`. Auto-Sync bei Turnierend.
- **Call-the-Clock Timer**: Shot-Clock-Countdown Modal (Default: 60s, 10–300s). Großer Countdown, Fortschrittsbalken, Tension-Beeps letzte 10s, Auto-Close bei 0. Tastenkürzel `C`. `callTheClockSeconds` in Settings. Lazy-loaded (~2.3 KB Chunk).
- **Reinstate-Verbesserung**: Alle eliminierten Spieler reinstatable (nicht nur der letzte). Placements automatisch neu berechnet bei Reinstate aus der Mitte.
- **logic.ts Module Split**: 1760 Zeilen → 9 Module + Barrel. `helpers.ts`, `format.ts`, `timer.ts`, `blinds.ts`, `players.ts`, `chips.ts`, `validation.ts`, `tournament.ts`, `persistence.ts`. Alle bestehenden Imports via Barrel unverändert.
- **DisplayMode Subfolder**: 642 Zeilen → 7 Dateien in `components/display/`. Orchestrator + 5 Sub-Screens + Barrel.
- **Neue Dateien**: `CallTheClock.tsx` + 9 Domain-Module + `display/` Subfolder (7 Dateien)
- **14 neue Translation-Keys** (7 DE + 7 EN)
- **7 neue Tests** — **246 Tests gesamt**

### v2.10.0 — Phase 1: Foundation & Quick Wins

- **SetupPage Refactoring**: App.tsx von 1465 auf 1102 Zeilen reduziert. Neue `SetupPage.tsx` (406 Zeilen).
- **Per-Player Rebuy Cap**: `maxRebuysPerPlayer` in RebuyConfig, `canPlayerRebuy()` Helper.
- **Late Registration**: `LateRegistrationConfig`, `isLateRegistrationOpen()`, Spieler während Turnier hinzufügen.
- **Benannte Pausen**: `Level.label` im DisplayMode + Voice-Ansage.
- **Lautstärke-Regler**: Master Volume (0–100%), Range-Slider im SettingsPanel.
- **Bug-Fixes**: Sidebar i18n, `formatResultAsText` Locale, dynamische QR-URL.
- **Neue Datei**: `src/components/SetupPage.tsx`
- **24 Translation-Keys**, **7 neue Tests** — **239 Tests gesamt**.

### v2.9.4 — TV-Modus: 5 rotierende Screens

- **3 neue TV-Screens**: Spieler, Stats, Auszahlung im TV/Projector-Display. 5 rotierende Screens: Spieler → Stats → Auszahlung → Blindstruktur → Chips.
- **8 neue Props** an DisplayMode, **~15 neue Translation-Keys** pro Sprache.
- **232 Tests**, Lint + Build bestanden.

### v2.9.3 — Sprachausgabe: Elimination + Hand-for-Hand MP3

- **Spieler-Elimination Ansage**: `announceElimination(t)` spielt jetzt MP3 „Ein Spieler ist ausgeschieden!" statt leer. Wird bei jeder Elimination getriggert (vor Bounty-Ansage).
- **Hand-for-Hand MP3**: `announceHandForHand()` nutzt jetzt ElevenLabs MP3 statt reinem Web Speech API Fallback.
- **4 neue MP3-Dateien**: `hand-for-hand.mp3` + `player-eliminated.mp3` je DE + EN. **450 Audio-Dateien** (225 pro Sprache).
- **Translation-Key**: `voice.playerEliminated` von dynamisch zu generisch geändert.

### v2.9.2 — QR-Code Vereinfachung

- **Ergebnis-QR-Code entfernt**: Nur noch statischer App-QR-Code. `encodeResultForQR()` und `QR_BASE_URL` aus logic.ts entfernt. `decodeResultFromQR()` bleibt für bestehende `#r=`-Links.
- **App-QR-Code auf Setupseite**: QR-Code zur App-URL wird jetzt auch auf der Setupseite unterhalb des Start-Buttons angezeigt.
- **Translation-Keys**: 2 entfernt (`finished.qrCodes`, `finished.qrResult`). 1 Test entfernt, 1 umgeschrieben — **232 Tests gesamt**

### v2.9.1 — Bug-Fixes: QR-Code + TV-Modus

- **QR-Code Timing-Fix**: Ergebnis-QR-Code wurde nie angezeigt (localStorage-Timing-Bug). Fix: `TournamentResult` als Prop übergeben statt aus localStorage lesen. Text-Kopieren und CSV-Download nutzen ebenfalls Prop direkt.
- **TV-Modus Split-Layout**: Timer + Blinds permanent im oberen Bereich (~55%), nur unterer Bereich rotiert zwischen Blind-Schedule (8 kompakte Zeilen) und Chip-Werten. Vorher: gesamter Screen rotierte, Timer 2/3 der Zeit nicht sichtbar.
- **App.tsx**: Neues `finishedResult` Memo, als Prop an TournamentFinished übergeben.

### v2.9.0 — Hand-for-Hand Mode + Stack Tracking

- **Hand-for-Hand Mode**: Manueller Toggle (Tastenkürzel: H) während der Bubble-Phase. Roter Banner in BubbleIndicator und DisplayMode. „Nächste Hand"-Button startet Timer, User pausiert manuell. Voice-Ansage (`announceHandForHand`) bei Aktivierung via Web Speech API. Deaktiviert sich automatisch wenn Bubble platzt.
- **Stack Tracking pro Spieler**: Optionales `chips?: number` Feld im Player-Interface. `initializePlayerStacks()` berechnet Starting-Stack + Rebuys + Add-Ons. `findChipLeader()` findet den Spieler mit den meisten Chips. `computeAverageStackFromPlayers()` berechnet Durchschnitt aus individuellen Stacks. Inline-Zahleneingabe im PlayerPanel. Chip-Leader-Badge (amber „C"-Kreis). Auto-Adjustment bei Rebuy/Add-On/Elimination. Backward-kompatibel via `parseConfigObject`.
- **28 neue Translation-Keys** (14 DE + 14 EN): Hand-for-Hand (8 pro Sprache), Stack Tracking (5 pro Sprache), Voice (1 pro Sprache)
- **11 neue Tests**: Stack-Tracking-Funktionen — **233 Tests gesamt**

### v2.8.0 — QR-Codes auf dem Ergebnis-Screen

- **QR-Code App-URL**: Statischer QR-Code auf dem Ergebnis-Screen verlinkt zur App (Vercel-URL). Andere Spieler können die App direkt installieren.
- **QR-Code Turnierergebnis**: Dynamischer QR-Code kodiert Turnierergebnis kompakt (Pipe-delimited Format in URL-Hash `#r=`). Empfänger sieht Ergebnisse in der App.
- **SharedResultView**: Neues read-only Modal zeigt geteilte Turnierergebnisse (Standings, Turnier-Info). Wird automatisch geöffnet wenn App mit `#r=` Hash aufgerufen wird.
- **Kompakte Kodierung**: `encodeResultForQR()` / `decodeResultFromQR()` — 8-Spieler-Turnier in ~375 Bytes URL-encoded. Pipe-delimited Header + Semicolon-delimited Players.
- **Theme-aware QR**: `QRCodeSVG` aus `qrcode.react` mit angepassten Farben für Dark/Light Mode. Inline SVG wird von `html-to-image` korrekt in Screenshots erfasst.
- **Neue Dependency**: `qrcode.react` (~13KB gzip, im TournamentFinished-Chunk)
- **Neue Datei**: `src/components/SharedResultView.tsx` (~120 Zeilen)
- **12 neue Translation-Keys** (6 DE + 6 EN): `finished.qrCodes/qrApp/qrResult`, `shared.title/close/invalidData`
- **4 neue Tests**: encodeResultForQR URL-Format, Round-Trip encode/decode, Invalid-Input-Handling — **222 Tests gesamt**

### v2.7.0 — Refactoring + Big Blind Ante

- **Hook-Extraktion `useVoiceAnnouncements()`**: 8 Voice-Announcement-Effects mit Refs aus App.tsx in eigenen Hook extrahiert (~200 Zeilen). Returns `{ reset }` Callback. App.tsx um ~160 Zeilen reduziert.
- **Hook-Extraktion `useGameEvents()`**: Victory-Sound/Pause, Bubble-Sound, ITM-Sound/Flash in eigenen Hook extrahiert (~100 Zeilen). Verwaltet `showItmFlash` State intern. Returns `{ showItmFlash, reset }`.
- **Big Blind Ante (BBA)**: Neuer `AnteMode`-Typ (`'standard' | 'bigBlindAnte'`) in TournamentConfig. BBA-Modus setzt Ante = Big Blind (WSOP/EPT-Standard). Segmentierter Toggle im Setup (Standard / Big Blind Ante), nur sichtbar wenn Ante aktiviert. TimerDisplay zeigt „BBA" statt „Ante". Backward-kompatibles Parsing in `parseConfigObject`.
- **App.tsx Reduktion**: Von ~1500 auf ~1284 Zeilen durch Hook-Extraktion.
- **2 neue Dateien**: `src/hooks/useVoiceAnnouncements.ts`, `src/hooks/useGameEvents.ts`
- **6 neue Translation-Keys** (3 DE + 3 EN): `app.anteStandard`, `app.anteBBA`, `timer.bba`
- **4 neue Tests**: BBA computeDefaultAnte, Standard mode, applyDefaultAntes BBA, importConfigJSON backward compat — **218 Tests gesamt**

### v2.6.0 — Turnier-Historie, Spieler-Statistiken & Export

- **Turnier-Historie**: Ergebnisse werden automatisch nach Turnierende in localStorage gespeichert (max 50 Einträge). Neue `TournamentHistory.tsx` Modal-Komponente mit aufklappbaren Turniereinträgen (Datum, Name, Sieger, Spielerzahl, Prizepool), vollständiger Standings-Tabelle, Einzel-/Gesamt-Löschfunktion.
- **Spieler-Statistiken**: Tab „Spielerstatistik" im Historie-Modal aggregiert alle Ergebnisse nach normalisiertem Spielernamen — zeigt Turniere, Siege, Cashes, Auszahlung, Einsatz, Bilanz, Ø Platz, Knockouts. Sortiert nach Netto-Bilanz.
- **Text-Export (WhatsApp)**: „Text kopieren" Button in TournamentFinished + TournamentHistory — WhatsApp-freundliches Format mit Emoji-Platzierungen (🏆🥈🥉), Prizepool, Spielerzahl.
- **CSV-Export**: „CSV herunterladen" Button — vollständige Turnierdaten als CSV (Place, Name, Payout, Rebuys, AddOn, Knockouts, NetBalance).
- **Neue Interfaces**: `PlayerResult`, `TournamentResult`, `PlayerStat` in types.ts
- **Neue Funktionen**: `buildTournamentResult`, `saveTournamentResult`, `loadTournamentHistory`, `deleteTournamentResult`, `clearTournamentHistory`, `formatResultAsText`, `formatResultAsCSV`, `computePlayerStats` in logic.ts
- **Neue Datei**: `src/components/TournamentHistory.tsx`
- **50 neue Translation-Keys** (27 DE + 27 EN): `history.*`, `app.history`, `finished.copyText/textCopied/downloadCSV/exportOptions`
- **11 neue Tests**: buildTournamentResult (2), Persistence CRUD (4), formatResultAsText, formatResultAsCSV, computePlayerStats (3) — 214 Tests gesamt

### v2.5.0 — TV-Display-Modus

- **TV/Projector Display**: Neuer dedizierter Vollbild-Anzeigemodus (`DisplayMode.tsx`) optimiert für Projektoren und Fernseher. Dunkler Hintergrund, sehr großer Timer (bis 12rem), keine sensiblen Daten (kein Prizepool, keine Standings, keine Controls).
- **Drei rotierende Screens**: Timer-Hauptanzeige (Blinds + Countdown + Fortschrittsbalken + Bubble/Last-Hand-Banner), Blindstruktur-Tabelle (14 sichtbare Levels, aktuelles Level hervorgehoben, vergangene durchgestrichen), Chip-Werte (Grid mit Farben, Werten und nächstem Color-Up).
- **Auto-Rotation**: Automatischer Screen-Wechsel alle 15 Sekunden. Manuelle Navigation per Pfeiltasten (←/→). Screen-Indikator-Punkte in der Top-Bar.
- **Keyboard-Shortcut**: `T` zum Ein-/Ausschalten des TV-Modus. `Escape` zum Beenden.
- **Header-Button**: 📺-Button im Header während des Spielmodus (nicht bei Turnierende).
- **Lazy-loaded**: ~8,5 KB separater Chunk, nur bei Bedarf geladen.
- **11 neue Translation-Keys** pro Sprache: `display.exit`, `display.playersRemaining`, `display.nextLevel`, `display.blind`, `display.ante`, `display.break`, `display.activate`, `display.schedule`, `display.chips`, `display.rotationHint`, `display.navigate`
- **Neue Datei**: `src/components/DisplayMode.tsx` (~320 Zeilen)
- **App.tsx**: `displayMode` State, `KeyT` Shortcut, 📺 Header-Button, DisplayMode-Overlay-Rendering

### v2.4.0 — Quick Wins: Uhrzeit, Letzte Hand, Dealer-Rotation, ErrorBoundary

- **Uhrzeit im Spielmodus**: Echtzeit-Uhr im Game-Mode-Header, aktualisiert alle 30 Sekunden. Zeigt lokale Uhrzeit im `font-mono tabular-nums` Format.
- **„Letzte Hand"-Banner + Ansage**: Toggle-Button in Controls (amber-Styling) + Tastenkürzel `L`. Zeigt amber Banner über `BubbleIndicator`, Voice-Ansage via `announceLastHand()` (unterscheidet „vor Pause" / „Ende des Levels"). Auto-Reset bei Level-Wechsel.
- **Dealer Auto-Rotation**: Neuer `advanceDealer()` in `logic.ts` — überspringt eliminierte Spieler mit Wrap-Around. „Dealer weiter"-Button im PlayerPanel-Header neben Spieleranzahl.
- **React ErrorBoundary**: `ErrorBoundary.tsx` Class Component in `main.tsx` wrapping gesamte App. Fängt Lazy-Load-Fehler und Render-Crashes ab. Hardcoded English Fallback-UI mit Reload-Button.
- **Promise-basierte Sound-Voice-Koordination**: `playVictorySound()`, `playBubbleSound()`, `playInTheMoneySound()` geben jetzt `Promise<void>` zurück. `setTimeout`-Pattern in App.tsx durch `async/await` ersetzt — keine Race Conditions mehr bei langsamer AudioContext-Initialisierung.
- **Neue Datei**: `src/components/ErrorBoundary.tsx`
- **10 neue Translation-Keys**: `controls.lastHand`, `controls.lastHandTooltip`, `game.lastHand`, `game.lastHandHint`, `playerPanel.advanceDealer` (DE + EN)
- **8 neue Tests**: advanceDealer (5), Promise-Sounds (3) — 203 Tests gesamt

### v2.3.0 — ElevenLabs MP3 Voice (Deutsch + Englisch)

- **ElevenLabs MP3 Sprachausgabe**: 450 professionelle MP3-Audiodateien — Deutsch (Stimme: Ava) und Englisch (ElevenLabs Voice Library). Modular aufgebaut: Building-Blocks (`blinds.mp3`, `ante.mp3`, `color-up.mp3`) + einzelne Dateien für Levels, Blind-Paare, Ante-Werte, Countdowns, Pausen (minutengenau 1–30 Min) und 27 feste Ansagen.
- **Dreistufiger Audio-Fallback**: Web Audio API (gapless, mit Trailing-Silence-Trimming) → HTMLAudioElement (sequentiell, maximale Browser-Kompatibilität) → Web Speech API (Browser-Stimme als letzter Ausweg). Behebt stille MP3-Fehler in bestimmten Browsern.
- **Neue Datei**: `src/domain/audioPlayer.ts` — MP3-Playback-Engine mit Web Audio API + HTMLAudioElement-Fallback, dynamischem Sprachpfad (`audio/de/` / `audio/en/`)
- **speech.ts Refactoring**: Unified Queue mit `audio`- und `speech`-Items. Manifest-basierte Dateiprüfung (110 Blind-Paare, 20 Ante-Werte, 25 Levels, 30 Pausen-Dauern). Fehler-Logging im Catch-Handler für Diagnose.
- **Beide Sprachen mit Voice**: Sowohl Deutsch als auch Englisch nutzen ElevenLabs MP3s. Voice standardmäßig aktiviert. Bei deaktivierter Sprachausgabe nur Beep-Sounds.
- **Erweiterte Ansagen**: Turnierstart ("Shuffle up and deal!"), Heads-Up, dynamische Spieleranzahl-Ansagen (4–10 Spieler basierend auf ausgezahlten Plätzen), Letzte Hand / Letzte Hand vor der Pause, Noch 5 Minuten, Pause vorbei, Color-Up nächste Pause, Timer pausiert/fortgesetzt. Voice-Countdown nur in Spiellevels (Beeps in Pausen).
- **Vollständige Blind-Pair-Abdeckung**: Alle 110 Blind-Kombinationen vorhanden — Generator-Blinds für Startstacks 1k–100k (schnell/normal/langsam) plus Standard-Kombinationen aus Poker-Turnierformaten (Home Games, WSOP). Kein Speech-Fallback mehr für übliche Blindstrukturen.
- **Pausenzeiten minutengenau**: Alle Pausenansagen von 1 bis 30 Minuten als eigene MP3-Dateien (vorher nur 5/10/15/20/25/30)
- **PWA-Caching**: `.mp3` zu Workbox `globPatterns` hinzugefügt — Audio offline verfügbar
- **Qualitätsverbesserungen**: Race-Condition-Fix in `audioPlayer.ts` (onended bei `source.stop()`), Speech-Fallback für alle Ansagen, HTMLAudioElement überspringt fehlerhafte Dateien statt Abbruch, `victoryVoicePlayedRef` Reset in `switchToSetup`, 20 ungenutzte MP3s entfernt, 4 neue Translation-Keys
- **450 Audio-Dateien** in `public/audio/de/` + `public/audio/en/` (225 pro Sprache, 7 Unterverzeichnisse)
- **3 neue Tests**: audioPlayer Degradation, announceCountdown Return-Value, Dual-Language-Support (203 Tests gesamt)

### v2.2.1 — Dual Deployment (GitHub Pages + Vercel)

- **Vercel-Deployment**: App jetzt auch über Vercel erreichbar (https://7mountainpoker.vercel.app/). Automatisches Deploy bei Push auf `main`.
- **Dynamischer Base-Pfad**: `vite.config.ts` nutzt `VITE_BASE_PATH` Umgebungsvariable (Default: `/`). GitHub Actions setzt `/7MountainPoker/` für GitHub Pages. Keine hardcodierten Pfade mehr in `index.html`.
- **PWA-Pfade dynamisch**: `start_url` und `scope` im PWA-Manifest nutzen dieselbe Base-Variable.

### v2.2.0 — Sprachausgabe-Verfeinerung & VoiceSwitcher

- **VoiceSwitcher im Header**: Neue `VoiceSwitcher.tsx`-Komponente — 2-Segment-Toggle (Noten-Icon / Mikrofon-Icon) zwischen LanguageSwitcher und Mode-Button. Ersetzt Voice-Toggle aus SettingsPanel. Verfügbar in Setup + Spielmodus.
- **Sequentielle Sprachwiedergabe**: Speech-Queue mit `onend`-Verkettung — Ansagen werden nacheinander abgespielt (kein Überlappen). `announceImmediate()` für zeitkritische Countdown-Zahlen (Queue leeren + sofort sprechen).
- **Phonetische Aussprache**: Alle englischen Pokerbegriffe in deutschen Voice-Texten phonetisch angepasst: Bleindz (Blinds), Riebai (Rebuy), Ädd-On (Add-On), Babbl (Bubble), Kaller-App (Color-Up), Inn se Manni (In The Money).
- **Countdown komplett gesprochen**: Voice-Countdown für alle 10 Sekunden (war: nur letzte 5). Timing-Fix: `Math.floor` statt `Math.ceil` — synchron mit Anzeige.
- **Sound-Voice-Koordination**: Sound-Effekte werden vor Sprachansagen abgespielt (delay-basiert, conditional auf `soundEnabled`).
- **Add-On/Rebuy-Timing**: Ansage und Banner vor Pause/nächstem Level. Zentralisierter `lastRebuyLevelIndex`. Add-On-Text: „einmalig verfügbar".

### v2.1.0 — Sprachansagen (Web Speech API)

- **Voice Announcements**: Web Speech API Sprachansagen für Level-Wechsel, Pausen (Start + 30s-Warnung), Bubble, ITM, Eliminierungen, Turniersieger, Add-On, Rebuy-Ende, Color-Up. Verbaler Countdown letzte 5 Sekunden. Offline-fähig, keine Sounddateien.
- **Neue Datei**: `src/domain/speech.ts` — Voice-Engine mit DE/EN-Sprachauswahl, Cancel-before-speak Queue, 11 Convenience-Funktionen
- **Settings**: `voiceEnabled: boolean` in Settings, Toggle „Sprachansagen" im Einstellungspanel
- **13 neue Translation-Keys**: `settings.voice` + 11× `voice.*` (DE + EN)
- **5 neue Tests**: Speech-Modul Degradation + Announcement-Builder (203 Tests gesamt)

### v2.0.1 — Light-Mode-Fixes, Sektionsumbenennung & Clean-View-Button

- **Light-Mode Lesbarkeit**: Alle farbigen UI-Elemente (rot/grün/amber) mit Light-Mode-Basis-Farben + `dark:`-Varianten versehen (14 Dateien)
- **Sektionsumbenennung**: „Turnier-Format" → „Rebuy / Add-On / Bounty" (DE + EN)
- **Clean-View-Button**: In Controls-Komponente integriert, mittig unter Start-Button (über Reset/Restart), prominenter mit Border + Shadow, immer sichtbar
- **Theme ohne Flash**: Inline-Script in `index.html` setzt Dark/Light-Modus vor dem ersten Paint (localStorage oder `prefers-color-scheme`)
- **Theme/Sprache im Spielmodus**: Theme-Switcher und Language-Switcher auch im Spielmodus verfügbar
- **Chips standardmäßig deaktiviert**: `defaultChipConfig()` gibt `enabled: false` zurück; ChipSidebar nur bei aktivierten Chips
- **Color-Up realistischer**: Chips werden erst bei der übernächsten Pause entfernt (nicht bei der ersten möglichen)
- **Add-On-Timing**: Ankündigung erscheint nach Ende der Rebuy-Phase — mit Pause: Banner in Pause + nächstem Level, Timer läuft weiter; ohne Pause: Timer pausiert automatisch für Add-On. `useTimer` akzeptiert optionalen `pauseAtLevelIndex`-Parameter.

### v2.0.0 — Dark/Light Mode, SVG-Chevrons, NumberStepper & Performance

- **Dark/Light Mode**: Vollständiges Theming mit 3-Wege-Toggle (System/Hell/Dunkel). `ThemeProvider` mit System-Preference-Listener, `useTheme()` Hook, `@custom-variant dark` in Tailwind 4, `dark:` Varianten auf allen 24+ Komponenten. PWA `theme-color` dynamisch. CSS Custom Properties für theme-aware Timer-Glow-Animation. Screenshot-Hintergrund passt sich dem Theme an.
- **SVG-Chevrons**: Neue `ChevronIcon`-Komponente ersetzt Unicode-Dreiecke — `w-4 h-4`, `strokeWidth={2.5}`, CSS-Rotation-Animation, `group-hover`-Farbwechsel. Verwendet in CollapsibleSection, CollapsibleSubSection, ChipSidebar, TemplateManager, TournamentFinished.
- **NumberStepper**: Neue Komponente ersetzt native Browser-Spinner — Custom `+`/`-` Buttons mit Long-Press-Support (400ms Delay, 100ms Repeat), optionale `snap`-Funktion, konfigurierbares min/max/step. Verwendet in App.tsx, PlayerManager, ConfigEditor, RebuyEditor, AddOnEditor, BountyEditor, PayoutEditor, ChipEditor.
- **Performance**: Game-Mode-Komponenten (10 Stück) per `React.lazy()` + `Suspense` lazy-loaded. `html-to-image` dynamisch importiert. Haupt-Bundle von 341KB auf 302KB reduziert + ~30KB Game-Chunks.
- **Neue Dateien**: `ChevronIcon.tsx`, `NumberStepper.tsx`, `ThemeSwitcher.tsx`, `src/theme/` (ThemeContext, useTheme, themeContextValue, index)
- **3 neue Translation-Keys**: `theme.system`, `theme.light`, `theme.dark` (DE + EN)

### v1.9.1 — Scrub-Slider Redesign & Add-On-Ankündigung

- **Custom Scrub-Slider**: Nativen Range-Input durch `ScrubSlider`-Komponente ersetzt — identisches Aussehen wie Fortschrittsbalken (Gradient, Glow, Thumb). Pointer Events für Touch + Mouse. Break-Levels in amber.
- **Add-On-Ankündigung**: Prominenter amber Banner in Hauptanzeige (wie Bubble/ITM) wenn Rebuy-Phase endet. `BubbleIndicator` erweitert um `addOnWindowOpen`-Props, Fragment-Return für gleichzeitige Banner.
- **Neue Animation**: `animate-addon-pulse` (amber box-shadow pulse) in `index.css`
- **2 neue Translation-Keys**: `addOn.announcement`, `addOn.announcementDetail` (DE + EN)
- **Range-Slider CSS entfernt**: Globale `input[type="range"]`-Regeln gelöscht (nicht mehr benötigt)

### v1.9.0 — Design Polish: Konsistenz & Verfeinerung

- **Abrundungs-Hierarchie**: Container `rounded-2xl` → Cards `rounded-xl` → Buttons `rounded-lg` → Badges `rounded-md`/`rounded-full` durchgehend vereinheitlicht (10 Komponenten, ~25 Fixes)
- **Border-Standardisierung**: `border-gray-700/40` (Standard), `border-gray-600/50` (Hover), `border-gray-700/30` (Sidebar). Amber-Borders auf `/40` normalisiert (12+ Dateien)
- **Sekundäre Buttons**: Reset/Restart mit `shadow-md` und `active:scale-[0.97]`
- **Range-Slider**: Custom CSS — Emerald-Gradient-Track, Gradient-Thumb mit Glow (webkit + moz)
- **Sidebar-Trennung**: `bg-gray-900/40` Hintergrund, `border-gray-700/30`, Toggle-Buttons vergrößert (`w-7 h-20`)
- **Focus-States**: `ring-1 ring-emerald-500/20` → `ring-2 ring-emerald-500/25` auf allen Inputs (9 Komponenten)
- **Tabellen-Rows**: Hover-States und `border-b` auf Standings, Bounty-Tabelle, Level-Editor; 1. Platz mit amber Border-Left
- **Spieler-Rows**: Hover-Border, Dealer-Badge-Glow, Rebuy-Badge, eliminierte Spieler `opacity-40`
- **Body-Gradient**: Verstärkt + zweiter Gradient bottom-right
- **Checkpoint-Banner**: `border-2`, `shadow-lg`, `animate-fade-in`, Gradient-Restore-Button, Ghost-Dismiss
- **Card-Hover**: CollapsibleSection/SubSection Header mit Hover-Shadows
- **Confirm-Dialog**: Button-Hierarchie verfeinert — Cancel subtiler, Confirm mit Red-Shadow und Scale
- **22 Dateien geändert**: Rein visuelle/CSS-Änderungen, keine Logik, keine neuen Dateien/Dependencies

### v1.8.0 — Premium UI: Glassmorphism, Animationen & taktiles Design

- **Glassmorphic Cards**: `CollapsibleSection` und `CollapsibleSubSection` mit `backdrop-blur-sm`, weichen Schatten und halbtransparenten Backgrounds; Content mit `animate-fade-in`
- **Timer-Glow**: Signatur-Effekt — pulsierender `text-shadow` auf laufendem Timer, Gradient-Fortschrittsbalken mit Glow-Shadow, `animate-countdown-pulse` für Countdown
- **Taktile Buttons**: Gradient-Buttons mit `active:scale-[0.97]`, Shadows und weicheren Borders durchgehend
- **8 Custom Animationen**: `fade-in`, `timer-glow`, `countdown-pulse`, `bubble-pulse`, `itm-flash`, `scale-in`, `slide-in-left`, `slide-in-right` als `@keyframes` + `@utility` in `index.css`
- **Modal-Polish**: `backdrop-blur-sm`, `animate-scale-in`, `shadow-2xl`, `rounded-2xl` auf Confirm-Dialog und TemplateManager
- **Bubble/ITM**: Custom Pulse-Animationen statt `animate-pulse`
- **Globales Input-Pattern**: `bg-gray-800/80`, `border-gray-700/60`, Focus-Ring, `rounded-lg`, Transition auf allen Inputs (10 Komponenten)
- **Settings-Polish**: Checkbox-Gradient, Keycap-Look auf Tastenkürzel-Anzeige
- **Header & Body**: `backdrop-blur-sm` Header, Body-Gradient (`radial-gradient` emerald), Gradient-Buttons
- **23 Dateien geändert**: Rein visuelle/CSS-Änderungen, keine Logik, keine neuen Dateien, keine neuen Translation-Keys

### v1.5.0 — Usability & Progressive Disclosure

- **Collapsible Setup-Sektionen**: Neue `CollapsibleSection`-Karten-Komponente — Setup-Bereiche sind in Karten mit klickbarem Header und Chevron-Indikator gewrappt. Essentielle Sektionen (Spieler, Buy-In, Blindstruktur) standardmäßig offen, optionale (Chip-Werte, Auszahlung, Turnier-Format) eingeklappt mit Summary-Text
- **Turnier-Format-Gruppierung**: Rebuy, Add-On und Bounty in einer gemeinsamen „Turnier-Format"-Karte zusammengefasst (logische Gruppierung verwandter Optionen)
- **Summary-Badges**: Eingeklappte Sektionen zeigen kompakte Zusammenfassung (z.B. „5 Chips, Color-Up aktiv", „3 Plätze, % Prozent", „Rebuy, Bounty: 5 €")
- **Clean View auf Mobile**: Clean-View-Toggle in der mobilen Button-Leiste im Spielmodus hinzugefügt (neben Spieler/Sidebar)

### v1.7.0 — Setup UX: Blindstruktur ausklappbar + Cleanup

- **Blindstruktur ausklappbar**: Level-Tabelle (ConfigEditor) in `CollapsibleSubSection` gewrappt, standardmäßig eingeklappt mit Summary „12 Levels, 3 Pausen, Ø 15 Min"
- **BlindGenerator vereinheitlicht**: Eigener Toggle durch `CollapsibleSubSection` ersetzt — konsistente Chevrons und Styling
- **Turnier-Name + Buy-In zusammengeführt**: Neue „Turnier-Grundlagen"-Karte spart eine Sektion
- **Summary-Badges auch bei offenen Sektionen**: Dezenter Subtitle unter dem Titel zeigt Key-Info
- **Spieler-Summary**: „6 Spieler"-Badge auf Spieler-Sektion
- **Sticky Start-Button auf Mobile**: Button bleibt am unteren Bildschirmrand sichtbar
- **Neue Komponente**: `CollapsibleSubSection.tsx` — leichteres Collapsible für Verschachtelung in Karten
- **3 neue Tests**: `computeBlindStructureSummary` (187 Tests gesamt)

### v1.6.0 — Bug-Fixes, Accessibility & Turnier-Checkpoint

- **useTimer-Fix**: Render-Phase-State-Mutation durch `useRef` + `useEffect` ersetzt
- **Tastenkürzel-Fix**: Dokumentation korrigiert (P → V für „Vorheriges Level")
- **Accessibility**: ARIA-Labels auf Timer, Controls, Bubble/ITM, Collapsible-Sections; `role="dialog"` + `aria-modal` + Auto-Focus + Escape-to-Close auf Modals (TemplateManager, Confirm-Dialog)
- **Turnier-Checkpoint**: Automatisches Speichern des Spielstands bei jeder Aktion im Spielmodus; bei App-Neustart Wiederherstellungs-Banner im Setup mit „Turnier fortsetzen" / „Verwerfen"; Timer wird immer pausiert wiederhergestellt
- **8 neue Translation-Keys**: `checkpoint.*` (DE + EN)

### v1.4.0 — Vorlagen, Clean View & Stabilität

- **Einheitlicher Vorlagen-Dialog**: Ein Button „Vorlagen" im Setup vereint alles — Browser-Vorlagen speichern/laden/löschen, als JSON-Datei exportieren/importieren (File System Access API mit nativem Dateidialog, Download-Fallback für Safari/Firefox), und aufklappbare JSON-Import/Export-Sektion für Power-User. Separates Import/Export-Modal entfernt.
- **Safari-Hinweis**: Automatischer Tipp wenn der Browser keine native Ordnerauswahl beim Speichern unterstützt (Safari → Einstellungen → Download-Ort auf „Nachfragen")
- **Editierbarer Color-Up Plan**: Color-Up Zeitpunkte manuell anpassen oder automatisch generieren (Chip Race)
- **Clean View**: Umschalter im Spielmodus blendet Stats, Sidebars und sekundäre Buttons aus — nur Timer, Blinds und Bubble bleiben (Tastenkürzel: F)
- **Auto-Start bei Levelwechsel**: Timer startet automatisch bei Weiter/Zurück
- **Timer-Zuverlässigkeit**: Fix für sporadisches Nicht-Starten bei Levelwechsel (eager interval restart)
- **iPad-Kompatibilität**: Build-Target auf Safari 14 / ES2020 angepasst, Lade-Fallback in index.html
- **Wake Lock**: Bildschirm bleibt während laufendem Timer an (Wake Lock API), wird bei Tab-Wechsel automatisch neu angefordert
- **Sound-Fix für Safari**: Gemeinsamer AudioContext aus User-Geste initialisiert, Custom Checkboxen (grün/grau) statt native accent-color
- **Text & i18n**: „Nächstes: Pause" (Grammatik-Fix), Color-Up Banner mit „(Chip Race)", lokalisierte Pause-Labels, aktualisierte Beschreibungen, unbenutzte Translation-Keys entfernt
- **7 neue Tests**: exportTemplateToJSON, parseTemplateFile Round-Trip und Fehlerbehandlung (184 Tests gesamt)
- **Cross-Device-Kompatibilität**: Safe Area Insets (viewport-fit=cover, env() Padding), 100dvh statt 100vh, größere Touch-Targets (Checkboxen, Rebuy-Buttons), inputmode="numeric" auf allen Zahleneingaben, Fullscreen API mit webkit-Prefix und try-catch, Clipboard API abgesichert, localStorage try-catch für Private Browsing, Tablet-Breakpoint (md: ab 768px)

### v1.3.0

- **Turnier-Statistiken**: Live-Anzeige im Spielmodus — Spieleranzahl, Preisgeld, Ø Stack in BB, Spielzeit, geschätzte Restzeit
- **Bubble-Anzeige**: Rot pulsierender "BUBBLE!"-Banner wenn activePlayers === paidPlaces + 1, grüner "In The Money!"-Flash beim Bubble-Burst (5 Sek)
- **Bubble/ITM Sounds**: Spannungs-Sound (Sawtooth) bei Bubble, Fanfare (Triangle) bei In The Money
- **Screenshot/Teilen**: Turnier-Ergebnisse als PNG capturen — Web Share API auf Mobile, Download-Fallback auf Desktop (html-to-image)
- **PWA**: Progressive Web App mit Manifest, Service Worker, installierbar auf Mobile/Desktop (vite-plugin-pwa)
- **Turnier-Templates**: Benannte Turnierkonfs speichern/laden/löschen via localStorage
- **23 neue Tests**: formatElapsedTime, computeEstimatedRemainingSeconds, computeAverageStackInBB, isBubble, isInTheMoney, Template-CRUD (177 Tests gesamt)

### v1.2.0

- **Blindstruktur-Generator**: 3 Geschwindigkeiten (schnell/normal/langsam) mit eigener BB-Progression, chip-aware Rundung, geschätzte Turnierdauer basierend auf Spieleranzahl
- **Chip-Blind-Kompatibilitätsprüfung**: Warnung wenn Chip-Werte geändert werden und die Blindstruktur nicht mehr darstellbar ist
- **PresetPicker entfernt**: Blindstrukturen werden jetzt komplett über den Generator erstellt
- **Add-On automatisch deaktiviert**: Wird Rebuy ausgeschaltet, wird Add-On automatisch zurückgesetzt
- **Rebuy-Anzeige**: Nur während aktiver Rebuy-Phase sichtbar
- **Chip-Duplikat-Warnung**: Warnung bei doppelten Chip-Farben
- **Chip-Auto-Sort**: Automatische Sortierung nach Wertigkeit
- **Color-Up gekoppelt mit Pause**: Chip-Race-Empfehlungen an nächste Pause gekoppelt

### v1.1.0

- Chip-Farben / Denomination-Management mit Color-Up Erinnerung
- Sitzplatz-Zuordnung mit Drag & Drop, Shuffle und Dealer-Button
- Add-On nur in Rebuy-Turnieren verfügbar
- Shuffle-Bestätigung
