"use client";

import { LoaderCircle } from "lucide-react";

export function OperationProgressPopCard({
  open,
  title,
  message,
}: {
  open: boolean;
  title: string;
  message: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="operation-progress-title"
      aria-describedby="operation-progress-message"
    >
      <section className="w-full max-w-md rounded-[2rem] bg-white px-6 py-7 text-center shadow-2xl">
        <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-sky-600" aria-hidden="true" />
        <h2 id="operation-progress-title" className="mt-4 text-xl font-black text-slate-950">
          {title}
        </h2>
        <p id="operation-progress-message" className="mt-2 text-sm font-bold leading-7 text-slate-500">
          {message}
        </p>
      </section>
    </div>
  );
}
