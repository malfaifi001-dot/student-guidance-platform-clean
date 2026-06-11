"use client";

import Link from "next/link";
import { ArrowRight, Printer } from "lucide-react";

import { SmartReportDocumentRenderer } from "@/components/report-engine/smart-report-document-renderer";
import type { ReportVariantId } from "@/lib/report-engine/report-variant-registry";
import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";

type SavedSmartReportPreviewPageProps = {
  reportId: string;
  caseId: string;
  payload: SmartReportPayload;
  variantId: ReportVariantId;
  generatedAt: string;
};

export function SavedSmartReportPreviewPage({
  reportId,
  caseId,
  payload,
  variantId,
  generatedAt,
}: SavedSmartReportPreviewPageProps) {
  return (
    <main className="min-h-screen bg-[#eef3ef] px-6 py-6" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="flex flex-col gap-4 rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between print:hidden">
          <div>
            <p className="text-sm font-black text-emerald-700">
              تقرير محفوظ
            </p>

            <h1 className="mt-1 text-2xl font-black text-slate-950">
              {payload.title}
            </h1>

            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              رقم التقرير: {reportId} · تاريخ الحفظ: {generatedAt || "غير محدد"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/cases/${caseId}`}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowRight className="h-4 w-4" />
              العودة للحالة
            </Link>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-xs font-black text-white transition hover:bg-emerald-800"
            >
              <Printer className="h-4 w-4" />
              طباعة / PDF
            </button>
          </div>
        </section>

        <section className="rounded-[2rem] bg-slate-100 p-4 print:bg-white print:p-0">
          <SmartReportDocumentRenderer
            payload={payload}
            variantId={variantId}
          />
        </section>
      </div>
    </main>
  );
}