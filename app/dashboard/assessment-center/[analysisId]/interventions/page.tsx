import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import type { AssessmentResultRow } from "@/lib/assessment-center/assessment-center-types";
import type {
  AssessmentInterventionPackage,
  AssessmentInterventionPackageStudent,
} from "@/lib/assessment-center/assessment-intervention-types";
import { AssessmentInterventionAssistant } from "@/components/assessment-center/assessment-intervention-assistant";

type PageProps = {
  params: Promise<{
    analysisId: string;
  }>;
};

function asRows(value: unknown): AssessmentResultRow[] {
  if (!Array.isArray(value)) return [];
  return value as AssessmentResultRow[];
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function studentFromRow(row: AssessmentResultRow): AssessmentInterventionPackageStudent {
  return {
    id: row.studentId || "",
    name: row.matchedStudentName || row.studentName,
    nationalId: row.nationalId,
    grade: row.grade,
    classroom: row.classroom,
  };
}

function isRiskRow(row: AssessmentResultRow) {
  return (
    row.status === "RISK" ||
    row.status === "NEEDS_SUPPORT" ||
    (typeof row.percentage === "number" && row.percentage < 70)
  );
}

function isExcellentRow(row: AssessmentResultRow) {
  return row.status === "EXCELLENT" || (typeof row.percentage === "number" && row.percentage >= 90);
}

function buildPackages(rows: AssessmentResultRow[]) {
  const linkedRows = rows.filter((row) => row.studentId);
  const packages: AssessmentInterventionPackage[] = [];

  const byStudent = new Map<string, AssessmentResultRow[]>();

  for (const row of linkedRows) {
    if (!row.studentId) continue;
    byStudent.set(row.studentId, [...(byStudent.get(row.studentId) || []), row]);
  }

  for (const [studentId, studentRows] of byStudent.entries()) {
    const first = studentRows[0];
    const percentages = studentRows
      .map((row) => row.percentage)
      .filter((value): value is number => typeof value === "number");

    const avg = average(percentages);
    const weakSubjects = unique(studentRows.filter(isRiskRow).map((row) => row.subject));
    const excellentSubjects = unique(studentRows.filter(isExcellentRow).map((row) => row.subject));

    if (avg < 70 || weakSubjects.length > 0) {
      packages.push({
        id: `student-support:${studentId}`,
        targetType: "STUDENT_SUPPORT",
        title: `متابعة طالب - ${first.matchedStudentName || first.studentName}`,
        description: `الطالب يحتاج خطة متابعة بمتوسط ${avg}%.`,
        recommendedAction: "أنشئ خطة متابعة لهذا الطالب.",
        riskLevel: avg < 50 ? "HIGH" : "MEDIUM",
        primaryStudentId: studentId,
        students: [studentFromRow(first)],
        subjects: weakSubjects,
        grades: unique(studentRows.map((row) => row.grade || "")),
        classrooms: unique(studentRows.map((row) => row.classroom || "")),
        averagePercentage: avg,
        rowsCount: studentRows.length,
      });
    }

    if (avg >= 90 || excellentSubjects.length > 0) {
      packages.push({
        id: `student-excellence:${studentId}`,
        targetType: "STUDENT_EXCELLENCE",
        title: `متابعة طالب - ${first.matchedStudentName || first.studentName}`,
        description: `الطالب حقق متوسط ${avg}% ويحتاج خطة دعم أو تعزيز مناسبة.`,
        recommendedAction: "أنشئ خطة متابعة أو تعزيز لهذا الطالب.",
        riskLevel: "EXCELLENCE",
        primaryStudentId: studentId,
        students: [studentFromRow(first)],
        subjects: excellentSubjects.length
          ? excellentSubjects
          : unique(studentRows.map((row) => row.subject)),
        grades: unique(studentRows.map((row) => row.grade || "")),
        classrooms: unique(studentRows.map((row) => row.classroom || "")),
        averagePercentage: avg,
        rowsCount: studentRows.length,
      });
    }
  }

  const bySubjectWeak = new Map<string, AssessmentResultRow[]>();

  for (const row of linkedRows.filter(isRiskRow)) {
    if (!row.subject) continue;
    bySubjectWeak.set(row.subject, [...(bySubjectWeak.get(row.subject) || []), row]);
  }

  for (const [subject, subjectRows] of bySubjectWeak.entries()) {
    const studentIds = unique(subjectRows.map((row) => row.studentId || ""));
    if (studentIds.length < 2) continue;

    packages.push({
      id: `student-group-subject:${subject}`,
      targetType: "STUDENT_GROUP_SUBJECT",
      title: `خطة جماعية - ${subject}`,
      description: `${studentIds.length} طلاب يحتاجون خطة مشتركة في ${subject}.`,
      recommendedAction: "أنشئ خطة جماعية لهذه المجموعة.",
      riskLevel: average(subjectRows.map((row) => row.percentage || 0)) < 50 ? "HIGH" : "MEDIUM",
      primaryStudentId: null,
      students: unique(subjectRows.map((row) => row.studentId || "")).map((id) => {
        const row = subjectRows.find((item) => item.studentId === id)!;
        return studentFromRow(row);
      }),
      subjects: [subject],
      grades: unique(subjectRows.map((row) => row.grade || "")),
      classrooms: unique(subjectRows.map((row) => row.classroom || "")),
      averagePercentage: average(
        subjectRows.map((row) => row.percentage).filter((value): value is number => typeof value === "number"),
      ),
      rowsCount: subjectRows.length,
    });
  }

  const groupBy = (keyGetter: (row: AssessmentResultRow) => string | null | undefined) => {
    const map = new Map<string, AssessmentResultRow[]>();
    for (const row of linkedRows) {
      const key = keyGetter(row);
      if (!key) continue;
      map.set(key, [...(map.get(key) || []), row]);
    }
    return map;
  };

  for (const [classroomKey, classroomRows] of groupBy((row) =>
    row.grade || row.classroom ? `${row.grade || "غير محدد"} - ${row.classroom || "غير محدد"}` : null,
  ).entries()) {
    const percentages = classroomRows
      .map((row) => row.percentage)
      .filter((value): value is number => typeof value === "number");
    const avg = average(percentages);
    const students = unique(classroomRows.map((row) => row.studentId || ""));

    if (avg < 70 && students.length >= 2) {
      packages.push({
        id: `classroom-support:${classroomKey}`,
        targetType: "CLASSROOM_SUPPORT",
        title: `خطة فصل - ${classroomKey}`,
        description: `الفصل يحتاج خطة متابعة بمتوسط ${avg}%.`,
        recommendedAction: "أنشئ خطة فصل لهذا الفصل.",
        riskLevel: avg < 50 ? "HIGH" : "MEDIUM",
        primaryStudentId: null,
        students: students.map((id) => studentFromRow(classroomRows.find((row) => row.studentId === id)!)),
        subjects: unique(classroomRows.filter(isRiskRow).map((row) => row.subject)),
        grades: unique(classroomRows.map((row) => row.grade || "")),
        classrooms: unique(classroomRows.map((row) => row.classroom || "")),
        averagePercentage: avg,
        rowsCount: classroomRows.length,
      });
    }
  }

  for (const [grade, gradeRows] of groupBy((row) => row.grade).entries()) {
    const percentages = gradeRows
      .map((row) => row.percentage)
      .filter((value): value is number => typeof value === "number");
    const avg = average(percentages);
    const students = unique(gradeRows.map((row) => row.studentId || ""));

    if (avg < 70 && students.length >= 2) {
      packages.push({
        id: `grade-support:${grade}`,
        targetType: "GRADE_SUPPORT",
        title: `خطة فصل - ${grade}`,
        description: `الصف ${grade} يحتاج خطة متابعة بمتوسط ${avg}%.`,
        recommendedAction: "أنشئ خطة فصل لهذا الصف.",
        riskLevel: avg < 50 ? "HIGH" : "MEDIUM",
        primaryStudentId: null,
        students: students.map((id) => studentFromRow(gradeRows.find((row) => row.studentId === id)!)),
        subjects: unique(gradeRows.filter(isRiskRow).map((row) => row.subject)),
        grades: [grade],
        classrooms: unique(gradeRows.map((row) => row.classroom || "")),
        averagePercentage: avg,
        rowsCount: gradeRows.length,
      });
    }
  }

  for (const [subject, subjectRows] of groupBy((row) => row.subject).entries()) {
    const percentages = subjectRows
      .map((row) => row.percentage)
      .filter((value): value is number => typeof value === "number");
    const avg = average(percentages);
    const students = unique(subjectRows.map((row) => row.studentId || ""));

    if (avg < 70 && students.length >= 2) {
      packages.push({
        id: `subject-support:${subject}`,
        targetType: "SUBJECT_SUPPORT",
        title: `خطة مادة - ${subject}`,
        description: `مادة ${subject} تحتاج خطة متابعة بمتوسط ${avg}%.`,
        recommendedAction: "أنشئ خطة مادة لهذه المادة.",
        riskLevel: avg < 50 ? "HIGH" : "MEDIUM",
        primaryStudentId: null,
        students: students.map((id) => studentFromRow(subjectRows.find((row) => row.studentId === id)!)),
        subjects: [subject],
        grades: unique(subjectRows.map((row) => row.grade || "")),
        classrooms: unique(subjectRows.map((row) => row.classroom || "")),
        averagePercentage: avg,
        rowsCount: subjectRows.length,
      });
    }
  }

  return packages.sort((a, b) => {
    const order = {
      HIGH: 0,
      MEDIUM: 1,
      EXCELLENCE: 2,
    };

    if (order[a.riskLevel] !== order[b.riskLevel]) {
      return order[a.riskLevel] - order[b.riskLevel];
    }

    return a.averagePercentage - b.averagePercentage;
  });
}

export default async function AssessmentInterventionsPage({ params }: PageProps) {
  const context = await requireDashboardPageContext();
  const { analysisId } = await params;

  const analysis = await prisma.assessmentAnalysis.findFirst({
    where: context.isAdmin
      ? { id: analysisId }
      : { id: analysisId, schoolAccountId: context.schoolAccountId },
  });

  if (!analysis) notFound();

  const packages = buildPackages(asRows(analysis.rowsJson));

  return (
    <AssessmentInterventionAssistant
      analysisId={analysis.id}
      analysisTitle={analysis.title}
      packages={packages}
    />
  );
}
