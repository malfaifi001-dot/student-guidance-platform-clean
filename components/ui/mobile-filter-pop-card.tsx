"use client";

import type { ReactNode } from "react";

type MobileFilterPopCardProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function MobileFilterPopCard({
  open,
  onClose,
  children,
}: MobileFilterPopCardProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/25 p-3 backdrop-blur-[2px] md:hidden" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="الفلاتر"
        className="w-full rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">
            الفلاتر
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            إغلاق
          </button>
        </div>
        <div className="grid gap-3">{children}</div>
      </section>
    </div>
  );
}
