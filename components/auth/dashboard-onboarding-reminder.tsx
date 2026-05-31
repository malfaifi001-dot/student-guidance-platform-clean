"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardOnboardingReminder({
  onboardingCompleted,
}: {
  onboardingCompleted: boolean;
}) {
  const pathname = usePathname();

  if (onboardingCompleted || pathname === "/dashboard/onboarding") {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-6 py-3">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-amber-900">
            بيانات المدرسة لم تكتمل بعد
          </p>
          <p className="mt-1 text-xs font-bold leading-6 text-amber-700">
            يمكنك استخدام المنصة مبدئيًا، لكن سيتم طلب بيانات المدرسة قبل التقارير الرسمية ورفع بيانات نور.
          </p>
        </div>

        <Link
          href="/dashboard/onboarding"
          className="rounded-2xl bg-amber-900 px-4 py-2 text-xs font-black text-white transition hover:bg-amber-800"
        >
          إكمال البيانات
        </Link>
      </div>
    </div>
  );
}
