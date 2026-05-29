"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  analysisId: string;
};

export function DeleteResultsAnalysisButton({ analysisId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = confirm("هل أنت متأكد من حذف هذا التحليل؟");

    if (!confirmed) return;

    setLoading(true);

    const response = await fetch(
      `/api/dashboard/results-analysis/${analysisId}/delete`,
      {
        method: "DELETE",
      }
    );

    setLoading(false);

    if (!response.ok) {
      alert("فشل حذف التحليل.");
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-xl border border-red-200 px-4 py-2 text-sm font-black text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "جارٍ الحذف..." : "حذف"}
    </button>
  );
}