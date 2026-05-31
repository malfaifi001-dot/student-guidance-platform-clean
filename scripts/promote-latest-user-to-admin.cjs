require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (users.length === 0) {
    console.log("لا يوجد مستخدمون في قاعدة البيانات.");
    return;
  }

  const latestUser = users[0];

  await prisma.user.update({
    where: {
      id: latestUser.id,
    },
    data: {
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("تم تحويل آخر حساب مسجل إلى ADMIN:");
  console.log({
    name: latestUser.name,
    email: latestUser.email,
    previousRole: latestUser.role,
    newRole: "ADMIN",
  });

  console.log("\nكل المستخدمين الحاليين:");
  for (const user of users) {
    console.log(`- ${user.email} | ${user.role}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
