"use client";

import { Link2, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

type Target = { id: string; title: string };
type LinkValue = { id: string; targetId: string; target: Target } | null;

export function SpecialReportLinkPopCard({ caseId, role, initialLink, onChange }: { caseId: string; role: "TEACHER" | "ACTIVITY_LEADER"; initialLink: LinkValue; onChange?: (link: LinkValue) => void }) {
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [link, setLink] = useState<LinkValue>(initialLink);
  const [selected, setSelected] = useState(initialLink?.targetId || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch(`/api/dashboard/special-report/links?caseId=${encodeURIComponent(caseId)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setTargets(data.targets || []);
        setLink(data.link || null);
        setSelected(data.link?.targetId || "");
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "تعذر تحميل الأهداف."))
      .finally(() => setBusy(false));
  }, [caseId, open]);

  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/special-report/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseId, targetId: selected }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setLink(data.link || null);
      onChange?.(data.link || null);
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ الربط.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" title="ربط التقرير" aria-label="ربط التقرير" onClick={() => { setError(""); setOpen(true); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 hover:bg-sky-100"><Link2 className="h-4 w-4" />ربط التقرير</button>
    {link ? <span className="max-w-[190px] truncate rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-700" title={link.target.title}>{link.target.title}</span> : null}
    {open ? <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/50 p-4" dir="rtl" onMouseDown={(event) => event.target === event.currentTarget && !busy && setOpen(false)}><section role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-black text-sky-700">ربط التقرير</p><h2 className="mt-1 text-lg font-black text-slate-950">{role === "TEACHER" ? "اختر خدمة من خدماتك" : "اختر خدمة من خدمات النشاط"}</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">{busy && !targets.length ? <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />جار تحميل الأهداف</p> : targets.map((target) => <label key={target.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${selected === target.id ? "border-sky-500 bg-sky-50" : "border-slate-200"}`}><input type="radio" name={`special-report-target-${caseId}`} checked={selected === target.id} onChange={() => setSelected(target.id)} /><span className="min-w-0 text-sm font-black text-slate-800">{target.title}</span></label>)}</div>{error ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p> : null}<div className="mt-4 flex gap-2"><button type="button" onClick={() => setSelected("")} disabled={busy} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700">إزالة الربط</button><button type="button" onClick={() => void save()} disabled={busy || (!selected && !link)} className="flex-1 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "حفظ الربط"}</button></div></section></div> : null}
  </>;
}
