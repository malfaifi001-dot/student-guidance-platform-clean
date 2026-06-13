"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReportTwoHome() {
  const router = useRouter();
  const [caseId, setCaseId] = useState("");

  function openStudio() {
    const id = caseId.trim();

    if (!id) {
      window.alert("أدخل Case ID أولًا.");
      return;
    }

    router.push(`/dashboard/report-2/cases/${encodeURIComponent(id)}/studio`);
  }

  return (
    <main className="min-h-screen bg-[#eef3ef] px-6 py-10" dir="rtl">
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-emerald-100 bg-white p-7 shadow-sm">
        <p className="text-sm font-black text-emerald-700">
          report-2
        </p>

        <h1 className="mt-2 text-3xl font-black text-slate-950">
          محرر التقرير من قالب الاستديو
        </h1>

        <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
          هذا المسار يستخدم قالب استديو الأدمن كقاعدة قابلة للتعديل داخل التقرير نفسه، بدون خصائص الأدمن مثل نشر القالب أو حفظه في مكتبة القوالب.
        </p>

        <div className="mt-7 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
          <label className="block">
            <span className="text-xs font-black text-slate-500">
              Case ID
            </span>

            <input
              value={caseId}
              onChange={(event) => setCaseId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") openStudio();
              }}
              placeholder="مثال: cmq..."
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-black outline-none focus:border-emerald-600"
              dir="ltr"
            />
          </label>

          <button
            type="button"
            onClick={openStudio}
            className="mt-4 w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
          >
            فتح محرر report-2
          </button>
        </div>
      </section>
    </main>
  );
}