import { getCurrentSessionUser } from "@/lib/auth/current-user";

type CertificateActor = {
  id: string;
  schoolAccountId: string;
  role: string;
  name: string;
};

export async function getCertificateActor(): Promise<CertificateActor | null> {
  const current = await getCurrentSessionUser();
  const user = current?.user;

  if (!user?.id || !user.schoolAccountId) {
    return null;
  }

  return {
    id: user.id,
    schoolAccountId: user.schoolAccountId,
    role: user.role,
    name: user.officialName || user.name || "المستخدم",
  };
}