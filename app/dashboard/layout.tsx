import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardOnboardingReminder } from "@/components/auth/dashboard-onboarding-reminder";
import { CalendarLoginPopup } from "@/components/calendar/calendar-login-popup";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { GuidanceProvider } from "@/components/guidance/guidance-provider";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { getSchoolSubscriptionOverview } from "@/lib/subscription/subscription-service";
import { getSubscriptionSidebarPresentation } from "@/lib/subscription/subscription-presentation";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const current = await requireDashboardUser();
  const subscriptionOverview =
    current.user.role !== "ADMIN" && current.user.schoolAccountId
      ? await getSchoolSubscriptionOverview(current.user.schoolAccountId)
      : null;
  const subscriptionPresentation =
    current.user.role === "ADMIN"
      ? undefined
      : getSubscriptionSidebarPresentation(
          subscriptionOverview?.usable && subscriptionOverview.subscription
            ? {
                planName: subscriptionOverview.subscription.plan.name,
                planSlug: subscriptionOverview.subscription.plan.slug,
                durationDays: Number(
                  subscriptionOverview.subscription.plan.features.find(
                    (feature) => feature.key === "durationDays",
                  )?.value || 0,
                ),
                status: subscriptionOverview.subscription.status,
                startsAt: subscriptionOverview.subscription.startsAt,
                endsAt: subscriptionOverview.subscription.endsAt,
              }
            : null,
        );

  return (
    <ThemeProvider>
      <GuidanceProvider userId={current.user.id} role={current.user.role} gender={current.user.gender} displayName={current.user.officialName || current.user.name}>
      <div
        dir="rtl"
        className="h-screen overflow-x-hidden overflow-y-hidden bg-[#f5f8fc] text-slate-900 transition-colors dark:bg-[#050816] dark:text-slate-100"
      >
        <div className="flex h-screen min-w-0">
          <DashboardSidebar
            user={current.user}
            subscription={subscriptionPresentation}
          />

          <main className="h-screen w-full min-w-0 flex-1 overflow-y-auto text-[15.5px] leading-relaxed">
            <DashboardHeader
              user={current.user}
              subscription={subscriptionPresentation}
            />

            {current.user.role !== "PRINCIPAL" ? (
              <>
                <DashboardOnboardingReminder
                  onboardingCompleted={current.user.onboardingCompleted}
                  onboardingSkippedAt={current.user.onboardingSkippedAt}
                />
                <CalendarLoginPopup />
              </>
            ) : null}

            <div className="mx-auto w-full min-w-0 max-w-[1680px] px-2.5 py-3 sm:px-3 sm:py-4 md:px-4 md:py-4 xl:px-5">
              {children}
            </div>
          </main>
        </div>
      </div>
      </GuidanceProvider>
    </ThemeProvider>
  );
}
