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
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-slate-900">
            خطوات الخدمة
          </p>

          <p className="mt-1 text-xs text-slate-400">
            تنقل سريع بين خطوات الـ Workflow
          </p>
        </div>

        <p className="text-sm font-bold text-slate-400">
          {currentStep + 1} / {steps.length}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {steps.map((step, index) => {
          const active = index === currentStep;

          return (
            <button
              key={step.stepId}
              type="button"
              onClick={() => onSelectStep(index)}
              className="group flex items-center gap-3"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-black transition ${
                  active
                    ? "border-sky-600 bg-sky-600 text-white shadow-lg"
                    : step.isCompleted
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-500 hover:border-sky-300"
                }`}
              >
                {index + 1}
              </div>

              <div className="hidden sm:block">
                <p
                  className={`text-sm font-bold transition ${
                    active
                      ? "text-sky-700"
                      : "text-slate-500 group-hover:text-slate-700"
                  }`}
                >
                  {step.title}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {step.completed} / {step.total}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}