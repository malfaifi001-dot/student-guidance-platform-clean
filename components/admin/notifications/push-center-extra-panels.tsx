"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SmartActionModal } from "@/components/ui/smart-action-modal";
import { PushCenterFeedbackModal, type PushCenterFeedback } from "@/components/admin/notifications/push-center-feedback";

type Template = { id: string; name: string; title: string; body: string; route: string; category?: string | null; enabled: boolean };

function safeDescription(result: any) {
  return typeof result?.error?.code === "string" ? `رمز الحالة: ${result.error.code}` : "تعذر تنفيذ الطلب. حاول مرة أخرى.";
}

export function PushTemplatesPanel({ templates, onChanged }: { templates: Template[]; onChanged: () => void }) {
  const [form, setForm] = useState({ name: "", title: "", body: "", route: "/dashboard", category: "عام" });
  const [editing, setEditing] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<PushCenterFeedback | null>(null);
  const reset = () => { setEditing(null); setForm({ name: "", title: "", body: "", route: "/dashboard", category: "عام" }); };
  async function request(url: string, init: RequestInit) {
    const response = await fetch(url, init);
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(safeDescription(result));
    return result;
  }
  async function save() {
    setBusy(true);
    try { await request(editing ? `/api/dashboard/admin/notifications/templates/${editing}` : "/api/dashboard/admin/notifications/templates", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) }); reset(); onChanged(); setFeedback({ variant: "success", title: "تم حفظ القالب" }); }
    catch (error) { setFeedback({ variant: "error", title: "تعذر حفظ القالب", description: error instanceof Error ? error.message : undefined }); }
    finally { setBusy(false); }
  }
  async function duplicate(template: Template) {
    setBusy(true);
    try { await request("/api/dashboard/admin/notifications/templates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: `${template.name} - نسخة`, title: template.title, body: template.body, route: template.route, category: template.category }) }); onChanged(); setFeedback({ variant: "success", title: "تم تكرار القالب", description: "تم إنشاء قالب جديد مستقل عن القالب الأصلي." }); }
    catch (error) { setFeedback({ variant: "error", title: "تعذر تكرار القالب", description: error instanceof Error ? error.message : undefined }); }
    finally { setBusy(false); }
  }
  async function toggle(template: Template) {
    setBusy(true);
    try { await request(`/api/dashboard/admin/notifications/templates/${template.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: !template.enabled }) }); onChanged(); setFeedback({ variant: "success", title: template.enabled ? "تم تعطيل القالب" : "تم تفعيل القالب" }); }
    catch { setFeedback({ variant: "error", title: "تعذر تحديث حالة القالب" }); }
    finally { setBusy(false); }
  }
  async function remove(template: Template) {
    setBusy(true);
    try { await request(`/api/dashboard/admin/notifications/templates/${template.id}`, { method: "DELETE" }); setDeleteCandidate(null); onChanged(); setFeedback({ variant: "success", title: "تم حذف القالب" }); }
    catch (error) { setFeedback({ variant: "error", title: "تعذر حذف القالب", description: error instanceof Error ? error.message : undefined }); }
    finally { setBusy(false); }
  }
  return <>
    <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black">{editing ? "تعديل القالب" : "إنشاء قالب"}</h2><div className="mt-4 space-y-3">{([['name', 'اسم داخلي'], ['title', 'العنوان'], ['route', 'المسار']] as const).map(([key, label]) => <label key={key} className="block space-y-1"><span className="text-xs font-black text-slate-600">{label}</span><input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold" /></label>)}<label className="block space-y-1"><span className="text-xs font-black text-slate-600">النص</span><textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} rows={4} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold" /></label><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void save()} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">حفظ القالب</button>{editing ? <button type="button" disabled={busy} onClick={reset} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black">إلغاء</button> : null}</div></div></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black">القوالب المحفوظة</h2><div className="mt-4 space-y-3">{templates.length ? templates.map((template) => <div key={template.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><strong className="text-sm font-black">{template.name}</strong><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => { setEditing(template.id); setForm({ name: template.name, title: template.title, body: template.body, route: template.route, category: template.category || "عام" }); }} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold">تعديل</button><button type="button" disabled={busy} onClick={() => void duplicate(template)} className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700 disabled:opacity-50">تكرار القالب</button><button type="button" disabled={busy} onClick={() => void toggle(template)} className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-bold text-sky-700 disabled:opacity-50">{template.enabled ? "تعطيل" : "تفعيل"}</button><button type="button" disabled={busy} onClick={() => setDeleteCandidate(template)} className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 disabled:opacity-50">حذف</button></div></div><p className="mt-2 text-sm font-bold">{template.title}</p><p className="mt-1 text-xs leading-6 text-slate-500">{template.body}</p></div>) : <p className="rounded-xl bg-slate-50 p-5 text-sm font-bold text-slate-500">لا توجد قوالب محفوظة.</p>}</div></div>
    </section>
    <SmartActionModal open={Boolean(deleteCandidate)} title="حذف القالب؟" description={deleteCandidate ? `سيتم حذف «${deleteCandidate.name}» نهائيًا. يجب تعطيل القالب أولًا إذا كان مستخدمًا.` : undefined} variant="danger" confirmLabel="حذف القالب" cancelLabel="إلغاء" loading={busy} onConfirm={() => deleteCandidate && void remove(deleteCandidate)} onClose={() => !busy && setDeleteCandidate(null)} />
    <PushCenterFeedbackModal feedback={feedback} onClose={() => setFeedback(null)} />
  </>;
}

export function PushAnalyticsPanel() {
  const [filters, setFilters] = useState({ preset: "30d", type: "", status: "", audienceType: "", role: "", from: "", to: "" });
  const [analytics, setAnalytics] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<PushCenterFeedback | null>(null);
  async function load() {
    setLoading(true);
    if (filters.preset === "custom" && filters.from && filters.to && filters.from > filters.to) { setLoading(false); setFeedback({ variant: "warning", title: "نطاق تاريخ غير صالح", description: "يجب أن يكون تاريخ البداية قبل تاريخ النهاية." }); return; }
    try { const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, value]) => value))); const response = await fetch(`/api/dashboard/admin/notifications/analytics?${params}`, { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(safeDescription(result)); setAnalytics(result.analytics || null); }
    catch (error) { setFeedback({ variant: "error", title: "تعذر تحميل الإحصائيات", description: error instanceof Error ? error.message : undefined }); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [filters.preset, filters.type, filters.status, filters.audienceType, filters.role, filters.from, filters.to]);
  const value = (key: string) => Number(analytics?.[key] || 0).toLocaleString("ar-SA");
  return <section className="space-y-5"><div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><select value={filters.preset} onChange={(event) => setFilters({ ...filters, preset: event.target.value })} className="h-10 rounded-xl border px-3 text-sm font-bold"><option value="today">اليوم</option><option value="7d">آخر 7 أيام</option><option value="30d">آخر 30 يومًا</option><option value="90d">آخر 90 يومًا</option><option value="custom">فترة مخصصة</option></select>{filters.preset === "custom" ? <><label className="flex items-center gap-2 text-xs font-bold">من <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className="h-10 rounded-xl border px-2" /></label><label className="flex items-center gap-2 text-xs font-bold">إلى <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className="h-10 rounded-xl border px-2" /></label></> : null}<select value={filters.audienceType} onChange={(event) => setFilters({ ...filters, audienceType: event.target.value })} className="h-10 rounded-xl border px-3 text-sm font-bold"><option value="">جميع الجماهير</option><option value="ALL_USERS">جميع المستخدمين</option><option value="ROLE">حسب الدور</option><option value="USER">مستخدم محدد</option><option value="USERS">مجموعة مستخدمين</option><option value="SCHOOL">المدرسة/الحساب</option></select><select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })} className="h-10 rounded-xl border px-3 text-sm font-bold"><option value="">كل الأنواع</option><option value="MANUAL">يدوي</option><option value="SCHEDULED">مجدول</option><option value="RECURRING">دوري</option><option value="AUTOMATIC">تلقائي</option><option value="SYSTEM_TEST">اختبار</option></select><select value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value })} className="h-10 rounded-xl border px-3 text-sm font-bold"><option value="">كل الأدوار</option><option value="TEACHER">معلمون</option><option value="COUNSELOR">موجهون</option><option value="ACTIVITY_LEADER">رواد نشاط</option><option value="PRINCIPAL">مديرو مدارس</option></select></div>{loading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500">جاري تحميل الإحصائيات...</div> : <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[["الحملات", "campaigns"], ["المستخدمون المستهدفون", "targetedUsers"], ["الأجهزة المستهدفة", "targetedDevices"], ["تم قبول الإرسال", "accepted"], ["فشل الإرسال", "failed"], ["أجهزة غير صالحة", "invalid"], ["تم فتح الإشعار", "opened"], ["معدل النجاح", "successRate"], ["معدل الفتح", "openRate"], ["متوسط الفتح", "averageOpenRate"]].map(([label, key]) => <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-xs font-black text-slate-500">{label}</span><strong className="mt-2 block text-xl font-black">{value(key)}{key.includes("Rate") ? "%" : ""}</strong></div>)}</div><div className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">اتجاه الإرسال والفتح</h2><div className="mt-4 space-y-2">{(analytics?.trend || []).map((row: any) => <div key={row.date} className="grid grid-cols-4 rounded-xl bg-slate-50 p-3 text-xs font-bold"><span>{row.date}</span><span>قبول: {row.accepted}</span><span>فشل: {row.failed}</span><span>فتح: {row.opened}</span></div>)}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">الأجهزة</h2><div className="mt-4 grid grid-cols-2 gap-3">{Object.entries(analytics?.devices || {}).map(([key, item]) => <div key={key} className="rounded-xl bg-slate-50 p-3 text-sm font-bold">{key}: {String(item)}</div>)}</div></div></div></>}{feedback ? <PushCenterFeedbackModal feedback={feedback} onClose={() => setFeedback(null)} /> : null}</section>;
}

export function PushCampaignHistoryActions({ campaigns, onChanged }: { campaigns: Array<Record<string, unknown>>; onChanged: () => void }) {
  const [pending, setPending] = useState<{ id: string; active: boolean; name: string } | null>(null);
  const [cancelCandidate, setCancelCandidate] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<PushCenterFeedback | null>(null);
  async function call(id: string, action: string) { setBusy(true); try { const response = await fetch(`/api/dashboard/admin/notifications/campaigns/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) }); if (!response.ok) throw new Error("تعذر تنفيذ الإجراء."); onChanged(); setFeedback({ variant: "success", title: action === "resend" ? "تم إنشاء حملة جديدة" : "تم إنشاء مسودة جديدة" }); } catch { setFeedback({ variant: "error", title: "تعذر تنفيذ الإجراء" }); } finally { setBusy(false); } }
  async function cancel() { if (!cancelCandidate) return; setBusy(true); try { const response = await fetch(`/api/dashboard/admin/notifications/campaigns/${cancelCandidate.id}`, { method: "DELETE" }); if (!response.ok) throw new Error(); setCancelCandidate(null); onChanged(); setFeedback({ variant: "success", title: "تم إلغاء الحملة المجدولة" }); } catch { setFeedback({ variant: "error", title: "تعذر إلغاء الحملة" }); } finally { setBusy(false); } }
  async function toggle() { if (!pending) return; setBusy(true); try { const response = await fetch(`/api/dashboard/admin/notifications/campaigns/${pending.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ recurrenceActive: pending.active }) }); if (!response.ok) throw new Error(); const enabled = pending.active; setPending(null); onChanged(); setFeedback({ variant: "success", title: enabled ? "تم تفعيل التكرار" : "تم إيقاف التكرار" }); } catch { setFeedback({ variant: "error", title: "تعذر تحديث التكرار" }); } finally { setBusy(false); } }
  return <div className="mt-4 space-y-2">{campaigns.map((campaign) => { const id = String(campaign.id); const recurring = String(campaign.type) === "RECURRING"; const scheduled = String(campaign.status) === "SCHEDULED"; return <div key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white p-3"><span className="text-sm font-black">{String(campaign.title)}</span><div className="flex flex-wrap gap-2"><Link href={`/dashboard/admin/notifications/campaigns/${id}`} className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700">عرض التفاصيل</Link><button type="button" disabled={busy} onClick={() => void call(id, "duplicate")} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-black disabled:opacity-50">تكرار</button><button type="button" disabled={busy || String(campaign.status) === "DRAFT"} onClick={() => void call(id, "resend")} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 disabled:opacity-40">إعادة الإرسال</button>{scheduled && !recurring ? <button type="button" disabled={busy} onClick={() => setCancelCandidate({ id, name: String(campaign.title) })} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 disabled:opacity-50">إلغاء</button> : null}{recurring ? <button type="button" disabled={busy} onClick={() => setPending({ id, active: !Boolean(campaign.recurrenceActive), name: String(campaign.title) })} className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 disabled:opacity-50">{campaign.recurrenceActive ? "إيقاف التكرار" : "تفعيل التكرار"}</button> : null}</div></div>; })}<SmartActionModal open={Boolean(pending)} title={pending?.active ? "تفعيل التكرار؟" : "إيقاف التكرار؟"} description={pending ? `الحملة: ${pending.name}. سيتم ${pending.active ? "استئناف" : "إيقاف"} التنفيذ الدوري فقط.` : undefined} variant="warning" confirmLabel={pending?.active ? "تفعيل التكرار" : "إيقاف التكرار"} cancelLabel="إلغاء" loading={busy} onConfirm={() => void toggle()} onClose={() => !busy && setPending(null)} /><SmartActionModal open={Boolean(cancelCandidate)} title="إلغاء الحملة المجدولة؟" description={cancelCandidate ? `الحملة: ${cancelCandidate.name}. لن يتم تنفيذها في موعدها.` : undefined} variant="danger" confirmLabel="إلغاء الحملة" cancelLabel="إلغاء" loading={busy} onConfirm={() => void cancel()} onClose={() => !busy && setCancelCandidate(null)} /><PushCenterFeedbackModal feedback={feedback} onClose={() => setFeedback(null)} /></div>;
}
