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
    await conn.query("ALTER TABLE `Subscription` DROP COLUMN `userId`");
    console.log("Dropped Subscription.userId");

    await conn.query("ALTER TABLE `ManualActivation` DROP COLUMN `userId`");
    console.log("Dropped ManualActivation.userId");

    console.log("Partial production migration state reverted successfully.");
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
