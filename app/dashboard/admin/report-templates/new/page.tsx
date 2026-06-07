import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export default async function PlaceholderPage() {
  await requireAdminPage();

  return (
    <main className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-black text-slate-900">إنشاء قالب جديد</h1>
      <p className="mt-3 text-sm text-slate-500">هذه الصفحة قيد التجهيز.</p>
    </main>
  );
}
