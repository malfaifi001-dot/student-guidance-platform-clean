export const COUNSELOR_REFERENCE_LIBRARY_SERVICE_SLUG =
  "counselor-reference-library" as const;

export const REFERENCE_LIBRARY_ROUTES = {
  userRoot: "/dashboard/counselor-reference-library",
  adminRoot: "/dashboard/admin/counselor-reference-library",
  userApiRoot: "/api/dashboard/counselor-reference-library",
  adminApiRoot: "/api/dashboard/admin/counselor-reference-library",
} as const;

export const MAX_REFERENCE_LIBRARY_FILE_BYTES = 50 * 1024 * 1024;

export const REFERENCE_LIBRARY_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const REFERENCE_LIBRARY_ALLOWED_EXTENSIONS = [
  "pdf",
  "docx",
] as const;

export const REFERENCE_LIBRARY_MAX_HIERARCHY_DEPTH = 20;