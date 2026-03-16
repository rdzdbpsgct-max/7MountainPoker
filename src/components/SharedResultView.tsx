import type { TournamentResult } from '../domain/types';
import { useTranslation } from '../i18n';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { formatElapsedTime } from '../domain/logic';

interface Props {
  result: TournamentResult;
  onClose: () => void;
}

export function SharedResultView({ result, onClose }: Props) {
  const { t } = useTranslation();
  const dialogRef = useDialogA11y(onClose);

  const placeEmoji = (place: number) => {
    if (place === 1) return '\u{1F3C6}';
    if (place === 2) return '\u{1F948}';
    if (place === 3) return '\u{1F949}';
    return `${place}.`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="shared-result-title" className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700/40 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-800/50">
          <h2 id="shared-result-title" className="text-lg font-bold text-gray-900 dark:text-white">
            {t('shared.title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {result.name} &mdash; {new Date(result.date).toLocaleDateString()}
          </p>
        </div>

        {/* Standings */}
        <div className="px-5 py-4 space-y-4">
          <div className="bg-white/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden">
            {result.players.map((player, idx) => (
              <div
                key={`${player.name}-${player.place}`}
                className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800/30 ${
                  player.place === 1
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-l-2 border-l-amber-400'
                    : idx % 2 === 0
                    ? 'bg-gray-50/50 dark:bg-gray-800/20'
                    : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className={`text-sm font-bold w-8 text-right shrink-0 ${
                    player.place === 1 ? 'text-amber-500' :
                    player.place === 2 ? 'text-gray-600 dark:text-gray-300' :
                    player.place === 3 ? 'text-amber-700' :
                    'text-gray-400 dark:text-gray-500'
                  }`}>
                    {placeEmoji(player.place)}
                  </span>
                  <span className={`text-sm truncate ${
                    player.payout > 0 ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {player.name}
                  </span>
                </div>
                {/* TODO: use result.currency when available */}
                {player.payout > 0 && (
                  <span className="text-sm font-bold shrink-0 ml-3" style={{ color: 'var(--accent-text)' }}>
                    {player.payout.toFixed(2)} {t('unit.eur')}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Tournament Info */}
          <div className="bg-white/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl px-4 py-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t('finished.prizePool')}</span>
              <span className="text-gray-900 dark:text-white font-medium">{result.prizePool.toFixed(2)} {t('unit.eur')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t('finished.players')}</span>
              <span className="text-gray-900 dark:text-white">{result.playerCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t('finished.buyIn')}</span>
              <span className="text-gray-900 dark:text-white">{result.buyIn} {t('unit.eur')}</span>
            </div>
            {result.totalRebuys > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('finished.rebuys')}</span>
                <span className="text-gray-900 dark:text-white">{result.totalRebuys}</span>
              </div>
            )}
            {result.bountyEnabled && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('finished.bountyLabel')}</span>
                <span className="text-gray-900 dark:text-white">{result.bountyAmount} {t('unit.eur')} / KO</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t('history.duration')}</span>
              <span className="text-gray-900 dark:text-white">{formatElapsedTime(result.elapsedSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Close button */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl text-base font-medium transition-all duration-200 border border-gray-200 dark:border-gray-600/30"
          >
            {t('shared.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
