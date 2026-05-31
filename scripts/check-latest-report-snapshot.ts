import { prisma } from "../lib/prisma";

async function main() {
  const report = await prisma.guidanceReport.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      templateId: true,
      templateSnapshot: true,
      createdAt: true,
    },
  });

  const snapshot = report?.templateSnapshot as any;

  console.log({
    reportId: report?.id,
    title: report?.title,
    templateId: report?.templateId,
    snapshotSource: snapshot?.source,
    hasBuilderTemplate: Boolean(snapshot?.builderTemplate),
    builderTemplateName: snapshot?.builderTemplate?.name,
    builderPagesCount: Array.isArray(snapshot?.builderTemplate?.pages)
      ? snapshot.builderTemplate.pages.length
      : 0,
    firstPageTitle: snapshot?.builderTemplate?.pages?.[0]?.title,
    firstPageBlocks: snapshot?.builderTemplate?.pages?.[0]?.blocks?.map((block: any) => ({
      id: block.id,
      kind: block.kind,
      title: block.title,
    })),
    createdAt: report?.createdAt,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
