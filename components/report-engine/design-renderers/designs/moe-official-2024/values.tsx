import type { ReportValueGridProps } from "../report-design-component-types";
import { MoeOfficial2024ValueGrid } from "./value-grid";

export function MoeOfficial2024ReportValueGrid({ items }: ReportValueGridProps) {
  return (
    <MoeOfficial2024ValueGrid
      items={items.map((item) => ({
        key: item.key,
        label: item.label,
        value: item.valueItems?.length ? item.valueItems : item.value,
      }))}
    />
  );
}
