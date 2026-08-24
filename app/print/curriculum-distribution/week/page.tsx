import { notFound, redirect } from "next/navigation";
import { getDistribution } from "@/lib/curriculum-distribution/queries";
import { listTeacherSavedCurriculum } from "@/lib/curriculum-distribution/my-curriculum";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";
import { CurriculumWeeklyShareDocument } from "@/components/curriculum-distribution/curriculum-weekly-share-document";
import { CurriculumDistributionPrintController } from "@/components/curriculum-distribution/curriculum-distribution-print-controller";

export const dynamic = "force-dynamic";

const printStyles = `
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #eef3f5; color: #17313a; font-family: Tahoma, Arial, sans-serif; }
.weekly-share-root { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 13mm 14mm; background: #fff; }
.weekly-share-header { padding: 7mm 8mm; color: #fff; background: linear-gradient(135deg, #0b4f61, #147d83); border-radius: 5mm; }
.weekly-share-header p, .weekly-share-header h1, .weekly-share-header span { margin: 0; }
.weekly-share-header p { color: #b9ead8; font-size: 9pt; font-weight: 800; }
.weekly-share-header h1 { margin-top: 1.5mm; font-size: 20pt; line-height: 1.15; }
.weekly-share-header span { display: block; margin-top: 2mm; color: rgba(255,255,255,.78); font-size: 8pt; font-weight: 700; }
.weekly-share-body { display: grid; gap: 5mm; margin-top: 6mm; }
.weekly-share-section { break-inside: avoid; page-break-inside: avoid; border: .3mm solid #b9d3d7; border-radius: 3mm; overflow: hidden; }
.weekly-share-section h2 { margin: 0; padding: 3mm 4mm; color: #fff; background: #197b82; font-size: 12pt; }
.weekly-share-meta { display: flex; flex-wrap: wrap; gap: 2mm 7mm; padding: 3mm 4mm 1mm; color: #49636a; font-size: 8pt; font-weight: 800; }
.weekly-share-week { display: flex; align-items: center; justify-content: space-between; gap: 4mm; margin: 0; padding: 2mm 4mm; color: #174f5b; background: #eff8f5; font-size: 8.5pt; }
.weekly-share-week strong { font-weight: 900; }
.weekly-share-week b { font-size: 8pt; }
.weekly-share-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8.2pt; }
.weekly-share-table th, .weekly-share-table td { padding: 2.2mm 3mm; border: .25mm solid #c7d8da; text-align: right; vertical-align: top; overflow-wrap: anywhere; }
.weekly-share-table th { color: #fff; background: #4c746e; font-weight: 900; }
.weekly-share-table td { font-weight: 700; }
.weekly-share-table th:first-child, .weekly-share-table td:first-child { width: 34%; }
.weekly-share-empty { margin: 0; padding: 4mm; color: #66777d; font-size: 9pt; font-weight: 800; }
@media screen { body { padding: 12px; } .weekly-share-root { min-height: 297mm; box-shadow: 0 14px 35px rgba(7,63,76,.15); } }
@media print { html, body { background: #fff; } body { padding: 0; } .weekly-share-root { width: 210mm; min-height: 297mm; margin: 0; box-shadow: none; } }
`;

type SearchParams = Record<string, string | string[] | undefined>;
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] || "" : value || ""; }

export default async function WeeklyCurriculumSharePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const current = await requireServiceAccessForCurrentUser("curriculum-distribution");
  if (current.user.role !== "TEACHER" && current.user.role !== "ADMIN") redirect("/dashboard");
  if (!current.user.schoolAccountId) redirect("/dashboard/onboarding?required=true");
  const params: SearchParams = await (searchParams || Promise.resolve({} as SearchParams));
  const all = first(params.all) === "1";
  const distributions = all
    ? (await listTeacherSavedCurriculum(current.user.id, current.user.schoolAccountId)).flatMap((item) => item.distribution ? [{ distribution: item.distribution }] : [])
    : (() => null)();
  let items = distributions;
  if (!all) {
    const subjectId = first(params.subjectId);
    const semesterId = first(params.semesterId);
    if (!subjectId || !semesterId) notFound();
    const distribution = await getDistribution(subjectId, semesterId);
    if (!distribution) notFound();
    items = [{ distribution }];
  }
  return <><style dangerouslySetInnerHTML={{ __html: printStyles }} /><CurriculumWeeklyShareDocument distributions={items || []} allSubjects={all} /><CurriculumDistributionPrintController enabled={first(params.print) === "1"} /></>;
}
