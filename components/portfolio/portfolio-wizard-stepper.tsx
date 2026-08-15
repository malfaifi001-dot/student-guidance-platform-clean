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
    <nav
      aria-label="خطوات إعداد ملف الإنجاز"
      className="overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white px-3 py-5 shadow-sm [scrollbar-width:thin] md:px-5"
    >
      <ol className="flex min-w-max items-start md:min-w-full">
        {steps.map((step, index) => {
          const active = step.id === activeStepId;
          const completed = !active && (completedStepIds
            ? completedStepIds.includes(step.id)
            : index < activeIndex);

          return (
            <li key={step.id} className="flex min-w-32 flex-1 items-start last:flex-none md:last:flex-1">
              <button
                ref={active ? activeButtonRef : undefined}
                type="button"
                data-guidance={step.id === "reports" ? "teacher-portfolio-reports-tab" : undefined}
                aria-current={active ? "step" : undefined}
                aria-label={`الخطوة ${index + 1}: ${step.label}${completed ? "، مكتملة" : active ? "، الحالية" : ""}`}
                onClick={() => onStepChange(step.id)}
                className="group flex w-28 shrink-0 flex-col items-center gap-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-4 md:w-32"
              >
                <span
                  className={`grid h-11 w-11 place-items-center rounded-full border-2 text-sm font-black transition-all ${
                    active
                      ? "scale-110 border-teal-700 bg-teal-700 text-white shadow-lg shadow-teal-200 ring-4 ring-teal-50"
                      : completed
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-100"
                        : "border-slate-200 bg-slate-50 text-slate-400 group-hover:border-teal-300 group-hover:text-teal-700"
                  }`}
                >
                  {completed ? <Check className="h-5 w-5" strokeWidth={3} /> : index + 1}
                </span>
                <span className={`max-w-28 text-xs font-black leading-5 ${active ? "text-teal-800" : completed ? "text-emerald-700" : "text-slate-400"}`}>
                  {step.label}
                </span>
                {active ? <span className="text-[10px] font-black text-teal-600">الخطوة الحالية</span> : null}
              </button>

              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`mt-5 h-0.5 min-w-5 flex-1 rounded-full transition-colors ${index < activeIndex ? "bg-emerald-500" : "bg-slate-200"}`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
