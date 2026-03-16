# Design: Currency Propagation, PeerJS Hardening & CSP

**Date:** 2026-03-16
**Version target:** 6.9.1

## Scope

Four independent improvements — all backward-compatible, no data migration needed.

### A) SharedResultView: Use result.currency

`SharedResultView.tsx` hardcodes `t('unit.eur')` in 4 places despite `TournamentResult.currency?` already existing in the type. Replace with `result.currency ?? 'EUR'`.

**Files:** `SharedResultView.tsx` (4 line changes)

### B) Currency in GameDay + Liga-Finanzen

Add `currency?: Currency` to `GameDay` interface. Populate in `createGameDayFromResult()` (App.tsx) and `GameDayEditor.tsx` save handler. All Liga finance displays read `gameDay.currency ?? 'EUR'` as fallback for old data.

**Files:**
- `types.ts` — add `currency?: Currency` to `GameDay`
- `App.tsx` — set `currency` in `createGameDayFromResult()`
- `GameDayEditor.tsx` — set `currency` on save
- `LeagueFinances.tsx` — use `gameDay.currency ?? 'EUR'`
- `LeagueGameDays.tsx` — use `gameDay.currency ?? 'EUR'`
- `LeagueStandingsTable.tsx` — use currency from game days
- `league.ts` — propagate currency through `computeLeagueFinances()`

### C) PeerJS Hardening

**Longer Peer-ID:** `PEER_ID_LENGTH` from 5 → 8 (32⁵ = 33M → 32⁸ = 1.1T combinations). No breaking change — old URLs with 5-char IDs still work.

**Connection limits:** `MAX_CONTROLLERS = 4`, `MAX_DISPLAYS = 8`. Reject excess connections with close + console.warn. No UI change needed — ShareHub already shows connection count.

**Files:** `remote.ts` (3 constants + connection guard logic in `RemoteHost`)

### D) CSP for GitHub Pages

Add `<meta http-equiv="Content-Security-Policy">` to `index.html` with identical policy to `vercel.json`. GitHub Pages doesn't support server headers, but CSP meta tags work. Vercel's header-based CSP takes precedence when both are present, so no conflict.

**Files:** `index.html` (1 meta tag)

## Testing

- Unit tests for currency propagation in GameDay creation
- Unit tests for `generatePeerId()` length change
- Unit tests for connection limit enforcement in RemoteHost
- Existing i18n tests validate key parity
- Manual: verify CSP doesn't break PeerJS/audio/PWA

## Non-goals

- No IndexedDB schema migration (currency is optional field with fallback)
- No UI changes beyond displaying correct currency
- No Pro-tier feature implementation
