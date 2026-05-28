"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";

type WorkflowUploadCardProps = {
  serviceSlug: string;
  serviceName: string;
};

export function WorkflowUploadCard({
  serviceSlug,
  serviceName,
}: WorkflowUploadCardProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function uploadWorkflow(formData: FormData) {
    setIsUploading(true);
    setMessage(null);

    formData.set("serviceSlug", serviceSlug);

    try {
      const response = await fetch("/api/dashboard/admin/workflows/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل رفع Workflow.");
      }

      setMessage(
        `تم الرفع بنجاح: ${data.result.stepsCount} خطوات، ${data.result.fieldsCount} حقول، ${data.result.optionsCount} خيارات.`
      );

      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ غير معروف.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow">
      <div className="mb-6 flex items-center gap-4">
        <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
          <UploadCloud className="h-6 w-6" />
        </div>

        <div>
          <p className="text-sm font-bold text-sky-700">Service-bound Upload</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">
            رفع Workflow لخدمة: {serviceName}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            الملف المرفوع سيؤثر فقط على هذه الخدمة ولن يغيّر أي خدمة أخرى.
          </p>
        </div>
      </div>

      <form action={uploadWorkflow} className="space-y-4">
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
          className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-60"
        >
          {isUploading ? "جاري الرفع والتحليل..." : "رفع وتفعيل Workflow"}
        </button>
      </form>

      {message ? (
        <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-bold text-sky-800">
          {message}
        </div>
      ) : null}
    </section>
  );
}