import React from 'react';
import { ArrowRight, BookOpen, FolderKanban, Shield, X } from 'lucide-react';

interface WelcomeBannerProps {
  onStartAssessment: () => void;
  onViewRegistry: () => void;
  onViewMethodology: () => void;
  onDismiss: () => void;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  onStartAssessment,
  onViewRegistry,
  onViewMethodology,
  onDismiss,
}) => {
  return (
    <section
      aria-label="Welcome guide"
      className="no-print mb-6 bg-white border border-slate-200 rounded-lg overflow-hidden"
    >
      {/* Intro Header */}
      <div className="p-6 flex items-start justify-between gap-4 border-b border-slate-200">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-medium text-[#0F4C81]">
            <Shield size={14} className="shrink-0" />
            <span>Welcome to Enterprise DPIA</span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="text-slate-500">First-Time Quick Start</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Screen GDPR processing risks and generate audit-ready DPIA reports
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            This workspace helps privacy, legal, and product teams evaluate personal data processing
            under <strong>GDPR Article 35</strong> and <strong>EDPB WP248</strong> guidelines,
            quantify inherent versus residual risk, and track mitigation actions in one place.
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss welcome message"
          title="Dismiss"
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors shrink-0 cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Features (3-column hairline-divided grid, single elevation) */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-slate-50/50">
        <div className="p-5 space-y-1">
          <div className="text-xs font-mono font-semibold text-[#0F4C81]">01.</div>
          <h3 className="text-sm font-semibold text-slate-900">Real-Time Risk Scoring</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Score data categories, vulnerable subjects, scale, and existing safeguards as you type
            to see inherent and residual risk update live.
          </p>
        </div>
        <div className="p-5 space-y-1">
          <div className="text-xs font-mono font-semibold text-[#0F4C81]">02.</div>
          <h3 className="text-sm font-semibold text-slate-900">WP248 & Art. 35 Screening</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Automatically evaluates the 9 EDPB high-risk criteria to determine whether a full DPIA
            is mandatory and builds a prioritized mitigation plan.
          </p>
        </div>
        <div className="p-5 space-y-1">
          <div className="text-xs font-mono font-semibold text-[#0F4C81]">03.</div>
          <h3 className="text-sm font-semibold text-slate-900">Registry & Audit Exports</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Store completed assessments in your local DPIA Registry, check off DPO review tasks,
            and export reports as A4 PDF, JSON, or Markdown.
          </p>
        </div>
      </div>

      {/* Where to Start + Actions */}
      <div className="p-5 border-t border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-900">Where to start:</span> Load one of the
          GDPR scenario templates below, import an existing DPIA JSON file, or fill in{' '}
          <span className="font-medium text-slate-800">Section 1</span> to score a new initiative
          from scratch.
        </p>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onStartAssessment}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-[#0c3c66] rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Start Assessment
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            onClick={onViewRegistry}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FolderKanban size={14} />
            Explore Sample Registry
          </button>
          <button
            type="button"
            onClick={onViewMethodology}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen size={14} />
            Art. 35 Criteria
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </section>
  );
};
