import { notFound } from "next/navigation";
import { AccountabilityRespondentForm } from "@/components/accountability/accountability-respondent-form";
import { AccountabilityStatusBadge } from "@/components/accountability/accountability-status-badge";
import { getAccountabilityRespondentView } from "@/lib/accountability/accountability-request-service";

export const dynamic = "force-dynamic";

const terminalMessages: Record<string, string> = {
  RESPONDED: "تم إرسال الإفادة بنجاح وهي بانتظار مراجعة الإدارة.",
  CLOSED: "تم إغلاق المتابعة.",
  REFERRED: "تمت إحالة المتابعة للمراجعة المناسبة.",
  EXPIRED: "انتهت صلاحية رابط الإفادة.",
  CANCELED: "تم إلغاء هذه المتابعة.",
};

export default async function AccountabilityRespondPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await getAccountabilityRespondentView(token);
  if (!view) notFound();
  const message = view.expired ? terminalMessages.EXPIRED : terminalMessages[view.request.status];
  const isEditable = Boolean(view.workflow && view.respondentStep && ["SENT", "OPENED", "NEEDS_COMPLETION"].includes(view.request.status));
  const evidenceItems = Array.isArray(view.request.evidenceItems) ? view.request.evidenceItems.filter((item): item is { fileName: string; fileUrl: string; mimeType: string; size: number } => Boolean(item && typeof item === "object" && typeof (item as any).fileName === "string" && typeof (item as any).fileUrl === "string")) : [];

  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6"><div className="mx-auto max-w-4xl space-y-5"><section className="rounded-[2rem] bg-gradient-to-br from-indigo-950 via-indigo-800 to-sky-600 p-6 text-white shadow-xl sm:p-8"><p className="text-xs font-black text-indigo-100">متابعة المعلمين</p><h1 className="mt-3 text-3xl font-black">{view.request.title}</h1><div className="mt-4 flex flex-wrap items-center gap-3"><AccountabilityStatusBadge status={view.request.status} /><span className="text-sm font-bold text-indigo-100">المستجيب: {view.request.respondentName}</span></div></section><section className="rounded-[2rem] border border-indigo-100 bg-white p-6 shadow-sm"><p className="text-xs font-black text-indigo-700">نص الإفادة الرسمي</p><p className="mt-3 whitespace-pre-wrap text-sm font-bold leading-8 text-slate-700">{view.request.officialTextSnapshot}</p></section>{view.request.status === "NEEDS_COMPLETION" ? <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-900"><h2 className="font-black">مطلوب استكمال الإفادة</h2><p className="mt-2">{view.request.returnedReason || "يرجى مراجعة الإفادة واستكمال البيانات المطلوبة."}</p></section> : null}{message ? <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center"><p className="text-lg font-black text-slate-900">{message}</p></section> : null}{isEditable && view.workflow && view.respondentStep ? <AccountabilityRespondentForm token={token} workflow={view.workflow} respondentStep={view.respondentStep} dependencyValues={view.dependencyValues} initialValues={view.request.respondentValues && typeof view.request.respondentValues === "object" ? view.request.respondentValues as Record<string, unknown> : {}} initialEvidenceItems={evidenceItems} /> : null}</div></main>;
}
