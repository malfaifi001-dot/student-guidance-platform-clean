"use client";

import Link from "next/link";
import { ArrowRight, PencilLine, Printer } from "lucide-react";

import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";

export function GuardianSummonsPreviewToolbar({ caseId }: { caseId: string }) {
  const { status, modal, runPrintExport, openFallbackPrintUrl, closeModal } =
    usePrintExportAction();
  const printUrl = `/print/guardian-summons/${encodeURIComponent(caseId)}`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/dashboard/cases/${caseId}`}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للحالة
        </Link>
        <Link
          href={`/dashboard/cases/${caseId}/edit`}
          className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-black text-sky-700 transition hover:bg-sky-100"
        >
          <PencilLine className="h-4 w-4" />
          تعديل الإشعار
        </Link>
        <button
          type="button"
          disabled={status === "loading"}
          onClick={() => void runPrintExport({ printUrl })}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-xs font-black text-white transition hover:bg-emerald-800 disabled:opacity-60"
        >
          <Printer className="h-4 w-4" />
          {status === "loading" ? "جارٍ فتح الطباعة..." : "طباعة / حفظ PDF"}
        </button>
      </div>
      <PrintExportPopCard
        modal={modal}
        onClose={closeModal}
        onOpenFallback={openFallbackPrintUrl}
      />
    </>
  );
}
