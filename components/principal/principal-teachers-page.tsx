"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Building2,
  FileText,
  FolderOpen,
  Hash,
  Mail,
  Search,
  Users,
} from "lucide-react";
import { getArabicUserRoleLabel } from "@/lib/auth/user-role-display";

type TeacherCardData = {
  id: string;
  fullName: string;
  email: string;
  role: "TEACHER" | "COUNSELOR" | "ACTIVITY_LEADER";
  gender: "MALE" | "FEMALE" | "UNKNOWN";
  isActive: boolean;
  reportsCount: number;
  evidenceCount: number;
  lastActivityAt: string | null;
};

type TeachersOverview = {
  linked: boolean;
  school: { name: string; statisticalNumber: string | null } | null;
  teachers: TeacherCardData[];
};

const numberFormatter = new Intl.NumberFormat("ar-SA");
const dateFormatter = new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" });

function formatLastActivity(value: string | null) {
  if (!value) return "غير متوفر";
  const date = new Date(value);
  const today = new Date();
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return "اليوم";
  }
  return dateFormatter.format(date);
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("") || "م";
}

function getSchoolMemberRoleLabel(member: TeacherCardData) {
  return getArabicUserRoleLabel({ role: member.role, gender: member.gender })
    .replace(/^ال/, "")
    .replace(/\sال/g, " ");
}

const roleToneClasses: Record<TeacherCardData["role"], {
  card: string;
  avatar: string;
  role: string;
}> = {
  TEACHER: {
    card: "border-sky-200 bg-sky-50/35 dark:border-sky-900 dark:bg-sky-950/20",
    avatar: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    role: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  },
  COUNSELOR: {
    card: "border-violet-200 bg-violet-50/35 dark:border-violet-900 dark:bg-violet-950/20",
    avatar: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    role: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  },
  ACTIVITY_LEADER: {
    card: "border-amber-200 bg-amber-50/35 dark:border-amber-900 dark:bg-amber-950/20",
    avatar: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    role: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
};

export function PrincipalTeachersPage({ overview }: { overview: TeachersOverview }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | TeacherCardData["role"]>("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  const filteredTeachers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ar");
    return overview.teachers.filter((teacher) => {
      const matchesQuery =
        !normalizedQuery ||
        teacher.fullName.toLocaleLowerCase("ar").includes(normalizedQuery) ||
        teacher.email.toLocaleLowerCase().includes(normalizedQuery);
      const matchesStatus =
        status === "all" ||
        (status === "active" && teacher.isActive) ||
        (status === "inactive" && !teacher.isActive);
      const matchesRole = role === "all" || teacher.role === role;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [overview.teachers, query, role, status]);

  if (!overview.linked || !overview.school) {
    return (
      <section dir="rtl" className="grid min-h-[28rem] place-items-center rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="max-w-xl">
          <Building2 className="mx-auto h-12 w-12 text-teal-600" />
          <h1 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">أكمل بيانات المدرسة</h1>
          <p className="mt-3 font-bold leading-8 text-slate-500 dark:text-slate-400">يلزم إكمال بيانات المدرسة قبل عرض المنسوبين المرتبطين بها.</p>
          <Link href="/dashboard/settings/school" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-5 text-sm font-black text-white transition hover:bg-teal-800">
            الانتقال إلى إعدادات المدرسة
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black text-teal-700 dark:text-teal-400">إدارة المدرسة</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">منسوبو المدرسة</h1>
            <p className="mt-3 max-w-2xl font-bold leading-8 text-slate-500 dark:text-slate-400">المعلمون والموجهون الطلابيون ورواد النشاط المرتبطون بمدرستك والمسجلون ضمن الحساب المدرسي نفسه.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryItem icon={Building2} label="المدرسة" value={overview.school.name} />
            <SummaryItem icon={Hash} label="الرقم الإحصائي" value={overview.school.statisticalNumber || "غير محدد"} />
            <SummaryItem icon={Users} label="المنسوبون المرتبطون" value={numberFormatter.format(overview.teachers.length)} />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
          <label className="relative block">
            <span className="sr-only">البحث عن معلم</span>
            <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو البريد الإلكتروني" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-sm font-bold outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-teal-950" />
          </label>
          <label>
            <span className="sr-only">تصفية حسب الدور</span>
            <select value={role} onChange={(event) => setRole(event.target.value as typeof role)} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900">
              <option value="all">الكل</option>
              <option value="TEACHER">المعلمون</option>
              <option value="COUNSELOR">التوجيه الطلابي</option>
              <option value="ACTIVITY_LEADER">ريادة النشاط</option>
            </select>
          </label>
          <label>
            <span className="sr-only">تصفية حسب حالة الحساب</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900">
              <option value="all">الكل</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </label>
        </div>
      </section>

      {filteredTeachers.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTeachers.map((teacher) => <TeacherCard key={teacher.id} teacher={teacher} />)}
        </section>
      ) : (
        <section className="grid min-h-64 place-items-center rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950">
          <div>
            <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">لا يوجد منسوبون مرتبطون حاليًا</h2>
            <p className="mt-2 font-bold leading-7 text-slate-500 dark:text-slate-400">ستظهر هنا حسابات المعلمين والموجهين الطلابيين ورواد النشاط المرتبطة بنفس المدرسة.</p>
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryItem({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="min-w-40 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs font-black text-slate-400"><Icon className="h-4 w-4" />{label}</div>
      <p className="mt-2 truncate text-sm font-black text-slate-800 dark:text-slate-100" title={value}>{value}</p>
    </div>
  );
}

function TeacherCard({ teacher }: { teacher: TeacherCardData }) {
  const tone = roleToneClasses[teacher.role];

  return (
    <Link href={`/dashboard/principal/teachers/${encodeURIComponent(teacher.id)}`} className={`block rounded-[1.75rem] border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${tone.card}`}>
      <div className="flex items-start gap-4">
        <div aria-hidden="true" className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sm font-black ${tone.avatar}`}>{getInitials(teacher.fullName)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="truncate text-lg font-black text-slate-950 dark:text-white">{teacher.fullName}</h2>
            <span className={teacher.isActive ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300"}>{teacher.isActive ? "نشط" : "غير نشط"}</span>
          </div>
          <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-black ${tone.role}`}>{getSchoolMemberRoleLabel(teacher)}</p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"><Mail className="h-4 w-4 shrink-0" /><span className="truncate" dir="ltr">{teacher.email}</span></div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric icon={FileText} label="التقارير" value={`${numberFormatter.format(teacher.reportsCount)} تقريرًا`} />
        <Metric icon={FolderOpen} label="الشواهد" value={`${numberFormatter.format(teacher.evidenceCount)} شاهدًا`} />
      </div>
      <p className="mt-4 text-xs font-bold text-slate-400">آخر نشاط: {formatLastActivity(teacher.lastActivityAt)}</p>
    </Link>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><div className="flex items-center gap-2 text-xs font-bold text-slate-400"><Icon className="h-4 w-4" />{label}</div><p className="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">{value}</p></div>;
}
