import { SchoolSettingsForm } from "@/components/settings/school-settings-form";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function SchoolSettingsPage() {
  await requireDashboardUser();

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-blue-700">إعدادات المنصة</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          هوية المدرسة والحساب
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-slate-500">
          أكمل هذه البيانات مرة واحدة لتظهر تلقائيًا في التقارير الرسمية وملفات PDF، ولتفعيل الميزات الحساسة مثل رفع بيانات الطلاب وإصدار التقارير الرسمية.
        </p>
      </section>

      <SchoolSettingsForm />
    </main>
  );
}
