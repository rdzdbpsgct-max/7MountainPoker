import { useCallback, useEffect, useState } from 'react';
import {
  consumeTierTransition,
  getRequiredTier,
} from '../domain/entitlements';
import type { AppFeature, AppTier } from '../domain/entitlements';
import { trackMonetizationEvent } from '../domain/monetizationTelemetry';
import { showToast } from '../domain/toast';
import type { LanguageContextValue } from '../i18n/languageContextValue';

type Mode = 'setup' | 'game' | 'league';

interface UseFeatureGateArgs {
  currentTier: AppTier;
  mode: Mode;
  t: LanguageContextValue['t'];
  /** Optional callback to store the feature for auto-open after license activation */
  setPendingFeature?: (feature: AppFeature) => void;
}

export function useFeatureGate({
  currentTier,
  mode,
  t,
  setPendingFeature,
}: UseFeatureGateArgs) {
  const [lockedFeature, setLockedFeature] = useState<AppFeature | null>(null);

  useEffect(() => {
    const transition = consumeTierTransition(currentTier);
    if (transition.downgraded && transition.lostFeatures.length > 0) {
      showToast(t('paywall.downgradeNotice', { count: transition.lostFeatures.length }));
      trackMonetizationEvent('tier_downgrade_detected', {
        previousTier: transition.previousTier ?? undefined,
        currentTier,
        lostFeatures: transition.lostFeatures.length,
      });
      return;
    }
    if (transition.upgraded) {
      trackMonetizationEvent('tier_upgrade_detected', {
        previousTier: transition.previousTier ?? undefined,
        currentTier,
        gainedFeatures: transition.gainedFeatures.length,
      });
      if (transition.previousTier === 'free' && currentTier === 'premium') {
        trackMonetizationEvent('conversion_free_to_premium', {
          previousTier: transition.previousTier,
          currentTier,
          gainedFeatures: transition.gainedFeatures.length,
        });
      } else if (transition.previousTier === 'premium' && currentTier === 'pro') {
        trackMonetizationEvent('conversion_premium_to_pro', {
          previousTier: transition.previousTier,
          currentTier,
          gainedFeatures: transition.gainedFeatures.length,
        });
      }
    }
  }, [currentTier, t]);

  const openFeatureGate = useCallback((feature: AppFeature) => {
    const requiredTier = getRequiredTier(feature);
    setLockedFeature(feature);
    // Store as pending so it can be auto-opened after license activation
    setPendingFeature?.(feature);
    trackMonetizationEvent('feature_gate_seen', {
      feature,
      requiredTier,
      currentTier,
      mode,
    });
  }, [currentTier, mode, setPendingFeature]);

  const closeFeatureGate = useCallback(() => {
    if (lockedFeature) {
      trackMonetizationEvent('feature_gate_dismissed', {
        feature: lockedFeature,
        requiredTier: getRequiredTier(lockedFeature),
        currentTier,
        mode,
      });
    }
    setLockedFeature(null);
  }, [lockedFeature, currentTier, mode]);

  const handleUpgradeIntent = useCallback(() => {
    if (!lockedFeature) return;
    trackMonetizationEvent('feature_gate_upgrade_clicked', {
      feature: lockedFeature,
      requiredTier: getRequiredTier(lockedFeature),
      currentTier,
      mode,
    });
    showToast(t('paywall.upgradeToast'));
    setLockedFeature(null);
  }, [lockedFeature, currentTier, mode, t]);

  return {
    lockedFeature,
    openFeatureGate,
    closeFeatureGate,
    handleUpgradeIntent,
  };
}
