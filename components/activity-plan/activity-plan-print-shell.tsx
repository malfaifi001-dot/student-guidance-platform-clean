import type { ReactNode } from "react";

import {
  ActivityPlanDocumentPage,
} from "@/components/document-engine/designs/activity-plan/activity-plan-document-page";
import { curriculumDocumentIdentityStyles } from "@/components/curriculum-distribution/curriculum-document-identity";

export const ACTIVITY_PLAN_PRINT_SUBTITLE = "الفصل الدراسي الأول — 1448هـ";

export const activityPlanPrintShellStyles = `
${curriculumDocumentIdentityStyles}
@page { size: A4 landscape; margin: 0; }
* { box-sizing: border-box; }
.activity-plan-print-root { direction: rtl; width: 100%; }
.activity-plan-print-page {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 297mm;
  height: 210mm !important;
  min-height: 210mm !important;
  max-height: 210mm !important;
  margin: 0 auto;
  padding: 6mm 7mm 5mm !important;
  overflow: hidden !important;
  background: #fff;
  break-inside: auto;
  page-break-inside: auto;
  break-after: auto;
  page-break-after: auto;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.activity-plan-print-page--physical {
  height: 210mm !important;
  min-height: 210mm !important;
  max-height: 210mm !important;
  box-sizing: border-box;
  overflow: hidden !important;
  break-after: page;
  page-break-after: always;
}
.activity-plan-print-page--physical:last-child {
  break-after: auto;
  page-break-after: auto;
}
.activity-plan-print-group { break-after: page; page-break-after: always; }
.activity-plan-print-group:last-child { break-after: auto; page-break-after: auto; }
@media screen {
  .activity-plan-print-page + .activity-plan-print-page {
    margin-top: 8mm !important;
  }
}
@media print {
  .activity-plan-print-page + .activity-plan-print-page {
    margin-top: 0 !important;
  }
}
.activity-plan-print-page-content {
  width: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
}
.activity-plan-print-page-content[data-activity-plan-content] { overflow: hidden; }
.activity-plan-print-page-content > .weekly-plan-a4,
.activity-plan-print-page-content > .ten-percent-plan-a4 {
  flex: 1 1 auto;
}
.activity-plan-print-page.activity-plan-ten-percent-print-page {
  background: #F8FAFC;
}
.activity-plan-print-footer-slot {
  width: 100%;
  min-height: 29mm;
  flex: 0 0 29mm;
  margin-top: auto;
  break-before: avoid-page;
  page-break-before: avoid;
  break-inside: avoid-page;
  page-break-inside: avoid;
}
.activity-plan-print-footer-slot .curriculum-print-footer {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: static !important;
  inset: auto !important;
  width: 100%;
  margin: 0 !important;
  padding-top: 1mm !important;
  break-inside: avoid-page;
  page-break-inside: avoid;
}
.activity-plan-print-footer-slot .curriculum-print-signature-row {
  width: 170mm;
  min-height: 25mm;
  align-items: end;
  gap: 18mm;
  padding: 0 1mm 1.4mm;
  break-inside: avoid;
  page-break-inside: avoid;
}
.activity-plan-print-footer-slot .curriculum-print-signature--image-first {
  grid-template-rows: 16mm .25mm 3.6mm auto;
  align-items: end;
  justify-items: center;
  gap: .45mm;
  text-align: center;
}
.activity-plan-print-footer-slot .curriculum-print-signature-baseline {
  display: block;
  width: 76%;
  min-height: .25mm;
  background: #8ca3a0;
}
.activity-plan-print-footer-slot .curriculum-print-signature-image {
  width: auto;
  max-width: 58mm;
  height: 16mm;
  max-height: 16mm;
  object-fit: contain;
}
.activity-plan-print-footer-slot .curriculum-print-footer-line {
  flex: 0 0 1.7mm;
  margin-top: auto;
}
.activity-plan-print-page--compact-footer .activity-plan-print-footer-slot {
  min-height: 5mm;
  flex-basis: 5mm;
}
.activity-plan-print-measurement { position: fixed; inset: 0 auto auto -10000px; visibility: hidden; pointer-events: none; }
.activity-plan-print-page--compact-footer .curriculum-print-footer {
  padding-top: 0 !important;
}
@media print {
  html, body { margin: 0 !important; padding: 0 !important; }
  .activity-plan-print-page {
    display: flex !important;
    height: 210mm !important;
    min-height: 210mm !important;
    max-height: 210mm !important;
    margin: 0 !important;
    overflow: hidden !important;
  }
  .activity-plan-print-page--physical {
    height: 210mm !important;
    min-height: 210mm !important;
    max-height: 210mm !important;
    overflow: hidden !important;
  }
  .activity-plan-print-footer-slot .curriculum-print-footer {
    position: static !important;
    inset: auto !important;
  }
}

/* Semester plans use measured row pagination; keep the normal case compact
   enough to use the available A4 height without reducing the text size. */
.activity-plan-semester-table th,
.activity-plan-semester-table td {
  padding: 1.45mm 1.1mm !important;
}
.activity-plan-semester-table th {
  line-height: 1.25 !important;
}
.activity-plan-semester-table td {
  line-height: 1.25 !important;
}
.activity-plan-semester-table tbody tr {
  break-inside: avoid-page !important;
  page-break-inside: avoid !important;
}
.activity-plan-semester-title {
  margin-top: 2.5mm !important;
  margin-bottom: 2.5mm !important;
  padding: 1.8mm 2.5mm !important;
}
.activity-plan-semester-title h1 {
  font-size: 14pt !important;
}
.activity-plan-semester-title span {
  font-size: 9pt !important;
}
.activity-plan-semester-domain-list {
  gap: .8mm !important;
}
.activity-plan-semester-domain {
  padding: .7mm 1.1mm !important;
}
`;

type ActivityPlanPrintPageProps = {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function ActivityPlanPrintPage({
  children,
  footer,
  className = "",
  contentClassName = "",
}: ActivityPlanPrintPageProps) {
  return (
    <ActivityPlanDocumentPage
      className={className}
      contentClassName={contentClassName}
      footer={footer}
      flow={false}
    >
      {children}
    </ActivityPlanDocumentPage>
  );
}
