"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import {
  SmartActionFeedbackModal,
  useSmartActionFeedback,
} from "@/components/ui/smart-action-feedback";

async function readApiResponse(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      error: text || "تعذر قراءة استجابة الخادم.",
    };
  }
}

export function AssessmentCenterUploadClient({
  embedded = false,
  onCancel,
}: {
  embedded?: boolean;
  onCancel?: () => void;
}) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [uploadMode, setUploadMode] = useState("GENERAL");
  const [file, setFile] = useState<File | null>(null);

  const {
    actionState,
    processing,
    confirmAction,
    closeActionFeedback,
    runConfirmedAction,
  } = useSmartActionFeedback();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      confirmAction({
        title: "ملف Excel مطلوب",
        description: "اختر ملف النتائج أولًا.",
        variant: "warning",
        confirmLabel: "إغلاق",
        run: () => ({
          title: "ملف Excel مطلوب",
          description: "اختر الملف ثم أعد المحاولة.",
          variant: "warning",
        }),
      });

      return;
    }

    confirmAction({
      title: "بدء تحليل النتائج",
      description: "سيتم رفع الملف وبدء قراءة النتائج.",
      variant: "warning",
      confirmLabel: "ابدأ التحليل",
      errorTitle: "تعذر تحليل الملف",
      run: async () => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title);
        formData.append("uploadMode", uploadMode);

        const response = await fetch("/api/dashboard/assessment-center", {
          method: "POST",
          body: formData,
        });

        const data = await readApiResponse(response);

        if (!response.ok || !data.success) {
          throw new Error(data.error || "تعذر تحليل ملف النتائج.");
        }

        const summary = data.summary || {};

        window.setTimeout(() => {
          router.push(`/dashboard/assessment-center/${data.analysisId}`);
        }, 900);

        return {
          title: "تم تحليل النتائج",
          description: `تمت قراءة ${summary.totalRows || 0} نتيجة لعدد ${summary.totalStudents || 0} طالب/طالبة.`,
          variant: "success" as const,
        };
      },
    });
  }

  return (
    <>
      <SmartActionFeedbackModal
        state={actionState}
        processing={processing}
        onClose={closeActionFeedback}
        onConfirm={runConfirmedAction}
      />

      <form onSubmit={handleSubmit} className={embedded ? "" : "rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"}>
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-600">
            <UploadCloud className="h-6 w-6" />
          </div>

          {!embedded ? <div>
            <h2 className="text-2xl font-black text-slate-950">
              رفع ملف النتائج
            </h2>

            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              ارفع ملف Excel لبدء التحليل.
            </p>
          </div> : null}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">
              عنوان التحليل
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثال: نتائج الصف الخامس"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-950 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-cyan-950"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">
              نوع الرفع
            </span>
            <select
              value={uploadMode}
              onChange={(event) => setUploadMode(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-950 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-cyan-950"
            >
              <option value="GENERAL">رفع شامل</option>
              <option value="GRADE">رفع حسب الصف</option>
              <option value="CLASSROOM">رفع حسب الفصل</option>
              <option value="SUBJECT">رفع حسب المادة</option>
            </select>
          </label>
        </div>

        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-cyan-200 bg-cyan-50/40 p-8 text-center transition hover:bg-cyan-50 dark:border-cyan-900 dark:bg-cyan-950/20 dark:hover:bg-cyan-950/35">
          <FileSpreadsheet className="h-10 w-10 text-cyan-600" />
          <span className="mt-4 text-base font-black text-slate-950 dark:text-white">
            {file ? file.name : "اختر ملف Excel"}
          </span>
          <span className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
            xlsx / xls / csv
          </span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {onCancel ? <button type="button" onClick={onCancel} disabled={processing} className="inline-flex h-12 items-center justify-center rounded-xl px-4 text-sm font-black text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">إلغاء</button> : null}
          <button type="submit" disabled={processing} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 text-sm font-black text-white shadow-lg shadow-cyan-100 transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60">
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          ابدأ التحليل
          </button>
        </div>
      </form>
    </>
  );
}
