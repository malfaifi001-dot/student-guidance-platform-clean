import type { ReactNode } from "react";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminPage();

  return <>{children}</>;
}
