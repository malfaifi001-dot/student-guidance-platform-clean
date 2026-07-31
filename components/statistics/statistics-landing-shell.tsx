"use client";

import {
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
    serviceSlugs: string[];
    preset: StatisticsDatePreset;
    from?: string;
    to?: string;
  }) {
    const params =
      new URLSearchParams();

    input.serviceSlugs.forEach((serviceSlug) => params.append("serviceSlug", serviceSlug));

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
