import { notFound, redirect } from "next/navigation";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";
import { getDistribution } from "@/lib/curriculum-distribution/queries";
import { CurriculumDistributionPrintController } from "@/components/curriculum-distribution/curriculum-distribution-print-controller";
import { CurriculumDistributionPrintDocument } from "@/components/curriculum-distribution/curriculum-distribution-print-document";
import { resolveEffectivePrincipalSignature } from "@/lib/report-signatures/effective-principal-signature";

type PrintSearchParams = Record<string, string | string[] | undefined>;

export const dynamic = "force-dynamic";

const printStyles = `
@page { size: 297mm 210mm; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #e8eef0; }
body { color: #17242b; font-family: Tahoma, Arial, sans-serif; }
.curriculum-print-root { direction: rtl; width: 100%; }
.curriculum-print-paper { position: relative; display: block; min-height: 210mm; width: 297mm; max-width: 100%; margin: 0 auto; background: #fff; }
.curriculum-print-top-line { height: .9mm; background: linear-gradient(to left, #35bc70, #25ada4, #188dc4); }
.curriculum-print-header { display: flex; align-items: center; justify-content: space-between; gap: 6mm; min-height: 22mm; padding: 2mm 7mm 2.5mm; color: #fff; background: #073f4c; border-radius: 0 0 5mm 5mm; }
.curriculum-print-identity { display: flex; align-items: center; gap: 3.5mm; min-width: 0; font-size: 8pt; font-weight: 800; line-height: 1.35; }
.curriculum-print-identity img { width: 17mm; height: 15mm; object-fit: contain; filter: brightness(0) invert(1); }
.curriculum-print-identity-divider { width: .55mm; height: 14mm; flex: 0 0 auto; background: #16ad78; }
.curriculum-print-identity p { margin: 0; white-space: nowrap; }
.curriculum-print-title-block { flex: 0 0 auto; text-align: left; }
.curriculum-print-title-block p { margin: 0 0 .5mm; color: #8fe0c0; font-size: 7pt; font-weight: 800; }
.curriculum-print-title-block h1 { margin: 0; font-size: 18pt; line-height: 1.1; }
.curriculum-print-title-block span { display: block; margin-top: .5mm; color: rgba(255,255,255,.72); font-size: 6pt; letter-spacing: .06em; }
.curriculum-print-summary-strip { display: flex; align-items: stretch; justify-content: flex-start; gap: 0; margin: 1.5mm 0 1.2mm; overflow: hidden; border: 1px solid #4b5635; border-radius: 2mm; color: #fff; background: #59643d; direction: rtl; }
.curriculum-print-summary-segment { min-width: 0; flex: 1 1 0; padding: .8mm 2mm; border-left: 1px solid rgba(255,255,255,.22); }
.curriculum-print-summary-segment:last-child { border-left: 0; }
.curriculum-print-summary-segment span, .curriculum-print-summary-segment strong { display: block; overflow-wrap: anywhere; }
.curriculum-print-summary-segment span { color: rgba(255,255,255,.68); font-size: 6.2pt; font-weight: 700; }
.curriculum-print-summary-segment strong { margin-top: .25mm; color: #fff; font-size: 7.5pt; font-weight: 900; }
.curriculum-print-body { display: block; min-width: 0; min-height: 0; padding-bottom: 16mm; }
.curriculum-print-table { height: auto; width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: .6mm; color: #17242b; font-size: 7.3pt; }
.curriculum-print-table tbody tr { break-inside: auto; page-break-inside: auto; }
.curriculum-print-table td { width: 20%; padding: 0; vertical-align: top; border: 1px solid #b7dce5; border-radius: 1.8mm; background: #fff; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
.curriculum-print-week-cell { min-height: 19mm; break-inside: avoid; page-break-inside: avoid; }
.curriculum-print-week-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 1mm; padding: .8mm 1.8mm; color: #fff; background: #1687b8; border-radius: 1.3mm 1.3mm 0 0; }
.curriculum-print-week-heading strong { font-size: 8pt; }
.curriculum-print-week-heading span { color: #e6f7f8; font-size: 6.3pt; font-weight: 700; white-space: nowrap; }
.curriculum-print-week-dates { display: grid; gap: 0; padding: .45mm 1.8mm 0; color: #61747b; font-size: 5.8pt; font-weight: 700; line-height: 1.25; }
.curriculum-print-week-dates b { display: inline-block; direction: ltr; text-align: left; color: #405b63; font-weight: 900; unicode-bidi: isolate; white-space: nowrap; }
.curriculum-print-calendar-note { margin: .8mm 1.8mm; padding: .5mm 1.2mm; border: 1px solid #d7e2e5; border-radius: 1.2mm; color: #526168; background: #f1f3f4; font-size: 6.8pt; font-weight: 800; line-height: 1.25; }
.curriculum-print-week-cell--break .curriculum-print-week-heading { background: #7d7448; }
.curriculum-print-week-cell--break .curriculum-print-calendar-note { color: #795b20; background: #fff7e6; border-color: #f0d7a1; }
.curriculum-print-unit { padding: .75mm 1.8mm 0; }
.curriculum-print-unit h3 { margin: 0; padding-right: 1.2mm; color: #0b718f; border-right: .55mm solid #27ae73; font-size: 7.7pt; line-height: 1.3; }
.curriculum-print-unit ul { margin: .2mm 0 0; padding: 0 2.8mm 0 0; list-style: none; }
.curriculum-print-unit li { position: relative; margin: .2mm 0; padding-right: 2mm; font-size: 7.8pt; line-height: 1.3; overflow-wrap: anywhere; }
.curriculum-print-unit li::before { content: "•"; position: absolute; right: 0; color: #1687b8; font-weight: 900; }
.curriculum-print-special-items { display: flex; flex-wrap: wrap; gap: .35mm; padding: .5mm 1.8mm .6mm; }
.curriculum-print-special-item { display: inline-block; padding: .35mm 1mm; border: 1px solid #d7e2e5; border-radius: 999px; color: #405b63; background: #f7fbfc; font-size: 6.3pt; font-weight: 800; }
.curriculum-print-special-item--preparation { color: #0b718f; background: #eaf5f8; border-color: #b7dce5; }
.curriculum-print-special-item--review { color: #526168; background: #f1f3f4; }
.curriculum-print-special-item--exam { color: #276749; background: #edf7ef; border-color: #c4e3cb; }
.curriculum-print-special-item--holiday { color: #8a5a16; background: #fff7e6; border-color: #f0d7a1; }
.curriculum-print-empty-week { margin: 0; padding: 1mm 1.8mm; color: #66777d; font-size: 6.8pt; font-weight: 700; }
.curriculum-print-empty-cell { border: 0 !important; background: transparent !important; }
.curriculum-print-footer { position: absolute; inset-inline: 0; bottom: 0; padding-top: 1.5mm; break-inside: avoid; page-break-inside: avoid; }
.curriculum-print-signature-row { display: grid; width: 150mm; max-width: 100%; margin-inline: auto; grid-template-columns: 1fr 1fr; align-items: end; gap: 12mm; padding: 0 1mm 3.5mm; }
.curriculum-print-signature { display: grid; gap: .3mm; color: #174b5a; font-size: 7pt; }
.curriculum-print-signature strong { color: #0b718f; font-size: 7.5pt; }
.curriculum-print-signature span { min-height: 3.5mm; font-weight: 800; }
.curriculum-print-signature-image { display: block; width: auto; max-width: 64mm; height: 16mm; max-height: 16mm; object-fit: contain; object-position: center; }
.curriculum-print-signature small { color: #526168; font-size: 6.3pt; }
.curriculum-print-footer-line { height: 1.7mm; width: 100%; background: linear-gradient(to left, #35bc70, #25ada4, #188dc4); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
@media screen { body { padding: 12px; } .curriculum-print-paper { box-shadow: 0 14px 35px rgba(7,63,76,.15); } }
@media print {
  html, body { background: #fff !important; }
  body { padding: 0 !important; }
  .curriculum-print-paper { display: block; width: 297mm; height: 210mm; min-height: 210mm; max-height: 210mm; max-width: none; overflow: hidden; box-shadow: none; page-break-after: avoid; break-after: avoid; }
  .curriculum-print-header { min-height: 22mm; padding-top: 2mm; padding-bottom: 2.5mm; }
  .curriculum-print-summary-strip { margin-top: 1.5mm; margin-bottom: 1.2mm; }
  .curriculum-print-summary-segment { padding-top: .8mm; padding-bottom: .8mm; }
  .curriculum-print-body { display: block; min-height: 0; padding-bottom: 16mm; }
  .curriculum-print-table { height: auto; border-spacing: .6mm; }
  .curriculum-print-table tbody tr { break-inside: auto; page-break-inside: auto; }
  .curriculum-print-table td,
  .curriculum-print-week-cell { break-inside: avoid; page-break-inside: avoid; }
  .curriculum-print-week-heading { padding-top: .8mm; padding-bottom: .8mm; }
  .curriculum-print-week-dates { gap: 0; padding-top: .45mm; }
  .curriculum-print-calendar-note { margin-top: .8mm; margin-bottom: .8mm; padding-top: .5mm; padding-bottom: .5mm; }
  .curriculum-print-unit { padding-top: .75mm; }
  .curriculum-print-unit ul { margin-top: .2mm; }
  .curriculum-print-unit li { margin-top: .2mm; margin-bottom: .2mm; }
  .curriculum-print-special-items { gap: .35mm; padding-top: .5mm; padding-bottom: .6mm; }
  .curriculum-print-empty-week { padding-top: 1mm; padding-bottom: 1mm; }
  .curriculum-print-empty-cell { height: 0; padding: 0 !important; }
  .curriculum-print-footer { padding-top: 1.5mm; }
  .curriculum-print-signature-row { width: 150mm; max-width: 100%; margin-inline: auto; grid-template-columns: 1fr 1fr; gap: 12mm; padding-bottom: 3.5mm; }
}
`;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function CurriculumDistributionStandalonePrintPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query: PrintSearchParams = await (searchParams ?? Promise.resolve({} as PrintSearchParams));
  const publicMode = firstValue(query.public) === "1";
  const current = publicMode
    ? null
    : await requireServiceAccessForCurrentUser("curriculum-distribution");
  if (current && current.user.role !== "TEACHER" && current.user.role !== "ADMIN") redirect("/dashboard");

  const subjectId = firstValue(query.subjectId);
  const semesterId = firstValue(query.semesterId);
  const distribution = subjectId && semesterId ? await getDistribution(subjectId, semesterId) : null;
  if (!distribution) notFound();

  const profile = current?.user.schoolAccount?.profile;
  const schoolName = profile?.schoolName || current?.user.schoolAccount?.name || "";
  const principalSignature = current?.user.schoolAccountId && current.user
    ? await resolveEffectivePrincipalSignature({
        schoolAccountId: current.user.schoolAccountId,
        owner: { id: current.user.id, role: current.user.role, schoolAccountId: current.user.schoolAccountId },
      })
    : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <CurriculumDistributionPrintDocument
        distribution={distribution}
        schoolName={schoolName}
        educationDepartment={profile?.educationDepartment}
        educationOffice={profile?.educationOffice}
        academicYear={profile?.academicYear}
        logoUrl={profile?.logoUrl}
        teacherName={current?.user.officialName || current?.user.name || ""}
        teacherSignatureUrl={current?.user.signatureUrl}
        principalName={profile?.principalName}
        principalSignatureUrl={principalSignature?.signatureUrl || null}
      />
      <CurriculumDistributionPrintController enabled={firstValue(query.print) === "1"} />
    </>
  );
}
