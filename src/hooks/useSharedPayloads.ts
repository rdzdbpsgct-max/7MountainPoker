import { useState } from 'react';
import {
  decodeLeagueStandingsFromQR,
  decodeResultFromQR,
  decode7mpx,
  decodeTemplate7mpx,
  decodeResult7mpx,
  decodeLeague7mpx,
  json7mpxFromHash,
  SEVENMPX_HASH_PREFIX,
} from '../domain/logic';
import type { TournamentConfig } from '../domain/types';

type SharedResult = NonNullable<ReturnType<typeof decodeResultFromQR>>;
type SharedLeague = NonNullable<ReturnType<typeof decodeLeagueStandingsFromQR>>;

const clearHash = () => {
  history.replaceState(null, '', window.location.pathname + window.location.search);
};

/** Decode a `#7mpx=` envelope once on mount, routed by kind. */
function read7mpx(): {
  result: SharedResult | null;
  league: SharedLeague | null;
  template: TournamentConfig | null;
} {
  const empty = { result: null, league: null, template: null };
  const hash = window.location.hash;
  if (!hash.startsWith(SEVENMPX_HASH_PREFIX)) return empty;
  const json = json7mpxFromHash(hash);
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
