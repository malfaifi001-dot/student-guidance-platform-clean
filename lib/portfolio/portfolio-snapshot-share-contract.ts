export function isValidPortfolioSnapshotShareToken(value: string) {
  return /^[A-Za-z0-9_-]{40,100}$/.test(value.trim());
}

export function buildPortfolioSnapshotSharePath(token: string) {
  return `/portfolio-share/${encodeURIComponent(token)}`;
}

export function buildPortfolioSnapshotWhatsAppUrl(teacherName: string, shareUrl: string) {
  return `https://wa.me/?text=${encodeURIComponent(`أشارككم ملف الإنجاز المهني للمعلم/ة ${teacherName}\n${shareUrl}`)}`;
}
