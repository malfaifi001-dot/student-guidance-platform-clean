const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

const adapter = new PrismaBetterSqlite3({
  url: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
});

const reportId = "cmptdzwx10001hcnoj26ejn6u";

async function main() {
  const report = await prisma.guidanceReport.update({
    where: {
      id: reportId,
    },
    data: {
      status: "GENERATED",
      approvedAt: null,
      archivedAt: null,
    },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  console.log("Unlocked report:", report);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
