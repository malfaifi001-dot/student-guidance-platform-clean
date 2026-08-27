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
    const sub = await conn.query(`
      SELECT COUNT(*) AS nonNullUserIds
      FROM Subscription
      WHERE userId IS NOT NULL
    `);

    const manual = await conn.query(`
      SELECT COUNT(*) AS nonNullUserIds
      FROM ManualActivation
      WHERE userId IS NOT NULL
    `);

    console.log("Subscription.userId non-null:", String(sub[0].nonNullUserIds));
    console.log("ManualActivation.userId non-null:", String(manual[0].nonNullUserIds));
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
