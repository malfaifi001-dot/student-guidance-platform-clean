import type {
  ReportValueGridProps,
  ReportValueItem,
} from "../report-design-component-types";

import {
  classifyReportSmartField,
  getReportSmartFieldProfile,
} from "../../smart-layout/report-smart-field-layout";

const SECTION_HEADER_COLORS = [
  "#fee8a8",
  "#ececec",
  "#dce7f7",
  "#e1efd9",
] as const;

function getDisplayValue(
  item: ReportValueItem,
) {
  if (
    Array.isArray(item.valueItems) &&
    item.valueItems.length
  ) {
    return item.valueItems.join(
      " • ",
    );
  }

  if (Array.isArray(item.value)) {
    return item.value.join(" • ");
  }

  return String(
    item.value || "—",
  );
}

export function MoeClassicFrameValueGrid({
  items,
}: ReportValueGridProps) {
  const visibleItems =
    items.filter(
      (item) =>
        String(
          item.label || "",
        ).trim() ||
        String(
          getDisplayValue(item),
        ).trim(),
    );

  if (!visibleItems.length) {
    return null;
  }

  const profile =
    getReportSmartFieldProfile(
      visibleItems,
    );

  return (
    <div
      dir="rtl"
      className="report-classic-smart-grid"
      data-moe-classic-value-grid
      data-report-smart-role="fields"
      data-smart-field-profile={profile}
    >
      {visibleItems.map(
        (item, index) => {
          const kind =
            classifyReportSmartField(
              item,
            );

          const headerColor =
            SECTION_HEADER_COLORS[
              index %
                SECTION_HEADER_COLORS.length
            ];

          return (
            <div
              key={
                item.key ||
                item.label ||
                index
              }
              className="report-classic-smart-field-item min-w-0 break-inside-avoid"
              data-smart-field-kind={kind}
              style={{
                breakInside: "avoid",
                pageBreakInside:
                  "avoid",
              }}
            >
              <table className="h-full w-full table-fixed border-collapse">
                <thead>
                  <tr>
                    <th
                      className="border border-[#263238] text-center font-black text-[#17242b]"
                      style={{
                        background:
                          headerColor,

                        paddingInline:
                          "calc(0.48rem * var(--report-table-spacing-scale, 1))",

                        paddingBlock:
                          "calc(0.9mm * var(--report-table-spacing-scale, 1))",

                        fontSize:
                          "calc(10.5px * var(--report-field-label-scale, 1))",

                        lineHeight:
                          "calc(1.1rem * var(--report-narrative-density-scale, 1))",
                      }}
                    >
                      {item.label ||
                        "البيان"}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td
                      className="border border-[#263238] bg-white text-center font-bold text-[#1e293b]"
                      style={{
                        paddingInline:
                          "calc(0.5rem * var(--report-table-spacing-scale, 1))",

                        paddingBlock:
                          kind === "long" ||
                          kind === "list"
                            ? "calc(0.8mm * var(--report-table-spacing-scale, 1))"
                            : "calc(0.8mm * var(--report-table-spacing-scale, 1))",

                        fontSize:
                          "calc(10.5px * var(--report-field-value-scale, 1))",

                        lineHeight:
                          "var(--report-content-line-height, 1.55)",

                        whiteSpace:
                          "normal",

                        overflowWrap:
                          "anywhere",

                        verticalAlign:
                          "middle",
                      }}
                    >
                      {getDisplayValue(
                        item,
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        },
      )}
    </div>
  );
}
