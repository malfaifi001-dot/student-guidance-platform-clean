import { prisma } from "../lib/prisma";

async function main() {
  const templates = await prisma.reportTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      name: true,
      serviceSlug: true,
      isActive: true,
      templateJson: true,
      content: true,
      updatedAt: true,
    },
  });

  const reports = await prisma.guidanceReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      templateId: true,
      templateSnapshot: true,
      createdAt: true,
    },
  });

  console.log("===== REPORT TEMPLATES =====");
  for (const template of templates) {
    const raw = template.templateJson || template.content;
    let parsed: any = raw;

    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }

    console.log({
      id: template.id,
      name: template.name,
      isActive: template.isActive,
      serviceSlug: template.serviceSlug,
      jsonStatus: parsed?.status,
      pagesCount: Array.isArray(parsed?.pages) ? parsed.pages.length : 0,
      updatedAt: template.updatedAt,
    });
  }

  console.log("\n===== LATEST REPORTS =====");
  for (const report of reports) {
    const snapshot = report.templateSnapshot as any;

    console.log({
      id: report.id,
      title: report.title,
      templateId: report.templateId,
      snapshotSource: snapshot?.source,
      snapshotTemplateName: snapshot?.templateName,
      hasBuilderTemplate: Boolean(snapshot?.builderTemplate),
      builderTemplateName: snapshot?.builderTemplate?.name,
      builderPagesCount: Array.isArray(snapshot?.builderTemplate?.pages)
        ? snapshot.builderTemplate.pages.length
        : 0,
      createdAt: report.createdAt,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
