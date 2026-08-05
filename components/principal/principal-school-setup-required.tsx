import Link from "next/link";
import { Building2 } from "lucide-react";

export function PrincipalSchoolSetupRequired() {
  return (
    <section dir="rtl" className="rounded-[2rem] border border-amber-200 bg-white p-8 shadow-sm dark:border-amber-500/20 dark:bg-slate-950">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
        <Building2 className="h-6 w-6" />
      </div>
      <h1 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">يلزم إكمال بيانات المدرسة أولًا.</h1>
      <p className="mt-2 font-bold leading-7 text-slate-500">أكمل الهوية الرسمية للمدرسة قبل استخدام هذه المساحة.</p>
      <Link href="/dashboard/principal/school-profile" className="mt-5 inline-flex rounded-2xl bg-teal-700 px-5 py-3 text-sm font-black text-white transition hover:bg-teal-800">
        الانتقال إلى بيانات المدرسة
      </Link>
    </section>
  );
}
