# Design: Premium-Readiness (Gate-Infrastruktur vervollständigen)

**Date:** 2026-03-16
**Version target:** 6.9.2

## Scope

Alle Premium-Features bleiben frei (Default-Tier `'premium'`). Kein Payment, kein Auth, kein Server. Aber: jeder Premium-Feature-Zugang läuft über das Gate-System, sodass ein Flip zu `VITE_APP_TIER=free` sofort wirkt.

### A) Fehlende Gate-Checks (2 Features)

`multiTable` und `sidePot` sind in `FEATURE_MIN_TIER` definiert aber haben keine Enforcement-Code-Pfade.

- `multiTable`: Gate-Check in `SetupPage.tsx` beim Aktivieren der Multi-Table-Sektion + Safety-Guard in `GameModeContainer.tsx`
- `sidePot`: Gate-Check in `PlayerPanel.tsx` beim Öffnen des Side-Pot-Calculators

### B) Feature-Discovery-Trigger

`markFeatureDiscovered()` an den 5 Premium-Feature-Einstiegspunkten:
- TV Display (AppHeader)
- Remote Control (AppHeader)
- Liga-Modus (AppHeader)
- Multi-Table (SetupPage)
- Side-Pot (PlayerPanel)

### C) Telemetrie verdrahten

Aktuell definierte aber nie aufgerufene Funktionen:
- `trackSessionStarted()` → `main.tsx` beim App-Start
- `trackFeatureUsed(feature)` → bei Nutzung der 5 Premium-Features
- `trackFeatureDiscoverySeen/Clicked` → bei Discovery-Interaktionen

### D) Non-Goals

- Kein Payment-System, kein Auth, kein Server
- Keine sichtbare UI-Änderung für Endnutzer (Default bleibt premium)
- Keine Pro-Features (Cloud-Backup, Teams, Multi-Event)
- Keine Pricing-Page oder externe Links

## Files

- `SetupPage.tsx` — Gate-Check für Multi-Table-Sektion
- `PlayerPanel.tsx` — Gate-Check für Side-Pot-Button
- `GameModeContainer.tsx` — Safety-Guard für Multi-Table
- `AppHeader.tsx` — `markFeatureDiscovered` für TV, Remote, Liga
- `main.tsx` — `trackSessionStarted()` beim Boot
- `App.tsx` — `trackFeatureUsed` für TV, Remote, Liga
- `MultiTablePanel.tsx` — `trackFeatureUsed('multiTable')`
- `SidePotCalculator.tsx` — `trackFeatureUsed('sidePot')`

## Testing

- Unit-Tests für die 2 neuen Gate-Checks
- Bestehende 8 Entitlement-Tests decken Tier-Logik ab
- Manuell: `VITE_APP_TIER=free` verifiziert Gates
