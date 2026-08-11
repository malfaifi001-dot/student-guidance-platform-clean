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
    workflowType: assignment.workflow.workflowType,
    studentPickerMode: assignment.workflow.studentPickerMode,
    evidenceMode: assignment.workflow.evidenceMode,
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
        dependsOnFieldKey: field.dependsOnFieldKey,
        linkedToValue: field.linkedToValue,
        allowOther: field.allowOther,
        isRepeater: field.isRepeater,
        defaultValue: field.defaultValue,
        defaultJson: field.defaultJson,
        autoSelectWhenLinked: field.autoSelectWhenLinked,
        options: field.options.map((option) => ({
          id: option.id,
          label: option.label,
          value: option.value,
          order: option.order,
          linkedToValue: option.linkedToValue,
        })),
      })),
    })),
  };

  const schoolName =
    assignment.schoolAccount.profile?.schoolName ||
    assignment.schoolAccount.name;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-4 sm:px-6 sm:py-8" dir="rtl">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
        <header className="border-b border-slate-100 bg-slate-950 px-5 py-5 text-white sm:px-7">
          <h1 className="text-2xl font-black leading-9">
            تنفيذ نشاط مدرسي
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold leading-6 text-slate-200">
            <span>المجال: {assignment.domainTitle}</span>
            <span>المدرسة: {schoolName}</span>
            <span>المعلم/ة: {assignment.teacherName}</span>
          </div>
        </header>

        <PublicTeacherAssignmentForm
          token={assignment.token}
          workflow={workflow}
          serviceId={assignment.serviceId}
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
