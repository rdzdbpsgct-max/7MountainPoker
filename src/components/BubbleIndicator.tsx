import { memo } from 'react';
import { useTranslation } from '../i18n';

interface Props {
  isBubble: boolean;
  showItmFlash: boolean;
  addOnWindowOpen: boolean;
  addOnCost: number;
  addOnChips: number;
  lastHandActive?: boolean | undefined;
  handForHandActive?: boolean | undefined;
}

export const BubbleIndicator = memo(function BubbleIndicator({ isBubble, showItmFlash, addOnWindowOpen, addOnCost, addOnChips, lastHandActive, handForHandActive }: Props) {
  const { t } = useTranslation();

  // Priority: ITM > Bubble > HandForHand > LastHand > AddOn
  const banner = showItmFlash ? 'itm'
    : isBubble ? 'bubble'
    : handForHandActive ? 'h4h'
    : lastHandActive ? 'lastHand'
    : addOnWindowOpen ? 'addOn'
    : null;

  if (!banner) return null;

  switch (banner) {
    case 'itm':
      return (
        <div className="w-full max-w-xl px-4 py-3 border-2 rounded-xl text-center animate-itm-flash backdrop-blur-sm" role="status" aria-live="polite" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-500) 8%, transparent)', borderColor: 'var(--accent-500)' }}>
          <p className="text-lg font-bold" style={{ color: 'var(--accent-text)' }}>
            💰 {t('bubble.inTheMoney')} 💰
          </p>
        </div>
      );
    case 'bubble':
      return (
        <div className="w-full max-w-xl px-4 py-3 bg-red-50 dark:bg-red-900/30 border-2 border-red-400 dark:border-red-500 rounded-xl text-center animate-bubble-pulse backdrop-blur-sm" role="alert" aria-live="assertive">
          <p className="text-red-700 dark:text-red-300 text-xl font-bold tracking-wider">
            🫧 {t('bubble.bubble')} 🫧
          </p>
          <p className="text-red-600 dark:text-red-400/70 text-xs mt-1">
            {t('bubble.bubbleHint')}
          </p>
        </div>
      );
    case 'h4h':
      return (
        <div className="w-full max-w-xl px-4 py-3 bg-red-50 dark:bg-red-900/30 border-2 border-red-400 dark:border-red-500 rounded-xl text-center animate-bubble-pulse backdrop-blur-sm" role="status" aria-live="polite">
          <p className="text-red-700 dark:text-red-300 text-lg font-bold tracking-wider">
            {t('game.handForHand')}
          </p>
          <p className="text-red-600 dark:text-red-400/70 text-xs mt-1">
            {t('game.handForHandHint')}
          </p>
        </div>
      );
    case 'lastHand':
      return (
        <div className="w-full max-w-xl px-4 py-3 bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-400 dark:border-amber-500 rounded-xl text-center animate-addon-pulse backdrop-blur-sm" role="status" aria-live="polite">
          <p className="text-amber-700 dark:text-amber-300 text-lg font-bold tracking-wider">
            {t('game.lastHand')}
          </p>
          <p className="text-amber-600 dark:text-amber-400/70 text-xs mt-1">
            {t('game.lastHandHint')}
          </p>
        </div>
      );
    case 'addOn':
      return (
        <div className="w-full max-w-xl px-4 py-3 bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-400 dark:border-amber-500 rounded-xl text-center animate-addon-pulse backdrop-blur-sm" role="status" aria-live="polite">
          <p className="text-amber-700 dark:text-amber-300 text-lg font-bold">
            🎰 {t('addOn.announcement')} 🎰
          </p>
          <p className="text-amber-600 dark:text-amber-400/70 text-xs mt-1">
            {t('addOn.announcementDetail', { cost: addOnCost, chips: addOnChips.toLocaleString() })}
          </p>
        </div>
      );
  }
});
