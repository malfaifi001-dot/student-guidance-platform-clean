"use client";

import { useEffect, useState } from "react";
import { Edit3 } from "lucide-react";
import { SmartActionModal } from "@/components/ui/smart-action-modal";
import { ACTIVITY_PLAN_OTHER_PROGRAM_VALUE } from "@/lib/activity-plan/activity-plan-program-value";
import { ACTIVITY_PROGRAM_DOMAINS } from "@/lib/activity-programs/activity-program-catalog";
import { formatActivityPlanHijriDate } from "@/lib/activity-plan/activity-plan-date-format";

type Program = { value: string; label: string; isOther: boolean };
type Item = { domainServiceSlug: string; domainTitle: string; programs: Array<{ value: string; name: string; isOther: boolean }> };
type Week = { id: string | null; stage: string; weekNumber: number; dateFrom: string; dateTo: string; periodCount: number | null; items: Item[] };

function dateLabel(value: string) {
  return formatActivityPlanHijriDate(value);
}

export function WeeklyActivityPlanPanel({ stage }: { stage: string }) {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [editing, setEditing] = useState<Week | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!stage) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/activity-plan/weekly?stage=${encodeURIComponent(stage)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تعذر تحميل الخطة الفصلية.");
      setWeeks(payload.weeks || []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تحميل الخطة الفصلية."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [stage]);

  return <>
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-[820px] w-full border-collapse text-right">
        <thead className="bg-sky-50 text-sm font-black text-slate-700"><tr><th className="border-b border-l p-3">الأسبوع</th><th className="border-b border-l p-3">من</th><th className="border-b border-l p-3">إلى</th><th className="border-b border-l p-3">المجال والبرامج</th><th className="border-b border-l p-3">عدد الحصص</th><th className="border-b p-3">إجراء</th></tr></thead>
        <tbody>{weeks.map((week) => <tr key={week.weekNumber} className="align-top hover:bg-slate-50"><th className="border-b border-l p-3 text-center text-lg font-black text-sky-800">{week.weekNumber}</th><td className="border-b border-l p-3 text-sm font-bold" dir="ltr">{dateLabel(week.dateFrom)}</td><td className="border-b border-l p-3 text-sm font-bold" dir="ltr">{dateLabel(week.dateTo)}</td><td className="border-b border-l p-3"><div className="space-y-2">{week.items.length ? week.items.map((item) => <div key={item.domainServiceSlug} className="rounded-xl bg-slate-50 p-2"><p className="text-sm font-black text-slate-800">{item.domainTitle}</p><p className="mt-1 text-xs font-bold text-slate-600">{item.programs.map((program) => program.name).join("، ")}</p></div>) : <span className="text-xs font-bold text-slate-400">لم تتم إضافة برامج</span>}</div></td><td className="border-b border-l p-3 text-center text-sm font-black">{week.periodCount ?? "—"}</td><td className="border-b p-3 text-center"><button type="button" onClick={() => { setError(""); setEditing(week); }} className="inline-flex items-center gap-1 rounded-xl bg-sky-100 px-3 py-2 text-xs font-black text-sky-800"><Edit3 className="h-4 w-4" />تعديل</button></td></tr>)}</tbody>
      </table>
    </div>
    {loading ? <p className="py-4 text-center text-xs font-black text-slate-400">جار تحميل الخطة الفصلية...</p> : null}
    {error ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-black text-rose-700">{error}</p> : null}
    <WeeklyActivityPlanModal week={editing} onClose={() => setEditing(null)} onSaved={(next) => { setWeeks((current) => current.map((week) => week.weekNumber === next.weekNumber ? next : week)); setEditing(null); }} />
  </>;
}

function WeeklyActivityPlanModal({ week, onClose, onSaved }: { week: Week | null; onClose: () => void; onSaved: (week: Week) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [periodCount, setPeriodCount] = useState("");
  const [options, setOptions] = useState<Record<string, Program[]>>({});
  const [manual, setManual] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!week) return;
    setItems(week.items);
    setPeriodCount(week.periodCount == null ? "" : String(week.periodCount));
    setManual(Object.fromEntries(week.items.flatMap((item) => item.programs.filter((program) => program.isOther).map((program) => [item.domainServiceSlug, program.name]))));
    setError("");
  }, [week]);

  const toggleDomain = async (serviceSlug: string) => {
    if (items.some((item) => item.domainServiceSlug === serviceSlug)) {
      setItems((current) => current.filter((item) => item.domainServiceSlug !== serviceSlug));
      return;
    }
    const response = await fetch(`/api/dashboard/activity-plan/program-options?serviceSlug=${encodeURIComponent(serviceSlug)}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error || "تعذر تحميل برامج المجال."); return; }
    setOptions((current) => ({ ...current, [serviceSlug]: payload.options || [] }));
    setItems((current) => [...current, { domainServiceSlug: serviceSlug, domainTitle: ACTIVITY_PROGRAM_DOMAINS.find((domain) => domain.serviceSlug === serviceSlug)?.title || serviceSlug, programs: [] }]);
  };

  const toggleProgram = (serviceSlug: string, program: Program) => setItems((current) => current.map((item) => item.domainServiceSlug !== serviceSlug ? item : { ...item, programs: item.programs.some((selected) => selected.value === program.value) ? item.programs.filter((selected) => selected.value !== program.value) : [...item.programs, { value: program.value, name: program.isOther ? manual[serviceSlug] || "" : program.label, isOther: program.isOther }] }));

  const save = async () => {
    if (!week) return;
    setSaving(true); setError("");
    try {
      const normalizedItems = items.map((item) => ({ ...item, programs: item.programs.map((program) => program.isOther ? { ...program, name: manual[item.domainServiceSlug] || "" } : program) }));
      const response = await fetch("/api/dashboard/activity-plan/weekly", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: week.stage, weekNumber: week.weekNumber, periodCount, items: normalizedItems }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تعذر حفظ الأسبوع.");
      onSaved(payload.plan);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر حفظ الأسبوع."); }
    finally { setSaving(false); }
  };

  if (!week) return null;
  return <SmartActionModal open title={`تعديل الخطة الفصلية · الأسبوع ${week.weekNumber}`} description={`${dateLabel(week.dateFrom)} — ${dateLabel(week.dateTo)}`} portal onClose={onClose} showFooter={false}><div className="space-y-4"><div><p className="mb-2 text-sm font-black text-slate-700">المجالات</p><div className="grid gap-2 sm:grid-cols-2">{ACTIVITY_PROGRAM_DOMAINS.map((domain) => <label key={domain.serviceSlug} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold"><input type="checkbox" checked={items.some((item) => item.domainServiceSlug === domain.serviceSlug)} onChange={() => void toggleDomain(domain.serviceSlug)} />{domain.title}</label>)}</div></div>{items.map((item) => <div key={item.domainServiceSlug} className="rounded-xl bg-slate-50 p-3"><p className="mb-2 text-sm font-black">{item.domainTitle}</p><div className="grid gap-2 sm:grid-cols-2">{(options[item.domainServiceSlug] || []).map((program) => <label key={program.value} className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={item.programs.some((selected) => selected.value === program.value)} onChange={() => toggleProgram(item.domainServiceSlug, program)} />{program.label}</label>)}</div>{item.programs.some((program) => program.value === ACTIVITY_PLAN_OTHER_PROGRAM_VALUE) ? <input value={manual[item.domainServiceSlug] || ""} onChange={(event) => setManual((current) => ({ ...current, [item.domainServiceSlug]: event.target.value }))} placeholder="اسم البرنامج الآخر" className="mt-3 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold" /> : null}</div>)}<label className="block text-sm font-black">عدد الحصص (اختياري)<input type="number" min="0" value={periodCount} onChange={(event) => setPeriodCount(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-bold" /></label>{error ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-black text-rose-700">{error}</p> : null}<div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => void save()} disabled={saving} className="h-11 rounded-xl bg-sky-700 text-sm font-black text-white disabled:opacity-50">{saving ? "جار الحفظ..." : "حفظ الأسبوع"}</button><button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-slate-200 text-sm font-black">إلغاء</button></div></div></SmartActionModal>;
}
