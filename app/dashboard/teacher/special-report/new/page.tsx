import { SpecialReportBuilder } from "@/components/special-report/special-report-builder";

import { requireDashboardUser } from "@/lib/auth/require-auth";

import { ensureSpecialReportService } from "@/lib/special-report/runtime-builder";

export default async function NewSpecialReportPage() {
  await requireDashboardUser();

  await ensureSpecialReportService();

  return (
    <main className="space-y-6">
      <SpecialReportBuilder />
    </main>
  );
}