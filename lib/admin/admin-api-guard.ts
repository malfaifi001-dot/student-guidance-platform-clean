import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

export async function requireAdminApi() {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return NextResponse.json(
      {
        error: "يجب تسجيل الدخول.",
        code: "UNAUTHENTICATED",
      },
      { status: 401 }
    );
  }

  if (current.user.role !== "ADMIN") {
    return NextResponse.json(
      {
        error: "ليست لديك صلاحية تنفيذ هذا الإجراء.",
        code: "FORBIDDEN",
      },
      { status: 403 }
    );
  }

  return null;
}
