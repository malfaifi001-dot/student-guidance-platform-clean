"use client";

import { Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { WorkflowSearchResult } from "@/lib/workflow-search/workflow-search-types";
import { WorkflowSearchResults } from "./workflow-search-results";

type WorkflowSearchPanelProps = {
  onClose: () => void;
  onSelect: (result: WorkflowSearchResult) => void;
  mobile?: boolean;
};

export function WorkflowSearchPanel({
  onClose,
  onSelect,
  mobile = false,
}: WorkflowSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkflowSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!mobile) return;

    const updateViewport = () => {
      setViewportHeight(window.visualViewport?.height || window.innerHeight);
    };

    updateViewport();
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.addEventListener("resize", updateViewport);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, [mobile]);

  useEffect(() => {
    const trimmed = query.trim();
    setError(false);

    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/dashboard/workflow-search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error("search");
        setResults(data.results || []);
      } catch (reason) {
        if ((reason as { name?: string })?.name !== "AbortError") {
          setResults([]);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const sheetClassName = mobile
    ? "fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[71] flex max-h-[75dvh] min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"
    : "absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(92vw,34rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950";

  return (
    <>
      {mobile ? (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-x-0 top-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 bg-slate-950/30 backdrop-blur-[1px]"
          aria-label="إغلاق البحث"
        />
      ) : null}

      <div
        className={sheetClassName}
        style={
          mobile && viewportHeight
            ? { maxHeight: `${Math.max(220, viewportHeight - 110)}px` }
            : undefined
        }
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
          <Search className="h-5 w-5 shrink-0 text-sky-600" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث عن تقرير، خدمة أو إجراء..."
            className="h-10 min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            aria-label="البحث عن تقرير أو خدمة أو إجراء"
          />
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="إغلاق البحث"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [webkit-overflow-scrolling:touch]">
          {query.trim().length < 2 ? (
            <p className="px-4 py-6 text-center text-xs font-bold text-slate-400">
              اكتب حرفين على الأقل لبدء البحث.
            </p>
          ) : error ? (
            <p className="px-4 py-6 text-center text-sm font-bold text-slate-500">
              تعذر تنفيذ البحث حاليًا.
            </p>
          ) : (
            <WorkflowSearchResults
              mobile={mobile}
              results={results}
              onSelect={onSelect}
            />
          )}
        </div>
      </div>
    </>
  );
}
