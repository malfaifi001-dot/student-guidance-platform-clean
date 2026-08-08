import type {
  ReportDesignImplementation,
  ReportValueItem,
} from "../designs/report-design-component-types";

import {
  classifyReportSmartField,
  getReportSmartFieldProfile,
} from "../smart-layout/report-smart-field-layout";

import { MetaCard } from "./report-primitives";
import { getBlockSetting } from "./report-text";

export function DesignValueGrid({
  implementation,
  items,
  block,
}: {
  implementation: ReportDesignImplementation;
  items: ReportValueItem[];
  block?: Record<string, any>;
}) {
  const profile =
    getReportSmartFieldProfile(
      items,
    );

  const ValueGrid =
    implementation.ValueGrid;

  /*
   * Custom design grids still receive the semantic profile.
   * Their own implementation may respond to the engine.
   */
  if (ValueGrid) {
    return (
      <div
        data-report-smart-role="fields"
        data-smart-field-profile={profile}
      >
        <ValueGrid
          items={items}
          block={block}
        />
      </div>
    );
  }

  const FieldRenderer =
    implementation.FieldRenderer;

  return (
    <div
      data-report-smart-role="fields"
      data-report-smart-field-grid
      data-smart-field-profile={profile}
      className="report-smart-field-grid grid"
      style={{
        gap:
          "var(--report-value-grid-gap, 0.5rem)",
      }}
    >
      {items.map(
        (item, index) => {
          const kind =
            classifyReportSmartField(
              item,
            );

          return (
            <div
              key={
                item.key ||
                item.label ||
                index
              }
              className="report-smart-field-item min-w-0"
              data-smart-field-kind={kind}
            >
              {FieldRenderer ? (
                <FieldRenderer
                  item={item}
                  index={index}
                  block={block}
                />
              ) : (
                <MetaCard
                  label={item.label}
                  value={
                    Array.isArray(
                      item.value,
                    )
                      ? item.value.join(
                          " • ",
                        )
                      : String(
                          item.value ||
                            "غير متوفر",
                        )
                  }
                  valueItems={
                    item.valueItems ||
                    (Array.isArray(
                      item.value,
                    )
                      ? item.value
                      : undefined)
                  }
                  labelFontSize={getBlockSetting(
                    block,
                    "fieldLabelFontSize",
                  )}
                  valueFontSize={getBlockSetting(
                    block,
                    "fieldValueFontSize",
                  )}
                />
              )}
            </div>
          );
        },
      )}
    </div>
  );
}