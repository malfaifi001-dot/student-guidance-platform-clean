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
      profile: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  let updated = 0;

  for (const account of accounts) {
    const schoolName = String(account.profile?.schoolName || "").trim();

    if (!schoolName) {
      console.log(`SKIP بدون هوية مدرسة: ${account.name} / ${account.slug}`);
      continue;
    }

    if (account.name !== schoolName) {
      await prisma.schoolAccount.update({
        where: { id: account.id },
        data: { name: schoolName },
      });

      updated++;
      console.log(`UPDATED: ${account.name} => ${schoolName}`);
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
