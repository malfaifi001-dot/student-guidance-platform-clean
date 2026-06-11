
import { redirect } from "next/navigation";

import { CasesSearchTable } from "@/components/cases/cases-search-table";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { buildCaseEntryWhereForUser } from "@/lib/cases/case-access-scope";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date | string | null | undefined) {
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

function normalizeArabicText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

const CASE_TITLE_FALLBACK_LABELS: Record<string, string> = {
  positive_behavior_discipline: "برنامج تعزيز السلوك الإيجابي والانضباط المدرسي",
  behavior_discipline: "برنامج تعزيز السلوك الإيجابي والانضباط المدرسي",
};

function cleanTitleText(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text || text === "null" || text === "undefined") {
    return "";
  }

  if (text.length > 140) {
    return "";
  }

  return text;
}

function stringifyTitleCandidate(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return cleanTitleText(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = stringifyTitleCandidate(item);

      if (candidate) {
        return candidate;
      }
    }

    return "";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    const priorityKeys = [
      "program_name",
      "programName",
      "program",
      "guidanceProgram",
      "guidance_program",
      "selectedProgram",
      "activityName",
      "activity_name",
      "title",
      "name",
      "label",
      "value",
    ];

    for (const key of priorityKeys) {
      const candidate = stringifyTitleCandidate(record[key]);

      if (candidate) {
        return candidate;
      }
    }
  }

  return "";
}

function extractTitleSelectedValues(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractTitleSelectedValues(item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return [
      ...extractTitleSelectedValues(record.value),
      ...extractTitleSelectedValues(record.id),
      ...extractTitleSelectedValues(record.key),
      ...extractTitleSelectedValues(record.slug),
      ...extractTitleSelectedValues(record.label),
      ...extractTitleSelectedValues(record.name),
    ];
  }

  return [];
}

function getArabicOptionLabelFromCaseValue(value: any) {
  const selectedValues = extractTitleSelectedValues(
    value?.jsonValue ?? value?.value,
  );

  if (!selectedValues.length) {
    return "";
  }

  const options = Array.isArray(value?.field?.options)
    ? value.field.options
    : [];

  for (const selectedValue of selectedValues) {
    const cleanSelected = String(selectedValue).trim();

    if (!cleanSelected) {
      continue;
    }

    const fallbackLabel = CASE_TITLE_FALLBACK_LABELS[cleanSelected];

    if (fallbackLabel) {
      return fallbackLabel;
    }

    const option = options.find((item: any) => {
      return (
        String(item?.value || "").trim() === cleanSelected ||
        String(item?.label || "").trim() === cleanSelected
      );
    });

    if (option?.label) {
      return cleanTitleText(option.label);
    }
  }

  return "";
}

function getCaseValueText(value: any) {
  return (
    getArabicOptionLabelFromCaseValue(value) ||
    stringifyTitleCandidate(value?.jsonValue) ||
    stringifyTitleCandidate(value?.value)
  );
}

function isGenericCaseTitle(title: string) {
  const normalized = normalizeArabicText(title);

  return (
    !normalized ||
    normalized === "بدون عنوان" ||
    normalized === "حاله بدون عنوان" ||
    normalized === "حالة بدون عنوان" ||
    normalized === "حاله جديده" ||
    normalized === "حالة جديدة" ||
    normalized.includes("برنامج ارشادي جديد") ||
    normalized.includes("حاله جديده")
  );
}

function isTitleLikeField(value: any) {
  const fieldText = normalizeArabicText(
    [
      value?.fieldKey,
      value?.field?.key,
      value?.field?.label,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return (
    fieldText.includes("program") ||
    fieldText.includes("activity") ||
    fieldText.includes("title") ||
    fieldText.includes("برنامج") ||
    fieldText.includes("النشاط") ||
    fieldText.includes("عنوان") ||
    fieldText.includes("موضوع")
  );
}

function getCaseDisplayTitle(caseItem: any) {
  const values = Array.isArray(caseItem.values) ? caseItem.values : [];

  for (const value of values) {
    if (!isTitleLikeField(value)) {
      continue;
    }

    const candidate = getCaseValueText(value);

    if (candidate && !isGenericCaseTitle(candidate)) {
      return candidate;
    }
  }

  const savedTitle = cleanTitleText(caseItem.title);

  if (savedTitle && !isGenericCaseTitle(savedTitle)) {
    return savedTitle;
  }

  return caseItem.service?.name || "حالة جديدة";
}

function getCaseStatusLabel(status: string) {
  if (status === "DRAFT") return "مسودة";
  if (status === "SUBMITTED") return "مرسلة";
  if (status === "ARCHIVED") return "مؤرشفة";

  return status || "غير محدد";
}

function getReportStatusLabel(status?: string | null) {
  if (status === "DRAFT") return "مسودة";
  if (status === "GENERATED") return "مولد";
  if (status === "APPROVED") return "معتمد";
  if (status === "ARCHIVED") return "مؤرشف";

  return status || "غير محدد";
}

function getViewerId(context: unknown) {
  const record = context as Record<string, any>;

  return (
    record?.user?.id ||
    record?.currentUser?.id ||
    record?.sessionUser?.id ||
    record?.userId ||
    null
  ) as string | null;
}

function getViewerName(context: unknown) {
  const record = context as Record<string, any>;

  return (
    record?.user?.name ||
    record?.currentUser?.name ||
    record?.sessionUser?.name ||
    record?.name ||
    "الموجه/الموجهة"
  ) as string;
}

function getViewerRole(context: unknown) {
  const record = context as Record<string, any>;

  return (
    record?.user?.role ||
    record?.currentUser?.role ||
    record?.sessionUser?.role ||
    record?.role ||
    (record?.isAdmin ? "ADMIN" : "COUNSELOR")
  ) as string;
}

function getViewerSchoolAccountId(context: unknown) {
  const record = context as Record<string, any>;

  return (
    record?.user?.schoolAccountId ||
    record?.currentUser?.schoolAccountId ||
    record?.sessionUser?.schoolAccountId ||
    record?.schoolAccountId ||
    null
  ) as string | null;
}

export default async function CasesPage() {
  const context = await requireDashboardPageContext();

  const viewerRole = getViewerRole(context);
  const viewerSchoolAccountId = getViewerSchoolAccountId(context);

  if (viewerRole !== "ADMIN" && !viewerSchoolAccountId) {
    redirect("/dashboard/onboarding?required=true");
  }

  const viewerId = getViewerId(context);
  const viewerName = getViewerName(context);

  const cases = await prisma.caseEntry.findMany({
    where: buildCaseEntryWhereForUser({
      id: viewerId || "__NO_USER__",
      role: viewerRole,
      schoolAccountId: viewerSchoolAccountId,
    }),
    include: {
      service: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      workflow: {
        select: {
          id: true,
          name: true,
          workflowType: true,
        },
      },
      student: {
        include: {
          guardian: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
      values: {
        select: {
          fieldKey: true,
          value: true,
          jsonValue: true,
          field: {
            select: {
              key: true,
              label: true,
              options: {
                orderBy: {
                  order: "asc",
                },
                select: {
                  label: true,
                  value: true,
                  order: true,
                },
              },
            },
          },
        },
      },
      guidanceReports: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          status: true,
          templateId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      _count: {
        select: {
          values: true,
          evidences: true,
          guidanceReports: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 240,
  });

  const rows = cases.map((caseItem) => {
    const latestReport = caseItem.guidanceReports[0] || null;
    const reportPreviewUrl = latestReport
      ? `/dashboard/reports/${latestReport.id}/preview${
          latestReport.templateId
            ? `?template=${encodeURIComponent(latestReport.templateId)}`
            : ""
        }`
      : null;

    const studentMeta = [
      caseItem.student?.stage,
      caseItem.student?.grade,
      caseItem.student?.classroom
        ? `فصل ${caseItem.student.classroom}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      id: caseItem.id,
      title: getCaseDisplayTitle(caseItem),
      status: caseItem.status,
      statusLabel: getCaseStatusLabel(caseItem.status),
      createdAt: caseItem.createdAt.toISOString(),
      createdAtLabel: formatDate(caseItem.createdAt),
      updatedAt: caseItem.updatedAt.toISOString(),
      updatedAtLabel: formatDate(caseItem.updatedAt),
      submittedAt: caseItem.submittedAt?.toISOString() || null,
      submittedAtLabel: caseItem.submittedAt
        ? formatDate(caseItem.submittedAt)
        : null,

      service: {
        id: caseItem.service.id,
        name: caseItem.service.name,
        slug: caseItem.service.slug,
      },

      workflow: caseItem.workflow
        ? {
            id: caseItem.workflow.id,
            name: caseItem.workflow.name,
            workflowType: caseItem.workflow.workflowType,
          }
        : null,

      student: caseItem.student
        ? {
            id: caseItem.student.id,
            fullName: caseItem.student.fullName,
            nationalId: caseItem.student.nationalId,
            stage: caseItem.student.stage,
            grade: caseItem.student.grade,
            classroom: caseItem.student.classroom,
            guardianName: caseItem.student.guardian?.name || null,
            guardianPhone: caseItem.student.guardian?.phone || null,
            meta: studentMeta || "بيانات الطالب غير مكتملة",
          }
        : null,

      createdBy: caseItem.createdBy
        ? {
            id: caseItem.createdBy.id,
            name: caseItem.createdBy.name,
          }
        : null,

      isMine: Boolean(viewerId && caseItem.createdById === viewerId),
      valuesCount: caseItem._count.values,
      evidencesCount: caseItem._count.evidences,
      reportsCount: caseItem._count.guidanceReports,

      latestReport: latestReport
        ? {
            id: latestReport.id,
            status: latestReport.status,
            statusLabel: getReportStatusLabel(latestReport.status),
            templateId: latestReport.templateId,
            updatedAt: latestReport.updatedAt.toISOString(),
            updatedAtLabel: formatDate(latestReport.updatedAt),
            previewUrl: reportPreviewUrl,
          }
        : null,
    };
  });

  return (
    <main className="space-y-5" dir="rtl">
      <CasesSearchTable
        cases={rows}
        viewerName={viewerName}
        isAdmin={viewerRole === "ADMIN"}
        viewerRole={viewerRole}
      />
    </main>
  );
}
