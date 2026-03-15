import { useState, useMemo, lazy, Suspense, memo } from 'react';
import type { Player, PayoutConfig, BountyConfig, RebuyConfig, AddOnConfig, Table, PotResult, PlayerPayout, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { computeTotalRebuys, computeTotalAddOns, computePrizePool, computePayouts, computeRebuyPot, findChipLeader, canPlayerRebuy, canReEntry, findPlayerSeat } from '../domain/logic';
import { useTranslation } from '../i18n';
import { LoadingFallback } from './LoadingFallback';
import { NumberStepper } from './NumberStepper';
import { SectionErrorBoundary } from './ErrorBoundary';

const SidePotCalculator = lazy(() => import('./SidePotCalculator').then(m => ({ default: m.SidePotCalculator })));

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
  averageStack: number;
  onUpdateRebuys: (playerId: string, newCount: number) => void;
  onUpdateAddOn: (playerId: string, hasAddOn: boolean) => void;
  onEliminatePlayer: (playerId: string, eliminatedBy: string | null) => void;
  onReinstatePlayer: (playerId: string) => void;
  onAdvanceDealer: () => void;
  showDealerBadges?: boolean;
  onToggleDealerBadges?: () => void;
  onUpdateStack?: (playerId: string, chips: number) => void;
  onInitStacks?: () => void;
  onClearStacks?: () => void;
  lateRegOpen?: boolean;
  onAddLatePlayer?: () => void;
  onReEntryPlayer?: (playerId: string) => void;
  tables?: Table[];
  onSidePotResultChange?: (data: { pots: PotResult[]; total: number; payouts?: PlayerPayout[] } | null) => void;
  onShowPayoutOverlay?: () => void;
  currency?: Currency;
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
  averageStack,
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
}: Props) {
  const { t } = useTranslation();
  const sym = CURRENCY_SYMBOLS[currency ?? 'EUR'];
  const [eliminatingId, setEliminatingId] = useState<string | null>(null);
  const [selectedKiller, setSelectedKiller] = useState<string>('');
  const [showSidePot, setShowSidePot] = useState(false);

  const totalRebuys = useMemo(() => computeTotalRebuys(players), [players]);
  const totalAddOns = useMemo(() => computeTotalAddOns(players), [players]);
  const prizePool = useMemo(() => computePrizePool(players, buyIn, rebuyConfig.rebuyCost, addOnConfig.enabled ? addOnConfig.cost : 0, rebuyConfig.separatePot), [players, buyIn, rebuyConfig.rebuyCost, addOnConfig.enabled, addOnConfig.cost, rebuyConfig.separatePot]);
  const payoutAmounts = useMemo(() => computePayouts(payout, prizePool), [payout, prizePool]);

  const nameSizeClass = useMemo(() => {
    const maxLen = players.reduce((max, p) => Math.max(max, p.name.length), 0);
    if (maxLen <= 8) return 'text-sm';
    if (maxLen <= 12) return 'text-xs';
    if (maxLen <= 18) return 'text-[11px]';
    return 'text-[10px]';
  }, [players]);

  const chipLeaderId = useMemo(() => findChipLeader(players), [players]);
  const hasAnyStacks = useMemo(() => players.some((p) => p.chips !== undefined), [players]);
  const multiTableActive = tables && tables.filter(tbl => tbl.status === 'active').length > 0;

  const activePlayers = useMemo(() => players.filter((p) => p.status === 'active'), [players]);
  const eliminatedPlayers = useMemo(() => [...players]
    .filter((p) => p.status === 'eliminated')
    .sort((a, b) => (a.placement ?? 0) - (b.placement ?? 0)), [players]);

  const handleEliminate = (playerId: string) => {
    if (bountyConfig.enabled) {
      setEliminatingId(playerId);
      setSelectedKiller('');
    } else {
      onEliminatePlayer(playerId, null);
    }
  };

  const confirmElimination = () => {
    if (eliminatingId && selectedKiller) {
      onEliminatePlayer(eliminatingId, selectedKiller);
      setEliminatingId(null);
      setSelectedKiller('');
    }
  };

  const cancelElimination = () => {
    setEliminatingId(null);
    setSelectedKiller('');
  };

  return (
    <>
    <div className="space-y-4">
      {/* Prize Pool */}
      <div>
        <h3 className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('playerPanel.prizePool')}</h3>
        <div className="mt-1 px-3 py-2 rounded-xl shadow-md" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-500) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-500) 30%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-500) 30%, transparent)' }}>
          <p className="text-lg font-bold" style={{ color: 'var(--accent-text)' }}>
            {prizePool.toFixed(2)} {sym}
          </p>
          <p className="text-xs" style={{ color: 'var(--accent-text)' }}>
            {players.length} &times; {buyIn} {sym}
            {totalRebuys > 0 && !rebuyConfig.separatePot && (
              <> + {totalRebuys} Rebuy{totalRebuys > 1 ? 's' : ''} &times; {rebuyConfig.rebuyCost} {sym}</>
            )}
            {totalAddOns > 0 && (
              <> + {totalAddOns} Add-On{totalAddOns > 1 ? 's' : ''} &times; {addOnConfig.cost} {sym}</>
            )}
          </p>
          {bountyConfig.enabled && (
            <p className="text-amber-600 dark:text-amber-500/70 text-xs mt-0.5">
              + Bounty-Pool: {(players.length * bountyConfig.amount).toFixed(2)} {sym}
              ({players.length} &times; {bountyConfig.amount} {sym})
            </p>
          )}
        </div>
        {rebuyConfig.separatePot && totalRebuys > 0 && (
          <div className="mt-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/50 rounded-xl shadow-md shadow-amber-200/30 dark:shadow-amber-900/10">
            <p className="text-amber-700 dark:text-amber-300 text-lg font-bold">
              {computeRebuyPot(players, rebuyConfig.rebuyCost).toFixed(2)} {sym}
            </p>
            <p className="text-amber-600 dark:text-amber-500/70 text-xs">
              {t('rebuy.separatePotLabel')} — {totalRebuys} &times; {rebuyConfig.rebuyCost} {sym}
            </p>
          </div>
        )}
      </div>

      {/* Payout breakdown */}
      <div>
        <h3 className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('playerPanel.payout')}</h3>
        <div className="mt-1 space-y-1">
          {payoutAmounts.map((p) => (
            <div
              key={p.place}
              className="flex justify-between px-3 py-1 bg-gray-100 dark:bg-gray-800/50 rounded-lg text-sm"
            >
              <span className="text-gray-500 dark:text-gray-400">
                {p.place}. {t('playerPanel.place')}
              </span>
              <span className="text-gray-900 dark:text-white font-medium">{p.amount.toFixed(2)} {sym}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Average Stack */}
      <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('playerPanel.avgStack')}</span>
          <span className="text-gray-900 dark:text-white text-sm font-mono font-bold">
            {averageStack.toLocaleString()}
          </span>
        </div>
      </div>

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
          <h3 className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t('playerPanel.stackTracking')}
          </h3>
          <div className="flex gap-1">
            {!hasAnyStacks ? (
              <button
                onClick={onInitStacks}
                className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors border border-gray-200 dark:border-gray-700/40"
              >
                {t('playerPanel.initStacks')}
              </button>
            ) : (
              <button
                onClick={onClearStacks}
                className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors border border-gray-200 dark:border-gray-700/40"
              >
                {t('playerPanel.clearStacks')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Players */}
      <div>
        <div className="space-y-1">
          <h3 className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t('playerPanel.activePlayers')} ({activePlayers.length})
          </h3>
          <div className="flex flex-wrap items-center gap-1">
            {lateRegOpen && onAddLatePlayer && (
              <button
                onClick={onAddLatePlayer}
                className="px-2 py-1 rounded-md text-[10px] font-medium transition-colors"
                style={{ backgroundColor: 'color-mix(in srgb, var(--accent-500) 15%, transparent)', color: 'var(--accent-text)', border: '1px solid color-mix(in srgb, var(--accent-500) 30%, transparent)' }}
                title={t('lateReg.addPlayer')}
              >
                + {t('lateReg.addPlayer')}
              </button>
            )}
            {onToggleDealerBadges && (
              <button
                onClick={onToggleDealerBadges}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors border ${
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
                className="px-2 py-1 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors border border-gray-200 dark:border-gray-700/40"
                title={t('playerPanel.advanceDealer')}
              >
                D →
              </button>
            )}
            <button
              onClick={() => setShowSidePot(true)}
              className="px-2 py-1 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors border border-gray-200 dark:border-gray-700/40"
              title={t('sidePot.title')}
            >
              {t('sidePot.titleShort')}
            </button>
            {onShowPayoutOverlay && (
              <button
                onClick={onShowPayoutOverlay}
                className="px-2 py-1 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors border border-gray-200 dark:border-gray-700/40"
                title={t('payout.overlay.title')}
              >
                {t('payout.overlay.titleShort')}
              </button>
            )}
          </div>
        </div>
        <div className="mt-1 space-y-1">
          {activePlayers.map((player) => {
            const seatIndex = players.indexOf(player);
            const isDealer = seatIndex === dealerIndex;
            return (
            <div
              key={player.id}
              className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700/20 transition-colors hover:bg-gray-200/60 dark:hover:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600/40"
            >
              {/* Name row — full width */}
              <div className="flex items-center gap-1">
                <span className="text-gray-400 dark:text-gray-500 text-xs shrink-0">#{seatIndex + 1}</span>
                {showDealerBadges !== false && isDealer && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold shrink-0 ring-2 ring-red-500/30">D</span>
                )}
                <span className={`${nameSizeClass} text-gray-800 dark:text-gray-200 truncate`}>
                  {player.name}
                </span>
                {player.reEntryCount != null && player.reEntryCount > 0 && (
                  <span className="text-[10px] text-purple-500 dark:text-purple-400 shrink-0">(RE×{player.reEntryCount})</span>
                )}
                {multiTableActive && (() => {
                  const info = findPlayerSeat(tables!, player.id);
                  return info ? (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono shrink-0">
                      {t('multiTable.seatShort', { n: info.seat.seatNumber })}
                    </span>
                  ) : null;
                })()}
                {chipLeaderId === player.id && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold shrink-0 ring-2 ring-amber-400/30" title={t('playerPanel.chipLeader')}>C</span>
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

              {/* Controls row — below name */}
              <div className="flex items-center gap-1.5 mt-1">
                {/* Rebuy controls (only during active rebuy phase) */}
                {rebuyActive && (
                  <div className="flex items-center gap-1" title={t('app.rebuy')}>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">RB</span>
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
            </div>
            );
          })}
        </div>
      </div>

      {/* Bounty elimination dialog */}
      {eliminatingId && bountyConfig.enabled && (
        <div className="px-3 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/40 rounded-lg space-y-2">
          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
            {t('playerPanel.whoEliminated', { name: players.find((p) => p.id === eliminatingId)?.name ?? '?' })}
          </p>
          <select
            value={selectedKiller}
            onChange={(e) => setSelectedKiller(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-amber-500"
          >
            <option value="">{t('playerPanel.selectPlayer')}</option>
            {activePlayers
              .filter((p) => p.id !== eliminatingId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={cancelElimination}
              className="flex-1 px-2 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-xs font-medium transition-colors"
            >
              {t('app.cancel')}
            </button>
            <button
              onClick={confirmElimination}
              disabled={!selectedKiller}
              className="flex-1 px-2 py-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {t('playerPanel.confirm')}
            </button>
          </div>
        </div>
      )}

      {/* Eliminated Players */}
      {eliminatedPlayers.length > 0 && (
        <div>
          <h3 className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t('playerPanel.eliminated')}
          </h3>
          <div className="mt-1 space-y-1">
            {eliminatedPlayers.map((player) => (
                <div
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
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
    {showSidePot && (
      <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
        <SidePotCalculator onClose={() => setShowSidePot(false)} onResultChange={onSidePotResultChange} />
      </Suspense></SectionErrorBoundary>
    )}
    </>
  );
});
