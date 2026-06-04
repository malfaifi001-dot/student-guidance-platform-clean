const fs = require("fs");

const casesPagePath = "app\\dashboard\\cases\\page.tsx";
const casesTablePath = "components\\cases\\cases-search-table.tsx";
const caseDetailsPath = "components\\cases\\case-details-view.tsx";
const reportsNewPath = "app\\dashboard\\reports\\new\\page.tsx";
const dynamicFormPath = "components\\workflow\\dynamic-form-renderer.tsx";

/* =========================================================
   1) /dashboard/cases: resolve Arabic option labels
========================================================= */

let casesPage = fs.readFileSync(casesPagePath, "utf8");

if (!casesPage.includes("CASE_TITLE_FALLBACK_LABELS")) {
  casesPage = casesPage.replace(
    "function cleanTitleText(value: unknown) {",
    `const CASE_TITLE_FALLBACK_LABELS: Record<string, string> = {
  positive_behavior_discipline: "برنامج تعزيز السلوك الإيجابي والانضباط المدرسي",
  behavior_discipline: "برنامج تعزيز السلوك الإيجابي والانضباط المدرسي",
};

function cleanTitleText(value: unknown) {`
  );
}

if (!casesPage.includes("function extractTitleSelectedValues")) {
  casesPage = casesPage.replace(
    "function isGenericCaseTitle(title: string) {",
    `function extractTitleSelectedValues(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractTitleSelectedValues(item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return [
      ...extractTitleSelectedValues(record.value),
      ...extractTitleSelectedValues(record.id),
      ...extractTitleSelectedValues(record.key),
      ...extractTitleSelectedValues(record.slug),
      ...extractTitleSelectedValues(record.label),
      ...extractTitleSelectedValues(record.name),
    ];
  }

  return [];
}

function getArabicOptionLabelFromCaseValue(value: any) {
  const selectedValues = extractTitleSelectedValues(
    value?.jsonValue ?? value?.value,
  );

  if (!selectedValues.length) {
    return "";
  }

  const options = Array.isArray(value?.field?.options)
    ? value.field.options
    : [];

  for (const selectedValue of selectedValues) {
    const cleanSelected = String(selectedValue).trim();

    if (!cleanSelected) {
      continue;
    }

    const fallbackLabel = CASE_TITLE_FALLBACK_LABELS[cleanSelected];

    if (fallbackLabel) {
      return fallbackLabel;
    }

    const option = options.find((item: any) => {
      return (
        String(item?.value || "").trim() === cleanSelected ||
        String(item?.label || "").trim() === cleanSelected
      );
    });

    if (option?.label) {
      return cleanTitleText(option.label);
    }
  }

  return "";
}

function getCaseValueText(value: any) {
  return (
    getArabicOptionLabelFromCaseValue(value) ||
    stringifyTitleCandidate(value?.jsonValue) ||
    stringifyTitleCandidate(value?.value)
  );
}

function isGenericCaseTitle(title: string) {`
  );
}

/* Remove older getCaseValueText if duplicated later */
casesPage = casesPage.replace(
  /function getCaseValueText\(value: any\) \{\s*return \(\s*stringifyTitleCandidate\(value\?\.jsonValue\) \|\|\s*stringifyTitleCandidate\(value\?\.value\)\s*\);\s*\}\s*/g,
  ""
);

casesPage = casesPage.replace(
  `field: {
            select: {
              key: true,
              label: true,
            },
          },`,
  `field: {
            select: {
              key: true,
              label: true,
              options: {
                orderBy: {
                  order: "asc",
                },
                select: {
                  label: true,
                  value: true,
                  order: true,
                },
              },
            },
          },`
);

fs.writeFileSync(casesPagePath, casesPage, "utf8");

/* =========================================================
   2) Cards: make service name visible and reduce ambiguity
========================================================= */

let casesTable = fs.readFileSync(casesTablePath, "utf8");

casesTable = casesTable.replace(
  `آخر تحديث: {caseItem.updatedAtLabel}
            {caseItem.workflow?.name ? \` · \${caseItem.workflow.name}\` : ""}`,
  `الخدمة: {caseItem.service.name} · آخر تحديث: {caseItem.updatedAtLabel}
            {caseItem.workflow?.name ? \` · \${caseItem.workflow.name}\` : ""}`
);

fs.writeFileSync(casesTablePath, casesTable, "utf8");

/* =========================================================
   3) Case details: resolve Arabic option labels in header title
========================================================= */

let caseDetails = fs.readFileSync(caseDetailsPath, "utf8");

if (!caseDetails.includes("SMART_CASE_TITLE_FALLBACK_LABELS")) {
  caseDetails = caseDetails.replace(
    "function normalizeSmartCaseTitleText(value: string) {",
    `const SMART_CASE_TITLE_FALLBACK_LABELS: Record<string, string> = {
  positive_behavior_discipline: "برنامج تعزيز السلوك الإيجابي والانضباط المدرسي",
  behavior_discipline: "برنامج تعزيز السلوك الإيجابي والانضباط المدرسي",
};

function normalizeSmartCaseTitleText(value: string) {`
  );
}

if (!caseDetails.includes("function extractSmartCaseTitleSelectedValues")) {
  caseDetails = caseDetails.replace(
    "function getSmartCaseDisplayTitle(caseEntry: any) {",
    `function extractSmartCaseTitleSelectedValues(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractSmartCaseTitleSelectedValues(item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return [
      ...extractSmartCaseTitleSelectedValues(record.value),
      ...extractSmartCaseTitleSelectedValues(record.id),
      ...extractSmartCaseTitleSelectedValues(record.key),
      ...extractSmartCaseTitleSelectedValues(record.slug),
      ...extractSmartCaseTitleSelectedValues(record.label),
      ...extractSmartCaseTitleSelectedValues(record.name),
    ];
  }

  return [];
}

function getSmartCaseOptionLabel(value: any) {
  const selectedValues = extractSmartCaseTitleSelectedValues(
    value?.jsonValue ?? value?.value,
  );

  const options = Array.isArray(value?.field?.options)
    ? value.field.options
    : [];

  for (const selectedValue of selectedValues) {
    const cleanSelected = String(selectedValue).trim();

    if (!cleanSelected) {
      continue;
    }

    const fallbackLabel = SMART_CASE_TITLE_FALLBACK_LABELS[cleanSelected];

    if (fallbackLabel) {
      return fallbackLabel;
    }

    const option = options.find((item: any) => {
      return (
        String(item?.value || "").trim() === cleanSelected ||
        String(item?.label || "").trim() === cleanSelected
      );
    });

    if (option?.label) {
      return cleanSmartCaseTitle(option.label);
    }
  }

  return "";
}

function getSmartCaseValueTitle(value: any) {
  return (
    getSmartCaseOptionLabel(value) ||
    stringifySmartCaseTitleCandidate(value?.jsonValue) ||
    stringifySmartCaseTitleCandidate(value?.value)
  );
}

function getSmartCaseDisplayTitle(caseEntry: any) {`
  );
}

caseDetails = caseDetails.replace(
  /const candidate =\s*stringifySmartCaseTitleCandidate\(value\?\.jsonValue\) \|\|\s*stringifySmartCaseTitleCandidate\(value\?\.value\);/g,
  "const candidate = getSmartCaseValueTitle(value);"
);

fs.writeFileSync(caseDetailsPath, caseDetails, "utf8");

/* =========================================================
   4) /reports/new: resolve Arabic option labels for case choices
========================================================= */

let reportsNew = fs.readFileSync(reportsNewPath, "utf8");

reportsNew = reportsNew.replace(
  `field: true,`,
  `field: {
              include: {
                options: {
                  orderBy: {
                    order: "asc",
                  },
                },
              },
            },`
);

if (!reportsNew.includes("REPORT_CASE_TITLE_FALLBACK_LABELS")) {
  reportsNew = reportsNew.replace(
    "function normalizeReportCaseTitleText(value: string) {",
    `const REPORT_CASE_TITLE_FALLBACK_LABELS: Record<string, string> = {
  positive_behavior_discipline: "برنامج تعزيز السلوك الإيجابي والانضباط المدرسي",
  behavior_discipline: "برنامج تعزيز السلوك الإيجابي والانضباط المدرسي",
};

function normalizeReportCaseTitleText(value: string) {`
  );
}

if (!reportsNew.includes("function extractReportCaseTitleSelectedValues")) {
  reportsNew = reportsNew.replace(
    "function getSmartReportCaseTitle(caseEntry: any) {",
    `function extractReportCaseTitleSelectedValues(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractReportCaseTitleSelectedValues(item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return [
      ...extractReportCaseTitleSelectedValues(record.value),
      ...extractReportCaseTitleSelectedValues(record.id),
      ...extractReportCaseTitleSelectedValues(record.key),
      ...extractReportCaseTitleSelectedValues(record.slug),
      ...extractReportCaseTitleSelectedValues(record.label),
      ...extractReportCaseTitleSelectedValues(record.name),
    ];
  }

  return [];
}

function getReportCaseOptionLabel(value: any) {
  const selectedValues = extractReportCaseTitleSelectedValues(
    value?.jsonValue ?? value?.value,
  );

  const options = Array.isArray(value?.field?.options)
    ? value.field.options
    : [];

  for (const selectedValue of selectedValues) {
    const cleanSelected = String(selectedValue).trim();

    if (!cleanSelected) {
      continue;
    }

    const fallbackLabel = REPORT_CASE_TITLE_FALLBACK_LABELS[cleanSelected];

    if (fallbackLabel) {
      return fallbackLabel;
    }

    const option = options.find((item: any) => {
      return (
        String(item?.value || "").trim() === cleanSelected ||
        String(item?.label || "").trim() === cleanSelected
      );
    });

    if (option?.label) {
      return cleanReportCaseTitle(option.label);
    }
  }

  return "";
}

function getReportCaseValueTitle(value: any) {
  return (
    getReportCaseOptionLabel(value) ||
    stringifyReportCaseTitleCandidate(value?.jsonValue) ||
    stringifyReportCaseTitleCandidate(value?.value)
  );
}

function getSmartReportCaseTitle(caseEntry: any) {`
  );
}

reportsNew = reportsNew.replace(
  /const candidate =\s*stringifyReportCaseTitleCandidate\(value\?\.jsonValue\) \|\|\s*stringifyReportCaseTitleCandidate\(value\?\.value\);/g,
  "const candidate = getReportCaseValueTitle(value);"
);

fs.writeFileSync(reportsNewPath, reportsNew, "utf8");

/* =========================================================
   5) DynamicFormRenderer: future saves store better Arabic titles
========================================================= */

let dynamicForm = fs.readFileSync(dynamicFormPath, "utf8");

if (!dynamicForm.includes("function getSmartRuntimeCaseTitle")) {
  dynamicForm = dynamicForm.replace(
    "function hasEvidenceStep(workflow: RuntimeWorkflow) {",
    `const RUNTIME_SERVICE_LABELS: Record<string, string> = {
  "guidance-programs": "البرامج الإرشادية",
  "student-follow-up": "متابعة الطلاب",
  "family-school-communication": "التواصل الأسري",
  "student-guidance-services": "الخدمات الإرشادية",
  "committees-meetings": "اللجان والاجتماعات",
};

const RUNTIME_CASE_TITLE_FALLBACK_LABELS: Record<string, string> = {
  positive_behavior_discipline: "برنامج تعزيز السلوك الإيجابي والانضباط المدرسي",
  behavior_discipline: "برنامج تعزيز السلوك الإيجابي والانضباط المدرسي",
};

function normalizeRuntimeCaseTitleText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\\s+/g, " ")
    .trim();
}

function cleanRuntimeCaseTitle(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text || text === "null" || text === "undefined" || text.length > 140) {
    return "";
  }

  return text;
}

function isGenericRuntimeCaseTitle(title: string) {
  const normalized = normalizeRuntimeCaseTitleText(title);

  return (
    !normalized ||
    normalized === "بدون عنوان" ||
    normalized === "حاله بدون عنوان" ||
    normalized === "حالة بدون عنوان" ||
    normalized === "حاله جديده" ||
    normalized === "حالة جديدة" ||
    normalized.includes("برنامج ارشادي جديد")
  );
}

function extractRuntimeTitleSelectedValues(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractRuntimeTitleSelectedValues(item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return [
      ...extractRuntimeTitleSelectedValues(record.value),
      ...extractRuntimeTitleSelectedValues(record.id),
      ...extractRuntimeTitleSelectedValues(record.key),
      ...extractRuntimeTitleSelectedValues(record.slug),
      ...extractRuntimeTitleSelectedValues(record.label),
      ...extractRuntimeTitleSelectedValues(record.name),
    ];
  }

  return [];
}

function isRuntimeTitleField(field: RuntimeField) {
  const text = normalizeRuntimeCaseTitleText(
    [field.key, field.label, field.type, field.helpText ?? ""].join(" "),
  );

  return (
    text.includes("program") ||
    text.includes("activity") ||
    text.includes("title") ||
    text.includes("برنامج") ||
    text.includes("النشاط") ||
    text.includes("عنوان") ||
    text.includes("موضوع")
  );
}

function getRuntimeFieldOptionLabel(field: RuntimeField, rawValue: unknown) {
  const selectedValues = extractRuntimeTitleSelectedValues(rawValue);

  for (const selectedValue of selectedValues) {
    const cleanSelected = String(selectedValue).trim();

    if (!cleanSelected) {
      continue;
    }

    const fallbackLabel = RUNTIME_CASE_TITLE_FALLBACK_LABELS[cleanSelected];

    if (fallbackLabel) {
      return fallbackLabel;
    }

    const option = field.options.find((item) => {
      return (
        String(item.value || "").trim() === cleanSelected ||
        String(item.label || "").trim() === cleanSelected
      );
    });

    if (option?.label) {
      return cleanRuntimeCaseTitle(option.label);
    }
  }

  return "";
}

function getSmartRuntimeCaseTitle({
  workflow,
  values,
  fallbackTitle,
}: {
  workflow: RuntimeWorkflow;
  values: RuntimeValues;
  fallbackTitle?: string | null;
}) {
  for (const step of workflow.steps) {
    for (const field of step.fields) {
      if (!isRuntimeTitleField(field)) {
        continue;
      }

      const rawValue = values[field.key];

      const candidate =
        getRuntimeFieldOptionLabel(field, rawValue) ||
        cleanRuntimeCaseTitle(rawValue);

      if (candidate && !isGenericRuntimeCaseTitle(candidate)) {
        return candidate;
      }
    }
  }

  const cleanFallback = cleanRuntimeCaseTitle(fallbackTitle);

  if (cleanFallback && !isGenericRuntimeCaseTitle(cleanFallback)) {
    return cleanFallback;
  }

  return RUNTIME_SERVICE_LABELS[workflow.serviceSlug] || workflow.name || "حالة جديدة";
}

function hasEvidenceStep(workflow: RuntimeWorkflow) {`
  );
}

dynamicForm = dynamicForm.replace(
  "title: title || workflow.name,",
  "title: getSmartRuntimeCaseTitle({\n            workflow: normalizedWorkflow,\n            values,\n            fallbackTitle: title || workflow.name,\n          }),"
);

fs.writeFileSync(dynamicFormPath, dynamicForm, "utf8");

console.log("Arabic smart case titles resolved from Workflow option labels and service names.");
