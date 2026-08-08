import { cleanWorkflowDynamicText } from "./report-workflow-fields";
import {
  getReportFontSizeClass,
  getReportFontSizeMultiplier,
} from "./report-text";

export function MetaCard({
  label,
  value,
  valueItems,
  labelFontSize,
  valueFontSize,
}: {
  label: string;
  value: string;
  valueItems?: string[];
  labelFontSize?: string;
  valueFontSize?: string;
}) {
  const items = Array.isArray(valueItems)
    ? Array.from(
        new Set(
          valueItems
            .map((item) =>
              cleanWorkflowDynamicText(item),
            )
            .filter(Boolean),
        ),
      )
    : [];

  return (
    <div
      className="report-smart-meta-card"
      data-report-smart-meta-card
    >
      <p
        className={[
          "report-smart-meta-label",
          getReportFontSizeClass(
            labelFontSize,
            "text-[10px]",
          ),
          "font-black text-slate-400",
        ].join(" ")}
        style={{
          fontSize: `calc(10px * var(--report-field-label-scale, 1) * ${getReportFontSizeMultiplier(labelFontSize)})`,
          lineHeight:
            "var(--report-content-line-height, 1.55)",
        }}
      >
        {label}
      </p>

      {items.length > 1 ? (
        <ul
          className={[
            "report-smart-meta-list",
            getReportFontSizeClass(
              valueFontSize,
              "text-xs",
            ),
            "font-black text-slate-800",
          ].join(" ")}
          dir="rtl"
          style={{
            display: "grid",
            gap:
              "var(--report-field-value-item-gap, 0.4rem)",
            fontSize: `calc(0.75rem * var(--report-field-value-scale, 1) * ${getReportFontSizeMultiplier(valueFontSize)})`,
            lineHeight:
              "var(--report-content-line-height, 1.75)",
          }}
        >
          {items.map(
            (item, index) => (
              <li
                key={`${label}-${item}-${index}`}
                className="report-smart-meta-list-item flex items-start"
                style={{
                  gap:
                    "var(--report-field-gap, 0.5rem)",
                }}
              >
                <span className="report-smart-meta-bullet mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                <span>{item}</span>
              </li>
            ),
          )}
        </ul>
      ) : (
        <p
          className={[
            "report-smart-meta-value",
            getReportFontSizeClass(
              valueFontSize,
              "text-xs",
            ),
            "font-black text-slate-800",
          ].join(" ")}
          style={{
            fontSize: `calc(0.875rem * var(--report-field-value-scale, 1) * ${getReportFontSizeMultiplier(valueFontSize)})`,
            lineHeight:
              "var(--report-content-line-height, 1.75)",
          }}
        >
          {value}
        </p>
      )}
    </div>
  );
}

export function SideMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded-2xl bg-white/10"
      style={{
        padding:
          "var(--report-side-meta-padding, 0.75rem)",
      }}
    >
      <p
        className="text-[10px] font-black text-teal-100"
        style={{
          fontSize:
            "calc(10px * var(--report-caption-font-scale, 1))",
        }}
      >
        {label}
      </p>

      <p className="mt-1 text-xs font-black text-white">
        {value || "غير متوفر"}
      </p>
    </div>
  );
}

export function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded-2xl bg-white/15"
      style={{
        padding:
          "var(--report-side-meta-padding, 0.75rem)",
      }}
    >
      <p
        className="text-[10px] font-black text-cyan-100"
        style={{
          fontSize:
            "calc(10px * var(--report-caption-font-scale, 1))",
        }}
      >
        {label}
      </p>

      <p className="mt-1 text-xs font-black text-white">
        {value || "غير متوفر"}
      </p>
    </div>
  );
}

export function DesignFooter({
  text,
  barClass,
}: {
  text: string;
  barClass: string;
}) {
  return (
    <footer
      className="absolute bottom-[10mm] left-[12mm] right-[12mm]"
      style={{
        bottom:
          "var(--report-footer-bottom, 10mm)",
        left:
          "var(--report-footer-inline, 12mm)",
        right:
          "var(--report-footer-inline, 12mm)",
      }}
    >
      <div
        className={`h-1 rounded-full bg-gradient-to-l ${barClass}`}
      />

      <div
        className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-400"
        style={{
          marginTop:
            "var(--report-footer-text-gap, 0.5rem)",
          fontSize:
            "calc(11px * var(--report-caption-font-scale, 1))",
        }}
      >
        <span>منصة التوجيه الطلابي</span>
        <span>{text}</span>
      </div>

    </footer>
  );
}

export function BlockTitle({
  title,
  fontSize,
}: {
  title: string;
  fontSize?: string;
}) {
  return (
    <h3
      className={[
        getReportFontSizeClass(
          fontSize,
          "text-base",
        ),
        "font-black text-slate-950",
      ].join(" ")}
      style={{
        marginBottom:
          "var(--report-heading-gap, 0.75rem)",
        fontSize: `calc(1rem * var(--report-heading-scale, 1) * ${getReportFontSizeMultiplier(fontSize)})`,
        lineHeight:
          "var(--report-heading-line-height, 1.4)",
      }}
    >
      {title}
    </h3>
  );
}
