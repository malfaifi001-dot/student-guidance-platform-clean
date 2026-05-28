import { WorkflowBuilderSidebar } from "@/components/admin/workflow-builder-sidebar";
import { getWorkflowBuilderData } from "@/engine/workflow-builder/workflow-builder-engine";

export default async function WorkflowBuilderPage() {
  const workflows = await getWorkflowBuilderData();

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <WorkflowBuilderSidebar workflows={workflows} />

      <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center card-shadow">
        <p className="text-sm font-bold text-sky-700">
          Workflow Admin Builder
        </p>

        <h1 className="mt-4 text-4xl font-black text-slate-900">
          اختر Workflow من القائمة
        </h1>

        <p className="mt-4 text-sm leading-8 text-slate-500">
          سيتم هنا بناء وإدارة الخدمات الديناميكية بالكامل بدون كتابة كود.
        </p>
      </section>
    </div>
  );
}