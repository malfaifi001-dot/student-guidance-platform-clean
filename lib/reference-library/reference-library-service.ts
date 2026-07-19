import type {
  Prisma,
  ReferenceLibraryItemStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  deleteReferenceLibraryFile,
  saveReferenceLibraryFile,
} from "@/lib/reference-library/reference-library-storage";
import type { ReferenceLibraryAudienceInput } from "@/lib/reference-library/reference-library-types";
import { validateReferenceLibraryParent } from "@/lib/reference-library/reference-library-hierarchy";
import type { ReferenceLibraryFileVariant } from "@/lib/reference-library/reference-library-types";

function buildAudienceCreateData(
  audiences: ReferenceLibraryAudienceInput[],
): Prisma.ReferenceLibraryAudienceCreateWithoutItemInput[] {
  return audiences.map((audience) => {
    if (audience.audienceType === "ALL_USERS") {
      return {
        audienceType: "ALL_USERS",
      };
    }

    if (audience.audienceType === "ROLE") {
      return {
        audienceType: "ROLE",
        role: audience.role,
      };
    }

    return {
      audienceType: "USER",
      user: {
        connect: {
          id: audience.userId,
        },
      },
    };
  });
}

const adminReferenceLibraryItemSelect = {
  id: true,
  parentId: true,
  title: true,
  description: true,
  itemType: true,
  status: true,
  sortOrder: true,
  allowDownload: true,
  originalFileName: true,
  mimeType: true,
  fileExtension: true,
  sizeBytes: true,
  pdfFileName: true,
  pdfMimeType: true,
  pdfSizeBytes: true,
  docxFileName: true,
  docxMimeType: true,
  docxSizeBytes: true,
  pdfCoverApplied: true,
  publishedAt: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  audiences: {
    select: {
      id: true,
      audienceType: true,
      role: true,
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  },
  _count: {
    select: {
      children: true,
    },
  },
} satisfies Prisma.ReferenceLibraryItemSelect;

export async function listAdminReferenceLibraryItems(input: {
  parentId: string | null;
  search?: string | null;
  status?: ReferenceLibraryItemStatus | null;
}) {
  const search = String(input.search ?? "").trim();

  const [items, parent] = await Promise.all([
    prisma.referenceLibraryItem.findMany({
      where: {
        parentId: input.parentId,
        ...(input.status
          ? {
              status: input.status,
            }
          : {}),
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
          createdAt: "desc",
        },
      ],
      select: adminReferenceLibraryItemSelect,
    }),
    input.parentId
      ? prisma.referenceLibraryItem.findUnique({
          where: {
            id: input.parentId,
          },
          select: {
            id: true,
            parentId: true,
            title: true,
            itemType: true,
          },
        })
      : null,
  ]);

  return {
    parent,
    items,
  };
}

export async function createReferenceLibraryFolder(input: {
  title: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  status: ReferenceLibraryItemStatus;
  createdById: string;
  audiences: ReferenceLibraryAudienceInput[];
  inheritAudience: boolean;
}) {
  const parentResult = await validateReferenceLibraryParent({
    parentId: input.parentId,
  });

  if (!parentResult.ok) {
    throw new Error(`REFERENCE_LIBRARY_VALIDATION:${parentResult.error}`);
  }

  return prisma.referenceLibraryItem.create({
    data: {
      title: input.title,
      description: input.description,
      parentId: input.parentId,
      itemType: "FOLDER",
      status: input.status,
      sortOrder: input.sortOrder,
      allowDownload: false,
      createdById: input.createdById,
      publishedAt:
        input.status === "PUBLISHED"
          ? new Date()
          : null,
      audiences:
        input.inheritAudience
          ? undefined
          : {
              create: buildAudienceCreateData(input.audiences),
            },
    },
    select: adminReferenceLibraryItemSelect,
  });
}

export async function createReferenceLibraryFile(input: {
  title: string;
  description: string | null;
  parentId: string;
  sortOrder: number;
  status: ReferenceLibraryItemStatus;
  allowDownload: boolean;
  createdById: string;
  audiences: ReferenceLibraryAudienceInput[];
  inheritAudience: boolean;
  pdfFileName?: string | null;
  pdfStorageKey?: string | null;
  pdfMimeType?: string | null;
  pdfSizeBytes?: number | null;
  docxFileName?: string | null;
  docxStorageKey?: string | null;
  docxMimeType?: string | null;
  docxSizeBytes?: number | null;
  originalStorageKey?: string | null;
  pdfCoverApplied?: boolean;
}) {
  const parentResult = await validateReferenceLibraryParent({
    parentId: input.parentId,
  });

  if (!parentResult.ok || !parentResult.parent) {
    throw new Error(
      `REFERENCE_LIBRARY_VALIDATION:${
        parentResult.ok
          ? "المجلد الأب مطلوب."
          : parentResult.error
      }`,
    );
  }

  if (!input.pdfStorageKey && !input.docxStorageKey) {
    throw new Error(
      "REFERENCE_LIBRARY_VALIDATION:يجب رفع نسخة PDF أو نسخة Word واحدة على الأقل.",
    );
  }

  const legacyFile =
    input.pdfStorageKey
      ? {
          originalFileName: input.pdfFileName ?? null,
          storageKey: input.pdfStorageKey,
          mimeType: input.pdfMimeType ?? "application/pdf",
          fileExtension: "pdf",
          sizeBytes: input.pdfSizeBytes ?? null,
        }
      : {
          originalFileName: input.docxFileName ?? null,
          storageKey: input.docxStorageKey ?? null,
          mimeType:
            input.docxMimeType ??
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          fileExtension: "docx",
          sizeBytes: input.docxSizeBytes ?? null,
        };

  return prisma.referenceLibraryItem.create({
    data: {
      title: input.title,
      description: input.description,
      parentId: input.parentId,
      itemType: "FILE",
      status: input.status,
      sortOrder: input.sortOrder,
      allowDownload: input.allowDownload,
      createdById: input.createdById,
      originalFileName: legacyFile.originalFileName,
      storageKey: legacyFile.storageKey,
      originalStorageKey: input.originalStorageKey ?? null,
      mimeType: legacyFile.mimeType,
      fileExtension: legacyFile.fileExtension,
      sizeBytes: legacyFile.sizeBytes,
      pdfFileName: input.pdfFileName ?? null,
      pdfStorageKey: input.pdfStorageKey ?? null,
      pdfMimeType: input.pdfMimeType ?? null,
      pdfSizeBytes: input.pdfSizeBytes ?? null,
      docxFileName: input.docxFileName ?? null,
      docxStorageKey: input.docxStorageKey ?? null,
      docxMimeType: input.docxMimeType ?? null,
      docxSizeBytes: input.docxSizeBytes ?? null,
      pdfCoverApplied: input.pdfCoverApplied ?? false,
      publishedAt:
        input.status === "PUBLISHED"
          ? new Date()
          : null,
      audiences:
        input.inheritAudience
          ? undefined
          : {
              create: buildAudienceCreateData(input.audiences),
            },
    },
    select: adminReferenceLibraryItemSelect,
  });
}

export async function updateReferenceLibraryItem(input: {
  itemId: string;
  title?: string;
  description?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  status?: ReferenceLibraryItemStatus;
  allowDownload?: boolean;
  audiences?: ReferenceLibraryAudienceInput[];
  inheritAudience?: boolean;
}) {
  const existing = await prisma.referenceLibraryItem.findUnique({
    where: {
      id: input.itemId,
    },
    select: {
      id: true,
      itemType: true,
      status: true,
      publishedAt: true,
    },
  });

  if (!existing) {
    throw new Error("REFERENCE_LIBRARY_NOT_FOUND");
  }

  if (input.parentId !== undefined) {
    const parentResult = await validateReferenceLibraryParent({
      itemId: input.itemId,
      parentId: input.parentId,
    });

    if (!parentResult.ok) {
      throw new Error(
        `REFERENCE_LIBRARY_VALIDATION:${parentResult.error}`,
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    if (
      input.inheritAudience === true ||
      input.audiences !== undefined
    ) {
      await tx.referenceLibraryAudience.deleteMany({
        where: {
          itemId: input.itemId,
        },
      });
    }

    if (
      input.inheritAudience === false &&
      input.audiences &&
      input.audiences.length > 0
    ) {
      await tx.referenceLibraryAudience.createMany({
        data: input.audiences.map((audience) => ({
          itemId: input.itemId,
          audienceType: audience.audienceType,
          userId:
            audience.audienceType === "USER"
              ? audience.userId
              : null,
          role:
            audience.audienceType === "ROLE"
              ? audience.role
              : null,
        })),
      });
    }

    return tx.referenceLibraryItem.update({
      where: {
        id: input.itemId,
      },
      data: {
        ...(input.title !== undefined
          ? {
              title: input.title,
            }
          : {}),
        ...(input.description !== undefined
          ? {
              description: input.description,
            }
          : {}),
        ...(input.parentId !== undefined
          ? {
              parentId: input.parentId,
            }
          : {}),
        ...(input.sortOrder !== undefined
          ? {
              sortOrder: input.sortOrder,
            }
          : {}),
        ...(input.allowDownload !== undefined &&
        existing.itemType === "FILE"
          ? {
              allowDownload: input.allowDownload,
            }
          : {}),
        ...(input.status !== undefined
          ? {
              status: input.status,
              publishedAt:
                input.status === "PUBLISHED"
                  ? existing.publishedAt ?? new Date()
                  : null,
              archivedAt:
                input.status === "ARCHIVED"
                  ? new Date()
                  : null,
            }
          : {}),
      },
      select: adminReferenceLibraryItemSelect,
    });
  });
}

export async function replaceReferenceLibraryFile(input: {
  itemId: string;
  variant: ReferenceLibraryFileVariant;
  storageKey: string;
  buffer: Uint8Array;
  originalFileName: string;
  mimeType: string;
  fileExtension: string;
}) {
  const existing = await prisma.referenceLibraryItem.findUnique({
    where: {
      id: input.itemId,
    },
    select: {
      id: true,
      itemType: true,
      storageKey: true,
      pdfStorageKey: true,
      docxStorageKey: true,
    },
  });

  if (!existing || existing.itemType !== "FILE") {
    throw new Error("REFERENCE_LIBRARY_FILE_NOT_FOUND");
  }

  const oldStorageKey =
    input.variant === "PDF"
      ? existing.pdfStorageKey
      : existing.docxStorageKey;

  try {
    await saveReferenceLibraryFile({
      storageKey: input.storageKey,
      buffer: input.buffer,
    });

    const updated = await prisma.referenceLibraryItem.update({
      where: {
        id: input.itemId,
      },
      data:
        input.variant === "PDF"
          ? {
              pdfFileName: input.originalFileName,
              pdfStorageKey: input.storageKey,
              pdfMimeType: input.mimeType,
              pdfSizeBytes: input.buffer.byteLength,
              originalFileName: input.originalFileName,
              storageKey: input.storageKey,
              mimeType: input.mimeType,
              fileExtension: input.fileExtension,
              sizeBytes: input.buffer.byteLength,
              pdfCoverApplied: false,
              originalStorageKey: null,
            }
          : {
              docxFileName: input.originalFileName,
              docxStorageKey: input.storageKey,
              docxMimeType: input.mimeType,
              docxSizeBytes: input.buffer.byteLength,
              ...(!existing.pdfStorageKey
                ? {
                    originalFileName: input.originalFileName,
                    storageKey: input.storageKey,
                    mimeType: input.mimeType,
                    fileExtension: input.fileExtension,
                    sizeBytes: input.buffer.byteLength,
                  }
                : {}),
            },
      select: adminReferenceLibraryItemSelect,
    });

    await deleteReferenceLibraryFile(oldStorageKey);

    return updated;
  } catch (error) {
    await deleteReferenceLibraryFile(input.storageKey);
    throw error;
  }
}

export async function removeReferenceLibraryFileVariant(input: {
  itemId: string;
  variant: ReferenceLibraryFileVariant;
}) {
  const existing = await prisma.referenceLibraryItem.findUnique({
    where: {
      id: input.itemId,
    },
    select: {
      id: true,
      itemType: true,
      pdfStorageKey: true,
      docxStorageKey: true,
    },
  });

  if (!existing || existing.itemType !== "FILE") {
    throw new Error("REFERENCE_LIBRARY_FILE_NOT_FOUND");
  }

  const targetStorageKey =
    input.variant === "PDF"
      ? existing.pdfStorageKey
      : existing.docxStorageKey;

  const remainingStorageKey =
    input.variant === "PDF"
      ? existing.docxStorageKey
      : existing.pdfStorageKey;

  if (!targetStorageKey) {
    throw new Error("REFERENCE_LIBRARY_FILE_NOT_FOUND");
  }

  if (!remainingStorageKey) {
    throw new Error(
      "REFERENCE_LIBRARY_VALIDATION:لا يمكن حذف آخر نسخة متبقية من الملف.",
    );
  }

  const updated = await prisma.referenceLibraryItem.update({
    where: {
      id: input.itemId,
    },
    data:
      input.variant === "PDF"
        ? {
            pdfFileName: null,
            pdfStorageKey: null,
            pdfMimeType: null,
            pdfSizeBytes: null,
            pdfCoverApplied: false,
            originalStorageKey: null,
            originalFileName: null,
            storageKey: null,
            mimeType: null,
            fileExtension: null,
            sizeBytes: null,
          }
        : {
            docxFileName: null,
            docxStorageKey: null,
            docxMimeType: null,
            docxSizeBytes: null,
        },
    select: adminReferenceLibraryItemSelect,
  });

  await deleteReferenceLibraryFile(targetStorageKey);

  return updated;
}

export async function deleteReferenceLibraryItem(itemId: string) {
  const existing = await prisma.referenceLibraryItem.findUnique({
    where: {
      id: itemId,
    },
    select: {
      id: true,
      itemType: true,
      storageKey: true,
      originalStorageKey: true,
      pdfStorageKey: true,
      docxStorageKey: true,
      _count: {
        select: {
          children: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error("REFERENCE_LIBRARY_NOT_FOUND");
  }

  if (
    existing.itemType === "FOLDER" &&
    existing._count.children > 0
  ) {
    throw new Error("REFERENCE_LIBRARY_FOLDER_NOT_EMPTY");
  }

  await prisma.referenceLibraryItem.delete({
    where: {
      id: itemId,
    },
  });

  await Promise.allSettled([
    deleteReferenceLibraryFile(existing.storageKey),
    deleteReferenceLibraryFile(existing.originalStorageKey),
    deleteReferenceLibraryFile(existing.pdfStorageKey),
    deleteReferenceLibraryFile(existing.docxStorageKey),
  ]);

  return existing;
}
