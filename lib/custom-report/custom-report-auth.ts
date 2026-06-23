import { requireServiceAccessForCurrentUser } from "@/bin/require-auth";

const CUSTOM_REPORT_SERVICE_SLUG = "custom-report";

export async function requireCustomReportContext() {
  const context = await requireServiceAccessForCurrentUser(
    CUSTOM_REPORT_SERVICE_SLUG,
  );

  if (context instanceof Response) {
    const payload = await context.json().catch(() => null);

    return {
      ok: false as const,
      status: context.status,
      message:
        typeof payload?.error === "string" ? payload.error : "غير مصرح.",
    };
  }

  if (context.user.role === "ADMIN") {
    return {
      ok: false as const,
      status: 403,
      message: "تقرير خاص متاح للمستخدمين وليس للأدمن.",
    };
  }

  return {
    ok: true as const,
    user: context.user,
    schoolAccountId: context.user.schoolAccountId ?? null,
  };
}
