"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Printer } from "lucide-react";
import { TeachixInvoiceDocument, type TeachixInvoiceData } from "@/components/payments/teachix-invoice-document";
import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";

export function TeachixInvoicePreviewPage({ transactionId }: { transactionId: string }) {
  const [data, setData] = useState<TeachixInvoiceData | null>(null);
  const [error, setError] = useState("");
  const { modal, runPrintExport, closeModal, openFallbackPrintUrl } = usePrintExportAction();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/dashboard/payments/${encodeURIComponent(transactionId)}/invoice`,
          { cache: "no-store" },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.invoice || !payload.transaction) {
          throw new Error(payload.error || "تعذر تحميل الفاتورة.");
        }
        if (!cancelled) {
          setData({ invoice: payload.invoice, transaction: payload.transaction });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "تعذر تحميل الفاتورة.");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  useEffect(() => {
    if (!data || typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("print") === "1") {
      const timer = window.setTimeout(() => window.print(), 150);
      return () => window.clearTimeout(timer);
    }
  }, [data]);

  function printInvoice() {
    void runPrintExport({
      printUrl: `/dashboard/payments/invoices/${encodeURIComponent(transactionId)}`,
      fileName: `${data?.invoice.invoiceNumber || "teachix-invoice"}.pdf`,
      blockedTitle: "معاينة الفاتورة",
      blockedMessage: "تعذر فتح نافذة الطباعة تلقائيًا. افتح المعاينة من الزر أدناه.",
    });
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-5xl print:max-w-none">
        <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
          <Link href="/dashboard/plans" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
            <ArrowRight className="h-4 w-4" /> العودة إلى الباقات
          </Link>
          <button type="button" onClick={printInvoice} disabled={!data} className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-5 py-2 text-sm font-black text-white disabled:opacity-50">
            <Printer className="h-4 w-4" /> طباعة / حفظ PDF
          </button>
        </div>

        {data ? <TeachixInvoiceDocument data={data} /> : (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            {error ? <p className="font-black text-red-700">{error}</p> : <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-700" />}
          </div>
        )}
      </div>
      <PrintExportPopCard modal={modal} onClose={closeModal} onOpenFallback={openFallbackPrintUrl} />
    </main>
  );
}
