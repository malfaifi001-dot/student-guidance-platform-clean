import type { ReactNode } from "react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardOnboardingReminder } from "@/components/auth/dashboard-onboarding-reminder";
import { CalendarLoginPopup } from "@/components/calendar/calendar-login-popup";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const current = await requireDashboardUser();

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f8fc] text-slate-900 transition-colors dark:bg-[#050816] dark:text-slate-100">
      <div className="flex min-h-screen">
        <DashboardSidebar user={current.user} />

        <main className="min-w-0 flex-1 text-[15.5px] leading-relaxed">
          <DashboardHeader user={current.user} />

          <DashboardOnboardingReminder
            onboardingCompleted={current.user.onboardingCompleted}
          />

          <CalendarLoginPopup />

          <div className="mx-auto w-full max-w-[1680px] px-3 py-4 md:px-4 xl:px-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

