import type { ReactNode } from "react";
import type { Viewport } from "next";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardOnboardingReminder } from "@/components/auth/dashboard-onboarding-reminder";
import { CalendarLoginPopup } from "@/components/calendar/calendar-login-popup";
import { DashboardNavigationRefresh } from "@/components/layout/dashboard-navigation-refresh";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export const viewport: Viewport = {
  width: 1280,
  initialScale: 1,
};

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const current = await requireDashboardUser();

  return (
    <div
      dir="rtl"
      className="h-screen overflow-x-auto overflow-y-hidden bg-[#f5f8fc] text-slate-900 transition-colors dark:bg-[#050816] dark:text-slate-100"
    >
      <div className="flex h-screen min-w-[1180px]">
        <DashboardSidebar user={current.user} />

        <main className="h-screen min-w-0 flex-1 overflow-y-auto text-[15.5px] leading-relaxed">
          <DashboardHeader user={current.user} />

          {current.user.role !== "PRINCIPAL" ? (
            <>
              <DashboardOnboardingReminder
                onboardingCompleted={current.user.onboardingCompleted}
                onboardingSkippedAt={current.user.onboardingSkippedAt}
              />
              <CalendarLoginPopup />
            </>
          ) : null}

          <div className="mx-auto w-full max-w-[1680px] px-3 py-4 md:px-4 xl:px-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
