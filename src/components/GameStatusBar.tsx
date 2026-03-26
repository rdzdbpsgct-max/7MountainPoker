import { memo } from 'react';
import type { Player, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { formatElapsedTime, computeAverageStackInBB } from '../domain/logic';
import { useTranslation } from '../i18n';

interface Props {
  players: Player[];
  prizePool: number;
  rebuyPot?: number | undefined;
  currency?: Currency | undefined;
  elapsedSeconds: number;
  averageStack: number;
  currentBB: number;
  onShowSettings: () => void;
  onShowTV: () => void;
  onShowLog: () => void;
  onShowHelp: () => void;
  onShowIcm: () => void;
  onExitToSetup: () => void;
}

export const GameStatusBar = memo(function GameStatusBar({
  players, prizePool, rebuyPot, currency, elapsedSeconds,
  averageStack, currentBB, onShowSettings, onShowTV, onShowLog,
  onShowHelp, onShowIcm, onExitToSetup,
}: Props) {
  const { t } = useTranslation();
  const sym = CURRENCY_SYMBOLS[currency ?? 'EUR'];
  const activePlayers = players.filter(p => p.status === 'active').length;
  const totalPlayers = players.length;
  const avgBB = computeAverageStackInBB(averageStack, currentBB);

  return (
    <div
      className="sticky top-0 z-20 flex items-center gap-2 sm:gap-3 px-3 py-2 bg-gray-100/80 dark:bg-gray-800/40 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700/30"
      role="banner"
    >
      {/* Stats */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 overflow-x-auto text-xs">
        <StatChip label={t('stats.players')} value={`${activePlayers}/${totalPlayers}`} />
        <StatChip label={t('stats.prizePool')} value={`${prizePool} ${sym}`} />
        {rebuyPot != null && rebuyPot > 0 && (
          <StatChip label={t('rebuy.separatePotLabel')} value={`${rebuyPot} ${sym}`} />
        )}
        {currentBB > 0 && (
          <StatChip
            label={t('stats.avgStackBB')}
            value={`${avgBB} BB`}
            warn={avgBB <= 15}
          />
        )}
        <StatChip label={t('stats.elapsed')} value={formatElapsedTime(elapsedSeconds)} className="hidden sm:flex" />
      </div>

      {/* Icon buttons */}
      <div className="flex items-center gap-1">
        <IconButton label={t('game.statusBar.settings')} onClick={onShowSettings}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </IconButton>
        <IconButton label={t('game.statusBar.tv')} onClick={onShowTV}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
          </svg>
        </IconButton>
        <IconButton label={t('game.statusBar.log')} onClick={onShowLog}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
        </IconButton>
        <IconButton label={t('game.statusBar.icm')} onClick={onShowIcm}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
          </svg>
        </IconButton>
        <IconButton label={t('game.statusBar.help')} onClick={onShowHelp}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>
        </IconButton>
        <IconButton label={t('game.statusBar.exit')} onClick={onExitToSetup}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
        </IconButton>
      </div>
    </div>
  );
});

function StatChip({ label, value, warn, className }: { label: string; value: string; warn?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-1 shrink-0 ${className ?? ''}`}>
      <span className="text-gray-500 dark:text-gray-500">{label}:</span>
      <span className={`font-medium font-mono ${warn ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-200'}`}>
        {value}
      </span>
      {warn && <span className="text-amber-500">⚠</span>}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--accent-500)] hover:bg-gray-200/50 dark:hover:bg-gray-700/30 transition-colors"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
