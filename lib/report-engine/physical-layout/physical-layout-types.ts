import type { LogicalReportBlock } from "@/components/report-engine/design-renderers/smart-layout/report-smart-table-pagination";

/**
 * ============================================================
 * PHYSICAL LAYOUT ENGINE — CORE CONTRACTS
 * ============================================================
 *
 * القاعدة الأساسية:
 *
 * Logical Page !== Physical A4 Page
 *
 * Studio يملك Logical Pages.
 * Physical Layout Engine وحده يملك Physical Pages.
 * Final Renderer يرسم فقط ولا يعيد Pagination.
 */

export type PhysicalLayoutBlockRole =
  | "fixed"
  | "content"
  | "evidence"
  | "signature";

export type PhysicalLayoutPageRole =
  | "content"
  | "evidence"
  | "content-evidence"
  | "evidence-signature"
  | "signature";

/**
 * الصفحة القادمة من Studio / Template.
 */
export type PhysicalLayoutSourcePage = {
  id: string;
  title: string;
  kind: string;
  blocks: LogicalReportBlock[];
};

/**
 * Logical Page بعد تصنيف البلوكات.
 *
 * لا يوجد أي قرار A4 Pagination هنا.
 */
export type PhysicalLayoutLogicalPage = {
  sourcePageId: string;
  sourcePageTitle: string;
  kind: string;

  fixedBlocks: LogicalReportBlock[];
  regularBlocks: LogicalReportBlock[];
  evidenceBlocks: LogicalReportBlock[];
  signatureBlocks: LogicalReportBlock[];
};

/**
 * نتيجة القياس التي يجب لاحقًا تجميدها مع Physical Page.
 */
export type PhysicalLayoutFrozenSettings = {
  candidate: string | null;
  density: string | null;
  fieldLayout: string | null;
};

/**
 * Physical A4 Page النهائية.
 *
 * كل صفحة فيزيائية تنتمي إلى Logical Page واحدة فقط.
 */
export type PhysicalLayoutPage = {
  id: string;
  title: string;
  kind: string;

  role: PhysicalLayoutPageRole;

  blocks: LogicalReportBlock[];

  /**
   * المصدر الرسمي الجديد.
   */
  sourceLogicalPageId: string;

  /**
   * Compatibility فقط حتى تنتهي إعادة الكتابة.
   *
   * يجب أن تحتوي عنصرًا واحدًا فقط يساوي sourceLogicalPageId.
   */
  sourcePageIds: string[];

  physicalPageIndex: number;
  physicalIndexWithinLogicalPage: number;

  containsEvidence: boolean;
  containsSignature: boolean;

  /**
   * ستصبح إلزامية عند اكتمال Measurement Runtime الجديد.
   */
  frozenLayout?: PhysicalLayoutFrozenSettings;
};

export type PhysicalLayoutMeasurement = {
  fits: boolean;
  overflowPx: number;

  blockOverflowPx?: number;
  scrollOverflowPx?: number;
  boundingOverflowPx?: number;
  mainContentOverflowPx?: number;

  candidate?: string;
  density?: string;
  fieldLayout?: string;
};

export type PhysicalLayoutPlan = {
  pages: PhysicalLayoutPage[];
  fingerprint: string;
  frozen: true;
};

export type PhysicalLayoutPolicy = {
  contentNeverDrops: true;
  evidenceNeverDrops: true;
  signatureNeverDrops: true;

  singleLogicalPagePerPhysicalPage: true;

  finalRendererNeverPaginates: true;

  /**
   * إذا انتقل التوقيع إلى صفحة جديدة ويوجد شاهد،
   * لا يبقى التوقيع وحيدًا متى كان نقل شاهد ممكنًا.
   */
  keepEvidenceWithLonelySignature: boolean;
};

export type PhysicalLayoutCandidate = {
  sourcePageId: string;
  sourcePageTitle: string;
  kind: string;

  blocks: LogicalReportBlock[];

  role: PhysicalLayoutPageRole;
};

export type PhysicalLayoutMeasureCandidate = (
  candidate: PhysicalLayoutCandidate,
) => Promise<PhysicalLayoutMeasurement>;