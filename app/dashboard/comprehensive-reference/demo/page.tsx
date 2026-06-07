import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ClipboardList,
  FileText,
  ImageIcon,
  MessageCircle,
  PencilLine,
  Phone,
  UserRound,
} from "lucide-react";

import { StudentRecordSummaryCards } from "@/components/students/student-record-summary-cards";
import {
  StudentRecordTimeline,
  type StudentTimelineEvent,
} from "@/components/students/student-record-timeline";

const demoTimelineEvents: StudentTimelineEvent[] = [
  {
    id: "demo-reminder-1",
    tone: "calendar",
    title: "متابعة الطالب بعد اختبار الرياضيات",
    subtitle: "تنبيه قادم للموجه لمراجعة نتيجة الطالب والتواصل مع معلم المادة عند الحاجة.",
    date: "2026-06-18T08:30:00.000Z",
    href: "/dashboard/calendar",
    badge: "قادم",
  },
  {
    id: "demo-case-1",
    tone: "case",
    title: "متابعة انخفاض التحصيل الدراسي",
    subtitle: "متابعة الطلاب · مرسلة · تم توثيق ملاحظات معلم المادة وخطة متابعة أولية.",
    date: "2026-06-10T10:15:00.000Z",
    href: "#",
    badge: "مرسلة",
  },
  {
    id: "demo-evidence-1",
    tone: "evidence",
    title: "صورة من نتيجة الاختبار الشهري",
    subtitle: "شاهد مرتبط بحالة متابعة انخفاض التحصيل الدراسي.",
    date: "2026-06-09T09:00:00.000Z",
    href: "#",
    badge: "شاهد",
  },
  {
    id: "demo-report-1",
    tone: "report",
    title: "تقرير تواصل مع ولي الأمر",
    subtitle: "التواصل بين الأسرة والمدرسة · مولد · يحتوي ملخص التواصل والتوصيات المنزلية.",
    date: "2026-05-28T11:20:00.000Z",
    href: "#",
    badge: "مولد",
  },
  {
    id: "demo-case-2",
    tone: "case",
    title: "تواصل مع ولي الأمر بشأن الغياب المتكرر",
    subtitle: "التواصل بين الأسرة والمدرسة · مرسلة · تم الاتفاق على متابعة الحضور أسبوعيًا.",
    date: "2026-05-25T07:45:00.000Z",
    href: "#",
    badge: "مرسلة",
  },
  {
    id: "demo-case-3",
    tone: "case",
    title: "مشاركة الطالب في برنامج تعزيز السلوك الإيجابي",
    subtitle: "البرامج الإرشادية · مرسلة · مشاركة جيدة وتفاعل ملحوظ.",
    date: "2026-04-12T09:30:00.000Z",
    href: "#",
    badge: "إجراء إيجابي",
  },
  {
    id: "demo-evidence-2",
    tone: "evidence",
    title: "إفادة معلم المادة",
    subtitle: "مرفق مختصر يوضح تحسن المشاركة الصفية خلال آخر أسبوعين.",
    date: "2026-03-02T12:00:00.000Z",
    href: "#",
    badge: "مرفق",
  },
  {
    id: "demo-created",
    tone: "student",
    title: "تم إنشاء سجل الطالب في المنصة",
    subtitle: "بداية ملف الطالب الشامل داخل النظام.",
    date: "2025-09-01T06:00:00.000Z",
    badge: "بداية السجل",
  },
];

export default function DemoStudentComprehensiveRecordPage() {
  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-8 text-white shadow-xl">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-start">
          <div>
            <Link
              href="/dashboard/comprehensive-reference"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-sky-50 ring-1 ring-white/10 transition hover:bg-white/20"
            >
              <ArrowRight className="h-4 w-4" />
              الرجوع للسجل الشامل
            </Link>

            <p className="mt-5 text-sm font-black text-sky-100">
              نموذج تخيلي للعرض
            </p>

            <h1 className="mt-3 text-4xl font-black leading-[1.3]">
              عبدالعزيز محمد القحطاني
            </h1>

            <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-sky-50">
              ثالث متوسط · فصل 3 / ب · مدرسة المستقبل المتوسطة
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-sky-800">
                الحالة العامة: يحتاج متابعة بسيطة
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white ring-1 ring-white/10">
                آخر إجراء: متابعة تحصيلية
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white ring-1 ring-white/10">
                يوجد تنبيه قادم
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Link
              href="#"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50"
            >
              <PencilLine className="h-4 w-4" />
              إضافة متابعة
            </Link>

            <Link
              href="/dashboard/calendar"
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/20"
            >
              <Bell className="h-4 w-4" />
              إضافة تذكير
            </Link>
          </div>
        </div>
      </section>

      <StudentRecordSummaryCards
        casesCount={8}
        reportsCount={3}
        evidencesCount={5}
        remindersCount={2}
      />

      <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-5">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <UserRound className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-black text-slate-400">
                  بيانات الطالب
                </p>

                <h2 className="mt-1 text-xl font-black leading-8 text-slate-950">
                  عبدالعزيز محمد القحطاني
                </h2>

                <div className="mt-3 space-y-2 text-sm font-bold leading-7 text-slate-500">
                  <p>المرحلة: المتوسطة</p>
                  <p>الصف: ثالث متوسط</p>
                  <p>الفصل: 3 / ب</p>
                  <p>رقم الهوية: 10xxxxxxxx</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Phone className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-black text-slate-400">
                  ولي الأمر
                </p>

                <h2 className="mt-1 text-xl font-black leading-8 text-slate-950">
                  محمد القحطاني
                </h2>

                <div className="mt-3 space-y-2 text-sm font-bold leading-7 text-slate-500">
                  <p>الجوال: 05xxxxxxxx</p>
                  <p>صلة القرابة: الأب</p>
                </div>

                <Link
                  href="#"
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-800"
                >
                  <MessageCircle className="h-4 w-4" />
                  تواصل أسري
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-sky-700">قراءة سريعة</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              ماذا يعرف الموجه الآن؟
            </h2>

            <div className="mt-4 space-y-3">
              <QuickInsight
                label="آخر إجراء"
                value="متابعة انخفاض التحصيل الدراسي"
              />
              <QuickInsight
                label="الإجراء القادم"
                value="مراجعة نتيجة اختبار الرياضيات"
              />
              <QuickInsight
                label="ولي الأمر"
                value="تم التواصل معه ويوجد تجاوب"
              />
              <QuickInsight
                label="مؤشر عام"
                value="يحتاج متابعة بسيطة وليس حالة عالية الخطورة"
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-sky-700">آخر الحالات</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              متابعة سريعة
            </h2>

            <div className="mt-4 space-y-3">
              <DemoCaseCard
                service="متابعة الطلاب"
                status="مرسلة"
                title="متابعة انخفاض التحصيل الدراسي"
                date="10 يونيو 2026"
              />
              <DemoCaseCard
                service="التواصل بين الأسرة والمدرسة"
                status="لها تقرير"
                title="تواصل مع ولي الأمر بشأن الغياب المتكرر"
                date="28 مايو 2026"
              />
              <DemoCaseCard
                service="البرامج الإرشادية"
                status="مرسلة"
                title="مشاركة في برنامج تعزيز السلوك الإيجابي"
                date="12 أبريل 2026"
              />
            </div>
          </section>
        </aside>

        <StudentRecordTimeline events={demoTimelineEvents} />
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-black text-sky-700">إجراءات سريعة</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            ماذا تريد أن تفعل الآن؟
          </h2>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <QuickAction
            href="#"
            icon={<ClipboardList className="h-5 w-5" />}
            title="إضافة متابعة"
            helper="سجل إجراء جديد للطالب"
          />

          <QuickAction
            href="#"
            icon={<MessageCircle className="h-5 w-5" />}
            title="تواصل أسري"
            helper="وثق تواصل ولي الأمر"
          />

          <QuickAction
            href="/dashboard/calendar"
            icon={<CalendarDays className="h-5 w-5" />}
            title="إضافة تذكير"
            helper="موعد أو متابعة قادمة"
          />

          <QuickAction
            href="#"
            icon={<FileText className="h-5 w-5" />}
            title="تقرير شامل"
            helper="لاحقًا يتم توليده من السجل"
          />
        </div>
      </section>
    </main>
  );
}

function QuickInsight({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black leading-7 text-slate-900">
        {value}
      </p>
    </div>
  );
}

function DemoCaseCard({
  service,
  status,
  title,
  date,
}: {
  service: string;
  status: string;
  title: string;
  date: string;
}) {
  return (
    <article className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-100">
          {service}
        </span>

        <span className="rounded-full bg-sky-50 px-2 py-1 text-[11px] font-black text-sky-700 ring-1 ring-sky-100">
          {status}
        </span>
      </div>

      <p className="mt-2 line-clamp-2 text-sm font-black leading-7 text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-400">{date}</p>
    </article>
  );
}

function QuickAction({
  href,
  icon,
  title,
  helper,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  helper: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-200 hover:bg-white hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-slate-100">
          {icon}
        </div>

        <div>
          <p className="text-sm font-black text-slate-950">{title}</p>
          <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
            {helper}
          </p>
        </div>
      </div>
    </Link>
  );
}
