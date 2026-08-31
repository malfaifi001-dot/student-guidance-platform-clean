import Link from "next/link";
import { ACCOUNTABILITY_SERVICE } from "@/lib/accountability/accountability-types";
import { getAccountabilityReviewView } from "@/lib/accountability/accountability-request-service";
import { requirePrincipalServicePageAccess } from "@/lib/principal/performance-service";
import { AccountabilityStatusBadge } from "@/components/accountability/accountability-status-badge";
import { AccountabilityReviewForm } from "@/components/accountability/accountability-review-form";
import { isConditionalWorkflowFieldVisible } from "@/engine/runtime/workflow-conditional-logic";

export const dynamic = "force-dynamic";

function valuesOf(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function readable(step: { fields: Array<{ id: string; key: string; label: string; dependsOnFieldKey?: string | null; linkedToValue?: string | null }> } | null, values: Record<string, unknown>, allValues: Record<string, unknown>) {
  if (!step) return [];
  return step.fields.filter((field) => isConditionalWorkflowFieldVisible(field, allValues) && values[field.key] !== undefined && values[field.key] !== "").map((field) => ({ key: field.id, label: field.label, value: String(values[field.key]) }));
}
function attachments(value: unknown) { return Array.isArray(value) ? value.filter((item): item is { fileName: string; fileUrl: string } => Boolean(item && typeof item === "object" && typeof (item as { fileName?: unknown }).fileName === "string" && typeof (item as { fileUrl?: unknown }).fileUrl === "string")) : []; }

export default async function PrincipalAccountabilityReviewPage({ params }: { params: Promise<{ requestId: string }> }) {
  const access = await requirePrincipalServicePageAccess({ serviceSlug: ACCOUNTABILITY_SERVICE.slug });
  const { requestId } = await params;
  const view = await getAccountabilityReviewView({ user: access.user, schoolAccountId: access.schoolAccountId as string }, requestId);
  const managerValues = valuesOf(view.managerValues);
  const respondentValues = valuesOf(view.respondentValues);
  const reviewValues = valuesOf(view.reviewValues);
  const managerRows = readable(view.managerStep, managerValues, managerValues);
  const respondentRows = readable(view.respondentStep, respondentValues, { ...managerValues, ...respondentValues });
  const files = attachments(view.request.evidenceItems);
  const canReview = view.request.status === "RESPONDED" && Boolean(view.reviewStep);
  return <main dir="rtl" className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black text-indigo-700">متابعة المعلمين</p><h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">مراجعة المتابعة</h1></div><Link href={ACCOUNTABILITY_SERVICE.href} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black">العودة للقائمة</Link></div><section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">المتابعة الأصلية</h2><AccountabilityStatusBadge status={view.request.status} /></div><p className="mt-3 text-lg font-black">{view.request.title}</p><p className="mt-2 text-sm font-bold text-slate-500">المستجيب: {view.request.respondentName}</p><div className="mt-5 rounded-2xl bg-indigo-50 p-4 text-sm font-bold leading-8 text-slate-700"><p className="whitespace-pre-wrap">{view.request.officialTextSnapshot}</p></div>{managerRows.length ? <ValueList title="بيانات المتابعة" rows={managerRows} /> : null}</section><section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"><h2 className="text-xl font-black">إفادة المستجيب</h2>{respondentRows.length ? <ValueList title="الإجابات" rows={respondentRows} /> : <p className="mt-4 text-sm font-bold text-slate-500">لا توجد إجابات مسجلة.</p>}{files.length ? <div className="mt-5 space-y-2"><h3 className="font-black">المرفقات</h3>{files.map((file) => <a key={file.fileUrl} href={file.fileUrl} target="_blank" rel="noreferrer" className="block rounded-xl bg-slate-50 p-3 text-sm font-bold text-indigo-700">{file.fileName}</a>)}</div> : null}<p className="mt-5 text-xs font-bold text-slate-400">تاريخ الرد: {view.request.respondedAt?.toLocaleString("ar-SA") || "غير متوفر"}</p>{view.request.returnedReason ? <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">سبب الاستكمال السابق: {view.request.returnedReason}</p> : null}</section>{canReview ? <AccountabilityReviewForm requestId={requestId} workflow={view.workflow} reviewStep={view.reviewStep!} managerValues={managerValues} respondentValues={respondentValues} initialValues={reviewValues} /> : <section className="rounded-[2rem] border border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-500">هذه المتابعة غير متاحة لإجراء مراجعة جديد.</section>}</main>;
}

function ValueList({ title, rows }: { title: string; rows: Array<{ key: string; label: string; value: string }> }) { return <div className="mt-5"><h3 className="font-black">{title}</h3><div className="mt-3 grid gap-3 md:grid-cols-2">{rows.map((row) => <div key={row.key} className="rounded-xl bg-slate-50 p-3 text-sm font-bold dark:bg-slate-900"><span className="text-indigo-700">{row.label}: </span>{row.value}</div>)}</div></div>; }
