# 7MPX — 7Mountain Poker Interchange Format, v1

Ein versioniertes, plattform-neutrales JSON-Format, mit dem die **Web-App**
(React/TypeScript) und die **iOS-App** (SwiftUI) Turnier-Vorlagen, -Ergebnisse
und Liga-Stände untereinander austauschen — per Datei, Clipboard oder QR-Code.

> Dieses Dokument ist die **Single Source of Truth** und liegt identisch in
> beiden Repos:
> - Web: `7mountainpoker-claude/docs/7mpx-v1.md`
> - iOS: `7mountainpoker-ios-app/docs/7mpx-v1.md`
>
> Änderungen am Schema müssen in **beiden** Kopien synchron erfolgen und die
> Versionsnummer (`v`) anheben.

---

## 1. Designziele

1. **Verlustarm, nicht verlustfrei.** Ein Payload transportiert die fachlich
   relevanten Felder, nicht den internen App-Zustand. Empfänger füllen fehlende
   Felder mit ihren Defaults.
2. **Vorwärts-tolerant.** Unbekannte Felder werden ignoriert, nie als Fehler
   behandelt. Neue optionale Felder erhöhen `v` **nicht**; nur
   breaking changes (umbenannte/entfernte Pflichtfelder) tun das.
3. **QR-tauglich.** Kompakte Repräsentation, optional Base64URL-kodiert für
   `#7mpx=`-Hash-URLs.
4. **Mensch-lesbar.** Reines JSON, keine Binär-Container.

---

## 2. Envelope

Jeder 7MPX-Payload ist ein JSON-Objekt mit einheitlichem Umschlag:

```jsonc
{
  "fmt": "7mpx",          // konstant — Format-Marker
  "v": 1,                 // Schema-Version (Integer)
  "kind": "template",     // "template" | "result" | "league"
  "app": {                // Herkunft (rein informativ, optional)
    "src": "web",         // "web" | "ios"
    "ver": "7.0.1"        // App-Versionsstring
  },
  "createdAt": "2026-06-13T18:30:00Z", // ISO-8601, optional
  "payload": { /* kind-spezifisch, siehe §4 */ }
}
```

**Pflichtfelder:** `fmt`, `v`, `kind`, `payload`.
Ein Parser MUSS ablehnen, wenn `fmt !== "7mpx"`, `kind` unbekannt ist, oder
`v` größer als die unterstützte Maximalversion ist (mit klarer Nutzer-Meldung
„Format zu neu, bitte App aktualisieren").

---

## 3. Transport-Kodierung

| Kanal | Kodierung |
|---|---|
| Datei (`.7mpx.json`) | UTF-8 JSON, optional pretty-printed |
| Clipboard | UTF-8 JSON, kompakt (keine Whitespaces) |
| QR / Deep-Link | `#7mpx=<[z.]base64url(payload)>` an die App-URL bzw. Custom-Scheme `sevenmtn://7mpx=<...>` |

### Kompression (für QR-taugliche Linklänge)

Der base64url-kodierte Payload **darf raw-DEFLATE-komprimiert** sein (RFC 1951,
ohne zlib/gzip-Header). Komprimierte Payloads werden mit dem Präfix **`z.`**
direkt nach `7mpx=` markiert; unkomprimierte Payloads haben kein Präfix und
bleiben **rückwärtskompatibel** (ältere Links dekodieren unverändert).

Decoder-Regel: Beginnt der Teil nach `7mpx=` mit `z.`, dann base64url-dekodieren
→ raw-inflate → UTF-8-JSON; sonst base64url-dekodieren → UTF-8-JSON.

Codec-Kompatibilität: **Web** nutzt `fflate` `deflateSync`/`inflateSync`
(raw DEFLATE), **iOS** `Compression`-Framework `COMPRESSION_ZLIB`
(ebenfalls raw DEFLATE) — byte-kompatibel (durch geteiltes Test-Fixture
verifiziert). Ein volles 25-Level-Template schrumpft so von ~3,6 kB auf
~0,5 kB Link und passt damit in einen QR-Code.

QR-Limit beachten: Ein `result`-Payload mit vollem Event-Log kann auch
komprimiert groß werden. Für QR gilt zusätzlich: **Event-Log (`events`)
weglassen**, wenn die kodierte Länge
> 2 KB überschreitet. Der Envelope SOLL dann `payload.truncated: true` setzen.

---

## 4. Payloads pro `kind`

Feldnamen folgen der Web-Domäne (`src/domain/types.ts`) als kanonische Referenz.
Geldbeträge sind Zahlen in der jeweiligen Währung (kein Cent-Integer).
`currency` ist ein ISO-4217-Code (`"EUR"`, `"USD"`, `"CHF"`, …), Default `"EUR"`.

### 4.1 `kind: "template"` — Turnier-Vorlage

Entspricht der Web-`TournamentConfig` bzw. iOS-`TournamentTemplate`.

```jsonc
{
  "name": "Standard Home Game",
  "currency": "EUR",
  "buyIn": 20,
  "startingChips": 10000,
  "anteMode": "standard",            // "standard" | "bigBlindAnte"
  "levels": [
    { "type": "level", "smallBlind": 25,  "bigBlind": 50,  "ante": 0, "durationSeconds": 1200 },
    { "type": "level", "smallBlind": 50,  "bigBlind": 100, "ante": 0, "durationSeconds": 1200 },
    { "type": "break", "durationSeconds": 600, "label": "Pause" }
  ],
  "payout":  { "mode": "percent", "entries": [ { "place": 1, "value": 50 }, { "place": 2, "value": 30 }, { "place": 3, "value": 20 } ] },
  "rebuy":   { "enabled": true, "rebuyCost": 20, "limitType": "levels", "limitValue": 6 },
  "addOn":   { "enabled": false },
  "bounty":  { "enabled": false, "type": "fixed", "amount": 0 },
  "chips":   { "enabled": false, "denominations": [] },
  "players": [ { "name": "Spieler 1" }, { "name": "Spieler 2" } ]   // optional, nur Namen
}
```

- `levels[*].type`: `"level"` oder `"break"`. Bei `break` sind `smallBlind`/
  `bigBlind`/`ante` bedeutungslos und dürfen fehlen.
- `payout.mode`: `"percent"` (Werte summieren zu 100) oder `"fixed"`
  (absolute Beträge).
- `players` ist **optional** — eine Vorlage kann ohne konkrete Namen geteilt
  werden. Empfänger erzeugt sonst Default-Namen in seiner UI-Sprache.
- **Keine internen IDs.** `levels[*]` und `players[*]` enthalten bewusst **keine**
  geräte-lokalen `id`-Felder. Der Empfänger generiert frische IDs beim Import
  (verlustarm-Prinzip aus §1).

### 4.2 `kind: "result"` — Turnier-Ergebnis

Entspricht der Web-`TournamentResult`.

```jsonc
{
  "id": "tr_1718305800_a1b2",
  "name": "Freitagsrunde",
  "date": "2026-06-13T20:00:00Z",
  "currency": "EUR",
  "buyIn": 20,
  "prizePool": 240,
  "playerCount": 12,
  "bountyEnabled": false,
  "bountyAmount": 0,
  "rebuyEnabled": true,
  "totalRebuys": 5,
  "addOnEnabled": false,
  "totalAddOns": 0,
  "elapsedSeconds": 9300,
  "levelsPlayed": 14,
  "dealApplied": false,
  "leagueId": null,
  "players": [
    { "name": "Anna",  "place": 1, "payout": 120, "rebuys": 1, "addOn": false, "knockouts": 3, "bountyEarned": 0, "netBalance": 80 },
    { "name": "Ben",   "place": 2, "payout": 72,  "rebuys": 0, "addOn": false, "knockouts": 1, "bountyEarned": 0, "netBalance": 52 }
  ],
  "events": [ /* optional, TournamentEvent[]; bei QR weglassen */ ],
  "truncated": false
}
```

`netBalance` ist abgeleitet (Auszahlung − Einsätze) und wird mitgeführt, damit
Empfänger ohne Neuberechnung anzeigen können; sie DÜRFEN es aber neu berechnen.

### 4.3 `kind: "league"` — Liga-Stand (read-only Snapshot)

Entspricht der Web-`encodeLeagueStandingsForQR`-Nutzlast.

```jsonc
{
  "name": "Mittwochsliga 2026",
  "pointSystem": { "entries": [ { "place": 1, "points": 10 }, { "place": 2, "points": 7 }, { "place": 3, "points": 5 } ] },
  "standings": [
    { "rank": 1, "name": "Anna", "points": 48, "tournaments": 6, "wins": 2, "cashes": 4, "avgPlace": 2.3, "netBalance": 140 },
    { "rank": 2, "name": "Ben",  "points": 41, "tournaments": 6, "wins": 1, "cashes": 3, "avgPlace": 3.1, "netBalance": -20 }
  ]
}
```

Dieser Payload ist ein **Anzeige-Snapshot**, kein vollständiger Liga-Export
(keine GameDays, keine Korrekturen). Für vollständige Liga-Migration zwischen
Geräten ist weiterhin der jeweilige native JSON-Export (LeagueExport v2) gedacht;
7MPX deckt das Teilen der *Tabelle* ab.

---

## 5. Feld-Mapping Web ↔ iOS

| Konzept | Web (`types.ts`) | iOS (Swift) |
|---|---|---|
| Vorlage | `TournamentConfig` | `TournamentTemplate` |
| Level | `Level { type, smallBlind, bigBlind, ante, durationSeconds, label }` | `BlindLevel` |
| Ante-Modus | `anteMode: 'standard' \| 'bigBlindAnte'` | `Tournament.anteMode` |
| Ergebnis | `TournamentResult` | `TournamentRecord` (SwiftData) |
| Spielerergebnis | `PlayerResult` | `PlayerRecord` |
| Punktesystem | `PointSystem { entries[] }` | `League.pointSystem` |
| Währung | `Currency` (ISO-4217) | `String` (ISO-4217) |

Beide Seiten implementieren je einen **Adapter** `toInterchange()` /
`fromInterchange()`, der zwischen internem Modell und 7MPX übersetzt. Das
interne Modell bleibt frei änderbar, solange der Adapter stabil bleibt.

---

## 6. Validierungsregeln (beim Import)

Ein Empfänger MUSS prüfen und bei Verletzung mit klarer Meldung ablehnen:

1. `fmt === "7mpx"` und `v <= MAX_SUPPORTED_VERSION`.
2. `kind ∈ { template, result, league }`.
3. `template`: ≥ 1 `level`-Eintrag, `payout.entries` lückenlos ab Platz 1,
   `buyIn ≥ 0`, Blinds monoton steigend (Warnung, kein harter Fehler).
4. `result`: `players.length === playerCount` (Warnung bei Abweichung),
   `place`-Werte eindeutig oder bei Deal geteilt.
5. Prototype-Pollution-Schutz: `__proto__`/`constructor`/`prototype` als Keys
   ignorieren (beide Apps haben dafür bereits Guards).

---

## 7. Implementierungs-Hinweise

### Web
- Andockpunkte: `exportConfigJSON` / `importConfigJSON`
  (`src/domain/configPersistence.ts`), `decodeResultFromQR`
  (`src/domain/tournament.ts`), `encodeLeagueStandingsForQR`
  (`src/domain/league.ts`).
- Neues Modul `src/domain/interchange.ts` mit
  `encode7mpx(kind, data): string` und `decode7mpx(json): { kind, payload }`.
- Hash-Routing: zusätzlich zu `#r=`/`#ls=` ein `#7mpx=`-Handler in `App.tsx`.

### iOS
- Andockpunkt: `Services/JSONPortability.swift`.
- `Codable`-Structs `InterchangeEnvelope`, `InterchangeTemplate`,
  `InterchangeResult`, `InterchangeLeague`.
- Deep-Link über `onOpenURL` (Custom-Scheme `sevenmtn://`) und
  Dokumenten-Import (`.7mpx.json` UTType).

### Gemeinsame Test-Vektoren
Beide Repos legen unter `test-fixtures/7mpx/` identische Beispiel-Payloads
(`template.json`, `result.json`, `league.json`) ab und testen Round-Trip
`decode(encode(x)) == x` gegen dieselben Dateien — so bleibt die Interop
nachweisbar synchron.

---

## 8. Versionierung & Changelog

| v | Datum | Änderung |
|---|---|---|
| 1 | 2026-06-13 | Erstdefinition: Envelope + `template`/`result`/`league` |

Künftige Brüche (z. B. Pflichtfeld-Umbenennung) erhöhen `v` und ergänzen hier
eine Migrations-Notiz. Additive optionale Felder bleiben bei `v: 1`.
