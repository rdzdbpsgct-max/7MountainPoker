import type { AppFeature, AppTier } from '../domain/entitlements';
import { useTranslation } from '../i18n';

interface Props {
  feature: AppFeature;
  currentTier: AppTier;
  requiredTier: AppTier;
  onClose: () => void;
  onUpgrade: () => void;
}

function tierLabelKey(tier: AppTier): 'paywall.tier.free' | 'paywall.tier.premium' | 'paywall.tier.pro' {
  if (tier === 'free') return 'paywall.tier.free';
  if (tier === 'premium') return 'paywall.tier.premium';
  return 'paywall.tier.pro';
}

export function FeatureGateModal({
  feature,
  currentTier,
  requiredTier,
  onClose,
  onUpgrade,
}: Props) {
  const { t } = useTranslation();
  const featureName = t(`paywall.feature.${feature}` as Parameters<typeof t>[0]);

  return (
    <div className="fixed inset-0 z-50 bg-black/45 dark:bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        className="max-w-md w-full rounded-2xl border border-gray-300 dark:border-gray-700/50 bg-white/95 dark:bg-gray-900/95 shadow-2xl shadow-gray-300/40 dark:shadow-black/40 p-6 space-y-4 animate-scale-in"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              {t('paywall.badge')}
            </p>
            <h3 id="paywall-title" className="text-lg font-bold text-gray-900 dark:text-white">
              {t('paywall.title')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="px-2 py-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md transition-colors"
            aria-label={t('app.cancel')}
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t('paywall.description', {
            feature: featureName,
            tier: t(tierLabelKey(requiredTier)),
          })}
        </p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('paywall.currentTier')}</p>
            <p className="font-semibold text-gray-900 dark:text-white">{t(tierLabelKey(currentTier))}</p>
          </div>
          <div className="rounded-lg border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">{t('paywall.requiredTier')}</p>
            <p className="font-semibold text-amber-800 dark:text-amber-200">{t(tierLabelKey(requiredTier))}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800/70 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700/50 transition-colors"
          >
            {t('paywall.keepUsing')}
          </button>
          <button
            onClick={onUpgrade}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-200 shadow-md active:scale-[0.97]"
            style={{ background: 'linear-gradient(to bottom, var(--accent-600), var(--accent-700))' }}
          >
            {t('paywall.upgrade')}
          </button>
        </div>
      </div>
    </div>
  );
}
