import {
  CheckCircle2,
  Clock3,
  Layers3,
  ShieldCheck,
  UploadCloud,
  Workflow,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  ensureDashboardWorkflowServices,
  getWorkflowUploadServices,
} from "@/lib/admin/workflows/ensure-dashboard-workflow-services";
import { prisma } from "@/lib/prisma";
import { AdminWorkflowsFilterBar } from "@/components/admin/admin-workflows-filter-bar";
import { getWorkflowActivationSlot } from "@/lib/workflows/workflow-slot";

function countWorkflowFields(workflow: any) {
  return workflow.steps.reduce(
    (total: number, step: any) => total + step.fields.length,
    0,
  );
}

function countWorkflowOptions(workflow: any) {
  return workflow.steps.reduce(
    (total: number, step: any) =>
      total +
      step.fields.reduce(
        (fieldTotal: number, field: any) => fieldTotal + field.options.length,
        0,
      ),
    0,
  );
}

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

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

export default async function AdminWorkflowsPage() {
  await ensureDashboardWorkflowServices();

  const workflowUploadServices = getWorkflowUploadServices();
  const serviceSlugs = workflowUploadServices.map((service) => service.slug);

  const workflows = await prisma.workflow.findMany({
    where: {
      service: {
        slug: {
          in: serviceSlugs,
        },
      },
    },
    include: {
      service: true,
      steps: {
        include: {
          fields: {
            include: {
              options: true,
            },
          },
        },
      },
      _count: {
        select: {
          cases: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const activeWorkflows = workflows.filter(
    (workflow) =>
      workflow.isActive &&
      workflow.status === "ACTIVE" &&
      workflow.activeKey === getWorkflowActivationSlot(workflow),
  );
  const draftWorkflows = workflows.filter((workflow) => workflow.status === "DRAFT");
  const linkedCasesCount = workflows.reduce(
    (total, workflow) => total + (workflow._count?.cases || 0),
    0,
  );

  const totalFields = workflows.reduce(
    (total, workflow) => total + countWorkflowFields(workflow),
    0,
  );

  const totalOptions = workflows.reduce(
    (total, workflow) => total + countWorkflowOptions(workflow),
    0,
  );

  const latestWorkflow = workflows[0] || null;

  return (
    <main className="space-y-8" dir="rtl">
      <section className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-2xl">
        <div className="grid gap-8 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-sky-100">
              <ShieldCheck className="h-4 w-4" />
              مركز التحكم الرسمي في نماذج الخدمات
            </div>

            <h1 className="mt-6 text-4xl font-black leading-tight md:text-5xl">
              إدارة Workflows الخدمات
            </h1>

            <p className="mt-5 max-w-4xl text-sm font-bold leading-8 text-slate-300">
              هذه الصفحة هي نقطة التحكم الأساسية في نماذج الخدمات. من هنا يتم رفع
              ملفات Excel، مراجعة النموذج قبل اعتماده، حفظه كمسودة، ثم نشره
              للموجهين والموجهات بدون التأثير على الحالات السابقة.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#workflow-services"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-sky-50"
              >
                <UploadCloud className="h-4 w-4" />
                اختيار خدمة للرفع
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-xs font-black text-sky-100">حالة المركز الآن</p>

            <div className="mt-4 grid gap-3">
              <WorkflowHeroMetric
                label="الخدمات القابلة للرفع"
                value={workflowUploadServices.length}
              />
              <WorkflowHeroMetric
                label="Workflows منشورة"
                value={activeWorkflows.length}
              />
              <WorkflowHeroMetric
                label="مسودات تنتظر المراجعة"
                value={draftWorkflows.length}
              />
            </div>

            <div className="mt-4 rounded-2xl bg-slate-950/50 px-4 py-3">
              <p className="text-[11px] font-black text-slate-400">
                آخر نشاط Workflow
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {latestWorkflow
                  ? `${latestWorkflow.service.name} · ${formatDate(latestWorkflow.updatedAt)}`
                  : "لم يتم رفع أي Workflow بعد"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminWorkflowMetricCard
          icon={<Workflow className="h-5 w-5" />}
          label="النماذج المحفوظة"
          value={workflows.length}
          hint="تشمل المسودات والمنشور والمؤرشف."
        />

        <AdminWorkflowMetricCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="النماذج المنشورة"
          value={activeWorkflows.length}
          hint="هذه هي النسخ التي تظهر للموجهين."
        />

        <AdminWorkflowMetricCard
          icon={<Clock3 className="h-5 w-5" />}
          label="مسودات قيد المراجعة"
          value={draftWorkflows.length}
          hint="راجعها ثم انشرها عند اكتمالها."
        />

        <AdminWorkflowMetricCard
          icon={<Layers3 className="h-5 w-5" />}
          label="حقول وخيارات"
          value={`${formatNumber(totalFields)} / ${formatNumber(totalOptions)}`}
          hint="إجمالي الحقول والخيارات في النماذج."
        />
      </section>

      <section
        id="workflow-services"
        className="space-y-5 rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black text-emerald-700">
              الخدمات التي تستقبل Workflow
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-950">
              اختر الخدمة وابدأ الرفع
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-500">
              تم استبعاد الخدمات التي لا تعتمد على Workflow من Excel مثل السجل
              الشامل، التقارير، وتحليل النتائج.
            </p>
          </div>

          <span className="rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200">
            {workflowUploadServices.length} خدمة جاهزة
          </span>
        </div>

        <AdminWorkflowsFilterBar
          services={workflowUploadServices}
          workflows={workflows.map((wf) => ({
            ...wf,
            serviceSlug: wf.service.slug,
          }))}
        />
      </section>

      <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5">
        <div className="flex flex-wrap items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 text-amber-700" />

          <div>
            <h3 className="font-black text-amber-950">تنبيه تشغيلي مهم</h3>
            <p className="mt-2 text-sm font-bold leading-7 text-amber-800">
              حذف أو أرشفة Workflow مستخدم في حالات سابقة قد يؤثر على التحرير أو
              التقارير. استخدم النشر للنسخ الجديدة بدل تعديل النسخ القديمة
              المستخدمة.
            </p>

            {linkedCasesCount > 0 ? (
              <p className="mt-2 text-xs font-black text-amber-700">
                يوجد حاليًا {formatNumber(linkedCasesCount)} حالة مرتبطة بنماذج
                Workflow محفوظة.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function WorkflowHeroMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
      <span className="text-xs font-black text-slate-300">{label}</span>
      <strong className="text-2xl font-black text-white">
        {formatNumber(value)}
      </strong>
    </div>
  );
}

function AdminWorkflowMetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
        {icon}
      </div>

      <p className="mt-4 text-sm font-black text-slate-500">{label}</p>

      <strong className="mt-2 block text-3xl font-black text-slate-950">
        {typeof value === "number" ? formatNumber(value) : value}
      </strong>

      <p className="mt-2 text-xs font-bold leading-6 text-slate-400">{hint}</p>
    </article>
  );
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
