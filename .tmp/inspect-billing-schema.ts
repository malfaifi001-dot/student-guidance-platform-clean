import { prisma } from "../lib/prisma";

async function main() {
  const subscription = await prisma.$queryRawUnsafe(
    "SHOW CREATE TABLE `Subscription`"
  );

  const serviceAccess = await prisma.$queryRawUnsafe(
    "SHOW CREATE TABLE `ServiceAccess`"
  );

  console.log("=== Subscription ===");
  console.log(JSON.stringify(subscription, null, 2));

  console.log("\n=== ServiceAccess ===");
  console.log(JSON.stringify(serviceAccess, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
