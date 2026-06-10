import { notFound } from "next/navigation";

import { PublicTeacherAssignmentForm } from "@/components/activity-programs/public-teacher-assignment-form";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

function isExpired(date?: Date | null) {
  return Boolean(date && date.getTime() < Date.now());
}

export default async function TeacherActivityAssignmentPage({ params }: PageProps) {
  const { token } = await params;

  const assignment = await prisma.activityAssignment.findUnique({
    where: {
      token,
    },
    include: {
      schoolAccount: {
        include: {
          profile: true,
        },
      },
      workflow: {
        include: {
          service: true,
          steps: {
            include: {
              fields: {
                include: {
                  options: true,
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },
    },
  });

  if (!assignment) {
    notFound();
  }

  if (isExpired(assignment.tokenExpiresAt) && assignment.status !== "SUBMITTED") {
    await prisma.activityAssignment.update({
      where: {
        id: assignment.id,
      },
      data: {
        status: "EXPIRED",
      },
    });

    return <SimpleMessage title="انتهت صلاحية الرابط" message="تواصل مع رائد النشاط لإرسال رابط جديد." />;
  }

  if (assignment.status === "CANCELED") {
    return <SimpleMessage title="الرابط ملغي" message="تم إلغاء هذا التكليف من رائد النشاط." />;
  }

  if (assignment.caseEntryId || assignment.status === "APPROVED") {
    return <SimpleMessage title="تم اعتماد النشاط" message="شكرًا لك. تم اعتماد النشاط من رائد النشاط." success />;
  }

  if (assignment.status === "SUBMITTED") {
    return <SimpleMessage title="تم إرسال النشاط" message="شكرًا لك. تم إرسال النموذج والشواهد لرائد النشاط، وهو بانتظار الاعتماد." success />;
  }

  if (assignment.status === "SENT") {
    await prisma.activityAssignment.update({
      where: {
        id: assignment.id,
      },
      data: {
        status: "OPENED",
        openedAt: new Date(),
      },
    });
  }

  const workflow = {
    id: assignment.workflow.id,
    name: assignment.workflow.name,
    serviceSlug: assignment.workflow.service.slug,
    steps: assignment.workflow.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      order: step.order,
      fields: step.fields.map((field) => ({
        id: field.id,
        key: field.key,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder,
        helpText: field.helpText,
        isRequired: field.isRequired,
        order: field.order,
        options: field.options.map((option) => ({
          id: option.id,
          label: option.label,
          value: option.value,
          order: option.order,
        })),
      })),
    })),
  };

  const schoolName =
    assignment.schoolAccount.profile?.schoolName ||
    assignment.schoolAccount.name;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-4 sm:px-6 sm:py-8" dir="rtl">
      <section className="mx-auto max-w-3xl space-y-5">
        <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl">
          <p className="text-xs font-black text-sky-200">منصة التوجيه الطلابي</p>
          <h1 className="mt-3 text-3xl font-black leading-10">
            تنفيذ نشاط مدرسي
          </h1>
          <p className="mt-3 text-sm font-bold leading-7 text-slate-200">
            المدرسة: {schoolName}
          </p>
          <p className="mt-1 text-sm font-bold leading-7 text-slate-200">
            المجال: {assignment.domainTitle}
          </p>
        </section>

        <PublicTeacherAssignmentForm
          token={assignment.token}
          workflow={workflow}
          teacherName={assignment.teacherName}
          domainTitle={assignment.domainTitle}
        />
      </section>
    </main>
  );
}

function SimpleMessage({
  title,
  message,
  success,
}: {
  title: string;
  message: string;
  success?: boolean;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4" dir="rtl">
      <section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div
          className={[
            "mx-auto h-16 w-16 rounded-full",
            success ? "bg-emerald-100" : "bg-amber-100",
          ].join(" ")}
        />
        <h1 className="mt-5 text-2xl font-black text-slate-950">{title}</h1>
        <p className="mt-3 text-sm font-bold leading-7 text-slate-500">{message}</p>
      </section>
    </main>
  );
}