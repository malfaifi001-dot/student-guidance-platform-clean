[CmdletBinding(SupportsShouldProcess, ConfirmImpact = "High")]
param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$ExpectedDatabaseName
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
  throw "متغير DATABASE_URL غير موجود في بيئة PowerShell الحالية. تم إيقاف الإصلاح دون أي تغيير."
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$shouldRepair = $PSCmdlet.ShouldProcess(
  "قاعدة البيانات المتوقعة: $ExpectedDatabaseName",
  "حذف جداول الجدول المدرسي الجزئية الخمسة بعد اكتمال جميع فحوص الأمان"
)

Write-Host "بدء فحص آمن لحالة ترحيل الجدول المدرسي..." -ForegroundColor Cyan
if (-not $shouldRepair) {
  Write-Host "وضع المعاينة مفعل: سيتم إجراء جميع الفحوص ولن يُحذف أي جدول." -ForegroundColor Yellow
}

$previousExpectedDatabaseName = $env:TIMETABLE_REPAIR_EXPECTED_DATABASE
$previousExecuteRepair = $env:TIMETABLE_REPAIR_EXECUTE
$env:TIMETABLE_REPAIR_EXPECTED_DATABASE = $ExpectedDatabaseName
$env:TIMETABLE_REPAIR_EXECUTE = if ($shouldRepair) { "1" } else { "0" }

Push-Location -LiteralPath $projectRoot
try {
  $repairProgram = @'
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const migrationName = "20260806150000_add_timetable_daily_operations";
const partialTables = [
  "TimetableWaitingPolicy",
  "TimetableDailyAbsence",
  "TimetableSubstitution",
  "TimetableSupervisionDuty",
  "TimetableSupervisionAssignment",
];
const dropOrder = [
  "TimetableSupervisionAssignment",
  "TimetableSubstitution",
  "TimetableDailyAbsence",
  "TimetableSupervisionDuty",
  "TimetableWaitingPolicy",
];
const foundationTables = [
  "TimetableProject",
  "TimetableTeacher",
  "TimetableClass",
  "TimetableSubject",
  "TimetableTeachingAssignment",
];
const parentTables = ["SchoolAccount", "User", "_prisma_migrations"];
const expectedColumns = new Map([
  ["TimetableWaitingPolicy", ["id","projectId","candidateCount","maxDailySubstitutions","maxWeeklySubstitutions","allowBeforeFirstLesson","allowAfterLastLesson","allowInsideGap","preferInsideGap","allowOnGoldenDay","goldenDayEmergency","allowAfterLateArrival","excludeLateArrivalDay","allowBeforeEarlyDeparture","preventConsecutiveSubstitutions","preventFirstPeriod","preventLastPeriod","requireMatchingSpecialty","preferMatchingSpecialty","weeklyLoadWeight","weeklyWaitingWeight","dailyWaitingWeight","gapPreferenceWeight","specialtyWeight","firstLastFairnessWeight","settingsJson","createdAt","updatedAt"]],
  ["TimetableDailyAbsence", ["id","schoolAccountId","projectId","teacherId","absenceDate","absenceType","status","periodIdsJson","arrivalPeriodId","departurePeriodId","reason","note","createdById","createdAt","updatedAt"]],
  ["TimetableSubstitution", ["id","schoolAccountId","projectId","absenceId","substitutionDate","originalSessionId","dayId","periodId","classId","className","subjectId","subjectName","originalTeacherId","substituteTeacherId","status","candidateRank","candidateScore","candidatesJson","selectionReason","overrideReason","assignedAt","notifiedAt","completedAt","declinedAt","canceledAt","createdById","updatedById","createdAt","updatedAt"]],
  ["TimetableSupervisionDuty", ["id","schoolAccountId","projectId","title","dutyType","status","dayId","periodId","startTime","endTime","location","requiredTeachers","note","createdById","createdAt","updatedAt"]],
  ["TimetableSupervisionAssignment", ["id","dutyId","teacherId","isPrimary","sortOrder","assignedAt","completedAt","note"]],
]);

function fail(message) {
  throw new Error(message);
}

function sameItems(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

const databaseUrl = process.env.DATABASE_URL;
const expectedDatabaseName = process.env.TIMETABLE_REPAIR_EXPECTED_DATABASE;
const executeRepair = process.env.TIMETABLE_REPAIR_EXECUTE === "1";
if (!databaseUrl) fail("DATABASE_URL غير موجود.");
if (!expectedDatabaseName) fail("اسم قاعدة البيانات المتوقع غير موجود.");

let prisma;
try {
  const url = new URL(databaseUrl);
  if (!url.searchParams.has("connectionLimit")) url.searchParams.set("connectionLimit", "1");
  if (!url.searchParams.has("acquireTimeout")) url.searchParams.set("acquireTimeout", "30000");
  if (!url.searchParams.has("connectTimeout")) url.searchParams.set("connectTimeout", "15000");
  if (!url.searchParams.has("prepareCacheLength")) url.searchParams.set("prepareCacheLength", "0");
  prisma = new PrismaClient({ adapter: new PrismaMariaDb(url.toString()), log: ["error"] });
} catch {
  fail("تعذر إعداد اتصال Prisma الآمن. لم تتم طباعة بيانات الاتصال.");
}

try {
  const databaseRows = await prisma.$queryRawUnsafe("SELECT DATABASE() AS databaseName");
  const databaseName = databaseRows[0]?.databaseName;
  if (databaseName !== expectedDatabaseName) {
    fail(`اسم قاعدة البيانات المتصلة (${databaseName ?? "غير معروف"}) لا يطابق الاسم المتوقع.`);
  }
  console.log(`تم التحقق من قاعدة البيانات: ${databaseName}`);

  const migrations = await prisma.$queryRawUnsafe(
    "SELECT migration_name, finished_at, rolled_back_at, applied_steps_count FROM _prisma_migrations WHERE migration_name = ? ORDER BY started_at DESC",
    migrationName,
  );
  if (migrations.length !== 1) fail("سجل الترحيل الفاشل مفقود أو مكرر بشكل غير متوقع.");
  const migration = migrations[0];
  if (migration.finished_at !== null || migration.rolled_back_at !== null || Number(migration.applied_steps_count) !== 0) {
    fail("سجل الترحيل ليس في الحالة الفاشلة المتوقعة (غير مكتمل، غير متراجع، وعدد الخطوات صفر). ولن يُجرى أي حذف.");
  }
  console.log("تم التحقق من سجل الترحيل الفاشل وحالته المتوقعة.");

  const allGuardedTables = [...partialTables, ...foundationTables, ...parentTables];
  const placeholders = allGuardedTables.map(() => "?").join(",");
  const tables = await prisma.$queryRawUnsafe(
    `SELECT TABLE_NAME AS tableName, ENGINE AS engine, TABLE_COLLATION AS tableCollation FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders})`,
    ...allGuardedTables,
  );
  const tableByName = new Map(tables.map((row) => [row.tableName, row]));
  const missingPartial = partialTables.filter((name) => !tableByName.has(name));
  if (missingPartial.length) fail(`بعض الجداول الجزئية غير موجودة: ${missingPartial.join(", ")}`);
  const existingFoundation = foundationTables.filter((name) => tableByName.has(name));
  if (existingFoundation.length) fail(`وُجدت جداول أساس في حالة غير متوقعة: ${existingFoundation.join(", ")}`);
  const missingParents = parentTables.filter((name) => !tableByName.has(name));
  if (missingParents.length) fail(`جداول النظام المطلوبة مفقودة: ${missingParents.join(", ")}`);
  for (const name of partialTables) {
    const metadata = tableByName.get(name);
    if (metadata.engine !== "InnoDB" || metadata.tableCollation !== "utf8mb4_unicode_ci") {
      fail(`تعريف المحرك أو الترميز غير متوقع للجدول ${name}.`);
    }
  }
  console.log("تم التحقق من وجود الجداول الجزئية وغياب جداول الأساس الخمسة.");

  const parentIds = await prisma.$queryRawUnsafe(
    "SELECT TABLE_NAME AS tableName, COLUMN_TYPE AS columnType, IS_NULLABLE AS isNullable, CHARACTER_SET_NAME AS characterSetName, COLLATION_NAME AS collationName FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('SchoolAccount','User') AND COLUMN_NAME = 'id'",
  );
  for (const name of ["SchoolAccount", "User"]) {
    const id = parentIds.find((row) => row.tableName === name);
    if (!id || id.columnType !== "varchar(191)" || id.isNullable !== "NO" || id.characterSetName !== "utf8mb4" || id.collationName !== "utf8mb4_unicode_ci") {
      fail(`تعريف ${name}.id غير متوافق مع مفاتيح أساس الجدول المدرسي.`);
    }
    if (tableByName.get(name)?.engine !== "InnoDB") fail(`محرك الجدول ${name} ليس InnoDB.`);
  }
  console.log("تم التحقق من توافق SchoolAccount.id وUser.id دون تعديلهما.");

  const partialPlaceholders = partialTables.map(() => "?").join(",");
  const columns = await prisma.$queryRawUnsafe(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, ORDINAL_POSITION AS ordinalPosition FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${partialPlaceholders}) ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    ...partialTables,
  );
  for (const name of partialTables) {
    const actual = columns.filter((row) => row.tableName === name).map((row) => row.columnName);
    if (!sameItems(actual, expectedColumns.get(name))) fail(`أعمدة الجدول ${name} لا تطابق ناتج الترحيل الفاشل المتوقع.`);
  }

  const foreignKeys = await prisma.$queryRawUnsafe(
    `SELECT TABLE_NAME AS tableName, CONSTRAINT_NAME AS constraintName FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND TABLE_NAME IN (${partialPlaceholders})`,
    ...partialTables,
  );
  if (foreignKeys.length) fail(`توجد مفاتيح أجنبية غير متوقعة على الجداول الجزئية: ${foreignKeys.map((row) => `${row.tableName}.${row.constraintName}`).join(", ")}`);

  const primaryKeys = await prisma.$queryRawUnsafe(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'PRIMARY' AND TABLE_NAME IN (${partialPlaceholders}) ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    ...partialTables,
  );
  for (const name of partialTables) {
    const actual = primaryKeys.filter((row) => row.tableName === name).map((row) => row.columnName);
    if (!sameItems(actual, ["id"])) fail(`المفتاح الأساسي للجدول ${name} غير متوقع.`);
  }
  console.log("تم التحقق من الأعمدة والمفاتيح الأساسية وعدم وجود مفاتيح أجنبية غير متوقعة.");

  for (const name of partialTables) {
    const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS rowCount FROM \`${name}\``);
    const count = Number(rows[0]?.rowCount);
    if (!Number.isSafeInteger(count) || count !== 0) fail(`الجدول ${name} ليس فارغًا (عدد الصفوف: ${String(rows[0]?.rowCount)}).`);
    console.log(`الجدول ${name}: صفر صفوف.`);
  }

  if (!executeRepair) {
    console.log("اكتملت المعاينة بنجاح. لم يُحذف أي جدول.");
  } else {
    for (const name of dropOrder) {
      await prisma.$executeRawUnsafe(`DROP TABLE \`${name}\``);
      console.log(`تم حذف الجدول الجزئي الفارغ: ${name}`);
    }
    console.log("اكتمل التنظيف المحروس بنجاح.");
    console.log("الخطوة التالية منفصلة يدويًا: npx prisma migrate resolve --rolled-back 20260806150000_add_timetable_daily_operations");
    console.log("بعدها افحص الحالة ثم نفّذ النشر وفق الإجراء المعتمد. لم يُعدّل جدول _prisma_migrations بواسطة هذا السكربت.");
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`تم الإيقاف الآمن: ${message}`);
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect();
}
'@

  $repairProgram | node --input-type=module -
  if ($LASTEXITCODE -ne 0) {
    throw "فشل فحص/إصلاح ترحيل الجدول المدرسي برمز خروج $LASTEXITCODE. لم يتابع السكربت بعد الخطأ."
  }
}
finally {
  if ($null -eq $previousExpectedDatabaseName) {
    Remove-Item Env:TIMETABLE_REPAIR_EXPECTED_DATABASE -ErrorAction SilentlyContinue
  } else {
    $env:TIMETABLE_REPAIR_EXPECTED_DATABASE = $previousExpectedDatabaseName
  }
  if ($null -eq $previousExecuteRepair) {
    Remove-Item Env:TIMETABLE_REPAIR_EXECUTE -ErrorAction SilentlyContinue
  } else {
    $env:TIMETABLE_REPAIR_EXECUTE = $previousExecuteRepair
  }
  Pop-Location
}
