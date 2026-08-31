import { notFound } from "next/navigation";

import { PublicTeacherActivityLinkForm } from "@/components/activity-programs/public-teacher-activity-link-form";
import { ACTIVITY_PROGRAM_DOMAINS } from "@/lib/activity-programs/activity-program-catalog";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

function isExpired(date?: Date | null) {
  return Boolean(date && date.getTime() < Date.now());
}

const TEACHER_SELECTABLE_DOMAINS = ACTIVITY_PROGRAM_DOMAINS.filter(
  (domain) => domain.slug !== "school-broadcast",
);

export default async function TeacherActivityLinkPage({ params }: PageProps) {
  const { token } = await params;

  const link = await prisma.teacherActivityLink.findUnique({
    where: {
      token,
    },
    include: {
      schoolAccount: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!link) {
    notFound();
  }

  if (link.status === "CLOSED") {
    return <SimpleMessage title="الرابط مغلق" message="تم إغلاق هذا الرابط من رائد النشاط." />;
  }

  if (isExpired(link.tokenExpiresAt) && link.status === "ACTIVE") {
    await prisma.teacherActivityLink.update({
      where: {
        id: link.id,
      },
      data: {
        status: "EXPIRED",
      },
    });
  }

  if (link.status === "EXPIRED" || isExpired(link.tokenExpiresAt)) {
    return <SimpleMessage title="انتهت صلاحية الرابط" message="تواصل مع رائد النشاط للحصول على رابط جديد." />;
  }

  const schoolName =
    link.schoolAccount.profile?.schoolName ||
    link.schoolAccount.name;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-4 sm:px-6 sm:py-8" dir="rtl">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
        <header className="border-b border-slate-100 bg-slate-950 px-5 py-5 text-white sm:px-7">
          <h1 className="text-2xl font-black leading-9">إرسال نشاط للمعلمين</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold leading-6 text-slate-200">
            <span>المدرسة: {schoolName}</span>
            <span>العنوان: {link.title}</span>
          </div>
        </header>

        <PublicTeacherActivityLinkForm
          token={link.token}
          domains={TEACHER_SELECTABLE_DOMAINS.map((domain) => ({
            slug: domain.slug,
            title: domain.title,
          }))}
        />
      </section>
    </main>
  );
}

function SimpleMessage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4" dir="rtl">
      <section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto h-16 w-16 rounded-full bg-amber-100" />
        <h1 className="mt-5 text-2xl font-black text-slate-950">{title}</h1>
        <p className="mt-3 text-sm font-bold leading-7 text-slate-500">{message}</p>
      </section>
    </main>
  );
}
