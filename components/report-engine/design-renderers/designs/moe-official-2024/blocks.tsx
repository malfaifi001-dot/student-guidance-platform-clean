import type { ReportSemanticBlockRenderProps } from "../report-design-component-types";

export function renderMoeOfficial2024BulletList({
  block,
  renderedContent,
  splitLines,
}: ReportSemanticBlockRenderProps) {
  return (
    <section className="moe24-report-section">
      {block.showTitle ? (
        <h2
          style={{
            marginBottom: "calc(2mm * var(--report-field-spacing-scale, 1))",
            fontSize: "calc(14px * var(--report-heading-scale, 1))",
          }}
        >
          {block.title}
        </h2>
      ) : null}
      <ul
        className="moe24-report-list"
        style={{
          gap: "calc(0.7mm * var(--report-field-spacing-scale, 1))",
        }}
      >
        {splitLines(renderedContent).map((line) => (
          <li
            key={line}
            style={{
              fontSize: "calc(1em * var(--report-bullet-font-scale, 1))",
            }}
          >
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function renderMoeOfficial2024Narrative({
  block,
  renderedContent,
  splitParagraphs,
}: ReportSemanticBlockRenderProps) {
  return (
    <section className="moe24-report-section">
      {block.showTitle ? (
        <h2
          style={{
            marginBottom: "calc(2mm * var(--report-field-spacing-scale, 1))",
            fontSize: "calc(14px * var(--report-heading-scale, 1))",
          }}
        >
          {block.title || "وصف التنفيذ"}
        </h2>
      ) : null}
      <div
        style={{
          display: "grid",
          gap: "calc(0.5rem * var(--report-field-spacing-scale, 1))",
        }}
      >
        {splitParagraphs(renderedContent).map((paragraph) => (
          <p
            key={paragraph}
            className="moe24-report-narrative"
            style={{
              fontSize: "calc(10.5px * var(--report-content-font-scale, 1))",
              lineHeight: "calc(1.9 * var(--report-narrative-density-scale, 1))",
            }}
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
