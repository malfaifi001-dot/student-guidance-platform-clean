import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/current-user";

export async function requirePrincipalApi(options: { requireSchool?: boolean } = {}) {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول.", code: "UNAUTHENTICATED" },
        { status: 401 },
      ),
    };
  }

  if (current.user.role !== "PRINCIPAL") {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "هذه الخدمة مخصصة لمدير المدرسة.", code: "FORBIDDEN" },
        { status: 403 },
      ),
    };
  }

  if (options.requireSchool !== false && !current.user.schoolAccountId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "حساب مدير المدرسة غير مرتبط بمدرسة.", code: "SCHOOL_REQUIRED" },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    current,
    user: current.user,
    schoolAccountId: current.user.schoolAccountId ?? null,
  };
}
