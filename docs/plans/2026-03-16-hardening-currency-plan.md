# Hardening & Currency Propagation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix currency display in SharedResultView and League components, harden PeerJS remote connections, and sync CSP meta tag with Vercel headers.

**Architecture:** Four independent changes — can be implemented and committed in any order. All backward-compatible with `?? 'EUR'` fallbacks for existing data.

**Tech Stack:** React 19, TypeScript strict, Vitest, Tailwind CSS 4

---

### Task 1: SharedResultView — Use result.currency

**Files:**
- Modify: `src/components/SharedResultView.tsx` (lines 67-70, 81, 89, 100)
- Test: `tests/logic.test.ts`

**Step 1: Write the failing test**

In `tests/logic.test.ts`, find the `decodeResultFromQR` describe block and add:

```typescript
describe('SharedResultView currency fallback', () => {
  it('decodeResultFromQR returns undefined currency for QR-encoded results', () => {
    const result = decodeResultFromQR('Test|2025-01-01T00:00:00Z|2|10|20|0|0|0|60|5|Alice:1:15:0:0:0;Bob:2:5:0:0:0');
    expect(result).not.toBeNull();
    expect(result!.currency).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it passes** (this is a characterization test, not TDD)

Run: `cd /Users/michaelprill/Claudeprojekte/7mountainpoker-claude && npx vitest run tests/logic.test.ts -t "SharedResultView currency"`

Expected: PASS — confirms QR-decoded results lack currency field.

**Step 3: Fix SharedResultView**

In `src/components/SharedResultView.tsx`:

1. Add import at top (line 1): add `CURRENCY_SYMBOLS` and `Currency` to imports:
```typescript
import type { TournamentResult, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
```

2. Add currency helper inside the component (after `const dialogRef`):
```typescript
const currencySymbol = CURRENCY_SYMBOLS[result.currency ?? 'EUR' as Currency];
```

3. Replace all 4 occurrences of `{t('unit.eur')}` with `{currencySymbol}`:
   - Line 70: `{player.payout.toFixed(2)} {currencySymbol}`
   - Line 81: `{result.prizePool.toFixed(2)} {currencySymbol}`
   - Line 89: `{result.buyIn} {currencySymbol}`
   - Line 100: `{result.bountyAmount} {currencySymbol} / KO`

4. Remove the TODO comment on line 67.

5. Remove unused `useTranslation` import if no other `t()` calls remain — check first. (There are other `t()` calls like `t('shared.title')`, so keep it.)

**Step 4: Run lint and tests**

Run: `cd /Users/michaelprill/Claudeprojekte/7mountainpoker-claude && npm run lint && npx vitest run`

Expected: All 1192+ tests pass, no lint errors.

**Step 5: Commit**

```bash
git add src/components/SharedResultView.tsx tests/logic.test.ts
git commit -m "fix: use result.currency in SharedResultView instead of hardcoded EUR"
```

---

### Task 2: Currency in GameDay + Liga Finance Components

**Files:**
- Modify: `src/domain/types.ts` (GameDay interface, ~line 404-417)
- Modify: `src/domain/league.ts` (createGameDayFromResult, ~line 119-130)
- Modify: `src/components/LeagueFinances.tsx` (10 hardcoded `€` symbols)
- Modify: `src/components/LeagueGameDays.tsx` (4 hardcoded `€` symbols)
- Modify: `src/components/LeagueStandingsTable.tsx` (3 hardcoded `€` symbols)
- Modify: `src/components/GameDayEditor.tsx` (5 hardcoded `€` symbols)
- Test: `tests/logic.test.ts`

**Step 1: Write the failing test**

In `tests/logic.test.ts`, find the `createGameDayFromResult` describe block and add:

```typescript
it('propagates currency from TournamentResult to GameDay', () => {
  const result: TournamentResult = {
    id: 'tr1', name: 'Test', date: new Date().toISOString(),
    playerCount: 2, buyIn: 10, prizePool: 20, bountyEnabled: false, bountyAmount: 0,
    rebuyEnabled: false, totalRebuys: 0, addOnEnabled: false, totalAddOns: 0,
    elapsedSeconds: 3600, levelsPlayed: 5, currency: 'USD',
    players: [
      { name: 'A', place: 1, payout: 15, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0 },
      { name: 'B', place: 2, payout: 5, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0 },
    ],
  };
  const league: League = {
    id: 'l1', name: 'Test League', createdAt: new Date().toISOString(),
    pointSystem: { entries: [{ place: 1, points: 10 }, { place: 2, points: 7 }] },
  };
  const gd = createGameDayFromResult(result, league);
  expect(gd.currency).toBe('USD');
});

it('defaults GameDay currency to undefined when result has no currency', () => {
  const result: TournamentResult = {
    id: 'tr2', name: 'Test', date: new Date().toISOString(),
    playerCount: 2, buyIn: 10, prizePool: 20, bountyEnabled: false, bountyAmount: 0,
    rebuyEnabled: false, totalRebuys: 0, addOnEnabled: false, totalAddOns: 0,
    elapsedSeconds: 3600, levelsPlayed: 5,
    players: [
      { name: 'A', place: 1, payout: 15, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0 },
      { name: 'B', place: 2, payout: 5, rebuys: 0, addOn: false, knockouts: 0, bountyEarned: 0 },
    ],
  };
  const league: League = {
    id: 'l1', name: 'Test League', createdAt: new Date().toISOString(),
    pointSystem: { entries: [{ place: 1, points: 10 }, { place: 2, points: 7 }] },
  };
  const gd = createGameDayFromResult(result, league);
  expect(gd.currency).toBeUndefined();
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/michaelprill/Claudeprojekte/7mountainpoker-claude && npx vitest run tests/logic.test.ts -t "propagates currency"`

Expected: FAIL — `gd.currency` is undefined because `createGameDayFromResult` doesn't set it yet.

**Step 3: Add currency to GameDay type**

In `src/domain/types.ts`, add to the `GameDay` interface (after `cashBalance: number;`, ~line 416):

```typescript
  /** Tournament currency. Defaults to EUR for old game days without this field. */
  currency?: Currency;
```

**Step 4: Propagate currency in createGameDayFromResult**

In `src/domain/league.ts`, in the `createGameDayFromResult` function, add to the GameDay object literal (after `cashBalance: totalBuyIns - totalPrizePool,` at ~line 129):

```typescript
    ...(result.currency ? { currency: result.currency } : {}),
```

**Step 5: Run test to verify it passes**

Run: `cd /Users/michaelprill/Claudeprojekte/7mountainpoker-claude && npx vitest run tests/logic.test.ts -t "propagates currency"`

Expected: PASS

**Step 6: Replace hardcoded `€` in League components**

For each of the 4 League components, add a helper to resolve the currency symbol. Each component receives `gameDays` (or standings derived from them) as props.

**Pattern for each component:** Where `€` is hardcoded, use a helper function. Since these components don't have direct access to a single currency (a league may span multiple game days), use the most common currency from game days, falling back to `'€'`.

**Simpler approach:** Add a `currencySymbol` prop to each component. The parent (`LeagueView.tsx`) computes it from game days and passes it down.

Check what LeagueView passes:

In `src/components/LeagueView.tsx`, add a computed currency symbol:

```typescript
import { CURRENCY_SYMBOLS } from '../domain/types';
import type { Currency } from '../domain/types';

// Inside the component, after existing useMemo hooks:
const currencySymbol = useMemo(() => {
  const currencies = gameDays.map(gd => gd.currency).filter(Boolean) as Currency[];
  if (currencies.length === 0) return '€';
  return CURRENCY_SYMBOLS[currencies[0]] ?? '€';
}, [gameDays]);
```

Then pass `currencySymbol={currencySymbol}` to `LeagueFinances`, `LeagueGameDays`, `LeagueStandingsTable`.

For `GameDayEditor`: it already has a `league` prop and creates new game days. Add `currencySymbol` prop too.

**In each component:**

**`LeagueFinances.tsx`** — Add `currencySymbol: string` to Props. Replace all 10 `€` with `{currencySymbol}`.

**`LeagueGameDays.tsx`** — Add `currencySymbol: string` to Props. Replace all 4 `€` with `{currencySymbol}`.

**`LeagueStandingsTable.tsx`** — Add `currencySymbol: string` to Props. Replace all 3 `€` with `{currencySymbol}`.

**`GameDayEditor.tsx`** — Add `currencySymbol: string` to Props. Replace all 5 `€` with `{currencySymbol}`.

**Step 7: Run full test suite + lint**

Run: `cd /Users/michaelprill/Claudeprojekte/7mountainpoker-claude && npm run lint && npx vitest run`

Expected: All tests pass, no lint errors. (Component tests don't render League components directly so no test changes needed beyond the domain tests.)

**Step 8: Commit**

```bash
git add src/domain/types.ts src/domain/league.ts src/components/LeagueFinances.tsx src/components/LeagueGameDays.tsx src/components/LeagueStandingsTable.tsx src/components/GameDayEditor.tsx src/components/LeagueView.tsx tests/logic.test.ts
git commit -m "feat: propagate currency through GameDay and League finance components"
```

---

### Task 3: PeerJS Hardening — Longer Peer-ID + Connection Limits

**Files:**
- Modify: `src/domain/remote.ts` (lines 46, 478-550)
- Test: `tests/logic.test.ts`

**Step 1: Write the failing tests**

In `tests/logic.test.ts`, find the `generatePeerId` describe block and update:

```typescript
it('generates peer ID with 8-character suffix', () => {
  const id = generatePeerId();
  expect(id).toMatch(/^PKR-[A-Z2-9]{8}$/);
  expect(id.length).toBe(12); // "PKR-" (4) + 8 chars
});
```

Also add a new describe for connection limits:

```typescript
describe('RemoteHost connection limits', () => {
  it('exports MAX_CONTROLLERS constant as 4', () => {
    expect(MAX_CONTROLLERS).toBe(4);
  });

  it('exports MAX_DISPLAYS constant as 8', () => {
    expect(MAX_DISPLAYS).toBe(8);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/michaelprill/Claudeprojekte/7mountainpoker-claude && npx vitest run tests/logic.test.ts -t "generates peer ID with 8"`

Expected: FAIL — current regex expects 5 characters, IDs are still 5 chars.

**Step 3: Implement changes in remote.ts**

1. Change `PEER_ID_LENGTH` from `5` to `8` (line 46):
```typescript
const PEER_ID_LENGTH = 8;
```

2. Add connection limit constants (after `MAX_MESSAGE_AGE_MS`, ~line 66):
```typescript
/** Maximum simultaneous controller connections */
export const MAX_CONTROLLERS = 4;
/** Maximum simultaneous display connections */
export const MAX_DISPLAYS = 8;
```

3. In `RemoteHost.peer.on('connection')` handler (~line 478), add guard at the very top of the callback, before the `onFirstData` function:

```typescript
this.peer.on('connection', (conn) => {
  // Connection limit guard — reject if both pools are full
  const totalConns = this.controllerConns.size + this.displayConnections.size;
  if (totalConns >= MAX_CONTROLLERS + MAX_DISPLAYS) {
    console.warn(`[RemoteHost] Connection rejected — limit reached (${totalConns})`);
    try { conn.close(); } catch { /* ignore */ }
    return;
  }
```

4. In the display branch (~line 490, `msg.role === 'display'`), add before registering:
```typescript
if (this.displayConnections.size >= MAX_DISPLAYS) {
  console.warn(`[RemoteHost] Display connection rejected — limit reached (${this.displayConnections.size})`);
  try { conn.close(); } catch { /* ignore */ }
  return;
}
```

5. In the controller branch (~line 519, `msg.role === 'remote'`), add before registering:
```typescript
if (this.controllerConns.size >= MAX_CONTROLLERS) {
  console.warn(`[RemoteHost] Controller connection rejected — limit reached (${this.controllerConns.size})`);
  try { conn.close(); } catch { /* ignore */ }
  return;
}
```

6. Same guard for the legacy fallback branch (~line 541).

**Step 4: Update exports in logic.ts barrel**

Check if `MAX_CONTROLLERS`/`MAX_DISPLAYS` need to be exported from the barrel. Since `remote.ts` is NOT in the barrel (imported directly), the test must import directly:

```typescript
import { generatePeerId, MAX_CONTROLLERS, MAX_DISPLAYS } from '../src/domain/remote';
```

Verify this import already exists or add it to `tests/logic.test.ts`.

**Step 5: Run tests**

Run: `cd /Users/michaelprill/Claudeprojekte/7mountainpoker-claude && npm run lint && npx vitest run`

Expected: All tests pass.

**Step 6: Commit**

```bash
git add src/domain/remote.ts tests/logic.test.ts
git commit -m "security: extend PeerJS peer-ID to 8 chars and add connection limits"
```

---

### Task 4: Sync CSP Meta Tag with Vercel Headers

**Files:**
- Modify: `index.html` (line 8)

**Step 1: Compare current meta tag with vercel.json**

Current `index.html` CSP (line 8) is missing compared to `vercel.json`:
- `worker-src 'self'` — needed for PWA service worker
- `frame-ancestors 'none'` — prevents clickjacking (equivalent to `X-Frame-Options: DENY`)

**Step 2: Update the CSP meta tag**

Replace line 8 in `index.html` with:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss://*.peerjs.com https://*.peerjs.com https://stun.l.google.com:19302 https://va.vercel-scripts.com https://*.ingest.sentry.io; media-src 'self'; img-src 'self' data: blob:; font-src 'self'; worker-src 'self'; frame-ancestors 'none';" />
```

Note: `frame-ancestors` in a meta tag is technically ignored by browsers (only works via HTTP header), but including it for documentation parity is harmless. The `X-Frame-Options: DENY` header in `vercel.json` handles this for Vercel. GitHub Pages doesn't support custom headers, so this is the best we can do.

**Step 3: Verify build works**

Run: `cd /Users/michaelprill/Claudeprojekte/7mountainpoker-claude && npm run build`

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add index.html
git commit -m "security: sync CSP meta tag with vercel.json (add worker-src, frame-ancestors)"
```

---

### Task 5: Update Documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `CHANGELOG.md`
- Modify: `README.md`

**Step 1: Update CLAUDE.md**

In the version line, bump to `6.9.1`. Add to Key Implementation Details or relevant sections:
- Currency propagation through GameDay
- PeerJS peer-ID length (8 chars) and connection limits
- CSP meta tag sync

**Step 2: Update CHANGELOG.md**

Add v6.9.1 entry at top:

```markdown
### v6.9.1 — Security Hardening & Currency Propagation

- **Currency in SharedResultView**: `result.currency` used instead of hardcoded `t('unit.eur')`. Fallback to EUR for QR-decoded results.
- **Currency in GameDay**: `currency?: Currency` field added to `GameDay` type. Propagated from `TournamentResult` via `createGameDayFromResult()`. All Liga-Finanzkomponenten (LeagueFinances, LeagueGameDays, LeagueStandingsTable, GameDayEditor) display correct currency symbol instead of hardcoded `€`.
- **PeerJS Peer-ID verlängert**: 5 → 8 Zeichen (32⁸ = 1.1 Billionen Kombinationen statt 33 Millionen).
- **Connection Limits**: `MAX_CONTROLLERS = 4`, `MAX_DISPLAYS = 8`. Überzählige Verbindungen werden abgelehnt.
- **CSP Meta-Tag Sync**: `worker-src 'self'` und `frame-ancestors 'none'` zu `index.html` hinzugefügt (Parität mit `vercel.json`).
- **N neue Tests** — **119X Tests gesamt**
```

**Step 3: Update README.md**

Bump version badge to `6.9.1`. Update test count badge.

**Step 4: Bump package.json**

```bash
# Update "version": "6.9.0" → "6.9.1" in package.json
```

**Step 5: Run full verification**

Run: `cd /Users/michaelprill/Claudeprojekte/7mountainpoker-claude && npm run lint && npx vitest run && npm run build`

Expected: All pass.

**Step 6: Commit**

```bash
git add CLAUDE.md CHANGELOG.md README.md package.json
git commit -m "docs: update documentation for v6.9.1"
```
