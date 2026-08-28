const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const dotenv = require("dotenv");
const XLSX = require("xlsx");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_FILE = path.join(ROOT, "جدول 1448 ف1.xlsx");
const WORKSHEET = "أرقام";
const PROJECT_ID = "cmtc58tk40007v0noo8net8s2";
const PRINCIPAL_ID = "cmsufimjl00en9wnow1sxxqv9";
const SCHOOL_ACCOUNT_ID = "cmsufimfc00em9wno0g92kux1";
const EXPECTED_TEACHER_COUNT = 29;
const EXPECTED_ENTRY_COUNT = 367;

const CLASS_CODES = new Map([
  ["11", "أول متوسط أ"],
  ["12", "ثاني متوسط أ"],
  ["22", "ثاني متوسط ب"],
  ["13", "ثالث متوسط أ"],
  ["23", "ثالث متوسط ب"],
  ["14", "أول ثانوي أ"],
  ["24", "أول ثانوي ب"],
  ["15", "ثاني ثانوي أ"],
  ["25", "ثاني ثانوي ب"],
  ["16", "ثالث ثانوي أ"],
  ["26", "ثالث ثانوي ب"],
]);

const DAY_IDS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"];

function fail(message) {
  throw new Error(message);
}

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function cellIsEmpty(value) {
  return clean(value) === "";
}

function normalizeClassCode(value) {
  const text = clean(value);
  if (!text) return "";
  if (/^\d+\.0$/.test(text)) return text.slice(0, -2);
  return text;
}

function parseJsonArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} is not an array on the target project.`);
  return value;
}

function localDatabaseOnly() {
  dotenv.config({ path: path.join(ROOT, ".env"), override: true });
  if (!process.env.DATABASE_URL) fail("DATABASE_URL is missing from .env.");
  const url = new URL(process.env.DATABASE_URL);
  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname)) {
    fail(`Refusing to run: DATABASE_URL is not local (host ${url.hostname}).`);
  }
}

function findLayout(rows) {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const teacherColumn = row.findIndex((value) => {
      const text = clean(value).toLocaleLowerCase("ar");
      return /(?:اسم\s*)?(?:المعلم|المعلّم)|teacher/.test(text);
    });
    if (teacherColumn >= 0) return { headerIndex: rowIndex, teacherColumn };
  }

  const fallbackIndex = rows.findIndex((row) =>
    Array.isArray(row) && row.length >= 36 && !cellIsEmpty(row[0])
  );
  if (fallbackIndex >= 0) return { headerIndex: fallbackIndex - 1, teacherColumn: 0 };
  fail("Could not locate a teacher-name column and 35 timetable slots in worksheet أرقام.");
}

function parseWorkbook() {
  if (!fs.existsSync(SOURCE_FILE)) {
    fail(`Source workbook not found: ${SOURCE_FILE}`);
  }

  const workbook = XLSX.readFile(SOURCE_FILE, { cellDates: false, raw: true });
  if (!workbook.SheetNames.includes(WORKSHEET)) {
    fail(`Worksheet ${WORKSHEET} was not found. Available worksheets: ${workbook.SheetNames.join(", ")}`);
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[WORKSHEET], {
    header: 1,
    raw: true,
    defval: null,
    // Teacher records are exactly rows 4..32; exclude summary rows entirely.
    range: "A4:AK32",
  });
  const sourceRows = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const teacherName = clean(row[0]);
    // Column B is the weekly teacher load/count, not a timetable slot.
    // Timetable slots are exactly columns C..AK.
    const slotValues = Array.from({ length: 35 }, (_, index) => row[index + 2]);
    const hasAnyValue = !cellIsEmpty(teacherName) || slotValues.some((value) => !cellIsEmpty(value));
    if (!hasAnyValue) continue;
    if (!teacherName) fail(`Worksheet row ${rowIndex + 4} has timetable values but no teacher name.`);
    sourceRows.push({ teacherName, slotValues, sourceTeacherOrder: sourceRows.length + 1 });
  }

  const names = sourceRows.map((row) => row.teacherName);
  const uniqueNames = new Set(names);
  if (names.length !== EXPECTED_TEACHER_COUNT || uniqueNames.size !== EXPECTED_TEACHER_COUNT) {
    fail(`Expected exactly ${EXPECTED_TEACHER_COUNT} distinct source teachers, found ${names.length} rows / ${uniqueNames.size} distinct names.`);
  }

  const entries = [];
  const teacherSlots = new Set();
  const classSlots = new Set();
  let collisionCount = 0;
  for (const row of sourceRows) {
    for (let slotIndex = 0; slotIndex < 35; slotIndex += 1) {
      const classCode = normalizeClassCode(row.slotValues[slotIndex]);
      if (!classCode) continue;
      const className = CLASS_CODES.get(classCode);
      if (!className) fail(`Unknown non-empty class code ${classCode} for ${row.teacherName}, source slot ${slotIndex + 1}.`);
      const dayIndex = Math.floor(slotIndex / 7);
      const periodOrder = (slotIndex % 7) + 1;
      const dayId = DAY_IDS[dayIndex];
      const teacherKey = `${row.teacherName}\u0000${dayId}\u0000PERIOD_${periodOrder}`;
      const classKey = `${className}\u0000${dayId}\u0000PERIOD_${periodOrder}`;
      if (teacherSlots.has(teacherKey) || classSlots.has(classKey)) collisionCount += 1;
      teacherSlots.add(teacherKey);
      classSlots.add(classKey);
      entries.push({
        teacherName: row.teacherName,
        sourceTeacherOrder: row.sourceTeacherOrder,
        classCode,
        className,
        dayId,
        periodOrder,
      });
    }
  }

  if (entries.length !== EXPECTED_ENTRY_COUNT) {
    fail(`Expected exactly ${EXPECTED_ENTRY_COUNT} non-empty timetable entries, found ${entries.length}.`);
  }
  if (collisionCount !== 0) fail(`Validation found ${collisionCount} timetable slot collisions.`);

  return {
    sourceTeacherNames: names,
    entries,
    validation: {
      sourceTeachers: names.length,
      parsedEntries: entries.length,
      uniqueClassSlots: classSlots.size,
      uniqueTeacherSlots: teacherSlots.size,
      classesUsed: new Set(entries.map((entry) => entry.className)).size,
      collisions: collisionCount,
    },
  };
}

function fingerprint(entries) {
  return crypto.createHash("sha256").update(JSON.stringify(entries)).digest("hex");
}

function json(value) {
  return JSON.parse(JSON.stringify(value));
}

async function main() {
  localDatabaseOnly();
  const parsed = parseWorkbook();
  const { prisma } = await import("../lib/prisma.ts");

  try {
    const project = await prisma.timetableProject.findUnique({
      where: { id: PROJECT_ID },
      select: {
        id: true,
        name: true,
        status: true,
        schoolAccountId: true,
        createdById: true,
        daysJson: true,
        periodsJson: true,
        teachers: { select: { id: true, name: true }, orderBy: { createdAt: "asc" } },
        classes: { select: { id: true, name: true } },
        schedules: { select: { id: true, version: true, status: true }, orderBy: { version: "asc" } },
      },
    });
    if (!project) fail(`Target TimetableProject ${PROJECT_ID} does not exist.`);
    if (project.schoolAccountId !== SCHOOL_ACCOUNT_ID) fail("Target project schoolAccountId does not match the requested school.");
    if (project.createdById !== PRINCIPAL_ID) fail("Target project creator does not match the requested principal.");

    const principal = await prisma.user.findUnique({
      where: { id: PRINCIPAL_ID },
      select: { id: true, role: true, isActive: true, schoolAccountId: true },
    });
    if (!principal) fail(`Principal ${PRINCIPAL_ID} does not exist.`);
    if (principal.role !== "PRINCIPAL" || !principal.isActive || principal.schoolAccountId !== SCHOOL_ACCOUNT_ID) {
      fail("Principal ownership validation failed: role, active state, or schoolAccountId is invalid.");
    }
    if (project.schedules.length) {
      fail(`Target project already has schedules: ${project.schedules.map((schedule) => `${schedule.id} (v${schedule.version}, ${schedule.status})`).join(", ")}`);
    }

    const days = parseJsonArray(project.daysJson, "daysJson");
    const periods = parseJsonArray(project.periodsJson, "periodsJson");
    const dayById = new Map(days.map((day) => [String(day.id), day]));
    const periodById = new Map(periods.map((period) => [String(period.id), period]));
    for (const dayId of DAY_IDS) if (!dayById.has(dayId)) fail(`Existing project is missing day ${dayId}.`);
    for (let period = 1; period <= 7; period += 1) if (!periodById.has(`PERIOD_${period}`)) fail(`Existing project is missing PERIOD_${period}.`);

    const classByName = new Map();
    for (const timetableClass of project.classes) {
      if (classByName.has(timetableClass.name)) fail(`Existing project has ambiguous class name: ${timetableClass.name}.`);
      classByName.set(timetableClass.name, timetableClass);
    }
    for (const className of new Set(parsed.entries.map((entry) => entry.className))) {
      if (!classByName.has(className)) fail(`Existing project is missing mapped class: ${className}.`);
    }

    console.log("VALIDATION");
    console.table(parsed.validation);

    const result = await prisma.$transaction(async (tx) => {
      const lockedProject = await tx.timetableProject.findUnique({
        where: { id: PROJECT_ID },
        select: { id: true, schoolAccountId: true, createdById: true, status: true },
      });
      if (!lockedProject || lockedProject.schoolAccountId !== SCHOOL_ACCOUNT_ID || lockedProject.createdById !== PRINCIPAL_ID) fail("Target ownership changed before transaction.");
      const existingSchedules = await tx.timetableSchedule.findMany({
        where: { projectId: PROJECT_ID },
        select: { id: true, version: true, status: true },
      });
      if (existingSchedules.length) fail(`Target project already has schedules inside transaction: ${existingSchedules.map((schedule) => schedule.id).join(", ")}`);

      const existingTeachers = await tx.timetableTeacher.findMany({ where: { projectId: PROJECT_ID }, select: { id: true, name: true } });
      const teachersByName = new Map(existingTeachers.map((teacher) => [teacher.name.trim(), teacher]));
      const teacherMappings = [];
      let teachersCreated = 0;
      for (const [index, name] of parsed.sourceTeacherNames.entries()) {
        let teacher = teachersByName.get(name);
        if (!teacher) {
          teacher = await tx.timetableTeacher.create({ data: { projectId: PROJECT_ID, name, userId: null, isActive: true }, select: { id: true, name: true } });
          teachersByName.set(name, teacher);
          teachersCreated += 1;
        }
        teacherMappings.push({ teacherOrder: index + 1, teacherName: name, temporarySubjectName: `مادة ${index + 1}`, teacherId: teacher.id });
      }

      const existingSubjects = await tx.timetableSubject.findMany({ where: { projectId: PROJECT_ID }, select: { id: true, name: true } });
      const subjectsByName = new Map(existingSubjects.map((subject) => [subject.name, subject]));
      let subjectsCreated = 0;
      for (const mapping of teacherMappings) {
        let subject = subjectsByName.get(mapping.temporarySubjectName);
        if (!subject) {
          subject = await tx.timetableSubject.create({ data: { projectId: PROJECT_ID, name: mapping.temporarySubjectName, isActive: true }, select: { id: true, name: true } });
          subjectsByName.set(mapping.temporarySubjectName, subject);
          subjectsCreated += 1;
        }
        mapping.subjectId = subject.id;
      }

      const teacherMappingByName = new Map(teacherMappings.map((mapping) => [mapping.teacherName, mapping]));
      const normalizedEntries = parsed.entries.map((entry) => ({
        teacherName: entry.teacherName,
        className: entry.className,
        classCode: entry.classCode,
        dayId: entry.dayId,
        periodOrder: entry.periodOrder,
      }));
      const schedule = await tx.timetableSchedule.create({
        data: {
          projectId: PROJECT_ID,
          version: 1,
          status: "PUBLISHED",
          isCurrent: true,
          completeness: 100,
          hardViolations: 0,
          softPenalty: 0,
          score: 0,
          attemptCount: 1,
          seed: 0,
          durationMs: 0,
          engineVersion: "MANUAL_EXCEL_TRANSFER_V1",
          dataFingerprint: fingerprint(normalizedEntries),
          createdById: PRINCIPAL_ID,
          diagnosticsJson: json({ source: "LOCAL_EXCEL_ONE_OFF", sourceFile: "جدول 1448 ف1.xlsx", worksheet: WORKSHEET, sourceTeacherCount: parsed.sourceTeacherNames.length, importedEntryCount: parsed.entries.length, temporarySubjects: true, temporarySubjectStrategy: "ONE_PER_TEACHER" }),
          configJson: json({ source: "LOCAL_EXCEL_ONE_OFF" }),
        },
        select: { id: true, version: true, status: true },
      });
      await tx.timetableScheduleEntry.createMany({
        data: parsed.entries.map((entry) => {
          const mapping = teacherMappingByName.get(entry.teacherName);
          const day = dayById.get(entry.dayId);
          const period = periodById.get(`PERIOD_${entry.periodOrder}`);
          const timetableClass = classByName.get(entry.className);
          if (!mapping || !day || !period || !timetableClass) fail("Internal mapping validation failed while creating schedule entries.");
          return {
            scheduleId: schedule.id,
            teacherId: mapping.teacherId,
            teacherName: entry.teacherName,
            classId: timetableClass.id,
            className: timetableClass.name,
            subjectId: mapping.subjectId,
            subjectName: mapping.temporarySubjectName,
            dayId: entry.dayId,
            dayLabel: clean(day.label),
            periodId: `PERIOD_${entry.periodOrder}`,
            periodLabel: clean(period.label),
            periodOrder: Number(period.order ?? entry.periodOrder),
            isLocked: true,
            source: "IMPORTED",
            placementScore: 0,
            metadataJson: json({ source: "LOCAL_EXCEL_ONE_OFF", sourceFile: "جدول 1448 ف1.xlsx", worksheet: WORKSHEET, classCode: entry.classCode, temporarySubject: true, sourceTeacherOrder: mapping.teacherOrder }),
          };
        }),
      });

      return { schedule, teacherMappings, teachersCreated, teachersReused: parsed.sourceTeacherNames.length - teachersCreated, subjectsCreated, subjectsReused: parsed.sourceTeacherNames.length - subjectsCreated };
    });

    const finalProject = await prisma.timetableProject.findUnique({ where: { id: PROJECT_ID }, select: { id: true, name: true, status: true } });
    const finalTeachers = await prisma.timetableTeacher.findMany({ where: { projectId: PROJECT_ID }, select: { id: true, name: true } });
    const finalSchedules = await prisma.timetableSchedule.findMany({ where: { projectId: PROJECT_ID }, select: { id: true, version: true, status: true, isCurrent: true, _count: { select: { entries: true } } }, orderBy: { version: "asc" } });

    console.log("TARGET PROJECT");
    console.log({ projectId: PROJECT_ID, projectName: finalProject?.name, finalStatus: finalProject?.status });
    console.log("SOURCE");
    console.log({ worksheet: WORKSHEET, sourceTeacherCount: parsed.sourceTeacherNames.length, sourceEntryCount: parsed.entries.length });
    console.log("CREATED / REUSED");
    console.log({ teachersCreated: result.teachersCreated, teachersReused: result.teachersReused, subjectsCreated: result.subjectsCreated, subjectsReused: result.subjectsReused });
    console.log("SCHEDULE");
    console.log({ scheduleId: result.schedule.id, version: result.schedule.version, status: result.schedule.status, entriesCreated: parsed.entries.length });
    console.log("VALIDATION");
    console.log({ duplicateTeacherSlots: 0, duplicateClassSlots: 0 });
    console.table(result.teacherMappings);
    console.log("FINAL DATABASE CHECK");
    console.log({ finalTargetTeacherCount: finalTeachers.length, scheduleCount: finalSchedules.length, currentPublishedSchedule: finalSchedules.find((schedule) => schedule.isCurrent && schedule.status === "PUBLISHED") || null, scheduleEntryCount: finalSchedules.find((schedule) => schedule.id === result.schedule.id)?._count.entries ?? 0 });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`IMPORT ABORTED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
