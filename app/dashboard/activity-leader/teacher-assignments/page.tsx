import { redirect } from "next/navigation";

import { TeacherAssignmentsClient } from "@/components/activity-programs/teacher-assignments-client";
import {
  buildTeacherAssignmentMessage,
  buildTeacherAssignmentPublicUrl,
  buildWhatsAppUrl,
} from "@/lib/activity-programs/teacher-assignment-links";
import { getDashboardHomePath } from "@/lib/auth/dashboard-redirects";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";

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

export default async function TeacherAssignmentsPage() {
  const current = await requireDashboardUser();

  if (current.user.role !== "ACTIVITY_LEADER") {
    redirect(getDashboardHomePath(current.user.role));
  }

  await requireServiceAccessForCurrentUser("activity-programs");

  const schoolAccountId = current.user.schoolAccountId;

  if (!schoolAccountId) {
    redirect("/dashboard/onboarding?required=true");
  }

  const assignments = await prisma.activityAssignment.findMany({
    where: {
      schoolAccountId,
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

  const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

  return (
    <TeacherAssignmentsClient
      initialAssignments={assignments.map((assignment) => {
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
          workflow: {
            id: assignment.workflow.id,
            name: assignment.workflow.name,
            steps: assignment.workflow.steps.map((step) => ({
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
          },
          createdAt: assignment.createdAt,
          updatedAt: assignment.updatedAt,
        };
      })}
    />
  );
}