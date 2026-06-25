"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";

export function DashboardOnboardingReminder({
  onboardingCompleted,
  onboardingSkippedAt,
}: {
  onboardingCompleted: boolean;
  onboardingSkippedAt?: Date | string | null;
}) {
  const pathname = usePathname();

  if (onboardingCompleted || onboardingSkippedAt || pathname === "/dashboard/onboarding") {
    return null;
  }

  return (
    <div className="border-b border-amber-100 bg-[#fff9ed]/85 px-5 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <AlertCircle className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-black text-amber-950">
              بيانات المدرسة لم تكتمل بعد
            </p>
            <p className="mt-1 text-xs font-bold leading-6 text-amber-700">
              أكمل الهوية الرسمية والشعار حتى تظهر التقارير بصيغة احترافية.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/settings/school"
          className="inline-flex items-center gap-2 rounded-2xl bg-amber-900 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-amber-800"
        >
          إكمال البيانات
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
