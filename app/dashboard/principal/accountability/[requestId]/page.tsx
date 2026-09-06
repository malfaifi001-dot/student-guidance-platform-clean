import Link from "next/link";
import { ACCOUNTABILITY_SERVICE } from "@/lib/accountability/accountability-types";
import { getAccountabilityReviewView } from "@/lib/accountability/accountability-request-service";
import { requirePrincipalServicePageAccess } from "@/lib/principal/performance-service";
import { AccountabilityStatusBadge } from "@/components/accountability/accountability-status-badge";
import { AccountabilityReviewForm } from "@/components/accountability/accountability-review-form";
import { AccountabilityA4Card } from "@/components/accountability/accountability-a4-card";

export const dynamic = "force-dynamic";
function valuesOf(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function attachments(value: unknown) { return Array.isArray(value) ? value.filter((item): item is { fileName: string; fileUrl: string } => Boolean(item && typeof item === "object" && typeof (item as any).fileName === "string" && typeof (item as any).fileUrl === "string")) : []; }

export default async function PrincipalAccountabilityReviewPage({ params }: { params: Promise<{ requestId: string }> }) {
  const access = await requirePrincipalServicePageAccess({ serviceSlug: ACCOUNTABILITY_SERVICE.slug });
  const { requestId } = await params;
  const view = await getAccountabilityReviewView({ user: access.user, schoolAccountId: access.schoolAccountId as string }, requestId);
  const managerValues = valuesOf(view.managerValues); const respondentValues = valuesOf(view.respondentValues); const reviewValues = valuesOf(view.reviewValues); const files = attachments(view.request.evidenceItems);
  return <main dir="rtl" className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black text-indigo-700">متابعة المعلمين</p><h1 className="mt-2 text-3xl font-black">مراجعة المساءلة</h1></div><div className="flex items-center gap-3"><AccountabilityStatusBadge status={view.request.status} /><Link href={ACCOUNTABILITY_SERVICE.href} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black">العودة للقائمة</Link></div></div><AccountabilityA4Card mode="REVIEW" schoolName={view.request.schoolAccount?.profile?.schoolName || view.request.schoolAccount?.name} title={view.request.title} typeLabel={view.request.typeKey} respondentName={view.request.respondentName} officialText={view.request.officialTextSnapshot} managerStep={view.managerStep} managerValues={managerValues} respondentStep={view.respondentStep} respondentValues={respondentValues} reviewStep={view.reviewStep} reviewValues={reviewValues} status={view.request.status} respondedAt={view.request.respondedAt} attachments={files} />{view.request.status === "RESPONDED" && view.reviewStep ? <AccountabilityReviewForm requestId={requestId} workflow={view.workflow} reviewStep={view.reviewStep} managerValues={managerValues} respondentValues={respondentValues} initialValues={reviewValues} /> : <section className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">هذه المساءلة غير متاحة لمراجعة جديدة.</section>}</main>;
}
