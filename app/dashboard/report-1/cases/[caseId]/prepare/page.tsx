import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import {
  getSchoolSubscriptionOverview,
  isServiceAllowedForSchool,
} from "@/lib/subscription/subscription-service";
import { buildSmartReportPayloadForCase } from "@/lib/report-engine/smart-report-payload-builder";
import type { SmartReportField } from "@/lib/report-engine/smart-report-types";
import {
  formatWorkflowDisplayValue,
  getWorkflowFieldKey,
  getWorkflowFieldLabel,
  type WorkflowValueLike,
} from "@/lib/workflow-values/workflow-display-value";
import {
  reportVariants,
  resolveReportVariantId,
} from "@/lib/report-engine/report-variant-registry";
import { ReportOneCaseWorkspace } from "@/components/report-1/report-one-case-workspace";

type PageProps = {
  params: Promise<{
    caseId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseTemplateJson(value: unknown) {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function isTemplateVisible(templateJson: Record<string, unknown> | null) {
  if (!templateJson) return true;

  const status = templateJson.status;

  return !status || status === "PUBLISHED";
}

type ReportOneFieldLookupItem = {
  key?: string | null;
  label?: string | null;
  type?: string | null;
  options?: Array<{
    label?: string | null;
    value?: string | null;
  }> | null;
};

function buildReportOneFieldMap(caseEntry: any) {
  const map = new Map<string, ReportOneFieldLookupItem>();

  caseEntry.workflow?.steps?.forEach((step: any) => {
    step.fields?.forEach((field: any) => {
      if (!field?.key) return;

      map.set(field.key, {
        key: field.key,
        label: field.label,
        type: field.type,
        options: field.options || [],
      });
    });
  });

  return map;
}

function normalizeReportOneCaseValue(
  value: any,
  fieldMap: Map<string, ReportOneFieldLookupItem>,
): WorkflowValueLike {
  const fieldKey = value.field?.key || value.fieldKey || "";
  const fieldFromWorkflow = fieldMap.get(fieldKey);

  return {
    id: value.id,
    fieldKey,
    value: value.value,
    jsonValue: value.jsonValue,
    field: value.field
      ? {
          key: value.field.key || fieldKey,
          label: value.field.label || fieldFromWorkflow?.label || fieldKey,
          type: value.field.type || fieldFromWorkflow?.type,
          options: value.field.options || fieldFromWorkflow?.options || [],
        }
      : fieldFromWorkflow
        ? fieldFromWorkflow
        : {
            key: fieldKey,
            label: fieldKey,
            options: [],
          },
  };
}

function shouldHideReportOneWorkflowValue(item: WorkflowValueLike) {
  const key = getWorkflowFieldKey(item);
  const normalizedKey = key.toLowerCase();

  return (
    !key ||
    key.endsWith("__other") ||
    ["student", "guardian", "metadata"].includes(normalizedKey) ||
    normalizedKey.includes("studentsearch") ||
    normalizedKey.includes("selectedstudent") ||
    normalizedKey.includes("snapshot") ||
    normalizedKey.includes("token") ||
    normalizedKey.includes("json") ||
    normalizedKey.includes("raw") ||
    normalizedKey.includes("url")
  );
}

function buildReportOneWorkflowFields(caseEntry: any): SmartReportField[] {
  const fieldMap = buildReportOneFieldMap(caseEntry);

  const normalizedValues = (caseEntry.values || []).map((value: any) =>
    normalizeReportOneCaseValue(value, fieldMap),
  );

  return normalizedValues
    .filter((item: WorkflowValueLike) => !shouldHideReportOneWorkflowValue(item))
    .map((item: WorkflowValueLike, index: number) => {
      const fieldKey = getWorkflowFieldKey(item);
      const fieldLabel = getWorkflowFieldLabel(item, index);
      const displayValue = formatWorkflowDisplayValue(item, normalizedValues);

      return {
        key: fieldKey,
        label: fieldLabel,
        value: displayValue || "",
      } as SmartReportField;
    })
    .filter((field: SmartReportField) => {
      return (
        String(field.key || "").trim().length > 0 &&
        String(field.label || "").trim().length > 0 &&
        String(field.value || "").trim().length > 0 &&
        String(field.value || "").trim() !== "—"
      );
    });
}
export default async function ReportOneCasePreparePage({
  params,
  searchParams,
}: PageProps) {
  const current = await requireDashboardUser();

  if (current.user.role !== "ADMIN") {
    if (!current.user.schoolAccountId) {
      redirect("/dashboard/plans?reason=activation-required");
    }

    const overview = await getSchoolSubscriptionOverview(
      current.user.schoolAccountId,
    );

    if (!overview.usable) {
      redirect("/dashboard/plans?reason=activation-required");
    }
  }

  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const caseId = String(resolvedParams.caseId || "").trim();
  const selectedVariantId = resolveReportVariantId(
    firstParam(resolvedSearchParams.variant),
  );

  const result = await buildSmartReportPayloadForCase({
    caseId,
    current,
  });

  if (!result.ok) {
    return (
      <main className="min-h-screen bg-[#f5f8f6] px-6 py-10" dir="rtl">
        <section className="mx-auto max-w-2xl rounded-[2rem] border border-red-100 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-black text-red-600">تعذر تجهيز التقرير</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            {result.message}
          </h1>
        </section>
      </main>
    );
  }

  if (current.user.role !== "ADMIN") {
    const access = await isServiceAllowedForSchool({
      schoolAccountId: current.user.schoolAccountId || "",
      serviceSlug: result.serviceSlug,
    });

    if (!access.ok) {
      const reason =
        access.reason === "SUBSCRIPTION_INACTIVE"
          ? "activation-required"
          : "service-not-in-plan";

      redirect(
        `/dashboard/plans?reason=${reason}&service=${encodeURIComponent(
          result.serviceSlug,
        )}`,
      );
    }
  }

  const templates = await prisma.reportTemplate.findMany({
    where: {
      isActive: true,
      OR: [
        {
          serviceSlug: null,
        },
        {
          serviceSlug: result.serviceSlug,
        },
      ],
    },
    orderBy: [
      {
        serviceSlug: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
    select: {
      id: true,
      name: true,
      description: true,
      serviceSlug: true,
      type: true,
      templateJson: true,
      content: true,
      updatedAt: true,
    },
  });

  const templateOptions = templates
    .map((template) => {
      const templateJson =
        parseTemplateJson(template.templateJson) ||
        parseTemplateJson(template.content);

      return {
        id: template.id,
        name: template.name,
        description: template.description || "",
        serviceSlug: template.serviceSlug,
        type: template.type,
        isServiceSpecific: template.serviceSlug === result.serviceSlug,
        updatedAt: template.updatedAt.toISOString(),
        templateJson: templateJson as Record<string, unknown> | null,
        visible: isTemplateVisible(templateJson),
      };
    })
    .filter((template) => template.visible)
    .map(({ visible, ...template }) => template);

  const caseEntryForFieldSelection = await prisma.caseEntry.findUnique({
    where: {
      id: result.caseEntryId,
    },
    include: {
      workflow: {
        include: {
          steps: {
            include: {
              fields: {
                include: {
                  options: {
                    orderBy: {
                      order: "asc",
                    },
                  },
                },
                orderBy: {
                  order: "asc",
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },
      values: {
        include: {
          field: {
            include: {
              options: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  const allWorkflowFields = caseEntryForFieldSelection
    ? buildReportOneWorkflowFields(caseEntryForFieldSelection as any)
    : [];

  return (
    <ReportOneCaseWorkspace
      payload={result.payload}
      selectedVariantId={selectedVariantId}
      variants={reportVariants}
      templates={templateOptions}
      allWorkflowFields={allWorkflowFields}
    />
  );
}