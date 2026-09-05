export const MAX_EVIDENCE_FILES = 2;

export const MAX_EVIDENCE_FILES_MESSAGE =
  "يمكن رفع شاهدين فقط كحد أقصى.";

// Keep room for multipart/form-data overhead below the platform's 10 MiB body limit.
export const MAX_EVIDENCE_TOTAL_SIZE = 9_500_000;

export const EVIDENCE_UPLOAD_TOO_LARGE_MESSAGE =
  "حجم الملفات المحددة يتجاوز الحد المسموح للرفع. الحد الأقصى المسموح هو 10 ميجابايت للعملية الواحدة. يرجى تقليل حجم الملفات أو رفع عدد أقل من الملفات.";
