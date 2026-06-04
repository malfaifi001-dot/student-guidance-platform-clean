const fs = require("fs");

const path = "app\\dashboard\\admin\\workflows\\[serviceSlug]\\page.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes('WorkflowHistoryActions')) {
  content = content.replace(
    'import { WorkflowInlineImportWorkbench } from "@/components/admin/workflows/workflow-inline-import-workbench";',
    'import { WorkflowHistoryActions } from "@/components/admin/workflows/workflow-history-actions";\nimport { WorkflowInlineImportWorkbench } from "@/components/admin/workflows/workflow-inline-import-workbench";'
  );
}

content = content.replace(
  '<WorkflowUploadHistorySection workflows={workflows} />',
  '<WorkflowUploadHistorySection serviceSlug={serviceSlug} workflows={workflows} />'
);

content = content.replace(
  'function WorkflowUploadHistorySection({ workflows }: { workflows: any[] }) {',
  'function WorkflowUploadHistorySection({ serviceSlug, workflows }: { serviceSlug: string; workflows: any[] }) {'
);

if (!content.includes('previewHref={`/dashboard/admin/workflows/${serviceSlug}/preview?workflowId=${workflow.id}`}')) {
  content = content.replace(
`                  {workflow.isActive ? (
                    <div className="rounded-2xl bg-emerald-700 px-4 py-3 text-xs font-black text-white">
                      يظهر للموجه الآن
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">`,
`                  {workflow.isActive ? (
                    <div className="rounded-2xl bg-emerald-700 px-4 py-3 text-xs font-black text-white">
                      يظهر للموجه الآن
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex justify-end">
                  <WorkflowHistoryActions
                    serviceSlug={serviceSlug}
                    workflowId={workflow.id}
                    workflowName={workflow.name}
                    previewHref={\`/dashboard/admin/workflows/\${serviceSlug}/preview?workflowId=\${workflow.id}\`}
                    isActive={workflow.isActive}
                  />
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">`
  );
}

fs.writeFileSync(path, content, "utf8");

console.log("Workflow history cards now include preview, activate, and delete icon actions.");
