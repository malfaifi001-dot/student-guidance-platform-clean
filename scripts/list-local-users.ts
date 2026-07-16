import { prisma } from "../lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      schoolAccountId: true,
      schoolAccount: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  console.dir(users, { depth: null });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });