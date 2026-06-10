import { redirect } from "next/navigation";

export default function NewActivityProgramDomainRedirectPage() {
  redirect("/dashboard/activity-leader/programs/events-occasions/new");
}