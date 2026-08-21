import type {
  ReferenceLibraryAudienceType,
  ReferenceLibraryItemStatus,
  ReferenceLibraryItemType,
  UserRole,
} from "@prisma/client";

export type ReferenceLibraryAudienceInput =
  | {
      audienceType: "ALL_USERS";
      userId?: never;
      role?: never;
    }
  | {
      audienceType: "ROLE";
      role: UserRole;
      userId?: never;
    }
  | {
      audienceType: "USER";
      userId: string;
      role?: never;
    };

export type ReferenceLibraryItemSummary = {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  itemType: ReferenceLibraryItemType;
  status: ReferenceLibraryItemStatus;
  sortOrder: number;
  allowDownload: boolean;
  pdfFileName: string | null;
  pdfMimeType: string | null;
  pdfSizeBytes: number | null;
  docxFileName: string | null;
  docxMimeType: string | null;
  docxSizeBytes: number | null;
  hasPdf: boolean;
  hasDocx: boolean;
  pdfCoverApplied: boolean;
  childrenCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicReferenceLibraryItem = {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  itemType: ReferenceLibraryItemType;
  allowDownload: boolean;
  hasPdf: boolean;
  hasDocx: boolean;
  pdfCoverApplied: boolean;
  childrenCount: number;
};

export type ReferenceLibraryFileVariant = "PDF" | "DOCX";

export type ReferenceLibraryViewer = {
  id: string;
  role: UserRole;
  schoolAccountId: string | null;
};

export type ReferenceLibraryAccessResult =
  | {
      allowed: true;
      inheritedFromItemId: string | null;
    }
  | {
      allowed: false;
      reason:
        | "ITEM_NOT_FOUND"
        | "TENANT_MISMATCH"
        | "NO_AUDIENCE"
        | "AUDIENCE_DENIED"
        | "MAX_DEPTH_REACHED";
    };
