import { redirect } from "next/navigation";

export default async function NewSpecialReportPage() {
  redirect("/dashboard/special-report/new");
}
