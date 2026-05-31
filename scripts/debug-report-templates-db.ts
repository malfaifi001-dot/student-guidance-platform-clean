import { prisma } from "../lib/prisma";

async function main() {
  const templates = await prisma.reportTemplate.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      type: true,
      serviceSlug: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        count: templates.length,
        templates,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
