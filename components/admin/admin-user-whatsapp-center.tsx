"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Loader2, MessageCircle, Phone, Search, UserRound, Users } from "lucide-react";
import { WhatsAppMessageTemplateModal, type WhatsAppMessageTemplateRecord } from "@/components/admin/whatsapp-message-template-modal";
import { getArabicWhatsAppRoleLabel, renderWhatsAppTemplate } from "@/lib/whatsapp/message-template";
import { buildWhatsAppLink, normalizeSaudiWhatsAppNumber } from "@/lib/whatsapp/whatsapp-links";

type WhatsAppUser = { id: string; name: string; email: string; role: string; phone: string | null };
type Payload = {
  users: WhatsAppUser[];
  stats: { total: number; withPhone: number; withoutPhone: number };
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

const ROLE_OPTIONS = [
  ["ADMIN", "مدير المنصة"],
  ["COUNSELOR", "التوجيه الطلابي"],
  ["ACTIVITY_LEADER", "رائد النشاط"],
  ["TEACHER", "معلم"],
  ["PRINCIPAL", "مدير المدرسة"],
  ["SCHOOL_OWNER", "مالك الحساب"],
  ["STAFF", "موظف"],
] as const;

function roleLabel(role: string) {
  return ROLE_OPTIONS.find(([value]) => value === role)?.[1] || role;
}

export function AdminUserWhatsAppCenter() {
  const [data, setData] = useState<Payload | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<WhatsAppMessageTemplateRecord | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (search.trim()) query.set("search", search.trim());
      if (role) query.set("role", role);
      const response = await fetch(`/api/dashboard/admin/user-whatsapp?${query.toString()}`, { cache: "no-store" });
      const payload = await response.json() as Payload & { error?: string };
      if (!response.ok) throw new Error(payload.error || "تعذر تحميل المستخدمين.");
      setData(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل المستخدمين.");
    } finally {
      setLoading(false);
    }
  }, [page, role, search]);

  const loadTemplate = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/admin/user-whatsapp/template", { cache: "no-store" });
      const payload = await response.json() as { template?: WhatsAppMessageTemplateRecord | null };
      if (response.ok) setActiveTemplate(payload.template?.isActive ? payload.template : null);
    } catch {
      setActiveTemplate(null);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadTemplate(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTemplate]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
  }

  return (
    <main className="space-y-6 pb-24" dir="rtl">
      <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-sky-50 to-blue-50 p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-sky-700 shadow-sm"><MessageCircle className="h-4 w-4" />واتساب المستخدمين</div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">واتساب المستخدمين</h1>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-600">التواصل المباشر مع مستخدمي المنصة عبر واتساب</p>
          </div>
          <button type="button" onClick={() => setTemplateOpen(true)} className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800">إعداد رسالة الإرسال</button>
          <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
            <SummaryCard icon={<Users />} value={data?.stats.total || 0} label="الإجمالي" />
            <SummaryCard icon={<Phone />} value={data?.stats.withPhone || 0} label="لديهم رقم" />
            <SummaryCard icon={<UserRound />} value={data?.stats.withoutPhone || 0} label="بدون رقم" />
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row">
          <form onSubmit={submitSearch} className="relative flex-1">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو رقم الجوال أو البريد الإلكتروني" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-bold outline-none transition focus:border-sky-400 focus:bg-white" />
          </form>
          <select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none focus:border-sky-400">
            <option value="">جميع الأدوار</option>
            {ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </section>

      {error ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}<button type="button" onClick={() => void load()} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-rose-700">إعادة المحاولة</button></div> : null}

      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        {loading ? <div className="grid min-h-64 place-items-center text-sm font-black text-slate-500"><span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin text-sky-600" />جارٍ تحميل المستخدمين...</span></div> : data?.users.length ? <div className="divide-y divide-slate-100">{data.users.map((user) => <WhatsAppUserRow key={user.id} user={user} activeTemplate={activeTemplate} onOpenTemplate={() => setTemplateOpen(true)} />)}</div> : <div className="px-6 py-16 text-center text-sm font-bold text-slate-500">{search.trim() ? "لا توجد نتائج مطابقة" : "لا يوجد مستخدمون لعرضهم حاليًا"}</div>}
      </section>

      {data?.pagination && data.pagination.totalPages > 1 ? <nav className="flex items-center justify-center gap-3" aria-label="صفحات المستخدمين">
        <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        <span className="text-sm font-black text-slate-600">صفحة {data.pagination.page} من {data.pagination.totalPages}</span>
        <button type="button" disabled={page >= data.pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
      </nav> : null}
      <WhatsAppMessageTemplateModal open={templateOpen} onClose={() => setTemplateOpen(false)} onSaved={(template) => { if (template.isActive) setActiveTemplate(template); }} />
    </main>
  );
}

function WhatsAppUserRow({ user, activeTemplate, onOpenTemplate }: { user: WhatsAppUser; activeTemplate: WhatsAppMessageTemplateRecord | null; onOpenTemplate: () => void }) {
  const normalized = normalizeSaudiWhatsAppNumber(user.phone);
  const chatLink = buildWhatsAppLink(user.phone);
  const message = activeTemplate ? renderWhatsAppTemplate(activeTemplate.content, {
    name: user.name,
    role: getArabicWhatsAppRoleLabel(user.role),
    phone: user.phone || "",
    coupon: activeTemplate.coupon || "",
  }) : null;
  const messageLink = message ? buildWhatsAppLink(user.phone, message) : null;

  return <article className="grid gap-4 p-5 transition hover:bg-slate-50 lg:grid-cols-[minmax(0,1fr)_170px_minmax(0,1fr)_260px] lg:items-center">
    <div className="min-w-0"><p className="truncate text-base font-black text-slate-950">{user.name}</p><p className="mt-1 truncate text-xs font-bold text-slate-400">{user.email}</p></div>
    <span className="w-fit rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">{roleLabel(user.role)}</span>
    <div>{chatLink ? <a href={chatLink} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex items-center gap-2 text-sm font-black text-slate-700 hover:text-sky-700"><Phone className="h-4 w-4 text-sky-600" />{user.phone}</a> : <span className="text-sm font-bold text-slate-400">لا يوجد رقم{user.phone && !normalized ? " صالح" : ""}</span>}</div>
    <div className="flex flex-wrap gap-2">{chatLink ? <a href={chatLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700"><MessageCircle className="h-4 w-4" />فتح واتساب</a> : null}{messageLink ? <a href={messageLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"><MessageCircle className="h-4 w-4" />إرسال الرسالة</a> : normalized ? <button type="button" onClick={onOpenTemplate} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100">إعداد الرسالة</button> : null}</div>
  </article>;
}

function SummaryCard({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return <div className="min-w-[72px] rounded-2xl border border-white bg-white px-3 py-3 shadow-sm"><div className="mx-auto grid h-7 w-7 place-items-center rounded-xl bg-sky-50 text-sky-700">{icon}</div><p className="mt-1 text-lg font-black text-slate-950">{value}</p><p className="text-[10px] font-black text-slate-400">{label}</p></div>;
}
