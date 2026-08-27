import { prisma } from "../lib/prisma";

async function main() {
  for (const table of ["Subscription", "ManualActivation", "ServiceAccess"]) {
    const result = await prisma.$queryRawUnsafe(`SHOW CREATE TABLE \`${table}\``);
    console.log(`\n=== ${table} ===`);
    console.log(JSON.stringify(result, null, 2));
  }

  const migrations = await prisma.$queryRawUnsafe(`
    SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count, logs
    FROM _prisma_migrations
    WHERE migration_name = '20260827150000_user_scoped_subscriptions'
    ORDER BY started_at DESC
  `);

  console.log("\n=== Migration record ===");
  console.log(JSON.stringify(migrations, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
