"use client";

import {
  useMemo,
  useState,
} from "react";

import type {
  StatisticsDatePreset,
  StatisticsServiceOption,
} from "@/lib/statistics/statistics-types";

type StartInput = {
  serviceSlugs: string[];
  preset: StatisticsDatePreset;
  from?: string;
  to?: string;
};

type Props = {
  open: boolean;
  loading: boolean;
  error: string;
  services: StatisticsServiceOption[];

  onClose: () => void;
  onStart: (input: StartInput) => void;
};

const PRESETS: Array<{
  value: StatisticsDatePreset;
  label: string;
}> = [
  {
    value: "LAST_30_DAYS",
    label: "آخر 30 يومًا",
  },
  {
    value: "CURRENT_MONTH",
    label: "الشهر الحالي",
  },
  {
    value: "CURRENT_YEAR",
    label: "العام الحالي",
  },
  {
    value: "ALL_TIME",
    label: "جميع الفترات",
  },
  {
    value: "CUSTOM",
    label: "فترة مخصصة",
  },
];

export function StatisticsCreatePopCard({
  open,
  loading,
  error,
  services,
  onClose,
  onStart,
}: Props) {
  const [search, setSearch] =
    useState("");

  const [
    selectedServices,
    setSelectedServices,
  ] = useState<Set<string>>(() => new Set());

  const [preset, setPreset] =
    useState<StatisticsDatePreset>(
      "LAST_30_DAYS",
    );

  const [from, setFrom] =
    useState("");

  const [to, setTo] =
    useState("");

  const [localError, setLocalError] =
    useState("");

  const filteredServices = useMemo(
    () => {
      const query = search
        .trim()
        .toLocaleLowerCase("ar");

      if (!query) {
        return services;
      }

      return services.filter(
        (service) =>
          service.name
            .toLocaleLowerCase("ar")
            .includes(query) ||
          service.slug
            .toLowerCase()
            .includes(query),
      );
    },
    [search, services],
  );

  if (!open) {
    return null;
  }

  function submit() {
    setLocalError("");

    if (!selectedServices.size) {
      setLocalError(
        "اختر خدمة واحدة على الأقل.",
      );
      return;
    }

    if (
      preset === "CUSTOM" &&
      (!from || !to)
    ) {
      setLocalError(
        "حدد تاريخ البداية والنهاية.",
      );
      return;
    }

    onStart({
      serviceSlugs: Array.from(selectedServices),
      preset,
      ...(preset === "CUSTOM"
        ? {
            from,
            to,
          }
        : {}),
    });
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      dir="rtl"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="statistics-create-title"
        className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-cyan-700">
              تقرير جديد
            </p>

            <h2
              id="statistics-create-title"
              className="mt-1 text-xl font-black text-slate-900"
            >
              إنشاء تقرير إحصائي
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              اختر الخدمات والفترة، ثم انتقل
              إلى صفحة التحضير لتحديد الحقول
              والقيم.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-xl text-slate-500 transition hover:bg-slate-50"
            aria-label="إغلاق"
          >
            ×
          </button>
        </header>

        <div className="space-y-6 px-6 py-5">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-bold text-slate-900">
                الخدمات
              </h3>

              <span className="text-xs text-slate-500">
                تم اختيار {selectedServices.size} خدمات
              </span>
            </div>

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="ابحث عن خدمة..."
              className="mb-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />

            <div className="mb-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setSelectedServices((current) => {
                const next = new Set(current);
                filteredServices.forEach((service) => next.add(service.slug));
                return next;
              })} className="rounded-xl border border-cyan-200 px-3 py-2 text-xs font-black text-cyan-700">تحديد الكل</button>
              <button type="button" onClick={() => setSelectedServices((current) => {
                const next = new Set(current);
                filteredServices.forEach((service) => next.delete(service.slug));
                return next;
              })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">إلغاء تحديد الكل</button>
            </div>

            <div className="max-h-[280px] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-2">
              {loading ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">
                  جارٍ تحميل الخدمات...
                </div>
              ) : filteredServices.length ? (
                filteredServices.map(
                  (service) => {
                    const selected =
                      selectedServices.has(service.slug);

                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setSelectedServices((current) => {
                          const next = new Set(current);
                          if (next.has(service.slug)) next.delete(service.slug); else next.add(service.slug);
                          return next;
                        })}
                        className={[
                          "w-full rounded-2xl border px-4 py-3 text-right transition",
                          selected
                            ? "border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100"
                            : "border-slate-200 bg-white hover:border-cyan-200 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <span className="flex items-center gap-3 font-bold text-slate-900">
                          <input type="checkbox" checked={selected} readOnly className="h-5 w-5 accent-cyan-700" />
                          {service.name}
                        </span>

                        <span className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>
                            {
                              service.eligibleCaseCount
                            }{" "}
                            حالة
                          </span>

                          <span>
                            {
                              service.issuedReportCount
                            }{" "}
                            تقرير صادر
                          </span>
                        </span>
                      </button>
                    );
                  },
                )
              ) : (
                <div className="px-4 py-10 text-center text-sm leading-6 text-slate-500">
                  لا توجد خدمات متاحة ضمن اشتراك حسابك.
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-bold text-slate-900">
              الفترة الإحصائية
            </h3>

            <div className="grid gap-2 sm:grid-cols-2">
              {PRESETS.map((item) => {
                const selected =
                  preset === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setPreset(item.value)
                    }
                    className={[
                      "rounded-2xl border px-4 py-3 text-sm font-bold transition",
                      selected
                        ? "border-cyan-500 bg-cyan-50 text-cyan-800 ring-2 ring-cyan-100"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {preset === "CUSTOM" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    من
                  </span>

                  <input
                    type="date"
                    value={from}
                    onChange={(event) =>
                      setFrom(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    إلى
                  </span>

                  <input
                    type="date"
                    value={to}
                    onChange={(event) =>
                      setTo(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </label>
              </div>
            ) : null}
          </section>

          {error || localError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {localError || error}
            </div>
          ) : null}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={
              loading ||
              services.length === 0 ||
              selectedServices.size === 0
            }
            className="rounded-2xl bg-cyan-700 px-6 py-3 text-sm font-black text-white shadow-lg shadow-cyan-700/20 transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            بدء التحضير
          </button>
        </footer>
      </section>
    </div>
  );
}
