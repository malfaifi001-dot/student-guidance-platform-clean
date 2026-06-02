require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const accounts = await prisma.schoolAccount.findMany({
    include: {
      users: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          officialName: true,
          email: true,
          role: true,
        },
      },
    },
  });

  let updated = 0;

  for (const account of accounts) {
    const owner =
      account.users.find((user) => user.role !== "ADMIN") || account.users[0];

    const displayName = String(
      owner?.officialName || owner?.name || owner?.email || account.slug || account.name
    ).trim();

    if (!displayName) continue;

    if (account.name !== displayName) {
      await prisma.schoolAccount.update({
        where: { id: account.id },
        data: { name: displayName },
      });

      updated++;
      console.log(`UPDATED: ${account.name} => ${displayName}`);
    } else {
      console.log(`OK: ${account.name}`);
    }
  }

  console.log(`DONE. Updated accounts: ${updated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
