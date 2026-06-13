import { redirect } from "next/navigation";

export default function NewReportRedirect() {
  redirect("/dashboard/reports/new");
}
