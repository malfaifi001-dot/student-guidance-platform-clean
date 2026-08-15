import type {
  ConstraintStrength,
} from "@/lib/timetable-v2/constraint-catalog";

export type SchoolConstraintPresetCategory =
  | "TEACHER"
  | "SUBJECT"
  | "CLASS"
  | "ASSIGNMENT";

export type SchoolConstraintPreset = {
  id: string;

  category:
    SchoolConstraintPresetCategory;

  title: string;

  description: string;

  type: string;

  strength:
    ConstraintStrength;

  valueInt:
    number | null;

  weight:
    number | null;

  periodOrders:
    number[];

  requires: {
    teachers: boolean;
    subjects: boolean;
    classes: boolean;
    days: boolean;
    periods: boolean;
  };

  recommendation:
    "COMMON"
    | "USE_WHEN_NEEDED"
    | "ADVANCED";
};

/*
 * هذه القوالب لا تحفظ قيوداً تلقائياً.
 *
 * وظيفتها فقط تجهيز Draft واقعي ثم يختار المستخدم
 * المعلم/المادة/الفصل/اليوم المطلوب من بيانات مشروعه.
 *
 * HARD = شرط لا يجوز كسره.
 * SOFT = تفضيل يحاول المحرك تحقيقه.
 */
export const SCHOOL_CONSTRAINT_PRESETS:
  SchoolConstraintPreset[] = [
    // ========================================================
    // المعلم
    // ========================================================

    {
      id:
        "teacher-max-daily-5",

      category:
        "TEACHER",

      title:
        "حد المعلم اليومي",

      description:
        "لا يتجاوز المعلم 5 حصص في اليوم. مناسب لمنع ضغط جدول المعلم في يوم واحد.",

      type:
        "TEACHER_MAX_DAILY",

      strength:
        "HARD",

      valueInt:
        5,

      weight:
        null,

      periodOrders:
        [],

      requires: {
        teachers:
          true,

        subjects:
          false,

        classes:
          false,

        days:
          false,

        periods:
          false,
      },

      recommendation:
        "COMMON",
    },

    {
      id:
        "teacher-max-consecutive-4",

      category:
        "TEACHER",

      title:
        "منع الحصص المتتالية الطويلة",

      description:
        "لا يدرّس المعلم أكثر من 4 حصص متتالية دون فاصل.",

      type:
        "TEACHER_MAX_CONSECUTIVE",

      strength:
        "HARD",

      valueInt:
        4,

      weight:
        null,

      periodOrders:
        [],

      requires: {
        teachers:
          true,

        subjects:
          false,

        classes:
          false,

        days:
          false,

        periods:
          false,
      },

      recommendation:
        "COMMON",
    },

    {
      id:
        "teacher-day-off",

      category:
        "TEACHER",

      title:
        "يوم غير متاح للمعلم",

      description:
        "استخدمه عندما يكون المعلم غير متاح طوال يوم دراسي كامل.",

      type:
        "TEACHER_DAY_OFF",

      strength:
        "HARD",

      valueInt:
        null,

      weight:
        null,

      periodOrders:
        [],

      requires: {
        teachers:
          true,

        subjects:
          false,

        classes:
          false,

        days:
          true,

        periods:
          false,
      },

      recommendation:
        "USE_WHEN_NEEDED",
    },

    {
      id:
        "teacher-unavailable",

      category:
        "TEACHER",

      title:
        "عدم توفر المعلم في حصص محددة",

      description:
        "للاجتماعات أو التكليفات الإدارية أو الحضور الجزئي في أيام وأوقات محددة.",

      type:
        "TEACHER_UNAVAILABLE",

      strength:
        "HARD",

      valueInt:
        null,

      weight:
        null,

      periodOrders:
        [],

      requires: {
        teachers:
          true,

        subjects:
          false,

        classes:
          false,

        days:
          true,

        periods:
          true,
      },

      recommendation:
        "USE_WHEN_NEEDED",
    },

    {
      id:
        "teacher-preferred-early",

      category:
        "TEACHER",

      title:
        "تفضيل حصص مبكرة للمعلم",

      description:
        "يحاول وضع حصص المعلم في الحصص الأولى دون جعل ذلك شرطاً إجبارياً.",

      type:
        "TEACHER_PREFERRED",

      strength:
        "SOFT",

      valueInt:
        null,

      weight:
        20,

      periodOrders: [
        1,
        2,
        3,
        4,
      ],

      requires: {
        teachers:
          true,

        subjects:
          false,

        classes:
          false,

        days:
          false,

        periods:
          true,
      },

      recommendation:
        "USE_WHEN_NEEDED",
    },

    // ========================================================
    // المادة
    // ========================================================

    {
      id:
        "subject-daily-limit-1",

      category:
        "SUBJECT",

      title:
        "مادة واحدة فقط في اليوم",

      description:
        "مناسب للمواد التي يجب توزيعها على أيام الأسبوع وعدم تكرارها مرتين في نفس اليوم.",

      type:
        "SUBJECT_DAILY_LIMIT",

      strength:
        "HARD",

      valueInt:
        1,

      weight:
        null,

      periodOrders:
        [],

      requires: {
        teachers:
          false,

        subjects:
          true,

        classes:
          false,

        days:
          false,

        periods:
          false,
      },

      recommendation:
        "COMMON",
    },

    {
      id:
        "subject-preferred-early",

      category:
        "SUBJECT",

      title:
        "مادة مفضلة في بداية اليوم",

      description:
        "مناسب للرياضيات والعلوم والمواد التي يفضل تدريسها أثناء التركيز الأعلى.",

      type:
        "SUBJECT_PREFERRED",

      strength:
        "SOFT",

      valueInt:
        null,

      weight:
        30,

      periodOrders: [
        1,
        2,
        3,
        4,
      ],

      requires: {
        teachers:
          false,

        subjects:
          true,

        classes:
          false,

        days:
          false,

        periods:
          true,
      },

      recommendation:
        "COMMON",
    },

    {
      id:
        "subject-block-first",

      category:
        "SUBJECT",

      title:
        "منع مادة من الحصة الأولى",

      description:
        "مناسب مثلاً للتربية البدنية أو مادة لا ترغب المدرسة أن تبدأ بها اليوم الدراسي.",

      type:
        "SUBJECT_BLOCKED",

      strength:
        "HARD",

      valueInt:
        null,

      weight:
        null,

      periodOrders: [
        1,
      ],

      requires: {
        teachers:
          false,

        subjects:
          true,

        classes:
          false,

        days:
          false,

        periods:
          true,
      },

      recommendation:
        "COMMON",
    },

    {
      id:
        "subject-no-isolated",

      category:
        "SUBJECT",

      title:
        "تجنب الحصة المعزولة",

      description:
        "يفيد في المواد التي يفضل عدم وضع حصة منفردة بطريقة غير مناسبة داخل توزيع الأسبوع.",

      type:
        "NO_ISOLATED_PERIOD",

      strength:
        "SOFT",

      valueInt:
        null,

      weight:
        15,

      periodOrders:
        [],

      requires: {
        teachers:
          false,

        subjects:
          true,

        classes:
          false,

        days:
          false,

        periods:
          false,
      },

      recommendation:
        "ADVANCED",
    },

    // ========================================================
    // الفصل
    // ========================================================

    {
      id:
        "class-blocked-slot",

      category:
        "CLASS",

      title:
        "الفصل غير متاح في وقت محدد",

      description:
        "مثلاً نشاط ثابت أو طابور أو استخدام موقع آخر يمنع الفصل من استقبال حصة في وقت معين.",

      type:
        "CLASS_BLOCKED_SLOT",

      strength:
        "HARD",

      valueInt:
        null,

      weight:
        null,

      periodOrders:
        [],

      requires: {
        teachers:
          false,

        subjects:
          false,

        classes:
          true,

        days:
          true,

        periods:
          true,
      },

      recommendation:
        "USE_WHEN_NEEDED",
    },

    {
      id:
        "class-preferred-early",

      category:
        "CLASS",

      title:
        "تفضيل حصص الفصل في أوقات محددة",

      description:
        "تفضيل مرن لوقت مناسب لفصل معين دون جعل الجدول مستحيلاً.",

      type:
        "CLASS_PREFERRED_SLOT",

      strength:
        "SOFT",

      valueInt:
        null,

      weight:
        15,

      periodOrders: [
        1,
        2,
        3,
        4,
        5,
      ],

      requires: {
        teachers:
          false,

        subjects:
          false,

        classes:
          true,

        days:
          false,

        periods:
          true,
      },

      recommendation:
        "USE_WHEN_NEEDED",
    },

    {
      id:
        "class-max-consecutive",

      category:
        "CLASS",

      title:
        "حد الحصص المتتالية للفصل",

      description:
        "يستخدم عندما تريد المدرسة الحد من سلسلة متصلة طويلة من الحصص لفصل معين.",

      type:
        "CLASS_CONSECUTIVE_LIMIT",

      strength:
        "SOFT",

      valueInt:
        6,

      weight:
        10,

      periodOrders:
        [],

      requires: {
        teachers:
          false,

        subjects:
          false,

        classes:
          true,

        days:
          false,

        periods:
          false,
      },

      recommendation:
        "ADVANCED",
    },

    // ========================================================
    // تثبيتات وحالات خاصة
    // ========================================================

    {
      id:
        "fixed-subject-day",

      category:
        "ASSIGNMENT",

      title:
        "تثبيت مادة في يوم معين",

      description:
        "مثلاً معمل أو نشاط أو مادة مرتبطة بيوم محدد.",

      type:
        "FIXED_SUBJECT_DAY",

      strength:
        "HARD",

      valueInt:
        null,

      weight:
        null,

      periodOrders:
        [],

      requires: {
        teachers:
          false,

        subjects:
          true,

        classes:
          true,

        days:
          true,

        periods:
          false,
      },

      recommendation:
        "USE_WHEN_NEEDED",
    },

    {
      id:
        "fixed-teacher-slot",

      category:
        "ASSIGNMENT",

      title:
        "تثبيت المعلم في حصة",

      description:
        "للحالات التي يجب أن يكون فيها معلم محدد مثبتاً في يوم وحصة محددين.",

      type:
        "FIXED_TEACHER_SLOT",

      strength:
        "HARD",

      valueInt:
        null,

      weight:
        null,

      periodOrders:
        [],

      requires: {
        teachers:
          true,

        subjects:
          false,

        classes:
          false,

        days:
          true,

        periods:
          true,
      },

      recommendation:
        "ADVANCED",
    },
  ];

export function getSchoolConstraintPresetsByCategory(
  category:
    SchoolConstraintPresetCategory,
) {
  return SCHOOL_CONSTRAINT_PRESETS.filter(
    (preset) =>
      preset.category ===
      category,
  );
}