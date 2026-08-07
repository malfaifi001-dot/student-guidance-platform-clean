"use client";

import {
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  buildDayTimelineUniform,
  clampInt,
  durationBetweenTimes,
  extractBreakSpecs,
  extractTeachingSpecs,
  findPeriodReferences,
  formatClockTime,
  generateTeachingSpecs,
  insertBreakIntoDay,
  parseClockTime,
  removeBreakFromDay,
  updateBreakInDay,
  type DayTimePeriod,
  type DayTimeTeachingSpec,
  type PeriodReferenceInfo,
} from "@/lib/timetable-v2/period-time-generator";

import type {
  Constraint,
  PeriodItem,
} from "./types";

type Props = {
  periods: PeriodItem[];
  constraints: Constraint[];
  busy: boolean;
  onChange: (periods: PeriodItem[]) => void;
  onSave: () => void;
  onReviewConstraints: () => void;
};

type ImpactState = {
  removed: DayTimeTeachingSpec[];
  refs: PeriodReferenceInfo[];
  draft: DayTimePeriod[];
};

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="block text-xs font-black text-slate-500">
      {children}
    </span>
  );
}

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold";

export function DayTimeEditor({
  periods,
  constraints,
  busy,
  onChange,
  onSave,
  onReviewConstraints,
}: Props) {
  const sorted = useMemo(
    () => [...periods].sort((a, b) => a.order - b.order),
    [periods],
  );

  const teaching = useMemo(
    () => sorted.filter((period) => !period.isBreak),
    [sorted],
  );

  const breaks = useMemo(
    () => sorted.filter((period) => period.isBreak),
    [sorted],
  );

  const firstTeaching = teaching[0];

  const lessonDefault = useMemo(
    () =>
      durationBetweenTimes(
        firstTeaching?.startTime,
        firstTeaching?.endTime,
      ) > 0
        ? durationBetweenTimes(
            firstTeaching?.startTime,
            firstTeaching?.endTime,
          )
        : 45,
    [firstTeaching],
  );

  const [countInput, setCountInput] = useState(() =>
    String(teaching.length),
  );

  const [firstStartInput, setFirstStartInput] = useState(() =>
    firstTeaching?.startTime ?? "07:30",
  );

  const [lessonDurationInput, setLessonDurationInput] = useState(() =>
    String(lessonDefault),
  );

  const [transitionInput, setTransitionInput] = useState("0");

  const [expanded, setExpanded] = useState<string[]>([]);

  const [addBreakAfterIndex, setAddBreakAfterIndex] = useState<
    number | null
  >(null);

  const [breakName, setBreakName] = useState("فسحة");

  const [breakDuration, setBreakDuration] = useState("20");

  const [impact, setImpact] = useState<ImpactState | null>(null);

  const [notice, setNotice] = useState<string | null>(null);

  const toggleExpanded = (id: string) =>
    setExpanded((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

  const isExpanded = (id: string) => expanded.includes(id);

  const apply = (next: PeriodItem[]) => {
    onChange(next);
    setNotice(null);
    setAddBreakAfterIndex(null);
  };

  const handleGenerate = () => {
    const count = clampInt(countInput, 1, 12, teaching.length);

    const lessonDuration = clampInt(
      lessonDurationInput,
      20,
      120,
      lessonDefault,
    );

    const transition = clampInt(transitionInput, 0, 30, 0);

    const firstStart = parseClockTime(firstStartInput);

    if (firstStart < 0) {
      setNotice("أدخل وقت بداية أول حصة بصيغة صحيحة مثل 07:30.");
      return;
    }

    const existingTeaching = extractTeachingSpecs(periods);

    const nextTeaching = generateTeachingSpecs(count, existingTeaching);

    const removed = existingTeaching.slice(count);

    const breaksSpecs = extractBreakSpecs(periods);

    const draft = buildDayTimelineUniform({
      teaching: nextTeaching,
      breaks: breaksSpecs,
      firstStartMinutes: firstStart,
      lessonDurationMinutes: lessonDuration,
      transitionMinutes: transition,
    });

    const refs = findPeriodReferences(
      constraints,
      removed.map((item) => item.id),
    );

    if (removed.length > 0 && refs.length > 0) {
      setImpact({
        removed,
        refs,
        draft,
      });

      return;
    }

    apply(draft);

    setCountInput(String(count));
    setFirstStartInput(formatClockTime(firstStart));
    setLessonDurationInput(String(lessonDuration));
    setTransitionInput(String(transition));
  };

  const confirmImpactRemove = () => {
    if (!impact) {
      return;
    }

    apply(impact.draft);
    setImpact(null);
  };

  const cancelImpact = () => {
    setImpact(null);
  };

  const reviewImpactConstraints = () => {
    setImpact(null);
    onReviewConstraints();
  };

  const beginAddBreak = (afterIndex: number) => {
    setAddBreakAfterIndex(afterIndex);
    setBreakName("فسحة");
    setBreakDuration("20");
  };

  const confirmAddBreak = () => {
    if (addBreakAfterIndex === null) {
      return;
    }

    const duration = clampInt(breakDuration, 5, 180, 20);

    apply(
      insertBreakIntoDay(periods, {
        id: `BREAK_${Date.now()}_${addBreakAfterIndex}`,
        label: breakName.trim() || "فسحة",
        afterTeachingIndex: addBreakAfterIndex,
        durationMinutes: duration,
      }),
    );
  };

  const updateBreak = (
    breakId: string,
    patch: { label?: string; duration?: number },
  ) => {
    apply(
      updateBreakInDay(periods, breakId, {
        label: patch.label,
        durationMinutes: patch.duration,
      }),
    );
  };

  const deleteBreak = (breakId: string) => {
    apply(removeBreakFromDay(periods, breakId));
  };

  const updateTeachingField = (
    periodId: string,
    field: "label" | "startTime" | "endTime",
    value: string,
  ) => {
    onChange(
      periods.map((period) =>
        period.id === periodId
          ? { ...period, [field]: value || null }
          : period,
      ),
    );
  };

  const dayStart = teaching[0]?.startTime ?? null;

  const dayEnd = sorted[sorted.length - 1]?.endTime ?? null;

  const breaksTotalMinutes = breaks.reduce(
    (total, item) =>
      total +
      Math.max(0, durationBetweenTimes(item.startTime, item.endTime)),
    0,
  );

  const breaksLabel =
    breaks.length === 0
      ? "لا توجد فسحات"
      : `${breaks.length} ${breaks.length === 1 ? "فسحة" : "فسحات"} • ${breaksTotalMinutes} دقيقة`;

  const hasGeneratedTimes = teaching.some((period) => period.startTime);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <FieldLabel>ملخص أوقات اليوم</FieldLabel>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-black text-teal-800">
              {teaching.length} حصص
            </span>

            <span className="rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-black text-teal-800">
              {lessonDefault} دقيقة للحصة
            </span>

            {dayStart ? (
              <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
                بداية اليوم {dayStart}
              </span>
            ) : null}

            {dayEnd ? (
              <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
                نهاية اليوم {dayEnd}
              </span>
            ) : null}

            <span className="rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800">
              {breaksLabel}
            </span>
          </div>
        </div>
      </div>

      {notice ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
          {notice}
        </div>
      ) : null}

      <section className="rounded-3xl border border-teal-100 bg-gradient-to-l from-teal-50 via-white to-cyan-50 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950">
              منشئ الأوقات
            </h3>

            <p className="mt-1 text-xs leading-6 text-slate-500">
              أنشئ توقيت الحصص تلقائيًا؛ إعادة التوليد تحافظ على معرّفات
              الحصص والفسحات وتعيد حساب الأوقات.
            </p>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={handleGenerate}
            className="h-11 shrink-0 rounded-xl bg-teal-700 px-5 text-sm font-black text-white transition hover:bg-teal-800 disabled:opacity-50"
          >
            {teaching.length > 0
              ? "إعادة توليد الأوقات"
              : "إنشاء الأوقات"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label>
            <FieldLabel>عدد الحصص اليومية</FieldLabel>

            <input
              type="number"
              min={1}
              max={12}
              value={countInput}
              onChange={(event) => setCountInput(event.target.value)}
              className={inputClass}
            />
          </label>

          <label>
            <FieldLabel>بداية أول حصة</FieldLabel>

            <input
              type="time"
              value={firstStartInput}
              onChange={(event) => setFirstStartInput(event.target.value)}
              className={inputClass}
            />
          </label>

          <label>
            <FieldLabel>مدة الحصة (دقيقة)</FieldLabel>

            <input
              type="number"
              min={20}
              max={120}
              value={lessonDurationInput}
              onChange={(event) =>
                setLessonDurationInput(event.target.value)
              }
              className={inputClass}
            />
          </label>

          <label>
            <FieldLabel>مدة الانتقال بين الحصص</FieldLabel>

            <input
              type="number"
              min={0}
              max={30}
              value={transitionInput}
              onChange={(event) => setTransitionInput(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
          <div className="text-sm font-black text-slate-700">
            لم تُنشأ أوقات اليوم بعد.
          </div>

          <div className="mt-2 text-xs text-slate-500">
            استخدم منشئ الأوقات أعلاه لتوليد الحصص تلقائيًا.
          </div>
        </div>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black">الخط الزمني لليوم</h3>

              <p className="mt-1 text-xs text-slate-500">
                {hasGeneratedTimes
                  ? "الأوقات محسوبة تلقائيًا؛ اضغط «تعديل» لتغيير أي حصة يدويًا."
                  : "أضف أوقاتًا عبر المنشئ أو عبر التعديل اليدوي."}
              </p>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={onSave}
              className="h-11 rounded-xl bg-teal-700 px-5 text-sm font-black text-white disabled:opacity-50"
            >
              حفظ الأوقات
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {sorted.map((period, index) =>
              period.isBreak ? (
                <div
                  key={period.id}
                  className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-amber-200/70 px-2 py-1 text-[10px] font-black text-amber-900">
                        فسحة
                      </span>

                      <span className="text-sm font-black text-amber-900">
                        {period.label}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-amber-800">
                      {period.startTime ?? "--:--"}
                      {" • "}
                      {period.endTime ?? "--:--"}
                      {" • "}
                      {Math.max(
                        0,
                        durationBetweenTimes(
                          period.startTime,
                          period.endTime,
                        ),
                      )}{" "}
                      دقيقة
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleExpanded(period.id)}
                        className="h-9 rounded-xl border border-amber-200 bg-white px-3 text-xs font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                      >
                        {isExpanded(period.id) ? "إغلاق" : "تعديل"}
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => deleteBreak(period.id)}
                        className="h-9 rounded-xl border border-rose-200 bg-white px-3 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        حذف
                      </button>
                    </div>
                  </div>

                  {isExpanded(period.id) ? (
                    <div className="mt-4 grid gap-3 border-t border-amber-200 pt-4 md:grid-cols-2">
                      <label>
                        <FieldLabel>اسم الفسحة</FieldLabel>

                        <input
                          value={period.label}
                          onChange={(event) =>
                            updateBreak(period.id, {
                              label: event.target.value,
                            })
                          }
                          className={inputClass}
                        />
                      </label>

                      <label>
                        <FieldLabel>مدة الفسحة (دقيقة)</FieldLabel>

                        <input
                          type="number"
                          min={5}
                          max={180}
                          value={Math.max(
                            0,
                            durationBetweenTimes(
                              period.startTime,
                              period.endTime,
                            ),
                          )}
                          onChange={(event) =>
                            updateBreak(period.id, {
                              duration: clampInt(
                                event.target.value,
                                5,
                                180,
                                20,
                              ),
                            })
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  key={period.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                        {teaching.indexOf(period) + 1}
                      </span>

                      <span className="text-sm font-black text-slate-800">
                        {period.label}
                      </span>
                    </div>

                    <div className="text-sm font-black text-slate-700">
                      {period.startTime ?? "--:--"}
                      {" • "}
                      {period.endTime ?? "--:--"}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleExpanded(period.id)}
                        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                      >
                        {isExpanded(period.id) ? "إغلاق" : "تعديل"}
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => beginAddBreak(index)}
                        className="h-9 rounded-xl border border-amber-200 bg-white px-3 text-xs font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                      >
                        + فسحة بعدها
                      </button>
                    </div>
                  </div>

                  {isExpanded(period.id) ? (
                    <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-3">
                      <label>
                        <FieldLabel>الاسم</FieldLabel>

                        <input
                          value={period.label}
                          onChange={(event) =>
                            updateTeachingField(
                              period.id,
                              "label",
                              event.target.value,
                            )
                          }
                          className={inputClass}
                        />
                      </label>

                      <label>
                        <FieldLabel>البداية</FieldLabel>

                        <input
                          type="time"
                          value={period.startTime ?? ""}
                          onChange={(event) =>
                            updateTeachingField(
                              period.id,
                              "startTime",
                              event.target.value,
                            )
                          }
                          className={inputClass}
                        />
                      </label>

                      <label>
                        <FieldLabel>النهاية</FieldLabel>

                        <input
                          type="time"
                          value={period.endTime ?? ""}
                          onChange={(event) =>
                            updateTeachingField(
                              period.id,
                              "endTime",
                              event.target.value,
                            )
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              ),
            )}
          </div>

          {addBreakAfterIndex !== null ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-black text-amber-900">
                إضافة فسحة بعد الحصة{" "}
                {(() => {
                  const target =
                    teaching.indexOf(sorted[addBreakAfterIndex]);

                  return (target >= 0 ? target : teaching.length - 1) + 1;
                })()}
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label>
                  <FieldLabel>اسم الفسحة</FieldLabel>

                  <input
                    value={breakName}
                    onChange={(event) => setBreakName(event.target.value)}
                    className={inputClass}
                  />
                </label>

                <label>
                  <FieldLabel>مدة الفسحة (دقيقة)</FieldLabel>

                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={breakDuration}
                    onChange={(event) => setBreakDuration(event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={confirmAddBreak}
                  className="h-10 rounded-xl bg-amber-600 px-4 text-xs font-black text-white transition hover:bg-amber-700 disabled:opacity-50"
                >
                  إضافة الفسحة
                </button>

                <button
                  type="button"
                  onClick={() => setAddBreakAfterIndex(null)}
                  className="h-10 rounded-xl border border-amber-200 bg-white px-4 text-xs font-black text-slate-600"
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : null}
        </section>
      )}

      {impact ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/25 p-3 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-xl rounded-[2rem] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-black text-rose-700">
                  حصص مرتبطة بقيود
                </div>

                <h3 className="mt-2 text-xl font-black">
                  سيتم حذف بعض الحصص
                </h3>
              </div>

              <button
                type="button"
                onClick={cancelImpact}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg transition hover:bg-slate-200"
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {impact.removed.map((item) => {
                const ref = impact.refs.find(
                  (entry) => entry.periodId === item.id,
                );

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900"
                  >
                    <span className="font-black">{item.label}</span>
                    {" "}
                    {ref
                      ? `مرتبطة بـ ${ref.count} ${ref.count === 1 ? "قيد" : "قيود"}.`
                      : "لن تُحذف (بدون قيود مرتبطة)."}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
              الحذف يزيل الحصة من توقيت اليوم، والقيود المرتبطة تبقى في
              السجل حتى تراجعها وتعدّلها. يمكنك مراجعة القيود قبل
              المتابعة.
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelImpact}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={reviewImpactConstraints}
                className="h-11 rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-black text-teal-800 transition hover:bg-teal-100"
              >
                مراجعة القيود
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={confirmImpactRemove}
                className="h-11 rounded-xl bg-rose-700 px-4 text-sm font-black text-white transition hover:bg-rose-800 disabled:opacity-50"
              >
                حذف الحصة والمتابعة
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
