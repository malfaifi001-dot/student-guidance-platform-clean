import { CheckCircle2 } from "lucide-react";

type RuntimeProgressSidebarProps = {
  steps: Array<{
    stepId: string;
    title: string;
    percent: number;
    completed: number;
    total: number;
    isCompleted: boolean;
  }>;
  currentStep: number;
  onSelectStep: (index: number) => void;
};

export function RuntimeProgressSidebar({
  steps,
  currentStep,
  onSelectStep,
}: RuntimeProgressSidebarProps) {
  return (
    <aside className="sticky top-28 h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-black text-slate-900">خطوات الخدمة</h3>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const active = index === currentStep;

          return (
            <button
              key={step.stepId}
              type="button"
              onClick={() => onSelectStep(index)}
              className={`w-full rounded-2xl p-4 text-right transition ${
                active
                  ? "bg-sky-600 text-white shadow-lg"
                  : "bg-slate-50 text-slate-700 hover:bg-sky-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-sm font-black">
                  {index + 1}
                </span>

                {step.isCompleted ? (
                  <CheckCircle2
                    className={`h-5 w-5 ${
                      active ? "text-white" : "text-emerald-600"
                    }`}
                  />
                ) : null}
              </div>

              <p className="mt-3 text-sm font-black">{step.title}</p>

              <p className={`mt-1 text-xs ${active ? "text-sky-100" : "text-slate-400"}`}>
                {step.completed} / {step.total} مكتمل
              </p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}