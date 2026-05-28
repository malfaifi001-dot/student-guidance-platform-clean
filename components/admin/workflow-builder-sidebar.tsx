import Link from "next/link";

type WorkflowBuilderSidebarProps = {
  workflows: Array<{
    id: string;
    name: string;
    service: {
      name: string;
    };
  }>;
};

export function WorkflowBuilderSidebar({
  workflows,
}: WorkflowBuilderSidebarProps) {
  return (
    <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 card-shadow">
      <div className="mb-6">
        <p className="text-sm font-bold text-sky-700">
          Workflow Builder
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-900">
          جميع الـ Workflows
        </h2>
      </div>

      <div className="space-y-3">
        {workflows.map((workflow) => (
          <Link
            key={workflow.id}
            href={`/dashboard/admin/workflow-builder/${workflow.id}`}
            className="block rounded-2xl border border-slate-200 p-4 transition hover:border-sky-300 hover:bg-sky-50"
          >
            <p className="text-xs font-bold text-slate-400">
              {workflow.service.name}
            </p>

            <h3 className="mt-2 text-sm font-black text-slate-900">
              {workflow.name}
            </h3>
          </Link>
        ))}

        {workflows.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-semibold text-slate-400">
            لا توجد Workflows بعد.
          </div>
        ) : null}
      </div>
    </aside>
  );
}