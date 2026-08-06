"use client";

import { useMemo, useState } from "react";
import { CalendarX2, Trash2, UserRound } from "lucide-react";

import { TimetableDataCard, TimetableEmptyState } from "@/components/timetable/timetable-data-card";

type Day = {
  id: string;
  label: string;
};

type Period = {
  id: string;
  label: string;
  isBreak?: boolean;
};

type Slot = {
  dayId: string;
  periodId: string;
};

type Teacher = {
  id: string;
  name: string;
  unavailableSlotsJson?: unknown;
};

export function TimetableTeacherConstraints({
  projectId,
  teachers,
  days,
  periods,
  onSaved,
}: {
  projectId: string;
  teachers: Teacher[];
  days: Day[];
  periods: Period[];
  onSaved: () => Promise<void>;
}) {
  const teachingPeriods = useMemo(
    () => periods.filter((period) => !period.isBreak),
    [periods],
  );

  const [teacherId, setTeacherId] = useState(
    teachers[0]?.id || "",
  );
  const [dayId, setDayId] = useState(days[0]?.id || "");
  const [periodId, setPeriodId] = useState(
    teachingPeriods[0]?.id || "",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const selectedTeacher = teachers.find(
    (teacher) => teacher.id === teacherId,
  );

  const slots = normalizeSlots(
    selectedTeacher?.unavailableSlotsJson,
  );

  async function saveSlots(nextSlots: Slot[]) {
    if (!teacherId) {
      setMessage("اختر المعلم.");
      return;
    }

    setBusy(true);
    setMessage("");

    const response = await fetch(
      `/api/dashboard/principal/timetable/projects/${projectId}/teacher-unavailability`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacherId,
          unavailableSlots: nextSlots,
        }),
      },
    );

    const result = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(
        result.error || "تعذر حفظ قيود المعلم.",
      );
      return;
    }

    await onSaved();
    setMessage("تم حفظ القيود.");
  }

  async function addSlot() {
    if (!teacherId || !dayId || !periodId) {
      setMessage("اختر المعلم واليوم والحصة.");
      return;
    }

    const exists = slots.some(
      (slot) =>
        slot.dayId === dayId &&
        slot.periodId === periodId,
    );

    if (exists) {
      setMessage("هذا الوقت مسجل مسبقًا.");
      return;
    }

    await saveSlots([
      ...slots,
      {
        dayId,
        periodId,
      },
    ]);
  }

  async function removeSlot(slotToRemove: Slot) {
    await saveSlots(
      slots.filter(
        (slot) =>
          !(
            slot.dayId === slotToRemove.dayId &&
            slot.periodId === slotToRemove.periodId
          ),
      ),
    );
  }

  return (
    <div>
      <h2 className="text-lg font-black text-slate-950">
        قيود المعلمين
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        حدد الأوقات التي لا يستطيع المعلم التدريس فيها.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Select
          label="المعلم"
          value={teacherId}
          onChange={setTeacherId}
          options={teachers.map((teacher) => ({
            value: teacher.id,
            label: teacher.name,
          }))}
        />

        <Select
          label="اليوم"
          value={dayId}
          onChange={setDayId}
          options={days.map((day) => ({
            value: day.id,
            label: day.label,
          }))}
        />

        <Select
          label="الحصة"
          value={periodId}
          onChange={setPeriodId}
          options={teachingPeriods.map((period) => ({
            value: period.id,
            label: period.label,
          }))}
        />

        <button
          type="button"
          disabled={
            busy ||
            !teacherId ||
            !dayId ||
            !periodId
          }
          onClick={() => void addSlot()}
          className="self-end rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40"
        >
          {busy ? "جارٍ الحفظ..." : "إضافة عدم توفر"}
        </button>
      </div>

      {message ? (
        <p className="mt-4 text-sm font-bold text-sky-700">
          {message}
        </p>
      ) : null}

      {!teacherId ? (
        <div className="mt-5">
          <TimetableEmptyState icon={<UserRound className="h-6 w-6" />} title="أضف معلمًا أولًا" description="اختر معلمًا بعد إضافته لتحديد أوقات عدم التوفر." />
        </div>
      ) : !slots.length ? (
        <div className="mt-5">
          <TimetableEmptyState icon={<CalendarX2 className="h-6 w-6" />} title="لا توجد قيود لهذا المعلم" description="ستظهر أوقات عدم التوفر هنا بعد إضافتها." />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {slots.map((slot) => {
            const day = days.find(
              (item) => item.id === slot.dayId,
            );

            const period = teachingPeriods.find(
              (item) => item.id === slot.periodId,
            );

            return (
              <TimetableDataCard
                key={`${slot.dayId}:${slot.periodId}`}
                icon={<CalendarX2 className="h-5 w-5" />}
                eyebrow="عدم توفر المعلم"
                title={selectedTeacher?.name || "المعلم"}
                description={`${day?.label || slot.dayId} — ${period?.label || slot.periodId}`}
                tone="sky"
                badges={[day?.label || slot.dayId, period?.label || slot.periodId]}
                actions={
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeSlot(slot)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </button>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function normalizeSlots(value: unknown): Slot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      !("dayId" in item) ||
      !("periodId" in item)
    ) {
      return [];
    }

    const dayId = String(item.dayId || "");
    const periodId = String(item.periodId || "");

    if (!dayId || !periodId) {
      return [];
    }

    return [
      {
        dayId,
        periodId,
      },
    ];
  });
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
        className="rounded-xl border border-slate-200 px-3 py-2.5"
      >
        <option value="">اختر</option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
