"use client";

import Link from "next/link";
import {
  Eye,
  FileText,
  PencilLine,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ReportDeleteAction } from "@/components/reports/report-delete-action";

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
  reportTwoSnapshotId: string | null;
  reportTwoSnapshotStatus?: "DRAFT" | "APPROVED" | null;
  reportTwoSnapshotApprovedAt?: string | null;
  reportTwoSnapshotTitle?: string | null;
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
  viewerRole?: string;
  isAdmin?: boolean;
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  SUBMITTED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  ARCHIVED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

const CASES_FILTER_INPUT_CLASS =
  "h-11 w-full rounded-[1.35rem] border border-slate-200 bg-slate-50 pr-12 pl-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-50";

const CASES_FILTER_SELECT_CLASS =
  "h-11 min-w-[138px] rounded-[1.35rem] border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-500 outline-none transition hover:border-sky-200 hover:bg-slate-50 hover:text-slate-700 focus:border-sky-300 focus:ring-4 focus:ring-sky-50";

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
  return `/dashboard/report-2/cases/${encodeURIComponent(caseItem.id)}/prepare`;
}

function getDisplayStatus(caseItem: CaseRow) {
  if (caseItem.status === "DRAFT") {
    return {
      label: "مسودة",
      className: STATUS_STYLES.DRAFT,
    };
  }

  if (
    caseItem.status === "SUBMITTED" &&
    caseItem.reportsCount === 0 &&
    !caseItem.reportTwoSnapshotId
  ) {
    return {
      label: "جاهزة للتقرير",
      className: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
    };
  }

  if (caseItem.status === "SUBMITTED") {
    return {
      label: "مرسلة",
      className: STATUS_STYLES.SUBMITTED,
    };
  }

  return {
    label: caseItem.statusLabel || "غير محدد",
    className:
      STATUS_STYLES[caseItem.status] ||
      "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  };
}

function getNextActionText(caseItem: CaseRow) {
  if (caseItem.status === "DRAFT") {
    return "استكمال المتابعة";
  }

  if (caseItem.reportTwoSnapshotId) {
    return "معاينة التقرير";
  }

  if (caseItem.status === "SUBMITTED") {
    return "إصدار تقرير";
  }

  return "متابعة الحالة";
}

function getReportAction(caseItem: CaseRow) {
  if (caseItem.reportTwoSnapshotId) {
    return {
      label: "معاينة التقرير",
      href: `/dashboard/report-2/snapshots/${caseItem.reportTwoSnapshotId}/preview`,
      className: "bg-emerald-700 text-white hover:bg-emerald-800",
    };
  }

  if (caseItem.latestReport?.previewUrl) {
    return {
      label: "معاينة التقرير",
      href: caseItem.latestReport.previewUrl,
      className:
        caseItem.latestReport.status === "APPROVED"
          ? "bg-emerald-700 text-white hover:bg-emerald-800"
          : "bg-sky-600 text-white hover:bg-sky-700",
    };
  }

  if (caseItem.status === "SUBMITTED") {
    return {
      label: "إصدار تقرير",
      href: getReportUrl(caseItem),
      className: "bg-sky-700 text-white hover:bg-sky-800",
    };
  }

  return null;
}

export function CasesSearchTable({ cases }: CasesSearchTableProps) {
  const [query, setQuery] = useState("");
  const [selectedService, setSelectedService] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedReportState, setSelectedReportState] = useState("all");

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
      if (
        selectedService !== "all" &&
        caseItem.service.slug !== selectedService
      ) {
        return false;
      }

      if (selectedStatus === "DRAFT" && caseItem.status !== "DRAFT") {
        return false;
      }

      if (
        selectedStatus === "READY_FOR_REPORT" &&
        !(
          caseItem.status === "SUBMITTED" &&
          caseItem.reportsCount === 0 &&
          !caseItem.reportTwoSnapshotId
        )
      ) {
        return false;
      }

      if (
        selectedStatus === "SUBMITTED" &&
        !(
          caseItem.status === "SUBMITTED" &&
          (caseItem.reportsCount > 0 || Boolean(caseItem.reportTwoSnapshotId))
        )
      ) {
        return false;
      }

      if (selectedStatus === "ARCHIVED" && caseItem.status !== "ARCHIVED") {
        return false;
      }

      if (
        selectedReportState === "hasReport" &&
        !caseItem.reportTwoSnapshotId
      ) {
        return false;
      }

      if (
        selectedReportState === "missingReport" &&
        caseItem.reportTwoSnapshotId
      ) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const searchableText = normalizeText(
        [
          caseItem.title,
          caseItem.statusLabel,
          caseItem.service.name,
          caseItem.student?.fullName,
          caseItem.student?.nationalId,
          caseItem.student?.meta,
          caseItem.student?.guardianName,
          caseItem.createdBy?.name,
        ]
          .filter(Boolean)
          .join(" "),
      );

      return searchableText.includes(keyword);
    });
  }, [cases, query, selectedReportState, selectedService, selectedStatus]);

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-3 shadow-sm">
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث باسم الطالب أو الحالة أو الخدمة..."
              className={CASES_FILTER_INPUT_CLASS}
            />
          </div>

          <select
            value={selectedService}
            onChange={(event) => setSelectedService(event.target.value)}
            className={CASES_FILTER_SELECT_CLASS}
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
            className={CASES_FILTER_SELECT_CLASS}
          >
            <option value="all">كل الحالات</option>
            <option value="DRAFT">مسودة</option>
            <option value="SUBMITTED">مرسلة</option>
            <option value="READY_FOR_REPORT">جاهزة للتقرير</option>
            <option value="ARCHIVED">مؤرشفة</option>
          </select>

          <select
            value={selectedReportState}
            onChange={(event) => setSelectedReportState(event.target.value)}
            className={CASES_FILTER_SELECT_CLASS}
          >
            <option value="all">كل التقارير</option>
            <option value="hasReport">لها تقرير</option>
            <option value="missingReport">بدون تقرير</option>
          </select>
        </div>
      </section>

      <section className="grid gap-3 2xl:grid-cols-2">
        {filteredCases.map((caseItem) => (
          <CaseFollowUpCard key={caseItem.id} caseItem={caseItem} />
        ))}

        {filteredCases.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm 2xl:col-span-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <Search className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-black text-slate-800">
              لا توجد حالات مطابقة
            </h2>
            <p className="mt-2 text-sm font-bold text-slate-500">
              جرّب تعديل البحث أو الفلاتر الحالية.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function CaseFollowUpCard({ caseItem }: { caseItem: CaseRow }) {
  const displayStatus = getDisplayStatus(caseItem);
  const reportAction = getReportAction(caseItem);
  const reportStatus = caseItem.reportTwoSnapshotId
    ? caseItem.reportTwoSnapshotStatus ||
      (caseItem.reportTwoSnapshotApprovedAt ? "APPROVED" : "DRAFT")
    : caseItem.latestReport?.status || null;
  const persistedReportId =
    caseItem.reportTwoSnapshotId || caseItem.latestReport?.id || null;
  const deleteEndpoint = caseItem.reportTwoSnapshotId
    ? `/api/dashboard/report-2/snapshots/${encodeURIComponent(caseItem.reportTwoSnapshotId)}`
    : caseItem.latestReport
      ? `/api/dashboard/reports/${encodeURIComponent(caseItem.latestReport.id)}/delete`
      : null;
  const reportStatusLabel =
    reportStatus === "APPROVED"
      ? "معتمد"
      : reportStatus === "DRAFT"
        ? "مسودة"
        : null;

  const baseIconButtonClass =
    "grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700";

  const disabledIconButtonClass =
    "grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-slate-100 text-slate-300 shadow-sm";

  const reportIconButtonClass = reportAction
    ? [
        "grid h-10 w-10 place-items-center rounded-full text-white shadow-sm transition",
        reportStatus === "APPROVED"
          ? "bg-emerald-700 hover:bg-emerald-800"
          : reportStatus === "DRAFT"
            ? "bg-sky-600 hover:bg-sky-700"
            : "bg-sky-700 hover:bg-sky-800",
      ].join(" ")
    : disabledIconButtonClass;

  const cardClassName = [
    "flex h-full flex-col rounded-[1.75rem] border p-4 shadow-sm transition hover:shadow-md",
    reportStatus === "APPROVED"
      ? "border-emerald-200 bg-emerald-50/40 hover:border-emerald-300 hover:shadow-emerald-100/60"
      : persistedReportId
        ? "border-sky-200 bg-sky-50/40 hover:border-sky-300 hover:shadow-sky-100/60"
        : "border-slate-200 bg-white hover:border-sky-200",
  ].join(" ");

  return (
    <article className={cardClassName}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={[
              "rounded-full px-3 py-1 text-xs font-black",
              displayStatus.className,
            ].join(" ")}
          >
            {displayStatus.label}
          </span>

          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
            {caseItem.service.name}
          </span>

          {reportStatusLabel ? (
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-black ring-1",
                reportStatus === "APPROVED"
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                  : "bg-sky-50 text-sky-700 ring-sky-100",
              ].join(" ")}
            >
              {reportStatusLabel}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2" dir="ltr">
          <Link
            href={`/dashboard/cases/${caseItem.id}`}
            aria-label="عرض الحالة"
            title="عرض الحالة"
            className={baseIconButtonClass}
          >
            <Eye className="h-4 w-4" />
          </Link>

          <Link
            href={`/dashboard/cases/${caseItem.id}/edit`}
            aria-label="تعديل الحالة"
            title="تعديل الحالة"
            className={baseIconButtonClass}
          >
            <PencilLine className="h-4 w-4" />
          </Link>

          {reportAction ? (
            <Link
              href={reportAction.href}
              aria-label={reportAction.label}
              title={reportAction.label}
              className={reportIconButtonClass}
            >
              <FileText className="h-4 w-4" />
            </Link>
          ) : (
            <span
              aria-label="لا يوجد تقرير جاهز"
              title="لا يوجد تقرير جاهز"
              className={reportIconButtonClass}
            >
              <FileText className="h-4 w-4" />
            </span>
          )}

          {persistedReportId && deleteEndpoint ? (
            <ReportDeleteAction
              reportId={persistedReportId}
              reportTitle={caseItem.reportTwoSnapshotTitle || caseItem.title}
              caseTitle={caseItem.title}
              reportStatus={reportStatus || "DRAFT"}
              deleteEndpoint={deleteEndpoint}
              reportTwoDraftStorage={
                caseItem.reportTwoSnapshotId
                  ? { caseId: caseItem.id, serviceSlug: caseItem.service.slug }
                  : undefined
              }
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </ReportDeleteAction>
          ) : null}
        </div>
      </div>

      <h2 className="mt-3 text-lg font-black leading-8 text-slate-950">
        {caseItem.title}
      </h2>

      <div className="mt-3 rounded-2xl border border-slate-100 bg-white/70 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-slate-100">
            <UserRound className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-black text-slate-400">
              الطالب/الطالبة
            </p>
            <p className="mt-1 truncate text-sm font-black text-slate-900">
              {caseItem.student?.fullName || "غير مرتبط بطالب"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-2 text-xs font-black text-slate-600">
        الإجراء التالي: {getNextActionText(caseItem)}
      </div>
    </article>
  );
}
