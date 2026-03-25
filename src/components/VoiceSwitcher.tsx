import type { Settings } from '../domain/types';
import { useTranslation } from '../i18n';

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

export function VoiceSwitcher({ settings, onChange }: Props) {
  const { t } = useTranslation();
  const active = settings.voiceEnabled;
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700/40" title={t('settings.sound')}>
      <button
        onClick={() => onChange({ ...settings, voiceEnabled: false })}
        title={t('settings.sound')}
        aria-label={t('settings.sound')}
        className={`px-2 py-1.5 text-xs font-medium transition-colors ${
          !active
            ? 'text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        style={!active ? { backgroundColor: 'var(--accent-700)' } : undefined}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </button>
      <button
        onClick={() => onChange({ ...settings, voiceEnabled: true })}
        title={t('settings.voice')}
        aria-label={t('settings.voice')}
        className={`px-2 py-1.5 text-xs font-medium transition-colors ${
          active
            ? 'text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        style={active ? { backgroundColor: 'var(--accent-700)' } : undefined}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3-3z" />
        </svg>
      </button>
    </div>
  );
}
