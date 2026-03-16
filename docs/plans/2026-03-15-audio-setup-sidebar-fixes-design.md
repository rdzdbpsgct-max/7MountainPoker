# Audio-Einstellungen in Setup + Sidebar-Lesbarkeit

**Datum:** 2026-03-15
**Status:** Genehmigt

## Ziel

1. Audio/Stimme/Custom Audio Einstellungen VOR Turnierstart in der Setup-Seite konfigurierbar machen
2. Spielmodus-Sidebar lesbarer machen: alle Buttons, NumberStepper und Dropdowns vollständig sichtbar

## Teil 1: Audio-Sektion auf Setup-Seite

### Neue CollapsibleSection "Audio & Ansagen"

Platzierung: Nach Rebuy/Add-On/Bounty, vor dem Start-Button.

Inhalt:
- Sound an/aus (Checkbox)
- Lautstärke (Range-Slider 0-100, nur sichtbar wenn Sound an)
- Countdown an/aus (Checkbox)
- Benutzerdefinierte Hinweise (AlertEditor — bestehende CollapsibleSubSection)
- Eigene Audiodateien (Button → CustomAudioEditor-Modal)

Summary-Badge: z.B. "Sound, Stimme, 100%" oder "Sound aus"

### Spielmodus-SettingsPanel — Audio-Sektion schlank

Nur Quick-Access bleibt:
- Sound an/aus Toggle
- Lautstärke-Slider

Entfernt aus Spielmodus:
- Countdown-Toggle (nur noch im Setup)
- AlertEditor / Custom Alerts (nur noch im Setup)
- Custom Audio Button (nur noch im Setup)

## Teil 2: Sidebar-Layout-Fixes

### NumberStepper vertikales Layout

Call-the-Clock und TV-Wechselintervall:
- Label auf eigene Zeile (oben)
- NumberStepper darunter (volle Breite)
- Statt horizontal `[label] [−][input][+][s]` in einer Zeile

### NumberStepper-Dimensionen

- Input: `w-14` (56px) → `w-16` (64px)
- +/- Buttons: `min-w-[28px] shrink-0` — nie abgeschnitten

### Sidebar-Dimensionen

- Desktop: `w-60` → `w-64` (256px)
- Mobile max-height: `max-h-[40vh]` → `max-h-[60vh]`

## Betroffene Dateien

- `src/components/SetupPage.tsx` — neue Audio-CollapsibleSection
- `src/components/SettingsPanel.tsx` — Audio-Sektion verschlanken, NumberStepper-Layout vertikal
- `src/components/modes/GameModeContainer.tsx` — Sidebar-Dimensionen
- `src/App.tsx` — Props für Setup-Audio-Sektion (settings, setSettings, showCustomAudio)
- `src/i18n/translations.ts` — neue Translation-Keys für Audio-Setup-Sektion
