"use client";

import type {
  PrintExportFallback,
  PrintExportModal,
} from "@/lib/print-export/print-export-types";
import { BrandLoader } from "@/components/common/brand-loader";
import { formatTransferSize } from "@/lib/print-export/print-export-progress";

export function PrintExportPopCard({
  modal,
  onClose,
  onOpenFallback,
  align = "start",
  downloadUrl,
}: {
  modal: PrintExportModal | null;
  onClose: () => void;
  onOpenFallback: (fallback?: PrintExportFallback | null) => void;
  align?: "start" | "center";
  downloadUrl?: string;
}) {
  if (!modal) {
    return null;
  }

  const accentClass =
    modal.status === "success"
      ? "bg-emerald-700 hover:bg-emerald-800"
      : modal.status === "blocked"
        ? "bg-sky-700 hover:bg-sky-800"
        : modal.status === "loading"
          ? "bg-amber-600 hover:bg-amber-700"
        : "bg-red-700 hover:bg-red-800";
  const isCentered = align === "center";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      dir="rtl"
    >
      <section className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header
          className={[
            "flex min-h-[18rem] flex-col justify-center border-b border-slate-100 px-6 py-8",
            isCentered ? "items-center text-center" : "items-stretch text-right",
          ].join(" ")}
        >
          <h2 className="text-xl font-black text-slate-950">{modal.title}</h2>

          {modal.status === "loading" ? (
            <div
              className="mt-5 flex w-full flex-col items-center text-center"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={modal.progress}
              aria-valuetext={modal.progress === undefined ? "جار تجهيز PDF" : `${modal.progress}%`}
              aria-label={modal.title}
            >
              <span className="text-center text-3xl font-black leading-none tracking-tight text-slate-950 tabular-nums sm:text-4xl">
                {modal.progress !== undefined
                  ? `${modal.progress}%`
                  : modal.receivedBytes
                    ? formatTransferSize(modal.receivedBytes)
                    : "جار تجهيز PDF"}
              </span>
              <p className="mt-3 text-sm font-bold text-slate-500">
                {modal.totalBytes && modal.receivedBytes !== undefined
                  ? `${formatTransferSize(modal.receivedBytes)} / ${formatTransferSize(modal.totalBytes)}`
                  : modal.receivedBytes
                    ? `${formatTransferSize(modal.receivedBytes)} — الحجم الكلي غير متاح بعد`
                    : "الحجم غير متاح بعد"}
              </p>
              <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={modal.progress === undefined ? "h-full w-2/5 animate-pulse rounded-full bg-amber-500" : "h-full rounded-full bg-amber-500 transition-[width] duration-200 ease-out"}
                  style={modal.progress === undefined ? undefined : { width: `${modal.progress}%` }}
                />
              </div>
              <BrandLoader variant="inline" size="sm" label={null} className="mt-4" />
            </div>
          ) : (
            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              {modal.message}
            </p>
          )}

          {modal.status === "blocked" && modal.fallback?.printUrl ? (
            <button
              type="button"
              onClick={() => onOpenFallback(modal.fallback)}
              className="mt-4 inline-flex self-center rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
            >
              فتح معاينة الطباعة
            </button>
          ) : null}
        </header>

        {modal.status !== "loading" ? <footer className={["flex flex-wrap items-center gap-3 px-6 py-4", isCentered ? "justify-center" : "justify-end"].join(" ")}>
          {modal.status === "error" && downloadUrl ? (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-slate-100 px-5 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
            >
              تحميل PDF
            </a>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className={[
              "rounded-2xl px-5 py-2 text-xs font-black text-white transition",
              accentClass,
            ].join(" ")}
          >
            حسنًا
          </button>
        </footer> : null}
      </section>
    </div>
  );
}
