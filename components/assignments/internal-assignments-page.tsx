import { redirect } from "next/navigation";

import { InternalAssignmentsClient } from "@/components/assignments/internal-assignments-client";
import {
  listInternalAssignmentsForAssignee,
  type InternalAssignmentRecipientRole,
} from "@/lib/assignments/internal-assignment-service";
import { getDashboardContext } from "@/lib/auth/dashboard-context";
import { getDashboardHomePath } from "@/lib/auth/dashboard-redirects";
import { requireActiveSubscriptionForCurrentUser } from "@/lib/subscription/subscription-guard";
import { listAccountabilityInboxRequests } from "@/lib/accountability/accountability-inbox-service";

export async function InternalAssignmentsPage({
  role,
  eyebrow,
}: {
  role: InternalAssignmentRecipientRole;
  eyebrow: string;
}) {
  await requireActiveSubscriptionForCurrentUser();
  const context = await getDashboardContext();
  if (!context) redirect("/login");
  if (context.user.role !== role) redirect(getDashboardHomePath(context.user.role));
  if (!context.schoolAccountId) redirect("/dashboard/onboarding?required=true");

  const assignments = await listInternalAssignmentsForAssignee({
    ...context,
    schoolAccountId: context.schoolAccountId,
  });
  const accountabilityRequests = await listAccountabilityInboxRequests({
    user: { id: context.user.id },
    schoolAccountId: context.schoolAccountId,
  });

  return (
    <>
      <InternalAssignmentsClient
        eyebrow={eyebrow}
        assignments={assignments.map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        note: assignment.note,
        status: assignment.status,
        dueDate: assignment.dueDate?.toISOString() || null,
        createdAt: assignment.createdAt.toISOString(),
        openedAt: assignment.openedAt?.toISOString() || null,
        submittedAt: assignment.submittedAt?.toISOString() || null,
        creatorName: assignment.createdBy.officialName || assignment.createdBy.name,
        originServiceName: assignment.originService.name,
        returnedReportTitle:
          assignment.guidanceReport?.title ||
          assignment.reportSnapshot?.reportTitle ||
          assignment.reportTitleSnapshot ||
          null,
        }))}
        accountabilityRequests={accountabilityRequests.map((request) => ({
          title: request.title,
          status: request.status,
          token: request.token,
          sentAt: request.sentAt?.toISOString() || "",
          respondedAt: request.respondedAt?.toISOString() || null,
          returnedReason: request.returnedReason,
          creatorName: request.createdBy.officialName || request.createdBy.name,
        }))}
      />
    </>
  );
}
