import { BookOpen, Sparkles } from "lucide-react";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";

export default async function StudentComprehensiveReferencePage() {
  await requireServiceAccessForCurrentUser("student-comprehensive-reference");

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-black text-blue-700">خدمة معرفية</p>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              المرجع الشامل للطالب
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-slate-500">
              مساحة مخصصة لعرض المواد والروابط والمحتوى الإرشادي المناسب للطلاب. سيتم تطوير هذه الصفحة لاحقًا كمكتبة منظمة قابلة للإدارة من لوحة الأدمن.
            </p>
          </div>

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <BookOpen className="h-7 w-7" />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
          <Sparkles className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-2xl font-black text-slate-950">
          المحتوى قيد التجهيز
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-8 text-slate-500">
          سيتم ربط المرجع الشامل للطالب لاحقًا بالمحتوى المخصص للطلاب حسب المرحلة والاحتياج.
        </p>
      </section>
    </div>
  );
}