import { NextResponse } from "next/server";

import { buildTeacherActivityLinkPublicUrl } from "@/lib/activity-programs/teacher-activity-link-helpers";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";

function getOrigin(request: Request) {
  return (
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NODE_ENV === "production" ? "https://teachix.sa" : "http://localhost:3000"
  );
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
      { success: false, error: "هذه العملية مخصصة لرائد النشاط." },
      { status: 403 },
    );
  }

  const guard = await requireServiceAccessApi("activity-programs");
  if (guard) return guard;

  const origin = getOrigin(request);
  const schoolAccountId = authResult.schoolAccountId;

  const [links, submissions] = await Promise.all([
    prisma.teacherActivityLink.findMany({
      where: { schoolAccountId },
      orderBy: { createdAt: "desc" },
      include: {
        submissions: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    }),
    prisma.teacherActivitySubmission.findMany({
      where: { schoolAccountId },
      orderBy: { createdAt: "desc" },
      include: {
        link: {
          select: {
            id: true,
            title: true,
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
              orderBy: { order: "asc" },
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
    }),
  ]);

  return NextResponse.json({
    success: true,
    links: links.map((link) => ({
      id: link.id,
      title: link.title,
      note: link.note,
      status: link.status,
      token: link.token,
      publicUrl: buildTeacherActivityLinkPublicUrl(origin, link.token),
      tokenExpiresAt: link.tokenExpiresAt,
      closedAt: link.closedAt,
      submissionCounts: {
        total: link.submissions.length,
        submitted: link.submissions.filter((item) => item.status === "SUBMITTED").length,
        returned: link.submissions.filter((item) => item.status === "RETURNED").length,
        approved: link.submissions.filter((item) => item.status === "APPROVED").length,
        canceled: link.submissions.filter((item) => item.status === "CANCELED").length,
      },
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    })),
    submissions: submissions.map((submission) => ({
      id: submission.id,
      linkId: submission.linkId,
      linkTitle: submission.link.title,
      domainSlug: submission.domainSlug,
      domainTitle: submission.domainTitle,
      teacherName: submission.teacherName,
      teacherPhone: submission.teacherPhone,
      teacherEmail: submission.teacherEmail,
      teacherSignatureUrl: submission.teacherSignatureUrl,
      teacherSignedName: submission.teacherSignedName,
      teacherSignedAt: submission.teacherSignedAt,
      status: submission.status,
      returnedReason: submission.returnedReason,
      submittedAt: submission.submittedAt,
      approvedAt: submission.approvedAt,
      returnedAt: submission.returnedAt,
      caseEntryId: submission.caseEntryId,
      caseEntry: submission.caseEntry,
      submittedValues: asRecord(submission.submittedValues),
      submittedEvidenceItems: asEvidenceItems(submission.submittedEvidenceItems),
      workflow: mapWorkflow(submission.workflow),
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    })),
  });
}
