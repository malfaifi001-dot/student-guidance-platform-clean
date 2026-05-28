import Link from "next/link";

export default function CommitteesMeetingsPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-8 text-white shadow-xl">
        <p className="text-sm font-semibold text-sky-100">Workflow Runtime</p>

        <h1 className="mt-3 text-4xl font-black">اللجان والاجتماعات</h1>

        <p className="mt-4 max-w-3xl leading-8 text-sky-50">
          إدارة محاضر اللجان والاجتماعات وجدول الأعمال والمحاور والتوصيات.
        </p>

        <div className="mt-8">
          <Link
            href="/dashboard/committees-meetings/new"
            className="rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-700 hover:bg-sky-50"
          >
            إنشاء محضر جديد
          </Link>
        </div>
      </section>
    </div>
  );
}