import { notFound, redirect } from "next/navigation";
import { CheckoutPlanPage } from "@/components/payments/checkout-plan-page";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { isPlanSelfServiceVisible } from "@/lib/subscription/plan-audience";

type PageProps = {
  params: Promise<{
    planId: string;
  }>;
};

export default async function CheckoutPlanRoutePage({ params }: PageProps) {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    redirect("/login");
  }

  const { planId } = await params;

  const [plan, providers] = await Promise.all([
    prisma.plan.findUnique({
      where: {
        id: planId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        priceMonthly: true,
        priceYearly: true,
        isActive: true,
        isPublic: true,
        isArchived: true,
        visibleRoles: true,
        features: true,
      },
    }),
    prisma.paymentProvider.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
  ]);

  if (!plan || !isPlanSelfServiceVisible(plan, current.user.role)) {
    notFound();
  }

  return (
    <CheckoutPlanPage
      plan={plan}
      providers={providers}
      userHasSchoolAccount={Boolean(current.user.schoolAccountId)}
    />
  );
}
