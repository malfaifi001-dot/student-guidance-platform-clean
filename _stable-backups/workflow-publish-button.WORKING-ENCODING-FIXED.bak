"use client";

import { useState } from "react";

type Props = {
  serviceSlug: string;
};

export function WorkflowPublishButton({ serviceSlug }: Props) {
  const [loading, setLoading] = useState(false);

  async function publishWorkflow() {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/dashboard/admin/workflows/${serviceSlug}/publish`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Ùشل نشر Workflow");
        return;
      }

      alert("تم نشر Workflow بنجاح.");
      window.location.reload();
    } catch {
      alert("حدث خطأ أثناء النشر.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={publishWorkflow}
      disabled={loading}
      className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
    >
      {loading ? "جار� النشر..." : "اعتماد Ùˆنشر Workflow"}
    </button>
  );
}

