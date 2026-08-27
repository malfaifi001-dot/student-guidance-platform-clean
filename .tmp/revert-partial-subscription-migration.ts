import { prisma } from "../lib/prisma";

async function main() {
  await prisma.$executeRawUnsafe(
    "ALTER TABLE `Subscription` DROP COLUMN `userId`"
  );

  await prisma.$executeRawUnsafe(
    "ALTER TABLE `ManualActivation` DROP COLUMN `userId`"
  );

  await prisma.$executeRawUnsafe(
    "ALTER TABLE `ServiceAccess` DROP COLUMN `userId`"
  );

  console.log("Partial migration columns reverted successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
