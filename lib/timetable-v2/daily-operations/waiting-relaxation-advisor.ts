export type WaitingExcludedTeacher = {
  teacherId: string;
  teacherName: string;
  codes: string[];
  reasons?: string[];
};

export type WaitingRelaxationChange = {
  code: string;

  title: string;

  description: string;

  section:
    | "POLICY"
    | "TEACHERS";

  risk:
    | "LOW"
    | "MEDIUM";

  settingKey?: string;
};

export type WaitingTeacherRecoveryPath = {
  teacherId: string;
  teacherName: string;

  changeCount: number;

  changes:
    WaitingRelaxationChange[];
};

export type WaitingSingleChangeOpportunity = {
  code: string;

  change:
    WaitingRelaxationChange;

  teachers: Array<{
    teacherId: string;
    teacherName: string;
  }>;

  unlockedCount: number;
};

export type WaitingRelaxationAdvice = {
  version:
    "waiting-relaxation-v1";

  canRecover:
    boolean;

  mode:
    | "SINGLE_CHANGE"
    | "MULTI_CHANGE"
    | "STRUCTURAL_BLOCK";

  title:
    string;

  summary:
    string;

  singleChangeOptions:
    WaitingSingleChangeOpportunity[];

  bestTeacherPaths:
    WaitingTeacherRecoveryPath[];

  structuralBlockedTeachers:
    Array<{
      teacherId: string;
      teacherName: string;
      codes: string[];
    }>;
};

/*
 * هذه الأسباب لا يجوز للمحرك أن يقترح
 * تجاوزها بمجرد تغيير ضابط انتظار.
 */
const structuralCodes =
  new Set([
    "ORIGINAL_TEACHER",
    "INACTIVE_TEACHER",
    "BUSY_IN_PERIOD",
    "ABSENT_ON_DATE",
    "ALREADY_ASSIGNED_IN_PERIOD",
    "SUPERVISION_CONFLICT",

    /*
     * EXCLUDED_PERIOD يستخدم حاليًا أيضًا
     * لعدم توفر المعلم الأصلي في بعض البيانات.
     *
     * لذلك نتعامل معه بتحفظ ولا نقترح
     * إزالته آليًا حتى نميز مصدره صراحة.
     */
    "EXCLUDED_PERIOD",
  ]);

const changeByCode:
  Record<
    string,
    WaitingRelaxationChange
  > = {
  DAILY_LIMIT_REACHED: {
    code:
      "DAILY_LIMIT_REACHED",

    title:
      "رفع الحد اليومي للانتظار",

    description:
      "ارفع الحد اليومي للمعلم حتى يسمح له بتكليف إضافي اليوم.",

    section:
      "POLICY",

    risk:
      "MEDIUM",

    settingKey:
      "maxDailySubstitutions",
  },

  WEEKLY_LIMIT_REACHED: {
    code:
      "WEEKLY_LIMIT_REACHED",

    title:
      "رفع الحد الأسبوعي للانتظار",

    description:
      "ارفع الحد الأسبوعي حتى يسمح للمعلم بتكليف إضافي هذا الأسبوع.",

    section:
      "POLICY",

    risk:
      "MEDIUM",

    settingKey:
      "maxWeeklySubstitutions",
  },

  BEFORE_FIRST_LESSON: {
    code:
      "BEFORE_FIRST_LESSON",

    title:
      "السماح قبل أول حصة",

    description:
      "السماح للمعلم بأخذ انتظار قبل أول حصة أصلية له.",

    section:
      "POLICY",

    risk:
      "LOW",

    settingKey:
      "allowBeforeFirstLesson",
  },

  AFTER_LAST_LESSON: {
    code:
      "AFTER_LAST_LESSON",

    title:
      "السماح بعد آخر حصة",

    description:
      "السماح للمعلم بأخذ انتظار بعد آخر حصة أصلية له.",

    section:
      "POLICY",

    risk:
      "LOW",

    settingKey:
      "allowAfterLastLesson",
  },

  INSIDE_GAP_NOT_ALLOWED: {
    code:
      "INSIDE_GAP_NOT_ALLOWED",

    title:
      "السماح باستخدام الفراغ الداخلي",

    description:
      "السماح باستغلال الفراغ الموجود بين حصص المعلم للانتظار.",

    section:
      "POLICY",

    risk:
      "LOW",

    settingKey:
      "allowInsideGap",
  },

  GOLDEN_DAY: {
    code:
      "GOLDEN_DAY",

    title:
      "السماح في اليوم الذهبي",

    description:
      "السماح بالانتظار في اليوم الذهبي عند الحاجة.",

    section:
      "POLICY",

    risk:
      "MEDIUM",

    settingKey:
      "allowOnGoldenDay",
  },

  CONSECUTIVE_WAITING: {
    code:
      "CONSECUTIVE_WAITING",

    title:
      "السماح بانتظار متتالٍ",

    description:
      "إلغاء منع حصتي انتظار متتاليتين لهذا السيناريو.",

    section:
      "POLICY",

    risk:
      "MEDIUM",

    settingKey:
      "preventConsecutiveSubstitutions",
  },

  FIRST_PERIOD_DISABLED: {
    code:
      "FIRST_PERIOD_DISABLED",

    title:
      "السماح بالانتظار في الحصة الأولى",

    description:
      "إلغاء منع الانتظار في الحصة الأولى.",

    section:
      "POLICY",

    risk:
      "LOW",

    settingKey:
      "preventFirstPeriod",
  },

  LAST_PERIOD_DISABLED: {
    code:
      "LAST_PERIOD_DISABLED",

    title:
      "السماح بالانتظار في الحصة الأخيرة",

    description:
      "إلغاء منع الانتظار في الحصة الأخيرة.",

    section:
      "POLICY",

    risk:
      "LOW",

    settingKey:
      "preventLastPeriod",
  },

  SPECIALTY_MISMATCH: {
    code:
      "SPECIALTY_MISMATCH",

    title:
      "تحويل تطابق التخصص من إلزامي إلى تفضيلي",

    description:
      "السماح بمعلم من تخصص مختلف مع إبقاء تطابق التخصص عامل أفضلية.",

    section:
      "POLICY",

    risk:
      "MEDIUM",

    settingKey:
      "requireMatchingSpecialty",
  },

  EXCLUDED_DAY: {
    code:
      "EXCLUDED_DAY",

    title:
      "مراجعة استثناء يوم المعلم",

    description:
      "هذا المعلم مستثنى يدويًا من الانتظار في هذا اليوم. إزالة الاستثناء قد تجعله مؤهلًا.",

    section:
      "TEACHERS",

    risk:
      "MEDIUM",
  },
};

function uniqueCodes(
  codes: string[],
) {
  return Array.from(
    new Set(
      codes.filter(Boolean),
    ),
  );
}

export function buildWaitingRelaxationAdvice(
  excluded:
    WaitingExcludedTeacher[],
): WaitingRelaxationAdvice {
  const teacherPaths:
    WaitingTeacherRecoveryPath[] =
      [];

  const structuralBlockedTeachers:
    WaitingRelaxationAdvice["structuralBlockedTeachers"] =
      [];

  for (
    const teacher of
    excluded
  ) {
    const codes =
      uniqueCodes(
        teacher.codes,
      );

    /*
     * المعلم لديه سبب حقيقي لا يتعلق
     * بضابط انتظار قابل للتخفيف.
     */
    const structural =
      codes.filter(
        (code) =>
          structuralCodes.has(
            code,
          ),
      );

    if (
      structural.length >
      0
    ) {
      structuralBlockedTeachers.push({
        teacherId:
          teacher.teacherId,

        teacherName:
          teacher.teacherName,

        codes:
          structural,
      });

      continue;
    }

    const changes =
      codes
        .map(
          (code) =>
            changeByCode[
              code
            ],
        )
        .filter(
          (
            change,
          ): change is
            WaitingRelaxationChange =>
              Boolean(
                change,
              ),
        );

    /*
     * إذا كان هناك كود غير معروف فلا ندعي
     * أن تغيير الضوابط سيحل المشكلة.
     */
    if (
      changes.length !==
      codes.length ||
      changes.length ===
        0
    ) {
      structuralBlockedTeachers.push({
        teacherId:
          teacher.teacherId,

        teacherName:
          teacher.teacherName,

        codes,
      });

      continue;
    }

    teacherPaths.push({
      teacherId:
        teacher.teacherId,

      teacherName:
        teacher.teacherName,

      changeCount:
        changes.length,

      changes,
    });
  }

  teacherPaths.sort(
    (
      first,
      second,
    ) => {
      if (
        first.changeCount !==
        second.changeCount
      ) {
        return (
          first.changeCount -
          second.changeCount
        );
      }

      return first.teacherName.localeCompare(
        second.teacherName,
        "ar",
      );
    },
  );

  /*
   * التعديل الواحد مهم جدًا:
   * ما الضابط الذي لو تغير وحده
   * يفتح أكبر عدد من المعلمين؟
   */
  const singleChangeMap =
    new Map<
      string,
      WaitingSingleChangeOpportunity
    >();

  for (
    const path of
    teacherPaths
  ) {
    if (
      path.changeCount !==
      1
    ) {
      continue;
    }

    const change =
      path.changes[0];

    const current =
      singleChangeMap.get(
        change.code,
      );

    if (current) {
      current.teachers.push({
        teacherId:
          path.teacherId,

        teacherName:
          path.teacherName,
      });

      current.unlockedCount =
        current.teachers.length;

      continue;
    }

    singleChangeMap.set(
      change.code,
      {
        code:
          change.code,

        change,

        teachers: [
          {
            teacherId:
              path.teacherId,

            teacherName:
              path.teacherName,
          },
        ],

        unlockedCount:
          1,
      },
    );
  }

  const singleChangeOptions =
    Array.from(
      singleChangeMap.values(),
    ).sort(
      (
        first,
        second,
      ) =>
        second.unlockedCount -
        first.unlockedCount,
    );

  if (
    singleChangeOptions.length >
    0
  ) {
    const best =
      singleChangeOptions[0];

    return {
      version:
        "waiting-relaxation-v1",

      canRecover:
        true,

      mode:
        "SINGLE_CHANGE",

      title:
        "يمكن توفير بديل بتعديل ضابط واحد",

      summary:
        `${best.change.title} قد يفتح ${best.unlockedCount} معلم للترشيح في هذه الحصة.`,

      singleChangeOptions,

      bestTeacherPaths:
        teacherPaths.slice(
          0,
          5,
        ),

      structuralBlockedTeachers,
    };
  }

  if (
    teacherPaths.length >
    0
  ) {
    const best =
      teacherPaths[0];

    return {
      version:
        "waiting-relaxation-v1",

      canRecover:
        true,

      mode:
        "MULTI_CHANGE",

      title:
        "يوجد مسار بديل لكن يحتاج أكثر من تعديل",

      summary:
        `${best.teacherName} هو أقرب معلم متاح مبدئيًا ويحتاج تعديل ${best.changeCount} من ضوابط الانتظار.`,

      singleChangeOptions:
        [],

      bestTeacherPaths:
        teacherPaths.slice(
          0,
          5,
        ),

      structuralBlockedTeachers,
    };
  }

  return {
    version:
      "waiting-relaxation-v1",

    canRecover:
      false,

    mode:
      "STRUCTURAL_BLOCK",

    title:
      "تغيير ضوابط الانتظار وحده لن يحل الحالة",

    summary:
      "المعلمون المتاحون حاليًا مستبعدون بسبب تعارض فعلي مثل الانشغال أو الغياب أو عدم التوفر، وليس بسبب ضابط انتظار قابل للتخفيف.",

    singleChangeOptions:
      [],

    bestTeacherPaths:
      [],

    structuralBlockedTeachers,
  };
}