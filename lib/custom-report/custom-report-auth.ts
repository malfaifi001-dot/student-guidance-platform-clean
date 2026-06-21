import { getCurrentSessionUser } from "@/lib/auth/current-user";

export async function requireCustomReportContext() {
  const current = await getCurrentSessionUser();

  if (!current) {
    return {
      ok: false as const,
      status: 401,
      message: "غير مصرح.",
    };
  }

  if (current.user.role === "ADMIN") {
    return {
      ok: false as const,
      status: 403,
      message: "تقرير خاص متاح للمستخدمين وليس للأدمن.",
    };
  }

  return {
    ok: true as const,
    user: current.user,
    schoolAccountId: current.user.schoolAccountId ?? null,
  };
}