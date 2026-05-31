import type { ReactNode } from "react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardOnboardingReminder } from "@/components/auth/dashboard-onboarding-reminder";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const current = await requireDashboardUser();

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <DashboardSidebar />

        <main className="min-w-0 flex-1">
          <DashboardHeader />

          <DashboardOnboardingReminder
            onboardingCompleted={current.user.onboardingCompleted}
          />

          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
