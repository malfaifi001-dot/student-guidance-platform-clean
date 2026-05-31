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
    <div dir="rtl" className="min-h-screen bg-[#f5f8fc] text-slate-900">
      <div className="flex min-h-screen">
        <DashboardSidebar />

        <main className="min-w-0 flex-1">
          <DashboardHeader user={current.user} />

          <DashboardOnboardingReminder
            onboardingCompleted={current.user.onboardingCompleted}
          />

          <div className="mx-auto w-full max-w-[1500px] px-4 py-5 md:px-5 xl:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
