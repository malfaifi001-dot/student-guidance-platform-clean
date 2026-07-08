import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const inputPath = path.join(
  root,
  "data",
  "ai-report",
  "generated",
  "teacher-performance-knowledge-bank.json",
);
const outputPath = path.join(
  root,
  "data",
  "ai-report",
  "generated",
  "teacher-report-patterns.json",
);

const MAX_LABELS = 14;

function normalizeArabic(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clean(value) {
  return String(value ?? "").trim();
}

function collectItems(raw) {
  if (Array.isArray(raw)) {
    return raw;
  }

  const directKeys = [
    "items",
    "knowledgeItems",
    "entries",
    "valueBank",
    "records",
  ];

  for (const key of directKeys) {
    if (Array.isArray(raw?.[key])) {
      return raw[key];
    }
  }

  if (Array.isArray(raw?.data?.items)) {
    return raw.data.items;
  }

  return [];
}

function hasAny(text, words) {
  const normalized = normalizeArabic(text);
  return words.some((word) => normalized.includes(normalizeArabic(word)));
}

function isExcludedLabel(label) {
  return hasAny(label, [
    "تحديات",
    "تحدي",
    "صعوبات",
    "معوقات",
    "توصيات",
    "توصية",
    "مقترحات",
    "مقترح",
    "فرص التحسين",
    "فرص تحسين",
  ]);
}

function classifySlot(label, fieldKey = "") {
  const text = `${label} ${fieldKey}`;

  if (hasAny(text, ["تاريخ", "موعد"])) return "date";

  if (hasAny(text, ["المادة", "الصف", "الفصل"])) return "subject_grade";

  if (hasAny(text, ["الفئة", "المستهدفة", "المستفيد", "المشاركين"])) {
    return "audience";
  }

  if (hasAny(text, ["عدد", "نسبة", "مدة", "درجة", "درجات", "معدل"])) {
    return "quantity";
  }

  if (hasAny(text, ["هدف", "اهداف", "أهداف", "الغرض", "مبررات", "سبب"])) {
    return "purpose";
  }

  if (hasAny(text, ["آلية", "الية", "خطوات", "اجراءات", "إجراءات", "تنفيذ", "توظيف", "استخدام", "تطبيق"])) {
    return "implementation";
  }

  if (hasAny(text, ["ادوات", "أدوات", "وسائل", "تقنية", "منصة", "مصادر"])) {
    return "tools";
  }

  if (hasAny(text, ["تفاعل", "مشاركة", "دور المعلم", "دور المتعلمين", "دور الطلاب"])) {
    return "interaction";
  }

  if (hasAny(text, ["اثر", "أثر", "نتائج", "مخرجات", "تحسن", "مؤشرات"])) {
    return "impact";
  }

  if (hasAny(text, ["شواهد", "توثيق", "ادلة", "أدلة", "مرفقات"])) {
    return "evidence";
  }

  if (hasAny(text, ["اسم", "عنوان", "موضوع", "نوع", "اختبار", "وحدة", "استراتيجية", "برنامج", "مبادرة", "ورشة", "تكريم", "فعالية"])) {
    return "primary_identity";
  }

  return "other";
}

const INTENT_RULES = [
  {
    code: "RESULTS_ANALYSIS",
    keywords: ["تحليل نتائج", "نتائج اختبار", "اختبار نهاية", "درجات", "اتقان", "إتقان", "فجوات"],
  },
  {
    code: "ASSESSMENT_PRACTICE",
    keywords: ["اساليب التقويم", "أساليب التقويم", "تنوع التقويم", "اداة تقويم", "أداة تقويم", "بطاقة خروج", "تقويم"],
  },
  {
    code: "STUDENT_RECOGNITION",
    keywords: ["تكريم", "المتفوقين", "المتميزين", "تحفيز", "جوائز"],
  },
  {
    code: "NATIONAL_EVENT",
    keywords: ["اليوم الوطني", "احتفالية", "فعالية", "مناسبة", "اذاعة", "إذاعة", "مسابقة", "حملة", "اسبوع", "أسبوع", "يوم عالمي"],
  },
  {
    code: "REMEDIAL_PLAN",
    keywords: ["خطة علاجية", "متعثر", "الطلاب المتعثرين", "ضعف", "فجوات", "دعم"],
  },
  {
    code: "PARENT_COMMUNICATION",
    keywords: ["ولي امر", "ولي أمر", "اولياء الامور", "أولياء الأمور", "تواصل", "غياب"],
  },
  {
    code: "TECHNOLOGY_USE",
    keywords: ["منصة", "مدرستي", "تقنية", "اداة رقمية", "أداة رقمية", "تطبيق"],
  },
  {
    code: "TEACHING_STRATEGY",
    keywords: ["استراتيجية", "خرائط المفاهيم", "تمثيل الادوار", "تمثيل الأدوار", "تعلم تعاوني", "التعلم باللعب"],
  },
  {
    code: "LESSON_IMPLEMENTATION",
    keywords: ["درس", "حصة نموذجية", "موضوع الدرس", "نواتج التعلم"],
  },
  {
    code: "PROFESSIONAL_COMMUNITY",
    keywords: ["مجتمع مهني", "ورشة", "زيارة تبادلية", "تبادل خبرات", "مشرف"],
  },
  {
    code: "DUTY_FOLLOWUP",
    keywords: ["حصة انتظار", "مناوبة", "تكليف", "واجب وظيفي", "متابعة"],
  },
  {
    code: "PORTFOLIO_EVIDENCE",
    keywords: ["ملف انجاز", "ملف إنجاز", "شواهد", "منجز", "توثيق"],
  },
];

function inferIntent(item) {
  const text = [
    item.reportName,
    item.report_name,
    item.reportCategory,
    item.report_category,
    item.performanceElement,
    item.performance_element,
    item.category,
    item.fieldLabel,
    item.field_label,
    item.fieldKey,
    item.field_key,
  ].join(" ");

  const matched = INTENT_RULES
    .map((rule) => ({
      code: rule.code,
      score: rule.keywords.filter((keyword) =>
        normalizeArabic(text).includes(normalizeArabic(keyword)),
      ).length,
    }))
    .sort((a, b) => b.score - a.score);

  return matched[0]?.score > 0 ? matched[0].code : "GENERAL_TEACHER_REPORT";
}

function addCount(map, key, label, slot) {
  if (!key || !label || isExcludedLabel(label)) return;

  const normalizedLabel = normalizeArabic(label);

  if (!normalizedLabel || normalizedLabel.length < 2) return;

  const bucket =
    map.get(key) ||
    {
      key,
      slots: {},
      labels: {},
      total: 0,
    };

  bucket.total += 1;

  bucket.slots[slot] ||= {};
  bucket.slots[slot][label] = (bucket.slots[slot][label] || 0) + 1;

  bucket.labels[label] = (bucket.labels[label] || 0) + 1;

  map.set(key, bucket);
}

function topLabelsForBucket(bucket) {
  const slotOrder = [
    "primary_identity",
    "subject_grade",
    "date",
    "audience",
    "quantity",
    "purpose",
    "implementation",
    "tools",
    "interaction",
    "impact",
    "evidence",
  ];

  const result = [];
  const seen = new Set();

  for (const slot of slotOrder) {
    const labels = Object.entries(bucket.slots[slot] || {})
      .sort((a, b) => b[1] - a[1])
      .map(([label]) => label);

    for (const label of labels.slice(0, 2)) {
      const key = normalizeArabic(label);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(label);
      }

      if (result.length >= MAX_LABELS) {
        return result;
      }
    }
  }

  const byFrequency = Object.entries(bucket.labels)
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label);

  for (const label of byFrequency) {
    const key = normalizeArabic(label);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(label);
    }

    if (result.length >= MAX_LABELS) {
      break;
    }
  }

  return result;
}

if (!fs.existsSync(inputPath)) {
  throw new Error(`Knowledge bank not found: ${inputPath}`);
}

const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const items = collectItems(raw);

const byIntent = new Map();
const byPerformanceElement = new Map();
const global = new Map();

for (const item of items) {
  const fieldLabel = clean(
    item.fieldLabel ||
      item.field_label ||
      item.category ||
      item.fieldKey ||
      item.field_key,
  );

  if (!fieldLabel || isExcludedLabel(fieldLabel)) {
    continue;
  }

  const fieldKey = clean(item.fieldKey || item.field_key);
  const slot = classifySlot(fieldLabel, fieldKey);
  const intentCode = inferIntent(item);
  const performanceElement = clean(
    item.performanceElement ||
      item.performance_element ||
      "GENERAL",
  );

  addCount(byIntent, intentCode, fieldLabel, slot);
  addCount(byPerformanceElement, performanceElement, fieldLabel, slot);
  addCount(global, "GLOBAL", fieldLabel, slot);
}

function serializeMap(map) {
  return Object.fromEntries(
    Array.from(map.entries()).map(([key, bucket]) => [
      key,
      {
        total: bucket.total,
        orderedLabels: topLabelsForBucket(bucket),
        slots: Object.fromEntries(
          Object.entries(bucket.slots).map(([slot, labels]) => [
            slot,
            Object.entries(labels)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([label, count]) => ({ label, count })),
          ]),
        ),
      },
    ]),
  );
}

const output = {
  generatedAt: new Date().toISOString(),
  source: "teacher-performance-knowledge-bank.json",
  maxFields: 7,
  description:
    "Patterns extracted from teacher report knowledge bank. Used as flexible guidance, not a mandatory template.",
  slotOrder: [
    "primary_identity",
    "subject_grade",
    "date",
    "audience",
    "quantity",
    "purpose",
    "implementation",
    "tools",
    "interaction",
    "impact",
    "evidence",
  ],
  patternsByIntent: serializeMap(byIntent),
  patternsByPerformanceElement: serializeMap(byPerformanceElement),
  globalPattern: serializeMap(global).GLOBAL || null,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

console.log(`AI Report 2 patterns generated: ${outputPath}`);
console.log(`Items analyzed: ${items.length}`);
console.log(`Intent patterns: ${byIntent.size}`);
console.log(`Performance patterns: ${byPerformanceElement.size}`);