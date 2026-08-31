import { notFound } from "next/navigation";

import { ActivityPlanPrintDocument } from "@/components/activity-plan/activity-plan-print-document";
import { WeeklyActivityPlanPrintDocument } from "@/components/activity-plan/weekly-activity-plan-print-document";
import { ActivityPlanTenPercentPrintDocument } from "@/components/activity-plan/activity-plan-ten-percent-print-document";
import { curriculumDocumentIdentityStyles } from "@/components/curriculum-distribution/curriculum-document-identity";
import { getActivityPlanPrintData } from "@/lib/activity-plan/activity-plan-print-data";
import { getWeeklyActivityPlans } from "@/lib/activity-plan/weekly-activity-plan-service";
import { getActivityPlanTenPercentRows } from "@/lib/activity-plan/ten-percent-activity-plan-service";
import { normalizeActivityPlanStage, REAL_ACTIVITY_PLAN_STAGES } from "@/lib/activity-plan/activity-plan-stages";
import { requirePrincipalPage } from "@/lib/principal/principal-page-guard";
import { prisma } from "@/lib/prisma";
import { resolveEffectivePrincipalSignature } from "@/lib/report-signatures/effective-principal-signature";

export const dynamic = "force-dynamic";

export default async function PrincipalStaffCurriculumPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string; stage: string }>;
  searchParams: Promise<{ mode?: string | string[]; print?: string | string[] }>;
}) {
  const principal = await requirePrincipalPage();
  if (!principal.schoolAccountId) notFound();

  const [{ userId, stage: encodedStage }, query] = await Promise.all([params, searchParams]);
  const staff = await prisma.user.findFirst({
    where: { id: userId, schoolAccountId: principal.schoolAccountId, role: { in: ["TEACHER", "COUNSELOR", "ACTIVITY_LEADER"] } },
    select: { id: true, name: true, officialName: true, role: true, signatureUrl: true },
  });
  const stage = normalizeActivityPlanStage(decodeURIComponent(encodedStage));
  if (!staff || !stage || !REAL_ACTIVITY_PLAN_STAGES.includes(stage)) notFound();

  const mode = Array.isArray(query.mode) ? query.mode[0] : query.mode;
  const tenPercentMode = mode === "ten-percent";
  const [profile, weeks, semesterWeeks, tenPercentRows, principalSignature] = await Promise.all([
    prisma.schoolProfile.findUnique({ where: { schoolAccountId: principal.schoolAccountId }, select: { schoolName: true, educationDepartment: true, academicYear: true, logoUrl: true, principalName: true } }),
    getActivityPlanPrintData(principal.schoolAccountId, stage, undefined, staff.id),
    getWeeklyActivityPlans(principal.schoolAccountId, stage, staff.id),
    getActivityPlanTenPercentRows(principal.schoolAccountId, stage, staff.id),
    resolveEffectivePrincipalSignature({ schoolAccountId: principal.schoolAccountId, owner: { id: principal.user.id, role: principal.user.role, schoolAccountId: principal.schoolAccountId } }),
  ]);
  const identity = {
    stage,
    academicYear: profile?.academicYear || null,
    schoolName: profile?.schoolName || "",
    educationDepartment: profile?.educationDepartment || null,
    logoUrl: profile?.logoUrl || null,
    activityLeaderName: staff.officialName || staff.name,
    activityLeaderSignatureUrl: staff.signatureUrl || null,
    principalName: profile?.principalName || null,
    principalSignatureUrl: principalSignature.signatureUrl,
  };

  return (
    <main dir="rtl" className="min-w-0 max-w-full overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `${curriculumDocumentIdentityStyles}\n@page { size: A4 landscape; margin: 0; } @media print { .print-only-header { display: none !important; } }` }} />
      <header className="print-only-header mx-auto w-full max-w-[1200px] px-4 py-5 print:hidden">
        <h1 className="text-xl font-black text-slate-950 dark:text-white">توزيع المنهج — {stage}</h1>
        <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{staff.officialName || staff.name}</p>
      </header>
      {tenPercentMode ? <ActivityPlanTenPercentPrintDocument rows={tenPercentRows} {...identity} /> : mode === "weekly" ? <WeeklyActivityPlanPrintDocument weeks={semesterWeeks} {...identity} /> : <ActivityPlanPrintDocument weeks={weeks} {...identity} />}
    </main>
  );
}
