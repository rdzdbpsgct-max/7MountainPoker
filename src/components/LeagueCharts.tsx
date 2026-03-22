import { useState, useMemo } from 'react';
import type { GameDay, ExtendedLeagueStanding } from '../domain/types';
import { computeLeaguePlayerStats, normalizePlayerName } from '../domain/logic';
import { useTranslation } from '../i18n';

type ChartType = 'points' | 'placement' | 'balance';

// Consistent color palette for multi-player lines
const LINE_COLORS = [
  'var(--accent-500)', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#10b981', '#f97316', '#6366f1',
];

interface Props {
  standings: ExtendedLeagueStanding[];
  gameDays: GameDay[];
  currencySymbol: string;
}

// ---------------------------------------------------------------------------
// Shared SVG chart primitives
// ---------------------------------------------------------------------------

const CHART_W = 600;
const CHART_H = 240;
const PAD = { top: 20, right: 20, bottom: 32, left: 48 };
const INNER_W = CHART_W - PAD.left - PAD.right;
const INNER_H = CHART_H - PAD.top - PAD.bottom;

function scaleX(i: number, count: number): number {
  if (count <= 1) return PAD.left + INNER_W / 2;
  return PAD.left + (i / (count - 1)) * INNER_W;
}

function scaleY(value: number, min: number, max: number): number {
  const range = max - min || 1;
  return PAD.top + INNER_H - ((value - min) / range) * INNER_H;
}

function buildPolyline(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

/** Format short date label from ISO string */
function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeagueCharts({ standings, gameDays, currencySymbol }: Props) {
  const { t } = useTranslation();
  const [chartType, setChartType] = useState<ChartType>('points');
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(() => {
    // Default: top 5 players
    return new Set(standings.slice(0, 5).map((s) => s.name));
  });

  const sortedGameDays = useMemo(
    () => [...gameDays].sort((a, b) => a.date.localeCompare(b.date)),
    [gameDays],
  );

  const dateLabels = useMemo(
    () => sortedGameDays.map((gd) => shortDate(gd.date)),
    [sortedGameDays],
  );

  // Player color mapping (stable by standings order)
  const playerColors = useMemo(() => {
    const map = new Map<string, string>();
    standings.forEach((s, i) => map.set(s.name, LINE_COLORS[i % LINE_COLORS.length]!));
    return map;
  }, [standings]);

  // Per-player data series
  const playerSeries = useMemo(() => {
    const result = new Map<string, { points: number[]; cumPoints: number[]; places: number[]; cumBalance: number[] }>();

    for (const name of selectedPlayers) {
      const stats = computeLeaguePlayerStats(name, gameDays);
      const key = normalizePlayerName(name);
      const cumPoints: number[] = [];
      const points: number[] = [];
      const places: number[] = [];
      const cumBalance: number[] = [];
      let runningBalance = 0;

      for (const gd of sortedGameDays) {
        const p = gd.participants.find((pp) => normalizePlayerName(pp.name) === key);
        const histEntry = stats.pointsHistory.find((h) => h.gameDayId === gd.id);

        if (p) {
          points.push(p.points);
          cumPoints.push(histEntry?.cumulative ?? 0);
          places.push(p.place);
          runningBalance += p.netBalance;
          cumBalance.push(runningBalance);
        } else {
          // Player didn't participate — carry forward
          points.push(0);
          cumPoints.push(cumPoints.length > 0 ? cumPoints[cumPoints.length - 1]! : 0);
          places.push(0); // 0 = absent
          cumBalance.push(runningBalance);
        }
      }

      result.set(name, { points, cumPoints, places, cumBalance });
    }
    return result;
  }, [selectedPlayers, gameDays, sortedGameDays]);

  // Compute Y-axis range based on chart type
  const { yMin, yMax, yLabel, formatY } = useMemo(() => {
    let min = 0;
    let max = 1;
    let label = '';
    let fmt = (v: number) => String(v);

    if (chartType === 'points') {
      for (const series of playerSeries.values()) {
        for (const v of series.cumPoints) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
      label = t('league.charts.yPoints');
    } else if (chartType === 'placement') {
      min = 1;
      max = 1;
      for (const series of playerSeries.values()) {
        for (const v of series.places) {
          if (v > 0 && v > max) max = v;
        }
      }
      label = t('league.charts.yPlace');
    } else {
      for (const series of playerSeries.values()) {
        for (const v of series.cumBalance) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
      label = t('league.charts.yBalance');
      fmt = (v: number) => `${currencySymbol}${v}`;
    }

    // Add padding
    const range = max - min || 1;
    return { yMin: min - range * 0.05, yMax: max + range * 0.05, yLabel: label, formatY: fmt };
  }, [chartType, playerSeries, t, currencySymbol]);

  // Build SVG lines
  const lines = useMemo(() => {
    const result: { name: string; color: string; points: { x: number; y: number }[] }[] = [];
    const count = sortedGameDays.length;

    for (const [name, series] of playerSeries.entries()) {
      const color = playerColors.get(name) ?? LINE_COLORS[0]!;
      const dataArr = chartType === 'points' ? series.cumPoints
        : chartType === 'placement' ? series.places
        : series.cumBalance;

      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < count; i++) {
        const val = dataArr[i]!;
        // Skip absent players in placement chart
        if (chartType === 'placement' && val === 0) continue;

        const yVal = chartType === 'placement' ? val : val;
        // For placement, invert Y (1st = top)
        const y = chartType === 'placement'
          ? scaleY(yMax - yVal + yMin, yMin, yMax)
          : scaleY(yVal, yMin, yMax);
        pts.push({ x: scaleX(i, count), y });
      }
      result.push({ name, color, points: pts });
    }
    return result;
  }, [playerSeries, sortedGameDays.length, chartType, yMin, yMax, playerColors]);

  // Y-axis grid lines (5 ticks)
  const yTicks = useMemo(() => {
    const ticks: { value: number; y: number }[] = [];
    const step = (yMax - yMin) / 4;
    for (let i = 0; i <= 4; i++) {
      const value = yMin + step * i;
      const rounded = chartType === 'placement' ? Math.round(yMax - value + yMin) : Math.round(value);
      ticks.push({ value: rounded, y: scaleY(value, yMin, yMax) });
    }
    return ticks;
  }, [yMin, yMax, chartType]);

  const togglePlayer = (name: string) => {
    setSelectedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (sortedGameDays.length < 2) {
    return (
      <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-lg p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">{t('league.charts.needMoreData')}</p>
      </div>
    );
  }

  const chartTabs: { key: ChartType; label: string }[] = [
    { key: 'points', label: t('league.charts.points') },
    { key: 'placement', label: t('league.charts.placement') },
    { key: 'balance', label: t('league.charts.balance') },
  ];

  return (
    <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-lg p-4 space-y-4">
      {/* Chart type selector */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/60">
        {chartTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setChartType(tab.key)}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              chartType === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SVG Chart */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full max-w-full"
          style={{ minWidth: 400 }}
        >
          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={PAD.left} y1={tick.y}
                x2={CHART_W - PAD.right} y2={tick.y}
                stroke="currentColor" strokeOpacity={0.1} strokeDasharray="4 4"
              />
              <text
                x={PAD.left - 6} y={tick.y + 3}
                textAnchor="end" fontSize={9}
                className="fill-gray-400 dark:fill-gray-500"
              >
                {formatY(tick.value)}
              </text>
            </g>
          ))}

          {/* X-axis date labels */}
          {dateLabels.map((label, i) => {
            // Show max ~10 labels to avoid clutter
            const step = Math.max(1, Math.ceil(dateLabels.length / 10));
            if (i % step !== 0 && i !== dateLabels.length - 1) return null;
            return (
              <text
                key={i}
                x={scaleX(i, dateLabels.length)}
                y={CHART_H - 6}
                textAnchor="middle" fontSize={8}
                className="fill-gray-400 dark:fill-gray-500"
              >
                {label}
              </text>
            );
          })}

          {/* Y-axis label */}
          <text
            x={12} y={PAD.top + INNER_H / 2}
            textAnchor="middle" fontSize={9}
            transform={`rotate(-90, 12, ${PAD.top + INNER_H / 2})`}
            className="fill-gray-400 dark:fill-gray-500"
          >
            {yLabel}
          </text>

          {/* Data lines */}
          {lines.map((line) => (
            <g key={line.name}>
              <polyline
                points={buildPolyline(line.points)}
                fill="none"
                stroke={line.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Dots */}
              {line.points.map((pt, i) => (
                <circle
                  key={i} cx={pt.x} cy={pt.y} r={2.5}
                  fill={line.color}
                />
              ))}
            </g>
          ))}

          {/* Zero line for balance chart */}
          {chartType === 'balance' && yMin < 0 && (
            <line
              x1={PAD.left} y1={scaleY(0, yMin, yMax)}
              x2={CHART_W - PAD.right} y2={scaleY(0, yMin, yMax)}
              stroke="currentColor" strokeOpacity={0.3} strokeWidth={1}
            />
          )}
        </svg>
      </div>

      {/* Player legend / toggles */}
      <div className="flex flex-wrap gap-2">
        {standings.map((s) => {
          const color = playerColors.get(s.name) ?? LINE_COLORS[0]!;
          const active = selectedPlayers.has(s.name);
          return (
            <button
              key={s.name}
              onClick={() => togglePlayer(s.name)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all border ${
                active
                  ? 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'bg-transparent border-gray-200 dark:border-gray-700/40 text-gray-400 dark:text-gray-500'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: active ? color : 'transparent', border: `2px solid ${color}` }}
              />
              {s.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
