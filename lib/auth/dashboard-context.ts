import "server-only";

import { notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

export type DashboardRole =
  | "ADMIN"
  | "COUNSELOR"
  | "ACTIVITY_LEADER"
  | "TEACHER"
  | "SCHOOL_OWNER"
  | "STAFF";

export type DashboardAuthUser = {
  id: string;
  name: string | null;
  email: string;
  role: DashboardRole | string;
  schoolAccountId: string | null;
  isActive?: boolean | null;
};

export type DashboardContext = {
  user: DashboardAuthUser;
  schoolAccountId: string | null;
  isAdmin: boolean;
};

export type SchoolDashboardContext = DashboardContext & {
  schoolAccountId: string;
};

type RawSessionUser = {
  id?: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
  schoolAccountId?: unknown;
  isActive?: unknown;
};

function toNullableString(value: unknown) {
  if (typeof value !== "string") return null;

  const clean = value.trim();
  return clean ? clean : null;
}

function normalizeDashboardUser(value: unknown): DashboardAuthUser | null {
  const user = value as RawSessionUser | null | undefined;

  const id = toNullableString(user?.id);
  const email = toNullableString(user?.email);
  const role = toNullableString(user?.role) || "COUNSELOR";

  if (!id || !email) {
    return null;
  }

  return {
    id,
    email,
    role,
    name: toNullableString(user?.name),
    schoolAccountId: toNullableString(user?.schoolAccountId),
    isActive:
      typeof user?.isActive === "boolean" ? user.isActive : null,
  };
}

function toDashboardContext(user: DashboardAuthUser): DashboardContext {
  return {
    user,
    schoolAccountId: user.schoolAccountId,
    isAdmin: user.role === "ADMIN",
  };
}

export async function getDashboardContext(): Promise<DashboardContext | null> {
  const current = await getCurrentSessionUser();
  const user = normalizeDashboardUser(current?.user);

  if (!user) {
    return null;
  }

  if (user.isActive === false) {
    return null;
  }

  return toDashboardContext(user);
}

export async function requireDashboardApiContext() {
  const context = await getDashboardContext();

  if (!context) {
    return NextResponse.json(
      {
        success: false,
        error: "يجب تسجيل الدخول.",
        code: "UNAUTHENTICATED",
      },
      { status: 401 }
    );
  }

  return context;
}

export async function requireSchoolDashboardApiContext() {
  const contextOrResponse = await requireDashboardApiContext();

  if (contextOrResponse instanceof NextResponse) {
    return contextOrResponse;
  }

  if (!contextOrResponse.schoolAccountId) {
    return NextResponse.json(
      {
        success: false,
        error: "لم يتم ربط الحساب بمدرسة.",
        code: "SCHOOL_ACCOUNT_REQUIRED",
      },
      { status: 403 }
    );
  }

  return contextOrResponse as SchoolDashboardContext;
}

export async function requireDashboardPageContext() {
  const context = await getDashboardContext();

  if (!context) {
    redirect("/login");
  }

  return context;
}

export async function requireSchoolDashboardPageContext() {
  const context = await requireDashboardPageContext();

  if (!context.schoolAccountId) {
    redirect("/dashboard/onboarding?required=true");
  }

  return context as SchoolDashboardContext;
}

export function canAccessSchool(
  context: DashboardContext,
  schoolAccountId?: string | null
) {
  if (context.isAdmin) return true;

  return Boolean(
    schoolAccountId &&
      context.schoolAccountId &&
      schoolAccountId === context.schoolAccountId
  );
}

export function requireSameSchoolApi(
  context: DashboardContext,
  schoolAccountId?: string | null
) {
  if (canAccessSchool(context, schoolAccountId)) {
    return null;
  }

  return NextResponse.json(
    {
      success: false,
      error: "المورد غير موجود أو لا تملك صلاحية الوصول إليه.",
      code: "NOT_FOUND",
    },
    { status: 404 }
  );
}

export function requireSameSchoolPage(
  context: DashboardContext,
  schoolAccountId?: string | null
) {
  if (!canAccessSchool(context, schoolAccountId)) {
    notFound();
  }
}

export function caseOwnershipWhere(
  context: DashboardContext,
  caseId: string
) {
  if (context.isAdmin) {
    return {
      id: caseId,
    };
  }

  return {
    id: caseId,
    schoolAccountId: context.schoolAccountId,
  };
}

export function studentOwnershipWhere(
  context: DashboardContext,
  studentId: string
) {
  if (context.isAdmin) {
    return {
      id: studentId,
    };
  }

  return {
    id: studentId,
    schoolAccountId: context.schoolAccountId,
  };
}

export function reportOwnershipWhere(
  context: DashboardContext,
  reportId: string
) {
  if (context.isAdmin) {
    return {
      id: reportId,
    };
  }

  return {
    id: reportId,
    caseEntry: {
      schoolAccountId: context.schoolAccountId,
    },
  };
}

export function reportEvidenceOwnershipWhere(
  context: DashboardContext,
  reportEvidenceId: string,
  reportId?: string
) {
  if (context.isAdmin) {
    return {
      id: reportEvidenceId,
      ...(reportId ? { reportId } : {}),
    };
  }

  return {
    id: reportEvidenceId,
    ...(reportId ? { reportId } : {}),
    report: {
      caseEntry: {
        schoolAccountId: context.schoolAccountId,
      },
    },
  };
}

export function schoolScopedWhere(context: DashboardContext) {
  if (context.isAdmin) {
    return {};
  }

  return {
    schoolAccountId: context.schoolAccountId,
  };
}
