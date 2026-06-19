import { redirect } from "next/navigation";

import { MobileAppShell } from "@/components/mobile/mobile-app-shell";
import { MobileDynamicFormRenderer } from "@/components/mobile/mobile-dynamic-form-renderer";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";

type MobileNewCaseWorkflowPageProps = {
  serviceSlug: string;
  title: string;
  requiresStudent?: boolean;
};

export async function MobileNewCaseWorkflowPage({
  serviceSlug,
  title,
  requiresStudent,
}: MobileNewCaseWorkflowPageProps) {
  const context = await requireDashboardPageContext();

  if (!context.isAdmin && !context.schoolAccountId) {
    redirect("/dashboard/onboarding?required=true");
  }

  const runtime = await getRuntimeWorkflowByServiceSlug(serviceSlug);

  if (!runtime) {
    return (
      <MobileAppShell activeSection="cases">
        <section className="rounded-[1.6rem] bg-amber-50 p-5 text-amber-900 shadow-sm ring-1 ring-amber-100">
          <p className="text-xs font-black text-amber-700">Workflow</p>
          <h1 className="mt-2 text-xl font-black">لا يوجد Workflow منشور</h1>
          <p className="mt-2 text-sm leading-7 text-amber-800">
            اعتمد Workflow لهذه الخدمة من لوحة الأدمن أولًا.
          </p>
        </section>
      </MobileAppShell>
    );
  }

  return (
    <MobileAppShell activeSection="cases">
      <MobileDynamicFormRenderer
        workflow={runtime.workflow}
        serviceId={runtime.service.id}
        requiresStudent={requiresStudent}
        title={title}
        caseDetailsBasePath="/mobile/counselor/cases"
      />
    </MobileAppShell>
  );
}