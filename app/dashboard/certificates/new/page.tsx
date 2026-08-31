import { NewCertificateForm } from "@/components/certificates/new-certificate-form";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function NewCertificatePage() {
  const current = await requireDashboardUser();
  const schoolName = current.user.schoolAccount?.profile?.schoolName || current.user.schoolAccount?.name || "";

  return <NewCertificateForm schoolName={schoolName} />;
}
