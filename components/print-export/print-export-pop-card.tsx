"use client";

import type {
  PrintExportFallback,
  PrintExportModal,
} from "@/lib/print-export/print-export-types";

export function PrintExportPopCard({
  modal,
  onClose,
  onOpenFallback,
}: {
  modal: PrintExportModal | null;
  onClose: () => void;
  onOpenFallback: (fallback?: PrintExportFallback | null) => void;
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      dir="rtl"
    >
      <section className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-xl font-black text-slate-950">{modal.title}</h2>
          <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
            {modal.message}
          </p>

          {modal.status === "blocked" && modal.fallback?.printUrl ? (
            <button
              type="button"
              onClick={() => onOpenFallback(modal.fallback)}
              className="mt-4 inline-flex rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
            >
              فتح معاينة الطباعة
            </button>
          ) : null}
        </header>

        <footer className="flex justify-end px-6 py-4">
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
        </footer>
      </section>
    </div>
  );
}
