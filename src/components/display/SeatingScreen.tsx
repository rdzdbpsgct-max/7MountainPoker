import type { Player, Table } from '../../domain/types';
import { findChipLeader } from '../../domain/logic';
import { useTranslation } from '../../i18n';

interface Props {
  players: Player[];
  dealerIndex: number;
  tables?: Table[] | undefined;
  showDealerBadges?: boolean | undefined;
}

function TableCard({
  table,
  players,
  dealerIndex,
  chipLeaderId,
  isDissolved,
  showDealerBadges = true,
}: {
  table: { name: string; seats: { seatNumber: number; playerId: string | null }[]; dealerSeat: number | null };
  players: Player[];
  dealerIndex: number;
  chipLeaderId: string | null;
  isDissolved?: boolean;
  showDealerBadges?: boolean;
}) {
  const { t } = useTranslation();

  const seatPlayers = table.seats.map((seat) => {
    const player = seat.playerId ? players.find((p) => p.id === seat.playerId) : null;
    return { seatNumber: seat.seatNumber, player };
  });

  const activeCount = seatPlayers.filter((s) => s.player?.status === 'active').length;

  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        isDissolved
          ? 'opacity-40 border-dashed border-gray-600 bg-gray-900/30'
          : 'border-gray-700/40 bg-gray-800/60'
      }`}
    >
      {/* Table header */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-bold ${isDissolved ? 'text-gray-500' : ''}`} style={isDissolved ? undefined : { color: 'var(--accent-400)' }}>
          {table.name}
        </span>
        <span className="text-xs text-gray-500">
          {isDissolved ? t('multiTable.dissolved') : t('multiTable.playerCount', { n: activeCount })}
        </span>
      </div>

      {/* Seat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
        {seatPlayers.map(({ seatNumber, player }) => {
          const isActive = player?.status === 'active';
          const isEliminated = player?.status === 'eliminated';
          const isDealer = table.dealerSeat != null
            ? seatNumber === table.dealerSeat
            : player != null && players.indexOf(player) === dealerIndex;
          const isChipLeader = player?.id === chipLeaderId;
          const isEmpty = !player;

          return (
            <div
              key={seatNumber}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${
                isEmpty
                  ? 'text-gray-600'
                  : isEliminated
                  ? 'opacity-40'
                  : 'text-white'
              }`}
            >
              {/* Seat number */}
              <span className="font-mono text-gray-500 w-5 shrink-0">{seatNumber}</span>

              {/* Status dot / empty dash */}
              {isEmpty ? (
                <span className="text-gray-600">&mdash;</span>
              ) : (
                <>
                  {/* Green dot for active */}
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent-500)' }} />
                  )}

                  {/* Player name */}
                  <span
                    className={`truncate ${
                      isActive ? 'font-medium' : 'line-through text-gray-500'
                    }`}
                  >
                    {player.name}
                  </span>

                  {/* Badges — dealer badge only shown when enabled */}
                  {showDealerBadges && isDealer && isActive && (
                    <span className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-amber-500 text-gray-900 text-[9px] font-bold leading-none">
                      D
                    </span>
                  )}
                  {isChipLeader && isActive && (
                    <span className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-amber-500/80 text-gray-900 text-[9px] font-bold leading-none">
                      {t('display.chipLeaderBadge')}
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SeatingScreen({ players, dealerIndex, tables, showDealerBadges = true }: Props) {
  const { t } = useTranslation();
  const chipLeaderId = findChipLeader(players);

  const activeTables = tables?.filter((tbl) => tbl.status === 'active') ?? [];
  const dissolvedTables = tables?.filter((tbl) => tbl.status === 'dissolved') ?? [];
  const hasMultipleTables = activeTables.length > 0;

  if (hasMultipleTables) {
    return (
      <div className="w-full max-w-3xl mx-auto h-full flex flex-col">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">
          {t('display.seating')}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 content-start overflow-auto">
          {activeTables.map((tbl) => (
            <TableCard
              key={tbl.id}
              table={tbl}
              players={players}
              dealerIndex={dealerIndex}
              chipLeaderId={chipLeaderId}
              showDealerBadges={showDealerBadges}
            />
          ))}
          {dissolvedTables.map((tbl) => (
            <TableCard
              key={tbl.id}
              table={tbl}
              players={players}
              dealerIndex={dealerIndex}
              chipLeaderId={chipLeaderId}
              isDissolved
              showDealerBadges={showDealerBadges}
            />
          ))}
        </div>
      </div>
    );
  }

  // Single table: either single active multi-table or plain player list
  const singleTable = activeTables.length === 1 ? activeTables[0] : null;

  const seatData = singleTable
    ? singleTable.seats
    : players.map((p, i) => ({ seatNumber: i + 1, playerId: p.id }));

  const tableName = singleTable?.name ?? '';
  const dealerSeat = singleTable?.dealerSeat ?? null;

  return (
    <div className="w-full max-w-3xl mx-auto h-full flex flex-col">
      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">
        {t('display.seating')}
        {tableName && <span className="ml-2" style={{ color: 'var(--accent-400)' }}>{tableName}</span>}
      </h2>
      <div className="flex-1 flex items-center justify-center">
        <TableCard
          table={{ name: tableName, seats: seatData, dealerSeat }}
          players={players}
          dealerIndex={dealerIndex}
          chipLeaderId={chipLeaderId}
          showDealerBadges={showDealerBadges}
        />
      </div>
    </div>
  );
}
