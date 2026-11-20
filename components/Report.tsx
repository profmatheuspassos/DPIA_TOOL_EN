import React, { useEffect, useState } from 'react';
import { DPIARecord, RiskLevel } from '../types';
import {
  getRiskConfig,
  LEGAL_BASIS_LABELS,
  TRANSFER_MECHANISM_LABELS,
} from '../utils/riskLogic';
import { generateDpiaPdf } from '../utils/pdfExport';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileDown,
  FileText,
  Printer,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

interface ReportProps {
  record: DPIARecord;
  onToggleAction: (recordId: string, actionId: string) => void;
  onDuplicateToForm: (record: DPIARecord) => void;
  onBackToRegistry: () => void;
}

const PRIORITY_LABELS: Record<string, string> = {
  Crítica: 'Critical',
  Alta: 'High',
  Moderada: 'Moderate',
};

const CATEGORY_LABELS: Record<string, string> = {
  Governança: 'Governance',
  'Segurança Técnica': 'Technical Security',
  'Direitos dos Titulares': 'Data Subject Rights',
  'Transferência Internacional': 'International Transfer',
};

export const Report: React.FC<ReportProps> = ({
  record,
  onToggleAction,
  onDuplicateToForm,
  onBackToRegistry,
}) => {
  const { formData, result, checkedActionIds } = record;
  const residualConfig = getRiskConfig(result.riskLevel);
  const inherentConfig = getRiskConfig(result.inherentRiskLevel);
  const [copiedMd, setCopiedMd] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [printNotice, setPrintNotice] = useState(false);

  const RiskIcon =
    result.riskLevel === RiskLevel.HIGH
      ? ShieldAlert
      : result.riskLevel === RiskLevel.MEDIUM
      ? AlertTriangle
      : ShieldCheck;

  const activeDataNature = [
    formData.dataNature.cadastral && 'Registration Data',
    formData.dataNature.financial && 'Financial Data',
    formData.dataNature.behavioral && 'Location / Behavioral',
    formData.dataNature.sensitive && 'Sensitive Data (Art. 9)',
    formData.dataNature.criminal && 'Criminal Convictions (Art. 10)',
  ].filter(Boolean) as string[];

  const activeSubjects = [
    formData.dataSubjects.general && 'Customers / Users',
    formData.dataSubjects.employees && 'Employees',
    formData.dataSubjects.patients && 'Patients',
    formData.dataSubjects.children && 'Children / Minors',
  ].filter(Boolean) as string[];

  const activeControls = [
    { key: 'encryption', label: 'Encryption at rest and in transit', enabled: formData.existingControls.encryption },
    { key: 'pseudonymization', label: 'Pseudonymization / Anonymization', enabled: formData.existingControls.pseudonymization },
    { key: 'accessControlMfa', label: 'Access control (RBAC) + MFA', enabled: formData.existingControls.accessControlMfa },
    { key: 'retentionAutomation', label: 'Automated retention purging', enabled: formData.existingControls.retentionAutomation },
    { key: 'dpoConsulted', label: 'Prior DPO consultation', enabled: formData.existingControls.dpoConsulted },
  ];

  const triggeredCriteria = result.triggeredCriteria.filter((c) => c.triggered);
  const basisInfo = LEGAL_BASIS_LABELS[formData.legalBasis];

  const buildMarkdown = () => {
    const lines = [
      `# DPIA Report — ${formData.projectName || 'Untitled project'}`,
      `Department: ${formData.department || 'N/A'} | Owner: ${formData.ownerName || 'N/A'} | Generated on: ${result.timestamp}`,
      ``,
      `## Risk Classification`,
      `- **Residual Risk:** ${residualConfig.label} (${result.residualScore} pts)`,
      `- **Inherent Risk:** ${inherentConfig.label} (${result.inherentScore} pts) · Applied mitigation: -${result.mitigationCredits} pts`,
      `- **Mandatory DPIA (Art. 35 GDPR):** ${result.dpiaMandatory ? 'Yes' : 'No'} — ${result.mandatoryReason}`,
      ``,
      `## Scope & Legal Basis`,
      `- **Legal Basis:** ${basisInfo.article} — ${basisInfo.label}`,
      `- **Retention:** ${formData.retentionPeriod || 'Not specified'}`,
      `- **Data:** ${activeDataNature.join(', ') || 'None selected'}`,
      `- **Data Subjects:** ${activeSubjects.join(', ') || 'None selected'}`,
      `- **International Transfer:** ${formData.intlTransfer ? TRANSFER_MECHANISM_LABELS[formData.transferMechanism] : 'No'}`,
      ``,
      `## Action Plan & Mitigations`,
      ...result.recommendations.map(
        (rec, idx) =>
          `${idx + 1}. [${PRIORITY_LABELS[rec.priority] || rec.priority} · ${rec.articleRef}] ${rec.text} (${
            checkedActionIds.includes(rec.id) ? 'Completed' : 'Pending'
          })`
      ),
    ];
    return lines.join('\n');
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdown());
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    } catch {
      // Fallback ignored in restricted frames
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const slug = (formData.projectName || 'dpia-report')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    link.download = `${slug || 'dpia-report'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    generateDpiaPdf(record);
    setPdfGenerated(true);
    setTimeout(() => setPdfGenerated(false), 2500);
  };

  useEffect(() => {
    return () => {
      document.body.classList.remove('printing-dpia-report');
      delete document.body.dataset.printReport;
    };
  }, []);

  const handlePrint = () => {
    const isEmbedded = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    const previousTitle = document.title;
    const projectLabel = formData.projectName?.trim() || 'Report';
    document.title = `DPIA - ${projectLabel}`;
    document.body.classList.add('printing-dpia-report');
    document.body.dataset.printReport = 'true';

    let didFireBeforePrint = false;
    const markBeforePrint = () => {
      didFireBeforePrint = true;
    };

    const cleanupAfterPrint = () => {
      document.body.classList.remove('printing-dpia-report');
      delete document.body.dataset.printReport;
      document.title = previousTitle;
      window.removeEventListener('beforeprint', markBeforePrint);
      window.removeEventListener('afterprint', cleanupAfterPrint);
    };

    window.addEventListener('beforeprint', markBeforePrint);
    window.addEventListener('afterprint', cleanupAfterPrint);

    window.requestAnimationFrame(() => {
      try {
        window.print();
      } catch {
        cleanupAfterPrint();
      }

      if (!didFireBeforePrint) {
        cleanupAfterPrint();
        if (isEmbedded) {
          setPrintNotice(true);
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar (Hidden on Print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToRegistry}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft size={16} />
          Back to Registry
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onDuplicateToForm(record)}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Edit / Reassess
          </button>
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedMd ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copiedMd ? 'Summary Copied' : 'Copy Markdown'}
          </button>
          <button
            type="button"
            onClick={handleDownloadJson}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download size={14} />
            Export JSON
          </button>
          <button
            type="button"
            onClick={handlePrint}
            aria-label="Print or export PDF via browser"
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer size={14} />
            Print / PDF
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-[#0c3c66] rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {pdfGenerated ? <Check size={14} /> : <FileDown size={14} />}
            {pdfGenerated ? 'PDF Downloaded' : 'Download PDF'}
          </button>
        </div>
      </div>

      {printNotice && (
        <div
          role="status"
          className="no-print bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-xs text-amber-900 flex items-center justify-between gap-3"
        >
          <span>
            In this embedded preview environment, the browser may block the system print dialog.
            Use the <strong>Download PDF</strong> button to generate and save the A4 report.
          </span>
          <button
            type="button"
            onClick={() => setPrintNotice(false)}
            className="font-semibold text-amber-900 hover:underline shrink-0 cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      {/* Main Printable Report Document */}
      <article className="bg-white border border-slate-200 rounded-lg overflow-hidden print-full-width">
        {/* Document Header */}
        <header className="p-6 md:p-8 border-b border-slate-200 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
              <span>Data Protection Impact Assessment Report (DPIA)</span>
              <span aria-hidden="true">·</span>
              <span>GDPR Art. 35</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{result.timestamp}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1.5">
              {formData.projectName || 'Untitled project'}
            </h1>
            <div className="text-sm text-slate-600 mt-1 flex flex-wrap items-center gap-2">
              <span>{formData.department || 'Department not specified'}</span>
              {formData.ownerName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Owner: {formData.ownerName}</span>
                </>
              )}
            </div>
          </div>

          <div className="text-left md:text-right shrink-0">
            <div className="text-xs text-slate-500">Art. 35 Classification</div>
            <div
              className={`text-sm font-semibold mt-0.5 ${
                result.dpiaMandatory ? 'text-red-700' : 'text-slate-800'
              }`}
            >
              {result.dpiaMandatory ? 'Mandatory DPIA' : 'Preliminary Screening'}
            </div>
          </div>
        </header>

        <div className="p-6 md:p-8 space-y-8">
          {/* Risk Summary Row */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 print-break-inside-avoid">
            <div
              className={`lg:col-span-7 p-5 rounded-md border flex items-start gap-4 ${residualConfig.containerClass}`}
            >
              <div className="p-2.5 bg-white rounded-md border border-current/15 shrink-0">
                <RiskIcon size={28} className={residualConfig.iconColor} />
              </div>
              <div>
                <div className="text-xs font-medium opacity-80">Calculated Residual Risk</div>
                <div className="text-2xl font-bold mt-0.5">{residualConfig.label}</div>
                <p className="text-sm mt-1.5 leading-relaxed opacity-90">{residualConfig.message}</p>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-3 border border-slate-200 rounded-md divide-x divide-slate-200 bg-slate-50/50">
              <div className="p-4 flex flex-col justify-center">
                <div className="text-xs text-slate-500">Inherent Risk</div>
                <div className="text-2xl font-mono font-bold text-slate-900 tabular-nums mt-1">
                  {result.inherentScore}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">{inherentConfig.shortLabel}</div>
              </div>
              <div className="p-4 flex flex-col justify-center">
                <div className="text-xs text-slate-500">Controls</div>
                <div className="text-2xl font-mono font-bold text-emerald-700 tabular-nums mt-1">
                  -{result.mitigationCredits}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">Mitigation</div>
              </div>
              <div className="p-4 flex flex-col justify-center">
                <div className="text-xs text-slate-500">Residual Score</div>
                <div className="text-2xl font-mono font-bold text-slate-900 tabular-nums mt-1">
                  {result.residualScore}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">{residualConfig.shortLabel}</div>
              </div>
            </div>
          </section>

          {/* Scope & Legal Basis Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-200 print-break-inside-avoid">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileText size={15} className="text-slate-500" />
                Scope, Legal Basis & Retention
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100">
                  <dt className="text-slate-500">Legal Basis (Art. 6)</dt>
                  <dd className="font-medium text-slate-900 text-right">
                    {basisInfo.article} — {basisInfo.label}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100">
                  <dt className="text-slate-500">Scale</dt>
                  <dd className="font-medium text-slate-900 text-right">
                    {formData.scale === 'LARGE'
                      ? 'Large Scale / National'
                      : formData.scale === 'MEDIUM'
                      ? 'Medium Scale / Regional'
                      : 'Small Scale / Local'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100">
                  <dt className="text-slate-500">Defined Retention</dt>
                  <dd className="font-medium text-slate-900 text-right">
                    {formData.retentionPeriod || 'Not specified'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100">
                  <dt className="text-slate-500">International Transfer</dt>
                  <dd className="font-medium text-slate-900 text-right">
                    {formData.intlTransfer
                      ? TRANSFER_MECHANISM_LABELS[formData.transferMechanism]
                      : 'Not applicable'}
                  </dd>
                </div>
              </dl>
              {formData.purposeDescription && (
                <div className="pt-1">
                  <div className="text-xs font-medium text-slate-500 mb-1">Declared Purpose</div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {formData.purposeDescription}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 mb-2">
                  Processed Data & Data Subjects
                </h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">Data Categories</span>
                    <span className="text-slate-800 font-medium">
                      {activeDataNature.length > 0 ? activeDataNature.join(' · ') : 'None specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Data Subject Groups</span>
                    <span className="text-slate-800 font-medium">
                      {activeSubjects.length > 0 ? activeSubjects.join(' · ') : 'None specified'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  Declared Existing Controls
                </h3>
                <ul className="space-y-1.5">
                  {activeControls.map((ctrl) => (
                    <li key={ctrl.key} className="flex items-center justify-between text-xs">
                      <span className={ctrl.enabled ? 'text-slate-800' : 'text-slate-400'}>
                        {ctrl.label}
                      </span>
                      <span
                        className={`font-mono font-medium ${
                          ctrl.enabled ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {ctrl.enabled ? 'Active' : 'Absent'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* WP29 Trigger Evaluation */}
          <section className="pt-6 border-t border-slate-200 space-y-3 print-break-inside-avoid">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Mandatory Status Assessment (Art. 35 & EDPB/WP248 Criteria)
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">{result.mandatoryReason}</p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-600 shrink-0">
                {triggeredCriteria.length} of 9 criteria active
              </span>
            </div>

            {triggeredCriteria.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {triggeredCriteria.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-md border border-slate-200 bg-slate-50/70 space-y-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                      <CheckCircle2 size={15} className="text-[#0F4C81] shrink-0 mt-0.5" />
                    </div>
                    <div className="text-xs font-mono text-slate-500">{item.articleRef}</div>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-3">
                None of the 9 WP248 high-risk criteria were triggered for this operation.
              </p>
            )}
          </section>

          {/* Action Plan & Recommendations */}
          <section className="pt-6 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Action Plan & Mitigation Measures
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Check off items as they are implemented or validated with the DPO.
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-600">
                {checkedActionIds.length} / {result.recommendations.length} completed
              </span>
            </div>

            {result.recommendations.length > 0 ? (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                {result.recommendations.map((rec, index) => {
                  const isDone = checkedActionIds.includes(rec.id);
                  const priorityColor =
                    rec.priority === 'Crítica'
                      ? 'text-red-700'
                      : rec.priority === 'Alta'
                      ? 'text-amber-700'
                      : 'text-slate-600';

                  return (
                    <label
                      key={rec.id}
                      className={`flex items-start gap-3.5 p-4 cursor-pointer transition-colors print-break-inside-avoid ${
                        isDone ? 'bg-slate-50/70' : 'bg-white hover:bg-slate-50/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => onToggleAction(record.id, rec.id)}
                        className="mt-1 w-4 h-4 rounded border-slate-300 accent-[#0F4C81] no-print"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                          <span className="font-mono font-semibold text-slate-500 tabular-nums">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className={`font-semibold ${priorityColor}`}>
                            {PRIORITY_LABELS[rec.priority] || rec.priority} Priority
                          </span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="text-slate-600">
                            {CATEGORY_LABELS[rec.category] || rec.category}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="font-mono text-slate-500">{rec.articleRef}</span>
                        </div>
                        <p
                          className={`text-sm leading-relaxed ${
                            isDone ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}
                        >
                          {rec.text}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-4">
                No additional critical recommendations identified. Maintain annual review in the ROPA inventory.
              </p>
            )}
          </section>

          {/* Footer / Sign-off */}
          <footer className="pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-500 print-break-inside-avoid">
            <div>
              <p className="font-medium text-slate-700">Methodological Note</p>
              <p className="mt-1 leading-relaxed">
                Structured assessment under Art. 35 of Regulation (EU) 2016/679 (GDPR) and EDPB
                WP248 rev.01 guidelines. This document supports corporate governance and does not
                replace formal legal advice.
              </p>
            </div>
            <div className="md:text-right flex flex-col justify-end">
              <div className="border-t border-slate-300 pt-2 mt-4 md:ml-auto md:w-64 text-slate-600">
                DPO / Privacy Committee Sign-off · Date: ____/____/______
              </div>
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
};