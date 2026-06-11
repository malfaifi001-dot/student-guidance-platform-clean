import { redirect } from "next/navigation";

export default function ReportCasesRedirectPage() {
  redirect("/dashboard/cases");
}