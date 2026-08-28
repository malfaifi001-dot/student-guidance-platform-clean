import crypto from "node:crypto";
import { NextResponse } from "next/server";

import {
  buildTeacherAssignmentMessage,
  buildTeacherAssignmentPublicUrl,
  buildWhatsAppUrl,
  normalizeWhatsAppPhone,
} from "@/lib/activity-programs/teacher-assignment-links";
import { getActivityProgramDomainBySlug } from "@/lib/activity-programs/activity-program-catalog";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";
import { dispatchAutomaticPushEvent } from "@/lib/notifications/push-center-service";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";

function getOrigin(request: Request) {
  return (
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NODE_ENV === "production" ? "https://teachix.sa" : "http://localhost:3000"
  );
}

function parseDate(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return null;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asEvidenceItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => {
      return Boolean(item && typeof item === "object" && !Array.isArray(item));
    })
    .map((item) => ({
      id: String(item.id || ""),
      fileName: String(item.fileName || "شاهد"),
      fileUrl: String(item.fileUrl || ""),
      mimeType: String(item.mimeType || "application/octet-stream"),
      size: Number(item.size || 0),
    }))
    .filter((item) => item.fileUrl);
}

function mapWorkflow(workflow: {
  id: string;
  name: string;
  steps: {
    id: string;
    title: string;
    description: string | null;
    order: number;
    fields: {
      id: string;
      key: string;
      label: string;
      type: string;
      placeholder: string | null;
      helpText: string | null;
      isRequired: boolean;
      order: number;
      options: {
        id: string;
        label: string;
        value: string;
        order: number;
      }[];
    }[];
  }[];
}) {
  return {
    id: workflow.id,
    name: workflow.name,
    steps: workflow.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      order: step.order,
      fields: step.fields.map((field) => ({
        id: field.id,
        key: field.key,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder,
        helpText: field.helpText,
        isRequired: field.isRequired,
        order: field.order,
        options: field.options.map((option) => ({
          id: option.id,
          label: option.label,
          value: option.value,
          order: option.order,
        })),
      })),
    })),
  };
}

export async function GET(request: Request) {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  if (authResult.user.role !== "ACTIVITY_LEADER" && authResult.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "هذه الصفحة مخصصة لرائد النشاط." },
      { status: 403 },
    );
  }

  const guard = await requireServiceAccessApi("activity-programs");
  if (guard) return guard;

  const origin = getOrigin(request);
  const requestedDomainSlug = new URL(request.url).searchParams.get("domainSlug")?.trim() || "";
  const requestedDomain = requestedDomainSlug
    ? getActivityProgramDomainBySlug(requestedDomainSlug)
    : null;

  if (requestedDomainSlug && !requestedDomain) {
    return NextResponse.json(
      { success: false, error: "مجال النشاط غير صحيح." },
      { status: 400 },
    );
  }

  const assignments = await prisma.activityAssignment.findMany({
    where: {
      schoolAccountId: authResult.schoolAccountId,
      ...(requestedDomain ? { domainSlug: requestedDomain.slug } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      schoolAccount: {
        include: {
          profile: true,
        },
      },
      workflow: {
        include: {
          steps: {
            include: {
              fields: {
                include: {
                  options: true,
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },
      caseEntry: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    assignments: assignments.map((assignment) => {
      const publicUrl = buildTeacherAssignmentPublicUrl(origin, assignment.token);
      const message = buildTeacherAssignmentMessage({
        teacherName: assignment.teacherName,
        domainTitle: assignment.domainTitle,
        schoolName:
          assignment.schoolAccount.profile?.schoolName ||
          assignment.schoolAccount.name,
        dueDate: assignment.dueDate,
        note: assignment.note,
        url: publicUrl,
      });

      return {
        id: assignment.id,
        domainSlug: assignment.domainSlug,
        domainTitle: assignment.domainTitle,
        teacherName: assignment.teacherName,
        teacherPhone: assignment.teacherPhone,
        teacherEmail: assignment.teacherEmail,
        teacherSignatureUrl: assignment.teacherSignatureUrl,
        teacherSignedName: assignment.teacherSignedName,
        teacherSignedAt: assignment.teacherSignedAt,
        dueDate: assignment.dueDate,
        note: assignment.note,
        returnedReason: assignment.returnedReason,
        status: assignment.status,
        token: assignment.token,
        publicUrl,
        whatsappUrl: buildWhatsAppUrl(assignment.teacherPhone, message),
        openedAt: assignment.openedAt,
        submittedAt: assignment.submittedAt,
        approvedAt: assignment.approvedAt,
        returnedAt: assignment.returnedAt,
        caseEntryId: assignment.caseEntryId,
        caseEntry: assignment.caseEntry,
        submittedValues: asRecord(assignment.submittedValues),
        submittedEvidenceItems: asEvidenceItems(assignment.submittedEvidenceItems),
        workflow: mapWorkflow(assignment.workflow),
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
      };
    }),
  });
}

export async function POST(request: Request) {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  if (authResult.user.role !== "ACTIVITY_LEADER" && authResult.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "هذه العملية مخصصة لرائد النشاط." },
      { status: 403 },
    );
  }

  const guard = await requireServiceAccessApi("activity-programs");
  if (guard) return guard;

  const body = await request.json().catch(() => null);

  const domainSlug = String(body?.domainSlug || "").trim();
  const teacherName = String(body?.teacherName || "").trim();
  const rawPhone = String(body?.teacherPhone || "").trim();
  const teacherPhone = normalizeWhatsAppPhone(rawPhone);
  const teacherEmail = String(body?.teacherEmail || "").trim() || null;
  const dueDate = parseDate(body?.dueDate);
  const note = String(body?.note || "").trim() || null;

  const domain = getActivityProgramDomainBySlug(domainSlug);

  if (!domain) {
    return NextResponse.json(
      { success: false, error: "مجال النشاط غير صحيح." },
      { status: 400 },
    );
  }

  if (!teacherName) {
    return NextResponse.json(
      { success: false, error: "اكتب اسم المعلم." },
      { status: 400 },
    );
  }

  if (!teacherPhone || teacherPhone.length < 11) {
    return NextResponse.json(
      { success: false, error: "اكتب رقم جوال واتساب صحيح." },
      { status: 400 },
    );
  }

  const publishedWorkflow = await getRuntimeWorkflowByServiceSlug(
    domain.serviceSlug,
  );

  if (!publishedWorkflow) {
    return NextResponse.json(
      { success: false, error: "لا يوجد Workflow منشور لهذا المجال." },
      { status: 404 },
    );
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenExpiresAt = dueDate ? addDays(dueDate, 30) : addDays(new Date(), 180);

  const assignment = await prisma.activityAssignment.create({
    data: {
      schoolAccountId: authResult.schoolAccountId,
      createdById: authResult.user.id,
      serviceId: publishedWorkflow.service.id,
      workflowId: publishedWorkflow.workflow.id,
      domainSlug: domain.slug,
      domainTitle: domain.title,
      teacherName,
      teacherPhone,
      teacherEmail,
      dueDate,
      note,
      token,
      tokenExpiresAt,
      status: "SENT",
    },
    include: {
      schoolAccount: {
        include: {
          profile: true,
        },
      },
    },
  });

  void dispatchAutomaticPushEvent({ triggerKey: "activity-assignment-created", actorUserId: authResult.user.id, sourceRecordId: assignment.id, variables: { assignmentTitle: assignment.domainTitle, serviceName: assignment.domainTitle } }).catch(() => undefined);

  const origin = getOrigin(request);
  const publicUrl = buildTeacherAssignmentPublicUrl(origin, assignment.token);
  const message = buildTeacherAssignmentMessage({
    teacherName: assignment.teacherName,
    domainTitle: assignment.domainTitle,
    schoolName:
      assignment.schoolAccount.profile?.schoolName ||
      assignment.schoolAccount.name,
    dueDate: assignment.dueDate,
    note: assignment.note,
    url: publicUrl,
  });

  return NextResponse.json({
    success: true,
    assignment: {
      id: assignment.id,
      teacherName: assignment.teacherName,
      teacherPhone: assignment.teacherPhone,
      domainTitle: assignment.domainTitle,
      status: assignment.status,
      publicUrl,
      whatsappUrl: buildWhatsAppUrl(assignment.teacherPhone, message),
    },
    message: "تم إنشاء رابط المعلم بنجاح.",
  });
}
