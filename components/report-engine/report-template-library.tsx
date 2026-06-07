"use client";

import { useEffect, useMemo, useState } from "react";

type TemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type TemplateRow = {
  id: string;
  name: string;
  description: string;
  serviceSlug: string | null;
  workflowSlug: string | null;
  locationKey: string | null;
  scope: string;
  status: TemplateStatus;
  updatedAt: string;
  isActive: boolean;
  pagesCount: number;
  blocksCount: number;
  usedFieldsCount: number;
  testedCaseId: string;
  raw: any;
  templateJson: any;
};

const statusLabels: Record<TemplateStatus | "ALL", string> = {
  ALL: "الكل",
  DRAFT: "مسودات",
  PUBLISHED: "منشورة",
  ARCHIVED: "مؤرشفة",
};

const statusClasses: Record<TemplateStatus, string> = {
  DRAFT: "bg-amber-50 text-amber-700",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  ARCHIVED: "bg-slate-100 text-slate-600",
};

function parseTemplateJson(item: any) {
  const raw = item?.templateJson ?? item?.content ?? item?.template ?? null;

  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (typeof raw === "object") {
    return raw;
  }

  return null;
}

function countBlocks(templateJson: any) {
  const pages = Array.isArray(templateJson?.smartStudio?.pages)
    ? templateJson.smartStudio.pages
    : Array.isArray(templateJson?.pages)
      ? templateJson.pages
      : [];

  return pages.reduce((total: number, page: any) => {
    const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
    return total + blocks.length;
  }, 0);
}

function normalizeTemplate(item: any): TemplateRow | null {
  const templateJson = parseTemplateJson(item) || {};

  const status =
    templateJson.status === "PUBLISHED" ||
    templateJson.status === "ARCHIVED" ||
    templateJson.status === "DRAFT"
      ? templateJson.status
      : item?.isActive === false
        ? "ARCHIVED"
        : "DRAFT";

  const pages = Array.isArray(templateJson?.smartStudio?.pages)
    ? templateJson.smartStudio.pages
    : Array.isArray(templateJson?.pages)
      ? templateJson.pages
      : [];

  const workflowBinding = templateJson?.workflowBinding || {};

  const id = String(item?.id || templateJson?.id || "").trim();

  if (!id) return null;

  return {
    id,
    name: String(item?.name || templateJson?.name || "قالب بدون اسم"),
    description: String(
      item?.description ||
        templateJson?.description ||
        "قالب تقرير رسمي ذكي محفوظ في النظام.",
    ),
    serviceSlug:
      item?.serviceSlug ||
      templateJson?.serviceSlug ||
      workflowBinding?.serviceSlug ||
      null,
    workflowSlug:
      templateJson?.workflowSlug || workflowBinding?.workflowSlug || null,
    locationKey:
      templateJson?.locationKey || workflowBinding?.locationKey || null,
    scope: templateJson?.scope || workflowBinding?.scope || "GLOBAL",
    status,
    updatedAt: String(
      item?.updatedAt || templateJson?.updatedAt || item?.createdAt || "",
    ),
    isActive: item?.isActive !== false && status !== "ARCHIVED",
    pagesCount: pages.length,
    blocksCount: countBlocks(templateJson),
    usedFieldsCount: Array.isArray(workflowBinding?.usedFieldKeys)
      ? workflowBinding.usedFieldKeys.length
      : 0,
    testedCaseId: String(templateJson?.previewCaseId || ""),
    raw: item,
    templateJson,
  };
}

function formatDate(value: string) {
  if (!value) return "غير محدد";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function ReportTemplateLibrary() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | "ALL">("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState("");

  async function loadTemplates() {
    try {
      setLoading(true);

      const response = await fetch("/api/dashboard/report-templates", {
        cache: "no-store",
      });

      const result = await response.json();

      const rawTemplates = Array.isArray(result?.templates)
        ? result.templates
        : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result)
            ? result
            : [];

      const normalized = rawTemplates
        .map(normalizeTemplate)
        .filter(Boolean) as TemplateRow[];

      setTemplates(normalized);
    } catch {
      setFeedback("تعذر تحميل مكتبة القوالب.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  const services = useMemo(() => {
    return Array.from(
      new Set(
        templates
          .map((template) => template.serviceSlug)
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort();
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return templates.filter((template) => {
      if (statusFilter !== "ALL" && template.status !== statusFilter) {
        return false;
      }

      if (serviceFilter !== "ALL" && template.serviceSlug !== serviceFilter) {
        return false;
      }

      if (!normalizedSearch) return true;

      return [
        template.name,
        template.description,
        template.serviceSlug || "",
        template.workflowSlug || "",
        template.locationKey || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [templates, statusFilter, serviceFilter, search]);

  function openInStudio(template: TemplateRow) {
    try {
      sessionStorage.setItem(
        "template-studio-selected",
        JSON.stringify(template.raw),
      );
    } catch {}

    window.location.href = `/dashboard/admin/report-templates?templateId=${encodeURIComponent(
      template.id,
    )}`;
  }

  async function updateStatus(template: TemplateRow, nextStatus: TemplateStatus) {
    try {
      const nextTemplateJson = {
        ...template.templateJson,
        status: nextStatus,
        updatedAt: new Date().toISOString().slice(0, 10),
      };

      const response = await fetch(
        `/api/dashboard/report-templates/${template.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: template.name,
            description: template.description,
            serviceSlug: template.serviceSlug,
            type: "SCHOOL",
            content: JSON.stringify(nextTemplateJson),
            templateJson: nextTemplateJson,
            genderAware: true,
            isActive: nextStatus !== "ARCHIVED",
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || result?.message || "تعذر تحديث القالب.");
      }

      setFeedback("تم تحديث حالة القالب بنجاح.");
      await loadTemplates();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "تعذر تحديث حالة القالب.",
      );
    }
  }

  async function duplicateTemplate(template: TemplateRow) {
    try {
      const timestamp = Date.now();

      const nextTemplateJson = {
        ...template.templateJson,
        id: `copy-${template.templateJson?.id || template.id}-${timestamp}`,
        name: `نسخة من ${template.name}`,
        status: "DRAFT",
        updatedAt: new Date().toISOString().slice(0, 10),
      };

      const response = await fetch("/api/dashboard/report-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nextTemplateJson.name,
          description: template.description,
          serviceSlug: template.serviceSlug,
          type: "SCHOOL",
          content: JSON.stringify(nextTemplateJson),
          templateJson: nextTemplateJson,
          genderAware: true,
          isActive: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || result?.message || "تعذر نسخ القالب.");
      }

      setFeedback("تم إنشاء نسخة جديدة من القالب.");
      await loadTemplates();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "تعذر نسخ القالب.");
    }
  }

  async function deleteTemplate(template: TemplateRow) {
    const confirmed = window.confirm(
      `هل تريد حذف القالب "${template.name}"؟ لا تستخدم الحذف إلا للقوالب التجريبية.`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/dashboard/report-templates/${template.id}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || result?.message || "تعذر حذف القالب.");
      }

      setFeedback("تم حذف القالب.");
      await loadTemplates();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "تعذر حذف القالب.");
    }
  }

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-black text-emerald-700">
              مكتبة القوالب
            </p>

            <h1 className="mt-2 text-2xl font-black text-slate-900">
              إدارة القوالب الرسمية الذكية
            </h1>

            <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-500">
              هنا تتابع القوالب المحفوظة، حالتها، الخدمة أو Workflow المرتبط،
              عدد الصفحات والبلوكات، وهل تم اختبارها على Case ID.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/dashboard/admin/report-templates"
              className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
            >
              إنشاء قالب جديد
            </a>

            <button
              type="button"
              onClick={loadTemplates}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              تحديث
            </button>
          </div>
        </div>

        {feedback ? (
          <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {feedback}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_190px_190px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث باسم القالب، الخدمة، Workflow..."
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-600"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as TemplateStatus | "ALL")
            }
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
          >
            <option value="ALL">كل الحالات</option>
            <option value="DRAFT">مسودة</option>
            <option value="PUBLISHED">منشور</option>
            <option value="ARCHIVED">مؤرشف</option>
          </select>

          <select
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
          >
            <option value="ALL">كل الخدمات</option>
            {services.map((serviceSlug) => (
              <option key={serviceSlug} value={serviceSlug}>
                {serviceSlug}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid gap-4">
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">
            جاري تحميل القوالب...
          </div>
        ) : filteredTemplates.length ? (
          filteredTemplates.map((template) => (
            <article
              key={template.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${statusClasses[template.status]}`}
                    >
                      {statusLabels[template.status]}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                      {template.scope}
                    </span>

                    {template.serviceSlug ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        {template.serviceSlug}
                      </span>
                    ) : null}

                    {template.workflowSlug ? (
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                        {template.workflowSlug}
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-3 text-xl font-black text-slate-900">
                    {template.name}
                  </h2>

                  <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-500">
                    {template.description}
                  </p>

                  <div className="mt-4 grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-2 lg:grid-cols-5">
                    <Info label="الصفحات" value={`${template.pagesCount}`} />
                    <Info label="البلوكات" value={`${template.blocksCount}`} />
                    <Info label="حقول مستخدمة" value={`${template.usedFieldsCount}`} />
                    <Info
                      label="Case ID"
                      value={template.testedCaseId || "لم يحدد"}
                    />
                    <Info label="آخر تعديل" value={formatDate(template.updatedAt)} />
                  </div>
                </div>

                <div className="grid min-w-52 gap-2">
                  <button
                    type="button"
                    onClick={() => openInStudio(template)}
                    className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
                  >
                    تعديل في الاستديو
                  </button>

                  <button
                    type="button"
                    onClick={() => duplicateTemplate(template)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    نسخ القالب
                  </button>

                  {template.status !== "PUBLISHED" ? (
                    <button
                      type="button"
                      onClick={() => updateStatus(template, "PUBLISHED")}
                      className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
                    >
                      نشر
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateStatus(template, "DRAFT")}
                      className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-100"
                    >
                      تحويل لمسودة
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => updateStatus(template, "ARCHIVED")}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-100"
                  >
                    أرشفة
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteTemplate(template)}
                    className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-lg font-black text-slate-900">
              لا توجد قوالب مطابقة
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              غيّر الفلاتر أو أنشئ قالبًا جديدًا من الاستديو.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-slate-800">{value}</p>
    </div>
  );
}
