"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Clock3,
  Eye,
  FileText,
  Filter,
  ImageIcon,
  PencilLine,
  Search,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";

type CaseRow = {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  createdAtLabel: string;
  updatedAt: string;
  updatedAtLabel: string;
  submittedAt?: string | null;
  submittedAtLabel?: string | null;

  service: {
    id: string;
    name: string;
    slug: string;
  };

  workflow?: {
    id: string;
    name: string;
    workflowType?: string | null;
  } | null;

  student?: {
    id: string;
    fullName: string;
    nationalId?: string | null;
    stage?: string | null;
    grade?: string | null;
    classroom?: string | null;
    guardianName?: string | null;
    guardianPhone?: string | null;
    meta: string;
  } | null;

  createdBy?: {
    id: string;
    name: string;
  } | null;

  isMine: boolean;
  valuesCount: number;
  evidencesCount: number;
  reportsCount: number;

  latestReport?: {
    id: string;
    status: string;
    statusLabel: string;
    templateId?: string | null;
    updatedAt: string;
    updatedAtLabel: string;
    previewUrl: string | null;
  } | null;
};

type CasesSearchTableProps = {
  cases: CaseRow[];
  viewerName?: string;
  isAdmin?: boolean;
};

type CaseTab =
  | "all"
  | "drafts"
  | "readyForReport"
  | "withReports"
  | "withEvidence";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  SUBMITTED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  ARCHIVED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function getReportUrl(caseItem: CaseRow) {
  return `/dashboard/reports/new?caseId=${encodeURIComponent(caseItem.id)}`;
}

function getCasePrimaryAction(caseItem: CaseRow) {
  if (caseItem.status === "DRAFT") {
    return {
      label: "استكمال",
      href: `/dashboard/cases/${caseItem.id}/edit`,
      className: "bg-slate-950 text-white hover:bg-slate-800",
      icon: <PencilLine className="h-4 w-4" />,
    };
  }

  if (caseItem.latestReport?.previewUrl) {
    return {
      label: "فتح التقارير",
      href: caseItem.latestReport.previewUrl,
      className: "bg-emerald-700 text-white hover:bg-emerald-800",
      icon: <FileText className="h-4 w-4" />,
    };
  }

  return {
    label: "إصدار تقرير",
    href: getReportUrl(caseItem),
    className: "bg-sky-700 text-white hover:bg-sky-800",
    icon: <FileText className="h-4 w-4" />,
  };
}

function getNextActionText(caseItem: CaseRow) {
  if (caseItem.status === "DRAFT") {
    return "استكمال المسودة";
  }

  if (caseItem.reportsCount > 0) {
    return "مراجعة التقارير";
  }

  if (caseItem.status === "SUBMITTED") {
    return "إصدار تقرير";
  }

  return "متابعة";
}

function statLabel(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

export function CasesSearchTable({
  cases,
  viewerName = "الموجه/الموجهة",
}: CasesSearchTableProps) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<CaseTab>("all");
  const [selectedService, setSelectedService] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedReportState, setSelectedReportState] = useState("all");

  const stats = useMemo(() => {
    return {
      total: cases.length,
      drafts: cases.filter((item) => item.status === "DRAFT").length,
      readyForReport: cases.filter(
        (item) => item.status === "SUBMITTED" && item.reportsCount === 0,
      ).length,
      withReports: cases.filter((item) => item.reportsCount > 0).length,
      withEvidence: cases.filter((item) => item.evidencesCount > 0).length,
    };
  }, [cases]);

  const services = useMemo(() => {
    const map = new Map<string, string>();

    for (const caseItem of cases) {
      map.set(caseItem.service.slug, caseItem.service.name);
    }

    return Array.from(map.entries()).map(([slug, name]) => ({
      slug,
      name,
    }));
  }, [cases]);

  const filteredCases = useMemo(() => {
    const keyword = normalizeText(query);

    return cases.filter((caseItem) => {
      if (activeTab === "drafts" && caseItem.status !== "DRAFT") return false;

      if (
        activeTab === "readyForReport" &&
        !(caseItem.status === "SUBMITTED" && caseItem.reportsCount === 0)
      ) {
        return false;
      }

      if (activeTab === "withReports" && caseItem.reportsCount === 0) {
        return false;
      }

      if (activeTab === "withEvidence" && caseItem.evidencesCount === 0) {
        return false;
      }

      if (
        selectedService !== "all" &&
        caseItem.service.slug !== selectedService
      ) {
        return false;
      }

      if (selectedStatus !== "all" && caseItem.status !== selectedStatus) {
        return false;
      }

      if (
        selectedReportState === "hasReport" &&
        caseItem.reportsCount === 0
      ) {
        return false;
      }

      if (
        selectedReportState === "missingReport" &&
        caseItem.reportsCount > 0
      ) {
        return false;
      }

      if (!keyword) return true;

      const searchableText = normalizeText(
        [
          caseItem.title,
          caseItem.statusLabel,
          caseItem.service.name,
          caseItem.workflow?.name,
          caseItem.student?.fullName,
          caseItem.student?.nationalId,
          caseItem.student?.meta,
          caseItem.student?.guardianName,
          caseItem.createdBy?.name,
          caseItem.createdAtLabel,
          caseItem.updatedAtLabel,
        ]
          .filter(Boolean)
          .join(" "),
      );

      return searchableText.includes(keyword);
    });
  }, [
    activeTab,
    cases,
    query,
    selectedReportState,
    selectedService,
    selectedStatus,
  ]);

  const tabItems: Array<{
    id: CaseTab;
    label: string;
    helper: string;
    count: number;
  }> = [
    {
      id: "all",
      label: "كل الحالات",
      helper: "كل ما يحتاج متابعة.",
      count: cases.length,
    },
    {
      id: "drafts",
      label: "المسودات",
      helper: "لم تكتمل بعد.",
      count: stats.drafts,
    },
    {
      id: "readyForReport",
      label: "جاهزة للتقرير",
      helper: "مرسلة بلا تقرير.",
      count: stats.readyForReport,
    },
    {
      id: "withReports",
      label: "لها تقارير",
      helper: "تم إصدار تقرير.",
      count: stats.withReports,
    },
    {
      id: "withEvidence",
      label: "لها شواهد",
      helper: "تحتوي مرفقات.",
      count: stats.withEvidence,
    },
  ];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                <ClipboardList className="h-4 w-4" />
                مركز متابعة الحالات
              </span>

              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                واجهة عمل الموجه
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
              أهلاً {viewerName}
            </h1>

            <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
              ركّز على ما يحتاج إجراء: استكمال مسودة، إصدار تقرير، أو مراجعة
              حالة مرتبطة بطالب أو شواهد.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <MiniStat label="كل الحالات" value={statLabel(stats.total)} />
            <MiniStat label="مسودات" value={statLabel(stats.drafts)} />
            <MiniStat label="جاهزة للتقرير" value={statLabel(stats.readyForReport)} />
            <MiniStat label="تقارير" value={statLabel(stats.withReports)} />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث باسم الطالب، الخدمة، ولي الأمر، أو عنوان الحالة..."
              className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />

            <select
              value={selectedService}
              onChange={(event) => setSelectedService(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-700 outline-none focus:border-sky-400"
            >
              <option value="all">كل الخدمات</option>
              {services.map((service) => (
                <option key={service.slug} value={service.slug}>
                  {service.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-700 outline-none focus:border-sky-400"
            >
              <option value="all">كل الحالات</option>
              <option value="DRAFT">مسودة</option>
              <option value="SUBMITTED">مرسلة</option>
              <option value="ARCHIVED">مؤرشفة</option>
            </select>

            <select
              value={selectedReportState}
              onChange={(event) => setSelectedReportState(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-700 outline-none focus:border-sky-400"
            >
              <option value="all">كل التقارير</option>
              <option value="hasReport">لها تقرير</option>
              <option value="missingReport">بدون تقرير</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {tabItems.map((tab) => {
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "min-w-[145px] rounded-2xl border px-4 py-3 text-right transition",
                  active
                    ? "border-sky-300 bg-sky-50 shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:bg-white",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <strong
                    className={[
                      "text-sm font-black",
                      active ? "text-sky-800" : "text-slate-800",
                    ].join(" ")}
                  >
                    {tab.label}
                  </strong>

                  <span
                    className={[
                      "rounded-full px-2 py-1 text-[11px] font-black",
                      active
                        ? "bg-white text-sky-700"
                        : "bg-white text-slate-500",
                    ].join(" ")}
                  >
                    {statLabel(tab.count)}
                  </span>
                </div>

                <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                  {tab.helper}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 2xl:grid-cols-2">
        {filteredCases.map((caseItem) => (
          <CaseFollowUpCard key={caseItem.id} caseItem={caseItem} />
        ))}

        {filteredCases.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm 2xl:col-span-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <Search className="h-7 w-7" />
            </div>

            <h2 className="mt-4 text-xl font-black text-slate-800">
              لا توجد حالات مطابقة
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-slate-500">
              جرّب تخفيف الفلاتر أو البحث باسم الطالب أو الخدمة. الحالات
              الجديدة ستظهر هنا بعد حفظها.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function CaseFollowUpCard({ caseItem }: { caseItem: CaseRow }) {
  const primaryAction = getCasePrimaryAction(caseItem);
  const statusClass =
    STATUS_STYLES[caseItem.status] ||
    "bg-slate-100 text-slate-700 ring-1 ring-slate-200";

  return (
    <article className="flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={["rounded-full px-3 py-1 text-xs font-black", statusClass].join(" ")}>
              {caseItem.statusLabel}
            </span>

            {caseItem.isMine ? (
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                من إنشائك
              </span>
            ) : null}

            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
              {caseItem.service.name}
            </span>

            {caseItem.latestReport ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                تقرير: {caseItem.latestReport.statusLabel}
              </span>
            ) : null}

            {caseItem.evidencesCount > 0 ? (
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100">
                {statLabel(caseItem.evidencesCount)} شواهد
              </span>
            ) : null}
          </div>

          <h2 className="mt-3 text-xl font-black leading-8 text-slate-950">
            {caseItem.title}
          </h2>

          <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
            الخدمة: {caseItem.service.name} · آخر تحديث: {caseItem.updatedAtLabel}
            {caseItem.workflow?.name ? ` · ${caseItem.workflow.name}` : ""}
          </p>
        </div>


      </div>

      {caseItem.student ? (
        <section className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-slate-100">
              <UserRound className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-black text-slate-400">
                الطالب/الطالبة
              </p>

              <p className="mt-1 text-sm font-black text-slate-900">
                {caseItem.student.fullName}
              </p>

              <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                {caseItem.student.meta}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-2 text-xs font-black text-slate-500">
        الإجراء التالي: {getNextActionText(caseItem)}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/cases/${caseItem.id}`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:border-sky-200 hover:bg-slate-50"
          >
            <Eye className="h-4 w-4" />
            عرض
          </Link>

          <Link
            href={`/dashboard/cases/${caseItem.id}/edit`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:border-sky-200 hover:bg-slate-50"
          >
            <PencilLine className="h-4 w-4" />
            متابعة
          </Link>
        </div>

        <Link
          href={primaryAction.href}
          className={[
            "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black transition",
            primaryAction.className,
          ].join(" ")}
        >
          {primaryAction.icon}
          {primaryAction.label}
        </Link>
      </div>
    </article>
  );
}

function SmallMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-black">{label}</span>
      </div>

      <strong className="text-sm font-black text-slate-950">{value}</strong>
    </div>
  );
}
