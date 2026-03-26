import { useState, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { detectPlatform } from '../domain/platform';
import type { Platform } from '../domain/platform';
import { BottomSheet } from './BottomSheet';
import { ChevronIcon } from './ChevronIcon';

interface Props {
  onClose: () => void;
  canPrompt: boolean;
  isInstalled: boolean;
  onPromptInstall: () => Promise<boolean>;
}

const PLATFORM_ORDER: Record<Platform, Platform[]> = {
  android: ['android', 'ios', 'desktop'],
  ios: ['ios', 'android', 'desktop'],
  desktop: ['desktop', 'android', 'ios'],
};

/** SVG icon for each platform — small, inline, theme-aware */
function PlatformIcon({ platform }: { platform: Platform }) {
  const cls = 'w-5 h-5 shrink-0';
  switch (platform) {
    case 'android':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="9" width="14" height="11" rx="2" />
          <path d="M8 9V6a4 4 0 0 1 8 0v3" />
          <circle cx="9" cy="5" r="0.5" fill="currentColor" />
          <circle cx="15" cy="5" r="0.5" fill="currentColor" />
          <path d="M5 14H3m18 0h-2" />
        </svg>
      );
    case 'ios':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="3" width="12" height="18" rx="3" />
          <path d="M12 18h.01" />
        </svg>
      );
    case 'desktop':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="13" rx="2" />
          <path d="M8 21h8m-4-4v4" />
        </svg>
      );
  }
}

function PlatformCard({ platform, defaultOpen }: { platform: Platform; defaultOpen: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);

  const titleKey = `pwa.${platform}.title` as const;
  const steps = [1, 2, 3, 4, 5].map(i => t(`pwa.${platform}.step${i}` as never));

  return (
    <div className="bg-gray-100/80 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="group w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-200/50 dark:hover:bg-gray-700/30 transition-all duration-200 text-left"
      >
        <PlatformIcon platform={platform} />
        <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
          {t(titleKey as never)}
        </span>
        <ChevronIcon open={open} className="text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200" />
      </button>
      {open && (
        <div className="px-4 pb-4 animate-fade-in">
          <ol className="space-y-2 ml-1">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex items-center justify-center w-5 h-5 rounded-full text-2xs font-bold text-white shrink-0"
                  style={{ backgroundColor: 'var(--accent-600)' }}
                >
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function PWAInstallGuide({ onClose, canPrompt, isInstalled, onPromptInstall }: Props) {
  const { t } = useTranslation();
  const platform = useMemo(() => detectPlatform(), []);
  const sortedPlatforms = PLATFORM_ORDER[platform];

  return (
    <BottomSheet onClose={onClose} ariaLabelledBy="pwa-install-title" maxWidth="max-w-md">
      <div className="p-5 space-y-4 overflow-y-auto flex-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2
            id="pwa-install-title"
            className="text-base font-bold text-gray-900 dark:text-white"
          >
            {t('pwa.title' as never)}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors"
            aria-label={t('accessibility.close')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Installed badge */}
        {isInstalled && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent-600)' }}>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {t('pwa.alreadyInstalled' as never)}
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {t('pwa.description' as never)}
        </p>

        {/* Native install button (Chromium only) */}
        {canPrompt && !isInstalled && (
          <button
            onClick={onPromptInstall}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-[0.97] shadow-lg"
            style={{ background: 'linear-gradient(to bottom, var(--accent-500), var(--accent-700))', boxShadow: '0 4px 12px var(--accent-glow)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 3v12m0 0l-4-4m4 4l4-4" />
            </svg>
            {t('pwa.installNow' as never)}
          </button>
        )}

        {/* Platform cards */}
        {!isInstalled && (
          <div className="space-y-2">
            <h3 className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t('pwa.instructions' as never)}
            </h3>
            {sortedPlatforms.map((p, i) => (
              <PlatformCard key={p} platform={p} defaultOpen={i === 0 && !canPrompt} />
            ))}
          </div>
        )}

        {/* Benefits */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700/40">
          <h3 className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
            {t('pwa.benefitsTitle' as never)}
          </h3>
          <div className="grid grid-cols-1 gap-1.5">
            {(['benefit1', 'benefit2', 'benefit3'] as const).map((key) => (
              <div key={key} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {t(`pwa.${key}` as never)}
              </div>
            ))}
          </div>
        </div>

        {/* iOS note */}
        {platform === 'ios' && !isInstalled && (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic leading-relaxed">
            {t('pwa.iosNote' as never)}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
