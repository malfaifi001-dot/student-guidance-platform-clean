"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";

export function StudentImportCard() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUpload(formData: FormData) {
    setIsUploading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/dashboard/school-data/students", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "حدث خطأ أثناء الرفع.");
      }

      setMessage("تم تحليل الملف وإنشاء دفعة مراجعة. سيتم فتح تفاصيل الدفعة الآن.");
      router.push(`/dashboard/data-center/student-data-import/sessions/${data.sessionId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ غير معروف.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
          <UploadCloud className="h-6 w-6" />
        </div>

        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            رفع دفعة بيانات من نظام نور
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            سيتم تحليل الملف أولًا، ثم مراجعة الدفعة، ثم اعتمادها لاحقًا.
          </p>
        </div>
      </div>

      <form action={handleUpload} className="space-y-4">
        <input
          name="file"
          type="file"
          accept=".xlsx,.xls"
          required
          className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
        />

        <button
          type="submit"
          disabled={isUploading}
          className="min-h-10 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-700 disabled:opacity-60"
        >
          {isUploading ? "جاري تحليل الملف..." : "رفع وإنشاء دفعة مراجعة"}
        </button>
      </form>

      {message ? (
        <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-semibold text-sky-800">
          {message}
        </div>
      ) : null}
    </div>
  );
}
