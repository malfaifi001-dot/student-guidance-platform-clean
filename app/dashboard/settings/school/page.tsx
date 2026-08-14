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
    <main className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-blue-700">إعدادات المنصة</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          هوية المدرسة وحساب {identityCopy.roleLabel}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-slate-500">
          أكمل هذه البيانات مرة واحدة لتظهر تلقائيًا في التقارير الرسمية وملفات PDF، ولتفعيل الميزات الحساسة مثل رفع بيانات الطلاب وإصدار التقارير الرسمية.
        </p>
      </section>

      <SchoolSettingsForm />
    </main>
  );
}
