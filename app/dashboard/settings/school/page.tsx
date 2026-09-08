import { SchoolSettingsForm } from "@/components/settings/school-settings-form";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function SchoolSettingsPage() {
  await requireDashboardUser();
  return (
    <main className="mx-auto max-w-6xl space-y-3 text-slate-950 dark:text-slate-100">
      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-black text-blue-700 dark:text-blue-300">إعدادات المدرسة</p>
        <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white md:text-2xl">
          إعدادات المدرسة
        </h1>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          أكمل البيانات لتظهر هوية المدرسة والحساب في التقارير.
        </p>
      </section>

      <SchoolSettingsForm />
    </main>
  );
}
