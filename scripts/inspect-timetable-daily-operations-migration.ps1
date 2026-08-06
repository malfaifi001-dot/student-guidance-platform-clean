[CmdletBinding()]
param(
  [string]$ExpectedDatabaseName
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $projectRoot

try {
  $inspectionScript = @'
import "dotenv/config";
import * as mariadb from "mariadb";

const migrationName = "20260806150000_add_timetable_daily_operations";
const tableNames = [
  "SchoolAccount",
  "TimetableProject",
  "TimetableTeacher",
  "TimetableWaitingPolicy",
  "TimetableDailyAbsence",
  "TimetableSubstitution",
  "TimetableSupervisionDuty",
  "TimetableSupervisionAssignment",
];
const migrationTableNames = tableNames.filter((name) =>
  name.startsWith("Timetable") &&
  !["TimetableProject", "TimetableTeacher"].includes(name),
);
const expectedForeignKeys = [
  ["TimetableWaitingPolicy", "projectId", "TimetableProject", "id", "TimetableWaitingPolicy_projectId_fkey"],
  ["TimetableDailyAbsence", "schoolAccountId", "SchoolAccount", "id", "TimetableDailyAbsence_schoolAccountId_fkey"],
  ["TimetableDailyAbsence", "projectId", "TimetableProject", "id", "TimetableDailyAbsence_projectId_fkey"],
  ["TimetableDailyAbsence", "teacherId", "TimetableTeacher", "id", "TimetableDailyAbsence_teacherId_fkey"],
  ["TimetableSubstitution", "schoolAccountId", "SchoolAccount", "id", "TimetableSubstitution_schoolAccountId_fkey"],
  ["TimetableSubstitution", "projectId", "TimetableProject", "id", "TimetableSubstitution_projectId_fkey"],
  ["TimetableSubstitution", "absenceId", "TimetableDailyAbsence", "id", "TimetableSubstitution_absenceId_fkey"],
  ["TimetableSubstitution", "originalTeacherId", "TimetableTeacher", "id", "TimetableSubstitution_originalTeacherId_fkey"],
  ["TimetableSubstitution", "substituteTeacherId", "TimetableTeacher", "id", "TimetableSubstitution_substituteTeacherId_fkey"],
  ["TimetableSupervisionDuty", "schoolAccountId", "SchoolAccount", "id", "TimetableSupervisionDuty_schoolAccountId_fkey"],
  ["TimetableSupervisionDuty", "projectId", "TimetableProject", "id", "TimetableSupervisionDuty_projectId_fkey"],
  ["TimetableSupervisionAssignment", "dutyId", "TimetableSupervisionDuty", "id", "TimetableSupervisionAssignment_dutyId_fkey"],
  ["TimetableSupervisionAssignment", "teacherId", "TimetableTeacher", "id", "TimetableSupervisionAssignment_teacherId_fkey"],
];

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured.");
}

const databaseUrl = new URL(process.env.DATABASE_URL);
let connection;
try {
  connection = await mariadb.createConnection({
    host: databaseUrl.hostname,
    port: databaseUrl.port ? Number(databaseUrl.port) : 3306,
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database: decodeURIComponent(databaseUrl.pathname.replace(/^\//, "")),
  });
} catch {
  throw new Error(
    "Unable to connect to the configured database for read-only inspection.",
  );
}

function printSection(title, rows) {
  process.stdout.write(`\n===== ${title} =====\n`);
  process.stdout.write(
    `${JSON.stringify(rows, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value, 2)}\n`,
  );
}

try {
  const [{ databaseName }] = await connection.query(
    "SELECT DATABASE() AS databaseName",
  );
  const expectedDatabaseName = process.env.TIMETABLE_INSPECTION_EXPECTED_DATABASE;
  if (expectedDatabaseName && databaseName !== expectedDatabaseName) {
    throw new Error(
      `Connected database does not match the expected database name (${expectedDatabaseName}).`,
    );
  }

  const migrationRows = await connection.query(
    `SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count
       FROM _prisma_migrations
      WHERE migration_name = ?
      ORDER BY started_at DESC`,
    [migrationName],
  );
  printSection("_prisma_migrations", migrationRows);

  const existingTables = await connection.query(
    `SELECT TABLE_NAME, ENGINE, TABLE_COLLATION
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN (${tableNames.map(() => "?").join(", ")})
      ORDER BY TABLE_NAME`,
    tableNames,
  );
  printSection("information_schema.TABLES", existingTables);

  const existingTableNames = new Set(existingTables.map((row) => row.TABLE_NAME));

  for (const tableName of tableNames) {
    if (!existingTableNames.has(tableName)) {
      printSection(`SHOW CREATE TABLE ${tableName}`, { exists: false });
      continue;
    }

    const rows = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
    printSection(`SHOW CREATE TABLE ${tableName}`, rows);
  }

  const columns = await connection.query(
    `SELECT TABLE_NAME, ORDINAL_POSITION, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE,
            COLUMN_DEFAULT, CHARACTER_SET_NAME, COLLATION_NAME, COLUMN_KEY, EXTRA
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN (${tableNames.map(() => "?").join(", ")})
      ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    tableNames,
  );
  printSection("information_schema.COLUMNS", columns);

  const constraints = await connection.query(
    `SELECT TABLE_NAME, CONSTRAINT_NAME, CONSTRAINT_TYPE
       FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME IN (${tableNames.map(() => "?").join(", ")})
      ORDER BY TABLE_NAME, CONSTRAINT_TYPE, CONSTRAINT_NAME`,
    tableNames,
  );
  printSection("information_schema.TABLE_CONSTRAINTS", constraints);

  const keyUsage = await connection.query(
    `SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, ORDINAL_POSITION,
            REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM information_schema.KEY_COLUMN_USAGE
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME IN (${tableNames.map(() => "?").join(", ")})
      ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION`,
    tableNames,
  );
  printSection("information_schema.KEY_COLUMN_USAGE", keyUsage);

  const statistics = await connection.query(
    `SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN (${tableNames.map(() => "?").join(", ")})
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
    tableNames,
  );
  printSection("information_schema.STATISTICS", statistics);

  const columnByName = new Map(
    columns.map((column) => [
      `${column.TABLE_NAME}.${column.COLUMN_NAME}`,
      column,
    ]),
  );
  const tableByName = new Map(
    existingTables.map((table) => [table.TABLE_NAME, table]),
  );
  const keyUsageByName = new Map(
    keyUsage.map((key) => [
      `${key.TABLE_NAME}.${key.CONSTRAINT_NAME}.${key.COLUMN_NAME}`,
      key,
    ]),
  );

  const foreignKeyComparison = expectedForeignKeys.map(
    ([childTable, childColumn, parentTable, parentColumn, constraintName]) => {
      const child = columnByName.get(`${childTable}.${childColumn}`);
      const parent = columnByName.get(`${parentTable}.${parentColumn}`);
      const childTableMetadata = tableByName.get(childTable);
      const parentTableMetadata = tableByName.get(parentTable);
      const existingKey = keyUsageByName.get(
        `${childTable}.${constraintName}.${childColumn}`,
      );
      const mismatches = [];

      if (!child) mismatches.push("child column is missing");
      if (!parent) mismatches.push("parent column is missing");
      if (child && parent) {
        if (child.COLUMN_TYPE !== parent.COLUMN_TYPE) {
          mismatches.push(`column type: ${child.COLUMN_TYPE} != ${parent.COLUMN_TYPE}`);
        }
        if (child.CHARACTER_SET_NAME !== parent.CHARACTER_SET_NAME) {
          mismatches.push(
            `character set: ${child.CHARACTER_SET_NAME} != ${parent.CHARACTER_SET_NAME}`,
          );
        }
        if (child.COLLATION_NAME !== parent.COLLATION_NAME) {
          mismatches.push(
            `collation: ${child.COLLATION_NAME} != ${parent.COLLATION_NAME}`,
          );
        }
      }
      if (childTableMetadata?.ENGINE !== parentTableMetadata?.ENGINE) {
        mismatches.push(
          `storage engine: ${childTableMetadata?.ENGINE ?? "missing"} != ${parentTableMetadata?.ENGINE ?? "missing"}`,
        );
      }
      if (
        existingKey &&
        (existingKey.REFERENCED_TABLE_NAME !== parentTable ||
          existingKey.REFERENCED_COLUMN_NAME !== parentColumn)
      ) {
        mismatches.push("foreign key points to a different parent");
      }

      return {
        constraintName,
        child: `${childTable}.${childColumn}`,
        childNullable: child?.IS_NULLABLE ?? null,
        parent: `${parentTable}.${parentColumn}`,
        parentNullable: parent?.IS_NULLABLE ?? null,
        foreignKeyExists: Boolean(existingKey),
        compatibleDefinitions: mismatches.length === 0,
        mismatches,
      };
    },
  );
  printSection("FOREIGN KEY COMPATIBILITY", foreignKeyComparison);

  const existingMigrationTables = migrationTableNames.filter((name) =>
    existingTableNames.has(name),
  );
  const allForeignKeysExist = foreignKeyComparison.every(
    (item) => item.foreignKeyExists && item.compatibleDefinitions,
  );
  const suggestedStrategy =
    existingMigrationTables.length === 0
      ? "A_ROLL_BACK_FAILED_RECORD_AFTER_REVIEW_AND_REDEPLOY"
      : existingMigrationTables.length === migrationTableNames.length &&
          allForeignKeysExist
        ? "C_VERIFY_ALL_COLUMNS_AND_INDEXES_THEN_MARK_APPLIED"
        : "B_PARTIAL_OBJECTS_REQUIRE_CONTROLLED_REPAIR";

  printSection("INSPECTION SUMMARY", {
    databaseName,
    migrationTablesExpected: migrationTableNames,
    migrationTablesAlreadyPresent: existingMigrationTables,
    expectedForeignKeyCount: expectedForeignKeys.length,
    existingCompatibleForeignKeyCount: foreignKeyComparison.filter(
      (item) => item.foreignKeyExists && item.compatibleDefinitions,
    ).length,
    suggestedStrategy,
  });
} finally {
  await connection.end();
}
'@

  if ($ExpectedDatabaseName) {
    $env:TIMETABLE_INSPECTION_EXPECTED_DATABASE = $ExpectedDatabaseName
  }

  $inspectionScript | node --input-type=module -
  if ($LASTEXITCODE -ne 0) {
    throw "Metadata inspection failed with exit code $LASTEXITCODE."
  }
}
finally {
  Remove-Item Env:TIMETABLE_INSPECTION_EXPECTED_DATABASE -ErrorAction SilentlyContinue
  Pop-Location
}
