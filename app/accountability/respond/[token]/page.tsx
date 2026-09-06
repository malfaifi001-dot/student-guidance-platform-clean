import { notFound } from "next/navigation";
import { AccountabilityRespondentForm } from "@/components/accountability/accountability-respondent-form";
import { AccountabilityStatusBadge } from "@/components/accountability/accountability-status-badge";
import { AccountabilityA4Card } from "@/components/accountability/accountability-a4-card";
import { getAccountabilityRespondentView } from "@/lib/accountability/accountability-request-service";

export const dynamic = "force-dynamic";

export default async function AccountabilityRespondPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await getAccountabilityRespondentView(token);
  if (!view) notFound();
  const editable = Boolean(view.workflow && view.respondentStep && ["SENT", "OPENED", "NEEDS_COMPLETION"].includes(view.request.status));
  const values = view.request.managerValues && typeof view.request.managerValues === "object" ? view.request.managerValues as Record<string, unknown> : {};
  const responseValues = view.request.respondentValues && typeof view.request.respondentValues === "object" ? view.request.respondentValues as Record<string, unknown> : {};
  const evidenceItems = Array.isArray(view.request.evidenceItems) ? view.request.evidenceItems.filter((item): item is { fileName: string; fileUrl: string; mimeType: string; size: number } => Boolean(item && typeof item === "object" && typeof (item as any).fileName === "string" && typeof (item as any).fileUrl === "string")) : [];
  const steps = view.workflow?.steps.slice().sort((a, b) => a.order - b.order) || [];
  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6"><div className="mx-auto max-w-5xl space-y-5"><div className="flex items-center justify-between"><div><p className="text-xs font-black text-indigo-700">متابعة المعلمين</p><h1 className="mt-2 text-2xl font-black">هذه هي المساءلة المرسلة إليك</h1></div><AccountabilityStatusBadge status={view.request.status} /></div><AccountabilityA4Card mode="RESPONDENT" schoolName={view.request.schoolAccount?.profile?.schoolName || view.request.schoolAccount?.name} title={view.request.title} typeLabel={view.request.typeKey} respondentName={view.request.respondentName} officialText={view.request.officialTextSnapshot} managerStep={steps[0]} managerValues={values} respondentStep={view.respondentStep} respondentValues={responseValues} status={view.request.status} respondedAt={view.request.respondedAt} attachments={evidenceItems} /><section className="rounded-[2rem] border border-indigo-100 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">إفادتي / ردي</h2>{view.request.status === "NEEDS_COMPLETION" ? <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-900">{view.request.returnedReason || "يرجى استكمال الإفادة."}</p> : null}{editable && view.workflow && view.respondentStep ? <div className="mt-5"><AccountabilityRespondentForm token={token} workflow={view.workflow} respondentStep={view.respondentStep} dependencyValues={view.dependencyValues} initialValues={responseValues} initialEvidenceItems={evidenceItems} /></div> : null}</section></div></main>;
}
