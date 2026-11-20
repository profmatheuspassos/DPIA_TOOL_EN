import { jsPDF } from 'jspdf';
import { DPIARecord, RiskLevel } from '../types';
import {
  getRiskConfig,
  LEGAL_BASIS_LABELS,
  TRANSFER_MECHANISM_LABELS,
} from './riskLogic';

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

const RISK_COLORS: Record<
  RiskLevel,
  {
    bg: [number, number, number];
    border: [number, number, number];
    text: [number, number, number];
  }
> = {
  [RiskLevel.HIGH]: { bg: [254, 242, 242], border: [254, 202, 202], text: [153, 27, 27] },
  [RiskLevel.MEDIUM]: { bg: [255, 251, 235], border: [253, 230, 138], text: [146, 64, 14] },
  [RiskLevel.LOW]: { bg: [236, 253, 245], border: [167, 243, 208], text: [6, 95, 70] },
};

const renderRecordContent = (
  doc: jsPDF,
  record: DPIARecord,
  headerSubtitle: string
): void => {
  const { formData, result, checkedActionIds } = record;
  const residualCfg = getRiskConfig(result.riskLevel);
  const inherentCfg = getRiskConfig(result.inherentRiskLevel);
  const basisInfo = LEGAL_BASIS_LABELS[formData.legalBasis];

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 18) {
      doc.addPage();
      y = 18;
    }
  };

  const drawDivider = () => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  const writeWrapped = (
    text: string,
    x: number,
    maxW: number,
    lineHeight = 4.8,
    fontSize = 9.5,
    color: [number, number, number] = [51, 65, 85],
    fontStyle: 'normal' | 'bold' = 'normal'
  ) => {
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, maxW) as string[];
    for (const line of lines) {
      ensureSpace(lineHeight + 2);
      doc.text(line, x, y);
      y += lineHeight;
    }
  };

  // Header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(headerSubtitle, margin, y);
  y += 6.5;

  writeWrapped(
    formData.projectName || 'Untitled project',
    margin,
    contentWidth,
    6.5,
    16,
    [15, 23, 42],
    'bold'
  );

  const metaParts = [
    `Department: ${formData.department || 'Not specified'}`,
    formData.ownerName ? `Owner: ${formData.ownerName}` : null,
    result.dpiaMandatory
      ? 'Classification: Mandatory DPIA (Art. 35)'
      : 'Classification: Preliminary Screening',
  ].filter(Boolean) as string[];

  writeWrapped(metaParts.join('  |  '), margin, contentWidth, 4.8, 9, [71, 85, 105], 'normal');
  y += 2;
  drawDivider();

  // Risk Box
  ensureSpace(26);
  const rc = RISK_COLORS[result.riskLevel];
  doc.setFillColor(rc.bg[0], rc.bg[1], rc.bg[2]);
  doc.setDrawColor(rc.border[0], rc.border[1], rc.border[2]);
  doc.roundedRect(margin, y, contentWidth, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(rc.text[0], rc.text[1], rc.text[2]);
  doc.text(`Residual Risk: ${residualCfg.label}`, margin + 4, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    `Inherent: ${result.inherentScore} (${inherentCfg.shortLabel})  |  Controls: -${result.mitigationCredits}  |  Residual: ${result.residualScore} pts`,
    margin + 4,
    y + 13
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const messageLines = doc.splitTextToSize(residualCfg.message, contentWidth - 8) as string[];
  doc.text(messageLines[0] || '', margin + 4, y + 18.5);
  y += 28;

  // Scope & Legal Basis
  ensureSpace(16);
  writeWrapped(
    '1. Scope, Legal Basis, and Data Categories',
    margin,
    contentWidth,
    5.5,
    11.5,
    [15, 23, 42],
    'bold'
  );
  y += 1;

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

  const scaleLabel =
    formData.scale === 'LARGE'
      ? 'Large Scale / National'
      : formData.scale === 'MEDIUM'
      ? 'Medium Scale / Regional'
      : 'Small Scale / Local';

  const scopeRows: [string, string][] = [
    ['Legal Basis (Art. 6)', `${basisInfo.article} — ${basisInfo.label}`],
    ['Processing Scale', scaleLabel],
    ['Retention Period', formData.retentionPeriod || 'Not specified'],
    [
      'International Transfer',
      formData.intlTransfer
        ? TRANSFER_MECHANISM_LABELS[formData.transferMechanism]
        : 'Not applicable',
    ],
    ['Data Categories', activeDataNature.join(', ') || 'None specified'],
    ['Data Subject Groups', activeSubjects.join(', ') || 'None specified'],
  ];

  for (const [label, val] of scopeRows) {
    ensureSpace(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const valLines = doc.splitTextToSize(val, contentWidth - 48) as string[];
    doc.text(valLines, margin + 48, y);
    y += Math.max(5.2, valLines.length * 4.5);
  }

  if (formData.purposeDescription) {
    y += 1.5;
    writeWrapped(
      `Declared purpose: ${formData.purposeDescription}`,
      margin,
      contentWidth,
      4.6,
      9,
      [51, 65, 85],
      'normal'
    );
  }

  // Existing Controls
  y += 2;
  const controls = [
    formData.existingControls.encryption && 'Encryption at rest/in transit',
    formData.existingControls.pseudonymization && 'Pseudonymization/Anonymization',
    formData.existingControls.accessControlMfa && 'RBAC + MFA',
    formData.existingControls.retentionAutomation && 'Automated purging',
    formData.existingControls.dpoConsulted && 'Prior DPO consultation',
  ].filter(Boolean) as string[];

  writeWrapped(
    `Declared active controls: ${controls.length > 0 ? controls.join(' · ') : 'No controls selected'}`,
    margin,
    contentWidth,
    4.6,
    9,
    [15, 23, 42],
    'normal'
  );

  y += 3;
  drawDivider();

  // WP29 Triggers
  ensureSpace(16);
  const triggered = result.triggeredCriteria.filter((c) => c.triggered);
  writeWrapped(
    `2. Art. 35 Mandatory Status & EDPB/WP248 Criteria (${triggered.length}/9 active)`,
    margin,
    contentWidth,
    5.5,
    11.5,
    [15, 23, 42],
    'bold'
  );
  writeWrapped(result.mandatoryReason, margin, contentWidth, 4.6, 9, [71, 85, 105], 'normal');
  y += 1.5;

  if (triggered.length > 0) {
    for (const item of triggered) {
      ensureSpace(11);
      writeWrapped(
        `• ${item.label} (${item.articleRef})`,
        margin + 2,
        contentWidth - 2,
        4.6,
        9.2,
        [15, 23, 42],
        'bold'
      );
      writeWrapped(item.detail, margin + 5, contentWidth - 5, 4.4, 8.5, [71, 85, 105], 'normal');
      y += 1;
    }
  } else {
    writeWrapped(
      'None of the 9 WP248 high-risk criteria were triggered.',
      margin,
      contentWidth,
      4.6,
      9,
      [71, 85, 105],
      'normal'
    );
  }

  y += 3;
  drawDivider();

  // Recommendations
  ensureSpace(16);
  writeWrapped(
    `3. Action Plan & Mitigation Measures (${checkedActionIds.length}/${result.recommendations.length} completed)`,
    margin,
    contentWidth,
    5.5,
    11.5,
    [15, 23, 42],
    'bold'
  );
  y += 1;

  if (result.recommendations.length > 0) {
    result.recommendations.forEach((rec, idx) => {
      const done = checkedActionIds.includes(rec.id);
      const priorityLabel = PRIORITY_LABELS[rec.priority] || rec.priority;
      const categoryLabel = CATEGORY_LABELS[rec.category] || rec.category;
      const header = `${String(idx + 1).padStart(2, '0')}. [${priorityLabel} Priority · ${categoryLabel} · ${rec.articleRef}] ${done ? '(Completed)' : '(Pending)'}`;
      ensureSpace(12);
      writeWrapped(header, margin, contentWidth, 4.5, 8.5, [15, 76, 129], 'bold');
      writeWrapped(rec.text, margin + 4, contentWidth - 4, 4.6, 9.2, [30, 41, 59], 'normal');
      y += 1.5;
    });
  } else {
    writeWrapped(
      'No additional critical recommendations identified. Maintain annual review in ROPA.',
      margin,
      contentWidth,
      4.6,
      9,
      [71, 85, 105],
      'normal'
    );
  }

  // Sign-off footer block
  y += 4;
  ensureSpace(24);
  drawDivider();
  writeWrapped(
    'Methodological Note: Preliminary structured assessment under Art. 35 of Regulation (EU) 2016/679 (GDPR) and EDPB WP248 rev.01 guidelines. Does not replace formal legal advice.',
    margin,
    contentWidth,
    4.2,
    8,
    [100, 116, 139],
    'normal'
  );
  y += 8;
  doc.setDrawColor(148, 163, 184);
  doc.line(margin, y, margin + 85, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DPO / Privacy Committee Sign-off · Date: ____/____/______', margin, y);
};

const addPageFooters = (doc: jsPDF, label: string): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const totalPages = doc.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${label} · Page ${p} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  }
};

export const generateDpiaPdf = (record: DPIARecord): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  renderRecordContent(
    doc,
    record,
    `Data Protection Impact Assessment Report (DPIA) · GDPR Art. 35 · Generated on ${record.result.timestamp}`
  );

  addPageFooters(doc, 'Enterprise DPIA Tool');

  const slug = (record.formData.projectName || 'dpia-report')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  doc.save(`${slug || 'dpia-report'}.pdf`);
};

export const generateRegistryPdf = (records: DPIARecord[]): void => {
  if (records.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const generatedTimestamp = new Date().toLocaleString('en-US');
  const dateSlug = new Date().toISOString().slice(0, 10);

  const highCount = records.filter((r) => r.result.riskLevel === RiskLevel.HIGH).length;
  const mediumCount = records.filter((r) => r.result.riskLevel === RiskLevel.MEDIUM).length;
  const lowCount = records.filter((r) => r.result.riskLevel === RiskLevel.LOW).length;
  const mandatoryCount = records.filter((r) => r.result.dpiaMandatory).length;
  const pendingActions = records.reduce(
    (sum, r) => sum + Math.max(0, r.result.recommendations.length - r.checkedActionIds.length),
    0
  );

  // Cover / Executive Overview Header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Enterprise DPIA Registry Export · GDPR Art. 35 · Generated on ${generatedTimestamp}`,
    margin,
    y
  );
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text('Data Protection Impact Assessment Registry', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Complete inventory of ${records.length} registered assessment${records.length === 1 ? '' : 's'} (${highCount} High, ${mediumCount} Medium, ${lowCount} Low residual risk).`,
    margin,
    y
  );
  y += 5;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // KPI Strip (4 cards)
  const kpiGap = 3;
  const kpiWidth = (contentWidth - kpiGap * 3) / 4;
  const kpiHeight = 20;
  const kpis: {
    label: string;
    value: string;
    sub: string;
    valueColor: [number, number, number];
  }[] = [
    {
      label: 'Registered DPIAs',
      value: String(records.length),
      sub: 'Active inventory',
      valueColor: [15, 23, 42],
    },
    {
      label: 'High Residual Risk',
      value: String(highCount),
      sub: 'DPO approval needed',
      valueColor: [185, 28, 28],
    },
    {
      label: 'Mandatory (Art. 35)',
      value: String(mandatoryCount),
      sub: 'WP248 / Art. 35(3)',
      valueColor: [15, 23, 42],
    },
    {
      label: 'Pending Actions',
      value: String(pendingActions),
      sub: 'Open mitigations',
      valueColor: [15, 23, 42],
    },
  ];

  kpis.forEach((kpi, i) => {
    const x = margin + i * (kpiWidth + kpiGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, kpiWidth, kpiHeight, 1.2, 1.2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(kpi.valueColor[0], kpi.valueColor[1], kpi.valueColor[2]);
    doc.text(kpi.value, x + 3, y + 12.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, x + 3, y + 17.2);
  });

  y += kpiHeight + 8;

  // Overview Table Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Registry Summary Table', margin, y);
  y += 5;

  // Column definitions (total = 178mm)
  const cols = [
    { label: '#', x: margin, width: 8, align: 'left' as const },
    { label: 'Project / Process', x: margin + 8, width: 58, align: 'left' as const },
    { label: 'Department', x: margin + 66, width: 30, align: 'left' as const },
    { label: 'Risk Level', x: margin + 96, width: 24, align: 'left' as const },
    { label: 'Score', x: margin + 120, width: 18, align: 'right' as const },
    { label: 'Actions', x: margin + 138, width: 18, align: 'right' as const },
    { label: 'Date', x: margin + 156, width: 22, align: 'right' as const },
  ];

  const drawTableHeader = () => {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 7, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(71, 85, 105);

    cols.forEach((col) => {
      const textX = col.align === 'right' ? col.x + col.width - 2 : col.x + 2;
      doc.text(col.label, textX, y + 4.8, { align: col.align });
    });
    y += 7;
  };

  drawTableHeader();

  records.forEach((rec, index) => {
    const cfg = getRiskConfig(rec.result.riskLevel);
    const projectLines = doc.splitTextToSize(
      rec.formData.projectName || 'Untitled project',
      cols[1].width - 4
    ) as string[];
    const deptLines = doc.splitTextToSize(
      rec.formData.department || 'Not specified',
      cols[2].width - 4
    ) as string[];

    const subMetaParts = [
      rec.formData.ownerName || 'Owner not defined',
      rec.result.dpiaMandatory ? 'Art. 35 Mandatory' : null,
    ].filter(Boolean) as string[];
    const subMetaLines = doc.splitTextToSize(
      subMetaParts.join(' · '),
      cols[1].width - 4
    ) as string[];

    const projectBlockHeight = projectLines.length * 3.8 + subMetaLines.length * 3.4;
    const deptBlockHeight = deptLines.length * 3.8;
    const rowHeight = Math.max(10.5, projectBlockHeight + 3.5, deptBlockHeight + 4);

    if (y + rowHeight > pageHeight - 18) {
      doc.addPage();
      y = 18;
      drawTableHeader();
    }

    // Subtle alternating shading
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

    const textStartY = y + 4.6;

    // #
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(String(index + 1), cols[0].x + 2, textStartY);

    // Project + Owner / Mandatory sub-line
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    doc.text(projectLines, cols[1].x + 2, textStartY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(subMetaLines, cols[1].x + 2, textStartY + projectLines.length * 3.8);

    // Department
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(deptLines, cols[2].x + 2, textStartY);

    // Risk Level
    const rc = RISK_COLORS[rec.result.riskLevel];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(rc.text[0], rc.text[1], rc.text[2]);
    doc.text(cfg.shortLabel, cols[3].x + 2, textStartY);

    // Score (Inh / Res)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `${rec.result.inherentScore} / ${rec.result.residualScore}`,
      cols[4].x + cols[4].width - 2,
      textStartY,
      { align: 'right' }
    );

    // Mitigations
    doc.text(
      `${rec.checkedActionIds.length}/${rec.result.recommendations.length}`,
      cols[5].x + cols[5].width - 2,
      textStartY,
      { align: 'right' }
    );

    // Date
    doc.setTextColor(100, 116, 139);
    doc.text(
      new Date(rec.createdAtIso).toLocaleDateString('en-US'),
      cols[6].x + cols[6].width - 2,
      textStartY,
      { align: 'right' }
    );

    y += rowHeight;
  });

  // Detailed individual DPIA reports
  records.forEach((rec, index) => {
    doc.addPage();
    renderRecordContent(
      doc,
      rec,
      `DPIA Registry · Assessment ${index + 1} of ${records.length} · GDPR Art. 35 · Assessed on ${rec.result.timestamp}`
    );
  });

  addPageFooters(doc, 'Enterprise DPIA Tool · Full Registry Export');
  doc.save(`dpia-registry-${dateSlug}.pdf`);
};
