import { redirect } from "next/navigation";

export default function LegacyReportPreviewRedirectPage() {
  redirect("/dashboard/report");
}