import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { TournamentConfig, TournamentCheckpoint, Settings } from '../domain/types';
import type { AppFeature } from '../domain/entitlements';
import { useTranslation } from '../i18n';
import { ChevronIcon } from './ChevronIcon';
import { SetupTabs } from './SetupTabs';
import { SetupTabBasis } from './SetupTabBasis';
import { SetupTabPlayers } from './SetupTabPlayers';
import { SetupTabStructure } from './SetupTabStructure';
import { SetupTabReview } from './SetupTabReview';

interface Props {
  config: TournamentConfig;
  setConfig: React.Dispatch<React.SetStateAction<TournamentConfig>>;
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
  onShowCustomAudio: () => void;
  pendingCheckpoint: TournamentCheckpoint | null;
  onRestoreCheckpoint: () => void;
  onDismissCheckpoint: () => void;
  onSwitchToGame: () => void;
  onConfirm: (title: string, message: string, confirmLabel: string, onConfirm: () => void) => void;
  startErrors: string[];
  canUseMultiTable?: boolean | undefined;
  onOpenFeatureGate?: ((feature: AppFeature) => void) | undefined;
}

export function SetupPage({
  config,
  setConfig,
  settings,
  onSettingsChange,
  onShowCustomAudio,
  pendingCheckpoint,
  onRestoreCheckpoint,
  onDismissCheckpoint,
  onSwitchToGame,
  onConfirm,
  startErrors,
  canUseMultiTable,
  onOpenFeatureGate,
}: Props) {
  const { t } = useTranslation();

  // --- Tab state (persisted in sessionStorage) ---
  const [activeTab, setActiveTab] = useState<number>(() => {
    const saved = sessionStorage.getItem('setup-active-tab');
    return saved ? Math.min(Number(saved), 3) : 0;
  });

  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  useEffect(() => {
    sessionStorage.setItem('setup-active-tab', String(activeTab));
  }, [activeTab]);

  // --- Navigate to tab with slide direction ---
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const goToTab = useCallback((newTab: number) => {
    const clamped = Math.max(0, Math.min(3, newTab));
    setSlideDirection(clamped > activeTabRef.current ? 'right' : 'left');
    setActiveTab(clamped);
  }, []);

  // --- Tab status computation ---
  const tabStatus = useMemo(() => ({
    basis: (config.name || config.buyIn > 0) ? 'complete' as const : 'incomplete' as const,
    players: config.players.length >= 2 ? 'complete' as const : 'incomplete' as const,
    structure: config.levels.length > 0 ? 'complete' as const : 'incomplete' as const,
    review: startErrors.length === 0 ? 'complete' as const : 'warning' as const,
  }), [config.name, config.buyIn, config.players.length, config.levels.length, startErrors.length]);

  // --- Keyboard: Cmd+1-4 to jump to tab ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        goToTab(Number(e.key) - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goToTab]);

  // --- Swipe detection via pointer events ---
  const pointerStartRef = useRef<number | null>(null);
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointerStartRef.current = e.clientX;
  }, []);
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (pointerStartRef.current === null) return;
    const diff = e.clientX - pointerStartRef.current;
    if (Math.abs(diff) > 80) {
      goToTab(activeTabRef.current + (diff > 0 ? -1 : 1));
    }
    pointerStartRef.current = null;
  }, [goToTab]);

  // --- Inline validation error panel (collapsible, visible on non-review tabs) ---
  const [errorsExpanded, setErrorsExpanded] = useState(false);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <h1 className="sr-only">{t('setup.pageTitle')}</h1>
      <SetupTabs
        activeTab={activeTab}
        onTabChange={goToTab}
        tabStatus={tabStatus}
      />

      <div
        className="flex-1 overflow-y-auto"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div
          key={activeTab}
          className={`max-w-2xl mx-auto p-3 sm:p-6 ${
            slideDirection === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'
          }`}
        >
          {activeTab === 0 && (
            <SetupTabBasis
              config={config}
              setConfig={setConfig}
              pendingCheckpoint={pendingCheckpoint}
              onRestoreCheckpoint={onRestoreCheckpoint}
              onDismissCheckpoint={onDismissCheckpoint}
              onSwitchToGame={onSwitchToGame}
              onConfirm={onConfirm}
              startErrors={startErrors}
            />
          )}
          {activeTab === 1 && (
            <SetupTabPlayers
              config={config}
              setConfig={setConfig}
              canUseMultiTable={canUseMultiTable}
              onOpenFeatureGate={onOpenFeatureGate}
              onConfirm={onConfirm}
            />
          )}
          {activeTab === 2 && (
            <SetupTabStructure
              config={config}
              setConfig={setConfig}
              settings={settings}
              onSettingsChange={onSettingsChange}
              onShowCustomAudio={onShowCustomAudio}
              canUseMultiTable={canUseMultiTable}
              onOpenFeatureGate={onOpenFeatureGate}
            />
          )}
          {activeTab === 3 && (
            <SetupTabReview
              config={config}
              settings={settings}
              startErrors={startErrors}
              onSwitchToGame={onSwitchToGame}
              onTabChange={goToTab}
            />
          )}
        </div>

        {/* Inline validation errors (shown on tabs 0-2, not on Review which has its own display) */}
        {activeTab < 3 && startErrors.length > 0 && (
          <div className="max-w-2xl mx-auto px-3 sm:px-6 pb-2">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-500/30 rounded-xl text-sm overflow-hidden">
              <button
                onClick={() => setErrorsExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between px-3 py-2 text-red-700 dark:text-red-400 font-medium hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('setup.validationTitle' as Parameters<typeof t>[0])}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-xs bg-red-200 dark:bg-red-800/50 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full font-semibold">
                    {startErrors.length}
                  </span>
                  <ChevronIcon open={errorsExpanded} className="w-4 h-4 text-red-400 dark:text-red-500" />
                </span>
              </button>
              {errorsExpanded && (
                <ul className="px-3 pb-3 pt-0 space-y-1 text-red-600 dark:text-red-400 animate-fade-in">
                  {startErrors.map((err, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="shrink-0 mt-0.5">{'\u2022'}</span>
                      <span>{err}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Back/Next navigation */}
        {activeTab < 3 && (
          <div className="max-w-2xl mx-auto px-3 sm:px-6 pb-4 flex justify-between items-center">
            {activeTab > 0 ? (
              <button
                onClick={() => goToTab(activeTab - 1)}
                className="px-4 py-2 bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
              >
                {'\u2190'} {t('setup.tabBack' as Parameters<typeof t>[0])}
              </button>
            ) : <div />}
            <button
              onClick={() => goToTab(activeTab + 1)}
              className="px-6 py-2 text-white rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97] ml-auto"
              style={{ background: 'linear-gradient(to bottom, var(--accent-600), var(--accent-700))', boxShadow: '0 4px 6px -1px var(--accent-900)' }}
            >
              {t('setup.tabNext' as Parameters<typeof t>[0])} {'\u2192'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
