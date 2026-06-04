const fs = require("fs");

const pagePath = "app\\dashboard\\admin\\workflows\\[serviceSlug]\\page.tsx";
let page = fs.readFileSync(pagePath, "utf8");

// 1) Include case usage count for every workflow.
if (!page.includes("_count: {") || !page.includes("cases: true")) {
  page = page.replace(
`          },
        },
        orderBy: {`,
`          },
          _count: {
            select: {
              cases: true,
            },
          },
        },
        orderBy: {`
  );
}

// 2) Add helper for Arabic case count.
if (!page.includes("function formatCasesUsageCount")) {
  page = page.replace(
`function countWorkflowOptions(workflow: any) {
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
}`,
`function countWorkflowOptions(workflow: any) {
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
}

function formatCasesUsageCount(count: number) {
  return new Intl.NumberFormat("ar-SA").format(count);
}`
  );
}

// 3) Pass casesCount to WorkflowHistoryActions.
page = page.replace(
`                    isActive={workflow.isActive}
                  />`,
`                    isActive={workflow.isActive}
                    casesCount={workflow._count?.cases || 0}
                  />`
);

// 4) Add visible lock message inside every used workflow card.
if (!page.includes("مستخدم في {formatCasesUsageCount(workflow._count?.cases || 0)} حالات")) {
  page = page.replace(
`                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold leading-6 text-slate-500">
                  {workflow.status === "DRAFT"
                    ? "هذه نسخة مسودة. يمكن مراجعتها ونشرها لاحقًا بدون التأثير على النسخة المفعلة."
                    : workflow.isActive
                      ? "هذه هي النسخة المعتمدة التي يستخدمها الموجهون حاليًا."
                      : "هذه نسخة محفوظة قديمة وليست هي التي تظهر للموجه الآن."}
                </div>`,
`                {(workflow._count?.cases || 0) > 0 ? (
                  <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-black leading-6 text-amber-800 ring-1 ring-amber-100">
                    مستخدم في {formatCasesUsageCount(workflow._count?.cases || 0)} حالات — لا يمكن حذفه أو تعديله حفاظًا على الحالات السابقة.
                  </div>
                ) : null}

                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold leading-6 text-slate-500">
                  {workflow.status === "DRAFT"
                    ? "هذه نسخة مسودة. يمكن مراجعتها ونشرها لاحقًا بدون التأثير على النسخة المفعلة."
                    : workflow.isActive
                      ? "هذه هي النسخة المعتمدة التي يستخدمها الموجهون حاليًا."
                      : "هذه نسخة محفوظة قديمة وليست هي التي تظهر للموجه الآن."}
                </div>`
  );
}

fs.writeFileSync(pagePath, page, "utf8");

// 5) Update card actions to disable delete when cases exist.
const actionsPath = "components\\admin\\workflows\\workflow-history-actions.tsx";
let actions = fs.readFileSync(actionsPath, "utf8");

actions = actions.replace(
`  isActive: boolean;
};`,
`  isActive: boolean;
  casesCount?: number;
};`
);

actions = actions.replace(
`  isActive,
}: WorkflowHistoryActionsProps) {`,
`  isActive,
  casesCount = 0,
}: WorkflowHistoryActionsProps) {`
);

if (!actions.includes("const isUsedByCases = casesCount > 0;")) {
  actions = actions.replace(
`  const [error, setError] = useState<string | null>(null);`,
`  const [error, setError] = useState<string | null>(null);
  const isUsedByCases = casesCount > 0;
  const deleteDisabled = isActive || isUsedByCases || deleting;`
  );
}

actions = actions.replace(
`    if (isActive || deleting) return;`,
`    if (deleteDisabled) return;`
);

actions = actions.replace(
`          title={isActive ? "لا يمكن حذف النسخة المفعلة" : "حذف"}
          aria-label={isActive ? "لا يمكن حذف النسخة المفعلة" : "حذف Workflow"}
          onClick={deleteWorkflow}
          disabled={isActive || deleting}`,
`          title={
            isActive
              ? "لا يمكن حذف النسخة المفعلة"
              : isUsedByCases
                ? "لا يمكن حذف Workflow مستخدم في حالات"
                : "حذف"
          }
          aria-label={
            isActive
              ? "لا يمكن حذف النسخة المفعلة"
              : isUsedByCases
                ? "لا يمكن حذف Workflow مستخدم في حالات"
                : "حذف Workflow"
          }
          onClick={deleteWorkflow}
          disabled={deleteDisabled}`
);

actions = actions.replace(
`            isActive
              ? "border-slate-100 bg-slate-50 text-slate-300"
              : "border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700",`,
`            deleteDisabled
              ? "border-slate-100 bg-slate-50 text-slate-300"
              : "border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700",`
);

fs.writeFileSync(actionsPath, actions, "utf8");

// 6) Prevent renaming a draft if it is already used by cases.
const draftNamePath = "app\\api\\dashboard\\admin\\workflows\\[serviceSlug]\\draft-name\\route.ts";
let draftName = fs.readFileSync(draftNamePath, "utf8");

if (!draftName.includes("_count:")) {
  draftName = draftName.replace(
`      select: {
        id: true,
      },`,
`      select: {
        id: true,
        _count: {
          select: {
            cases: true,
          },
        },
      },`
  );
}

if (!draftName.includes("لا يمكن تعديل اسم Workflow مستخدم في حالات")) {
  draftName = draftName.replace(
`    if (!workflow) {
      return NextResponse.json(
        { error: "لم يتم العثور على مسودة قابلة للتعديل." },
        { status: 404 },
      );
    }

    const updatedWorkflow = await prisma.workflow.update({`,
`    if (!workflow) {
      return NextResponse.json(
        { error: "لم يتم العثور على مسودة قابلة للتعديل." },
        { status: 404 },
      );
    }

    if (workflow._count.cases > 0) {
      return NextResponse.json(
        {
          error:
            "لا يمكن تعديل اسم Workflow مستخدم في حالات محفوظة حفاظًا على السجلات السابقة.",
        },
        { status: 400 },
      );
    }

    const updatedWorkflow = await prisma.workflow.update({`
  );
}

fs.writeFileSync(draftNamePath, draftName, "utf8");

console.log("Workflow cards now show case usage lock and prevent delete/edit when used.");
