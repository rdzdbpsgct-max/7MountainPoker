import { useState, useRef, useCallback, useMemo } from 'react';
import type { Player, PayoutConfig, BountyConfig, RebuyConfig, AddOnConfig, TournamentResult, TournamentEvent, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { computeTotalRebuys, computeTotalAddOns, computePrizePool, computePayouts, computeRebuyPot, formatResultAsText, formatResultAsCSV, formatResultAsHendonMobCSV, formatEventAsText, formatTime } from '../domain/logic';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';
import { ChevronIcon } from './ChevronIcon';
import { QRCodeSVG } from 'qrcode.react';
import { showToast } from '../domain/toast';

interface Props {
  players: Player[];
  winner: Player | null;
  buyIn: number;
  payout: PayoutConfig;
  bounty: BountyConfig;
  rebuy: RebuyConfig;
  addOn: AddOnConfig;
  tournamentResult: TournamentResult | null;
  onBackToSetup: () => void;
  currency?: Currency | undefined;
  events?: TournamentEvent[] | undefined;
}

export function TournamentFinished({
  players,
  winner,
  buyIn,
  payout,
  bounty,
  rebuy,
  addOn,
  tournamentResult,
  onBackToSetup,
  currency,
  events,
}: Props) {
  const { t, language } = useTranslation();
  const sym = CURRENCY_SYMBOLS[currency ?? 'EUR'];
  const { resolved: theme } = useTheme();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const allExpanded = expandedIds.size > 0;
  const [activeTab, setActiveTab] = useState<'standings' | 'log'>('standings');
  const [capturing, setCapturing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Deal detection
  const isDeal = tournamentResult?.dealApplied === true;
  const dealMethod = isDeal ? events?.find((e) => e.type === 'deal_accepted')?.data?.method as string | undefined : undefined;

  const handleCopyText = useCallback(async () => {
    if (!tournamentResult) return;
    try {
      await navigator.clipboard.writeText(formatResultAsText(tournamentResult, language === 'de' ? 'de-DE' : 'en-US'));
      showToast(t('finished.textCopied'));
    } catch {
      showToast(t('clipboard.copyFailed'));
    }
  }, [tournamentResult, language, t]);

  const handleDownloadCSV = useCallback(() => {
    if (!tournamentResult) return;
    const csv = formatResultAsCSV(tournamentResult);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tournamentResult.name || 'tournament'}-${new Date(tournamentResult.date).toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tournamentResult]);

  const handleDownloadPDF = useCallback(async () => {
    if (!tournamentResult || generatingPdf) return;
    setGeneratingPdf(true);
    try {
      const { exportTournamentResultAsPdf } = await import('../domain/pdfExport');
      await exportTournamentResultAsPdf(tournamentResult, t);
    } catch (err) {
      console.warn('PDF export failed:', err);
      showToast(t('finished.pdfFailed'));
    } finally {
      setGeneratingPdf(false);
    }
  }, [tournamentResult, generatingPdf, t]);

  const handleDownloadHendonMob = useCallback(() => {
    if (!tournamentResult) return;
    const csv = formatResultAsHendonMobCSV(tournamentResult);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(tournamentResult.name || 'tournament').replace(/[^a-zA-Z0-9-_]/g, '_')}-hendonmob.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tournamentResult]);

  const captureScreenshot = useCallback(async () => {
    if (!resultsRef.current || capturing) return;
    setCapturing(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(resultsRef.current, {
        backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
        pixelRatio: 2,
      });

      // Try Web Share API first (mobile)
      if (navigator.share) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], 'tournament-results.png', { type: 'image/png' });
          await navigator.share({
            title: t('finished.shareTitle'),
            files: [file],
          });
          return;
        } catch {
          // share cancelled or not supported with files — fall through to download
        }
      }

      // Fallback: download as PNG
      const link = document.createElement('a');
      link.download = 'tournament-results.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Screenshot failed:', err);
    } finally {
      setCapturing(false);
    }
  }, [capturing, t, theme]);
  const totalRebuys = computeTotalRebuys(players);
  const totalAddOns = computeTotalAddOns(players);
  const prizePool = computePrizePool(players, buyIn, rebuy.rebuyCost, addOn.enabled ? addOn.cost : 0, rebuy.separatePot);
  const payoutAmounts = computePayouts(payout, prizePool);
  const payoutMap = new Map(payoutAmounts.map((p) => [p.place, p.amount]));
  const maxPaidPlace = payoutAmounts.length > 0 ? Math.max(...payoutAmounts.map((p) => p.place)) : 0;

  // Player name map for event formatting
  const playerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of players) map[p.id] = p.name;
    return map;
  }, [players]);

  // Build standings: deal = all eliminated sorted by placement, normal = winner 1st + eliminated
  const standings: (Player & { finalPlace: number })[] = isDeal
    ? players
        .filter((p) => p.placement != null)
        .sort((a, b) => (a.placement ?? 0) - (b.placement ?? 0))
        .map((p) => ({ ...p, finalPlace: p.placement ?? 0 }))
    : [
        ...(winner ? [{ ...winner, finalPlace: 1 }] : []),
        ...players
          .filter((p) => p.status === 'eliminated')
          .sort((a, b) => (a.placement ?? 0) - (b.placement ?? 0))
          .map((p) => ({ ...p, finalPlace: p.placement ?? 0 })),
      ];

  // Bounty results (only players with knockouts, sorted desc)
  const bountyResults = bounty.enabled
    ? players
        .filter((p) => p.knockouts > 0)
        .sort((a, b) => b.knockouts - a.knockouts)
        .map((p) => ({ ...p, bountyEarned: p.knockouts * bounty.amount }))
    : [];

  const qrFg = theme === 'dark' ? '#e5e7eb' : '#111827';
  const qrBg = theme === 'dark' ? '#111827' : '#f9fafb';

  const placeColor = (place: number) => {
    if (place === 1) return 'text-amber-400';
    if (place === 2) return 'text-gray-700 dark:text-gray-300';
    if (place === 3) return 'text-amber-700';
    return 'text-gray-400 dark:text-gray-500';
  };

  const placeLabel = (place: number) => `${place}.`;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="finished-title" className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
      <div ref={resultsRef} className="w-full max-w-lg space-y-6 py-8">
        {/* Header: Deal banner or Winner celebration */}
        {isDeal ? (
          <div className="text-center space-y-3 py-6 px-4 rounded-2xl border-2 border-blue-500/30 bg-gradient-to-b from-blue-900/20 to-transparent shadow-xl shadow-blue-900/10">
            <div className="text-7xl">
              🤝
            </div>
            <p id="finished-title" className="text-4xl font-bold text-gray-900 dark:text-white">
              {t('finished.dealMade')}
            </p>
            {dealMethod && (
              <p className="text-blue-400/70 text-sm uppercase tracking-widest">
                {t('finished.dealMethod', { method: dealMethod === 'icm' ? 'ICM Chop' : dealMethod === 'chip' ? 'Chip Chop' : dealMethod === 'even' ? 'Even Chop' : dealMethod })}
              </p>
            )}
            {/* Deal participants summary */}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {players
                .filter((p) => p.dealPayout !== undefined)
                .sort((a, b) => (b.dealPayout ?? 0) - (a.dealPayout ?? 0))
                .map((p) => (
                  <span key={p.id} className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm text-gray-900 dark:text-white">
                    {p.name}: {p.dealPayout?.toFixed(2)} {sym}
                  </span>
                ))}
            </div>
          </div>
        ) : winner ? (
          <div className="text-center space-y-3 py-6 px-4 rounded-2xl border-2 border-amber-500/30 bg-gradient-to-b from-amber-900/20 to-transparent shadow-xl shadow-amber-900/10">
            <div className="text-7xl animate-bounce">
              &#127942;
            </div>
            <p className="text-lg font-medium tracking-wide" style={{ color: 'var(--accent-400)' }}>
              {t('finished.congratulations')}
            </p>
            <p id="finished-title" className="text-4xl font-bold text-gray-900 dark:text-white">
              {winner.name}
            </p>
            <p className="text-amber-400/70 text-sm uppercase tracking-widest">
              {t('finished.tournamentWinner')}
            </p>
          </div>
        ) : null}

        {/* Tab switcher (only when events available) */}
        {events && events.length > 0 && (
          <div className="flex gap-1">
            {(['standings', 'log'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
                style={activeTab === tab ? { backgroundColor: 'var(--accent-600)' } : undefined}
              >
                {t(tab === 'standings' ? 'finished.tabStandings' : 'finished.tabLog')}
              </button>
            ))}
          </div>
        )}

        {/* Event Log tab — visual timeline */}
        {activeTab === 'log' && events && events.length > 0 && (() => {
          const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
          const startTs = sortedEvents.length > 0 ? sortedEvents[0]!.timestamp : 0;
          const EVENT_ICONS: Record<string, string> = {
            tournament_started: '\u{1F3AF}', tournament_finished: '\u{1F3C6}',
            level_start: '\u23EB', level_skip_forward: '\u23E9', level_skip_backward: '\u23EA',
            timer_paused: '\u23F8\uFE0F', timer_resumed: '\u25B6\uFE0F',
            player_eliminated: '\u{1F480}', player_reinstated: '\u{1F504}',
            rebuy_taken: '\u{1F4B0}', addon_taken: '\u2795',
            late_registration: '\u{1F6AA}', re_entry: '\u{1F501}',
            dealer_advanced: '\u{1F3B2}', table_move: '\u{1F500}', table_dissolved: '\u{1F5D1}\uFE0F',
            call_the_clock_started: '\u23F1\uFE0F', call_the_clock_expired: '\u26A0\uFE0F',
            break_extended: '\u2615', break_skipped: '\u23ED\uFE0F',
          };
          const EVENT_COLORS: Record<string, string> = {
            player_eliminated: 'border-red-500/60', player_reinstated: 'border-blue-500/60',
            rebuy_taken: 'border-green-500/60', addon_taken: 'border-green-500/60',
            tournament_started: 'border-emerald-500/60', tournament_finished: 'border-amber-500/60',
            level_start: 'border-purple-500/60', table_move: 'border-cyan-500/60', table_dissolved: 'border-orange-500/60',
          };
          return (
            <div className="bg-gray-50/90 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden shadow-lg shadow-gray-300/30 dark:shadow-black/20 p-4">
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700/40" />
                <div className="space-y-3">
                  {sortedEvents.map(event => {
                    const elapsed = startTs > 0 ? Math.max(0, Math.floor((event.timestamp - startTs) / 1000)) : 0;
                    const colorClass = EVENT_COLORS[event.type] ?? 'border-gray-400/60';
                    return (
                      <div key={event.id} className="relative flex items-start gap-3 pl-2">
                        <div className={`relative z-10 w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-gray-900 border-2 ${colorClass} text-xs shrink-0`}>
                          {EVENT_ICONS[event.type] ?? '\u2022'}
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {formatEventAsText(event, playerNameMap, t as never)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(elapsed)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                {t('timeline.eventCount', { n: sortedEvents.length })}
              </p>
            </div>
          );
        })()}

        {/* Standings / Ergebnis */}
        {activeTab === 'standings' && (<><div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t('finished.results')}
            </h3>
            <button
              onClick={() => {
                if (allExpanded) {
                  setExpandedIds(new Set());
                } else {
                  setExpandedIds(new Set(standings.map(p => p.id)));
                }
              }}
              className="text-xs px-3 py-1 rounded-lg transition-colors text-amber-400 border border-amber-500/40 hover:bg-amber-500/10"
            >
              <span className="flex items-center gap-1">
                <ChevronIcon open={allExpanded} className="w-3 h-3" />
                {allExpanded ? t('finished.collapse') : t('finished.expand')}
              </span>
            </button>
          </div>
          <div className="bg-gray-50/90 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden shadow-lg shadow-gray-300/30 dark:shadow-black/20">
            {standings.map((player, idx) => {
              const dealAmount = isDeal ? player.dealPayout : undefined;
              const isPaid = dealAmount !== undefined || payoutMap.has(player.finalPlace);
              const amount = dealAmount !== undefined ? dealAmount : payoutMap.get(player.finalPlace);
              const showDivider = idx > 0 && !isPaid && payoutMap.has(standings[idx - 1]!.finalPlace);
              const rebuyCost = rebuy.enabled ? rebuy.rebuyCost : 0;
              const addOnCost = addOn.enabled && player.addOn ? addOn.cost : 0;
              const totalPaid = buyIn + player.rebuys * rebuyCost + addOnCost;
              const bountyEarnings = bounty.enabled ? player.knockouts * bounty.amount : 0;
              const bountyEntryFee = bounty.enabled ? bounty.amount : 0;
              const totalCost = totalPaid + bountyEntryFee;
              const totalIncome = (amount ?? 0) + bountyEarnings;
              const netBalance = totalIncome - totalCost;

              return (
                <div key={player.id}>
                  {showDivider && (
                    <div className="border-t border-gray-300 dark:border-gray-700 mx-3" />
                  )}
                  <div
                    className={`px-4 py-2.5 border-b border-gray-200 dark:border-gray-800/30 hover:bg-gray-200/60 dark:hover:bg-gray-800/40 transition-colors cursor-pointer ${
                      player.finalPlace === 1
                        ? 'bg-amber-900/25 border-l-2 border-l-amber-400'
                        : idx % 2 === 0
                        ? 'bg-gray-100/50 dark:bg-gray-800/30'
                        : ''
                    }`}
                    onClick={() => setExpandedIds(prev => {
                      const next = new Set(prev);
                      if (next.has(player.id)) next.delete(player.id); else next.add(player.id);
                      return next;
                    })}
                  >
                    {/* Row 1: Place, Name, Winnings */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={`text-sm font-bold w-6 text-right shrink-0 ${placeColor(
                            player.finalPlace,
                          )}`}
                        >
                          {placeLabel(player.finalPlace)}
                        </span>
                        <span
                          className={`text-sm truncate ${
                            isPaid ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {player.name}
                        </span>
                      </div>
                      {isPaid && amount != null && (
                        <span className="text-sm font-bold shrink-0 ml-3" style={{ color: 'var(--accent-400)' }}>
                          {amount.toFixed(2)} {sym}
                        </span>
                      )}
                    </div>
                    {/* Detail rows (collapsible per player) */}
                    {expandedIds.has(player.id) && (
                      <div className="ml-9 mt-1 space-y-0.5">
                        {/* Buy-In */}
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400 dark:text-gray-500">{t('finished.buyIn')}</span>
                          <span className="text-gray-500 dark:text-gray-400">{buyIn.toFixed(2)} {sym}</span>
                        </div>
                        {/* Rebuys */}
                        {player.rebuys > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400 dark:text-gray-500">{t('finished.rebuys')} ({player.rebuys}×)</span>
                            <span className="text-gray-500 dark:text-gray-400">{(player.rebuys * rebuyCost).toFixed(2)} {sym}</span>
                          </div>
                        )}
                        {/* Add-On */}
                        {addOn.enabled && player.addOn && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400 dark:text-gray-500">{t('finished.addOn')}</span>
                            <span className="text-gray-500 dark:text-gray-400">{addOn.cost.toFixed(2)} {sym}</span>
                          </div>
                        )}
                        {/* Bounty paid */}
                        {bounty.enabled && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400 dark:text-gray-500">{t('finished.bountyPaid')}</span>
                            <span className="text-gray-500 dark:text-gray-400">{bounty.amount.toFixed(2)} {sym}</span>
                          </div>
                        )}
                        {/* Bounty earned */}
                        {bounty.enabled && bountyEarnings > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-amber-500/70">{t('finished.bountyEarned')} ({player.knockouts} KO)</span>
                            <span className="text-amber-500/70">+{bountyEarnings.toFixed(2)} {sym}</span>
                          </div>
                        )}
                        {/* Divider + Balance */}
                        <div className="border-t border-gray-300 dark:border-gray-700/50 pt-0.5 mt-0.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className={netBalance < 0 ? 'text-red-400' : netBalance === 0 ? 'text-gray-400 dark:text-gray-500' : ''} style={netBalance > 0 ? { color: 'var(--accent-400)' } : undefined}>
                              {t('finished.balance')}
                            </span>
                            <span className={netBalance < 0 ? 'text-red-400' : netBalance === 0 ? 'text-gray-400 dark:text-gray-500' : ''} style={netBalance > 0 ? { color: 'var(--accent-400)' } : undefined}>
                              {netBalance >= 0 ? '+' : ''}{netBalance.toFixed(2)} {sym}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bounty results */}
        {bounty.enabled && bountyResults.length > 0 && (
          <div>
            <h3 className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              {t('finished.bounty')}
            </h3>
            <div className="bg-gray-50/90 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden shadow-lg shadow-gray-300/30 dark:shadow-black/20">
              {bountyResults.map((player, idx) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-800/30 hover:bg-gray-200/60 dark:hover:bg-gray-800/40 transition-colors ${
                    idx % 2 === 0 ? 'bg-gray-100/50 dark:bg-gray-800/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                      {player.name}
                    </span>
                    <span className="text-xs text-amber-500/70 shrink-0">
                      {player.knockouts} KO
                    </span>
                  </div>
                  <span className="text-amber-400 text-sm font-bold shrink-0 ml-3">
                    {player.bountyEarned.toFixed(2)} {sym}
                  </span>
                </div>
              ))}
              <div className="border-t border-gray-200 dark:border-gray-700/40 px-4 py-2 flex justify-between">
                <span className="text-xs text-gray-400 dark:text-gray-500">{t('finished.bountyPoolTotal')}</span>
                <span className="text-xs text-amber-400/70 font-medium">
                  {(players.length * bounty.amount).toFixed(2)} {sym}
                </span>
              </div>
            </div>
          </div>
        )}
        </>)}

        {/* Tournament info summary */}
        <div>
          <h3 className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
            {t('finished.tournamentInfo')}
          </h3>
          <div className="bg-gray-50/90 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700/40 rounded-xl px-4 py-3 space-y-1 shadow-lg shadow-gray-300/30 dark:shadow-black/20">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t('finished.prizePool')}</span>
              <span className="text-gray-900 dark:text-white font-medium">{prizePool.toFixed(2)} {sym}</span>
            </div>
            {rebuy.separatePot && totalRebuys > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('rebuy.separatePotLabel')}</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {computeRebuyPot(players, rebuy.rebuyCost).toFixed(2)} {sym}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t('finished.players')}</span>
              <span className="text-gray-900 dark:text-white">{players.length}</span>
            </div>
            {totalRebuys > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('finished.rebuys')}</span>
                <span className="text-gray-900 dark:text-white">
                  {totalRebuys} &times; {rebuy.rebuyCost} {sym}
                </span>
              </div>
            )}
            {totalAddOns > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('finished.addOns')}</span>
                <span className="text-gray-900 dark:text-white">
                  {totalAddOns} &times; {addOn.cost} {sym}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t('finished.buyIn')}</span>
              <span className="text-gray-900 dark:text-white">{buyIn} {sym}</span>
            </div>
            {bounty.enabled && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('finished.bountyLabel')}</span>
                <span className="text-gray-900 dark:text-white">{bounty.amount} {sym} / KO</span>
              </div>
            )}
            {maxPaidPlace > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('finished.paidPlaces')}</span>
                <span className="text-gray-900 dark:text-white">{t('finished.topN' as Parameters<typeof t>[0], { n: maxPaidPlace })}</span>
              </div>
            )}
          </div>
        </div>

        {/* QR Code — App link */}
        <div className="bg-gray-50/90 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700/40 rounded-xl p-4 flex flex-col items-center gap-2 shadow-lg shadow-gray-300/30 dark:shadow-black/20">
          <QRCodeSVG
            value={`${window.location.origin}${import.meta.env.BASE_URL || '/'}`}
            size={120}
            level="L"
            bgColor={qrBg}
            fgColor={qrFg}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {t('finished.qrApp')}
          </span>
        </div>

        {/* Share / Screenshot / Export */}
        <div className="pt-2 space-y-2">
          <button
            onClick={captureScreenshot}
            disabled={capturing}
            className="w-full px-6 py-3 btn-accent-gradient text-white rounded-xl text-lg font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
            title={t('finished.shareResults')}
          >
            {capturing ? t('finished.capturing') : t('finished.shareResults')}
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleCopyText}
              className="flex-1 px-4 py-2.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-all duration-200 border border-gray-200 dark:border-gray-700/40 active:scale-[0.97]"
              title={t('finished.copyText')}
            >
              {t('finished.copyText')}
            </button>
            <button
              onClick={handleDownloadCSV}
              className="flex-1 px-4 py-2.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-all duration-200 border border-gray-200 dark:border-gray-700/40 active:scale-[0.97]"
              title={t('finished.downloadCSV')}
            >
              {t('finished.downloadCSV')}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={generatingPdf}
              className="flex-1 px-4 py-2.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-all duration-200 border border-gray-200 dark:border-gray-700/40 active:scale-[0.97] disabled:opacity-50"
              title={t('finished.downloadPDF')}
            >
              {generatingPdf ? (<><svg className="animate-spin h-4 w-4 inline mr-1" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{t('finished.downloadPDF')}</>) : t('finished.downloadPDF')}
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 px-4 py-2.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-all duration-200 border border-gray-200 dark:border-gray-700/40 active:scale-[0.97]"
              title={t('finished.print')}
            >
              {t('finished.print')}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadHendonMob}
              className="flex-1 px-4 py-2.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-all duration-200 border border-gray-200 dark:border-gray-700/40 active:scale-[0.97]"
              title={t('finished.downloadHendonMob')}
            >
              {t('finished.downloadHendonMob')}
            </button>
          </div>
        </div>

        {/* Back to setup */}
        <div>
          <button
            onClick={onBackToSetup}
            className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl text-lg font-medium transition-all duration-200 border border-gray-200 dark:border-gray-600/30 active:scale-[0.97]"
            title={t('finished.backToSetup')}
          >
            {t('finished.backToSetup')}
          </button>
        </div>
      </div>
    </div>
  );
}
