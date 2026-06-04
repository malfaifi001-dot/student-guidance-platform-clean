const fs = require("fs");

const enginePath = "engine/cases/case-runtime-engine.ts";

if (!fs.existsSync(enginePath)) {
  throw new Error("لم يتم العثور على engine/cases/case-runtime-engine.ts");
}

let content = fs.readFileSync(enginePath, "utf8");

const marker = "SMART_STUDENT_SERVER_SNAPSHOT_MARKER";

if (!content.includes(marker)) {
  const helper = `
type RuntimeStudentSnapshotSource = {
  id: string;
  schoolAccountId: string;
  fullName: string;
  nationalId: string | null;
  gender: string | null;
  stage: string | null;
  grade: string | null;
  classroom: string | null;
  isActive: boolean;
  guardian: {
    id: string;
    name: string;
    phone: string | null;
    relation: string | null;
  } | null;
};

function buildStudentSnapshots(student: RuntimeStudentSnapshotSource) {
  const studentSnapshot = {
    id: student.id,
    fullName: student.fullName,
    nationalId: student.nationalId,
    gender: student.gender,
    stage: student.stage,
    grade: student.grade,
    classroom: student.classroom,
    isActive: student.isActive,
    capturedAt: new Date().toISOString(),
  };

  const guardianSnapshot = student.guardian
    ? {
        id: student.guardian.id,
        name: student.guardian.name,
        phone: student.guardian.phone,
        relation: student.guardian.relation,
        capturedAt: new Date().toISOString(),
      }
    : null;

  return {
    studentSnapshot,
    guardianSnapshot,
    selectedStudent: {
      ...studentSnapshot,
      guardian: guardianSnapshot,
      guardianName: guardianSnapshot?.name ?? null,
      guardianPhone: guardianSnapshot?.phone ?? null,
    },
  };
}

function mergeStudentSnapshotsIntoValues(
  values: RuntimeCaseValues,
  student: RuntimeStudentSnapshotSource | null
): RuntimeCaseValues {
  const nextValues = { ...(values || {}) } as Record<string, unknown>;

  if (!student) {
    delete nextValues.selectedStudent;
    delete nextValues.studentSnapshot;
    delete nextValues.guardianSnapshot;

    return nextValues as unknown as RuntimeCaseValues;
  }

  const snapshots = buildStudentSnapshots(student);

  nextValues.selectedStudent = snapshots.selectedStudent;
  nextValues.studentSnapshot = snapshots.studentSnapshot;
  nextValues.guardianSnapshot = snapshots.guardianSnapshot;

  return nextValues as unknown as RuntimeCaseValues;
}

// ${marker}
`;

  content = content.replace(
    "async function findStudentOrNull(",
    `${helper}\nasync function findStudentOrNull(`
  );
}

content = content.replace(
  `    select: {
      id: true,
      schoolAccountId: true,
    },`,
  `    select: {
      id: true,
      schoolAccountId: true,
      fullName: true,
      nationalId: true,
      gender: true,
      stage: true,
      grade: true,
      classroom: true,
      isActive: true,
      guardian: {
        select: {
          id: true,
          name: true,
          phone: true,
          relation: true,
        },
      },
    },`
);

content = content.replaceAll(
  "const serializedValues = serializeCaseValues(values);",
  `const valuesWithStudentSnapshot = mergeStudentSnapshotsIntoValues(
    values,
    existingStudent
  );
  const serializedValues = serializeCaseValues(valuesWithStudentSnapshot);`
);

fs.writeFileSync(enginePath, content, "utf8");

console.log("تم تثبيت server-side student snapshots داخل case-runtime-engine.ts");
