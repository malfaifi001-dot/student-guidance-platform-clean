import type { ActivityPlanPrintWeek } from "@/lib/activity-plan/activity-plan-print-data";
import { ActivityPlanPrintWeek as ActivityPlanPrintWeekView } from "./activity-plan-print-week";

type ActivityPlanPrintDocumentProps = {
  weeks: ActivityPlanPrintWeek[];
  stage: string;
  academicYear?: string | null;
  schoolName: string;
  educationDepartment?: string | null;
  logoUrl?: string | null;
  activityLeaderName?: string | null;
  activityLeaderSignatureUrl?: string | null;
  principalName?: string | null;
  principalSignatureUrl?: string | null;
};

export function ActivityPlanPrintDocument({ weeks, stage, ...identity }: ActivityPlanPrintDocumentProps) {
  return (
    <main className="activity-plan-print-root" dir="rtl">
      {weeks.map((week) => <ActivityPlanPrintWeekView key={week.weekNumber} week={week} stage={stage} {...identity} />)}
    </main>
  );
}
