"use client";

import { useEffect, useState } from "react";

type Template = { id: string; name: string; title: string; body: string; route: string; category?: string | null; enabled: boolean };

export function PushTemplatesPanel({ templates, onChanged }: { templates: Template[]; onChanged: () => void }) {
  const [form, setForm] = useState({ name: "", title: "", body: "", route: "/dashboard", category: "عام" });
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    const response = await fetch("/api/dashboard/admin/notifications/templates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (response.ok) { setForm({ name: "", title: "", body: "", route: "/dashboard", category: "عام" }); onChanged(); }
  }
  return <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">إنشاء قالب</h2>
      <div className="mt-4 space-y-3">
        {([["name", "اسم داخلي"], ["title", "العنوان"], ["route", "المسار"]] as const).map(([key, label]) => <label key={key} className="block space-y-1"><span className="text-xs font-black text-slate-600">{label}</span><input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold" /></label>)}
        <label className="block space-y-1"><span className="text-xs font-black text-slate-600">النص</span><textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} rows={4} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold" /></label>
        <button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">حفظ القالب</button>
      </div>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-slate-900">القوالب المحفوظة</h2><div className="mt-4 space-y-3">{templates.length ? templates.map((template) => <div key={template.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-center justify-between gap-3"><strong className="text-sm font-black">{template.name}</strong><span className="text-xs font-bold text-slate-400">{template.enabled ? "نشط" : "متوقف"}</span></div><p className="mt-2 text-sm font-bold text-slate-700">{template.title}</p><p className="mt-1 text-xs leading-6 text-slate-500">{template.body}</p></div>) : <p className="rounded-xl bg-slate-50 p-5 text-sm font-bold text-slate-500">لا توجد قوالب محفوظة.</p>}</div></div>
  </section>;
}

export function PushAnalyticsPanel() {
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/dashboard/admin/notifications/analytics", { cache: "no-store" }).then((response) => response.json()).then((result) => setAnalytics(result.analytics || null)).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500">جاري تحميل الإحصائيات...</div>;
  const value = (key: string) => Number(analytics?.[key] || 0).toLocaleString("ar-SA");
  return <section className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["الحملات", "campaigns"], ["تم قبول الإرسال", "accepted"], ["فشل الإرسال", "failed"], ["تم فتح الإشعار", "opened"], ["معدل النجاح", "successRate"], ["معدل الفتح", "openRate"]].map(([label, key]) => <div key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="text-xs font-black text-slate-500">{label}</span><strong className="mt-2 block text-2xl font-black text-slate-900">{value(key)}{key.endsWith("Rate") ? "%" : ""}</strong></div>)}</div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-slate-900">أكثر أسباب الفشل</h2><div className="mt-4 space-y-2">{Array.isArray(analytics?.byError) && analytics.byError.length ? analytics.byError.map((item) => <div key={String(item.errorCode)} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm font-bold"><span>{String(item.errorCode || "UNKNOWN")}</span><span>{String((item._count as { _all?: number })?._all || 0)}</span></div>) : <p className="text-sm font-bold text-slate-500">لا توجد أخطاء ضمن الفترة المحددة.</p>}</div></div></section>;
}

export function PushTestPanel({ devices }: { devices: Array<{ id: string; platform?: string; packageName?: string; enabled?: boolean; user?: { name?: string } }> }) {
  const [deviceId, setDeviceId] = useState("");
  const [status, setStatus] = useState("");
  async function send() {
    setStatus("جاري الإرسال...");
    const response = await fetch("/api/dashboard/admin/notifications/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ deviceId }) });
    setStatus(response.ok ? "تم إرسال الاختبار إلى الجهاز المحدد." : "تعذر إرسال الاختبار.");
  }
  return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="text-lg font-black text-amber-950">إرسال تجريبي</h2><p className="mt-1 text-xs leading-6 text-amber-800">اختر جهازًا واحدًا مسجلًا للتحقق من الإشعارات. لا يتم الإرسال إلى أجهزة أخرى.</p><div className="mt-4 flex flex-wrap gap-3"><select value={deviceId} onChange={(event) => setDeviceId(event.target.value)} className="h-10 min-w-[240px] rounded-xl border border-amber-200 bg-white px-3 text-sm font-bold"><option value="">اختر جهازًا</option>{devices.filter((device) => device.enabled).map((device) => <option key={device.id} value={device.id}>{device.user?.name || device.id} · {device.packageName || device.platform}</option>)}</select><button type="button" disabled={!deviceId} onClick={() => void send()} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">إرسال تجريبي</button></div>{status ? <p className="mt-3 text-xs font-bold text-amber-900">{status}</p> : null}</div>;
}
