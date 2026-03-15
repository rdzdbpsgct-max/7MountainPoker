import type { AppFeature, AppTier } from './entitlements';

export type MonetizationEventName =
  | 'feature_gate_seen'
  | 'feature_gate_dismissed'
  | 'feature_gate_upgrade_clicked'
  | 'tier_downgrade_detected'
  | 'tier_upgrade_detected'
  | 'conversion_free_to_premium'
  | 'conversion_premium_to_pro'
  | 'feature_used'
  | 'feature_discovery_seen'
  | 'feature_discovery_clicked'
  | 'session_started';

export interface MonetizationEventPayload {
  feature?: AppFeature;
  requiredTier?: AppTier;
  currentTier?: AppTier;
  previousTier?: AppTier;
  mode?: 'setup' | 'game' | 'league';
  lostFeatures?: number;
  gainedFeatures?: number;
}

interface MonetizationCounterState {
  total: number;
  byEvent: Record<MonetizationEventName, number>;
  byFeature: Partial<Record<AppFeature, number>>;
  lastEventAt: string;
}

const STORAGE_KEY = 'poker-timer-monetization-metrics';
let memoryCounters: MonetizationCounterState | null = null;

function defaultCounters(): MonetizationCounterState {
  return {
    total: 0,
    byEvent: {
      feature_gate_seen: 0,
      feature_gate_dismissed: 0,
      feature_gate_upgrade_clicked: 0,
      tier_downgrade_detected: 0,
      tier_upgrade_detected: 0,
      conversion_free_to_premium: 0,
      conversion_premium_to_pro: 0,
      feature_used: 0,
      feature_discovery_seen: 0,
      feature_discovery_clicked: 0,
      session_started: 0,
    },
    byFeature: {},
    lastEventAt: new Date(0).toISOString(),
  };
}

function readCounters(): MonetizationCounterState {
  if (memoryCounters) return memoryCounters;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fallback = defaultCounters();
      memoryCounters = fallback;
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<MonetizationCounterState>;
    const merged = {
      ...defaultCounters(),
      ...parsed,
      byEvent: { ...defaultCounters().byEvent, ...parsed.byEvent },
      byFeature: { ...parsed.byFeature },
    };
    memoryCounters = merged;
    return merged;
  } catch {
    const fallback = defaultCounters();
    memoryCounters = fallback;
    return fallback;
  }
}

function writeCounters(counters: MonetizationCounterState): void {
  memoryCounters = counters;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
  } catch {
    // ignore storage errors
  }
}

function bumpLocalCounters(name: MonetizationEventName, payload: MonetizationEventPayload): void {
  const counters = readCounters();
  counters.total += 1;
  counters.byEvent[name] += 1;
  if (payload.feature) {
    counters.byFeature[payload.feature] = (counters.byFeature[payload.feature] ?? 0) + 1;
  }
  counters.lastEventAt = new Date().toISOString();
  writeCounters(counters);
}

export function trackMonetizationEvent(
  name: MonetizationEventName,
  payload: MonetizationEventPayload = {},
): void {
  bumpLocalCounters(name, payload);
  // Optional remote tracking (best-effort only)
  const trackPayload: Record<string, string | number | boolean | null | undefined> = { ...payload };
  import('@vercel/analytics')
    .then(({ track }) => {
      track(name, trackPayload);
    })
    .catch(() => {
      // ignore analytics runtime errors
    });
}

export function getMonetizationCounters(): MonetizationCounterState {
  return readCounters();
}

// ---------------------------------------------------------------------------
// Convenience tracking helpers
// ---------------------------------------------------------------------------

/** Track that a specific feature was used (e.g., TV display opened, remote started). */
export function trackFeatureUsed(feature: AppFeature, mode?: 'setup' | 'game' | 'league'): void {
  trackMonetizationEvent('feature_used', { feature, mode });
}

/** Track that a feature discovery tooltip was shown to the user. */
export function trackFeatureDiscoverySeen(feature: AppFeature): void {
  trackMonetizationEvent('feature_discovery_seen', { feature });
}

/** Track that the user clicked/interacted with a feature discovery tooltip. */
export function trackFeatureDiscoveryClicked(feature: AppFeature): void {
  trackMonetizationEvent('feature_discovery_clicked', { feature });
}

/** Track a new app session start. */
export function trackSessionStarted(): void {
  trackMonetizationEvent('session_started');
}
