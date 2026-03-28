import { useState, lazy, Suspense, memo } from 'react';
import type { Player, PayoutConfig, BountyConfig, RebuyConfig, AddOnConfig, Table, PotResult, PlayerPayout, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import type { AppFeature } from '../domain/entitlements';
import { markFeatureDiscovered } from '../domain/entitlements';
import { computeTotalAddOns, computePrizePool, findChipLeader, canPlayerRebuy, canReEntry, findPlayerSeat } from '../domain/logic';
import { useTranslation } from '../i18n';
import { LoadingFallback } from './LoadingFallback';
import { NumberStepper } from './NumberStepper';
import { SectionErrorBoundary } from './ErrorBoundary';

const SidePotCalculator = lazy(() => import('./SidePotCalculator').then(m => ({ default: m.SidePotCalculator })));
const DealMaker = lazy(() => import('./DealMaker').then(m => ({ default: m.DealMaker })));

interface Props {
  players: Player[];
  dealerIndex: number;
  buyIn: number;
  payout: PayoutConfig;
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
}

export const PlayerPanel = memo(function PlayerPanel({
  players,
  dealerIndex,
  buyIn,
  payout,
  rebuyActive,
  rebuyConfig,
  addOnConfig,
  addOnWindowOpen,
  bountyConfig,
  onUpdateRebuys,
  onUpdateAddOn,
  onEliminatePlayer,
  onReinstatePlayer,
  onAdvanceDealer,
  showDealerBadges,
  onToggleDealerBadges,
  onUpdateStack,
  onInitStacks,
  onClearStacks,
  lateRegOpen,
  onAddLatePlayer,
  onReEntryPlayer,
  tables,
  onSidePotResultChange,
  onShowPayoutOverlay,
  currency,
  canUseSidePot,
  onOpenFeatureGate,
  onAcceptDeal,
}: Props) {
  const { t } = useTranslation();
  const sym = CURRENCY_SYMBOLS[currency ?? 'EUR'];
  const [eliminatingId, setEliminatingId] = useState<string | null>(null);
  // selectedKiller removed — inline button grid replaced select dropdown
  const [showSidePot, setShowSidePot] = useState(false);
  const [showDealMaker, setShowDealMaker] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  const totalAddOns = computeTotalAddOns(players);
  const prizePool = computePrizePool(players, buyIn, rebuyConfig.rebuyCost, addOnConfig.enabled ? addOnConfig.cost : 0, rebuyConfig.separatePot);

  const nameSizeClass = (() => {
    const maxLen = players.reduce((max, p) => Math.max(max, p.name.length), 0);
    if (maxLen <= 8) return 'text-sm';
    if (maxLen <= 12) return 'text-xs';
    return 'text-xs';
  })();

  const chipLeaderId = findChipLeader(players);
  const hasAnyStacks = players.some((p) => p.chips !== undefined);
  const multiTableActive = tables && tables.filter(tbl => tbl.status === 'active').length > 0;

  const allActivePlayers = players.filter((p) => p.status === 'active');
  const allEliminatedPlayers = [...players]
    .filter((p) => p.status === 'eliminated')
    .sort((a, b) => (a.placement ?? 0) - (b.placement ?? 0));

  // Player search filter (shown when 10+ total players)
  const [playerFilter, setPlayerFilter] = useState('');
  const showFilter = players.length >= 10;
  const filterLower = playerFilter.trim().toLowerCase();
  const activePlayers = filterLower
    ? allActivePlayers.filter(p => p.name.toLowerCase().includes(filterLower))
    : allActivePlayers;
  const eliminatedPlayers = filterLower
    ? allEliminatedPlayers.filter(p => p.name.toLowerCase().includes(filterLower))
    : allEliminatedPlayers;

  const handleEliminate = (playerId: string) => {
    if (bountyConfig.enabled) {
      setEliminatingId(playerId);
      // Auto-select if only one possible killer (heads-up)
      const eligibleKillers = activePlayers.filter((p) => p.id !== playerId);
      // Auto-eliminate if only one possible killer (heads-up)
      if (eligibleKillers.length === 1) {
        onEliminatePlayer(playerId, eligibleKillers[0]!.id);
        setEliminatingId(null);
        return;
      }
    } else {
      onEliminatePlayer(playerId, null);
    }
  };

  const cancelElimination = () => {
    setEliminatingId(null);
  };

  return (
    <>
    <div className="space-y-4">
      {/* Add-On info banner (shown after rebuy phase ends) */}
      {addOnWindowOpen && totalAddOns < activePlayers.length && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700/40 rounded-lg">
          <p className="text-amber-700 dark:text-amber-300 text-sm font-medium">
            {t('playerPanel.addOnAvailable')}
          </p>
          <p className="text-amber-600 dark:text-amber-500/70 text-xs mt-0.5">
            {addOnConfig.cost} {sym} → +{addOnConfig.chips.toLocaleString()} {t('unit.chips')}
          </p>
        </div>
      )}

      {/* Stack Tracking */}
      {onInitStacks && onClearStacks && (
        <div className="flex items-center justify-between">
          <h3 className="text-2xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            {t('playerPanel.stackTracking')}
          </h3>
          <div className="flex gap-1">
            {!hasAnyStacks ? (
              <button
                onClick={onInitStacks}
                className="px-2.5 py-1 rounded-md text-2xs font-medium bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors border border-gray-200 dark:border-gray-700/40"
              >
                {t('playerPanel.initStacks')}
              </button>
            ) : (
              <button
                onClick={onClearStacks}
                className="px-2.5 py-1 rounded-md text-2xs font-medium bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors border border-gray-200 dark:border-gray-700/40"
              >
                {t('playerPanel.clearStacks')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Player search filter */}
      {showFilter && (
        <input
          type="text"
          value={playerFilter}
          onChange={(e) => setPlayerFilter(e.target.value)}
          placeholder={t('playerPanel.searchPlayers')}
          className="w-full px-2 py-1 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] mb-2"
        />
      )}

      {/* Active Players */}
      <div>
        <div className="space-y-1">
          <h3 className="text-2xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            {t('playerPanel.activePlayers')} ({allActivePlayers.length}{filterLower ? ` / ${activePlayers.length}` : ''})
          </h3>
          <div className="flex flex-wrap items-center gap-1">
            {lateRegOpen && onAddLatePlayer && (
              <button
                onClick={onAddLatePlayer}
                className="px-2 py-1 rounded-md text-2xs font-medium transition-colors"
                style={{ backgroundColor: 'color-mix(in srgb, var(--accent-500) 15%, transparent)', color: 'var(--accent-text)', border: '1px solid color-mix(in srgb, var(--accent-500) 30%, transparent)' }}
                title={t('lateReg.addPlayer')}
              >
                + {t('lateReg.addPlayer')}
              </button>
            )}
            {onToggleDealerBadges && (
              <button
                onClick={onToggleDealerBadges}
                className={`px-2 py-1 rounded-md text-2xs font-medium transition-colors border ${
                  showDealerBadges
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700/40'
                    : 'bg-gray-100 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700/40'
                }`}
                title={t('playerPanel.dealer')}
              >
                D
              </button>
            )}
            {showDealerBadges && activePlayers.length > 1 && (
              <button
                onClick={onAdvanceDealer}
                className="px-2 py-1 rounded-md text-2xs font-medium bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors border border-gray-200 dark:border-gray-700/40"
                title={t('playerPanel.advanceDealer')}
              >
                D {String.fromCodePoint(0x2192)}
              </button>
            )}
            {/* More actions popover */}
            <div className="relative">
              <button
                onClick={() => setShowMoreActions(prev => !prev)}
                className="px-2 py-1 rounded-md text-2xs font-medium bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors border border-gray-200 dark:border-gray-700/40"
                title={t('controls.moreActions')}
              >
                {String.fromCodePoint(0x22EF)}
              </button>
              {showMoreActions && (
                <div className="absolute left-0 top-full mt-1 z-30 min-w-[140px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/40 rounded-lg shadow-lg shadow-gray-300/30 dark:shadow-black/30 py-1 animate-fade-in">
                  <button
                    onClick={() => {
                      markFeatureDiscovered('sidePot');
                      if (canUseSidePot === false && onOpenFeatureGate) {
                        onOpenFeatureGate('sidePot');
                      } else {
                        setShowSidePot(true);
                      }
                      setShowMoreActions(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    {t('sidePot.title')}
                  </button>
                  {onAcceptDeal && activePlayers.length >= 2 && activePlayers.length <= 6 && (
                    <button
                      onClick={() => { setShowDealMaker(true); setShowMoreActions(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      {t('deal.button')}
                    </button>
                  )}
                  {onShowPayoutOverlay && (
                    <button
                      onClick={() => { onShowPayoutOverlay(); setShowMoreActions(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      {t('payout.overlay.title')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <ul className="mt-1 space-y-1" role="list">
          {activePlayers.map((player) => {
            const seatIndex = players.indexOf(player);
            const isDealer = seatIndex === dealerIndex;
            return (
            <li
              key={player.id}
              className="px-2.5 py-1.5 bg-gray-100/60 dark:bg-gray-800/30 rounded-xl border border-gray-200/40 dark:border-gray-700/15 transition-all duration-200 hover:bg-gray-100/90 dark:hover:bg-gray-800/50 hover:border-gray-300/60 dark:hover:border-gray-600/30 hover:shadow-sm"
            >
              {/* Name row — full width */}
              <div className="flex items-center gap-1">
                <span className="text-gray-400 dark:text-gray-500 text-xs shrink-0">#{seatIndex + 1}</span>
                {showDealerBadges !== false && isDealer && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white text-2xs font-bold shrink-0 ring-2 ring-red-500/30">D</span>
                )}
                <span className={`${nameSizeClass} text-gray-800 dark:text-gray-200 truncate`}>
                  {player.name}
                </span>
                {player.reEntryCount != null && player.reEntryCount > 0 && (
                  <span className="text-2xs text-purple-500 dark:text-purple-400 shrink-0">(RE×{player.reEntryCount})</span>
                )}
                {multiTableActive && (() => {
                  const info = findPlayerSeat(tables!, player.id);
                  return info ? (
                    <span className="text-2xs text-gray-400 dark:text-gray-500 font-mono shrink-0">
                      {t('multiTable.seatShort', { n: info.seat.seatNumber })}
                    </span>
                  ) : null;
                })()}
                {chipLeaderId === player.id && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-2xs font-bold shrink-0 ring-2 ring-amber-400/30" title={t('playerPanel.chipLeader')}>C</span>
                )}
                {bountyConfig.enabled && player.knockouts > 0 && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0 ml-auto">
                    {player.knockouts} KO
                  </span>
                )}
                {!rebuyActive && player.rebuys > 0 && (
                  <span className="inline-block rounded-full px-1.5 text-xs font-medium shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-500) 15%, transparent)', color: 'var(--accent-text)' }}>
                    {player.rebuys} RB
                  </span>
                )}
                {player.chips !== undefined && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono shrink-0 ml-auto">
                    {player.chips.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Stack edit row */}
              {player.chips !== undefined && onUpdateStack && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-2xs text-gray-400 dark:text-gray-500">{t('playerPanel.stack')}</span>
                  <NumberStepper
                    value={player.chips}
                    onChange={(v) => onUpdateStack(player.id, v)}
                    min={0}
                    step={100}
                    inputClassName="w-20"
                  />
                </div>
              )}

              {/* Controls row — below name */}
              <div className="flex items-center gap-1.5 mt-1">
                {/* Rebuy controls (only during active rebuy phase) */}
                {rebuyActive && (
                  <div className="flex items-center gap-1" title={t('app.rebuy')}>
                    <span className="text-2xs text-gray-400 dark:text-gray-500">RB</span>
                    <button
                      onClick={() =>
                        onUpdateRebuys(player.id, Math.max(0, player.rebuys - 1))
                      }
                      disabled={player.rebuys <= 0}
                      className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label={t('accessibility.decrease')}
                    >
                      -
                    </button>
                    <span className="text-gray-900 dark:text-white text-xs font-mono w-4 text-center">
                      {player.rebuys}
                    </span>
                    <button
                      onClick={() =>
                        onUpdateRebuys(player.id, player.rebuys + 1)
                      }
                      disabled={!canPlayerRebuy(player, rebuyConfig)}
                      className="w-8 h-8 rounded-lg text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      style={{ backgroundColor: 'var(--accent-700)' }}
                      aria-label={t('accessibility.increase')}
                    >
                      +
                    </button>
                  </div>
                )}

                {/* Add-On toggle (only after rebuy phase ends) */}
                {addOnWindowOpen && (
                  <button
                    onClick={() => onUpdateAddOn(player.id, !player.addOn)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      player.addOn
                        ? ''
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400'
                    }`}
                    style={player.addOn ? { backgroundColor: 'color-mix(in srgb, var(--accent-500) 20%, transparent)', color: 'var(--accent-text)' } : undefined}
                    title={t('app.addOn')}
                  >
                    {player.addOn ? '✓ AO' : 'AO'}
                  </button>
                )}

                <div className="flex-1" />

                {/* Eliminate button — right-aligned */}
                {activePlayers.length > 1 && (
                  <button
                    onClick={() => handleEliminate(player.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 text-xs font-medium transition-all duration-200 border border-red-300 dark:border-red-800/30 hover:border-red-400 dark:hover:border-red-700/50"
                    title={t('playerPanel.eliminateTooltip')}
                  >
                    {t('playerPanel.eliminate')}
                  </button>
                )}
              </div>
            </li>
            );
          })}
        </ul>
      </div>

      {/* Bounty elimination dialog */}
      {eliminatingId && bountyConfig.enabled && (
        <div className="px-3 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/40 rounded-lg space-y-2">
          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
            {t('playerPanel.whoEliminated', { name: players.find((p) => p.id === eliminatingId)?.name ?? '?' })}
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {activePlayers
              .filter((p) => p.id !== eliminatingId)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onEliminatePlayer(eliminatingId!, p.id); setEliminatingId(null); }}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-sm font-medium text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700/40 hover:border-amber-400 dark:hover:border-amber-600/50 transition-all duration-150 active:scale-[0.95]"
                >
                  {p.name}
                </button>
              ))}
          </div>
          <button
            onClick={cancelElimination}
            className="w-full px-2 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-xs font-medium transition-colors"
          >
            {t('app.cancel')}
          </button>
        </div>
      )}

      {/* Eliminated Players */}
      {eliminatedPlayers.length > 0 && (
        <div>
          <h3 className="text-2xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            {t('playerPanel.eliminated')}
          </h3>
          <ul className="mt-1 space-y-1" role="list">
            {eliminatedPlayers.map((player) => (
                <li
                  key={player.id}
                  className="px-3 py-1.5 bg-gray-100/50 dark:bg-gray-800/20 rounded-lg opacity-40 space-y-0.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-bold w-6 text-right shrink-0">
                      {player.placement}.
                    </span>
                    <span className={`${nameSizeClass} text-gray-500 dark:text-gray-400 line-through truncate`}>
                      {player.name}
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5">
                    {bountyConfig.enabled && (
                      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                        {player.knockouts > 0 && (
                          <span className="text-amber-500/70">
                            {player.knockouts} KO
                          </span>
                        )}
                        {player.eliminatedBy && (
                          <span>
                            {t('playerPanel.by')} {players.find((p) => p.id === player.eliminatedBy)?.name ?? '?'}
                          </span>
                        )}
                      </div>
                    )}
                    {onReEntryPlayer && lateRegOpen && canReEntry(player, rebuyConfig) && (
                      <button
                        onClick={() => onReEntryPlayer(player.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--accent-600) 30%, transparent)', color: 'var(--accent-400)', border: '1px solid color-mix(in srgb, var(--accent-600) 20%, transparent)' }}
                        title={t('playerPanel.reEntryTooltip')}
                      >
                        {t('playerPanel.reEntry')}
                      </button>
                    )}
                    <button
                      onClick={() => onReinstatePlayer(player.id)}
                      className="px-3 py-1.5 rounded-lg bg-blue-900/40 hover:bg-blue-800 text-blue-300 text-xs font-medium transition-all duration-200 border border-blue-800/30"
                      title={t('playerPanel.reinstateTooltip')}
                    >
                      {t('playerPanel.reinstate')}
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
    {showSidePot && (
      <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
        <SidePotCalculator onClose={() => setShowSidePot(false)} onResultChange={onSidePotResultChange} tournamentPlayers={players} />
      </Suspense></SectionErrorBoundary>
    )}
    {showDealMaker && onAcceptDeal && (
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
    </>
  );
});
