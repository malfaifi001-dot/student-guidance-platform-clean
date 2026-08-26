import Link from "next/link";

import { TimetableIdentityShell } from "@/components/timetable/timetable-identity-shell";
import { TimetableSetup } from "@/components/timetable/timetable-setup";
import { requireTimetablePageAccess } from "@/lib/timetable/timetable-access";
import { listTimetableProjects } from "@/lib/timetable/timetable-project-service";

export const dynamic = "force-dynamic";

export default async function TimetablePage() {
  const access = await requireTimetablePageAccess();
  const projects = await listTimetableProjects(access.schoolAccountId);

  return (
    <TimetableIdentityShell>
      <div className="flex justify-start">
        <Link
          href="/dashboard/principal/timetable/import"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
        >
          استيراد جدول تشغيلي
        </Link>
      </div>
      <TimetableSetup
        initialProjects={JSON.parse(JSON.stringify(projects))}
      />
    </TimetableIdentityShell>
  );
}
