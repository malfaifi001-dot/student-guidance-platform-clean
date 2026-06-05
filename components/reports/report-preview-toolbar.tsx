"use client";

import Link from "next/link";
import type {
  EvidenceLayout,
  ReportTemplateId,
} from "@/lib/report-engine/report-types";

export type ReportViewMode = "text" | "grid" | "mixed";

type ReportPreviewToolbarProps = {
  reportId: string;
  title: string;
  serviceName: string;
  selectedTemplate: ReportTemplateId;
  selectedEvidenceLayout: EvidenceLayout;
  selectedViewMode: ReportViewMode;
  showCover: boolean;
};

const templateOptions: Array<{
  id: ReportTemplateId;
  label: string;
  description: string;
}> = [
  {
    id: "official-long",
    label: "رسمي",
    description: "للتقارير الرسمية المعتمدة",
  },
  {
    id: "executive-brief",
    label: "مختصر",
    description: "للملخصات السريعة",
  },
  {
    id: "visual-activity",
    label: "بصري",
    description: "للأنشطة والشواهد المصورة",
  },
];

const viewOptions: Array<{
  id: ReportViewMode;
  label: string;
  description: string;
}> = [
  {
    id: "text",
    label: "نصي",
    description: "نص رسمي منسق",
  },
  {
    id: "grid",
    label: "شبكي",
    description: "بيانات منظمة فقط",
  },
  {
    id: "mixed",
    label: "مختلط",
    description: "نص + بيانات",
  },
];

const evidenceOptions: Array<{
  id: EvidenceLayout;
  label: string;
}> = [
  {
    id: "grid-2x2",
    label: "شبكة 2×2",
  },
  {
    id: "two-columns",
    label: "عمودان",
  },
  {
    id: "single-large",
    label: "شاهد كبير",
  },
  {
    id: "one-per-page",
    label: "شاهد لكل صفحة",
  },
];

export function ReportPreviewToolbar({
  reportId,
  title,
  serviceName,
  selectedTemplate,
  selectedEvidenceLayout,
  selectedViewMode,
  showCover,
}: ReportPreviewToolbarProps) {
  const basePath = `/dashboard/reports/${reportId}/preview`;

  function buildHref({
    template = selectedTemplate,
    evidenceLayout = selectedEvidenceLayout,
    view = selectedViewMode,
    cover = showCover,
  }: {
    template?: ReportTemplateId;
    evidenceLayout?: EvidenceLayout;
    view?: ReportViewMode;
    cover?: boolean;
  }) {
    const params = new URLSearchParams({
      template,
      evidenceLayout,
      view,
      cover: String(cover),
    });

    return `${basePath}?${params.toString()}`;
  }

  return (
    <section className="mx-auto mb-6 max-w-[260mm] rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
            معاينة التقارير الحقيقية A4
          </div>

          <h1 className="mt-3 max-w-3xl truncate text-2xl font-black text-slate-900">
            {title}
          </h1>

          <p className="mt-1 text-sm leading-7 text-slate-500">
            {serviceName} — {getTemplateName(selectedTemplate)} —{" "}
            {getEvidenceLayoutName(selectedEvidenceLayout)} —{" "}
            {getViewModeName(selectedViewMode)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700"
          >
            طباعة / حفظ PDF
          </button>

          <Link
            href={`/dashboard/reports/${reportId}/studio`}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            تعديل التقارير
          </Link>

          <Link
            href="/dashboard/reports"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            الرجوع
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr]">
        <ToolbarGroup title="القالب" subtitle="شكل التقارير العام">
          {templateOptions.map((template) => (
            <ToolbarChoice
              key={template.id}
              href={buildHref({ template: template.id })}
              active={selectedTemplate === template.id}
              label={template.label}
              description={template.description}
            />
          ))}
        </ToolbarGroup>

        <ToolbarGroup title="نمط العرض" subtitle="طريقة عرض المحتوى">
          {viewOptions.map((view) => (
            <ToolbarChoice
              key={view.id}
              href={buildHref({ view: view.id })}
              active={selectedViewMode === view.id}
              label={view.label}
              description={view.description}
            />
          ))}
        </ToolbarGroup>

        <ToolbarGroup title="الشواهد والغلاف" subtitle="تنسيق المرفقات والصفحات">
          <div className="flex flex-wrap gap-2">
            {evidenceOptions.map((layout) => (
              <ToolbarPill
                key={layout.id}
                href={buildHref({ evidenceLayout: layout.id })}
                active={selectedEvidenceLayout === layout.id}
              >
                {layout.label}
              </ToolbarPill>
            ))}

            <ToolbarPill href={buildHref({ cover: !showCover })} active={!showCover}>
              {showCover ? "إخفاء الغلاف" : "إظهار الغلاف"}
            </ToolbarPill>
          </div>
        </ToolbarGroup>
      </div>
    </section>
  );
}

function ToolbarGroup({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3">
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="mt-1 text-xs font-bold text-slate-500">{subtitle}</p>
      </div>

      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ToolbarChoice({
  href,
  active,
  label,
  description,
}: {
  href: string;
  active: boolean;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "block rounded-2xl border px-4 py-3 transition",
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black">{label}</span>

        {active ? (
          <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-black">
            مختار
          </span>
        ) : null}
      </div>

      <p
        className={[
          "mt-1 text-xs leading-5",
          active ? "text-slate-200" : "text-slate-500",
        ].join(" ")}
      >
        {description}
      </p>
    </Link>
  );
}

function ToolbarPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-2xl border px-4 py-2.5 text-xs font-black transition",
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function getTemplateName(templateId?: string | null) {
  if (templateId === "visual-activity") return "القالب البصري";
  if (templateId === "executive-brief") return "القالب المختصر";
  if (templateId === "official-long") return "القالب الرسمي";
  return "القالب الرسمي";
}

function getEvidenceLayoutName(layout: EvidenceLayout) {
  if (layout === "one-per-page") return "شاهد في كل صفحة";
  if (layout === "single-large") return "شاهد كبير";
  if (layout === "stacked") return "شاهدان فوق بعض";
  if (layout === "two-columns") return "عمودان";
  if (layout === "grid-2x2") return "شبكة 2×2";
  return "تلقائي";
}

function getViewModeName(mode: ReportViewMode) {
  if (mode === "text") return "عرض نصي";
  if (mode === "grid") return "عرض شبكي";
  return "عرض مختلط";
}