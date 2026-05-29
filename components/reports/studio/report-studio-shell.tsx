"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applyGenderGrammar } from "@/engine/reports/gender-grammar-engine";
import { DEFAULT_REPORT_TEMPLATES } from "@/lib/reports/default-report-templates";
import { ReportContextPanel } from "./report-context-panel";
import { ReportSmartEditor } from "./report-smart-editor";
import { ReportTemplateSidebar } from "./report-template-sidebar";

type Template = {
  id: string;
  title: string;
  content: string;
};

type Props = {
  reportId?: string;
  initialContent?: string;
  initialGender?: "MALE" | "FEMALE";
  context?: {
    studentName?: string;
    grade?: string;
    classroom?: string;
    serviceType?: string;
    serviceSlug?: string;
  };
};

export function ReportStudioShell({
  reportId,
  initialContent = "",
  initialGender = "MALE",
  context,
}: Props) {
  const router = useRouter();

  const [gender, setGender] = useState<"MALE" | "FEMALE">(initialGender);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);

  const [templates, setTemplates] = useState<Template[]>(
    DEFAULT_REPORT_TEMPLATES.map((item, index) => ({
      id: `system-${index}`,
      title: item.title,
      content: item.content,
    }))
  );

  const rendered = useMemo(() => {
    return applyGenderGrammar(content, gender);
  }, [content, gender]);

  async function saveReport() {
    setSaving(true);

    const endpoint = reportId
      ? `/api/dashboard/reports/${reportId}`
      : "/api/dashboard/reports";

    const response = await fetch(endpoint, {
      method: reportId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "تقرير إرشادي",
        serviceSlug: context?.serviceSlug || "manual-report",
        genderMode: gender,
        editableContent: content,
        renderedContent: rendered,
      }),
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      alert(data.error || "فشل حفظ التقرير.");
      return;
    }

    router.push(`/dashboard/reports/${data.reportId}/preview`);
  }

  function saveCurrentTextAsTemplate() {
    const cleanContent = content.trim();

    if (!cleanContent) {
      alert("لا يوجد نص لحفظه كتامبلت.");
      return;
    }

    const title = prompt("اكتب اسم التامبلت:");
    if (!title?.trim()) return;

    const newTemplate = {
      id: `personal-${Date.now()}`,
      title: title.trim(),
      content: cleanContent,
    };

    setTemplates((current) => [newTemplate, ...current]);
    alert("تم حفظ النص كتامبلت وإضافته للقائمة.");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mb-6 flex items-center justify-between rounded-[2rem] bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Smart Guidance Report Studio
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            محرر التقارير الرسمي مع دعم التذكير والتأنيث والنصوص المقترحة.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setGender("MALE")}
            className={`rounded-2xl px-5 py-3 text-sm font-black ${
              gender === "MALE"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            طالب
          </button>

          <button
            type="button"
            onClick={() => setGender("FEMALE")}
            className={`rounded-2xl px-5 py-3 text-sm font-black ${
              gender === "FEMALE"
                ? "bg-pink-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            طالبة
          </button>

          <button
            type="button"
            onClick={saveReport}
            disabled={saving}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ ومعاينة"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <ReportContextPanel
            data={{
              studentName: context?.studentName || "أحمد محمد",
              grade: context?.grade || "ثالث متوسط",
              classroom: context?.classroom || "أ",
              serviceType: context?.serviceType || "جلسة إرشادية فردية",
            }}
          />
        </div>

        <div className="col-span-6 space-y-4">
          <ReportSmartEditor value={rendered} onChange={setContent} />

          <button
            type="button"
            onClick={saveCurrentTextAsTemplate}
            className="w-full rounded-2xl bg-white px-6 py-4 text-sm font-black text-slate-900 shadow-sm transition hover:bg-slate-50"
          >
            حفظ النص كتامبلت
          </button>
        </div>

        <div className="col-span-3">
          <ReportTemplateSidebar
            templates={templates}
            onInsert={(text) => {
              setContent((prev) => (prev ? `${prev}\n\n${text}` : text));
            }}
          />
        </div>
      </section>
    </main>
  );
}