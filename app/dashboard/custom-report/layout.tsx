import type { ReactNode } from "react";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";

const CUSTOM_REPORT_SERVICE_SLUG = "custom-report";

export default async function CustomReportLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireServiceAccessForCurrentUser(CUSTOM_REPORT_SERVICE_SLUG);

  return children;
}
