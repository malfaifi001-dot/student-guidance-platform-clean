"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  TimetableConstraint,
  TimetableRoom,
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

type AdvancedType =
  | "TEACHER_WORKING_DAYS"
  | "TEACHER_MIN_DAILY_PERIODS"
  | "TEACHER_NO_SINGLE_PERIOD_DAY"
  | "SUBJECT_MIN_DISTRIBUTION_DAYS"
  | "NO_CONSECUTIVE_HEAVY_SUBJECTS"
  | "SUBJECT_REQUIRED_DOUBLE_PERIODS"
  | "CLASS_MAX_PERIODS_ON_DAY"
  | "SCHOOL_MAX_PERIODS_ON_DAY"
  | "SUBJECT_ROOM_REQUIREMENT"
  | "ROOM_UNAVAILABLE_SLOT";

const advancedTypes: Array<{
  value: AdvancedType;
  label: string;
}> = [
  {
    value: "TEACHER_WORKING_DAYS",
    label: "أيام عمل المعلم",
  },
  {
    value: "TEACHER_MIN_DAILY_PERIODS",
    label: "الحد الأدنى لحصص المعلم يوميًا",
  },
  {
    value: "TEACHER_NO_SINGLE_PERIOD_DAY",
    label: "منع الحصة الوحيدة للمعلم",
  },
  {
    value: "SUBJECT_MIN_DISTRIBUTION_DAYS",
    label: "الحد الأدنى لأيام توزيع المادة",
  },
  {
    value: "NO_CONSECUTIVE_HEAVY_SUBJECTS",
    label: "منع مادتين ثقيلتين متتاليتين",
  },
  {
    value: "SUBJECT_REQUIRED_DOUBLE_PERIODS",
    label: "عدد الحصص المزدوجة للمادة",
  },
  {
    value: "CLASS_MAX_PERIODS_ON_DAY",
    label: "يوم قصير لفصل",
  },
  {
    value: "SCHOOL_MAX_PERIODS_ON_DAY",
    label: "يوم قصير للمدرسة",
  },
  {
    value: "SUBJECT_ROOM_REQUIREMENT",
    label: "ربط المادة بغرفة أو معمل",
  },
  {
    value: "ROOM_UNAVAILABLE_SLOT",
    label: "الغرفة غير متاحة في وقت",
  },
];

const roomTypes: Array<{
  value: TimetableRoom["roomType"];
  label: string;
}> = [
  { value: "CLASSROOM", label: "فصل دراسي" },
  { value: "SCIENCE_LAB", label: "مختبر علوم" },
  { value: "COMPUTER_LAB", label: "معمل حاسب" },
  { value: "GYM", label: "صالة رياضية" },
  { value: "ART_ROOM", label: "مرسم" },
  { value: "RESOURCE_ROOM", label: "غرفة مصادر" },
  { value: "OTHER", label: "أخرى" },
];

export function TimetableAdvancedConstraintsPanel({
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
    () => periods.filter((period) => !period.isBreak),
    [periods],
  );

  const [constraints, setConstraints] =
    useState<TimetableConstraint[]>([]);

  const [rooms, setRooms] =
    useState<TimetableRoom[]>([]);

  const [type, setType] =
    useState<AdvancedType>("TEACHER_WORKING_DAYS");

  const [level, setLevel] =
    useState<"HARD" | "PREFERRED">("HARD");

  const [teacherId, setTeacherId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [dayId, setDayId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [dayIds, setDayIds] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [value, setValue] = useState(1);

  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] =
    useState<TimetableRoom["roomType"]>("CLASSROOM");
  const [roomCapacity, setRoomCapacity] = useState(30);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadData();
  }, [projectId]);

  async function loadData() {
    const [constraintsResponse, roomsResponse] =
      await Promise.all([
        fetch(
          `/api/dashboard/principal/timetable/projects/${projectId}/constraints`,
          { cache: "no-store" },
        ),
        fetch(
          `/api/dashboard/principal/timetable/projects/${projectId}/rooms`,
          { cache: "no-store" },
        ),
      ]);

    const constraintsResult =
      await constraintsResponse.json();

    const roomsResult = await roomsResponse.json();

    if (constraintsResponse.ok) {
      setConstraints(
        constraintsResult.constraints || [],
      );
    }

    if (roomsResponse.ok) {
      setRooms(roomsResult.rooms || []);
    }
  }

  async function saveConstraints(
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
    setMessage("تم حفظ القيد.");
    return true;
  }

  async function saveRooms(next: TimetableRoom[]) {
    setBusy(true);
    setMessage("");

    const response = await fetch(
      `/api/dashboard/principal/timetable/projects/${projectId}/rooms`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rooms: next,
        }),
      },
    );

    const result = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(
        result.error || "تعذر حفظ الغرف.",
      );
      return false;
    }

    setRooms(next);
    setMessage("تم حفظ الغرف والمعامل.");
    return true;
  }

  async function addRoom() {
    const name = roomName.trim();

    if (!name) {
      setMessage("أدخل اسم الغرفة أو المعمل.");
      return;
    }

    if (
      rooms.some(
        (room) =>
          room.name.trim().toLowerCase() ===
          name.toLowerCase(),
      )
    ) {
      setMessage("الغرفة مضافة مسبقًا.");
      return;
    }

    const next: TimetableRoom[] = [
      ...rooms,
      {
        id: crypto.randomUUID(),
        name,
        roomType,
        capacity: roomCapacity,
        isActive: true,
      },
    ];

    if (await saveRooms(next)) {
      setRoomName("");
    }
  }

  async function addConstraint() {
    const next = buildConstraint();

    if (!next) {
      return;
    }

    await saveConstraints([
      ...constraints,
      next,
    ]);
  }

  function buildConstraint():
    | TimetableConstraint
    | null {
    const base: TimetableConstraint = {
      id: crypto.randomUUID(),
      type,
      level,
      isEnabled: true,
    };

    if (
      type === "TEACHER_WORKING_DAYS" ||
      type === "TEACHER_MIN_DAILY_PERIODS" ||
      type === "TEACHER_NO_SINGLE_PERIOD_DAY"
    ) {
      if (!teacherId) {
        setMessage("اختر المعلم.");
        return null;
      }

      base.teacherId = teacherId;
    }

    if (type === "TEACHER_WORKING_DAYS") {
      if (!dayIds.length) {
        setMessage("اختر أيام عمل المعلم.");
        return null;
      }

      base.dayIds = dayIds;
    }

    if (
      type === "TEACHER_MIN_DAILY_PERIODS"
    ) {
      base.value = value;
    }

    if (
      type === "SUBJECT_MIN_DISTRIBUTION_DAYS" ||
      type === "SUBJECT_REQUIRED_DOUBLE_PERIODS" ||
      type === "SUBJECT_ROOM_REQUIREMENT"
    ) {
      if (!subjectId) {
        setMessage("اختر المادة.");
        return null;
      }

      base.subjectId = subjectId;
    }

    if (
      type === "SUBJECT_MIN_DISTRIBUTION_DAYS" ||
      type === "SUBJECT_REQUIRED_DOUBLE_PERIODS"
    ) {
      base.value = value;
      base.classId = classId || undefined;
    }

    if (
      type === "NO_CONSECUTIVE_HEAVY_SUBJECTS"
    ) {
      if (subjectIds.length < 2) {
        setMessage("اختر مادتين ثقيلتين على الأقل.");
        return null;
      }

      base.subjectIds = subjectIds;
      base.classId = classId || undefined;
    }

    if (
      type === "CLASS_MAX_PERIODS_ON_DAY"
    ) {
      if (!classId || !dayId) {
        setMessage("اختر الفصل واليوم.");
        return null;
      }

      base.classId = classId;
      base.dayId = dayId;
      base.value = value;
    }

    if (
      type === "SCHOOL_MAX_PERIODS_ON_DAY"
    ) {
      if (!dayId) {
        setMessage("اختر اليوم.");
        return null;
      }

      base.dayId = dayId;
      base.value = value;
    }

    if (
      type === "SUBJECT_ROOM_REQUIREMENT"
    ) {
      if (!roomId) {
        setMessage("اختر الغرفة أو المعمل.");
        return null;
      }

      base.roomId = roomId;
    }

    if (type === "ROOM_UNAVAILABLE_SLOT") {
      if (!roomId || !dayId || !periodId) {
        setMessage("اختر الغرفة واليوم والحصة.");
        return null;
      }

      base.roomId = roomId;
      base.dayId = dayId;
      base.periodId = periodId;
    }

    return base;
  }

  async function removeConstraint(id: string) {
    await saveConstraints(
      constraints.filter(
        (constraint) => constraint.id !== id,
      ),
    );
  }

  async function removeRoom(id: string) {
    const used = constraints.some(
      (constraint) =>
        constraint.roomId === id,
    );

    if (used) {
      setMessage(
        "لا يمكن حذف الغرفة قبل حذف القيود المرتبطة بها.",
      );
      return;
    }

    await saveRooms(
      rooms.filter((room) => room.id !== id),
    );
  }

  function toggleDay(id: string) {
    setDayIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleSubject(id: string) {
    setSubjectIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  const advancedConstraints = constraints.filter(
    (constraint) =>
      advancedTypes.some(
        (item) => item.value === constraint.type,
      ),
  );

  return (
    <div dir="rtl" className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-black text-slate-950">
          الغرف والمعامل
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          أضف المختبرات والمعامل والصالات التي تحتاجها المواد.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Field label="اسم الغرفة أو المعمل">
            <input
              value={roomName}
              onChange={(event) =>
                setRoomName(event.target.value)
              }
              placeholder="مثال: مختبر العلوم 1"
              className="input"
            />
          </Field>

          <Field label="النوع">
            <select
              value={roomType}
              onChange={(event) =>
                setRoomType(
                  event.target.value as TimetableRoom["roomType"],
                )
              }
              className="input"
            >
              {roomTypes.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="السعة">
            <input
              type="number"
              min={1}
              max={500}
              value={roomCapacity}
              onChange={(event) =>
                setRoomCapacity(
                  Number(event.target.value),
                )
              }
              className="input"
            />
          </Field>

          <button
            type="button"
            disabled={busy}
            onClick={() => void addRoom()}
            className="self-end rounded-xl bg-sky-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            إضافة الغرفة
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
            >
              <div>
                <p className="font-black">
                  {room.name}
                </p>
                <p className="text-xs text-slate-500">
                  {
                    roomTypes.find(
                      (item) =>
                        item.value === room.roomType,
                    )?.label
                  }
                  {room.capacity
                    ? ` — السعة ${room.capacity}`
                    : ""}
                </p>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void removeRoom(room.id)
                }
                className="text-sm font-black text-rose-600"
              >
                حذف
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-black text-slate-950">
          القيود المتقدمة
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Select
            label="نوع القيد"
            value={type}
            onChange={(value) =>
              setType(value as AdvancedType)
            }
            options={advancedTypes}
          />

          <Select
            label="مستوى القيد"
            value={level}
            onChange={(value) =>
              setLevel(
                value as "HARD" | "PREFERRED",
              )
            }
            options={[
              { value: "HARD", label: "إلزامي" },
              {
                value: "PREFERRED",
                label: "تفضيلي",
              },
            ]}
          />

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

          {[
            "SUBJECT_MIN_DISTRIBUTION_DAYS",
            "SUBJECT_REQUIRED_DOUBLE_PERIODS",
            "SUBJECT_ROOM_REQUIREMENT",
          ].includes(type) ? (
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
            "SUBJECT_MIN_DISTRIBUTION_DAYS",
            "SUBJECT_REQUIRED_DOUBLE_PERIODS",
            "NO_CONSECUTIVE_HEAVY_SUBJECTS",
            "CLASS_MAX_PERIODS_ON_DAY",
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
            "CLASS_MAX_PERIODS_ON_DAY",
            "SCHOOL_MAX_PERIODS_ON_DAY",
            "ROOM_UNAVAILABLE_SLOT",
          ].includes(type) ? (
            <Select
              label="اليوم"
              value={dayId}
              onChange={setDayId}
              options={days.map((item) => ({
                value: item.id,
                label: item.label,
              }))}
            />
          ) : null}

          {type === "ROOM_UNAVAILABLE_SLOT" ? (
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
            "SUBJECT_ROOM_REQUIREMENT",
            "ROOM_UNAVAILABLE_SLOT",
          ].includes(type) ? (
            <Select
              label="الغرفة أو المعمل"
              value={roomId}
              onChange={setRoomId}
              options={rooms
                .filter((room) => room.isActive)
                .map((room) => ({
                  value: room.id,
                  label: room.name,
                }))}
            />
          ) : null}

          {[
            "TEACHER_MIN_DAILY_PERIODS",
            "SUBJECT_MIN_DISTRIBUTION_DAYS",
            "SUBJECT_REQUIRED_DOUBLE_PERIODS",
            "CLASS_MAX_PERIODS_ON_DAY",
            "SCHOOL_MAX_PERIODS_ON_DAY",
          ].includes(type) ? (
            <Field label="القيمة">
              <input
                type="number"
                min={1}
                max={20}
                value={value}
                onChange={(event) =>
                  setValue(
                    Number(event.target.value),
                  )
                }
                className="input"
              />
            </Field>
          ) : null}
        </div>

        {type === "TEACHER_WORKING_DAYS" ? (
          <MultiChoice
            title="أيام عمل المعلم"
            items={days}
            selected={dayIds}
            onToggle={toggleDay}
          />
        ) : null}

        {type ===
        "NO_CONSECUTIVE_HEAVY_SUBJECTS" ? (
          <MultiChoice
            title="المواد الثقيلة"
            items={subjects}
            selected={subjectIds}
            onToggle={toggleSubject}
          />
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => void addConstraint()}
          className="mt-4 rounded-xl bg-sky-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
        >
          إضافة القيد
        </button>

        {message ? (
          <p className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">
            {message}
          </p>
        ) : null}

        <div className="mt-5 space-y-2">
          {advancedConstraints.map(
            (constraint) => (
              <div
                key={constraint.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="font-black">
                    {describeConstraint(
                      constraint,
                      teachers,
                      classes,
                      subjects,
                      rooms,
                      days,
                      teachingPeriods,
                    )}
                  </p>

                  <p className="text-xs font-bold text-slate-500">
                    {constraint.level === "HARD"
                      ? "إلزامي"
                      : "تفضيلي"}
                  </p>
                </div>

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
            ),
          )}
        </div>
      </section>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.75rem;
          background: white;
          padding: 0.75rem;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      <span>{label}</span>
      {children}
    </label>
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
    <Field label={label}>
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="input"
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
    </Field>
  );
}

function MultiChoice({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: Array<{
    id: string;
    name?: string;
    label?: string;
  }>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-black">
        {title}
      </p>

      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <label
            key={item.id}
            className={[
              "cursor-pointer rounded-xl border px-3 py-2 text-sm font-bold",
              selected.includes(item.id)
                ? "border-sky-500 bg-sky-50 text-sky-800"
                : "border-slate-200 bg-white text-slate-600",
            ].join(" ")}
          >
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => onToggle(item.id)}
              className="ml-2"
            />

            {item.name || item.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function describeConstraint(
  constraint: TimetableConstraint,
  teachers: NamedItem[],
  classes: NamedItem[],
  subjects: NamedItem[],
  rooms: TimetableRoom[],
  days: Day[],
  periods: Period[],
) {
  const teacher =
    teachers.find(
      (item) => item.id === constraint.teacherId,
    )?.name || "المعلم";

  const subject =
    subjects.find(
      (item) => item.id === constraint.subjectId,
    )?.name || "المادة";

  const className =
    classes.find(
      (item) => item.id === constraint.classId,
    )?.name || "جميع الفصول";

  const room =
    rooms.find(
      (item) => item.id === constraint.roomId,
    )?.name || "الغرفة";

  const day =
    days.find(
      (item) => item.id === constraint.dayId,
    )?.label || "اليوم";

  const period =
    periods.find(
      (item) => item.id === constraint.periodId,
    )?.label || "الحصة";

  switch (constraint.type) {
    case "TEACHER_WORKING_DAYS":
      return `${teacher}: يعمل ${constraint.dayIds?.length || 0} أيام محددة`;

    case "TEACHER_MIN_DAILY_PERIODS":
      return `${teacher}: حد أدنى ${constraint.value} حصص عند الحضور`;

    case "TEACHER_NO_SINGLE_PERIOD_DAY":
      return `${teacher}: يمنع حضوره لحصة واحدة فقط`;

    case "SUBJECT_MIN_DISTRIBUTION_DAYS":
      return `${subject}: موزعة على ${constraint.value} أيام على الأقل — ${className}`;

    case "NO_CONSECUTIVE_HEAVY_SUBJECTS":
      return `${className}: منع المواد الثقيلة المتتالية`;

    case "SUBJECT_REQUIRED_DOUBLE_PERIODS":
      return `${subject}: ${constraint.value} حصص مزدوجة — ${className}`;

    case "CLASS_MAX_PERIODS_ON_DAY":
      return `${className}: بحد أقصى ${constraint.value} حصص يوم ${day}`;

    case "SCHOOL_MAX_PERIODS_ON_DAY":
      return `اليوم المدرسي ${day}: بحد أقصى ${constraint.value} حصص`;

    case "SUBJECT_ROOM_REQUIREMENT":
      return `${subject}: تستخدم ${room}`;

    case "ROOM_UNAVAILABLE_SLOT":
      return `${room}: غير متاحة ${day} — ${period}`;

    default:
      return "قيد متقدم";
  }
}