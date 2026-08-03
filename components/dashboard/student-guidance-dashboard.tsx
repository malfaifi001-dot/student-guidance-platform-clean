"use client";

import Image from "next/image";
import {
  Bell,
  BookOpenCheck,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ClipboardCheck,
  FileText,
  FolderKanban,
  GraduationCap,
  Home,
  LayoutGrid,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  UserRound,
  Activity,
  CheckCircle2,
  Clock3,
  School,
  BriefcaseBusiness,
  BarChart3,
} from "lucide-react";

type StatCard = {
  title: string;
  value: string;
  hint: string;
  icon: React.ElementType;
  tone: "blue" | "purple" | "cyan" | "green";
};

type ServiceCard = {
  title: string;
  description: string;
  image: string;
  icon: React.ElementType;
  tone: "blue" | "purple" | "cyan";
};

type StudentRow = {
  name: string;
  grade: string;
  service: string;
  status: string;
  statusClass: string;
  updatedAt: string;
  avatar: string;
  dotClass: string;
};

type ActivityItem = {
  title: string;
  subtitle: string;
  time: string;
  icon: React.ElementType;
  toneClass: string;
};

const counselorImage = "/uploads/VD/boy.png";

const stats: StatCard[] = [
  {
    title: "الطلاب المتابعون",
    value: "128",
    hint: "↑ 12% من الشهر الماضي",
    icon: Users,
    tone: "blue",
  },
  {
    title: "الحالات النشطة",
    value: "24",
    hint: "↑ 8% من الشهر الماضي",
    icon: Activity,
    tone: "cyan",
  },
  {
    title: "التقارير المكتملة",
    value: "36",
    hint: "↑ 15% من الشهر الماضي",
    icon: FileText,
    tone: "purple",
  },
  {
    title: "الجلسات هذا الأسبوع",
    value: "18",
    hint: "↑ 5% من الأسبوع الماضي",
    icon: CalendarDays,
    tone: "blue",
  },
];

const services: ServiceCard[] = [
  {
    title: "متابعة الطلبة والمواقف اليومية الطارئة",
    description:
      "متابعة الحالة الأكاديمية والسلوكية للطلاب وتقديم الدعم والإرشاد المناسب في الوقت الصحيح.",
    image: "/uploads/VD/1.png",
    icon: UserRound,
    tone: "cyan",
  },
  {
    title: "التواصل بين الأسرة والمدرسة وزيارات أولياء الأمور",
    description:
      "تعزيز التواصل الفعّال مع أولياء الأمور وتوثيق ما تم مناقشته ونتائج التواصل.",
    image: "/uploads/VD/2.png",
    icon: MessageCircle,
    tone: "purple",
  },
  {
    title: "اللجان والاجتماعات",
    description:
      "تنظيم وإدارة اللجان والاجتماعات الطلابية ومتابعة القرارات والتوصيات والشواهد.",
    image: "/uploads/VD/3.png",
    icon: Users,
    tone: "blue",
  },
];

const students: StudentRow[] = [
  {
    name: "محمد العتيبي",
    grade: "الثاني الثانوي - أ",
    service: "متابعة الطلبة والمواقف اليومية الطارئة",
    status: "نشط",
    statusClass: "bg-emerald-50 text-emerald-700",
    updatedAt: "منذ 15 دقيقة",
    avatar: counselorImage,
    dotClass: "bg-emerald-500",
  },
  {
    name: "سارة الشهراني",
    grade: "الأول الثانوي - ب",
    service: "التواصل بين الأسرة والمدرسة وزيارات أولياء الأمور",
    status: "في انتظار المتابعة",
    statusClass: "bg-amber-50 text-amber-700",
    updatedAt: "منذ ساعة",
    avatar: "/uploads/VD/4.png",
    dotClass: "bg-amber-500",
  },
  {
    name: "عمر الدوسري",
    grade: "الثالث الثانوي - أ",
    service: "اللجان والاجتماعات",
    status: "مكتمل",
    statusClass: "bg-sky-50 text-sky-700",
    updatedAt: "منذ 3 ساعات",
    avatar: "/uploads/VD/5.png",
    dotClass: "bg-sky-500",
  },
  {
    name: "نورة المطيري",
    grade: "الثاني الثانوي - ج",
    service: "متابعة الطلبة والمواقف اليومية الطارئة",
    status: "قيد التنفيذ",
    statusClass: "bg-violet-50 text-violet-700",
    updatedAt: "منذ يوم",
    avatar: "/uploads/VD/7.png",
    dotClass: "bg-violet-500",
  },
];

const activities: ActivityItem[] = [
  {
    title: "تم تحديث حالة الطالب",
    subtitle: "محمد العتيبي",
    time: "منذ 15 دقيقة",
    icon: Users,
    toneClass: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "تمت إضافة تقرير جديد",
    subtitle: "لسارة الشهراني",
    time: "منذ ساعة",
    icon: FileText,
    toneClass: "bg-violet-50 text-violet-600",
  },
  {
    title: "تم عقد جلسة إرشادية",
    subtitle: "مع عمر الدوسري",
    time: "منذ 3 ساعات",
    icon: CalendarDays,
    toneClass: "bg-sky-50 text-sky-600",
  },
  {
    title: "تمت مشاركة ملف مع",
    subtitle: "نورة المطيري",
    time: "منذ 5 ساعات",
    icon: ClipboardCheck,
    toneClass: "bg-orange-50 text-orange-600",
  },
  {
    title: "تم إنشاء حالة جديدة",
    subtitle: "للطالب فيصل العنزي",
    time: "منذ يوم",
    icon: Plus,
    toneClass: "bg-cyan-50 text-cyan-600",
  },
];

const reports = [
  {
    title: "تقرير المتابعة الشهرية",
    period: "مايو 2024",
    date: "26 مايو 2024",
    iconClass: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "تقرير التواصل مع الأسرة",
    period: "أبريل 2024",
    date: "20 مايو 2024",
    iconClass: "bg-violet-50 text-violet-600",
  },
  {
    title: "تقرير اللجان والاجتماعات",
    period: "الربع الثاني 2024",
    date: "15 مايو 2024",
    iconClass: "bg-sky-50 text-sky-600",
  },
];

const navItems = [
  { label: "لوحة التحكم", icon: Home, active: true },
  { label: "الحالات", icon: FolderKanban },
  { label: "الخدمات", icon: LayoutGrid },
  { label: "التقارير", icon: BarChart3 },
  { label: "الطلاب", icon: GraduationCap },
  { label: "الرسائل", icon: Mail, badge: "3" },
  { label: "الإعدادات", icon: Settings },
];

function toneClasses(tone: StatCard["tone"]) {
  const map = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-violet-50 text-violet-600",
    cyan: "bg-cyan-50 text-cyan-600",
    green: "bg-emerald-50 text-emerald-600",
  };

  return map[tone];
}

function serviceIconTone(tone: ServiceCard["tone"]) {
  const map = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-violet-50 text-violet-600",
    cyan: "bg-cyan-50 text-cyan-600",
  };

  return map[tone];
}

export function StudentGuidanceDashboard() {
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#f5f7fb] p-4 text-slate-900 md:p-6"
    >
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1680px] grid-cols-1 overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur xl:grid-cols-[250px_minmax(0,1fr)_320px]">
        <aside className="hidden border-l border-slate-100 bg-white/85 p-5 xl:flex xl:flex-col">
          <div className="mb-10 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-600 shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">
                منصة التوجيه الطلابي
              </p>
              <p className="mt-1 text-xs text-slate-400">Student Guidance</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  className={[
                    "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm transition",
                    item.active
                      ? "bg-violet-50 text-violet-700 shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <span className="font-semibold">{item.label}</span>
                  </span>

                  {item.badge ? (
                    <span className="grid h-6 min-w-6 place-items-center rounded-full bg-violet-100 px-2 text-xs font-bold text-violet-700">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-violet-50">
                <Image
                  src={counselorImage}
                  alt="علي مخنبق"
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">
                  علي مخنبق
                </p>
                <p className="mt-0.5 text-xs text-slate-400">مرشد طلابي</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </aside>

        <section className="min-w-0 bg-[#fbfcff] p-4 md:p-6">
          <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-xl flex-1">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="ابحث عن طالب، خدمة، حالة أو تقرير..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-12 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-200 focus:ring-4 focus:ring-violet-50"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="relative grid h-12 w-12 place-items-center rounded-2xl border border-slate-100 bg-white text-slate-500 shadow-sm transition hover:text-violet-600"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -left-1 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  4
                </span>
              </button>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
                <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-violet-50">
                  <Image
                    src={counselorImage}
                    alt="أ. علي مخنبق"
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-bold text-slate-900">
                    أ. علي مخنبق
                  </p>
                  <p className="text-xs text-slate-400">مرشد طلابي</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          </header>

          <section className="relative overflow-hidden rounded-[2rem] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-sky-50 px-6 py-7 shadow-sm md:px-10">
            <div className="absolute inset-0 opacity-70">
              <div className="absolute -right-20 top-12 h-64 w-64 rounded-full border border-violet-100" />
              <div className="absolute -left-24 -top-20 h-72 w-72 rounded-full bg-violet-100/35 blur-3xl" />
              <div className="absolute bottom-10 left-32 h-28 w-28 rounded-full bg-cyan-100/60 blur-2xl" />
            </div>

            <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_260px]">
              <div className="text-center lg:text-right">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2 text-xs font-bold text-violet-600 shadow-sm">
                  <Sparkles className="h-4 w-4" />
                  لوحة اليوم
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight text-violet-700 md:text-5xl">
                  صباح الخير
                </h1>

                <p className="mt-3 text-2xl font-extrabold text-slate-900 md:text-3xl">
                  الأستاذ علي مخنبق
                </p>

                <div className="mt-5 grid gap-2 text-sm font-medium text-slate-600 sm:inline-grid">
                  <div className="flex items-center justify-center gap-2 lg:justify-start">
                    <BriefcaseBusiness className="h-4 w-4 text-violet-500" />
                    <span>المسمى: مرشد طلابي</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 lg:justify-start">
                    <School className="h-4 w-4 text-violet-500" />
                    <span>المدرسة: الثانوية الأولى بالرياض</span>
                  </div>
                </div>
              </div>

              <div className="relative mx-auto h-56 w-56 overflow-hidden rounded-[2rem] bg-white/50 lg:mx-0">
                <Image
                  src={counselorImage}
                  alt="الأستاذ علي مخنبق"
                  fill
                  priority
                  className="object-contain object-bottom"
                  sizes="224px"
                />
              </div>
            </div>
          </section>

          <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <article
                  key={stat.title}
                  className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={[
                        "grid h-12 w-12 place-items-center rounded-2xl",
                        toneClasses(stat.tone),
                      ].join(" ")}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-3xl font-extrabold text-slate-900">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-bold text-slate-700">
                    {stat.title}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-emerald-600">
                    {stat.hint}
                  </p>
                </article>
              );
            })}
          </section>

          <section className="mt-5 rounded-[1.75rem] border border-slate-100 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-extrabold text-slate-900">الخدمات</h2>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-bold text-violet-600 hover:text-violet-700"
              >
                عرض جميع الخدمات
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {services.map((service) => {
                const Icon = service.icon;

                return (
                  <article
                    key={service.title}
                    className="group overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative h-32 overflow-hidden bg-slate-50">
                      <Image
                        src={service.image}
                        alt={service.title}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                        sizes="(min-width: 1024px) 33vw, 100vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/10 to-transparent" />
                      <div
                        className={[
                          "absolute bottom-3 left-3 grid h-12 w-12 place-items-center rounded-2xl border border-white/80 shadow-sm backdrop-blur",
                          serviceIconTone(service.tone),
                        ].join(" ")}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="text-base font-extrabold text-slate-900">
                        {service.title}
                      </h3>
                      <p className="mt-2 min-h-[52px] text-sm leading-7 text-slate-500">
                        {service.description}
                      </p>
                      <button
                        type="button"
                        className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-violet-600 hover:text-violet-700"
                      >
                        الدخول إلى الخدمة
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-extrabold text-slate-900">
                قائمة الطلاب
              </h2>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-bold text-violet-600 hover:text-violet-700"
              >
                عرض جميع الطلاب
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/70 text-xs font-bold text-slate-400">
                    <th className="px-5 py-3 text-right">اسم الطالب</th>
                    <th className="px-5 py-3 text-right">الصف</th>
                    <th className="px-5 py-3 text-right">الخدمة</th>
                    <th className="px-5 py-3 text-right">الحالة</th>
                    <th className="px-5 py-3 text-right">آخر تحديث</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.name}
                      className="border-t border-slate-100 transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-9 w-9 overflow-hidden rounded-xl bg-violet-50">
                            <Image
                              src={student.avatar}
                              alt={student.name}
                              fill
                              className="object-cover"
                              sizes="36px"
                            />
                          </div>
                          <span className="font-bold text-slate-800">
                            {student.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {student.grade}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {student.service}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-xs font-bold",
                            student.statusClass,
                          ].join(" ")}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2 text-slate-500">
                          <span
                            className={[
                              "h-2 w-2 rounded-full",
                              student.dotClass,
                            ].join(" ")}
                          />
                          {student.updatedAt}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <aside className="border-t border-slate-100 bg-white/90 p-4 md:p-6 xl:border-r xl:border-t-0">
          <div className="space-y-5">
            <section className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    آخر الأنشطة
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    تحديثات الخدمات والتقارير
                  </p>
                </div>
                <button
                  type="button"
                  className="grid h-9 w-9 place-items-center rounded-full bg-slate-50 text-slate-400"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-1">
                {activities.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={`${item.title}-${item.subtitle}`}
                      className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0"
                    >
                      <div
                        className={[
                          "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
                          item.toneClass,
                        ].join(" ")}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-500">
                          {item.title}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-extrabold text-slate-900">
                          {item.subtitle}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-violet-50 text-sm font-bold text-violet-700 transition hover:bg-violet-100"
              >
                عرض جميع الأنشطة
                <ChevronLeft className="h-4 w-4" />
              </button>
            </section>

            <section className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    آخر التقارير
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    تقارير جاهزة للمراجعة
                  </p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-50 text-violet-600">
                  <BookOpenCheck className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-1">
                {reports.map((report) => (
                  <div
                    key={report.title}
                    className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0"
                  >
                    <div
                      className={[
                        "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
                        report.iconClass,
                      ].join(" ")}
                    >
                      <FileText className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-slate-900">
                        {report.title}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">
                        {report.period}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {report.date}
                      </p>
                    </div>

                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-violet-50 text-sm font-bold text-violet-700 transition hover:bg-violet-100"
              >
                عرض جميع التقارير
                <ChevronLeft className="h-4 w-4" />
              </button>
            </section>

            <section className="rounded-[1.75rem] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-cyan-600 shadow-sm">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    جلسة قادمة
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    اليوم 10:30 صباحًا مع محمد العتيبي
                  </p>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </main>
  );
}