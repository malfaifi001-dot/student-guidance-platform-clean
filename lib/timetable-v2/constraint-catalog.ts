export type ConstraintCategory =
  | "TEACHER"
  | "SUBJECT"
  | "CLASS"
  | "TIME"
  | "ASSIGNMENT"
  | "FAIRNESS";

export type ConstraintTone =
  | "danger"
  | "fixed"
  | "preferred"
  | "fairness"
  | "custom";

export type ConstraintStrength =
  | "HARD"
  | "SOFT";

export type ConstraintScheduleKind =
  | "none"
  | "grid"
  | "days"
  | "periods"
  | "daysPeriods";

export type ConstraintValueKind =
  | "none"
  | "count";

export type ConstraintTargetGroup =
  | "teachers"
  | "subjects"
  | "classes";

export type ConstraintTargets = {
  teachers: boolean;
  subjects: boolean;
  classes: boolean;
};

export type ConstraintDefinition = {
  type: string;
  category: ConstraintCategory;
  label: string;
  description: string;
  hint: string;
  allowedStrengths: ConstraintStrength[];
  defaultStrength: ConstraintStrength;
  targets: ConstraintTargets;
  requiredTargets: ConstraintTargetGroup[];
  schedule: ConstraintScheduleKind;
  valueKind: ConstraintValueKind;
  valueLabel?: string;
  valueMin: number;
  valueMax: number;
  defaultValue: number;
  hasWeight: boolean;
  tone: ConstraintTone;
};

export const CATEGORY_META: Record<
  ConstraintCategory,
  {
    label: string;
    order: number;
  }
> = {
  TEACHER: {
    label: "أ) قيود المعلمين",
    order: 1,
  },

  SUBJECT: {
    label: "ب) قيود المواد",
    order: 2,
  },

  CLASS: {
    label: "ج) قيود الفصول",
    order: 3,
  },

  TIME: {
    label: "د) قيود الزمن والمدرسة",
    order: 4,
  },

  ASSIGNMENT: {
    label: "هـ) قيود التثبيت والإسناد",
    order: 5,
  },

  FAIRNESS: {
    label: "و) قيود التوازن والتوزيع",
    order: 6,
  },
};

export const TONE_META: Record<
  ConstraintTone,
  {
    label: string;
    dot: string;
    chip: string;
    cell: string;
    cellBorder: string;
    text: string;
  }
> = {
  danger: {
    label: "منع",
    dot: "bg-rose-500",
    chip: "bg-rose-100 text-rose-700",
    cell: "bg-rose-50",
    cellBorder: "border-rose-300",
    text: "text-rose-700",
  },

  fixed: {
    label: "تثبيت",
    dot: "bg-violet-500",
    chip: "bg-violet-100 text-violet-700",
    cell: "bg-violet-50",
    cellBorder: "border-violet-300",
    text: "text-violet-700",
  },

  preferred: {
    label: "تفضيل",
    dot: "bg-teal-500",
    chip: "bg-teal-100 text-teal-700",
    cell: "bg-teal-50",
    cellBorder: "border-teal-300",
    text: "text-teal-700",
  },

  fairness: {
    label: "توازن",
    dot: "bg-amber-500",
    chip: "bg-amber-100 text-amber-700",
    cell: "bg-amber-50",
    cellBorder: "border-amber-300",
    text: "text-amber-700",
  },

  custom: {
    label: "مخصص",
    dot: "bg-slate-400",
    chip: "bg-slate-200 text-slate-600",
    cell: "bg-slate-50",
    cellBorder: "border-slate-300",
    text: "text-slate-600",
  },
};

const hard: ConstraintStrength[] = [
  "HARD",
];

const soft: ConstraintStrength[] = [
  "SOFT",
];

const both: ConstraintStrength[] = [
  "HARD",
  "SOFT",
];

export const CONSTRAINT_CATALOG: ConstraintDefinition[] =
  [
    {
      type: "TEACHER_UNAVAILABLE",
      category: "TEACHER",
      label:
        "المعلم غير متاح في أيام وحصص محددة",
      description:
        "منع إسناد أي حصة لهذا المعلم في الخلايا المحددة.",
      hint: "اضغط الخلايا التي لا يمكن للمعلم التدريس فيها.",
      allowedStrengths: hard,
      defaultStrength: "HARD",
      targets: {
        teachers: true,
        subjects: false,
        classes: false,
      },
      requiredTargets: ["teachers"],
      schedule: "grid",
      valueKind: "none",
      valueMin: 0,
      valueMax: 0,
      defaultValue: 0,
      hasWeight: false,
      tone: "danger",
    },

    {
      type: "TEACHER_PREFERRED",
      category: "TEACHER",
      label: "وقت مفضل للمعلم",
      description:
        "تفضيل جدولة هذا المعلم في الخلايا المحددة.",
      hint: "اضغط الخلايا الأفضل لهذا المعلم.",
      allowedStrengths: soft,
      defaultStrength: "SOFT",
      targets: {
        teachers: true,
        subjects: false,
        classes: false,
      },
      requiredTargets: ["teachers"],
      schedule: "grid",
      valueKind: "none",
      valueMin: 0,
      valueMax: 0,
      defaultValue: 0,
      hasWeight: true,
      tone: "preferred",
    },

    {
      type: "TEACHER_DAY_OFF",
      category: "TEACHER",
      label: "يوم راحة للمعلم",
      description:
        "منع إسناد أي حصة لهذا المعلم في الأيام المحددة كاملة.",
      hint: "حدد أيام الراحة الكاملة للمعلم.",
      allowedStrengths: hard,
      defaultStrength: "HARD",
      targets: {
        teachers: true,
        subjects: false,
        classes: false,
      },
      requiredTargets: ["teachers"],
      schedule: "days",
      valueKind: "none",
      valueMin: 0,
      valueMax: 0,
      defaultValue: 0,
      hasWeight: false,
      tone: "danger",
    },

    {
      type: "TEACHER_MAX_DAILY",
      category: "FAIRNESS",
      label:
        "الحد الأقصى لحصص المعلم يوميًا",
      description:
        "ألا تتجاوز حصص هذا المعلم عددًا محددًا في اليوم الواحد.",
      hint: "أدخل الحد الأقصى المسموح به يوميًا.",
      allowedStrengths: both,
      defaultStrength: "SOFT",
      targets: {
        teachers: true,
        subjects: false,
        classes: false,
      },
      requiredTargets: ["teachers"],
      schedule: "none",
      valueKind: "count",
      valueLabel: "الحد الأقصى يوميًا",
      valueMin: 1,
      valueMax: 12,
      defaultValue: 2,
      hasWeight: true,
      tone: "fairness",
    },

    {
      type: "TEACHER_MIN_DAILY",
      category: "FAIRNESS",
      label:
        "الحد الأدنى لحصص المعلم يوميًا",
      description:
        "ألا تقل حصص هذا المعلم عن عدد محدد في اليوم الواحد.",
      hint: "أدخل الحد الأدنى المطلوب يوميًا.",
      allowedStrengths: both,
      defaultStrength: "SOFT",
      targets: {
        teachers: true,
        subjects: false,
        classes: false,
      },
      requiredTargets: ["teachers"],
      schedule: "none",
      valueKind: "count",
      valueLabel: "الحد الأدنى يوميًا",
      valueMin: 0,
      valueMax: 8,
      defaultValue: 1,
      hasWeight: true,
      tone: "fairness",
    },

    {
      type: "TEACHER_MAX_CONSECUTIVE",
      category: "FAIRNESS",
      label:
        "الحد الأقصى للحصص المتتالية للمعلم",
      description:
        "ألا يُسنَد لهذا المعلم عدد من الحصص المتتالية يتجاوز الحد.",
      hint: "أدخل أقصى عدد حصص متتالية مسموح بها.",
      allowedStrengths: both,
      defaultStrength: "SOFT",
      targets: {
        teachers: true,
        subjects: false,
        classes: false,
      },
      requiredTargets: ["teachers"],
      schedule: "none",
      valueKind: "count",
      valueLabel: "أقصى حصص متتالية",
      valueMin: 1,
      valueMax: 6,
      defaultValue: 2,
      hasWeight: true,
      tone: "fairness",
    },

    {
      type: "SUBJECT_BLOCKED",
      category: "SUBJECT",
      label: "وقت ممنوع للمادة",
      description:
        "منع جدولة هذه المادة في الأيام والحصص المحددة.",
      hint: "اختر المادة ثم الأيام والحصص الممنوعة.",
      allowedStrengths: hard,
      defaultStrength: "HARD",
      targets: {
        teachers: false,
        subjects: true,
        classes: true,
      },
      requiredTargets: ["subjects"],
      schedule: "daysPeriods",
      valueKind: "none",
      valueMin: 0,
      valueMax: 0,
      defaultValue: 0,
      hasWeight: false,
      tone: "danger",
    },

    {
      type: "SUBJECT_PREFERRED",
      category: "SUBJECT",
      label: "وقت مفضل للمادة",
      description:
        "تفضيل جدولة هذه المادة في الأيام والحصص المحددة.",
      hint: "اختر المادة ثم الأيام والحصص المفضلة.",
      allowedStrengths: soft,
      defaultStrength: "SOFT",
      targets: {
        teachers: false,
        subjects: true,
        classes: true,
      },
      requiredTargets: ["subjects"],
      schedule: "daysPeriods",
      valueKind: "none",
      valueMin: 0,
      valueMax: 0,
      defaultValue: 0,
      hasWeight: true,
      tone: "preferred",
    },

    {
      type: "SUBJECT_SPECIFIC_TEACHER",
      category: "SUBJECT",
      label: "المادة تُدرس بمعلم محدد",
      description:
        "قصر تدريس هذه المادة على معلمين محددين.",
      hint: "اختر المادة ثم المعلمين المسموحين لها.",
      allowedStrengths: hard,
      defaultStrength: "HARD",
      targets: {
        teachers: true,
        subjects: true,
        classes: false,
      },
      requiredTargets: ["subjects", "teachers"],
      schedule: "none",
      valueKind: "none",
      valueMin: 0,
      valueMax: 0,
      defaultValue: 0,
      hasWeight: false,
      tone: "fixed",
    },

    {
      type: "SUBJECT_DAILY_LIMIT",
      category: "FAIRNESS",
      label: "الحد الأقصى لحصص المادة يوميًا",
      description:
        "ألا تتجاوز حصص هذه المادة عددًا محددًا في اليوم الواحد.",
      hint: "أدخل الحد الأقصى لحصص المادة يوميًا.",
      allowedStrengths: both,
      defaultStrength: "SOFT",
      targets: {
        teachers: false,
        subjects: true,
        classes: false,
      },
      requiredTargets: ["subjects"],
      schedule: "none",
      valueKind: "count",
      valueLabel: "الحد الأقصى يوميًا",
      valueMin: 1,
      valueMax: 12,
      defaultValue: 2,
      hasWeight: true,
      tone: "fairness",
    },

    {
      type: "CLASS_BLOCKED_SLOT",
      category: "CLASS",
      label: "الفصل غير متاح في حصة معينة",
      description:
        "منع جدولة أي حصة لهذا الفصل في الأيام والحصص المحددة.",
      hint: "اختر الفصل ثم الأيام والحصص الممنوعة.",
      allowedStrengths: hard,
      defaultStrength: "HARD",
      targets: {
        teachers: false,
        subjects: false,
        classes: true,
      },
      requiredTargets: ["classes"],
      schedule: "daysPeriods",
      valueKind: "none",
      valueMin: 0,
      valueMax: 0,
      defaultValue: 0,
      hasWeight: false,
      tone: "danger",
    },

    {
      type: "CLASS_PREFERRED_SLOT",
      category: "CLASS",
      label: "وقت مفضل للفصل",
      description:
        "تفضيل جدولة حصص هذا الفصل في الأيام والحصص المحددة.",
      hint: "اختر الفصل ثم الأيام والحصص المفضلة.",
      allowedStrengths: soft,
      defaultStrength: "SOFT",
      targets: {
        teachers: false,
        subjects: false,
        classes: true,
      },
      requiredTargets: ["classes"],
      schedule: "daysPeriods",
      valueKind: "none",
      valueMin: 0,
      valueMax: 0,
      defaultValue: 0,
      hasWeight: true,
      tone: "preferred",
    },

    {
      type: "CLASS_DAILY_LIMIT",
      category: "FAIRNESS",
      label: "الحد الأقصى لحصص الفصل يوميًا",
      description:
        "ألا تتجاوز حصص هذا الفصل عددًا محددًا في اليوم الواحد.",
      hint: "أدخل الحد الأقصى لحصص الفصل يوميًا.",
      allowedStrengths: both,
      defaultStrength: "SOFT",
      targets: {
        teachers: false,
        subjects: false,
        classes: true,
      },
      requiredTargets: ["classes"],
      schedule: "none",
      valueKind: "count",
      valueLabel: "الحد الأقصى يوميًا",
      valueMin: 1,
      valueMax: 12,
      defaultValue: 6,
      hasWeight: true,
      tone: "fairness",
    },

    {
      type: "CLASS_CONSECUTIVE_LIMIT",
      category: "FAIRNESS",
      label:
        "الحد الأقصى للحصص المتتالية للفصل",
      description:
        "ألا تتجاوز الحصص المتتالية لهذا الفصل الحد المحدد.",
      hint: "أدخل أقصى عدد حصص متتالية للفصل.",
      allowedStrengths: both,
      defaultStrength: "SOFT",
      targets: {
        teachers: false,
        subjects: false,
        classes: true,
      },
      requiredTargets: ["classes"],
      schedule: "none",
      valueKind: "count",
      valueLabel: "أقصى حصص متتالية",
      valueMin: 1,
      valueMax: 6,
      defaultValue: 3,
      hasWeight: true,
      tone: "fairness",
    },

    {
      type: "CLASS_NO_DOUBLE",
      category: "CLASS",
      label: "منع الحصص المزدوجة للفصل",
      description:
        "منع إسناد حصتين متتاليتين لنفس المادة لهذا الفصل.",
      hint: "لا يتطلب اختيار أيام أو حصص.",
      allowedStrengths: hard,
      defaultStrength: "HARD",
      targets: {
        teachers: false,
        subjects: false,
        classes: true,
      },
      requiredTargets: ["classes"],
      schedule: "none",
      valueKind: "none",
      valueMin: 0,
      valueMax: 0,
      defaultValue: 0,
      hasWeight: false,
      tone: "fairness",
    },

    {
      type: "SCHOOL_BLOCKED_SLOT",
      category: "TIME",
      label: "وقت معطل على مستوى المدرسة",
      description:
        "لا تُنشأ أي حصة في هذه الخلايا لجميع الفصول.",
      hint: "اضغط الخلايا المعطلة على مستوى المدرسة.",
      allowedStrengths: hard,
      defaultStrength: "HARD",
      targets: {
        teachers: false,
        subjects: false,
        classes: false,
      },
      requiredTargets: [],
      schedule: "grid",
      valueKind: "none",
      valueMin: 0,
      valueMax: 0,
      defaultValue: 0,
      hasWeight: false,
      tone: "danger",
    },

    {
      type: "SCHOOL_BLOCKED_DAY",
      category: "TIME",
      label: "يوم معطل على مستوى المدرسة",
      description:
        "لا تُنشأ أي حصة في هذا اليوم لجميع الفصول.",
      hint: "حدد الأيام المعطلة على مستوى المدرسة.",
      allowedStrengths: hard,
      defaultStrength: "HARD",
      targets: {
        teachers: false,
        subjects: false,
        classes: false,
      },
      requiredTargets: [],
      schedule: "days",
      valueKind: "none",
      valueMin: 0,
      valueMax: 0,
      defaultValue: 0,
      hasWeight: false,
      tone: "danger",
    },

    {
      type: "PREFERRED_FIRST_PERIODS",
      category: "TIME",
      label: "تفضيل الحصص الأولى",
      description:
        "تفضيل جدولة المواد في الحصص الأولى من اليوم.",
      hint: "حدد الحصص المفضلة (عادةً الصباحية).",
      allowedStrengths: soft,
      defaultStrength: "SOFT",
      targets: {
        teachers: false,
        subjects: false,
        classes: false,
      },
      requiredTargets: [],
      schedule: "periods",
      valueKind: "none",
      valueMin: 0,
      valueMax: 0,
      defaultValue: 0,
      hasWeight: true,
      tone: "preferred",
    },

    {
      type: "FIXED_ASSIGNMENT",
      category: "ASSIGNMENT",
      label:
        "تثبيت إسناد معلم/مادة/فصل في خلية محددة",
      description:
        "إجبار وضع هذا المعلم لهذه المادة مع هذا الفصل في الخلايا المحددة.",
      hint: "اختر المعلم والمادة والفصل ثم اضغط الخلايا المراد التثبيت فيها.",
      allowedStrengths: hard,
      defaultStrength: "HARD",
      targets: {
        teachers: true,
        subjects: true,
        classes: true,
      },
      requiredTargets: ["teachers", "subjects", "classes"],
      schedule: "grid",
      valueKind: "none",
      valueMin: 0,
      valueMax: 0,
      defaultValue: 0,
      hasWeight: false,
      tone: "fixed",
    },

    {
      type: "FIXED_SUBJECT_DAY",
      category: "ASSIGNMENT",
      label: "تثبيت مادة وفصل في يوم محدد",
      description:
        "إجبار وضع هذه المادة لهذا الفصل في اليوم المحدد كاملًا.",
      hint: "اختر المادة والفصل ثم الأيام المراد التثبيت فيها.",
      allowedStrengths: hard,
      defaultStrength: "HARD",
      targets: {
        teachers: false,
        subjects: true,
        classes: true,
      },
      requiredTargets: ["subjects", "classes"],
      schedule: "days",
      valueKind: "none",
      valueMin: 0,
      valueMax: 0,
      defaultValue: 0,
      hasWeight: false,
      tone: "fixed",
    },

    {
      type: "FIXED_TEACHER_SLOT",
      category: "ASSIGNMENT",
      label: "تثبيت معلم في خلية محددة",
      description:
        "إجبار إسناد هذا المعلم في الخلايا المحددة.",
      hint: "اختر المعلم ثم اضغط الخلايا المراد التثبيت فيها.",
      allowedStrengths: hard,
      defaultStrength: "HARD",
      targets: {
        teachers: true,
        subjects: false,
        classes: false,
      },
      requiredTargets: ["teachers"],
      schedule: "grid",
      valueKind: "none",
      valueMin: 0,
      valueMax: 0,
      defaultValue: 0,
      hasWeight: false,
      tone: "fixed",
    },

    {
      type: "EVEN_DISTRIBUTION",
      category: "FAIRNESS",
      label: "توزيع متساوٍ للمادة على الأيام",
      description:
        "تفضيل توزيع حصص هذه المادة بالتساوي على أيام الأسبوع.",
      hint: "اختر المادة المراد توزيع حصصها.",
      allowedStrengths: soft,
      defaultStrength: "SOFT",
      targets: {
        teachers: false,
        subjects: true,
        classes: false,
      },
      requiredTargets: ["subjects"],
      schedule: "none",
      valueKind: "none",
      valueMin: 0,
      valueMax: 0,
      defaultValue: 0,
      hasWeight: true,
      tone: "fairness",
    },

    {
      type: "NO_ISOLATED_PERIOD",
      category: "FAIRNESS",
      label: "منع الحصة المعزولة",
      description:
        "منع أن تظهر حصة وحيدة لهذه المادة في اليوم.",
      hint: "اختر المادة التي لا يُسمح لها بحصة معزولة.",
      allowedStrengths: both,
      defaultStrength: "SOFT",
      targets: {
        teachers: false,
        subjects: true,
        classes: true,
      },
      requiredTargets: ["subjects"],
      schedule: "none",
      valueKind: "none",
      valueMin: 0,
      valueMax: 0,
      defaultValue: 0,
      hasWeight: true,
      tone: "fairness",
    },
  ];

const CUSTOM_DEFINITION: ConstraintDefinition =
  {
    type: "__CUSTOM__",
    category: "CLASS",
    label: "قيد مخصص",
    description:
      "قيد محفوظ بنوع غير معروف. لن يسمح محرك الجدول بتجاهله بصمت.",
    hint:
      "يجب دعم هذا النوع في عقد محرك Timetable V2 أو حذف القيد بعد مراجعة المستخدم.",
    allowedStrengths: both,
    defaultStrength: "HARD",
    targets: {
      teachers: false,
      subjects: false,
      classes: false,
    },
    requiredTargets: [],
    schedule: "none",
    valueKind: "none",
    valueMin: 0,
    valueMax: 0,
    defaultValue: 0,
    hasWeight: false,
    tone: "custom",
  };

const byType: Record<
  string,
  ConstraintDefinition
> = {};

for (
  const definition
  of CONSTRAINT_CATALOG
) {
  byType[definition.type] =
    definition;
}

export function getConstraintDefinition(
  type: string,
): ConstraintDefinition {
  return (
    byType[type] ??
    CUSTOM_DEFINITION
  );
}

export function getCatalogForBuilder(): ConstraintDefinition[] {
  return [
    ...CONSTRAINT_CATALOG,
  ].sort(
    (a, b) =>
      CATEGORY_META[a.category]
        .order -
      CATEGORY_META[b.category]
        .order,
  );
}
