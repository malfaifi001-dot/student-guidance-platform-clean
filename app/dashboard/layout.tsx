import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardOnboardingReminder } from "@/components/auth/dashboard-onboarding-reminder";
import { CalendarLoginPopup } from "@/components/calendar/calendar-login-popup";
import { GuidanceProvider } from "@/components/guidance/guidance-provider";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { getUserSubscriptionOverview } from "@/lib/subscription/subscription-service";
import { getSubscriptionSidebarPresentation } from "@/lib/subscription/subscription-presentation";
import { AuthenticatedAnalyticsIdentity } from "@/components/analytics/authenticated-analytics-identity";
import { getAnalyticsUserId } from "@/lib/analytics/analytics-user-id";
import { DashboardMobileBottomNav } from "@/components/layout/dashboard-mobile-bottom-nav";
import { MOBILE_BOTTOM_CLEARANCE_CLASS, MOBILE_LAYER_STYLE } from "@/components/mobile-app/mobile-layer-contract";
import { FloatingWhatsAppSupport } from "@/components/support/floating-whatsapp-support";
import { resolveSalesExperienceForUser } from "@/lib/sales/sales-experience";
import { TeachixAppDownloadPrompt } from "@/components/apps/teachix-app-download-prompt";
import { PortfolioPreviewLoadingBoundary } from "@/components/portfolio/portfolio-preview-loading-boundary";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const current = await requireDashboardUser();
  const salesExperience = await resolveSalesExperienceForUser(current.user.id);
  const subscriptionOverview =
    current.user.role !== "ADMIN" && current.user.schoolAccountId
      ? await getUserSubscriptionOverview(current.user.id)
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
  const analyticsUserId = getAnalyticsUserId(current.user.id);

  return (
    <>
      <AuthenticatedAnalyticsIdentity
        analyticsUserId={analyticsUserId}
        role={current.user.role}
      />
      <GuidanceProvider userId={current.user.id} role={current.user.role} gender={current.user.gender} displayName={current.user.officialName || current.user.name}>
      <div
        dir="rtl"
        className="h-[100dvh] overflow-x-hidden overflow-y-hidden bg-[#f5f8fc] text-slate-900 transition-colors dark:bg-[#050816] dark:text-slate-100"
        style={MOBILE_LAYER_STYLE}
      >
        <div className="flex h-[100dvh] min-w-0">
          <DashboardSidebar
            user={current.user}
            subscription={subscriptionPresentation}
            salesMode={salesExperience.effectiveMode}
          />

          <main className="h-[100dvh] w-full min-w-0 flex-1 overflow-y-auto text-[15.5px] leading-relaxed">
            <DashboardHeader
              user={current.user}
              subscription={subscriptionPresentation}
              salesMode={salesExperience.effectiveMode}
            />

            <TeachixAppDownloadPrompt />

            {current.user.role !== "PRINCIPAL" ? (
              <>
                <DashboardOnboardingReminder
                  onboardingCompleted={current.user.onboardingCompleted}
                  onboardingSkippedAt={current.user.onboardingSkippedAt}
                />
                <CalendarLoginPopup />
              </>
            ) : null}

            <PortfolioPreviewLoadingBoundary><div className={`mx-auto w-full min-w-0 max-w-[1680px] px-2.5 ${MOBILE_BOTTOM_CLEARANCE_CLASS} pt-3 sm:px-3 sm:pt-4 md:px-4 md:py-4 xl:px-5`}>
              {children}
            </div></PortfolioPreviewLoadingBoundary>

            <FloatingWhatsAppSupport />
          </main>
        </div>
      </div>
      </GuidanceProvider>
      <DashboardMobileBottomNav role={current.user.role} />
    </>
  );
}
