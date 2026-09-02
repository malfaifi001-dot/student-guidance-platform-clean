"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkflowSearchResult } from "@/lib/workflow-search/workflow-search-types";
import { WorkflowSearchPanel } from "./workflow-search-panel";

export function WorkflowSearchTrigger({ mobile = false }: { mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => { const handler = (event: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) close(); }; document.addEventListener("mousedown", handler); return () => document.removeEventListener("mousedown", handler); }, [close]);
  function select(result: WorkflowSearchResult) { close(); router.push(result.href); }
  return <div ref={wrapperRef} className="relative"><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="dialog" aria-label="البحث" className={mobile ? "grid h-14 w-14 -translate-y-5 place-items-center rounded-full bg-sky-700 text-white shadow-lg ring-4 ring-[#f5f8fc] transition hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 dark:ring-[#050816]" : "inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-600 shadow-sm transition hover:border-sky-200 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-sky-500/50"}><Search className="h-5 w-5" />{!mobile ? <span className="hidden xl:inline">بحث</span> : null}</button>{mobile ? <span className="-mt-4 block text-[11px] font-black text-sky-700 dark:text-sky-300">البحث</span> : null}{open ? <WorkflowSearchPanel mobile={mobile} onClose={close} onSelect={select} /> : null}</div>;
}
