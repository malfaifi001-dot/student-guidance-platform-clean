import assert from "node:assert/strict";
import test from "node:test";

import { defaultSmartReportPayload } from "@/lib/report-engine/smart-report-defaults";
import {
  applyReportFlowPreparationToPayload,
  buildReportFlowPrepareFields,
  createReportFlowPreparation,
} from "@/lib/report-flow/report-flow-payload";

const numericPayload = {
  ...defaultSmartReportPayload,
  primaryFields: [],
  detailFields: [
    {
      key: "participants_count",
      fieldType: "NUMBER",
      label: "عدد الطلبة المشاركين",
      value: "3",
      importance: "DETAIL" as const,
    },
    {
      key: "zero_count",
      fieldType: "NUMBER",
      label: "عدد العناصر",
      value: "0",
      importance: "DETAIL" as const,
    },
  ],
};

test("numeric and zero values are selectable report fields", () => {
  const fields = buildReportFlowPrepareFields(numericPayload);

  assert.deepEqual(
    fields.map((field) => ({ key: field.key, value: field.value, selected: field.selected })),
    [
      { key: "participants_count", value: "3", selected: true },
      { key: "zero_count", value: "0", selected: true },
    ],
  );
});

test("old preparations preserve source fields they never contained", () => {
  const preparation = createReportFlowPreparation({
    payload: numericPayload,
    variantId: "official-activity-card",
    fields: [],
    executionSummary: "",
    executionSummarySource: "FALLBACK",
    languageMode: numericPayload.languageMode,
  });

  const result = applyReportFlowPreparationToPayload(numericPayload, preparation);

  assert.deepEqual(
    result.detailFields.map((field) => ({ key: field.key, value: field.value })),
    [
      { key: "participants_count", value: "3" },
      { key: "zero_count", value: "0" },
    ],
  );
});
