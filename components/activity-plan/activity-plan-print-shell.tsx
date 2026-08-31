import type { ReactNode } from "react";

export const activityPlanPrintShellStyles = `
@page { size: A4 landscape; margin: 0; }
* { box-sizing: border-box; }
.activity-plan-print-root { direction: rtl; width: 100%; }
.activity-plan-print-page {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 297mm;
  height: auto !important;
  min-height: 210mm !important;
  max-height: none !important;
  margin: 0 auto;
  padding: 6mm 7mm 5mm !important;
  overflow: visible !important;
  background: #fff;
  break-inside: auto;
  page-break-inside: auto;
  break-after: auto;
  page-break-after: auto;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.activity-plan-print-page--physical {
  break-after: page;
  page-break-after: always;
}
.activity-plan-print-page--physical:last-child {
  break-after: auto;
  page-break-after: auto;
}
.activity-plan-print-page--flow {
  display: block;
  break-after: auto;
  page-break-after: auto;
}
.activity-plan-print-page--flow .activity-plan-print-page-content {
  min-height: 199mm;
}
.activity-plan-print-page-content {
  width: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;
}
.activity-plan-print-page-content > .weekly-plan-a4,
.activity-plan-print-page-content > .ten-percent-plan-a4 {
  flex: 1 0 auto;
}
.activity-plan-print-page.activity-plan-ten-percent-print-page {
  background: #F8FAFC;
}
.activity-plan-print-page-content .curriculum-print-footer {
  position: static !important;
  inset: auto !important;
  width: 100%;
  margin-top: auto !important;
  padding-top: 1.5mm !important;
  break-before: avoid-page;
  page-break-before: avoid;
  break-inside: avoid-page;
  page-break-inside: avoid;
}
.activity-plan-print-page-content .curriculum-print-signature-row {
  break-inside: avoid;
  page-break-inside: avoid;
}
.activity-plan-print-page-content .weekly-plan-a4 > div:last-child {
  flex: 0 0 auto;
  margin-top: auto !important;
}
.activity-plan-print-footer-slot {
  width: 100%;
  flex: 0 0 auto;
  margin-top: auto;
  break-before: avoid-page;
  page-break-before: avoid;
  break-inside: avoid-page;
  page-break-inside: avoid;
}
.activity-plan-print-footer-slot .curriculum-print-footer {
  position: static !important;
  inset: auto !important;
  width: 100%;
  margin: 0 !important;
  padding-top: 1.5mm !important;
  break-inside: avoid-page;
  page-break-inside: avoid;
}
.activity-plan-print-footer-slot .curriculum-print-signature-row {
  break-inside: avoid;
  page-break-inside: avoid;
}
@media print {
  html, body { margin: 0 !important; padding: 0 !important; }
  .activity-plan-print-page {
    display: flex !important;
    height: auto !important;
    min-height: 210mm !important;
    max-height: none !important;
    margin: 0 !important;
    overflow: visible !important;
  }
  .activity-plan-print-page--flow {
    display: block !important;
    min-height: 210mm !important;
  }
  .activity-plan-print-page--flow .activity-plan-print-page-content {
    min-height: 199mm !important;
  }
  .activity-plan-print-footer-slot .curriculum-print-footer {
    position: static !important;
    inset: auto !important;
  }
}
`;

type ActivityPlanPrintPageProps = {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function ActivityPlanPrintPage({ children, footer, className = "", contentClassName = "" }: ActivityPlanPrintPageProps) {
  return (
    <section className={`activity-plan-print-page ${className}`.trim()} dir="rtl">
      <div className={`activity-plan-print-page-content ${contentClassName}`.trim()}>{children}</div>
      {footer ? <div className="activity-plan-print-footer-slot">{footer}</div> : null}
    </section>
  );
}
