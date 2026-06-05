require("dotenv/config");

const { PrismaClient } = require("@prisma/client");

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  try {
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

    if (databaseUrl) {
      const adapter = new PrismaBetterSqlite3({
        url: databaseUrl,
      });

      return new PrismaClient({ adapter });
    }
  } catch {
    // fallback for projects not requiring Prisma adapter
  }

  return new PrismaClient();
}

const prisma = createPrismaClient();

async function main() {
  const before = {
    workflows: await prisma.workflow.count(),
    steps: await prisma.workflowStep.count(),
    fields: await prisma.dynamicField.count(),
    options: await prisma.dynamicFieldOption.count(),
    casesLinkedToWorkflow: await prisma.caseEntry.count({
      where: {
        workflowId: {
          not: null,
        },
      },
    }),
    valuesLinkedToFields: await prisma.caseValue.count({
      where: {
        fieldId: {
          not: null,
        },
      },
    }),
  };

  console.log("BEFORE_DELETE", before);

  await prisma.$transaction(async (tx) => {
    await tx.caseValue.updateMany({
      where: {
        fieldId: {
          not: null,
        },
      },
      data: {
        fieldId: null,
      },
    });

    await tx.caseEntry.updateMany({
      where: {
        workflowId: {
          not: null,
        },
      },
      data: {
        workflowId: null,
      },
    });

    await tx.workflow.deleteMany({});
  });

  const after = {
    workflows: await prisma.workflow.count(),
    steps: await prisma.workflowStep.count(),
    fields: await prisma.dynamicField.count(),
    options: await prisma.dynamicFieldOption.count(),
    casesLinkedToWorkflow: await prisma.caseEntry.count({
      where: {
        workflowId: {
          not: null,
        },
      },
    }),
    valuesLinkedToFields: await prisma.caseValue.count({
      where: {
        fieldId: {
          not: null,
        },
      },
    }),
  };

  console.log("AFTER_DELETE", after);
  console.log("✅ تم حذف كل Workflows الحالية مع الإبقاء على الخدمات والحالات.");
}

main()
  .catch((error) => {
    console.error("❌ فشل حذف Workflows");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
