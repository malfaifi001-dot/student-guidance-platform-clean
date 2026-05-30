"use client";

type ReportPrintButtonProps = {
  label?: string;
};

export function ReportPrintButton({
  label = "طباعة / حفظ PDF",
}: ReportPrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="report-print-button"
    >
      {label}
    </button>
  );
}