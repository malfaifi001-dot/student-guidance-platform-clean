import Link from "next/link";

type OperationsProject = {
  id: string;
  name: string;
  academicYear: string;
  semester: string;
  status?: string;
  publishedSchedule: {
    version: number;
    sessions: number;
  } | null;
};

export function TimetableV3OperationsProjectSelector({
  projects,
}: {
  projects: OperationsProject[];
}) {
  return (
    <main dir="rtl" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="rounded-[2rem] border border-[#CFE5F3] bg-white p-5 shadow-sm">
        <span className="rounded-full bg-[#DCEFFA] px-3 py-1 text-xs font-bold text-[#3478B8]">التشغيل اليومي</span>
        <h1 className="mt-2 text-2xl font-black text-slate-950">حصص الانتظار</h1>
      </header>

      {projects.length === 0 ? (
        <section className="mt-6 rounded-3xl border border-dashed border-amber-200 bg-amber-50 p-8 text-center">
          <h2 className="text-xl font-black text-amber-900">لا يوجد جدول منشور متاح للتشغيل اليومي.</h2>
          <p className="mt-2 text-sm text-amber-800">أنشئ مشروعًا ثم اعتمد نسخة منشورة قبل بدء التشغيل.</p>
          <Link href="/dashboard/timetable-v3" className="mt-5 inline-flex rounded-xl bg-[#3478B8] px-5 py-3 text-sm font-bold text-white">العودة إلى مشاريع الجداول</Link>
        </section>
      ) : (
        <section className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-950">اختر مشروع الجدول</h2>
            <Link href="/dashboard/timetable-v3" className="text-sm font-bold text-[#3478B8]">مشاريع الجداول</Link>
          </div>
          {projects.map((project) => (
            <article key={project.id} className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-950">{project.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{project.academicYear} · {project.semester}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${project.publishedSchedule ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {project.publishedSchedule ? "منشور" : "لا توجد نسخة منشورة"}
                </span>
              </div>

              {project.publishedSchedule ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                  <div className="text-slate-600">
                    <span className="font-bold text-slate-900">النسخة المنشورة:</span> {project.publishedSchedule.version}
                    <span className="mx-2 text-slate-300">·</span>
                    {project.publishedSchedule.sessions} حصة
                  </div>
                  <Link href={`/dashboard/timetable-v3/${project.id}/operations`} className="rounded-xl bg-[#3478B8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#2D6BA5]">
                    فتح حصص الانتظار
                  </Link>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <span>لا توجد نسخة منشورة لهذا المشروع.</span>
                  <Link href={`/dashboard/timetable-v3/${project.id}/versions`} className="font-bold underline underline-offset-4">فتح النسخ لاعتماد جدول</Link>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
