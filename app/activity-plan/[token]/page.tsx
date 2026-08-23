import { notFound } from "next/navigation";
import { ActivityPlanPublicViewer } from "@/components/activity-plan/activity-plan-public-viewer";
import { getActivityPlanPrintData } from "@/lib/activity-plan/activity-plan-print-data";
import { getPublicActivityPlanShare } from "@/lib/activity-plan/activity-plan-share-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PublicActivityPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await getPublicActivityPlanShare(token);
  if (!share) notFound();

  const account = await prisma.schoolAccount.findUnique({
    where: { id: share.schoolAccountId },
    select: { name: true, profile: { select: { schoolName: true, academicYear: true, educationDepartment: true } } },
  });
  if (!account) notFound();
  const weeks = await getActivityPlanPrintData(share.schoolAccountId);

  return <><style>{`.activity-plan-public-viewer{max-width:1200px;margin:0 auto;padding:24px;background:#f4f7f6;color:#20342d;font-family:Tahoma,Arial,sans-serif}.activity-plan-public-cover,.activity-plan-public-week{margin:0 auto 18px;padding:24px;background:#fff;border:1px solid #d5e2d8;box-shadow:0 8px 24px rgba(32,52,45,.08)}.activity-plan-public-cover{text-align:center}.activity-plan-public-cover p,.activity-plan-public-cover span,.activity-plan-public-cover small{display:block;margin:6px 0;color:#5b7659}.activity-plan-public-cover h1{margin:8px 0;font-size:28px}.activity-plan-public-week{break-inside:avoid}.activity-plan-public-week-heading{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:12px;padding:10px 14px;background:#5b7659;color:#fff}.activity-plan-public-week-heading h2{margin:0;font-size:18px}.activity-plan-public-week-heading span{font-size:12px;direction:ltr}.activity-plan-public-week table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:13px}.activity-plan-public-week th,.activity-plan-public-week td{padding:8px;border:1px solid #cbd9d0;text-align:right;overflow-wrap:anywhere}.activity-plan-public-week th{background:#e7f1ea;font-weight:900}.activity-plan-public-empty{color:#718078;font-weight:700}@media(max-width:640px){.activity-plan-public-viewer{padding:10px}.activity-plan-public-cover,.activity-plan-public-week{padding:12px}.activity-plan-public-week table{font-size:11px}.activity-plan-public-week th,.activity-plan-public-week td{padding:5px}}@media print{.activity-plan-public-viewer{padding:0;background:#fff}.activity-plan-public-cover,.activity-plan-public-week{box-shadow:none;margin-bottom:10mm;page-break-inside:avoid}.activity-plan-public-week-heading{print-color-adjust:exact;-webkit-print-color-adjust:exact}}`}</style><ActivityPlanPublicViewer weeks={weeks} schoolName={account.profile?.schoolName || account.name} academicYear={account.profile?.academicYear} educationDepartment={account.profile?.educationDepartment} /></>;
}
