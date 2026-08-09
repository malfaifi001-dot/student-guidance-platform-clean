import type { ReportDesignId } from "../report-design-types";
import type { ReportPhysicalPageModel } from "../smart-layout/report-smart-physical-types";
import { A4DesignPage } from "./report-blocks";
import {
  getEvidencePerPage,
  getEvidenceStartIndex,
  getValidPreviewEvidences,
} from "./report-evidence-data";
import type { PreviewCaseData } from "./report-types";

export type AutoEvidencePhysicalPage = {
  page: ReportPhysicalPageModel;
  pageLabel: string;
};

export function buildAutoEvidencePhysicalPages({
  activePage,
  previewCase,
  primaryEvidenceCount,
}: {
  activePage?: ReportPhysicalPageModel | null;
  previewCase: PreviewCaseData | null;
  primaryEvidenceCount?: number;
}): AutoEvidencePhysicalPage[] {
  const evidenceBlock = activePage?.blocks?.find(
    (block) => block?.kind === "evidence-gallery",
  );

  if (
    !activePage ||
    !evidenceBlock ||
    evidenceBlock.evidenceAutoCreatePages === false
  ) {
    return [];
  }

  const evidences = getValidPreviewEvidences(previewCase);

  if (!evidences.length) {
    return [];
  }

  const perPage = getEvidencePerPage(evidenceBlock);
  const initialStartIndex = getEvidenceStartIndex(evidenceBlock);
  const availableEvidenceCount = Math.max(
    0,
    evidences.length - initialStartIndex,
  );
  const legacyPrimaryCount = Math.min(availableEvidenceCount, perPage);
  const consumedByPrimary = Number.isFinite(Number(primaryEvidenceCount))
    ? Math.min(
        availableEvidenceCount,
        Math.max(0, Math.floor(Number(primaryEvidenceCount))),
      )
    : legacyPrimaryCount;
  const remainingCount = Math.max(
    0,
    availableEvidenceCount - consumedByPrimary,
  );

  if (remainingCount <= 0) {
    return [];
  }

  const extraPagesCount = Math.ceil(remainingCount / perPage);

  return Array.from({ length: extraPagesCount }).map((_, index) => {
    const pageNumber = index + 2;
    const startIndex =
      initialStartIndex + consumedByPrimary + index * perPage;
    const pageEvidenceLimit = Math.min(
      perPage,
      evidences.length - startIndex,
    );
    const page: ReportPhysicalPageModel = {
      ...activePage,
      id: `${activePage.id}-evidence-${startIndex}`,
      title: `${activePage.title} - صفحة ${pageNumber}`,
      kind: "evidence",
      corePhysicalPageId: activePage.corePhysicalPageId || activePage.id,
      physicalPageRole: "evidence",
      sourcePageIds: [...activePage.sourcePageIds],
      blocks: [
        {
          ...evidenceBlock,
          id: `${evidenceBlock.id}-auto-${startIndex}`,
          title:
            index === 0 && consumedByPrimary === 0
              ? evidenceBlock.title
              : `${evidenceBlock.title} - صفحة ${pageNumber}`,
          evidenceStartIndex: startIndex,
          evidenceLimit: pageEvidenceLimit,
          evidenceAutoCreatePages: false,
        },
      ],
    };

    return {
      page,
      pageLabel: `صفحة شواهد ${pageNumber}`,
    };
  });
}

export function AutoEvidencePages({
  designId,
  activePage,
  context,
  previewCase,
  primaryEvidenceCount,
  preparedPages,
  activePhysicalPageId,
  renderMode = "stack",
}: {
  designId: ReportDesignId;
  activePage?: ReportPhysicalPageModel;
  context: Record<string, string>;
  previewCase: PreviewCaseData | null;
  primaryEvidenceCount?: number;
  preparedPages?: AutoEvidencePhysicalPage[];
  activePhysicalPageId?: string;
  renderMode?: "single" | "stack";
}) {
  const pages = preparedPages || buildAutoEvidencePhysicalPages({
    activePage,
    previewCase,
    primaryEvidenceCount,
  });
  const visiblePages = renderMode === "stack"
    ? pages
    : pages.filter(({ page }) => page.id === activePhysicalPageId);

  if (!visiblePages.length) {
    return null;
  }

  return (
    <div
      className={
        renderMode === "stack"
          ? "mt-6 space-y-6 print:mt-0 print:space-y-0"
          : ""
      }
      data-report-auto-evidence-pages
    >
      {visiblePages.map(({ page, pageLabel }) => (
        <A4DesignPage
          key={page.id}
          designId={designId}
          page={page}
          context={context}
          previewCase={previewCase}
          pageLabel={pageLabel}
        />
      ))}
    </div>
  );
}
