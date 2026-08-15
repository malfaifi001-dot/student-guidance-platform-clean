"use client";

import { useRouter } from "next/navigation";

type ValidatorResult =
  | {
      ok: false;
      code: "NO_GENERATED_SCHEDULE";
      projectId: string;
    }
  | {
      ok: true;
      projectId: string;
      schedule: {
        id: string;
        version: number;
        status: string;
        generatedAt: string;
        isCurrent: boolean;
      };
      freshness: {
        fresh: boolean;
        scheduleFingerprint: string;
        currentFingerprint: string;
      };
      validation: {
        valid: boolean;
        hardViolationCount: number;
        issues: Array<{ code: string; message: string; entityId?: string }>;
        requiredSessions: number;
        generatedSessions: number;
        missingSessions: number;
        teacherCollisions: number;
        classCollisions: number;
      };
    };

export function TimetableV3ValidatorWorkspace({
  projectId,
  result,
}: {
  projectId: string;
  result: ValidatorResult;
}) {
  const router = useRouter();

  if (!result.ok) {
    return (
      <main dir="rtl" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">التحقق من الجدول</h1>
        </header>
        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center">
          <h2 className="text-lg font-bold text-slate-950">لا يوجد جدول مولد للتحقق منه</h2>
          <button type="button" onClick={() => router.push(`/dashboard/timetable-v3/${projectId}/timefold`)} className="mt-5 h-11 rounded-xl bg-[#3478B8] px-5 text-sm font-bold text-white">
            العودة إلى الإنشاء
          </button>
        </section>
      </main>
    );
  }

  const metrics = [
    ["الحصص المطلوبة", result.validation.requiredSessions],
    ["الحصص الموزعة", result.validation.generatedSessions],
    ["الحصص الناقصة", result.validation.missingSessions],
    ["تعارضات المعلمين", result.validation.teacherCollisions],
    ["تعارضات الفصول", result.validation.classCollisions],
    ["المخالفات الصارمة", result.validation.hardViolationCount],
  ] as const;

  const issueGroups =
    Object.entries(
      result.validation.issues.reduce<
        Record<
          string,
          typeof result.validation.issues
        >
      >(
        (groups, issue) => {
          (
            groups[
              issue.code
            ] ??=
              []
          ).push(
            issue,
          );

          return groups;
        },
        {},
      ),
    );

  return (
    <main dir="rtl" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">التحقق من الجدول</h1>
      </header>

      <section className={`rounded-[28px] border px-6 py-7 ${result.validation.valid ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50/60"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className={`text-xl font-bold ${result.validation.valid ? "text-emerald-900" : "text-red-900"}`}>
              {result.validation.valid ? "الجدول سليم" : "الجدول يحتاج مراجعة"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">النسخة {result.schedule.version} · {result.freshness.fresh ? "متوافقة مع بيانات المشروع" : "بيانات المشروع تغيرت بعد الإنشاء"}</p>
          </div>
          {result.validation.valid ? (
            <button type="button" onClick={() => router.push(`/dashboard/timetable-v3/${projectId}/versions`)} className="h-11 rounded-xl bg-[#3478B8] px-5 text-sm font-bold text-white transition hover:bg-[#2D6BA5]">متابعة إلى النسخ</button>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white p-4">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="mt-1 text-xl font-bold text-slate-950">{value}</div>
            </div>
          ))}
        </div>
      </section>

      {!result.validation.valid && result.validation.issues.length ? (
        <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5">
          <h3 className="font-bold text-slate-950">الملاحظات المهمة</h3>
          <div className="mt-3 space-y-2">
            {issueGroups.slice(0, 8).map(([code, issues]) => (
              <div key={code} className="rounded-xl border border-red-100 bg-red-50/50 px-4 py-3">
                <div className="text-xs font-bold text-red-800">ملاحظات التحقق · {issues.length}</div>
                <div className="mt-2 space-y-1 text-sm text-red-700">
                  {issues.slice(0, 3).map((issue, index) => (
                    <div key={issue.entityId ?? index}>{issue.message}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => router.push(`/dashboard/timetable-v3/${projectId}/constraints`)} className="mt-4 h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">مراجعة القيود</button>
        </section>
      ) : null}
    </main>
  );
}
