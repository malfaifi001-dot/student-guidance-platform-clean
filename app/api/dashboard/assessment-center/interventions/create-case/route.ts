import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import type { AssessmentInterventionPackage } from "@/lib/assessment-center/assessment-intervention-types";

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

  const targetServiceGuard = await requireServiceAccessApi(service.slug);
  if (targetServiceGuard) return targetServiceGuard;

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
        { caseEntryId: caseEntry.id, fieldKey: "assessment_students_count", value: String(interventionPackage.students.length) },
      ],
    });

    await tx.caseValue.create({
      data: {
        caseEntryId: caseEntry.id,
        fieldKey: "assessment_students_json",
        jsonValue: interventionPackage.students as Prisma.InputJsonValue,
      },
    });

    await tx.caseValue.create({
      data: {
        caseEntryId: caseEntry.id,
        fieldKey: "assessment_package_json",
        jsonValue: interventionPackage as Prisma.InputJsonValue,
      },
    });

    return caseEntry;
  });

  return NextResponse.json({
    success: true,
    caseId: createdCase.id,
    caseUrl: `/dashboard/cases/${createdCase.id}/edit`,
  });
}