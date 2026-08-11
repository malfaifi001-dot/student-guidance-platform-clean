"use client";

import { CircleHelp } from "lucide-react";
import { useGuidance } from "@/components/guidance/guidance-provider";

export function GuidanceLauncher() {
  const { canReplay, replay } = useGuidance();
  if (!canReplay) return null;
  return (
    <button type="button" onClick={replay} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-sky-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-sky-300" aria-label="عرض الجولة الإرشادية" title="عرض الجولة الإرشادية">
      <CircleHelp className="h-5 w-5" />
    </button>
  );
}
