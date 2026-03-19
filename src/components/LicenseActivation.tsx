import { useState, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { activateLicense, loadStoredLicense, parseLicenseKey, clearLicense, isLicenseExpired } from '../domain/license';
import type { LicenseInfo } from '../domain/license';
import { useDialogA11y } from '../hooks/useDialogA11y';

interface Props {
  onClose: () => void;
  onActivated: (tier: string) => void;
}

export function LicenseActivation({ onClose, onActivated }: Props) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [storedInfo, setStoredInfo] = useState<LicenseInfo | null>(() => {
    const key = loadStoredLicense();
    if (key) {
      const info = parseLicenseKey(key);
      if (info && !isLicenseExpired(info)) return info;
    }
    return null;
  });
  const dialogRef = useDialogA11y(onClose);

  const handleActivate = useCallback(async () => {
    if (!input.trim()) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    const result = await activateLicense(input);
    setLoading(false);

    if (result.success && result.tier) {
      setSuccess(result.tier);
      setStoredInfo(parseLicenseKey(input));
      setInput('');
      onActivated(result.tier);
    } else {
      setError(result.error === 'expired' ? t('license.expired') : t('license.invalid'));
    }
  }, [input, onActivated, t]);

  const handleRemove = useCallback(() => {
    clearLicense();
    setStoredInfo(null);
    setSuccess(null);
    onActivated('free');
  }, [onActivated]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      void handleActivate();
    }
  }, [handleActivate, input]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="license-title"
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md animate-scale-in border border-gray-200 dark:border-gray-700/40"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700/40">
          <h2 id="license-title" className="text-lg font-bold text-gray-900 dark:text-white">
            {t('license.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
            aria-label={t('shared.close')}
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Active license display */}
          {storedInfo && !success && (
            <div className="p-4 rounded-xl border-2 border-green-500/30 bg-green-500/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('license.active')}</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--accent-500)' }}>
                    {t('license.tier', { tier: storedInfo.tier.charAt(0).toUpperCase() + storedInfo.tier.slice(1) })}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {storedInfo.expiresAt
                      ? t('license.expires', { date: storedInfo.expiresAt.toLocaleDateString() })
                      : t('license.expiresNever')}
                  </p>
                </div>
                <button
                  onClick={handleRemove}
                  className="px-3 py-1.5 text-sm bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  {t('license.remove')}
                </button>
              </div>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="p-4 rounded-xl border-2 border-green-500/30 bg-green-500/10 text-center">
              <p className="text-2xl mb-1">&#x2705;</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {t('license.success', { tier: success.charAt(0).toUpperCase() + success.slice(1) })}
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}

          {/* Input field */}
          {!success && (
            <div>
              <label htmlFor="license-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('license.title')}
              </label>
              <input
                id="license-key"
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
                placeholder={t('license.placeholder')}
                maxLength={50}
                className="w-full bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg px-4 py-2.5 text-sm font-mono tracking-wider focus:ring-2 focus:outline-none uppercase"
                style={{ focusRingColor: 'var(--accent-ring)' } as React.CSSProperties}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg transition-colors"
          >
            {t('shared.close')}
          </button>
          {!success && (
            <button
              onClick={handleActivate}
              disabled={!input.trim() || loading}
              className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(to bottom, var(--accent-600), var(--accent-700))' }}
            >
              {loading ? '...' : t('license.activate')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
