const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SERVICE_SLUG = "student-follow-up";

async function main() {
  const service = await prisma.service.findUnique({
    where: { slug: SERVICE_SLUG },
    select: { id: true, slug: true, name: true },
  });

  if (!service) {
    console.log("لم يتم العثور على خدمة:", SERVICE_SLUG);

    const similarServices = await prisma.service.findMany({
      where: {
        OR: [
          { slug: { contains: "student" } },
          { slug: { contains: "follow" } },
          { name: { contains: "متابعة" } },
        ],
      },
      select: { id: true, slug: true, name: true },
    });

    console.log("خدمات مشابهة:");
    console.table(similarServices);
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
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }, { version: "desc" }],
  });

  console.log("الخدمة:", service.name, service.slug);
  console.log("عدد Workflows قبل الحذف:", workflows.length);
  console.table(
    workflows.map((w) => ({
      id: w.id,
      name: w.name,
      version: w.version,
      status: w.status,
      isActive: w.isActive,
      workflowType: w.workflowType,
    }))
  );

  if (workflows.length === 0) {
    console.log("لا يوجد أي Workflow لحذفه.");
    return;
  }

  const workflowIds = workflows.map((w) => w.id);

  const steps = await prisma.workflowStep.findMany({
    where: { workflowId: { in: workflowIds } },
    select: { id: true },
  });

  const stepIds = steps.map((s) => s.id);

  const fields = stepIds.length
    ? await prisma.dynamicField.findMany({
        where: { stepId: { in: stepIds } },
        select: { id: true },
      })
    : [];

  const fieldIds = fields.map((f) => f.id);

  const result = await prisma.$transaction(async (tx) => {
    const detachedCaseValues = fieldIds.length
      ? await tx.caseValue.updateMany({
          where: { fieldId: { in: fieldIds } },
          data: { fieldId: null },
        })
      : { count: 0 };

    const detachedCases = await tx.caseEntry.updateMany({
      where: { workflowId: { in: workflowIds } },
      data: { workflowId: null },
    });

    const deletedOptions = fieldIds.length
      ? await tx.dynamicFieldOption.deleteMany({
          where: { fieldId: { in: fieldIds } },
        })
      : { count: 0 };

    const deletedFields = fieldIds.length
      ? await tx.dynamicField.deleteMany({
          where: { id: { in: fieldIds } },
        })
      : { count: 0 };

    const deletedSteps = stepIds.length
      ? await tx.workflowStep.deleteMany({
          where: { id: { in: stepIds } },
        })
      : { count: 0 };

    const deletedWorkflows = await tx.workflow.deleteMany({
      where: { id: { in: workflowIds } },
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

  console.log("نتيجة الحذف:");
  console.table(result);

  const remaining = await prisma.workflow.findMany({
    where: { serviceId: service.id },
    select: {
      id: true,
      name: true,
      version: true,
      status: true,
      isActive: true,
      workflowType: true,
    },
  });

  console.log("عدد Workflows بعد الحذف:", remaining.length);
  console.table(remaining);

  if (remaining.length === 0) {
    console.log("تم الحذف الكامل بنجاح. الآن متابعة الطلاب بدون أي Workflow.");
  }
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
