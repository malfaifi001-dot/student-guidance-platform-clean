import type { ReportEvidenceRendererProps } from "../report-design-component-types";

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
              {evidence.caption || evidence.title || `مرفق ${startIndex + index + 1}`}
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
