import assert from "node:assert/strict";
import test from "node:test";

import {
  filterConditionalWorkflowOptions,
  isConditionalWorkflowFieldVisible,
  normalizeConditionalWorkflow,
} from "./workflow-conditional-logic";
import { getFieldLinkedToValue } from "../workflow-upload/workflow-upload-normalization";

const areas = [
  "teaching_and_classroom_tasks",
  "records_and_reports",
  "supervision_tasks",
  "programs_and_events",
];

function createWorkflow(type: string) {
  return {
    id: "workflow",
    steps: [
      {
        fields: [
          {
            key: "weekly_focus",
            type: "SELECT",
            dependsOnFieldKey: "duty_record_type",
            linkedToValue: "weekly_school_report",
            options: areas.map((area, index) => ({
              id: `area-${index}`,
              label: area,
              value: area,
              order: index + 1,
              linkedToValue: "weekly_school_report",
            })),
          },
          {
            key: "weekly_actions",
            type,
            dependsOnFieldKey: "weekly_focus",
            linkedToValue: null,
            options: areas.flatMap((area, areaIndex) =>
              Array.from({ length: 4 }, (_, optionIndex) => ({
                id: `${areaIndex}-${optionIndex}`,
                label: `${area} ${optionIndex + 1}`,
                value: `action_${optionIndex + 1}`,
                order: areaIndex * 4 + optionIndex + 1,
                linkedToValue: area,
              })),
            ),
          },
        ],
      },
    ],
  };
}

test("preview and persisted runtime expose identical linked MULTI_SELECT options", () => {
  const preview = normalizeConditionalWorkflow(createWorkflow("multi select"));
  const runtime = normalizeConditionalWorkflow(createWorkflow("MULTI_SELECT"));
  const values = {
    duty_record_type: "weekly_school_report",
    weekly_focus: "teaching_and_classroom_tasks",
  };

  const previewAreaField = preview.steps[0].fields[0];
  const runtimeAreaField = runtime.steps[0].fields[0];
  const previewField = preview.steps[0].fields[1];
  const runtimeField = runtime.steps[0].fields[1];
  const previewOptions = filterConditionalWorkflowOptions(previewField, values);
  const runtimeOptions = filterConditionalWorkflowOptions(runtimeField, values);

  assert.equal(previewField.type, "MULTI_SELECT");
  assert.equal(runtimeField.type, "MULTI_SELECT");
  assert.equal(
    isConditionalWorkflowFieldVisible(previewAreaField, values),
    true,
  );
  assert.equal(
    isConditionalWorkflowFieldVisible(runtimeAreaField, values),
    true,
  );
  assert.equal(previewOptions.length, 4);
  assert.deepEqual(
    previewOptions.map(({ label, value, order }) => ({ label, value, order })),
    runtimeOptions.map(({ label, value, order }) => ({ label, value, order })),
  );
  assert.ok(
    previewOptions.every(
      (option) => option.linkedToValue === "teaching_and_classroom_tasks",
    ),
  );
});

test("same option value remains available under independent parent values", () => {
  const workflow = normalizeConditionalWorkflow(createWorkflow("MULTISELECT"));
  const field = workflow.steps[0].fields[1];

  assert.equal(field.options.length, 16);
  assert.equal(
    filterConditionalWorkflowOptions(field, {
      weekly_focus: "records_and_reports",
    }).length,
    4,
  );
});

test("Arabic label fallback remains compatible with strict conditional links", () => {
  const arabicLabel = "تواصل فردي بشأن طالب";
  // This mirrors persistence normalization when optionValue is omitted.
  const persistedParentValue = `  ${arabicLabel}  `.trim();
  const workflow = normalizeConditionalWorkflow({
    id: "arabic-label-fallback",
    steps: [
      {
        fields: [
          {
            key: "communication_type",
            type: "SELECT",
            dependsOnFieldKey: null,
            linkedToValue: null,
            options: [
              {
                id: "parent-option",
                label: arabicLabel,
                value: persistedParentValue,
                order: 1,
                linkedToValue: null,
              },
            ],
          },
          {
            key: "communication_actions",
            type: "MULTI_SELECT",
            dependsOnFieldKey: "communication_type",
            linkedToValue: arabicLabel,
            options: [
              {
                id: "matching-child",
                label: "متابعة حالة الطالب",
                value: "متابعة حالة الطالب",
                order: 1,
                linkedToValue: arabicLabel,
              },
              {
                id: "unrelated-child",
                label: "خيار لمسار آخر",
                value: "خيار لمسار آخر",
                order: 2,
                linkedToValue: "اجتماع جماعي",
              },
            ],
          },
        ],
      },
    ],
  });
  const childField = workflow.steps[0].fields[1] as {
    dependsOnFieldKey: string;
    linkedToValue: string;
    options: Array<{
      label: string;
      value: string;
      linkedToValue: string;
    }>;
  };
  const values = { communication_type: persistedParentValue };

  assert.equal(persistedParentValue, arabicLabel);
  assert.equal(persistedParentValue.includes("_"), false);
  assert.equal(isConditionalWorkflowFieldVisible(childField, values), true);
  assert.deepEqual(
    filterConditionalWorkflowOptions(childField, values).map(
      ({ label, value }) => ({ label, value }),
    ),
    [{ label: "متابعة حالة الطالب", value: "متابعة حالة الطالب" }],
  );
});

test("field and option links coexist after upload normalization", () => {
  const fieldRows = [
    {
      linkedToValue: "prior_knowledge",
      optionLinkedToValue: "prior_knowledge",
    },
    {
      linkedToValue: "prior_knowledge",
      optionLinkedToValue: "prior_knowledge",
    },
  ];
  const fieldLinkedToValue = getFieldLinkedToValue(fieldRows);
  const child = {
    key: "completed_tasks",
    type: "MULTI_SELECT",
    dependsOnFieldKey: "strategy_family",
    linkedToValue: fieldLinkedToValue,
    options: [
      {
        value: "activate_prior_learning",
        linkedToValue: fieldRows[0].optionLinkedToValue,
      },
      {
        value: "support_differentiation",
        linkedToValue: "differentiation_support",
      },
    ],
  };
  const values = { strategy_family: "prior_knowledge" };

  assert.equal(fieldLinkedToValue, "prior_knowledge");
  assert.equal(isConditionalWorkflowFieldVisible(child, values), true);
  assert.deepEqual(
    filterConditionalWorkflowOptions(child, values).map(({ value }) => value),
    ["activate_prior_learning"],
  );
});

test("unrelated child remains hidden instead of rendering an empty select", () => {
  const child = {
    dependsOnFieldKey: "strategy_family",
    linkedToValue: "differentiation_support",
    options: [
      {
        value: "support_differentiation",
        linkedToValue: "differentiation_support",
      },
    ],
  };

  assert.equal(
    isConditionalWorkflowFieldVisible(child, {
      strategy_family: "prior_knowledge",
    }),
    false,
  );
});

test("explicit field link has priority over legacy row links", () => {
  assert.equal(
    getFieldLinkedToValue([
      {
        fieldLinkedToValue: "  explicit_family  ",
        linkedToValue: "legacy_family",
        optionLinkedToValue: "option_family",
      },
    ]),
    "explicit_family",
  );
});

test("legacy field link survives option links and ambiguous links remain null", () => {
  assert.equal(
    getFieldLinkedToValue([
      {
        linkedToValue: "prior_knowledge",
        optionLinkedToValue: "prior_knowledge",
      },
      {
        linkedToValue: "prior_knowledge",
        optionLinkedToValue: "prior_knowledge",
      },
    ]),
    "prior_knowledge",
  );
  assert.equal(
    getFieldLinkedToValue([
      {
        linkedToValue: "prior_knowledge",
        optionLinkedToValue: "prior_knowledge",
      },
      {
        linkedToValue: "differentiation_support",
        optionLinkedToValue: "differentiation_support",
      },
    ]),
    null,
  );
});

test("preview and persisted field dependencies produce identical results", () => {
  const rows = [
    {
      linkedToValue: "prior_knowledge",
      optionLinkedToValue: "prior_knowledge",
    },
  ];
  const previewField = {
    dependsOnFieldKey: "strategy_family",
    linkedToValue: "prior_knowledge",
    options: [
      { value: "task_one", linkedToValue: "prior_knowledge" },
      { value: "task_two", linkedToValue: "differentiation_support" },
    ],
  };
  const persistedField = {
    ...previewField,
    linkedToValue: getFieldLinkedToValue(rows),
  };
  const values = { strategy_family: "prior_knowledge" };

  assert.equal(
    isConditionalWorkflowFieldVisible(previewField, values),
    isConditionalWorkflowFieldVisible(persistedField, values),
  );
  assert.deepEqual(
    filterConditionalWorkflowOptions(previewField, values),
    filterConditionalWorkflowOptions(persistedField, values),
  );
});
