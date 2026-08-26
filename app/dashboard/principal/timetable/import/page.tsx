import { TimetableIdentityShell } from "@/components/timetable/timetable-identity-shell";
import { TimetableImportUploader } from "@/components/timetable-import/timetable-import-uploader";
import { requireTimetablePageAccess } from "@/lib/timetable/timetable-access";

export const dynamic = "force-dynamic";

export default async function TimetableImportPage() {
  await requireTimetablePageAccess();

  return (
    <TimetableIdentityShell>
      <TimetableImportUploader />
    </TimetableIdentityShell>
  );
}
