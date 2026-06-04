const fs = require("fs");

const path = "app\\dashboard\\admin\\workflows\\[serviceSlug]\\page.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("function formatWorkflowDate")) {
  content = content.replace(
`type PageProps = {
  params: Promise<{
    serviceSlug: string;
  }>;
};`,
`type PageProps = {
  params: Promise<{
    serviceSlug: string;
  }>;
};

function formatWorkflowDate(value: Date | string | null | undefined) {
  if (!value) return "غير محدد";

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

function getWorkflowStatusLabel(status: string, isActive: boolean) {
  if (isActive) return "مفعل حاليًا";
  if (status === "DRAFT") return "مسودة";
  if (status === "ACTIVE") return "منشور غير مفعل";
  if (status === "ARCHIVED") return "مؤرشف";

  return status || "غير محدد";
}

function getWorkflowStatusClass(status: string, isActive: boolean) {
  if (isActive) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }

  if (status === "DRAFT") {
    return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
  }

  if (status === "ARCHIVED") {
    return "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
  }

  return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
}

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
        (fieldTotal: number, field: any) =>
          fieldTotal + field.options.length,
        0,
      ),
    0,
  );
}`
  );
}

if (!content.includes("WorkflowUploadHistorySection")) {
  content = content.replace(
`      <WorkflowPublishPanel
        serviceSlug={serviceSlug}
        previewHref={\`/dashboard/admin/workflows/\${serviceSlug}/preview\`}
        hasDraft={Boolean(latestDraftWorkflow)}
        draftWorkflowId={latestDraftWorkflow?.id}
        draftWorkflowName={latestDraftWorkflow?.name}
        draftVersion={latestDraftWorkflow?.version}
        activeWorkflowName={activeWorkflow?.name}
      />

      {healthReport ? <WorkflowHealthReport report={healthReport} /> : null}`,
`      <WorkflowPublishPanel
        serviceSlug={serviceSlug}
        previewHref={\`/dashboard/admin/workflows/\${serviceSlug}/preview\`}
        hasDraft={Boolean(latestDraftWorkflow)}
        draftWorkflowId={latestDraftWorkflow?.id}
        draftWorkflowName={latestDraftWorkflow?.name}
        draftVersion={latestDraftWorkflow?.version}
        activeWorkflowName={activeWorkflow?.name}
      />

      <WorkflowUploadHistorySection workflows={workflows} />

      {healthReport ? <WorkflowHealthReport report={healthReport} /> : null}`
  );

  content += `

function WorkflowUploadHistorySection({ workflows }: { workflows: any[] }) {
  const sortedWorkflows = [...workflows].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;

    return b.version - a.version;
  });

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-sky-700">
            سجل المرفوعات السابقة
          </p>

          <h2 className="mt-1 text-2xl font-black text-slate-950">
            كل Workflows المحفوظة لهذه الخدمة
          </h2>

          <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
            هنا تظهر كل النسخ التي تم حفظها كمسودات أو نشرها سابقًا، مع توضيح
            النسخة المفعلّة حاليًا للموجهين.
          </p>
        </div>

        <span className="rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200">
          {sortedWorkflows.length} نسخة محفوظة
        </span>
      </div>

      {sortedWorkflows.length ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {sortedWorkflows.map((workflow) => {
            const statusClass = getWorkflowStatusClass(
              workflow.status,
              workflow.isActive,
            );

            return (
              <article
                key={workflow.id}
                className={[
                  "rounded-3xl border p-5 transition",
                  workflow.isActive
                    ? "border-emerald-200 bg-emerald-50/40 shadow-sm"
                    : "border-slate-200 bg-white hover:border-sky-200 hover:shadow-sm",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={["rounded-full px-3 py-1 text-xs font-black", statusClass].join(" ")}>
                        {getWorkflowStatusLabel(workflow.status, workflow.isActive)}
                      </span>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                        Version {workflow.version}
                      </span>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                        {getWorkflowPlacementLabel(workflow.workflowType)}
                      </span>
                    </div>

                    <h3 className="mt-3 text-xl font-black leading-8 text-slate-950">
                      {workflow.name}
                    </h3>

                    <p className="mt-1 text-xs font-bold text-slate-500">
                      آخر تحديث: {formatWorkflowDate(workflow.updatedAt)}
                    </p>
                  </div>

                  {workflow.isActive ? (
                    <div className="rounded-2xl bg-emerald-700 px-4 py-3 text-xs font-black text-white">
                      يظهر للموجه الآن
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <WorkflowHistoryMetric
                    label="الخطوات"
                    value={workflow.steps.length}
                  />

                  <WorkflowHistoryMetric
                    label="الحقول"
                    value={countWorkflowFields(workflow)}
                  />

                  <WorkflowHistoryMetric
                    label="الخيارات"
                    value={countWorkflowOptions(workflow)}
                  />
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold leading-6 text-slate-500">
                  {workflow.status === "DRAFT"
                    ? "هذه نسخة مسودة. يمكن مراجعتها ونشرها لاحقًا بدون التأثير على النسخة المفعلة."
                    : workflow.isActive
                      ? "هذه هي النسخة المعتمدة التي يستخدمها الموجهون حاليًا."
                      : "هذه نسخة محفوظة قديمة وليست هي التي تظهر للموجه الآن."}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <h3 className="text-xl font-black text-slate-800">
            لا توجد مرفوعات محفوظة بعد
          </h3>

          <p className="mt-2 text-sm font-bold text-slate-500">
            ارفع ملف Excel واحفظه كمسودة حتى يظهر هنا.
          </p>
        </div>
      )}
    </section>
  );
}

function WorkflowHistoryMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
`;
}

fs.writeFileSync(path, content, "utf8");

console.log("Workflow upload history section added.");
