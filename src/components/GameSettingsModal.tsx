import { memo, lazy, Suspense, useEffect, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Settings } from '../domain/types';
import type { AppFeature } from '../domain/entitlements';
import { useTranslation } from '../i18n';
import { LoadingFallback } from './LoadingFallback';

const SettingsPanel = lazy(() => import('./SettingsPanel').then(m => ({ default: m.SettingsPanel })));

interface Props {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onSettingsChange: Dispatch<SetStateAction<Settings>>;
  onToggleFullscreen: () => void;
  onShowInstallGuide: () => void;
  onShowIcm: () => void;
  onResetLevel: () => void;
  onRestartTournament: () => void;
  onExitToSetup: () => void;
  canUseCustomAccent?: boolean | undefined;
  canUseCustomBackground?: boolean | undefined;
  canUseCustomLayout?: boolean | undefined;
  onOpenFeatureGate?: ((feature: AppFeature) => void) | undefined;
}

export const GameSettingsModal = memo(function GameSettingsModal({
  open,
  onClose,
  settings,
  onSettingsChange,
  onToggleFullscreen,
  onShowInstallGuide,
  onShowIcm,
  onResetLevel,
  onRestartTournament,
  onExitToSetup,
  canUseCustomAccent,
  canUseCustomBackground,
  canUseCustomLayout,
  onOpenFeatureGate,
}: Props) {
  const { t } = useTranslation();

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={t('settings.modalTitle')}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200/60 dark:border-gray-700/30 animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200/60 dark:border-gray-700/30 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('settings.modalTitle')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={t('shared.close')}
          >
            {String.fromCodePoint(0x2715)}
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <Suspense fallback={<LoadingFallback />}>
            <SettingsPanel
              settings={settings}
              onChange={onSettingsChange}
              onToggleFullscreen={onToggleFullscreen}
              onShowInstallGuide={onShowInstallGuide}
              canUseCustomAccent={canUseCustomAccent}
              canUseCustomBackground={canUseCustomBackground}
              canUseCustomLayout={canUseCustomLayout}
              onOpenFeatureGate={onOpenFeatureGate ? (f) => onOpenFeatureGate(f as AppFeature) : undefined}
            />
          </Suspense>
        </div>

        {/* Footer buttons */}
        <div className="sticky bottom-0 px-5 py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-gray-200/60 dark:border-gray-700/30 rounded-b-2xl space-y-2">
          <button
            onClick={() => { onShowIcm(); onClose(); }}
            className="w-full px-3 py-2 bg-gray-100/80 dark:bg-gray-800/50 hover:bg-gray-200/80 dark:hover:bg-gray-700/60 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium transition-all duration-200 border border-gray-200/60 dark:border-gray-700/30 hover:border-gray-300 dark:hover:border-gray-600/40"
          >
            {t('icm.title')}
          </button>
          <div className="border-t border-gray-200/60 dark:border-gray-700/30 my-1" />
          <button
            onClick={() => { onResetLevel(); onClose(); }}
            className="w-full px-3 py-2 bg-gray-100/80 dark:bg-gray-800/50 hover:bg-gray-200/80 dark:hover:bg-gray-700/60 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium transition-all duration-200 border border-gray-200/60 dark:border-gray-700/30 hover:border-gray-300 dark:hover:border-gray-600/40"
          >
            {t('controls.levelReset')}
          </button>
          <button
            onClick={() => { onRestartTournament(); onClose(); }}
            className="w-full px-3 py-2 bg-red-50/80 dark:bg-red-900/20 hover:bg-red-100/80 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium transition-all duration-200 border border-red-200/60 dark:border-red-700/30 hover:border-red-300 dark:hover:border-red-600/40"
          >
            {t('controls.tournamentRestart')}
          </button>
          <button
            onClick={() => { onExitToSetup(); onClose(); }}
            className="w-full px-3 py-2 bg-gray-100/80 dark:bg-gray-800/50 hover:bg-gray-200/80 dark:hover:bg-gray-700/60 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium transition-all duration-200 border border-gray-200/60 dark:border-gray-700/30 hover:border-gray-300 dark:hover:border-gray-600/40"
          >
            {t('settings.backToSetup')}
          </button>
        </div>
      </div>
    </div>
  );
});
