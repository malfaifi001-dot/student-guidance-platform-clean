const mariadb = require("mariadb");

async function main() {
  const conn = await mariadb.createConnection({
    host: "srv1932.hstgr.io",
    port: 3306,
    user: "u253346148_smstudents_app",
    password: process.env.PROD_DB_PASSWORD,
    database: "u253346148_smstudents",
    connectTimeout: 20000,
  });

  try {
    for (const table of ["Subscription", "ManualActivation", "ServiceAccess"]) {
      const rows = await conn.query(`SHOW CREATE TABLE \`${table}\``);
      console.log(`\n=== ${table} ===`);
      console.log(rows[0]["Create Table"]);
    }

    const migrations = await conn.query(`
      SELECT
        migration_name,
        started_at,
        finished_at,
        rolled_back_at,
        applied_steps_count,
        logs
      FROM _prisma_migrations
      WHERE migration_name = '20260827150000_user_scoped_subscriptions'
      ORDER BY started_at DESC
    `);

    console.log("\n=== Migration record ===");
    console.log(JSON.stringify(migrations, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
