"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

import { ReportDeleteModal } from "@/components/reports/report-delete-modal";

type ReportDeleteActionProps = {
  reportId: string;
  reportTitle: string;
  caseTitle?: string;
  reportStatus: string;
  deleteEndpoint: string;
  reportTwoDraftStorage?: {
    caseId: string;
    serviceSlug: string;
  };
  onDeleted?: (deletedReport: unknown) => void;
  redirectAfterDelete?: string;
  className?: string;
  children?: ReactNode;
};

export function ReportDeleteAction({
  reportId,
  reportTitle,
  caseTitle,
  reportStatus,
  deleteEndpoint,
  reportTwoDraftStorage,
  onDeleted,
  redirectAfterDelete,
  className,
  children,
}: ReportDeleteActionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const deleteLabel =
    reportStatus === "APPROVED"
      ? "حذف التقرير المعتمد"
      : reportStatus === "DRAFT"
        ? "حذف مسودة التقرير"
        : "حذف التقرير";

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

      if (reportTwoDraftStorage && typeof window !== "undefined") {
        window.localStorage.removeItem(
          `report-2:draft:${reportTwoDraftStorage.serviceSlug || "general"}:${reportTwoDraftStorage.caseId}`,
        );
      }

      setSuccess(payload.message || "تم حذف التقرير بنجاح.");
      await new Promise((resolve) => window.setTimeout(resolve, 650));
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
        aria-label={deleteLabel}
        title={deleteLabel}
        disabled={!reportId || loading}
        onClick={() => {
          setError("");
          setSuccess("");
          setOpen(true);
        }}
        className={className}
      >
        {children || <Trash2 className="h-4 w-4" />}
      </button>

      {open ? (
        <ReportDeleteModal
          reportTitle={reportTitle}
          caseTitle={caseTitle}
          status={reportStatus}
          loading={loading}
          error={error}
          success={success}
          onCancel={() => {
            if (!loading) {
              setOpen(false);
              setSuccess("");
            }
          }}
          onConfirm={deleteReport}
        />
      ) : null}
    </>
  );
}
