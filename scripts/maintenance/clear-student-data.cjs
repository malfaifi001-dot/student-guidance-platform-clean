const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

function readEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return {};

  const env = {};
  const content = fs.readFileSync(envPath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function resolveSqlitePath() {
  const env = readEnvFile();
  const databaseUrl = process.env.DATABASE_URL || env.DATABASE_URL || "file:./dev.db";

  if (!databaseUrl.startsWith("file:")) {
    throw new Error(`DATABASE_URL ليس SQLite file URL: ${databaseUrl}`);
  }

  const rawFilePath = databaseUrl
    .replace(/^file:/, "")
    .split("?")[0]
    .trim();

  const candidates = path.isAbsolute(rawFilePath)
    ? [rawFilePath]
    : [
        path.resolve(process.cwd(), "prisma", rawFilePath),
        path.resolve(process.cwd(), rawFilePath),
      ];

  const existing = candidates.find((candidate) => fs.existsSync(candidate));

  if (!existing) {
    throw new Error(
      `لم أجد ملف قاعدة البيانات. جرّبت:\n${candidates.join("\n")}`
    );
  }

  return existing;
}

function quoteId(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function tableExists(db, tableName) {
  return Boolean(
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1"
      )
      .get(tableName)
  );
}

function getTables(db) {
  return db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .all()
    .map((row) => row.name);
}

function getColumns(db, tableName) {
  return db.prepare(`PRAGMA table_info(${quoteId(tableName)})`).all();
}

function getForeignKeys(db, tableName) {
  return db.prepare(`PRAGMA foreign_key_list(${quoteId(tableName)})`).all();
}

function getRowCount(db, tableName) {
  return db.prepare(`SELECT COUNT(*) AS count FROM ${quoteId(tableName)}`).get().count;
}

function backupDatabase(dbPath) {
  const backupDir = path.join(process.cwd(), "_backups", "database");
  fs.mkdirSync(backupDir, { recursive: true });

  const stamp = new Date()
    .toISOString()
    .replaceAll(":", "-")
    .replaceAll(".", "-");

  const backupPath = path.join(backupDir, `before-clear-students-${stamp}.db`);
  fs.copyFileSync(dbPath, backupPath);

  return backupPath;
}

const knownStudentDataTablesInDeleteOrder = [
  "StudentGuardian",
  "StudentParent",
  "StudentImportRow",
  "StudentImportBatch",
  "NoorImportRow",
  "NoorImportBatch",
  "ImportedStudent",
  "StudentImportLog",
  "ExternalSyncLog",
  "Guardian",
  "Student",
];

function main() {
  const apply = process.argv.includes("--apply");

  const dbPath = resolveSqlitePath();
  const backupPath = backupDatabase(dbPath);

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");

  const tables = getTables(db);
  const existingKnownTables = knownStudentDataTablesInDeleteOrder.filter((table) =>
    tableExists(db, table)
  );

  const protectedTargets = existingKnownTables.filter((table) =>
    ["Student", "Guardian"].includes(table)
  );

  const nullableUpdates = [];

  for (const table of tables) {
    const foreignKeys = getForeignKeys(db, table);

    for (const fk of foreignKeys) {
      if (!protectedTargets.includes(fk.table)) continue;
      if (existingKnownTables.includes(table)) continue;

      const columns = getColumns(db, table);
      const column = columns.find((item) => item.name === fk.from);

      if (!column) continue;

      const isNullable = column.notnull === 0;
      const onDelete = String(fk.on_delete || "").toUpperCase();

      if (isNullable) {
        nullableUpdates.push({
          table,
          column: fk.from,
          targetTable: fk.table,
        });
        continue;
      }

      if (onDelete === "CASCADE" || onDelete === "SET NULL") {
        continue;
      }

      throw new Error(
        `لا يمكن حذف الطلاب بأمان لأن الجدول ${table}.${fk.from} مرتبط بـ ${fk.table} والحقل غير قابل للتفريغ. أرسل prisma/schema.prisma حتى أرتب حذف العلاقات بدون فقدان خاطئ.`
      );
    }
  }

  const beforeCounts = {};
  for (const table of existingKnownTables) {
    beforeCounts[table] = getRowCount(db, table);
  }

  console.log("قاعدة البيانات:", dbPath);
  console.log("تم إنشاء نسخة احتياطية:", backupPath);
  console.log("الجداول التي سيتم تنظيفها:", existingKnownTables.join(", ") || "لا يوجد");
  console.log("الأعداد قبل الحذف:", beforeCounts);

  if (!apply) {
    console.log("\nوضع المعاينة فقط. للتنفيذ استخدم --apply");
    db.close();
    return;
  }

  const tx = db.transaction(() => {
    for (const item of nullableUpdates) {
      db.prepare(
        `UPDATE ${quoteId(item.table)} SET ${quoteId(item.column)} = NULL WHERE ${quoteId(item.column)} IS NOT NULL`
      ).run();
    }

    for (const table of existingKnownTables) {
      db.prepare(`DELETE FROM ${quoteId(table)}`).run();
    }
  });

  tx();

  const afterCounts = {};
  for (const table of existingKnownTables) {
    afterCounts[table] = getRowCount(db, table);
  }

  console.log("تم حذف بيانات الطلاب بنجاح.");
  console.log("الأعداد بعد الحذف:", afterCounts);

  db.close();
}

try {
  main();
} catch (error) {
  console.error("\nفشل تنظيف بيانات الطلاب:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
