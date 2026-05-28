export type WorkflowValidationField = {
  id: string;
  key: string;
  label: string;
  type: string;
  isRequired: boolean;
  dependsOnFieldKey: string | null;
  linkedToValue: string | null;
  allowOther: boolean;
  options: Array<{
    id: string;
    label: string;
    value: string;
    linkedToValue: string | null;
  }>;
};

export type WorkflowValidationStep = {
  id: string;
  title: string;
  fields: WorkflowValidationField[];
};

export type WorkflowValidationInput = {
  id: string;
  name: string;
  steps: WorkflowValidationStep[];
};

export function validateWorkflow(workflow: WorkflowValidationInput) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const insights: string[] = [];

  const allFields = workflow.steps.flatMap((step) => step.fields);
  const fieldKeys = allFields.map((field) => field.key);

  const duplicatedKeys = fieldKeys.filter(
    (key, index) => fieldKeys.indexOf(key) !== index
  );

  if (workflow.steps.length === 0) {
    errors.push("لا توجد خطوات داخل الـ Workflow.");
  }

  if (allFields.length === 0) {
    errors.push("لا توجد حقول داخل الـ Workflow.");
  }

  Array.from(new Set(duplicatedKeys)).forEach((key) => {
    errors.push(`يوجد تكرار في مفتاح الحقل: ${key}`);
  });

  allFields.forEach((field) => {
    if (!field.key.trim()) {
      errors.push(`يوجد حقل بدون key: ${field.label}`);
    }

    if (!field.label.trim()) {
      warnings.push(`يوجد حقل بدون اسم واضح: ${field.key}`);
    }

    if (
      ["SELECT", "MULTI_SELECT", "CHECKBOX", "RADIO"].includes(field.type) &&
      field.options.length === 0
    ) {
      warnings.push(
        `الحقل "${field.label}" من نوع ${field.type} لكنه بدون خيارات.`
      );
    }

    if (field.dependsOnFieldKey && !fieldKeys.includes(field.dependsOnFieldKey)) {
      errors.push(
        `الحقل "${field.label}" يعتمد على حقل غير موجود: ${field.dependsOnFieldKey}`
      );
    }

    if (field.dependsOnFieldKey && field.linkedToValue) {
      const parent = allFields.find(
        (item) => item.key === field.dependsOnFieldKey
      );

      const parentHasValue = parent?.options.some(
        (option) => option.value === field.linkedToValue
      );

      if (parent && parent.options.length > 0 && !parentHasValue) {
        warnings.push(
          `الحقل "${field.label}" مرتبط بالقيمة "${field.linkedToValue}" لكنها غير موجودة في خيارات "${parent.label}".`
        );
      }
    }
  });

  workflow.steps.forEach((step) => {
    if (step.fields.length > 12) {
      warnings.push(
        `الخطوة "${step.title}" تحتوي على ${step.fields.length} حقل. يفضل تقسيمها لتحسين تجربة المستخدم.`
      );
    }
  });

  const requiredFields = allFields.filter((field) => field.isRequired).length;

  const fieldsWithDependencies = allFields.filter(
    (field) => field.dependsOnFieldKey
  ).length;

  const fieldsWithOptions = allFields.filter(
    (field) => field.options.length > 0
  ).length;

  insights.push(`يحتوي على ${workflow.steps.length} خطوة.`);
  insights.push(`يحتوي على ${allFields.length} حقل.`);
  insights.push(`يحتوي على ${requiredFields} حقل مطلوب.`);
  insights.push(`يحتوي على ${fieldsWithDependencies} حقل تابع.`);
  insights.push(`يحتوي على ${fieldsWithOptions} حقل بقوائم خيارات.`);

  return {
    score: errors.length > 0 ? 40 : warnings.length > 0 ? 75 : 100,
    status: errors.length > 0 ? "ERROR" : warnings.length > 0 ? "WARNING" : "READY",
    errors,
    warnings,
    insights,
    summary: {
      stepsCount: workflow.steps.length,
      fieldsCount: allFields.length,
      optionsCount: allFields.reduce(
        (total, field) => total + field.options.length,
        0
      ),
      requiredFields,
      dependentFields: fieldsWithDependencies,
    },
  };
}