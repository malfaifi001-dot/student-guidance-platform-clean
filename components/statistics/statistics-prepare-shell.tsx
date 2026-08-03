"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type {
  StatisticsAiAnalysis,
  StatisticsPrepareResult,
  StatisticsPreparedField,
  StatisticsValueSelection,
} from "@/lib/statistics/statistics-types";

type Props = {
  serviceSlugs: string[];
  preset: string;
  from?: string;
  to?: string;
};

type PrepareResponse = {
  success?: boolean;
  error?: string;
  data?: StatisticsPrepareResult;
};

type DescriptionResponse = {
  success?: boolean;
  error?: string;

  data?: {
    sourceCaseCount: number;
    sourceReportCount: number;

    analysis: StatisticsAiAnalysis;
  };
};

function valueSelectionKey(
  field: Pick<StatisticsPreparedField, "serviceSlug" | "workflowId" | "key">,
  value: string,
) {
  return JSON.stringify([
    field.serviceSlug,
    field.workflowId || "legacy",
    field.key,
    value,
  ]);
}

export function StatisticsPrepareShell({
  serviceSlugs,
  preset,
  from,
  to,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] =
    useState(true);

  const [
    descriptionLoading,
    setDescriptionLoading,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [descriptionError, setDescriptionError] =
    useState("");

  const [saveError, setSaveError] =
    useState("");

  const [data, setData] =
    useState<
      StatisticsPrepareResult | null
    >(null);

  const [
    selectedKeys,
    setSelectedKeys,
  ] = useState<Set<string>>(
    () => new Set(),
  );

  const [
    expandedFields,
    setExpandedFields,
  ] = useState<Set<string>>(
    () => new Set(),
  );

  const [
    valueSearch,
    setValueSearch,
  ] = useState<
    Record<string, string>
  >({});

  const [
    executiveDescription,
    setExecutiveDescription,
  ] = useState("");

  const [analysis, setAnalysis] =
    useState<
      StatisticsAiAnalysis | null
    >(null);

  useEffect(() => {
    const controller =
      new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/dashboard/statistics/prepare",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            cache: "no-store",
            signal: controller.signal,

            body: JSON.stringify({
              serviceSlugs,
              preset,
              ...(from ? { from } : {}),
              ...(to ? { to } : {}),
            }),
          },
        );

        const payload =
          (await response.json()) as
            PrepareResponse;

        if (
          !response.ok ||
          !payload.success ||
          !payload.data
        ) {
          throw new Error(
            payload.error ||
              "تعذر تجهيز البيانات.",
          );
        }

        setData(payload.data);

        const firstField =
          payload.data.workflowSteps
            .flatMap(
              (step) => step.fields,
            )[0];

        if (firstField) {
          setExpandedFields(
            new Set([
              firstField.id,
            ]),
          );
        }
      } catch (caughtError) {
        if (
          caughtError instanceof Error &&
          caughtError.name ===
            "AbortError"
        ) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "تعذر تجهيز البيانات.",
        );
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, [
    serviceSlugs,
    preset,
    from,
    to,
  ]);

  const selectedValues =
    useMemo<
      StatisticsValueSelection[]
    >(() => {
      if (!data) {
        return [];
      }

      const selections:
        StatisticsValueSelection[] = [];

      for (
        const step of
        data.workflowSteps
      ) {
        for (
          const field of step.fields
        ) {
          for (
            const item of field.values
          ) {
            const key =
              valueSelectionKey(
                field,
                item.value,
              );

            if (
              selectedKeys.has(key)
            ) {
              selections.push({
                serviceSlug: field.serviceSlug,
                ...(field.workflowId ? { workflowId: field.workflowId } : {}),
                fieldKey: field.key,
                value: item.value,
              });
            }
          }
        }
      }

      return selections;
    }, [data, selectedKeys]);

  function clearGeneratedText() {
    setExecutiveDescription("");
    setAnalysis(null);
    setDescriptionError("");
    setSaveError("");
  }

  function toggleValue(
    field: StatisticsPreparedField,
    value: string,
  ) {
    const key = valueSelectionKey(
      field,
      value,
    );

    setSelectedKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });

    clearGeneratedText();
  }

  function toggleWholeField(
    field: StatisticsPreparedField,
  ) {
    const fieldKeys = field.values.map(
      (item) =>
        valueSelectionKey(
          field,
          item.value,
        ),
    );

    const allSelected =
      fieldKeys.every((key) =>
        selectedKeys.has(key),
      );

    setSelectedKeys((current) => {
      const next = new Set(current);

      for (const key of fieldKeys) {
        if (allSelected) {
          next.delete(key);
        } else {
          next.add(key);
        }
      }

      return next;
    });

    clearGeneratedText();
  }

  function toggleExpanded(
    fieldKey: string,
  ) {
    setExpandedFields(
      (current) => {
        const next =
          new Set(current);

        if (next.has(fieldKey)) {
          next.delete(fieldKey);
        } else {
          next.add(fieldKey);
        }

        return next;
      },
    );
  }

  async function generateDescription() {
    if (
      selectedValues.length === 0
    ) {
      setDescriptionError(
        "اختر قيمة إحصائية واحدة على الأقل.",
      );
      return;
    }

    setDescriptionLoading(true);
    setDescriptionError("");

    try {
      const response = await fetch(
        "/api/dashboard/statistics/description",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          cache: "no-store",

          body: JSON.stringify({
            serviceSlugs,
            preset,
            ...(from ? { from } : {}),
            ...(to ? { to } : {}),

            selectedValues,
          }),
        },
      );

      const payload =
        (await response.json()) as
          DescriptionResponse;

      if (
        !response.ok ||
        !payload.success ||
        !payload.data
      ) {
        throw new Error(
          payload.error ||
            "تعذر إنشاء الوصف التنفيذي.",
        );
      }

      setAnalysis(
        payload.data.analysis,
      );

      setExecutiveDescription(
        payload.data.analysis
          .executiveDescription,
      );
    } catch (caughtError) {
      setDescriptionError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر إنشاء الوصف التنفيذي.",
      );
    } finally {
      setDescriptionLoading(false);
    }
  }

  async function saveReport() {
    setSaveError("");

    if (!analysis) {
      setSaveError(
        "أنشئ الوصف التنفيذي قبل حفظ التقرير.",
      );
      return;
    }

    const approvedDescription =
      executiveDescription.trim();

    if (
      approvedDescription.length < 20
    ) {
      setSaveError(
        "الوصف التنفيذي قصير جدًا.",
      );
      return;
    }

    if (
      selectedValues.length === 0
    ) {
      setSaveError(
        "اختر قيمة إحصائية واحدة على الأقل.",
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/dashboard/statistics/generate",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          cache: "no-store",

          body: JSON.stringify({
            serviceSlugs,
            preset,
            ...(from ? { from } : {}),
            ...(to ? { to } : {}),

            selectedValues,

            executiveDescription:
              approvedDescription,

            analysisMode:
              analysis.analysisMode,
          }),
        },
      );

      const payload =
        (await response.json()) as {
          success?: boolean;
          error?: string;
          reportId?: string;
        };

      if (
        !response.ok ||
        !payload.success ||
        !payload.reportId
      ) {
        throw new Error(
          payload.error ||
            "تعذر حفظ التقرير الإحصائي.",
        );
      }

      router.push(
        `/dashboard/statistics/${payload.reportId}`,
      );

      router.refresh();
    } catch (caughtError) {
      setSaveError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر حفظ التقرير الإحصائي.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (loading) {
    return (
      <main
        className="space-y-6"
        dir="rtl"
      >
        <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-100 border-t-cyan-700" />

          <p className="mt-4 font-bold text-slate-700">
            جارٍ تجهيز الحقول
            والقيم الإحصائية...
          </p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main
        className="space-y-6"
        dir="rtl"
      >
        <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-6">
          <h1 className="text-xl font-black text-rose-800">
            تعذر تجهيز التقرير
          </h1>

          <p className="mt-3 text-sm leading-7 text-rose-700">
            {error ||
              "لا توجد بيانات متاحة."}
          </p>

          <Link
            href="/dashboard/statistics"
            className="mt-5 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-bold text-rose-700 shadow-sm"
          >
            العودة إلى الإحصائيات
          </Link>
        </section>
      </main>
    );
  }

  const availableFields =
    data.workflowSteps.flatMap(
      (step) => step.fields,
    );

  return (
    <main
      className="space-y-6"
      dir="rtl"
    >
      <section className="rounded-[28px] border border-cyan-100 bg-gradient-to-l from-cyan-50 via-white to-sky-50 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/dashboard/statistics"
              className="text-sm font-bold text-cyan-700 hover:text-cyan-900"
            >
              العودة إلى الإحصائيات
            </Link>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              تحضير التقرير الإحصائي
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              اختر الحقول والقيم التي تريد
              تضمينها في التقرير الإحصائي.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs text-slate-500">
                الخدمات
              </p>

              <p className="mt-1 text-sm font-black text-slate-900">
                {data.services.map((service) => service.name).join("، ")}
              </p>
            </div>

            <div className="rounded-2xl border border-white bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs text-slate-500">
                الحالات
              </p>

              <p className="mt-1 text-xl font-black text-slate-900">
                {
                  data.sourceCaseCount
                }
              </p>
            </div>

            <div className="rounded-2xl border border-white bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs text-slate-500">
                التقارير
              </p>

              <p className="mt-1 text-xl font-black text-slate-900">
                {
                  data.sourceReportCount
                }
              </p>
            </div>

            <div className="rounded-2xl border border-white bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs text-slate-500">
                المحدد
              </p>

              <p className="mt-1 text-xl font-black text-cyan-800">
                {
                  selectedValues.length
                }
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 inline-flex rounded-full border border-cyan-200 bg-white px-4 py-2 text-xs font-bold text-cyan-800">
          {data.dateRange.label}
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-5">
          {data.services.filter((service) => !service.hasSourceData).map((service) => (
            <div key={service.slug} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
              {service.name}: لا توجد تقارير معتمدة لهذه الخدمة ضمن الفترة المحددة.
            </div>
          ))}
          {availableFields.length === 0 ? (
            <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-800">
              لم يتم العثور على حقول اختيارية
              قابلة للإحصاء ضمن الحالات
              المؤهلة.
            </div>
          ) : (
            data.workflowSteps.map(
              (step) => (
                <article
                  key={step.key}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
                >
                  <header className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                    <h2 className="font-black text-slate-900">
                      <span className="block text-xs font-bold text-cyan-700">{step.serviceName}</span>
                      <span className="mt-1 block">{step.title}</span>
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {
                        step.fields.length
                      }{" "}
                      حقول قابلة للتحليل
                    </p>
                  </header>

                  <div className="space-y-3 p-4">
                    {step.fields.map(
                      (field) => {
                        const expanded =
                          expandedFields.has(
                            field.id,
                          );

                        const allSelected =
                          field.values.every(
                            (item) =>
                              selectedKeys.has(
                                valueSelectionKey(
                                  field,
                                  item.value,
                                ),
                              ),
                          );

                        const selectedCount =
                          field.values.filter(
                            (item) =>
                              selectedKeys.has(
                                valueSelectionKey(
                                  field,
                                  item.value,
                                ),
                              ),
                          ).length;

                        const searchQuery =
                          (
                            valueSearch[
                              field.id
                            ] || ""
                          )
                            .trim()
                            .toLocaleLowerCase(
                              "ar",
                            );

                        const visibleValues =
                          searchQuery
                            ? field.values.filter(
                                (item) =>
                                  item.label
                                    .toLocaleLowerCase(
                                      "ar",
                                    )
                                    .includes(
                                      searchQuery,
                                    ),
                              )
                            : field.values;

                        return (
                          <section
                            key={field.id}
                            className="overflow-hidden rounded-2xl border border-slate-200"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                toggleExpanded(
                                  field.id,
                                )
                              }
                              className="flex w-full items-center justify-between gap-4 bg-white px-4 py-4 text-right transition hover:bg-slate-50"
                            >
                              <span>
                                <span className="block font-black text-slate-900">
                                  {
                                    field.label
                                  }
                                </span>

                                <span className="mt-1 block text-xs text-slate-500">
                                  {
                                    field.caseCount
                                  }{" "}
                                  حالة تحتوي
                                  على قيمة
                                </span>
                              </span>

                              <span className="flex items-center gap-3">
                                {selectedCount >
                                0 ? (
                                  <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800">
                                    {
                                      selectedCount
                                    }{" "}
                                    محدد
                                  </span>
                                ) : null}

                                <span className="text-xl text-slate-400">
                                  {expanded
                                    ? "−"
                                    : "+"}
                                </span>
                              </span>
                            </button>

                            {expanded ? (
                              <div className="border-t border-slate-100 bg-slate-50/60 p-4">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                  <p className="text-xs font-semibold text-slate-500">
                                    اختر القيم
                                    المطلوب عرضها
                                    في التقرير
                                  </p>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleWholeField(
                                        field,
                                      )
                                    }
                                    className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs font-black text-cyan-700 transition hover:bg-cyan-50"
                                  >
                                    {allSelected
                                      ? "إلغاء تحديد الكل"
                                      : "تحديد الكل"}
                                  </button>
                                </div>

                                {field.values
                                  .length >
                                8 ? (
                                  <input
                                    value={
                                      valueSearch[
                                        field.id
                                      ] || ""
                                    }
                                    onChange={(
                                      event,
                                    ) =>
                                      setValueSearch(
                                        (
                                          current,
                                        ) => ({
                                          ...current,
                                          [field.id]:
                                            event
                                              .target
                                              .value,
                                        }),
                                      )
                                    }
                                    placeholder="ابحث داخل القيم..."
                                    className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                                  />
                                ) : null}

                                <div className="max-h-72 space-y-2 overflow-y-auto">
                                  {visibleValues.map(
                                    (
                                      item,
                                    ) => {
                                      const checked =
                                        selectedKeys.has(
                                  valueSelectionKey(
                                    field,
                                            item.value,
                                          ),
                                        );

                                      return (
                                        <label
                                          key={
                                            item.metricId
                                          }
                                          className={[
                                            "flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 transition",
                                            checked
                                              ? "border-cyan-400 bg-cyan-50"
                                              : "border-slate-200 bg-white hover:border-cyan-200",
                                          ].join(
                                            " ",
                                          )}
                                        >
                                          <span className="flex min-w-0 items-center gap-3">
                                            <input
                                              type="checkbox"
                                              checked={
                                                checked
                                              }
                                              onChange={() =>
                                                toggleValue(
                                                  field,
                                                  item.value,
                                                )
                                              }
                                              className="h-5 w-5 rounded border-slate-300 accent-cyan-700"
                                            />

                                            <span className="truncate text-sm font-bold text-slate-800">
                                              {
                                                item.label
                                              }
                                            </span>
                                          </span>

                                          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                                            {
                                              item.caseCount
                                            }{" "}
                                            حالات
                                          </span>
                                        </label>
                                      );
                                    },
                                  )}

                                  {visibleValues.length ===
                                  0 ? (
                                    <p className="py-6 text-center text-sm text-slate-500">
                                      لا توجد نتائج
                                      مطابقة.
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}
                          </section>
                        );
                      },
                    )}
                  </div>
                </article>
              ),
            )
          )}
        </section>

        <aside className="self-start xl:sticky xl:top-6">
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 bg-slate-50 px-5 py-4">
              <p className="text-xs font-bold text-cyan-700">
                DeepSeek
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-900">
                الوصف التنفيذي للتقرير
                الإحصائي
              </h2>

              <p className="mt-2 text-xs leading-6 text-slate-500">
                الذكاء الاصطناعي يصيغ النص
                فقط، بينما تبقى الأرقام من
                المحرك الإحصائي.
              </p>
            </header>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">
                    الحالات
                  </p>

                  <p className="mt-1 text-xl font-black text-slate-900">
                    {
                      data.sourceCaseCount
                    }
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">
                    التقارير الصادرة
                  </p>

                  <p className="mt-1 text-xl font-black text-slate-900">
                    {
                      data.sourceReportCount
                    }
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  generateDescription
                }
                disabled={
                  descriptionLoading ||
                  selectedValues.length ===
                    0
                }
                className="w-full rounded-2xl bg-cyan-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-700/20 transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {descriptionLoading
                  ? "جارٍ إنشاء الوصف..."
                  : analysis
                    ? "إعادة توليد الوصف"
                    : "إنشاء الوصف التنفيذي"}
              </button>

              {descriptionError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {descriptionError}
                </div>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  النص المعتمد
                </span>

                <textarea
                  value={
                    executiveDescription
                  }
                  onChange={(event) =>
                    setExecutiveDescription(
                      event.target.value.slice(
                        0,
                        1800,
                      ),
                    )
                  }
                  rows={12}
                  placeholder="حدد القيم ثم اضغط إنشاء الوصف التنفيذي..."
                  className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                />

                <span className="mt-1 block text-left text-xs text-slate-400">
                  {
                    executiveDescription.length
                  }
                  /1800
                </span>
              </label>

              {saveError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {saveError}
                </div>
              ) : null}

              <button
                type="button"
                onClick={saveReport}
                disabled={
                  saving ||
                  descriptionLoading ||
                  !analysis ||
                  selectedValues.length === 0 ||
                  executiveDescription.trim().length < 20
                }
                className="w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "جارٍ حفظ التقرير..."
                  : "حفظ التقرير ومعاينته"}
              </button>

              <p className="text-center text-xs leading-5 text-slate-400">
                سيعيد الخادم حساب جميع
                الأرقام قبل حفظ التقرير.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
