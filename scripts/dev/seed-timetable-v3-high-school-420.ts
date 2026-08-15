import "dotenv/config";

import { prisma } from "../../lib/prisma";
import {
  createTimetableV3Project,
  getTimetableV3SetupWorkspace,
  saveTimetableV3Classes,
  saveTimetableV3Days,
  saveTimetableV3Periods,
  saveTimetableV3Subjects,
  saveTimetableV3Teachers,
} from "../../lib/timetable-v3/project-setup-service";
import { createTimetableV3Assignment } from "../../lib/timetable-v3/assignment-service";
import { createTimetableV2Constraint } from "../../lib/timetable-v2/constraint-service";

const PROJECT_NAME = "V3 E2E High School 420";
const ANCHOR_PROJECT_ID = "cmstnq9e90001hsno4trypdjs";
const UI_PATH = "http://localhost:3000/dashboard/timetable-v3";

const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"] as const;
const CLASS_NAMES = ["1A", "1B", "1C", "1D", "2A", "2B", "2C", "2D", "3A", "3B", "3C", "3D"];
const SUBJECT_PLANS = [
  ["Arabic", 5],
  ["Mathematics", 5],
  ["English", 4],
  ["Physics", 3],
  ["Chemistry", 3],
  ["Biology", 3],
  ["Islamic Studies", 3],
  ["Social Studies", 2],
  ["Physical Education", 2],
  ["Computer", 2],
  ["Skills", 3],
] as const;
const FOUR_TEACHER_SUBJECTS = SUBJECT_PLANS.slice(0, 7).map(([name]) => name);
const THREE_TEACHER_SUBJECTS = SUBJECT_PLANS.slice(7).map(([name]) => name);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function teacherPrefix(subjectName: string) {
  return subjectName === "Physical Education" ? "PE" : subjectName;
}

function allTeacherNames() {
  return [
    ...FOUR_TEACHER_SUBJECTS.flatMap((subject) =>
      Array.from({ length: 4 }, (_, index) => `${teacherPrefix(subject)} ${index + 1}`),
    ),
    ...THREE_TEACHER_SUBJECTS.flatMap((subject) =>
      Array.from({ length: 3 }, (_, index) => `${teacherPrefix(subject)} ${index + 1}`),
    ),
  ];
}

async function resolveLocalOwner() {
  const anchor = await prisma.timetableProject.findUnique({
    where: { id: ANCHOR_PROJECT_ID },
    select: {
      schoolAccountId: true,
      createdById: true,
      settingsJson: true,
      createdBy: { select: { schoolAccountId: true, isActive: true } },
    },
  });

  assert(anchor, `Verified UI anchor project not found: ${ANCHOR_PROJECT_ID}`);
  const marker = anchor.settingsJson as { timetableV3?: { version?: number } } | null;
  assert(marker?.timetableV3?.version === 3, "UI anchor is not a Timetable V3 project");
  assert(anchor.createdBy.isActive, "UI anchor creator is inactive");
  assert(
    anchor.createdBy.schoolAccountId === anchor.schoolAccountId,
    "UI anchor creator does not belong to its school account",
  );

  return {
    schoolAccountId: anchor.schoolAccountId,
    createdById: anchor.createdById,
  };
}

async function printExisting(projectId: string) {
  console.log("PROJECT ALREADY EXISTS");
  console.log(`Project ID: ${projectId}`);
  console.log(`Project name: ${PROJECT_NAME}`);
  console.log(`UI path: ${UI_PATH}`);
}

async function main() {
  const owner = await resolveLocalOwner();
  const existing = await prisma.timetableProject.findFirst({
    where: { schoolAccountId: owner.schoolAccountId, name: PROJECT_NAME },
    select: { id: true },
  });

  if (existing) {
    await printExisting(existing.id);
    return;
  }

  const project = await createTimetableV3Project(owner.schoolAccountId, owner.createdById, {
    name: PROJECT_NAME,
    academicYear: "2026-2027",
    semester: "FIRST",
  });

  await saveTimetableV3Days(project.id, owner.schoolAccountId, [...DAYS]);
  await saveTimetableV3Periods(
    project.id,
    owner.schoolAccountId,
    Array.from({ length: 7 }, (_, index) => ({
      label: `Period ${index + 1}`,
      startTime: null,
      endTime: null,
      isBreak: false,
    })),
  );
  await saveTimetableV3Classes(project.id, owner.schoolAccountId, CLASS_NAMES);
  await saveTimetableV3Subjects(project.id, owner.schoolAccountId, SUBJECT_PLANS.map(([name]) => name));
  await saveTimetableV3Teachers(
    project.id,
    owner.schoolAccountId,
    allTeacherNames().map((name) => ({
      name,
      specialty: name.replace(/ \d+$/, ""),
      maxWeeklyLoad: 24,
    })),
  );

  const workspace = await getTimetableV3SetupWorkspace(project.id, owner.schoolAccountId);
  const classes = new Map(workspace.classes.map((item) => [item.name, item.id]));
  const subjects = new Map(workspace.subjects.map((item) => [item.name, item.id]));
  const teachers = new Map(workspace.teachers.map((item) => [item.name, item.id]));
  const periods = new Map(workspace.periods.map((item) => [item.order, item.id]));

  // V3 has no curriculum-plan write service/API. This is the only direct write:
  // readiness reads TimetableClassSubject as the required weekly lesson plan.
  await prisma.timetableClassSubject.createMany({
    data: CLASS_NAMES.flatMap((className) =>
      SUBJECT_PLANS.map(([subjectName, weeklyLessons]) => ({
        projectId: project.id,
        classId: classes.get(className)!,
        subjectId: subjects.get(subjectName)!,
        weeklyLessons,
      })),
    ),
  });

  for (const [subjectName, weeklyLessons] of SUBJECT_PLANS) {
    for (const className of CLASS_NAMES) {
      const teacherNumber = FOUR_TEACHER_SUBJECTS.includes(subjectName)
        ? "ABCD".indexOf(className[1]) + 1
        : Number(className[0]);
      const teacherName = `${teacherPrefix(subjectName)} ${teacherNumber}`;
      const assignment = await createTimetableV3Assignment(project.id, owner.schoolAccountId, {
        teacherId: teachers.get(teacherName)!,
        classId: classes.get(className)!,
        subjectId: subjects.get(subjectName)!,
        assignedLessons: weeklyLessons,
      });
      assert(!assignment.overload, `Unexpected teacher overload: ${teacherName}`);
    }
  }

  const slot = (dayId: string, periodOrder: number) => ({
    dayId,
    periodId: periods.get(periodOrder)!,
  });
  const preferredSlots = (periodOrders: number[]) =>
    DAYS.flatMap((dayId) => periodOrders.map((periodOrder) => slot(dayId, periodOrder)));

  const constraints = [
    { type: "TEACHER_UNAVAILABLE", strength: "HARD" as const, teacherIds: [teachers.get("Arabic 1")!], slots: [slot("SUNDAY", 1)] },
    { type: "TEACHER_UNAVAILABLE", strength: "HARD" as const, teacherIds: [teachers.get("Mathematics 1")!], slots: [slot("MONDAY", 7)] },
    { type: "TEACHER_UNAVAILABLE", strength: "HARD" as const, teacherIds: [teachers.get("English 2")!], slots: [slot("WEDNESDAY", 1)] },
    { type: "TEACHER_UNAVAILABLE", strength: "HARD" as const, teacherIds: [teachers.get("Physics 3")!], slots: [slot("THURSDAY", 7)] },
    { type: "TEACHER_MAX_DAILY", strength: "HARD" as const, teacherIds: [teachers.get("Arabic 1")!], valueInt: 5 },
    { type: "TEACHER_MAX_DAILY", strength: "HARD" as const, teacherIds: [teachers.get("Mathematics 1")!], valueInt: 5 },
    { type: "TEACHER_MAX_CONSECUTIVE", strength: "HARD" as const, teacherIds: [teachers.get("Arabic 2")!], valueInt: 3 },
    { type: "TEACHER_MAX_CONSECUTIVE", strength: "HARD" as const, teacherIds: [teachers.get("Mathematics 2")!], valueInt: 3 },
    { type: "TEACHER_PREFERRED", strength: "SOFT" as const, teacherIds: [teachers.get("English 1")!], slots: preferredSlots([1, 2, 3, 4]), configJson: { weight: 10 } },
    { type: "TEACHER_PREFERRED", strength: "SOFT" as const, teacherIds: [teachers.get("Mathematics 3")!], slots: preferredSlots([1, 2, 3, 4, 5]), configJson: { weight: 10 } },
    ...["Arabic", "Mathematics", "English"].map((subjectName) => ({
      type: "SUBJECT_DAILY_LIMIT",
      strength: "HARD" as const,
      subjectIds: [subjects.get(subjectName)!],
      valueInt: 1,
    })),
  ];

  for (const constraint of constraints) {
    await createTimetableV2Constraint(project.id, owner.schoolAccountId, constraint);
  }

  const verified = await prisma.timetableProject.findUniqueOrThrow({
    where: { id: project.id },
    include: {
      classes: { where: { isActive: true } },
      subjects: { where: { isActive: true } },
      teachers: { where: { isActive: true } },
      assignments: true,
    },
  });
  const verifiedMarker = verified.settingsJson as { timetableV3?: { version?: number } } | null;
  const assignedLessons = verified.assignments.reduce((sum, item) => sum + item.assignedLessons, 0);

  assert(verifiedMarker?.timetableV3?.version === 3, "Missing timetableV3.version = 3 marker");
  assert(verified.classes.length === 12, `Expected 12 classes; found ${verified.classes.length}`);
  assert(verified.subjects.length === 11, `Expected 11 subjects; found ${verified.subjects.length}`);
  assert(verified.teachers.length === 40, `Expected 40 teachers; found ${verified.teachers.length}`);
  assert(verified.assignments.length === 132, `Expected 132 assignments; found ${verified.assignments.length}`);
  assert(assignedLessons === 420, `Expected 420 assigned lessons; found ${assignedLessons}`);

  console.log("PROJECT CREATED");
  console.log(`Project ID: ${verified.id}`);
  console.log(`Project name: ${verified.name}`);
  console.log(`Classes: ${verified.classes.length}`);
  console.log(`Subjects: ${verified.subjects.length}`);
  console.log(`Teachers: ${verified.teachers.length}`);
  console.log(`Assignments: ${verified.assignments.length}`);
  console.log(`Assigned lessons: ${assignedLessons}`);
  console.log(`UI path: ${UI_PATH}`);
}

main()
  .catch((error) => {
    console.error("LOCAL V3 SEED FAILED", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
