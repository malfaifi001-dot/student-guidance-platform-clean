"use client";

import { FolderX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CaseDeleteModal } from "@/components/cases/case-delete-modal";

export function CaseDeleteAction(props: {
  caseId: string;
  caseTitle: string;
  serviceName: string;
  serviceSlug: string;
  studentName?: string | null;
  hasLinkedReports: boolean;
  onDeleted?: (caseId: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function deleteCase() {
    if (loading || !props.caseId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/dashboard/cases/${encodeURIComponent(props.caseId)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.error || "تعذر حذف الحالة.");

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`report-2:draft:${props.serviceSlug || "general"}:${props.caseId}`);
      }
      setSuccess(payload.message || "تم حذف الحالة بنجاح.");
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      props.onDeleted?.(props.caseId);
      setOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "تعذر حذف الحالة.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" aria-label="حذف الحالة بالكامل" title="حذف الحالة بالكامل" disabled={loading} onClick={() => { setError(""); setSuccess(""); setOpen(true); }} className="grid h-10 w-10 place-items-center rounded-full border border-rose-200 bg-white text-rose-600 shadow-sm transition hover:bg-rose-700 hover:text-white disabled:opacity-50">
        <FolderX className="h-4 w-4" />
      </button>
      {open ? <CaseDeleteModal {...props} loading={loading} error={error} success={success} onCancel={() => { if (!loading) setOpen(false); }} onConfirm={deleteCase} /> : null}
    </>
  );
}
