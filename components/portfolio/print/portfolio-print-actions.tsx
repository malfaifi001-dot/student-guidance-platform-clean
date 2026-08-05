"use client";

import { ArrowRight, Printer } from "lucide-react";
import Link from "next/link";

function waitForImages() {
  return Promise.all(
    Array.from(document.images).map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );
}

async function waitForPrintAssets() {
  await document.fonts.ready;
  await waitForImages();
}

export function PortfolioPrintActions() {
  async function print() {
    await waitForPrintAssets();
    window.setTimeout(() => window.print(), 500);
  }

  return (
    <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/teacher/portfolio"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع
        </Link>

        <button
          type="button"
          onClick={() => void print()}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
        >
          <Printer className="h-4 w-4" />
          طباعة أو حفظ PDF
        </button>
      </div>
    </div>
  );
}
