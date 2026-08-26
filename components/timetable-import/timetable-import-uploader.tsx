"use client";

import { useState } from "react";

import type { TimetableImportResult } from "@/lib/timetable-import/timetable-import-types";
import { TimetableImportReview } from "./timetable-import-review";

export function TimetableImportUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<TimetableImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setMessage("");
    setResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/dashboard/timetable-import", { method: "POST", body });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || "تعذر تحليل الملف.");
      setResult(payload.result as TimetableImportResult);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحليل الملف.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!result) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/dashboard/timetable-import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result: {
            sourceType: result.sourceType,
            entries: result.entries,
            warnings: result.warnings,
          },
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || "تعذر اعتماد الجدول.");
      window.location.assign(payload.redirectUrl || "/dashboard/timetable-v3");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر اعتماد الجدول.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-black text-slate-950">استيراد الجدول التشغيلي</h1>
        <p className="mt-1 text-sm font-bold text-slate-500">ارفع الجدول المعتمد لمراجعته قبل تشغيله.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".xlsx,.xls,.pdf,image/png,image/jpeg,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="block min-w-0 flex-1 rounded-xl border border-slate-200 p-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void analyze()}
            disabled={!file || loading}
            className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-40"
          >
            {loading ? "جارٍ التحليل..." : "تحليل الملف"}
          </button>
        </div>
        {message ? <p className="mt-3 text-sm font-bold text-rose-700">{message}</p> : null}
      </section>

      {result ? (
        <TimetableImportReview
          result={result}
          onConfirm={confirmImport}
          saving={saving}
          feedback={message}
        />
      ) : null}
    </div>
  );
}
