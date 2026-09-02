"use client";

import { Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { WorkflowSearchResult } from "@/lib/workflow-search/workflow-search-types";
import { WorkflowSearchResults } from "./workflow-search-results";

export function WorkflowSearchPanel({ onClose, onSelect, mobile = false }: { onClose: () => void; onSelect: (result: WorkflowSearchResult) => void; mobile?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkflowSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const trimmed = query.trim();
    setError(false);
    if (trimmed.length < 2) { setResults([]); setLoading(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try { const response = await fetch(`/api/dashboard/workflow-search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal, cache: "no-store" }); const data = await response.json(); if (!response.ok || !data.success) throw new Error("search"); setResults(data.results || []); }
      catch (reason) { if ((reason as { name?: string })?.name !== "AbortError") { setResults([]); setError(true); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [onClose]);
  return <div className={mobile ? "fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[70] max-h-[75dvh] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950" : "absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(92vw,34rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"}><div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800"><Search className="h-5 w-5 shrink-0 text-sky-600" /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن تقرير، خدمة أو إجراء..." className="h-10 min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white" aria-label="البحث عن تقرير أو خدمة أو إجراء" />{loading ? <Loader2 className="h-4 w-4 animate-spin text-sky-600" /> : <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="إغلاق البحث"><X className="h-4 w-4" /></button>}</div>{query.trim().length < 2 ? <p className="px-4 py-6 text-center text-xs font-bold text-slate-400">اكتب حرفين على الأقل لبدء البحث.</p> : error ? <p className="px-4 py-6 text-center text-sm font-bold text-slate-500">تعذر تنفيذ البحث حاليًا.</p> : <WorkflowSearchResults results={results} onSelect={onSelect} />}</div>;
}
