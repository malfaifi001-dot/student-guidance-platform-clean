"use client";

import {
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import type {
  StatisticsDatePreset,
  StatisticsServiceOption,
} from "@/lib/statistics/statistics-types";

import {
  StatisticsCreatePopCard,
} from "./statistics-create-pop-card";

import {
  StatisticsPreviousReports,
} from "./statistics-previous-reports";

type ServicesResponse = {
  success?: boolean;
  error?: string;

  services?: StatisticsServiceOption[];

  totals?: {
    eligibleCaseCount: number;
    issuedReportCount: number;
  };
};

export function StatisticsLandingShell() {
  const router = useRouter();

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [loaded, setLoaded] =
    useState(false);

  const [error, setError] =
    useState("");

  const [services, setServices] =
    useState<
      StatisticsServiceOption[]
    >([]);

  const totals = useMemo(
    () => ({
      cases: services.reduce(
        (sum, service) =>
          sum +
          service.eligibleCaseCount,
        0,
      ),

      reports: services.reduce(
        (sum, service) =>
          sum +
          service.issuedReportCount,
        0,
      ),
    }),
    [services],
  );

  async function loadServices() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/dashboard/statistics/services",
        {
          cache: "no-store",
        },
      );

      const payload =
        (await response.json()) as
          ServicesResponse;

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.error ||
            "تعذر تحميل الخدمات.",
        );
      }

      setServices(
        Array.isArray(payload.services)
          ? payload.services
          : [],
      );

      setLoaded(true);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر تحميل الخدمات.",
      );
    } finally {
      setLoading(false);
    }
  }

  function openCreateCard() {
    setOpen(true);

    if (!loaded) {
      void loadServices();
    }
  }

  function startPreparation(input: {
    serviceSlug: string;
    preset: StatisticsDatePreset;
    from?: string;
    to?: string;
  }) {
    const params =
      new URLSearchParams();

    params.set(
      "serviceSlug",
      input.serviceSlug,
    );

    params.set(
      "preset",
      input.preset,
    );

    if (input.from) {
      params.set("from", input.from);
    }

    if (input.to) {
      params.set("to", input.to);
    }

    router.push(
      `/dashboard/statistics/prepare?${params.toString()}`,
    );
  }

  return (
    <main
      className="space-y-6"
      dir="rtl"
    >
      <section className="overflow-hidden rounded-[30px] border border-cyan-100 bg-gradient-to-l from-cyan-50 via-white to-sky-50 p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-cyan-200 bg-white px-4 py-2 text-xs font-black text-cyan-800">
              التقارير الرقمية
            </span>

            <h1 className="mt-4 text-3xl font-black text-slate-950 md:text-4xl">
              الإحصائيات
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              أنشئ تقريرًا إحصائيًا من
              الحالات التي لديها تقارير
              صادرة، ثم اختر الحقول والقيم
              التي تريد عرض أعدادها.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateCard}
            className="rounded-2xl bg-cyan-700 px-6 py-4 text-sm font-black text-white shadow-xl shadow-cyan-700/20 transition hover:-translate-y-0.5 hover:bg-cyan-800"
          >
            إنشاء تقرير إحصائي
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            الخدمات المتاحة
          </p>

          <p className="mt-3 text-3xl font-black text-slate-950">
            {loaded
              ? services.length
              : "—"}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            خدمات تحتوي على تقارير صادرة
            ضمن نطاق الحساب.
          </p>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            الحالات المؤهلة
          </p>

          <p className="mt-3 text-3xl font-black text-slate-950">
            {loaded
              ? totals.cases
              : "—"}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            كل حالة تُحسب مرة واحدة داخل
            كل قيمة.
          </p>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            التقارير الصادرة
          </p>

          <p className="mt-3 text-3xl font-black text-slate-950">
            {loaded
              ? totals.reports
              : "—"}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            عدد مستقل عن عدد الحالات
            المؤهلة.
          </p>
        </article>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">
          آلية التقرير
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            {
              number: "1",
              title: "اختيار الخدمة",
              text:
                "تظهر الخدمات التي لديها تقارير صادرة فعلية فقط.",
            },
            {
              number: "2",
              title: "تحديد القيم",
              text:
                "اختر الحقول والقيم وشاهد العدد المباشر لكل قيمة.",
            },
            {
              number: "3",
              title: "صياغة الوصف",
              text:
                "يصيغ DeepSeek الوصف التنفيذي دون تغيير الأرقام.",
            },
          ].map((item) => (
            <article
              key={item.number}
              className="rounded-2xl bg-slate-50 p-5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-700 text-sm font-black text-white">
                {item.number}
              </span>

              <h3 className="mt-4 font-black text-slate-900">
                {item.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <StatisticsPreviousReports />

      <StatisticsCreatePopCard
        open={open}
        loading={loading}
        error={error}
        services={services}
        onClose={() => setOpen(false)}
        onStart={startPreparation}
      />
    </main>
  );
}