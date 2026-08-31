"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Copy, ExternalLink, MessageCircle, Trash2 } from "lucide-react";

import { ExpandableActionMenu } from "@/components/actions/expandable-action-menu";
import { SmartActionModal } from "@/components/ui/smart-action-modal";

export type ActivityAssignmentActionItem = {
  id: string;
  publicUrl: string;
  whatsappUrl: string;
  status: string;
  caseEntryId?: string | null;
};

type Props = {
  assignment: ActivityAssignmentActionItem;
  showOpenLink?: boolean;
  showShareActions?: boolean;
  onDeleted?: (assignmentId: string) => void;
  onFeedback?: (message: string) => void;
  compactMenu?: boolean;
  extraActions?: ReactNode;
};

const iconButtonClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition focus-visible:outline-none focus-visible:ring-4";

export function ActivityAssignmentActions({
  assignment,
  showOpenLink = true,
  showShareActions = true,
  onDeleted,
  onFeedback,
  compactMenu = false,
  extraActions,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canDelete = !assignment.caseEntryId && assignment.status !== "APPROVED";
  const actionControlClass = compactMenu
    ? "inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition focus-visible:outline-none focus-visible:ring-4"
    : iconButtonClass;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(assignment.publicUrl);
      setCopied(true);
      onFeedback?.("تم نسخ الرابط.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      onFeedback?.("تعذر نسخ الرابط.");
    }
  }

  async function deleteAssignment() {
    if (deleting) return;

    setDeleting(true);

    try {
      const response = await fetch(
        `/api/dashboard/activity-leader/teacher-assignments/${assignment.id}`,
        { method: "DELETE" },
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        onFeedback?.(result.error || "تعذر حذف التكليف.");
        return;
      }

      setConfirmDelete(false);
      onDeleted?.(assignment.id);
      onFeedback?.(result.message || "تم حذف التكليف بنجاح.");
    } finally {
      setDeleting(false);
    }
  }

  const actions = (
    <>
      {extraActions}

      {showOpenLink ? (
        <a
          href={assignment.publicUrl}
          target="_blank"
          rel="noreferrer"
          title="فتح الرابط"
          aria-label="فتح الرابط"
          className={`${actionControlClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`}
        >
          <ExternalLink className="h-4 w-4" />
          {compactMenu ? <span>فتح الرابط</span> : null}
        </a>
      ) : null}

      {showShareActions ? (
        <>
          <a
            href={assignment.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            title="إرسال عبر واتساب"
            aria-label="إرسال عبر واتساب"
            className={`${actionControlClass} bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-100`}
          >
            <MessageCircle className="h-4 w-4" />
            {compactMenu ? <span>واتساب</span> : null}
          </a>

          <button
            type="button"
            onClick={() => void copyLink()}
            title={copied ? "تم نسخ الرابط" : "نسخ الرابط"}
            aria-label={copied ? "تم نسخ الرابط" : "نسخ الرابط"}
            className={`${actionControlClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`}
          >
            <Copy className="h-4 w-4" />
            {compactMenu ? <span>{copied ? "تم النسخ" : "نسخ الرابط"}</span> : null}
          </button>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => {
          if (canDelete) {
            setConfirmDelete(true);
          } else {
            onFeedback?.("لا يمكن حذف تكليف تم اعتماده وربطه بحالة رسمية.");
          }
        }}
        title="حذف التكليف"
        aria-label="حذف التكليف"
        className={`${actionControlClass} border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-100 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50`}
      >
        <Trash2 className="h-4 w-4" />
        {compactMenu ? <span>حذف</span> : null}
      </button>
    </>
  );

  return (
    <>
      {compactMenu ? (
        <ExpandableActionMenu
          menuId={`activity-assignment-${assignment.id}`}
          className="justify-end"
          stripClassName="flex flex-wrap justify-end rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
        >
          {actions}
        </ExpandableActionMenu>
      ) : (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}

      <SmartActionModal
        open={confirmDelete}
        title="حذف التكليف"
        description="هل أنت متأكد من حذف هذا التكليف؟ لا يمكن التراجع عن هذا الإجراء."
        variant="danger"
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        loading={deleting}
        portal
        onClose={() => !deleting && setConfirmDelete(false)}
        onConfirm={() => void deleteAssignment()}
      />
    </>
  );
}
