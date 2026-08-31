import Link from "next/link";
import { Plus, ClipboardCheck } from "lucide-react";
import { ACCOUNTABILITY_SERVICE } from "@/lib/accountability/accountability-types";
import { listAccountabilityDrafts } from "@/lib/accountability/accountability-request-service";
import { requirePrincipalServicePageAccess } from "@/lib/principal/performance-service";
import { AccountabilityStatusBadge } from "@/components/accountability/accountability-status-badge";
import { AccountabilitySendControls } from "@/components/accountability/accountability-send-controls";

export const dynamic = "force-dynamic";

export default async function PrincipalAccountabilityPage() {
  const access = await requirePrincipalServicePageAccess({ serviceSlug: ACCOUNTABILITY_SERVICE.slug });
  const requests = await listAccountabilityDrafts({ user: access.user, schoolAccountId: access.schoolAccountId as string });
  return <main dir="rtl" className="space-y-7">
    <section className="rounded-[2.5rem] bg-gradient-to-br from-indigo-950 via-indigo-800 to-sky-600 p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black text-indigo-100">الأدوات الإضافية</p><h1 className="mt-3 text-3xl font-black">متابعة المعلمين</h1><p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-indigo-50/90">إنشاء ومتابعة الإفادات والمساءلات الإدارية للمعلمين والموظفين.</p></div><Link href={`${ACCOUNTABILITY_SERVICE.href}/new`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-black text-indigo-900"><Plus className="h-4 w-4" /> إنشاء متابعة جديدة</Link></div></section>
    <section className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-950"><div className="mb-5 flex items-center gap-3"><ClipboardCheck className="h-6 w-6 text-indigo-600" /><div><p className="text-xs font-black text-indigo-700">سجل المتابعات</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">المتابعات المحفوظة</h2></div></div>{requests.length ? <div className="grid gap-4 lg:grid-cols-2">{requests.map((request) => <article key={request.id} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><AccountabilityStatusBadge status={request.status} /><span className="text-xs font-bold text-slate-400">{request.respondentName}</span></div><h3 className="mt-3 text-lg font-black text-slate-950 dark:text-white">{request.title}</h3><p className="mt-2 text-xs font-bold text-slate-500">{request.categoryKey} · {request.typeKey}</p>{request.status === "DRAFT" ? <AccountabilitySendControls requestId={request.id} respondentUserId={request.respondentUserId} respondentPhone={request.respondentPhone} /> : null}</article>)}</div> : <div className="rounded-[1.75rem] border border-dashed border-slate-300 p-10 text-center"><h3 className="text-lg font-black text-slate-900 dark:text-white">لا توجد متابعات محفوظة</h3><p className="mt-2 text-sm font-bold text-slate-500">ابدأ بإنشاء متابعة جديدة للمعلمين والموظفين.</p></div>}</section>
  </main>;
}
