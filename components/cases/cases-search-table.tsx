"use client";

import {
  Filter,
  Search,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CaseCardActions } from "@/components/cases/case-card-actions";
import { MobileFilterPopCard } from "@/components/ui/mobile-filter-pop-card";
import type { CaseCapabilities } from "@/lib/cases/case-permissions";

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
  specialReportLink?: {
    targetId: string;
    targetType: string;
    title: string;
  } | null;
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
  capabilities: CaseCapabilities;
  reportTwoReport?: {
    id: string;
    status: "DRAFT" | "APPROVED";
    title: string;
    previewUrl: string;
    canDeleteReport: boolean;
  } | null;
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
  DRAFT: "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900",
  SUBMITTED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900",
  ARCHIVED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
};

const CASES_FILTER_INPUT_CLASS =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-800 dark:focus:ring-sky-950";

const CASES_FILTER_SELECT_CLASS =
  "h-11 min-w-[138px] rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-500 outline-none transition hover:border-sky-200 hover:bg-slate-50 hover:text-slate-700 focus:border-sky-300 focus:ring-4 focus:ring-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-sky-950";

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
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
    !caseItem.reportTwoReport?.id
  ) {
    return {
      label: "جاهزة للتقرير",
      className: "bg-sky-50 text-sky-700 ring-1 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900",
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
      "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  };
}

function getNextActionText(caseItem: CaseRow) {
  if (caseItem.status === "DRAFT") {
    return "استكمال المتابعة";
  }

  if (caseItem.reportTwoReport?.id) {
    return "معاينة التقرير";
  }

  if (caseItem.status === "SUBMITTED") {
    return "إصدار تقرير";
  }

  return "متابعة الحالة";
}

export function CasesSearchTable({ cases }: CasesSearchTableProps) {
  const [visibleCases, setVisibleCases] = useState(cases);
  const [query, setQuery] = useState("");
  const [selectedService, setSelectedService] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedReportState, setSelectedReportState] = useState("all");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const services = useMemo(() => {
    const map = new Map<string, string>();

    for (const caseItem of visibleCases) {
      map.set(caseItem.service.slug, caseItem.service.name);
    }

    return Array.from(map.entries()).map(([slug, name]) => ({
      slug,
      name,
    }));
  }, [visibleCases]);

  useEffect(() => {
    setVisibleCases(cases);
  }, [cases]);

  const filteredCases = useMemo(() => {
    const keyword = normalizeText(query);

    return visibleCases.filter((caseItem) => {
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
          !caseItem.reportTwoReport?.id
        )
      ) {
        return false;
      }

      if (
        selectedStatus === "SUBMITTED" &&
        !(
          caseItem.status === "SUBMITTED" &&
          (caseItem.reportsCount > 0 || Boolean(caseItem.reportTwoReport?.id))
        )
      ) {
        return false;
      }

      if (selectedStatus === "ARCHIVED" && caseItem.status !== "ARCHIVED") {
        return false;
      }

      if (
        selectedReportState === "hasReport" &&
        !caseItem.reportTwoReport?.id
      ) {
        return false;
      }

      if (
        selectedReportState === "missingReport" &&
        caseItem.reportTwoReport?.id
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
  }, [visibleCases, query, selectedReportState, selectedService, selectedStatus]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <div className="flex min-w-0 items-center gap-2 xl:contents">
            <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث باسم الطالب أو الحالة أو الخدمة..."
              className={CASES_FILTER_INPUT_CLASS}
            />
            </div>
            <button
              type="button"
              aria-label="فتح الفلاتر"
              aria-expanded={mobileFiltersOpen}
              onClick={() => setMobileFiltersOpen(true)}
              className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-[1.35rem] border text-slate-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 md:hidden ${
                selectedService !== "all" || selectedStatus !== "all" || selectedReportState !== "all"
                  ? "border-sky-300 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Filter className="h-4 w-4" />
              {selectedService !== "all" || selectedStatus !== "all" || selectedReportState !== "all" ? (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-sky-600" />
              ) : null}
            </button>
          </div>

          <select
            value={selectedService}
            onChange={(event) => setSelectedService(event.target.value)}
            className={`${CASES_FILTER_SELECT_CLASS} hidden md:block`}
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
            className={`${CASES_FILTER_SELECT_CLASS} hidden md:block`}
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
            className={`${CASES_FILTER_SELECT_CLASS} hidden md:block`}
          >
            <option value="all">كل التقارير</option>
            <option value="hasReport">لها تقرير</option>
            <option value="missingReport">بدون تقرير</option>
          </select>
        </div>
        <MobileFilterPopCard
          open={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
        >
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
        </MobileFilterPopCard>
      </section>

      <section className="grid gap-3 2xl:grid-cols-2">
        {filteredCases.map((caseItem) => (
          <CaseFollowUpCard
            key={caseItem.id}
            caseItem={caseItem}
            onCaseDeleted={(caseId) =>
              setVisibleCases((current) => current.filter((item) => item.id !== caseId))
            }
          />
        ))}

        {filteredCases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900 2xl:col-span-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 dark:bg-slate-800">
              <Search className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-base font-black text-slate-800 dark:text-white">
              لا توجد حالات مطابقة
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
              جرّب تعديل البحث أو الفلاتر الحالية.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function CaseFollowUpCard({
  caseItem,
  onCaseDeleted,
}: {
  caseItem: CaseRow;
  onCaseDeleted: (caseId: string) => void;
}) {
  const displayStatus = getDisplayStatus(caseItem);
  const reportStatus =
    caseItem.reportTwoReport?.status || caseItem.latestReport?.status || null;
  const persistedReportId =
    caseItem.reportTwoReport?.id || caseItem.latestReport?.id || null;
  const reportStatusLabel =
    reportStatus === "APPROVED"
      ? "معتمد"
      : reportStatus === "DRAFT"
        ? "مسودة تقرير"
        : null;

  const cardClassName = [
    "flex h-full min-w-0 max-w-full flex-col rounded-xl border p-3 shadow-sm transition hover:shadow-md sm:p-4",
    reportStatus === "APPROVED"
      ? "border-emerald-200 bg-emerald-50/40 hover:border-emerald-300 hover:shadow-emerald-100/60"
      : persistedReportId
        ? "border-sky-200 bg-sky-50/40 hover:border-sky-300 hover:shadow-sky-100/60"
        : "border-slate-200 bg-white hover:border-sky-200 dark:border-slate-700 dark:bg-slate-900",
  ].join(" ");

  return (
    <article className={cardClassName}>
      <div className="flex min-w-0 max-w-full items-start justify-between gap-3">
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
          <span
            className={[
              "rounded-full px-3 py-1 text-xs font-black",
              displayStatus.className,
            ].join(" ")}
          >
            {displayStatus.label}
          </span>

          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
            {caseItem.service.name}
          </span>

          {caseItem.specialReportLink ? (
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900">
              مخصص · {caseItem.specialReportLink.title}
            </span>
          ) : null}

          {reportStatusLabel ? (
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-black ring-1",
                reportStatus === "APPROVED"
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900"
                  : "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900",
              ].join(" ")}
            >
              {reportStatusLabel}
            </span>
          ) : null}
        </div>

        <CaseCardActions
          caseEntry={caseItem}
          onCaseDeleted={onCaseDeleted}
        />
      </div>

      <h2 className="mt-3 text-base font-black leading-7 text-slate-950 dark:text-white">
        {caseItem.title}
      </h2>

      {caseItem.student ? (
      <div className="mt-3 rounded-xl border border-slate-100 bg-white/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/70">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-700">
            <UserRound className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-black text-slate-400 dark:text-slate-500">
              الطالب/الطالبة
            </p>
            <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-slate-100">
              {caseItem.student.fullName}
            </p>
          </div>
        </div>
      </div>
      ) : null}

      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        الإجراء التالي: {getNextActionText(caseItem)}
      </div>
    </article>
  );
}
