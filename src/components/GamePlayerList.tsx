import { lazy, memo, Suspense, useMemo, useState } from 'react';
import type { Player, RebuyConfig, AddOnConfig, BountyConfig, Currency, Table, PotResult, PlayerPayout } from '../domain/types';
import { findChipLeader, findPlayerSeat, canPlayerRebuy, canReEntry } from '../domain/logic';
import type { AppFeature } from '../domain/entitlements';
import { markFeatureDiscovered } from '../domain/entitlements';
import { useTranslation } from '../i18n';
import { SectionErrorBoundary } from './ErrorBoundary';
import { LoadingFallback } from './LoadingFallback';
import { NumberStepper } from './NumberStepper';

const SidePotCalculator = lazy(() => import('./SidePotCalculator').then(m => ({ default: m.SidePotCalculator })));
const DealMaker = lazy(() => import('./DealMaker').then(m => ({ default: m.DealMaker })));

interface Props {
  players: Player[];
  dealerIndex: number;
  rebuyActive: boolean;
  rebuyConfig: RebuyConfig;
  addOnConfig: AddOnConfig;
  addOnWindowOpen: boolean;
  bountyConfig: BountyConfig;
  averageStack?: number | undefined;
  onUpdateRebuys: (playerId: string, newCount: number) => void;
  onUpdateAddOn: (playerId: string, hasAddOn: boolean) => void;
  onEliminatePlayer: (playerId: string, eliminatedBy: string | null) => void;
  onReinstatePlayer: (playerId: string) => void;
  onAdvanceDealer: () => void;
  showDealerBadges?: boolean | undefined;
  onToggleDealerBadges?: (() => void) | undefined;
  onUpdateStack?: ((playerId: string, chips: number) => void) | undefined;
  onInitStacks?: (() => void) | undefined;
  onClearStacks?: (() => void) | undefined;
  lateRegOpen?: boolean | undefined;
  onAddLatePlayer?: (() => void) | undefined;
  onReEntryPlayer?: ((playerId: string) => void) | undefined;
  tables?: Table[] | undefined;
  onSidePotResultChange?: ((data: { pots: PotResult[]; total: number; payouts?: PlayerPayout[] | undefined } | null) => void) | undefined;
  onShowPayoutOverlay?: (() => void) | undefined;
  currency?: Currency | undefined;
  canUseSidePot?: boolean | undefined;
  onOpenFeatureGate?: ((feature: AppFeature) => void) | undefined;
  onAcceptDeal?: ((payouts: Map<string, number>, method: string) => void) | undefined;
  payout?: import('../domain/types').PayoutConfig | undefined;
  buyIn?: number | undefined;
}

export const GamePlayerList = memo(function GamePlayerList({
  players, dealerIndex, rebuyActive, rebuyConfig, addOnConfig, addOnWindowOpen,
  bountyConfig, onUpdateRebuys, onUpdateAddOn, onEliminatePlayer, onReinstatePlayer,
  onAdvanceDealer, showDealerBadges, onToggleDealerBadges, onUpdateStack, onInitStacks,
  onClearStacks, lateRegOpen, onAddLatePlayer, onReEntryPlayer, tables,
  onSidePotResultChange, onShowPayoutOverlay, currency, canUseSidePot,
  onOpenFeatureGate, onAcceptDeal, payout, buyIn,
}: Props) {
  const { t } = useTranslation();

  // Filter state
  const [playerFilter, setPlayerFilter] = useState('');
  const showFilter = players.length >= 10;
  const filterLower = playerFilter.trim().toLowerCase();

  // Bounty elimination state — inline picker
  const [eliminatingId, setEliminatingId] = useState<string | null>(null);

  // Modal state
  const [showSidePot, setShowSidePot] = useState(false);
  const [showDealMaker, setShowDealMaker] = useState(false);

  // Computed
  const allActivePlayers = useMemo(() => players.filter(p => p.status === 'active'), [players]);
  const allEliminatedPlayers = useMemo(() =>
    players.filter(p => p.status === 'eliminated').sort((a, b) => (a.placement ?? 999) - (b.placement ?? 999)),
    [players]);

  const activePlayers = filterLower
    ? allActivePlayers.filter(p => p.name.toLowerCase().includes(filterLower))
    : allActivePlayers;
  const eliminatedPlayers = filterLower
    ? allEliminatedPlayers.filter(p => p.name.toLowerCase().includes(filterLower))
    : allEliminatedPlayers;

  const chipLeaderId = useMemo(() => findChipLeader(allActivePlayers), [allActivePlayers]);

  const handleEliminate = (playerId: string) => {
    if (bountyConfig.enabled) {
      setEliminatingId(playerId);
    } else {
      onEliminatePlayer(playerId, null);
    }
  };

  const confirmBountyElimination = (killerId: string) => {
    if (eliminatingId) {
      onEliminatePlayer(eliminatingId, killerId);
      setEliminatingId(null);
    }
  };

  const prizePool = useMemo(() => {
    if (!buyIn) return 0;
    const totalRebuys = players.reduce((sum, p) => sum + p.rebuys, 0);
    const totalAddOns = players.filter(p => p.addOn).length;
    return players.length * buyIn
      + (rebuyConfig.separatePot ? 0 : totalRebuys * rebuyConfig.rebuyCost)
      + totalAddOns * (addOnConfig.enabled ? addOnConfig.cost : 0);
  }, [players, buyIn, rebuyConfig, addOnConfig]);

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {/* Header with player count + action buttons */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('game.playerList.title')} ({allActivePlayers.length}/{players.length})
        </h2>
        <div className="flex flex-wrap items-center gap-1">
          {lateRegOpen && onAddLatePlayer && (
            <button
              onClick={onAddLatePlayer}
              className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
              style={{ backgroundColor: 'color-mix(in srgb, var(--accent-600) 30%, transparent)', color: 'var(--accent-400)' }}
            >
              + {t('lateReg.addPlayer')}
            </button>
          )}
          {onToggleDealerBadges && (
            <button
              onClick={onToggleDealerBadges}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${showDealerBadges !== false ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}
              title={t('game.playerList.dealerToggle')}
            >
              D
            </button>
          )}
          {showDealerBadges !== false && allActivePlayers.length > 1 && (
            <button
              onClick={onAdvanceDealer}
              className="px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-600/50 transition-all"
              title={t('playerPanel.advanceDealer')}
            >
              D →
            </button>
          )}
          <button
            onClick={() => {
              markFeatureDiscovered('sidePot');
              if (canUseSidePot === false && onOpenFeatureGate) {
                onOpenFeatureGate('sidePot');
                return;
              }
              setShowSidePot(true);
            }}
            className="px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-600/50 transition-all"
          >
            {t('sidePot.titleShort')}
          </button>
          {onAcceptDeal && allActivePlayers.length >= 2 && allActivePlayers.length <= 6 && (
            <button
              onClick={() => setShowDealMaker(true)}
              className="px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-600/50 transition-all"
            >
              {t('deal.button')}
            </button>
          )}
          {onShowPayoutOverlay && (
            <button
              onClick={onShowPayoutOverlay}
              className="px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-600/50 transition-all"
            >
              {t('payout.overlay.titleShort')}
            </button>
          )}
        </div>
      </div>

      {/* Stack init/clear buttons */}
      {onInitStacks && onClearStacks && (
        <div className="flex gap-2">
          <button onClick={onInitStacks} className="px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-xs hover:bg-gray-300 dark:hover:bg-gray-600/50 transition-all">
            {t('playerPanel.initStacks')}
          </button>
          <button onClick={onClearStacks} className="px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-xs hover:bg-gray-300 dark:hover:bg-gray-600/50 transition-all">
            {t('playerPanel.clearStacks')}
          </button>
        </div>
      )}

      {/* Player search */}
      {showFilter && (
        <input
          type="text"
          value={playerFilter}
          onChange={(e) => setPlayerFilter(e.target.value)}
          placeholder={t('playerPanel.searchPlayers')}
          className="w-full px-2 py-1 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
          maxLength={50}
        />
      )}

      {/* Active players */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700/20 rounded-xl overflow-hidden bg-white/50 dark:bg-gray-800/20 border border-gray-200 dark:border-gray-700/30">
        {activePlayers.map((player) => {
          const isDealer = showDealerBadges !== false && allActivePlayers.indexOf(player) === dealerIndex;
          const isChipLeader = chipLeaderId === player.id;
          const isEliminating = eliminatingId === player.id;
          const seatInfo = tables ? findPlayerSeat(tables, player.id) : null;

          return (
            <div
              key={player.id}
              className={`py-2 px-3 transition-colors ${isDealer ? 'bg-[color-mix(in_srgb,var(--accent-500)_8%,transparent)]' : 'hover:bg-gray-100/50 dark:hover:bg-gray-700/20'}`}
            >
              {/* Main row */}
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                {/* Dealer badge */}
                {isDealer && (
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">D</span>
                )}
                {/* Name */}
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {player.name}
                </span>
                {/* Chip Leader */}
                {isChipLeader && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">C</span>
                )}
                {/* KO count */}
                {bountyConfig.enabled && player.knockouts > 0 && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{player.knockouts} KO</span>
                )}
                {/* Rebuy badge (when not in rebuy phase) */}
                {!rebuyActive && player.rebuys > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">{player.rebuys} RB</span>
                )}
                {/* Add-On badge */}
                {player.addOn && (
                  <span className="text-xs" style={{ color: 'var(--accent-500)' }}>A✓</span>
                )}
                {/* Table/Seat info */}
                {seatInfo && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    T{(tables ?? []).indexOf(seatInfo.table) + 1} S{seatInfo.table.seats.indexOf(seatInfo.seat) + 1}
                  </span>
                )}
                {/* Chips */}
                {player.chips !== undefined && (
                  <span className="ml-auto text-xs font-mono text-gray-600 dark:text-gray-400 shrink-0">
                    {player.chips.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Stack edit */}
              {player.chips !== undefined && onUpdateStack && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{t('playerPanel.stack')}</span>
                  <NumberStepper
                    value={player.chips}
                    onChange={(v) => onUpdateStack(player.id, v)}
                    min={0}
                    step={100}
                    inputClassName="w-20"
                  />
                </div>
              )}

              {/* Action buttons row */}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {/* Rebuy controls */}
                {rebuyActive && rebuyConfig.enabled && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onUpdateRebuys(player.id, Math.max(0, player.rebuys - 1))}
                      disabled={player.rebuys <= 0}
                      className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="text-xs font-mono w-4 text-center text-gray-700 dark:text-gray-300">{player.rebuys}</span>
                    <button
                      onClick={() => onUpdateRebuys(player.id, player.rebuys + 1)}
                      disabled={!canPlayerRebuy(player, rebuyConfig)}
                      className="w-6 h-6 rounded text-white text-xs font-bold disabled:opacity-30 btn-accent-gradient"
                    >
                      +
                    </button>
                  </div>
                )}
                {/* Add-On button */}
                {addOnWindowOpen && addOnConfig.enabled && !player.addOn && (
                  <button
                    onClick={() => onUpdateAddOn(player.id, true)}
                    className="px-2 py-0.5 rounded text-xs font-medium btn-accent-gradient text-white"
                  >
                    Add-On
                  </button>
                )}
                {addOnWindowOpen && addOnConfig.enabled && player.addOn && (
                  <button
                    onClick={() => onUpdateAddOn(player.id, false)}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    Add-On ✓
                  </button>
                )}
                {/* Spacer */}
                <div className="flex-1" />
                {/* Eliminate button */}
                {allActivePlayers.length > 1 && (
                  <button
                    onClick={() => handleEliminate(player.id)}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-red-600/80 hover:bg-red-600 text-white transition-colors"
                    title={t('playerPanel.eliminate')}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Inline bounty picker */}
              {isEliminating && bountyConfig.enabled && (
                <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/50 animate-fade-in">
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-1.5">
                    {t('playerPanel.whoEliminated', { name: allActivePlayers.find(p => p.id === eliminatingId)?.name ?? '' })}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {allActivePlayers
                      .filter(p => p.id !== player.id)
                      .map(killer => (
                        <button
                          key={killer.id}
                          onClick={() => confirmBountyElimination(killer.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-200 dark:bg-amber-800/50 hover:bg-amber-300 dark:hover:bg-amber-700/60 text-amber-900 dark:text-amber-200 transition-colors"
                        >
                          {killer.name}
                        </button>
                      ))}
                    <button
                      onClick={() => setEliminatingId(null)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      {t('app.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Eliminated players */}
      {eliminatedPlayers.length > 0 && (
        <div>
          <h3 className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
            {t('game.playerList.eliminated')}
          </h3>
          <div className="divide-y divide-gray-200/50 dark:divide-gray-700/10 rounded-xl overflow-hidden bg-white/30 dark:bg-gray-800/10 border border-gray-200/50 dark:border-gray-700/20">
            {eliminatedPlayers.map(player => (
              <div key={player.id} className="py-1.5 px-3 opacity-40">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-bold w-5 text-right shrink-0">
                    {player.placement}.
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 line-through truncate">
                    {player.name}
                  </span>
                  {bountyConfig.enabled && player.knockouts > 0 && (
                    <span className="text-xs text-amber-500/70">{player.knockouts} KO</span>
                  )}
                  {bountyConfig.enabled && player.eliminatedBy && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {t('playerPanel.by')} {players.find(p => p.id === player.eliminatedBy)?.name ?? '?'}
                    </span>
                  )}
                  <div className="flex-1" />
                  {onReEntryPlayer && lateRegOpen && canReEntry(player, rebuyConfig) && (
                    <button
                      onClick={() => onReEntryPlayer(player.id)}
                      className="px-2 py-0.5 rounded text-xs font-medium transition-all"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--accent-600) 30%, transparent)', color: 'var(--accent-400)' }}
                    >
                      {t('playerPanel.reEntry')}
                    </button>
                  )}
                  <button
                    onClick={() => onReinstatePlayer(player.id)}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-blue-900/40 hover:bg-blue-800 text-blue-300 transition-all border border-blue-800/30"
                  >
                    {t('playerPanel.reinstate')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lazy modals */}
      {showSidePot && onSidePotResultChange && (
        <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
          <SidePotCalculator onClose={() => setShowSidePot(false)} onResultChange={onSidePotResultChange} tournamentPlayers={players} />
        </Suspense></SectionErrorBoundary>
      )}
      {showDealMaker && onAcceptDeal && payout && buyIn != null && (
        <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
          <DealMaker
            onClose={() => setShowDealMaker(false)}
            players={players}
            payout={payout}
            prizePool={prizePool}
            currency={currency}
            onAcceptDeal={(payoutMap, method) => { setShowDealMaker(false); onAcceptDeal(payoutMap, method); }}
          />
        </Suspense></SectionErrorBoundary>
      )}
    </div>
  );
});
