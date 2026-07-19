export type ReferenceLibraryAudience = {
  id: string;
  audienceType: "ALL_USERS" | "ROLE" | "USER";
  role: string | null;
  userId: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
};

export type ReferenceLibraryAdminItem = {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  itemType: "FOLDER" | "FILE";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: number;
  allowDownload: boolean;
  originalFileName: string | null;
  mimeType: string | null;
  fileExtension: string | null;
  sizeBytes: number | null;
  pdfFileName: string | null;
  pdfMimeType: string | null;
  pdfSizeBytes: number | null;
  docxFileName: string | null;
  docxMimeType: string | null;
  docxSizeBytes: number | null;
  pdfCoverApplied: boolean;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  audiences: ReferenceLibraryAudience[];
  _count?: {
    children: number;
  };
};

export type ReferenceLibraryAdminParent = {
  id: string;
  parentId: string | null;
  title: string;
  itemType: "FOLDER" | "FILE";
};

export type ReferenceLibraryItemsResponse = {
  parent: ReferenceLibraryAdminParent | null;
  items: ReferenceLibraryAdminItem[];
};

export type ReferenceLibraryFeedback = {
  type: "success" | "error" | "warning";
  title: string;
  message: string;
} | null;
