import { redirect } from "next/navigation";
import { ReportTwoPrintDocument } from "@/components/report-2/report-two-print-document";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";
import { getSchoolActivityTeam } from "@/lib/activity-team/activity-team-service";
import { SCHOOL_ACTIVITY_TEAM_SERVICE } from "@/lib/activity-team/activity-team-config";
import { buildSchoolActivityTeamReportSnapshot } from "@/lib/activity-team/activity-team-report";
import { resolveEffectivePrincipalSignature } from "@/lib/report-signatures/effective-principal-signature";

export const dynamic = "force-dynamic";

export default async function ActivityTeamPrintPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const current = await requireServiceAccessForCurrentUser(SCHOOL_ACTIVITY_TEAM_SERVICE.slug);
  if (current.user.role !== "ACTIVITY_LEADER") redirect("/dashboard");
  if (!current.user.schoolAccountId) redirect("/dashboard/onboarding?required=true");
  const schoolAccount = current.user.schoolAccount;
  if (!schoolAccount) redirect("/dashboard/onboarding?required=true");

  const team = await getSchoolActivityTeam(current.user.schoolAccountId);
  const profile = schoolAccount.profile;
  const params = await (searchParams || Promise.resolve({} as Record<string, string | string[] | undefined>));
  const printEnabled = String(params.print || "") === "1";
  const principalSignature = await resolveEffectivePrincipalSignature({
    schoolAccountId: current.user.schoolAccountId,
    owner: { id: current.user.id, role: current.user.role, schoolAccountId: current.user.schoolAccountId },
  });
  const snapshot = buildSchoolActivityTeamReportSnapshot({
    assignments: team.assignments,
    gender: current.user.gender,
    schoolName: profile?.schoolName || schoolAccount.name,
    educationDepartment: profile?.educationDepartment,
    logoUrl: profile?.logoUrl,
    activityLeaderName: profile?.activityLeaderName || current.user.officialName || current.user.name,
    activityLeaderSignatureUrl: profile?.activityLeaderSignatureUrl || current.user.signatureUrl,
    principalName: profile?.principalName,
    principalSignatureUrl: principalSignature.signatureUrl,
    supervisorSignatures: team.signatures,
  });

  return <ReportTwoPrintDocument snapshot={snapshot} autoPrint={printEnabled} />;
}
