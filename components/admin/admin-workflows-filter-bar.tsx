"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpLeft, FileSpreadsheet, Search, X } from "lucide-react";
import {
  BOARDS,
  classifyServiceSlug,
  filterServicesByBoard,
} from "@/lib/admin/workflows/workflow-board-helpers";
import type { AppService } from "@/lib/constants/services";

type WorkflowSummary = {
  isActive: boolean;
  status: string;
  name: string | null;
  updatedAt: Date | string | null;
  steps: { fields: { options: unknown[] }[] }[];
};

type ServiceWorkflowInfo = {
  workflows: WorkflowSummary[];
  activeWorkflow: WorkflowSummary | null;
  latestWorkflow: WorkflowSummary | null;
  draftCount: number;
  fieldsCount: number;
  optionsCount: number;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "لم يتم الرفع بعد";
  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(value);
  }
}

function getWorkflowStatusLabel(
  status: string | null | undefined,
  isActive: boolean,
) {
  if (isActive) return "منشور للموجهين";
  if (status === "DRAFT") return "مسودة جاهزة للمراجعة";
  if (status === "ACTIVE") return "منشور غير مفعل";
  if (status === "ARCHIVED") return "مؤرشف";
  return "غير مهيأ";
}

function countFields(wf: WorkflowSummary) {
  return wf.steps.reduce((t, s) => t + s.fields.length, 0);
}

function countOptions(wf: WorkflowSummary) {
  return wf.steps.reduce(
    (t, s) => t + s.fields.reduce((ft, f) => ft + f.options.length, 0),
    0,
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

function computeWorkflowInfo(
  workflows: WorkflowSummary[],
): ServiceWorkflowInfo {
  const activeWorkflow = workflows.find((w) => w.isActive) || null;
  const latestWorkflow = workflows[0] || null;
  const draftCount = workflows.filter((w) => w.status === "DRAFT").length;
  const lw = latestWorkflow;
  return {
    workflows,
    activeWorkflow,
    latestWorkflow: lw,
    draftCount,
    fieldsCount: lw ? countFields(lw) : 0,
    optionsCount: lw ? countOptions(lw) : 0,
  };
}

function SmallWorkflowStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center ring-1 ring-slate-100">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function ServiceCard({
  service,
  info,
}: {
  service: AppService;
  info: ServiceWorkflowInfo;
}) {
  const { activeWorkflow, latestWorkflow, draftCount, fieldsCount, optionsCount } = info;
  const totalVersions = info.workflows.length;

  return (
    <Link
      href={`/dashboard/admin/workflows/${service.slug}`}
      className={[
        "group flex min-h-[270px] flex-col justify-between rounded-[2rem] border p-6 transition hover:-translate-y-1 hover:shadow-xl",
        activeWorkflow
          ? "border-emerald-200 bg-emerald-50/40"
          : draftCount > 0
            ? "border-sky-200 bg-sky-50/40"
            : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-black text-sky-700 ring-1 ring-slate-100">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Workflow Service
            </p>
            <h3 className="mt-4 text-2xl font-black leading-8 text-slate-950">
              {service.title}
            </h3>
          </div>
          <ArrowUpLeft className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-sky-600" />
        </div>
        <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
          {service.description}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-400">الحالة</span>
            <span
              className={[
                "rounded-full px-3 py-1 text-[11px] font-black",
                activeWorkflow
                  ? "bg-emerald-50 text-emerald-700"
                  : draftCount > 0
                    ? "bg-sky-50 text-sky-700"
                    : "bg-slate-100 text-slate-500",
              ].join(" ")}
            >
              {activeWorkflow
                ? getWorkflowStatusLabel(
                    activeWorkflow.status,
                    activeWorkflow.isActive,
                  )
                : draftCount > 0
                  ? `${draftCount} مسودة`
                  : "جاهز لاستقبال الرفع"}
            </span>
          </div>
          <p className="mt-2 text-sm font-black text-slate-900">
            {activeWorkflow?.name ||
              latestWorkflow?.name ||
              "لا يوجد Workflow مرفوع"}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-400">
            آخر تحديث: {formatDate(latestWorkflow?.updatedAt)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <SmallWorkflowStat label="النسخ" value={totalVersions} />
          <SmallWorkflowStat label="الحقول" value={fieldsCount} />
          <SmallWorkflowStat label="الخيارات" value={optionsCount} />
        </div>
      </div>
    </Link>
  );
}

export function AdminWorkflowsFilterBar({
  services,
  workflows,
}: {
  services: AppService[];
  workflows: WorkflowSummary[];
}) {
  const [activeBoard, setActiveBoard] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const serviceMap = useMemo(() => {
    const map = new Map<string, WorkflowSummary[]>();
    for (const wf of workflows) {
      const slug = (wf as unknown as { serviceSlug?: string }).serviceSlug || "";
      const existing = map.get(slug) || [];
      existing.push(wf);
      map.set(slug, existing);
    }
    return map;
  }, [workflows]);

  const filteredServices = useMemo(() => {
    let result = filterServicesByBoard(services, activeBoard);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((s) => {
        const slugMatch = s.slug.toLowerCase().includes(q);
        const titleMatch = s.title.toLowerCase().includes(q);
        const descMatch = s.description?.toLowerCase().includes(q) ?? false;

        const serviceWorkflows = serviceMap.get(s.slug) || [];
        const workflowNameMatch = serviceWorkflows.some((wf) =>
          (wf.name ?? "").toLowerCase().includes(q),
        );

        return slugMatch || titleMatch || descMatch || workflowNameMatch;
      });
    }

    return result;
  }, [services, activeBoard, searchQuery, serviceMap]);

  const serviceOptions = useMemo(() => {
    const boardServices = filterServicesByBoard(services, activeBoard);
    return boardServices.map((s) => ({
      slug: s.slug,
      title: s.title,
    }));
  }, [services, activeBoard]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {BOARDS.map((board) => (
          <button
            key={board.id}
            type="button"
            onClick={() => {
              setActiveBoard(board.id);
              setSearchQuery("");
            }}
            className={[
              "rounded-xl px-4 py-2 text-sm font-bold transition",
              activeBoard === board.id
                ? "bg-slate-950 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            ].join(" ")}
          >
            {board.label}
          </button>
        ))}

        <div className="mr-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في الخدمات..."
              className="h-10 w-52 rounded-xl border border-slate-200 bg-white pr-9 pl-3 text-sm text-slate-800 placeholder-slate-400 transition focus:border-slate-400 focus:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {activeBoard !== "all" ? (
        <div className="flex flex-wrap gap-2">
          {serviceOptions.map((svc) => (
            <span
              key={svc.slug}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-600"
            >
              {svc.title}
            </span>
          ))}
        </div>
      ) : null}

      {filteredServices.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-10 text-center">
          <p className="text-sm font-bold text-slate-500">
            لا توجد خدمات مطابقة للفلاتر الحالية.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredServices.map((service) => {
            const serviceWorkflows = serviceMap.get(service.slug) || [];
            const info = computeWorkflowInfo(serviceWorkflows);
            return (
              <ServiceCard key={service.slug} service={service} info={info} />
            );
          })}
        </div>
      )}

      {filteredServices.length > 0 ? (
        <div className="text-center text-[13px] font-bold text-slate-400">
          إجمالي الخدمات الظاهرة: {filteredServices.length}
        </div>
      ) : null}
    </div>
  );
}
