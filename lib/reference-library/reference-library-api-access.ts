import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { isServiceAllowedForSchool } from "@/lib/subscription/subscription-service";
import {
  buildReferenceLibraryViewer,
} from "@/lib/reference-library/reference-library-public-service";
import {
  COUNSELOR_REFERENCE_LIBRARY_SERVICE_SLUG,
} from "@/lib/reference-library/reference-library-constants";

export async function requireReferenceLibraryApiViewer() {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "يجب تسجيل الدخول.",
        },
        {
          status: 401,
        },
      ),
    };
  }

  if (
    current.user.role !== "ADMIN" &&
    current.user.role !== "COUNSELOR"
  ) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "هذه الخدمة غير متاحة لهذا الدور.",
        },
        {
          status: 403,
        },
      ),
    };
  }

  if (current.user.role !== "ADMIN") {
    if (!current.user.schoolAccountId) {
      return {
        ok: false as const,
        response: NextResponse.json(
          {
            error: "الحساب المدرسي غير مكتمل.",
          },
          {
            status: 403,
          },
        ),
      };
    }

    const access =
      await isServiceAllowedForSchool({
        schoolAccountId:
          current.user.schoolAccountId,
        serviceSlug:
          COUNSELOR_REFERENCE_LIBRARY_SERVICE_SLUG,
      });

    if (!access.ok) {
      return {
        ok: false as const,
        response: NextResponse.json(
          {
            error:
              access.reason ===
              "SUBSCRIPTION_INACTIVE"
                ? "الاشتراك غير نشط."
                : "الخدمة غير مشمولة في الباقة.",
          },
          {
            status: 403,
          },
        ),
      };
    }
  }

  return {
    ok: true as const,
    current,
    viewer: buildReferenceLibraryViewer({
      id: current.user.id,
      role: current.user.role,
      schoolAccountId:
        current.user.schoolAccountId,
    }),
  };
}