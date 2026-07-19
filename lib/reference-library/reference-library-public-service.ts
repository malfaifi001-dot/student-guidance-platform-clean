import type {
  ReferenceLibraryItemStatus,
  UserRole,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertReferenceLibraryItemAccess,
  checkReferenceLibraryItemAccess,
} from "@/lib/reference-library/reference-library-access";
import type {
  ReferenceLibraryItemSummary,
  ReferenceLibraryViewer,
} from "@/lib/reference-library/reference-library-types";

const USER_VISIBLE_STATUSES: ReferenceLibraryItemStatus[] = [
  "PUBLISHED",
];

function toSummary(item: {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  itemType: "FOLDER" | "FILE";
  status: ReferenceLibraryItemStatus;
  sortOrder: number;
  allowDownload: boolean;
  pdfFileName: string | null;
  pdfStorageKey?: string | null;
  pdfMimeType: string | null;
  pdfSizeBytes: number | null;
  docxFileName: string | null;
  docxStorageKey?: string | null;
  docxMimeType: string | null;
  docxSizeBytes: number | null;
  pdfCoverApplied: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    children: number;
  };
}): ReferenceLibraryItemSummary {
  return {
    id: item.id,
    parentId: item.parentId,
    title: item.title,
    description: item.description,
    itemType: item.itemType,
    status: item.status,
    sortOrder: item.sortOrder,
    allowDownload: item.allowDownload,
    pdfFileName: item.pdfFileName,
    pdfMimeType: item.pdfMimeType,
    pdfSizeBytes: item.pdfSizeBytes,
    docxFileName: item.docxFileName,
    docxMimeType: item.docxMimeType,
    docxSizeBytes: item.docxSizeBytes,
    hasPdf: Boolean(item.pdfStorageKey),
    hasDocx: Boolean(item.docxStorageKey),
    pdfCoverApplied: item.pdfCoverApplied,
    childrenCount: item._count.children,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function buildReferenceLibraryViewer(input: {
  id: string;
  role: UserRole;
  schoolAccountId: string | null;
}): ReferenceLibraryViewer {
  return {
    id: input.id,
    role: input.role,
    schoolAccountId: input.schoolAccountId,
  };
}

export async function listVisibleReferenceLibraryItems(input: {
  parentId: string | null;
  viewer: ReferenceLibraryViewer;
  search?: string | null;
}) {
  if (input.parentId) {
    const parent = await prisma.referenceLibraryItem.findUnique({
      where: {
        id: input.parentId,
      },
      select: {
        id: true,
        parentId: true,
        title: true,
        description: true,
        itemType: true,
        status: true,
        sortOrder: true,
        allowDownload: true,
        pdfFileName: true,
        pdfStorageKey: true,
        pdfMimeType: true,
        pdfSizeBytes: true,
        docxFileName: true,
        docxStorageKey: true,
        docxMimeType: true,
        docxSizeBytes: true,
        pdfCoverApplied: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            children: true,
          },
        },
      },
    });

    if (
      !parent ||
      parent.itemType !== "FOLDER" ||
      parent.status !== "PUBLISHED"
    ) {
      return null;
    }

    await assertReferenceLibraryItemAccess({
      itemId: parent.id,
      viewer: input.viewer,
      allowedStatuses: USER_VISIBLE_STATUSES,
    });
  }

  const search = String(input.search ?? "").trim();

  const rawItems = await prisma.referenceLibraryItem.findMany({
    where: {
      parentId: input.parentId,
      status: "PUBLISHED",
      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                },
              },
              {
                description: {
                  contains: search,
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        itemType: "asc",
      },
      {
        updatedAt: "desc",
      },
    ],
    select: {
      id: true,
      parentId: true,
      title: true,
      description: true,
      itemType: true,
      status: true,
      sortOrder: true,
      allowDownload: true,
      pdfFileName: true,
      pdfStorageKey: true,
      pdfMimeType: true,
      pdfSizeBytes: true,
      docxFileName: true,
      docxStorageKey: true,
      docxMimeType: true,
      docxSizeBytes: true,
      pdfCoverApplied: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          children: true,
        },
      },
    },
  });

  const visibleItems: ReferenceLibraryItemSummary[] = [];

  for (const item of rawItems) {
    const access = await checkReferenceLibraryItemAccess({
      itemId: item.id,
      viewer: input.viewer,
      allowedStatuses: USER_VISIBLE_STATUSES,
    });

    if (access.allowed) {
      visibleItems.push(toSummary(item));
    }
  }

  return visibleItems;
}

export async function getVisibleReferenceLibraryItem(input: {
  itemId: string;
  viewer: ReferenceLibraryViewer;
}) {
  const item = await prisma.referenceLibraryItem.findUnique({
    where: {
      id: input.itemId,
    },
    select: {
      id: true,
      parentId: true,
      title: true,
      description: true,
      itemType: true,
      status: true,
      sortOrder: true,
      allowDownload: true,
      pdfFileName: true,
      pdfStorageKey: true,
      pdfMimeType: true,
      pdfSizeBytes: true,
      docxFileName: true,
      docxStorageKey: true,
      docxMimeType: true,
      docxSizeBytes: true,
      pdfCoverApplied: true,
      createdAt: true,
      updatedAt: true,
      parent: {
        select: {
          id: true,
          parentId: true,
          title: true,
        },
      },
      _count: {
        select: {
          children: true,
        },
      },
    },
  });

  if (!item || item.status !== "PUBLISHED") {
    return null;
  }

  await assertReferenceLibraryItemAccess({
    itemId: item.id,
    viewer: input.viewer,
    allowedStatuses: USER_VISIBLE_STATUSES,
  });

  return {
    ...item,
    hasPdf: Boolean(item.pdfStorageKey),
    hasDocx: Boolean(item.docxStorageKey),
  };
}

export async function buildReferenceLibraryBreadcrumbs(
  itemId: string | null,
) {
  const breadcrumbs: Array<{
    id: string;
    title: string;
  }> = [];

  let currentId = itemId;
  let depth = 0;

  while (currentId && depth < 20) {
    const item = await prisma.referenceLibraryItem.findUnique({
      where: {
        id: currentId,
      },
      select: {
        id: true,
        parentId: true,
        title: true,
      },
    });

    if (!item) {
      break;
    }

    breadcrumbs.unshift({
      id: item.id,
      title: item.title,
    });

    currentId = item.parentId;
    depth += 1;
  }

  return breadcrumbs;
}
