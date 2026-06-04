"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Power, Trash2 } from "lucide-react";
import { useState } from "react";

type WorkflowHistoryActionsProps = {
  serviceSlug: string;
  workflowId: string;
  workflowName: string;
  previewHref: string;
  isActive: boolean;
  casesCount?: number;
};

export function WorkflowHistoryActions({
  serviceSlug,
  workflowId,
  workflowName,
  previewHref,
  isActive,
  casesCount = 0,
}: WorkflowHistoryActionsProps) {
  const router = useRouter();
  const [activating, setActivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isUsedByCases = casesCount > 0;
  const deleteDisabled = isActive || isUsedByCases || deleting;

  async function activateWorkflow() {
    if (isActive || activating) return;

    try {
      setError(null);
      setActivating(true);

      const response = await fetch(
        `/api/dashboard/admin/workflows/${serviceSlug}/activate`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workflowId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر تفعيل Workflow.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء التفعيل.");
    } finally {
      setActivating(false);
    }
  }

  async function deleteWorkflow() {
    if (deleteDisabled) return;

    const confirmed = window.confirm(
      `هل تريد حذف Workflow: ${workflowName}؟ لا يمكن التراجع عن هذا الإجراء.`,
    );

    if (!confirmed) return;

    try {
      setError(null);
      setDeleting(true);

      const response = await fetch(
        `/api/dashboard/admin/workflows/${serviceSlug}/delete`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workflowId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر حذف Workflow.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء الحذف.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2">
        <Link
          href={previewHref}
          title="معاينة"
          aria-label="معاينة Workflow"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
        >
          <Eye className="h-4 w-4" />
        </Link>

        <button
          type="button"
          title={isActive ? "مفعل حاليًا" : "تفعيل"}
          aria-label={isActive ? "Workflow مفعل حاليًا" : "تفعيل Workflow"}
          onClick={activateWorkflow}
          disabled={isActive || activating}
          className={[
            "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed",
            isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
          ].join(" ")}
        >
          {activating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Power className="h-4 w-4" />
          )}
        </button>

        <button
          type="button"
          title={
            isActive
              ? "لا يمكن حذف النسخة المفعلة"
              : isUsedByCases
                ? "لا يمكن حذف Workflow مستخدم في حالات"
                : "حذف"
          }
          aria-label={
            isActive
              ? "لا يمكن حذف النسخة المفعلة"
              : isUsedByCases
                ? "لا يمكن حذف Workflow مستخدم في حالات"
                : "حذف Workflow"
          }
          onClick={deleteWorkflow}
          disabled={deleteDisabled}
          className={[
            "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed",
            deleteDisabled
              ? "border-slate-100 bg-slate-50 text-slate-300"
              : "border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700",
          ].join(" ")}
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {error ? (
        <p className="rounded-2xl bg-rose-50 px-3 py-2 text-[11px] font-bold leading-5 text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
