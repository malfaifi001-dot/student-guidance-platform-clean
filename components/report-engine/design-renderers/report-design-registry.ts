import type {
  ReportDesignDefinition,
  ReportDesignId,
} from "./report-design-types";

export const reportDesignTemplates: ReportDesignDefinition[] = [
  {
    id: "ministry-form",
    name: "نموذج الوزارة الرسمي",
    badge: "رسمي",
    description: "قريب من نماذج الوزارة: رأس داكن، شكل رسمي، وفوتر أخضر.",
    cardClass: "border-slate-200 bg-slate-50 hover:bg-white",
    activeCardClass: "border-slate-800 bg-slate-100 shadow-sm",
  },
  {
    id: "modern-official",
    name: "تقرير رسمي حديث",
    badge: "حديث",
    description: "شريط جانبي أكاديمي وبطاقات منظمة للتقارير التفصيلية.",
    cardClass: "border-sky-200 bg-sky-50 hover:bg-white",
    activeCardClass: "border-sky-700 bg-sky-100 shadow-sm",
  },
  {
    id: "evidence-showcase",
    name: "تقرير شواهد بصري",
    badge: "شواهد",
    description: "مناسب للتقارير التي تركز على الصور والمرفقات والإنجاز.",
    cardClass: "border-emerald-200 bg-emerald-50 hover:bg-white",
    activeCardClass: "border-emerald-700 bg-emerald-100 shadow-sm",
  },
  {
    id: "formal-memo",
    name: "خطاب ومحضر رسمي",
    badge: "خطاب",
    description: "تصميم صارم للمحاضر والاستدعاءات والخطابات الإدارية.",
    cardClass: "border-zinc-300 bg-zinc-50 hover:bg-white",
    activeCardClass: "border-zinc-900 bg-zinc-100 shadow-sm",
  },
  {
    id: "counseling-case-file",
    name: "ملف حالة إرشادية",
    badge: "حالة",
    description: "يشبه ملف متابعة: عمود بيانات جانبي ومحتوى رئيسي للحالة.",
    cardClass: "border-teal-200 bg-teal-50 hover:bg-white",
    activeCardClass: "border-teal-700 bg-teal-100 shadow-sm",
  },
  {
    id: "behavior-followup",
    name: "متابعة سلوكية",
    badge: "سلوك",
    description: "تصميم بجدول زمني جانبي مناسب للمتابعة والخطط العلاجية.",
    cardClass: "border-amber-200 bg-amber-50 hover:bg-white",
    activeCardClass: "border-amber-700 bg-amber-100 shadow-sm",
  },
  {
    id: "program-impact",
    name: "أثر برنامج إرشادي",
    badge: "برنامج",
    description: "تصميم بصري لتقارير البرامج، الأثر، الإحصاءات، والتوصيات.",
    cardClass: "border-cyan-200 bg-cyan-50 hover:bg-white",
    activeCardClass: "border-cyan-700 bg-cyan-100 shadow-sm",
  },
  {
    id: "girls-rose-official",
    name: "بناتي وردي رسمي",
    badge: "بناتي",
    description: "تصميم ناعم للبنات مع محافظة على الطابع الرسمي للتقرير.",
    cardClass: "border-rose-200 bg-rose-50 hover:bg-white",
    activeCardClass: "border-rose-600 bg-rose-100 shadow-sm",
  },
  {
    id: "girls-lilac-elegant",
    name: "بناتي ليلكي أنيق",
    badge: "بناتي",
    description: "تصميم بنفسجي هادئ مناسب للتقارير الفردية والبرامج.",
    cardClass: "border-violet-200 bg-violet-50 hover:bg-white",
    activeCardClass: "border-violet-700 bg-violet-100 shadow-sm",
  },
  {
    id: "girls-pearl-calm",
    name: "بناتي لؤلؤي هادئ",
    badge: "بناتي",
    description: "تصميم فاتح وهادئ مناسب لتقارير الرعاية والدعم والمتابعة.",
    cardClass: "border-fuchsia-200 bg-fuchsia-50 hover:bg-white",
    activeCardClass: "border-fuchsia-700 bg-fuchsia-100 shadow-sm",
  },
  {
    id: "report-official-archive",
    name: "تقرير رسمي منظم",
    badge: "رسمي",
    description: "تصميم رسمي صارم: ترويسة أرشيفية، جدول بيانات، وخانات اعتماد واضحة.",
    cardClass: "border-slate-300 bg-slate-50 hover:bg-white",
    activeCardClass: "border-slate-950 bg-slate-100 shadow-sm",
  },
  {
    id: "report-playful-cards",
    name: "تقرير مرح بالبطاقات",
    badge: "مرح",
    description: "تصميم بطاقات نشاط: كروت كبيرة، شارات، وأسلوب بصري مناسب للبرامج.",
    cardClass: "border-orange-200 bg-orange-50 hover:bg-white",
    activeCardClass: "border-orange-600 bg-orange-100 shadow-sm",
  },
  {
    id: "report-calm-reader",
    name: "تقرير مريح للقراءة",
    badge: "مريح",
    description: "تصميم هادئ واسع: مساحات بيضاء، قراءة سهلة، وترتيب ناعم للقيم.",
    cardClass: "border-stone-200 bg-stone-50 hover:bg-white",
    activeCardClass: "border-stone-700 bg-stone-100 shadow-sm",
  },
  {
    id: "ministry-elegant",
    name: "الوزاري الأنيق",
    badge: "وزاري",
    description: "هوية تعليمية رسمية بإطار متوازن وزوايا هندسية هادئة.",
    cardClass: "border-teal-200 bg-teal-50 hover:bg-white",
    activeCardClass: "border-teal-800 bg-teal-100 shadow-sm",
  },
  {
    id: "moe-official-2024",
    name: "الهوية الرسمية 2024",
    badge: "وزارة",
    description: "تصميم رسمي مستوحى من الهوية البصرية التعليمية الحديثة.",
    cardClass: "border-emerald-200 bg-emerald-50 hover:bg-white",
    activeCardClass: "border-emerald-700 bg-emerald-100 shadow-sm",
  },
  {
    id: "editorial-atlas",
    name: "الأطلس التحريري",
    badge: "تحريري",
    description: "تصميم تحريري أنيق للمحتوى الطويل والتقارير الغنية بالتفاصيل.",
    cardClass: "border-slate-200 bg-slate-50 hover:bg-white",
    activeCardClass: "border-slate-800 bg-slate-100 shadow-sm",
  },
  {
    id: "geometric-horizon",
    name: "الأفق الهندسي",
    badge: "هندسي",
    description: "هوية هندسية حديثة بكتل واضحة وتباين بصري قوي.",
    cardClass: "border-indigo-200 bg-indigo-50 hover:bg-white",
    activeCardClass: "border-indigo-700 bg-indigo-100 shadow-sm",
  },
  {
    id: "moe-classic-frame",
    name: "النموذج الوزاري الكلاسيكي",
    badge: "وزاري",
    description: "نموذج رسمي بهيدر وفوتر وزاري كلاسيكي وجداول بيانات مباشرة.",
    cardClass: "border-cyan-200 bg-cyan-50 hover:bg-white",
    activeCardClass: "border-cyan-800 bg-cyan-100 shadow-sm",
  },
];

export const SELECTABLE_REPORT_DESIGN_IDS = [
  "ministry-elegant",
  "ministry-form",
  "moe-official-2024",
  "moe-classic-frame",
] as const satisfies readonly ReportDesignId[];

export type SelectableReportDesignId =
  (typeof SELECTABLE_REPORT_DESIGN_IDS)[number];

export const selectableReportDesignTemplates: ReportDesignDefinition[] =
  SELECTABLE_REPORT_DESIGN_IDS.map(
    (designId) => reportDesignTemplates.find((design) => design.id === designId),
  ).filter((design): design is ReportDesignDefinition => Boolean(design));

export function isReportDesignId(value: unknown): value is ReportDesignId {
  return reportDesignTemplates.some((design) => design.id === value);
}

export function isSelectableReportDesignId(
  value: unknown,
): value is SelectableReportDesignId {
  return (
    typeof value === "string" &&
    SELECTABLE_REPORT_DESIGN_IDS.includes(value as SelectableReportDesignId)
  );
}

export function getReportDesignDefinition(
  designId?: string | null,
): ReportDesignDefinition {
  return (
    reportDesignTemplates.find((design) => design.id === designId) ||
    reportDesignTemplates[0]
  );
}
