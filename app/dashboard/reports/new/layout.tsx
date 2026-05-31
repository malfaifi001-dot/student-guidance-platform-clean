import type { ReactNode } from "react";
import { requireActiveSubscriptionForCurrentUser } from "@/lib/subscription/subscription-guard";

export default async function ReportCreationLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireActiveSubscriptionForCurrentUser();

  return <>{children}</>;
}
