import { prisma } from "@/lib/prisma";
import { REFERENCE_LIBRARY_MAX_HIERARCHY_DEPTH } from "@/lib/reference-library/reference-library-constants";

export async function validateReferenceLibraryParent(input: {
  itemId?: string | null;
  parentId?: string | null;
}) {
  if (!input.parentId) {
    return {
      ok: true as const,
      parent: null,
    };
  }

  if (input.itemId && input.itemId === input.parentId) {
    return {
      ok: false as const,
      error: "لا يمكن جعل العنصر تابعًا لنفسه.",
    };
  }

  const parent = await prisma.referenceLibraryItem.findUnique({
    where: {
      id: input.parentId,
    },
    select: {
      id: true,
      parentId: true,
      itemType: true,
      schoolAccountId: true,
    },
  });

  if (!parent) {
    return {
      ok: false as const,
      error: "المجلد الأب غير موجود.",
    };
  }

  if (parent.itemType !== "FOLDER") {
    return {
      ok: false as const,
      error: "لا يمكن إضافة عناصر داخل ملف.",
    };
  }

  if (!input.itemId) {
    return {
      ok: true as const,
      parent,
    };
  }

  let ancestorId: string | null = parent.parentId;
  let depth = 0;

  while (
    ancestorId &&
    depth < REFERENCE_LIBRARY_MAX_HIERARCHY_DEPTH
  ) {
    if (ancestorId === input.itemId) {
      return {
        ok: false as const,
        error: "لا يمكن نقل المجلد إلى أحد المجلدات التابعة له.",
      };
    }

    const ancestor = await prisma.referenceLibraryItem.findUnique({
      where: {
        id: ancestorId,
      },
      select: {
        parentId: true,
      },
    });

    ancestorId = ancestor?.parentId ?? null;
    depth += 1;
  }

  if (ancestorId) {
    return {
      ok: false as const,
      error: "تجاوز الهيكل الحد الأعلى المسموح للمجلدات.",
    };
  }

  return {
    ok: true as const,
    parent,
  };
}