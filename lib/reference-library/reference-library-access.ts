import type {
  ReferenceLibraryAudienceType,
  ReferenceLibraryItemStatus,
  UserRole,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { REFERENCE_LIBRARY_MAX_HIERARCHY_DEPTH } from "@/lib/reference-library/reference-library-constants";
import type {
  ReferenceLibraryAccessResult,
  ReferenceLibraryViewer,
} from "@/lib/reference-library/reference-library-types";

type AudienceRule = {
  audienceType: ReferenceLibraryAudienceType;
  userId: string | null;
  role: UserRole | null;
};

type AccessLookupItem = {
  id: string;
  parentId: string | null;
  schoolAccountId: string | null;
  status: ReferenceLibraryItemStatus;
  audiences: AudienceRule[];
};

function matchesAudience(
  viewer: ReferenceLibraryViewer,
  audiences: AudienceRule[],
) {
  return audiences.some((audience) => {
    if (audience.audienceType === "ALL_USERS") {
      return true;
    }

    if (audience.audienceType === "ROLE") {
      return Boolean(audience.role && audience.role === viewer.role);
    }

    if (audience.audienceType === "USER") {
      return Boolean(audience.userId && audience.userId === viewer.id);
    }

    return false;
  });
}

export async function checkReferenceLibraryItemAccess(input: {
  itemId: string;
  viewer: ReferenceLibraryViewer;
  allowedStatuses?: ReferenceLibraryItemStatus[];
}): Promise<ReferenceLibraryAccessResult> {
  if (input.viewer.role === "ADMIN") {
    return {
      allowed: true,
      inheritedFromItemId: null,
    };
  }

  let currentItemId: string | null = input.itemId;
  let depth = 0;

  while (
    currentItemId &&
    depth < REFERENCE_LIBRARY_MAX_HIERARCHY_DEPTH
  ) {
    const item: AccessLookupItem | null =
      await prisma.referenceLibraryItem.findUnique({
        where: {
          id: currentItemId,
        },
        select: {
          id: true,
          parentId: true,
          schoolAccountId: true,
          status: true,
          audiences: {
            select: {
              audienceType: true,
              userId: true,
              role: true,
            },
          },
        },
      });

    if (!item) {
      return {
        allowed: false,
        reason: "ITEM_NOT_FOUND",
      };
    }

    if (
      depth === 0 &&
      input.allowedStatuses &&
      !input.allowedStatuses.includes(item.status)
    ) {
      return {
        allowed: false,
        reason: "ITEM_NOT_FOUND",
      };
    }

    if (
      item.schoolAccountId &&
      item.schoolAccountId !== input.viewer.schoolAccountId
    ) {
      return {
        allowed: false,
        reason: "TENANT_MISMATCH",
      };
    }

    if (item.audiences.length > 0) {
      return matchesAudience(input.viewer, item.audiences)
        ? {
            allowed: true,
            inheritedFromItemId:
              depth === 0 ? null : item.id,
          }
        : {
            allowed: false,
            reason: "AUDIENCE_DENIED",
          };
    }

    currentItemId = item.parentId;
    depth += 1;
  }

  if (currentItemId) {
    return {
      allowed: false,
      reason: "MAX_DEPTH_REACHED",
    };
  }

  return {
    allowed: false,
    reason: "NO_AUDIENCE",
  };
}

export async function assertReferenceLibraryItemAccess(input: {
  itemId: string;
  viewer: ReferenceLibraryViewer;
  allowedStatuses?: ReferenceLibraryItemStatus[];
}) {
  const result = await checkReferenceLibraryItemAccess(input);

  if (!result.allowed) {
    throw new Error(`REFERENCE_LIBRARY_ACCESS_DENIED:${result.reason}`);
  }

  return result;
}
