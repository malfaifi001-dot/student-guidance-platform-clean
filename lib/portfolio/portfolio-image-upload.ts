export const PORTFOLIO_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PORTFOLIO_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export const PORTFOLIO_IMAGE_EXTENSIONS = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
} as const;

export type PortfolioImageMimeType = keyof typeof PORTFOLIO_IMAGE_EXTENSIONS;

export function validatePortfolioImageFile(file: File): string | null {
  if (file.size <= 0) return "ملف الصورة فارغ.";
  if (file.size > PORTFOLIO_IMAGE_MAX_BYTES) return "حجم الصورة يجب ألا يتجاوز 5MB.";
  const extensions = PORTFOLIO_IMAGE_EXTENSIONS[file.type as PortfolioImageMimeType];
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!extensions || !extensions.includes(extension as never)) {
    return "صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WEBP فقط.";
  }
  return null;
}
