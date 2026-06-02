import type { ReactNode } from "react";
import { AppreciationCertificatesTabs } from "@/components/student-follow-up/appreciation-certificates-tabs";

export default function AppreciationCertificatesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <section className="space-y-5" dir="rtl">
      <AppreciationCertificatesTabs />
      {children}
    </section>
  );
}
