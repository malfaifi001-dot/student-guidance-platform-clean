import { redirect } from "next/navigation";

export default function CertificatesArchiveRedirectPage() {
  redirect("/dashboard/certificates");
}