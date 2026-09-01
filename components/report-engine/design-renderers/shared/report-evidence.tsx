import type { ReportDesignImplementation, ReportEvidenceItem } from "../designs/report-design-component-types";
import type { PreviewCaseData } from "./report-types";
import { createEvidencePlaceholders, getEvidenceFigureStyle, getEvidenceGridClass, getEvidenceGridStyle, getEvidenceImageClass, getEvidenceImageHeightClass, getEvidenceImageStyle, getEvidencePerPage, getReportDesignEvidenceImageUrl, getValidPreviewEvidences } from "./report-evidence-data";
import { BlockTitle } from "./report-primitives";
import { getBlockSetting } from "./report-text";
import { getBlockShellClass } from "./report-block-presentation";
import { getEvidencePresentationMode } from "@/lib/evidence/evidence-presentation";
import { EvidenceQrCode } from "./evidence-qr-code";
import { Link2 } from "lucide-react";

export function EvidenceBlock({
  block,
  previewCase,
  implementation,
  textAlign,
}: {
  block: any;
  previewCase: PreviewCaseData | null;
  implementation: ReportDesignImplementation;
  textAlign: string;
}) {
  const hasSelectedCase = Boolean(previewCase?.caseId);
  const realEvidences = getValidPreviewEvidences(previewCase);
  const perPage = getEvidencePerPage(block);
  const startIndex = block.evidenceStartIndex || 0;
  const accent = implementation.palette;

  if (!realEvidences.length && hasSelectedCase) return null;
  if (!realEvidences.length && block.evidenceEmptyBehavior === "hide") return null;

  const placeholderEvidences = createEvidencePlaceholders(perPage, startIndex);
  const sourceEvidences = realEvidences.length ? realEvidences : placeholderEvidences;
  const visibleEvidences = sourceEvidences.slice(startIndex, startIndex + perPage);
  const isPlaceholderMode = !realEvidences.length;
  const shellClassName = getBlockShellClass(implementation, block.variant, textAlign);
  const EvidenceRenderer = implementation.EvidenceRenderer;

  if (EvidenceRenderer) {
    return (
      <EvidenceRenderer
        block={block}
        items={visibleEvidences as ReportEvidenceItem[]}
        startIndex={startIndex}
        placeholderMode={isPlaceholderMode}
        textAlign={textAlign}
        shellClassName={shellClassName}
        gridClassName={getEvidenceGridClass(block)}
        gridStyle={getEvidenceGridStyle(block)}
        getImageUrl={getReportDesignEvidenceImageUrl}
        getFigureStyle={() => getEvidenceFigureStyle(block)}
        getImageStyle={() => getEvidenceImageStyle(block)}
        getImageClassName={() => getEvidenceImageClass(block)}
        getImageHeightClassName={() => getEvidenceImageHeightClass(block)}
        renderTitle={() => block.showTitle ? <BlockTitle title={block.title} fontSize={getBlockSetting(block, "titleFontSize")} /> : null}
      />
    );
  }

  if (block.evidenceLayout === "ATTACHMENT_LIST") {
    return (
      <section className={shellClassName}>
        {block.showTitle ? <BlockTitle title={block.title} fontSize={getBlockSetting(block, "titleFontSize")} /> : null}
        <div
          style={{
            display: "grid",
            gap: "var(--report-evidence-gap, 0.5rem)",
          }}
        >
          {visibleEvidences.map((evidence, index) => {
            const evidenceItem = evidence as ReportEvidenceItem;
            return (
            <div
              key={evidence.id || String(index)}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700"
              style={{
                gap: "var(--report-field-gap, 0.75rem)",
                paddingInline: "calc(1rem * var(--report-field-spacing-scale, 1))",
                paddingBlock: "calc(0.75rem * var(--report-field-spacing-scale, 1))",
                fontSize: "calc(0.875rem * var(--report-content-font-scale, 1))",
              }}
            >
              {getEvidencePresentationMode(evidenceItem) === "CLICKABLE_LINK" && (evidenceItem.url || evidenceItem.fileUrl) ? (
                <a href={String(evidenceItem.url || evidenceItem.fileUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sky-700 underline">
                  <Link2 className="h-4 w-4" />
                  {evidenceItem.caption || evidenceItem.title || "فتح الرابط"}
                </a>
              ) : getEvidencePresentationMode(evidenceItem) === "QR" && (evidenceItem.url || evidenceItem.fileUrl) ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-16 w-16 overflow-hidden rounded-lg bg-white p-1">
                    <EvidenceQrCode url={String(evidenceItem.url || evidenceItem.fileUrl)} title={evidenceItem.title || evidenceItem.caption} />
                  </span>
                  <span>{evidenceItem.caption || evidenceItem.title || `مرفق ${startIndex + index + 1}`}</span>
                </span>
              ) : (
                <span>{evidenceItem.caption || evidenceItem.title || `مرفق ${startIndex + index + 1}`}</span>
              )}
              <span className={["rounded-full px-3 py-1 text-[11px] font-black", accent.badgeClass].join(" ")}>
                {isPlaceholderMode ? "معاينة" : "شاهد"}
              </span>
            </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className={shellClassName}>
      {block.showTitle ? <BlockTitle title={block.title} fontSize={getBlockSetting(block, "titleFontSize")} /> : null}

      <div
        className={getEvidenceGridClass(block)}
        style={(() => {
          const gridStyle = getEvidenceGridStyle(block);
          const baseGap = String(gridStyle.gap || "0.75rem");

          return {
            ...gridStyle,
            gap: `calc(${baseGap} * var(--report-evidence-spacing-scale, 1))`,
          };
        })()}
      >
          {visibleEvidences.map((evidence, index) => {
            const imageUrl = getReportDesignEvidenceImageUrl(evidence);
            const presentation = getEvidencePresentationMode(evidence);
            const evidenceItem = evidence as ReportEvidenceItem;
            const evidenceUrl = String(evidenceItem.url || evidenceItem.fileUrl || evidenceItem.imageUrl || "").trim();

          return (
            <figure
              key={evidence.id || imageUrl || String(index)}
              style={getEvidenceFigureStyle(block)}
              className="break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              {imageUrl && !isPlaceholderMode ? (
                <img
                  src={imageUrl}
                  alt={evidence.title || `شاهد ${startIndex + index + 1}`}
                  style={getEvidenceImageStyle(block)}
                  className={`${getEvidenceImageClass(block)} bg-slate-50`}
                />
              ) : presentation === "QR" && evidenceUrl && !isPlaceholderMode ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-2 bg-white p-3 text-center">
                  <EvidenceQrCode url={evidenceUrl} title={evidence.title || evidence.caption} />
                  <span className="text-xs font-bold text-slate-500">امسح الرمز لفتح المرفق</span>
                </div>
              ) : presentation === "CLICKABLE_LINK" && evidenceUrl && !isPlaceholderMode ? (
                <a href={evidenceUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-48 flex-col items-center justify-center gap-3 bg-slate-50 p-4 text-center text-sm font-black text-sky-700 underline">
                  <Link2 className="h-8 w-8" />
                  <span>{evidence.title || evidence.caption || "فتح الرابط"}</span>
                </a>
              ) : (
                <div
                  data-report-design-real-evidence={isPlaceholderMode ? undefined : "true"}
                  className={`report-design-evidence-fallback ${getEvidenceImageHeightClass(block)} flex w-full flex-col items-center justify-center bg-slate-50 text-center`}
                >
                  <div className={["flex h-14 w-14 items-center justify-center rounded-2xl text-2xl", accent.iconClass].join(" ")}>📎</div>
                  <p
                    className="text-xs font-black text-slate-500"
                    style={{
                      marginTop: "var(--report-paragraph-gap, 0.75rem)",
                      fontSize: "calc(0.75rem * var(--report-caption-font-scale, 1))",
                    }}
                  >
                    {isPlaceholderMode
                      ? "مساحة شاهد للمعاينة"
                      : evidence.title || evidence.caption || "مرفق محفوظ"}
                  </p>
                </div>
              )}

              {block.evidenceShowCaptions !== false ? (
                <figcaption
                  className="max-h-12 overflow-hidden border-t border-slate-100 text-xs font-bold text-slate-600"
                  style={{
                    paddingInline: "var(--report-table-padding-x, 0.75rem)",
                    paddingBlock: "var(--report-table-padding-y, 0.5rem)",
                    fontSize: "calc(0.75rem * var(--report-evidence-caption-scale, 1))",
                    lineHeight: "var(--report-table-line-height, 1.5)",
                  }}
                >
                  {evidence.caption || evidence.title || `شاهد ${startIndex + index + 1}`}
                </figcaption>
              ) : null}
            </figure>
          );
        })}
      </div>

      {isPlaceholderMode ? (
        <p
          className={["rounded-2xl text-xs font-bold", accent.noticeClass].join(" ")}
          style={{
            marginTop: "var(--report-paragraph-gap, 0.75rem)",
            paddingInline: "var(--report-table-padding-x, 0.75rem)",
            paddingBlock: "var(--report-table-padding-y, 0.5rem)",
            fontSize: "calc(0.75rem * var(--report-caption-font-scale, 1))",
            lineHeight: "var(--report-table-line-height, 1.5)",
          }}
        >
          هذه مربعات معاينة فقط. عند اختبار Case ID يحتوي شواهد، سيتم عرض الشواهد الفعلية هنا.
        </p>
      ) : null}
    </section>
  );
}

