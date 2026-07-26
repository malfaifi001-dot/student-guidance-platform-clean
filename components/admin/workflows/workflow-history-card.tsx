"use client";

import { WorkflowEvidenceModeControl } from "@/components/admin/workflows/workflow-evidence-mode-control";
import { WorkflowHistoryActions } from "@/components/admin/workflows/workflow-history-actions";
import { WorkflowNameEditor } from "@/components/admin/workflows/workflow-name-editor";
import { WorkflowOriginalFileAction } from "@/components/admin/workflows/workflow-original-file-action";
import { WorkflowStudentPickerModeControl } from "@/components/admin/workflows/workflow-student-picker-mode-control";

export type WorkflowHistoryItem = {
  id: string;
  name: string;
  version: number;
  status: string;
  isActive: boolean;
  workflowTypeLabel: string;
  updatedAtLabel: string;
  stepsCount: number;
  fieldsCount: number;
  optionsCount: number;
  casesCount: number;
  studentPickerMode: string;
  evidenceMode: string;
  hasOriginalFile: boolean;
};

function statusLabel(workflow: WorkflowHistoryItem) {
  if (workflow.isActive) return "مفعل حاليًا";
  if (workflow.status === "DRAFT") return "مسودة";
  if (workflow.status === "ACTIVE") return "منشور غير مفعل";
  if (workflow.status === "ARCHIVED") return "مؤرشف";
  return workflow.status || "غير محدد";
}

function statusClass(workflow: WorkflowHistoryItem) {
  if (workflow.isActive) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (workflow.status === "DRAFT") return "bg-sky-50 text-sky-700 ring-sky-100";
  if (workflow.status === "ARCHIVED") return "bg-slate-100 text-slate-500 ring-slate-200";
  return "bg-amber-50 text-amber-700 ring-amber-100";
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

export function WorkflowHistoryCard({
  serviceSlug,
  workflow,
  archived = false,
}: {
  serviceSlug: string;
  workflow: WorkflowHistoryItem;
  archived?: boolean;
}) {
  return (
    <article
      className={[
        "rounded-3xl border p-5 transition",
        workflow.isActive
          ? "border-emerald-200 bg-emerald-50/40 shadow-sm"
          : archived
            ? "border-slate-200 bg-slate-50/60"
            : "border-slate-200 bg-white hover:border-sky-200 hover:shadow-sm",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={["rounded-full px-3 py-1 text-xs font-black ring-1", statusClass(workflow)].join(" ")}>
              {statusLabel(workflow)}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">Version {workflow.version}</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">{workflow.workflowTypeLabel}</span>
          </div>

          <WorkflowNameEditor serviceSlug={serviceSlug} workflowId={workflow.id} currentName={workflow.name} />
          <p className="mt-1 text-xs font-bold text-slate-500">آخر تحديث: {workflow.updatedAtLabel}</p>
        </div>

        {workflow.isActive ? <div className="rounded-2xl bg-emerald-700 px-4 py-3 text-xs font-black text-white">يظهر للموجه الآن</div> : null}
      </div>

      <div className="mt-4 flex justify-end">
        <WorkflowHistoryActions
          serviceSlug={serviceSlug}
          workflowId={workflow.id}
          workflowName={workflow.name}
          previewHref={`/dashboard/admin/workflows/${serviceSlug}/preview?workflowId=${workflow.id}`}
          isActive={workflow.isActive}
          casesCount={workflow.casesCount}
        />
      </div>

      <WorkflowOriginalFileAction serviceSlug={serviceSlug} workflowId={workflow.id} hasOriginalFile={workflow.hasOriginalFile} />

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <Metric label="الخطوات" value={workflow.stepsCount} />
        <Metric label="الحقول" value={workflow.fieldsCount} />
        <Metric label="الخيارات" value={workflow.optionsCount} />
      </div>

      <WorkflowStudentPickerModeControl
        serviceSlug={serviceSlug}
        workflowId={workflow.id}
        workflowName={workflow.name}
        initialMode={workflow.studentPickerMode as never}
        disabled={workflow.status === "ARCHIVED"}
        isActive={workflow.isActive}
      />
      <WorkflowEvidenceModeControl
        serviceSlug={serviceSlug}
        workflowId={workflow.id}
        workflowName={workflow.name}
        initialMode={workflow.evidenceMode as never}
        disabled={workflow.status === "ARCHIVED"}
        isActive={workflow.isActive}
      />

      {workflow.casesCount > 0 ? (
        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-black leading-6 text-amber-800 ring-1 ring-amber-100">
          مستخدم في {new Intl.NumberFormat("ar-SA").format(workflow.casesCount)} حالات — يمكن تعديل اسم العرض دون التأثير على الحالات، ولا يمكن حذف النسخة.
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold leading-6 text-slate-500">
        {workflow.status === "DRAFT"
          ? "هذه نسخة مسودة. يمكن مراجعتها ونشرها لاحقًا بدون التأثير على النسخة المفعلة."
          : workflow.isActive
            ? "هذه هي النسخة المعتمدة التي يستخدمها الموجهون حاليًا."
            : "هذه نسخة محفوظة قديمة وليست هي التي تظهر للموجه الآن."}
      </div>
    </article>
  );
}
