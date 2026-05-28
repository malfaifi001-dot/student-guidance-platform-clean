type RuntimeStepNavigationProps = {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  onNext: () => void;
  onPrevious: () => void;
};

export function RuntimeStepNavigation({
  currentStep,
  totalSteps,
  canProceed,
  onNext,
  onPrevious,
}: RuntimeStepNavigationProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentStep === 0}
        className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        الخطوة السابقة
      </button>

      <div className="text-center">
        <p className="text-sm font-bold text-slate-500">
          الخطوة {currentStep + 1} / {totalSteps}
        </p>

        {!canProceed ? (
          <p className="mt-1 text-xs font-bold text-rose-500">
            أكمل الحقول المطلوبة للمتابعة
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!canProceed || currentStep >= totalSteps - 1}
        className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-40"
      >
        الخطوة التالية
      </button>
    </div>
  );
}