"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReportOneHome() {
  const router = useRouter();
  const [caseId, setCaseId] = useState("");

  function openCaseReport() {
    const cleanCaseId = caseId.trim();

    if (!cleanCaseId) {
      window.alert("أدخل Case ID أولًا.");
      return;
    }

    router.push(`/dashboard/report-2/cases/${encodeURIComponent(cleanCaseId)}/prepare`);
  }

  return (
    <main className="min-h-screen bg-[#eef3ef] px-6 py-8" dir="rtl">
      <section className="mx-auto max-w-4xl rounded-[2rem] border border-emerald-100 bg-white p-7 shadow-sm">
        <p className="text-sm font-black text-emerald-700">
          نظام التقارير الجديد
        </p>

        <h1 className="mt-2 text-3xl font-black text-slate-950">
          report-1
        </h1>

        <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
          ابدأ من حالة موجودة، ثم اختر قالب التقرير وحقول Workflow قبل فتح محرر التقرير.
        </p>

        <div className="mt-7 grid gap-3 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 md:grid-cols-[1fr_auto]">
          <input
            value={caseId}
            onChange={(event) => setCaseId(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                openCaseReport();
              }
            }}
            placeholder="أدخل Case ID"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
          />

          <button
            type="button"
            onClick={openCaseReport}
            className="rounded-2xl bg-emerald-700 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
          >
            تجهيز التقرير
          </button>
        </div>
      </section>
    </main>
  );
}
