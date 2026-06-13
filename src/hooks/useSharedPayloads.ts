import { useState } from 'react';
import {
  decodeLeagueStandingsFromQR,
  decodeResultFromQR,
  decode7mpx,
  decodeTemplate7mpx,
  decodeResult7mpx,
  decodeLeague7mpx,
  fromBase64Url,
  SEVENMPX_HASH_PREFIX,
} from '../domain/logic';
import type { TournamentConfig } from '../domain/types';

type SharedResult = NonNullable<ReturnType<typeof decodeResultFromQR>>;
type SharedLeague = NonNullable<ReturnType<typeof decodeLeagueStandingsFromQR>>;

const clearHash = () => {
  history.replaceState(null, '', window.location.pathname + window.location.search);
};

/** Extract the raw 7MPX JSON string from a `#7mpx=` hash, or null. */
function json7mpxFromHash(hash: string): string | null {
  if (!hash.startsWith(SEVENMPX_HASH_PREFIX)) return null;
  const encoded = hash.slice(SEVENMPX_HASH_PREFIX.length);
  for (const candidate of [encoded, safeDecodeURIComponent(encoded)]) {
    if (!candidate) continue;
    try {
      const json = fromBase64Url(candidate);
      if (decode7mpx(json)) return json;
    } catch { /* try next */ }
  }
  return null;
}

function safeDecodeURIComponent(s: string): string | null {
  try { return decodeURIComponent(s); } catch { return null; }
}

/** Decode a `#7mpx=` envelope once on mount, routed by kind. */
function read7mpx(): {
  result: SharedResult | null;
  league: SharedLeague | null;
  template: TournamentConfig | null;
} {
  const empty = { result: null, league: null, template: null };
  const json = json7mpxFromHash(window.location.hash);
  if (!json) return empty;
  const env = decode7mpx(json);
  if (!env) return empty;
  if (env.kind === 'result') return { ...empty, result: decodeResult7mpx(json) };
  if (env.kind === 'league') return { ...empty, league: decodeLeague7mpx(json) };
  if (env.kind === 'template') return { ...empty, template: decodeTemplate7mpx(json) };
  return empty;
}

export function useSharedPayloads() {
  const initial7mpx = read7mpx();

  const [sharedResult, setSharedResult] = useState<SharedResult | null>(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#r=')) {
      const encoded = decodeURIComponent(hash.slice(3));
      const result = decodeResultFromQR(encoded);
      if (result) clearHash();
      return result;
    }
    if (initial7mpx.result) { clearHash(); return initial7mpx.result; }
    return null;
  });

  const [sharedLeague, setSharedLeague] = useState<SharedLeague | null>(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#ls=')) {
      const result = decodeLeagueStandingsFromQR(hash);
      if (result) clearHash();
      return result;
    }
    if (initial7mpx.league) { clearHash(); return initial7mpx.league; }
    return null;
  });

  // A template shared via #7mpx= is consumed by App.tsx (load into setup), then cleared.
  const [importedTemplate, setImportedTemplate] = useState<TournamentConfig | null>(() => {
    if (initial7mpx.template) { clearHash(); return initial7mpx.template; }
    return null;
  });

  return {
    sharedResult,
    setSharedResult,
    sharedLeague,
    setSharedLeague,
    importedTemplate,
    setImportedTemplate,
  };
}
