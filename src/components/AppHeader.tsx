import type { Dispatch, SetStateAction } from 'react';
import type { AppFeature } from '../domain/entitlements';
import { markFeatureDiscovered } from '../domain/entitlements';
import type { Settings } from '../domain/types';
import { useTranslation } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { VoiceSwitcher } from './VoiceSwitcher';

type Mode = 'setup' | 'game' | 'league';

interface Props {
  mode: Mode;
  tournamentName: string;
  clockTime: string;
  settings: Settings;
  onSettingsChange: Dispatch<SetStateAction<Settings>>;
  tournamentFinished: boolean;
  canUseRemoteControl: boolean;
  canUseTVDisplay: boolean;
  canUseLeagueMode: boolean;
  remoteHostConnected: boolean;
  tvWindowActive: boolean;
  onStartRemoteHost: () => void;
  onToggleTVWindow: () => void;
  onToggleSetupGame: () => void;
  onExitToSetup: () => void;
  onShowTemplates: () => void;
  onToggleLeagueMode: () => void;
  onShowHistory: () => void;
  onShowInstallGuide: () => void;
  onShowHelp: () => void;
  onShowLog?: () => void;
  showLogButton?: boolean;
  onOpenFeatureGate: (feature: AppFeature) => void;
  onShowSeries?: () => void;
  onShowShareHub?: () => void;
  displayCount?: number;
}

function lockedTitle(featureName: string): string {
  return `${featureName} ${String.fromCodePoint(0x1F512)}`;
}

export function AppHeader({
  mode,
  tournamentName,
  clockTime,
  settings,
  onSettingsChange,
  tournamentFinished,
  canUseRemoteControl,
  canUseTVDisplay,
  canUseLeagueMode,
  remoteHostConnected,
  tvWindowActive,
  onStartRemoteHost,
  onToggleTVWindow,
  onToggleSetupGame,
  onExitToSetup,
  onShowTemplates,
  onToggleLeagueMode,
  onShowHistory,
  onShowInstallGuide,
  onShowHelp,
  onShowLog,
  showLogButton,
  onOpenFeatureGate,
  onShowSeries,
  onShowShareHub,
  displayCount,
}: Props) {
  const { t } = useTranslation();

  return (
    <header className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-b border-gray-300 dark:border-gray-700/30 bg-white/95 dark:bg-gray-900/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
        <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight truncate">
          {mode === 'game' && tournamentName ? `♠ ♥ ${tournamentName} ♦ ♣` : t('app.title')}
        </h1>
        {mode === 'game' && (
          <span className="text-sm text-gray-400 dark:text-gray-500 font-mono tabular-nums">{clockTime}</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
        <ThemeSwitcher />
        <LanguageSwitcher />
        <VoiceSwitcher settings={settings} onChange={onSettingsChange} />

        {mode === 'game' && !tournamentFinished && onShowShareHub && (
          <button
            onClick={onShowShareHub}
            className="relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border border-gray-300 dark:border-gray-700/60 hover:border-gray-400 dark:hover:border-gray-600 bg-white/80 dark:bg-gray-800/60"
            title={t('shareHub.title')}
            aria-label={t('shareHub.title')}
          >
            {String.fromCodePoint(0x1F4E1)}
            {((displayCount ?? 0) > 0 || remoteHostConnected || tvWindowActive) && (
              <span
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"
                style={{ backgroundColor: 'var(--accent-500)' }}
              />
            )}
          </button>
        )}

        {mode === 'game' && !tournamentFinished && (
          <>
            <button
              onClick={() => { markFeatureDiscovered('remoteControl'); if (canUseRemoteControl) { onStartRemoteHost(); } else { onOpenFeatureGate('remoteControl'); } }}
              className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
                canUseRemoteControl
                  ? 'bg-gray-200 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600/30'
                  : 'bg-amber-50 dark:bg-amber-900/25 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60'
              }`}
              title={canUseRemoteControl ? t('remote.openRemote') : lockedTitle(t('paywall.feature.remoteControl'))}
            >
              {String.fromCodePoint(0x1F4F1)} {!canUseRemoteControl ? String.fromCodePoint(0x1F512) : ''}
              {canUseRemoteControl && remoteHostConnected && (
                <span
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800"
                  style={{ backgroundColor: 'var(--accent-500)' }}
                />
              )}
            </button>

            <button
              onClick={() => { markFeatureDiscovered('tvDisplay'); if (canUseTVDisplay) { onToggleTVWindow(); } else { onOpenFeatureGate('tvDisplay'); } }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
                canUseTVDisplay
                  ? (tvWindowActive
                    ? 'text-white shadow-sm'
                    : 'bg-gray-200 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600/30')
                  : 'bg-amber-50 dark:bg-amber-900/25 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60'
              }`}
              style={canUseTVDisplay && tvWindowActive ? { backgroundColor: 'var(--accent-600)', borderColor: 'var(--accent-500)', boxShadow: `0 1px 2px var(--accent-900)` } : undefined}
              title={canUseTVDisplay ? (tvWindowActive ? t('display.tvWindowActive') : t('display.activate')) : lockedTitle(t('paywall.feature.tvDisplay'))}
            >
              📺 {!canUseTVDisplay ? String.fromCodePoint(0x1F512) : ''}
            </button>

            {showLogButton && onShowLog && (
              <button
                onClick={onShowLog}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600/30 rounded-lg text-sm font-medium transition-all duration-200"
                title={t('log.title' as Parameters<typeof t>[0])}
                aria-label={t('log.title' as Parameters<typeof t>[0])}
              >
                {String.fromCodePoint(0x1F4CB)}
              </button>
            )}
          </>
        )}

        {mode !== 'game' && (
          <button
            onClick={onToggleSetupGame}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              mode === 'league'
                ? 'bg-gray-200 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600/30'
                : 'text-white shadow-md'
            }`}
            style={mode === 'setup' ? { background: 'linear-gradient(to bottom, var(--accent-600), var(--accent-700))', boxShadow: `0 4px 6px -1px var(--accent-900)` } : undefined}
            title={mode === 'setup' ? t('app.startGame') : t('app.setup')}
          >
            {mode === 'setup' ? t('app.startGame') : t('app.setup')}
          </button>
        )}

        {mode === 'game' && (
          <button
            onClick={onExitToSetup}
            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600/30 rounded-lg text-sm font-medium transition-all duration-200"
            title={t('app.setup')}
          >
            {t('app.setup')}
          </button>
        )}

        {(mode === 'setup' || mode === 'league') && (
          <>
            {mode === 'setup' && (
              <button
                onClick={onShowTemplates}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm transition-all duration-200 border border-gray-300 dark:border-gray-700/30"
                title={t('app.templates')}
                data-tour="templates"
              >
                {t('app.templates')}
              </button>
            )}

            <button
              onClick={() => { markFeatureDiscovered('league'); if (canUseLeagueMode) { onToggleLeagueMode(); } else { onOpenFeatureGate('league'); } }}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 border ${
                canUseLeagueMode
                  ? (mode === 'league'
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700/30')
                  : 'bg-amber-50 dark:bg-amber-900/25 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60'
              }`}
              style={canUseLeagueMode && mode === 'league' ? { backgroundColor: 'var(--accent-600)', borderColor: 'var(--accent-500)' } : undefined}
              title={canUseLeagueMode ? t('app.leagues') : lockedTitle(t('paywall.feature.league'))}
              data-tour="leagues"
            >
              {t('app.leagues')} {!canUseLeagueMode ? ` ${String.fromCodePoint(0x1F512)}` : ''}
            </button>

            {mode === 'setup' && onShowSeries && (
              <button
                onClick={onShowSeries}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm transition-all duration-200 border border-gray-300 dark:border-gray-700/30"
                title={t('app.series')}
              >
                {t('app.series')}
              </button>
            )}

            <button
              onClick={onShowHistory}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm transition-all duration-200 border border-gray-300 dark:border-gray-700/30"
              title={t('app.history')}
            >
              {t('app.history')}
            </button>

            {mode === 'setup' && (
              <button
                onClick={onShowInstallGuide}
                className="p-1.5 bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg transition-all duration-200 border border-gray-300 dark:border-gray-700/30"
                title={t('settings.installApp' as Parameters<typeof t>[0])}
                aria-label={t('settings.installApp' as Parameters<typeof t>[0])}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 3v12m0 0l-4-4m4 4l4-4" />
                </svg>
              </button>
            )}
          </>
        )}

        <button
          onClick={onShowHelp}
          className="p-1.5 bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg transition-all duration-200 border border-gray-300 dark:border-gray-700/30"
          title={t('help.title' as Parameters<typeof t>[0])}
          aria-label={t('help.title' as Parameters<typeof t>[0])}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" strokeLinecap="round" />
            <circle cx="12" cy="17" r="0.5" fill="currentColor" />
          </svg>
        </button>
      </div>
    </header>
  );
}
