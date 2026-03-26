import type { Player } from '../../domain/types';
import { findChipLeader } from '../../domain/logic';
import { useTranslation } from '../../i18n';

interface Props {
  players: Player[];
}

export function PlayersScreen({ players }: Props) {
  const { t } = useTranslation();
  const chipLeaderId = findChipLeader(players);
  const activePlayers = players.filter((p) => p.status === 'active');
  const eliminatedPlayers = [...players]
    .filter((p) => p.status === 'eliminated')
    .sort((a, b) => (a.placement ?? 0) - (b.placement ?? 0));

  // Adaptive grid: more columns for more players (compact TV layout)
  const gridCols = activePlayers.length > 16
    ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5'
    : activePlayers.length > 8
    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
    : 'grid-cols-2 sm:grid-cols-3';

  return (
    <div className="w-full max-w-5xl mx-auto h-full flex flex-col">
      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1.5 text-center">
        {t('display.players')} ({activePlayers.length}/{players.length})
      </h2>
      <div className={`grid ${gridCols} gap-1 flex-1 overflow-hidden content-start`}>
        {activePlayers.map((p, i) => (
          <div
            key={p.id}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gray-800/60 border border-gray-700/40 text-sm"
          >
            <span className="text-gray-500 font-mono w-5 shrink-0">{i + 1}</span>
            <span className="text-gray-200 font-medium truncate flex-1 text-sm">{p.name}</span>
            {p.id === chipLeaderId && (
              <span className="text-amber-400 font-bold shrink-0">{t('display.chipLeaderBadge')}</span>
            )}
            {p.rebuys > 0 && (
              <span className="shrink-0 opacity-70" style={{ color: 'var(--accent-400)' }}>R{p.rebuys}</span>
            )}
          </div>
        ))}
      </div>
      {eliminatedPlayers.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 justify-center">
          {eliminatedPlayers.map((p) => (
            <span key={p.id} className="text-gray-600 text-[10px]">
              {p.placement ?? '?'}. {p.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
