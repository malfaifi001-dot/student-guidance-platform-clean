"use client";

import Link from "next/link";
import { ArrowUpLeft, FileSpreadsheet, Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { AdminWorkflowServiceSummary } from "@/lib/admin/workflows/role-workflow-services";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "لم يتم الرفع بعد";
  return new Date(value).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusLabel(workflows: AdminWorkflowServiceSummary["workflows"]) {
  if (workflows.some((workflow) => workflow.isActive)) return "منشور لمساحة العمل";
  if (workflows.some((workflow) => workflow.status === "DRAFT")) return "مسودة جاهزة للمراجعة";
  if (workflows.some((workflow) => workflow.status === "ACTIVE")) return "منشور غير مفعّل";
  return "جاهز لاستقبال الرفع";
}

function WorkflowServiceCard({ service }: { service: AdminWorkflowServiceSummary }) {
  const latest = service.workflows[0] || null;
  const status = statusLabel(service.workflows);

  return (
    <Link
      href={`/dashboard/admin/workflows/${service.slug}`}
      className="group flex min-h-[205px] flex-col justify-between rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl"
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-sky-700 ring-1 ring-slate-100">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Workflow
            </p>
            <h2 className="mt-4 text-xl font-black leading-8 text-slate-950">
              {service.title}
            </h2>
          </div>
          <ArrowUpLeft className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-sky-600" />
        </div>
        {service.description ? (
          <p className="mt-3 line-clamp-2 text-sm font-bold leading-7 text-slate-500">
            {service.description}
          </p>
        ) : null}
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-black text-slate-400">الحالة</span>
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-700 ring-1 ring-slate-200">
            {status}
          </span>
        </div>
        <p className="mt-2 text-sm font-black text-slate-900">
          {latest?.name || "لا يوجد Workflow مرفوع"}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-400">
          آخر تحديث: {formatDate(latest?.updatedAt)}
        </p>
      </div>
    </Link>
  );
}

export function AdminWorkflowRoleIndex({
  title,
  description,
  services,
}: {
  title: string;
  description: string;
  services: AdminWorkflowServiceSummary[];
}) {
  const [query, setQuery] = useState("");
  const filteredServices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return services;
    return services.filter((service) =>
      [service.slug, service.title, service.description]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, services]);

  return (
    <main className="space-y-7" dir="rtl">
      <section className="rounded-[2.5rem] bg-slate-950 p-8 text-white shadow-2xl">
        <p className="text-xs font-black text-sky-200">إدارة Workflows</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-3xl font-black md:text-4xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-slate-300">
              {description}
            </p>
          </div>
          <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-black text-sky-100 ring-1 ring-white/10">
            {services.length} خدمة
          </span>
        </div>
      </section>

      <section className="space-y-5 rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-slate-950">خدمات الدور</h2>
          <label className="relative block">
            <span className="sr-only">البحث في الخدمات</span>
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث في الخدمات..."
              className="h-10 w-56 rounded-xl border border-slate-200 bg-white pr-9 pl-3 text-sm font-bold text-slate-800 outline-none focus:border-sky-400"
            />
          </label>
        </div>

        {filteredServices.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredServices.map((service) => (
              <WorkflowServiceCard key={service.slug} service={service} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
            لا توجد خدمات مطابقة.
          </div>
        )}
      </section>
    </main>
  );
}
