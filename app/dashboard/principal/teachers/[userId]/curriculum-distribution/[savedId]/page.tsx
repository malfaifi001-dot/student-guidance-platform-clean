import { notFound, redirect } from "next/navigation";
import { getDistribution } from "@/lib/curriculum-distribution/queries";
import { prisma } from "@/lib/prisma";
import { requirePrincipalPage } from "@/lib/principal/principal-page-guard";
import { CurriculumDistributionPrintDocument } from "@/components/curriculum-distribution/curriculum-distribution-print-document";
import { CurriculumDistributionPrintController } from "@/components/curriculum-distribution/curriculum-distribution-print-controller";
import { resolveEffectivePrincipalSignature } from "@/lib/report-signatures/effective-principal-signature";

export const dynamic = "force-dynamic";

export default async function PrincipalCurriculumDistributionPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string; savedId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePrincipalPage();
  const schoolAccountId = context.schoolAccountId;
  if (!schoolAccountId) notFound();
  const { userId, savedId } = await params;
  const staff = await prisma.user.findFirst({ where: { id: userId, schoolAccountId, role: "TEACHER" }, select: { id: true, officialName: true, name: true, signatureUrl: true } });
  if (!staff) notFound();
  const saved = await prisma.teacherSavedCurriculum.findFirst({ where: { id: savedId, ownerUserId: staff.id, schoolAccountId }, select: { subjectId: true, semesterId: true } });
  if (!saved) notFound();
  const distribution = await getDistribution(saved.subjectId, saved.semesterId);
  if (!distribution) notFound();
  const [profile, principalSignature] = await Promise.all([
    prisma.schoolProfile.findUnique({ where: { schoolAccountId }, select: { schoolName: true, educationDepartment: true, educationOffice: true, academicYear: true, logoUrl: true, principalName: true } }),
    resolveEffectivePrincipalSignature({ schoolAccountId, owner: { id: context.user.id, role: context.user.role, schoolAccountId } }),
  ]);
  const query: Record<string, string | string[] | undefined> = await (searchParams || Promise.resolve({}));
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || "" : value || "";
  return <><style>{`@page{size:297mm 210mm;margin:0}html,body{margin:0;padding:0;background:#fff}`}</style><CurriculumDistributionPrintDocument distribution={distribution} schoolName={profile?.schoolName || ""} educationDepartment={profile?.educationDepartment} educationOffice={profile?.educationOffice} academicYear={profile?.academicYear} logoUrl={profile?.logoUrl} teacherName={staff.officialName || staff.name || ""} teacherSignatureUrl={staff.signatureUrl} principalName={profile?.principalName} principalSignatureUrl={principalSignature?.signatureUrl || null} /><CurriculumDistributionPrintController enabled={first(query.print) === "1"} /></>;
}
