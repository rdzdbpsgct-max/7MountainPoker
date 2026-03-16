import { useState, useRef, useCallback, useMemo } from 'react';
import type { Player, PayoutConfig, BountyConfig, RebuyConfig, AddOnConfig, TournamentResult, TournamentEvent, Currency } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import { computeTotalRebuys, computeTotalAddOns, computePrizePool, computePayouts, computeRebuyPot, formatResultAsText, formatResultAsCSV, exportTournamentResultAsPdf, formatEventAsText } from '../domain/logic';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';
import { ChevronIcon } from './ChevronIcon';
import { QRCodeSVG } from 'qrcode.react';
import { showToast } from '../domain/toast';

interface Props {
  players: Player[];
  winner: Player;
  buyIn: number;
  payout: PayoutConfig;
  bounty: BountyConfig;
  rebuy: RebuyConfig;
  addOn: AddOnConfig;
  tournamentResult: TournamentResult | null;
  onBackToSetup: () => void;
  currency?: Currency;
  events?: TournamentEvent[];
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
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'standings' | 'log'>('standings');
  const [capturing, setCapturing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleCopyText = useCallback(async () => {
    if (!tournamentResult) return;
    try {
      await navigator.clipboard.writeText(formatResultAsText(tournamentResult, language === 'de' ? 'de-DE' : 'en-US'));
      showToast(t('finished.textCopied'));
    } catch { /* clipboard not available */ }
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
      await exportTournamentResultAsPdf(tournamentResult, t);
    } catch (err) {
      console.warn('PDF export failed:', err);
    } finally {
      setGeneratingPdf(false);
    }
  }, [tournamentResult, generatingPdf, t]);

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

  // Build standings: winner = 1st, then eliminated sorted by placement
  const standings: (Player & { finalPlace: number })[] = [
    { ...winner, finalPlace: 1 },
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
    <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
      <div ref={resultsRef} className="w-full max-w-lg space-y-6 py-8">
        {/* Winner celebration */}
        <div className="text-center space-y-3 py-6 px-4 rounded-2xl border-2 border-amber-500/30 bg-gradient-to-b from-amber-900/20 to-transparent shadow-xl shadow-amber-900/10">
          <div className="text-7xl animate-bounce">
            &#127942;
          </div>
          <p className="text-lg font-medium tracking-wide" style={{ color: 'var(--accent-400)' }}>
            {t('finished.congratulations')}
          </p>
          <p className="text-4xl font-bold text-gray-900 dark:text-white">
            {winner.name}
          </p>
          <p className="text-amber-400/70 text-sm uppercase tracking-widest">
            {t('finished.tournamentWinner')}
          </p>
        </div>

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

        {/* Event Log tab */}
        {activeTab === 'log' && events && events.length > 0 && (
          <div className="bg-gray-50/90 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden shadow-lg shadow-gray-300/30 dark:shadow-black/20">
            <div className="divide-y divide-gray-100 dark:divide-gray-800/30">
              {events.map(event => (
                <div key={event.id} className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 font-mono">
                  {formatEventAsText(event, playerNameMap, t)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Standings / Ergebnis */}
        {activeTab === 'standings' && (<><div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t('finished.results')}
            </h3>
            <button
              onClick={() => setDetailsExpanded((prev) => !prev)}
              className="text-xs px-3 py-1 rounded-lg transition-colors text-amber-400 border border-amber-500/40 hover:bg-amber-500/10"
            >
              <span className="flex items-center gap-1">
                <ChevronIcon open={detailsExpanded} className="w-3 h-3" />
                {detailsExpanded ? t('finished.collapse') : t('finished.expand')}
              </span>
            </button>
          </div>
          <div className="bg-gray-50/90 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden shadow-lg shadow-gray-300/30 dark:shadow-black/20">
            {standings.map((player, idx) => {
              const isPaid = payoutMap.has(player.finalPlace);
              const amount = payoutMap.get(player.finalPlace);
              const showDivider = idx > 0 && !isPaid && payoutMap.has(standings[idx - 1].finalPlace);
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
                    className={`px-4 py-2.5 border-b border-gray-200 dark:border-gray-800/30 hover:bg-gray-200/60 dark:hover:bg-gray-800/40 transition-colors ${
                      player.finalPlace === 1
                        ? 'bg-amber-900/25 border-l-2 border-l-amber-400'
                        : idx % 2 === 0
                        ? 'bg-gray-100/50 dark:bg-gray-800/30'
                        : ''
                    }`}
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
                    {/* Detail rows (collapsible) */}
                    {detailsExpanded && (
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
                <span className="text-gray-900 dark:text-white">Top {maxPaidPlace}</span>
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
              {generatingPdf ? '...' : t('finished.downloadPDF')}
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 px-4 py-2.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-all duration-200 border border-gray-200 dark:border-gray-700/40 active:scale-[0.97]"
              title={t('finished.print')}
            >
              {t('finished.print')}
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
