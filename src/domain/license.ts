/**
 * License key system for 7Mountain Poker.
 *
 * Format: 7MP-{tier}-{expiry}-{signature}
 * - tier: 'premium' | 'pro'
 * - expiry: YYYYMMDD or '0' (never expires)
 * - signature: first 12 hex chars of HMAC-SHA256(secret, "7MP-{tier}-{expiry}")
 *
 * Keys are self-signed and verified offline via Web Crypto API.
 */

import type { AppTier } from './entitlements';
import { saveEntitlements } from './entitlements';

// HMAC secret for license verification (base64url-encoded)
// This is intentionally embedded — the goal is a barrier, not cryptographic security.
const LICENSE_SECRET = 'N3dtcF9wb2tlcl90aW1lcl9saWNlbnNl';

const LS_KEY = 'poker-timer-license';
const VALID_TIERS: AppTier[] = ['premium', 'pro'];

export interface LicenseInfo {
  tier: AppTier;
  expiresAt: Date | null; // null = never expires
  key: string;
}

/** Parse a license key string into its components. Returns null if format is invalid. */
export function parseLicenseKey(key: string): LicenseInfo | null {
  const trimmed = key.trim().toUpperCase();
  const parts = trimmed.split('-');
  if (parts.length !== 4) return null;
  if (parts[0] !== '7MP') return null;

  const tierStr = parts[1]!.toLowerCase();
  if (!VALID_TIERS.includes(tierStr as AppTier)) return null;
  const tier = tierStr as AppTier;

  const expiryStr = parts[2]!;
  let expiresAt: Date | null = null;
  if (expiryStr !== '0') {
    if (!/^\d{8}$/.test(expiryStr)) return null;
    const year = parseInt(expiryStr.slice(0, 4), 10);
    const month = parseInt(expiryStr.slice(4, 6), 10) - 1;
    const day = parseInt(expiryStr.slice(6, 8), 10);
    expiresAt = new Date(year, month, day, 23, 59, 59);
    if (isNaN(expiresAt.getTime())) return null;
  }

  const sig = parts[3]!;
  if (!/^[A-F0-9]{12}$/i.test(sig)) return null;

  return { tier, expiresAt, key: trimmed };
}

/** Check if a license has expired. */
export function isLicenseExpired(info: LicenseInfo): boolean {
  if (!info.expiresAt) return false; // never expires
  return new Date() > info.expiresAt;
}

/** Verify the HMAC signature of a license key. */
export async function verifyLicenseKey(key: string): Promise<boolean> {
  const trimmed = key.trim().toUpperCase();
  const parts = trimmed.split('-');
  if (parts.length !== 4) return false;

  const payload = `${parts[0]}-${parts[1]}-${parts[2]}`;
  const providedSig = parts[3]!.toLowerCase();

  try {
    const secretBytes = Uint8Array.from(atob(LICENSE_SECRET), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      'raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const payloadBytes = new TextEncoder().encode(payload);
    const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, payloadBytes);
    const fullHex = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    const expectedSig = fullHex.slice(0, 12);
    return expectedSig === providedSig;
  } catch {
    return false;
  }
}

/** Activate a license key: parse, verify HMAC, check expiry, persist. */
export async function activateLicense(key: string): Promise<{ success: boolean; tier?: AppTier; error?: string }> {
  const info = parseLicenseKey(key);
  if (!info) return { success: false, error: 'invalid' };

  const valid = await verifyLicenseKey(key);
  if (!valid) return { success: false, error: 'invalid' };

  if (isLicenseExpired(info)) return { success: false, error: 'expired' };

  // Persist license key and update entitlements
  try { localStorage.setItem(LS_KEY, info.key); } catch { /* private browsing */ }
  saveEntitlements({ tier: info.tier });
  return { success: true, tier: info.tier };
}

/** Load the stored license key from localStorage. Returns null if none stored. */
export function loadStoredLicense(): string | null {
  try { return localStorage.getItem(LS_KEY); } catch { return null; }
}

/** Load and validate the stored license. Returns the LicenseInfo if valid and not expired. */
export async function loadValidLicense(): Promise<LicenseInfo | null> {
  const key = loadStoredLicense();
  if (!key) return null;
  const info = parseLicenseKey(key);
  if (!info) return null;
  if (isLicenseExpired(info)) return null;
  const valid = await verifyLicenseKey(key);
  if (!valid) return null;
  return info;
}

/** Clear the stored license and reset to default tier. */
export function clearLicense(): void {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  saveEntitlements({ tier: readDefaultTierFromEnvInternal() });
}

/** Read default tier from env (avoids circular import with entitlements.ts). */
function readDefaultTierFromEnvInternal(): AppTier {
  const env = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_TIER) || '';
  if (env === 'free' || env === 'premium' || env === 'pro') return env;
  return 'premium';
}
