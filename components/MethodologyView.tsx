import React from 'react';
import { LEGAL_BASIS_LABELS } from '../utils/riskLogic';

const WP29_REFERENCE = [
  {
    index: '01',
    title: 'Evaluation or scoring (Profiling)',
    article: 'Art. 35(3)(a) · WP248',
    description:
      'Prediction or analysis of personal aspects, economic situation, health, preferences, or professional performance.',
  },
  {
    index: '02',
    title: 'Automated decision-making with legal effect',
    article: 'Art. 22 · WP248',
    description:
      'Decisions taken solely by automated means that produce legal effects or similarly significantly affect the data subject.',
  },
  {
    index: '03',
    title: 'Systematic monitoring',
    article: 'Art. 35(3)(c) · WP248',
    description:
      'Continuous observation, location tracking, telemetry, or surveillance in publicly accessible areas or the workplace.',
  },
  {
    index: '04',
    title: 'Sensitive or highly personal data',
    article: 'Art. 9 & Art. 10 · WP248',
    description:
      'Health data, biometrics, genetic data, racial origin, beliefs, criminal records, or highly critical financial data.',
  },
  {
    index: '05',
    title: 'Large-scale processing',
    article: 'Recital 91 · WP248',
    description:
      'Assessed based on volume of data subjects, geographic reach, duration, and variety of data processed simultaneously.',
  },
  {
    index: '06',
    title: 'Matching or combining datasets',
    article: 'WP248 Criterion 6',
    description:
      'Combination or correlation of datasets collected for different purposes beyond the data subject\'s reasonable expectations.',
  },
  {
    index: '07',
    title: 'Vulnerable data subjects',
    article: 'Recital 75 · WP248',
    description:
      'Children, elderly, patients, or employees (due to the power imbalance vis-à-vis the employer).',
  },
  {
    index: '08',
    title: 'Innovative use of new technologies',
    article: 'Art. 35(1) · WP248',
    description:
      'Use of artificial intelligence, facial recognition, IoT, or organizational solutions whose impact is not yet consolidated.',
  },
  {
    index: '09',
    title: 'Prevention of rights or service access',
    article: 'WP248 Criterion 9',
    description:
      'Operations that prevent the data subject from exercising a right or using a service or contract (e.g., credit or access screening).',
  },
];

export const MethodologyView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Methodology Intro */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          GDPR Art. 35 Screening Methodology & EDPB Guidelines (WP248)
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
          Under Article 35 of the GDPR and the European Data Protection Board (EDPB) guidance WP248
          rev.01, a Data Protection Impact Assessment (DPIA) is mandatory whenever processing is
          likely to result in a high risk to the rights and freedoms of natural persons — as a rule,
          when <strong>two or more criteria</strong> below are triggered simultaneously, or in the
          explicit cases of Art. 35(3).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
          <div className="p-4 rounded-md bg-emerald-50/70 border border-emerald-200">
            <div className="text-xs font-mono font-semibold text-emerald-800">0–3 points</div>
            <div className="text-sm font-semibold text-slate-900 mt-1">Low Risk</div>
            <p className="text-xs text-slate-600 mt-1">
              Small-scale registration data with no critical triggers. Maintain record in ROPA (Art. 30).
            </p>
          </div>
          <div className="p-4 rounded-md bg-amber-50/70 border border-amber-200">
            <div className="text-xs font-mono font-semibold text-amber-800">4–8 points</div>
            <div className="text-sm font-semibold text-slate-900 mt-1">Medium Risk</div>
            <p className="text-xs text-slate-600 mt-1">
              Requires documented technical controls, proportionality review, and specific mitigation.
            </p>
          </div>
          <div className="p-4 rounded-md bg-red-50/70 border border-red-200">
            <div className="text-xs font-mono font-semibold text-red-800">9+ points or critical combination</div>
            <div className="text-sm font-semibold text-slate-900 mt-1">High Risk</div>
            <p className="text-xs text-slate-600 mt-1">
              Full DPIA mandatory and formal DPO opinion required prior to starting processing.
            </p>
          </div>
        </div>
      </section>

      {/* 9 WP29 Criteria Grid */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            The 9 High-Risk Criteria (WP248 rev.01)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatically evaluated by the screening engine to determine Art. 35 mandatory status.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {WP29_REFERENCE.map((item) => (
            <div
              key={item.index}
              className="p-4 rounded-md border border-slate-200 bg-slate-50/50 space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-[#0F4C81]">{item.index}.</span>
                <span className="font-mono text-slate-500">{item.article}</span>
              </div>
              <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Legal Bases Art. 6 */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Applicable Legal Bases (Art. 6(1) GDPR)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            All processing requires at least one valid, documented legal basis prior to collection.
          </p>
        </div>
        <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
          {Object.entries(LEGAL_BASIS_LABELS).map(([key, info]) => (
            <div key={key} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <span className="font-medium text-slate-900">{info.label}</span>
              <span className="font-mono text-xs text-slate-500">{info.article}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
