import type {
  ProjectDashboardData,
} from "@/lib/timetable-v2/project-dashboard-types";

import { ProjectHero } from "./project-home/project-hero";
import { ProjectHealthStrip } from "./project-home/project-health-strip";
import { ProjectNextAction } from "./project-home/project-next-action";
import { ProjectWorkflow } from "./project-home/project-workflow";
import { ProjectDataSummary } from "./project-home/project-data-summary";
import { CurrentScheduleCard } from "./project-home/current-schedule-card";
import { ProjectQuickActions } from "./project-home/project-quick-actions";

export function TimetableV2ProjectHome({
  data,
}: {
  data: ProjectDashboardData;
}) {
  return (
    <div
      dir="rtl"
      className="mx-auto max-w-7xl space-y-6 pb-16"
    >
      <ProjectHero data={data} />
      <ProjectHealthStrip data={data} />
      <ProjectNextAction data={data} />
      <ProjectWorkflow data={data} />
      <ProjectDataSummary data={data} />
      <CurrentScheduleCard data={data} />
      <ProjectQuickActions data={data} />
    </div>
  );
}
