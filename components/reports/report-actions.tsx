"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  reportId: string;
  status: string;
};

export function ReportActions({ reportId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function deleteReport() {
    const confirmed = confirm("هل أنت متأكد من حذف التقارير؟");
    if (!confirmed) return;

    setLoading(true);

    const response = await fetch(`/api/dashboard/reports/${reportId}/delete`, {
      method: "DELETE",
    });

    setLoading(false);

    if (!response.ok) {
      alert("فشل حذف التقارير.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/dashboard/report/${reportId}/studio`}
        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
      >
        {status === "APPROVED" ? "إعادة فتح" : "تعديل"}
      </Link>

      <Link
        href={`/dashboard/report/${reportId}/preview`}
        className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-50"
      >
        Preview
      </Link>

      <button
        type="button"
        onClick={deleteReport}
        disabled={loading}
        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {loading ? "جارٍ الحذف..." : "حذف"}
      </button>
    </div>
  );
}
