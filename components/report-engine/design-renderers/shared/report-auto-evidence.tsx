import type { ReportDesignId } from "../report-design-types";
import { A4DesignPage } from "./report-blocks";
import {
  getEvidencePerPage,
  getValidPreviewEvidences,
} from "./report-evidence-data";
import type { PreviewCaseData } from "./report-types";

export function AutoEvidencePages({
  designId,
  activePage,
  context,
  previewCase,
  primaryEvidenceCount,
}: {
  designId: ReportDesignId;
  activePage?: any;
  context: Record<string, string>;
  previewCase: PreviewCaseData | null;

  /**
   * Number of evidence items already consumed by the
   * primary content page.
   *
   * When omitted we preserve the legacy behavior:
   * the first page consumes getEvidencePerPage().
   */
  primaryEvidenceCount?: number;
}) {
  const evidenceBlock =
    activePage?.blocks?.find(
      (block: any) =>
        block?.kind ===
        "evidence-gallery",
    );

  if (
    !activePage ||
    !evidenceBlock ||
    evidenceBlock.evidenceAutoCreatePages ===
      false
  ) {
    return null;
  }

  const evidences =
    getValidPreviewEvidences(
      previewCase,
    );

  if (!evidences.length) {
    return null;
  }

  const perPage =
    getEvidencePerPage(
      evidenceBlock,
    );

  const legacyPrimaryCount =
    Math.min(
      evidences.length,
      perPage,
    );

  const consumedByPrimary =
    Number.isFinite(
      Number(primaryEvidenceCount),
    )
      ? Math.min(
          evidences.length,
          Math.max(
            0,
            Math.floor(
              Number(
                primaryEvidenceCount,
              ),
            ),
          ),
        )
      : legacyPrimaryCount;

  const remainingCount =
    Math.max(
      0,
      evidences.length -
        consumedByPrimary,
    );

  if (remainingCount <= 0) {
    return null;
  }

  const extraPagesCount =
    Math.ceil(
      remainingCount / perPage,
    );

  return (
    <div
      className="mt-6 space-y-6"
      data-report-auto-evidence-pages
      data-report-evidence-consumed-primary={
        consumedByPrimary
      }
      data-report-evidence-remaining={
        remainingCount
      }
    >
      {Array.from({
        length: extraPagesCount,
      }).map((_, index) => {
        const pageNumber =
          index + 2;

        const startIndex =
          consumedByPrimary +
          index * perPage;

        const remainingForPage =
          evidences.length -
          startIndex;

        const pageEvidenceLimit =
          Math.min(
            perPage,
            remainingForPage,
          );

        const virtualPage = {
          ...activePage,

          id: `${activePage.id}-evidence-auto-${pageNumber}`,

          title: `${activePage.title} - صفحة ${pageNumber}`,

          kind: "evidence",

          blocks: [
            {
              ...evidenceBlock,

              id: `${evidenceBlock.id}-auto-${pageNumber}`,

              title:
                index === 0 &&
                consumedByPrimary === 0
                  ? evidenceBlock.title
                  : `${evidenceBlock.title} - صفحة ${pageNumber}`,

              evidenceStartIndex:
                startIndex,

              evidenceLimit:
                pageEvidenceLimit,

              /*
               * The composer is already creating the complete
               * evidence continuation sequence.
               * Prevent recursive AutoEvidencePages.
               */
              evidenceAutoCreatePages:
                false,
            },
          ],
        };

        return (
          <A4DesignPage
            key={virtualPage.id}
            designId={designId}
            page={virtualPage}
            context={context}
            previewCase={
              previewCase
            }
            pageLabel={`صفحة شواهد ${pageNumber}`}
          />
        );
      })}
    </div>
  );
}