"use client";

import type {
  PrintExportFallback,
  PrintExportModal,
} from "@/lib/print-export/print-export-types";
import { BrandLoader } from "@/components/common/brand-loader";

export function PrintExportPopCard({
  modal,
  onClose,
  onOpenFallback,
  align = "start",
}: {
  modal: PrintExportModal | null;
  onClose: () => void;
  onOpenFallback: (fallback?: PrintExportFallback | null) => void;
  align?: "start" | "center";
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
              aria-valuenow={modal.progress ?? 1}
              aria-label={modal.title}
            >
              <span className="text-5xl font-black leading-none tracking-tight text-slate-950 tabular-nums sm:text-6xl">
                {modal.progress ?? 1}%
              </span>
              <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-500 transition-[width] duration-200 ease-out"
                  style={{ width: `${modal.progress ?? 1}%` }}
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

        {modal.status !== "loading" ? <footer className={["flex px-6 py-4", isCentered ? "justify-center" : "justify-end"].join(" ")}>
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
