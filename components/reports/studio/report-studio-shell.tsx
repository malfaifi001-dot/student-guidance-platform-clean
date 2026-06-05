"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applyGenderGrammar } from "@/engine/reports/gender-grammar-engine";
import { DEFAULT_REPORT_TEMPLATES } from "@/lib/reports/default-report-templates";
import { ReportContextPanel } from "./report-context-panel";
import { ReportSmartEditor } from "./report-smart-editor";
import { ReportTemplateSidebar } from "./report-template-sidebar";
import { SmartFeedbackModal } from "@/components/service-ui/smart-feedback-modal";

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

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error" | "warning" | "info",
    title: "",
    description: "",
  });

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
      setFeedback({
        open: true,
        type: "error",
        title: "تعذر حفظ التقارير",
        description: data.error || "حدث خطأ أثناء حفظ التقارير.",
      });
      return;
    }

    router.push(`/dashboard/reports/${data.reportId}/preview`);
  }

  function openSaveTemplateModal() {
    if (!content.trim()) {
      setFeedback({
        open: true,
        type: "warning",
        title: "لا يوجد نص",
        description: "اكتب نصًا في محرر التقارير قبل حفظه كتامبلت.",
      });
      return;
    }

    setTemplateName("");
    setTemplateModalOpen(true);
  }

  function confirmSaveTemplate() {
    if (!templateName.trim()) {
      setFeedback({
        open: true,
        type: "warning",
        title: "اسم التامبلت مطلوب",
        description: "اكتب اسمًا واضحًا للتامبلت حتى يسهل استخدامه لاحقًا.",
      });
      return;
    }

    const newTemplate: Template = {
      id: `personal-${Date.now()}`,
      title: templateName.trim(),
      content: content.trim(),
    };

    setTemplates((current) => [newTemplate, ...current]);
    setTemplateModalOpen(false);

    setFeedback({
      open: true,
      type: "success",
      title: "تم حفظ التامبلت",
      description: "تمت إضافة النص إلى قائمة النصوص المقترحة.",
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <SmartFeedbackModal
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        description={feedback.description}
        primaryActionLabel="إغلاق"
        onPrimaryAction={() =>
          setFeedback((current) => ({ ...current, open: false }))
        }
      />

      {templateModalOpen ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-sky-100 bg-white p-8 shadow-2xl">
            <h2 className="text-center text-3xl font-black text-slate-900">
              حفظ النص كتامبلت
            </h2>

            <p className="mt-3 text-center text-sm leading-7 text-slate-500">
              اكتب اسمًا واضحًا للنص، وسيظهر مباشرة ضمن النصوص المقترحة.
            </p>

            <div className="mt-7">
              <label className="text-sm font-black text-slate-700">
                اسم التامبلت
              </label>

              <input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                autoFocus
                className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="مثال: تقرير جلسة إرشادية فردية"
              />
            </div>

            <div className="mt-8 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={confirmSaveTemplate}
                className="rounded-2xl bg-sky-600 px-7 py-3 text-sm font-black text-white transition hover:bg-sky-700"
              >
                حفظ التامبلت
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
            onClick={openSaveTemplateModal}
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