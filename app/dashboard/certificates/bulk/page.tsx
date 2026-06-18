import { redirect } from "next/navigation";

export default function BulkCertificatesRedirectPage() {
  redirect("/dashboard/certificates");
}