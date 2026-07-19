import type {
  ReferenceLibraryAudienceType,
  UserRole,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ReferenceLibraryAudienceInput } from "@/lib/reference-library/reference-library-types";

const ALLOWED_ROLES = new Set<UserRole>([
  "ADMIN",
  "COUNSELOR",
  "ACTIVITY_LEADER",
  "TEACHER",
  "SCHOOL_OWNER",
  "STAFF",
]);

function normalizeAudienceType(
  value: unknown,
): ReferenceLibraryAudienceType | null {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (
    normalized === "ALL_USERS" ||
    normalized === "ROLE" ||
    normalized === "USER"
  ) {
    return normalized;
  }

  return null;
}

export async function normalizeReferenceLibraryAudiences(
  value: unknown,
): Promise<
  | {
      ok: true;
      audiences: ReferenceLibraryAudienceInput[];
    }
  | {
      ok: false;
      error: string;
    }
> {
  if (!Array.isArray(value) || value.length === 0) {
    return {
      ok: true,
      audiences: [
        {
          audienceType: "ROLE",
          role: "COUNSELOR",
        },
      ],
    };
  }

  const normalized: ReferenceLibraryAudienceInput[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return {
        ok: false,
        error: "إعدادات المستفيدين غير صالحة.",
      };
    }

    const record = item as Record<string, unknown>;
    const audienceType = normalizeAudienceType(record.audienceType);

    if (!audienceType) {
      return {
        ok: false,
        error: "نوع المستفيد غير صالح.",
      };
    }

    if (audienceType === "ALL_USERS") {
      normalized.length = 0;
      normalized.push({
        audienceType: "ALL_USERS",
      });

      return {
        ok: true,
        audiences: normalized,
      };
    }

    if (audienceType === "ROLE") {
      const role = String(record.role ?? "")
        .trim()
        .toUpperCase() as UserRole;

      if (!ALLOWED_ROLES.has(role)) {
        return {
          ok: false,
          error: "الدور المحدد غير صالح.",
        };
      }

      const key = `ROLE:${role}`;

      if (!seen.has(key)) {
        seen.add(key);
        normalized.push({
          audienceType: "ROLE",
          role,
        });
      }

      continue;
    }

    const userId = String(record.userId ?? "").trim();

    if (!userId) {
      return {
        ok: false,
        error: "معرف المستخدم مطلوب.",
      };
    }

    const userExists = await prisma.user.count({
      where: {
        id: userId,
        isActive: true,
      },
    });

    if (!userExists) {
      return {
        ok: false,
        error: "أحد المستخدمين المحددين غير موجود.",
      };
    }

    const key = `USER:${userId}`;

    if (!seen.has(key)) {
      seen.add(key);
      normalized.push({
        audienceType: "USER",
        userId,
      });
    }
  }

  if (normalized.length === 0) {
    return {
      ok: false,
      error: "اختر مستفيدًا واحدًا على الأقل.",
    };
  }

  return {
    ok: true,
    audiences: normalized,
  };
}