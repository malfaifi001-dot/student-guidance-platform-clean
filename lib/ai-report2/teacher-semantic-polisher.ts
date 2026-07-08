import { normalizeAiReportArabicText } from "@/lib/ai-report/ai-report-knowledge-retriever";
import type {
  CustomReportField,
  CustomReportOption,
  CustomReportSchema,
} from "@/lib/custom-report/custom-report-types";

import type { TeacherIntentAnalysis } from "./teacher-intent-engine";
import { normalizeTeacherOptions } from "./teacher-field-rules";

const MAX_FIELDS = 7;
const MIN_FIELDS = 5;

type SemanticSlot =
  | "identity"
  | "subject_grade"
  | "date"
  | "audience"
  | "quantity"
  | "purpose"
  | "implementation"
  | "impact"
  | "evidence"
  | "follow_up"
  | "skill"
  | "other";

type CoverageKind =
  | "learning_plan"
  | "strategy"
  | "assessment"
  | "classroom_management"
  | "technology"
  | "results_analysis"
  | "improvement_program"
  | "parent_communication"
  | "professional_community"
  | "job_duty"
  | "learning_environment"
  | "general";

type CoveragePolicy = {
  kind: CoverageKind;
  preferredSlots: SemanticSlot[];
  minFields: number;
  maxFields: number;
  allowImpact: boolean;
  preferEvidence: boolean;
};

function norm(value: unknown) {
  return normalizeAiReportArabicText(String(value ?? ""));
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function hasAny(text: string, words: string[]) {
  const normalized = norm(text);
  return words.some((word) => normalized.includes(norm(word)));
}

function isLowValueField(label: string) {
  return hasAny(label, [
    "تحديات",
    "صعوبات",
    "معوقات",
    "توصيات",
    "مقترحات",
    "فرص التحسين",
  ]);
}

function preferredIdentityFromPrompt(analysis: TeacherIntentAnalysis) {
  const prompt = norm(analysis.prompt);

  if (prompt.includes(norm("خطة تعلم")) || prompt.includes(norm("خطة أسبوعية"))) {
    return "عنوان الخطة التعليمية";
  }

  if (prompt.includes(norm("برنامج إثرائي")) || prompt.includes(norm("اثرائي"))) {
    return "اسم البرنامج الإثرائي";
  }

  if (
    prompt.includes(norm("بيئة صفية")) ||
    prompt.includes(norm("بيئة تعليمية")) ||
    prompt.includes(norm("تهيئة")) ||
    prompt.includes(norm("ركن تعليمي")) ||
    prompt.includes(norm("ركن القراءة"))
  ) {
    if (prompt.includes(norm("ركن"))) return "عنوان الركن التعليمي";
    return "عنوان التهيئة الصفية";
  }

  if (
    prompt.includes(norm("مناوبة")) ||
    prompt.includes(norm("حصة انتظار")) ||
    prompt.includes(norm("تكليف")) ||
    prompt.includes(norm("واجب وظيفي"))
  ) {
    return "نوع المهمة أو التكليف";
  }

  if (
    prompt.includes(norm("إدارة صفية")) ||
    prompt.includes(norm("ادارة صفية")) ||
    prompt.includes(norm("الانضباط")) ||
    prompt.includes(norm("تنظيم مجموعات")) ||
    prompt.includes(norm("قواعد صفية"))
  ) {
    return "عنوان الإجراء الصفي";
  }

  if (prompt.includes(norm("زيارة"))) return "عنوان الزيارة";
  if (prompt.includes(norm("اجتماع"))) return "عنوان الاجتماع";
  if (prompt.includes(norm("ورشة"))) return "عنوان الورشة";
  if (prompt.includes(norm("مسابقة"))) return "اسم المسابقة";
  if (prompt.includes(norm("إذاعة")) || prompt.includes(norm("اذاعه"))) return "اسم الإذاعة المدرسية";
  if (prompt.includes(norm("تكريم"))) return "عنوان التكريم";
  if (prompt.includes(norm("بطاقة خروج"))) return "اسم أداة التقويم";
  if (prompt.includes(norm("تقويم")) || prompt.includes(norm("اختبار قصير"))) return "اسم أداة التقويم";
  if (prompt.includes(norm("كاهوت")) || prompt.includes(norm("فورمز"))) return "اسم أداة التقويم";
  if (prompt.includes(norm("استراتيجية"))) return "اسم الاستراتيجية";
  if (prompt.includes(norm("منصة"))) return "اسم المنصة";

  if (
    prompt.includes(norm("استخدام تطبيق")) ||
    prompt.includes(norm("تطبيق كلاس")) ||
    prompt.includes(norm("كلاس دوجو")) ||
    prompt.includes(norm("تطبيق رقمي"))
  ) {
    return "اسم التطبيق";
  }

  if (prompt.includes(norm("اختبار"))) return "اسم الاختبار";
  if (prompt.includes(norm("خطة علاجية"))) return "اسم الخطة العلاجية";

  return "";
}

function semanticSlot(label: string): SemanticSlot {
  if (hasAny(label, ["تاريخ", "موعد"])) return "date";
  if (hasAny(label, ["عدد", "نسبة", "مدة", "درجة", "درجات", "معدل"])) return "quantity";
  if (hasAny(label, ["موعد المتابعة", "متابعة لاحقة", "المتابعة القادمة"])) return "follow_up";

  if (hasAny(label, ["أثر", "اثر", "نتائج", "مخرجات", "مؤشرات", "تحسن", "مستوى الإتقان", "مستويات الإتقان"])) {
    return "impact";
  }

  if (hasAny(label, ["هدف", "أهداف", "اهداف", "الغرض", "مبررات", "سبب"])) {
    return "purpose";
  }

  if (hasAny(label, ["اسم", "عنوان", "موضوع", "نوع"])) return "identity";

  if (hasAny(label, ["القيمة المستهدفة", "القيمه المستهدفه", "مهارة", "مهارات", "المهارات المستهدفة"])) {
    return "skill";
  }

  if (hasAny(label, ["آلية", "الية", "خطوات", "إجراءات", "اجراءات", "تنفيذ", "تطبيق", "توظيف", "استخدام"])) {
    return "implementation";
  }

  if (hasAny(label, ["الفئة", "المستهدفة", "المستهدفون", "المستهدفين", "المستفيد", "المشاركين", "الأطراف", "الاطراف"])) {
    return "audience";
  }

  if (hasAny(label, ["المادة", "الصف", "الفصل"])) return "subject_grade";
  if (hasAny(label, ["شواهد", "توثيق", "أدلة", "ادلة", "مرفقات"])) return "evidence";

  return "other";
}

function inferCoverageKind(analysis: TeacherIntentAnalysis): CoverageKind {
  const prompt = norm(analysis.prompt);
  const intent = analysis.primaryIntent.code;
  const element = analysis.resolvedPerformanceElementCode;

  if (intent === "PARENT_COMMUNICATION" || prompt.includes(norm("ولي أمر")) || prompt.includes(norm("تواصل"))) {
    return "parent_communication";
  }

  if (
    intent === "RESULTS_ANALYSIS" ||
    element === "learner_results_analysis" ||
    prompt.includes(norm("تحليل نتائج"))
  ) {
    return "results_analysis";
  }

  if (
    intent === "REMEDIAL_PLAN" ||
    element === "learner_results_improvement" ||
    prompt.includes(norm("خطة علاجية")) ||
    prompt.includes(norm("برنامج إثرائي")) ||
    prompt.includes(norm("اثرائي"))
  ) {
    return "improvement_program";
  }

  if (
    intent === "ASSESSMENT_PRACTICE" ||
    element === "assessment_methods_diversity" ||
    prompt.includes(norm("تقويم")) ||
    prompt.includes(norm("بطاقة خروج")) ||
    prompt.includes(norm("سلم تقدير"))
  ) {
    return "assessment";
  }

  if (
    intent === "TEACHING_STRATEGY" ||
    element === "teaching_strategies_diversity" ||
    prompt.includes(norm("استراتيجية"))
  ) {
    return "strategy";
  }

  if (
    intent === "TECHNOLOGY_USE" ||
    element === "learning_technology_tools" ||
    prompt.includes(norm("منصة")) ||
    prompt.includes(norm("تطبيق كلاس")) ||
    prompt.includes(norm("كلاس دوجو"))
  ) {
    return "technology";
  }

  if (
    element === "classroom_management" ||
    prompt.includes(norm("إدارة صفية")) ||
    prompt.includes(norm("ادارة صفية")) ||
    prompt.includes(norm("الانضباط")) ||
    prompt.includes(norm("قواعد صفية"))
  ) {
    return "classroom_management";
  }

  if (
    intent === "PROFESSIONAL_COMMUNITY" ||
    element === "professional_community_interaction" ||
    prompt.includes(norm("مجتمع مهني")) ||
    prompt.includes(norm("زيارة تبادلية")) ||
    prompt.includes(norm("ورشة"))
  ) {
    return "professional_community";
  }

  if (
    intent === "DUTY_FOLLOWUP" ||
    element === "job_duties_performance" ||
    prompt.includes(norm("مناوبة")) ||
    prompt.includes(norm("حصة انتظار"))
  ) {
    return "job_duty";
  }

  if (
    intent === "LEARNING_ENVIRONMENT_SETUP" ||
    element === "learning_environment" ||
    prompt.includes(norm("بيئة صفية")) ||
    prompt.includes(norm("ركن تعليمي")) ||
    prompt.includes(norm("إذاعة")) ||
    prompt.includes(norm("مسابقة")) ||
    prompt.includes(norm("تكريم"))
  ) {
    return "learning_environment";
  }

  if (
    element === "learning_plan_preparation" ||
    prompt.includes(norm("خطة تعلم")) ||
    prompt.includes(norm("خطة أسبوعية"))
  ) {
    return "learning_plan";
  }

  return "general";
}

function coveragePolicy(analysis: TeacherIntentAnalysis): CoveragePolicy {
  const kind = inferCoverageKind(analysis);

  switch (kind) {
    case "learning_plan":
      return {
        kind,
        preferredSlots: ["identity", "subject_grade", "date", "skill", "purpose", "implementation", "impact"],
        minFields: 6,
        maxFields: 7,
        allowImpact: true,
        preferEvidence: false,
      };

    case "strategy":
      return {
        kind,
        preferredSlots: ["identity", "subject_grade", "date", "purpose", "implementation", "impact"],
        minFields: 5,
        maxFields: 6,
        allowImpact: true,
        preferEvidence: false,
      };

    case "assessment":
      return {
        kind,
        preferredSlots: ["identity", "subject_grade", "date", "audience", "purpose", "implementation", "impact"],
        minFields: 6,
        maxFields: 7,
        allowImpact: true,
        preferEvidence: false,
      };

    case "classroom_management":
      return {
        kind,
        preferredSlots: ["identity", "subject_grade", "date", "audience", "purpose", "implementation", "impact"],
        minFields: 6,
        maxFields: 7,
        allowImpact: true,
        preferEvidence: false,
      };

    case "technology":
      return {
        kind,
        preferredSlots: ["identity", "subject_grade", "date", "purpose", "implementation", "impact", "evidence"],
        minFields: 6,
        maxFields: 7,
        allowImpact: true,
        preferEvidence: true,
      };

    case "results_analysis":
      return {
        kind,
        preferredSlots: ["identity", "subject_grade", "date", "quantity", "audience", "impact", "implementation"],
        minFields: 6,
        maxFields: 7,
        allowImpact: true,
        preferEvidence: false,
      };

    case "improvement_program":
      return {
        kind,
        preferredSlots: ["identity", "subject_grade", "date", "audience", "purpose", "implementation", "impact"],
        minFields: 6,
        maxFields: 7,
        allowImpact: true,
        preferEvidence: false,
      };

    case "parent_communication":
      return {
        kind,
        preferredSlots: ["identity", "audience", "date", "purpose", "implementation", "follow_up"],
        minFields: 5,
        maxFields: 6,
        allowImpact: false,
        preferEvidence: false,
      };

    case "professional_community":
      return {
        kind,
        preferredSlots: ["identity", "date", "audience", "purpose", "implementation", "impact"],
        minFields: 5,
        maxFields: 6,
        allowImpact: true,
        preferEvidence: false,
      };

    case "job_duty":
      return {
        kind,
        preferredSlots: ["identity", "subject_grade", "date", "audience", "purpose", "implementation"],
        minFields: 5,
        maxFields: 6,
        allowImpact: false,
        preferEvidence: false,
      };

    case "learning_environment":
      return {
        kind,
        preferredSlots: ["identity", "date", "audience", "purpose", "implementation", "impact", "evidence"],
        minFields: 5,
        maxFields: 7,
        allowImpact: true,
        preferEvidence: true,
      };

    default:
      return {
        kind,
        preferredSlots: ["identity", "subject_grade", "date", "audience", "purpose", "implementation", "impact"],
        minFields: MIN_FIELDS,
        maxFields: MAX_FIELDS,
        allowImpact: true,
        preferEvidence: false,
      };
  }
}

function preferredLabelForSlot(slot: SemanticSlot, analysis: TeacherIntentAnalysis) {
  const kind = inferCoverageKind(analysis);
  const prompt = norm(analysis.prompt);

  if (slot === "identity") {
    return preferredIdentityFromPrompt(analysis) || "عنوان التقرير";
  }

  if (slot === "subject_grade") {
    if (kind === "professional_community") return "الجهة أو الأطراف المشاركة";
    if (kind === "job_duty") return "الصف / الفصل";
    return "المادة والصف";
  }

  if (slot === "date") {
    if (kind === "results_analysis") return "تاريخ الاختبار";
    if (kind === "parent_communication") return "تاريخ التواصل";
    if (prompt.includes(norm("زيارة"))) return "تاريخ الزيارة";
    if (kind === "learning_plan") return "تاريخ بدء الخطة";
    return "تاريخ التنفيذ";
  }

  if (slot === "audience") {
    if (kind === "parent_communication") return "الأطراف المشاركة";
    if (kind === "professional_community") return "الأطراف المشاركة";
    if (kind === "results_analysis") return "الطلاب المستهدفون بالدعم";
    return "الفئة المستهدفة";
  }

  if (slot === "quantity") {
    if (kind === "results_analysis") return "عدد الطلاب";
    if (prompt.includes(norm("مسابقة"))) return "عدد الطلاب المشاركين";
    if (prompt.includes(norm("تكريم"))) return "عدد الطلاب المكرمين";
    return "العدد";
  }

  if (slot === "skill") {
    if (prompt.includes(norm("إملاء")) || prompt.includes(norm("املاء"))) return "مهارة الإملاء المستهدفة";
    if (prompt.includes(norm("قراءة"))) return "المهارات القرائية المستهدفة";
    return "المهارات المستهدفة";
  }

  if (slot === "purpose") {
    if (kind === "parent_communication") return "سبب التواصل";
    if (kind === "assessment") return "الغرض من التقويم";
    if (kind === "technology") return "الغرض من الاستخدام";
    if (kind === "professional_community") return "هدف اللقاء";
    if (kind === "learning_environment") return "أهداف التنفيذ";
    if (kind === "improvement_program" && prompt.includes(norm("اثرائي"))) return "الأهداف الإثرائية";
    if (kind === "improvement_program") return "الأهداف العلاجية";
    return "الغرض من التنفيذ";
  }

  if (slot === "implementation") {
    if (kind === "parent_communication") return "الإجراءات المتفق عليها";
    if (kind === "technology") return "آلية التوظيف";
    if (kind === "learning_environment") return "إجراءات التنفيذ";
    if (kind === "results_analysis") return "الإجراءات اللاحقة";
    return "إجراءات التنفيذ";
  }

  if (slot === "impact") {
    if (kind === "results_analysis") return "نتائج التحليل";
    if (kind === "assessment") return "أثر التقويم";
    if (kind === "technology") return "الأثر على التعلم";
    if (kind === "classroom_management") return "أثر الإجراء الصفي";
    if (kind === "improvement_program") return "مؤشرات التحسن";
    if (kind === "learning_environment") return "أثر التنفيذ";
    return "النتائج والمخرجات";
  }

  if (slot === "evidence") {
    return "الشواهد والتوثيق";
  }

  if (slot === "follow_up") {
    return "موعد المتابعة القادمة";
  }

  return "ملاحظات";
}

function fieldTypeForSlot(slot: SemanticSlot, label: string): CustomReportField["type"] {
  if (slot === "date" || hasAny(label, ["تاريخ", "موعد"])) return "date";
  if (slot === "quantity" || hasAny(label, ["عدد", "نسبة", "مدة", "درجة", "معدل"])) return "number";

  if (
    slot === "audience" ||
    slot === "purpose" ||
    slot === "implementation" ||
    slot === "impact" ||
    slot === "evidence" ||
    slot === "skill"
  ) {
    return "multi_select";
  }

  return "textarea";
}

function option(label: string, index: number): CustomReportOption {
  return {
    label,
    value: `choice_${index + 1}`,
  };
}

function contextualFallbackOptions(slot: SemanticSlot, label: string, analysis: TeacherIntentAnalysis) {
  const kind = inferCoverageKind(analysis);
  const prompt = norm(analysis.prompt);

  let labels: string[] = [];

  if (slot === "audience") {
    if (kind === "parent_communication") {
      labels = ["ولي الأمر", "الطالب", "المعلم", "المرشد الطلابي"];
    } else if (kind === "professional_community") {
      labels = ["المعلمون", "المشرف التربوي", "قائد المدرسة", "فريق المجتمع المهني"];
    } else if (kind === "results_analysis") {
      labels = ["الطلاب منخفضو الإتقان", "الطلاب متوسطو الإتقان", "الطلاب المتقدمون", "جميع الطلاب"];
    } else if (prompt.includes(norm("إثرائي")) || prompt.includes(norm("اثرائي"))) {
      labels = ["الطلاب المتقدمون", "الطلاب الموهوبون", "طلاب الإتقان العالي", "مجموعة إثرائية"];
    } else {
      labels = ["جميع الطلاب", "مجموعة محددة من الطلاب", "طلاب الصف", "طلاب بحاجة إلى دعم"];
    }
  } else if (slot === "skill") {
    if (prompt.includes(norm("قراءة"))) {
      labels = ["الفهم القرائي", "الطلاقة القرائية", "الاستيعاب القرائي", "تحليل النصوص"];
    } else if (prompt.includes(norm("إملاء")) || prompt.includes(norm("املاء"))) {
      labels = ["كتابة الكلمات", "التمييز بين الحروف", "استخدام علامات الترقيم", "تصحيح الأخطاء الإملائية"];
    } else {
      labels = ["مهارة أساسية", "مهارة تفكير", "مهارة تواصل", "مهارة تطبيق"];
    }
  } else if (slot === "purpose") {
    if (kind === "assessment") {
      labels = ["قياس مستوى الفهم", "تقديم تغذية راجعة", "تحديد جوانب التحسن", "دعم قرارات التدريس"];
    } else if (kind === "technology") {
      labels = ["دعم التعلم الرقمي", "رفع تفاعل الطلاب", "تقديم تغذية راجعة فورية", "متابعة إنجاز الطلاب"];
    } else if (kind === "results_analysis") {
      labels = ["تشخيص مستوى الإتقان", "تحديد الفجوات التعليمية", "تصنيف مستويات الطلاب", "بناء إجراءات دعم مناسبة"];
    } else if (kind === "improvement_program" && prompt.includes(norm("اثرائي"))) {
      labels = ["تنمية مهارات التفكير العليا", "توسيع تعلم الطلاب المتقدمين", "تعزيز حل المشكلات", "إثراء الخبرات التعليمية"];
    } else if (kind === "parent_communication") {
      labels = ["متابعة مستوى الطالب", "معالجة سبب التواصل", "توحيد دور البيت والمدرسة", "الاتفاق على خطوات دعم"];
    } else if (kind === "job_duty") {
      labels = ["تنظيم سير العمل", "تعزيز الانضباط", "ضمان سلامة الطلاب", "توثيق تنفيذ المهمة"];
    } else {
      labels = ["تحقيق هدف التقرير", "رفع جودة التعلم", "تحسين الممارسة", "تعزيز مشاركة الطلاب"];
    }
  } else if (slot === "implementation") {
    if (kind === "assessment") {
      labels = ["شرح أداة التقويم للطلاب", "تطبيق الأداة أثناء التعلم", "جمع الاستجابات", "مراجعة النتائج مع الطلاب"];
    } else if (kind === "technology") {
      labels = ["شرح طريقة الاستخدام", "تنفيذ المهمة الرقمية", "متابعة تفاعل الطلاب", "توثيق المخرجات الرقمية"];
    } else if (kind === "results_analysis") {
      labels = ["تصنيف النتائج حسب مستويات الإتقان", "تحديد الطلاب المستهدفين", "بناء خطة دعم", "متابعة التحسن لاحقًا"];
    } else if (kind === "learning_environment") {
      labels = ["تنظيم المساحة التعليمية", "تجهيز الأدوات والمواد", "توزيع الأدوار", "تفعيل الركن أو البيئة الصفية"];
    } else if (kind === "job_duty") {
      labels = ["تنظيم دخول الطلاب", "توجيه الطلاب للمواقع المحددة", "متابعة الالتزام", "رصد الملاحظات"];
    } else {
      labels = ["تهيئة الطلاب", "تنفيذ النشاط", "متابعة التفاعل", "توثيق الشواهد"];
    }
  } else if (slot === "impact") {
    if (kind === "results_analysis") {
      labels = ["وضوح مستويات الإتقان", "تحديد الفجوات التعليمية", "تحديد الطلاب المستهدفين بالدعم", "بناء إجراءات تحسين"];
    } else if (kind === "improvement_program") {
      labels = ["تحسن تدريجي في الأداء", "زيادة إتقان المهارة", "ارتفاع دافعية الطلاب", "وضوح أثر التدخل"];
    } else if (kind === "learning_environment") {
      labels = ["زيادة دافعية الطلاب", "تحسن التفاعل داخل الصف", "ارتفاع المشاركة", "تحسن التنظيم والسلوك"];
    } else {
      labels = ["تحسن مستوى المشاركة", "زيادة وضوح التعلم", "ارتفاع مستوى التفاعل", "تحقق أثر إيجابي"];
    }
  } else if (slot === "evidence") {
    labels = ["صور التنفيذ", "نماذج من أعمال الطلاب", "سجل المتابعة", "رابط أو ملف توثيق"];
  }

  return labels.map(option);
}

function refinedFallbackOptions(
  slot: SemanticSlot,
  label: string,
  analysis: TeacherIntentAnalysis,
) {
  const kind = inferCoverageKind(analysis);
  const prompt = norm(analysis.prompt);

  let labels: string[] | null = null;

  if (slot === "audience") {
    if (kind === "parent_communication") {
      labels = ["ولي الأمر", "الطالب", "المعلم", "المرشد الطلابي"];
    } else if (kind === "professional_community") {
      labels = ["المعلمون", "المشرف التربوي", "قائد المدرسة", "فريق المجتمع المهني"];
    } else if (kind === "results_analysis") {
      labels = ["الطلاب منخفضو الإتقان", "الطلاب متوسطو الإتقان", "الطلاب المتقدمون", "جميع الطلاب"];
    } else if (prompt.includes(norm("اثرائي"))) {
      labels = ["الطلاب المتقدمون", "الطلاب الموهوبون", "طلاب الإتقان العالي", "مجموعة إثرائية"];
    } else if (kind === "job_duty") {
      labels = ["جميع الطلاب", "طلاب المرحلة المستهدفة", "الطلاب أثناء الدخول والخروج", "مجموعة محددة من الطلاب"];
    } else {
      labels = ["جميع الطلاب", "طلاب الصف", "مجموعة محددة من الطلاب", "طلاب بحاجة إلى دعم"];
    }
  }

  if (slot === "purpose") {
    if (kind === "learning_plan") {
      labels = ["تحديد مسار التعلم", "معالجة المهارة المستهدفة", "رفع مستوى الإتقان", "متابعة تقدم الطالب"];
    } else if (kind === "strategy") {
      labels = ["زيادة مشاركة الطلاب", "تنويع أساليب التدريس", "تحفيز التفكير", "مراعاة الفروق الفردية"];
    } else if (kind === "assessment") {
      labels = ["قياس مستوى الفهم", "تقديم تغذية راجعة", "تحديد جوانب التحسن", "دعم قرارات التدريس"];
    } else if (kind === "classroom_management") {
      labels = ["تحسين الانضباط الصفي", "تنظيم التعلم", "تعزيز الالتزام", "رفع جودة التفاعل الصفي"];
    } else if (kind === "technology") {
      labels = ["دعم التعلم الرقمي", "رفع تفاعل الطلاب", "متابعة إنجاز الطلاب", "تقديم تغذية راجعة فورية"];
    } else if (kind === "results_analysis") {
      labels = ["تشخيص مستوى الإتقان", "تحديد الفجوات التعليمية", "تصنيف مستويات الطلاب", "بناء إجراءات دعم مناسبة"];
    } else if (kind === "improvement_program" && prompt.includes(norm("اثرائي"))) {
      labels = ["تنمية مهارات التفكير العليا", "توسيع تعلم الطلاب المتقدمين", "تعزيز حل المشكلات", "إثراء الخبرات التعليمية"];
    } else if (kind === "improvement_program") {
      labels = ["معالجة المهارة المستهدفة", "رفع مستوى الإتقان", "تقليل الفجوة التعليمية", "متابعة التحسن"];
    } else if (kind === "parent_communication") {
      labels = ["متابعة مستوى الطالب", "معالجة سبب التواصل", "توحيد دور البيت والمدرسة", "الاتفاق على خطوات دعم"];
    } else if (kind === "professional_community") {
      labels = ["تبادل الخبرات", "تحسين الممارسات التعليمية", "تطوير نواتج التعلم", "الاتفاق على تطبيقات عملية"];
    } else if (kind === "job_duty") {
      labels = ["تنظيم سير العمل", "تعزيز الانضباط", "ضمان سلامة الطلاب", "توثيق تنفيذ المهمة"];
    } else if (kind === "learning_environment") {
      labels = ["تهيئة بيئة جاذبة", "رفع دافعية الطلاب", "تعزيز الأمان والتنظيم", "تحسين التفاعل داخل الصف"];
    }
  }

  if (slot === "implementation") {
    if (kind === "learning_plan") {
      labels = ["تحديد المهارة المستهدفة", "تنفيذ أنشطة مناسبة", "متابعة تقدم الطالب", "تقديم تغذية راجعة"];
    } else if (kind === "strategy") {
      labels = ["شرح خطوات الاستراتيجية", "توزيع الأدوار", "تنفيذ النشاط", "مناقشة المخرجات"];
    } else if (kind === "assessment") {
      labels = ["شرح أداة التقويم للطلاب", "تطبيق الأداة أثناء التعلم", "جمع الاستجابات", "مراجعة النتائج مع الطلاب"];
    } else if (kind === "classroom_management") {
      labels = ["توضيح القواعد الصفية", "تنظيم المجموعات", "متابعة الالتزام", "تعزيز السلوك الإيجابي"];
    } else if (kind === "technology") {
      labels = ["شرح طريقة الاستخدام", "تنفيذ المهمة الرقمية", "متابعة تفاعل الطلاب", "توثيق المخرجات الرقمية"];
    } else if (kind === "results_analysis") {
      labels = ["تصنيف النتائج حسب مستويات الإتقان", "تحديد الطلاب المستهدفين", "بناء خطة دعم", "متابعة التحسن لاحقًا"];
    } else if (kind === "improvement_program" && prompt.includes(norm("اثرائي"))) {
      labels = ["تنفيذ أنشطة إثرائية", "طرح مسائل عالية المستوى", "تقديم تحديات تعليمية", "متابعة إنتاج الطلاب"];
    } else if (kind === "improvement_program") {
      labels = ["تنفيذ جلسات دعم", "تطبيق أنشطة علاجية", "متابعة تقدم الطالب", "تقديم تغذية راجعة"];
    } else if (kind === "parent_communication") {
      labels = ["تحديد سبب التواصل", "مناقشة مستوى الطالب", "الاتفاق على إجراءات دعم", "تحديد موعد متابعة"];
    } else if (kind === "professional_community") {
      labels = ["تحديد محاور اللقاء", "مناقشة الممارسات", "تبادل الخبرات", "الاتفاق على تطبيقات عملية"];
    } else if (kind === "job_duty") {
      labels = ["تنظيم دخول الطلاب", "توجيه الطلاب للمواقع المحددة", "متابعة الالتزام", "رصد الملاحظات"];
    } else if (kind === "learning_environment") {
      labels = ["تنظيم المساحة التعليمية", "تجهيز الأدوات والمواد", "توزيع الأدوار", "تفعيل البيئة الصفية"];
    }
  }

  if (slot === "impact") {
    if (kind === "learning_plan") {
      labels = ["تحسن مستوى المهارة", "زيادة انتظام المتابعة", "وضوح تقدم الطالب", "ارتفاع مستوى الإتقان"];
    } else if (kind === "strategy") {
      labels = ["زيادة مشاركة الطلاب", "تحسن التفاعل داخل الدرس", "تنوع استجابات الطلاب", "تحسن فهم المفهوم"];
    } else if (kind === "assessment") {
      labels = ["وضوح مستوى فهم الطلاب", "تحسن التغذية الراجعة", "تحديد جوانب التحسن", "دعم قرار إعادة الشرح"];
    } else if (kind === "classroom_management") {
      labels = ["تحسن الانضباط الصفي", "زيادة الالتزام بالقواعد", "ارتفاع جودة العمل الجماعي", "انخفاض السلوكيات المشتتة"];
    } else if (kind === "technology") {
      labels = ["زيادة تفاعل الطلاب", "تحسن متابعة الإنجاز", "سرعة تقديم التغذية الراجعة", "وضوح المخرجات الرقمية"];
    } else if (kind === "results_analysis") {
      labels = ["وضوح مستويات الإتقان", "تحديد الفجوات التعليمية", "تحديد الطلاب المستهدفين بالدعم", "بناء إجراءات تحسين"];
    } else if (kind === "improvement_program") {
      labels = ["تحسن تدريجي في الأداء", "زيادة إتقان المهارة", "ارتفاع دافعية الطلاب", "وضوح أثر التدخل"];
    } else if (kind === "professional_community") {
      labels = ["تبادل خبرات قابلة للتطبيق", "تحسن التخطيط المشترك", "تطوير الممارسة المهنية", "وضوح إجراءات المتابعة"];
    } else if (kind === "learning_environment") {
      labels = ["زيادة دافعية الطلاب", "تحسن التفاعل داخل الصف", "ارتفاع المشاركة", "تحسن التنظيم والسلوك"];
    }
  }

  if (slot === "evidence") {
    labels = ["صور التنفيذ", "نماذج من أعمال الطلاب", "سجل المتابعة", "رابط أو ملف توثيق"];
  }

  const sourceLabels =
    labels ??
    contextualFallbackOptions(slot, label, analysis).map((item) => item.label);

  const cleaned = sourceLabels.filter(
    (item) =>
      !hasAny(item, [
        "تحقيق هدف التقرير",
        "رفع جودة التعلم",
        "تحسين الممارسة",
        "تهيئة الطلاب",
        "تنفيذ النشاط",
        "متابعة التفاعل",
      ]),
  );

  return cleaned.map(option);
}
function isWeakGenericLabel(label: string) {
  return hasAny(label, [
    "عنوان التقرير",
    "اسم التقرير",
    "الأهداف والوصف",
    "اهداف التقرير",
    "أهداف التقرير",
    "الأهداف",
    "الغرض من التقرير",
    "اسم الفعالية أو المناسبة",
    "عنوان المشاركة المهنية",
  ]);
}

function polishLabel(label: string, analysis: TeacherIntentAnalysis) {
  const prompt = norm(analysis.prompt);
  const normalized = norm(label);
  const preferred = preferredIdentityFromPrompt(analysis);

  if (normalized.includes(norm("الأهداف والوصف"))) return "وصف مختصر";
  if (normalized.includes(norm("طريقة تنظيم الطلاب / المستهدفين"))) return "تنظيم الطلاب";
  if (normalized.includes(norm("الغرض من التقرير"))) return "الغرض من التنفيذ";

  if (normalized.includes(norm("عنوان التقرير")) || normalized.includes(norm("اسم التقرير"))) {
    return preferred || label;
  }

  if (normalized.includes(norm("اسم الخطة العلاجية")) && prompt.includes(norm("اثرائي"))) {
    return "اسم البرنامج الإثرائي";
  }

  if (normalized.includes(norm("عنوان التكريم")) && preferred && !hasAny(preferred, ["تكريم"])) {
    return preferred;
  }

  if (normalized.includes(norm("اسم الفعالية أو المناسبة"))) {
    if (prompt.includes(norm("مسابقة"))) return "اسم المسابقة";
    if (prompt.includes(norm("إذاعة")) || prompt.includes(norm("اذاعه"))) return "اسم الإذاعة المدرسية";
    if (prompt.includes(norm("زيارة"))) return "عنوان الزيارة";
    if (prompt.includes(norm("اليوم الوطني"))) return "اسم الفعالية";
    return preferred || label;
  }

  if (normalized.includes(norm("عنوان المشاركة المهنية"))) {
    if (prompt.includes(norm("اجتماع"))) return "عنوان الاجتماع";
    if (prompt.includes(norm("ورشة"))) return "عنوان الورشة";
    if (prompt.includes(norm("زيارة"))) return "عنوان الزيارة";
    return preferred || label;
  }

  if (normalized.includes(norm("موضوع الدرس")) && prompt.includes(norm("زيارة"))) {
    return "عنوان الزيارة";
  }

  if (normalized.includes(norm("اسم التطبيق")) && prompt.includes(norm("استراتيجية"))) {
    return "اسم الاستراتيجية";
  }

  if (normalized.includes(norm("اسم الأداة التقنية")) && prompt.includes(norm("استراتيجية"))) {
    return "اسم الاستراتيجية";
  }

  if (normalized.includes(norm("اسم الأداة التقنية")) && prompt.includes(norm("قواعد صفية"))) {
    return "عنوان الإجراء الصفي";
  }

  if (
    normalized.includes(norm("اسم الأداة التقنية")) &&
    (
      prompt.includes(norm("استخدام تطبيق")) ||
      prompt.includes(norm("تطبيق كلاس")) ||
      prompt.includes(norm("كلاس دوجو")) ||
      prompt.includes(norm("تطبيق رقمي"))
    )
  ) {
    return "اسم التطبيق";
  }

  return label;
}

function labelQualityScore(label: string, analysis: TeacherIntentAnalysis) {
  const normalizedPrompt = norm(analysis.prompt);
  const normalizedLabel = norm(label);
  const preferred = preferredIdentityFromPrompt(analysis);
  let score = 50;

  if (preferred && norm(label) === norm(preferred)) score += 100;
  if (isWeakGenericLabel(label)) score -= 30;

  for (const token of normalizedPrompt.split(/\s+/).filter((item) => item.length >= 3)) {
    if (normalizedLabel.includes(token)) score += 8;
  }

  if (
    hasAny(label, [
      "منصة",
      "تطبيق",
      "أداة",
      "اداة",
      "درس",
      "استراتيجية",
      "اختبار",
      "وحدة",
      "خطة",
      "برنامج",
      "إثرائي",
      "تكريم",
      "إذاعة",
      "اذاعه",
      "ورشة",
      "اجتماع",
      "زيارة",
      "مسابقة",
      "تواصل",
      "تقويم",
      "مهمة",
      "تكليف",
      "مناوبة",
      "تهيئة",
      "ركن",
      "إجراء صفي",
    ])
  ) {
    score += 15;
  }

  if (hasAny(label, ["عنوان التقرير", "اسم التقرير"])) score -= 45;
  if (hasAny(label, ["الأهداف والوصف"])) score -= 35;
  if (hasAny(label, ["الأهداف"]) && clean(label).length <= 8) score -= 25;

  return score;
}

function identityKind(label: string) {
  if (hasAny(label, ["اسم الطالب", "الطالب"])) return "student";
  if (hasAny(label, ["ولي الأمر", "ولي امر"])) return "guardian";
  return "main";
}

function dedupeKey(field: CustomReportField) {
  const slot = semanticSlot(field.label);

  if (slot === "identity") {
    return `identity:${identityKind(field.label)}`;
  }

  if (
    slot === "audience" ||
    slot === "purpose" ||
    slot === "implementation" ||
    slot === "impact" ||
    slot === "evidence" ||
    slot === "skill"
  ) {
    return slot;
  }

  return `${slot}:${norm(field.label)}`;
}

function optionSlotGuess(optionLabel: string) {
  const text = norm(optionLabel);

  if (hasAny(text, ["شرح", "تنفيذ", "تطبيق", "جمع", "متابعة", "توجيه", "تنظيم", "إعداد", "توزيع", "رصد"])) {
    return "implementation";
  }

  if (hasAny(text, ["تحسن", "ارتفاع", "زيادة", "وضوح", "أثر", "نتيجة", "إتقان"])) {
    return "impact";
  }

  if (hasAny(text, ["تعزيز", "تنمية", "قياس", "تحديد", "تحقيق", "رفع", "دعم", "تحسين"])) {
    return "purpose";
  }

  return "other";
}

function isBadOptionForContext({
  optionLabel,
  field,
  analysis,
}: {
  optionLabel: string;
  field: CustomReportField;
  analysis: TeacherIntentAnalysis;
}) {
  const value = norm(optionLabel);
  const label = norm(field.label);
  const prompt = norm(analysis.prompt);
  const slot = semanticSlot(field.label);
  const guessedSlot = optionSlotGuess(optionLabel);
  const kind = inferCoverageKind(analysis);

  if (!value) return true;

  if (
    value.includes(norm("قيمة مناسبة")) ||
    value.includes(norm("مرتبطة بهدف")) ||
    value.includes(norm("مرتبطة بالشواهد")) ||
    value.includes(norm("يناسب سياق")) ||
    value.includes(norm("تحتاج إلى تحديد"))
  ) {
    return true;
  }

  if (prompt.includes(norm("مناوبة")) && value.includes(norm("إذاعة"))) return true;
  if (prompt.includes(norm("بيئة صفية")) && value.includes(norm("تكريم"))) return true;

  if (
    prompt.includes(norm("اثرائي")) &&
    (
      value.includes(norm("متعثر")) ||
      value.includes(norm("صعوبات")) ||
      value.includes(norm("ضعف")) ||
      value.includes(norm("سد الفجوات")) ||
      value.includes(norm("دعم إضافي")) ||
      value.includes(norm("المهارات الأساسية"))
    )
  ) {
    return true;
  }

  if (slot === "purpose" && guessedSlot === "implementation") return true;
  if (slot === "implementation" && guessedSlot === "purpose" && !label.includes(norm("هدف"))) return true;
  if (slot === "impact" && guessedSlot === "implementation") return true;

  if (label.includes(norm("الغرض")) && hasAny(optionLabel, ["اختبار إلكتروني", "استبيان رأي", "بطاقة ملاحظة", "تذكرة خروج"])) {
    return true;
  }

  if (label.includes(norm("هدف")) && hasAny(optionLabel, ["معلمون", "مشرفون", "قائد المدرسة", "طلاب", "أولياء أمور"])) {
    return true;
  }

  if (
    slot === "audience" &&
    (guessedSlot === "implementation" || guessedSlot === "purpose" || guessedSlot === "impact")
  ) {
    return true;
  }

  if (
    slot === "purpose" &&
    hasAny(optionLabel, [
      "تحقيق هدف التقرير",
      "رفع جودة التعلم",
      "تحسين الممارسة",
      "توثيق الشواهد",
      "تنفيذ النشاط",
      "متابعة التفاعل",
    ])
  ) {
    return true;
  }

  if (
    slot === "implementation" &&
    hasAny(optionLabel, [
      "تحقيق هدف التقرير",
      "رفع جودة التعلم",
      "تحسين الممارسة",
      "زيادة دافعية",
      "ارتفاع مستوى",
      "تحسن مستوى",
      "تحقق أثر",
    ])
  ) {
    return true;
  }

  if (
    slot === "impact" &&
    hasAny(optionLabel, [
      "تهيئة الطلاب",
      "تنفيذ النشاط",
      "تجهيز الأدوات",
      "توزيع الأدوار",
      "تنظيم المساحة",
      "شرح طريقة",
      "جمع الاستجابات",
    ])
  ) {
    return true;
  }

  if (
    kind === "parent_communication" &&
    slot === "implementation" &&
    hasAny(optionLabel, ["تهيئة الطلاب", "تنفيذ النشاط", "متابعة التفاعل", "توثيق الشواهد"])
  ) {
    return true;
  }

  if (
    kind === "professional_community" &&
    slot === "implementation" &&
    hasAny(optionLabel, ["تهيئة الطلاب", "تنفيذ النشاط", "متابعة التفاعل"])
  ) {
    return true;
  }

  if (
    kind === "results_analysis" &&
    slot === "purpose" &&
    !hasAny(optionLabel, ["تشخيص", "فجوات", "إتقان", "اتقان", "نتائج", "مستوى", "تصنيف", "دعم"])
  ) {
    return true;
  }

  return false;
}

function isOtherOption(label: string) {
  const value = norm(label);
  return value === norm("أخرى") || value === norm("اخرى");
}

function startsWithAny(value: string, words: string[]) {
  const normalized = norm(value);
  return words.some((word) => normalized.startsWith(norm(word)));
}

function isToolNameLike(label: string) {
  return hasAny(label, [
    "بطاقة الخروج",
    "سؤال الخروج",
    "ورقة الخروج",
    "تذكرة الخروج",
    "سؤال مفتوح",
    "سؤال مغلق",
    "مقياس تقدير",
    "سلم تقدير",
    "اختبار قصير",
    "اختبار إلكتروني",
    "استبانة",
    "استبيان",
    "ملاحظة صفية",
    "بطاقة ملاحظة",
    "كاهوت",
    "فورمز",
  ]);
}

function isAudienceLike(label: string) {
  return hasAny(label, [
    "طلاب",
    "الطلاب",
    "طالب",
    "الطالب",
    "الصف",
    "الفصل",
    "مجموعة",
    "فئة",
    "المرحلة",
    "المعلم",
    "المعلمون",
    "ولي الأمر",
    "ولي امر",
    "المرشد",
    "المشرف",
    "قائد المدرسة",
    "فريق",
    "أولياء الأمور",
    "اولياء الامور",
  ]);
}

function isValueLike(label: string) {
  return hasAny(label, [
    "احترام النظام",
    "الانضباط",
    "المسؤولية",
    "التعاون",
    "النظافة",
    "الأمانة",
    "الالتزام",
    "الاحترام",
    "الجدية",
  ]);
}

function isImplementationLike(label: string) {
  return startsWithAny(label, [
    "شرح",
    "تنفيذ",
    "تطبيق",
    "جمع",
    "مراجعة",
    "توجيه",
    "تنظيم",
    "توزيع",
    "إعداد",
    "اعداد",
    "تجهيز",
    "رصد",
    "مناقشة",
    "الاتفاق",
    "تفعيل",
    "طرح",
    "اختيار",
    "تكليف",
    "متابعة",
    "تصنيف",
    "بناء",
    "عرض",
    "تدريب",
    "إرسال",
    "ارسال",
    "تدوين",
    "تسجيل",
    "منح",
    "عقد",
  ]);
}

function isPurposeLike(label: string) {
  return startsWithAny(label, [
    "تعزيز",
    "تنمية",
    "رفع",
    "تحسين",
    "قياس",
    "تشخيص",
    "تحديد",
    "دعم",
    "معالجة",
    "توسيع",
    "إثراء",
    "تطوير",
    "زيادة",
    "تحفيز",
    "تقديم تغذية راجعة",
    "توحيد",
  ]);
}

function isImpactLike(label: string) {
  return hasAny(label, [
    "تحسن",
    "زيادة",
    "ارتفاع",
    "وضوح",
    "انخفاض",
    "تطور",
    "تحقق",
    "إتقان",
    "اتقان",
    "أثر",
    "اثر",
    "سرعة",
    "مخرجات",
    "نتائج",
    "دافعية",
    "مشاركة",
    "تفاعل",
    "تقدم",
  ]);
}

function isEvidenceLike(label: string) {
  return hasAny(label, [
    "صور",
    "شواهد",
    "توثيق",
    "رابط",
    "ملف",
    "نماذج",
    "سجل",
    "أعمال الطلاب",
    "اعمال الطلاب",
  ]);
}

function hardFallbackOptions(slot: SemanticSlot, fieldLabel: string, analysis: TeacherIntentAnalysis) {
  const kind = inferCoverageKind(analysis);
  const prompt = norm(analysis.prompt);
  const label = norm(fieldLabel);

  let labels: string[] = [];

  if (slot === "skill" && (label.includes(norm("القيمة")) || prompt.includes(norm("قيمة احترام النظام")))) {
    labels = ["احترام النظام", "الانضباط", "تحمل المسؤولية", "التعاون"];
  } else if (slot === "skill" && prompt.includes(norm("إملاء"))) {
    labels = ["كتابة الكلمات", "التمييز بين الحروف", "تصحيح الأخطاء الإملائية", "استخدام علامات الترقيم"];
  } else if (slot === "skill" && prompt.includes(norm("قراءة"))) {
    labels = ["الفهم القرائي", "الطلاقة القرائية", "الاستيعاب القرائي", "تحليل النصوص"];
  } else if (slot === "audience") {
    if (kind === "parent_communication") {
      labels = ["ولي الأمر", "الطالب", "المعلم", "المرشد الطلابي"];
    } else if (kind === "professional_community") {
      labels = ["المعلمون", "المشرف التربوي", "قائد المدرسة", "فريق المجتمع المهني"];
    } else if (kind === "results_analysis") {
      labels = ["الطلاب منخفضو الإتقان", "الطلاب متوسطو الإتقان", "الطلاب المتقدمون", "جميع الطلاب"];
    } else if (prompt.includes(norm("إثرائي")) || prompt.includes(norm("اثرائي"))) {
      labels = ["الطلاب المتقدمون", "الطلاب الموهوبون", "طلاب الإتقان العالي", "مجموعة إثرائية"];
    } else {
      labels = ["جميع الطلاب", "طلاب الصف", "مجموعة محددة من الطلاب", "طلاب بحاجة إلى دعم"];
    }
  } else if (slot === "purpose") {
    if (kind === "assessment") {
      labels = ["قياس مستوى الفهم", "تقديم تغذية راجعة", "تحديد جوانب التحسن", "دعم قرار إعادة الشرح"];
    } else if (kind === "results_analysis") {
      labels = ["تشخيص مستوى الإتقان", "تحديد الفجوات التعليمية", "تصنيف مستويات الطلاب", "بناء إجراءات دعم مناسبة"];
    } else if (kind === "learning_plan") {
      labels = ["تحديد مسار التعلم", "معالجة المهارة المستهدفة", "رفع مستوى الإتقان", "متابعة تقدم الطالب"];
    } else if (kind === "strategy") {
      labels = ["زيادة مشاركة الطلاب", "تنويع أساليب التدريس", "تحفيز التفكير", "مراعاة الفروق الفردية"];
    } else if (kind === "classroom_management") {
      labels = ["تحسين الانضباط الصفي", "تنظيم التعلم", "تعزيز الالتزام", "رفع جودة التفاعل الصفي"];
    } else if (kind === "technology") {
      labels = ["دعم التعلم الرقمي", "رفع تفاعل الطلاب", "متابعة إنجاز الطلاب", "تقديم تغذية راجعة فورية"];
    } else if (kind === "improvement_program" && prompt.includes(norm("اثرائي"))) {
      labels = ["تنمية مهارات التفكير العليا", "توسيع تعلم الطلاب المتقدمين", "تعزيز حل المشكلات", "إثراء الخبرات التعليمية"];
    } else if (kind === "parent_communication") {
      labels = ["متابعة مستوى الطالب", "معالجة سبب التواصل", "توحيد دور البيت والمدرسة", "الاتفاق على خطوات دعم"];
    } else if (kind === "job_duty") {
      labels = ["تنظيم سير العمل", "تعزيز الانضباط", "ضمان سلامة الطلاب", "توثيق تنفيذ المهمة"];
    } else {
      labels = ["تحقيق الغرض من التقرير", "رفع جودة الممارسة", "تحسين نواتج التعلم", "تعزيز مشاركة الطلاب"];
    }
  } else if (slot === "implementation") {
    if (kind === "assessment") {
      labels = ["شرح أداة التقويم للطلاب", "تطبيق الأداة أثناء التعلم", "جمع الاستجابات", "مراجعة النتائج مع الطلاب"];
    } else if (kind === "results_analysis") {
      labels = ["تصنيف النتائج حسب مستويات الإتقان", "تحديد الطلاب المستهدفين", "بناء خطة دعم", "متابعة التحسن لاحقًا"];
    } else if (kind === "learning_plan") {
      labels = ["تحديد المهارة المستهدفة", "تنفيذ أنشطة مناسبة", "متابعة تقدم الطالب", "تقديم تغذية راجعة"];
    } else if (kind === "strategy") {
      labels = ["شرح خطوات الاستراتيجية", "توزيع الأدوار", "تنفيذ النشاط", "مناقشة المخرجات"];
    } else if (kind === "classroom_management") {
      labels = ["توضيح القواعد الصفية", "تنظيم المجموعات", "متابعة الالتزام", "تعزيز السلوك الإيجابي"];
    } else if (kind === "technology") {
      labels = ["شرح طريقة الاستخدام", "تنفيذ المهمة الرقمية", "متابعة تفاعل الطلاب", "توثيق المخرجات الرقمية"];
    } else if (kind === "learning_environment") {
      labels = ["تنظيم المساحة التعليمية", "تجهيز الأدوات والمواد", "توزيع الأدوار", "تفعيل البيئة الصفية"];
    } else if (kind === "parent_communication") {
      labels = ["تحديد سبب التواصل", "مناقشة مستوى الطالب", "الاتفاق على إجراءات دعم", "تحديد موعد متابعة"];
    } else if (kind === "job_duty") {
      labels = ["تنظيم دخول الطلاب", "توجيه الطلاب للمواقع المحددة", "متابعة الالتزام", "رصد الملاحظات"];
    } else {
      labels = ["تحديد خطوات التنفيذ", "تنفيذ الإجراء", "متابعة التطبيق", "توثيق المخرجات"];
    }
  } else if (slot === "impact") {
    if (kind === "assessment") {
      labels = ["وضوح مستوى فهم الطلاب", "تحسن التغذية الراجعة", "تحديد جوانب التحسن", "دعم قرار إعادة الشرح"];
    } else if (kind === "results_analysis") {
      labels = ["وضوح مستويات الإتقان", "تحديد الفجوات التعليمية", "تحديد الطلاب المستهدفين بالدعم", "بناء إجراءات تحسين"];
    } else if (kind === "learning_plan") {
      labels = ["تحسن مستوى المهارة", "وضوح تقدم الطالب", "ارتفاع مستوى الإتقان", "زيادة انتظام المتابعة"];
    } else if (kind === "strategy") {
      labels = ["زيادة مشاركة الطلاب", "تحسن التفاعل داخل الدرس", "تنوع استجابات الطلاب", "تحسن فهم المفهوم"];
    } else if (kind === "classroom_management") {
      labels = ["تحسن الانضباط الصفي", "زيادة الالتزام بالقواعد", "ارتفاع جودة العمل الجماعي", "انخفاض السلوكيات المشتتة"];
    } else if (kind === "technology") {
      labels = ["زيادة تفاعل الطلاب", "سرعة تقديم التغذية الراجعة", "وضوح المخرجات الرقمية", "تحسن متابعة الإنجاز"];
    } else if (kind === "improvement_program") {
      labels = ["تحسن تدريجي في الأداء", "زيادة إتقان المهارة", "ارتفاع دافعية الطلاب", "وضوح أثر التدخل"];
    } else if (kind === "learning_environment") {
      labels = ["زيادة دافعية الطلاب", "تحسن التفاعل داخل الصف", "ارتفاع المشاركة", "تحسن التنظيم والسلوك"];
    } else {
      labels = ["تحسن مستوى الأداء", "وضوح أثر التنفيذ", "ارتفاع مستوى المشاركة", "تحقق نتائج إيجابية"];
    }
  } else if (slot === "evidence") {
    labels = ["صور التنفيذ", "نماذج من أعمال الطلاب", "سجل المتابعة", "رابط أو ملف توثيق"];
  }

  return labels.map(option);
}

function isFinalValueAllowedForSlot({
  optionLabel,
  slot,
  fieldLabel,
  analysis,
}: {
  optionLabel: string;
  slot: SemanticSlot;
  fieldLabel: string;
  analysis: TeacherIntentAnalysis;
}) {
  if (isOtherOption(optionLabel)) return true;

  const kind = inferCoverageKind(analysis);
  const label = norm(fieldLabel);

  if (slot === "audience") {
    if (label.includes(norm("القيمة"))) return isValueLike(optionLabel);
    return isAudienceLike(optionLabel);
  }

  if (slot === "skill") {
    if (label.includes(norm("القيمة"))) return isValueLike(optionLabel);
    return !isImplementationLike(optionLabel) && !isImpactLike(optionLabel);
  }

  if (slot === "purpose") {
    if (isToolNameLike(optionLabel)) return false;
    if (isEvidenceLike(optionLabel)) return false;

    if (
      startsWithAny(optionLabel, ["شرح", "تنفيذ", "جمع", "مراجعة", "توزيع", "إعداد", "تجهيز", "توثيق"]) &&
      !hasAny(optionLabel, ["تحديد", "تشخيص", "قياس", "تقديم تغذية راجعة"])
    ) {
      return false;
    }

    if (kind === "assessment" && isToolNameLike(optionLabel)) return false;

    return true;
  }

  if (slot === "implementation") {
    if (isToolNameLike(optionLabel) && !isImplementationLike(optionLabel)) return false;
    if (isEvidenceLike(optionLabel) && !startsWithAny(optionLabel, ["توثيق"])) return false;

    if (
      startsWithAny(optionLabel, [
        "تعزيز",
        "تنمية",
        "رفع",
        "تحسين",
        "زيادة",
        "خلق",
        "تحفيز",
        "قياس",
      ])
    ) {
      return false;
    }

    return true;
  }

  if (slot === "impact") {
    if (isImplementationLike(optionLabel)) return false;
    if (isToolNameLike(optionLabel)) return false;
    if (isEvidenceLike(optionLabel)) return false;

    return isImpactLike(optionLabel) || hasAny(optionLabel, ["فجوات", "إتقان", "اتقان", "دعم", "تحسن"]);
  }

  if (slot === "evidence") return isEvidenceLike(optionLabel);

  return true;
}

function finalValueSlotEnforcer({
  options,
  slot,
  field,
  analysis,
}: {
  options: CustomReportOption[];
  slot: SemanticSlot;
  field: CustomReportField;
  analysis: TeacherIntentAnalysis;
}) {
  const cleaned = options.filter((item) =>
    isFinalValueAllowedForSlot({
      optionLabel: item.label,
      slot,
      fieldLabel: field.label,
      analysis,
    }),
  );

  const withoutOther = cleaned.filter((item) => !isOtherOption(item.label));

  const safeFallback = hardFallbackOptions(slot, field.label, analysis).filter((item) =>
    isFinalValueAllowedForSlot({
      optionLabel: item.label,
      slot,
      fieldLabel: field.label,
      analysis,
    }),
  );

  const balanced =
    withoutOther.length >= 3
      ? withoutOther
      : [...withoutOther, ...safeFallback];

  const emergency =
    balanced.length >= 3
      ? balanced
      : safeFallback.length > 0
        ? safeFallback
        : refinedFallbackOptions(slot, field.label, analysis);

  return normalizeTeacherOptions([
    ...emergency,
    { label: "أخرى", value: "other" },
  ]).slice(0, 8);
}

function finalizeField(field: CustomReportField, analysis: TeacherIntentAnalysis) {
  const slot = semanticSlot(field.label);
  const finalType = fieldTypeForSlot(slot, field.label);

  if (finalType !== "multi_select") {
    return {
      ...field,
      type: finalType,
      options: [],
      required: false,
      showInReport: true,
    };
  }

  const filteredOptions = (field.options || []).filter(
    (item) =>
      !isBadOptionForContext({
        optionLabel: item.label,
        field,
        analysis,
      }),
  );

  const fallbackOptions =
    filteredOptions.length >= 4
      ? []
      : hardFallbackOptions(slot, field.label, analysis);

  const mergedOptions = normalizeTeacherOptions([
    ...filteredOptions,
    ...fallbackOptions,
  ]).slice(0, 8);

  return {
    ...field,
    type: finalType,
    options: finalValueSlotEnforcer({
      options: mergedOptions,
      slot,
      field,
      analysis,
    }),
    required: false,
    showInReport: true,
  };
}

function makeField(slot: SemanticSlot, analysis: TeacherIntentAnalysis): CustomReportField {
  const label = preferredLabelForSlot(slot, analysis);
  const type = fieldTypeForSlot(slot, label);

  return {
    key: `auto_${slot}`,
    label,
    reportLabel: label,
    type,
    required: false,
    showInReport: true,
    options:
      type === "multi_select"
        ? normalizeTeacherOptions(refinedFallbackOptions(slot, label, analysis)).slice(0, 8)
        : [],
    order: 1,
  };
}

function ensurePreferredIdentity(fields: CustomReportField[], analysis: TeacherIntentAnalysis) {
  const preferred = preferredIdentityFromPrompt(analysis);

  if (!preferred) return fields;

  const hasPreferred = fields.some((field) => norm(field.label) === norm(preferred));

  if (hasPreferred) return fields;

  const withoutMainIdentity = fields.filter((field) => {
    if (semanticSlot(field.label) !== "identity") return true;
    return identityKind(field.label) !== "main";
  });

  return [makeField("identity", analysis), ...withoutMainIdentity];
}

function ensureCoverage(fields: CustomReportField[], analysis: TeacherIntentAnalysis) {
  const policy = coveragePolicy(analysis);
  const result = [...fields];

  for (const slot of policy.preferredSlots) {
    if (result.length >= policy.maxFields) break;

    const exists = result.some((field) => semanticSlot(field.label) === slot);

    if (!exists) {
      result.push(makeField(slot, analysis));
    }
  }

  const hasPurpose = result.some((field) => semanticSlot(field.label) === "purpose");
  const hasImplementation = result.some((field) => semanticSlot(field.label) === "implementation");
  const hasImpact = result.some((field) => semanticSlot(field.label) === "impact");

  if (policy.allowImpact && hasPurpose && hasImplementation && !hasImpact) {
    if (result.length >= policy.maxFields) {
      const removableIndex = result.findIndex((field) => {
        const slot = semanticSlot(field.label);
        return slot === "other" || slot === "evidence";
      });

      if (removableIndex >= 0) {
        result.splice(removableIndex, 1);
      }
    }

    if (result.length < policy.maxFields) {
      result.push(makeField("impact", analysis));
    }
  }

  if (result.length < policy.minFields) {
    for (const slot of ["purpose", "implementation", "impact", "evidence"] as SemanticSlot[]) {
      if (result.length >= policy.minFields) break;

      if (slot === "impact" && !policy.allowImpact) continue;

      const exists = result.some((field) => semanticSlot(field.label) === slot);

      if (!exists) {
        result.push(makeField(slot, analysis));
      }
    }
  }

  return result;
}

function fieldPriority(field: CustomReportField, analysis: TeacherIntentAnalysis) {
  const slot = semanticSlot(field.label);
  const policy = coveragePolicy(analysis);

  const index = policy.preferredSlots.indexOf(slot);
  const policyScore = index >= 0 ? index * 10 : 200;

  const basePriority: Record<SemanticSlot, number> = {
    identity: 10,
    subject_grade: 20,
    date: 30,
    audience: 40,
    quantity: 45,
    skill: 48,
    purpose: 50,
    implementation: 60,
    follow_up: 65,
    impact: 70,
    evidence: 80,
    other: 120,
  };

  return Math.min(policyScore + 10, basePriority[slot] ?? 120);
}

function removeWeakDescriptionWhenEnough(fields: CustomReportField[]) {
  if (fields.length <= 5) return fields;

  const hasPurpose = fields.some((field) => semanticSlot(field.label) === "purpose");
  const hasImplementation = fields.some((field) => semanticSlot(field.label) === "implementation");

  if (!hasPurpose && !hasImplementation) return fields;

  const filtered = fields.filter((field) => norm(field.label) !== norm("وصف مختصر"));
  return filtered.length >= 5 ? filtered : fields;
}

function removeLowValueOtherFieldsWhenEnough(
  fields: CustomReportField[],
  analysis: TeacherIntentAnalysis,
) {
  const policy = coveragePolicy(analysis);

  if (fields.length <= policy.minFields) {
    return fields;
  }

  const filtered = fields.filter((field) => {
    if (semanticSlot(field.label) !== "other") {
      return true;
    }

    return !hasAny(field.label, ["تنظيم الطلاب", "وصف مختصر", "ملاحظات"]);
  });

  return filtered.length >= policy.minFields ? filtered : fields;
}
export function polishTeacherSchemaSemantics({
  schema,
  analysis,
}: {
  schema: CustomReportSchema;
  analysis: TeacherIntentAnalysis;
}): CustomReportSchema {
  const rawFields = schema.sections.flatMap((section) => section.fields);
  const bestByKey = new Map<string, CustomReportField>();

  for (const rawField of rawFields) {
    const originalLabel = clean(rawField.label || rawField.reportLabel);

    if (!originalLabel || isLowValueField(originalLabel)) continue;

    const polishedLabel = polishLabel(originalLabel, analysis);

    if (!polishedLabel || isLowValueField(polishedLabel)) continue;

    const field = finalizeField(
      {
        ...rawField,
        label: polishedLabel,
        reportLabel: polishedLabel,
        required: false,
        showInReport: true,
      },
      analysis,
    );

    const key = dedupeKey(field);
    const existing = bestByKey.get(key);

    if (!existing) {
      bestByKey.set(key, field);
      continue;
    }

    if (labelQualityScore(field.label, analysis) > labelQualityScore(existing.label, analysis)) {
      bestByKey.set(key, field);
    }
  }

  const withPreferredIdentity = ensurePreferredIdentity(
    Array.from(bestByKey.values()),
    analysis,
  );

  const withCoverage = ensureCoverage(withPreferredIdentity, analysis);

  const finalFields = removeLowValueOtherFieldsWhenEnough(
    removeWeakDescriptionWhenEnough(withCoverage),
    analysis,
  )
    .map((field) => finalizeField(field, analysis))
    .sort(
      (a, b) =>
        fieldPriority(a, analysis) - fieldPriority(b, analysis) ||
        labelQualityScore(b.label, analysis) - labelQualityScore(a.label, analysis) ||
        (a.order || 999) - (b.order || 999),
    )
    .slice(0, Math.min(coveragePolicy(analysis).maxFields, MAX_FIELDS))
    .map((field, index) => ({
      ...field,
      order: index + 1,
    }));

  return {
    ...schema,
    sections: [
      {
        ...schema.sections[0],
        fields: finalFields,
      },
    ],
  };
}