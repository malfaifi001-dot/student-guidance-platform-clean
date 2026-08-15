import {
  REPORT_SMART_A4_FOOTER_BOUNDARY_GAP_MM,
  REPORT_SMART_A4_TOLERANCE_PX,
  type ReportSmartA4PriorityMode,
  type ReportSmartA4Profile,
} from "./report-smart-a4-config";

export type ReportSmartA4BlockRole =
  | "fields"
  | "evidence"
  | "narrative"
  | "table"
  | "signature"
  | "title"
  | "general";

export type ReportSmartA4BlockMeasurement = {
  role: ReportSmartA4BlockRole;
  kind: string;
  heightPx: number;
  topPx: number;
  bottomPx: number;
  overflowPx: number;
};

export type ReportSmartA4Measurement = {
  fits: boolean;

  viewportHeightPx: number;
  contentHeightPx: number;

  overflowPx: number;

  blockOverflowPx: number;
  scrollOverflowPx: number;
  boundingOverflowPx: number;

  signatureHeightPx: number;
  signatureReservedPx: number;

  mainContentBottomPx: number;
  mainContentBudgetPx: number;
  mainContentOverflowPx: number;

  boundaryBottomPx: number;
  footerBoundaryUsed: boolean;

  fieldHeightPx: number;
  evidenceHeightPx: number;
  narrativeHeightPx: number;
  tableHeightPx: number;

  dominantRole: ReportSmartA4BlockRole;

  blocks: ReportSmartA4BlockMeasurement[];
};

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function getBlockRole(
  element: HTMLElement,
): ReportSmartA4BlockRole {
  if (
    element.dataset.reportPriorityBlock === "signature" ||
    element.hasAttribute("data-report-design-signature-block")
  ) {
    return "signature";
  }

  const kind = String(
    element.dataset.reportSmartBlock || "",
  ).trim();

  switch (kind) {
    case "dynamic-fields":
    case "field-list":
    case "case-meta":
    case "student-summary":
    case "service-summary":
      return "fields";

    case "evidence-gallery":
      return "evidence";

    case "multi-paragraph":
    case "closing-note":
      return "narrative";

    case "report-one-table":
    case "structured-table":
      return "table";

    case "hero-title":
    case "meta-strip":
      return "title";

    default:
      return "general";
  }
}

function sumRoleHeight(
  blocks: ReportSmartA4BlockMeasurement[],
  role: ReportSmartA4BlockRole,
) {
  return blocks
    .filter((block) => block.role === role)
    .reduce((sum, block) => sum + block.heightPx, 0);
}

export function measureReportSmartA4Layout(
  viewport: HTMLElement,
  content: HTMLElement,
  priorityMode: ReportSmartA4PriorityMode,
  profile: ReportSmartA4Profile,
): ReportSmartA4Measurement {
  const viewportRect = viewport.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();

  const localScale =
    viewport.clientHeight > 0
      ? viewportRect.height / viewport.clientHeight
      : 1;

  const safeScale =
    Number.isFinite(localScale) && localScale > 0
      ? localScale
      : 1;

  const viewportHeightPx = viewport.clientHeight;
  const footerSafeAreaMm = Math.max(
    0,
    Number(viewport.dataset.reportFooterSafeAreaMm || "0") || 0,
  );
  const footerSafeAreaPx = footerSafeAreaMm * (96 / 25.4);
  const footerBoundaryGapPx =
    REPORT_SMART_A4_FOOTER_BOUNDARY_GAP_MM * (96 / 25.4);
  const physicalPage = viewport.closest<HTMLElement>(".pdf-report-page");
  const pageFooter =
    physicalPage?.querySelector<HTMLElement>("[data-report-page-footer]") ||
    null;
  const fallbackBoundaryBottom =
    viewportRect.bottom - footerSafeAreaPx * safeScale;
  const realFooterBoundaryBottom = pageFooter
    ? pageFooter.getBoundingClientRect().top - footerBoundaryGapPx * safeScale
    : Number.POSITIVE_INFINITY;
  const boundaryBottom = Math.min(
    fallbackBoundaryBottom,
    realFooterBoundaryBottom,
  );
  const footerBoundaryUsed = Boolean(pageFooter);
  const usableViewportHeightPx = Math.max(
    0,
    Math.min(
      viewportHeightPx,
      (boundaryBottom - viewportRect.top) / safeScale,
    ),
  );

  const elements = Array.from(
    content.querySelectorAll<HTMLElement>(
      '[data-report-smart-block], [data-report-priority-block="signature"], [data-report-design-signature-block]',
    ),
  );

  const blocks = elements.map(
    (element): ReportSmartA4BlockMeasurement => {
      const rect = element.getBoundingClientRect();

      const topPx =
        (rect.top - contentRect.top) / safeScale;

      const bottomPx =
        (rect.bottom - contentRect.top) / safeScale;

      return {
        role: getBlockRole(element),
        kind: String(
          element.dataset.reportSmartBlock || "",
        ),
        heightPx: round(rect.height / safeScale),
        topPx: round(topPx),
        bottomPx: round(bottomPx),
        overflowPx: round(
          Math.max(
            0,
            (rect.bottom - boundaryBottom) / safeScale,
          ),
        ),
      };
    },
  );
  const crossesHardBoundary = elements.some(
    (element) => element.getBoundingClientRect().bottom > boundaryBottom,
  );

  const signatureBlocks = blocks.filter(
    (block) => block.role === "signature",
  );

  const nonSignatureBlocks = blocks.filter(
    (block) => block.role !== "signature",
  );

  const signatureHeightPx = signatureBlocks.reduce(
    (sum, block) => sum + block.heightPx,
    0,
  );

  /**
   * ارتفاع التوقيع يبقى Metric مفيدًا للتشخيص والسياسات،
   * لكنه لا يخصم مرة ثانية من مساحة A4.
   *
   * التوقيع موجود فعليًا داخل DOM أثناء القياس، ولذلك:
   *
   * scrollOverflowPx
   * boundingOverflowPx
   * blockOverflowPx
   *
   * تكفي لاكتشاف التجاوز الحقيقي.
   *
   * الخصم القديم كان يجعل بعض التصاميم تعتبر الصفحة ممتلئة
   * رغم وجود مساحة فعلية، ثم ينقل Planner الشواهد والتوقيع
   * إلى صفحة جديدة بلا حاجة.
   */
  const signatureReservedPx =
    priorityMode === "signature" && signatureBlocks.length
      ? signatureHeightPx + profile.signatureSafetyGapPx
      : 0;

  const mainContentBudgetPx =
    usableViewportHeightPx;

  const mainContentBottomPx = nonSignatureBlocks.reduce(
    (largest, block) =>
      Math.max(largest, block.bottomPx),
    0,
  );

  /**
   * Overflow هنا يقيس حدود A4 الحقيقية فقط.
   * لا توجد مساحة افتراضية محجوزة للتوقيع.
   */
  const mainContentOverflowPx =
    Math.max(
      0,
      mainContentBottomPx - mainContentBudgetPx,
    );

  const blockOverflowPx = blocks.reduce(
    (largest, block) =>
      Math.max(largest, block.overflowPx),
    0,
  );

  const scrollOverflowPx = Math.max(
    0,
    content.scrollHeight - viewportHeightPx,
  );

  const boundingOverflowPx = Math.max(
    0,
    (contentRect.bottom - viewportRect.bottom) / safeScale,
  );

  const overflowPx = Math.max(
    0,
    blockOverflowPx,
    scrollOverflowPx,
    boundingOverflowPx,
    mainContentOverflowPx,
  );

  const roleHeights = {
    fields: sumRoleHeight(blocks, "fields"),
    evidence: sumRoleHeight(blocks, "evidence"),
    narrative: sumRoleHeight(blocks, "narrative"),
    table: sumRoleHeight(blocks, "table"),
    signature: signatureHeightPx,
    title: sumRoleHeight(blocks, "title"),
    general: sumRoleHeight(blocks, "general"),
  };

  const dominantRole = (
    Object.entries(roleHeights) as Array<
      [ReportSmartA4BlockRole, number]
    >
  ).reduce(
    (best, current) =>
      current[1] > best[1] ? current : best,
    ["general", 0] as [
      ReportSmartA4BlockRole,
      number,
    ],
  )[0];

  return {
    fits: overflowPx <= REPORT_SMART_A4_TOLERANCE_PX,

    viewportHeightPx: round(usableViewportHeightPx),
    contentHeightPx: round(content.scrollHeight),

    overflowPx: round(overflowPx),

    blockOverflowPx: round(blockOverflowPx),
    scrollOverflowPx: round(scrollOverflowPx),
    boundingOverflowPx: round(boundingOverflowPx),

    signatureHeightPx: round(signatureHeightPx),
    signatureReservedPx: round(signatureReservedPx),

    mainContentBottomPx: round(mainContentBottomPx),
    mainContentBudgetPx: round(mainContentBudgetPx),
    mainContentOverflowPx: round(mainContentOverflowPx),

    boundaryBottomPx: round(
      (boundaryBottom - viewportRect.top) / safeScale,
    ),
    footerBoundaryUsed,

    fieldHeightPx: round(roleHeights.fields),
    evidenceHeightPx: round(roleHeights.evidence),
    narrativeHeightPx: round(roleHeights.narrative),
    tableHeightPx: round(roleHeights.table),

    dominantRole,

    blocks,
  };
}
