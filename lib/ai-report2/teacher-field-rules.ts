import { normalizeAiReportArabicText } from "@/lib/ai-report/ai-report-knowledge-retriever";
import type {
  CustomReportField,
  CustomReportOption,
} from "@/lib/custom-report/custom-report-types";

const MAX_OPTIONS = 8;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function isBadTeacherOption(value: string) {
  const normalized = normalizeAiReportArabicText(value);
  const wordCount = value.split(/\s+/).filter(Boolean).length;

  return (
    !normalized ||
    wordCount > 14 ||
    normalized.includes("قيمة مناسبة") ||
    normalized.includes("يناسب سياق") ||
    normalized.includes("مرتبطة بهدف") ||
    normalized.includes("مرتبط بهدف") ||
    normalized.includes("مرتبطة بالشواهد") ||
    normalized.includes("مرتبط بالشواهد") ||
    normalized.includes("مرتبطة بسياق") ||
    normalized.includes("مرتبط بسياق") ||
    normalized.includes("تحتاج الى تحديد") ||
    normalized.includes("يحتاج الى توضيح")
  );
}

function hasAny(label: string, words: string[]) {
  const normalized = normalizeAiReportArabicText(label);

  return words.some((word) =>
    normalized.includes(normalizeAiReportArabicText(word)),
  );
}

export function normalizeTeacherOptions(
  value: unknown,
  maxOptions = MAX_OPTIONS,
): CustomReportOption[] {
  const rawItems = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const options: CustomReportOption[] = [];

  for (const item of rawItems) {
    const label =
      typeof item === "string"
        ? clean(item)
        : item && typeof item === "object"
          ? clean((item as Record<string, unknown>).label)
          : "";

    if (!label || isBadTeacherOption(label)) {
      continue;
    }

    const key = normalizeAiReportArabicText(label);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);

    if (key === normalizeAiReportArabicText("أخرى")) {
      continue;
    }

    options.push({
      label,
      value: `choice_${options.length + 1}`,
    });

    if (options.length >= maxOptions - 1) {
      break;
    }
  }

  options.push({
    label: "أخرى",
    value: "other",
  });

  return options;
}

export function classifyTeacherFieldType(
  label: string,
  existingOptionsCount = 0,
): CustomReportField["type"] {
  if (hasAny(label, ["تاريخ", "موعد"]) && !hasAny(label, ["مكان", "وصف"])) {
    return "date" as CustomReportField["type"];
  }

  if (
    hasAny(label, [
      "عدد",
      "كمية",
      "نسبة",
      "معدل",
      "درجة",
      "درجات",
      "مدة",
      "ساعات",
      "دقائق",
    ])
  ) {
    return "number" as CustomReportField["type"];
  }

  if (
    hasAny(label, [
      "اسم",
      "عنوان",
      "موضوع",
      "وصف",
      "مكان",
      "جهة",
      "مصدر",
      "رابط",
      "ملاحظة",
      "المادة",
      "الصف",
      "اسم الاختبار",
      "اسم الوحدة",
      "اسم الخطة",
      "اسم المنصة",
      "اسم الأداة",
      "اسم اداة",
      "عنوان التكريم",
      "عنوان الورشة",
      "عنوان الإذاعة",
      "عنوان الاذاعه",
      "نوع المهمة",
      "نوع التكليف",
    ])
  ) {
    return "textarea" as CustomReportField["type"];
  }

  if (
    hasAny(label, [
      "أهداف",
      "هدف",
      "خطوات",
      "إجراءات",
      "آلية",
      "فقرات",
      "شواهد",
      "توثيق",
      "أدلة",
      "أثر",
      "نتائج",
      "مخرجات",
      "جوانب الضعف",
      "مؤشرات",
      "استراتيجيات",
      "أدوات",
      "وسائل",
      "مهارات",
      "أدوار",
      "الفئة",
      "المستهدفة",
      "المستهدفون",
      "المستهدفين",
      "الأطراف",
      "الاطراف",
      "طريقة",
      "محاور",
      "مستوى الالتزام",
      "تفاعل",
      "مشاركة",
    ])
  ) {
    return "multi_select" as CustomReportField["type"];
  }

  if (existingOptionsCount > 0) {
    return "multi_select" as CustomReportField["type"];
  }

  return "multi_select" as CustomReportField["type"];
}

export function buildContextualTeacherOptions({
  label,
  intentCode,
}: {
  label: string;
  intentCode: string;
}) {
  if (hasAny(label, ["أهداف", "هدف"])) {
    if (intentCode === "STUDENT_RECOGNITION") {
      return normalizeTeacherOptions([
        "تحفيز الطلاب على التميز",
        "تعزيز الدافعية للتعلم",
        "إبراز النماذج الإيجابية",
        "تنمية روح المنافسة الإيجابية",
        "تعزيز الانتماء للمدرسة",
        "تقدير جهود الطلاب",
      ]);
    }

    if (intentCode === "NATIONAL_EVENT") {
      return normalizeTeacherOptions([
        "تعزيز الانتماء الوطني",
        "إبراز قيم المواطنة",
        "تنمية روح المشاركة",
        "تعزيز الاعتزاز بالهوية الوطنية",
        "ربط الطلاب بالمناسبات الوطنية",
        "إثراء البيئة المدرسية",
      ]);
    }

    return normalizeTeacherOptions([
      "تحقيق نواتج التعلم",
      "تعزيز مشاركة الطلاب",
      "تنمية مهارات التفكير",
      "معالجة جوانب الضعف",
      "رفع مستوى الإتقان",
      "تحسين جودة التعلم",
    ]);
  }

  if (hasAny(label, ["خطوات", "إجراءات", "آلية", "فقرات", "تنفيذ"])) {
    return normalizeTeacherOptions([
      "تحديد الهدف ومتطلبات التنفيذ",
      "تهيئة الطلاب أو المشاركين",
      "توزيع الأدوار والمهام",
      "تنفيذ النشاط وفق الخطة",
      "توظيف الوسائل والأدوات المناسبة",
      "متابعة التفاعل أثناء التنفيذ",
      "توثيق الشواهد",
      "قياس الأثر واستخلاص النتائج",
    ]);
  }

  if (hasAny(label, ["شواهد", "توثيق", "أدلة"])) {
    return normalizeTeacherOptions([
      "صور من التنفيذ",
      "فيديو توثيقي",
      "نماذج من أعمال الطلاب",
      "إعلان أو تعميم",
      "قائمة حضور أو مشاركة",
      "رابط أو ملف داعم",
      "تغذية راجعة",
      "نتائج أو مؤشرات قياس",
    ]);
  }

  if (hasAny(label, ["أثر", "نتائج", "مخرجات"])) {
    return normalizeTeacherOptions([
      "تحسن تفاعل الطلاب",
      "زيادة مستوى المشاركة",
      "تحقق أهداف التنفيذ",
      "ارتفاع الدافعية",
      "تحسن السلوك أو الأداء المستهدف",
      "ظهور مخرجات قابلة للتوثيق",
      "تعزيز البيئة التعليمية",
    ]);
  }

  if (hasAny(label, ["تحديات", "صعوبات", "معوقات"])) {
    return normalizeTeacherOptions([
      "ضيق وقت التنفيذ",
      "تفاوت مستويات الطلاب",
      "ضعف تفاعل بعض الطلاب",
      "الحاجة إلى أدوات إضافية",
      "تحديات تقنية",
      "صعوبة تنظيم الأدوار",
      "قلة الشواهد المتاحة",
    ]);
  }

  if (hasAny(label, ["توصيات", "مقترحات", "فرص التحسين"])) {
    return normalizeTeacherOptions([
      "تكرار التجربة مع التحسين",
      "توسيع مشاركة الطلاب",
      "تنويع أساليب التنفيذ",
      "إعداد الشواهد مبكرًا",
      "توفير أدوات داعمة",
      "تعزيز دور الطلاب",
      "متابعة الأثر لاحقًا",
    ]);
  }

  if (hasAny(label, ["الفئة", "المستهدفة"])) {
    return normalizeTeacherOptions([
      "طلاب الصفوف الأولية",
      "طلاب الصفوف العليا",
      "طلاب المرحلة المتوسطة",
      "طلاب المرحلة الثانوية",
      "مجموعة مختارة من الطلاب",
      "جميع طلاب الصف",
      "أولياء الأمور",
      "المجتمع المدرسي",
    ]);
  }

  if (hasAny(label, ["طريقة التواصل"])) {
    return normalizeTeacherOptions([
      "اتصال هاتفي",
      "رسالة نصية",
      "منصة مدرستي",
      "اجتماع حضوري",
      "اجتماع عن بعد",
      "مذكرة متابعة",
    ]);
  }

  if (hasAny(label, ["استراتيجيات"])) {
    return normalizeTeacherOptions([
      "التعلم التعاوني",
      "العصف الذهني",
      "حل المشكلات",
      "فكر زاوج شارك",
      "التعلم بالاكتشاف",
      "التعلم القائم على المشروع",
      "خرائط المفاهيم",
    ]);
  }

  if (hasAny(label, ["أدوات", "وسائل", "تقنية"])) {
    return normalizeTeacherOptions([
      "عرض مرئي",
      "أوراق عمل",
      "منصة رقمية",
      "أداة تفاعلية",
      "بطاقات تعليمية",
      "فيديو تعليمي",
      "خرائط مفاهيم",
      "نماذج تطبيقية",
    ]);
  }

  return normalizeTeacherOptions([
    "يناسب سياق التقرير",
    "مرتبط بتنفيذ النشاط أو المهمة",
    "مرتبط بالشواهد المتاحة",
    "مرتبط بأثر التنفيذ",
    "مرتبط بتحسين الممارسة",
    "يحتاج إلى توضيح من المعلم",
  ]);
}