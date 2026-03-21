import { useState, useMemo, useCallback } from 'react';
import {
  loadEntitlements,
  isFeatureAvailable,
} from '../domain/entitlements';
import type { EntitlementState } from '../domain/entitlements';

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
}

/**
 * Consolidates feature-gate entitlement state and all 11 canUse* flags.
 * Provides a refreshEntitlements callback for license activation flow.
 */
export function useEntitlements(): UseEntitlementsResult {
  const [entitlements, setEntitlements] = useState(() => loadEntitlements());
  const [showLicenseActivation, setShowLicenseActivation] = useState(false);

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

  return {
    entitlements,
    refreshEntitlements,
    showLicenseActivation,
    setShowLicenseActivation,
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
