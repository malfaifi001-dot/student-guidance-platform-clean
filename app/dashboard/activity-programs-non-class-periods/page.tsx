import { redirect } from "next/navigation";

export default function ActivityProgramDomainRedirectPage() {
  redirect("/dashboard/activity-leader/programs/non-class-periods");
}