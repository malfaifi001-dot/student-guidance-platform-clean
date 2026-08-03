"use client";

import { useMemo, useState } from "react";

type MobileTab = "home" | "services" | "cases" | "reports";

type IconName =
  | "home"
  | "grid"
  | "check"
  | "file"
  | "users"
  | "compass"
  | "message"
  | "edit"
  | "bell"
  | "camera"
  | "plus"
  | "search"
  | "calendar"
  | "spark";

const services = [
  {
    title: "متابعة الطلبة والمواقف اليومية الطارئة",
    description: "رصد الحالات، التصنيف، الإجراء، والنتيجة من شاشة واحدة.",
    icon: "users" as IconName,
    tone: "from-blue-500 to-cyan-400",
    count: "12",
  },
  {
    title: "برامج التوجيه الطلابي",
    description: "تنفيذ البرامج وإرفاق الشواهد وقياس مؤشرات الأداء.",
    icon: "compass" as IconName,
    tone: "from-indigo-500 to-violet-400",
    count: "8",
  },
  {
    title: "التواصل بين الأسرة والمدرسة وزيارات أولياء الأمور",
    description: "توثيق التواصل مع ولي الأمر وما تم مناقشته والنتيجة.",
    icon: "message" as IconName,
    tone: "from-emerald-500 to-teal-400",
    count: "6",
  },
  {
    title: "خدمات التوجيه الطلابي",
    description: "جلسات فردية وجمعية وتوجيه جمعي ودراسة حالة.",
    icon: "edit" as IconName,
    tone: "from-amber-500 to-orange-400",
    count: "4",
  },
];

const todayTasks = [
  {
    title: "استكمال حالة متابعة",
    description: "إضافة نتيجة الإجراء والملاحظات النهائية.",
    badge: "مهم",
  },
  {
    title: "مراجعة تقرير جاهز",
    description: "تقرير برنامج إرشادي جاهز للمعاينة.",
    badge: "جديد",
  },
];

const cases = [
  {
    student: "طالب تجريبي",
    type: "متابعة سلوكية",
    status: "قيد المتابعة",
    date: "اليوم",
    progress: 65,
  },
  {
    student: "طالبة تجريبية",
    type: "تواصل مع ولي الأمر",
    status: "مكتمل",
    date: "أمس",
    progress: 100,
  },
  {
    student: "طالب تجريبي 2",
    type: "جلسة إرشاد فردي",
    status: "مسودة",
    date: "قبل يومين",
    progress: 35,
  },
];

const reports = [
  {
    title: "تقرير متابعة طالب",
    description: "ملخص الحالة والإجراءات والنتائج.",
  },
  {
    title: "تقرير برنامج إرشادي",
    description: "بيانات البرنامج والشواهد ومؤشرات الأداء.",
  },
  {
    title: "تقرير تواصل أسري",
    description: "سبب التواصل وما تم مناقشته ونتيجة التواصل.",
  },
];

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }

  if (name === "grid") {
    return (
      <svg {...common}>
        <path d="M4 4h6v6H4z" />
        <path d="M14 4h6v6h-6z" />
        <path d="M4 14h6v6H4z" />
        <path d="M14 14h6v6h-6z" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    );
  }

  if (name === "file") {
    return (
      <svg {...common}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <path d="M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if (name === "compass") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2.1 5-4.9 2 2.1-4.9z" />
      </svg>
    );
  }

  if (name === "message") {
    return (
      <svg {...common}>
        <path d="M21 12a8 8 0 0 1-8 8H6l-3 2 1.2-4.2A8 8 0 1 1 21 12z" />
      </svg>
    );
  }

  if (name === "edit") {
    return (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
      </svg>
    );
  }

  if (name === "bell") {
    return (
      <svg {...common}>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
    );
  }

  if (name === "camera") {
    return (
      <svg {...common}>
        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg {...common}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M4 9h16" />
        <path d="M5 5h14v16H5z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
    </svg>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function BottomTabButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: IconName;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "relative flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold transition-all duration-200",
        active
          ? "bg-slate-950 text-white shadow-lg shadow-slate-300"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      <Icon name={icon} className="h-5 w-5" />
      <span>{label}</span>
      {active ? <span className="absolute -bottom-1 h-1 w-7 rounded-full bg-sky-400" /> : null}
    </button>
  );
}

function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-black tracking-tight text-slate-950">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p> : null}
      </div>
      {action ? (
        <button className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
          {action}
        </button>
      ) : null}
    </div>
  );
}

function HomeView({ setActiveTab }: { setActiveTab: (tab: MobileTab) => void }) {
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-300">
        <div className="absolute -left-14 -top-14 h-36 w-36 rounded-full bg-sky-400/30 blur-2xl" />
        <div className="absolute -bottom-16 right-8 h-40 w-40 rounded-full bg-teal-300/20 blur-2xl" />

        <div className="relative">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-sky-200">صباح الخير</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight">لوحة الموجه</h1>
            </div>

            <button className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur">
              <Icon name="bell" className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-rose-400" />
            </button>
          </div>

          <p className="max-w-[19rem] text-sm leading-7 text-slate-200">
            تجربة جوال مركزة: أقل نقرات، أوضح إجراءات، وشكل مناسب للاستخدام اليومي داخل المدرسة.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-3xl bg-white/10 p-3 backdrop-blur">
              <p className="text-2xl font-black">12</p>
              <p className="mt-1 text-[11px] text-slate-300">حالة نشطة</p>
            </div>
            <div className="rounded-3xl bg-white/10 p-3 backdrop-blur">
              <p className="text-2xl font-black">4</p>
              <p className="mt-1 text-[11px] text-slate-300">مهام اليوم</p>
            </div>
            <div className="rounded-3xl bg-white/10 p-3 backdrop-blur">
              <p className="text-2xl font-black">8</p>
              <p className="mt-1 text-[11px] text-slate-300">تقارير</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <button className="group rounded-[1.7rem] bg-white p-4 text-right shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <Icon name="plus" />
          </span>
          <p className="mt-4 font-black text-slate-950">حالة جديدة</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">ابدأ إجراء سريع</p>
        </button>

        <button className="group rounded-[1.7rem] bg-white p-4 text-right shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Icon name="camera" />
          </span>
          <p className="mt-4 font-black text-slate-950">رفع شاهد</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">كاميرا أو ملف</p>
        </button>
      </section>

      <section className="space-y-3">
        <SectionTitle
          title="الأكثر استخدامًا"
          subtitle="اختصار للخدمات اليومية"
          action="عرض الكل"
        />

        <div className="grid grid-cols-2 gap-3">
          {services.slice(0, 4).map((service) => (
            <button
              key={service.title}
              onClick={() => setActiveTab("services")}
              className="rounded-[1.7rem] bg-white p-4 text-right shadow-sm ring-1 ring-slate-100"
            >
              <span
                className={cx(
                  "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
                  service.tone,
                )}
              >
                <Icon name={service.icon} />
              </span>
              <p className="mt-3 text-sm font-black text-slate-950">{service.title}</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">{service.count} سجلات</p>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle title="مهام تحتاج انتباه" subtitle="مرتبة حسب الأهمية" />

        {todayTasks.map((task) => (
          <article
            key={task.title}
            className="flex items-start gap-3 rounded-[1.7rem] bg-white p-4 shadow-sm ring-1 ring-slate-100"
          >
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <Icon name="spark" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-black text-slate-950">{task.title}</h3>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">
                  {task.badge}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{task.description}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function ServicesView() {
  return (
    <div className="space-y-4">
      <SectionTitle
        title="الخدمات"
        subtitle="تصميم بطاقات واضح للمس بالإصبع وسريع القراءة."
      />

      <div className="rounded-[1.7rem] bg-white p-3 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
          <Icon name="search" className="h-5 w-5 text-slate-400" />
          <span className="text-sm font-medium text-slate-400">ابحث عن خدمة...</span>
        </div>
      </div>

      <div className="space-y-3">
        {services.map((service) => (
          <button
            key={service.title}
            className="group flex w-full items-center gap-3 rounded-[1.8rem] bg-white p-4 text-right shadow-sm ring-1 ring-slate-100 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span
              className={cx(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-gradient-to-br text-white shadow-lg",
                service.tone,
              )}
            >
              <Icon name={service.icon} className="h-6 w-6" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="block text-base font-black text-slate-950">{service.title}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                  {service.count}
                </span>
              </span>
              <span className="mt-1.5 block text-xs leading-5 text-slate-500">
                {service.description}
              </span>
            </span>

            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-300 transition group-hover:bg-slate-950 group-hover:text-white">
              ‹
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CasesView() {
  return (
    <div className="space-y-4">
      <SectionTitle title="الحالات" subtitle="بطاقات مختصرة تبيّن الحالة ونسبة الاكتمال." />

      <div className="grid grid-cols-3 gap-2">
        {["الكل", "نشطة", "مسودة"].map((filter, index) => (
          <button
            key={filter}
            className={cx(
              "rounded-2xl px-3 py-2 text-xs font-black",
              index === 0 ? "bg-slate-950 text-white" : "bg-white text-slate-500 ring-1 ring-slate-100",
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {cases.map((item) => (
          <article
            key={`${item.student}-${item.type}`}
            className="rounded-[1.8rem] bg-white p-4 shadow-sm ring-1 ring-slate-100"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Icon name="users" />
                </span>
                <div>
                  <h3 className="font-black text-slate-950">{item.student}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.type}</p>
                </div>
              </div>

              <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black text-sky-700">
                {item.status}
              </span>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>{item.date}</span>
                <span>{item.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-950"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>

            <button className="mt-4 h-11 w-full rounded-2xl bg-slate-950 text-sm font-black text-white">
              عرض التفاصيل
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function ReportsView() {
  return (
    <div className="space-y-4">
      <SectionTitle
        title="التقارير"
        subtitle="اختيار سريع للتقرير مع معاينة قبل التصدير."
      />

      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white shadow-xl shadow-slate-300">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-300">ملخص هذا الأسبوع</p>
            <h2 className="mt-1 text-2xl font-black">8 تقارير</h2>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Icon name="file" />
          </span>
        </div>
        <p className="mt-4 text-xs leading-6 text-slate-300">
          الهدف هنا أن يكون التقرير امتدادًا للحالة، وليس نموذجًا منفصلًا يرهق المستخدم.
        </p>
      </section>

      <div className="space-y-3">
        {reports.map((report) => (
          <button
            key={report.title}
            className="flex w-full items-center gap-3 rounded-[1.8rem] bg-white p-4 text-right shadow-sm ring-1 ring-slate-100"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <Icon name="file" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-black text-slate-950">{report.title}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {report.description}
              </span>
            </span>
            <span className="text-slate-300">‹</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function CounselorMobilePreview() {
  const [activeTab, setActiveTab] = useState<MobileTab>("home");

  const title = useMemo(() => {
    if (activeTab === "services") return "الخدمات";
    if (activeTab === "cases") return "الحالات";
    if (activeTab === "reports") return "التقارير";
    return "الرئيسية";
  }, [activeTab]);

  return (
    <main dir="rtl" className="min-h-screen bg-[#edf3f8] px-3 py-4 text-slate-950">
      <div className="mx-auto max-w-[430px]">
        <div className="relative overflow-hidden rounded-[2.4rem] bg-[#f8fafc] shadow-2xl shadow-slate-300 ring-1 ring-white">
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white to-transparent" />

          <header className="relative z-10 px-5 pb-3 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-slate-300">
                  ST
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400">نسخة تجريبية</p>
                  <p className="text-lg font-black tracking-tight text-slate-950">تطبيق الموجه</p>
                </div>
              </div>

              <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-100">
                <Icon name="calendar" className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-[1.4rem] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
              <div>
                <p className="text-[11px] font-bold text-slate-400">القسم الحالي</p>
                <h1 className="mt-0.5 text-xl font-black tracking-tight text-slate-950">{title}</h1>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <Icon
                  name={
                    activeTab === "home"
                      ? "home"
                      : activeTab === "services"
                        ? "grid"
                        : activeTab === "cases"
                          ? "check"
                          : "file"
                  }
                />
              </span>
            </div>
          </header>

          <section className="relative z-10 min-h-[640px] px-4 pb-28 pt-2">
            {activeTab === "home" ? <HomeView setActiveTab={setActiveTab} /> : null}
            {activeTab === "services" ? <ServicesView /> : null}
            {activeTab === "cases" ? <CasesView /> : null}
            {activeTab === "reports" ? <ReportsView /> : null}
          </section>

          <nav className="absolute inset-x-0 bottom-0 z-20 border-t border-slate-100 bg-white/90 px-3 pb-4 pt-3 backdrop-blur-xl">
            <div className="grid grid-cols-4 gap-2 rounded-[1.7rem] bg-slate-50 p-1.5 ring-1 ring-slate-100">
              <BottomTabButton
                active={activeTab === "home"}
                label="الرئيسية"
                icon="home"
                onClick={() => setActiveTab("home")}
              />
              <BottomTabButton
                active={activeTab === "services"}
                label="الخدمات"
                icon="grid"
                onClick={() => setActiveTab("services")}
              />
              <BottomTabButton
                active={activeTab === "cases"}
                label="الحالات"
                icon="check"
                onClick={() => setActiveTab("cases")}
              />
              <BottomTabButton
                active={activeTab === "reports"}
                label="التقارير"
                icon="file"
                onClick={() => setActiveTab("reports")}
              />
            </div>
          </nav>
        </div>

        <p className="mt-4 text-center text-xs font-medium text-slate-500">
          اختبار شكل وتجربة فقط، بدون ربط بقاعدة البيانات.
        </p>
      </div>
    </main>
  );
}