import type { ReactNode } from "react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <main className="min-w-0 flex-1">
          <DashboardHeader />
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}