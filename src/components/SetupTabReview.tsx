import { useMemo, lazy, Suspense } from 'react';
import type { TournamentConfig, Settings } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { useTranslation } from '../i18n';
import { computeBlindStructureSummary, estimatePlayedLevels, estimateDuration } from '../domain/logic';
import { LoadingFallback } from './LoadingFallback';
const SetupQRCode = lazy(() => import('./SetupQRCode').then(m => ({ default: m.SetupQRCode })));

interface Props {
  config: TournamentConfig;
  settings: Settings;
  startErrors: string[];
  onSwitchToGame: () => void;
  onTabChange: (tab: number) => void;
}

export function SetupTabReview({ config, settings, startErrors, onSwitchToGame, onTabChange }: Props) {
  const { t } = useTranslation();
  const cs = CURRENCY_SYMBOLS[config.currency ?? 'EUR'];

  const blindSummary = useMemo(() => {
    const s = computeBlindStructureSummary(config.levels);
    return t('config.summary', { levels: s.levelCount, breaks: s.breakCount, min: s.avgMinutes });
  }, [config.levels, t]);

  const duration = useMemo(() => {
    const playedLevels = estimatePlayedLevels(config.levels, config.players.length, config.startingChips);
    const seconds = estimateDuration(playedLevels);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    if (hours > 0) return `~${hours}h ${minutes}m`;
    return `~${minutes}m`;
  }, [config.levels, config.players.length, config.startingChips]);

  const prizepool = useMemo(() => {
    return config.players.length * config.buyIn;
  }, [config.players.length, config.buyIn]);

  const tables = config.tables?.filter(tbl => tbl.status === 'active').length ?? 1;
  const canStart = startErrors.length === 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
        {t('setup.reviewTitle' as Parameters<typeof t>[0])}
      </h2>

      {/* Summary card */}
      <div className="bg-gray-100/80 dark:bg-gray-800/40 backdrop-blur-sm border border-gray-200 dark:border-gray-700/40 rounded-xl p-4 space-y-1">
        <Row label={t('setup.reviewName' as Parameters<typeof t>[0])} value={config.name || '\u2014'} onClick={() => onTabChange(0)} />
        <Row label={t('setup.reviewBuyIn' as Parameters<typeof t>[0])} value={`${config.buyIn} ${cs}`} onClick={() => onTabChange(0)} />
        <Row label={t('setup.reviewPlayers' as Parameters<typeof t>[0])} value={String(config.players.length)} onClick={() => onTabChange(1)} />
        <Row label={t('setup.reviewTables' as Parameters<typeof t>[0])} value={String(tables)} onClick={() => onTabChange(1)} />
        <Row label={t('setup.reviewLevels' as Parameters<typeof t>[0])} value={blindSummary} onClick={() => onTabChange(2)} />
        <Row label={t('setup.reviewDuration' as Parameters<typeof t>[0])} value={duration} onClick={() => onTabChange(2)} />
        <Row label={t('setup.reviewPrizepool' as Parameters<typeof t>[0])} value={`${prizepool} ${cs}`} onClick={() => onTabChange(0)} />
        <Row label={t('setup.reviewRebuy' as Parameters<typeof t>[0])} value={config.rebuy?.enabled ? '\u2713' : '\u2014'} onClick={() => onTabChange(2)} />
        <Row label={t('setup.reviewBounty' as Parameters<typeof t>[0])} value={config.bounty?.enabled ? '\u2713' : '\u2014'} onClick={() => onTabChange(2)} />
        <Row label={t('setup.reviewSound' as Parameters<typeof t>[0])} value={settings.soundEnabled ? '\u2713' : '\u2014'} onClick={() => onTabChange(2)} />
      </div>

      {/* Errors */}
      {startErrors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-xl p-3 space-y-1">
          <p className="text-red-700 dark:text-red-400 font-medium text-sm">
            {t('setup.reviewErrors' as Parameters<typeof t>[0])}
          </p>
          {startErrors.map((err, i) => (
            <p key={i} className="text-red-600 dark:text-red-300 text-sm">{'\u2022'} {err}</p>
          ))}
        </div>
      )}

      {/* Ready banner */}
      {canStart && (
        <div className="rounded-xl p-3 text-center border" style={{
          backgroundColor: 'color-mix(in srgb, var(--accent-500) 10%, transparent)',
          borderColor: 'color-mix(in srgb, var(--accent-500) 30%, transparent)'
        }}>
          <p className="font-medium" style={{ color: 'var(--accent-500)' }}>
            {t('setup.reviewReady' as Parameters<typeof t>[0])}
          </p>
        </div>
      )}

      {/* Start button */}
      <button
        onClick={onSwitchToGame}
        disabled={!canStart}
        className={`w-full py-4 text-xl font-bold rounded-xl transition-all duration-200 active:scale-[0.98] ${
          !canStart ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 'text-white'
        }`}
        style={canStart ? {
          background: 'linear-gradient(to bottom, var(--accent-600), var(--accent-700))',
          boxShadow: '0 10px 15px -3px var(--accent-900)',
          animation: 'countdown-pulse 2s ease-in-out infinite'
        } : undefined}
      >
        {t('app.startTournament')}
        {!canStart && (
          <span className="block text-sm font-normal mt-0.5 opacity-70">
            ({t('setup.validationIssues' as Parameters<typeof t>[0], { n: startErrors.length })})
          </span>
        )}
      </button>

      {/* Print + QR */}
      <div className="space-y-2">
        <button
          onClick={() => window.print()}
          className="w-full px-4 py-2 bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700/40 no-print"
        >
          {t('print.button')}
        </button>
      </div>
      <Suspense fallback={<LoadingFallback />}>
        <SetupQRCode />
      </Suspense>

      {/* Legal footer links */}
      <div className="flex justify-center gap-4 text-xs text-gray-400 dark:text-gray-500 pt-4 pb-2 no-print">
        <a href="https://7mountain-poker.vercel.app/impressum" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          {t('footer.impressum')}
        </a>
        <span>{'\u00B7'}</span>
        <a href="https://7mountain-poker.vercel.app/datenschutz" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          {t('footer.privacy')}
        </a>
      </div>
    </div>
  );
}

function Row({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex justify-between items-center py-2 px-2 -mx-2 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/30 transition-colors text-left group"
    >
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200 font-medium flex items-center gap-1">
        {value}
        <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-[var(--accent-500)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </button>
  );
}
