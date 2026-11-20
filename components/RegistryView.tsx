import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DPIARecord, RiskLevel } from '../types';
import { getRiskConfig } from '../utils/riskLogic';
import { generateRegistryPdf } from '../utils/pdfExport';
import {
  RegistrySummaryDashboard,
  RegistrySummaryStats,
} from './RegistrySummaryDashboard';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Eye,
  FileDown,
  FilePlus2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

interface RegistryViewProps {
  records: DPIARecord[];
  onViewReport: (record: DPIARecord) => void;
  onDuplicate: (record: DPIARecord) => void;
  onDelete: (recordId: string) => void;
  onNewAssessment: () => void;
}

type RiskFilter = 'ALL' | RiskLevel;

export const RegistryView: React.FC<RegistryViewProps> = ({
  records,
  onViewReport,
  onDuplicate,
  onDelete,
  onNewAssessment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('ALL');
  const [jsonExported, setJsonExported] = useState(false);
  const [pdfExported, setPdfExported] = useState(false);
  const jsonTimerRef = useRef<number | null>(null);
  const pdfTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (jsonTimerRef.current !== null) window.clearTimeout(jsonTimerRef.current);
      if (pdfTimerRef.current !== null) window.clearTimeout(pdfTimerRef.current);
    };
  }, []);

  const stats: RegistrySummaryStats = useMemo(() => {
    const total = records.length;
    const highCount = records.filter((r) => r.result.riskLevel === RiskLevel.HIGH).length;
    const mediumCount = records.filter((r) => r.result.riskLevel === RiskLevel.MEDIUM).length;
    const lowCount = records.filter((r) => r.result.riskLevel === RiskLevel.LOW).length;
    const mandatoryCount = records.filter((r) => r.result.dpiaMandatory).length;

    const totalResidualScore = records.reduce((sum, r) => sum + r.result.residualScore, 0);
    const totalInherentScore = records.reduce((sum, r) => sum + r.result.inherentScore, 0);
    const totalMitigationCredits = records.reduce(
      (sum, r) => sum + r.result.mitigationCredits,
      0
    );

    const avgResidualScore = total > 0 ? totalResidualScore / total : 0;
    const avgInherentScore = total > 0 ? totalInherentScore / total : 0;
    const avgMitigationCredits = total > 0 ? totalMitigationCredits / total : 0;

    const avgRiskLevel =
      avgResidualScore >= 9
        ? RiskLevel.HIGH
        : avgResidualScore >= 4
        ? RiskLevel.MEDIUM
        : RiskLevel.LOW;

    const totalActions = records.reduce((sum, r) => sum + r.result.recommendations.length, 0);
    const completedActions = records.reduce(
      (sum, r) => sum + Math.min(r.checkedActionIds.length, r.result.recommendations.length),
      0
    );
    const pendingActions = Math.max(0, totalActions - completedActions);

    return {
      total,
      highCount,
      mediumCount,
      lowCount,
      highPct: total > 0 ? Math.round((highCount / total) * 100) : 0,
      mediumPct: total > 0 ? Math.round((mediumCount / total) * 100) : 0,
      lowPct: total > 0 ? Math.round((lowCount / total) * 100) : 0,
      avgResidualScore,
      avgInherentScore,
      avgMitigationCredits,
      avgRiskLevel,
      mandatoryCount,
      mandatoryPct: total > 0 ? Math.round((mandatoryCount / total) * 100) : 0,
      totalActions,
      completedActions,
      pendingActions,
      mitigationCompletionPct:
        totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
    };
  }, [records]);

  const handleExportRegistryJson = () => {
    if (records.length === 0) return;

    const payload = {
      exportType: 'enterprise-dpia-registry',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      summary: {
        totalAssessments: stats.total,
        averageResidualScore: Number(stats.avgResidualScore.toFixed(2)),
        averageInherentScore: Number(stats.avgInherentScore.toFixed(2)),
        highResidualRisk: stats.highCount,
        mediumResidualRisk: stats.mediumCount,
        lowResidualRisk: stats.lowCount,
        mandatoryDpiaCount: stats.mandatoryCount,
        completedActions: stats.completedActions,
        pendingActions: stats.pendingActions,
      },
      records,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateSlug = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `dpia-registry-${dateSlug}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setJsonExported(true);
    if (jsonTimerRef.current !== null) window.clearTimeout(jsonTimerRef.current);
    jsonTimerRef.current = window.setTimeout(() => setJsonExported(false), 2200);
  };

  const handleExportRegistryPdf = () => {
    if (records.length === 0) return;

    generateRegistryPdf(records);

    setPdfExported(true);
    if (pdfTimerRef.current !== null) window.clearTimeout(pdfTimerRef.current);
    pdfTimerRef.current = window.setTimeout(() => setPdfExported(false), 2200);
  };

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((rec) => {
      const matchesRisk = riskFilter === 'ALL' || rec.result.riskLevel === riskFilter;
      if (!matchesRisk) return false;
      if (!q) return true;
      return (
        rec.formData.projectName.toLowerCase().includes(q) ||
        rec.formData.department.toLowerCase().includes(q) ||
        rec.formData.ownerName.toLowerCase().includes(q)
      );
    });
  }, [records, riskFilter, searchQuery]);

  const isExportDisabled = records.length === 0;

  return (
    <div className="space-y-6">
      {/* Registry Header & Bulk Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">DPIA Registry</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {records.length === 0
              ? 'No registered assessments available for export.'
              : `Portfolio overview and complete inventory (${records.length} assessment${records.length === 1 ? '' : 's'}).`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportRegistryJson}
            disabled={isExportDisabled}
            title={
              isExportDisabled
                ? 'No assessments to export'
                : `Export all ${records.length} assessments as JSON`
            }
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            {jsonExported ? (
              <Check size={14} className="text-emerald-600" />
            ) : (
              <Download size={14} />
            )}
            {jsonExported ? 'JSON Exported' : 'Export All (JSON)'}
          </button>

          <button
            type="button"
            onClick={handleExportRegistryPdf}
            disabled={isExportDisabled}
            title={
              isExportDisabled
                ? 'No assessments to export'
                : `Export all ${records.length} assessments as PDF`
            }
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-[#0c3c66] rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0F4C81]"
          >
            {pdfExported ? <Check size={14} /> : <FileDown size={14} />}
            {pdfExported ? 'PDF Exported' : 'Export All (PDF)'}
          </button>
        </div>
      </div>

      {/* Summary Dashboard */}
      <RegistrySummaryDashboard
        records={records}
        stats={stats}
        activeRiskFilter={riskFilter}
        onSelectRiskFilter={setRiskFilter}
        onViewReport={onViewReport}
      />

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by project, department, or owner..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0F4C81]"
            />
          </div>

          <div
            role="group"
            aria-label="Filter by risk level"
            className="inline-flex items-center p-1 bg-slate-100 rounded-md self-start md:self-auto"
          >
            {(
              [
                { key: 'ALL', label: 'All' },
                { key: RiskLevel.HIGH, label: 'High Risk' },
                { key: RiskLevel.MEDIUM, label: 'Medium Risk' },
                { key: RiskLevel.LOW, label: 'Low Risk' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setRiskFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  riskFilter === tab.key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table or Empty State */}
        {records.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <h3 className="text-base font-semibold text-slate-900">
              No DPIA assessments registered
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Start a new impact assessment to calculate GDPR residual risk and generate the
              official mitigation report.
            </p>
            <button
              type="button"
              onClick={onNewAssessment}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F4C81] hover:bg-[#0c3c66] rounded-md transition-colors cursor-pointer"
            >
              <FilePlus2 size={16} />
              Create First DPIA
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-medium text-slate-800">
              No records match the current filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setRiskFilter('ALL');
              }}
              className="text-xs font-medium text-[#0F4C81] hover:underline cursor-pointer"
            >
              Clear search and filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Project / Process</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4 text-right">Score (Inh. / Res.)</th>
                  <th className="py-3 px-4 text-right">Mitigations</th>
                  <th className="py-3 px-4 text-right">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredRecords.map((rec) => {
                  const cfg = getRiskConfig(rec.result.riskLevel);
                  const RiskIcon =
                    rec.result.riskLevel === RiskLevel.HIGH
                      ? ShieldAlert
                      : rec.result.riskLevel === RiskLevel.MEDIUM
                      ? AlertTriangle
                      : ShieldCheck;
                  const doneCount = rec.checkedActionIds.length;
                  const totalActions = rec.result.recommendations.length;

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onViewReport(rec)}
                          className="font-semibold text-slate-900 hover:text-[#0F4C81] text-left cursor-pointer"
                        >
                          {rec.formData.projectName}
                        </button>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>{rec.formData.ownerName || 'Owner not defined'}</span>
                          {rec.result.dpiaMandatory && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-red-700 font-medium">Art. 35 Mandatory</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{rec.formData.department}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 font-medium text-xs ${cfg.iconColor}`}>
                          <RiskIcon size={14} />
                          <span className="text-slate-900">{cfg.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                        {rec.result.inherentScore} / {rec.result.residualScore}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {doneCount}/{totalActions}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                        {new Date(rec.createdAtIso).toLocaleDateString('en-US')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onViewReport(rec)}
                            title="Open report"
                            className="p-1.5 text-slate-600 hover:text-[#0F4C81] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicate(rec)}
                            title="Reassess / Duplicate"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          >
                            <Copy size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(rec.id)}
                            title="Delete assessment"
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
