const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

const adapter = new PrismaBetterSqlite3({
  url: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const reports = await prisma.guidanceReport.findMany({
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      status: true,
      serviceSlug: true,
      updatedAt: true,
      _count: {
        select: {
          evidenceItems: true,
        },
      },
    },
  });

  console.table(
    reports.map((report) => ({
      id: report.id,
      title: report.title,
      status: report.status,
      service: report.serviceSlug,
      evidence: report._count.evidenceItems,
      updatedAt: report.updatedAt,
    }))
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
