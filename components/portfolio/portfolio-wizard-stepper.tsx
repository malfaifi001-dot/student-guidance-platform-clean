"use client";

import { Check } from "lucide-react";
import { useEffect, useRef } from "react";

export type PortfolioWizardStep = {
  id: string;
  label: string;
};

export function PortfolioWizardStepper({
  steps,
  activeStepId,
  onStepChange,
  completedStepIds,
}: {
  steps: readonly PortfolioWizardStep[];
  activeStepId: string;
  onStepChange: (stepId: string) => void;
  completedStepIds?: readonly string[];
}) {
  const activeIndex = steps.findIndex((step) => step.id === activeStepId);
  const activeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeStepId]);

  return (
    <nav aria-label="خطوات إعداد ملف الإنجاز" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="-mx-1 overflow-x-auto px-1 pb-1 md:hidden" style={{ scrollbarWidth: "thin" }}>
        <ol className="flex min-w-max items-start gap-2">
          {steps.map((step, index) => {
            const active = step.id === activeStepId;
            const completed = !active && (completedStepIds
              ? completedStepIds.includes(step.id)
              : index < activeIndex);

            return (
              <li key={step.id} className="w-[76px] shrink-0">
                <button
                  type="button"
                  aria-current={active ? "step" : undefined}
                  aria-label={`الخطوة ${index + 1}: ${step.label}${completed ? "، مكتملة" : active ? "، الحالية" : ""}`}
                  onClick={() => onStepChange(step.id)}
                  className="group flex w-full flex-col items-center gap-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                >
                  <span className={`grid h-7 w-7 place-items-center rounded-full border text-[10px] font-black transition-colors ${active ? "border-teal-700 bg-teal-700 text-white" : completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 bg-slate-50 text-slate-400 group-hover:border-teal-300 group-hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900"}`}>
                    {completed ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                  </span>
                  <span className={`max-w-full truncate text-[10px] font-black ${active ? "text-teal-800 dark:text-teal-300" : completed ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"}`}>
                    {step.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <ol className="hidden items-center md:flex">
        {steps.map((step, index) => {
          const active = step.id === activeStepId;
          const completed = !active && (completedStepIds
            ? completedStepIds.includes(step.id)
            : index < activeIndex);

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center last:flex-none">
              <button
                ref={active ? activeButtonRef : undefined}
                type="button"
                data-guidance={step.id === "reports" ? "teacher-portfolio-reports-tab" : undefined}
                aria-current={active ? "step" : undefined}
                aria-label={`الخطوة ${index + 1}: ${step.label}${completed ? "، مكتملة" : active ? "، الحالية" : ""}`}
                onClick={() => onStepChange(step.id)}
                className="group flex min-w-0 flex-1 flex-col items-center gap-1.5 px-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                <span className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-black transition-colors ${active ? "border-teal-700 bg-teal-700 text-white" : completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 bg-slate-50 text-slate-400 group-hover:border-teal-300 group-hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900"}`}>
                  {completed ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                </span>
                <span className={`max-w-28 truncate text-[11px] font-black ${active ? "text-teal-800 dark:text-teal-300" : completed ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"}`}>
                  {step.label}
                </span>
              </button>
              {index < steps.length - 1 ? <span aria-hidden="true" className={`h-px min-w-3 flex-1 ${index < activeIndex ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-800"}`} /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
