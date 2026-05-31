import type { ReactNode } from "react";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";

export default async function ServiceAccessLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireServiceAccessForCurrentUser("family-school-communication");

  return <>{children}</>;
}
