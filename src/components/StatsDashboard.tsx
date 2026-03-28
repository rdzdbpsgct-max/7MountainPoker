import { useState, useMemo, useEffect } from 'react';
import { computePlayerStats, computePlayerTrends } from '../domain/logic';
import { getCached } from '../domain/storage';
import type { TournamentResult, PlayerStat } from '../domain/types';
import { useTranslation } from '../i18n';

interface Props {
  onClose: () => void;
}

const CHART_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

type TimeFilter = 'all' | 'last10' | 'last20' | 'thisYear';
type ChartType = 'cumulative' | 'roi' | 'cash';

// ---------------------------------------------------------------------------
// SVG chart primitives (matching LeagueCharts pattern)
// ---------------------------------------------------------------------------

const CHART_W = 800;
const CHART_H = 300;
const PAD = { top: 20, right: 20, bottom: 32, left: 56 };
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

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

// ---------------------------------------------------------------------------
// Sort helpers
// ---------------------------------------------------------------------------
type SortKey = 'name' | 'tournaments' | 'wins' | 'cashes' | 'netBalance' | 'avgPlace' | 'totalPayout' | 'totalCost' | 'knockouts';

function compareStats(a: PlayerStat, b: PlayerStat, key: SortKey, asc: boolean): number {
  const dir = asc ? 1 : -1;
  if (key === 'name') return a.name.localeCompare(b.name) * dir;
  return ((a[key] as number) - (b[key] as number)) * dir;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatsDashboard({ onClose }: Props) {
  const { t } = useTranslation();

  const history = useMemo(() => {
    const h = getCached('history') as TournamentResult[] | null;
    return (h || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, []);

  const [activeTab, setActiveTab] = useState<'table' | 'trends'>('table');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [chartType, setChartType] = useState<ChartType>('cumulative');
  const [sortKey, setSortKey] = useState<SortKey>('netBalance');
  const [sortAsc, setSortAsc] = useState(false);

  // Filter history by time
  const filteredHistory = useMemo(() => {
    switch (timeFilter) {
      case 'last10': return history.slice(0, 10);
      case 'last20': return history.slice(0, 20);
      case 'thisYear': {
        const year = new Date().getFullYear();
        return history.filter(t => new Date(t.date).getFullYear() === year);
      }
      default: return history;
    }
  }, [history, timeFilter]);

  const stats = useMemo(() => computePlayerStats(filteredHistory), [filteredHistory]);

  const sortedStats = useMemo(() =>
    [...stats].sort((a, b) => compareStats(a, b, sortKey, sortAsc)),
  [stats, sortKey, sortAsc]);

  // Initialize selected players (top 5) on first load
  useEffect(() => {
    if (selectedPlayers.size === 0 && stats.length > 0) {
      setSelectedPlayers(new Set(stats.slice(0, 5).map(s => s.name)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time init
  }, [stats]);

  // Aggregate metrics
  const totalTournaments = filteredHistory.length;
  const totalProfit = sortedStats.reduce((sum, s) => sum + s.netBalance, 0);
  const avgRoi = sortedStats.length > 0
    ? Math.round(sortedStats.reduce((sum, s) => sum + (s.totalCost > 0 ? ((s.totalPayout - s.totalCost) / s.totalCost) * 100 : 0), 0) / sortedStats.length)
    : 0;
  const avgCashRate = sortedStats.length > 0
    ? Math.round(sortedStats.reduce((sum, s) => sum + (s.cashes / s.tournaments) * 100, 0) / sortedStats.length)
    : 0;

  // Trend data for selected players
  const playerTrends = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computePlayerTrends>>();
    for (const name of selectedPlayers) {
      map.set(name, computePlayerTrends(filteredHistory, name));
    }
    return map;
  }, [selectedPlayers, filteredHistory]);

  // Player colors (stable by stats order)
  const playerColors = useMemo(() => {
    const map = new Map<string, string>();
    stats.forEach((s, i) => map.set(s.name, CHART_COLORS[i % CHART_COLORS.length]!));
    return map;
  }, [stats]);

  // Compute chart lines
  const { lines, yMin, yMax, yLabel, formatY } = useMemo(() => {
    let min = 0;
    let max = 1;
    let label = '';
    let fmt = (v: number) => String(v);

    const allLines: { name: string; color: string; points: { x: number; y: number }[]; values: number[] }[] = [];

    // Collect all data points to determine Y range
    const allValues: number[] = [];
    for (const [, trends] of playerTrends.entries()) {
      const vals = trends.map(tp => {
        if (chartType === 'cumulative') return tp.cumulativeProfit;
        if (chartType === 'roi') return tp.roi;
        return tp.cashed ? 1 : 0;
      });
      allValues.push(...vals);
    }

    if (chartType === 'cumulative') {
      label = t('dashboard.cumulativeProfit' as Parameters<typeof t>[0]);
      fmt = (v: number) => `${v >= 0 ? '+' : ''}${v}`;
    } else if (chartType === 'roi') {
      label = t('dashboard.roiTrend' as Parameters<typeof t>[0]);
      fmt = (v: number) => `${v}%`;
    } else {
      label = t('dashboard.cashTrend' as Parameters<typeof t>[0]);
      fmt = (v: number) => `${Math.round(v * 100)}%`;
    }

    if (allValues.length > 0) {
      min = Math.min(...allValues);
      max = Math.max(...allValues);
    }

    // For cash rate, compute running average
    const range = max - min || 1;
    const yMinPad = min - range * 0.05;
    const yMaxPad = max + range * 0.05;

    for (const [name, trends] of playerTrends.entries()) {
      const color = playerColors.get(name) ?? CHART_COLORS[0]!;
      const count = trends.length;
      const pts: { x: number; y: number }[] = [];
      const vals: number[] = [];

      for (let i = 0; i < count; i++) {
        const tp = trends[i]!;
        let val: number;
        if (chartType === 'cumulative') val = tp.cumulativeProfit;
        else if (chartType === 'roi') val = tp.roi;
        else {
          // Running cash rate
          const cashedSoFar = trends.slice(0, i + 1).filter(t => t.cashed).length;
          val = cashedSoFar / (i + 1);
        }
        vals.push(val);
        pts.push({ x: scaleX(i, count), y: scaleY(val, yMinPad, yMaxPad) });
      }
      allLines.push({ name, color, points: pts, values: vals });
    }

    return { lines: allLines, yMin: yMinPad, yMax: yMaxPad, yLabel: label, formatY: fmt };
  }, [playerTrends, chartType, playerColors, t]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const ticks: { value: number; y: number }[] = [];
    const step = (yMax - yMin) / 4;
    for (let i = 0; i <= 4; i++) {
      const value = yMin + step * i;
      ticks.push({ value: Math.round(value * 100) / 100, y: scaleY(value, yMin, yMax) });
    }
    return ticks;
  }, [yMin, yMax]);

  // All unique date labels from trends
  const dateLabels = useMemo(() => {
    const dates = new Set<string>();
    for (const trends of playerTrends.values()) {
      for (const tp of trends) dates.add(tp.date);
    }
    return [...dates].sort().map(d => shortDate(d));
  }, [playerTrends]);

  const togglePlayer = (name: string) => {
    setSelectedPlayers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(prev => !prev);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortAsc ? ' \u25B2' : ' \u25BC';
  };

  const timeFilters: { key: TimeFilter; labelKey: string }[] = [
    { key: 'all', labelKey: 'dashboard.filterAll' },
    { key: 'last10', labelKey: 'dashboard.filterLast10' },
    { key: 'last20', labelKey: 'dashboard.filterLast20' },
    { key: 'thisYear', labelKey: 'dashboard.filterThisYear' },
  ];

  const chartTabs: { key: ChartType; labelKey: string }[] = [
    { key: 'cumulative', labelKey: 'dashboard.cumulativeProfit' },
    { key: 'roi', labelKey: 'dashboard.roiTrend' },
    { key: 'cash', labelKey: 'dashboard.cashTrend' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden animate-scale-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700/40">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('dashboard.title' as Parameters<typeof t>[0])}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {t('dashboard.noData' as Parameters<typeof t>[0])}
            </div>
          ) : (
            <>
              {/* Time filter */}
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/60 rounded-lg p-0.5">
                {timeFilters.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setTimeFilter(f.key)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      timeFilter === f.key
                        ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {t(f.labelKey as Parameters<typeof t>[0])}
                  </button>
                ))}
              </div>

              {/* Metric cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: t('dashboard.tournaments' as Parameters<typeof t>[0]), value: String(totalTournaments) },
                  { label: t('dashboard.profit' as Parameters<typeof t>[0]), value: `${totalProfit >= 0 ? '+' : ''}${totalProfit} \u20AC` },
                  { label: t('dashboard.roi' as Parameters<typeof t>[0]), value: `${avgRoi}%` },
                  { label: t('dashboard.cashRate' as Parameters<typeof t>[0]), value: `${avgCashRate}%` },
                ].map(card => (
                  <div key={card.label} className="bg-gray-100/80 dark:bg-gray-800/40 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{card.value}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{card.label}</div>
                  </div>
                ))}
              </div>

              {/* Tab bar */}
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/60 rounded-lg p-0.5">
                <button
                  onClick={() => setActiveTab('table')}
                  className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'table'
                      ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {t('dashboard.tableTab' as Parameters<typeof t>[0])}
                </button>
                <button
                  onClick={() => setActiveTab('trends')}
                  className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'trends'
                      ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {t('dashboard.trendsTab' as Parameters<typeof t>[0])}
                </button>
              </div>

              {/* Table tab */}
              {activeTab === 'table' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700/40">
                        {([
                          ['name', t('history.player' as Parameters<typeof t>[0])],
                          ['tournaments', '#'],
                          ['wins', t('history.wins' as Parameters<typeof t>[0])],
                          ['cashes', t('history.cashes' as Parameters<typeof t>[0])],
                          ['totalPayout', t('history.payout' as Parameters<typeof t>[0])],
                          ['totalCost', t('history.cost' as Parameters<typeof t>[0])],
                          ['netBalance', t('history.balance' as Parameters<typeof t>[0])],
                          ['avgPlace', t('history.avgPlace' as Parameters<typeof t>[0])],
                          ['knockouts', 'KO'],
                        ] as [SortKey, string][]).map(([key, label]) => (
                          <th
                            key={key}
                            className="px-2 py-2 font-medium cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none whitespace-nowrap"
                            onClick={() => handleSort(key)}
                            aria-sort={sortKey === key ? (sortAsc ? 'ascending' : 'descending') : undefined}
                          >
                            {label}{sortIndicator(key)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStats.map((s, i) => (
                        <tr
                          key={s.name}
                          className={`border-b border-gray-100 dark:border-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${
                            i === 0 && sortKey === 'netBalance' && !sortAsc ? 'border-l-2' : ''
                          }`}
                          style={i === 0 && sortKey === 'netBalance' && !sortAsc ? { borderLeftColor: 'var(--accent-500)' } : undefined}
                        >
                          <td className="px-2 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{s.name}</td>
                          <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{s.tournaments}</td>
                          <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{s.wins}</td>
                          <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{s.cashes}</td>
                          <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{s.totalPayout}</td>
                          <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{s.totalCost}</td>
                          <td className={`px-2 py-2 font-medium ${s.netBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {s.netBalance >= 0 ? '+' : ''}{s.netBalance}
                          </td>
                          <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{s.avgPlace}</td>
                          <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{s.knockouts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Trends tab */}
              {activeTab === 'trends' && (
                <div className="space-y-4">
                  {/* Chart type selector */}
                  <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/60">
                    {chartTabs.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setChartType(tab.key)}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          chartType === tab.key
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        {t(tab.labelKey as Parameters<typeof t>[0])}
                      </button>
                    ))}
                  </div>

                  {/* SVG Chart */}
                  {selectedPlayers.size > 0 ? (
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

                        {/* Zero line */}
                        {yMin < 0 && yMax > 0 && (
                          <line
                            x1={PAD.left} y1={scaleY(0, yMin, yMax)}
                            x2={CHART_W - PAD.right} y2={scaleY(0, yMin, yMax)}
                            stroke="currentColor" strokeOpacity={0.3} strokeWidth={1}
                          />
                        )}

                        {/* Data lines */}
                        {lines.map(line => (
                          <g key={line.name}>
                            <polyline
                              points={buildPolyline(line.points)}
                              fill="none"
                              stroke={line.color}
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {line.points.map((pt, i) => (
                              <circle
                                key={i} cx={pt.x} cy={pt.y} r={2.5}
                                fill={line.color}
                              />
                            ))}
                          </g>
                        ))}
                      </svg>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                      {t('dashboard.noData' as Parameters<typeof t>[0])}
                    </div>
                  )}

                  {/* Player legend / toggles */}
                  <div className="flex flex-wrap gap-2">
                    {stats.map(s => {
                      const color = playerColors.get(s.name) ?? CHART_COLORS[0]!;
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
