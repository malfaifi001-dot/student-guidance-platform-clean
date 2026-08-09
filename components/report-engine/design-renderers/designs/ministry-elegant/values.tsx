import type {
  ReportValueGridProps,
  ReportValueItem,
} from "../report-design-component-types";

import { classifyReportSmartField } from "../../smart-layout/report-smart-field-layout";

function getValueItems(item: ReportValueItem) {
  const source = item.valueItems?.length
    ? item.valueItems
    : Array.isArray(item.value)
      ? item.value
      : [];

  return Array.from(
    new Set(source.map((value) => String(value || "").trim()).filter(Boolean)),
  );
}

function getDisplayValue(item: ReportValueItem, valueItems: string[]) {
  if (valueItems.length === 1) {
    return valueItems[0];
  }

  if (!Array.isArray(item.value)) {
    const value = String(item.value || "").trim();
    if (value) return value;
  }

  return "غير متوفر";
}

export function MinistryElegantValueGrid({ items }: ReportValueGridProps) {
  return (
    <div
      className="grid grid-cols-4 items-stretch"
      data-ministry-elegant-value-grid
      data-report-smart-field-grid
      style={{ gap: "calc(var(--report-value-grid-gap, 0.5rem) * 0.82)" }}
    >
      {items.map((item, index) => {
        const kind = classifyReportSmartField(item);
        const valueItems = getValueItems(item);
        const columnSpan = kind === "short" ? 1 : kind === "medium" ? 2 : 4;

        return (
          <div
            key={item.key || item.label || index}
            className="min-w-0 break-inside-avoid rounded-[9px] border border-[#d4e1e4] bg-white"
            data-smart-field-kind={kind}
            style={{
              gridColumn: `span ${columnSpan}`,
              minHeight: "calc(48px * var(--report-field-spacing-scale, 1))",
              paddingInline: "calc(8px * var(--report-field-spacing-scale, 1))",
              paddingTop: "calc(6px * var(--report-field-spacing-scale, 1))",
              paddingBottom: "calc(6px * var(--report-field-spacing-scale, 1))",
              breakInside: "avoid",
              pageBreakInside: "avoid",
            }}
          >
            <div
              className="flex h-full min-w-0 items-start"
              style={{ gap: "calc(8px * var(--report-field-spacing-scale, 1))" }}
            >
              <span
                aria-hidden="true"
                className="mt-[5px] h-[6px] w-[6px] shrink-0 rounded-full bg-[#0f766e]"
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              />

              <div className="min-w-0 flex-1">

            <p
              className="font-bold text-[#60747e]"
              style={{
                margin: 0,
                marginBottom: "calc(2px * var(--report-field-spacing-scale, 1))",
                fontSize: "calc(10.5px * var(--report-field-label-scale, 1))",
                lineHeight: 1.35,
              }}
            >
              {item.label}
            </p>

            {valueItems.length > 1 ? (
              <ul
                className="grid font-bold text-[#0f2a4d]"
                style={{
                  gap: "var(--report-field-value-item-gap, 0.25rem)",
                  margin: 0,
                  padding: 0,
                  fontSize: "calc(13px * var(--report-field-value-scale, 1))",
                  lineHeight: "var(--report-content-line-height, 1.55)",
                  listStyle: "none",
                }}
              >
                {valueItems.map((value, valueIndex) => (
                  <li
                    key={`${item.key || item.label}-${value}-${valueIndex}`}
                    className="flex min-w-0 items-start"
                    style={{ gap: "var(--report-field-gap, 0.4rem)" }}
                  >
                    <span className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-[#0f766e]" />
                    <span className="min-w-0 break-words">{value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p
                className="break-words font-bold text-[#0f2a4d]"
                style={{
                  margin: 0,
                  fontSize: "calc(13px * var(--report-field-value-scale, 1))",
                  lineHeight: "var(--report-content-line-height, 1.55)",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {getDisplayValue(item, valueItems)}
              </p>
            )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
