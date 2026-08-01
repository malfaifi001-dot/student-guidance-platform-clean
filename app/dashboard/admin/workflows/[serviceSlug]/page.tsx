import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpLeft } from "lucide-react";

import { WorkflowHealthReport } from "@/components/admin/workflow-health/workflow-health-report";
import { WorkflowHistorySection } from "@/components/admin/workflows/workflow-history-section";
import { WorkflowInlineImportWorkbench } from "@/components/admin/workflows/workflow-inline-import-workbench";
import { WorkflowNameEditor } from "@/components/admin/workflows/workflow-name-editor";
import { WorkflowPublishPanel } from "@/components/admin/workflows/workflow-publish-panel";
import { validateWorkflow } from "@/engine/workflow-validation/workflow-validator";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

import { prisma } from "@/lib/prisma";
import {
  ensureDashboardWorkflowService,
  getWorkflowUploadServices,
  isWorkflowUploadEligibleService,
} from "@/lib/admin/workflows/ensure-dashboard-workflow-services";
import {
  getWorkflowPlacementLabel,
  isSecondaryWorkflow,
} from "@/lib/workflows/workflow-types";
import {
  getWorkflowActivationSlot,
  workflowBelongsToSlot,
} from "@/lib/workflows/workflow-slot";

type PageProps = {
  params: Promise<{
    serviceSlug: string;
  }>;
};

function formatWorkflowDate(value: Date | string | null | undefined) {
  if (!value) return "غير محدد";

  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(value);
  }
}

function countWorkflowFields(workflow: any) {
  return workflow.steps.reduce(
    (total: number, step: any) => total + step.fields.length,
    0,
  );
}

function countWorkflowOptions(workflow: any) {
  return workflow.steps.reduce(
    (total: number, step: any) =>
      total +
      step.fields.reduce(
        (fieldTotal: number, field: any) =>
          fieldTotal + field.options.length,
        0,
      ),
    0,
  );
}

export default async function ServiceWorkflowPage({ params }: PageProps) {
  await requireAdminPage();

  const { serviceSlug } = await params;

  const serviceConfig = getWorkflowUploadServices().find(
    (service) => service.slug === serviceSlug,
  );

  if (!serviceConfig || !isWorkflowUploadEligibleService(serviceConfig)) {
    notFound();
  }

  await ensureDashboardWorkflowService(serviceSlug);

  const service = await prisma.service.findUnique({
    where: {
      slug: serviceSlug,
    },
    include: {
      workflows: {
        include: {
          steps: {
            include: {
              fields: {
                include: {
                  options: true,
                },
              },
            },
          },
          _count: {
            select: {
              cases: true,
            },
          },
        },
        orderBy: {
          version: "desc",
        },
      },
    },
  });

  if (!service) {
    notFound();
  }

  const workflows = service.workflows;

  const defaultWorkflows = workflows.filter(
    (workflow) => workflowBelongsToSlot(workflow.workflowType, "service-main"),
  );

  const subWorkflows = workflows.filter((workflow) =>
    isSecondaryWorkflow(workflow.workflowType),
  );

  const activeWorkflow = [...defaultWorkflows]
    .filter((workflow) => workflow.isActive && workflow.status === "ACTIVE")
    .sort((a, b) => {
      const expected = getWorkflowActivationSlot(a);
      const aOwnsKey = a.activeKey === expected ? 1 : 0;
      const bOwnsKey = b.activeKey === getWorkflowActivationSlot(b) ? 1 : 0;
      return bOwnsKey - aOwnsKey || b.version - a.version || b.updatedAt.getTime() - a.updatedAt.getTime() || b.id.localeCompare(a.id);
    })[0];
  const latestDraftWorkflow = defaultWorkflows.find(
    (workflow) => workflow.status === "DRAFT",
  );

  const workflowForHealth = latestDraftWorkflow || activeWorkflow;

  const healthReport = workflowForHealth
    ? validateWorkflow({
        id: workflowForHealth.id,
        name: workflowForHealth.name,
        steps: workflowForHealth.steps.map((step) => ({
          id: step.id,
          title: step.title,
          fields: step.fields.map((field) => ({
            id: field.id,
            key: field.key,
            label: field.label,
            type: field.type,
            isRequired: field.isRequired,
            dependsOnFieldKey: field.dependsOnFieldKey,
            linkedToValue: field.linkedToValue,
            allowOther: field.allowOther,
            options: field.options.map((option) => ({
              id: option.id,
              label: option.label,
              value: option.value,
              linkedToValue: option.linkedToValue,
            })),
          })),
        })),
      })
    : null;

  const historyWorkflows = workflows.map((workflow) => ({
    id: workflow.id,
    name: workflow.name,
    version: workflow.version,
    status: String(workflow.status),
    isActive:
      workflow.isActive &&
      workflow.status === "ACTIVE" &&
      (workflow.activeKey
        ? workflow.activeKey === getWorkflowActivationSlot(workflow)
        : workflow.id === activeWorkflow?.id),
    workflowTypeLabel: getWorkflowPlacementLabel(workflow.workflowType),
    updatedAtLabel: formatWorkflowDate(workflow.updatedAt),
    stepsCount: workflow.steps.length,
    fieldsCount: countWorkflowFields(workflow),
    optionsCount: countWorkflowOptions(workflow),
    casesCount: workflow._count.cases,
    studentPickerMode: String(workflow.studentPickerMode),
    evidenceMode: String(workflow.evidenceMode),
    hasOriginalFile: Boolean(
      workflow.originalFileStorageKey && workflow.originalFileName,
    ),
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="text-xs font-black text-sky-700">Service Workflow</p>

            <h1 className="mt-2 text-4xl font-black text-slate-950">
              {serviceConfig.title}
            </h1>

            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-500">
              ارفع Excel، راجع النموذج مباشرة، ثم احفظه كمسودة. النشر وحده هو
              الذي يغير ما يظهر للموجهين.
            </p>
          </div>

          <Link
            href="/dashboard/admin/workflows"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowUpLeft className="h-4 w-4" />
            مركز Workflows
          </Link>
        </div>
      </section>

      <WorkflowInlineImportWorkbench
        serviceId={service.id}
        serviceSlug={serviceSlug}
        serviceName={serviceConfig.title}
      />

      <WorkflowPublishPanel
        serviceSlug={serviceSlug}
        previewHref={`/dashboard/admin/workflows/${serviceSlug}/preview`}
        hasDraft={Boolean(latestDraftWorkflow)}
        draftWorkflowId={latestDraftWorkflow?.id}
        draftWorkflowName={latestDraftWorkflow?.name}
        draftVersion={latestDraftWorkflow?.version}
        activeWorkflowName={activeWorkflow?.name}
      />

      <WorkflowHistorySection serviceSlug={serviceSlug} workflows={historyWorkflows} />

      {healthReport ? <WorkflowHealthReport report={healthReport} /> : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-emerald-700">
              Workflow الأساسي
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-900">
              النسخة المفعلة للموجه
            </h2>
          </div>

          {activeWorkflow ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
              مفعل
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
              غير مفعل
            </span>
          )}
        </div>

        {activeWorkflow ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-xs font-black text-slate-400">الاسم</p>

              <WorkflowNameEditor
                serviceSlug={serviceSlug}
                workflowId={activeWorkflow.id}
                currentName={activeWorkflow.name}
              />

              <p className="mt-2 text-sm font-bold text-slate-500">
                Version {activeWorkflow.version} ·{" "}
                {activeWorkflow.steps.length} خطوات
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {activeWorkflow.steps
                .sort((a, b) => a.order - b.order)
                .map((step) => (
                  <div
                    key={step.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <h3 className="font-black text-slate-900">
                      {step.order}. {step.title}
                    </h3>

                    <p className="mt-2 text-xs font-bold text-slate-500">
                      {step.fields.length} حقول
                    </p>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-amber-50 p-6 text-sm font-bold text-amber-700">
            لا يوجد Workflow أساسي مفعل لهذه الخدمة. ارفع ملف Excel أو انشر آخر
            مسودة.
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-black text-sky-700">
            Workflows فرعية داخل الخدمة
          </p>

          <h2 className="mt-1 text-2xl font-black text-slate-900">
            النماذج الفرعية
          </h2>
        </div>

        {subWorkflows.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {subWorkflows.map((workflow) => (
              <article
                key={workflow.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-emerald-700">
                      {getWorkflowPlacementLabel(workflow.workflowType)}
                    </p>

                    <h3 className="mt-1 text-lg font-black text-slate-900">
                      {workflow.name}
                    </h3>
                  </div>

                  <span
                    className={[
                      "rounded-full px-3 py-1 text-[11px] font-black",
                      workflow.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                  >
                    {workflow.isActive ? "مفعل" : workflow.status}
                  </span>
                </div>

                <p className="mt-3 text-sm font-bold text-slate-500">
                  Version {workflow.version} · {workflow.steps.length} خطوات
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm font-bold text-slate-500">
            لا توجد Workflows فرعية داخل هذه الخدمة.
          </div>
        )}
      </section>
    </div>
  );
}
