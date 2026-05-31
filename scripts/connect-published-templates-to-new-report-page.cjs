const fs = require("fs");

const path = "app/dashboard/reports/new/page.tsx";
let content = fs.readFileSync(path, "utf8");

const newContent = `import { prisma } from "@/lib/prisma";
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
            field: true,
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
    title: caseEntry.title || caseEntry.service.name,
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
            ? "SERVICE"
            : "GLOBAL",
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
`;

fs.writeFileSync(path, newContent, "utf8");

console.log("تم تحديث صفحة إنشاء التقرير لجلب القوالب المنشورة وتمريرها للموجه.");
