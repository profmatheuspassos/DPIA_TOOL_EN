import React, { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DPIARecord, RiskLevel } from '../types';
import { getRiskConfig } from '../utils/riskLogic';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

interface RiskHistoryChartProps {
  records: DPIARecord[];
  onViewReport: (record: DPIARecord) => void;
}

interface RiskHistoryPoint {
  pointKey: string;
  record: DPIARecord;
  projectName: string;
  department: string;
  dateLabel: string;
  fullDateLabel: string;
  inherentScore: number;
  residualScore: number;
  mitigationCredits: number;
  riskLevel: RiskLevel;
}

const RISK_DOT_COLOR: Record<RiskLevel, string> = {
  [RiskLevel.HIGH]: '#DC2626',
  [RiskLevel.MEDIUM]: '#D97706',
  [RiskLevel.LOW]: '#16A34A',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: RiskHistoryPoint;
  }>;
  showInherent: boolean;
}

const RiskHistoryTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  showInherent,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const riskCfg = getRiskConfig(point.riskLevel);
  const riskTextColor =
    point.riskLevel === RiskLevel.HIGH
      ? 'text-red-700'
      : point.riskLevel === RiskLevel.MEDIUM
      ? 'text-amber-700'
      : 'text-emerald-700';

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-sm px-3.5 py-2.5 text-xs max-w-xs">
      <div className="font-semibold text-slate-900 leading-snug">{point.projectName}</div>
      <div className="text-slate-500 mt-0.5 flex items-center gap-1.5">
        <span className="truncate">{point.department}</span>
        <span aria-hidden="true">·</span>
        <span className="font-mono tabular-nums whitespace-nowrap">{point.fullDateLabel}</span>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-600">Residual Risk</span>
          <span className={`font-mono font-semibold tabular-nums ${riskTextColor}`}>
            {point.residualScore} pts ({riskCfg.shortLabel})
          </span>
        </div>
        {showInherent && (
          <>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Inherent Risk</span>
              <span className="font-mono tabular-nums text-slate-700">
                {point.inherentScore} pts
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Control Mitigation</span>
              <span className="font-mono tabular-nums text-emerald-700">
                -{point.mitigationCredits} pts
              </span>
            </div>
          </>
        )}
      </div>

      <div className="mt-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-400">
        Click point to open full DPIA report
      </div>
    </div>
  );
};

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: RiskHistoryPoint;
  onSelect: (record: DPIARecord) => void;
  isActive?: boolean;
}

const RiskPointDot: React.FC<CustomDotProps> = ({
  cx,
  cy,
  payload,
  onSelect,
  isActive = false,
}) => {
  if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return null;
  const fill = RISK_DOT_COLOR[payload.riskLevel];
  const radius = isActive ? 6 : 4.5;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={fill}
      stroke="#FFFFFF"
      strokeWidth={2}
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(payload.record);
      }}
    />
  );
};

export const RiskHistoryChart: React.FC<RiskHistoryChartProps> = ({
  records,
  onViewReport,
}) => {
  const [seriesMode, setSeriesMode] = useState<'both' | 'residual'>('both');
  const showInherent = seriesMode === 'both';

  const { chartData, labelByKey, yMax, trend } = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      const diff = new Date(a.createdAtIso).getTime() - new Date(b.createdAtIso).getTime();
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    });

    const years = new Set(sorted.map((r) => new Date(r.createdAtIso).getFullYear()));
    const multiYear = years.size > 1;

    const points: RiskHistoryPoint[] = sorted.map((rec, idx) => {
      const d = new Date(rec.createdAtIso);
      const dateLabel = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(multiYear ? { year: '2-digit' } : {}),
      });
      const fullDateLabel = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return {
        pointKey: `${rec.id}-${idx}`,
        record: rec,
        projectName: rec.formData.projectName || 'Untitled project',
        department: rec.formData.department || 'Unspecified',
        dateLabel,
        fullDateLabel,
        inherentScore: rec.result.inherentScore,
        residualScore: rec.result.residualScore,
        mitigationCredits: rec.result.mitigationCredits,
        riskLevel: rec.result.riskLevel,
      };
    });

    const map = new Map<string, string>();
    points.forEach((p) => map.set(p.pointKey, p.dateLabel));

    const peakScore = points.reduce(
      (max, p) => Math.max(max, p.residualScore, p.inherentScore),
      0
    );
    const computedYMax = Math.max(12, Math.ceil((peakScore + 2) / 2) * 2);

    if (points.length < 2) {
      return {
        chartData: points,
        labelByKey: map,
        yMax: computedYMax,
        trend: {
          status: 'insufficient' as const,
          delta: 0,
          label:
            points.length === 1
              ? 'Baseline recorded · Add another assessment to track trend'
              : 'No history recorded yet',
        },
      };
    }

    const earliest = points[0];
    const latest = points[points.length - 1];
    const delta = latest.residualScore - earliest.residualScore;

    if (delta < 0) {
      return {
        chartData: points,
        labelByKey: map,
        yMax: computedYMax,
        trend: {
          status: 'improving' as const,
          delta,
          label: `Improving (${delta} pts since ${earliest.dateLabel})`,
        },
      };
    }

    if (delta > 0) {
      return {
        chartData: points,
        labelByKey: map,
        yMax: computedYMax,
        trend: {
          status: 'deteriorating' as const,
          delta,
          label: `Deteriorating (+${delta} pts since ${earliest.dateLabel})`,
        },
      };
    }

    return {
      chartData: points,
      labelByKey: map,
      yMax: computedYMax,
      trend: {
        status: 'stable' as const,
        delta: 0,
        label: `Stable (0 pts change since ${earliest.dateLabel})`,
      },
    };
  }, [records]);

  const TrendIcon =
    trend.status === 'improving'
      ? TrendingDown
      : trend.status === 'deteriorating'
      ? TrendingUp
      : Minus;

  const trendTextClass =
    trend.status === 'improving'
      ? 'text-emerald-700'
      : trend.status === 'deteriorating'
      ? 'text-red-700'
      : 'text-slate-600';

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-4 md:px-5 md:py-5 space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold text-slate-900">Risk History</h3>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${trendTextClass}`}
            >
              {trend.status !== 'insufficient' && (
                <TrendIcon size={13} aria-hidden="true" />
              )}
              <span>{trend.label}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Chronological residual and inherent risk scores across stored assessments (click any
            point to open its report).
          </p>
        </div>

        {/* Series Mode Toggle */}
        <div
          role="group"
          aria-label="Risk history series display"
          className="inline-flex items-center p-0.5 bg-slate-100 rounded-md self-start sm:self-auto shrink-0"
        >
          <button
            type="button"
            onClick={() => setSeriesMode('both')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              seriesMode === 'both'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Residual &amp; Inherent
          </button>
          <button
            type="button"
            onClick={() => setSeriesMode('residual')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              seriesMode === 'residual'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Residual Only
          </button>
        </div>
      </div>

      {/* Chart Canvas or Empty State */}
      {chartData.length === 0 ? (
        <div className="h-48 rounded-md border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center px-4">
          <p className="text-sm font-medium text-slate-700">No risk history to display</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Complete and save DPIA assessments to track whether your organization&apos;s risk
            profile is improving or deteriorating over time.
          </p>
        </div>
      ) : (
        <>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 16, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="dpiaResidualFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F4C81" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#0F4C81" stopOpacity={0.01} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E2E8F0"
                />

                <XAxis
                  dataKey="pointKey"
                  tickFormatter={(value: string) => labelByKey.get(value) || ''}
                  tick={{
                    fontSize: 11,
                    fill: '#64748B',
                    fontFamily: 'var(--font-mono)',
                  }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                  dy={6}
                />

                <YAxis
                  domain={[0, yMax]}
                  allowDecimals={false}
                  width={34}
                  tick={{
                    fontSize: 11,
                    fill: '#64748B',
                    fontFamily: 'var(--font-mono)',
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <ReferenceLine
                  y={9}
                  stroke="#DC2626"
                  strokeDasharray="4 4"
                  strokeOpacity={0.55}
                  label={{
                    value: 'High (9+)',
                    position: 'insideTopRight',
                    fill: '#B91C1C',
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                />

                <ReferenceLine
                  y={4}
                  stroke="#D97706"
                  strokeDasharray="4 4"
                  strokeOpacity={0.45}
                  label={{
                    value: 'Medium (4+)',
                    position: 'insideTopRight',
                    fill: '#B45309',
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                />

                <Tooltip
                  content={<RiskHistoryTooltip showInherent={showInherent} />}
                  cursor={{ stroke: '#CBD5E1', strokeWidth: 1 }}
                />

                {showInherent && (
                  <Line
                    type="monotone"
                    dataKey="inherentScore"
                    name="Inherent Risk"
                    stroke="#94A3B8"
                    strokeWidth={1.75}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#94A3B8', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                    activeDot={{ r: 4.5, fill: '#64748B', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                    isAnimationActive={false}
                  />
                )}

                <Area
                  type="monotone"
                  dataKey="residualScore"
                  name="Residual Risk"
                  stroke="#0F4C81"
                  strokeWidth={2.25}
                  fill="url(#dpiaResidualFill)"
                  dot={(props) => (
                    <RiskPointDot
                      key={`dot-${props.payload?.pointKey ?? props.index}`}
                      cx={props.cx}
                      cy={props.cy}
                      payload={props.payload}
                      onSelect={onViewReport}
                    />
                  )}
                  activeDot={(props) => (
                    <RiskPointDot
                      key={`active-dot-${props.payload?.pointKey ?? props.index}`}
                      cx={props.cx}
                      cy={props.cy}
                      payload={props.payload}
                      onSelect={onViewReport}
                      isActive
                    />
                  )}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Legend & Scale Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-3.5 h-0.5 bg-[#0F4C81] inline-block" aria-hidden="true" />
                Residual Risk Score
              </span>
              {showInherent && (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-3.5 border-t-2 border-dashed border-slate-400 inline-block"
                    aria-hidden="true"
                  />
                  Inherent Risk Score
                </span>
              )}
              <span aria-hidden="true" className="text-slate-300 hidden sm:inline">
                ·
              </span>
              <span className="inline-flex items-center gap-2 text-slate-500">
                <span>Thresholds:</span>
                <span className="text-emerald-700 font-mono tabular-nums">0–3 Low</span>
                <span aria-hidden="true">/</span>
                <span className="text-amber-700 font-mono tabular-nums">4–8 Medium</span>
                <span aria-hidden="true">/</span>
                <span className="text-red-700 font-mono tabular-nums">9+ High</span>
              </span>
            </div>
            <span className="font-mono tabular-nums text-slate-400">
              {chartData.length} assessment{chartData.length === 1 ? '' : 's'} plotted
            </span>
          </div>
        </>
      )}
    </div>
  );
};
