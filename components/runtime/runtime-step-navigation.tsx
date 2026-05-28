type RuntimeStepNavigationProps = {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
};

export function RuntimeStepNavigation({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
}: RuntimeStepNavigationProps) {
  return (
    <div className="sticky bottom-4 z-20 mt-10 flex items-center justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-2xl backdrop-blur">
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentStep === 0}
        className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
      >
        الخطوة السابقة
      </button>

      <div className="text-center">
        <p className="text-sm font-bold text-slate-500">
          Step {currentStep + 1} / {totalSteps}
        </p>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={currentStep >= totalSteps - 1}
        className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-40"
      >
        الخطوة التالية
      </button>
    </div>
  );
}