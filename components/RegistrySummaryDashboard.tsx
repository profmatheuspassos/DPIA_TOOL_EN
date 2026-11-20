import React from 'react';
import { DPIARecord, RiskLevel } from '../types';
import { getRiskConfig } from '../utils/riskLogic';
import { AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { RiskHistoryChart } from './RiskHistoryChart';

export interface RegistrySummaryStats {
  total: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  highPct: number;
  mediumPct: number;
  lowPct: number;
  avgResidualScore: number;
  avgInherentScore: number;
  avgMitigationCredits: number;
  avgRiskLevel: RiskLevel;
  mandatoryCount: number;
  mandatoryPct: number;
  totalActions: number;
  completedActions: number;
  pendingActions: number;
  mitigationCompletionPct: number;
}

interface RegistrySummaryDashboardProps {
  records: DPIARecord[];
  stats: RegistrySummaryStats;
  activeRiskFilter: 'ALL' | RiskLevel;
  onSelectRiskFilter: (filter: 'ALL' | RiskLevel) => void;
  onViewReport: (record: DPIARecord) => void;
}

export const RegistrySummaryDashboard: React.FC<RegistrySummaryDashboardProps> = ({
  records,
  stats,
  activeRiskFilter,
  onSelectRiskFilter,
  onViewReport,
}) => {
  const hasRecords = stats.total > 0;
  const avgRiskCfg = getRiskConfig(stats.avgRiskLevel);
  const AvgRiskIcon =
    stats.avgRiskLevel === RiskLevel.HIGH
      ? ShieldAlert
      : stats.avgRiskLevel === RiskLevel.MEDIUM
      ? AlertTriangle
      : ShieldCheck;

  const avgScoreTextColor = !hasRecords
    ? 'text-slate-400'
    : stats.avgRiskLevel === RiskLevel.HIGH
    ? 'text-red-700'
    : stats.avgRiskLevel === RiskLevel.MEDIUM
    ? 'text-amber-700'
    : 'text-emerald-700';

  const handleToggleRiskFilter = (level: RiskLevel) => {
    onSelectRiskFilter(activeRiskFilter === level ? 'ALL' : level);
  };

  const riskSegments: {
    level: RiskLevel;
    label: string;
    count: number;
    pct: number;
    barClass: string;
    textClass: string;
  }[] = [
    {
      level: RiskLevel.HIGH,
      label: 'High Risk',
      count: stats.highCount,
      pct: stats.highPct,
      barClass: 'bg-red-600',
      textClass: 'text-red-700',
    },
    {
      level: RiskLevel.MEDIUM,
      label: 'Medium Risk',
      count: stats.mediumCount,
      pct: stats.mediumPct,
      barClass: 'bg-amber-500',
      textClass: 'text-amber-700',
    },
    {
      level: RiskLevel.LOW,
      label: 'Low Risk',
      count: stats.lowCount,
      pct: stats.lowPct,
      barClass: 'bg-emerald-600',
      textClass: 'text-emerald-700',
    },
  ];

  return (
    <section
      aria-label="Registry summary dashboard"
      className="bg-white border border-slate-200 rounded-lg overflow-hidden"
    >
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* 1. Total Assessments Conducted */}
        <div className="p-4 md:p-5">
          <div className="text-xs font-medium text-slate-500">Total Assessments</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
              {stats.total}
            </span>
            <span className="text-xs text-slate-500">conducted</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {hasRecords
              ? `${stats.mandatoryCount} Art. 35 mandatory (${stats.mandatoryPct}%)`
              : 'No assessments recorded yet'}
          </div>
        </div>

        {/* 2. Average Residual Risk Score */}
        <div className="p-4 md:p-5 border-l border-slate-200 lg:border-l-0">
          <div className="text-xs font-medium text-slate-500">Average Risk Score</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className={`text-2xl font-mono font-bold tabular-nums ${avgScoreTextColor}`}>
              {hasRecords ? stats.avgResidualScore.toFixed(1) : '—'}
            </span>
            {hasRecords && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${avgRiskCfg.iconColor}`}>
                <AvgRiskIcon size={13} aria-hidden="true" />
                <span className="text-slate-700">{avgRiskCfg.shortLabel}</span>
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {hasRecords
              ? `Inherent avg. ${stats.avgInherentScore.toFixed(1)} · -${stats.avgMitigationCredits.toFixed(1)} controls`
              : 'Residual score mean (pts)'}
          </div>
        </div>

        {/* 3. High-Risk Projects */}
        <div className="p-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">High-Risk Projects</span>
            {stats.highCount > 0 && (
              <button
                type="button"
                onClick={() => handleToggleRiskFilter(RiskLevel.HIGH)}
                className="text-xs font-medium text-[#0F4C81] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                {activeRiskFilter === RiskLevel.HIGH ? 'Show all' : 'Filter'}
              </button>
            )}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span
              className={`text-2xl font-mono font-bold tabular-nums ${
                stats.highCount > 0 ? 'text-red-700' : 'text-slate-900'
              }`}
            >
              {stats.highCount}
            </span>
            {hasRecords && (
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {stats.highPct}% of portfolio
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {stats.highCount > 0
              ? 'Require formal DPO approval'
              : 'No high-risk projects active'}
          </div>
        </div>

        {/* 4. Mitigation Progress */}
        <div className="p-4 md:p-5 border-l border-slate-200 lg:border-l-0">
          <div className="text-xs font-medium text-slate-500">Mitigation Completion</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
              {stats.totalActions > 0 ? `${stats.mitigationCompletionPct}%` : '—'}
            </span>
            {stats.totalActions > 0 && (
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {stats.completedActions}/{stats.totalActions}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {stats.totalActions > 0
              ? `${stats.pendingActions} open recommendation${stats.pendingActions === 1 ? '' : 's'}`
              : 'No open mitigation actions'}
          </div>
        </div>
      </div>

      {/* Secondary Portfolio Breakdown Strip */}
      <div className="border-t border-slate-200 bg-slate-50/50 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Risk Distribution Bar & Interactive Legend */}
        <div className="lg:col-span-7 px-4 py-3.5 md:px-5 space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-slate-700">Portfolio Risk Distribution</span>
            {activeRiskFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => onSelectRiskFilter('ALL')}
                className="font-medium text-[#0F4C81] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Clear risk filter
              </button>
            )}
          </div>

          {/* Stacked Proportion Bar */}
          <div
            className="h-2 w-full rounded-sm bg-slate-200 overflow-hidden flex"
            role="img"
            aria-label={
              hasRecords
                ? `Risk distribution: ${stats.highCount} high risk (${stats.highPct}%), ${stats.mediumCount} medium risk (${stats.mediumPct}%), ${stats.lowCount} low risk (${stats.lowPct}%)`
                : 'No risk distribution data'
            }
          >
            {hasRecords &&
              riskSegments.map((seg) =>
                seg.count > 0 ? (
                  <div
                    key={seg.level}
                    style={{ width: `${(seg.count / stats.total) * 100}%` }}
                    className={`${seg.barClass} h-full transition-opacity ${
                      activeRiskFilter !== 'ALL' && activeRiskFilter !== seg.level
                        ? 'opacity-30'
                        : 'opacity-100'
                    }`}
                  />
                ) : null
              )}
          </div>

          {/* Interactive Distribution Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
            {riskSegments.map((seg) => {
              const isSelected = activeRiskFilter === seg.level;
              return (
                <button
                  key={seg.level}
                  type="button"
                  onClick={() => handleToggleRiskFilter(seg.level)}
                  disabled={!hasRecords}
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-default disabled:opacity-60 ${
                    isSelected
                      ? 'text-slate-900 font-semibold underline decoration-[#0F4C81] underline-offset-4'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-xs shrink-0 ${seg.barClass}`}
                    aria-hidden="true"
                  />
                  <span>{seg.label}</span>
                  <span className="font-mono tabular-nums text-slate-900 font-medium">
                    {seg.count}
                  </span>
                  <span className="font-mono tabular-nums text-slate-400">({seg.pct}%)</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Compliance & Action Plan Progress */}
        <div className="lg:col-span-5 px-4 py-3.5 md:px-5 space-y-2.5 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-slate-700">Action Plan Implementation</span>
            <span className="font-mono tabular-nums text-slate-600">
              {stats.completedActions} of {stats.totalActions} completed
            </span>
          </div>

          <div
            className="h-2 w-full rounded-sm bg-slate-200 overflow-hidden"
            role="progressbar"
            aria-valuenow={stats.mitigationCompletionPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Action plan implementation progress"
          >
            <div
              style={{ width: `${stats.mitigationCompletionPct}%` }}
              className="h-full bg-[#0F4C81]"
            />
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>Mandatory Art. 35 scope</span>
            <span className="font-mono tabular-nums text-slate-700">
              {stats.mandatoryCount}/{stats.total} projects
            </span>
          </div>
        </div>
      </div>

      {/* Risk History Over Time Chart */}
      <RiskHistoryChart records={records} onViewReport={onViewReport} />
    </section>
  );
};
