"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

import { ReportDeleteModal } from "@/components/reports/report-delete-modal";

type ReportDeleteActionProps = {
  reportId: string;
  reportTitle: string;
  reportStatus: string;
  deleteEndpoint: string;
  onDeleted?: (deletedReport: unknown) => void;
  redirectAfterDelete?: string;
  className?: string;
  children?: ReactNode;
};

export function ReportDeleteAction({
  reportId,
  reportTitle,
  reportStatus,
  deleteEndpoint,
  onDeleted,
  redirectAfterDelete,
  className,
  children,
}: ReportDeleteActionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function deleteReport() {
    if (!reportId || loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(deleteEndpoint, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "تعذر حذف التقرير.");
      }

      setOpen(false);
      onDeleted?.(payload.deletedReport);

      if (redirectAfterDelete) {
        router.push(redirectAfterDelete);
      }

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر حذف التقرير.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="حذف التقرير"
        title="حذف التقرير"
        disabled={!reportId || loading}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className={className}
      >
        {children || <Trash2 className="h-4 w-4" />}
      </button>

      {open ? (
        <ReportDeleteModal
          title={reportTitle}
          status={reportStatus}
          loading={loading}
          error={error}
          onCancel={() => {
            if (!loading) setOpen(false);
          }}
          onConfirm={deleteReport}
        />
      ) : null}
    </>
  );
}
