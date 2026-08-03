import { notFound, redirect } from "next/navigation";

import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import {
  sortRuntimeWorkflow,
  type RuntimeWorkflow,
} from "@/engine/runtime/runtime-resolver";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { buildCaseEntryWhereForUser } from "@/lib/cases/case-access-scope";
import { resolveCaseCapabilities } from "@/lib/cases/case-permissions";
import { getActivityProgramsBillingServiceSlug } from "@/lib/activity-programs/activity-program-catalog";
import { prisma } from "@/lib/prisma";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";

type PageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

type WorkflowRuntimeSource = "SNAPSHOT" | "DATABASE";

function safeString(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();

  return text || fallback;
}

function safeNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function safeBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;

  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;

  return fallback;
}

function getSnapshotWorkflowSource(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  const record = snapshot as Record<string, any>;

  if (Array.isArray(record.steps)) {
    return record;
  }

  if (record.workflow && Array.isArray(record.workflow.steps)) {
    return record.workflow;
  }

  if (record.runtimeWorkflow && Array.isArray(record.runtimeWorkflow.steps)) {
    return record.runtimeWorkflow;
  }

  return null;
}

function buildWorkflowFromSnapshot(caseEntry: any): RuntimeWorkflow | null {
  const snapshotSource = getSnapshotWorkflowSource(caseEntry.workflowSnapshot);

  if (!snapshotSource) {
    return null;
  }

  const serviceSlug =
    safeString(snapshotSource.service?.slug) ||
    safeString(caseEntry.service?.slug) ||
    "unknown-service";

  return sortRuntimeWorkflow({
    id:
      safeString(snapshotSource.id) ||
      safeString(caseEntry.workflowId) ||
      `snapshot-${caseEntry.id}`,
    name:
      safeString(snapshotSource.name) ||
      safeString(caseEntry.workflow?.name) ||
      "Workflow Snapshot",
    serviceSlug,
    workflowType:
      safeString(snapshotSource.workflowType) ||
      safeString(caseEntry.workflow?.workflowType) ||
      "service-main",
    studentPickerMode:
      safeString(snapshotSource.studentPickerMode) ||
      safeString(caseEntry.workflow?.studentPickerMode) ||
      "SERVICE_DEFAULT",
    evidenceMode:
      safeString(snapshotSource.evidenceMode) ||
      safeString(caseEntry.workflow?.evidenceMode) ||
      "SERVICE_DEFAULT",
    steps: Array.isArray(snapshotSource.steps)
      ? snapshotSource.steps.map((step: any, stepIndex: number) => ({
          id: safeString(step.id, `snapshot-step-${stepIndex + 1}`),
          title: safeString(step.title, `خطوة ${stepIndex + 1}`),
          description: step.description ?? null,
          order: safeNumber(step.order, stepIndex + 1),
          fields: Array.isArray(step.fields)
            ? step.fields.map((field: any, fieldIndex: number) => ({
                id: safeString(
                  field.id,
                  `snapshot-field-${stepIndex + 1}-${fieldIndex + 1}`,
                ),
                key: safeString(field.key, `field_${fieldIndex + 1}`),
                label:
                  safeString(field.label) ||
                  safeString(field.key) ||
                  `حقل ${fieldIndex + 1}`,
                type: safeString(field.type, "TEXT"),
                placeholder: field.placeholder ?? null,
                helpText: field.helpText ?? null,
                isRequired: safeBoolean(field.isRequired),
                order: safeNumber(field.order, fieldIndex + 1),
                dependsOnFieldKey: field.dependsOnFieldKey ?? null,
                linkedToValue: field.linkedToValue ?? null,
                allowOther: safeBoolean(field.allowOther),
                isRepeater: safeBoolean(field.isRepeater),
                options: Array.isArray(field.options)
                  ? field.options.map((option: any, optionIndex: number) => ({
                      id: safeString(
                        option.id,
                        `snapshot-option-${stepIndex + 1}-${fieldIndex + 1}-${optionIndex + 1}`,
                      ),
                      label:
                        safeString(option.label) ||
                        safeString(option.value) ||
                        `خيار ${optionIndex + 1}`,
                      value:
                        safeString(option.value) ||
                        safeString(option.label) ||
                        `option_${optionIndex + 1}`,
                      order: safeNumber(option.order, optionIndex + 1),
                      linkedToValue: option.linkedToValue ?? null,
                    }))
                  : [],
              }))
            : [],
        }))
      : [],
  });
}

function buildWorkflowFromDatabase(caseEntry: any): RuntimeWorkflow | null {
  if (!caseEntry.workflow || !caseEntry.service) {
    return null;
  }

  return sortRuntimeWorkflow({
    id: caseEntry.workflow.id,
    name: caseEntry.workflow.name,
    serviceSlug: caseEntry.service.slug,
    workflowType: caseEntry.workflow.workflowType,
    studentPickerMode: caseEntry.workflow.studentPickerMode || "SERVICE_DEFAULT",
    evidenceMode: caseEntry.workflow.evidenceMode || "SERVICE_DEFAULT",
    steps: caseEntry.workflow.steps.map((step: any) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      order: step.order,
      fields: step.fields.map((field: any) => ({
        id: field.id,
        key: field.key,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder,
        helpText: field.helpText,
        isRequired: field.isRequired,
        order: field.order,
        dependsOnFieldKey: field.dependsOnFieldKey,
        linkedToValue: field.linkedToValue,
        allowOther: field.allowOther,
        isRepeater: Boolean(field.isRepeater),
        options: field.options.map((option: any) => ({
          id: option.id,
          label: option.label,
          value: option.value,
          order: option.order,
          linkedToValue: option.linkedToValue,
        })),
      })),
    })),
  });
}

function resolveCaseWorkflow(caseEntry: any): {
  workflow: RuntimeWorkflow | null;
  source: WorkflowRuntimeSource;
} {
  const snapshotWorkflow = buildWorkflowFromSnapshot(caseEntry);

  if (snapshotWorkflow) {
    return {
      workflow: snapshotWorkflow,
      source: "SNAPSHOT",
    };
  }

  return {
    workflow: buildWorkflowFromDatabase(caseEntry),
    source: "DATABASE",
  };
}

export default async function EditCasePage({ params }: PageProps) {
  const { caseId } = await params;
  const context = await requireDashboardPageContext();

  const schoolAccountId = context.schoolAccountId;

  if (!context.isAdmin && !schoolAccountId) {
    redirect("/dashboard/onboarding?required=true");
  }

  const caseWhere = {
    id: caseId,
    ...buildCaseEntryWhereForUser({
      id: context.user.id,
      role: context.user.role,
      schoolAccountId,
      email: context.user.email,
    }),
  };

  const caseEntry = await prisma.caseEntry.findFirst({
    where: caseWhere,
    include: {
      values: true,
      evidences: true,
      service: true,
      activityAssignment: {
        select: {
          teacherEmail: true,
          status: true,
        },
      },
      guidanceReports: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          approvedAt: true,
        },
      },
      workflow: {
        include: {
          steps: {
            include: {
              fields: {
                include: {
                  options: true,
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },
    },
  });

  if (!caseEntry || !caseEntry.service) {
    notFound();
  }

  if (
    !resolveCaseCapabilities(
      {
        id: context.user.id,
        role: context.user.role,
        schoolAccountId,
        email: context.user.email,
      },
      caseEntry,
    ).canEditCase
  ) {
    notFound();
  }

  await requireServiceAccessForCurrentUser(
    getActivityProgramsBillingServiceSlug(caseEntry.service.slug),
  );

  if (
    caseEntry.service.slug === "guardian-summons" &&
    !context.isAdmin &&
    context.user.role !== "COUNSELOR"
  ) {
    notFound();
  }

  const { workflow, source } = resolveCaseWorkflow(caseEntry);

  if (!workflow) {
    notFound();
  }

  const initialValues = Object.fromEntries(
    caseEntry.values.map((value) => [
      value.fieldKey,
      value.jsonValue ?? value.value,
    ]),
  );

  const evidenceItems = caseEntry.evidences.map((item) => ({
    id: item.id,
    fileName: item.fileName || "ملف",
    fileUrl: item.fileUrl || "#",
    mimeType: item.mimeType || "application/octet-stream",
    size: item.size || 0,
  }));

  const latestReportTwoSnapshot = await prisma.reportSnapshot.findFirst({
    where: {
      caseEntryId: caseEntry.id,
      ...(context.isAdmin ? {} : { schoolAccountId: caseEntry.schoolAccountId }),
    },
    orderBy: { approvedAt: "desc" },
    select: { id: true, approvedAt: true },
  });
  const activeReportTwo = await prisma.reportTwoActive.findFirst({
    where: {
      caseEntryId: caseEntry.id,
      ...(context.isAdmin ? {} : { schoolAccountId: caseEntry.schoolAccountId }),
    },
    select: { id: true, status: true, approvedAt: true },
  });
  const latestSavedReport = caseEntry.guidanceReports[0] || null;
  const hasApprovedReport = Boolean(
    activeReportTwo?.status === "APPROVED" ||
      latestReportTwoSnapshot?.approvedAt ||
      latestSavedReport?.status === "APPROVED" ||
      latestSavedReport?.approvedAt,
  );
  const hasSavedReport = Boolean(
    activeReportTwo || latestReportTwoSnapshot || latestSavedReport,
  );
  const reportSyncStatus =
    activeReportTwo?.status || (latestReportTwoSnapshot ? "APPROVED" : null);

  return (
    <div className="space-y-5" dir="rtl">
      {hasSavedReport ? (
        <section className="rounded-[2rem] border border-sky-200 bg-sky-50 px-5 py-4 text-sky-950 shadow-sm">
          <h2 className="text-base font-black">
            {hasApprovedReport
              ? "هذه الحالة لها تقرير معتمد"
              : "هذه الحالة لها تقرير محفوظ"}
          </h2>
          <p className="mt-2 text-sm font-bold leading-7 text-sky-800">
            {hasApprovedReport
              ? "سيتم تحديث البيانات المرتبطة داخل التقرير المعتمد بعد حفظ الحالة، مع بقاء التقرير بحالة معتمد وبقاء تاريخ الاعتماد كما هو."
              : "سيتم تحديث البيانات المرتبطة داخل التقرير تلقائيًا بعد حفظ الحالة."}
          </p>
        </section>
      ) : null}

      {source === "SNAPSHOT" ? (
        <section className="rounded-[2rem] border border-amber-100 bg-amber-50 px-5 py-4 text-sm font-bold leading-7 text-amber-800">
          هذه الحالة تستخدم نسخة محفوظة من Workflow وقت إنشاء الحالة، لذلك لن
          تتأثر بأي رفع أو نشر جديد من لوحة الأدمن.
        </section>
      ) : (
        <section className="rounded-[2rem] border border-slate-200 bg-white px-5 py-4 text-sm font-bold leading-7 text-slate-500">
          هذه الحالة تستخدم Workflow الأصلي المرتبط بها. الحالات الجديدة ستحفظ
          Snapshot تلقائيًا عند إنشائها.
        </section>
      )}

      <DynamicFormRenderer
        workflow={workflow}
        serviceId={caseEntry.serviceId}
        caseId={caseEntry.id}
        title={caseEntry.title ?? undefined}
        initialValues={initialValues}
        initialEvidenceItems={evidenceItems}
        reportSyncStatus={reportSyncStatus}
      />
    </div>
  );
}
