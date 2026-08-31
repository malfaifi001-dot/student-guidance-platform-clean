import Link from "next/link";

import { AccountabilityStatusBadge } from "@/components/accountability/accountability-status-badge";
import { listAccountabilityInboxRequests } from "@/lib/accountability/accountability-inbox-service";

const pendingStatuses = new Set(["SENT", "OPENED", "NEEDS_COMPLETION"]);

function formatDate(value: Date | null) {
  return value ? value.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" }) : "غير محدد";
}

export async function AccountabilityInboxSection({ context }: { context: { user: { id: string }; schoolAccountId: string } }) {
  const requests = await listAccountabilityInboxRequests(context);
  const pending = requests.filter((request) => pendingStatuses.has(request.status));
  const archived = requests.filter((request) => !pendingStatuses.has(request.status));

  return <section dir="rtl" className="space-y-5">
    <div className="rounded-[2.5rem] bg-gradient-to-br from-indigo-950 via-indigo-800 to-sky-700 p-6 text-white shadow-xl sm:p-8">
      <p className="text-xs font-black text-indigo-100">متابعة المعلمين</p>
      <h2 className="mt-3 text-3xl font-black">الإفادات والمتابعات</h2>
      <p className="mt-3 text-sm font-bold leading-7 text-indigo-100">الإفادات والمتابعات الموجهة إليك من إدارة المدرسة.</p>
    </div>
    <InboxGroup title="مطلوب مني" requests={pending} empty="لا توجد إفادات مطلوبة منك حاليًا." />
    <InboxGroup title="محفوظة" requests={archived} empty="لا توجد إفادات محفوظة بعد." />
  </section>;
}

function InboxGroup({ title, requests, empty }: { title: string; requests: Awaited<ReturnType<typeof listAccountabilityInboxRequests>>; empty: string }) {
  return <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><h3 className="text-xl font-black text-slate-950 dark:text-white">{title}</h3>{requests.length ? <div className="mt-4 grid gap-4 lg:grid-cols-2">{requests.map((request) => <article key={request.token} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-3"><AccountabilityStatusBadge status={request.status} /><span className="text-xs font-bold text-slate-400">{request.createdBy.officialName || request.createdBy.name}</span></div><h4 className="mt-3 text-lg font-black text-slate-950 dark:text-white">{request.title}</h4><p className="mt-2 text-xs font-bold text-slate-500">أُرسلت: {formatDate(request.sentAt)}</p>{request.respondedAt ? <p className="mt-1 text-xs font-bold text-slate-500">أُرسلت الإفادة: {formatDate(request.respondedAt)}</p> : null}{request.status === "NEEDS_COMPLETION" && request.returnedReason ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold leading-7 text-amber-900">{request.returnedReason}</p> : null}<Link href={`/accountability/respond/${encodeURIComponent(request.token)}`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-indigo-700 px-5 text-sm font-black text-white">{pendingStatuses.has(request.status) ? "فتح الإفادة" : "عرض الإفادة"}</Link></article>)}</div> : <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-500">{empty}</p>}</section>;
}
