"use client";

import { useEffect, useMemo, useRef } from "react";

import {
  DEFAULT_SELECTABLE_REPORT_DESIGN_ID,
  ReportDesignRenderer,
  type ReportDesignId,
} from "@/components/report-engine/design-renderers/report-design-renderer";
import { isReportDesignId } from "@/components/report-engine/design-renderers/report-design-registry";
import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";
import type {
  ReportOneEditableBlock,
  ReportOneEditableField,
  ReportOneEditorPage,
  ReportOneEvidenceSettings,
  ReportOneTemplateInfo,
} from "./report-one-editor-types";

type ReportOneTemplatePreviewProps = {
  title: string;
  template: ReportOneTemplateInfo | null;
  payload: SmartReportPayload;
  fields: ReportOneEditableField[];
  blocks: ReportOneEditableBlock[];
  pages: ReportOneEditorPage[];
  evidenceSettings: ReportOneEvidenceSettings;
  activePageId: string;
  activeBlockId?: string;
  onActivePageChange: (pageId: string) => void;
  onAddPage: () => void;
  onDeletePage?: (pageId: string) => void;
  onPageOverflow?: (pageId: string) => void;
  onActiveBlockChange?: (blockId: string) => void;
};

type ReportOnePreviewCase = {
  found: boolean;
  caseId: string;
  serviceSlug: string;
  serviceName: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  student: {
    name?: string;
    nationalId?: string;
    grade?: string;
    classroom?: string;
    stage?: string;
    guardianName?: string;
    guardianPhone?: string;
  };
  values: Array<{
    fieldKey: string;
    fieldLabel: string;
    value: string;
  }>;
  evidences: Array<{
    id: string;
    title: string;
    fileUrl?: string;
    imageUrl?: string;
    caption?: string;
  }>;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}


function getEvidenceLayoutFromReportOneSettings(
  settings: ReportOneEvidenceSettings,
) {
  if (settings.perPage === 1) return "ONE_PER_PAGE";
  if (settings.perPage === 4) return "GRID_2X2";

  return "TWO_PER_PAGE";
}

function applyReportOneEvidenceSettingsToBlock(
  block: any,
  settings: ReportOneEvidenceSettings,
) {
  return {
    ...block,
    evidenceLayout: getEvidenceLayoutFromReportOneSettings(settings),
    evidenceFit: settings.fit,
    evidenceAspectRatio: settings.aspectRatio,
    evidenceShowCaptions: settings.showCaptions,
    evidenceAutoCreatePages: true,
    evidenceEmptyBehavior: settings.enabled ? "message" : "hide",
    evidenceImageWidthMm: settings.imageWidthMm,
    evidenceImageHeightMm: settings.imageHeightMm,
    evidenceGapMm: settings.gapMm,
  };
}
function getPayloadAny(payload: SmartReportPayload) {
  return payload as any;
}

function getTemplateJson(template: ReportOneTemplateInfo | null) {
  return asRecord(template?.templateJson);
}

function getTemplateSource(template: ReportOneTemplateInfo | null) {
  const templateJson = getTemplateJson(template);
  const smartStudio = asRecord(templateJson.smartStudio);

  return Object.keys(smartStudio).length ? smartStudio : templateJson;
}

function normalizeReportOneEvidenceUrl(value: unknown) {
  const url = cleanText(value).replaceAll("\\", "/");

  if (!url) return "";
  if (url.startsWith("http://")) return url;
  if (url.startsWith("https://")) return url;
  if (url.startsWith("data:")) return url;
  if (url.startsWith("/")) return url;

  return `/${url.replace(/^public\//, "")}`;
}

function isReportOneImageEvidence(item: any, url: string) {
  const mimeType = cleanText(item.mimeType || item.contentType || item.type);

  if (mimeType.startsWith("image/")) return true;

  return /\.(png|jpg|jpeg|webp|gif|bmp|svg)$/i.test(url);
}

function normalizeReportOneEvidenceItem(item: any, index: number) {
  const rawUrl =
    item.imageUrl ||
    item.fileUrl ||
    item.url ||
    item.publicUrl ||
    item.path ||
    item.src ||
    item.href ||
    "";

  const fileUrl = normalizeReportOneEvidenceUrl(rawUrl);
  const imageUrl = normalizeReportOneEvidenceUrl(item.imageUrl) || fileUrl;
  const isImage = isReportOneImageEvidence(item, imageUrl || fileUrl);

  return {
    id: cleanText(item.id) || `evidence-${index + 1}`,
    title:
      cleanText(item.title || item.fileName || item.name) ||
      `شاهد ${index + 1}`,
    fileUrl,
    imageUrl: isImage ? imageUrl || fileUrl : imageUrl || fileUrl,
    caption: cleanText(item.caption || item.note || item.description || item.title),
  };
}

function collectReportOneEvidences(data: any) {
  const candidates = [
    data?.evidence?.items,
    data?.evidence?.evidences,
    data?.evidenceItems,
    data?.evidences,
    data?.attachments,
    data?.files,
    data?.caseInfo?.evidence?.items,
    data?.caseInfo?.evidenceItems,
    data?.caseInfo?.evidences,
    data?.caseInfo?.attachments,
  ];

  const collected: any[] = [];

  candidates.forEach((candidate) => {
    if (Array.isArray(candidate)) {
      collected.push(...candidate);
      return;
    }

    if (candidate && typeof candidate === "object") {
      const record = candidate as Record<string, any>;

      if (Array.isArray(record.items)) {
        collected.push(...record.items);
      }

      if (Array.isArray(record.evidences)) {
        collected.push(...record.evidences);
      }
    }
  });

  const seen = new Set<string>();

  return collected
    .map((item, index) => normalizeReportOneEvidenceItem(item, index))
    .filter((item) => item.fileUrl || item.imageUrl)
    .filter((item) => {
      const signature = `${item.id}-${item.fileUrl}-${item.imageUrl}`;

      if (seen.has(signature)) return false;

      seen.add(signature);
      return true;
    });
}

function getFirstTextBlock(blocks: ReportOneEditableBlock[]) {
  return (
    blocks.find((block) => block.type === "PARAGRAPH" && cleanText(block.body)) ||
    blocks.find((block) => block.type === "BULLET_LIST" && cleanText(block.body))
  );
}

function convertReportOneBlockToStudioBlock(
  block: ReportOneEditableBlock,
  evidenceSettings: ReportOneEvidenceSettings,
) {
  if (block.type === "TABLE") {
    return {
      id: `report-1-${block.id}`,
      kind: "report-one-table",
      title: block.title,
      content: "",
      variant: "card",
      source: "manual",
      showTitle: true,
      showMeta: false,
      align: "right",
      placement: "flow",
      columns: block.columns || [],
      rows: block.rows || [],
      tableSettings: block.tableSettings,
    };
  }

  if (block.type === "BULLET_LIST") {
    return {
      id: `report-1-${block.id}`,
      kind: "bullet-list",
      title: block.title,
      content: block.body || "",
      variant: "card",
      source: "manual",
      showTitle: true,
      showMeta: false,
      align: "right",
      placement: "flow",
    };
  }

  if (block.type === "EVIDENCE") {
    return {
      id: `report-1-${block.id}`,
      kind: "evidence-gallery",
      title: block.title || "الشواهد والمرفقات",
      content: "",
      variant: "card",
      source: "manual",
      showTitle: true,
      showMeta: false,
      align: "right",
      placement: "flow",
      evidenceLayout: getEvidenceLayoutFromReportOneSettings(evidenceSettings),
      evidenceFit: evidenceSettings.fit,
      evidenceAspectRatio: evidenceSettings.aspectRatio,
      evidenceShowCaptions: evidenceSettings.showCaptions,
      evidenceAutoCreatePages: true,
      evidenceEmptyBehavior: evidenceSettings.enabled ? "message" : "hide",
      evidenceImageWidthMm: evidenceSettings.imageWidthMm,
      evidenceImageHeightMm: evidenceSettings.imageHeightMm,
      evidenceGapMm: evidenceSettings.gapMm,
    };
  }

  return {
    id: `report-1-${block.id}`,
    kind: "section-text",
    title: block.title,
    content: block.body || "",
    variant: "card",
    source: "manual",
    showTitle: true,
    showMeta: false,
    align: "right",
    placement: "flow",
  };
}

function createFallbackSourcePage(page: ReportOneEditorPage, index: number) {
  return {
    id: page.id || `report-one-fallback-${index + 1}`,
    kind: "content",
    title: page.title || `صفحة ${index + 1}`,
    description: "صفحة محتوى report-1.",
    blocks: [],
  };
}

function createFallbackPages(
  blocks: ReportOneEditableBlock[],
  pages: ReportOneEditorPage[],
  evidenceSettings: ReportOneEvidenceSettings,
) {
  const safePages = pages.length
    ? pages
    : [
        {
          id: "report-one-page-1",
          title: "1. صفحة العنوان والمحتوى",
          kind: "content" as const,
          sourceTemplatePageId: null,
        },
      ];

  return safePages.map((page, pageIndex) => {
    const pageBlocks = blocks.filter(
      (block) => (block.pageId || safePages[0].id) === page.id,
    );

    return {
      ...createFallbackSourcePage(page, pageIndex),
      blocks: [
        ...(pageIndex === 0
          ? [
              {
                id: "report-1-title",
                kind: "hero-title",
                title: "عنوان التقرير",
                content: "{{case.title}}",
                variant: "hero",
                source: "manual",
                showTitle: false,
                showMeta: true,
                align: "center",
                placement: "flow",
              },
              {
                id: "report-1-fields",
                kind: "dynamic-fields",
                title: "حقول ديناميكية من الحالة",
                content: "",
                variant: "soft",
                source: "manual",
                showTitle: true,
                showMeta: false,
                align: "right",
                placement: "flow",
              },
            ]
          : []),
        ...pageBlocks.map((block) =>
          convertReportOneBlockToStudioBlock(block, evidenceSettings),
        ),
      ],
    };
  });
}

function injectReportOneBlocksIntoPages(
  sourcePages: any[],
  blocks: ReportOneEditableBlock[],
  pages: ReportOneEditorPage[],
  evidenceSettings: ReportOneEvidenceSettings,
) {
  if (!sourcePages.length) {
    return createFallbackPages(blocks, pages, evidenceSettings);
  }

  const safePages = pages.length
    ? pages
    : sourcePages.map((page, index) => ({
        id: cleanText(page.id) || `report-one-template-page-${index + 1}`,
        title: cleanText(page.title) || `صفحة ${index + 1}`,
        kind: "admin" as const,
        sourceTemplatePageId: cleanText(page.id) || null,
      }));

  return safePages.map((page, pageIndex) => {
    const sourcePage =
      sourcePages.find((item: any) => cleanText(item.id) === cleanText(page.sourceTemplatePageId || page.id)) ||
      sourcePages[pageIndex];

    const existingBlocks = asArray(sourcePage?.blocks);

    const safeExistingBlocks = existingBlocks
      .filter((block: any) => !cleanText(block.id).startsWith("report-1-"))
      .filter((block: any) => evidenceSettings.enabled || block.kind !== "evidence-gallery")
      .map((block: any) =>
        block.kind === "evidence-gallery"
          ? applyReportOneEvidenceSettingsToBlock(block, evidenceSettings)
          : block,
      );

    const shouldAddDynamicFields =
      pageIndex === 0 &&
      !safeExistingBlocks.some(
        (block: any) =>
          block.kind === "dynamic-fields" ||
          block.settings?.smartBlockKind === "dynamic-fields",
      );

    const pageBlocks = blocks.filter(
      (block) => (block.pageId || safePages[0]?.id) === page.id,
    );

    return {
      ...(sourcePage || createFallbackSourcePage(page, pageIndex)),
      id: page.id,
      title: page.title,
      kind: sourcePage?.kind || page.kind || "content",
      blocks: [
        ...safeExistingBlocks,
        ...(shouldAddDynamicFields
          ? [
              {
                id: "report-1-auto-dynamic-fields",
                kind: "dynamic-fields",
                title: "حقول ديناميكية من الحالة",
                content: "",
                variant: "soft",
                source: "manual",
                showTitle: true,
                showMeta: false,
                align: "right",
                placement: "flow",
              },
            ]
          : []),
        ...pageBlocks.map((block) =>
          convertReportOneBlockToStudioBlock(block, evidenceSettings),
        ),
      ],
    };
  });
}

function getAdminStudioTemplate(
  template: ReportOneTemplateInfo | null,
  blocks: ReportOneEditableBlock[],
  pages: ReportOneEditorPage[],
  evidenceSettings: ReportOneEvidenceSettings,
) {
  const templateJson = getTemplateJson(template);
  const source = getTemplateSource(template);
  const sourcePages = asArray(source.pages);

  return {
    id: template?.id || "report-1-template",
    name: template?.name || "قالب التقرير",
    description: template?.description || "",
    designTemplateId:
      cleanText(source.designTemplateId) ||
      cleanText(templateJson.designTemplateId) ||
      DEFAULT_SELECTABLE_REPORT_DESIGN_ID,
    pages: injectReportOneBlocksIntoPages(
      sourcePages,
      blocks,
      pages,
      evidenceSettings,
    ),
  };
}

function buildRuntimeContext(
  title: string,
  payload: SmartReportPayload,
  fields: ReportOneEditableField[],
  blocks: ReportOneEditableBlock[],
) {
  const data = getPayloadAny(payload);
  const student = data.student || data.caseInfo?.student || {};
  const firstTextBlock = getFirstTextBlock(blocks);

  const context: Record<string, string> = {
    "case.id": cleanText(data.caseInfo?.id),
    "case.title": cleanText(title || data.caseInfo?.title || data.title),
    "case.status": cleanText(data.caseInfo?.status),
    "case.createdAt": cleanText(data.caseInfo?.createdAt),
    "case.updatedAt": cleanText(data.caseInfo?.updatedAt),

    "service.name": cleanText(data.service?.name),
    "service.slug": cleanText(data.service?.slug),

    "student.name": cleanText(student.name || student.fullName),
    "student.grade": cleanText(student.grade),
    "student.classroom": cleanText(student.classroom),
    "student.stage": cleanText(student.stage),
    "student.guardianName": cleanText(student.guardianName),
    "student.guardianPhone": cleanText(student.guardianPhone),

    "identity.ministryName": cleanText(data.identity?.ministryName || "وزارة التعليم"),
    "identity.educationDepartment": cleanText(data.identity?.educationDepartment || "الإدارة العامة للتعليم"),
    "identity.educationOffice": cleanText(data.identity?.educationOffice || ""),
    "identity.schoolName": cleanText(data.identity?.schoolName || ""),
    "identity.counselorName": cleanText(data.identity?.counselorName || ""),
    "identity.principalName": cleanText(data.identity?.principalName || ""),

    "report.title": cleanText(title),
    "report.narrative": cleanText(firstTextBlock?.body || data.narrative?.body),
    "evidence.count": String(collectReportOneEvidences(data).length || 0),
  };

  fields.forEach((field, index) => {
    const key = cleanText(field.key) || `field-${index + 1}`;
    const label = cleanText(field.label);
    const value = cleanText(field.value);

    context[`field.${key}`] = value;
    context[key] = value;

    if (label) {
      context[`field.${label}`] = value;
      context[label] = value;
    }
  });

  return context;
}

function buildPreviewCase(
  title: string,
  payload: SmartReportPayload,
  fields: ReportOneEditableField[],
  evidenceSettings: ReportOneEvidenceSettings,
): ReportOnePreviewCase {
  const data = getPayloadAny(payload);
  const student = data.student || data.caseInfo?.student || {};
  const evidences = evidenceSettings.enabled
    ? collectReportOneEvidences(data)
    : [];

  return {
    found: true,
    caseId: cleanText(data.caseInfo?.id),
    serviceSlug: cleanText(data.service?.slug),
    serviceName: cleanText(data.service?.name),
    title: cleanText(title || data.caseInfo?.title || data.title),
    status: cleanText(data.caseInfo?.status),
    createdAt: cleanText(data.caseInfo?.createdAt),
    updatedAt: cleanText(data.caseInfo?.updatedAt),
    student: {
      name: cleanText(student.name || student.fullName),
      nationalId: cleanText(student.nationalId),
      grade: cleanText(student.grade),
      classroom: cleanText(student.classroom),
      stage: cleanText(student.stage),
      guardianName: cleanText(student.guardianName),
      guardianPhone: cleanText(student.guardianPhone),
    },
    values: fields.map((field, index) => ({
      fieldKey: `${cleanText(field.key) || "field"}_${index + 1}`,
      fieldLabel: cleanText(field.label) || `حقل ${index + 1}`,
      value: cleanText(field.value),
    })),
    evidences,
  };
}


function createReportOneEvidenceVirtualPages({
  basePage,
  evidenceBlock,
  evidencesCount,
  perPage,
  startFromFirst = false,
}: {
  basePage: any;
  evidenceBlock: any;
  evidencesCount: number;
  perPage: number;
  startFromFirst?: boolean;
}) {
  const pagesCount = Math.ceil(evidencesCount / perPage);
  const firstPageNumber = startFromFirst ? 1 : 2;
  const totalPages = startFromFirst ? pagesCount : pagesCount - 1;

  if (!basePage || !evidenceBlock || totalPages <= 0) {
    return [];
  }

  return Array.from({ length: totalPages }).map((_, index) => {
    const pageNumber = firstPageNumber + index;
    const startIndex = (pageNumber - 1) * perPage;

    return {
      ...basePage,
      id: `${basePage.id}-report-one-evidence-${pageNumber}`,
      title:
        pageNumber === 1
          ? evidenceBlock.title || "الشواهد والمرفقات"
          : `${evidenceBlock.title || "الشواهد والمرفقات"} - صفحة ${pageNumber}`,
      kind: "report-one-evidence",
      sourceTemplatePageId: basePage.id,
      reportOneVirtualEvidencePage: true,
      blocks: [
        {
          ...evidenceBlock,
          id: `${evidenceBlock.id}-report-one-evidence-${pageNumber}`,
          title:
            pageNumber === 1
              ? evidenceBlock.title || "الشواهد والمرفقات"
              : `${evidenceBlock.title || "الشواهد والمرفقات"} - صفحة ${pageNumber}`,
          evidenceStartIndex: startIndex,
          evidenceLimit: perPage,
          evidenceAutoCreatePages: false,
        },
      ],
    };
  });
}

function getReportOneEvidencePerPage(settings: ReportOneEvidenceSettings) {
  return settings.perPage || 2;
}
function normalizeDesignId(value: unknown): ReportDesignId {
  const designId = cleanText(value);

  if (isReportDesignId(designId)) return designId;

  return DEFAULT_SELECTABLE_REPORT_DESIGN_ID;
}

export function ReportOneTemplatePreview({
  title,
  template,
  payload,
  fields,
  blocks,
  pages,
  evidenceSettings,
  activePageId,
  onActivePageChange,
  onAddPage,
  onDeletePage,
  onPageOverflow,
}: ReportOneTemplatePreviewProps) {
  const hostRef = useRef<HTMLElement | null>(null);
  const lastOverflowSignatureRef = useRef("");

  const adminTemplate = useMemo(
    () => getAdminStudioTemplate(template, blocks, pages, evidenceSettings),
    [template, blocks, pages, evidenceSettings],
  );

  const context = useMemo(
    () => buildRuntimeContext(title, payload, fields, blocks),
    [title, payload, fields, blocks],
  );

  const previewCase = useMemo(
    () => buildPreviewCase(title, payload, fields, evidenceSettings),
    [title, payload, fields, evidenceSettings],
  );
  const pagesWithEvidenceTabs = useMemo(() => {
    const nextPages: any[] = [];
    const perPage = getReportOneEvidencePerPage(evidenceSettings);
    const evidencesCount = previewCase.evidences.length;

    adminTemplate.pages.forEach((page: any) => {
      const pageBlocks = Array.isArray(page.blocks) ? page.blocks : [];
      const evidenceBlock = pageBlocks.find(
        (block: any) => block.kind === "evidence-gallery",
      );

      const hasContentBeforeEvidence = evidenceBlock
        ? pageBlocks.some((block: any) => block.id !== evidenceBlock.id)
        : false;

      const shouldMoveEvidenceToOwnPage =
        Boolean(evidenceBlock) &&
        evidenceSettings.enabled &&
        evidencesCount > 0 &&
        hasContentBeforeEvidence;

      const baseEvidenceBlock = evidenceBlock
        ? {
            ...evidenceBlock,
            evidenceStartIndex: 0,
            evidenceLimit: perPage,
            evidenceAutoCreatePages: false,
          }
        : null;

      const normalizedPage = evidenceBlock
        ? {
            ...page,
            blocks: shouldMoveEvidenceToOwnPage
              ? pageBlocks.filter((block: any) => block.id !== evidenceBlock.id)
              : pageBlocks.map((block: any) =>
                  block.id === evidenceBlock.id ? baseEvidenceBlock : block,
                ),
          }
        : page;

      nextPages.push(normalizedPage);

      if (baseEvidenceBlock && evidenceSettings.enabled) {
        nextPages.push(
          ...createReportOneEvidenceVirtualPages({
            basePage: normalizedPage,
            evidenceBlock: baseEvidenceBlock,
            evidencesCount,
            perPage,
            startFromFirst: shouldMoveEvidenceToOwnPage,
          }),
        );
      }
    });

    return nextPages;
  }, [adminTemplate.pages, evidenceSettings, previewCase.evidences.length]);

  const runtimeTemplate = {
    ...adminTemplate,
    pages: pagesWithEvidenceTabs,
  };

  const activePage =
    runtimeTemplate.pages.find((page: any) => page.id === activePageId) ||
    runtimeTemplate.pages[0];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const pageElement = hostRef.current?.querySelector(".pdf-report-page") as HTMLElement | null;

      if (!pageElement || !onPageOverflow || !activePage?.id) return;

      const overflowPixels = pageElement.scrollHeight - pageElement.clientHeight;

      if (overflowPixels <= 12) return;

      const pageBlocks = blocks.filter(
        (block) => (block.pageId || pages[0]?.id) === activePage.id,
      );

      if (!pageBlocks.length) return;

      const signature = [
        activePage.id,
        overflowPixels,
        pageBlocks.map((block) => `${block.id}:${block.title}:${block.body || ""}`).join("|"),
      ].join("::");

      if (lastOverflowSignatureRef.current === signature) return;

      lastOverflowSignatureRef.current = signature;
      onPageOverflow(activePage.id);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [activePage?.id, blocks, fields, pages, title, onPageOverflow]);

  return (
    <section ref={hostRef} className="report-one-a4-host rounded-[2rem] bg-slate-100 p-5">
      <style>{`
        .report-one-a4-host {
          overflow-x: auto;
        }

        .report-one-a4-host .pdf-report-page {
          position: relative !important;
          width: 210mm !important;
          min-width: 210mm !important;
          max-width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          margin-left: auto !important;
          margin-right: auto !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          border: 1.5px solid #94a3b8 !important;
          outline: 6px solid rgba(15, 23, 42, 0.04) !important;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16) !important;
          break-after: page !important;
          page-break-after: always !important;
          aspect-ratio: 210 / 297 !important;
        }

        .report-one-a4-host .pdf-report-page::after {
          content: "";
          position: absolute;
          left: 8mm;
          right: 8mm;
          bottom: 5mm;
          height: 0;
          border-bottom: 2px solid rgba(15, 23, 42, 0.18);
          pointer-events: none;
        }
.report-one-a4-host .pdf-report-page:last-child {
          break-after: auto !important;
          page-break-after: auto !important;
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          .report-one-a4-host {
            padding: 0 !important;
            background: #ffffff !important;
          }

          .report-one-a4-host .pdf-report-page {
            margin: 0 !important;
            box-shadow: none !important;
            outline: 0 !important;
            border-radius: 0 !important;
            border: 0 !important;
          }

          .report-one-a4-host .pdf-report-page::after {
            display: none !important;
          }
        }
      `}</style>

      {activePage && activePage.kind === "manual" && !activePage.reportOneVirtualEvidencePage ? (
        <div className="mb-3 flex justify-end print:hidden">
          <button
            type="button"
            onClick={() => onDeletePage?.(activePage.id)}
            className="rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-100"
          >
            حذف الصفحة الحالية
          </button>
        </div>
      ) : null}

      <ReportDesignRenderer
        suppressAutoEvidencePages
        designId={normalizeDesignId(adminTemplate.designTemplateId)}
        template={runtimeTemplate}
        activePage={activePage}
        activePageId={activePage?.id || activePageId}
        context={context}
        previewCase={previewCase}
        onActivePageChange={onActivePageChange}
        onAddPage={onAddPage}
      />
    </section>
  );
}
