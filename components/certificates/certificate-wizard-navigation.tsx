type CertificateWizardStep = 1 | 2 | 3;

type CertificateWizardNavigationProps = {
  currentStep: CertificateWizardStep;
  onStepSelect?: (step: CertificateWizardStep) => void;
};

const STEPS: Array<{ number: CertificateWizardStep; label: string }> = [
  { number: 1, label: "المستفيد" },
  { number: 2, label: "الشهادة" },
  { number: 3, label: "المعاينة والإصدار" },
];

export function CertificateWizardNavigation({
  currentStep,
  onStepSelect,
}: CertificateWizardNavigationProps) {
  return (
    <nav
      aria-label="خطوات إنشاء الشهادة"
      className="mx-auto grid w-full max-w-4xl grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:gap-2"
    >
      {STEPS.map((step) => {
        const active = currentStep === step.number;
        const completed = step.number < currentStep;
        const canSelect = step.number <= currentStep && onStepSelect;

        const className = `inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-black transition sm:gap-2 sm:px-2 sm:text-sm ${
          active
            ? "bg-sky-700 text-white shadow-sm"
            : completed
              ? "bg-sky-50 text-sky-800 hover:bg-sky-100"
              : "cursor-not-allowed bg-slate-50 text-slate-400"
        }`;

        if (canSelect) {
          return (
            <button
              key={step.number}
              type="button"
              onClick={() => onStepSelect(step.number)}
              className={className}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px]">
                {completed ? "✓" : step.number}
              </span>
              <span className="truncate">{step.label}</span>
            </button>
          );
        }

        return (
          <div key={step.number} className={className} aria-current={active ? "step" : undefined}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px]">
              {completed ? "✓" : step.number}
            </span>
            <span className="truncate">{step.label}</span>
          </div>
        );
      })}
    </nav>
  );
}
