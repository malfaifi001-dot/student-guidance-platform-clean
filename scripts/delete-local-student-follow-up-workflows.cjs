const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SERVICE_SLUG = "student-follow-up";

function maskDatabaseUrl(value) {
  if (!value) return "غير موجود";
  return value.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
}

function assertLocalDatabase() {
  const databaseUrl = process.env.DATABASE_URL || "";

  const blocked = [
    "hostinger",
    "hostingersite",
    "smstudents.com",
    "82.25.",
    "paleturquoise-mandrill",
  ];

  const looksProduction = blocked.some((item) =>
    databaseUrl.toLowerCase().includes(item.toLowerCase())
  );

  if (looksProduction) {
    throw new Error(
      "تم إيقاف العملية: DATABASE_URL يبدو أنه خاص بالإنتاج/Hostinger. لن يتم الحذف."
    );
  }

  if (process.env.CONFIRM_DELETE_STUDENT_FOLLOW_UP_WORKFLOWS !== "YES") {
    throw new Error(
      "للتأكيد شغّل الأمر مع CONFIRM_DELETE_STUDENT_FOLLOW_UP_WORKFLOWS=YES"
    );
  }

  console.log("DATABASE_URL:", maskDatabaseUrl(databaseUrl));
}

async function main() {
  assertLocalDatabase();

  const service = await prisma.service.findUnique({
    where: {
      slug: SERVICE_SLUG,
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  if (!service) {
    console.log(`لم يتم العثور على خدمة بالـ slug: ${SERVICE_SLUG}`);
    return;
  }

  const workflows = await prisma.workflow.findMany({
    where: {
      serviceId: service.id,
    },
    select: {
      id: true,
      name: true,
      version: true,
      status: true,
      isActive: true,
      workflowType: true,
    },
    orderBy: [
      { updatedAt: "desc" },
      { version: "desc" },
    ],
  });

  if (workflows.length === 0) {
    console.log("لا يوجد أي Workflow لهذه الخدمة.");
    return;
  }

  const workflowIds = workflows.map((workflow) => workflow.id);

  const steps = await prisma.workflowStep.findMany({
    where: {
      workflowId: {
        in: workflowIds,
      },
    },
    select: {
      id: true,
    },
  });

  const stepIds = steps.map((step) => step.id);

  const fields = stepIds.length
    ? await prisma.dynamicField.findMany({
        where: {
          stepId: {
            in: stepIds,
          },
        },
        select: {
          id: true,
        },
      })
    : [];

  const fieldIds = fields.map((field) => field.id);

  console.log("سيتم حذف Workflows خدمة:", service.name, `(${service.slug})`);
  console.table(
    workflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      version: workflow.version,
      status: workflow.status,
      isActive: workflow.isActive,
      workflowType: workflow.workflowType,
    }))
  );

  const result = await prisma.$transaction(async (tx) => {
    const detachedCaseValues = fieldIds.length
      ? await tx.caseValue.updateMany({
          where: {
            fieldId: {
              in: fieldIds,
            },
          },
          data: {
            fieldId: null,
          },
        })
      : { count: 0 };

    const detachedCases = await tx.caseEntry.updateMany({
      where: {
        workflowId: {
          in: workflowIds,
        },
      },
      data: {
        workflowId: null,
      },
    });

    const deletedOptions = fieldIds.length
      ? await tx.dynamicFieldOption.deleteMany({
          where: {
            fieldId: {
              in: fieldIds,
            },
          },
        })
      : { count: 0 };

    const deletedFields = fieldIds.length
      ? await tx.dynamicField.deleteMany({
          where: {
            id: {
              in: fieldIds,
            },
          },
        })
      : { count: 0 };

    const deletedSteps = stepIds.length
      ? await tx.workflowStep.deleteMany({
          where: {
            id: {
              in: stepIds,
            },
          },
        })
      : { count: 0 };

    const deletedWorkflows = await tx.workflow.deleteMany({
      where: {
        id: {
          in: workflowIds,
        },
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

  console.log("تم التنظيف بنجاح:");
  console.table(result);
}

main()
  .catch((error) => {
    console.error("فشل حذف Workflows متابعة الطلاب:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
