import type { ReactNode } from "react";

import { requirePrincipalPage } from "@/lib/principal/principal-page-guard";

export default async function PrincipalLayout({ children }: { children: ReactNode }) {
  await requirePrincipalPage();
  return <>{children}</>;
}
