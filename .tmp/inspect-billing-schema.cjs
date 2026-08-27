const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const subscription = await prisma.$queryRawUnsafe("SHOW CREATE TABLE `Subscription`");
  const serviceAccess = await prisma.$queryRawUnsafe("SHOW CREATE TABLE `ServiceAccess`");

  console.log("=== Subscription ===");
  console.log(JSON.stringify(subscription, null, 2));

  console.log("\n=== ServiceAccess ===");
  console.log(JSON.stringify(serviceAccess, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
