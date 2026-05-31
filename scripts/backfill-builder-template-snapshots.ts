import { prisma } from "../lib/prisma";

function parseBuilderTemplateJson(value: unknown) {
  if (!value) return null;

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

async function main() {
  const reports = await prisma.guidanceReport.findMany({
    where: {
      templateId: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  let updatedCount = 0;

  for (const report of reports) {
    const snapshot = report.templateSnapshot as any;

    if (snapshot?.source === "TEMPLATE_BUILDER" && snapshot?.builderTemplate) {
      continue;
    }

    if (!report.templateId) {
      continue;
    }

    const builderTemplate = await prisma.reportTemplate.findUnique({
      where: {
        id: report.templateId,
      },
    });

    if (!builderTemplate) {
      continue;
    }

    const templateJson =
      parseBuilderTemplateJson(builderTemplate.templateJson) ||
      parseBuilderTemplateJson(builderTemplate.content);

    if (!templateJson || !Array.isArray(templateJson.pages)) {
      continue;
    }

    await prisma.guidanceReport.update({
      where: {
        id: report.id,
      },
      data: {
        templateSnapshot: {
          templateId: builderTemplate.id,
          templateName: builderTemplate.name,
          version: 1,
          capturedAt: new Date().toISOString(),
          source: "TEMPLATE_BUILDER",
          settings: {
            showCover: true,
            defaultTemplate: builderTemplate.id,
            defaultEvidenceLayout: "grid-2x2",
            pageSize: "A4",
            direction: "rtl",
          },
          builderTemplate: {
            ...templateJson,
            id: builderTemplate.id,
            name: builderTemplate.name || templateJson.name,
            description:
              builderTemplate.description ||
              templateJson.description ||
              "قالب تقرير محفوظ من صانع القوالب.",
            serviceSlug:
              builderTemplate.serviceSlug || templateJson.serviceSlug || null,
            status: templateJson.status || "PUBLISHED",
          },
        },
      },
    });

    updatedCount++;
  }

  console.log(`تم تحديث ${updatedCount} تقرير وربطه بقالب Builder Snapshot.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
