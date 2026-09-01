import { redirect } from "next/navigation";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";
import { getActivityPlanPrintData } from "@/lib/activity-plan/activity-plan-print-data";
import { ActivityPlanPrintDocument } from "@/components/activity-plan/activity-plan-print-document";
import { WeeklyActivityPlanPrintDocument } from "@/components/activity-plan/weekly-activity-plan-print-document";
import { ActivityPlanTenPercentPrintDocument } from "@/components/activity-plan/activity-plan-ten-percent-print-document";
import { getWeeklyActivityPlans } from "@/lib/activity-plan/weekly-activity-plan-service";
import { getActivityPlanTenPercentRows } from "@/lib/activity-plan/ten-percent-activity-plan-service";
import { CurriculumDistributionPrintController } from "@/components/curriculum-distribution/curriculum-distribution-print-controller";
import { curriculumDocumentIdentityStyles } from "@/components/curriculum-distribution/curriculum-document-identity";
import { getActivityPlanStagesFromProfile, normalizeActivityPlanStage, REAL_ACTIVITY_PLAN_STAGES } from "@/lib/activity-plan/activity-plan-stages";
import { resolveEffectivePrincipalSignature } from "@/lib/report-signatures/effective-principal-signature";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const printStyles = `
${curriculumDocumentIdentityStyles}
@page { size: A4 landscape; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #e8eef0; }
body { color: #263238; font-family: Tahoma, Arial, sans-serif; }
.activity-plan-print-root { direction: rtl; width: 100%; }
.activity-plan-print-page { position: relative; display: block; width: 297mm; height: 210mm; min-height: 210mm; max-height: 210mm; margin: 0 auto; overflow: hidden; padding: 6mm 7mm 24mm; background: #fff; page-break-after: always; break-after: page; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.activity-plan-print-page:last-child { page-break-after: auto; break-after: auto; }
.activity-plan-print-objective { display: grid; grid-template-columns: 28mm 1fr; min-height: 9mm; margin-top: 2mm; border: 1px solid #aab9b4; background: #fff; }
.activity-plan-print-objective strong { display: flex; align-items: center; justify-content: center; color: #fff; background: #5b7659; font-size: 8pt; }
.activity-plan-print-objective span { display: block; }
.activity-plan-print-legend { display: grid; grid-template-columns: 27mm repeat(6, 1fr); min-height: 10mm; margin-top: 1.5mm; border: 1px solid #aab9b4; }
.activity-plan-print-legend > strong { display: flex; align-items: center; justify-content: center; color: #fff; background: #5b7659; font-size: 7pt; }
.activity-plan-print-legend-item { display: flex; align-items: center; justify-content: center; padding: 1mm; border-inline-start: 1px solid #aab9b4; font-size: 7pt; font-weight: 900; text-align: center; }
.activity-plan-print-week-strip { display: grid; grid-template-columns: 27mm 18mm 1fr; align-items: center; min-height: 10mm; margin-top: 1.5mm; border: 1px solid #aab9b4; background: #f3f5f3; }
.activity-plan-print-week-strip strong { display: flex; height: 100%; align-items: center; justify-content: center; color: #fff; background: #5b7659; font-size: 8pt; }
.activity-plan-print-week-strip b { display: flex; align-items: center; justify-content: center; color: #274b42; font-size: 15pt; }
.activity-plan-print-table-heading { margin: 2mm 0 0; padding: 1.5mm; color: #fff; background: #137b72; font-size: 9pt; font-weight: 900; text-align: center; }
.activity-plan-print-table { width: 100%; table-layout: fixed; border-collapse: collapse; color: #263238; font-size: 7.6pt; }
.activity-plan-print-table th, .activity-plan-print-table td { height: 6.4mm; padding: .55mm 1mm; border: .25mm solid #aeb9b6; overflow: hidden; line-height: 1.1; text-align: center; vertical-align: middle; overflow-wrap: anywhere; }
.activity-plan-print-table thead th { height: 8mm; color: #fff; background: #5b7659; font-size: 7.8pt; font-weight: 900; }
.activity-plan-print-table .activity-plan-print-day-head { width: 25mm; }
.activity-plan-print-table .activity-plan-print-label-head { width: 23mm; }
.activity-plan-print-day { width: 25mm; color: #244d40; background: #e2f0e5 !important; font-size: 8.6pt; font-weight: 900; }
.activity-plan-print-day span, .activity-plan-print-day small { display: block; }
.activity-plan-print-day small { margin-top: 1mm; direction: ltr; font-size: 7.6pt; font-weight: 900; }
.activity-plan-print-row-label { width: 23mm; color: #35524b; background: #f4f7f5; font-size: 7.6pt; font-weight: 900; }
.activity-plan-print-table td { background: #fff; font-weight: 700; }
.weekly-activity-plan-print-page { padding-bottom: 28mm; }
.weekly-activity-plan-print-meta { display: grid; grid-template-columns: 20mm 1fr 20mm 20mm 15mm 35mm 15mm 35mm; align-items: center; margin-top: 5mm; border: .25mm solid #aeb9b6; background: #f4f7f5; color: #274b42; font-size: 10pt; font-weight: 900; }
.weekly-activity-plan-print-meta > * { min-height: 10mm; padding: 2mm; border-inline-start: .25mm solid #aeb9b6; text-align: center; }
.weekly-activity-plan-print-meta strong { color: #fff; background: #5b7659; }
.weekly-activity-plan-print-table { width: 100%; margin-top: 5mm; table-layout: fixed; border-collapse: collapse; color: #263238; font-size: 9pt; }
.weekly-activity-plan-print-table th, .weekly-activity-plan-print-table td { padding: 2.5mm 2mm; border: .25mm solid #aeb9b6; text-align: center; vertical-align: middle; overflow-wrap: anywhere; }
.weekly-activity-plan-print-table th { color: #fff; background: #137b72; font-weight: 900; }
.weekly-activity-plan-print-table td { background: #fff; font-weight: 700; }
.activity-plan-program-cell { color: #fff !important; font-size: 7.9pt; font-weight: 900 !important; }
.activity-plan-print-table tbody tr:nth-child(3n) td, .activity-plan-print-table tbody tr:nth-child(3n) th { border-bottom-color: #6f8f86; }
.activity-plan-print-page .curriculum-print-footer { padding-top: 2mm; }
.activity-plan-print-page .curriculum-print-signature-row { width: 170mm; gap: 18mm; padding: 0 1mm 4.5mm; }
.activity-plan-print-page .curriculum-print-signature { justify-items: center; gap: .7mm; text-align: center; font-size: 8pt; }
.activity-plan-print-page .curriculum-print-signature strong { font-size: 9pt; }
.activity-plan-print-page .curriculum-print-signature span { min-height: 4mm; font-size: 8pt; }
.activity-plan-print-page .curriculum-print-signature small { font-size: 7pt; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
@media screen { body { padding: 12px; } .activity-plan-print-page { box-shadow: 0 14px 35px rgba(19,123,114,.15); } }
@media print { html, body { background: #fff !important; } body { padding: 0 !important; } .activity-plan-print-page { margin: 0; box-shadow: none; } .activity-plan-print-page .curriculum-print-signature-row { width: 170mm; gap: 18mm; padding-bottom: 4.5mm; } }
`;


/*
 * Keep physical Activity Plan pages identical between preview
 * and PDF/print output.
 *
 * This intentionally targets only --physical pages.
 * Weekly/10% flow layouts keep their existing behavior.
 */
const activityPlanPhysicalPrintFixStyles = `
@media print {
  .activity-plan-print-page.activity-plan-print-page--physical {
    display: flex !important;
    flex-direction: column !important;

    width: 297mm !important;
    min-width: 297mm !important;
    max-width: 297mm !important;

    height: 210mm !important;
    min-height: 210mm !important;
    max-height: 210mm !important;

    margin: 0 !important;

    overflow: hidden !important;

    break-inside: avoid-page !important;
    page-break-inside: avoid !important;

    break-after: page !important;
    page-break-after: always !important;

    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .activity-plan-print-page.activity-plan-print-page--physical:last-child {
    break-after: auto !important;
    page-break-after: auto !important;
  }

  .activity-plan-print-page.activity-plan-print-page--physical
    > .activity-plan-print-page-content {
    display: flex !important;
    flex-direction: column !important;

    min-height: 0 !important;
    height: auto !important;

    flex: 1 1 auto !important;
  }

  .activity-plan-print-page.activity-plan-print-page--physical
    > .activity-plan-print-footer-slot {
    flex: 0 0 auto !important;
    margin-top: auto !important;

    break-inside: avoid-page !important;
    page-break-inside: avoid !important;
  }
}
`;
export default async function ActivityPlanPrintPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const current = await requireServiceAccessForCurrentUser("student-activity-plan");
  if (!current.user.schoolAccountId) redirect("/dashboard/onboarding?required=true");

  const profile = current.user.schoolAccount?.profile;
  const params = await (searchParams || Promise.resolve({} as Record<string, string | string[] | undefined>));

  let ownerUserId: string | undefined;
  let activityLeaderName = "";
  let activityLeaderSignatureUrl: string | null = null;

  if (current.user.role === "PRINCIPAL") {
    const requestedUserId = typeof params.userId === "string" ? params.userId.trim() : "";
    if (!requestedUserId) redirect("/dashboard");

    const staff = await prisma.user.findFirst({
      where: {
        id: requestedUserId,
        schoolAccountId: current.user.schoolAccountId,
        role: "ACTIVITY_LEADER",
      },
      select: {
        id: true,
        officialName: true,
        name: true,
        signatureUrl: true,
      },
    });

    if (!staff) redirect("/dashboard");

    ownerUserId = staff.id;
    activityLeaderName = staff.officialName || staff.name || "";
    activityLeaderSignatureUrl = staff.signatureUrl || null;
  } else {
    if (current.user.role !== "ACTIVITY_LEADER") redirect("/dashboard");
    activityLeaderName = profile?.activityLeaderName || current.user.officialName || current.user.name || "";
    activityLeaderSignatureUrl = profile?.activityLeaderSignatureUrl || null;
  }

  const academicYear = current.user.schoolAccount?.profile?.academicYear || null;
  const printEnabled = String(params.print || "") === "1";
  const weeklyMode = String(params.mode || "") === "weekly";
  const tenPercentMode = String(params.mode || "") === "ten-percent";
  const requestedStage = typeof params.stage === "string" ? normalizeActivityPlanStage(params.stage) : null;
  const stage = requestedStage && REAL_ACTIVITY_PLAN_STAGES.includes(requestedStage)
    ? requestedStage
    : getActivityPlanStagesFromProfile(profile?.stage)[0] || REAL_ACTIVITY_PLAN_STAGES[0];
  const requestedWeeks = typeof params.weeks === "string"
    ? Array.from(new Set(params.weeks.split(",").map((value) => Number(value.trim())).filter((week) => Number.isInteger(week) && week >= 1 && week <= 20)))
    : [];

  const stageWeeks = tenPercentMode ? [] : await getActivityPlanPrintData(current.user.schoolAccountId, stage, requestedWeeks, ownerUserId);
  const weeklyPlans = weeklyMode
    ? (await getWeeklyActivityPlans(current.user.schoolAccountId, stage, ownerUserId)).filter((plan) => !requestedWeeks.length || requestedWeeks.includes(plan.weekNumber))
    : [];
  const tenPercentRows = tenPercentMode
    ? await getActivityPlanTenPercentRows(current.user.schoolAccountId, stage, ownerUserId || current.user.id)
    : [];
  const principalSignature = await resolveEffectivePrincipalSignature({
    schoolAccountId: current.user.schoolAccountId,
    owner: { id: current.user.id, role: current.user.role, schoolAccountId: current.user.schoolAccountId },
  });
  const identity = { stage, academicYear, schoolName: profile?.schoolName || current.user.schoolAccount?.name || "", educationDepartment: profile?.educationDepartment, logoUrl: profile?.logoUrl, activityLeaderName, activityLeaderSignatureUrl, principalName: profile?.principalName, principalSignatureUrl: principalSignature.signatureUrl };
  return <><style dangerouslySetInnerHTML={{ __html: printStyles }} />
<style dangerouslySetInnerHTML={{ __html: activityPlanPhysicalPrintFixStyles }} />{tenPercentMode ? <ActivityPlanTenPercentPrintDocument rows={tenPercentRows} {...identity} /> : weeklyMode ? <WeeklyActivityPlanPrintDocument weeks={weeklyPlans} {...identity} /> : <ActivityPlanPrintDocument weeks={stageWeeks} {...identity} />}<CurriculumDistributionPrintController enabled={printEnabled} /></>;
}
