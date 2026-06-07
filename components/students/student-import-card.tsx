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
      router.push(`/dashboard/student-import/sessions/${data.sessionId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ غير معروف.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow">
      <div className="mb-6 flex items-center gap-4">
        <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
          <UploadCloud className="h-6 w-6" />
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-900">
            رفع دفعة بيانات من النظام المصدر
          </h2>
          <p className="mt-1 text-sm text-slate-500">
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
          className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm"
        />

        <button
          type="submit"
          disabled={isUploading}
          className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-sky-700 disabled:opacity-60"
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