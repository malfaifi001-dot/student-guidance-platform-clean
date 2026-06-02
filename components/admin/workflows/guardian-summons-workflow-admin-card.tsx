"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileSignature, Loader2, WandSparkles } from "lucide-react";

export function GuardianSummonsWorkflowAdminCard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function publishWorkflow() {
    try {
      setLoading(true);
      setMessage(null);
      setError(null);

      const response = await fetch("/api/admin/workflows/guardian-summons", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر إنشاء/نشر Workflow استدعاء ولي أمر.");
      }

      setMessage(data.message || "تم إنشاء/نشر Workflow استدعاء ولي أمر بنجاح.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="rounded-3xl bg-emerald-100 p-4 text-emerald-700">
            <FileSignature className="h-7 w-7" />
          </div>

          <div>
            <p className="text-xs font-black text-emerald-700">Workflow فرعي داخل خدمة التواصل</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              استدعاء ولي أمر
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
              ينشئ Workflow مستقل باسم guardian-summons داخل خدمة التواصل بين الأسرة والمدرسة، ثم يظهر للموجه/الموجهة في الداشبورد ويُحفظ كسجل حالة طبيعي.
            </p>

            {message ? (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-2xl bg-rose-100 px-4 py-3 text-sm font-black text-rose-800">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={publishWorkflow}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <WandSparkles className="h-4 w-4" />
            )}
            إنشاء/نشر Workflow
          </button>

          <Link
            href="/dashboard/family-school-communication/guardian-summons/new"
            className="inline-flex items-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-50"
          >
            تجربة صفحة الموجه
          </Link>
        </div>
      </div>
    </section>
  );
}
