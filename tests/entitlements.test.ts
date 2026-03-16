import {
  defaultEntitlements,
  loadEntitlements,
  saveEntitlements,
  isFeatureAvailable,
  consumeTierTransition,
  featuresLostOnTierChange,
  featuresGainedOnTierChange,
} from '../src/domain/entitlements';

describe('entitlements', () => {
  beforeEach(() => {
    saveEntitlements({ tier: 'premium' });
  });

  it('uses premium as default tier when nothing is stored', () => {
    const state = defaultEntitlements();
    expect(state.tier).toBe('premium');
  });

  it('persists and loads custom tier settings', () => {
    saveEntitlements({ tier: 'free', overrides: { remoteControl: true } });
    const loaded = loadEntitlements();
    expect(loaded.tier).toBe('free');
    expect(loaded.overrides?.remoteControl).toBe(true);
  });

  it('enforces tier minimums without overrides', () => {
    expect(isFeatureAvailable('remoteControl', { tier: 'free' })).toBe(false);
    expect(isFeatureAvailable('remoteControl', { tier: 'premium' })).toBe(true);
    expect(isFeatureAvailable('cloudBackup', { tier: 'premium' })).toBe(false);
    expect(isFeatureAvailable('cloudBackup', { tier: 'pro' })).toBe(true);
  });

  it('respects explicit feature overrides', () => {
    const freeWithOverride = { tier: 'free' as const, overrides: { cloudBackup: true } };
    expect(isFeatureAvailable('cloudBackup', freeWithOverride)).toBe(true);
  });

  it('reports feature loss on downgrade', () => {
    const lost = featuresLostOnTierChange('pro', 'premium');
    expect(lost).toContain('cloudBackup');
    expect(lost).toContain('teamRoles');
    expect(lost).toContain('multiEvent');
  });

  it('reports feature gain on upgrade', () => {
    const gained = featuresGainedOnTierChange('free', 'premium');
    expect(gained).toContain('tvDisplay');
    expect(gained).toContain('remoteControl');
    expect(gained).toContain('league');
  });

  it('tracks tier transitions and detects downgrade', () => {
    consumeTierTransition('pro');

    const second = consumeTierTransition('premium');
    expect(second.downgraded).toBe(true);
    expect(second.upgraded).toBe(false);
    expect(second.previousTier).toBe('pro');
    expect(second.lostFeatures).toContain('cloudBackup');
    expect(second.gainedFeatures).toHaveLength(0);
  });

  it('tracks tier transitions and detects upgrade', () => {
    consumeTierTransition('free');

    const second = consumeTierTransition('premium');
    expect(second.downgraded).toBe(false);
    expect(second.upgraded).toBe(true);
    expect(second.previousTier).toBe('free');
    expect(second.gainedFeatures).toContain('tvDisplay');
    expect(second.lostFeatures).toHaveLength(0);
  });

  it('gates multiTable for free tier', () => {
    expect(isFeatureAvailable('multiTable', { tier: 'free' })).toBe(false);
    expect(isFeatureAvailable('multiTable', { tier: 'premium' })).toBe(true);
  });

  it('gates sidePot for free tier', () => {
    expect(isFeatureAvailable('sidePot', { tier: 'free' })).toBe(false);
    expect(isFeatureAvailable('sidePot', { tier: 'premium' })).toBe(true);
  });

  it('includes multiTable and sidePot in features lost on downgrade', () => {
    const lost = featuresLostOnTierChange('premium', 'free');
    expect(lost).toContain('multiTable');
    expect(lost).toContain('sidePot');
  });

  it('includes multiTable and sidePot in features gained on upgrade', () => {
    const gained = featuresGainedOnTierChange('free', 'premium');
    expect(gained).toContain('multiTable');
    expect(gained).toContain('sidePot');
  });
});
