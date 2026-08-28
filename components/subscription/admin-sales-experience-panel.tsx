"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, RefreshCw, Search } from "lucide-react";
import { SmartActionModal } from "@/components/ui/smart-action-modal";
import { formatAdminSubscriptionStatus } from "@/lib/subscription/subscription-presentation";

type SalesUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  effectiveMode: "SERVICE" | "BAG";
  source: "GLOBAL" | "USER_OVERRIDE";
  activeSubscription: boolean;
  subscriptionPlanName: string | null;
  schoolAccount: { name: string; subscription: unknown } | null;
};

type SalesExperienceResponse = {
  globalMode?: "SERVICE" | "BAG";
  page?: number;
  totalPages?: number;
  users?: SalesUser[];
};

const SAFE_LOAD_ERROR = "تعذر تحميل المستخدمين";
const SAFE_ACTION_ERROR = "تعذر تنفيذ العملية.";

async function readJsonResponse(response: Response): Promise<SalesExperienceResponse> {
  const text = await response.text();
  if (!text.trim()) return {};

  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" ? (parsed as SalesExperienceResponse) : {};
  } catch {
    return {};
  }
}

export function AdminSalesExperiencePanel() {
  const [globalMode, setGlobalMode] = useState<"SERVICE" | "BAG">("SERVICE");
  const [users, setUsers] = useState<SalesUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [confirmMode, setConfirmMode] = useState<"SERVICE" | "BAG" | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function load(pageToLoad = page, queryToUse = query) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: queryToUse.trim(),
        page: String(pageToLoad),
      });
      const response = await fetch(`/api/dashboard/admin/sales-experience?${params.toString()}`, { cache: "no-store" });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error("REQUEST_FAILED");
      setGlobalMode(payload.globalMode === "BAG" ? "BAG" : "SERVICE");
      setUsers(Array.isArray(payload.users) ? payload.users : []);
      setPage(typeof payload.page === "number" ? payload.page : pageToLoad);
      setTotalPages(typeof payload.totalPages === "number" ? Math.max(1, payload.totalPages) : 1);
    } catch {
      setFeedback(SAFE_LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(1, ""); }, []);

  async function post(body: Record<string, string>) {
    setWorking(true);
    setFeedback("");
    try {
      const response = await fetch("/api/dashboard/admin/sales-experience", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error("REQUEST_FAILED");
      await load(page, query);
      setFeedback("تم تحديث وضع تجربة البيع.");
    } catch {
      setFeedback(SAFE_ACTION_ERROR);
    } finally {
      setWorking(false);
      setConfirmMode(null);
    }
  }

  return (
    <section dir="rtl" className="space-y-4 rounded-[1.75rem] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs font-black text-violet-700">تجارب البيع</span>
          <h2 className="mt-2 text-2xl font-black text-slate-950">وضع تجربة البيع</h2>
          <p className="mt-1 text-sm font-bold leading-7 text-slate-600">تحكم إداري مركزي في تجربة العرض والوصول دون تعديل الاشتراكات أو سجل المدفوعات.</p>
        </div>
        <button type="button" onClick={() => void load(page, query)} className="rounded-xl bg-white p-2 text-slate-600 shadow-sm" aria-label="تحديث"><RefreshCw className="h-4 w-4" /></button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(["SERVICE", "BAG"] as const).map((mode) => (
          <button key={mode} type="button" onClick={() => globalMode !== mode && setConfirmMode(mode)} className={`rounded-2xl border p-4 text-right transition ${globalMode === mode ? "border-violet-400 bg-violet-100" : "border-slate-200 bg-white hover:border-violet-200"}`}>
            <strong className="block text-lg font-black">{mode === "BAG" ? "BAG · حقيبة المعلم" : "SERVICE · النظام الحالي"}</strong>
            <span className="mt-1 block text-xs font-bold text-slate-600">{mode === "BAG" ? "عرض الحقيبة وإتاحة الخدمات للمستخدمين المستهدفين." : "نظام البيع والاشتراكات الحالي."}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <button type="button" onClick={() => setExpanded((value) => !value)} className="flex w-full items-center justify-between text-right" aria-expanded={expanded}>
          <span className="font-black text-slate-950">مستخدمو تجربة وضع الحقيبة</span>
          {expanded ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
        </button>
        {expanded ? <>
          <div className="mt-3 flex gap-2">
            <div className="relative flex-1"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} onKeyDown={(event) => { if (event.key === "Enter") void load(1, query); }} placeholder="ابحث بالاسم أو البريد الإلكتروني" className="w-full rounded-xl border border-slate-200 py-2.5 pl-3 pr-9 text-sm font-bold outline-none focus:border-violet-400" /></div>
            <button type="button" onClick={() => void load(1, query)} className="rounded-xl bg-slate-950 px-4 text-sm font-black text-white">بحث</button>
          </div>
          {feedback ? <p className="mt-3 rounded-xl bg-sky-50 p-3 text-sm font-bold text-sky-700">{feedback}</p> : null}
          {loading ? <div className="grid place-items-center p-8"><Loader2 className="h-5 w-5 animate-spin text-violet-600" /></div> : <div className="mt-4 space-y-2">{users.map((user) => <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><div><strong className="block text-sm font-black">{user.name}</strong><span className="text-xs font-bold text-slate-500">{user.email} · {user.role} · {user.schoolAccount?.name || "دون مدرسة"}</span></div><div className="flex items-center gap-2 text-xs font-black"><span className={`rounded-full px-2 py-1 ${user.effectiveMode === "BAG" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}>{user.effectiveMode === "BAG" ? "BAG" : "SERVICE"}{user.source === "USER_OVERRIDE" ? " · override" : ""}</span><span className="text-slate-500">{user.activeSubscription ? formatAdminSubscriptionStatus("ACTIVE", user.subscriptionPlanName) : formatAdminSubscriptionStatus(null)}</span>{user.source === "USER_OVERRIDE" ? <button type="button" disabled={working} onClick={() => void post({ action: "remove-override", userId: user.id })} className="rounded-lg bg-rose-50 px-3 py-1.5 text-rose-700">إزالة</button> : <button type="button" disabled={working} onClick={() => void post({ action: "add-override", userId: user.id })} className="rounded-lg bg-violet-600 px-3 py-1.5 text-white">إضافة BAG</button>}</div></div>)}</div>}
          {!loading && totalPages > 1 ? <div className="mt-4 flex items-center justify-between gap-3 text-sm font-black text-slate-600"><button type="button" disabled={page <= 1} onClick={() => void load(page - 1, query)} className="rounded-xl bg-slate-100 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40">السابق</button><span>صفحة {page} من {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => void load(page + 1, query)} className="rounded-xl bg-slate-100 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40">التالي</button></div> : null}
        </> : null}
      </div>

      <SmartActionModal open={Boolean(confirmMode)} title="تأكيد تغيير وضع تجربة البيع" description={confirmMode === "BAG" ? "سيظهر عرض حقيبة المعلم، وسيُتجاوز paywall الاشتراك للمستخدمين المؤهلين مع بقاء صلاحيات الأدوار." : "ستعود تجربة البيع وقيود الاشتراك إلى وضع Teachix الحالي."} variant="warning" confirmLabel="تأكيد التغيير" cancelLabel="إلغاء" loading={working} onConfirm={() => confirmMode && void post({ action: "set-global", mode: confirmMode })} onClose={() => !working && setConfirmMode(null)} />
    </section>
  );
}
