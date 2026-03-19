#!/usr/bin/env node
/**
 * License key generator for 7Mountain Poker.
 *
 * Usage:
 *   node scripts/generate-license.mjs premium 20270101
 *   node scripts/generate-license.mjs pro 0          # never expires
 *
 * Output: 7MP-PREMIUM-20270101-A8F3C9E1B2D4
 */

import { createHmac } from 'node:crypto';

const SECRET = 'N3dtcF9wb2tlcl90aW1lcl9saWNlbnNl';
const VALID_TIERS = ['premium', 'pro'];

const [, , tierArg, expiryArg] = process.argv;

if (!tierArg || !expiryArg) {
  console.error('Usage: node scripts/generate-license.mjs <tier> <expiry>');
  console.error('  tier:   premium | pro');
  console.error('  expiry: YYYYMMDD | 0 (never expires)');
  console.error('');
  console.error('Examples:');
  console.error('  node scripts/generate-license.mjs premium 20270101');
  console.error('  node scripts/generate-license.mjs pro 0');
  process.exit(1);
}

const tier = tierArg.toLowerCase();
if (!VALID_TIERS.includes(tier)) {
  console.error(`Invalid tier "${tierArg}". Must be: ${VALID_TIERS.join(', ')}`);
  process.exit(1);
}

if (expiryArg !== '0' && !/^\d{8}$/.test(expiryArg)) {
  console.error(`Invalid expiry "${expiryArg}". Must be YYYYMMDD or 0.`);
  process.exit(1);
}

const payload = `7MP-${tier.toUpperCase()}-${expiryArg}`;
const secretBytes = Buffer.from(SECRET, 'base64');
const hmac = createHmac('sha256', secretBytes).update(payload).digest('hex');
const signature = hmac.slice(0, 12).toUpperCase();

const licenseKey = `${payload}-${signature}`;

console.log('');
console.log('Generated license key:');
console.log(`  ${licenseKey}`);
console.log('');
console.log(`Tier:    ${tier}`);
console.log(`Expires: ${expiryArg === '0' ? 'Never' : `${expiryArg.slice(0, 4)}-${expiryArg.slice(4, 6)}-${expiryArg.slice(6, 8)}`}`);
