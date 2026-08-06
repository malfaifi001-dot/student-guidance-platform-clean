"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  TimetableConstraint,
  TimetableConstraintLevel,
  TimetableConstraintType,
} from "@/lib/timetable/timetable-constraint-types";

type NamedItem = {
  id: string;
  name: string;
};

type Day = {
  id: string;
  label: string;
};

type Period = {
  id: string;
  label: string;
  isBreak?: boolean;
};

type ConstraintCategory =
  | "TEACHER"
  | "SUBJECT"
  | "TIME"
  | "CLASS"
  | "FAIRNESS";

const definitions: Array<{
  type: TimetableConstraintType;
  category: ConstraintCategory;
  label: string;
}> = [
  {
    type: "TEACHER_UNAVAILABLE_SLOT",
    category: "TEACHER",
    label: "المعلم غير متاح في يوم وحصة",
  },
  {
    type: "TEACHER_DAY_OFF",
    category: "TEACHER",
    label: "يوم راحة للمعلم",
  },
  {
    type: "TEACHER_NOT_BEFORE_PERIOD",
    category: "TEACHER",
    label: "المعلم لا يدرس قبل حصة",
  },
  {
    type: "TEACHER_NOT_AFTER_PERIOD",
    category: "TEACHER",
    label: "المعلم لا يدرس بعد حصة",
  },
  {
    type: "TEACHER_MAX_DAILY_PERIODS",
    category: "TEACHER",
    label: "الحد الأعلى لحصص المعلم يوميًا",
  },
  {
    type: "TEACHER_MAX_CONSECUTIVE_PERIODS",
    category: "TEACHER",
    label: "الحد الأعلى للحصص المتتالية",
  },
  {
    type: "TEACHER_MAX_DAILY_GAPS",
    category: "TEACHER",
    label: "الحد الأعلى للفجوات اليومية",
  },
  {
    type: "SUBJECT_FORBIDDEN_SLOT",
    category: "SUBJECT",
    label: "منع مادة في حصة أو يوم",
  },
  {
    type: "SUBJECT_FIXED_SLOT",
    category: "SUBJECT",
    label: "تثبيت مادة في يوم وحصة",
  },
  {
    type: "SUBJECT_MAX_DAILY_OCCURRENCES",
    category: "SUBJECT",
    label: "الحد اليومي لتكرار المادة",
  },
  {
    type: "SCHOOL_BLOCKED_SLOT",
    category: "TIME",
    label: "إغلاق خانة على المدرسة كاملة",
  },
  {
    type: "CLASS_NO_INTERNAL_GAPS",
    category: "CLASS",
    label: "منع الفراغ داخل جدول الفصل",
  },
  {
    type: "CLASS_MAX_HEAVY_SUBJECTS_DAILY",
    category: "CLASS",
    label: "حد المواد الثقيلة يوميًا",
  },
  {
    type: "FAIR_FIRST_PERIODS",
    category: "FAIRNESS",
    label: "عدالة توزيع الحصة الأولى",
  },
  {
    type: "FAIR_LAST_PERIODS",
    category: "FAIRNESS",
    label: "عدالة توزيع الحصة الأخيرة",
  },
];

const categories: Array<{
  value: ConstraintCategory;
  label: string;
}> = [
  { value: "TEACHER", label: "قيود المعلمين" },
  { value: "SUBJECT", label: "قيود المواد" },
  { value: "TIME", label: "قيود الوقت" },
  { value: "CLASS", label: "قيود الفصول" },
  { value: "FAIRNESS", label: "العدالة" },
];

export function TimetableConstraintsCenter({
  projectId,
  teachers,
  classes,
  subjects,
  days,
  periods,
}: {
  projectId: string;
  teachers: NamedItem[];
  classes: NamedItem[];
  subjects: NamedItem[];
  days: Day[];
  periods: Period[];
}) {
  const teachingPeriods = useMemo(
    () =>
      periods.filter(
        (period) => !period.isBreak,
      ),
    [periods],
  );

  const [constraints, setConstraints] = useState<
    TimetableConstraint[]
  >([]);

  const [category, setCategory] =
    useState<ConstraintCategory>("TEACHER");

  const availableDefinitions = definitions.filter(
    (definition) =>
      definition.category === category,
  );

  const [type, setType] =
    useState<TimetableConstraintType>(
      "TEACHER_UNAVAILABLE_SLOT",
    );

  const [level, setLevel] =
    useState<TimetableConstraintLevel>("HARD");

  const [teacherId, setTeacherId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [dayId, setDayId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [value, setValue] = useState(1);
  const [subjectIds, setSubjectIds] = useState<
    string[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadConstraints();
  }, [projectId]);

  useEffect(() => {
    const first = availableDefinitions[0];

    if (first) {
      setType(first.type);
    }
  }, [category]);

  async function loadConstraints() {
    setLoading(true);

    const response = await fetch(
      `/api/dashboard/principal/timetable/projects/${projectId}/constraints`,
      {
        cache: "no-store",
      },
    );

    const result = await response.json();
    setLoading(false);

    if (response.ok) {
      setConstraints(result.constraints || []);
    }
  }

  async function persist(
    next: TimetableConstraint[],
  ) {
    setBusy(true);
    setMessage("");

    const response = await fetch(
      `/api/dashboard/principal/timetable/projects/${projectId}/constraints`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          constraints: next,
        }),
      },
    );

    const result = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(
        result.error || "تعذر حفظ القيود.",
      );
      return false;
    }

    setConstraints(next);
    setMessage("تم حفظ القيود.");
    return true;
  }

  async function addConstraint() {
    const constraint = buildConstraint();

    if (!constraint) {
      return;
    }

    await persist([
      ...constraints,
      constraint,
    ]);
  }

  function buildConstraint():
    | TimetableConstraint
    | null {
    const base: TimetableConstraint = {
      id: createId(),
      type,
      level:
        type === "SUBJECT_FIXED_SLOT" ||
        type === "SCHOOL_BLOCKED_SLOT"
          ? "HARD"
          : level,
      isEnabled: true,
    };

    if (type.startsWith("TEACHER_")) {
      if (!teacherId) {
        setMessage("اختر المعلم.");
        return null;
      }

      base.teacherId = teacherId;
    }

    if (
      type === "TEACHER_UNAVAILABLE_SLOT"
    ) {
      if (!dayId || !periodId) {
        setMessage("اختر اليوم والحصة.");
        return null;
      }

      base.dayId = dayId;
      base.periodId = periodId;
    }

    if (type === "TEACHER_DAY_OFF") {
      if (!dayId) {
        setMessage("اختر يوم الراحة.");
        return null;
      }

      base.dayId = dayId;
    }

    if (
      type === "TEACHER_NOT_BEFORE_PERIOD" ||
      type === "TEACHER_NOT_AFTER_PERIOD"
    ) {
      if (!periodId) {
        setMessage("اختر الحصة.");
        return null;
      }

      base.periodId = periodId;
    }

    if (
      type === "TEACHER_MAX_DAILY_PERIODS" ||
      type ===
        "TEACHER_MAX_CONSECUTIVE_PERIODS" ||
      type === "TEACHER_MAX_DAILY_GAPS"
    ) {
      base.value = value;
    }

    if (
      type === "SUBJECT_FORBIDDEN_SLOT" ||
      type === "SUBJECT_FIXED_SLOT" ||
      type ===
        "SUBJECT_MAX_DAILY_OCCURRENCES"
    ) {
      if (!subjectId) {
        setMessage("اختر المادة.");
        return null;
      }

      base.subjectId = subjectId;
    }

    if (type === "SUBJECT_FORBIDDEN_SLOT") {
      if (!periodId) {
        setMessage("اختر الحصة.");
        return null;
      }

      base.dayId = dayId || undefined;
      base.periodId = periodId;
    }

    if (type === "SUBJECT_FIXED_SLOT") {
      if (!dayId || !periodId) {
        setMessage("اختر اليوم والحصة.");
        return null;
      }

      base.classId = classId || undefined;
      base.dayId = dayId;
      base.periodId = periodId;
      base.isLocked = true;
    }

    if (
      type ===
      "SUBJECT_MAX_DAILY_OCCURRENCES"
    ) {
      base.value = value;
    }

    if (type === "SCHOOL_BLOCKED_SLOT") {
      if (!dayId || !periodId) {
        setMessage("اختر اليوم والحصة.");
        return null;
      }

      base.dayId = dayId;
      base.periodId = periodId;
    }

    if (type === "CLASS_NO_INTERNAL_GAPS") {
      base.classId = classId || undefined;
    }

    if (
      type ===
      "CLASS_MAX_HEAVY_SUBJECTS_DAILY"
    ) {
      if (!subjectIds.length) {
        setMessage("اختر المواد الثقيلة.");
        return null;
      }

      base.classId = classId || undefined;
      base.value = value;
      base.subjectIds = subjectIds;
    }

    if (
      type === "FAIR_FIRST_PERIODS" ||
      type === "FAIR_LAST_PERIODS"
    ) {
      base.weight = Math.max(
        1,
        Math.min(value, 100),
      );
    }

    setMessage("");
    return base;
  }

  async function removeConstraint(id: string) {
    await persist(
      constraints.filter(
        (constraint) =>
          constraint.id !== id,
      ),
    );
  }

  async function toggleConstraint(
    target: TimetableConstraint,
  ) {
    await persist(
      constraints.map((constraint) =>
        constraint.id === target.id
          ? {
              ...constraint,
              isEnabled: !constraint.isEnabled,
            }
          : constraint,
      ),
    );
  }

  function toggleHeavySubject(id: string) {
    setSubjectIds((current) =>
      current.includes(id)
        ? current.filter(
            (item) => item !== id,
          )
        : [...current, id],
    );
  }

  return (
    <div dir="rtl">
      <div>
        <h2 className="text-xl font-black text-slate-950">
          مركز قيود الجدول
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          أضف القيود الإلزامية أو التفضيلية قبل إنشاء الجدول.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {categories.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() =>
              setCategory(item.value)
            }
            className={[
              "rounded-xl px-4 py-2 text-sm font-black",
              category === item.value
                ? "bg-sky-700 text-white"
                : "border border-slate-200 bg-white text-slate-600",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-3">
        <Select
          label="نوع القيد"
          value={type}
          onChange={(next) =>
            setType(
              next as TimetableConstraintType,
            )
          }
          options={availableDefinitions.map(
            (item) => ({
              value: item.type,
              label: item.label,
            }),
          )}
        />

        {![
          "SUBJECT_FIXED_SLOT",
          "SCHOOL_BLOCKED_SLOT",
        ].includes(type) ? (
          <Select
            label="مستوى القيد"
            value={level}
            onChange={(next) =>
              setLevel(
                next as TimetableConstraintLevel,
              )
            }
            options={[
              {
                value: "HARD",
                label: "إلزامي",
              },
              {
                value: "PREFERRED",
                label: "تفضيلي",
              },
            ]}
          />
        ) : null}

        {type.startsWith("TEACHER_") ? (
          <Select
            label="المعلم"
            value={teacherId}
            onChange={setTeacherId}
            options={teachers.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
        ) : null}

        {type.startsWith("SUBJECT_") ? (
          <Select
            label="المادة"
            value={subjectId}
            onChange={setSubjectId}
            options={subjects.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
        ) : null}

        {[
          "SUBJECT_FIXED_SLOT",
          "CLASS_NO_INTERNAL_GAPS",
          "CLASS_MAX_HEAVY_SUBJECTS_DAILY",
        ].includes(type) ? (
          <Select
            label="الفصل"
            value={classId}
            onChange={setClassId}
            options={[
              {
                value: "",
                label: "جميع الفصول",
              },
              ...classes.map((item) => ({
                value: item.id,
                label: item.name,
              })),
            ]}
          />
        ) : null}

        {[
          "TEACHER_UNAVAILABLE_SLOT",
          "TEACHER_DAY_OFF",
          "SUBJECT_FORBIDDEN_SLOT",
          "SUBJECT_FIXED_SLOT",
          "SCHOOL_BLOCKED_SLOT",
        ].includes(type) ? (
          <Select
            label="اليوم"
            value={dayId}
            onChange={setDayId}
            options={[
              ...(type ===
              "SUBJECT_FORBIDDEN_SLOT"
                ? [
                    {
                      value: "",
                      label: "جميع الأيام",
                    },
                  ]
                : []),
              ...days.map((item) => ({
                value: item.id,
                label: item.label,
              })),
            ]}
          />
        ) : null}

        {[
          "TEACHER_UNAVAILABLE_SLOT",
          "TEACHER_NOT_BEFORE_PERIOD",
          "TEACHER_NOT_AFTER_PERIOD",
          "SUBJECT_FORBIDDEN_SLOT",
          "SUBJECT_FIXED_SLOT",
          "SCHOOL_BLOCKED_SLOT",
        ].includes(type) ? (
          <Select
            label="الحصة"
            value={periodId}
            onChange={setPeriodId}
            options={teachingPeriods.map(
              (item) => ({
                value: item.id,
                label: item.label,
              }),
            )}
          />
        ) : null}

        {[
          "TEACHER_MAX_DAILY_PERIODS",
          "TEACHER_MAX_CONSECUTIVE_PERIODS",
          "TEACHER_MAX_DAILY_GAPS",
          "SUBJECT_MAX_DAILY_OCCURRENCES",
          "CLASS_MAX_HEAVY_SUBJECTS_DAILY",
          "FAIR_FIRST_PERIODS",
          "FAIR_LAST_PERIODS",
        ].includes(type) ? (
          <label className="grid gap-2 text-sm font-bold">
            <span>
              {type.startsWith("FAIR_")
                ? "وزن التفضيل"
                : "القيمة"}
            </span>

            <input
              type="number"
              min={0}
              max={
                type.startsWith("FAIR_")
                  ? 100
                  : 20
              }
              value={value}
              onChange={(event) =>
                setValue(
                  Number(event.target.value),
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
            />
          </label>
        ) : null}

        {type ===
        "CLASS_MAX_HEAVY_SUBJECTS_DAILY" ? (
          <div className="md:col-span-3">
            <p className="mb-2 text-sm font-black">
              المواد الثقيلة
            </p>

            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <label
                  key={subject.id}
                  className={[
                    "cursor-pointer rounded-xl border px-3 py-2 text-sm font-bold",
                    subjectIds.includes(subject.id)
                      ? "border-sky-500 bg-sky-50 text-sky-800"
                      : "border-slate-200 bg-white text-slate-600",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={subjectIds.includes(
                      subject.id,
                    )}
                    onChange={() =>
                      toggleHeavySubject(
                        subject.id,
                      )
                    }
                    className="ml-2"
                  />

                  {subject.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void addConstraint()
          }
          className="self-end rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
        >
          {busy
            ? "جارٍ الحفظ..."
            : "إضافة القيد"}
        </button>
      </div>

      {message ? (
        <p className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">
          جارٍ تحميل القيود...
        </p>
      ) : null}

      {!loading && !constraints.length ? (
        <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
          لا توجد قيود مضافة.
        </p>
      ) : null}

      {constraints.length ? (
        <div className="mt-5 space-y-2">
          {constraints.map((constraint) => (
            <div
              key={constraint.id}
              className={[
                "flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3",
                constraint.isEnabled
                  ? "border-slate-200 bg-white"
                  : "border-slate-100 bg-slate-50 opacity-60",
              ].join(" ")}
            >
              <div>
                <p className="font-black text-slate-900">
                  {describeConstraint(
                    constraint,
                    teachers,
                    classes,
                    subjects,
                    days,
                    teachingPeriods,
                  )}
                </p>

                <p className="mt-1 text-xs font-bold text-slate-500">
                  {constraint.level === "HARD"
                    ? "إلزامي"
                    : "تفضيلي"}
                  {" — "}
                  {constraint.isEnabled
                    ? "مفعّل"
                    : "معطّل"}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void toggleConstraint(
                      constraint,
                    )
                  }
                  className="text-sm font-black text-amber-700"
                >
                  {constraint.isEnabled
                    ? "تعطيل"
                    : "تفعيل"}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void removeConstraint(
                      constraint.id,
                    )
                  }
                  className="text-sm font-black text-rose-600"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      <span>{label}</span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
      >
        <option value="">اختر</option>

        {options.map((option) => (
          <option
            key={`${option.value}:${option.label}`}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `constraint-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function describeConstraint(
  constraint: TimetableConstraint,
  teachers: NamedItem[],
  classes: NamedItem[],
  subjects: NamedItem[],
  days: Day[],
  periods: Period[],
) {
  const teacher =
    teachers.find(
      (item) =>
        item.id === constraint.teacherId,
    )?.name || "المعلم";

  const className =
    classes.find(
      (item) =>
        item.id === constraint.classId,
    )?.name || "جميع الفصول";

  const subject =
    subjects.find(
      (item) =>
        item.id === constraint.subjectId,
    )?.name || "المادة";

  const day =
    days.find(
      (item) =>
        item.id === constraint.dayId,
    )?.label || "جميع الأيام";

  const period =
    periods.find(
      (item) =>
        item.id === constraint.periodId,
    )?.label || "الحصة";

  switch (constraint.type) {
    case "TEACHER_UNAVAILABLE_SLOT":
      return `${teacher}: غير متاح ${day} — ${period}`;

    case "TEACHER_DAY_OFF":
      return `${teacher}: يوم راحة ${day}`;

    case "TEACHER_NOT_BEFORE_PERIOD":
      return `${teacher}: لا يدرس قبل ${period}`;

    case "TEACHER_NOT_AFTER_PERIOD":
      return `${teacher}: لا يدرس بعد ${period}`;

    case "TEACHER_MAX_DAILY_PERIODS":
      return `${teacher}: بحد أقصى ${constraint.value} حصص يوميًا`;

    case "TEACHER_MAX_CONSECUTIVE_PERIODS":
      return `${teacher}: بحد أقصى ${constraint.value} حصص متتالية`;

    case "TEACHER_MAX_DAILY_GAPS":
      return `${teacher}: بحد أقصى ${constraint.value} فجوات يوميًا`;

    case "SUBJECT_FORBIDDEN_SLOT":
      return `${subject}: ممنوعة ${day} — ${period}`;

    case "SUBJECT_FIXED_SLOT":
      return `${subject}: ثابتة لـ ${className} في ${day} — ${period}`;

    case "SUBJECT_MAX_DAILY_OCCURRENCES":
      return `${subject}: بحد أقصى ${constraint.value} مرة يوميًا`;

    case "SCHOOL_BLOCKED_SLOT":
      return `خانة مغلقة: ${day} — ${period}`;

    case "CLASS_NO_INTERNAL_GAPS":
      return `${className}: بدون فراغات داخلية`;

    case "CLASS_MAX_HEAVY_SUBJECTS_DAILY":
      return `${className}: بحد أقصى ${constraint.value} مواد ثقيلة يوميًا`;

    case "FAIR_FIRST_PERIODS":
      return `توزيع الحصص الأولى بعدالة`;

    case "FAIR_LAST_PERIODS":
      return `توزيع الحصص الأخيرة بعدالة`;

    default:
      return "قيد جدول";
  }
}