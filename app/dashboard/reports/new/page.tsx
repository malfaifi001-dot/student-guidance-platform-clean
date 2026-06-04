import { prisma } from "@/lib/prisma";
import { NewReportCasePicker } from "@/components/reports/new-report-case-picker";

type NewReportPageProps = {
  searchParams?: Promise<{
    caseId?: string;
  }>;
};

function parseTemplateJson(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, any>;
    } catch {
      return null;
    }
  }

  if (typeof value === "object") {
    return value as Record<string, any>;
  }

  return null;
}


const REPORT_CASE_TITLE_FALLBACK_LABELS: Record<string, string> = {
  positive_behavior_discipline: "برنامج تعزيز السلوك الإيجابي والانضباط المدرسي",
  behavior_discipline: "برنامج تعزيز السلوك الإيجابي والانضباط المدرسي",
};

function normalizeReportCaseTitleText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanReportCaseTitle(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text || text === "null" || text === "undefined" || text.length > 140) {
    return "";
  }

  return text;
}

function stringifyReportCaseTitleCandidate(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return cleanReportCaseTitle(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = stringifyReportCaseTitleCandidate(item);

      if (candidate) {
        return candidate;
      }
    }

    return "";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const key of [
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
    ]) {
      const candidate = stringifyReportCaseTitleCandidate(record[key]);

      if (candidate) {
        return candidate;
      }
    }
  }

  return "";
}

function isGenericReportCaseTitle(title: string) {
  const normalized = normalizeReportCaseTitleText(title);

  return (
    !normalized ||
    normalized === "بدون عنوان" ||
    normalized === "حاله بدون عنوان" ||
    normalized === "حالة بدون عنوان" ||
    normalized === "حاله جديده" ||
    normalized === "حالة جديدة" ||
    normalized.includes("برنامج ارشادي جديد")
  );
}

function isReportCaseTitleField(value: any) {
  const text = normalizeReportCaseTitleText(
    [value?.fieldKey, value?.field?.key, value?.field?.label]
      .filter(Boolean)
      .join(" "),
  );

  return (
    text.includes("program") ||
    text.includes("activity") ||
    text.includes("title") ||
    text.includes("برنامج") ||
    text.includes("النشاط") ||
    text.includes("عنوان") ||
    text.includes("موضوع")
  );
}

function extractReportCaseTitleSelectedValues(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractReportCaseTitleSelectedValues(item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return [
      ...extractReportCaseTitleSelectedValues(record.value),
      ...extractReportCaseTitleSelectedValues(record.id),
      ...extractReportCaseTitleSelectedValues(record.key),
      ...extractReportCaseTitleSelectedValues(record.slug),
      ...extractReportCaseTitleSelectedValues(record.label),
      ...extractReportCaseTitleSelectedValues(record.name),
    ];
  }

  return [];
}

function getReportCaseOptionLabel(value: any) {
  const selectedValues = extractReportCaseTitleSelectedValues(
    value?.jsonValue ?? value?.value,
  );

  const options = Array.isArray(value?.field?.options)
    ? value.field.options
    : [];

  for (const selectedValue of selectedValues) {
    const cleanSelected = String(selectedValue).trim();

    if (!cleanSelected) {
      continue;
    }

    const fallbackLabel = REPORT_CASE_TITLE_FALLBACK_LABELS[cleanSelected];

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
      return cleanReportCaseTitle(option.label);
    }
  }

  return "";
}

function getReportCaseValueTitle(value: any) {
  return (
    getReportCaseOptionLabel(value) ||
    stringifyReportCaseTitleCandidate(value?.jsonValue) ||
    stringifyReportCaseTitleCandidate(value?.value)
  );
}

function getSmartReportCaseTitle(caseEntry: any) {
  const values = Array.isArray(caseEntry.values) ? caseEntry.values : [];

  for (const value of values) {
    if (!isReportCaseTitleField(value)) {
      continue;
    }

    const candidate = getReportCaseValueTitle(value);

    if (candidate && !isGenericReportCaseTitle(candidate)) {
      return candidate;
    }
  }

  const savedTitle = cleanReportCaseTitle(caseEntry.title);

  if (savedTitle && !isGenericReportCaseTitle(savedTitle)) {
    return savedTitle;
  }

  return caseEntry.service?.name || "حالة جديدة";
}


export default async function NewReportPage({
  searchParams,
}: NewReportPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedCaseId = params.caseId?.trim() || "";

  const [cases, reportTemplates] = await Promise.all([
    prisma.caseEntry.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      include: {
        service: true,
        student: {
          include: {
            guardian: true,
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
        evidences: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    }),

    prisma.reportTemplate.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  const normalizedCases = cases.map((caseEntry) => ({
    id: caseEntry.id,
    title: getSmartReportCaseTitle(caseEntry),
    status: caseEntry.status,
    createdAt: caseEntry.createdAt.toISOString(),
    updatedAt: caseEntry.updatedAt.toISOString(),
    submittedAt: caseEntry.submittedAt?.toISOString() || null,

    service: {
      id: caseEntry.service.id,
      name: caseEntry.service.name,
      slug: caseEntry.service.slug,
    },

    student: caseEntry.student
      ? {
          id: caseEntry.student.id,
          fullName: caseEntry.student.fullName,
          nationalId: caseEntry.student.nationalId,
          stage: caseEntry.student.stage,
          grade: caseEntry.student.grade,
          classroom: caseEntry.student.classroom,
          guardianName: caseEntry.student.guardian?.name || null,
          guardianPhone: caseEntry.student.guardian?.phone || null,
        }
      : null,

    valuesCount: caseEntry.values.length,
    evidencesCount: caseEntry.evidences.length,
  }));

  const publishedTemplates = reportTemplates
    .map((template) => {
      const templateJson = parseTemplateJson(template.templateJson) || parseTemplateJson(template.content);

      const status =
        templateJson?.status === "PUBLISHED"
          ? "PUBLISHED"
          : templateJson?.status || "DRAFT";

      return {
        id: template.id,
        name: template.name,
        description:
          template.description ||
          templateJson?.description ||
          "قالب تقرير منشور من صانع القوالب.",
        serviceSlug: template.serviceSlug || templateJson?.serviceSlug || null,
        scope:
          templateJson?.scope === "SERVICE" || template.serviceSlug
            ? ("SERVICE" as const)
            : ("GLOBAL" as const),
        status,
        pagesCount: Array.isArray(templateJson?.pages)
          ? templateJson.pages.length
          : 0,
      };
    })
    .filter((template) => template.status === "PUBLISHED");

  return (
    <main className="space-y-6" dir="rtl">
      <NewReportCasePicker
        cases={normalizedCases}
        initialCaseId={selectedCaseId}
        publishedTemplates={publishedTemplates}
      />
    </main>
  );
}
