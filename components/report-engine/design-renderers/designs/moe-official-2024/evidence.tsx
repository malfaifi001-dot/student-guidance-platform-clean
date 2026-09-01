import type { ReportEvidenceRendererProps } from "../report-design-component-types";
import { getEvidencePresentationMode } from "@/lib/evidence/evidence-presentation";
import { EvidenceQrCode } from "../../shared/evidence-qr-code";
import { Link2 } from "lucide-react";

export function MoeOfficial2024EvidenceRenderer({
  block,
  items,
  startIndex,
  placeholderMode,
  gridStyle,
  getImageUrl,
  getFigureStyle,
  getImageStyle,
  getImageClassName,
  getImageHeightClassName,
  renderTitle,
}: ReportEvidenceRendererProps) {
  if (block.evidenceLayout === "ATTACHMENT_LIST") {
    return (
      <section className="moe24-report-section">
        {renderTitle()}
        <div
          className="moe24-evidence-grid"
          style={{ gap: "calc(5mm * var(--report-evidence-spacing-scale, 1))" }}
        >
          {items.map((evidence, index) => (
            <div key={evidence.id || String(index)} className="moe24-file-attachment">
              {getEvidencePresentationMode(evidence) === "CLICKABLE_LINK" && (evidence.url || evidence.fileUrl) ? (
                <a href={String(evidence.url || evidence.fileUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline">
                  <Link2 className="h-4 w-4" />
                  {evidence.caption || evidence.title || "فتح الرابط"}
                </a>
              ) : getEvidencePresentationMode(evidence) === "QR" && (evidence.url || evidence.fileUrl) ? (
                <EvidenceQrCode url={String(evidence.url || evidence.fileUrl)} title={evidence.title || evidence.caption} />
              ) : evidence.caption || evidence.title || `مرفق ${startIndex + index + 1}`}
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="moe24-report-section">
      {renderTitle()}
      <div
        className="moe24-evidence-grid"
        style={{
          ...gridStyle,
          gap: `calc(${String(gridStyle.gap || "5mm")} * var(--report-evidence-spacing-scale, 1))`,
        }}
      >
          {items.map((evidence, index) => {
            const imageUrl = getImageUrl(evidence);
            const presentation = getEvidencePresentationMode(evidence);
            const evidenceUrl = String(evidence.url || evidence.fileUrl || "").trim();

          return (
            <figure
              key={evidence.id || imageUrl || String(index)}
              style={getFigureStyle()}
              className="moe24-evidence-figure"
            >
              {imageUrl && !placeholderMode ? (
                <img
                  src={imageUrl}
                  alt={evidence.title || `شاهد ${startIndex + index + 1}`}
                  style={getImageStyle()}
                  className={getImageClassName()}
                />
              ) : presentation === "QR" && evidenceUrl && !placeholderMode ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-2 bg-white p-3 text-center">
                  <EvidenceQrCode url={evidenceUrl} title={evidence.title || evidence.caption} />
                  <span className="text-xs font-bold">امسح الرمز لفتح المرفق</span>
                </div>
              ) : presentation === "CLICKABLE_LINK" && evidenceUrl && !placeholderMode ? (
                <a href={evidenceUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-48 flex-col items-center justify-center gap-2 p-4 text-center font-bold underline">
                  <Link2 className="h-7 w-7" />
                  {evidence.title || evidence.caption || "فتح الرابط"}
                </a>
              ) : (
                <div
                  data-report-design-real-evidence={placeholderMode ? undefined : "true"}
                  className={`report-design-evidence-fallback ${getImageHeightClassName()} flex w-full flex-col items-center justify-center bg-transparent text-center`}
                >
                  <p>{placeholderMode ? "مساحة شاهد للمعاينة" : evidence.title || evidence.caption || "مرفق محفوظ"}</p>
                </div>
              )}

              {block.evidenceShowCaptions !== false ? (
                <figcaption
                  style={{
                    fontSize: "calc(1em * var(--report-evidence-caption-scale, 1))",
                  }}
                >
                  {evidence.caption || evidence.title || `شاهد ${startIndex + index + 1}`}
                </figcaption>
              ) : null}
            </figure>
          );
        })}
      </div>
    </section>
  );
}
