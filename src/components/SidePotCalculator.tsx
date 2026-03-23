import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { calculateSidePots, resolvePotWinners, generateId } from '../domain/logic';
import { trackFeatureUsed } from '../domain/monetizationTelemetry';
import type { Player, PlayerPotInput, PlayerPotStatus, PotResult, PotWinnerAssignment, PlayerPayout, SidePotPayoutResult } from '../domain/types';
import { useTranslation } from '../i18n';
import { showToast } from '../domain/toast';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { NumberStepper } from './NumberStepper';

type SidePotMode = 'quick' | 'advanced';

interface Props {
  onClose: () => void;
  /** Called when pot calculation results change (for TV display integration) */
  onResultChange?: ((data: { pots: PotResult[]; total: number; payouts?: PlayerPayout[] | undefined } | null) => void) | undefined;
  /** Active tournament players — enables Quick Mode when provided with stacks */
  tournamentPlayers?: Player[] | undefined;
}

const DEFAULT_INVESTED = 1000;

function createPlayer(name: string, invested = DEFAULT_INVESTED, status: PlayerPotStatus = 'active'): PlayerPotInput {
  return { id: generateId(), name, invested, status };
}

const STATUS_OPTIONS: { value: PlayerPotStatus; emoji: string; labelKey: string }[] = [
  { value: 'active', emoji: '🟢', labelKey: 'sidePot.statusActive' },
  { value: 'all-in', emoji: '🔴', labelKey: 'sidePot.statusAllIn' },
  { value: 'folded', emoji: '⚪', labelKey: 'sidePot.statusFolded' },
];

const EXAMPLE_DATA: PlayerPotInput[] = [
  { id: 'ex-a', name: 'Alice', invested: 500, status: 'active' },
  { id: 'ex-b', name: 'Bob', invested: 1000, status: 'all-in' },
  { id: 'ex-c', name: 'Charlie', invested: 1000, status: 'active' },
  { id: 'ex-d', name: 'Diana', invested: 3000, status: 'folded' },
  { id: 'ex-e', name: 'Eve', invested: 3000, status: 'active' },
];

export function SidePotCalculator({ onClose, onResultChange, tournamentPlayers }: Props) {
  const { t } = useTranslation();
  const dialogRef = useDialogA11y(onClose);

  useEffect(() => {
    trackFeatureUsed('sidePot', 'game');
  }, []);

  // Quick Mode: active tournament players with tracked stacks
  const playersWithStacks = useMemo(
    () => (tournamentPlayers ?? []).filter((p) => p.status === 'active' && typeof p.chips === 'number' && p.chips > 0),
    [tournamentPlayers],
  );
  const hasQuickModeData = playersWithStacks.length >= 2;

  const [mode, setMode] = useState<SidePotMode>(hasQuickModeData ? 'quick' : 'advanced');

  // Quick Mode state: set of player IDs that are all-in
  const [allInIds, setAllInIds] = useState<Set<string>>(new Set());

  const quickPlayers = useMemo<PlayerPotInput[]>(() => {
    if (mode !== 'quick') return [];
    return playersWithStacks.map((p) => ({
      id: p.id,
      name: p.name,
      invested: p.chips ?? 0,
      status: (allInIds.has(p.id) ? 'all-in' : 'active') as PlayerPotStatus,
    }));
  }, [mode, playersWithStacks, allInIds]);

  const handleToggleAllIn = useCallback((playerId: string) => {
    setAllInIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }, []);

  const quickResult = useMemo(
    () => (mode === 'quick' ? calculateSidePots(quickPlayers) : null),
    [mode, quickPlayers],
  );

  // Advanced Mode state
  const [players, setPlayers] = useState<PlayerPotInput[]>(() => [
    createPlayer(t('sidePot.playerDefault', { n: 1 })),
    createPlayer(t('sidePot.playerDefault', { n: 2 }), 500, 'all-in'),
  ]);
  const [showInfo, setShowInfo] = useState(false);
  const lastAddedRef = useRef<string | null>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Winner state: potIndex → set of winner IDs (multiple = split pot)
  const [winnerSelections, setWinnerSelections] = useState<Map<number, Set<string>>>(new Map());
  const [showPayout, setShowPayout] = useState(false);

  // Auto-focus name input of newly added player
  useEffect(() => {
    if (lastAddedRef.current) {
      const el = inputRefs.current.get(lastAddedRef.current);
      if (el) {
        el.focus();
        el.select();
      }
      lastAddedRef.current = null;
    }
  });

  const handleAddPlayer = useCallback(() => {
    const newPlayer = createPlayer(t('sidePot.playerDefault', { n: 0 }));
    setPlayers((prev) => {
      const p = { ...newPlayer, name: t('sidePot.playerDefault', { n: prev.length + 1 }) };
      lastAddedRef.current = p.id;
      return [...prev, p];
    });
  }, [t]);

  const handleRemovePlayer = useCallback((id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    // Clean up winner selections for removed player
    setWinnerSelections((prev) => {
      const next = new Map(prev);
      for (const [potIdx, winners] of next) {
        if (winners.has(id)) {
          const updated = new Set(winners);
          updated.delete(id);
          next.set(potIdx, updated);
        }
      }
      return next;
    });
  }, []);

  const handleChangeName = useCallback((id: string, name: string) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }, []);

  const handleChangeInvested = useCallback((id: string, value: number) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, invested: Math.max(0, value) } : p)));
  }, []);

  const handleChangeStatus = useCallback((id: string, status: PlayerPotStatus) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }, []);

  const handleReset = useCallback(() => {
    setPlayers([
      createPlayer(t('sidePot.playerDefault', { n: 1 })),
      createPlayer(t('sidePot.playerDefault', { n: 2 }), 500, 'all-in'),
    ]);

    setWinnerSelections(new Map());
    setShowPayout(false);
  }, [t]);

  const handleLoadExample = useCallback(() => {
    setPlayers(EXAMPLE_DATA.map((p) => ({ ...p, id: generateId() })));

    setWinnerSelections(new Map());
    setShowPayout(false);
  }, []);

  const result = useMemo(() => calculateSidePots(mode === 'quick' ? quickPlayers : players), [mode, quickPlayers, players]);

  // Derive valid winner selections: remove stale pot indices and ineligible players
  const validWinnerSelections = useMemo(() => {
    const validPotIndices = new Set(result.pots.map((p) => p.index));
    const next = new Map<number, Set<string>>();
    for (const [potIdx, winners] of winnerSelections) {
      if (!validPotIndices.has(potIdx)) continue;
      const pot = result.pots.find((p) => p.index === potIdx);
      if (!pot) continue;
      const eligibleSet = new Set(pot.eligiblePlayerIds);
      const filtered = new Set([...winners].filter((id) => eligibleSet.has(id)));
      if (filtered.size > 0) next.set(potIdx, filtered);
    }
    return next;
  }, [result.pots, winnerSelections]);

  const handleToggleWinner = useCallback((potIndex: number, playerId: string) => {
    setWinnerSelections((prev) => {
      const next = new Map(prev);
      const current = next.get(potIndex) ?? new Set<string>();
      const updated = new Set(current);
      if (updated.has(playerId)) {
        updated.delete(playerId);
      } else {
        updated.add(playerId);
      }
      next.set(potIndex, updated);
      return next;
    });
  }, []);

  // Check if all pots have at least one winner selected
  const allPotsResolved = useMemo(() => {
    if (result.pots.length === 0) return false;
    return result.pots.every((pot) => {
      if (pot.eligiblePlayerIds.length === 0) return true; // no eligible = skip
      const winners = validWinnerSelections.get(pot.index);
      return winners && winners.size > 0;
    });
  }, [result.pots, validWinnerSelections]);

  // Compute payout result
  const payoutResult: SidePotPayoutResult | null = useMemo(() => {
    if (!showPayout || !allPotsResolved) return null;
    const assignments: PotWinnerAssignment[] = [];
    for (const pot of result.pots) {
      const winners = validWinnerSelections.get(pot.index);
      if (winners && winners.size > 0) {
        assignments.push({ potIndex: pot.index, winnerIds: [...winners] });
      }
    }
    return resolvePotWinners(players, result.pots, assignments);
  }, [showPayout, allPotsResolved, players, result.pots, validWinnerSelections]);

  // Notify parent about result changes for TV display
  useEffect(() => {
    if (!onResultChange) return;
    if (result.pots.length === 0) {
      onResultChange(null);
    } else {
      onResultChange({
        pots: result.pots,
        total: result.total,
        payouts: payoutResult?.payouts,
      });
    }
  }, [onResultChange, result.pots, result.total, payoutResult]);

  // Clear TV display data on unmount
  useEffect(() => {
    return () => { onResultChange?.(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyResult = useCallback(async () => {
    if (result.pots.length === 0) return;
    const lines: string[] = [];
    lines.push(`${t('sidePot.title')}`);
    lines.push('─'.repeat(30));
    for (const pot of result.pots) {
      const label = pot.type === 'main' ? t('sidePot.mainPot') : t('sidePot.sidePot', { n: pot.index });
      const names = pot.eligiblePlayerNames.join(', ');
      const winners = validWinnerSelections.get(pot.index);
      const winnerNames = winners && winners.size > 0
        ? [...winners].map((id) => players.find((p) => p.id === id)?.name || id).join(', ')
        : '';
      lines.push(`${label}: ${pot.amount.toLocaleString()} (${names})${winnerNames ? ` → ${winnerNames}` : ''}`);
    }
    lines.push('─'.repeat(30));
    lines.push(`${t('sidePot.total')}: ${result.total.toLocaleString()}`);
    if (payoutResult) {
      lines.push('');
      lines.push(t('sidePot.payoutTitle'));
      lines.push('─'.repeat(30));
      for (const p of payoutResult.payouts) {
        const sign = p.net >= 0 ? '+' : '';
        lines.push(`${p.playerName}: ${sign}${p.net.toLocaleString()} (${t('sidePot.headerInvested')}: ${p.invested.toLocaleString()}, ${t('sidePot.payoutLabel')}: ${p.payout.toLocaleString()})`);
      }
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      showToast(t('sidePot.copied'));
    } catch { /* clipboard unavailable */ }
  }, [result, players, validWinnerSelections, payoutResult, t]);

  // Player name lookup
  const playerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of players) map.set(p.id, p.name || p.id);
    return map;
  }, [players]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sidepot-title"
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl shadow-black/20 border border-gray-200 dark:border-gray-700/40 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700/40">
          <div className="flex items-center gap-2">
            <h2 id="sidepot-title" className="text-lg font-bold text-gray-900 dark:text-white">{t('sidePot.title')}</h2>
            <button
              onClick={() => setShowInfo((v) => !v)}
              className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              title={t('sidePot.infoTitle')}
            >
              ?
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={t('accessibility.close')}
          >
            ✕
          </button>
        </div>

        {/* Info panel */}
        {showInfo && (
          <div className="px-5 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30 text-xs text-blue-700 dark:text-blue-300 space-y-1 animate-fade-in">
            <p className="font-semibold">{t('sidePot.infoTitle')}</p>
            <p>{t('sidePot.infoText1')}</p>
            <p>{t('sidePot.infoText2')}</p>
            <p>{t('sidePot.infoText3')}</p>
          </div>
        )}

        {/* Mode toggle — only shown when tournament players with stacks are available */}
        {hasQuickModeData && (
          <div className="px-5 pt-4 pb-1">
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700/40 overflow-hidden text-xs font-medium">
              <button
                onClick={() => setMode('quick')}
                className={`px-3 py-1.5 transition-colors ${
                  mode === 'quick'
                    ? 'text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                style={mode === 'quick' ? { backgroundColor: 'var(--accent-600)' } : undefined}
              >
                {t('sidePot.quickMode')}
              </button>
              <button
                onClick={() => setMode('advanced')}
                className={`px-3 py-1.5 transition-colors ${
                  mode === 'advanced'
                    ? 'text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                style={mode === 'advanced' ? { backgroundColor: 'var(--accent-600)' } : undefined}
              >
                {t('sidePot.advancedMode')}
              </button>
            </div>
          </div>
        )}

        {/* Quick Mode UI */}
        {mode === 'quick' && (
          <div className="px-5 py-4 space-y-3 animate-fade-in">
            {playersWithStacks.map((player) => {
              const isAllIn = allInIds.has(player.id);
              return (
                <div key={player.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{player.name}</span>
                    <span className="text-xs font-mono tabular-nums text-gray-500 dark:text-gray-400">
                      {(player.chips ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleAllIn(player.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                      isAllIn
                        ? 'bg-red-500 dark:bg-red-600 text-white border-red-500 dark:border-red-600 shadow-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600/60 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                    title={t('sidePot.quickToggleAllIn')}
                  >
                    {isAllIn ? t('sidePot.quickAllIn') : t('sidePot.quickStillPlaying')}
                  </button>
                </div>
              );
            })}

            {/* Quick Mode results — plain English */}
            {quickResult && quickResult.pots.length > 0 && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40 rounded-lg space-y-1.5 animate-fade-in">
                {quickResult.pots.map((pot) => {
                  const label = pot.type === 'main'
                    ? t('sidePot.quickResultMainPot')
                    : t('sidePot.quickResultSidePot', { n: pot.index });
                  return (
                    <div key={pot.index} className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">{label}:</span>{' '}
                      <span className="font-mono tabular-nums font-bold" style={{ color: 'var(--accent-text)' }}>
                        {pot.amount.toLocaleString()}
                      </span>{' '}
                      <span className="text-gray-500 dark:text-gray-400">
                        {t('sidePot.quickResultBetween')} {pot.eligiblePlayerNames.join(', ')}
                      </span>
                    </div>
                  );
                })}
                <div className="pt-1.5 border-t border-gray-200 dark:border-gray-700/40 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{t('sidePot.total')}</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-gray-800 dark:text-gray-100">
                    {quickResult.total.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Quick Mode warnings */}
            {quickResult && quickResult.warnings.length > 0 && (
              <div className="space-y-1">
                {quickResult.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Player rows (Advanced Mode) */}
        {mode === 'advanced' && <div className="px-5 py-4 space-y-2">
          {/* Column headers */}
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium px-1">
            <span className="w-24 shrink-0">{t('sidePot.headerName')}</span>
            <span className="flex-1">{t('sidePot.headerInvested')}</span>
            <span className="w-28 shrink-0 text-center">{t('sidePot.headerStatus')}</span>
            <span className="w-7 shrink-0" />
          </div>

          {players.map((player) => (
            <div key={player.id} className={`flex items-center gap-2 py-1.5 px-1 rounded-lg transition-colors ${
              player.status === 'folded' ? 'opacity-50' : ''
            }`}>
              {/* Name */}
              <input
                ref={(el) => { if (el) inputRefs.current.set(player.id, el); }}
                value={player.name}
                onChange={(e) => handleChangeName(player.id, e.target.value)}
                className="w-24 shrink-0 px-2 py-1.5 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:outline-none"
                style={{ '--tw-ring-color': 'var(--accent-ring)' } as React.CSSProperties}
                placeholder={t('sidePot.namePlaceholder')}
              />

              {/* Invested amount */}
              <div className="flex-1">
                <NumberStepper
                  value={player.invested}
                  onChange={(v) => handleChangeInvested(player.id, v)}
                  min={0}
                  step={100}
                  inputClassName="w-20"
                />
              </div>

              {/* Status selector */}
              <div className="w-28 shrink-0 flex items-center justify-center">
                <select
                  value={player.status}
                  onChange={(e) => handleChangeStatus(player.id, e.target.value as PlayerPotStatus)}
                  className="w-full px-1 py-1.5 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg text-xs text-gray-700 dark:text-gray-300 focus:ring-2 focus:outline-none cursor-pointer"
                  style={{ '--tw-ring-color': 'var(--accent-ring)' } as React.CSSProperties}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.emoji} {t(opt.labelKey as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </div>

              {/* Remove button */}
              {players.length > 2 ? (
                <button
                  onClick={() => handleRemovePlayer(player.id)}
                  className="w-7 h-7 shrink-0 flex items-center justify-center text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors text-sm"
                  title={t('sidePot.removePlayer')}
                  aria-label={t('accessibility.remove')}
                >
                  ✕
                </button>
              ) : (
                <div className="w-7 shrink-0" />
              )}
            </div>
          ))}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={handleAddPlayer}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium transition-colors"
            >
              + {t('sidePot.addPlayer')}
            </button>
            <button
              onClick={handleLoadExample}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-xs transition-colors"
              title={t('sidePot.loadExample')}
            >
              📋 {t('sidePot.loadExample')}
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg text-sm transition-colors"
            >
              {t('sidePot.reset')}
            </button>
          </div>
        </div>}

        {/* Warnings (Advanced Mode only) */}
        {mode === 'advanced' && result.warnings.length > 0 && (
          <div className="px-5 pb-2 space-y-1">
            {result.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <span className="shrink-0 mt-0.5">⚠</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Pot Results + Winner Selection (Advanced Mode) */}
        {mode === 'advanced' && result.pots.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700/40 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
                {result.pots.length === 1 ? t('sidePot.resultMainOnly') : t('sidePot.resultTitle')}
              </h3>
              <button
                onClick={handleCopyResult}
                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title={t('sidePot.copyResult')}
              >
                {String.fromCodePoint(0x1F4CB)} {t('sidePot.copyResult')}
              </button>
            </div>

            {result.pots.map((pot) => {
              const potWinners = validWinnerSelections.get(pot.index) ?? new Set<string>();
              const isSplit = potWinners.size > 1;

              return (
                <div
                  key={pot.index}
                  className={`px-3 py-2.5 rounded-lg border ${
                    pot.type === 'main'
                      ? 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700/40'
                      : 'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {pot.type === 'main' ? t('sidePot.mainPot') : t('sidePot.sidePot', { n: pot.index })}
                      {isSplit && <span className="ml-1.5 text-[10px] font-normal px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">{t('sidePot.split')}</span>}
                    </span>
                    <span className="text-sm font-bold font-mono tabular-nums" style={{ color: 'var(--accent-text)' }}>
                      {pot.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {pot.eligiblePlayerNames.length > 0 ? (
                      <>
                        <span className="font-medium">{t('sidePot.eligible', { n: pot.eligiblePlayerNames.length })}</span>
                        <span className="mx-1">·</span>
                        <span>{pot.eligiblePlayerNames.join(', ')}</span>
                      </>
                    ) : (
                      <span className="text-amber-500">{t('sidePot.noEligible')}</span>
                    )}
                  </div>

                  {/* Winner selection buttons */}
                  {pot.eligiblePlayerIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 self-center mr-0.5">{t('sidePot.winnerLabel')}:</span>
                      {pot.eligiblePlayerIds.map((playerId) => {
                        const isWinner = potWinners.has(playerId);
                        const name = playerNameById.get(playerId) ?? playerId;
                        return (
                          <button
                            key={playerId}
                            onClick={() => handleToggleWinner(pot.index, playerId)}
                            className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all duration-150 border ${
                              isWinner
                                ? 'text-white shadow-sm'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600/60 hover:border-gray-400 dark:hover:border-gray-500'
                            }`}
                            style={isWinner ? {
                              backgroundColor: 'var(--accent-600)',
                              borderColor: 'var(--accent-600)',
                              boxShadow: '0 1px 2px var(--accent-glow)',
                            } : undefined}
                            title={isWinner ? t('sidePot.deselectWinner') : t('sidePot.selectWinner')}
                          >
                            {isWinner && '🏆 '}{name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Total */}
            <div className="flex items-center justify-between px-3 pt-2 border-t border-gray-200 dark:border-gray-700/40">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{t('sidePot.total')}</span>
              <span className="text-sm font-bold font-mono tabular-nums text-gray-800 dark:text-gray-100">
                {result.total.toLocaleString()}
              </span>
            </div>

            {/* Show Payout button */}
            {allPotsResolved && (
              <button
                onClick={() => setShowPayout((v) => !v)}
                className="w-full mt-1 px-4 py-2 text-white rounded-lg text-sm font-medium transition-all active:scale-[0.97]"
                style={{ background: 'linear-gradient(to bottom, var(--accent-500), var(--accent-700))', boxShadow: '0 2px 6px var(--accent-glow)' }}
              >
                {showPayout ? t('sidePot.hidePayout') : t('sidePot.showPayout')}
              </button>
            )}
          </div>
        )}

        {/* Payout Overview (Advanced Mode) */}
        {mode === 'advanced' && showPayout && payoutResult && (
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700/40 space-y-2 animate-fade-in">
            <h3 className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mb-2">
              {t('sidePot.payoutTitle')}
            </h3>

            {payoutResult.payouts.map((p) => {
              const isPositive = p.net > 0;
              const isNegative = p.net < 0;
              const isZero = p.net === 0;
              return (
                <div
                  key={p.playerId}
                  className={`px-3 py-2 rounded-lg border ${
                    isPositive
                      ? 'border-green-200 dark:border-green-800/40 bg-green-50 dark:bg-green-900/10'
                      : isNegative
                      ? 'border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10'
                      : 'border-gray-200 dark:border-gray-700/30 bg-gray-50 dark:bg-gray-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{p.playerName}</span>
                    <span className={`text-sm font-bold font-mono tabular-nums ${
                      isPositive ? 'text-green-600 dark:text-green-400' : isNegative ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {isPositive ? '+' : ''}{p.net.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{t('sidePot.headerInvested')}: {p.invested.toLocaleString()}</span>
                    <span>{t('sidePot.payoutLabel')}: {p.payout.toLocaleString()}</span>
                    {p.perPot.length > 1 && (
                      <span className="text-gray-400 dark:text-gray-500">
                        ({p.perPot.map((pp) => {
                          const potLabel = pp.potIndex === 0 ? 'M' : `S${pp.potIndex}`;
                          return `${potLabel}: ${pp.amount.toLocaleString()}`;
                        }).join(', ')})
                      </span>
                    )}
                  </div>
                  {isZero && p.payout === 0 && (
                    <div className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">{t('sidePot.noWinnings')}</div>
                  )}
                </div>
              );
            })}

            {/* Odd chip info */}
            {payoutResult.oddChips.length > 0 && (
              <div className="px-3 pt-1 text-[10px] text-gray-400 dark:text-gray-500 space-y-0.5">
                {payoutResult.oddChips.map((oc, i) => (
                  <div key={i}>
                    {t('sidePot.oddChip', { n: oc.remainder, player: playerNameById.get(oc.awardedTo) ?? oc.awardedTo })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state (Advanced Mode) */}
        {mode === 'advanced' && result.pots.length === 0 && players.length >= 2 && (
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700/40 text-center text-sm text-gray-400 dark:text-gray-500">
            {t('sidePot.noResult')}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
