import type { ReactNode } from "react";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";

export default async function AssessmentCenterLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireServiceAccessForCurrentUser("assessment-center");

  return <>{children}</>;
}