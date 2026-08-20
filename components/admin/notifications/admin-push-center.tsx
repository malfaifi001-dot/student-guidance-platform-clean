"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, CheckCircle2, Clock3, MonitorSmartphone, RefreshCw, Send, ShieldCheck, Smartphone, Users, XCircle } from "lucide-react";

type Tab = "overview" | "create" | "campaigns" | "automatic" | "devices";
type Audience = "ALL_USERS" | "ROLE" | "USER" | "USERS" | "SCHOOL";

const tabLabels: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "نظرة عامة" },
  { id: "create", label: "إنشاء إشعار" },
  { id: "campaigns", label: "الحملات" },
  { id: "automatic", label: "الإشعارات التلقائية" },
  { id: "devices", label: "الأجهزة" },
];

const roleLabels: Record<string, string> = { ADMIN: "مديرو النظام", COUNSELOR: "الموجهون", ACTIVITY_LEADER: "رواد النشاط", TEACHER: "المعلمون", PRINCIPAL: "مديرو المدارس", SCHOOL_OWNER: "مالكو المدارس", STAFF: "الموظفون" };

type CenterData = {
  overview: Record<string, number>;
  campaigns: Array<Record<string, unknown>>;
  rules: Array<Record<string, unknown>>;
};

function Metric({ label, value, icon: Icon, tone = "sky" }: { label: string; value: number; icon: typeof Users; tone?: string }) {
  const toneClasses: Record<string, string> = { sky: "border-sky-100 text-sky-600", emerald: "border-emerald-100 text-emerald-600", amber: "border-amber-100 text-amber-600", violet: "border-violet-100 text-violet-600", rose: "border-rose-100 text-rose-600", teal: "border-teal-100 text-teal-600" };
  return <div className={`rounded-2xl border bg-white p-4 shadow-sm ${toneClasses[tone] || toneClasses.sky}`}><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{label}</span><Icon className="h-5 w-5" /></div><strong className="mt-2 block text-2xl font-black text-slate-900">{value.toLocaleString("ar-SA")}</strong></div>;
}

export function AdminPushCenter() {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<CenterData | null>(null);
  const [devices, setDevices] = useState<Array<Record<string, unknown>>>([]);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", route: "/dashboard", audienceType: "ALL_USERS" as Audience, role: "TEACHER", userId: "", sendNow: true, scheduledAt: "", recurrenceFrequency: "" });

  async function load() {
    setLoading(true);
    try {
      const [centerResponse, devicesResponse, healthResponse] = await Promise.all([
        fetch("/api/dashboard/admin/notifications", { cache: "no-store" }),
        fetch("/api/dashboard/admin/notifications/devices", { cache: "no-store" }),
        fetch("/api/dashboard/admin/notifications/health", { cache: "no-store" }),
      ]);
      if (centerResponse.ok) setData(await centerResponse.json());
      if (devicesResponse.ok) setDevices((await devicesResponse.json()).devices || []);
      if (healthResponse.ok || healthResponse.status === 503) setHealth(await healthResponse.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const overview = data?.overview || {};
  const estimateText = useMemo(() => form.audienceType === "ALL_USERS" ? "جميع المستخدمين النشطين ذوي الأجهزة المفعلة" : form.audienceType === "ROLE" ? roleLabels[form.role] : "الجمهور المحدد", [form.audienceType, form.role]);

  async function createCampaign() {
    setSaving(true); setMessage("");
    const response = await fetch("/api/dashboard/admin/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, scheduledAt: form.sendNow ? null : new Date(form.scheduledAt).toISOString(), recurrenceFrequency: form.recurrenceFrequency || null, role: form.audienceType === "ROLE" ? form.role : undefined, userId: form.audienceType === "USER" ? form.userId : undefined }) });
    const result = await response.json().catch(() => null);
    setSaving(false);
    setMessage(response.ok ? "تم حفظ الحملة وإرسالها حسب الخيار المحدد." : `تعذر إنشاء الحملة: ${result?.error?.code || "خطأ غير متوقع"}`);
    if (response.ok) { setConfirming(false); setForm((current) => ({ ...current, title: "", body: "" })); await load(); setTab("campaigns"); }
  }

  async function revokeDevice(id: string) {
    const response = await fetch("/api/dashboard/admin/notifications/devices", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ deviceId: id }) });
    if (response.ok) { setMessage("تم تعطيل الجهاز."); await load(); }
  }

  async function toggleRule(ruleId: string, enabled: boolean) {
    const response = await fetch("/api/dashboard/admin/notifications/rules", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ruleId, enabled }) });
    if (response.ok) await load();
  }

  return <div dir="rtl" className="space-y-6">
    <header className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-sky-900 p-6 text-white shadow-xl sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5"><div><span className="text-xs font-black text-sky-200">مركز الإدارة · الاتصالات</span><h1 className="mt-2 text-3xl font-black tracking-tight">الإشعارات والبوش</h1><p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-300">أدر حملات الإشعارات، جدولة الإرسال، الأجهزة، وإحصاءات التفاعل من مساحة واحدة آمنة.</p></div><div className="rounded-2xl border border-white/10 bg-white/10 p-4"><BellRing className="h-8 w-8 text-sky-200" /></div></div>
    </header>
    <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">{tabLabels.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-black transition ${tab === item.id ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{item.label}</button>)}</nav>
    {message ? <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">{message}</div> : null}
    {loading ? <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-sm font-black text-slate-500"><RefreshCw className="me-2 h-5 w-5 animate-spin" />جارٍ تحميل مركز الإشعارات...</div> : null}
    {!loading && tab === "overview" ? <section className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="إجمالي الحملات" value={overview.campaigns || 0} icon={Send} /><Metric label="حملات مرسلة" value={overview.sent || 0} icon={CheckCircle2} tone="emerald" /><Metric label="حملات مجدولة" value={overview.scheduled || 0} icon={Clock3} tone="amber" /><Metric label="الأجهزة النشطة" value={overview.activeDevices || 0} icon={Smartphone} tone="violet" /><Metric label="الإرسالات المقبولة" value={overview.successes || 0} icon={CheckCircle2} tone="emerald" /><Metric label="الإرسالات الفاشلة" value={overview.failures || 0} icon={XCircle} tone="rose" /><Metric label="فتح الإشعارات" value={overview.opened || 0} icon={BellRing} /><Metric label="معدل النجاح" value={overview.successRate || 0} icon={ShieldCheck} tone="teal" /></div><div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black text-slate-900">حالة Firebase</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{[["Firebase Admin", health?.firebaseAdmin], ["Firebase Messaging", health?.firebaseMessaging], ["تشفير الأجهزة", health?.pushEncryption]].map(([label, value]) => <div key={String(label)} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-700">{value ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-600" />}{String(label)}</div>)}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black text-slate-900">تعريف القياس</h2><p className="mt-3 text-sm leading-7 text-slate-500">نجاح الإرسال يعني قبول FCM للرسالة. أما فتح الإشعار فيُحسب فقط عند تسجيل حدث فتح موثوق من جلسة المستخدم.</p></div></div></section> : null}
    {!loading && tab === "create" ? <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-slate-900">إنشاء حملة Push</h2><div className="mt-5 grid gap-4"><label className="space-y-2"><span className="text-xs font-black text-slate-600">عنوان الإشعار</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-500" placeholder="عنوان مختصر وواضح" /></label><label className="space-y-2"><span className="text-xs font-black text-slate-600">نص الإشعار</span><textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={500} rows={4} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none focus:border-sky-500" placeholder="اكتب الرسالة هنا" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-xs font-black text-slate-600">الجمهور</span><select value={form.audienceType} onChange={(e) => setForm({ ...form, audienceType: e.target.value as Audience })} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold"><option value="ALL_USERS">جميع المستخدمين</option><option value="ROLE">حسب الدور</option><option value="USER">مستخدم محدد</option></select></label>{form.audienceType === "ROLE" ? <label className="space-y-2"><span className="text-xs font-black text-slate-600">الدور</span><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold">{Object.entries(roleLabels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label> : null}{form.audienceType === "USER" ? <label className="space-y-2"><span className="text-xs font-black text-slate-600">معرف المستخدم</span><input value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold" /></label> : null}</div><label className="space-y-2"><span className="text-xs font-black text-slate-600">المسار الداخلي</span><input value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold" /></label><div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 p-4"><label className="flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={form.sendNow} onChange={(e) => setForm({ ...form, sendNow: e.target.checked })} /> إرسال الآن</label>{!form.sendNow ? <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm" /> : null}<select value={form.recurrenceFrequency} onChange={(e) => setForm({ ...form, recurrenceFrequency: e.target.value, sendNow: e.target.value ? false : form.sendNow })} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">بدون تكرار</option><option value="DAILY">يومي</option><option value="WEEKLY">أسبوعي</option><option value="MONTHLY">شهري</option><option value="WEEKDAYS">أيام العمل</option></select></div>{confirming ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-black text-amber-900">راجع الرسالة والجمهور قبل الإرسال: {estimateText}</p><div className="mt-3 flex gap-2"><button type="button" disabled={saving} onClick={() => void createCampaign()} className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-black text-white">تأكيد وتنفيذ</button><button type="button" onClick={() => setConfirming(false)} className="rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-700">إلغاء</button></div></div> : <button type="button" disabled={saving} onClick={() => setConfirming(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-black text-white shadow-lg shadow-sky-100 disabled:opacity-60"><Send className="h-4 w-4" />{form.sendNow ? "مراجعة وإرسال الحملة" : "مراجعة وحفظ الجدولة"}</button>}</div></div><div className="space-y-4"><div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm"><p className="text-xs font-bold text-sky-200">معاينة تقريبية</p><div className="mt-4 rounded-2xl bg-white p-4 text-slate-900"><div className="flex items-center gap-2"><div className="rounded-lg bg-sky-100 p-2"><BellRing className="h-4 w-4 text-sky-700" /></div><div><strong className="block text-sm">Teachix</strong><span className="text-[10px] text-slate-400">الآن</span></div></div><strong className="mt-4 block text-sm">{form.title || "عنوان الإشعار"}</strong><p className="mt-1 text-xs leading-6 text-slate-600">{form.body || "سيظهر نص الإشعار هنا."}</p></div></div><div className="rounded-2xl border border-sky-100 bg-sky-50 p-5"><p className="text-xs font-black text-sky-700">الجمهور المتوقع</p><p className="mt-2 text-sm font-black text-sky-950">{estimateText}</p><p className="mt-2 text-xs leading-6 text-sky-800">يتم الإرسال فقط إلى الأجهزة النشطة والمفعلة، ولا يتم كشف رموز FCM.</p></div></div></section> : null}
    {!loading && tab === "campaigns" ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-900">سجل الحملات</h2><p className="mt-1 text-xs font-bold text-slate-500">الإرسال المقبول من FCM ليس تأكيدًا لوصول الرسالة أو فتحها.</p></div><button type="button" onClick={() => void load()} className="rounded-xl bg-slate-100 p-2 text-slate-600"><RefreshCw className="h-4 w-4" /></button></div><div className="mt-5 space-y-3">{(data?.campaigns || []).map((campaign) => <div key={String(campaign.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4"><div><strong className="block text-sm font-black text-slate-900">{String(campaign.title)}</strong><span className="text-xs text-slate-500">{String(campaign.type)} · {String(campaign.status)} · {campaign.createdBy && typeof campaign.createdBy === "object" ? String((campaign.createdBy as { name?: string }).name || "") : ""}</span></div><div className="flex items-center gap-3 text-xs font-bold text-slate-500"><span>نجاح: {String(campaign.successCount || 0)}</span><span>فشل: {String(campaign.failureCount || 0)}</span><span>فتح: {String(campaign.openedCount || 0)}</span></div></div>)}</div></section> : null}
    {!loading && tab === "automatic" ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-slate-900">الإشعارات التلقائية</h2><p className="mt-1 text-sm leading-7 text-slate-500">هذه قواعد معرفة مسبقًا، وتبقى متوقفة حتى يربطها حدث آمن من النظام. لا يتم تنفيذ كود مخصص من لوحة الإدارة.</p><div className="mt-5 grid gap-3">{(data?.rules || []).map((rule) => <div key={String(rule.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4"><div><strong className="block text-sm font-black text-slate-900">{String(rule.name)}</strong><p className="mt-1 text-xs text-slate-500">{String(rule.description || "")}</p><span className="mt-2 inline-block text-[11px] font-bold text-slate-400">{String(rule.triggerKey)}</span></div><button type="button" onClick={() => void toggleRule(String(rule.id), !Boolean(rule.enabled))} className={`rounded-xl px-4 py-2 text-xs font-black ${rule.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{rule.enabled ? "مفعلة" : "متوقفة"}</button></div>)}</div></section> : null}
    {!loading && tab === "devices" ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-slate-900">الأجهزة المسجلة</h2><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-right text-sm"><thead><tr className="border-b border-slate-100 text-xs text-slate-500"><th className="p-3">المستخدم</th><th className="p-3">الدور</th><th className="p-3">المنصة</th><th className="p-3">آخر نشاط</th><th className="p-3">الحالة</th><th className="p-3">إجراء</th></tr></thead><tbody>{devices.map((device) => { const user = device.user as { name?: string; role?: string } | undefined; return <tr key={String(device.id)} className="border-b border-slate-50"><td className="p-3 font-bold">{user?.name || "-"}</td><td className="p-3">{roleLabels[user?.role || ""] || user?.role}</td><td className="p-3">{String(device.platform)} · {String(device.packageName)}</td><td className="p-3 text-xs text-slate-500">{new Date(String(device.lastSeenAt)).toLocaleString("ar-SA")}</td><td className="p-3">{device.enabled ? <span className="text-emerald-600">نشط</span> : <span className="text-slate-400">معطل</span>}</td><td className="p-3"><button type="button" disabled={!device.enabled} onClick={() => void revokeDevice(String(device.id))} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-40">تعطيل</button></td></tr>; })}</tbody></table></div></section> : null}
  </div>;
}
