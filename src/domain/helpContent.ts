import type { Language } from '../i18n/translations';

// --- Types ---

interface LocalizedText {
  de: string;
  en: string;
}

export interface HelpItem {
  title: LocalizedText;
  body: LocalizedText;
}

export interface HelpSection {
  id: string;
  icon: string;
  title: LocalizedText;
  description: LocalizedText;
  items: HelpItem[];
}

export interface FaqEntry {
  question: LocalizedText;
  answer: LocalizedText;
}

export interface ShortcutEntry {
  key: string;
  label: LocalizedText;
  context: 'game' | 'all';
}

// --- Helper ---

export function matchesSearch(text: LocalizedText, query: string, language: Language): boolean {
  return text[language].toLowerCase().includes(query);
}

export function filterSections(sections: HelpSection[], query: string, language: Language): HelpSection[] {
  if (!query) return sections;
  const q = query.toLowerCase();
  return sections
    .map((section) => {
      // Section title/desc match → keep whole section
      if (matchesSearch(section.title, q, language) || matchesSearch(section.description, q, language)) {
        return section;
      }
      // Filter items
      const filtered = section.items.filter(
        (item) => matchesSearch(item.title, q, language) || matchesSearch(item.body, q, language),
      );
      return filtered.length > 0 ? { ...section, items: filtered } : null;
    })
    .filter((s): s is HelpSection => s !== null);
}

export function filterFaq(entries: FaqEntry[], query: string, language: Language): FaqEntry[] {
  if (!query) return entries;
  const q = query.toLowerCase();
  return entries.filter(
    (e) => matchesSearch(e.question, q, language) || matchesSearch(e.answer, q, language),
  );
}

// --- Data ---

export const helpSections: HelpSection[] = [
  {
    id: 'getting-started',
    icon: '\uD83D\uDE80',
    title: { de: 'Erste Schritte', en: 'Getting Started' },
    description: { de: 'Turnier einrichten und starten', en: 'Set up and start a tournament' },
    items: [
      {
        title: { de: 'Setup-Wizard', en: 'Setup Wizard' },
        body: {
          de: 'Beim ersten Start führt dich ein Wizard durch die wichtigsten Einstellungen: Spieleranzahl, Buy-In, Startchips und Blindgeschwindigkeit. Du kannst den Wizard jederzeit überspringen.',
          en: 'On first launch, a wizard guides you through key settings: player count, buy-in, starting chips, and blind speed. You can skip the wizard at any time.',
        },
      },
      {
        title: { de: 'Setup-Übersicht', en: 'Setup Overview' },
        body: {
          de: 'Im Setup-Modus siehst du aufklappbare Sektionen für alle Einstellungen: Turnier-Grundlagen, Spieler, Blindstruktur, Chip-Werte, Auszahlung, Rebuy/Add-On/Bounty und Audio-Einstellungen. Essentielle Bereiche sind standardmäßig geöffnet.',
          en: 'In setup mode you see collapsible sections for all settings: tournament basics, players, blind structure, chip values, payout, rebuy/add-on/bounty, and audio settings. Essential sections are open by default.',
        },
      },
      {
        title: { de: 'Turnier starten', en: 'Start Tournament' },
        body: {
          de: 'Drücke den grünen "Turnier starten"-Button. Die App prüft vorher, ob die Konfiguration gültig ist (mindestens 2 Spieler, Auszahlungsplätze passen etc.).',
          en: 'Press the green "Start Tournament" button. The app validates your config first (at least 2 players, payout places match, etc.).',
        },
      },
      {
        title: { de: 'Vorlagen & Presets', en: 'Templates & Presets' },
        body: {
          de: 'Speichere deine Turnierkonfiguration als Vorlage, um sie später wiederzuverwenden. Du kannst Vorlagen auch als JSON-Datei exportieren/importieren. Es gibt 3 eingebaute Presets für Schnellstart: Schnelles Cashgame, Standard Home Game, Deep Stack.',
          en: 'Save your tournament config as a template for reuse. You can also export/import templates as JSON files. There are 3 built-in presets for quick start: Quick Cash Game, Standard Home Game, Deep Stack.',
        },
      },
      {
        title: { de: 'Turnier-Checkpoint', en: 'Tournament Checkpoint' },
        body: {
          de: 'Der Spielstand wird bei jeder Aktion automatisch gespeichert. Bei einem App-Neustart kannst du das laufende Turnier fortsetzen oder verwerfen. Der Timer wird immer pausiert wiederhergestellt.',
          en: 'Game state is auto-saved on every action. On app restart, you can resume or discard the running tournament. The timer is always restored paused.',
        },
      },
    ],
  },
  {
    id: 'blind-structure',
    icon: '\uD83D\uDCCA',
    title: { de: 'Blind-Struktur', en: 'Blind Structure' },
    description: { de: 'Blinds generieren und anpassen', en: 'Generate and customize blinds' },
    items: [
      {
        title: { de: 'Blind-Generator', en: 'Blind Generator' },
        body: {
          de: 'Wähle aus 3 Geschwindigkeiten (Schnell/Normal/Langsam). Der Generator erstellt eine passende Struktur basierend auf deinen Startchips. Bei aktivierten Chips wird automatisch auf Chip-Werte gerundet. Die geschätzte Turnierdauer wird angezeigt.',
          en: 'Choose from 3 speeds (Fast/Normal/Slow). The generator creates a matching structure based on your starting chips. With chips enabled, values are auto-rounded to chip denominations. Estimated tournament duration is displayed.',
        },
      },
      {
        title: { de: 'Manuell bearbeiten', en: 'Manual Editing' },
        body: {
          de: 'In der Level-Tabelle kannst du jedes Level einzeln anpassen: Blinds, Ante, Dauer, Pausen hinzufügen/entfernen. Levels lassen sich auch hinzufügen oder löschen.',
          en: 'In the level table you can adjust each level individually: blinds, ante, duration, add/remove breaks. You can also add or delete levels.',
        },
      },
      {
        title: { de: 'Endzeit-Modus', en: 'End Time Mode' },
        body: {
          de: 'Im Tab "Nach Endzeit" gibst du eine Ziel-Turnierdauer ein. Der Generator erstellt automatisch eine Blindstruktur, die in dieser Zeit zum Heads-Up führt.',
          en: 'In the "By End Time" tab, enter a target tournament duration. The generator automatically creates a blind structure that leads to heads-up within that time.',
        },
      },
      {
        title: { de: 'Ante-Optionen', en: 'Ante Options' },
        body: {
          de: 'Aktiviere Ante im Setup. Wähle zwischen Standard-Ante (~12,5% des Big Blind) oder Big-Blind-Ante (BBA, Ante = Big Blind, wie bei WSOP/EPT).',
          en: 'Enable ante in setup. Choose between standard ante (~12.5% of big blind) or Big Blind Ante (BBA, ante = big blind, as in WSOP/EPT).',
        },
      },
      {
        title: { de: 'Druckbare Blindstruktur', en: 'Printable Blind Structure' },
        body: {
          de: 'Im Setup gibt es einen "Drucken"-Button. Er öffnet eine druckoptimierte Ansicht mit Blind-Tabelle, Chip-Werten und Auszahlung — perfekt zum Aushängen am Spieltisch.',
          en: 'In setup there is a "Print" button. It opens a print-optimized view with blind table, chip values, and payout — perfect for posting at the table.',
        },
      },
    ],
  },
  {
    id: 'player-management',
    icon: '\uD83D\uDC65',
    title: { de: 'Spielerverwaltung', en: 'Player Management' },
    description: { de: 'Spieler, Sitzplätze, Stacks und Dealer', en: 'Players, seats, stacks, and dealer' },
    items: [
      {
        title: { de: 'Spieler hinzufügen', en: 'Add Players' },
        body: {
          de: 'Tippe auf "+ Spieler" im Setup. Spielernamen werden automatisch gespeichert und bei zukünftigen Turnieren per Autocomplete vorgeschlagen. Du kannst auch Spieler aus der Historie importieren.',
          en: 'Tap "+ Player" in setup. Player names are saved automatically and suggested via autocomplete in future tournaments. You can also import players from history.',
        },
      },
      {
        title: { de: 'Sitzplätze & Shuffle', en: 'Seats & Shuffle' },
        body: {
          de: 'Weise Sitzplätze per Drag & Drop zu oder nutze den Shuffle-Button für zufällige Platzierung. Der Dealer-Button wird automatisch zugewiesen.',
          en: 'Assign seats via drag & drop or use the shuffle button for random placement. The dealer button is assigned automatically.',
        },
      },
      {
        title: { de: 'Dealer-Rotation', en: 'Dealer Rotation' },
        body: {
          de: 'Im Spielmodus dreht der Dealer-Button automatisch weiter. Eliminierte Spieler werden übersprungen. Du kannst auch manuell weiterdrücken.',
          en: 'In game mode the dealer button rotates automatically. Eliminated players are skipped. You can also advance manually.',
        },
      },
      {
        title: { de: 'Stack Tracking', en: 'Stack Tracking' },
        body: {
          de: 'Optional: Tracke individuelle Chipstacks pro Spieler. "Stacks initialisieren" berechnet Startchips + Rebuys + Add-Ons. Der Chip-Leader erhält ein "CL"-Badge. Stacks passen sich bei Rebuy/Add-On/Elimination automatisch an.',
          en: 'Optional: track individual chip stacks per player. "Initialize stacks" calculates starting chips + rebuys + add-ons. The chip leader gets a "CL" badge. Stacks adjust automatically on rebuy/add-on/elimination.',
        },
      },
      {
        title: { de: 'Multi-Table', en: 'Multi-Table' },
        body: {
          de: 'Für größere Turniere: Aktiviere Multi-Table im Setup, definiere Tischanzahl und Sitzplätze. Spieler werden automatisch verteilt. Tisch-Balancing und Final-Table-Merge laufen automatisch bei Eliminierungen. Einzelne Sitze können gesperrt werden.',
          en: 'For larger tournaments: enable multi-table in setup, define table count and seats. Players are distributed automatically. Table balancing and final table merge happen automatically on eliminations. Individual seats can be locked.',
        },
      },
      {
        title: { de: 'Re-Entry', en: 'Re-Entry' },
        body: {
          de: 'Aktiviere Re-Entry in den Rebuy-Einstellungen. Eliminierte Spieler können mit neuem Stack wieder einsteigen (neuer Eintrag, gleiche Person). Maximale Re-Entries konfigurierbar. Automatische Platzierung am kleinsten Tisch.',
          en: 'Enable re-entry in rebuy settings. Eliminated players can rejoin with a fresh stack (new entry, same person). Max re-entries configurable. Auto-seating at the smallest table.',
        },
      },
      {
        title: { de: 'Späte Anmeldung', en: 'Late Registration' },
        body: {
          de: 'Konfiguriere bis zu welchem Level Nachmeldungen möglich sind. Während des Turniers kannst du dann über "+ Spieler" Nachzügler hinzufügen.',
          en: 'Configure until which level late registrations are allowed. During the tournament, you can add latecomers via "+ Player".',
        },
      },
    ],
  },
  {
    id: 'during-tournament',
    icon: '\u23F1\uFE0F',
    title: { de: 'Während des Turniers', en: 'During the Tournament' },
    description: { de: 'Timer, Tools und besondere Situationen', en: 'Timer, tools, and special situations' },
    items: [
      {
        title: { de: 'Timer-Steuerung', en: 'Timer Controls' },
        body: {
          de: 'Start/Pause mit der Leertaste oder dem Button. Der Timer nutzt Wall-Clock-Zeit (keine Drift). Per Slider kannst du die Zeit im aktuellen Level anpassen. Timer startet automatisch bei Levelwechsel.',
          en: 'Start/pause with spacebar or the button. The timer uses wall-clock time (no drift). Use the slider to adjust time within the current level. Timer auto-starts on level change.',
        },
      },
      {
        title: { de: 'Pausen', en: 'Breaks' },
        body: {
          de: 'Pausen werden automatisch nach dem konfigurierten Level eingelegt. 30 Sekunden vor Pausenende wird eine Warnung angesagt. Color-Up-Events können an Pausen gekoppelt sein.',
          en: 'Breaks are inserted automatically after the configured level. A warning is announced 30 seconds before break ends. Color-up events can be tied to breaks.',
        },
      },
      {
        title: { de: 'Clean View', en: 'Clean View' },
        body: {
          de: 'Taste F blendet Statistiken, Sidebars und sekundäre Buttons aus. Nur Timer, Blinds und wichtige Banner bleiben sichtbar — ideal für fokussiertes Spiel.',
          en: 'Press F to hide stats, sidebars, and secondary buttons. Only timer, blinds, and important banners remain visible — ideal for focused play.',
        },
      },
      {
        title: { de: 'Bubble & In The Money', en: 'Bubble & In The Money' },
        body: {
          de: 'Wenn noch ein Spieler mehr als die Auszahlungsplätze übrig ist, erscheint der "BUBBLE!"-Banner. Beim Burst gibt es einen "In The Money"-Flash. Sound-Effekte und Sprachansagen begleiten beide Events.',
          en: 'When one more player than payout places remains, the "BUBBLE!" banner appears. On burst, an "In The Money" flash shows. Sound effects and voice announcements accompany both events.',
        },
      },
      {
        title: { de: 'Letzte Hand & Hand-for-Hand', en: 'Last Hand & Hand-for-Hand' },
        body: {
          de: 'Taste L sagt die letzte Hand an (unterscheidet vor Pause / Ende des Levels). Hand-for-Hand (Taste H) pausiert nach jeder Hand — ideal während der Bubble-Phase. Deaktiviert sich automatisch wenn die Bubble platzt.',
          en: 'Press L to announce last hand (distinguishes before break / end of level). Hand-for-hand (key H) pauses after each hand — ideal during bubble phase. Auto-deactivates when bubble bursts.',
        },
      },
      {
        title: { de: 'Call the Clock', en: 'Call the Clock' },
        body: {
          de: 'Taste C startet einen Shot-Clock-Countdown (Standard: 60 Sekunden, konfigurierbar 10–300s). In den letzten 10 Sekunden ertönen Spannungs-Beeps. Dauer einstellbar in den Einstellungen.',
          en: 'Press C to start a shot clock countdown (default: 60 seconds, configurable 10–300s). Tension beeps play in the last 10 seconds. Duration adjustable in settings.',
        },
      },
      {
        title: { de: 'Undo / Redo', en: 'Undo / Redo' },
        body: {
          de: 'Jede Turnieraktion (Elimination, Rebuy, Add-On, Dealer-Rotation, Stack-Änderung etc.) kann rückgängig gemacht werden. Cmd+Z für Undo, Cmd+Shift+Z für Redo. Die Buttons zeigen die letzte Aktion an. Bis zu 30 Schritte werden gespeichert.',
          en: 'Every tournament action (elimination, rebuy, add-on, dealer rotation, stack change, etc.) can be undone. Cmd+Z for undo, Cmd+Shift+Z for redo. Buttons show the last action. Up to 30 steps are stored.',
        },
      },
      {
        title: { de: 'ICM-Rechner', en: 'ICM Calculator' },
        body: {
          de: 'Der Independent Chip Model Rechner berechnet die Equity jedes Spielers basierend auf Chipstacks und Auszahlungsstruktur. Exakte Berechnung bis 10 Spieler, Monte-Carlo-Simulation bei mehr. Zugriff über das Spielmodus-Seitenleiste.',
          en: 'The Independent Chip Model calculator computes each player\'s equity based on chip stacks and payout structure. Exact calculation up to 10 players, Monte Carlo simulation for more. Access from game mode sidebar.',
        },
      },
      {
        title: { de: 'Deal-Making / Chop-Rechner', en: 'Deal-Making / Chop Calculator' },
        body: {
          de: 'Beim Final Table (2–6 Spieler) kannst du über den „Deal"-Button im Spielerpanel ein Deal-Modal öffnen. Drei Methoden: ICM Chop (basierend auf Equity), Chip Chop (proportional zu Stacks) und Even Split (gleiche Aufteilung). Auszahlungen sind manuell per Stepper anpassbar. Bei Bestätigung werden alle Spieler mit den vereinbarten Beträgen ausgezahlt.',
          en: 'At the final table (2–6 players), open the deal modal via the "Deal" button in the player panel. Three methods: ICM Chop (equity-based), Chip Chop (proportional to stacks), and Even Split (equal division). Payouts are manually adjustable via stepper. On confirmation, all players are paid out with the agreed amounts.',
        },
      },
      {
        title: { de: 'Side-Pot-Rechner', en: 'Side Pot Calculator' },
        body: {
          de: 'Berechnet Main-Pot und Side-Pots bei All-In-Situationen. Gib die Stacks der beteiligten Spieler ein und sieh sofort die Pot-Aufteilung. Zugriff über den PlayerPanel-Header.',
          en: 'Calculates main pot and side pots for all-in situations. Enter the stacks of involved players and see the pot split instantly. Access from the PlayerPanel header.',
        },
      },
      {
        title: { de: 'Turnier-Statistiken', en: 'Tournament Statistics' },
        body: {
          de: 'Live-Anzeige im Spielmodus: Aktive Spieler, Prizepool, durchschnittlicher Stack in Big Blinds, bisherige und geschätzte Restspielzeit.',
          en: 'Live display in game mode: active players, prize pool, average stack in big blinds, elapsed and estimated remaining time.',
        },
      },
    ],
  },
  {
    id: 'rebuy-addon-bounty',
    icon: '\uD83D\uDD04',
    title: { de: 'Rebuy / Add-On / Bounty', en: 'Rebuy / Add-On / Bounty' },
    description: { de: 'Nachkauf, Zusatzchips und Kopfgeld', en: 'Rebuys, add-ons, and bounties' },
    items: [
      {
        title: { de: 'Rebuy', en: 'Rebuy' },
        body: {
          de: 'Aktiviere Rebuys im Setup mit optionalem Limit (maximal X Rebuys gesamt oder pro Spieler). Rebuys sind nur bis zum konfigurierten Level möglich. Der Prizepool aktualisiert sich automatisch.',
          en: 'Enable rebuys in setup with optional limits (max X rebuys total or per player). Rebuys are only possible up to the configured level. The prize pool updates automatically.',
        },
      },
      {
        title: { de: 'Add-On', en: 'Add-On' },
        body: {
          de: 'Add-On wird automatisch nach Ende der Rebuy-Phase angeboten. Ein amber Banner erscheint. Mit Pause: Banner während Pause + nächstem Level. Ohne Pause: Timer pausiert automatisch.',
          en: 'Add-on is offered automatically after the rebuy phase ends. An amber banner appears. With break: banner during break + next level. Without break: timer pauses automatically.',
        },
      },
      {
        title: { de: 'Fixed Bounty', en: 'Fixed Bounty' },
        body: {
          de: 'Jeder Spieler hat ein festes Kopfgeld. Bei Elimination geht das Kopfgeld an den Eliminator. Knockouts werden im Spielerpanel und in den Ergebnissen angezeigt.',
          en: 'Each player has a fixed bounty. On elimination, the bounty goes to the eliminator. Knockouts are shown in the player panel and results.',
        },
      },
      {
        title: { de: 'Mystery Bounty', en: 'Mystery Bounty' },
        body: {
          de: 'Alternative zu Fixed Bounty: Ein Pool von zufälligen Beträgen. Bei jeder Elimination wird ein zufälliger Betrag gezogen und per Sprachansage verkündet. Presets für verschiedene Pool-Größen verfügbar.',
          en: 'Alternative to fixed bounty: a pool of random amounts. On each elimination, a random amount is drawn and announced via voice. Presets for various pool sizes available.',
        },
      },
    ],
  },
  {
    id: 'remote-control',
    icon: '\uD83D\uDCF1',
    title: { de: 'Fernbedienung', en: 'Remote Control' },
    description: { de: 'Smartphone als Fernsteuerung nutzen', en: 'Use your smartphone as remote' },
    items: [
      {
        title: { de: 'Verbindung herstellen', en: 'Connect' },
        body: {
          de: 'Tippe im Spielmodus auf das 📱-Symbol im Header oder öffne den Share Hub (📡). Ein QR-Code erscheint. Scanne ihn mit deinem Smartphone — die App öffnet sich und verbindet automatisch.',
          en: 'In game mode, tap the 📱 icon in the header or open the Share Hub (📡). A QR code appears. Scan it with your smartphone — the app opens and connects automatically.',
        },
      },
      {
        title: { de: 'Controller-Funktionen', en: 'Controller Functions' },
        body: {
          de: 'Vom Smartphone aus: Play/Pause, nächstes/vorheriges Level, Dealer weiterdrücken, Sound ein/aus, Call the Clock, Level zurücksetzen. Große Touch-Targets für einfache Bedienung.',
          en: 'From your smartphone: play/pause, next/previous level, advance dealer, sound on/off, call the clock, reset level. Large touch targets for easy use.',
        },
      },
      {
        title: { de: 'Spieler-Management', en: 'Player Management' },
        body: {
          de: 'Die aufklappbare Spielerliste auf der Fernbedienung zeigt alle aktiven Spieler. Du kannst Spieler eliminieren (mit Bounty-Picker bei aktivem Kopfgeld), Rebuys vergeben und Add-Ons zuweisen — alles vom Smartphone aus.',
          en: 'The collapsible player list on the remote shows all active players. You can eliminate players (with bounty picker when bounties are active), assign rebuys, and grant add-ons — all from your smartphone.',
        },
      },
      {
        title: { de: 'Turnier-Infos auf dem Controller', en: 'Tournament Info on Controller' },
        body: {
          de: 'Der Controller zeigt neben Timer und Blinds auch Prizepool, durchschnittlichen Stack in Big Blinds, bisherige Spielzeit, das nächste Level, Pausen-Anzeige und ITM-Status.',
          en: 'The controller shows prize pool, average stack in big blinds, elapsed time, next level, break indicator, and ITM status — in addition to timer and blinds.',
        },
      },
      {
        title: { de: 'Mehrere Controller gleichzeitig', en: 'Multiple Controllers' },
        body: {
          de: 'Du kannst mehrere Smartphones gleichzeitig als Fernbedienung verbinden. Alle Controller teilen denselben QR-Code / dieselbe Raum-ID. Die Anzahl verbundener Geräte wird im Share Hub angezeigt.',
          en: 'You can connect multiple smartphones as remote controls simultaneously. All controllers share the same QR code / room ID. The number of connected devices is shown in the Share Hub.',
        },
      },
      {
        title: { de: 'Verbindungsstatus', en: 'Connection Status' },
        body: {
          de: 'Ein farbiger Punkt am 📱-Symbol zeigt den Status: Grün = verbunden. Bei Verbindungsverlust versucht die App automatisch bis zu 3 Mal, sich erneut zu verbinden (exponentieller Backoff).',
          en: 'A colored dot on the 📱 icon shows status: green = connected. On connection loss, the app automatically retries up to 3 times (exponential backoff).',
        },
      },
    ],
  },
  {
    id: 'tv-display',
    icon: '\uD83D\uDCFA',
    title: { de: 'TV-Modus & Anzeige', en: 'TV Display Mode' },
    description: { de: 'Fullscreen-Anzeige für TV, Beamer oder andere Geräte', en: 'Fullscreen display for TV, projector, or other devices' },
    items: [
      {
        title: { de: 'Aktivieren', en: 'Activate' },
        body: {
          de: 'Im Spielmodus: Tippe auf 📺 im Header oder drücke T. Die Anzeige öffnet sich in einem separaten Fenster — ziehe es auf deinen TV/Beamer. Alternativ nutze den Share Hub (📡) für weitere Optionen.',
          en: 'In game mode: tap 📺 in the header or press T. The display opens in a separate window — drag it to your TV/projector. Alternatively use the Share Hub (📡) for more options.',
        },
      },
      {
        title: { de: 'Layout-Varianten', en: 'Layout Variants' },
        body: {
          de: '4 Layouts wählbar: Standard (55/45 Split), Kompakt (40/60, mehr Info), Timer-Only (nur Timer, keine Sekundärscreens), Ultra Large (70/30, übergroßer Timer). Einstellbar über das Zahnrad-Menü.',
          en: '4 layouts available: Standard (55/45 split), Compact (40/60, more info), Timer-Only (timer only, no secondary screens), Ultra Large (70/30, oversized timer). Configurable via settings.',
        },
      },
      {
        title: { de: 'Rotierende Screens', en: 'Rotating Screens' },
        body: {
          de: 'Obere Hälfte: Timer, Blinds, Countdown, Fortschrittsbalken — immer sichtbar. Untere Hälfte: 7 rotierende Screens (Spieler, Stats, Auszahlung, Blindstruktur, Chips, Sitzplan, Liga-Tabelle) alle 15 Sekunden.',
          en: 'Top half: timer, blinds, countdown, progress bar — always visible. Bottom half: 7 rotating screens (players, stats, payout, blind schedule, chips, seating, league table) every 15 seconds.',
        },
      },
      {
        title: { de: 'Cross-Device Display', en: 'Cross-Device Display' },
        body: {
          de: 'Zeige das Turnier auf einem anderen Gerät (Tablet, Laptop, Smart-TV) an. Im Share Hub den Display-QR-Code scannen oder den Link teilen. Mehrere Display-Geräte gleichzeitig möglich. Timer-Interpolation für flüssige Anzeige.',
          en: 'Display the tournament on another device (tablet, laptop, smart TV). Scan the display QR code in the Share Hub or share the link. Multiple display devices simultaneously possible. Timer interpolation for smooth display.',
        },
      },
      {
        title: { de: 'Navigation', en: 'Navigation' },
        body: {
          de: 'Pfeiltasten (← →) wechseln die Screens manuell. Escape oder T beendet den TV-Modus. Indikator-Punkte zeigen den aktuellen Screen.',
          en: 'Arrow keys (← →) switch screens manually. Escape or T exits TV mode. Indicator dots show the current screen.',
        },
      },
      {
        title: { de: 'Kabellose Verbindungen', en: 'Wireless Connections' },
        body: {
          de: 'Der Share Hub zeigt plattformspezifische Anleitungen für AirPlay (Apple), Chromecast (Google) und HDMI-Kabel. Bei Chrome/Edge ist auch die Browser Presentation API verfügbar.',
          en: 'The Share Hub shows platform-specific guides for AirPlay (Apple), Chromecast (Google), and HDMI cables. In Chrome/Edge, the browser Presentation API is also available.',
        },
      },
    ],
  },
  {
    id: 'voice-sounds',
    icon: '\uD83D\uDD0A',
    title: { de: 'Sprachansagen & Sounds', en: 'Voice & Sounds' },
    description: { de: 'Professionelle Ansagen und Sound-Effekte', en: 'Professional announcements and sound effects' },
    items: [
      {
        title: { de: 'Sprachansagen', en: 'Voice Announcements' },
        body: {
          de: 'Aktiviere Voice über den Mikrofon-Toggle im Header. 468 professionelle MP3-Ansagen (ElevenLabs) für Level-Wechsel, Pausen, Bubble, ITM, Eliminierungen, Turniersieger, Tischwechsel und mehr. Funktioniert auch offline (PWA-gecached).',
          en: 'Enable voice via the microphone toggle in the header. 468 professional MP3 announcements (ElevenLabs) for level changes, breaks, bubble, ITM, eliminations, tournament winner, table moves, and more. Works offline too (PWA-cached).',
        },
      },
      {
        title: { de: 'Sound-Effekte', en: 'Sound Effects' },
        body: {
          de: 'Beep-Sounds beim Countdown (letzte 10 Sekunden), Spannungs-Sound bei Bubble, Fanfare bei In The Money, Victory-Sound beim Turniersieger. Lautstärke regelbar in den Einstellungen oder im Setup unter Audio.',
          en: 'Beep sounds during countdown (last 10 seconds), tension sound at bubble, fanfare at in the money, victory sound for tournament winner. Volume adjustable in settings or setup under Audio.',
        },
      },
      {
        title: { de: 'Verbaler Countdown', en: 'Verbal Countdown' },
        body: {
          de: 'In den letzten 10 Sekunden eines Spiellevels werden die Zahlen gesprochen (10, 9, 8...). Während Pausen ertönen stattdessen nur Beeps. Ein/Aus schaltbar im Setup unter Audio.',
          en: 'In the last 10 seconds of a play level, numbers are spoken (10, 9, 8...). During breaks, only beeps sound instead. Toggleable in setup under Audio.',
        },
      },
      {
        title: { de: 'Eigene Audio-Dateien', en: 'Custom Audio Files' },
        body: {
          de: 'Lade eigene MP3/WAV/OGG-Dateien hoch und weise sie bestimmten Ansagen zu (z.B. eigene Level-Wechsel-Melodie, persönlicher Turnierbeginn-Sound). Drag-&-Drop-Editor im Setup unter Audio. Max 5 MB pro Datei.',
          en: 'Upload your own MP3/WAV/OGG files and assign them to specific announcements (e.g., custom level change melody, personal tournament start sound). Drag-and-drop editor in setup under Audio. Max 5 MB per file.',
        },
      },
    ],
  },
  {
    id: 'export-sharing',
    icon: '\uD83D\uDCE4',
    title: { de: 'Export & Teilen', en: 'Export & Sharing' },
    description: { de: 'Ergebnisse teilen, exportieren und archivieren', en: 'Share, export, and archive results' },
    items: [
      {
        title: { de: 'Turnier-Ergebnisse teilen', en: 'Share Tournament Results' },
        body: {
          de: 'Nach Turnierende stehen mehrere Optionen bereit: Text kopieren (WhatsApp-freundlich mit Emoji-Platzierungen), Screenshot als PNG, QR-Code zum Teilen mit anderen App-Nutzern, oder PDF-Export für professionelle Dokumentation.',
          en: 'After tournament end, several options are available: copy text (WhatsApp-friendly with emoji placements), screenshot as PNG, QR code for sharing with other app users, or PDF export for professional documentation.',
        },
      },
      {
        title: { de: 'CSV-Export', en: 'CSV Export' },
        body: {
          de: 'Vollständige Turnierdaten als CSV-Datei herunterladen (Platz, Name, Auszahlung, Rebuys, Add-On, Knockouts, Netto-Bilanz). Auch in der Turnier-Historie verfügbar.',
          en: 'Download complete tournament data as CSV file (place, name, payout, rebuys, add-on, knockouts, net balance). Also available in tournament history.',
        },
      },
      {
        title: { de: 'PDF-Export', en: 'PDF Export' },
        body: {
          de: 'Professionelle PDF-Dokumente mit Turniername, Datum, Standings-Tabelle und Turnierinfo. Nutzt jsPDF für lokale Erzeugung — kein Server nötig.',
          en: 'Professional PDF documents with tournament name, date, standings table, and tournament info. Uses jsPDF for local generation — no server needed.',
        },
      },
      {
        title: { de: 'Turnier-Historie', en: 'Tournament History' },
        body: {
          de: 'Alle Turnierergebnisse werden automatisch gespeichert (max 50). Aufrufbar über "Historie" im Header. Enthält vollständige Standings, Spielerstatistiken-Tab, Text- und CSV-Export. Spieler können daraus importiert werden.',
          en: 'All tournament results are saved automatically (max 50). Access via "History" in header. Contains full standings, player statistics tab, text and CSV export. Players can be imported from here.',
        },
      },
      {
        title: { de: 'Turnier wiederholen', en: 'Repeat Tournament' },
        body: {
          de: 'In der Turnier-Historie kannst du ein vergangenes Turnier per Klick auf "Wiederholen" klonen. Die komplette Konfiguration (Blindstruktur, Buy-In, Spieler etc.) wird ins Setup übernommen — ideal für regelmäßige Home Games mit den gleichen Einstellungen.',
          en: 'In the tournament history, you can clone a past tournament by clicking "Repeat". The complete configuration (blind structure, buy-in, players, etc.) is loaded into setup — ideal for regular home games with the same settings.',
        },
      },
    ],
  },
  {
    id: 'league-series',
    icon: '\uD83C\uDFC6',
    title: { de: 'Liga & Serien', en: 'League & Series' },
    description: { de: 'Langfristige Ligen und Turnierserien verwalten', en: 'Manage long-term leagues and tournament series' },
    items: [
      {
        title: { de: 'Liga erstellen & Punktesystem', en: 'Create League & Point System' },
        body: {
          de: 'Klicke auf "+ Neue Liga", um das Erstellungs-Modal zu öffnen. Dort legst du den Liga-Namen und das Punktesystem fest: Plätze 1–10 (oder mehr) mit individuell konfigurierbaren Punkten. Vorlagen erleichtern den Einstieg: Standard (10-7-5-4-3-2-1), Einfach (5-3-1) oder Top 10 (1–10 je 1 Punkt). Du kannst Plätze beliebig hinzufügen oder entfernen und direkt den Ranking-Algorithmus wählen. Alle Einstellungen lassen sich jederzeit über ⚙️ anpassen.',
          en: 'Click "+ New League" to open the creation modal. There you set the league name and point system: places 1–10 (or more) with individually configurable points. Presets make it easy: Standard (10-7-5-4-3-2-1), Simple (5-3-1), or Top 10 (1–10 each 1 point). You can freely add or remove places and select the ranking algorithm right away. All settings can be adjusted at any time via ⚙️.',
        },
      },
      {
        title: { de: 'Liga-Modus', en: 'League Mode' },
        body: {
          de: 'Verknüpfe Turniere mit deiner Liga — Spieltage werden automatisch bei Turnierende erstellt oder manuell über den 📝-Button angelegt. Die Tabelle zeigt Punkte, Finanzen und Statistiken. Die Sortierung (nach Punkten, Bilanz etc.) wird gespeichert.',
          en: 'Link tournaments to your league — game days are created automatically on tournament end or manually via the 📝 button. Standings show points, finances, and statistics. The sort order (by points, balance, etc.) is saved.',
        },
      },
      {
        title: { de: 'Ranking-Algorithmen', en: 'Ranking Algorithms' },
        body: {
          de: 'Drei Ranking-Modi: Standard-Punkte, ELO-Rating (mit konfigurierbarem K-Faktor) und gewichtete Punkte mit Decay (neuere Turniere zählen mehr). Head-to-Head-Matrix als NxN-Heatmap verfügbar.',
          en: 'Three ranking modes: standard points, ELO rating (with configurable K-factor), and weighted points with decay (recent tournaments count more). Head-to-head matrix available as NxN heatmap.',
        },
      },
      {
        title: { de: 'Spieltag-Editor', en: 'Game Day Editor' },
        body: {
          de: 'Spieltage können auch manuell angelegt werden (ohne Turnier-Timer). Spieler-Autocomplete, individuelle Buy-Ins, Gastspieler-Flag, Punkt-Korrekturen mit Begründung.',
          en: 'Game days can also be created manually (without tournament timer). Player autocomplete, individual buy-ins, guest player flag, point corrections with reason.',
        },
      },
      {
        title: { de: 'Turnier-Serien', en: 'Tournament Series' },
        body: {
          de: 'Erstelle Turnierserien mit eigener Wertung. 3 Ranking-Modi: Punkte, Best-N (nur die N besten Ergebnisse zählen), Durchschnitt. Standings-Tabelle, JSON Import/Export, Text- und CSV-Export.',
          en: 'Create tournament series with their own ranking. 3 ranking modes: points, best-N (only top N results count), average. Standings table, JSON import/export, text and CSV export.',
        },
      },
      {
        title: { de: 'Liga teilen', en: 'Share League' },
        body: {
          de: 'Liga-Tabelle per QR-Code oder als JSON-Datei teilen. Empfänger sehen die Standings direkt in der App. Liga-Tabelle auch im TV-Modus als rotierender Screen verfügbar.',
          en: 'Share league standings via QR code or as JSON file. Recipients see the standings directly in the app. League table also available in TV mode as rotating screen.',
        },
      },
      {
        title: { de: 'Spieler-Vorbelegung aus Liga', en: 'Player Pre-Fill from League' },
        body: {
          de: 'Wenn du ein Turnier aus dem Liga-Modus startest, werden die Liga-Spieler automatisch ins Setup übernommen. So sparst du dir das erneute Eingeben aller Namen.',
          en: 'When you start a tournament from league mode, the league players are automatically pre-filled in setup. This saves you from re-entering all names.',
        },
      },
      {
        title: { de: 'Sortierung merken', en: 'Sort Persistence' },
        body: {
          de: 'Die Sortierung der Liga-Tabelle (z.B. nach Punkten, Bilanz oder Name) wird gespeichert und beim nächsten Öffnen automatisch wiederhergestellt.',
          en: 'The sort order of the league standings table (e.g., by points, balance, or name) is saved and automatically restored the next time you open it.',
        },
      },
      {
        title: { de: 'Liga-Charts', en: 'League Charts' },
        body: {
          de: 'Im Charts-Tab der Liga siehst du drei Diagrammtypen: Kumulative Punkte-Entwicklung, Platzierungsverlauf und Finanzbilanz über alle Spieltage. Wähle einzelne Spieler per Toggle an/aus. Benötigt mindestens 2 Spieltage.',
          en: 'In the Charts tab of the league, you can see three chart types: cumulative points progression, placement history, and financial balance across all game days. Toggle individual players on/off. Requires at least 2 game days.',
        },
      },
    ],
  },
  {
    id: 'settings-customization',
    icon: '\u2699\uFE0F',
    title: { de: 'Einstellungen & Anpassung', en: 'Settings & Customization' },
    description: { de: 'App personalisieren und konfigurieren', en: 'Personalize and configure the app' },
    items: [
      {
        title: { de: 'Dark / Light Mode', en: 'Dark / Light Mode' },
        body: {
          de: 'Drei-Wege-Toggle im Header: System (folgt deinen Geräteeinstellungen), Hell oder Dunkel. Die Einstellung wird gespeichert.',
          en: 'Three-way toggle in header: System (follows your device settings), Light, or Dark. The setting is saved.',
        },
      },
      {
        title: { de: 'Akzentfarbe', en: 'Accent Color' },
        body: {
          de: '6 wählbare Akzentfarben (Emerald, Blau, Lila, Rot, Amber, Cyan). Beeinflusst Buttons, Timer-Glow, Progress-Bars und alle interaktiven Elemente. Einstellbar über das Zahnrad-Menü.',
          en: '6 selectable accent colors (Emerald, Blue, Purple, Red, Amber, Cyan). Affects buttons, timer glow, progress bars, and all interactive elements. Configurable via settings.',
        },
      },
      {
        title: { de: 'Hintergrundmuster', en: 'Background Patterns' },
        body: {
          de: '9 CSS-Gradient-Hintergründe: Kein Muster, Filz-Grün/-Blau/-Rot, Casino, Dunkles Holz, Abstrakt, Midnight, Sunset. Vorschau-Grid in den Einstellungen.',
          en: '9 CSS gradient backgrounds: None, Felt Green/Blue/Red, Casino, Dark Wood, Abstract, Midnight, Sunset. Preview grid in settings.',
        },
      },
      {
        title: { de: 'Sprache', en: 'Language' },
        body: {
          de: 'Deutsch oder Englisch — jederzeit umschaltbar über den DE/EN-Toggle im Header. Betrifft alle Texte, Ansagen und Exports.',
          en: 'German or English — switchable anytime via the DE/EN toggle in header. Affects all texts, announcements, and exports.',
        },
      },
      {
        title: { de: 'PWA & Offline', en: 'PWA & Offline' },
        body: {
          de: 'Die App ist als Progressive Web App installierbar (Handy + Desktop). Alle Funktionen arbeiten offline — auch Sprachansagen (PWA-gecached). Nur die Fernbedienung benötigt Internet zum Verbindungsaufbau.',
          en: 'The app is installable as a Progressive Web App (mobile + desktop). All features work offline — including voice announcements (PWA-cached). Only the remote control needs internet for initial connection.',
        },
      },
    ],
  },
];

export const faqEntries: FaqEntry[] = [
  {
    question: { de: 'Wie starte ich ein Turnier?', en: 'How do I start a tournament?' },
    answer: {
      de: 'Konfiguriere dein Turnier im Setup (Spieler, Buy-In, Blindstruktur) und drücke den grünen "Turnier starten"-Button. Oder nutze eines der 3 Presets für einen Schnellstart.',
      en: 'Configure your tournament in setup (players, buy-in, blind structure) and press the green "Start Tournament" button. Or use one of the 3 presets for a quick start.',
    },
  },
  {
    question: { de: 'Wie nutze ich die Fernbedienung?', en: 'How do I use the remote control?' },
    answer: {
      de: 'Im Spielmodus: Tippe auf 📱 im Header oder öffne den Share Hub (📡). Scanne den QR-Code mit deinem Smartphone. Die App verbindet sich automatisch. Du steuerst dann Timer, Levels, Dealer und Spieler vom Handy. Mehrere Phones können gleichzeitig verbunden sein.',
      en: 'In game mode: tap 📱 in the header or open the Share Hub (📡). Scan the QR code with your smartphone. The app connects automatically. You then control timer, levels, dealer, and players from your phone. Multiple phones can be connected simultaneously.',
    },
  },
  {
    question: { de: 'Kann ich die Blindstruktur anpassen?', en: 'Can I customize the blind structure?' },
    answer: {
      de: 'Ja! Nutze den Blind-Generator (3 Geschwindigkeiten) oder bearbeite jedes Level einzeln in der Tabelle. Du kannst auch eine Ziel-Endzeit eingeben und die Struktur automatisch generieren lassen.',
      en: 'Yes! Use the blind generator (3 speeds) or edit each level individually in the table. You can also enter a target end time and have the structure generated automatically.',
    },
  },
  {
    question: { de: 'Was passiert bei der Bubble?', en: 'What happens at the bubble?' },
    answer: {
      de: 'Ein roter "BUBBLE!"-Banner erscheint, begleitet von einem Spannungs-Sound. Du kannst Hand-for-Hand (Taste H) aktivieren. Wenn die Bubble platzt, gibt es einen grünen "In The Money"-Flash mit Fanfare.',
      en: 'A red "BUBBLE!" banner appears, accompanied by a tension sound. You can activate hand-for-hand (key H). When the bubble bursts, a green "In The Money" flash shows with fanfare.',
    },
  },
  {
    question: { de: 'Wie funktioniert der TV-Modus?', en: 'How does TV mode work?' },
    answer: {
      de: 'Drücke 📺 im Header oder Taste T. Ein separates Fenster öffnet sich — ziehe es auf deinen TV/Beamer. Timer bleibt oben, Info-Screens rotieren unten automatisch. 4 Layouts verfügbar. Alternativ zeige das Turnier auf einem anderen Gerät über den Share Hub.',
      en: 'Press 📺 in the header or key T. A separate window opens — drag it to your TV/projector. Timer stays on top, info screens rotate automatically below. 4 layouts available. Alternatively display the tournament on another device via the Share Hub.',
    },
  },
  {
    question: { de: 'Kann ich Turniervorlagen speichern?', en: 'Can I save tournament templates?' },
    answer: {
      de: 'Ja, über den "Vorlagen"-Button im Setup. Speichere beliebig viele Konfigurationen, exportiere sie als JSON oder importiere Vorlagen von anderen Geräten.',
      en: 'Yes, via the "Templates" button in setup. Save any number of configurations, export them as JSON, or import templates from other devices.',
    },
  },
  {
    question: { de: 'Wie funktionieren Rebuys?', en: 'How do rebuys work?' },
    answer: {
      de: 'Aktiviere Rebuys im Setup und konfiguriere Limit und Phase. Im Spielmodus können Spieler über den Rebuy-Button nachkaufen. Der Prizepool aktualisiert sich automatisch. Re-Entry ermöglicht Wiedereinstieg nach Elimination.',
      en: 'Enable rebuys in setup and configure limits and phase. In game mode, players can rebuy via the rebuy button. The prize pool updates automatically. Re-entry allows rejoining after elimination.',
    },
  },
  {
    question: { de: 'Was ist Mystery Bounty?', en: 'What is Mystery Bounty?' },
    answer: {
      de: 'Statt eines festen Kopfgeldes wird bei jeder Elimination ein zufälliger Betrag aus einem Pool gezogen. Die Beträge können von klein bis sehr groß variieren — wie im Casino! Presets für verschiedene Pool-Größen verfügbar.',
      en: 'Instead of a fixed bounty, a random amount is drawn from a pool on each elimination. Amounts can range from small to very large — just like in a casino! Presets for various pool sizes available.',
    },
  },
  {
    question: { de: 'Funktioniert die App offline?', en: 'Does the app work offline?' },
    answer: {
      de: 'Ja! Die App ist eine PWA (Progressive Web App) und funktioniert vollständig offline. Alle Daten werden lokal in IndexedDB gespeichert. Nur die Fernbedienung und Cross-Device Display benötigen eine Internetverbindung zum Verbindungsaufbau.',
      en: 'Yes! The app is a PWA (Progressive Web App) and works fully offline. All data is stored locally in IndexedDB. Only the remote control and cross-device display need internet for initial connection.',
    },
  },
  {
    question: { de: 'Wie ändere ich die Sprache?', en: 'How do I change the language?' },
    answer: {
      de: 'Tippe auf den DE/EN-Toggle im Header — jederzeit verfügbar, auch im Spielmodus. Die Sprache wird gespeichert und betrifft alle Texte und Sprachansagen.',
      en: 'Tap the DE/EN toggle in the header — available at any time, even in game mode. The language setting is saved and affects all texts and voice announcements.',
    },
  },
  {
    question: { de: 'Wie teile ich Turnierergebnisse?', en: 'How do I share tournament results?' },
    answer: {
      de: 'Nach Turnierende: "Text kopieren" für WhatsApp, "CSV" für Tabellenkalkulation, "Screenshot" für ein Bild, "PDF" für professionelle Dokumente, oder QR-Code zum Teilen mit anderen App-Nutzern.',
      en: 'After tournament: "Copy text" for WhatsApp, "CSV" for spreadsheets, "Screenshot" for an image, "PDF" for professional documents, or QR code to share results with other app users.',
    },
  },
  {
    question: { de: 'Wie funktioniert die Liga?', en: 'How does the league work?' },
    answer: {
      de: 'Klicke im Liga-Modus auf "+ Neue Liga". Im Erstellungs-Modal konfigurierst du Name, Punktesystem (Plätze 1–N frei einstellbar, Vorlagen: Standard/Einfach/Top 10) und Ranking-Algorithmus. Verknüpfe dann Turniere mit der Liga — Spieltage werden automatisch oder manuell angelegt. Die Tabelle zeigt Punkte, Finanzen, Statistiken und Head-to-Head-Vergleiche. Einstellungen (Tiebreaker, Saisons, ELO-Konfiguration) sind jederzeit über ⚙️ erreichbar.',
      en: 'Click "+ New League" in league mode. In the creation modal you configure name, point system (places 1–N fully configurable, presets: Standard/Simple/Top 10) and ranking algorithm. Then link tournaments to the league — game days are created automatically or manually. Standings show points, finances, statistics, and head-to-head comparisons. Settings (tiebreaker, seasons, ELO config) are accessible anytime via ⚙️.',
    },
  },
  {
    question: { de: 'Kann ich den Bildschirm während des Turniers anlassen?', en: 'Can I keep the screen on during the tournament?' },
    answer: {
      de: 'Ja, die App nutzt die Wake Lock API — dein Bildschirm bleibt automatisch an, solange der Timer läuft. Kein manuelles Einstellen nötig.',
      en: 'Yes, the app uses the Wake Lock API — your screen stays on automatically while the timer runs. No manual configuration needed.',
    },
  },
  {
    question: { de: 'Kann ich Spieler über die Fernbedienung eliminieren?', en: 'Can I eliminate players via the remote control?' },
    answer: {
      de: 'Ja! Öffne die Spielerliste auf dem Controller und tippe auf das ❌-Symbol neben dem Spieler. Bei aktivem Bounty erscheint ein Eliminator-Picker, in dem du auswählst, wer den Knockout gemacht hat.',
      en: 'Yes! Open the player list on the controller and tap the ❌ icon next to the player. With bounties active, an eliminator picker appears to select who made the knockout.',
    },
  },
  {
    question: { de: 'Wie funktioniert Undo/Redo?', en: 'How does undo/redo work?' },
    answer: {
      de: 'Jede Turnieraktion (Elimination, Rebuy, Dealer-Rotation etc.) kann rückgängig gemacht werden. Drücke Cmd+Z (Mac) oder Strg+Z (Windows) für Undo, Cmd+Shift+Z / Strg+Shift+Z für Redo. Die Buttons in der Steuerungsleiste zeigen die letzte Aktion an. Bis zu 30 Schritte gespeichert.',
      en: 'Every tournament action (elimination, rebuy, dealer rotation, etc.) can be undone. Press Cmd+Z (Mac) or Ctrl+Z (Windows) for undo, Cmd+Shift+Z / Ctrl+Shift+Z for redo. Buttons in the control bar show the last action. Up to 30 steps stored.',
    },
  },
  {
    question: { de: 'Was ist der ICM-Rechner?', en: 'What is the ICM calculator?' },
    answer: {
      de: 'Der ICM (Independent Chip Model) Rechner berechnet die Equity (Turnier-Dollar-Wert) jedes Spielers basierend auf Chipstacks und Auszahlungsstruktur. Nützlich für Deal-Verhandlungen am Final Table. Zugriff über die Seitenleiste im Spielmodus.',
      en: 'The ICM (Independent Chip Model) calculator computes each player\'s equity (tournament dollar value) based on chip stacks and payout structure. Useful for deal negotiations at the final table. Access from the sidebar in game mode.',
    },
  },
  {
    question: { de: 'Wie exportiere ich Ergebnisse als PDF?', en: 'How do I export results as PDF?' },
    answer: {
      de: 'Nach Turnierende wird der "PDF"-Button in den Export-Optionen angezeigt. Er generiert ein professionelles PDF-Dokument mit Turniername, Datum, Standings-Tabelle und Turnierdetails — lokal auf deinem Gerät, kein Server nötig.',
      en: 'After the tournament ends, a "PDF" button is shown in the export options. It generates a professional PDF document with tournament name, date, standings table, and tournament details — locally on your device, no server needed.',
    },
  },
  {
    question: { de: 'Wie zeige ich das Turnier auf einem anderen Gerät?', en: 'How do I display the tournament on another device?' },
    answer: {
      de: 'Öffne den Share Hub (📡-Button im Spielmodus), scanne den Display-QR-Code mit dem Zielgerät oder teile den Link. Das andere Gerät zeigt die TV-Anzeige mit Timer und rotierenden Screens. Mehrere Geräte gleichzeitig möglich.',
      en: 'Open the Share Hub (📡 button in game mode), scan the display QR code with the target device, or share the link. The other device shows the TV display with timer and rotating screens. Multiple devices simultaneously possible.',
    },
  },
  {
    question: { de: 'Was sind Turnier-Serien?', en: 'What are tournament series?' },
    answer: {
      de: 'Turnier-Serien fassen mehrere Turniere zu einer Gesamtwertung zusammen. 3 Ranking-Modi: Punkte, Best-N (nur die besten N Ergebnisse), Durchschnitt. Erstelle Serien über "Serien" im Header, verknüpfe Turniere im Setup.',
      en: 'Tournament series combine multiple tournaments into an overall ranking. 3 ranking modes: points, best-N (only top N results), average. Create series via "Series" in header, link tournaments in setup.',
    },
  },
  {
    question: { de: 'Was ist Re-Entry?', en: 'What is re-entry?' },
    answer: {
      de: 'Re-Entry ermöglicht es eliminierten Spielern, mit einem neuen Stack wieder einzusteigen (anders als Rebuy: neuer Turniereintrag, wie eine Neuanmeldung). Aktiviere es in den Rebuy-Einstellungen und setze ein maximales Limit.',
      en: 'Re-entry allows eliminated players to rejoin with a fresh stack (unlike rebuy: new tournament entry, like a new registration). Enable it in rebuy settings and set a maximum limit.',
    },
  },
  {
    question: { de: 'Wie funktionieren Display-Layouts?', en: 'How do display layouts work?' },
    answer: {
      de: '4 Layouts für den TV-Modus: Standard (klassischer Split), Kompakt (mehr Infobereich), Timer-Only (maximaler Timer ohne Sekundärscreens), Ultra Large (übergroßer Timer). Wähle das Layout in den Einstellungen (Zahnrad-Menü).',
      en: '4 layouts for TV mode: Standard (classic split), Compact (more info area), Timer-Only (maximum timer without secondary screens), Ultra Large (oversized timer). Choose the layout in settings (gear menu).',
    },
  },
  {
    question: { de: 'Sind alle Features kostenlos verfügbar?', en: 'Are all features available for free?' },
    answer: {
      de: 'Ja! Aktuell sind alle Features (TV-Modus, Fernsteuerung, Liga, Multi-Table, Side-Pot-Rechner) vollständig und ohne Einschränkungen nutzbar. Die App enthält eine Gate-Infrastruktur für zukünftige Tier-Modelle, aber der Standard-Tier ist „Premium" — alle Features sind freigeschaltet.',
      en: 'Yes! Currently all features (TV mode, remote control, league, multi-table, side pot calculator) are fully available without restrictions. The app includes gate infrastructure for future tier models, but the default tier is "premium" — all features are unlocked.',
    },
  },
  {
    question: { de: 'Kann ich ein vergangenes Turnier wiederholen?', en: 'Can I repeat a past tournament?' },
    answer: {
      de: 'Ja! Öffne die Turnier-Historie über den "Historie"-Button im Setup-Header. Bei jedem Eintrag findest du einen "Wiederholen"-Button, der die komplette Konfiguration (Blindstruktur, Spieler, Buy-In etc.) ins Setup lädt. Perfekt für regelmäßige Home Games.',
      en: 'Yes! Open the tournament history via the "History" button in the setup header. Each entry has a "Repeat" button that loads the full configuration (blind structure, players, buy-in, etc.) into setup. Perfect for regular home games.',
    },
  },
  {
    question: { de: 'Was bedeutet das Offline-Banner?', en: 'What does the offline banner mean?' },
    answer: {
      de: 'Wenn dein Gerät die Internetverbindung verliert, erscheint ein dezenter Banner am oberen Bildschirmrand. Die App funktioniert weiterhin vollständig offline — alle Daten werden lokal gespeichert. Nur Fernbedienung und Cross-Device Display benötigen eine Verbindung. Der Banner verschwindet automatisch, sobald du wieder online bist.',
      en: 'When your device loses internet connection, a subtle banner appears at the top of the screen. The app continues to work fully offline — all data is stored locally. Only remote control and cross-device display require a connection. The banner disappears automatically when you are back online.',
    },
  },
];

export const shortcutEntries: ShortcutEntry[] = [
  { key: 'Space', label: { de: 'Start / Pause', en: 'Start / Pause' }, context: 'game' },
  { key: 'N', label: { de: 'Nächstes Level', en: 'Next Level' }, context: 'game' },
  { key: 'V', label: { de: 'Vorheriges Level', en: 'Previous Level' }, context: 'game' },
  { key: 'R', label: { de: 'Level zurücksetzen', en: 'Reset Level' }, context: 'game' },
  { key: 'F', label: { de: 'Clean View ein/aus', en: 'Clean View toggle' }, context: 'game' },
  { key: 'L', label: { de: 'Letzte Hand', en: 'Last Hand' }, context: 'game' },
  { key: 'T', label: { de: 'TV-Modus ein/aus', en: 'TV Mode toggle' }, context: 'game' },
  { key: 'H', label: { de: 'Hand-for-Hand', en: 'Hand-for-Hand' }, context: 'game' },
  { key: 'C', label: { de: 'Call the Clock', en: 'Call the Clock' }, context: 'game' },
  { key: '\u2318Z', label: { de: 'Rückgängig (Undo)', en: 'Undo' }, context: 'game' },
  { key: '\u2318\u21E7Z', label: { de: 'Wiederherstellen (Redo)', en: 'Redo' }, context: 'game' },
  { key: 'Esc', label: { de: 'TV-Modus beenden', en: 'Exit TV Mode' }, context: 'game' },
  { key: '\u2190 \u2192', label: { de: 'TV-Screens wechseln', en: 'Switch TV screens' }, context: 'game' },
];
