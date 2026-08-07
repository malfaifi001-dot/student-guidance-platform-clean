import Link from "next/link";

type ProjectHomeProps = {
  project: {
    id: string;
    name: string;
    academicYear: string;
    semester: string;
    status: string;

    teachers: Array<{
      id: string;
      name: string;
    }>;

    classes: Array<{
      id: string;
      name: string;
    }>;

    subjects: Array<{
      id: string;
      name: string;
    }>;

    classSubjects: Array<{
      id: string;
      weeklyLessons: number;
    }>;
  };
};

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-bold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-black text-slate-950">
        {value}
      </div>
    </div>
  );
}

export function TimetableV2ProjectHome({
  project,
}: ProjectHomeProps) {
  const totalWeeklyLessons =
    project.classSubjects.reduce(
      (sum, item) =>
        sum + item.weeklyLessons,
      0,
    );

  return (
    <div
      dir="rtl"
      className="mx-auto max-w-7xl space-y-6 pb-16"
    >
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">
              مشروع الجدول الجديد
            </div>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              {project.name}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {project.academicYear}
              {" • "}
              {project.semester}
            </p>
          </div>

          <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-700">
            مسودة
          </span>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric
            label="المعلمون"
            value={
              project.teachers.length
            }
          />

          <Metric
            label="الفصول"
            value={
              project.classes.length
            }
          />

          <Metric
            label="المواد"
            value={
              project.subjects.length
            }
          />

          <Metric
            label="خطط المواد"
            value={
              project.classSubjects.length
            }
          />

          <Metric
            label="الحصص الأسبوعية"
            value={
              totalWeeklyLessons
            }
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <h2 className="text-xl font-black text-slate-950">
          خطوات بناء الجدول
        </h2>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="text-xs font-black text-emerald-700">
              مكتمل
            </div>

            <div className="mt-2 font-black text-slate-900">
              إعداد المشروع
            </div>

            <div className="mt-1 text-xs leading-6 text-slate-500">
              المراحل والفصول والخطط الدراسية.
            </div>
          </div>

          <Link
            href={`/dashboard/timetable-v2/${project.id}/teachers`}
            className="rounded-2xl border border-teal-300 bg-white p-5 transition hover:border-teal-500 hover:bg-teal-50/40"
          >
            <div className="text-xs font-black text-teal-700">
              الخطوة التالية
            </div>

            <div className="mt-2 font-black text-slate-900">
              المعلمون
            </div>

            <div className="mt-1 text-xs leading-6 text-slate-500">
              إدخال الأسماء والتخصص والحد الأعلى للحصص.
            </div>

            <div className="mt-3 text-xs font-black text-teal-700">
              فتح إدارة المعلمين ←
            </div>
          </Link>

          <Link
            href={`/dashboard/timetable-v2/${project.id}/assignments`}
            className="rounded-2xl border border-teal-300 bg-white p-5 transition hover:border-teal-500 hover:bg-teal-50/40"
          >
            <div className="text-xs font-black text-teal-700">
              متاح الآن
            </div>

            <div className="mt-2 font-black text-slate-900">
              الإسناد
            </div>

            <div className="mt-1 text-xs leading-6 text-slate-500">
              ربط كل مادة في كل فصل بالمعلم وعدد الحصص.
            </div>

            <div className="mt-3 text-xs font-black text-teal-700">
              فتح الإسناد ←
            </div>
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-xs font-black text-slate-400">
              لاحقًا
            </div>

            <div className="mt-2 font-black text-slate-800">
              القيود والإنشاء
            </div>

            <div className="mt-1 text-xs leading-6 text-slate-500">
              القيود ثم تحليل الجاهزية وإنشاء الجدول.
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-black text-slate-950">
          الفصول المنشأة
        </h2>

        <div className="mt-4 flex flex-wrap gap-2">
          {project.classes.map(
            (classItem) => (
              <span
                key={classItem.id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700"
              >
                {classItem.name}
              </span>
            ),
          )}
        </div>
      </section>
    </div>
  );
}