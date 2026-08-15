"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const FLOW_STEPS = [
  { segment: "setup", label: "الإعداد" },
  { segment: "assignments", label: "الإسنادات" },
  { segment: "constraints", label: "القيود" },
  { segment: "readiness", label: "الجاهزية" },
  { segment: "feasibility", label: "فحص الإمكانية" },
  { segment: "timefold", label: "إنشاء الجدول" },
  { segment: "preview", label: "المعاينة" },
  { segment: "validator", label: "التحقق" },
  { segment: "versions", label: "النسخ المحفوظة" },
] as const;

export function TimetableV3ProjectFlowWizard({
  projectId,
}: {
  projectId: string;
}) {
  const pathname = usePathname();
  const currentSegment = pathname.split("/").filter(Boolean).at(-1) ?? "setup";
  const currentIndex = Math.max(
    0,
    FLOW_STEPS.findIndex((step) => step.segment === currentSegment),
  );
  const progress = ((currentIndex + 1) / FLOW_STEPS.length) * 100;

  return (
    <div dir="rtl" className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 lg:pt-7">
      <nav aria-label="مراحل إعداد الجدول" className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="mb-3 flex items-center justify-between gap-4 text-xs font-medium text-slate-500">
          <span>{FLOW_STEPS[currentIndex].label}</span>
          <span>{currentIndex + 1} من {FLOW_STEPS.length}</span>
        </div>

        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#3478B8] transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="overflow-x-auto pb-1">
          <ol className="flex min-w-[820px] items-start">
            {FLOW_STEPS.map((step, index) => {
              const completed = index < currentIndex;
              const current = index === currentIndex;

              return (
                <li key={step.segment} className="relative flex min-w-0 flex-1 justify-center px-1">
                  {index < FLOW_STEPS.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className={`absolute right-1/2 top-3 h-px w-full ${index < currentIndex ? "bg-[#8FC4E3]" : "bg-slate-200"}`}
                    />
                  ) : null}

                  <Link
                    href={`/dashboard/timetable-v3/${projectId}/${step.segment}`}
                    aria-current={current ? "step" : undefined}
                    className="relative z-10 flex min-w-0 flex-col items-center gap-2 text-center"
                  >
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-bold transition ${
                        current
                          ? "border-[#3478B8] bg-[#3478B8] text-white"
                          : completed
                            ? "border-[#8FC4E3] bg-[#EEF7FC] text-[#3478B8]"
                            : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {completed ? "✓" : index + 1}
                    </span>
                    <span className={`whitespace-nowrap text-[11px] font-semibold ${current ? "text-[#3478B8]" : completed ? "text-slate-700" : "text-slate-400"}`}>
                      {step.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </nav>
    </div>
  );
}
