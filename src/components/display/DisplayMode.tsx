import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, memo } from 'react';
import type { TimerState, Level, ChipConfig, ChipDenomination, Player, PayoutConfig, RebuyConfig, AddOnConfig, BountyConfig, Table, ExtendedLeagueStanding, DisplayScreenConfig, DisplayLayout, Currency } from '../../domain/types';
import { CURRENCY_SYMBOLS } from '../../domain/types';
import { getLayoutConfig } from '../../domain/displayLayouts';
import { DEFAULT_DISPLAY_SCREENS, DEFAULT_ROTATION_INTERVAL } from '../../domain/configPersistence';
import { formatTime, getLevelLabel, getBlindsText, computePrizePool, computeAverageStackInBB, computeRebuyPot, isRebuyActive } from '../../domain/logic';
import { useTranslation } from '../../i18n';
import { PlayersScreen } from './PlayersScreen';
import { StatsScreen } from './StatsScreen';
import { PayoutScreen } from './PayoutScreen';
import { ScheduleScreen } from './ScheduleScreen';
import { ChipsScreen } from './ChipsScreen';
import { SeatingScreen } from './SeatingScreen';
import { LeagueScreen } from './LeagueScreen';
import { SidePotScreen } from './SidePotScreen';
import type { SidePotDisplayData } from './SidePotScreen';

type SecondaryScreen = 'players' | 'stats' | 'payout' | 'schedule' | 'chips' | 'seating' | 'league' | 'sidepot';

interface Props {
  timerState: TimerState;
  levels: Level[];
  chipConfig?: ChipConfig | undefined;
  colorUpMap?: Map<number, ChipDenomination[]> | undefined;
  tournamentName: string;
  activePlayerCount: number;
  totalPlayerCount: number;
  isBubble: boolean;
  isLastHand: boolean;
  isHandForHand?: boolean | undefined;
  onExit: () => void;
  players: Player[];
  dealerIndex: number;
  buyIn: number;
  payout: PayoutConfig;
  rebuy: RebuyConfig;
  addOn: AddOnConfig;
  bounty: BountyConfig;
  averageStack: number;
  tournamentElapsed: number;
  tables?: Table[] | undefined;
  showDealerBadges?: boolean | undefined;
  leagueName?: string | undefined;
  leagueStandings?: ExtendedLeagueStanding[] | undefined;
  sidePotData?: SidePotDisplayData | undefined;
  displayScreens?: DisplayScreenConfig[] | undefined;
  displayRotationInterval?: number | undefined;
  displayLayout?: DisplayLayout | undefined;
  currency?: Currency | undefined;
}

// Removed static ROTATION_INTERVAL — now configurable via props

/**
 * Seamless infinite ticker banner — pixel-perfect rAF scrolling.
 *
 * How it works:
 * 1. Measure the pixel width of one content set (via useLayoutEffect + ResizeObserver)
 * 2. Compute how many copies are needed to fill the viewport with no visible gaps
 * 3. requestAnimationFrame drives translate3d at 80 px/s
 * 4. Modulo wrap at exactly one content-set width → perfectly seamless loop
 */
const TICKER_SPEED = 80; // pixels per second

const TickerBanner = memo(function TickerBanner({ items }: { items: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const singleSetRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(0);
  const [copies, setCopies] = useState(5);

  // Measure content width and compute needed copies (before paint)
  useLayoutEffect(() => {
    const container = containerRef.current;
    const singleSet = singleSetRef.current;
    if (!container || !singleSet) return;
    const contentW = singleSet.getBoundingClientRect().width;
    widthRef.current = contentW;
    if (contentW > 0) {
      const containerW = container.clientWidth;
      setCopies(Math.max(2, Math.ceil(containerW / contentW) + 1));
    }
  }, [items]);

  // Re-measure on window/container resize
  useEffect(() => {
    const container = containerRef.current;
    const singleSet = singleSetRef.current;
    if (!container || !singleSet) return;
    const recalc = () => {
      const contentW = singleSet.getBoundingClientRect().width;
      widthRef.current = contentW;
      if (contentW > 0) {
        const containerW = container.clientWidth;
        setCopies(Math.max(2, Math.ceil(containerW / contentW) + 1));
      }
    };
    const ro = new ResizeObserver(recalc);
    ro.observe(container);
    return () => ro.disconnect();
  }, [items]);

  // Pixel-perfect rAF animation — modulo wrap for seamless loop
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let offset = 0;
    let lastTime = 0;

    const tick = (now: number) => {
      if (lastTime > 0 && widthRef.current > 0) {
        const dt = (now - lastTime) / 1000;
        offset = (offset + TICKER_SPEED * dt) % widthRef.current;
        track.style.transform = `translate3d(-${offset}px, 0, 0)`;
      }
      lastTime = now;
      rafId = requestAnimationFrame(tick);
    };

    let rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [items, copies]);

  const renderItems = useCallback((prefix: string) =>
    items.map((item, i) => (
      <span key={`${prefix}-${i}`}>
        <span className="mx-4 opacity-70" style={{ color: 'var(--accent-400)' }}>{'\u25C6'}</span>
        {item}
      </span>
    )), [items]);

  return (
    <div ref={containerRef} className="border-t border-gray-800/60 overflow-hidden bg-gray-900/80">
      <div
        ref={trackRef}
        className="whitespace-nowrap py-2.5 text-base text-gray-200 font-semibold tracking-wide"
        style={{ display: 'flex', willChange: 'transform' }}
      >
        {Array.from({ length: copies }, (_, c) => (
          <div key={c} ref={c === 0 ? singleSetRef : undefined} style={{ flexShrink: 0 }}>
            {renderItems(String(c))}
          </div>
        ))}
      </div>
    </div>
  );
}, (prev, next) => {
  if (prev.items.length !== next.items.length) return false;
  return prev.items.every((item, i) => item === next.items[i]);
});

export function DisplayMode({
  timerState,
  levels,
  chipConfig,
  colorUpMap,
  tournamentName,
  activePlayerCount,
  totalPlayerCount,
  isBubble,
  isLastHand,
  isHandForHand,
  onExit,
  players,
  dealerIndex,
  buyIn,
  payout,
  rebuy,
  addOn,
  bounty,
  averageStack,
  tournamentElapsed,
  tables,
  showDealerBadges,
  leagueName,
  leagueStandings,
  sidePotData,
  displayScreens,
  displayRotationInterval,
  displayLayout,
  currency,
}: Props) {
  const sym = CURRENCY_SYMBOLS[currency ?? 'EUR'];
  const { t } = useTranslation();
  const baseLayoutConfig = getLayoutConfig(displayLayout);

  // Detect portrait orientation — increase timer ratio for better use of vertical space
  const [isPortrait, setIsPortrait] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches
  );
  useEffect(() => {
    const mql = window.matchMedia('(orientation: portrait)');
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // In portrait, shift more space to the timer (70/30 split)
  const layoutConfig = isPortrait
    ? { ...baseLayoutConfig, timerFlex: Math.max(baseLayoutConfig.timerFlex, 7), secondaryFlex: Math.min(baseLayoutConfig.secondaryFlex, 3) }
    : baseLayoutConfig;

  const rotationIntervalMs = (displayRotationInterval ?? DEFAULT_ROTATION_INTERVAL) * 1000;

  // Resolve which screens the user has enabled (default: all)
  const enabledScreenIds = useMemo(() => {
    const cfg = displayScreens ?? DEFAULT_DISPLAY_SCREENS;
    const enabled = cfg.filter((s) => s.enabled).map((s) => s.id);
    // Fallback: if none enabled, show all
    return enabled.length > 0 ? new Set(enabled) : new Set(DEFAULT_DISPLAY_SCREENS.map((s) => s.id));
  }, [displayScreens]);

  // Build available secondary screens in order (memoized to avoid stale closures)
  const secondaryScreens = useMemo<SecondaryScreen[]>(() => {
    const screens: SecondaryScreen[] = [];
    if (enabledScreenIds.has('players')) screens.push('players');
    if (enabledScreenIds.has('stats')) screens.push('stats');
    if (enabledScreenIds.has('payout')) screens.push('payout');
    if (enabledScreenIds.has('schedule')) screens.push('schedule');
    if (enabledScreenIds.has('chips') && chipConfig?.enabled) screens.push('chips');
    if (enabledScreenIds.has('seating') && players.length > 0) screens.push('seating');
    if (enabledScreenIds.has('league') && leagueStandings && leagueStandings.length > 0) screens.push('league');
    if (sidePotData && sidePotData.pots.length > 0) screens.push('sidepot');
    // Fallback: ensure at least one screen
    if (screens.length === 0) screens.push('players');
    return screens;
  }, [enabledScreenIds, chipConfig?.enabled, players.length, leagueStandings, sidePotData]);

  const screensRef = useRef(secondaryScreens);
  useEffect(() => {
    screensRef.current = secondaryScreens;
  }, [secondaryScreens]);

  const [activeSecondary, setActiveSecondary] = useState<SecondaryScreen>('players');

  // Auto-rotate secondary area at configured interval
  useEffect(() => {
    if (secondaryScreens.length <= 1) return;
    const id = setInterval(() => {
      setActiveSecondary((prev) => {
        const screens = screensRef.current;
        const idx = screens.indexOf(prev);
        return screens[(idx + 1) % screens.length]!;
      });
    }, rotationIntervalMs);
    return () => clearInterval(id);
  }, [secondaryScreens, rotationIntervalMs]);

  // Keyboard: Arrow keys for manual secondary navigation, T/Escape to exit
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
        e.preventDefault();
        setActiveSecondary((prev) => {
          const screens = screensRef.current;
          const idx = screens.indexOf(prev);
          return screens[(idx + 1) % screens.length]!;
        });
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
        e.preventDefault();
        setActiveSecondary((prev) => {
          const screens = screensRef.current;
          const idx = screens.indexOf(prev);
          return screens[(idx - 1 + screens.length) % screens.length]!;
        });
      } else if (e.code === 'KeyT' || e.code === 'Escape') {
        e.preventDefault();
        onExit();
      }
    },
    [onExit],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Ticker banner items (must be before early return to satisfy hook rules)
  const tickerItems = useMemo(() => {
    const items: string[] = [];
    items.push(`${activePlayerCount}/${totalPlayerCount} ${t('display.playersRemaining')}`);
    const pool = computePrizePool(players, buyIn, rebuy.rebuyCost, addOn.enabled ? addOn.cost : 0, rebuy.separatePot);
    items.push(`${t('stats.prizePool')}: ${pool} ${sym}`);
    const rPot = rebuy.separatePot ? computeRebuyPot(players, rebuy.rebuyCost) : 0;
    if (rPot > 0) items.push(`${t('rebuy.separatePotLabel')}: ${rPot} ${sym}`);
    const curLvl = levels[timerState.currentLevelIndex];
    const curBB = curLvl?.type === 'level' ? (curLvl.bigBlind ?? 0) : 0;
    if (curBB > 0) {
      const avgBB = computeAverageStackInBB(averageStack, curBB);
      items.push(`${t('stats.avgStackBB')}: ${avgBB} BB`);
    }
    const nIdx = timerState.currentLevelIndex + 1;
    const nLvl = nIdx < levels.length ? levels[nIdx] : null;
    if (nLvl) {
      if (nLvl.type === 'break') {
        items.push(`${t('display.nextLevel')}: ${nLvl.label || t('display.break')}`);
      } else {
        items.push(`${t('display.nextLevel')}: ${getBlindsText(nLvl)}`);
      }
    }
    if (rebuy.enabled && isRebuyActive(rebuy, timerState.currentLevelIndex, levels, tournamentElapsed)) {
      items.push(t('display.rebuyActive'));
    }
    return items;
  }, [activePlayerCount, totalPlayerCount, players, buyIn, rebuy, addOn, levels, timerState.currentLevelIndex, averageStack, tournamentElapsed, t, sym]);

  const currentLevel = levels[timerState.currentLevelIndex];
  if (!currentLevel) return null;

  const remaining = timerState.remainingSeconds;
  const isBreak = currentLevel.type === 'break';
  const isCountdown = remaining <= 10 && remaining > 0 && timerState.status === 'running';
  const label = getLevelLabel(currentLevel, timerState.currentLevelIndex, levels);
  const progress = 1 - remaining / currentLevel.durationSeconds;
  const pct = Math.min(100, progress * 100);
  const nextIdx = timerState.currentLevelIndex + 1;
  const nextLevel = nextIdx < levels.length ? levels[nextIdx] : null;

  const blindsStyle = layoutConfig.blindsFontScale !== 1
    ? { fontSize: `clamp(${3 * layoutConfig.blindsFontScale}rem, ${10 * layoutConfig.blindsFontScale}vw, ${7 * layoutConfig.blindsFontScale}rem)` }
    : undefined;

  const timerStyle = layoutConfig.timerFontScale !== 1
    ? { fontSize: `clamp(${4 * layoutConfig.timerFontScale}rem, ${12 * layoutConfig.timerFontScale}vw, ${8 * layoutConfig.timerFontScale}rem)` }
    : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 text-white flex flex-col select-none overflow-hidden">
      {/* Top bar: tournament name + players + exit */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-gray-800/60">
        <h1 className="text-base font-bold text-gray-300 tracking-tight truncate max-w-[50vw]">
          {tournamentName || t('app.title')}
        </h1>
        <div className="flex items-center gap-4">
          {/* Secondary screen indicator dots */}
          {secondaryScreens.length > 1 && (
            <div className="flex items-center gap-1.5">
              {secondaryScreens.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSecondary(s)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    s === activeSecondary
                      ? ''
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                  style={s === activeSecondary ? { backgroundColor: 'var(--accent-400)', boxShadow: `0 0 6px var(--accent-glow)` } : undefined}
                  aria-label={s}
                />
              ))}
            </div>
          )}
          <span className="text-gray-400 text-sm font-medium tabular-nums">
            {activePlayerCount}/{totalPlayerCount} {t('display.playersRemaining')}
          </span>
          <button
            onClick={onExit}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg text-xs font-medium transition-colors border border-gray-700/50"
          >
            {t('display.exit')}
          </button>
        </div>
      </div>

      {/* TIMER — always visible (top ~55% of screen) */}
      <div className="flex flex-col items-center justify-center px-6 py-3" style={{ flex: layoutConfig.timerFlex }}>
        {/* Banners */}
        <div className="flex items-center gap-3 mb-2 min-h-[2.5rem]">
          {isLastHand && (
            <div className="px-6 py-1.5 bg-amber-900/40 border-2 border-amber-500 rounded-xl text-center animate-addon-pulse">
              <p className="text-amber-300 text-lg font-bold tracking-wider">{t('game.lastHand')}</p>
            </div>
          )}
          {isBubble && (
            <div className="px-6 py-1.5 bg-red-900/40 border-2 border-red-500 rounded-xl text-center animate-bubble-pulse">
              <p className="text-red-300 text-lg font-bold tracking-wider">{t('bubble.bubble')}</p>
            </div>
          )}
          {isHandForHand && (
            <div className="px-6 py-1.5 bg-red-900/40 border-2 border-red-500 rounded-xl text-center animate-bubble-pulse">
              <p className="text-red-300 text-lg font-bold tracking-wider">{t('display.handForHand')}</p>
            </div>
          )}
        </div>

        {/* Level label */}
        <p
          className={`font-bold uppercase tracking-wider text-xl sm:text-2xl ${
            isBreak ? 'text-amber-400' : ''
          }`}
          style={isBreak ? undefined : { color: 'var(--accent-400)' }}
        >
          {label}
        </p>

        {/* Blinds */}
        {currentLevel.type === 'level' && (
          <div className="text-center">
            <p className="text-[3rem] sm:text-[5rem] lg:text-[7rem] font-bold tabular-nums tracking-wide leading-none drop-shadow-[0_0_20px_rgba(255,255,255,0.08)]" style={blindsStyle}>
              {currentLevel.smallBlind ?? 0} / {currentLevel.bigBlind ?? 0}
            </p>
            {currentLevel.ante != null && currentLevel.ante > 0 && (
              <p className="text-gray-400 font-semibold text-lg sm:text-2xl mt-1">
                {t('display.ante')} {currentLevel.ante}
              </p>
            )}
          </div>
        )}
        {isBreak && (
          <p className="text-amber-300 font-semibold text-3xl sm:text-5xl">{currentLevel.label || t('display.break')}</p>
        )}

        {/* Timer */}
        <p className={`font-mono font-bold tabular-nums text-[4rem] sm:text-[6rem] lg:text-[8rem] leading-none ${
          isCountdown
            ? 'text-red-500 animate-countdown-pulse'
            : timerState.status === 'paused'
            ? 'text-yellow-400 opacity-80'
            : remaining <= 0
            ? 'text-gray-500'
            : 'animate-timer-glow'
        }`} style={timerStyle}>
          {formatTime(remaining)}
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-3xl h-2.5 bg-gray-800 rounded-full overflow-hidden mt-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isBreak
                ? 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                : ''
            }`}
            style={{
              width: `${pct}%`,
              ...(isBreak ? {} : {
                background: 'linear-gradient(to right, var(--accent-600), var(--accent-400))',
                boxShadow: `0 0 10px var(--accent-glow)`,
              }),
            }}
          />
        </div>

        {/* Next level */}
        {layoutConfig.showNextLevel && nextLevel && (
          <div className="text-center mt-1">
            <span className="text-gray-500 text-xs uppercase tracking-wider">{t('display.nextLevel')}: </span>
            {nextLevel.type === 'break' ? (
              <span className="text-amber-500/70 font-medium text-sm">{t('display.break')} ({formatTime(nextLevel.durationSeconds)})</span>
            ) : (
              <span className="text-gray-400 font-medium text-sm">
                {getBlindsText(nextLevel)} ({formatTime(nextLevel.durationSeconds)})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Separator + SECONDARY AREA — rotates between screens (bottom area) */}
      {layoutConfig.showSecondary && (
        <>
          <div className="border-t border-gray-800/60" />
          <div className="overflow-hidden px-6 py-3 animate-fade-in" style={{ flex: layoutConfig.secondaryFlex }} key={activeSecondary}>
            {activeSecondary === 'players' && (
              <PlayersScreen players={players} />
            )}
            {activeSecondary === 'stats' && (
              <StatsScreen
                players={players}
                levels={levels}
                currentLevelIndex={timerState.currentLevelIndex}
                remainingSeconds={timerState.remainingSeconds}
                buyIn={buyIn}
                rebuy={rebuy}
                addOn={addOn}
                bounty={bounty}
                averageStack={averageStack}
                tournamentElapsed={tournamentElapsed}
                activePlayerCount={activePlayerCount}
                totalPlayerCount={totalPlayerCount}
                currency={currency}
              />
            )}
            {activeSecondary === 'payout' && (
              <PayoutScreen
                players={players}
                buyIn={buyIn}
                payout={payout}
                rebuy={rebuy}
                addOn={addOn}
                isBubble={isBubble}
                currency={currency}
              />
            )}
            {activeSecondary === 'schedule' && (
              <ScheduleScreen levels={levels} currentLevelIndex={timerState.currentLevelIndex} />
            )}
            {activeSecondary === 'chips' && chipConfig && colorUpMap && (
              <ChipsScreen chipConfig={chipConfig} colorUpMap={colorUpMap} currentLevelIndex={timerState.currentLevelIndex} levels={levels} />
            )}
            {activeSecondary === 'seating' && (
              <SeatingScreen players={players} dealerIndex={dealerIndex} tables={tables} showDealerBadges={showDealerBadges} />
            )}
            {activeSecondary === 'league' && leagueName && leagueStandings && (
              <LeagueScreen leagueName={leagueName} standings={leagueStandings} currency={currency} />
            )}
            {activeSecondary === 'sidepot' && sidePotData && (
              <SidePotScreen data={sidePotData} />
            )}
          </div>
        </>
      )}

      {/* Ticker banner */}
      {layoutConfig.showTicker && <TickerBanner items={tickerItems} />}

      {/* Bottom bar: rotation hint */}
      {layoutConfig.showRotationHint && (
        <div className="px-6 py-1 border-t border-gray-800/60 text-center">
          <p className="text-gray-600 text-2xs">
            {secondaryScreens.length > 1
              ? `${t('display.rotationHint', { n: rotationIntervalMs / 1000 })} · ← → ${t('display.navigate')}`
              : `← → ${t('display.navigate')}`
            }
          </p>
        </div>
      )}
    </div>
  );
}
