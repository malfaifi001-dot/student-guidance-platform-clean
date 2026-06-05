const fs = require("fs");

const filePath = "components/workflow/dynamic-form-renderer.tsx";

let text = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");

const before = text;

text = text.replace(
  'import { WorkflowStepCard } from "@/components/workflow/workflow-step-card";',
  'import {\n  WorkflowStepCard,\n  isCommitteeChainStep,\n} from "@/components/workflow/workflow-step-card";'
);

if (!text.includes('from "@/components/committees/committee-chain-repeater"')) {
  text = text.replace(
    'import type {\n  RuntimeField,',
    'import { isCommitteeRowsValid } from "@/components/committees/committee-chain-repeater";\n\nimport type {\n  RuntimeField,'
  );
}

if (!text.includes("function isCommitteeChainRuntimeField")) {
  const marker = `function isStudentPickerStep(step?: RuntimeStep | null) {
  if (!step) return false;

  const text = stepSearchText(step);

  return (
    step.fields.some(isStudentPickerField) ||
    text.includes("student_picker") ||
    text.includes("student picker") ||
    text.includes("اختيار طالب") ||
    text.includes("اختيار الطالبة") ||
    text.includes("الطالب المستهدف")
  );
}
`;

  const helper = `${marker}

function isCommitteeChainRuntimeField(field: RuntimeField) {
  const text = normalizeRuntimeText(
    [
      field.key,
      field.label,
      field.type,
      field.placeholder ?? "",
      field.helpText ?? "",
    ].join(" ")
  );

  return (
    text.includes("agenda") ||
    text.includes("agendaitem") ||
    text.includes("committee_agenda") ||
    text.includes("جدول") ||
    text.includes("الاعمال") ||
    text.includes("discussion") ||
    text.includes("discussionaxis") ||
    text.includes("committee_discussion") ||
    text.includes("محور") ||
    text.includes("نقاش") ||
    text.includes("recommendation") ||
    text.includes("committee_recommendation") ||
    text.includes("توصي")
  );
}
`;

  if (!text.includes(marker)) {
    throw new Error("لم أجد موضع إضافة دالة isCommitteeChainRuntimeField.");
  }

  text = text.replace(marker, helper);
}

const oldValidationLine =
  "    const visibleFields = currentStep.fields.filter(shouldShowFieldInCurrentValues);";

const newValidationBlock = `    const isCommitteeChainCurrentStep =
      workflow.serviceSlug === "committees-meetings" &&
      isCommitteeChainStep(currentStep);

    if (
      isCommitteeChainCurrentStep &&
      !isCommitteeRowsValid(values.committee_items)
    ) {
      showFeedback(
        "warning",
        "جدول الاجتماع غير مكتمل",
        "أكمل صفًا واحدًا على الأقل: جدول الأعمال، محور النقاش، والتوصية."
      );

      return false;
    }

    const visibleFields = currentStep.fields
      .filter(shouldShowFieldInCurrentValues)
      .filter((field) =>
        isCommitteeChainCurrentStep
          ? !isCommitteeChainRuntimeField(field)
          : true
      );`;

if (!text.includes("isCommitteeChainCurrentStep")) {
  if (!text.includes(oldValidationLine)) {
    throw new Error("لم أجد سطر visibleFields داخل validateCurrentStep.");
  }

  text = text.replace(oldValidationLine, newValidationBlock);
}

fs.writeFileSync(filePath, text, "utf8");

if (text === before) {
  console.log("لا توجد تغييرات؛ يبدو أن التعديل موجود مسبقًا.");
} else {
  console.log("تم تعديل التحقق الخاص بخطوة اللجان بنجاح.");
}
