import {
  AssessmentResult,
  DPIAFormData,
  DPIARecord,
  LegalBasis,
  RecommendationItem,
  RiskLevel,
  TransferMechanism,
  WP29Trigger,
} from '../types';

export const initialFormState: DPIAFormData = {
  projectName: '',
  department: '',
  ownerName: '',
  purposeDescription: '',
  legalBasis: LegalBasis.CONTRACT,
  retentionPeriod: '5 years after relationship termination',
  dataNature: {
    cadastral: true,
    financial: false,
    sensitive: false,
    criminal: false,
    behavioral: false,
  },
  dataSubjects: {
    general: true,
    employees: false,
    children: false,
    patients: false,
  },
  scale: 'SMALL',
  autoDecision: false,
  monitoring: false,
  newTech: false,
  dataMatching: false,
  rightsRestriction: false,
  intlTransfer: false,
  transferMechanism: TransferMechanism.NONE,
  existingControls: {
    encryption: false,
    pseudonymization: false,
    accessControlMfa: false,
    retentionAutomation: false,
    dpoConsulted: false,
  },
};

export const LEGAL_BASIS_LABELS: Record<LegalBasis, { label: string; article: string }> = {
  [LegalBasis.CONSENT]: { label: 'Data Subject Consent', article: 'Art. 6(1)(a)' },
  [LegalBasis.CONTRACT]: { label: 'Performance of a Contract', article: 'Art. 6(1)(b)' },
  [LegalBasis.LEGAL_OBLIGATION]: { label: 'Legal or Regulatory Obligation', article: 'Art. 6(1)(c)' },
  [LegalBasis.VITAL_INTERESTS]: { label: 'Protection of Vital Interests', article: 'Art. 6(1)(d)' },
  [LegalBasis.PUBLIC_TASK]: { label: 'Public Interest / Official Authority', article: 'Art. 6(1)(e)' },
  [LegalBasis.LEGITIMATE_INTEREST]: { label: 'Legitimate Interest (requires LIA)', article: 'Art. 6(1)(f)' },
};

export const TRANSFER_MECHANISM_LABELS: Record<TransferMechanism, string> = {
  [TransferMechanism.NONE]: 'Not applicable (local storage)',
  [TransferMechanism.ADEQUACY]: 'Adequacy Decision (Art. 45 GDPR)',
  [TransferMechanism.SCC]: 'Standard Contractual Clauses - SCC (Art. 46 GDPR)',
  [TransferMechanism.BCR]: 'Binding Corporate Rules - BCR (Art. 47 GDPR)',
  [TransferMechanism.UNSPECIFIED]: 'Safeguard not yet defined',
};

export const evaluateWP29Criteria = (data: DPIAFormData): WP29Trigger[] => {
  const hasVulnerable =
    data.dataSubjects.children || data.dataSubjects.employees || data.dataSubjects.patients;
  const hasSensitiveOrCriminal = data.dataNature.sensitive || data.dataNature.criminal;
  const isLargeScale = data.scale === 'LARGE';

  return [
    {
      id: 'scoring',
      label: 'Evaluation or scoring (Profiling)',
      articleRef: 'WP248 Criterion 1 · Art. 35(3)(a)',
      triggered: data.autoDecision || (data.dataNature.behavioral && data.dataNature.financial),
      detail: 'Predictive analysis, financial profiling, or performance/behavioral evaluation.',
    },
    {
      id: 'auto-decision',
      label: 'Automated decision-making with legal effect',
      articleRef: 'WP248 Criterion 2 · Art. 22 & 35(3)(a)',
      triggered: data.autoDecision,
      detail: 'Decisions without meaningful human intervention affecting access to rights or services.',
    },
    {
      id: 'monitoring',
      label: 'Systematic monitoring',
      articleRef: 'WP248 Criterion 3 · Art. 35(3)(c)',
      triggered: data.monitoring,
      detail: 'Continuous observation, geolocation, telemetry, or surveillance of publicly accessible areas or employees.',
    },
    {
      id: 'sensitive',
      label: 'Sensitive or highly personal data',
      articleRef: 'WP248 Criterion 4 · Art. 9, 10 & 35(3)(b)',
      triggered: hasSensitiveOrCriminal,
      detail: 'Special categories (health, biometrics, origin, beliefs) or critical criminal/financial records.',
    },
    {
      id: 'large-scale',
      label: 'Large-scale processing',
      articleRef: 'WP248 Criterion 5 · Recital 91',
      triggered: isLargeScale,
      detail: 'Substantial volume of data subjects, national/regional coverage, or long-term processing permanence.',
    },
    {
      id: 'matching',
      label: 'Matching or combining datasets',
      articleRef: 'WP248 Criterion 6',
      triggered: data.dataMatching,
      detail: 'Combination of separate databases that exceeds the data subject\'s reasonable expectations.',
    },
    {
      id: 'vulnerable',
      label: 'Vulnerable data subjects',
      articleRef: 'WP248 Criterion 7 · Recital 75',
      triggered: hasVulnerable,
      detail: 'Children/minors, employees (power imbalance), patients, or other vulnerable groups.',
    },
    {
      id: 'new-tech',
      label: 'Innovative use of new technologies',
      articleRef: 'WP248 Criterion 8 · Art. 35(1)',
      triggered: data.newTech,
      detail: 'Application of generative/predictive AI, biometric recognition, IoT, or emerging technologies.',
    },
    {
      id: 'rights-restriction',
      label: 'Prevention of rights or service access',
      articleRef: 'WP248 Criterion 9',
      triggered: data.rightsRestriction,
      detail: 'Operations that block, restrict, or condition the exercise of a right or access to a contract.',
    },
  ];
};

const scoreToRiskLevel = (score: number, forceHigh: boolean): RiskLevel => {
  if (forceHigh || score >= 9) return RiskLevel.HIGH;
  if (score >= 4) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
};

export const calculateRisk = (data: DPIAFormData): AssessmentResult => {
  let inherentScore = 0;

  // High Impact Factors (+3)
  if (data.dataNature.sensitive) inherentScore += 3;
  if (data.dataSubjects.children) inherentScore += 3;
  if (data.dataSubjects.patients) inherentScore += 3;

  // Medium-High Impact Factors (+2)
  if (data.dataNature.criminal) inherentScore += 2;
  if (data.scale === 'LARGE') inherentScore += 2;
  if (data.scale === 'MEDIUM') inherentScore += 1;
  if (data.autoDecision) inherentScore += 2;
  if (data.monitoring) inherentScore += 2;
  if (data.dataMatching) inherentScore += 2;
  if (data.rightsRestriction) inherentScore += 2;

  // Base Factors (+1)
  if (data.dataNature.financial) inherentScore += 1;
  if (data.dataNature.behavioral) inherentScore += 1;
  if (data.dataSubjects.employees) inherentScore += 1;
  if (data.newTech) inherentScore += 1;
  if (data.intlTransfer) {
    inherentScore += data.transferMechanism === TransferMechanism.UNSPECIFIED ? 2 : 1;
  }

  // Mitigation Credits from Existing Controls (max reduction capped fairly)
  let mitigationCredits = 0;
  if (data.existingControls.encryption) mitigationCredits += 1;
  if (data.existingControls.pseudonymization) mitigationCredits += 1;
  if (data.existingControls.accessControlMfa) mitigationCredits += 1;
  if (data.existingControls.retentionAutomation) mitigationCredits += 1;
  if (data.existingControls.dpoConsulted) mitigationCredits += 1;

  const residualScore = Math.max(0, inherentScore - mitigationCredits);

  const triggeredCriteria = evaluateWP29Criteria(data);
  const triggeredCount = triggeredCriteria.filter((c) => c.triggered).length;

  // Art. 35(3) explicit triggers or >= 2 WP29 criteria => DPIA Mandatory
  const explicitArt35Trigger =
    (data.dataNature.sensitive && data.scale === 'LARGE') ||
    (data.autoDecision && (data.dataNature.sensitive || data.dataNature.financial || data.rightsRestriction)) ||
    (data.monitoring && data.scale === 'LARGE');

  const dpiaMandatory = explicitArt35Trigger || triggeredCount >= 2;

  let mandatoryReason =
    'Operation below the Art. 35 high-risk threshold. Simplified entry in ROPA (Art. 30) is recommended.';

  if (explicitArt35Trigger) {
    mandatoryReason =
      'Mandatory under Art. 35(3) GDPR: involves automated systematic processing, large-scale special category data, or continuous monitoring.';
  } else if (triggeredCount >= 2) {
    mandatoryReason = `Mandatory under EDPB/WP248 guidelines: ${triggeredCount} high-risk criteria met simultaneously (2+ criteria rule).`;
  } else if (triggeredCount === 1) {
    mandatoryReason =
      'Meets 1 WP248 criterion. Assess proportionality and document exemption justification or proceed with a simplified DPIA.';
  }

  const hasCriticalCombination =
    (data.dataNature.sensitive || data.dataSubjects.children || data.dataSubjects.patients) &&
    (data.scale === 'LARGE' || data.autoDecision || data.monitoring);

  const inherentRiskLevel = scoreToRiskLevel(inherentScore, hasCriticalCombination);
  // Residual risk can drop from HIGH to MEDIUM only if strong controls cover the exposure and score drops below threshold
  const forceResidualHigh =
    hasCriticalCombination &&
    (!data.existingControls.encryption || !data.existingControls.accessControlMfa || !data.existingControls.dpoConsulted);

  const riskLevel = scoreToRiskLevel(residualScore, forceResidualHigh);

  const recommendations: RecommendationItem[] = [];

  if (riskLevel === RiskLevel.HIGH || dpiaMandatory) {
    recommendations.push({
      id: 'rec-dpo-approval',
      priority: 'Crítica',
      category: 'Governança',
      articleRef: 'Art. 35(2) & Art. 39',
      text: 'Submit this DPIA report for formal DPO (Data Protection Officer) review before production release.',
    });
  }

  if (data.intlTransfer) {
    const missingSafeguard =
      data.transferMechanism === TransferMechanism.UNSPECIFIED ||
      data.transferMechanism === TransferMechanism.NONE;
    recommendations.push({
      id: 'rec-intl-transfer',
      priority: missingSafeguard ? 'Crítica' : 'Alta',
      category: 'Transferência Internacional',
      articleRef: 'Art. 44–49 GDPR',
      text: missingSafeguard
        ? 'Immediately define a valid international transfer mechanism (Standard Contractual Clauses - SCC or Adequacy Decision) and conduct a Transfer Impact Assessment (TIA).'
        : `Validate the validity of the selected safeguard (${TRANSFER_MECHANISM_LABELS[data.transferMechanism]}) and document the government access assessment (TIA).`,
    });
  }

  if (data.autoDecision) {
    recommendations.push({
      id: 'rec-auto-decision',
      priority: 'Crítica',
      category: 'Direitos dos Titulares',
      articleRef: 'Art. 22 GDPR',
      text: 'Implement a meaningful human review workflow, an accessible challenge channel, and a clear explanation of the algorithmic logic used.',
    });
  }

  if (data.dataNature.sensitive || data.dataNature.criminal) {
    recommendations.push({
      id: 'rec-sensitive-security',
      priority: 'Crítica',
      category: 'Segurança Técnica',
      articleRef: 'Art. 9, 10 & 32',
      text: 'Apply strong encryption at rest (AES-256) and in transit (TLS 1.3), logical database segregation, and mandatory multi-factor authentication (MFA) for administrative access.',
    });
  }

  if (data.dataSubjects.children) {
    recommendations.push({
      id: 'rec-children',
      priority: 'Crítica',
      category: 'Direitos dos Titulares',
      articleRef: 'Art. 8 & Art. 12',
      text: 'Establish a verifiable parental consent mechanism (applicable minimum age) and privacy notices in clear, accessible language.',
    });
  }

  if (data.legalBasis === LegalBasis.LEGITIMATE_INTEREST) {
    recommendations.push({
      id: 'rec-lia',
      priority: 'Alta',
      category: 'Governança',
      articleRef: 'Art. 6(1)(f)',
      text: 'Prepare and attach the Legitimate Interest Assessment (LIA) demonstrating necessity, proportionality, and the data subject\'s reasonable expectations.',
    });
  }

  if (data.monitoring) {
    recommendations.push({
      id: 'rec-monitoring',
      priority: 'Alta',
      category: 'Direitos dos Titulares',
      articleRef: 'Art. 5(1)(c) & Art. 13',
      text: 'Perform a Proportionality Test for continuous monitoring and display a transparent notice specifying scope, purpose, and log retention period.',
    });
  }

  if (data.newTech) {
    recommendations.push({
      id: 'rec-new-tech',
      priority: 'Alta',
      category: 'Segurança Técnica',
      articleRef: 'Art. 25 Privacy by Design',
      text: 'Document algorithmic bias audits, attribute minimization in training/inference, and robustness tests against model leakage.',
    });
  }

  if (data.dataMatching) {
    recommendations.push({
      id: 'rec-data-matching',
      priority: 'Alta',
      category: 'Governança',
      articleRef: 'Art. 5(1)(b) Purpose Limitation',
      text: 'Validate purpose compatibility for combining distinct datasets and apply pseudonymization prior to record correlation.',
    });
  }

  if (!data.existingControls.retentionAutomation) {
    recommendations.push({
      id: 'rec-retention',
      priority: 'Moderada',
      category: 'Governança',
      articleRef: 'Art. 5(1)(e)',
      text: `Automate purging or anonymization routines at the end of the defined lifecycle (${data.retentionPeriod || 'period to be defined'}).`,
    });
  }

  if (!data.existingControls.pseudonymization && (data.scale === 'LARGE' || data.dataSubjects.employees)) {
    recommendations.push({
      id: 'rec-pseudonymization',
      priority: 'Moderada',
      category: 'Segurança Técnica',
      articleRef: 'Art. 25 & Art. 32(1)(a)',
      text: 'Adopt pseudonymization/tokenization of direct identifiers in analytics and staging environments.',
    });
  }

  return {
    inherentScore,
    mitigationCredits,
    residualScore,
    inherentRiskLevel,
    riskLevel,
    dpiaMandatory,
    mandatoryReason,
    triggeredCriteria,
    recommendations,
    timestamp: new Date().toLocaleString('en-US'),
  };
};

export const getRiskConfig = (level: RiskLevel) => {
  switch (level) {
    case RiskLevel.HIGH:
      return {
        label: 'High Risk',
        shortLabel: 'High',
        containerClass: 'bg-red-50 text-red-900 border-red-200',
        badgeClass: 'bg-red-100 text-red-800 border-red-200',
        iconColor: 'text-red-600',
        message: 'DPIA Mandatory. DPO consultation and mitigation plan required before go-live.',
      };
    case RiskLevel.MEDIUM:
      return {
        label: 'Medium Risk',
        shortLabel: 'Medium',
        containerClass: 'bg-amber-50 text-amber-900 border-amber-200',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        iconColor: 'text-amber-600',
        message: 'Requires documented additional controls and periodic compliance review.',
      };
    case RiskLevel.LOW:
      return {
        label: 'Low Risk',
        shortLabel: 'Low',
        containerClass: 'bg-emerald-50 text-emerald-900 border-emerald-200',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        iconColor: 'text-emerald-600',
        message: 'Residual risk controlled. Maintain ROPA record and standard security controls.',
      };
  }
};

export interface DPIATemplate {
  id: string;
  name: string;
  subtitle: string;
  data: DPIAFormData;
}

export const PRESET_TEMPLATES: DPIATemplate[] = [
  {
    id: 'tpl-ai-credit',
    name: 'AI Credit Engine',
    subtitle: 'Automated decision · Financial data',
    data: {
      projectName: 'AI Credit Scoring Engine',
      department: 'Risk & Financial Products',
      ownerName: 'Camila Ferreira',
      purposeDescription:
        'Automated credit risk assessment for real-time limit approvals combining financial history and transactional telemetry.',
      legalBasis: LegalBasis.CONTRACT,
      retentionPeriod: '5 years after account closure',
      dataNature: {
        cadastral: true,
        financial: true,
        sensitive: false,
        criminal: false,
        behavioral: true,
      },
      dataSubjects: {
        general: true,
        employees: false,
        children: false,
        patients: false,
      },
      scale: 'LARGE',
      autoDecision: true,
      monitoring: false,
      newTech: true,
      dataMatching: true,
      rightsRestriction: true,
      intlTransfer: true,
      transferMechanism: TransferMechanism.SCC,
      existingControls: {
        encryption: true,
        pseudonymization: true,
        accessControlMfa: true,
        retentionAutomation: false,
        dpoConsulted: false,
      },
    },
  },
  {
    id: 'tpl-hr-monitoring',
    name: 'HR Portal & Biometric Timekeeping',
    subtitle: 'Biometrics · Employees',
    data: {
      projectName: 'Corporate Facial Timekeeping & HR System',
      department: 'Human Resources',
      ownerName: 'Ricardo Mendes',
      purposeDescription:
        'Employee time tracking via facial recognition at physical terminals and centralized management of benefits and medical leave.',
      legalBasis: LegalBasis.LEGAL_OBLIGATION,
      retentionPeriod: '10 years (labor law)',
      dataNature: {
        cadastral: true,
        financial: true,
        sensitive: true,
        criminal: false,
        behavioral: false,
      },
      dataSubjects: {
        general: false,
        employees: true,
        children: false,
        patients: false,
      },
      scale: 'MEDIUM',
      autoDecision: false,
      monitoring: true,
      newTech: true,
      dataMatching: false,
      rightsRestriction: false,
      intlTransfer: false,
      transferMechanism: TransferMechanism.NONE,
      existingControls: {
        encryption: true,
        pseudonymization: false,
        accessControlMfa: true,
        retentionAutomation: true,
        dpoConsulted: true,
      },
    },
  },
  {
    id: 'tpl-newsletter-b2b',
    name: 'B2B Events Portal',
    subtitle: 'Registration data · Small scale',
    data: {
      projectName: 'Corporate Webinar Registration',
      department: 'Corporate Marketing',
      ownerName: 'Ana Paula Costa',
      purposeDescription:
        'Collection of corporate name, job title, and business email to send invitations and access links for technical events.',
      legalBasis: LegalBasis.CONSENT,
      retentionPeriod: '24 months or until consent withdrawal',
      dataNature: {
        cadastral: true,
        financial: false,
        sensitive: false,
        criminal: false,
        behavioral: false,
      },
      dataSubjects: {
        general: true,
        employees: false,
        children: false,
        patients: false,
      },
      scale: 'SMALL',
      autoDecision: false,
      monitoring: false,
      newTech: false,
      dataMatching: false,
      rightsRestriction: false,
      intlTransfer: false,
      transferMechanism: TransferMechanism.NONE,
      existingControls: {
        encryption: true,
        pseudonymization: false,
        accessControlMfa: true,
        retentionAutomation: true,
        dpoConsulted: false,
      },
    },
  },
];

export const INITIAL_RECORDS: DPIARecord[] = PRESET_TEMPLATES.map((tpl, idx) => {
  const result = calculateRisk(tpl.data);
  return {
    id: `dpia-seed-${idx + 1}`,
    formData: tpl.data,
    result,
    checkedActionIds: [],
    createdAtIso: new Date(Date.now() - (idx + 1) * 86400000 * 3).toISOString(),
  };
});

export interface ImportedDpiaPayload {
  formData: DPIAFormData;
  sourceRecordId?: string;
  checkedActionIds?: string[];
}

export const parseImportedDpiaJson = (rawText: string): ImportedDpiaPayload => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('The selected file does not contain valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid JSON structure for a DPIA assessment.');
  }

  const obj = parsed as Record<string, unknown>;
  const candidate =
    obj.formData && typeof obj.formData === 'object' && !Array.isArray(obj.formData)
      ? (obj.formData as Record<string, unknown>)
      : obj;

  const hasKnownKeys =
    'projectName' in candidate ||
    'department' in candidate ||
    'dataNature' in candidate ||
    'dataSubjects' in candidate ||
    'scale' in candidate;

  if (!hasKnownKeys) {
    throw new Error('The JSON file does not contain the fields of a DPIA assessment.');
  }

  const mergeBoolGroup = <T extends Record<string, boolean>>(
    defaults: T,
    incoming: unknown
  ): T => {
    const src =
      incoming && typeof incoming === 'object' && !Array.isArray(incoming)
        ? (incoming as Record<string, unknown>)
        : {};
    const out = { ...defaults };
    for (const key of Object.keys(defaults)) {
      if (typeof src[key] === 'boolean') {
        (out as Record<string, boolean>)[key] = src[key] as boolean;
      }
    }
    return out;
  };

  const validLegalBases = Object.values(LegalBasis) as string[];
  const validMechanisms = Object.values(TransferMechanism) as string[];
  const validScales = ['SMALL', 'MEDIUM', 'LARGE'];

  const formData: DPIAFormData = {
    projectName: typeof candidate.projectName === 'string' ? candidate.projectName : '',
    department: typeof candidate.department === 'string' ? candidate.department : '',
    ownerName: typeof candidate.ownerName === 'string' ? candidate.ownerName : '',
    purposeDescription:
      typeof candidate.purposeDescription === 'string' ? candidate.purposeDescription : '',
    legalBasis:
      typeof candidate.legalBasis === 'string' && validLegalBases.includes(candidate.legalBasis)
        ? (candidate.legalBasis as LegalBasis)
        : initialFormState.legalBasis,
    retentionPeriod:
      typeof candidate.retentionPeriod === 'string'
        ? candidate.retentionPeriod
        : initialFormState.retentionPeriod,
    dataNature: mergeBoolGroup(initialFormState.dataNature, candidate.dataNature),
    dataSubjects: mergeBoolGroup(initialFormState.dataSubjects, candidate.dataSubjects),
    scale:
      typeof candidate.scale === 'string' && validScales.includes(candidate.scale)
        ? (candidate.scale as DPIAFormData['scale'])
        : initialFormState.scale,
    autoDecision: Boolean(candidate.autoDecision),
    monitoring: Boolean(candidate.monitoring),
    newTech: Boolean(candidate.newTech),
    dataMatching: Boolean(candidate.dataMatching),
    rightsRestriction: Boolean(candidate.rightsRestriction),
    intlTransfer: Boolean(candidate.intlTransfer),
    transferMechanism:
      typeof candidate.transferMechanism === 'string' &&
      validMechanisms.includes(candidate.transferMechanism)
        ? (candidate.transferMechanism as TransferMechanism)
        : initialFormState.transferMechanism,
    existingControls: mergeBoolGroup(
      initialFormState.existingControls,
      candidate.existingControls
    ),
  };

  const sourceRecordId = typeof obj.id === 'string' ? obj.id : undefined;
  const checkedActionIds = Array.isArray(obj.checkedActionIds)
    ? obj.checkedActionIds.filter((item): item is string => typeof item === 'string')
    : undefined;

  return {
    formData,
    sourceRecordId,
    checkedActionIds,
  };
};