import type { ReactNode } from "react";

type CertificateWizardActionRowProps = {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryIcon?: ReactNode;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export function CertificateWizardActionRow({
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  primaryIcon,
  secondaryLabel,
  onSecondary,
}: CertificateWizardActionRowProps) {
  return (
    <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      {secondaryLabel && onSecondary ? (
        <button
          type="button"
          onClick={onSecondary}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base font-black text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 sm:w-auto"
        >
          {secondaryLabel}
        </button>
      ) : (
        <span aria-hidden="true" className="hidden sm:block" />
      )}

      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 px-5 py-3 text-base font-black text-white transition hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {primaryLabel}
        {primaryIcon}
      </button>
    </div>
  );
}
