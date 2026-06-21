"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CustomReportSchema } from "@/lib/custom-report/custom-report-types";

type SavedTemplate = {
  id: string;
  title: string;
  description: string | null;
  schemaJson: CustomReportSchema;
  updatedAt: string;
};

type SavedEntry = {
  id: string;
  title: string | null;
  status: "DRAFT" | "SUBMITTED" | "ARCHIVED" | string;
  updatedAt: string;
  createdAt: string;
};

export function CustomReportServiceHome({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const [tab, setTab] = useState<"entries" | "templates">("entries");
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [entries, setEntries] = useState<SavedEntry[]>([]);

  const draftsCount = useMemo(
    () => entries.filter((entry) => entry.status === "DRAFT").length,
    [entries],
  );

  useEffect(() => {
    async function loadData() {
      const [templatesResponse, entriesResponse] = await Promise.all([
        fetch("/api/dashboard/custom-report/templates", { cache: "no-store" }),
        fetch("/api/dashboard/custom-report/entries", { cache: "no-store" }),
      ]);

      if (templatesResponse.ok) {
        const data = await templatesResponse.json();
        setTemplates(data.templates || []);
      }

      if (entriesResponse.ok) {
        const data = await entriesResponse.json();
        setEntries(data.entries || []);
      }
    }

    loadData();
  }, []);

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-sky-600 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black text-sky-100">Workflow Runtime</p>
            <h1 className="mt-3 text-4xl font-black">تقرير خاص</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-8 text-sky-50">
              أنشئ تقريرًا خاصًا بوصف بسيط، ثم حوّله إلى حقول منظمة وقالب محفوظ، ويُحفظ كسجل رسمي داخل الحالات.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black">
                {userName}
              </span>
              <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black">
                {userRole}
              </span>
            </div>
          </div>

          <Link
            href="/dashboard/custom-report/new"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-black text-sky-900 shadow-sm transition hover:bg-sky-50"
          >
            + إنشاء تقرير خاص
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-slate-500">القوالب المحفوظة</p>
          <p className="mt-3 text-3xl font-black">{templates.length}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-slate-500">آخر التقارير</p>
          <p className="mt-3 text-3xl font-black">{entries.length}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-slate-500">المسودات</p>
          <p className="mt-3 text-3xl font-black">{draftsCount}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black text-sky-700">السجلات السابقة</p>
            <h2 className="mt-1 text-2xl font-black">
              {tab === "entries" ? "آخر التقارير" : "القوالب المحفوظة"}
            </h2>
          </div>

          <div className="flex rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setTab("entries")}
              className={`rounded-full px-5 py-2 text-sm font-black transition ${
                tab === "entries" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"
              }`}
            >
              آخر التقارير
            </button>

            <button
              type="button"
              onClick={() => setTab("templates")}
              className={`rounded-full px-5 py-2 text-sm font-black transition ${
                tab === "templates" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"
              }`}
            >
              القوالب المحفوظة
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {tab === "entries" ? (
            entries.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500 md:col-span-2">
                لا توجد تقارير محفوظة بعد.
              </div>
            ) : (
              entries.map((entry) => (
                <article key={entry.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-black">{entry.title || "تقرير خاص"}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        entry.status === "SUBMITTED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {entry.status === "SUBMITTED" ? "مرسل" : "مسودة"}
                    </span>
                  </div>

                  <p className="mt-3 text-xs font-bold text-slate-500">
                    آخر تحديث: {new Date(entry.updatedAt).toLocaleDateString("ar-SA")}
                  </p>

                  <Link
                    href={`/dashboard/cases/${entry.id}`}
                    className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-2 text-sm font-black text-white"
                  >
                    عرض الحالة
                  </Link>
                </article>
              ))
            )
          ) : templates.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500 md:col-span-2">
              لا توجد قوالب محفوظة بعد.
            </div>
          ) : (
            templates.map((template) => (
              <article key={template.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-xl font-black">{template.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm font-bold leading-7 text-slate-500">
                  {template.description || "قالب تقرير خاص محفوظ."}
                </p>

                <Link
                  href={`/dashboard/custom-report/new?templateId=${template.id}`}
                  className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-2 text-sm font-black text-white"
                >
                  استخدام القالب
                </Link>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}