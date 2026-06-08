const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SERVICE_SLUG = "student-follow-up";

function maskDatabaseUrl(value) {
  if (!value) return "DATABASE_URL غير ظاهر";
  return value.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
}

function assertNotHostinger() {
  const databaseUrl = process.env.DATABASE_URL || "";

  console.log("DATABASE_URL:", maskDatabaseUrl(databaseUrl));

  const blockedWords = [
    "hostinger",
    "hostingersite",
    "paleturquoise",
    "smstudents.com",
    "82.25.",
  ];

  const looksProduction = blockedWords.some((word) =>
    databaseUrl.toLowerCase().includes(word.toLowerCase())
  );

  if (looksProduction && process.env.ALLOW_PRODUCTION_DELETE !== "YES") {
    throw new Error(
      "تم إيقاف العملية لأن DATABASE_URL يبدو أنه خاص بالهوستنقر/الإنتاج. هذا السكربت مخصص للمحلي فقط."
    );
  }
}

async function main() {
  assertNotHostinger();

  const service = await prisma.service.findUnique({
    where: { slug: SERVICE_SLUG },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  if (!service) {
    console.log("لم يتم العثور على خدمة student-follow-up.");
    return;
  }

  const workflows = await prisma.workflow.findMany({
    where: { serviceId: service.id },
    select: {
      id: true,
      name: true,
      version: true,
      status: true,
      isActive: true,
      workflowType: true,
    },
    orderBy: [{ updatedAt: "desc" }, { version: "desc" }],
  });

  console.log("عدد Workflows الموجودة:", workflows.length);

  if (workflows.length === 0) {
    console.log("لا يوجد أي Workflow لخدمة متابعة الطلاب.");
    return;
  }

  console.table(workflows);

  const workflowIds = workflows.map((workflow) => workflow.id);

  const steps = await prisma.workflowStep.findMany({
    where: {
      workflowId: { in: workflowIds },
    },
    select: { id: true },
  });

  const stepIds = steps.map((step) => step.id);

  const fields = stepIds.length
    ? await prisma.dynamicField.findMany({
        where: {
          stepId: { in: stepIds },
        },
        select: { id: true },
      })
    : [];

  const fieldIds = fields.map((field) => field.id);

  const result = await prisma.$transaction(async (tx) => {
    const detachedCaseValues = fieldIds.length
      ? await tx.caseValue.updateMany({
          where: {
            fieldId: { in: fieldIds },
          },
          data: {
            fieldId: null,
          },
        })
      : { count: 0 };

    const detachedCases = await tx.caseEntry.updateMany({
      where: {
        workflowId: { in: workflowIds },
      },
      data: {
        workflowId: null,
      },
    });

    const deletedOptions = fieldIds.length
      ? await tx.dynamicFieldOption.deleteMany({
          where: {
            fieldId: { in: fieldIds },
          },
        })
      : { count: 0 };

    const deletedFields = fieldIds.length
      ? await tx.dynamicField.deleteMany({
          where: {
            id: { in: fieldIds },
          },
        })
      : { count: 0 };

    const deletedSteps = stepIds.length
      ? await tx.workflowStep.deleteMany({
          where: {
            id: { in: stepIds },
          },
        })
      : { count: 0 };

    const deletedWorkflows = await tx.workflow.deleteMany({
      where: {
        id: { in: workflowIds },
      },
    });

    return {
      detachedCaseValues: detachedCaseValues.count,
      detachedCases: detachedCases.count,
      deletedOptions: deletedOptions.count,
      deletedFields: deletedFields.count,
      deletedSteps: deletedSteps.count,
      deletedWorkflows: deletedWorkflows.count,
    };
  });

  console.log("تم حذف كل Workflows متابعة الطلاب بنجاح:");
  console.table(result);

  const remaining = await prisma.workflow.count({
    where: {
      service: {
        slug: SERVICE_SLUG,
      },
    },
  });

  console.log("المتبقي بعد الحذف:", remaining);
}

main()
  .catch((error) => {
    console.error("فشل الحذف:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
