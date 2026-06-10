import Link from "next/link";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import { prisma } from "@/lib/prisma";
import {
  activityLeaderReportTemplates,
  buildActivityLeaderReportTemplateJson,
  getActivityLeaderReportTemplateConfig,
  getActivityLeaderTemplateIdFromJson,
  getActivityLeaderTemplateSortOrder,
  isActivityLeaderReportTemplateJson,
  parseJsonRecord,
  type ActivityLeaderReportTemplateConfig,
} from "@/lib/activity-programs/activity-report-templates";

const PAGE_PATH = "/dashboard/admin/report-templates/activity-leader";

type StoredTemplate = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  templateJson: Prisma.JsonValue | null;
  content: string | null;
  updatedAt: Date;
};

function readTemplateJson(template: StoredTemplate) {
  const fromJson = parseJsonRecord(template.templateJson);

  if (Object.keys(fromJson).length) {
    return fromJson;
  }

  return parseJsonRecord(template.content);
}

async function getActivityLeaderStoredTemplates() {
  const rows = await prisma.reportTemplate.findMany({
    where: {
      serviceSlug: "activity-programs",
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      templateJson: true,
      content: true,
      updatedAt: true,
    },
  });

  const map = new Map<string, StoredTemplate>();

  for (const row of rows) {
    const json = readTemplateJson(row);

    if (!isActivityLeaderReportTemplateJson(json)) {
      continue;
    }

    const templateId = getActivityLeaderTemplateIdFromJson(json);

    if (templateId && !map.has(templateId)) {
      map.set(templateId, row);
    }
  }

  return map;
}

async function upsertActivityLeaderTemplate(input: {
  config: ActivityLeaderReportTemplateConfig;
  isActive: boolean;
  sortOrder: number;
}) {
  const existingMap = await getActivityLeaderStoredTemplates();
  const existing = existingMap.get(input.config.id);

  const templateJson = buildActivityLeaderReportTemplateJson(input.config, {
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  });

  const data = {
    name: input.config.name,
    description: input.config.description,
    serviceSlug: input.config.serviceSlug,
    type: "SYSTEM" as const,
    content: JSON.stringify(templateJson),
    templateJson: templateJson as Prisma.InputJsonValue,
    genderAware: true,
    isActive: input.isActive,
  };

  if (existing) {
    await prisma.reportTemplate.update({
      where: {
        id: existing.id,
      },
      data: {
        ...data,
        version: {
          increment: 1,
        },
      },
    });

    return;
  }

  await prisma.reportTemplate.create({
    data,
  });
}

async function seedActivityLeaderReportTemplates() {
  "use server";

  await requireAdminPage();

  const existingMap = await getActivityLeaderStoredTemplates();

  for (const config of activityLeaderReportTemplates) {
    if (existingMap.has(config.id)) {
      continue;
    }

    await upsertActivityLeaderTemplate({
      config,
      isActive: config.defaultEnabled,
      sortOrder: config.defaultSortOrder,
    });
  }

  revalidatePath(PAGE_PATH);
}

async function toggleActivityLeaderReportTemplate(formData: FormData) {
  "use server";

  await requireAdminPage();

  const templateId = String(formData.get("templateId") || "");
  const nextActive = String(formData.get("nextActive") || "") === "true";

  const config = getActivityLeaderReportTemplateConfig(templateId);

  if (!config) {
    return;
  }

  const existingMap = await getActivityLeaderStoredTemplates();
  const existing = existingMap.get(config.id);
  const existingJson = existing ? readTemplateJson(existing) : {};
  const sortOrder = getActivityLeaderTemplateSortOrder(
    existingJson,
    config.defaultSortOrder,
  );

  await upsertActivityLeaderTemplate({
    config,
    isActive: nextActive,
    sortOrder,
  });

  revalidatePath(PAGE_PATH);
}

async function moveActivityLeaderReportTemplate(formData: FormData) {
  "use server";

  await requireAdminPage();

  const templateId = String(formData.get("templateId") || "");
  const direction = String(formData.get("direction") || "");

  const existingMap = await getActivityLeaderStoredTemplates();

  const items = activityLeaderReportTemplates
    .map((config) => {
      const existing = existingMap.get(config.id);
      const json = existing ? readTemplateJson(existing) : {};

      return {
        config,
        existing,
        isActive: existing ? existing.isActive : config.defaultEnabled,
        sortOrder: getActivityLeaderTemplateSortOrder(
          json,
          config.defaultSortOrder,
        ),
      };
    })
    .sort((first, second) => first.sortOrder - second.sortOrder);

  const index = items.findIndex((item) => item.config.id === templateId);

  if (index === -1) {
    return;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= items.length) {
    return;
  }

  const current = items[index];
  const target = items[targetIndex];

  await Promise.all([
    upsertActivityLeaderTemplate({
      config: current.config,
      isActive: current.isActive,
      sortOrder: target.sortOrder,
    }),
    upsertActivityLeaderTemplate({
      config: target.config,
      isActive: target.isActive,
      sortOrder: current.sortOrder,
    }),
  ]);

  revalidatePath(PAGE_PATH);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
  }).format(value);
}

export default async function AdminActivityLeaderReportTemplatesPage() {
  await requireAdminPage();

  const existingMap = await getActivityLeaderStoredTemplates();

  const templates = activityLeaderReportTemplates
    .map((config) => {
      const stored = existingMap.get(config.id);
      const json = stored ? readTemplateJson(stored) : {};

      return {
        config,
        stored,
        isActive: stored ? stored.isActive : config.defaultEnabled,
        isCreated: Boolean(stored),
        sortOrder: getActivityLeaderTemplateSortOrder(
          json,
          config.defaultSortOrder,
        ),
      };
    })
    .sort((first, second) => first.sortOrder - second.sortOrder);

  const activeCount = templates.filter((template) => template.isActive).length;
  const createdCount = templates.filter((template) => template.isCreated).length;
  const readyCount = templates.filter(
    (template) => template.config.status === "READY",
  ).length;

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black text-emerald-700">
              تقارير رائد النشاط
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              قوالب خاصة بريادة النشاط
            </h1>

            <p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-slate-500">
              هذه القوالب منفصلة عن استديو التقارير العام. الهدف أن تكون تقارير
              رائد النشاط جاهزة ومربوطة بالحالات المعتمدة والشواهد والتوقيعات
              بدون إعادة إدخال البيانات.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/admin/report-templates"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              استديو القوالب
            </Link>

            <Link
              href="/dashboard/admin/report-templates/library"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              مكتبة القوالب
            </Link>

            <form action={seedActivityLeaderReportTemplates}>
              <button
                type="submit"
                className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
              >
                تهيئة القوالب الأساسية
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-black text-slate-400">
            القوالب المنشأة
          </span>
          <strong className="mt-2 block text-3xl font-black text-slate-950">
            {createdCount}
          </strong>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-black text-slate-400">
            القوالب المفعلة
          </span>
          <strong className="mt-2 block text-3xl font-black text-emerald-700">
            {activeCount}
          </strong>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-black text-slate-400">
            الجاهز للتنفيذ
          </span>
          <strong className="mt-2 block text-3xl font-black text-sky-700">
            {readyCount}
          </strong>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {templates.map((template, index) => {
          const nextActive = !template.isActive;

          return (
            <article
              key={template.config.id}
              className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {template.config.category}
                  </span>

                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-black ring-1",
                      template.isActive
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                        : "bg-slate-50 text-slate-500 ring-slate-100",
                    ].join(" ")}
                  >
                    {template.isActive ? "مفعل" : "غير مفعل"}
                  </span>

                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-black ring-1",
                      template.config.status === "READY"
                        ? "bg-sky-50 text-sky-700 ring-sky-100"
                        : "bg-amber-50 text-amber-700 ring-amber-100",
                    ].join(" ")}
                  >
                    {template.config.status === "READY"
                      ? "جاهز"
                      : "مخطط لاحقًا"}
                  </span>
                </div>

                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-400 ring-1 ring-slate-100">
                  ترتيب {index + 1}
                </span>
              </div>

              <h2 className="mt-4 text-2xl font-black text-slate-950">
                {template.config.name}
              </h2>

              <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
                {template.config.description}
              </p>

              <div className="mt-5 grid gap-3 rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-black text-slate-400">المعرف</span>
                  <strong className="font-black text-slate-700">
                    {template.config.id}
                  </strong>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-black text-slate-400">نوع التقرير</span>
                  <strong className="font-black text-slate-700">
                    {template.config.reportKind}
                  </strong>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-black text-slate-400">آخر تحديث</span>
                  <strong className="font-black text-slate-700">
                    {template.stored
                      ? formatDate(template.stored.updatedAt)
                      : "لم ينشأ بعد"}
                  </strong>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap gap-2">
                  <form action={toggleActivityLeaderReportTemplate}>
                    <input
                      type="hidden"
                      name="templateId"
                      value={template.config.id}
                    />
                    <input
                      type="hidden"
                      name="nextActive"
                      value={String(nextActive)}
                    />

                    <button
                      type="submit"
                      className={[
                        "rounded-2xl px-4 py-2.5 text-xs font-black transition",
                        template.isActive
                          ? "border border-red-100 bg-red-50 text-red-700 hover:bg-red-100"
                          : "bg-emerald-700 text-white hover:bg-emerald-800",
                      ].join(" ")}
                    >
                      {template.isActive ? "إيقاف" : "تفعيل"}
                    </button>
                  </form>

                  <form action={moveActivityLeaderReportTemplate}>
                    <input
                      type="hidden"
                      name="templateId"
                      value={template.config.id}
                    />
                    <input type="hidden" name="direction" value="up" />

                    <button
                      type="submit"
                      disabled={index === 0}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      أعلى
                    </button>
                  </form>

                  <form action={moveActivityLeaderReportTemplate}>
                    <input
                      type="hidden"
                      name="templateId"
                      value={template.config.id}
                    />
                    <input type="hidden" name="direction" value="down" />

                    <button
                      type="submit"
                      disabled={index === templates.length - 1}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      أسفل
                    </button>
                  </form>
                </div>

                {template.config.status === "READY" ? (
                  <Link
                    href={`/dashboard/admin/report-templates/activity-leader/preview/${template.config.id}`}
                    className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-black text-sky-800 transition hover:bg-sky-100"
                  >
                    معاينة
                  </Link>
                ) : null}

                <span className="rounded-2xl bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                  {template.isCreated ? "محفوظ في القاعدة" : "ينشأ عند التفعيل"}
                </span>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}