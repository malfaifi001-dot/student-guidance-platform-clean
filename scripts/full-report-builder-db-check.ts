import { prisma } from "../lib/prisma";

async function main() {
  const reports = await prisma.guidanceReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      templateId: true,
      templateSnapshot: true,
      createdAt: true,
    },
  });

  const templates = await prisma.reportTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    take: 10,
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

  console.log("===== LATEST REPORTS =====");
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

  console.log("===== LATEST TEMPLATES =====");
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
      serviceSlug: template.serviceSlug,
      isActive: template.isActive,
      status: parsed?.status,
      pagesCount: Array.isArray(parsed?.pages) ? parsed.pages.length : 0,
      pageTitles: Array.isArray(parsed?.pages)
        ? parsed.pages.map((page: any) => page.title)
        : [],
      blockKinds: Array.isArray(parsed?.pages)
        ? parsed.pages.flatMap((page: any) =>
            Array.isArray(page.blocks)
              ? page.blocks.map((block: any) => block.kind)
              : []
          )
        : [],
      updatedAt: template.updatedAt,
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
