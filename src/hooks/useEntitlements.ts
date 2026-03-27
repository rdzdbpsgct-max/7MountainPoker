import { useState, useMemo, useCallback, useRef } from 'react';
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

  const canUseTVDisplay = useMemo(() => isFeatureAvailable('tvDisplay', entitlements), [entitlements]);
  const canUseRemoteControl = useMemo(() => isFeatureAvailable('remoteControl', entitlements), [entitlements]);
  const canUseLeagueMode = useMemo(() => isFeatureAvailable('league', entitlements), [entitlements]);
  const canUseMultiTable = useMemo(() => isFeatureAvailable('multiTable', entitlements), [entitlements]);
  const canUseSidePot = useMemo(() => isFeatureAvailable('sidePot', entitlements), [entitlements]);
  const canUseCustomAccent = useMemo(() => isFeatureAvailable('customAccent', entitlements), [entitlements]);
  const canUseCustomBackground = useMemo(() => isFeatureAvailable('customBackground', entitlements), [entitlements]);
  const canUseCustomLayout = useMemo(() => isFeatureAvailable('customLayout', entitlements), [entitlements]);
  const canUseCustomAudio = useMemo(() => isFeatureAvailable('customAudio', entitlements), [entitlements]);
  const canUseSeries = useMemo(() => isFeatureAvailable('series', entitlements), [entitlements]);
  const canUseIcm = useMemo(() => isFeatureAvailable('icmCalculator', entitlements), [entitlements]);

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
