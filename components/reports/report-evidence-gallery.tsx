type ReportEvidenceItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  caption?: string | null;
  visible?: boolean;
  mimeType?: string | null;
  size?: number | null;
  sortOrder?: number | null;
};

type Props = {
  items: ReportEvidenceItem[];
};

function isImageEvidence(item: ReportEvidenceItem) {
  const mimeType = String(item.mimeType || "").toLowerCase();

  if (mimeType.startsWith("image")) {
    return true;
  }

  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(`${item.fileName} ${item.fileUrl}`);
}

export function ReportEvidenceGallery({ items }: Props) {
  const visibleItems = items
    .filter((item) => item.visible !== false)
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-right text-xl font-black text-slate-950">
        الشواهد والمرفقات
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {visibleItems.slice(0, 2).map((item) => {
          const isImage = isImageEvidence(item);

          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-[1.35rem] bg-slate-100"
            >
              {isImage ? (
                <img
                  src={item.fileUrl}
                  alt={item.fileName}
                  className="h-48 w-full object-cover"
                />
              ) : (
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-48 w-full items-center justify-center px-4 text-center text-sm font-black text-slate-600"
                >
                  {item.fileName}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}