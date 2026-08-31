import { SchoolSettingsForm } from "@/components/settings/school-settings-form";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { getArabicUserRoleIdentityCopy } from "@/lib/auth/user-role-display";

export default async function SchoolSettingsPage() {
  const current = await requireDashboardUser();
  const identityCopy = getArabicUserRoleIdentityCopy({
    role: current.user.role,
    gender: current.user.gender,
  });

  return (
    <main className="mx-auto max-w-6xl space-y-4 text-slate-950 dark:text-slate-100">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-black text-blue-700 dark:text-blue-300">إعدادات المنصة</p>
        <h1 className="mt-1 text-xl font-black text-slate-950 dark:text-white md:text-2xl">
          هوية المدرسة وحساب {identityCopy.roleLabel}
        </h1>
        <p className="mt-1 max-w-3xl text-xs leading-6 text-slate-500 dark:text-slate-400">
          أكمل هذه البيانات مرة واحدة لتظهر تلقائيًا في التقارير الرسمية وملفات PDF، ولتفعيل الميزات الحساسة مثل رفع بيانات الطلاب وإصدار التقارير الرسمية.
        </p>
      </section>

      <SchoolSettingsForm />
    </main>
  );
}
