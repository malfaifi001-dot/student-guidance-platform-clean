import type { ReactNode } from "react";

import { TimetableV3ProjectFlowWizard } from "@/components/timetable-v3/project-flow-wizard";

export default async function TimetableV3ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<unknown>;
}) {
  const resolvedParams = await params;
  const projectId = resolvedParams &&
    typeof resolvedParams === "object" &&
    "projectId" in resolvedParams &&
    typeof resolvedParams.projectId === "string"
    ? resolvedParams.projectId
    : "";

  return (
    <>
      <TimetableV3ProjectFlowWizard projectId={projectId} />
      {children}
    </>
  );
}
