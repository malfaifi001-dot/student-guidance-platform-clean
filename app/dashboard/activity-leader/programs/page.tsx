import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { ACTIVITY_PROGRAM_DOMAINS } from "@/lib/activity-programs/activity-program-catalog";

export default function ActivityLeaderProgramsPage() {
  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
          برامج النشاط
        </span>

        <h1 className="mt-4 text-3xl font-black leading-10 text-slate-950">
          اختر مجال النشاط
        </h1>

        <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
          كل مجال له Workflow مستقل حتى يمكن تطويره وتعديل حقوله مستقبلًا بدون التأثير على بقية المجالات.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ACTIVITY_PROGRAM_DOMAINS.map((domain) => (
            <Link
              key={domain.slug}
              href={`/dashboard/activity-leader/programs/${domain.slug}`}
              className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5 transition hover:border-sky-200 hover:bg-white hover:shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-slate-100">
                <ClipboardList className="h-6 w-6" />
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-950">
                {domain.title}
              </h2>

              <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                {domain.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}