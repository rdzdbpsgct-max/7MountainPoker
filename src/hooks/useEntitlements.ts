import { useState, useCallback, useRef } from 'react';
import {
  loadEntitlements,
  isFeatureAvailable,
} from '../domain/entitlements';
import type { AppFeature, EntitlementState } from '../domain/entitlements';

export interface EntitlementFlags {
  canUseTVDisplay: boolean;
  canUseRemoteControl: boolean;
  canUseLeagueMode: boolean;
  canUseMultiTable: boolean;
  canUseSidePot: boolean;
  canUseCustomAccent: boolean;
  canUseCustomBackground: boolean;
  canUseCustomLayout: boolean;
  canUseCustomAudio: boolean;
  canUseSeries: boolean;
  canUseIcm: boolean;
}

export interface UseEntitlementsResult extends EntitlementFlags {
  entitlements: EntitlementState;
  /** Call after license activation to reload entitlements from storage */
  refreshEntitlements: () => void;
  showLicenseActivation: boolean;
  setShowLicenseActivation: React.Dispatch<React.SetStateAction<boolean>>;
  /** Store a feature to auto-open after license activation */
  setPendingFeature: (feature: AppFeature) => void;
  /** Consume and return the pending feature (returns null if none) */
  consumePendingFeature: () => AppFeature | null;
}

/**
 * Consolidates feature-gate entitlement state and all 11 canUse* flags.
 * Provides a refreshEntitlements callback for license activation flow.
 * Supports pendingFeature for auto-opening features after upgrade.
 */
export function useEntitlements(): UseEntitlementsResult {
  const [entitlements, setEntitlements] = useState(() => loadEntitlements());
  const [showLicenseActivation, setShowLicenseActivation] = useState(false);
  const pendingFeatureRef = useRef<AppFeature | null>(null);

  const canUseTVDisplay = isFeatureAvailable('tvDisplay', entitlements);
  const canUseRemoteControl = isFeatureAvailable('remoteControl', entitlements);
  const canUseLeagueMode = isFeatureAvailable('league', entitlements);
  const canUseMultiTable = isFeatureAvailable('multiTable', entitlements);
  const canUseSidePot = isFeatureAvailable('sidePot', entitlements);
  const canUseCustomAccent = isFeatureAvailable('customAccent', entitlements);
  const canUseCustomBackground = isFeatureAvailable('customBackground', entitlements);
  const canUseCustomLayout = isFeatureAvailable('customLayout', entitlements);
  const canUseCustomAudio = isFeatureAvailable('customAudio', entitlements);
  const canUseSeries = isFeatureAvailable('series', entitlements);
  const canUseIcm = isFeatureAvailable('icmCalculator', entitlements);

  const refreshEntitlements = useCallback(() => {
    setEntitlements(loadEntitlements());
  }, []);

  const setPendingFeature = useCallback((feature: AppFeature) => {
    pendingFeatureRef.current = feature;
  }, []);

  const consumePendingFeature = useCallback((): AppFeature | null => {
    const feature = pendingFeatureRef.current;
    pendingFeatureRef.current = null;
    return feature;
  }, []);

  return {
    entitlements,
    refreshEntitlements,
    showLicenseActivation,
    setShowLicenseActivation,
    setPendingFeature,
    consumePendingFeature,
    canUseTVDisplay,
    canUseRemoteControl,
    canUseLeagueMode,
    canUseMultiTable,
    canUseSidePot,
    canUseCustomAccent,
    canUseCustomBackground,
    canUseCustomLayout,
    canUseCustomAudio,
    canUseSeries,
    canUseIcm,
  };
}
