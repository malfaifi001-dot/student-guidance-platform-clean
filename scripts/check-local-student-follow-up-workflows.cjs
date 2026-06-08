const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const workflows = await prisma.workflow.findMany({
    where: {
      service: {
        slug: "student-follow-up",
      },
    },
    include: {
      service: true,
    },
    orderBy: [{ updatedAt: "desc" }, { version: "desc" }],
  });

  console.log("student-follow-up workflows:", workflows.length);

  console.table(
    workflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      version: workflow.version,
      status: workflow.status,
      isActive: workflow.isActive,
      workflowType: workflow.workflowType,
      serviceSlug: workflow.service.slug,
    }))
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
