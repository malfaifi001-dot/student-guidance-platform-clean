import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import type { AssessmentInterventionPackage } from "@/lib/assessment-center/assessment-intervention-types";
import {
  SMART_INTERVENTION_SERVICE_SLUGS,
  SMART_INTERVENTION_TARGET_SERVICE_SLUG_BY_TYPE,
} from "@/lib/constants/services";

export const runtime = "nodejs";

type CreateInterventionCaseBody = {
  analysisId?: string;
  analysisTitle?: string;
  package?: AssessmentInterventionPackage;
  targetServiceId?: string;
  targetWorkflowId?: string | null;
  saveAsDefault?: boolean;
};

async function readBody(request: Request): Promise<CreateInterventionCaseBody> {
  try {
    return (await request.json()) as CreateInterventionCaseBody;
  } catch {
    return {};
  }
}

function shortValue(value: unknown) {
  const text = String(value ?? "");
  return text.length > 180 ? `${text.slice(0, 180)}...` : text;
}

export async function POST(request: Request) {
  const auth = await requireSchoolDashboardApiContext();

  if (auth instanceof Response) return auth;

  const assessmentGuard = await requireServiceAccessApi("assessment-center");
  if (assessmentGuard) return assessmentGuard;

  const body = await readBody(request);
  const interventionPackage = body.package;

  if (!interventionPackage || !body.targetServiceId || !body.targetWorkflowId) {
    return NextResponse.json(
      { success: false, error: "حزمة التدخل والخدمة والـ Workflow مطلوبة." },
      { status: 400 }
    );
  }

  const service = await prisma.service.findFirst({
    where: {
      id: body.targetServiceId,
      status: "ACTIVE",
    },
  });

  if (!service) {
    return NextResponse.json(
      { success: false, error: "الخدمة المحددة غير موجودة أو غير مفعلة." },
      { status: 404 }
    );
  }

  const expectedServiceSlug =
    SMART_INTERVENTION_TARGET_SERVICE_SLUG_BY_TYPE[interventionPackage.targetType];

  if (expectedServiceSlug && service.slug !== expectedServiceSlug) {
    return NextResponse.json(
      {
        success: false,
        error: "الخدمة المختارة لا تطابق نوع حزمة التدخل.",
      },
      { status: 400 }
    );
  }

  if (!SMART_INTERVENTION_SERVICE_SLUGS.includes(service.slug)) {
    const targetServiceGuard = await requireServiceAccessApi(service.slug);
    if (targetServiceGuard) return targetServiceGuard;
  }

  const workflow = await prisma.workflow.findFirst({
    where: {
      id: body.targetWorkflowId,
      serviceId: service.id,
      isActive: true,
    },
    include: {
      steps: {
        orderBy: { order: "asc" },
        include: {
          fields: {
            orderBy: { order: "asc" },
            include: {
              options: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!workflow) {
    return NextResponse.json(
      { success: false, error: "الـ Workflow المحدد غير موجود أو غير مفعل لهذه الخدمة." },
      { status: 404 }
    );
  }

  const primaryStudentId =
    interventionPackage.targetType === "STUDENT_SUPPORT" ||
    interventionPackage.targetType === "STUDENT_EXCELLENCE"
      ? interventionPackage.primaryStudentId || interventionPackage.students[0]?.id
      : null;

  const primaryStudent = primaryStudentId
    ? await prisma.student.findFirst({
        where: {
          id: primaryStudentId,
          schoolAccountId: auth.schoolAccountId,
          isActive: true,
        },
      })
    : null;

  if (primaryStudentId && !primaryStudent) {
    return NextResponse.json(
      { success: false, error: "لم يتم العثور على الطالب داخل مركز البيانات." },
      { status: 404 }
    );
  }

  const studentsForReport = interventionPackage.students.map((student, index) => ({
    index: index + 1,
    id: student.id,
    name: student.name,
    nationalId: student.nationalId || null,
    grade: student.grade || null,
    classroom: student.classroom || null,
  }));

  const studentNames = studentsForReport.map((student) => student.name);

  const numberedStudentNames = studentsForReport.map((student) => ({
    index: student.index,
    text: `${student.index}. ${student.name}`,
    name: student.name,
  }));

  const studentsNamesText = studentNames.join("، ");
  const studentsNumberedText = numberedStudentNames
    .map((student) => student.text)
    .join("\n");

  const subjectsText = interventionPackage.subjects.join("، ") || "غير محدد";
  const gradesText = interventionPackage.grades.join("، ") || "غير محدد";
  const classroomsText = interventionPackage.classrooms.join("، ") || "غير محدد";

  const packageSummaryText = [
    `عنوان التدخل: ${interventionPackage.title}`,
    `نوع التدخل: ${interventionPackage.targetType}`,
    `عدد الطلاب: ${studentsForReport.length}`,
    `أسماء الطلاب: ${studentsNamesText || "غير محدد"}`,
    `الصفوف: ${gradesText}`,
    `الفصول: ${classroomsText}`,
    `المواد: ${subjectsText}`,
    `متوسط التحليل: ${interventionPackage.averagePercentage}%`,
    `الإجراء المقترح: ${interventionPackage.recommendedAction}`,
  ].join("\n");

  const cleanPackageForReports = {
    id: interventionPackage.id,
    targetType: interventionPackage.targetType,
    title: interventionPackage.title,
    description: interventionPackage.description,
    recommendedAction: interventionPackage.recommendedAction,
    riskLevel: interventionPackage.riskLevel,
    averagePercentage: interventionPackage.averagePercentage,
    rowsCount: interventionPackage.rowsCount,
    studentsCount: studentsForReport.length,
    studentsNames: studentNames,
    students: studentsForReport,
    subjects: interventionPackage.subjects,
    grades: interventionPackage.grades,
    classrooms: interventionPackage.classrooms,
  };

  const reportPayload = {
    source: "assessment-center",
    analysisId: body.analysisId || null,
    analysisTitle: body.analysisTitle || null,
    intervention: cleanPackageForReports,
    reportFields: {
      interventionTitle: interventionPackage.title,
      interventionTargetType: interventionPackage.targetType,
      studentsCount: studentsForReport.length,
      studentsNames: studentNames,
      numberedStudentNames,
      subjects: interventionPackage.subjects,
      grades: interventionPackage.grades,
      classrooms: interventionPackage.classrooms,
      averagePercentage: interventionPackage.averagePercentage,
      rowsCount: interventionPackage.rowsCount,
      recommendedAction: interventionPackage.recommendedAction,
    },
  };

  const workflowSnapshot = {
    id: workflow.id,
    name: workflow.name,
    version: workflow.version,
    workflowType: workflow.workflowType,
    steps: workflow.steps,
  };

  const createdCase = await prisma.$transaction(async (tx) => {
    const caseEntry = await tx.caseEntry.create({
      data: {
        schoolAccountId: auth.schoolAccountId,
        serviceId: service.id,
        workflowId: workflow.id,
        workflowSnapshot: workflowSnapshot as Prisma.InputJsonValue,
        studentId: primaryStudent?.id || null,
        createdById: (auth as any).userId || null,
        title: shortValue(interventionPackage.title),
      },
    });

    await tx.caseValue.createMany({
      data: [
        { caseEntryId: caseEntry.id, fieldKey: "assessment_source", value: "assessment-center" },
        { caseEntryId: caseEntry.id, fieldKey: "assessment_analysis_id", value: shortValue(body.analysisId) },
        { caseEntryId: caseEntry.id, fieldKey: "assessment_analysis_title", value: shortValue(body.analysisTitle) },

        { caseEntryId: caseEntry.id, fieldKey: "intervention_target_type", value: interventionPackage.targetType },
        { caseEntryId: caseEntry.id, fieldKey: "intervention_title", value: shortValue(interventionPackage.title) },
        { caseEntryId: caseEntry.id, fieldKey: "intervention_description", value: shortValue(interventionPackage.description) },
        { caseEntryId: caseEntry.id, fieldKey: "intervention_recommended_action", value: shortValue(interventionPackage.recommendedAction) },

        { caseEntryId: caseEntry.id, fieldKey: "assessment_average_percentage", value: String(interventionPackage.averagePercentage) },
        { caseEntryId: caseEntry.id, fieldKey: "assessment_rows_count", value: String(interventionPackage.rowsCount) },
        { caseEntryId: caseEntry.id, fieldKey: "assessment_subjects", value: shortValue(interventionPackage.subjects.join("، ")) },
        { caseEntryId: caseEntry.id, fieldKey: "assessment_grades", value: shortValue(interventionPackage.grades.join("، ")) },
        { caseEntryId: caseEntry.id, fieldKey: "assessment_classrooms", value: shortValue(interventionPackage.classrooms.join("، ")) },
        { caseEntryId: caseEntry.id, fieldKey: "assessment_students_count", value: String(studentsForReport.length) },
        { caseEntryId: caseEntry.id, fieldKey: "assessment_students_names_preview", value: shortValue(studentsNamesText) },
        { caseEntryId: caseEntry.id, fieldKey: "assessment_students_names_text", value: studentsNamesText },
        { caseEntryId: caseEntry.id, fieldKey: "assessment_students_numbered_text", value: studentsNumberedText },
        { caseEntryId: caseEntry.id, fieldKey: "assessment_package_summary_text", value: packageSummaryText },
        { caseEntryId: caseEntry.id, fieldKey: "assessment_report_ready_text", value: packageSummaryText },
      ],
    });

    await tx.caseValue.createMany({
      data: [
        {
          caseEntryId: caseEntry.id,
          fieldKey: "assessment_students_json",
          jsonValue: studentsForReport as Prisma.InputJsonValue,
        },
        {
          caseEntryId: caseEntry.id,
          fieldKey: "assessment_students_names_json",
          jsonValue: studentNames as Prisma.InputJsonValue,
        },
        {
          caseEntryId: caseEntry.id,
          fieldKey: "assessment_students_numbered_json",
          jsonValue: numberedStudentNames as Prisma.InputJsonValue,
        },
        {
          caseEntryId: caseEntry.id,
          fieldKey: "assessment_package_json",
          jsonValue: cleanPackageForReports as Prisma.InputJsonValue,
        },
        {
          caseEntryId: caseEntry.id,
          fieldKey: "assessment_report_payload_json",
          jsonValue: reportPayload as Prisma.InputJsonValue,
        },
      ],
    });

    return caseEntry;
  });

  return NextResponse.json({
    success: true,
    caseId: createdCase.id,
    caseUrl: `/dashboard/cases/${createdCase.id}/edit`,
  });
}