import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export default async function AdminDocumentDesignsPage() {
  await requireAdminPage();

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-emerald-700">
          معرض التصاميم
        </p>

        <h1 className="mt-2 text-2xl font-black text-slate-900">
          التصميم الرسمي الذكي
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-500">
          في هذه المرحلة نعتمد تصميمًا واحدًا فقط: صفحة A4 رسمية ثابتة الهوية،
          وشعار وزارة التعليم فقط، ومحتوى يتم بناؤه من بلوكات نصية ذكية داخل
          الاستديو.
        </p>
      </section>

      <section className="max-w-xl rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-6 shadow-sm">
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
          التصميم الوحيد المعتمد الآن
        </span>

        <h2 className="mt-5 text-xl font-black text-slate-900">
          قالب رسمي ذكي بصفحة واحدة
        </h2>

        <p className="mt-3 text-sm leading-7 text-slate-600">
          هوية ثابتة، ترويسة رسمية، شعار وزارة التعليم، وحواف هادئة. التعديل
          يكون فقط على البلوكات: عنوان، فقرة، فقرة بعنوان، قائمة نقاط، نتيجة
          مميزة، وحقول ديناميكية.
        </p>

        <Link
          href="/dashboard/admin/report-templates"
          className="mt-6 inline-flex rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
        >
          فتح الاستديو
        </Link>
      </section>
    </main>
  );
}
